/* =============================================================================
   VGHLANTERN - PWA PLATFORM DETECTOR
   =============================================================================

   FILE       : VghLantern__Pwa__PlatformDetector__.js
   NAMESPACE  : VghLantern
   MODULE     : VghLantern__Pwa__PlatformDetector
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Classify the runtime device, OS and browser for install handling
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Produces a single canonical platform identifier consumed by the install
     controller to pick the correct platform-specific handler.
   - Robust against the iPad-as-Mac user agent quirk: iPadOS 13 and later report
     MacIntel, so touch point count is used to disambiguate.
   - Detects standalone mode using both the modern display-mode media queries and
     the legacy iOS navigator.standalone flag.
   - Recognises Chromium-based Edge, Samsung Internet and Opera so they receive
     the same handler as Chrome.

   ============================================================================= */

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Platform Identifier Tokens
    // ------------------------------------------------------------
    var PLATFORM_ID_CHROMIUM_DESKTOP_WINDOWS = 'chromium-desktop-windows';                                        // <-- Windows Chrome / Edge / Opera
    var PLATFORM_ID_CHROMIUM_DESKTOP_MAC     = 'chromium-desktop-mac';                                            // <-- macOS Chrome / Edge / Opera
    var PLATFORM_ID_CHROMIUM_DESKTOP_LINUX   = 'chromium-desktop-linux';                                          // <-- Linux Chrome / Edge / Opera
    var PLATFORM_ID_CHROMIUM_ANDROID         = 'chromium-android';                                                // <-- Android Chrome / Edge / Samsung Internet
    var PLATFORM_ID_FIREFOX_DESKTOP          = 'firefox-desktop';                                                 // <-- Desktop Firefox (no install prompt)
    var PLATFORM_ID_FIREFOX_ANDROID          = 'firefox-android';                                                 // <-- Android Firefox (manual install)
    var PLATFORM_ID_IOS_SAFARI_IPHONE        = 'ios-safari-iphone';                                               // <-- iPhone Safari
    var PLATFORM_ID_IOS_SAFARI_IPAD          = 'ios-safari-ipad';                                                 // <-- iPadOS Safari
    var PLATFORM_ID_IOS_NON_SAFARI           = 'ios-non-safari';                                                  // <-- Chrome / Edge / Firefox on iOS (WebKit-bound)
    var PLATFORM_ID_MAC_SAFARI               = 'mac-safari';                                                      // <-- macOS Safari
    var PLATFORM_ID_INSTALLED_STANDALONE     = 'installed-standalone';                                            // <-- Already running as an installed app
    var PLATFORM_ID_UNKNOWN                  = 'unknown';                                                         // <-- Fallback for unrecognised user agents
    // ------------------------------------------------------------


    // MODULE CONSTANTS | User Agent Substring Patterns
    // ------------------------------------------------------------
    var UA_PATTERN_CHROME                    = /Chrome\/[0-9]/;                                                   // <-- Chrome family marker
    var UA_PATTERN_EDGE                      = /Edg(A|iOS)?\//;                                                   // <-- Edge across surfaces
    var UA_PATTERN_OPERA                     = /OPR\//;                                                           // <-- Chromium-based Opera
    var UA_PATTERN_SAMSUNG                   = /SamsungBrowser\//;                                                // <-- Samsung Internet
    var UA_PATTERN_FIREFOX                   = /Firefox\//;                                                       // <-- Desktop / Android Firefox
    var UA_PATTERN_FIREFOX_IOS               = /FxiOS\//;                                                         // <-- Firefox on iOS (WebKit)
    var UA_PATTERN_CHROME_IOS                = /CriOS\//;                                                         // <-- Chrome on iOS (WebKit)
    var UA_PATTERN_EDGE_IOS                  = /EdgiOS\//;                                                        // <-- Edge on iOS (WebKit)
    var UA_PATTERN_SAFARI_GENERIC            = /Safari\//;                                                        // <-- Safari engine token
    var UA_PATTERN_ANDROID                   = /Android/;                                                         // <-- Android OS
    var UA_PATTERN_IPHONE                    = /iPhone/;                                                          // <-- iPhone device class
    var UA_PATTERN_IPOD                      = /iPod/;                                                            // <-- iPod touch
    var UA_PATTERN_IPAD                      = /iPad/;                                                            // <-- Pre iPadOS 13 iPad user agent
    var UA_PATTERN_WINDOWS                   = /Windows NT/;                                                      // <-- Windows OS
    var UA_PATTERN_MAC                       = /Macintosh/;                                                       // <-- macOS user agent marker
    var UA_PATTERN_LINUX                     = /Linux/;                                                           // <-- Linux user agent marker
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Detection Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read User Agent String Safely
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PlatformDetector__GetUserAgent() {
        if (typeof navigator === 'undefined' || !navigator.userAgent) return '';                                  // <-- Guard non-DOM contexts
        return navigator.userAgent;                                                                                // <-- Raw user agent string
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Read Platform String Safely
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PlatformDetector__GetPlatformString() {
        if (typeof navigator === 'undefined' || !navigator.platform) return '';                                   // <-- Guard non-DOM contexts
        return navigator.platform;                                                                                 // <-- navigator.platform string
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Read Max Touch Points Safely
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PlatformDetector__GetMaxTouchPoints() {
        if (typeof navigator === 'undefined') return 0;                                                            // <-- Guard non-DOM contexts
        return Number(navigator.maxTouchPoints || 0);                                                              // <-- Touch point count for iPad-as-Mac detection
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Detect Standalone Display Mode
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PlatformDetector__IsStandaloneDisplay() {
        if (typeof window === 'undefined') return false;                                                           // <-- Guard non-window contexts

        var isDisplayStandalone     = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;             // <-- Modern API
        var isDisplayMinimalUi      = window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches;             // <-- Minimal UI is standalone-like
        var isDisplayFullscreen     = window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches;             // <-- Fullscreen is standalone-like
        var isDisplayWindowOverlay  = window.matchMedia && window.matchMedia('(display-mode: window-controls-overlay)').matches; // <-- Windows desktop app shell
        var isIosLegacyStandalone   = window.navigator && window.navigator.standalone === true;                    // <-- Legacy iOS Safari signal

        return Boolean(isDisplayStandalone || isDisplayMinimalUi || isDisplayFullscreen || isDisplayWindowOverlay || isIosLegacyStandalone);
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Detect iPad on iPadOS 13 and Later (Mac UA Quirk)
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PlatformDetector__IsIpadOsAsMac() {
        var platformString  = VghLantern__Pwa__PlatformDetector__GetPlatformString();                              // <-- Read platform string
        var maxTouchPoints  = VghLantern__Pwa__PlatformDetector__GetMaxTouchPoints();                              // <-- Read touch point count
        var userAgent       = VghLantern__Pwa__PlatformDetector__GetUserAgent();                                   // <-- Read user agent

        var looksLikeMac    = platformString === 'MacIntel' || UA_PATTERN_MAC.test(userAgent);                     // <-- Mac-claiming environment
        var hasMultiTouch   = maxTouchPoints > 1;                                                                  // <-- Multi-touch is typical for iPad, not for a Mac
        return Boolean(looksLikeMac && hasMultiTouch);                                                             // <-- iPad masquerading as a Mac
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Detect Any iOS Device
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PlatformDetector__IsAnyIosDevice() {
        var userAgent       = VghLantern__Pwa__PlatformDetector__GetUserAgent();                                   // <-- Read user agent
        if (UA_PATTERN_IPHONE.test(userAgent)) return true;                                                        // <-- iPhone match
        if (UA_PATTERN_IPOD.test(userAgent)) return true;                                                          // <-- iPod touch match
        if (UA_PATTERN_IPAD.test(userAgent)) return true;                                                          // <-- Legacy iPad user agent match
        if (VghLantern__Pwa__PlatformDetector__IsIpadOsAsMac()) return true;                                       // <-- Modern iPadOS quirk
        return false;                                                                                              // <-- Otherwise not iOS
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Detect iPad Specifically
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PlatformDetector__IsIpadDevice() {
        var userAgent       = VghLantern__Pwa__PlatformDetector__GetUserAgent();                                   // <-- Read user agent
        if (UA_PATTERN_IPAD.test(userAgent)) return true;                                                          // <-- Legacy iPad user agent match
        if (VghLantern__Pwa__PlatformDetector__IsIpadOsAsMac()) return true;                                       // <-- iPadOS Mac user agent quirk
        return false;                                                                                              // <-- Otherwise not iPad
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Detect WebKit Engine on an iOS Non-Safari Browser
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PlatformDetector__IsIosNonSafariBrowser(userAgent) {
        if (UA_PATTERN_CHROME_IOS.test(userAgent)) return true;                                                    // <-- Chrome on iOS
        if (UA_PATTERN_EDGE_IOS.test(userAgent)) return true;                                                      // <-- Edge on iOS
        if (UA_PATTERN_FIREFOX_IOS.test(userAgent)) return true;                                                   // <-- Firefox on iOS
        return false;                                                                                              // <-- Otherwise treated as Safari
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Detect Chromium Family Browser
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PlatformDetector__IsChromiumFamily(userAgent) {
        if (UA_PATTERN_CHROME.test(userAgent) && !UA_PATTERN_CHROME_IOS.test(userAgent)) return true;              // <-- Chrome on non-iOS
        if (UA_PATTERN_EDGE.test(userAgent) && !UA_PATTERN_EDGE_IOS.test(userAgent)) return true;                  // <-- Edge on non-iOS
        if (UA_PATTERN_OPERA.test(userAgent)) return true;                                                         // <-- Chromium-based Opera
        if (UA_PATTERN_SAMSUNG.test(userAgent)) return true;                                                       // <-- Samsung Internet on Android
        return false;                                                                                              // <-- Otherwise non-Chromium
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Detect Safari Engine on macOS
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PlatformDetector__IsMacSafari(userAgent) {
        var looksLikeMac    = UA_PATTERN_MAC.test(userAgent) && !VghLantern__Pwa__PlatformDetector__IsIpadOsAsMac(); // <-- Real macOS, not the iPadOS quirk
        if (!looksLikeMac) return false;                                                                           // <-- Bail if not macOS
        if (VghLantern__Pwa__PlatformDetector__IsChromiumFamily(userAgent)) return false;                          // <-- Chromium variants are not Safari
        if (UA_PATTERN_FIREFOX.test(userAgent)) return false;                                                      // <-- Firefox is not Safari
        return UA_PATTERN_SAFARI_GENERIC.test(userAgent);                                                          // <-- Genuine Safari signature
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Resolve Browser Engine Label
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PlatformDetector__GetBrowserEngineDescriptor(userAgent) {
        if (UA_PATTERN_EDGE.test(userAgent)) return 'edge';                                                        // <-- Edge variants across surfaces
        if (UA_PATTERN_OPERA.test(userAgent)) return 'opera';                                                      // <-- Chromium-based Opera
        if (UA_PATTERN_SAMSUNG.test(userAgent)) return 'samsung';                                                  // <-- Samsung Internet
        if (UA_PATTERN_CHROME_IOS.test(userAgent)) return 'chrome';                                                // <-- Chrome on iOS
        if (UA_PATTERN_FIREFOX_IOS.test(userAgent)) return 'firefox';                                              // <-- Firefox on iOS
        if (UA_PATTERN_FIREFOX.test(userAgent)) return 'firefox';                                                  // <-- Firefox engine
        if (UA_PATTERN_CHROME.test(userAgent)) return 'chrome';                                                    // <-- Chrome on non-iOS
        return 'safari';                                                                                           // <-- Default to the Safari engine
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Build Composite Platform Descriptor
    // ------------------------------------------------------------
    function VghLantern__Pwa__PlatformDetector__GetPlatformDescriptor() {
        var userAgent           = VghLantern__Pwa__PlatformDetector__GetUserAgent();                               // <-- Snapshot the user agent once
        var isStandaloneNow     = VghLantern__Pwa__PlatformDetector__IsStandaloneDisplay();                        // <-- Standalone runtime flag
        var isAnyIosDevice      = VghLantern__Pwa__PlatformDetector__IsAnyIosDevice();                             // <-- iOS family flag
        var isIpadDevice        = VghLantern__Pwa__PlatformDetector__IsIpadDevice();                               // <-- iPad-specific flag
        var browserEngineLabel  = VghLantern__Pwa__PlatformDetector__GetBrowserEngineDescriptor(userAgent);        // <-- Browser label

        var platformId          = PLATFORM_ID_UNKNOWN;                                                             // <-- Default identifier

        if (isStandaloneNow) {
            platformId          = PLATFORM_ID_INSTALLED_STANDALONE;                                                // <-- Already installed, suppress prompts
        }
        else if (isAnyIosDevice) {
            if (VghLantern__Pwa__PlatformDetector__IsIosNonSafariBrowser(userAgent)) {
                platformId      = PLATFORM_ID_IOS_NON_SAFARI;                                                      // <-- iOS Chrome / Edge / Firefox
            }
            else if (isIpadDevice) {
                platformId      = PLATFORM_ID_IOS_SAFARI_IPAD;                                                     // <-- iPadOS Safari
            }
            else {
                platformId      = PLATFORM_ID_IOS_SAFARI_IPHONE;                                                   // <-- iPhone Safari
            }
        }
        else if (UA_PATTERN_ANDROID.test(userAgent)) {
            if (UA_PATTERN_FIREFOX.test(userAgent)) {
                platformId      = PLATFORM_ID_FIREFOX_ANDROID;                                                     // <-- Android Firefox
            }
            else {
                platformId      = PLATFORM_ID_CHROMIUM_ANDROID;                                                    // <-- Android Chromium family
            }
        }
        else if (VghLantern__Pwa__PlatformDetector__IsMacSafari(userAgent)) {
            platformId          = PLATFORM_ID_MAC_SAFARI;                                                          // <-- macOS Safari
        }
        else if (VghLantern__Pwa__PlatformDetector__IsChromiumFamily(userAgent)) {
            if (UA_PATTERN_WINDOWS.test(userAgent)) {
                platformId      = PLATFORM_ID_CHROMIUM_DESKTOP_WINDOWS;                                            // <-- Windows Chromium family
            }
            else if (UA_PATTERN_MAC.test(userAgent)) {
                platformId      = PLATFORM_ID_CHROMIUM_DESKTOP_MAC;                                                // <-- macOS Chromium family
            }
            else if (UA_PATTERN_LINUX.test(userAgent)) {
                platformId      = PLATFORM_ID_CHROMIUM_DESKTOP_LINUX;                                              // <-- Linux Chromium family
            }
        }
        else if (UA_PATTERN_FIREFOX.test(userAgent)) {
            platformId          = PLATFORM_ID_FIREFOX_DESKTOP;                                                     // <-- Desktop Firefox
        }

        return {                                                                                                   // <-- Composite descriptor
            platformId          : platformId,
            isStandalone        : isStandaloneNow,
            isAnyIosDevice      : isAnyIosDevice,
            isIpadDevice        : isIpadDevice,
            browserEngineLabel  : browserEngineLabel,
            userAgentSnapshot   : userAgent
        };
    }
    // ---------------------------------------------------------------


    // FUNCTION | Subscribe to Display Mode Changes
    // ------------------------------------------------------------
    function VghLantern__Pwa__PlatformDetector__SubscribeStandaloneChanges(callback) {
        if (typeof window === 'undefined' || typeof callback !== 'function') return function () {};                // <-- Guard non-DOM and bad callbacks

        var mediaQueryList  = window.matchMedia('(display-mode: standalone)');                                     // <-- Watch standalone display mode
        var handler         = function (event) { callback(Boolean(event.matches)); };                              // <-- Forward boolean status

        if (mediaQueryList.addEventListener) {
            mediaQueryList.addEventListener('change', handler);                                                    // <-- Modern listener API
            return function () { mediaQueryList.removeEventListener('change', handler); };                         // <-- Disposer
        }

        if (mediaQueryList.addListener) {
            mediaQueryList.addListener(handler);                                                                   // <-- Legacy listener API
            return function () { mediaQueryList.removeListener(handler); };                                        // <-- Legacy disposer
        }

        return function () {};                                                                                     // <-- No-op disposer when APIs are unavailable
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Global Platform Detector Namespace
    // ------------------------------------------------------------
    function VghLantern__Pwa__PlatformDetector__InitializeGlobalNamespace() {
        if (typeof window === 'undefined') return;                                                                 // <-- Guard non-window contexts

        window.VghLantern__Pwa__PlatformDetector = {                                                               // <-- Public API surface
            getPlatformDescriptor      : VghLantern__Pwa__PlatformDetector__GetPlatformDescriptor,
            subscribeStandaloneChanges : VghLantern__Pwa__PlatformDetector__SubscribeStandaloneChanges,
            isStandaloneDisplay        : VghLantern__Pwa__PlatformDetector__IsStandaloneDisplay,
            PlatformIds : {
                ChromiumDesktopWindows : PLATFORM_ID_CHROMIUM_DESKTOP_WINDOWS,
                ChromiumDesktopMac     : PLATFORM_ID_CHROMIUM_DESKTOP_MAC,
                ChromiumDesktopLinux   : PLATFORM_ID_CHROMIUM_DESKTOP_LINUX,
                ChromiumAndroid        : PLATFORM_ID_CHROMIUM_ANDROID,
                FirefoxDesktop         : PLATFORM_ID_FIREFOX_DESKTOP,
                FirefoxAndroid         : PLATFORM_ID_FIREFOX_ANDROID,
                IosSafariIphone        : PLATFORM_ID_IOS_SAFARI_IPHONE,
                IosSafariIpad          : PLATFORM_ID_IOS_SAFARI_IPAD,
                IosNonSafari           : PLATFORM_ID_IOS_NON_SAFARI,
                MacSafari              : PLATFORM_ID_MAC_SAFARI,
                InstalledStandalone    : PLATFORM_ID_INSTALLED_STANDALONE,
                Unknown                : PLATFORM_ID_UNKNOWN
            }
        };
    }
    // ---------------------------------------------------------------


    VghLantern__Pwa__PlatformDetector__InitializeGlobalNamespace();                                                // <-- Mount on window immediately

// endregion -------------------------------------------------------------------

})();
