// =============================================================================
// VALEVISION3D - EMAIL - API CLIENT
// =============================================================================
//
// FILE       : Na__Feature__EmailWorkers__ApiClient__.js
// NAMESPACE  : Na__Feature__EmailWorkers
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The address book and the send, from ValeVision 3D's own API
// CREATED    : 09-Apr-2026
//
// DESCRIPTION:
// - GET  api/email/contacts : every active Vale user with an email address
//   (the users register), for the recipient autocomplete.
// - POST api/email/send     : { to, subject, htmlBody }, sent through Microsoft
//   Graph by the server as the signed-in user (Employee or above).
// - The sign-in cookie is the authorisation: no email password, no token.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 06-Oct-2026 - Version 2.0.0 (the move to app.valegardenhouses.com)
// - Talks to Server__Api/Api__ValeVision3D (ValeVision3D__Api__Email__.py) instead of the
//   valevision3d-email-worker Cloudflare Worker; verifyAuth and the bearer token are gone.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppUtils__ApiUrl } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Request Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch JSON with Abort Timeout
    // ------------------------------------------------------------
    async function Na__Feature__EmailWorkers__FetchJson(url, options) {
        const timeoutMs  = Number(options?.timeoutMs || 15000);
        const controller = new AbortController();
        const timeoutId  = window.setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                method      : options?.method || 'GET',
                credentials : 'same-origin',
                headers     : options?.headers || {},
                body        : options?.body || undefined,
                signal      : controller.signal
            });
            const responseJson = await response.json().catch(() => ({}));
            if (!response.ok) {
                const message = response.status === 401
                    ? 'Sign in to send email.'
                    : (responseJson?.error || `Email request failed (${response.status})`);
                throw new Error(message);
            }
            return responseJson;
        } finally {
            window.clearTimeout(timeoutId);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Email API Client
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__CreateApiClient(appConfig) {
        const config    = appConfig?.EmailWorkers__Config || {};
        const timeoutMs = Number(config.EmailWorkers__Config__RequestTimeoutMs || 15000);
        const contactsEndpoint = Na__AppUtils__ApiUrl('email/contacts');
        const sendEndpoint     = Na__AppUtils__ApiUrl('email/send');

        return {
            async fetchContacts() {
                const answer = await Na__Feature__EmailWorkers__FetchJson(contactsEndpoint, { method : 'GET', timeoutMs });
                return Array.isArray(answer?.contacts) ? answer.contacts : [];
            },

            async sendEmail(payload) {
                return Na__Feature__EmailWorkers__FetchJson(sendEndpoint, {
                    method    : 'POST',
                    timeoutMs : timeoutMs,
                    headers   : { 'Content-Type': 'application/json' },
                    body      : JSON.stringify(payload || {})
                });
            },

            getResolvedEndpoints() {
                return { contactsEndpoint, sendEndpoint };
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Feature__EmailWorkers__CreateApiClient
    };

// endregion -------------------------------------------------------------------
