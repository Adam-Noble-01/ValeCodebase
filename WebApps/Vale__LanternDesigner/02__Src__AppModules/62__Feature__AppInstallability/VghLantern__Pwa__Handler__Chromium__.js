/* =============================================================================
   VGHLANTERN - PWA HANDLER | CHROMIUM FAMILY
   =============================================================================

   FILE       : VghLantern__Pwa__Handler__Chromium__.js
   NAMESPACE  : VghLantern
   MODULE     : VghLantern__Pwa__Handler__Chromium
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Drive the native install flow on Chromium browsers
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Captures beforeinstallprompt and defers the browser's own mini-infobar so a
     Vale-branded prompt can be presented instead.
   - Triggers prompt() when the user clicks the primary action.
   - Reacts to appinstalled to suppress the prompt permanently.
   - Covers Chrome, Chromium Edge, Opera and Samsung Internet on Windows, macOS,
     Linux and Android.
   - The beforeinstallprompt listener is attached at module load rather than at
     activate() so an event that fires before the controller initialises is still
     captured rather than lost.

   ============================================================================= */

(function () {

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Cached Prompt Event and Flags
    // ------------------------------------------------------------
    var VghLantern__Pwa__Handler__Chromium__DeferredPromptEvent  = null;                                          // <-- Cached BeforeInstallPromptEvent
    var VghLantern__Pwa__Handler__Chromium__PendingShowRequested = false;                                         // <-- Show requested before the event fired
    var VghLantern__Pwa__Handler__Chromium__SuppressShow         = false;                                         // <-- Suppress flag set by the controller
    var VghLantern__Pwa__Handler__Chromium__PlatformIdContext    = '';                                            // <-- Active platform identifier
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Prompt Configuration
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Handler__Chromium__BuildPromptConfig() {
        var urlHelper       = window.VghLantern__Pwa__Url || null;                                                // <-- Resolve the URL helper
        var iconUrl         = (urlHelper && urlHelper.getAppIconUrl) ? urlHelper.getAppIconUrl(192) : null;       // <-- 192px icon as the visual cue

        return {
            variant              : 'bar',                                                                          // <-- Compact bar layout
            iconUrl              : iconUrl,
            title                : 'Install Lantern Designer',
            body                 : 'Install the app for a full-screen window, faster loading and offline access.',
            primaryActionLabel   : 'Install',
            secondaryActionLabel : 'Not now',
            onPrimary            : VghLantern__Pwa__Handler__Chromium__TriggerNativePrompt,
            onDismiss            : VghLantern__Pwa__Handler__Chromium__OnDismiss
        };
    }
    // ---------------------------------------------------------------


    // FUNCTION | Trigger the Native Browser Install Prompt
    // ------------------------------------------------------------
    async function VghLantern__Pwa__Handler__Chromium__TriggerNativePrompt() {
        var promptEvent     = VghLantern__Pwa__Handler__Chromium__DeferredPromptEvent;                            // <-- Snapshot the stored event
        if (!promptEvent) return;                                                                                 // <-- Bail if no event was captured

        try {
            promptEvent.prompt();                                                                                 // <-- Show the native install dialog
            var userChoice  = await promptEvent.userChoice;                                                       // <-- Wait for the user decision

            if (userChoice && userChoice.outcome === 'accepted') {
                if (window.VghLantern__Pwa__SessionState && window.VghLantern__Pwa__SessionState.markInstalled) {
                    window.VghLantern__Pwa__SessionState.markInstalled();                                         // <-- Persist the accepted state
                }
            } else {
                VghLantern__Pwa__Handler__Chromium__OnDismiss();                                                  // <-- Treat a decline as a dismissal
            }
        } catch (promptError) {
            console.warn('VghLantern PWA Chromium install prompt failed:', promptError);                          // <-- Log non-blocking
        } finally {
            VghLantern__Pwa__Handler__Chromium__DeferredPromptEvent = null;                                       // <-- The event is single use
            if (window.VghLantern__Pwa__PromptUi && window.VghLantern__Pwa__PromptUi.hide) {
                window.VghLantern__Pwa__PromptUi.hide();                                                          // <-- Tear down the banner
            }
        }
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Handle User Dismissal of the Banner
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Handler__Chromium__OnDismiss() {
        if (window.VghLantern__Pwa__SessionState && window.VghLantern__Pwa__SessionState.recordDismissal) {
            window.VghLantern__Pwa__SessionState.recordDismissal(VghLantern__Pwa__Handler__Chromium__PlatformIdContext); // <-- Advance the snooze ladder
        }
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Show the Install Banner When Conditions Are Met
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Handler__Chromium__MaybeShowBanner() {
        if (VghLantern__Pwa__Handler__Chromium__SuppressShow) return;                                             // <-- Suppressed by the controller
        if (!VghLantern__Pwa__Handler__Chromium__DeferredPromptEvent) return;                                     // <-- No event captured yet
        if (!window.VghLantern__Pwa__PromptUi || !window.VghLantern__Pwa__PromptUi.show) return;                  // <-- Prompt UI not loaded yet

        if (window.VghLantern__Pwa__SessionState && window.VghLantern__Pwa__SessionState.isSuppressed) {
            if (window.VghLantern__Pwa__SessionState.isSuppressed(VghLantern__Pwa__Handler__Chromium__PlatformIdContext)) {
                return;                                                                                            // <-- Snooze still active
            }
        }

        window.VghLantern__Pwa__PromptUi.show(VghLantern__Pwa__Handler__Chromium__BuildPromptConfig());           // <-- Render the Vale-branded prompt
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Activate Handler for the Given Platform Descriptor
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__Chromium__Activate(platformDescriptor) {
        VghLantern__Pwa__Handler__Chromium__PlatformIdContext =                                                   // <-- Persist the platform id
            (platformDescriptor && platformDescriptor.platformId) || 'chromium-generic';
    }
    // ---------------------------------------------------------------


    // FUNCTION | Request Banner Display
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__Chromium__RequestShow() {
        if (VghLantern__Pwa__Handler__Chromium__DeferredPromptEvent) {
            VghLantern__Pwa__Handler__Chromium__MaybeShowBanner();                                                // <-- Render right away
            return;
        }
        VghLantern__Pwa__Handler__Chromium__PendingShowRequested = true;                                          // <-- Defer until the event arrives
    }
    // ---------------------------------------------------------------


    // FUNCTION | Set the Suppress Flag
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__Chromium__SetSuppressed(shouldSuppress) {
        VghLantern__Pwa__Handler__Chromium__SuppressShow = Boolean(shouldSuppress);                               // <-- Update the suppress flag
        if (VghLantern__Pwa__Handler__Chromium__SuppressShow && window.VghLantern__Pwa__PromptUi && window.VghLantern__Pwa__PromptUi.hide) {
            window.VghLantern__Pwa__PromptUi.hide();                                                              // <-- Hide if currently showing
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Early Event Capture and Global Exposure
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Attach Browser Install Event Listeners
    // ---------------------------------------------------------------
    // Attached at module load. Chromium can fire beforeinstallprompt before the
    // install controller has finished initialising, and the event is not replayed,
    // so capturing early is the difference between a working prompt and silence.
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Handler__Chromium__AttachEventListeners() {
        if (typeof window === 'undefined') return;                                                                // <-- Guard non-window contexts

        window.addEventListener('beforeinstallprompt', function (event) {
            event.preventDefault();                                                                               // <-- Suppress the browser mini-infobar
            VghLantern__Pwa__Handler__Chromium__DeferredPromptEvent = event;                                      // <-- Cache the event for later

            if (VghLantern__Pwa__Handler__Chromium__PendingShowRequested) {
                VghLantern__Pwa__Handler__Chromium__PendingShowRequested = false;                                 // <-- Consume the pending show
                VghLantern__Pwa__Handler__Chromium__MaybeShowBanner();                                            // <-- Render now the event exists
            }
        });

        window.addEventListener('appinstalled', function () {
            VghLantern__Pwa__Handler__Chromium__DeferredPromptEvent = null;                                       // <-- Clear the cached event
            if (window.VghLantern__Pwa__SessionState && window.VghLantern__Pwa__SessionState.markInstalled) {
                window.VghLantern__Pwa__SessionState.markInstalled();                                             // <-- Persist the install state
            }
            if (window.VghLantern__Pwa__PromptUi && window.VghLantern__Pwa__PromptUi.hide) {
                window.VghLantern__Pwa__PromptUi.hide();                                                          // <-- Hide any visible banner
            }
        });
    }
    // ---------------------------------------------------------------


    VghLantern__Pwa__Handler__Chromium__AttachEventListeners();                                                   // <-- Capture install events from the earliest point

    if (typeof window !== 'undefined') {
        window.VghLantern__Pwa__Handler__Chromium = {                                                             // <-- Expose the handler API
            activate      : VghLantern__Pwa__Handler__Chromium__Activate,
            requestShow   : VghLantern__Pwa__Handler__Chromium__RequestShow,
            setSuppressed : VghLantern__Pwa__Handler__Chromium__SetSuppressed
        };
    }

// endregion -------------------------------------------------------------------

})();
