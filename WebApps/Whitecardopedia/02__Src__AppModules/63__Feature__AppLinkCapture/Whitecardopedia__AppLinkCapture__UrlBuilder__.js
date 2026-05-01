// =============================================================================
// WHITECARDOPEDIA - APP LINK CAPTURE - URL BUILDER
// =============================================================================
//
// FILE       : Whitecardopedia__AppLinkCapture__UrlBuilder__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__AppLinkCapture__UrlBuilder
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Single source of truth for ValeVision share / handover / protocol URLs
// CREATED    : 2026
//
// DESCRIPTION:
// - Centralises every URL shape involved in routing recipients of share-link
//   emails into the installed PWA instead of their browser.
// - Three URL flavours:
//     * Direct project URL    -> ValeVision3D/index.html?project=<code>
//                                Used by in-app navigation (gallery -> viewer)
//                                and as the handover page's fallback target.
//     * Handover URL          -> Whitecardopedia/ShareLink__OpenInApp__.html?project=<code>
//                                Used inside outbound share emails and any
//                                situation where the recipient's environment
//                                is unknown.
//     * Protocol URL          -> web+valevision://project/<code>
//                                Used by the handover page when it suspects
//                                the PWA is installed and wants the OS to
//                                route the navigation to the standalone window.
// - All paths are resolved through window.Whitecardopedia__Pwa__Url so localhost
//   dev (port 8000), GitHub Pages production (/ValeCodebase/WebApps/), and any
//   future custom domain work without code changes.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Path Segments and Tokens
    // ------------------------------------------------------------
    const URL_BUILDER_HANDOVER_FILENAME       = 'ShareLink__OpenInApp__.html';                                                      // <-- Handover HTML filename inside Whitecardopedia/
    const URL_BUILDER_VALEVISION_INDEX        = 'index.html';                                                                       // <-- ValeVision3D entry filename
    const URL_BUILDER_PROJECT_QUERY_KEY       = 'project';                                                                          // <-- Project code query parameter
    const URL_BUILDER_PROTOCOL_QUERY_KEY      = 'protocol';                                                                         // <-- Protocol launch query parameter
    const URL_BUILDER_HANDOVER_QUERY_KEY      = 'handover';                                                                         // <-- Handover-source marker
    const URL_BUILDER_PROTOCOL_SCHEME         = 'web+valevision';                                                                   // <-- Custom protocol scheme
    const URL_BUILDER_PROTOCOL_PATH_PREFIX    = 'project';                                                                          // <-- Authority-as-action ("project") for the scheme
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Sanitize and Encode Project Code
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__UrlBuilder__SanitizeProjectCode(rawProjectCode) {
        const trimmed           = String(rawProjectCode || '').trim();                                                              // <-- Coerce + trim
        if (!trimmed) return null;                                                                                                  // <-- Empty -> caller decides
        return encodeURIComponent(trimmed);                                                                                         // <-- URL-safe value
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Resolve Whitecardopedia App Root URL
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__UrlBuilder__GetWhitecardopediaRoot() {
        const urlHelper         = (typeof window !== 'undefined') ? window.Whitecardopedia__Pwa__Url : null;                        // <-- Resolve URL helper
        if (urlHelper && typeof urlHelper.getWhitecardopediaRoot === 'function') {
            return urlHelper.getWhitecardopediaRoot();                                                                              // <-- Helper handles dev / prod / custom
        }
        if (typeof window !== 'undefined' && window.location) {
            return `${window.location.origin}/`;                                                                                    // <-- Fallback to origin root
        }
        return '/';                                                                                                                 // <-- Last resort relative root
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Resolve ValeVision3D App Root URL
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__UrlBuilder__GetValeVision3DRoot() {
        const urlHelper         = (typeof window !== 'undefined') ? window.Whitecardopedia__Pwa__Url : null;                        // <-- Resolve URL helper
        if (urlHelper && typeof urlHelper.getValeVision3DRoot === 'function') {
            return urlHelper.getValeVision3DRoot();                                                                                 // <-- Helper handles dev / prod / custom
        }
        if (typeof window !== 'undefined' && window.location) {
            return `${window.location.origin}/ValeVision3D/`;                                                                       // <-- Fallback assumption
        }
        return '/ValeVision3D/';                                                                                                    // <-- Last resort relative root
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public URL Builders
// -----------------------------------------------------------------------------

    // FUNCTION | Build Direct ValeVision3D Project URL
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__UrlBuilder__BuildDirectProjectUrl(rawProjectCode) {
        const safeProjectCode   = Whitecardopedia__AppLinkCapture__UrlBuilder__SanitizeProjectCode(rawProjectCode);                 // <-- URL-safe code
        if (!safeProjectCode) return null;                                                                                          // <-- Bail when missing

        const valeVisionRoot    = Whitecardopedia__AppLinkCapture__UrlBuilder__GetValeVision3DRoot();                               // <-- VV3D root URL
        return `${valeVisionRoot}${URL_BUILDER_VALEVISION_INDEX}?${URL_BUILDER_PROJECT_QUERY_KEY}=${safeProjectCode}`;              // <-- Direct project URL
    }
    // ---------------------------------------------------------------


    // FUNCTION | Build Handover URL (Embedded in Outgoing Share Emails)
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__UrlBuilder__BuildHandoverUrl(rawProjectCode) {
        const safeProjectCode   = Whitecardopedia__AppLinkCapture__UrlBuilder__SanitizeProjectCode(rawProjectCode);                 // <-- URL-safe code
        if (!safeProjectCode) return null;                                                                                          // <-- Bail when missing

        const whitecardopediaRoot = Whitecardopedia__AppLinkCapture__UrlBuilder__GetWhitecardopediaRoot();                          // <-- Whitecardopedia root URL
        return `${whitecardopediaRoot}${URL_BUILDER_HANDOVER_FILENAME}?${URL_BUILDER_PROJECT_QUERY_KEY}=${safeProjectCode}`;        // <-- Handover URL
    }
    // ---------------------------------------------------------------


    // FUNCTION | Build Custom-Scheme Protocol URL
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__UrlBuilder__BuildProtocolUrl(rawProjectCode) {
        const safeProjectCode   = Whitecardopedia__AppLinkCapture__UrlBuilder__SanitizeProjectCode(rawProjectCode);                 // <-- URL-safe code
        if (!safeProjectCode) return null;                                                                                          // <-- Bail when missing

        return `${URL_BUILDER_PROTOCOL_SCHEME}://${URL_BUILDER_PROTOCOL_PATH_PREFIX}/${safeProjectCode}`;                           // <-- web+valevision://project/<code>
    }
    // ---------------------------------------------------------------


    // FUNCTION | Build Handover-Forwarded Direct URL (Marker Query)
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__UrlBuilder__BuildHandoverForwardedDirectUrl(rawProjectCode) {
        const safeProjectCode   = Whitecardopedia__AppLinkCapture__UrlBuilder__SanitizeProjectCode(rawProjectCode);                 // <-- URL-safe code
        if (!safeProjectCode) return null;                                                                                          // <-- Bail when missing

        const directUrl         = Whitecardopedia__AppLinkCapture__UrlBuilder__BuildDirectProjectUrl(rawProjectCode);               // <-- Direct project URL
        if (!directUrl) return null;
        return `${directUrl}&${URL_BUILDER_HANDOVER_QUERY_KEY}=1`;                                                                  // <-- Adds marker so downstream knows source
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Read Project Code from Page URL
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__UrlBuilder__ReadProjectFromCurrentLocation() {
        if (typeof window === 'undefined' || !window.location) return null;                                                         // <-- Guard non-DOM contexts

        const params            = new URLSearchParams(window.location.search || '');                                                // <-- Parse query string
        const projectCode       = params.get(URL_BUILDER_PROJECT_QUERY_KEY);                                                        // <-- Direct ?project=
        if (projectCode && projectCode.trim()) return projectCode.trim();                                                           // <-- Return when present

        const protocolValue     = params.get(URL_BUILDER_PROTOCOL_QUERY_KEY);                                                       // <-- Protocol-launch ?protocol=
        if (protocolValue) {
            const fromProtocol  = Whitecardopedia__AppLinkCapture__UrlBuilder__ParseProtocolValue(protocolValue);                   // <-- Extract from protocol value
            if (fromProtocol) return fromProtocol;
        }

        return null;                                                                                                                // <-- No project code present
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Parse web+valevision Protocol Value
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__UrlBuilder__ParseProtocolValue(protocolValue) {
        const decoded           = (() => {
            try { return decodeURIComponent(String(protocolValue || '')); }                                                         // <-- Decode safely
            catch (error) { return String(protocolValue || ''); }                                                                   // <-- Fallback on bad encoding
        })();

        const schemePrefix      = `${URL_BUILDER_PROTOCOL_SCHEME}://`;                                                              // <-- Expected scheme prefix
        if (decoded.indexOf(schemePrefix) !== 0) return null;                                                                       // <-- Wrong scheme -> bail

        const remainder         = decoded.slice(schemePrefix.length).replace(/^\/+/, '');                                           // <-- Strip scheme + leading slashes
        const segments          = remainder.split('/').filter(Boolean);                                                             // <-- Split into segments

        if (segments[0] === URL_BUILDER_PROTOCOL_PATH_PREFIX && segments.length >= 2) {
            const candidate     = segments.slice(1).join('/');                                                                      // <-- Allow encoded slashes inside code
            return candidate ? candidate : null;                                                                                    // <-- Return project code
        }

        if (segments.length === 1 && segments[0]) {
            return segments[0];                                                                                                     // <-- Tolerant fallback for `web+valevision://CODE`
        }

        return null;                                                                                                                // <-- No code recoverable
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Global URL Builder Namespace
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__UrlBuilder__InitializeGlobalNamespace() {
        if (typeof window === 'undefined') return;                                                                                  // <-- Guard non-window contexts

        window.Whitecardopedia__AppLinkCapture__UrlBuilder = {                                                                      // <-- Public API surface
            buildDirectProjectUrl            : Whitecardopedia__AppLinkCapture__UrlBuilder__BuildDirectProjectUrl,
            buildHandoverUrl                 : Whitecardopedia__AppLinkCapture__UrlBuilder__BuildHandoverUrl,
            buildProtocolUrl                 : Whitecardopedia__AppLinkCapture__UrlBuilder__BuildProtocolUrl,
            buildHandoverForwardedDirectUrl  : Whitecardopedia__AppLinkCapture__UrlBuilder__BuildHandoverForwardedDirectUrl,
            readProjectFromCurrentLocation   : Whitecardopedia__AppLinkCapture__UrlBuilder__ReadProjectFromCurrentLocation,
            parseProtocolValue               : Whitecardopedia__AppLinkCapture__UrlBuilder__ParseProtocolValue,
            ProtocolScheme                   : URL_BUILDER_PROTOCOL_SCHEME,
            QueryKeys                        : {
                Project   : URL_BUILDER_PROJECT_QUERY_KEY,
                Protocol  : URL_BUILDER_PROTOCOL_QUERY_KEY,
                Handover  : URL_BUILDER_HANDOVER_QUERY_KEY
            }
        };
    }
    // ---------------------------------------------------------------


    Whitecardopedia__AppLinkCapture__UrlBuilder__InitializeGlobalNamespace();                                                       // <-- Mount on window immediately

// endregion -------------------------------------------------------------------

})();
