/* =============================================================================
   VGHLANTERN - PWA URL CONSTRUCTOR
   =============================================================================

   FILE       : VghLantern__Pwa__Url__Constructor__.js
   NAMESPACE  : VghLantern
   MODULE     : VghLantern__Pwa__Url
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Environment-aware URL resolver for the Lantern Designer PWA
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Resolves canonical absolute URLs to the app root, the manifest, the service
     worker, the app icons and the PWA module folder.
   - Tolerant of every deployment surface the app is served from:
       * Local Flask server        (http://localhost:8006/)
       * GitHub Pages sub-path     (https://<host>/ValeCodebase/WebApps/Vale__LanternDesigner/)
       * Any future custom domain  (root-mounted or sub-path)
   - Resolution order is deliberate:
       1. Explicit <meta name="vale-pwa-base"> override, when present.
       2. The Vale__LanternDesigner path segment, when present.
       3. The directory of the current document (the app is a single page, so
          this is always the app root).
   - Absolute URLs matter because a service worker scope and a manifest
     start_url resolved from relative paths silently point at the wrong place
     the moment the app moves from an origin root to a sub-path.

   ============================================================================= */

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Path Segments and Filenames
    // ------------------------------------------------------------
    var PWA_URL_APP_FOLDER_SEGMENT      = 'Vale__LanternDesigner';                                                // <-- Folder that anchors the app root in production
    var PWA_URL_PWA_MODULE_PATH         = '02__Src__AppModules/62__Feature__AppInstallability/';                  // <-- PWA module folder relative to app root
    var PWA_URL_APP_ASSETS_PATH         = '01__AppAssets__VghLantern/';                                           // <-- App icon folder relative to app root
    var PWA_URL_MANIFEST_FILENAME       = 'VghLantern__Pwa__Manifest__.webmanifest';                              // <-- Canonical manifest filename
    var PWA_URL_SERVICE_WORKER_FILENAME = 'Na__ServiceWorker__VghLantern.js';                                     // <-- Service worker script at app root
    var PWA_URL_START_PATH_RELATIVE     = 'VghLantern__App__.html';                                               // <-- PWA entrypoint relative to app root
    var PWA_URL_ICON_192_FILENAME       = 'Na__VghLanternApp__Icon__192x192.png';                                 // <-- 192px icon filename
    var PWA_URL_ICON_512_FILENAME       = 'Na__VghLanternApp__Icon__512x512.png';                                 // <-- 512px icon filename
    var PWA_URL_META_BASE_OVERRIDE_NAME = 'vale-pwa-base';                                                        // <-- Optional override meta tag name
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Localhost Heuristics
    // ------------------------------------------------------------
    var PWA_URL_LOCALHOST_HOSTS         = ['localhost', '127.0.0.1', '0.0.0.0'];                                  // <-- Hostnames treated as local development
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Ensure Trailing Slash on URL
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Url__EnsureTrailingSlash(targetUrl) {
        if (!targetUrl) return targetUrl;                                                                          // <-- Pass through falsy values untouched
        return targetUrl.charAt(targetUrl.length - 1) === '/' ? targetUrl : (targetUrl + '/');                     // <-- Append slash when missing
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Read Optional Meta Tag Override
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Url__ReadMetaOverride() {
        if (typeof document === 'undefined') return null;                                                          // <-- Guard non-DOM contexts
        var metaTag         = document.querySelector('meta[name="' + PWA_URL_META_BASE_OVERRIDE_NAME + '"]');       // <-- Locate optional override
        if (!metaTag) return null;                                                                                 // <-- No override declared

        var overrideValue   = (metaTag.getAttribute('content') || '').trim();                                      // <-- Pull and trim value
        if (!overrideValue) return null;                                                                           // <-- Empty value treated as absent

        return VghLantern__Pwa__Url__EnsureTrailingSlash(overrideValue);                                           // <-- Normalise trailing slash
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Detect Localhost Runtime
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Url__IsLocalhost() {
        if (typeof window === 'undefined') return false;                                                           // <-- Guard non-window contexts
        var hostname        = window.location.hostname || '';                                                      // <-- Current hostname
        return PWA_URL_LOCALHOST_HOSTS.indexOf(hostname) !== -1;                                                    // <-- Match against localhost host list
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Resolve App Root by App Folder Segment Probe
    // ---------------------------------------------------------------
    // On GitHub Pages the app lives at /ValeCodebase/WebApps/Vale__LanternDesigner/
    // so anchoring on the folder name yields the correct root regardless of how
    // many repo or org segments precede it.
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Url__ResolveAppRootBySegment() {
        var pathname        = window.location.pathname || '/';                                                     // <-- Current pathname
        var segments        = pathname.split('/').filter(Boolean);                                                 // <-- Drop empty splits
        var segmentIndex    = segments.indexOf(PWA_URL_APP_FOLDER_SEGMENT);                                        // <-- Locate the app folder anchor
        if (segmentIndex === -1) return null;                                                                      // <-- Anchor not present in this path

        var upToAppFolder   = segments.slice(0, segmentIndex + 1).join('/');                                       // <-- Keep everything up to the anchor inclusive
        return (window.location.origin || '') + '/' + upToAppFolder + '/';                                         // <-- Absolute URL with trailing slash
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Resolve App Root by Current Document Directory
    // ---------------------------------------------------------------
    // Lantern Designer is a single-page app served from its own folder root, so
    // the directory containing the current document is always the app root.
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Url__ResolveAppRootByDocumentDirectory() {
        var pathname        = window.location.pathname || '/';                                                     // <-- Current pathname
        var lastSlashIndex  = pathname.lastIndexOf('/');                                                           // <-- Locate final separator
        var directoryPath   = lastSlashIndex === -1 ? '/' : pathname.slice(0, lastSlashIndex + 1);                 // <-- Strip the document filename
        return (window.location.origin || '') + directoryPath;                                                     // <-- Absolute directory URL
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve App Root URL
    // ------------------------------------------------------------
    function VghLantern__Pwa__Url__GetAppRoot() {
        var overrideUrl     = VghLantern__Pwa__Url__ReadMetaOverride();                                            // <-- Honour explicit override first
        if (overrideUrl) return overrideUrl;

        var segmentRoot     = VghLantern__Pwa__Url__ResolveAppRootBySegment();                                     // <-- Probe path for the app folder anchor
        if (segmentRoot) return segmentRoot;

        return VghLantern__Pwa__Url__ResolveAppRootByDocumentDirectory();                                          // <-- Fall back to the document directory
    }
    // ---------------------------------------------------------------


    // FUNCTION | Resolve PWA Module Folder URL
    // ------------------------------------------------------------
    function VghLantern__Pwa__Url__GetPwaModuleRoot() {
        return VghLantern__Pwa__Url__GetAppRoot() + PWA_URL_PWA_MODULE_PATH;                                       // <-- PWA module folder absolute URL
    }
    // ---------------------------------------------------------------


    // FUNCTION | Resolve App Assets Folder URL
    // ------------------------------------------------------------
    function VghLantern__Pwa__Url__GetAppAssetsRoot() {
        return VghLantern__Pwa__Url__GetAppRoot() + PWA_URL_APP_ASSETS_PATH;                                       // <-- App icon folder absolute URL
    }
    // ---------------------------------------------------------------


    // FUNCTION | Resolve Service Worker Script URL
    // ------------------------------------------------------------
    function VghLantern__Pwa__Url__GetServiceWorkerUrl() {
        return VghLantern__Pwa__Url__GetAppRoot() + PWA_URL_SERVICE_WORKER_FILENAME;                               // <-- Service worker sits at the app root for full app scope
    }
    // ---------------------------------------------------------------


    // FUNCTION | Resolve Service Worker Scope URL
    // ------------------------------------------------------------
    function VghLantern__Pwa__Url__GetServiceWorkerScope() {
        return VghLantern__Pwa__Url__GetAppRoot();                                                                 // <-- Scope covers the whole app folder and nothing above it
    }
    // ---------------------------------------------------------------


    // FUNCTION | Resolve Manifest URL
    // ------------------------------------------------------------
    function VghLantern__Pwa__Url__GetManifestUrl() {
        return VghLantern__Pwa__Url__GetPwaModuleRoot() + PWA_URL_MANIFEST_FILENAME;                               // <-- Manifest absolute URL
    }
    // ---------------------------------------------------------------


    // FUNCTION | Resolve Default Start URL
    // ------------------------------------------------------------
    function VghLantern__Pwa__Url__GetStartUrl() {
        return VghLantern__Pwa__Url__GetAppRoot() + PWA_URL_START_PATH_RELATIVE;                                   // <-- PWA start URL points at the app document
    }
    // ---------------------------------------------------------------


    // FUNCTION | Resolve App Icon URL for Requested Size
    // ------------------------------------------------------------
    function VghLantern__Pwa__Url__GetAppIconUrl(iconSize) {
        var iconFilename    = (Number(iconSize) === 512) ? PWA_URL_ICON_512_FILENAME : PWA_URL_ICON_192_FILENAME;   // <-- Default to the 192px icon
        return VghLantern__Pwa__Url__GetAppAssetsRoot() + iconFilename;                                            // <-- Absolute icon URL
    }
    // ---------------------------------------------------------------


    // FUNCTION | Build Absolute URL from App Root Relative Path
    // ------------------------------------------------------------
    function VghLantern__Pwa__Url__BuildAppUrl(relativePath) {
        var cleanRelative   = String(relativePath || '').replace(/^\/+/, '');                                      // <-- Strip any leading slashes
        return VghLantern__Pwa__Url__GetAppRoot() + cleanRelative;                                                 // <-- Concatenate to the app root
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Document Head Link Maintenance
// -----------------------------------------------------------------------------

    // FUNCTION | Rewrite or Inject the Manifest Link Tag
    // ------------------------------------------------------------
    // The static tag in the document uses a relative href, which browsers resolve
    // correctly for fetching. Rewriting it to an absolute URL keeps the manifest,
    // the service worker scope and the start_url resolving from one shared base.
    // ------------------------------------------------------------
    function VghLantern__Pwa__Url__EnsureManifestLinkPresent() {
        if (typeof document === 'undefined') return;                                                               // <-- Guard non-DOM contexts

        var existingLink    = document.querySelector('link[rel="manifest"]');                                      // <-- Inspect existing tag
        var resolvedHref    = VghLantern__Pwa__Url__GetManifestUrl();                                              // <-- Build absolute URL

        if (existingLink) {
            existingLink.setAttribute('href', resolvedHref);                                                       // <-- Override the static value
            return;
        }

        var manifestLink    = document.createElement('link');                                                      // <-- Create link element
        manifestLink.rel    = 'manifest';                                                                          // <-- Manifest link relation
        manifestLink.href   = resolvedHref;                                                                        // <-- Absolute manifest URL
        document.head.appendChild(manifestLink);                                                                   // <-- Mount in head
    }
    // ---------------------------------------------------------------


    // FUNCTION | Rewrite or Inject the Apple Touch Icon
    // ------------------------------------------------------------
    function VghLantern__Pwa__Url__EnsureAppleTouchIconPresent() {
        if (typeof document === 'undefined') return;                                                               // <-- Guard non-DOM contexts

        var existingIcon    = document.querySelector('link[rel="apple-touch-icon"]');                              // <-- Inspect existing tag
        var resolvedHref    = VghLantern__Pwa__Url__GetAppIconUrl(192);                                            // <-- Build absolute URL

        if (existingIcon) {
            existingIcon.setAttribute('href', resolvedHref);                                                       // <-- Override the static value
            return;
        }

        var touchIconLink   = document.createElement('link');                                                      // <-- Create link element
        touchIconLink.rel   = 'apple-touch-icon';                                                                  // <-- Apple touch icon relation
        touchIconLink.href  = resolvedHref;                                                                        // <-- Absolute icon URL
        document.head.appendChild(touchIconLink);                                                                  // <-- Mount in head
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Global URL Helper Namespace
    // ------------------------------------------------------------
    function VghLantern__Pwa__Url__InitializeGlobalNamespace() {
        if (typeof window === 'undefined') return;                                                                 // <-- Guard non-window contexts

        window.VghLantern__Pwa__Url = {                                                                            // <-- Public API surface
            getAppRoot                  : VghLantern__Pwa__Url__GetAppRoot,
            getPwaModuleRoot            : VghLantern__Pwa__Url__GetPwaModuleRoot,
            getAppAssetsRoot            : VghLantern__Pwa__Url__GetAppAssetsRoot,
            getServiceWorkerUrl         : VghLantern__Pwa__Url__GetServiceWorkerUrl,
            getServiceWorkerScope       : VghLantern__Pwa__Url__GetServiceWorkerScope,
            getManifestUrl              : VghLantern__Pwa__Url__GetManifestUrl,
            getStartUrl                 : VghLantern__Pwa__Url__GetStartUrl,
            getAppIconUrl               : VghLantern__Pwa__Url__GetAppIconUrl,
            buildAppUrl                 : VghLantern__Pwa__Url__BuildAppUrl,
            ensureManifestLinkPresent   : VghLantern__Pwa__Url__EnsureManifestLinkPresent,
            ensureAppleTouchIconPresent : VghLantern__Pwa__Url__EnsureAppleTouchIconPresent,
            isLocalhost                 : VghLantern__Pwa__Url__IsLocalhost
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Bootstrap Url Helper Initialization
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Url__BootstrapInitialization() {
        VghLantern__Pwa__Url__InitializeGlobalNamespace();                                                         // <-- Mount API immediately

        if (typeof document === 'undefined') return;                                                               // <-- Guard non-DOM contexts

        var ensureLinks     = function () {                                                                        // <-- Rewrite manifest and touch icon
            try {
                VghLantern__Pwa__Url__EnsureManifestLinkPresent();                                                 // <-- Manifest link
                VghLantern__Pwa__Url__EnsureAppleTouchIconPresent();                                               // <-- Apple touch icon
            } catch (linkError) {
                // Silent: link maintenance is best-effort and must never break the app
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', ensureLinks, { once: true });                            // <-- Defer until DOM ready
            return;
        }
        ensureLinks();                                                                                             // <-- DOM already ready
    }
    // ---------------------------------------------------------------


    VghLantern__Pwa__Url__BootstrapInitialization();                                                               // <-- Kick off bootstrap

// endregion -------------------------------------------------------------------

})();
