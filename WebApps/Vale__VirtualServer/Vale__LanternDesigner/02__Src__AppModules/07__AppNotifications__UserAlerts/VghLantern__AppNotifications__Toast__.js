/* =============================================================================
   VGHLANTERN - TRANSIENT TOAST NOTIFICATIONS
   =============================================================================

   FILE       : VghLantern__AppNotifications__Toast__.js
   NAMESPACE  : VghLantern
   MODULE     : AppNotifications - Toast
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Short-lived corner notifications for user action feedback
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Renders stacked toast items into #VghLantern__Toast__Root
   - Four variants: success, warning, error, info - styled by the modals sheet
   - Auto-dismisses after a configurable lifetime, click dismisses immediately
   - Caps the visible stack so a burst of events cannot flood the corner
   - Silently no-ops when the toast root is absent, so callers never need guards

   -----------------------------------------------------------------------------

   WHY THIS IS SEPARATE FROM THE SERVER CONNECTION BANNER:
   The banner is a persistent, single-instance status surface tied to server
   health. Toasts are transient, stackable, and unrelated to connectivity.
   Keeping them apart stops one concern from redrawing the other.

   ============================================================================= */

// =============================================================================
// REGION | Toast Notification Module
// =============================================================================

const VghLantern__AppNotifications__Toast = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Target and Behaviour Defaults
    // ------------------------------------------------------------
    const TOAST_ROOT_ID       =  'VghLantern__Toast__Root';                       // <-- Container in the app shell
    const ITEM_CLASS          =  'VghLantern__Toast__Item';                       // <-- Base item class
    const DEFAULT_LIFETIME_MS =  3200;                                            // <-- Auto-dismiss delay
    const MAX_VISIBLE_TOASTS  =  4;                                               // <-- Oldest is evicted beyond this
    const FADE_OUT_MS         =  180;                                             // <-- Must match the CSS transition
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Recognised Variant Keys
    // ------------------------------------------------------------
    const VARIANT_CLASS_MAP  =  {
        'success' : 'VghLantern__Toast__Item--success',
        'warning' : 'VghLantern__Toast__Item--warning',
        'error'   : 'VghLantern__Toast__Item--error',
        'info'    : 'VghLantern__Toast__Item--info'
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Live Toast Element Queue
    // ------------------------------------------------------------
    let VghLantern__Toast__ActiveItems  =  [];                                    // <-- Oldest first
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Toast Root Element
    // ------------------------------------------------------------
    function VghLantern__Toast__Root() {
        return document.getElementById(TOAST_ROOT_ID);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Variant Class for a Key
    // ------------------------------------------------------------
    function VghLantern__Toast__VariantClass(variantKey) {
        return VARIANT_CLASS_MAP[variantKey] || VARIANT_CLASS_MAP['info'];        // <-- Info is the neutral default
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Configured Toast Lifetime
    // ------------------------------------------------------------
    // DEFAULT_LIFETIME_MS is a bootstrap-only fallback for the brief window
    // before StateManager/ConfigLoader are wired up (e.g. an early boot-error
    // toast) - once config is available, the value always comes from JSON.
    function VghLantern__Toast__LifetimeMs() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return DEFAULT_LIFETIME_MS;

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return DEFAULT_LIFETIME_MS;

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var appSection    =  appConfig['VghLantern__Application__Config'] || {};

        return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            appSection, 'VghLantern__Application__Config__ToastLifetimeMs',
            'VghLantern__AppConfig__Main__.json -> VghLantern__Application__Config');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Remove a Toast Element and Drop It from the Queue
    // ------------------------------------------------------------
    function VghLantern__Toast__Remove(itemEl) {
        if (!itemEl) return;

        var queueIndex  =  VghLantern__Toast__ActiveItems.indexOf(itemEl);
        if (queueIndex !== -1) VghLantern__Toast__ActiveItems.splice(queueIndex, 1);

        itemEl.classList.remove(ITEM_CLASS + '--visible');                        // <-- Trigger the fade out

        setTimeout(function() {
            if (itemEl.parentNode) itemEl.parentNode.removeChild(itemEl);
        }, FADE_OUT_MS);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Evict the Oldest Toast When the Stack is Full
    // ------------------------------------------------------------
    function VghLantern__Toast__EnforceStackLimit() {
        while (VghLantern__Toast__ActiveItems.length >= MAX_VISIBLE_TOASTS) {
            VghLantern__Toast__Remove(VghLantern__Toast__ActiveItems[0]);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Surface
// -----------------------------------------------------------------------------

    // FUNCTION | Show a Transient Toast Notification
    // ------------------------------------------------------------
    function VghLantern__Toast__Show(messageText, variantKey, lifetimeMsOverride) {
        var root  =  VghLantern__Toast__Root();
        if (!root || !messageText) return null;                                   // <-- Shell not present, so stay silent

        VghLantern__Toast__EnforceStackLimit();

        var itemEl        =  document.createElement('div');
        itemEl.className  =  ITEM_CLASS + ' ' + VghLantern__Toast__VariantClass(variantKey);
        itemEl.textContent  =  String(messageText);
        itemEl.setAttribute('role', 'status');
        itemEl.setAttribute('aria-live', 'polite');

        root.appendChild(itemEl);
        VghLantern__Toast__ActiveItems.push(itemEl);

        requestAnimationFrame(function() {
            itemEl.classList.add(ITEM_CLASS + '--visible');                       // <-- Next frame so the transition runs
        });

        itemEl.addEventListener('click', function() {
            VghLantern__Toast__Remove(itemEl);                                    // <-- Click to dismiss early
        });

        var lifetimeMs  =  (typeof lifetimeMsOverride === 'number' && lifetimeMsOverride > 0)
            ? lifetimeMsOverride
            : VghLantern__Toast__LifetimeMs();

        setTimeout(function() {
            VghLantern__Toast__Remove(itemEl);
        }, lifetimeMs);

        return itemEl;
    }
    // ------------------------------------------------------------


    // FUNCTION | Dismiss Every Visible Toast
    // ------------------------------------------------------------
    function VghLantern__Toast__DismissAll() {
        var snapshot  =  VghLantern__Toast__ActiveItems.slice();                  // <-- Copy, since Remove mutates the queue
        for (var i = 0; i < snapshot.length; i++) {
            VghLantern__Toast__Remove(snapshot[i]);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Toast__Show        : VghLantern__Toast__Show,
        VghLantern__Toast__DismissAll  : VghLantern__Toast__DismissAll
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppNotifications__Toast  =  VghLantern__AppNotifications__Toast;
