// =============================================================================
// VALEVISION3D - FEATURE - PHONE UI
// =============================================================================
//
// FILE       : Na__Feature__PhoneUi__.js
// NAMESPACE  : Na__PhoneUi
// MODULE     : Feature - Phone UI
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Run the phone layout: fold the top bar away once the model is
//              on screen and let it be pulled back down; open and close the
//              navigation and Tools & Settings corner icons; wake the view
//              carousel while it is touched and let it shrink and fade after
// CREATED    : 29-Oct-2026
//
// DESCRIPTION:
// - PHONES ONLY, EVERY PHONE (Adam, 29-Oct-2026: "On mobile phones the UI is
//   horrendous"; staff and clients alike). index.html's head script marks
//   <html class="na-phone-ui"> (and data-na-device="phone") on a phone, decided
//   by what the device is: an iPhone, an Android whose browser says Mobile, or a
//   browser whose own mobile flag is set. Never by screen size: a computer,
//   touchscreen or not, always keeps its top bar (Adam, v2.81.4). To see it on a
//   computer, use the browser's device emulation with a phone selected.
//   Without that class this module does nothing.
// - THE TOP BAR (Adam: "when people land its branded, but then goes away"):
//   down on landing, folds away 2 s after the model shows, at TrueVision 3D's
//   layout editor pace (Na__Feature__PhoneUi__Stylesheet__.css). The pull tab
//   under it brings it back: tap it, or drag it down (it follows the finger,
//   then snaps). Down again, it folds by itself after 5 s untouched, or at
//   once on a touch on the model; never while its person menu is open.
// - THE NAVIGATION (top left): the active mode's icon alone. The first press
//   opens it into the row (Orbit, Walk, Fly, Reset View, Help) and does
//   nothing else; a press in the open row acts, then the row closes. It also
//   closes after 4 s untouched or on a touch anywhere else.
// - TOOLS & SETTINGS (top right): its icon alone until pressed (the styles).
//   Opening one corner closes the other.
// - THE VIEW CAROUSEL: 50% and faded while idle, 75% while in use. A touch
//   wakes it for 3 s after the last touch (Adam). The first tap on an idle
//   carousel only wakes it, so a small picture is never picked by accident.
//   The carousel's own wake (a scene's camera flight) keeps it awake too.
// - THE CLIENT TOUR: while it explains the views the carousel stays awake;
//   while it explains looking around or Help the navigation stays open
//   (it watches <html>'s na-client-tour-step-- class, no import).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 29-Oct-2026 - Version 1.0.2 (ValeVision3D v2.81.4)
// - A phone is now what the device is, not touch plus a small screen (a PC was
//   given the folding bar); the ?phone-ui= override is gone.
//
// 29-Oct-2026 - Version 1.0.1 (ValeVision3D v2.81.2)
// - Held upright the bar never folds (the stylesheet's portrait rule beats the
//   fold class and any drag, and hides the pull tab): there is room for the
//   logo upright, and a browser tab is assumed upright (Adam).
//
// 29-Oct-2026 - Version 1.0.0
// - Initial build (ValeVision3D v2.81.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    const Na__PhoneUi__HTML_CLASS     = 'na-phone-ui';
    const Na__PhoneUi__FOLDED         = 'na-phone-ui--folded';
    const Na__PhoneUi__DRAGGING       = 'na-phone-ui--dragging';
    const Na__PhoneUi__SNAPPING       = 'na-phone-ui--snapping';
    const Na__PhoneUi__NAV_OPEN       = 'na-phone-nav--open';
    const Na__PhoneUi__AWAKE          = 'na-phone-ui--awake';
    const Na__PhoneUi__SHOWN_VAR      = '--na-phone-header-shown';

    const Na__PhoneUi__LAND_HOLD_MS   = 2000;                                      // <-- Branded beat after the model shows, then the fold
    const Na__PhoneUi__REFOLD_MS      = 5000;                                      // <-- Pulled down and left alone
    const Na__PhoneUi__NAV_IDLE_MS    = 4000;                                      // <-- The open row, left alone
    const Na__PhoneUi__NAV_AFTER_MS   = 350;                                       // <-- A mode picked: let it show, then close
    const Na__PhoneUi__CAROUSEL_MS    = 3000;                                      // <-- Awake after the last touch (Adam)
    const Na__PhoneUi__SNAP_MS        = 400;
    const Na__PhoneUi__TAP_PX         = 6;                                         // <-- Less movement than this is a tap, not a drag

    const Na__PhoneUi__TOUR_VIEWS     = 'na-client-tour-step--views';
    const Na__PhoneUi__TOUR_NAV       = ['na-client-tour-step--look', 'na-client-tour-step--help'];

    const Na__PhoneUi__State = {
        started : false, header : null, nav : null, tools : null, carousel : null, pull : null,
        refoldTimer : 0, navTimer : 0, carouselTimer : 0, snapTimer : 0,
        drag : null, carouselWasIdle : false, tourHoldsNav : false, tourHoldsCarousel : false
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is This a Phone? (index.html's head script decided)
    // ------------------------------------------------------------
    function Na__PhoneUi__IsPhone() {
        return document.documentElement.classList.contains(Na__PhoneUi__HTML_CLASS);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Bar's Full Height in Pixels
    // ------------------------------------------------------------
    function Na__PhoneUi__BarHeight() {
        const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--Vale_HeaderHeight'));
        return value > 0 ? value : 54;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is the Person Menu in the Bar Open? (never fold it away under a finger)
    // ------------------------------------------------------------
    function Na__PhoneUi__UserMenuOpen() {
        return !!document.querySelector('.app-header .ValeUserLogin__Menu--open');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Top Bar: Fold, Unfold, Drag
// -----------------------------------------------------------------------------

    // FUNCTION | Fold the Bar Away (or Bring It Down); snap = the shorter 380ms after a drag
    // ------------------------------------------------------------
    function Na__PhoneUi__SetFolded(folded, snap) {
        const html = document.documentElement;
        const state = Na__PhoneUi__State;
        clearTimeout(state.refoldTimer);
        if (folded && Na__PhoneUi__UserMenuOpen()) {                            // <-- Someone is using the bar: ask again shortly
            state.refoldTimer = setTimeout(() => Na__PhoneUi__SetFolded(true), Na__PhoneUi__REFOLD_MS);
            return;
        }
        if (snap) {
            html.classList.add(Na__PhoneUi__SNAPPING);
            clearTimeout(state.snapTimer);
            state.snapTimer = setTimeout(() => html.classList.remove(Na__PhoneUi__SNAPPING), Na__PhoneUi__SNAP_MS);
        }
        html.style.removeProperty(Na__PhoneUi__SHOWN_VAR);                      // <-- Any drag position gives way to the class
        html.classList.toggle(Na__PhoneUi__FOLDED, !!folded);
        if (state.pull) state.pull.setAttribute('aria-label', folded ? 'Show the top bar' : 'Hide the top bar');
        if (!folded) state.refoldTimer = setTimeout(() => Na__PhoneUi__SetFolded(true), Na__PhoneUi__REFOLD_MS);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Pull Tab: a Tap Toggles, a Drag Follows the Finger
    // ------------------------------------------------------------
    function Na__PhoneUi__WirePull(pull) {
        const html = document.documentElement;
        const state = Na__PhoneUi__State;

        pull.addEventListener('pointerdown', (event) => {
            const height = Na__PhoneUi__BarHeight();
            const shown = html.classList.contains(Na__PhoneUi__FOLDED) ? 0 : height;
            state.drag = { id : event.pointerId, startY : event.clientY, shown, height, moved : false };
            clearTimeout(state.refoldTimer);
            try { pull.setPointerCapture(event.pointerId); } catch (error) { /* older browser: moves still arrive */ }
            event.preventDefault();
        });

        pull.addEventListener('pointermove', (event) => {
            const drag = state.drag;
            if (!drag || drag.id !== event.pointerId) return;
            const dy = event.clientY - drag.startY;
            if (!drag.moved && Math.abs(dy) < Na__PhoneUi__TAP_PX) return;
            if (!drag.moved) {
                drag.moved = true;
                html.classList.add(Na__PhoneUi__DRAGGING);
            }
            const shown = Math.max(0, Math.min(drag.height, drag.shown + dy));
            html.style.setProperty(Na__PhoneUi__SHOWN_VAR, `${shown}px`);
            drag.now = shown;
        });

        const finish = (event) => {
            const drag = state.drag;
            if (!drag || drag.id !== event.pointerId) return;
            state.drag = null;
            html.classList.remove(Na__PhoneUi__DRAGGING);
            if (!drag.moved) {                                                   // <-- A tap: the other way
                Na__PhoneUi__SetFolded(!html.classList.contains(Na__PhoneUi__FOLDED), true);
                return;
            }
            Na__PhoneUi__SetFolded((drag.now || 0) < drag.height / 2, true);     // <-- Past halfway down stays down
        };
        pull.addEventListener('pointerup', finish);
        pull.addEventListener('pointercancel', finish);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fold Once, a Beat After the Model Shows
    // ------------------------------------------------------------
    function Na__PhoneUi__FoldAfterLanding() {
        const fold = () => setTimeout(() => {
            if (!Na__PhoneUi__State.drag) Na__PhoneUi__SetFolded(true);
        }, Na__PhoneUi__LAND_HOLD_MS);
        const canvas = document.getElementById('renderCanvas');
        if (canvas && canvas.classList.contains('canvas-visible')) fold();     // <-- Already on screen
        else window.addEventListener('na-app-scene-ready', fold, { once : true });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Navigation Corner
// -----------------------------------------------------------------------------

    // FUNCTION | Open or Close the Row
    // ------------------------------------------------------------
    function Na__PhoneUi__SetNavOpen(open) {
        const state = Na__PhoneUi__State;
        if (!state.nav) return;
        clearTimeout(state.navTimer);
        if (!open && state.tourHoldsNav) return;                                // <-- The tour is pointing at it
        state.nav.classList.toggle(Na__PhoneUi__NAV_OPEN, !!open);
        if (open) {
            Na__PhoneUi__SetToolsOpen(false);
            if (!state.tourHoldsNav) state.navTimer = setTimeout(() => Na__PhoneUi__SetNavOpen(false), Na__PhoneUi__NAV_IDLE_MS);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Press on the Corner: the First Opens It, a Press in the Open Row Acts and Closes It
    // ------------------------------------------------------------
    function Na__PhoneUi__WireNav(nav) {
        nav.addEventListener('click', (event) => {
            if (!nav.classList.contains(Na__PhoneUi__NAV_OPEN)) {
                event.preventDefault();
                event.stopPropagation();                                         // <-- Capture on the bar: the button's own handler never hears it
                Na__PhoneUi__SetNavOpen(true);
                return;
            }
            const state = Na__PhoneUi__State;
            clearTimeout(state.navTimer);
            state.navTimer = setTimeout(() => Na__PhoneUi__SetNavOpen(false), Na__PhoneUi__NAV_AFTER_MS);
        }, true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Tools & Settings Corner
// -----------------------------------------------------------------------------

    // FUNCTION | Close (or Open) Tools & Settings
    // ------------------------------------------------------------
    function Na__PhoneUi__SetToolsOpen(open) {
        const tools = Na__PhoneUi__State.tools;
        if (!tools) return;
        if (open) tools.setAttribute('open', 'open');
        else tools.removeAttribute('open');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The View Carousel
// -----------------------------------------------------------------------------

    // FUNCTION | Wake the Carousel, and Let It Shrink and Fade 3 s After the Last Touch
    // ------------------------------------------------------------
    function Na__PhoneUi__WakeCarousel() {
        const state = Na__PhoneUi__State;
        if (!state.carousel) return;
        state.carousel.classList.add(Na__PhoneUi__AWAKE);
        clearTimeout(state.carouselTimer);
        if (state.tourHoldsCarousel) return;
        state.carouselTimer = setTimeout(() => {
            if (!Na__PhoneUi__State.tourHoldsCarousel) state.carousel.classList.remove(Na__PhoneUi__AWAKE);
        }, Na__PhoneUi__CAROUSEL_MS);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Touches on the Carousel (the first tap on an idle one only wakes it)
    // ------------------------------------------------------------
    function Na__PhoneUi__WireCarousel(carousel) {
        const state = Na__PhoneUi__State;
        const isAwake = () => carousel.classList.contains(Na__PhoneUi__AWAKE) || carousel.classList.contains('na-pm-carousel--wake');
        carousel.addEventListener('pointerdown', () => {
            state.carouselWasIdle = !isAwake();
            Na__PhoneUi__WakeCarousel();
        }, true);
        carousel.addEventListener('click', (event) => {
            if (state.carouselWasIdle) {
                state.carouselWasIdle = false;
                event.preventDefault();
                event.stopPropagation();                                         // <-- Waking is all the first tap does
            }
            Na__PhoneUi__WakeCarousel();
        }, true);
        ['pointermove', 'wheel', 'scroll'].forEach((name) => {
            carousel.addEventListener(name, () => { if (isAwake()) Na__PhoneUi__WakeCarousel(); }, { capture : true, passive : true });
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Touches Elsewhere, and the Client Tour
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Touch Outside: Close the Open Corners; on the Model, Fold the Bar
    // ------------------------------------------------------------
    function Na__PhoneUi__OnPointerDown(event) {
        const state = Na__PhoneUi__State;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (state.nav && !state.nav.contains(target)) Na__PhoneUi__SetNavOpen(false);
        if (state.tools && state.tools.hasAttribute('open') && !state.tools.contains(target)
            && !target.closest('.na-dropdown-menu, .na-confirm-dialog, .na-nav-help')) {
            Na__PhoneUi__SetToolsOpen(false);
        }
        if (target.id === 'renderCanvas' && !document.documentElement.classList.contains(Na__PhoneUi__FOLDED)
            && !Na__PhoneUi__UserMenuOpen() && state.header && state.header.dataset.naPhoneLanded === '1') {
            Na__PhoneUi__SetFolded(true, true);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Tour Explaining a Part: Keep That Part Open
    // ------------------------------------------------------------
    function Na__PhoneUi__WatchTour() {
        const html = document.documentElement;
        const state = Na__PhoneUi__State;
        const check = () => {
            const holdsNav = Na__PhoneUi__TOUR_NAV.some((name) => html.classList.contains(name));
            const holdsCarousel = html.classList.contains(Na__PhoneUi__TOUR_VIEWS);
            if (holdsNav !== state.tourHoldsNav) {
                state.tourHoldsNav = holdsNav;
                Na__PhoneUi__SetNavOpen(holdsNav);
            }
            if (holdsCarousel !== state.tourHoldsCarousel) {
                state.tourHoldsCarousel = holdsCarousel;
                Na__PhoneUi__WakeCarousel();
            }
        };
        new MutationObserver(check).observe(html, { attributes : true, attributeFilter : ['class'] });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Start the Phone Layout (index.html, once the toolbar, menu and carousel exist)
    // ------------------------------------------------------------
    function Na__Feature__PhoneUi__Initialize() {
        const state = Na__PhoneUi__State;
        if (state.started || !Na__PhoneUi__IsPhone()) return;
        state.started = true;

        state.header = document.querySelector('.app-header');
        state.nav = document.getElementById('naNavToolbar');
        state.tools = document.getElementById('naToolsMenu');
        state.carousel = document.getElementById('naPresentationCarousel');

        // THE PULL TAB | Hangs under the bar
        const pull = document.createElement('button');
        pull.type = 'button';
        pull.className = 'na-phone-ui__pull';
        pull.setAttribute('aria-label', 'Hide the top bar');
        document.body.appendChild(pull);
        state.pull = pull;
        Na__PhoneUi__WirePull(pull);

        // THE BAR | Down on landing; touching it keeps it down a while longer
        if (state.header) {
            state.header.addEventListener('pointerdown', () => {
                if (!document.documentElement.classList.contains(Na__PhoneUi__FOLDED)) Na__PhoneUi__SetFolded(false);
            });
        }
        Na__PhoneUi__FoldAfterLanding();
        window.addEventListener('na-app-scene-ready', () => {
            if (state.header) state.header.dataset.naPhoneLanded = '1';
        }, { once : true });
        const canvas = document.getElementById('renderCanvas');
        if (canvas && canvas.classList.contains('canvas-visible') && state.header) state.header.dataset.naPhoneLanded = '1';

        // THE CORNERS AND THE CAROUSEL
        if (state.nav) Na__PhoneUi__WireNav(state.nav);
        if (state.tools) {
            state.tools.addEventListener('toggle', () => {
                if (state.tools.hasAttribute('open')) Na__PhoneUi__SetNavOpen(false);
            });
        }
        if (state.carousel) Na__PhoneUi__WireCarousel(state.carousel);

        document.addEventListener('pointerdown', Na__PhoneUi__OnPointerDown, { capture : true, passive : true });
        Na__PhoneUi__WatchTour();
    }
    // ------------------------------------------------------------


    // FUNCTION | Bring the Top Bar Down (for anything that needs the person icon)
    // ------------------------------------------------------------
    function Na__Feature__PhoneUi__ShowHeader() {
        if (Na__PhoneUi__IsPhone()) Na__PhoneUi__SetFolded(false, true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Feature__PhoneUi__Initialize,
        Na__Feature__PhoneUi__ShowHeader
    };

// endregion -------------------------------------------------------------------
