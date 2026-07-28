// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - SHARED CORS HELPER
// =============================================================================
//
// FILE       : src/CloudflareHelper__Cors__.js
// NAMESPACE  : WhitecardopediaEditorApi
// MODULE     : Shared CORS Helper
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Single source of truth for CORS origin allow-listing and headers
// CREATED    : 26-Jun-2026
//
// DESCRIPTION:
// - Permits localhost and 127.0.0.1 on ANY port (http or https) for local dev.
// - Permits the configurable env.ALLOWED_ORIGIN plus known hosted origins.
// - Echoes the permitted origin back in Access-Control-Allow-Origin, otherwise
//   returns a safe fallback. Adds Vary: Origin for correct caching.
// - Imported by both src/index.js and the ProjectEditor handler so CORS logic
//   is never duplicated or allowed to drift between files.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 28-Jul-2026 - Version 1.1.0
// - Added X-Robots-Tag: noindex, nofollow to every response. Cloudflare
//   Transform Rules are zone-scoped and cannot reach *.workers.dev, so this
//   header has to be set in code rather than in the dashboard.
//
// 26-Jun-2026 - Version 1.0.0
// - Initial implementation.
// - Extracted from index.js + handler to fix 127.0.0.1 dev-origin rejection.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Origin Allow-Listing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Determine if a Request Origin is Permitted
    // ------------------------------------------------------------
    function na_is_origin_allowed(env, requestOrigin) {
        if (!requestOrigin) return false;                                    // <-- No Origin header (same-origin / non-browser)

        // LOCAL DEV | Allow localhost and 127.0.0.1 on ANY port (http or https)
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)) {
            return true;
        }

        // PRODUCTION | Allow explicit env origin plus known hosted origins
        const allowedList = [
            env.ALLOWED_ORIGIN,                                              // <-- Configurable production origin
            'https://noble-architecture.github.io',                         // <-- GH Pages host
            'https://www.noble-architecture.com',                           // <-- Custom domain
            'https://noble-architecture.com'                                // <-- Apex domain
        ].filter(Boolean);                                                   // <-- Drop undefined env value

        return allowedList.includes(requestOrigin);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build CORS Response Headers
    // ------------------------------------------------------------
    function na_build_cors_headers(env, requestOrigin) {
        const fallbackOrigin = env.ALLOWED_ORIGIN || 'http://localhost:8000'; // <-- Used only when origin not permitted
        const originToReturn = na_is_origin_allowed(env, requestOrigin)
            ? requestOrigin                                                  // <-- Echo the permitted origin back
            : fallbackOrigin;                                               // <-- Otherwise a safe default

        return {
            'Access-Control-Allow-Origin'  : originToReturn,
            'Access-Control-Allow-Methods' : 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers' : 'Content-Type, X-Editor-Api-Key',
            'Access-Control-Max-Age'       : '86400',
            'Vary'                         : 'Origin',                       // <-- Correct caching across origins
            'X-Robots-Tag'                 : 'noindex, nofollow'             // <-- Cloudflare Transform Rules cannot reach *.workers.dev
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Shared CORS Helper API
    // ------------------------------------------------------------
    export {
        na_is_origin_allowed,
        na_build_cors_headers
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
