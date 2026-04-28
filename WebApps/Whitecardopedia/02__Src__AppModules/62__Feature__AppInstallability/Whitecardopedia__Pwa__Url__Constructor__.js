// =============================================================================
// WHITECARDOPEDIA - PWA URL CONSTRUCTOR
// =============================================================================
//
// FILE       : Whitecardopedia__Pwa__Url__Constructor__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__Pwa__Url
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Environment-aware URL resolver for the dual-app PWA stack
// CREATED    : 2026
//
// DESCRIPTION:
// - Resolves canonical absolute URLs to the WebApps root, the two apps,
//   the manifest, the service worker and PWA module assets.
// - Tolerant of all current deployment surfaces:
//     * Whitecardopedia localhost dev server (http://localhost:8000/)
//     * ValeVision3D Flask test server (http://127.0.0.1:5500/)
//     * GitHub Pages production (https://<host>/ValeCodebase/WebApps/...)
//     * Future custom domain (https://<custom>/WebApps/... or root-mounted)
// - Allows a `<meta name="vale-pwa-base">` HTML override to short-circuit
//   environment detection when needed.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Path Segments and Defaults
    // ------------------------------------------------------------
    const PWA_URL_WEB_APPS_SEGMENT          = 'WebApps';                                                                            // <-- Segment that anchors the WebApps root in production
    const PWA_URL_WHITECARDOPEDIA_SEGMENT   = 'Whitecardopedia';                                                                    // <-- Whitecardopedia app folder name
    const PWA_URL_VALEVISION3D_SEGMENT      = 'ValeVision3D';                                                                       // <-- ValeVision3D app folder name
    const PWA_URL_PWA_MODULE_PATH           = '02__Src__AppModules/62__Feature__AppInstallability/';                                // <-- PWA install module folder relative to Whitecardopedia
    const PWA_URL_MANIFEST_FILENAME         = 'Whitecardopedia__Pwa__Manifest__.webmanifest';                                       // <-- New canonical manifest filename
    const PWA_URL_SERVICE_WORKER_FILENAME   = 'Na__Pwa__ServiceWorker__.js';                                                        // <-- Service worker stub at WebApps root
    const PWA_URL_START_PATH_RELATIVE       = 'Whitecardopedia/app.html';                                                           // <-- Default PWA entrypoint (relative to WebApps root)
    const PWA_URL_META_BASE_OVERRIDE_NAME   = 'vale-pwa-base';                                                                      // <-- Optional override meta tag name
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Localhost Heuristics
    // ------------------------------------------------------------
    const PWA_URL_LOCALHOST_HOSTS           = ['localhost', '127.0.0.1', '0.0.0.0'];                                                // <-- Localhost hostnames
    const PWA_URL_WHITECARDOPEDIA_DEV_PORT  = '8000';                                                                               // <-- Whitecardopedia Flask dev server port
    const PWA_URL_VALEVISION3D_DEV_PORT     = '5500';                                                                               // <-- ValeVision3D Flask test environment port
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read Optional Meta Tag Override
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__ReadMetaOverride() {
        if (typeof document === 'undefined') return null;                                                                           // <-- Guard non-DOM contexts
        const metaTag           = document.querySelector(`meta[name="${PWA_URL_META_BASE_OVERRIDE_NAME}"]`);                        // <-- Locate optional override
        if (!metaTag) return null;                                                                                                  // <-- No override defined

        const overrideValue     = (metaTag.getAttribute('content') || '').trim();                                                   // <-- Pull and trim value
        if (!overrideValue) return null;                                                                                            // <-- Empty value treated as absent

        return Whitecardopedia__Pwa__Url__EnsureTrailingSlash(overrideValue);                                                       // <-- Normalize trailing slash
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Ensure Trailing Slash on URL
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__EnsureTrailingSlash(targetUrl) {
        if (!targetUrl) return targetUrl;                                                                                           // <-- Pass through falsy values
        return targetUrl.endsWith('/') ? targetUrl : `${targetUrl}/`;                                                               // <-- Append slash when missing
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Detect Localhost Runtime
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__IsLocalhost() {
        if (typeof window === 'undefined') return false;                                                                            // <-- Guard non-window contexts
        const hostname          = window.location.hostname || '';                                                                   // <-- Current hostname
        return PWA_URL_LOCALHOST_HOSTS.indexOf(hostname) !== -1;                                                                    // <-- Match against localhost host list
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Origin Anchored Path
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__BuildOriginAnchoredPath(pathSegments) {
        const safeOrigin        = window.location.origin || '';                                                                     // <-- Origin (scheme://host[:port])
        const joinedSegments    = pathSegments
            .filter(segment => segment !== null && segment !== undefined && segment !== '')                                         // <-- Drop empty segments
            .join('/');                                                                                                             // <-- Join with single slash separators

        const trailing          = joinedSegments.endsWith('/') ? '' : '/';                                                          // <-- Add trailing slash if needed
        const leading           = joinedSegments.startsWith('/') ? '' : '/';                                                        // <-- Add leading slash if needed
        return `${safeOrigin}${leading}${joinedSegments}${trailing}`;                                                               // <-- Final absolute URL
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Resolve WebApps Root by Pathname Probe
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__ResolveWebAppsRootByPathname() {
        const pathname          = window.location.pathname || '/';                                                                  // <-- Current pathname
        const segments          = pathname.split('/').filter(Boolean);                                                              // <-- Drop empty splits
        const webAppsIndex      = segments.indexOf(PWA_URL_WEB_APPS_SEGMENT);                                                       // <-- Locate WebApps anchor
        if (webAppsIndex === -1) return null;                                                                                       // <-- No WebApps segment present

        const upToWebApps       = segments.slice(0, webAppsIndex + 1);                                                              // <-- Keep everything up to WebApps inclusive
        return Whitecardopedia__Pwa__Url__BuildOriginAnchoredPath(upToWebApps);                                                     // <-- Build absolute URL with trailing slash
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Resolve WebApps Root for Localhost
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__ResolveWebAppsRootForLocalhost() {
        const port              = window.location.port || '';                                                                       // <-- Current port string

        if (port === PWA_URL_WHITECARDOPEDIA_DEV_PORT) {
            return Whitecardopedia__Pwa__Url__EnsureTrailingSlash(window.location.origin);                                          // <-- Whitecardopedia dev server treats its own folder as root
        }

        if (port === PWA_URL_VALEVISION3D_DEV_PORT) {
            return Whitecardopedia__Pwa__Url__EnsureTrailingSlash(window.location.origin);                                          // <-- VV3D Flask test env serves VV3D as root
        }

        return Whitecardopedia__Pwa__Url__EnsureTrailingSlash(window.location.origin);                                              // <-- Fallback: origin root
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Detect Whitecardopedia App Context
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__IsWhitecardopediaContext() {
        const pathname          = window.location.pathname || '';                                                                   // <-- Current pathname
        if (pathname.indexOf(`/${PWA_URL_WHITECARDOPEDIA_SEGMENT}/`) !== -1) return true;                                            // <-- Production-style path match
        if (Whitecardopedia__Pwa__Url__IsLocalhost() && window.location.port === PWA_URL_WHITECARDOPEDIA_DEV_PORT) return true;     // <-- Localhost match by port
        return false;                                                                                                               // <-- Otherwise not Whitecardopedia
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Detect ValeVision3D App Context
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__IsValeVision3DContext() {
        const pathname          = window.location.pathname || '';                                                                   // <-- Current pathname
        if (pathname.indexOf(`/${PWA_URL_VALEVISION3D_SEGMENT}/`) !== -1) return true;                                              // <-- Production-style path match
        if (Whitecardopedia__Pwa__Url__IsLocalhost() && window.location.port === PWA_URL_VALEVISION3D_DEV_PORT) return true;        // <-- Localhost match by port
        return false;                                                                                                               // <-- Otherwise not ValeVision3D
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve WebApps Root URL
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__GetWebAppsRoot() {
        const overrideUrl       = Whitecardopedia__Pwa__Url__ReadMetaOverride();                                                    // <-- Honour explicit override first
        if (overrideUrl) return overrideUrl;

        const pathnameRoot      = Whitecardopedia__Pwa__Url__ResolveWebAppsRootByPathname();                                        // <-- Probe path for WebApps segment
        if (pathnameRoot) return pathnameRoot;

        if (Whitecardopedia__Pwa__Url__IsLocalhost()) {
            return Whitecardopedia__Pwa__Url__ResolveWebAppsRootForLocalhost();                                                     // <-- Localhost heuristic fallback
        }

        return Whitecardopedia__Pwa__Url__EnsureTrailingSlash(window.location.origin);                                              // <-- Final fallback to origin root
    }
    // ---------------------------------------------------------------


    // FUNCTION | Resolve Whitecardopedia App Root URL
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__GetWhitecardopediaRoot() {
        if (Whitecardopedia__Pwa__Url__IsLocalhost() && window.location.port === PWA_URL_WHITECARDOPEDIA_DEV_PORT) {
            return Whitecardopedia__Pwa__Url__EnsureTrailingSlash(window.location.origin);                                          // <-- Localhost dev server hosts Whitecardopedia at origin root
        }

        const webAppsRoot       = Whitecardopedia__Pwa__Url__GetWebAppsRoot();                                                      // <-- Resolve WebApps root
        return `${webAppsRoot}${PWA_URL_WHITECARDOPEDIA_SEGMENT}/`;                                                                 // <-- Whitecardopedia under WebApps
    }
    // ---------------------------------------------------------------


    // FUNCTION | Resolve ValeVision3D App Root URL
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__GetValeVision3DRoot() {
        if (Whitecardopedia__Pwa__Url__IsLocalhost() && window.location.port === PWA_URL_WHITECARDOPEDIA_DEV_PORT) {
            return `${Whitecardopedia__Pwa__Url__EnsureTrailingSlash(window.location.origin)}${PWA_URL_VALEVISION3D_SEGMENT}/`;     // <-- Whitecardopedia dev server proxies VV3D under same origin
        }

        if (Whitecardopedia__Pwa__Url__IsLocalhost() && window.location.port === PWA_URL_VALEVISION3D_DEV_PORT) {
            return Whitecardopedia__Pwa__Url__EnsureTrailingSlash(window.location.origin);                                          // <-- VV3D Flask test env hosts VV3D at origin root
        }

        const webAppsRoot       = Whitecardopedia__Pwa__Url__GetWebAppsRoot();                                                      // <-- Resolve WebApps root
        return `${webAppsRoot}${PWA_URL_VALEVISION3D_SEGMENT}/`;                                                                    // <-- ValeVision3D under WebApps
    }
    // ---------------------------------------------------------------


    // FUNCTION | Resolve PWA Module Folder URL
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__GetPwaModuleRoot() {
        return `${Whitecardopedia__Pwa__Url__GetWhitecardopediaRoot()}${PWA_URL_PWA_MODULE_PATH}`;                                  // <-- PWA module folder absolute URL
    }
    // ---------------------------------------------------------------


    // FUNCTION | Resolve Service Worker Script URL
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__GetServiceWorkerUrl() {
        if (Whitecardopedia__Pwa__Url__IsLocalhost() && window.location.port === PWA_URL_WHITECARDOPEDIA_DEV_PORT) {
            return `${Whitecardopedia__Pwa__Url__EnsureTrailingSlash(window.location.origin)}${PWA_URL_SERVICE_WORKER_FILENAME}`;   // <-- server.py exposes SW at origin root
        }

        return `${Whitecardopedia__Pwa__Url__GetWebAppsRoot()}${PWA_URL_SERVICE_WORKER_FILENAME}`;                                  // <-- SW file lives at WebApps level for max scope
    }
    // ---------------------------------------------------------------


    // FUNCTION | Resolve Service Worker Scope URL
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__GetServiceWorkerScope() {
        if (Whitecardopedia__Pwa__Url__IsLocalhost() && window.location.port === PWA_URL_WHITECARDOPEDIA_DEV_PORT) {
            return Whitecardopedia__Pwa__Url__EnsureTrailingSlash(window.location.origin);                                          // <-- Origin root scope on localhost dev server
        }

        return Whitecardopedia__Pwa__Url__GetWebAppsRoot();                                                                         // <-- WebApps scope covers both apps in production
    }
    // ---------------------------------------------------------------


    // FUNCTION | Resolve Manifest URL
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__GetManifestUrl() {
        return `${Whitecardopedia__Pwa__Url__GetPwaModuleRoot()}${PWA_URL_MANIFEST_FILENAME}`;                                      // <-- Manifest absolute URL
    }
    // ---------------------------------------------------------------


    // FUNCTION | Resolve Default Start URL
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__GetStartUrl() {
        return `${Whitecardopedia__Pwa__Url__GetWebAppsRoot()}${PWA_URL_START_PATH_RELATIVE}`;                                      // <-- PWA start URL points to Whitecardopedia/app.html
    }
    // ---------------------------------------------------------------


    // FUNCTION | Build Absolute URL from PWA Module Relative Path
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__BuildPwaModuleUrl(relativePath) {
        const cleanRelative     = String(relativePath || '').replace(/^\/+/, '');                                                   // <-- Strip any leading slashes
        return `${Whitecardopedia__Pwa__Url__GetPwaModuleRoot()}${cleanRelative}`;                                                  // <-- Concatenate to PWA module root
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    // FUNCTION | Inject Manifest Link Tag if Absent
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__EnsureManifestLinkPresent() {
        if (typeof document === 'undefined') return;                                                                                // <-- Guard non-DOM contexts

        const existingLink      = document.querySelector('link[rel="manifest"]');                                                   // <-- Inspect existing tag
        const resolvedHref      = Whitecardopedia__Pwa__Url__GetManifestUrl();                                                      // <-- Build absolute URL

        if (existingLink) {
            existingLink.setAttribute('href', resolvedHref);                                                                        // <-- Override any static value
            return;
        }

        const manifestLink      = document.createElement('link');                                                                   // <-- Create link element
        manifestLink.rel        = 'manifest';                                                                                       // <-- Manifest link relation
        manifestLink.href       = resolvedHref;                                                                                     // <-- Absolute manifest URL
        document.head.appendChild(manifestLink);                                                                                    // <-- Mount in head
    }
    // ---------------------------------------------------------------


    // FUNCTION | Inject Apple Touch Icon if Absent
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__EnsureAppleTouchIconPresent() {
        if (typeof document === 'undefined') return;                                                                                // <-- Guard non-DOM contexts

        const existingTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');                                           // <-- Inspect existing tag
        const resolvedHref      = Whitecardopedia__Pwa__Url__BuildPwaModuleUrl('Na__AppInstallability__Icon__192x192.png');         // <-- Build absolute URL

        if (existingTouchIcon) {
            existingTouchIcon.setAttribute('href', resolvedHref);                                                                   // <-- Override any static value
            return;
        }

        const touchIconLink     = document.createElement('link');                                                                   // <-- Create link element
        touchIconLink.rel       = 'apple-touch-icon';                                                                               // <-- Apple touch icon relation
        touchIconLink.href      = resolvedHref;                                                                                     // <-- Absolute icon URL
        document.head.appendChild(touchIconLink);                                                                                   // <-- Mount in head
    }
    // ---------------------------------------------------------------


    // FUNCTION | Initialize Global URL Helper Namespace
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__InitializeGlobalNamespace() {
        if (typeof window === 'undefined') return;                                                                                  // <-- Guard non-window contexts

        window.Whitecardopedia__Pwa__Url = {                                                                                        // <-- Public API surface
            getWebAppsRoot              : Whitecardopedia__Pwa__Url__GetWebAppsRoot,
            getWhitecardopediaRoot      : Whitecardopedia__Pwa__Url__GetWhitecardopediaRoot,
            getValeVision3DRoot         : Whitecardopedia__Pwa__Url__GetValeVision3DRoot,
            getPwaModuleRoot            : Whitecardopedia__Pwa__Url__GetPwaModuleRoot,
            getServiceWorkerUrl         : Whitecardopedia__Pwa__Url__GetServiceWorkerUrl,
            getServiceWorkerScope       : Whitecardopedia__Pwa__Url__GetServiceWorkerScope,
            getManifestUrl              : Whitecardopedia__Pwa__Url__GetManifestUrl,
            getStartUrl                 : Whitecardopedia__Pwa__Url__GetStartUrl,
            buildPwaModuleUrl           : Whitecardopedia__Pwa__Url__BuildPwaModuleUrl,
            ensureManifestLinkPresent   : Whitecardopedia__Pwa__Url__EnsureManifestLinkPresent,
            ensureAppleTouchIconPresent : Whitecardopedia__Pwa__Url__EnsureAppleTouchIconPresent,
            isLocalhost                 : Whitecardopedia__Pwa__Url__IsLocalhost,
            isWhitecardopediaContext    : Whitecardopedia__Pwa__Url__IsWhitecardopediaContext,
            isValeVision3DContext       : Whitecardopedia__Pwa__Url__IsValeVision3DContext
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Bootstrap Url Helper Initialization
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Url__BootstrapInitialization() {
        Whitecardopedia__Pwa__Url__InitializeGlobalNamespace();                                                                     // <-- Mount API immediately

        const ensureLinks       = () => {                                                                                           // <-- Inject manifest + apple-touch icon
            try {
                Whitecardopedia__Pwa__Url__EnsureManifestLinkPresent();                                                             // <-- Inject manifest link
                Whitecardopedia__Pwa__Url__EnsureAppleTouchIconPresent();                                                           // <-- Inject Apple touch icon
            } catch (error) {
                // Silent: link injection is best-effort and must never break the app
            }
        };

        if (typeof document === 'undefined') return;                                                                                // <-- Guard non-DOM contexts
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', ensureLinks, { once: true });                                             // <-- Defer until DOM ready
            return;
        }
        ensureLinks();                                                                                                              // <-- DOM already ready -> inject now
    }
    // ---------------------------------------------------------------


    Whitecardopedia__Pwa__Url__BootstrapInitialization();                                                                           // <-- Kick off bootstrap

// endregion -------------------------------------------------------------------

})();
