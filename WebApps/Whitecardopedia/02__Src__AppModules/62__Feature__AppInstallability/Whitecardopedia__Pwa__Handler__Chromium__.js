// =============================================================================
// WHITECARDOPEDIA - PWA HANDLER (CHROMIUM FAMILY)
// =============================================================================
//
// FILE       : Whitecardopedia__Pwa__Handler__Chromium__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__Pwa__Handler__Chromium
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Drive native install flow on Chromium browsers (desktop + Android)
// CREATED    : 2026
//
// DESCRIPTION:
// - Captures the `beforeinstallprompt` event and defers the browser's
//   native UI so we can present a Vale-branded prompt instead.
// - Triggers `prompt()` when the user clicks the primary action.
// - Reacts to `appinstalled` to permanently suppress the prompt.
// - Compatible with Chrome / Edge (Chromium) / Opera / Samsung Internet on
//   Windows, macOS, Linux and Android.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Cached Prompt Event and Listeners
    // ------------------------------------------------------------
    let Whitecardopedia__Pwa__Handler__Chromium__DeferredPromptEvent    = null;                                                     // <-- Cached BeforeInstallPromptEvent
    let Whitecardopedia__Pwa__Handler__Chromium__PendingShowRequested   = false;                                                    // <-- Show requested before event fired
    let Whitecardopedia__Pwa__Handler__Chromium__SuppressShow           = false;                                                    // <-- Suppress flag from controller
    let Whitecardopedia__Pwa__Handler__Chromium__PlatformIdContext      = '';                                                       // <-- Active platform identifier
    const Whitecardopedia__Pwa__Handler__Chromium__AvailabilityListeners = [];                                                      // <-- Subscribers awaiting availability changes
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Prompt Configuration
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__Chromium__BuildPromptConfig() {
        const urlHelper         = window.Whitecardopedia__Pwa__Url || null;                                                         // <-- Resolve URL helper
        const iconUrl           = urlHelper && urlHelper.buildPwaModuleUrl                                                          // <-- Use 192px PNG as visual cue
            ? urlHelper.buildPwaModuleUrl('Na__AppInstallability__Icon__192x192.png')
            : null;

        return {
            variant              : 'bar',                                                                                           // <-- Compact bar layout
            iconUrl              : iconUrl,
            title                : 'Install ValeVision 3D',
            body                 : 'Pin the Vale review app to your home screen or start menu for a faster, app-like experience.',
            primaryActionLabel   : 'Install',
            secondaryActionLabel : 'Not now',
            onPrimary            : Whitecardopedia__Pwa__Handler__Chromium__TriggerNativePrompt,
            onDismiss            : Whitecardopedia__Pwa__Handler__Chromium__OnDismiss
        };
    }
    // ---------------------------------------------------------------


    // FUNCTION | Trigger Native Browser Install Prompt
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__Handler__Chromium__TriggerNativePrompt() {
        const promptEvent       = Whitecardopedia__Pwa__Handler__Chromium__DeferredPromptEvent;                                     // <-- Snapshot stored event
        if (!promptEvent) return;                                                                                                   // <-- Bail if no event captured

        try {
            promptEvent.prompt();                                                                                                   // <-- Show native install dialog
            const userChoice    = await promptEvent.userChoice;                                                                     // <-- Wait for user decision

            if (userChoice && userChoice.outcome === 'accepted') {
                if (window.Whitecardopedia__Pwa__SessionState && window.Whitecardopedia__Pwa__SessionState.markInstalled) {
                    window.Whitecardopedia__Pwa__SessionState.markInstalled();                                                      // <-- Persist accepted state
                }
            } else {
                Whitecardopedia__Pwa__Handler__Chromium__OnDismiss();                                                               // <-- Treat declined as dismissed
            }
        } catch (error) {
            console.warn('Whitecardopedia PWA Chromium install prompt failed:', error);                                             // <-- Log non-blocking
        } finally {
            Whitecardopedia__Pwa__Handler__Chromium__DeferredPromptEvent = null;                                                    // <-- Single-use event
            if (window.Whitecardopedia__Pwa__PromptUi && window.Whitecardopedia__Pwa__PromptUi.hide) {
                window.Whitecardopedia__Pwa__PromptUi.hide();                                                                       // <-- Tear down banner
            }
        }
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Handle User Dismissal of Banner
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__Chromium__OnDismiss() {
        if (window.Whitecardopedia__Pwa__SessionState && window.Whitecardopedia__Pwa__SessionState.recordDismissal) {
            window.Whitecardopedia__Pwa__SessionState.recordDismissal(Whitecardopedia__Pwa__Handler__Chromium__PlatformIdContext);  // <-- Snooze ladder advance
        }
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Show Install Banner When Conditions Met
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__Chromium__MaybeShowBanner() {
        if (Whitecardopedia__Pwa__Handler__Chromium__SuppressShow) return;                                                          // <-- Suppressed by controller
        if (!Whitecardopedia__Pwa__Handler__Chromium__DeferredPromptEvent) return;                                                  // <-- No event yet
        if (!window.Whitecardopedia__Pwa__PromptUi || !window.Whitecardopedia__Pwa__PromptUi.show) return;                          // <-- UI not loaded yet

        if (window.Whitecardopedia__Pwa__SessionState && window.Whitecardopedia__Pwa__SessionState.isSuppressed) {
            if (window.Whitecardopedia__Pwa__SessionState.isSuppressed(Whitecardopedia__Pwa__Handler__Chromium__PlatformIdContext)) {
                return;                                                                                                             // <-- Snooze still active
            }
        }

        window.Whitecardopedia__Pwa__PromptUi.show(Whitecardopedia__Pwa__Handler__Chromium__BuildPromptConfig());                   // <-- Render Vale-branded prompt
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Activate Handler for Given Platform Descriptor
    // ------------------------------------------------------------
    // - Listeners are attached eagerly at module bootstrap (see bottom of
    //   file) so we never miss a `beforeinstallprompt` event fired during
    //   page parse. This function only stores the active platform id used
    //   for snooze tracking.
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__Chromium__Activate(platformDescriptor) {
        Whitecardopedia__Pwa__Handler__Chromium__PlatformIdContext = (platformDescriptor && platformDescriptor.platformId) || 'chromium-generic';   // <-- Persist platform id
    }
    // ---------------------------------------------------------------


    // FUNCTION | Request Banner Display
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__Chromium__RequestShow() {
        if (Whitecardopedia__Pwa__Handler__Chromium__DeferredPromptEvent) {
            Whitecardopedia__Pwa__Handler__Chromium__MaybeShowBanner();                                                             // <-- Render right away
            return;
        }
        Whitecardopedia__Pwa__Handler__Chromium__PendingShowRequested = true;                                                       // <-- Defer until event arrives
    }
    // ---------------------------------------------------------------


    // FUNCTION | Set Suppress Flag (e.g. running standalone)
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__Chromium__SetSuppressed(shouldSuppress) {
        Whitecardopedia__Pwa__Handler__Chromium__SuppressShow = Boolean(shouldSuppress);                                            // <-- Update suppress flag
        if (Whitecardopedia__Pwa__Handler__Chromium__SuppressShow && window.Whitecardopedia__Pwa__PromptUi && window.Whitecardopedia__Pwa__PromptUi.hide) {
            window.Whitecardopedia__Pwa__PromptUi.hide();                                                                           // <-- Hide if showing
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Check Whether a Native Install Prompt is Buffered
    // ------------------------------------------------------------
    // - True only when the browser has fired `beforeinstallprompt` and the
    //   event has not yet been consumed. Useful for handover-page UX so we
    //   can swap the install button between "Install" and a manual-instructions
    //   fallback as the situation changes.
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__Chromium__IsPromptAvailable() {
        return Boolean(Whitecardopedia__Pwa__Handler__Chromium__DeferredPromptEvent);                                               // <-- True when event cached
    }
    // ---------------------------------------------------------------


    // FUNCTION | Subscribe to Prompt Availability Changes
    // ------------------------------------------------------------
    // - Returns a disposer that removes the listener again. Callers are
    //   notified whenever a `beforeinstallprompt` arrives or is consumed
    //   so they can reactively update button labels / hint text.
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__Chromium__SubscribePromptAvailability(callback) {
        if (typeof callback !== 'function') return () => {};                                                                        // <-- Guard bad callbacks
        Whitecardopedia__Pwa__Handler__Chromium__AvailabilityListeners.push(callback);                                              // <-- Track listener
        return () => {
            const indexValue = Whitecardopedia__Pwa__Handler__Chromium__AvailabilityListeners.indexOf(callback);                    // <-- Locate listener
            if (indexValue !== -1) Whitecardopedia__Pwa__Handler__Chromium__AvailabilityListeners.splice(indexValue, 1);            // <-- Drop entry
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Notify Availability Listeners
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__Chromium__BroadcastAvailability() {
        const isAvailable       = Boolean(Whitecardopedia__Pwa__Handler__Chromium__DeferredPromptEvent);                            // <-- Snapshot current state
        Whitecardopedia__Pwa__Handler__Chromium__AvailabilityListeners.forEach((listener) => {
            try { listener(isAvailable); }                                                                                          // <-- Notify each listener
            catch (error) { console.warn('Whitecardopedia PWA Chromium availability listener failed:', error); }                    // <-- Log non-blocking
        });
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Eager Event Wiring (Bootstrap)
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Attach Browser Install Listeners Eagerly
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__Chromium__AttachListenersEarly() {
        if (typeof window === 'undefined') return;                                                                                  // <-- Guard non-window contexts

        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();                                                                                                 // <-- Suppress mini-infobar
            Whitecardopedia__Pwa__Handler__Chromium__DeferredPromptEvent = event;                                                   // <-- Cache event for later

            Whitecardopedia__Pwa__Handler__Chromium__BroadcastAvailability();                                                       // <-- Notify subscribers

            if (Whitecardopedia__Pwa__Handler__Chromium__PendingShowRequested) {
                Whitecardopedia__Pwa__Handler__Chromium__PendingShowRequested = false;                                              // <-- Consume pending show
                Whitecardopedia__Pwa__Handler__Chromium__MaybeShowBanner();                                                         // <-- Render now that we have an event
            }
        });

        window.addEventListener('appinstalled', () => {
            Whitecardopedia__Pwa__Handler__Chromium__DeferredPromptEvent = null;                                                    // <-- Clear cached event
            Whitecardopedia__Pwa__Handler__Chromium__BroadcastAvailability();                                                       // <-- Notify subscribers
            if (window.Whitecardopedia__Pwa__SessionState && window.Whitecardopedia__Pwa__SessionState.markInstalled) {
                window.Whitecardopedia__Pwa__SessionState.markInstalled();                                                          // <-- Persist install state
            }
            if (window.Whitecardopedia__Pwa__PromptUi && window.Whitecardopedia__Pwa__PromptUi.hide) {
                window.Whitecardopedia__Pwa__PromptUi.hide();                                                                       // <-- Hide any visible banner
            }
        });
    }
    // ---------------------------------------------------------------


    Whitecardopedia__Pwa__Handler__Chromium__AttachListenersEarly();                                                                // <-- Kick off eager wiring at module load

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    if (typeof window !== 'undefined') {
        window.Whitecardopedia__Pwa__Handler__Chromium = {                                                                          // <-- Expose handler API
            activate                    : Whitecardopedia__Pwa__Handler__Chromium__Activate,
            requestShow                 : Whitecardopedia__Pwa__Handler__Chromium__RequestShow,
            setSuppressed               : Whitecardopedia__Pwa__Handler__Chromium__SetSuppressed,
            triggerNativePrompt         : Whitecardopedia__Pwa__Handler__Chromium__TriggerNativePrompt,
            isPromptAvailable           : Whitecardopedia__Pwa__Handler__Chromium__IsPromptAvailable,
            subscribePromptAvailability : Whitecardopedia__Pwa__Handler__Chromium__SubscribePromptAvailability
        };
    }

// endregion -------------------------------------------------------------------

})();
