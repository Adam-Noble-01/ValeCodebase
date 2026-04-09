// =============================================================================
// VALEVISION3D - CLOUDFLARE WORKER - EMAIL SEND API
// =============================================================================
//
// FILE       : src/index.js
// NAMESPACE  : ValeVision3D
// MODULE     : Cloudflare Worker Email API
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Microsoft Graph send-mail endpoint with rate limiting
// CREATED    : 09-Apr-2026
//
// DESCRIPTION:
// - Sends HTML email via Microsoft Graph client-credentials flow.
// - Verifies Cloudflare Access JWT on every request.
// - Enforces per-IP rate limiting (configurable, default 10 emails/hour).
// - Validates recipient addresses against domain allowlist.
// - Contacts lookup is handled client-side via R2 CDN (not this Worker).
//
// =============================================================================

import { createRemoteJWKSet, jwtVerify } from 'jose';


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__EmailApi__JsonHeaders = {
        'Content-Type': 'application/json; charset=utf-8'
    };

    const Na__EmailApi__JwksCache                = new Map();
    const Na__EmailApi__DomainAllowlistDefault    = ['valegardenhouses.com'];

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rate Limiter (In-Memory Per-IP)
// -----------------------------------------------------------------------------

    const Na__EmailApi__RateLimitBuckets = new Map();

    // HELPER FUNCTION | Purge Expired Rate Limit Entries
    // ------------------------------------------------------------
    function Na__EmailApi__PurgeExpiredBuckets(nowMs) {
        const oneHourMs = 3600000;
        for (const [key, bucket] of Na__EmailApi__RateLimitBuckets) {
            if (nowMs - bucket.windowStart > oneHourMs) {
                Na__EmailApi__RateLimitBuckets.delete(key);
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Check and Increment Rate Limit for IP
    // ------------------------------------------------------------
    function Na__EmailApi__CheckRateLimit(clientIp, maxPerHour) {
        const nowMs      = Date.now();
        const oneHourMs  = 3600000;
        const limit      = Number(maxPerHour) || 10;

        Na__EmailApi__PurgeExpiredBuckets(nowMs);

        const bucket = Na__EmailApi__RateLimitBuckets.get(clientIp);

        if (!bucket || (nowMs - bucket.windowStart > oneHourMs)) {
            Na__EmailApi__RateLimitBuckets.set(clientIp, { count: 1, windowStart: nowMs });
            return { allowed: true, remaining: limit - 1 };
        }

        if (bucket.count >= limit) {
            const retryAfterSec = Math.ceil((bucket.windowStart + oneHourMs - nowMs) / 1000);
            return { allowed: false, remaining: 0, retryAfterSec };
        }

        bucket.count += 1;
        return { allowed: true, remaining: limit - bucket.count };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Core Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build CORS Headers from Allowed Origin
    // ------------------------------------------------------------
    function Na__EmailApi__BuildCorsHeaders(env) {
        const allowedOrigin = String(env.ALLOWED_ORIGIN || '').trim();
        if (!allowedOrigin) {
            throw new Error('ALLOWED_ORIGIN is not configured.');
        }
        return {
            'Access-Control-Allow-Origin'  : allowedOrigin,
            'Access-Control-Allow-Methods' : 'POST,OPTIONS',
            'Access-Control-Allow-Headers' : 'Content-Type, Cf-Access-Jwt-Assertion',
            'Access-Control-Max-Age'       : '86400',
            'Vary'                         : 'Origin'
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Return JSON Response with CORS
    // ------------------------------------------------------------
    function Na__EmailApi__JsonResponse(body, init, env) {
        const corsHeaders = Na__EmailApi__BuildCorsHeaders(env);
        const mergedHeaders = {
            ...Na__EmailApi__JsonHeaders,
            ...corsHeaders,
            ...(init?.headers || {})
        };

        return new Response(JSON.stringify(body), {
            status  : init?.status || 200,
            headers : mergedHeaders
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Allowed Send Domains from Env
    // ------------------------------------------------------------
    function Na__EmailApi__ParseAllowedDomains(env) {
        const rawDomains = String(env.ALLOWED_SEND_DOMAINS || '').trim();
        const domainList = rawDomains
            ? rawDomains.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
            : Na__EmailApi__DomainAllowlistDefault;
        return new Set(domainList);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Check if Recipient Domain is Allowed
    // ------------------------------------------------------------
    function Na__EmailApi__IsRecipientDomainAllowed(emailAddress, allowedDomainsSet) {
        const email = String(emailAddress || '').trim().toLowerCase();
        if (!email) return false;
        const atIndex = email.lastIndexOf('@');
        if (atIndex === -1) return false;
        const domain = email.slice(atIndex + 1);
        return allowedDomainsSet.has(domain);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Access JWT Validation
// -----------------------------------------------------------------------------

    // FUNCTION | Verify Cloudflare Access JWT Header
    // ------------------------------------------------------------
    async function Na__EmailApi__VerifyCloudflareAccessJwt(request, env) {
        const teamDomain  = String(env.CLOUDFLARE_ACCESS_TEAM_DOMAIN || '').trim();
        const audienceRaw = String(env.CLOUDFLARE_ACCESS_AUDIENCE || '').trim();

        if (!teamDomain || !audienceRaw) {
            console.warn('[Email Worker] Cloudflare Access not configured — skipping JWT check (dev mode).');
            return;
        }

        const jwtToken = request.headers.get('Cf-Access-Jwt-Assertion');
        if (!jwtToken) {
            throw new Error('Missing Cloudflare Access JWT header.');
        }

        const jwksKey = teamDomain;
        if (!Na__EmailApi__JwksCache.has(jwksKey)) {
            const jwksUrl = new URL(`https://${teamDomain}/cdn-cgi/access/certs`);
            Na__EmailApi__JwksCache.set(jwksKey, createRemoteJWKSet(jwksUrl));
        }

        const audiences = audienceRaw
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

        await jwtVerify(jwtToken, Na__EmailApi__JwksCache.get(jwksKey), {
            issuer   : `https://${teamDomain}`,
            audience : audiences
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Microsoft Graph Mail Sender
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch Graph OAuth2 Access Token
    // ------------------------------------------------------------
    async function Na__EmailApi__FetchGraphAccessToken(env) {
        const tenantId     = String(env.MICROSOFT_TENANT_ID || '').trim();
        const clientId     = String(env.MICROSOFT_CLIENT_ID || '').trim();
        const clientSecret = String(env.MICROSOFT_CLIENT_SECRET || '').trim();

        if (!tenantId || !clientId || !clientSecret) {
            throw new Error('Microsoft Graph credentials are incomplete.');
        }

        const tokenUrl   = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
        const bodyParams = new URLSearchParams();
        bodyParams.set('client_id', clientId);
        bodyParams.set('scope', 'https://graph.microsoft.com/.default');
        bodyParams.set('client_secret', clientSecret);
        bodyParams.set('grant_type', 'client_credentials');

        const tokenResponse = await fetch(tokenUrl, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/x-www-form-urlencoded' },
            body    : bodyParams.toString()
        });

        const tokenJson = await tokenResponse.json().catch(() => ({}));
        if (!tokenResponse.ok || !tokenJson.access_token) {
            const tokenError = tokenJson?.error_description || tokenJson?.error || `Token request failed (${tokenResponse.status})`;
            throw new Error(tokenError);
        }

        return tokenJson.access_token;
    }
    // ------------------------------------------------------------


    // FUNCTION | Send Email via Microsoft Graph API
    // ------------------------------------------------------------
    async function Na__EmailApi__SendMailWithGraph(payload, env) {
        const senderUser      = String(env.MICROSOFT_SENDER_USER || '').trim();
        if (!senderUser) {
            throw new Error('MICROSOFT_SENDER_USER is missing.');
        }

        const allowedDomainsSet = Na__EmailApi__ParseAllowedDomains(env);

        const rawRecipientEmails = (Array.isArray(payload?.to) ? payload.to : [])
            .map((emailValue) => String(emailValue || '').trim().toLowerCase())
            .filter(Boolean);

        if (rawRecipientEmails.length === 0) {
            throw new Error('At least one recipient is required.');
        }

        const disallowedRecipients = rawRecipientEmails.filter(
            (emailValue) => !Na__EmailApi__IsRecipientDomainAllowed(emailValue, allowedDomainsSet)
        );
        if (disallowedRecipients.length > 0) {
            throw new Error('One or more recipients are not in an allowed domain.');
        }

        const toRecipients = rawRecipientEmails.map((emailValue) => ({
            emailAddress: { address: emailValue }
        }));

        const accessToken  = await Na__EmailApi__FetchGraphAccessToken(env);
        const sendEndpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderUser)}/sendMail`;

        const graphPayload = {
            message: {
                subject : String(payload?.subject || 'ValeVision3D Share'),
                body    : {
                    contentType : 'HTML',
                    content     : String(payload?.htmlBody || '')
                },
                toRecipients
            },
            saveToSentItems: false
        };

        const sendResponse = await fetch(sendEndpoint, {
            method  : 'POST',
            headers : {
                'Authorization' : `Bearer ${accessToken}`,
                'Content-Type'  : 'application/json'
            },
            body: JSON.stringify(graphPayload)
        });

        if (!sendResponse.ok) {
            await sendResponse.text();
            throw new Error(`Graph sendMail failed (${sendResponse.status}).`);
        }

        return { sentCount: toRecipients.length };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Route Handlers
// -----------------------------------------------------------------------------

    // FUNCTION | Handle POST /api/email/send
    // ------------------------------------------------------------
    async function Na__EmailApi__HandleSend(request, env) {
        await Na__EmailApi__VerifyCloudflareAccessJwt(request, env);

        const clientIp    = request.headers.get('CF-Connecting-IP') || 'unknown';
        const maxPerHour  = Number(env.RATE_LIMIT_MAX_PER_HOUR) || 10;
        const rateResult  = Na__EmailApi__CheckRateLimit(clientIp, maxPerHour);

        if (!rateResult.allowed) {
            return Na__EmailApi__JsonResponse(
                {
                    error          : `Rate limit exceeded. Max ${maxPerHour} emails per hour.`,
                    retryAfterSec  : rateResult.retryAfterSec
                },
                {
                    status  : 429,
                    headers : { 'Retry-After': String(rateResult.retryAfterSec) }
                },
                env
            );
        }

        const requestJson = await request.json().catch(() => ({}));
        const sendResult  = await Na__EmailApi__SendMailWithGraph(requestJson, env);

        return Na__EmailApi__JsonResponse(
            {
                ok             : true,
                sentCount      : sendResult.sentCount,
                remainingQuota : rateResult.remaining
            },
            { status: 200 },
            env
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Worker Entry
// -----------------------------------------------------------------------------

    export default {
        async fetch(request, env) {
            const requestUrl = new URL(request.url);
            const pathName   = requestUrl.pathname;

            if (request.method === 'OPTIONS') {
                try {
                    return new Response(null, {
                        status  : 204,
                        headers : Na__EmailApi__BuildCorsHeaders(env)
                    });
                } catch (_error) {
                    return new Response(null, { status: 500 });
                }
            }

            try {
                if (request.method === 'POST' && pathName === '/api/email/send') {
                    return await Na__EmailApi__HandleSend(request, env);
                }

                if (request.method === 'GET' && pathName === '/api/email/health') {
                    return Na__EmailApi__JsonResponse(
                        { ok: true, service: 'ValeVision3D Email Worker (send-only)' },
                        { status: 200 },
                        env
                    );
                }

                return Na__EmailApi__JsonResponse(
                    { error: 'Route not found.' },
                    { status: 404 },
                    env
                );
            } catch (error) {
                const errorMessage  = String(error?.message || 'Unknown API error');
                const isAuthError   = /jwt|access|Missing.*JWT/i.test(errorMessage);
                const statusCode    = isAuthError ? 401 : 500;
                const publicMessage = isAuthError
                    ? 'Unauthorized request.'
                    : 'Email API request failed.';
                console.error('[ValeVision3D Email Worker] Error:', errorMessage);
                return Na__EmailApi__JsonResponse(
                    { error: publicMessage },
                    { status: statusCode },
                    env
                );
            }
        }
    };

// endregion -------------------------------------------------------------------
