// =============================================================================
// VALEVISION3D - CLIENT LINKS - INSTALL THE CLIENT'S OWN APP
// =============================================================================
//
// FILE       : Na__ClientLinks__InstallApp__.js
// NAMESPACE  : Na__InstallApp
// MODULE     : Feature - Client Links
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Offer the client their project as an app of its own: one tap
//              where the browser allows it, plain pictured steps where it does
//              not, a moment after they first use the model
// CREATED    : 29-Oct-2026
//
// DESCRIPTION:
// - WHAT IS INSTALLED is the client's own app, never the staff app: the
//   manifest made by Na__ClientLinks__AppManifest__ (index.html's head) names it
//   after the project and opens their link and nothing else.
// - WHEN (Adam, 29-Oct-2026: "a couple of seconds after the user interacts with
//   something in the 3D Scene so its always after the tour and allows them to
//   at least press something first"): once the model is on screen and the tour
//   is closed, the first press on the model, the view pictures or the
//   navigation is let finish, and 2 s later the card shows. Never while
//   another card or panel is up, and never mid-drag. Once per browser session;
//   never again after an install from this browser, and never inside the app.
//   "Install the app" in the guest bubble shows it at any time.
// - HOW, BY BROWSER (TrueVision's handlers, 62__Feature__AppInstallability):
//     Chrome, Edge, Samsung Internet (Android and computers): the browser's own
//       install prompt, held from the start by the head script; Install app
//       calls prompt() inside the client's tap: one tap, no menus. Offered
//       only once the browser has said it can install (it never says so when
//       the app is already installed).
//     iPhone and iPad Safari: Apple gives web pages no way to start Add to Home
//       Screen (researched 29-Oct-2026), so three pictured steps, and a
//       bouncing arrow at the edge of the screen where Share is.
//     Chrome, Edge, Firefox on iPhone and iPad: the same steps, with Copy link
//       (opening the link in Safari always works).
//     Firefox on Android: the browser menu's Install.
//     Safari on a Mac: File, Add to Dock.
//     Anything else (Firefox on a computer): not offered.
// - The Vale pavilion mark and "ValeVision 3D, By Vale Garden Houses" head the
//   card, as in the client email.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 29-Oct-2026 - Version 1.0.0
// - Initial build (ValeVision3D v2.82.0). Replaces the iPhone-only Home Screen
//   card of Na__ClientLinks__ClientLandscape__ 1.1.0.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__ClientLinks__Copy, Na__ClientLinks__El, Na__ClientLinks__Icon } from './Na__ClientLinks__Helpers__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    const Na__InstallApp__ICONS        = new URL('../../01__AppAssets__ValeVision/UiIcons__ClientLinks/', import.meta.url).href;
    const Na__InstallApp__MARK_URL     = '/AppAssets__CommonApplicationAssets/Logo__ValeGardenHouses/Logo__ValeGardenHouses__PavilionMark__Navy__.svg';
    const Na__InstallApp__MARK_BOX     = '189 68 646 888';                             // <-- The mark's drawn area in its 1024 square (measured): the email's crop
    const Na__InstallApp__OFFERED_KEY  = 'ValeVision3D__ClientInstall__Offered';       // <-- sessionStorage: offered once this browser session
    const Na__InstallApp__AFTER_MS     = 2000;                                         // <-- After the first press on the model (Adam: "a second or two")
    const Na__InstallApp__AFTER_DRAG_MS = 800;                                         // <-- Still dragging when due: after the finger lifts
    const Na__InstallApp__POLL_MS      = 1000;                                         // <-- Something else on screen: ask again
    const Na__InstallApp__POLL_MAX     = 90;
    const Na__InstallApp__VISIBLE      = 'is-visible';
    const Na__InstallApp__TOUR_OPEN    = 'na-client-tour-open';                        // <-- On <html> while the tour is up (Na__ClientLinks__ClientTour__)
    const Na__InstallApp__BUSY         = '.na-client-rotate.is-visible, .na-nav-help.na-nav-help--open, '
                                       + '.na-confirm-dialog.is-open, .ValeUserLogin__Overlay--visible, .ValeUserLogin__Menu--open, '
                                       + '.na-client-message';
    const Na__InstallApp__ZONES        = '#renderCanvas, #naPresentationCarousel, #naNavToolbar';   // <-- "Something in the 3D scene"

    const Na__InstallApp__State = { started : false, armed : false, pointers : 0, timer : 0, mark : null, box : null };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Browser and the App
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Head Script's API (Na__ClientLinks__AppManifest__), or a Stand-In
    // ------------------------------------------------------------
    function Na__InstallApp__Manifest() {
        return window.Na__ClientLinks__AppManifest || {
            getProjectName : () => '', getLaunchUrl : () => window.location.href, getInstallPrompt : () => null,
            clearInstallPrompt : () => {}, wasInstalledHere : () => false
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Running as the Installed App?
    // ------------------------------------------------------------
    function Na__InstallApp__IsInstalled() {
        try {
            return window.matchMedia('(display-mode: standalone), (display-mode: minimal-ui)').matches || navigator.standalone === true;
        } catch (error) { return navigator.standalone === true; }
    }
    // ------------------------------------------------------------


    // FUNCTION | Which Route Installs Here: chromium, ios-safari, ios-other, android-menu, mac-safari, or none
    // ------------------------------------------------------------
    function Na__InstallApp__Route() {
        const ua = navigator.userAgent || '';
        const device = document.documentElement.getAttribute('data-na-device') || 'computer';
        const ipadOs = /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
        const ios = /iPhone|iPad|iPod/.test(ua) || ipadOs;
        if (ios) {
            const other = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
            return { route : other ? 'ios-other' : 'ios-safari', device : device === 'tablet' ? 'tablet' : 'phone' };
        }
        if (Na__InstallApp__Manifest().getInstallPrompt() || 'onbeforeinstallprompt' in window) return { route : 'chromium', device };
        if (/Android/i.test(ua) && /Firefox/i.test(ua)) return { route : 'android-menu', device };
        if (/Macintosh/.test(ua) && /Version\/\d+.*Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return { route : 'mac-safari', device };
        return { route : 'none', device };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Card's Parts
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Vale Pavilion Mark, Cropped as in the Client Email (inline SVG; an <img> while it loads)
    // ------------------------------------------------------------
    function Na__InstallApp__LoadMark() {
        if (Na__InstallApp__State.mark) return;
        Na__InstallApp__State.mark = fetch(Na__InstallApp__MARK_URL, { credentials : 'same-origin' })
            .then((response) => (response.ok ? response.text() : ''))
            .then((text) => {
                const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
                const svg = doc.documentElement;
                if (!svg || svg.nodeName.toLowerCase() !== 'svg') return null;
                svg.setAttribute('viewBox', Na__InstallApp__MARK_BOX);
                svg.removeAttribute('width');
                svg.removeAttribute('height');
                svg.setAttribute('aria-hidden', 'true');
                svg.setAttribute('focusable', 'false');
                return svg;
            })
            .catch(() => null);
    }

    function Na__InstallApp__Mark() {
        const holder = Na__ClientLinks__El('span', 'na-client-install__mark');
        const fallback = Na__ClientLinks__El('img', null, null, { src : Na__InstallApp__MARK_URL, alt : '' });
        holder.appendChild(fallback);
        Na__InstallApp__LoadMark();
        Na__InstallApp__State.mark.then((svg) => {
            if (svg && holder.isConnected) holder.replaceChildren(document.importNode(svg, true));
        });
        return holder;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Head: the Mark, "ValeVision 3D", "By Vale Garden Houses" (the client email's banner)
    // ------------------------------------------------------------
    function Na__InstallApp__Brand() {
        const brand = Na__ClientLinks__El('div', 'na-client-install__brand');
        const words = Na__ClientLinks__El('span', 'na-client-install__brand-words');
        words.append(Na__ClientLinks__El('span', 'na-client-install__brand-name', 'ValeVision 3D'),
                     Na__ClientLinks__El('span', 'na-client-install__brand-by', 'By Vale Garden Houses'));
        brand.append(Na__InstallApp__Mark(), words);
        return brand;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Step: a Number, an Icon, What to Do
    // ------------------------------------------------------------
    function Na__InstallApp__Step(number, icon, title, text) {
        const step = Na__ClientLinks__El('li', 'na-client-install__step');
        const badge = Na__ClientLinks__El('span', 'na-client-install__step-icon');
        badge.appendChild(Na__ClientLinks__El('img', null, null, { src : `${Na__InstallApp__ICONS}${icon}`, alt : '' }));
        badge.appendChild(Na__ClientLinks__El('span', 'na-client-install__step-number', String(number)));
        const words = Na__ClientLinks__El('span', 'na-client-install__step-words');
        words.append(Na__ClientLinks__El('strong', 'na-client-install__step-title', title), Na__ClientLinks__El('span', 'na-client-install__step-text', text));
        step.append(badge, words);
        return step;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Bouncing Arrow at the Edge of the Screen Where Safari's Share Button Is
    // ------------------------------------------------------------
    function Na__InstallApp__Pointer(device) {
        const upright = window.matchMedia && window.matchMedia('(orientation: portrait)').matches;
        const where = device === 'phone' && upright ? 'bottom' : 'top';                // <-- iPhone upright: the bar at the bottom; else the top bar
        const pointer = Na__ClientLinks__El('div', `na-client-install__pointer na-client-install__pointer--${where}`, null, { 'aria-hidden' : 'true' });
        pointer.appendChild(Na__ClientLinks__Icon('down', 'na-client-install__pointer-arrow'));
        pointer.appendChild(Na__ClientLinks__El('span', 'na-client-install__pointer-label', 'Share is here'));
        return pointer;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Card
// -----------------------------------------------------------------------------

    // FUNCTION | Close the Card
    // ------------------------------------------------------------
    function Na__InstallApp__Close() {
        const box = Na__InstallApp__State.box;
        Na__InstallApp__State.box = null;
        if (box) box.remove();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Card Button
    // ------------------------------------------------------------
    function Na__InstallApp__Button(kind, label, icon, onClick) {
        const button = Na__ClientLinks__El('button', `na-client-install__btn na-client-install__btn--${kind}`, null, { type : 'button' });
        if (icon) button.appendChild(Na__ClientLinks__Icon(icon));
        button.appendChild(Na__ClientLinks__El('span', null, label));
        button.addEventListener('click', onClick);
        return button;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Words and Actions for This Browser
    // ------------------------------------------------------------
    // Returns { lead, steps[], actions[], pointer } for the route.
    // ------------------------------------------------------------
    function Na__InstallApp__Body(route, device, name) {
        const notNow = () => Na__InstallApp__Button('quiet', 'Not now', null, Na__InstallApp__Close);
        const gotIt = () => Na__InstallApp__Button('primary', 'Got it', 'check', Na__InstallApp__Close);
        const label = (window.Na__ClientLinks__AppManifest && window.Na__ClientLinks__AppManifest.shortName)
            ? window.Na__ClientLinks__AppManifest.shortName(name) : `${name} 3D`;

        if (route === 'chromium') {
            const install = Na__InstallApp__Button('primary', 'Install app', 'download', async () => {
                const prompt = Na__InstallApp__Manifest().getInstallPrompt();
                if (!prompt) { Na__InstallApp__Close(); return; }
                Na__InstallApp__Manifest().clearInstallPrompt();                       // <-- A prompt can be used once
                try {
                    prompt.prompt();                                                    // <-- Inside the client's tap: the browser's own install dialog
                    const choice = await prompt.userChoice;
                    if (choice && choice.outcome === 'accepted') Na__InstallApp__Done(device, label);
                    else Na__InstallApp__Close();
                } catch (error) { Na__InstallApp__Close(); }
            });
            return {
                lead    : `Install ${name} as an app: one tap opens your design full screen, without the browser in the way.`,
                steps   : [],
                actions : [notNow(), install]
            };
        }

        if (route === 'ios-safari') {
            const iphone = device !== 'tablet';
            const upright = window.matchMedia && window.matchMedia('(orientation: portrait)').matches;
            const shareWhere = iphone
                ? (upright ? 'At the bottom of the screen. On the newest iPhones it is under the ••• button.'
                           : 'At the top of the screen, or under the ••• button.')
                : 'At the top right of Safari.';
            return {
                lead    : `Add ${name} to your Home Screen. It opens your design full screen, like an app.`,
                steps   : [
                    Na__InstallApp__Step(1, 'Icon__ClientLinks__IosShare__.svg', 'Tap Share', shareWhere),
                    Na__InstallApp__Step(2, 'Icon__ClientLinks__AddToHomeScreen__.svg', 'Add to Home Screen', 'Scroll down the list if you need to, then tap Add.'),
                    Na__InstallApp__Step(3, 'Icon__ClientLinks__OpenFromHomeScreen__.svg', `Open ${label}`, 'From the new icon on your Home Screen.')
                ],
                actions : [notNow(), gotIt()],
                pointer : true
            };
        }

        if (route === 'ios-other') {
            const copy = Na__InstallApp__Button('secondary', 'Copy link', 'copy', () => {
                Na__ClientLinks__Copy(Na__InstallApp__Manifest().getLaunchUrl() || window.location.href, 'Link copied: paste it into Safari');
            });
            return {
                lead    : `Add ${name} to your Home Screen. It opens your design full screen, like an app.`,
                steps   : [
                    Na__InstallApp__Step(1, 'Icon__ClientLinks__IosShare__.svg', 'Tap Share', 'In Chrome it is at the top, in the address bar.'),
                    Na__InstallApp__Step(2, 'Icon__ClientLinks__AddToHomeScreen__.svg', 'Add to Home Screen', 'Not there? Copy the link, open Safari, paste it and add it from Safari.'),
                    Na__InstallApp__Step(3, 'Icon__ClientLinks__OpenFromHomeScreen__.svg', `Open ${label}`, 'From the new icon on your Home Screen.')
                ],
                actions : [copy, gotIt()]
            };
        }

        if (route === 'android-menu') {
            return {
                lead    : `Install ${name} as an app. It opens your design full screen, like an app.`,
                steps   : [
                    Na__InstallApp__Step(1, 'Icon__ClientLinks__AddToHomeScreen__.svg', 'Open the browser menu', 'The ⋮ button, at the top or bottom right.'),
                    Na__InstallApp__Step(2, 'Icon__ClientLinks__OpenFromHomeScreen__.svg', 'Tap Install', 'Or Add to Home screen, then Add.')
                ],
                actions : [notNow(), gotIt()]
            };
        }

        return {                                                                        // <-- mac-safari
            lead    : `Keep ${name} in your Dock. It opens your design in a window of its own.`,
            steps   : [
                Na__InstallApp__Step(1, 'Icon__ClientLinks__AddToHomeScreen__.svg', 'File, then Add to Dock', 'In Safari\'s menu bar at the top of the screen.'),
                Na__InstallApp__Step(2, 'Icon__ClientLinks__OpenFromHomeScreen__.svg', 'Click Add', `${label} appears in your Dock.`)
            ],
            actions : [notNow(), gotIt()]
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | After an Install: Where to Find It
    // ------------------------------------------------------------
    function Na__InstallApp__Done(device, label) {
        const box = Na__InstallApp__State.box;
        if (!box) return;
        box.dataset.done = '1';                                                         // <-- The browser's own "installed" event leaves this up
        const card = box.querySelector('.na-client-install__card');
        card.replaceChildren(
            Na__InstallApp__Brand(),
            Na__ClientLinks__El('h2', 'na-client-install__title', 'Installed'),
            Na__ClientLinks__El('p', 'na-client-install__lead',
                device === 'computer' ? `${label} opens from your Start menu, Dock or desktop, in a window of its own.`
                                      : `${label} is on your Home Screen. Open it from there next time, full screen.`));
        const actions = Na__ClientLinks__El('div', 'na-client-install__actions');
        actions.appendChild(Na__InstallApp__Button('primary', 'Done', 'check', Na__InstallApp__Close));
        card.appendChild(actions);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Card Now (asked: from the guest bubble, whatever the session says)
    // ------------------------------------------------------------
    function Na__InstallApp__Show(asked) {
        if (Na__InstallApp__State.box || Na__InstallApp__IsInstalled()) return false;
        let { route, device } = Na__InstallApp__Route();
        if (route === 'chromium' && !Na__InstallApp__Manifest().getInstallPrompt()) {
            if (!asked) return false;                                                   // <-- Not installable yet, or installed already: no offer
            route = device === 'computer' ? 'none' : 'android-menu';                   // <-- Asked for: the browser menu's way
        }
        if (route === 'none') {
            if (!asked) return false;
            route = 'android-menu';
        }

        const name = Na__InstallApp__Manifest().getProjectName() || 'your design';
        const body = Na__InstallApp__Body(route, device, name);
        const box = Na__ClientLinks__El('div', `na-client-install ${Na__InstallApp__VISIBLE}`, null,
                                        { id : 'naClientInstall', role : 'dialog', 'aria-modal' : 'true', 'aria-labelledby' : 'naClientInstallTitle' });
        const card = Na__ClientLinks__El('div', `na-client-install__card na-client-install__card--${route}`);
        const close = Na__ClientLinks__El('button', 'na-client-install__close', null, { type : 'button', 'aria-label' : 'Close' });
        close.appendChild(Na__ClientLinks__Icon('close'));
        close.addEventListener('click', Na__InstallApp__Close);
        card.append(close, Na__InstallApp__Brand(),
                    Na__ClientLinks__El('h2', 'na-client-install__title', route === 'mac-safari' ? 'Keep your design in your Dock' : 'Get your design as an app',
                                        { id : 'naClientInstallTitle' }),
                    Na__ClientLinks__El('p', 'na-client-install__lead', body.lead));
        if (body.steps.length) {
            const steps = Na__ClientLinks__El('ol', 'na-client-install__steps');
            body.steps.forEach((step) => steps.appendChild(step));
            card.appendChild(steps);
        }
        const actions = Na__ClientLinks__El('div', 'na-client-install__actions');
        body.actions.forEach((button) => actions.appendChild(button));
        card.appendChild(actions);
        box.appendChild(card);
        if (body.pointer) box.appendChild(Na__InstallApp__Pointer(device));
        box.addEventListener('click', (event) => { if (event.target === box) Na__InstallApp__Close(); });
        document.body.appendChild(box);
        Na__InstallApp__State.box = box;
        const primary = card.querySelector('.na-client-install__btn--primary');
        if (primary) primary.focus({ preventScroll : true });
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | When to Offer It
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Offered This Session? / Note It Offered
    // ------------------------------------------------------------
    function Na__InstallApp__Offered() {
        try { return window.sessionStorage.getItem(Na__InstallApp__OFFERED_KEY) === '1'; } catch (error) { return false; }
    }

    function Na__InstallApp__NoteOffered() {
        try { window.sessionStorage.setItem(Na__InstallApp__OFFERED_KEY, '1'); } catch (error) { /* this page only */ }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show When the Screen Is Free, Never Mid-Drag
    // ------------------------------------------------------------
    function Na__InstallApp__OfferWhenFree(attempt) {
        const state = Na__InstallApp__State;
        const tries = attempt || 0;
        const busy = document.documentElement.classList.contains(Na__InstallApp__TOUR_OPEN)
                     || document.querySelector(Na__InstallApp__BUSY) || document.visibilityState === 'hidden';
        if (busy || state.pointers > 0) {
            if (tries < Na__InstallApp__POLL_MAX) {
                state.timer = setTimeout(() => Na__InstallApp__OfferWhenFree(tries + 1),
                                         state.pointers > 0 ? Na__InstallApp__AFTER_DRAG_MS : Na__InstallApp__POLL_MS);
            }
            return;
        }
        if (Na__InstallApp__Show(false)) Na__InstallApp__NoteOffered();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The First Press on the Model, Its Pictures or Its Navigation (after the tour)
    // ------------------------------------------------------------
    function Na__InstallApp__Arm() {
        const state = Na__InstallApp__State;
        if (state.armed) return;
        state.armed = true;
        const onRelease = (event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target || !target.closest(Na__InstallApp__ZONES)) return;
            if (document.documentElement.classList.contains(Na__InstallApp__TOUR_OPEN)) return;   // <-- Presses during the tour do not count
            document.removeEventListener('pointerup', onRelease, true);
            document.removeEventListener('wheel', onRelease, true);
            clearTimeout(state.timer);
            state.timer = setTimeout(() => Na__InstallApp__OfferWhenFree(0), Na__InstallApp__AFTER_MS);
        };
        document.addEventListener('pointerup', onRelease, true);
        document.addEventListener('wheel', onRelease, { capture : true, passive : true });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Start (Na__ClientMode__Start, once the link has opened)
    // ------------------------------------------------------------
    function Na__InstallApp__Start() {
        const state = Na__InstallApp__State;
        if (state.started) return;
        state.started = true;
        if (Na__InstallApp__IsInstalled() || Na__InstallApp__Manifest().wasInstalledHere() || Na__InstallApp__Offered()) return;

        // FINGERS | Counted, so the card never lands mid-drag
        document.addEventListener('pointerdown', () => { state.pointers += 1; }, true);
        const lift = () => { state.pointers = Math.max(0, state.pointers - 1); };
        document.addEventListener('pointerup', lift, true);
        document.addEventListener('pointercancel', lift, true);

        window.addEventListener('na-app-installed', () => {
            const box = Na__InstallApp__State.box;
            if (box && box.dataset.done !== '1') Na__InstallApp__Close();              // <-- Installed some other way: the offer goes
        });
        window.addEventListener('na-app-scene-ready', () => {
            Na__InstallApp__LoadMark();                                                 // <-- Ready before it is needed
            Na__InstallApp__Arm();
        }, { once : true });
    }
    // ------------------------------------------------------------


    // FUNCTION | May "Install the App" Be Offered Here? (the guest bubble's item)
    // ------------------------------------------------------------
    function Na__InstallApp__CanOffer() {
        return !Na__InstallApp__IsInstalled();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__InstallApp__Start,
        Na__InstallApp__Show,
        Na__InstallApp__CanOffer
    };

// endregion -------------------------------------------------------------------
