// =============================================================================
// VALEVISION3D - EMAIL WORKERS - API CLIENT
// =============================================================================
//
// FILE       : Na__Feature__EmailWorkers__ApiClient__.js
// NAMESPACE  : Na__Feature__EmailWorkers
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : API wrapper for contacts lookup and send-email actions
// CREATED    : 09-Apr-2026
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Config Resolver
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Email API Endpoints from App Config
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__ResolveApiConfig(appConfig) {
        const sourceConfig = appConfig?.EmailWorkers__Config || {};
        const isLocalhost = ['localhost', '127.0.0.1'].includes(String(window.location.hostname || '').toLowerCase());
        const localhostOverride = String(sourceConfig.EmailWorkers__Config__ApiBaseUrl__Localhost || '').trim();
        const apiBaseUrlDefault = String(sourceConfig.EmailWorkers__Config__ApiBaseUrl || '/api/email').trim();
        const apiBaseUrl = (isLocalhost && localhostOverride) ? localhostOverride : apiBaseUrlDefault;
        const contactsPath    = String(sourceConfig.EmailWorkers__Config__ContactsEndpoint || '/contacts').trim();
        const sendPath        = String(sourceConfig.EmailWorkers__Config__SendEndpoint || '/send').trim();
        const verifyAuthPath  = String(sourceConfig.EmailWorkers__Config__VerifyAuthEndpoint || '/verify-auth').trim();
        const requestTimeoutMs = Number(sourceConfig.EmailWorkers__Config__RequestTimeoutMs || 15000);

        return {
            apiBaseUrl,
            contactsPath,
            sendPath,
            verifyAuthPath,
            requestTimeoutMs
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Endpoint URL with Path Join Rules
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__BuildEndpoint(apiBaseUrl, endpointPath) {
        const base = String(apiBaseUrl || '').replace(/\/+$/g, '');
        const path = String(endpointPath || '').replace(/^\/+/g, '');
        return `${base}/${path}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Request Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch JSON with Abort Timeout
    // ------------------------------------------------------------
    async function Na__Feature__EmailWorkers__FetchJson(url, options) {
        const timeoutMs = Number(options?.timeoutMs || 15000);
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                method  : options?.method || 'GET',
                headers : options?.headers || {},
                body    : options?.body || undefined,
                signal  : controller.signal
            });

            const responseJson = await response.json().catch(() => ({}));
            if (!response.ok) {
                const message = responseJson?.error || responseJson?.message || `Email API request failed (${response.status})`;
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

    // FUNCTION | Create Email Workers API Client
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__CreateApiClient(appConfig) {
        const resolvedConfig    = Na__Feature__EmailWorkers__ResolveApiConfig(appConfig);
        const contactsEndpoint  = Na__Feature__EmailWorkers__BuildEndpoint(resolvedConfig.apiBaseUrl, resolvedConfig.contactsPath);
        const sendEndpoint      = Na__Feature__EmailWorkers__BuildEndpoint(resolvedConfig.apiBaseUrl, resolvedConfig.sendPath);
        const verifyAuthEndpoint = Na__Feature__EmailWorkers__BuildEndpoint(resolvedConfig.apiBaseUrl, resolvedConfig.verifyAuthPath);

        return {
            async fetchContacts() {
                return Na__Feature__EmailWorkers__FetchJson(contactsEndpoint, {
                    method    : 'GET',
                    timeoutMs : resolvedConfig.requestTimeoutMs
                });
            },

            async verifyAuth(password) {
                return Na__Feature__EmailWorkers__FetchJson(verifyAuthEndpoint, {
                    method    : 'POST',
                    timeoutMs : resolvedConfig.requestTimeoutMs,
                    headers   : { 'Content-Type': 'application/json' },
                    body      : JSON.stringify({ password })
                });
            },

            async sendEmail(payload, authToken) {
                const headers = { 'Content-Type': 'application/json' };
                if (authToken) {
                    headers['Authorization'] = `Bearer ${authToken}`;
                }
                return Na__Feature__EmailWorkers__FetchJson(sendEndpoint, {
                    method    : 'POST',
                    timeoutMs : resolvedConfig.requestTimeoutMs,
                    headers,
                    body      : JSON.stringify(payload || {})
                });
            },

            getResolvedEndpoints() {
                return {
                    contactsEndpoint,
                    sendEndpoint,
                    verifyAuthEndpoint
                };
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
