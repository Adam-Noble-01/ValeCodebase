// =============================================================================
// VALEVISION3D - CLIENT LINKS - FULL SCREEN AND LANDSCAPE ON PHONES AND TABLETS
// =============================================================================
//
// FILE       : Na__ClientLinks__ClientLandscape__.js
// NAMESPACE  : Na__ClientLandscape
// MODULE     : Feature - Client Links
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : On a client link, put phones and tablets in full screen and
//              landscape where the browser allows it, and ask plainly (with a
//              turning phone) where it does not
// CREATED    : 29-Oct-2026
//
// DESCRIPTION:
// - CLIENT LINKS ONLY, TOUCH DEVICES ONLY (Adam, 29-Oct-2026: "force clients on
//   mobile to use the tool in landscape and not portrait and to full screen",
//   tablets in portrait too). Computers are never touched.
// - WHAT A BROWSER ALLOWS (researched 29-Oct-2026; caniuse, MDN, W3C Screen
//   Orientation, WebKit release notes):
//     Full screen   needs a tap or key first (user activation): never on load.
//                   Android Chrome, Samsung Internet, Firefox and iPad Safari
//                   (iPadOS 16.4+, webkit- before) have it. iPhone Safari does
//                   NOT: only a <video> can go full screen there.
//     Turning       screen.orientation.lock('landscape') works on Android, and
//                   only while full screen (or as an installed app). Safari on
//                   iPhone and iPad has never shipped it.
//   So: Android phones and tablets are FORCED (full screen and turned to
//   landscape on the first tap, even when held upright). iPad goes full screen
//   and is asked to turn. iPhone is asked to turn.
// - THE DEVICE (Na__ClientLandscape__Profile): phone, tablet or computer comes
//   from index.html's head script (<html data-na-device>, 1.1.2), which decides
//   by what the device is (iPhone, iPad, Android with or without Mobile, the
//   browser's own mobile flag; Windows, macOS, ChromeOS, Linux are computers),
//   never by its screen size. A touchscreen PC is a computer. Its ORIENTATION is
//   the device's, not the window's: screen.orientation.type, else iOS's old
//   window.orientation, else the (orientation: portrait) media query. So an
//   iPad held sideways with the app in Split View is not asked to turn.
//   <html> carries na-client-device--phone|tablet and
//   na-client-orient--portrait|landscape for any style that needs them.
// - THE TURN SCREEN (portrait, inside the Home Screen app only since 1.1.1): a turning phone (UiIcons__ClientLinks/
//   Icon__ClientLinks__RotateToLandscape__.svg, a self-running loop), "Turn
//   your phone sideways", and how to unlock rotation on that kind of device.
//   Where the browser can turn the screen itself, a Turn to landscape button
//   does it. It goes the moment the device is sideways. "Continue without
//   turning" shows after a short wait (some people cannot turn: a phone in a
//   stand) and holds for this browser session.
// - FULL SCREEN AGAIN: leaving full screen is allowed (the browser's own
//   gesture, or Exit Full Screen in the menu); the next tap goes back in, up to
//   three times a visit, then it is left to the menu.
// - The tour waits while the turn screen is up (Na__ClientTour__Busy).
// - IPHONE FULL SCREEN comes only from the Home Screen app (no web page can
//   hide Safari's bars). Offering that app, on every device, is
//   Na__ClientLinks__InstallApp__'s job since 1.2.0; the client's own app is
//   Na__ClientLinks__AppManifest__'s.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 29-Oct-2026 - Version 1.2.0 (ValeVision3D v2.82.0)
// - The iPhone Home Screen card is gone: Na__ClientLinks__InstallApp__ offers
//   the client's own app on every device, after the first press on the model.
// - A tap inside the install card never asks for full screen (the browser's
//   install prompt needs that tap).
//
// 29-Oct-2026 - Version 1.1.2 (ValeVision3D v2.81.4)
// - The device kind is index.html's (<html data-na-device>), decided by what
//   the device is, no longer by touch and screen size (Adam: on a PC the top
//   bar folded away; "dont rely on just pixel by pixel ratios").
// - "Installed" is the standalone or minimal-ui display mode (or iOS's
//   navigator.standalone), no longer fullscreen: Chrome reports fullscreen for
//   any browser tab gone full screen.
//
// 29-Oct-2026 - Version 1.1.1 (ValeVision3D v2.81.2)
// - THE TURN SCREEN ONLY IN THE HOME SCREEN APP (Adam: "if used in browser in
//   portrait dont steer them anymore to rotate"): a browser tab held upright is
//   a normal way to use the app, so it is never asked to turn. The nudge is
//   towards the Home Screen app instead (the iPhone card); inside that app, an
//   upright device is still asked to turn. Android's full screen and landscape
//   on the first tap are unchanged.
//
// 29-Oct-2026 - Version 1.1.0 (ValeVision3D v2.81.1)
// - iPhone: the Home Screen card (above).
//
// 29-Oct-2026 - Version 1.0.0
// - Initial build (ValeVision3D v2.80.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__ClientLinks__El } from './Na__ClientLinks__Helpers__.js';
    import { Na__Feature__FullScreenMode__IsBrowserSupported, Na__Feature__FullScreenMode__IsFullScreenActive,
             Na__Feature__FullScreenMode__EnterFullScreen, Na__Feature__FullScreenMode__AddChangeListener } from '../60__Feature__FullScreenMode/Na__Feature__FullScreenMode__BrowserSupportLogic__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    const Na__ClientLandscape__ICONS        = new URL('../../01__AppAssets__ValeVision/UiIcons__ClientLinks/', import.meta.url).href;
    const Na__ClientLandscape__GRAPHIC      = `${Na__ClientLandscape__ICONS}Icon__ClientLinks__RotateToLandscape__.svg`;
    const Na__ClientLandscape__AUTO_MAX     = 3;                                   // <-- Taps that put full screen back after it was left
    const Na__ClientLandscape__SKIP_KEY     = 'ValeVision3D__ClientLandscape__Skip';   // <-- sessionStorage: "Continue without turning"
    const Na__ClientLandscape__SKIP_WAIT_MS = { phone : 6000, tablet : 3000 };     // <-- Before "Continue without turning" shows
    const Na__ClientLandscape__VISIBLE      = 'is-visible';

    let Na__ClientLandscape__State = null;                                         // <-- { profile, overlay, ... } once started

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Device (the media query handler)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Media Query, Safely
    // ------------------------------------------------------------
    function Na__ClientLandscape__Media(query) {
        try { return window.matchMedia(query).matches; } catch (error) { return false; }
    }
    // ------------------------------------------------------------


    // FUNCTION | What This Device Is and Can Do (read once; orientation is read live)
    // ------------------------------------------------------------
    function Na__ClientLandscape__Profile() {
        const ua = navigator.userAgent || '';
        const ipadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;        // <-- iPadOS asks for desktop sites
        const ios = /iPhone|iPad|iPod/i.test(ua) || ipadOs;
        const android = /Android/i.test(ua);
        const kind = document.documentElement.getAttribute('data-na-device');    // <-- index.html's head script: what the device IS, never its size (v2.81.4)
        const orientationApi = window.screen.orientation || null;
        return {
            kind          : kind === 'phone' || kind === 'tablet' ? kind : 'computer',
            ios, android,
            canFullScreen : Na__Feature__FullScreenMode__IsBrowserSupported(),     // <-- false on iPhone Safari
            canTurn       : !ios && !!orientationApi && typeof orientationApi.lock === 'function',
            installed     : Na__ClientLandscape__Media('(display-mode: standalone), (display-mode: minimal-ui)') || navigator.standalone === true   // <-- Not fullscreen: Chrome reports it for any tab gone full screen
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Device Held Upright? (the device, not the window)
    // ------------------------------------------------------------
    function Na__ClientLandscape__IsPortrait() {
        const api = window.screen.orientation;
        if (api && typeof api.type === 'string' && api.type) return api.type.indexOf('portrait') === 0;
        if (typeof window.orientation === 'number') return Math.abs(window.orientation) !== 90;   // <-- iOS before 16.4
        return Na__ClientLandscape__Media('(orientation: portrait)');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Full Screen and Turning (each needs a tap first)
// -----------------------------------------------------------------------------

    // FUNCTION | Full Screen, Then Landscape, Where the Browser Allows (call from a tap)
    // ------------------------------------------------------------
    async function Na__ClientLandscape__Force() {
        const state = Na__ClientLandscape__State;
        if (!state || state.forcing) return;
        state.forcing = true;
        try {
            if (state.profile.canFullScreen && !Na__Feature__FullScreenMode__IsFullScreenActive()) {
                await Na__Feature__FullScreenMode__EnterFullScreen(document.documentElement);
                state.entered = true;
            }
            if (state.profile.canTurn && (Na__Feature__FullScreenMode__IsFullScreenActive() || state.profile.installed)) {
                await window.screen.orientation.lock('landscape');                 // <-- Turns the screen even when held upright
            }
        } catch (error) {
            /* Refused (no tap, a setting, an older browser): the turn screen still asks */
        } finally {
            state.forcing = false;
            Na__ClientLandscape__Update();
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Tap Anywhere: Back into Full Screen (until it has been left too often)
    // ------------------------------------------------------------
    function Na__ClientLandscape__OnTap(event) {
        const state = Na__ClientLandscape__State;
        if (!state || state.forcing || state.exits >= Na__ClientLandscape__AUTO_MAX) return;
        if (event && event.target instanceof Element && event.target.closest('.na-client-install')) return;   // <-- The install card's tap is the browser's install prompt's
        if (state.profile.canFullScreen && !Na__Feature__FullScreenMode__IsFullScreenActive()) Na__ClientLandscape__Force();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Full Screen Left: Counted, so a Client Who Keeps Leaving Is Let Be
    // ------------------------------------------------------------
    function Na__ClientLandscape__OnFullScreenChange() {
        const state = Na__ClientLandscape__State;
        if (!state) return;
        if (!Na__Feature__FullScreenMode__IsFullScreenActive() && state.entered) {
            state.entered = false;
            state.exits += 1;
        } else if (Na__Feature__FullScreenMode__IsFullScreenActive()) {
            state.entered = true;
        }
        Na__ClientLandscape__Update();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Turn Screen
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Skipped This Session? / Skip It
    // ------------------------------------------------------------
    function Na__ClientLandscape__Skipped() {
        try { return window.sessionStorage.getItem(Na__ClientLandscape__SKIP_KEY) === '1'; } catch (error) { return false; }
    }

    function Na__ClientLandscape__Skip() {
        try { window.sessionStorage.setItem(Na__ClientLandscape__SKIP_KEY, '1'); } catch (error) { /* this page only */ }
        if (Na__ClientLandscape__State) Na__ClientLandscape__State.skipped = true;
        Na__ClientLandscape__Update();
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Turn Screen (hidden until needed)
    // ------------------------------------------------------------
    function Na__ClientLandscape__Build(profile) {
        const device = profile.kind === 'tablet' ? 'tablet' : 'phone';
        const box = Na__ClientLinks__El('div', 'na-client-rotate', null, { id: 'naClientRotate', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'naClientRotateTitle' });
        const card = Na__ClientLinks__El('div', 'na-client-rotate__card');
        const picture = Na__ClientLinks__El('img', 'na-client-rotate__graphic', null, { src: Na__ClientLandscape__GRAPHIC, alt: '' });
        const title = Na__ClientLinks__El('h1', 'na-client-rotate__title', `Turn your ${device} sideways`, { id: 'naClientRotateTitle' });
        const text = Na__ClientLinks__El('p', 'na-client-rotate__text',
            `Your 3D design is made for a wide screen. Turn your ${device} on its side and the model fills the screen.`);
        card.append(picture, title, text);

        if (profile.canTurn) {                                                     // <-- Android: the browser can turn it for them
            const turn = Na__ClientLinks__El('button', 'na-client-rotate__button', 'Turn to landscape', { type: 'button' });
            turn.addEventListener('click', () => Na__ClientLandscape__Force());
            card.appendChild(turn);
        }

        const hint = profile.ios
            ? `Screen not turning? Swipe down from the top right corner to open Control Centre, then switch off Rotation Lock (the padlock).`
            : `Screen not turning? Swipe down from the top of the screen and turn on Auto-rotate.`;
        card.appendChild(Na__ClientLinks__El('p', 'na-client-rotate__hint', hint));

        const skip = Na__ClientLinks__El('button', 'na-client-rotate__skip', 'Continue without turning', { type: 'button' });
        skip.addEventListener('click', Na__ClientLandscape__Skip);
        card.appendChild(skip);

        box.appendChild(card);
        document.body.appendChild(box);
        return { box, skip };
    }
    // ------------------------------------------------------------


    // FUNCTION | Show or Hide the Turn Screen, and Mark <html> (on every turn, resize and full screen change)
    // ------------------------------------------------------------
    function Na__ClientLandscape__Update() {
        const state = Na__ClientLandscape__State;
        if (!state) return;
        const portrait = Na__ClientLandscape__IsPortrait();
        const html = document.documentElement;
        html.classList.toggle('na-client-orient--portrait', portrait);
        html.classList.toggle('na-client-orient--landscape', !portrait);

        const show = portrait && !state.skipped && state.profile.installed;   // <-- A browser tab may be used upright (Adam, v2.81.2)
        const showing = state.overlay.box.classList.contains(Na__ClientLandscape__VISIBLE);
        if (show === showing) return;
        state.overlay.box.classList.toggle(Na__ClientLandscape__VISIBLE, show);
        clearTimeout(state.skipTimer);
        state.overlay.skip.hidden = true;
        if (show) {
            state.skipTimer = setTimeout(() => { state.overlay.skip.hidden = false; },
                                         Na__ClientLandscape__SKIP_WAIT_MS[state.profile.kind] || 6000);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Start (Na__ClientMode__Start, once the link has opened): phones and tablets only
    // ------------------------------------------------------------
    function Na__ClientLandscape__Start() {
        if (Na__ClientLandscape__State) return;
        const profile = Na__ClientLandscape__Profile();
        if (profile.kind === 'computer') return;
        document.documentElement.classList.add(`na-client-device--${profile.kind}`);

        Na__ClientLandscape__State = {
            profile, overlay : Na__ClientLandscape__Build(profile), skipped : Na__ClientLandscape__Skipped(),
            forcing : false, entered : false, exits : 0, skipTimer : 0, frame : 0
        };

        // LISTEN | The device turning, the window resizing, full screen coming and going
        const later = () => {
            cancelAnimationFrame(Na__ClientLandscape__State.frame);
            Na__ClientLandscape__State.frame = requestAnimationFrame(Na__ClientLandscape__Update);
        };
        if (window.screen.orientation && window.screen.orientation.addEventListener) window.screen.orientation.addEventListener('change', later);
        window.addEventListener('orientationchange', later);
        window.addEventListener('resize', later);
        try { window.matchMedia('(orientation: portrait)').addEventListener('change', later); } catch (error) { /* older Safari: resize covers it */ }
        Na__Feature__FullScreenMode__AddChangeListener(Na__ClientLandscape__OnFullScreenChange);

        // TAPS | Full screen needs one: the first tap anywhere (the tour's own buttons included) goes in
        ['pointerup', 'touchend', 'click', 'keydown'].forEach((name) => {
            document.addEventListener(name, Na__ClientLandscape__OnTap, { capture : true, passive : true });
        });

        Na__ClientLandscape__Update();
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Turn Screen Up? (the tour waits for it)
    // ------------------------------------------------------------
    function Na__ClientLandscape__IsAsking() {
        return !!Na__ClientLandscape__State && Na__ClientLandscape__State.overlay.box.classList.contains(Na__ClientLandscape__VISIBLE);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__ClientLandscape__Start,
        Na__ClientLandscape__IsAsking,
        Na__ClientLandscape__Profile
    };

// endregion -------------------------------------------------------------------
