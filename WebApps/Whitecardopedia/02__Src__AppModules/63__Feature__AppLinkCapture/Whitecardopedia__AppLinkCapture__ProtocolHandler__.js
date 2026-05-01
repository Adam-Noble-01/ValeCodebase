// =============================================================================
// WHITECARDOPEDIA - APP LINK CAPTURE - PROTOCOL HANDLER
// =============================================================================
//
// FILE       : Whitecardopedia__AppLinkCapture__ProtocolHandler__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__AppLinkCapture__ProtocolHandler
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Register / consume the web+valevision custom protocol scheme
// CREATED    : 2026
//
// DESCRIPTION:
// - Two responsibilities:
//     1. Best-effort registration of `web+valevision` via
//        `navigator.registerProtocolHandler()` so non-installed-PWA browsers
//        still get a chance to route protocol URLs back into the app.
//     2. Consumption of incoming protocol launches by parsing
//        `?protocol=web+valevision%3A%2F%2Fproject%2F<code>` from
//        the page URL and forwarding to the matching ValeVision3D project
//        view via the in-app navigation helper.
// - Idempotent and safe to load on every page that ships the install stack
//   (including the handover page itself).
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Registration Tokens
    // ------------------------------------------------------------
    const PROTO_HANDLER_REGISTRATION_TITLE  = 'ValeVision 3D';                                                                      // <-- User-visible label in browser registration UI
    const PROTO_HANDLER_REGISTRATION_FLAG   = 'Whitecardopedia__AppLinkCapture__ProtocolHandler__RegisteredFlag__v1';               // <-- localStorage flag to avoid re-prompting
    const PROTO_HANDLER_PROTOCOL_VALUE      = 'web+valevision';                                                                     // <-- Custom scheme value
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read URL Builder Helper Safely
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__ProtocolHandler__GetUrlBuilder() {
        if (typeof window === 'undefined') return null;                                                                             // <-- Guard non-DOM contexts
        return window.Whitecardopedia__AppLinkCapture__UrlBuilder || null;                                                          // <-- Resolve URL builder helper
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Read PWA Url Helper Safely
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__ProtocolHandler__GetPwaUrlHelper() {
        if (typeof window === 'undefined') return null;                                                                             // <-- Guard non-DOM contexts
        return window.Whitecardopedia__Pwa__Url || null;                                                                            // <-- Resolve PWA URL helper
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Resolve Handover Page URL Template
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__ProtocolHandler__BuildHandlerUrlTemplate() {
        const pwaUrlHelper      = Whitecardopedia__AppLinkCapture__ProtocolHandler__GetPwaUrlHelper();                              // <-- PWA URL helper
        const whitecardopediaRoot = (pwaUrlHelper && typeof pwaUrlHelper.getWhitecardopediaRoot === 'function')
            ? pwaUrlHelper.getWhitecardopediaRoot()
            : `${window.location.origin}/`;                                                                                         // <-- Fallback to origin
        return `${whitecardopediaRoot}ShareLink__OpenInApp__.html?protocol=%s`;                                                     // <-- registerProtocolHandler URL template
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Read Registration Flag from Storage
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__ProtocolHandler__HasRegistered() {
        try {
            if (typeof localStorage === 'undefined') return false;                                                                  // <-- Guard non-storage contexts
            return localStorage.getItem(PROTO_HANDLER_REGISTRATION_FLAG) === '1';                                                   // <-- Flag value check
        } catch (error) {
            return false;                                                                                                           // <-- Storage blocked -> treat as not registered
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Persist Registration Flag
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__ProtocolHandler__MarkRegistered() {
        try {
            if (typeof localStorage === 'undefined') return;                                                                        // <-- Guard non-storage contexts
            localStorage.setItem(PROTO_HANDLER_REGISTRATION_FLAG, '1');                                                             // <-- Persist flag
        } catch (error) {
            /* Silent: persistence is best-effort */
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Register web+valevision Custom Protocol Handler
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__ProtocolHandler__Register() {
        if (typeof navigator === 'undefined') return false;                                                                         // <-- Guard non-DOM contexts
        if (typeof navigator.registerProtocolHandler !== 'function') return false;                                                  // <-- API unavailable
        if (Whitecardopedia__AppLinkCapture__ProtocolHandler__HasRegistered()) return true;                                          // <-- Already registered

        try {
            const handlerUrlTemplate = Whitecardopedia__AppLinkCapture__ProtocolHandler__BuildHandlerUrlTemplate();                 // <-- Resolve URL template
            navigator.registerProtocolHandler(                                                                                      // <-- Ask browser to register
                PROTO_HANDLER_PROTOCOL_VALUE,
                handlerUrlTemplate,
                PROTO_HANDLER_REGISTRATION_TITLE
            );
            Whitecardopedia__AppLinkCapture__ProtocolHandler__MarkRegistered();                                                     // <-- Persist flag
            return true;                                                                                                            // <-- Registration attempted (browser may still prompt)
        } catch (error) {
            console.warn('Whitecardopedia App Link Capture protocol registration failed:', error);                                  // <-- Log non-blocking
            return false;                                                                                                           // <-- Allow app to continue
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Detect Active Protocol Launch and Extract Project Code
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__ProtocolHandler__ExtractProjectFromCurrentLaunch() {
        const urlBuilder        = Whitecardopedia__AppLinkCapture__ProtocolHandler__GetUrlBuilder();                                // <-- Resolve URL builder
        if (!urlBuilder) return null;                                                                                               // <-- Bail without builder

        const params            = new URLSearchParams(window.location.search || '');                                                // <-- Parse query string
        const protocolValue     = params.get(urlBuilder.QueryKeys.Protocol);                                                        // <-- Read protocol param
        if (!protocolValue) return null;                                                                                            // <-- Not a protocol launch

        return urlBuilder.parseProtocolValue(protocolValue);                                                                        // <-- Delegate parsing
    }
    // ---------------------------------------------------------------


    // FUNCTION | Forward Protocol Launch to Matching ValeVision Project
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__ProtocolHandler__ForwardToProject(projectCode) {
        const urlBuilder        = Whitecardopedia__AppLinkCapture__ProtocolHandler__GetUrlBuilder();                                // <-- Resolve URL builder
        if (!urlBuilder) return false;                                                                                              // <-- Bail without builder

        const trimmedProject    = String(projectCode || '').trim();                                                                 // <-- Sanitize input
        if (!trimmedProject) return false;                                                                                          // <-- Need a project code

        const directUrl         = urlBuilder.buildDirectProjectUrl(trimmedProject);                                                 // <-- Build target URL
        if (!directUrl) return false;                                                                                               // <-- Bail when URL invalid

        const appScopeNav       = (typeof window !== 'undefined') ? window.Na__Feature__PwaAppHelpers__AppScopeNavigation : null;   // <-- Resolve in-app nav helper
        if (appScopeNav && typeof appScopeNav.navigateCurrentClient === 'function') {
            return appScopeNav.navigateCurrentClient(directUrl);                                                                    // <-- Stay in same client
        }

        window.location.replace(directUrl);                                                                                         // <-- Fallback hard navigation
        return true;                                                                                                                // <-- Indicate dispatched
    }
    // ---------------------------------------------------------------


    // FUNCTION | Auto-Consume Protocol Launch If Present
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__ProtocolHandler__AutoConsume() {
        const projectCode       = Whitecardopedia__AppLinkCapture__ProtocolHandler__ExtractProjectFromCurrentLaunch();              // <-- Extract project code
        if (!projectCode) return false;                                                                                             // <-- Nothing to consume
        return Whitecardopedia__AppLinkCapture__ProtocolHandler__ForwardToProject(projectCode);                                     // <-- Forward to ValeVision project
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bootstrap
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Global Protocol Handler Namespace
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__ProtocolHandler__InitializeGlobalNamespace() {
        if (typeof window === 'undefined') return;                                                                                  // <-- Guard non-window contexts

        window.Whitecardopedia__AppLinkCapture__ProtocolHandler = {                                                                 // <-- Public API surface
            register                          : Whitecardopedia__AppLinkCapture__ProtocolHandler__Register,
            extractProjectFromCurrentLaunch   : Whitecardopedia__AppLinkCapture__ProtocolHandler__ExtractProjectFromCurrentLaunch,
            forwardToProject                  : Whitecardopedia__AppLinkCapture__ProtocolHandler__ForwardToProject,
            autoConsume                       : Whitecardopedia__AppLinkCapture__ProtocolHandler__AutoConsume,
            ProtocolValue                     : PROTO_HANDLER_PROTOCOL_VALUE
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Bootstrap Initialization
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__ProtocolHandler__Bootstrap() {
        Whitecardopedia__AppLinkCapture__ProtocolHandler__InitializeGlobalNamespace();                                              // <-- Mount global API immediately
    }
    // ---------------------------------------------------------------


    Whitecardopedia__AppLinkCapture__ProtocolHandler__Bootstrap();                                                                  // <-- Kick off bootstrap

// endregion -------------------------------------------------------------------

})();
