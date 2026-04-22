/* =============================================================================
 WHITECARDVISION - UI HELPERS
=============================================================================
 FILE       : WhitecardVision__AppUtils__UiHelpers__.js
 NAMESPACE  : Wv
 MODULE     : AppUtils - UiHelpers
 PURPOSE    : Small DOM-behaviour utilities that require JavaScript.
              Currently manages scroll-indicator visibility: adds the
              Wv--IsScrolling class to any element while it is actively
              scrolling, then removes it after a short idle timeout.
              CSS reads that class to reveal the scrollbar thumb only
              during actual scroll activity.
============================================================================= */

// =============================================================================
// REGION | UiHelpers Module
// =============================================================================

(function () {
    'use strict';

    const Wv__UiHelpers__ScrollingClass   = 'Wv--IsScrolling';
    const Wv__UiHelpers__ScrollFadeMs     = 650;   //<-- ms after last scroll event before thumb fades out
    const Wv__UiHelpers__ScrollTimeouts   = new WeakMap();


    // FUNCTION | Listen for scroll events and stamp the scrolling element
    // ------------------------------------------------------------
    function Wv__UiHelpers__InstallScrollIndicator() {
        document.addEventListener('scroll', Wv__UiHelpers__OnScroll, { capture: true, passive: true });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stamp the scrolling element, debounce removal
    // ------------------------------------------------------------
    function Wv__UiHelpers__OnScroll(scrollEvent) {
        const scrollingEl = scrollEvent.target;
        if (!scrollingEl || !(scrollingEl instanceof Element)) return;

        scrollingEl.classList.add(Wv__UiHelpers__ScrollingClass);

        const existingTimeout = Wv__UiHelpers__ScrollTimeouts.get(scrollingEl);
        if (existingTimeout !== undefined) clearTimeout(existingTimeout);

        const fadeTimeout = setTimeout(() => {
            scrollingEl.classList.remove(Wv__UiHelpers__ScrollingClass);
            Wv__UiHelpers__ScrollTimeouts.delete(scrollingEl);
        }, Wv__UiHelpers__ScrollFadeMs);

        Wv__UiHelpers__ScrollTimeouts.set(scrollingEl, fadeTimeout);
    }
    // ------------------------------------------------------------


    // FUNCTION | Install all UI helpers
    // ------------------------------------------------------------
    function Wv__UiHelpers__Install() {
        Wv__UiHelpers__InstallScrollIndicator();
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__AppUtils__UiHelpers = { Wv__UiHelpers__Install };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
