// =============================================================================
// VALEVISION3D - CLIENT LINKS - THE CLIENT'S FIRST-LAUNCH TOUR
// =============================================================================
//
// FILE       : Na__ClientLinks__ClientTour__.js
// NAMESPACE  : Na__ClientTour
// MODULE     : Feature - Client Links
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Show a client, step by step, how to use ValeVision 3D: the saved
//              views, looking around, the Tools & Settings menu and Help, then
//              who to ask if anything goes wrong
// CREATED    : 28-Oct-2026
//
// DESCRIPTION:
// - FOR CLIENTS, ON A CLIENT LINK ONLY (Na__ClientLinks__ClientMode__ starts it
//   once the model is on screen). Written for people who do not use apps much
//   (Adam: "optimised for non-tech people"): one idea per step, short plain
//   words, large text and buttons, the controls named as the screen names them.
// - THE STEPS (each skipped when its part of the screen is not there):
//     Welcome    what this is, Show me around or No thanks.
//     Views      the scene carousel lit up, the rest of the screen dimmed:
//                click (tap) a picture and the model moves to that view. The
//                carousel can be tried while this step is up.
//     Look       the navigation bar: turn, zoom and slide with the mouse (or
//                fingers on a touchscreen), and Reset View.
//     (Menu and Your menu: TEMPORARILY REMOVED 29-Oct-2026, see the log.)
//     Menu       Tools & Settings dropped down: Export Image (high quality
//                pictures, highlighted), Camera Settings, Toggle Model Layers,
//                Enter Full Screen. On a narrow screen the bar's Menu opens it.
//     Help       the Help button: every control explained.
//     Your menu  the person icon's menu, opened (Adam, 28-Oct-2026): take the
//                tour again, how to look around, and copy the link to share
//                with family and friends.
//     Done       "If you have any issues contact your designer and they will
//                be more than happy to help."
// - THE SPOTLIGHT: one element whose huge shadow dims everything but the part
//   explained; transparent blocks around it stop stray clicks (only the views
//   step lets clicks through its hole). It follows its target every frame
//   while open, so a menu dropping down or a window resized is tracked.
// - SEEN FOR A WEEK (Adam): finishing or skipping the tour writes the cookie
//   ValeVision3D__ClientTour (Max-Age one week, the app's path). Once it has
//   gone, the tour starts again. "Take the tour again" in the guest bubble
//   starts it at any time.
// - Keys: Escape closes it, the arrow keys step it; while it is open no key
//   reaches the model (the arrows and letters would move the camera).
// - THE ACTIVITY LEDGER hears it (1.1.0): tour.start (first visit, or asked
//   for), tour.finish, or tour.skip with the step it was left at. The shared
//   script adds the client link, so the Server Manager can tell who.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 29-Oct-2026 - Version 1.2.1 (ValeVision3D v2.80.0)
// - The tour waits while "Turn your phone sideways" is up (Na__ClientTour__Busy).
//
// 29-Oct-2026 - Version 1.2.0 (ValeVision3D v2.79.5)
// - TEMPORARILY REMOVED, based on J. Watchorn's comments and awaiting the
//   directors' feedback: the Menu step (Tools & Settings opened) and the Your
//   menu step (the person icon's menu, sharing the link). Both are commented
//   out in Na__ClientTour__Steps, ready to restore. The tour is now Welcome,
//   Views, Look, Help, Done.
//
// 28-Oct-2026 - Version 1.1.0 (ValeVision3D v2.78.0)
// - The tour is reported to the activity ledger (above).
// - "Your menu", before the last card (Adam): the person icon's menu opened and
//   lit, to take the tour again or share the link with family and friends. A
//   step's target may now be several elements: the spotlight takes in them all.
// - The last card no longer says where the tour is: its own step shows it.
//
// 28-Oct-2026 - Version 1.0.0
// - Initial build (ValeVision3D v2.77.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__ClientLinks__El, Na__ClientLinks__Icon } from './Na__ClientLinks__Helpers__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Cookie, the Page and the Spacing
    // ------------------------------------------------------------
    const Na__ClientTour__COOKIE       = 'ValeVision3D__ClientTour';
    const Na__ClientTour__REPEAT_S     = 7 * 24 * 3600;                           // <-- Seen for a week, then the tour comes back (Adam)
    const Na__ClientTour__APP_PATH     = new URL('../../', import.meta.url).pathname;   // <-- "/valevision/": the cookie's path
    const Na__ClientTour__MENU_ICONS   = new URL('../../01__AppAssets__ValeVision/UiIcons__MenuIcons__ToolsMenu/', import.meta.url).href;
    const Na__ClientTour__OPEN_CLASS   = 'na-client-tour-open';                    // <-- On <html> while the tour is up
    const Na__ClientTour__STEP_CLASS   = 'na-client-tour-step--';                  // <-- On <html>: the step on show (its styles)
    const Na__ClientTour__ACCENT_CLASS = 'na-client-tour__accent';                 // <-- Export Image's row, picked out in the menu
    const Na__ClientTour__GUEST_OPEN   = 'ValeUserLogin__Menu--open';              // <-- The shared sign-in's open menu (its guest bubble)
    const Na__ClientTour__PAD          = 8;                                        // <-- Spotlight around its target
    const Na__ClientTour__GAP          = 18;                                       // <-- Card to its target
    const Na__ClientTour__MARGIN       = 14;                                       // <-- Card to the screen's edge
    const Na__ClientTour__RETRY_MS     = 2000;                                     // <-- Something else is on screen: ask again shortly
    const Na__ClientTour__RETRIES      = 15;
    // ------------------------------------------------------------


    // MODULE VARIABLES | The Running Tour
    // ------------------------------------------------------------
    let Na__ClientTour__Run = null;                                                // <-- { steps, index, root, spot, blocks, card, ... } while open
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Touch Controls? (index.html's own test: the app's controls follow it)
    // ------------------------------------------------------------
    function Na__ClientTour__UsesTouch() {
        const ua = navigator.userAgent || '';
        const ipadOs = ua.includes('Macintosh') && navigator.maxTouchPoints > 1;
        return /Android|iPhone|iPad|iPod/i.test(ua) || ipadOs || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Seen This Week? / Mark It Seen for a Week
    // ------------------------------------------------------------
    function Na__ClientTour__Seen() {
        return document.cookie.split(';').some((c) => c.trim().startsWith(`${Na__ClientTour__COOKIE}=`));
    }

    function Na__ClientTour__MarkSeen() {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${Na__ClientTour__COOKIE}=seen; Max-Age=${Na__ClientTour__REPEAT_S}; Path=${Na__ClientTour__APP_PATH}; SameSite=Lax${secure}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Element on Screen? (there, shown, and with a size)
    // ------------------------------------------------------------
    function Na__ClientTour__Shown(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return false;
        const style = getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Guest Bubble's Menu (the person icon at the top right), or Null
    // ------------------------------------------------------------
    function Na__ClientTour__GuestMenu() {
        return document.querySelector('#naHeaderUserSlot .ValeUserLogin__Menu--Guest');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is the Tools Menu Behind the Bar's Menu Button? (narrow screens)
    // ------------------------------------------------------------
    function Na__ClientTour__MenuIsSwapped() {
        const menu = document.getElementById('naToolsMenu');
        const container = menu && menu.closest('.na-dropdown-menu');
        return !!container && getComputedStyle(container).display === 'none';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Tell the Activity Ledger (never in the way: no ValeActivity, nothing happens)
    // ------------------------------------------------------------
    function Na__ClientTour__Log(action, target, detail) {
        try {
            if (window.ValeActivity) window.ValeActivity.Log(action, { target : target || '', detail : detail });
        } catch (error) { /* never in the way */ }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Something Else Is Asking for Attention (the loading screen, Help, a dialog)
    // ------------------------------------------------------------
    function Na__ClientTour__Busy() {
        const loading = document.getElementById('loadingOverlay');
        if (loading && getComputedStyle(loading).display !== 'none' && !loading.classList.contains('hidden')) return true;
        return !!document.querySelector('.na-nav-help.na-nav-help--open, .na-confirm-dialog.is-open, .ValeUserLogin__Overlay--visible, .na-email-workers-overlay.is-visible, .na-client-rotate.is-visible, .na-client-install.is-visible');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Words (built as elements: nothing here is ever HTML)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Paragraph
    // ------------------------------------------------------------
    function Na__ClientTour__Para(text, className) {
        return Na__ClientLinks__El('p', `na-client-tour__para${className ? ' ' + className : ''}`, text);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Row: an Icon (the tour's own, or a menu icon file), a Name and What It Does
    // ------------------------------------------------------------
    function Na__ClientTour__Row(icon, name, text) {
        const row = Na__ClientLinks__El('div', 'na-client-tour__row');
        const badge = Na__ClientLinks__El('span', 'na-client-tour__row-icon');
        if (/\.svg$/.test(icon)) badge.appendChild(Na__ClientLinks__El('img', null, null, { src: Na__ClientTour__MENU_ICONS + icon, alt: '' }));
        else badge.appendChild(Na__ClientLinks__Icon(icon));
        const words = Na__ClientLinks__El('span', 'na-client-tour__row-text');
        words.append(Na__ClientLinks__El('strong', null, name), Na__ClientLinks__El('span', null, text));
        row.append(badge, words);
        return row;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Steps, for This Device
    // ------------------------------------------------------------
    // { id, title, body(), target() (an element, or none for a card in the
    //   middle), place (sides to try, in order), interactive (clicks reach the
    //   target), enter() / leave(), primary / secondary (button words) }
    // ------------------------------------------------------------
    function Na__ClientTour__Steps() {
        const touch = Na__ClientTour__UsesTouch();
        const click = touch ? 'Tap' : 'Click';
        const press = touch ? 'tap' : 'press';
        const el = (id) => document.getElementById(id);
        const walkOrFly = Na__ClientTour__Shown(el('naNavToolbarWalkBtn')) || Na__ClientTour__Shown(el('naNavToolbarFlyBtn'));
        const menuState = { opened : false, swapped : false };
        const guestState = { opened : false };

        return [
            {
                id        : 'welcome',
                title     : 'Welcome to your project in 3D',
                body      : () => [
                    Na__ClientTour__Para('This is an interactive 3D model of your Vale Garden House design. You can look at it from any angle, as if you were standing there.'),
                    Na__ClientTour__Para('This quick tour shows you how. It takes less than a minute.')
                ],
                primary   : 'Show me around',
                secondary : 'No thanks'
            },
            {
                id          : 'views',
                title       : 'Your saved views',
                target      : () => el('naPresentationCarousel'),
                available   : () => Na__ClientTour__Shown(el('naPresentationCarousel')) && !!el('naPresentationCarousel').querySelector('button, [role="button"], img'),
                place       : ['top', 'left', 'right', 'bottom'],
                interactive : true,
                body        : () => [
                    Na__ClientTour__Para('These pictures are views of your design that your designer has set up for you.'),
                    Na__ClientTour__Para(`${click} any picture and the model moves smoothly to that view, like a short film. ${touch ? 'Try tapping' : 'Try clicking'} one now.`),
                    Na__ClientTour__Para(`${click} the arrows at either end to see more pictures.`, 'na-client-tour__para--quiet')
                ]
            },
            {
                id        : 'look',
                title     : 'Looking around',
                target    : () => el('naNavToolbar'),
                available : () => Na__ClientTour__Shown(el('naNavToolbar')),
                place     : ['bottom', 'top', 'left', 'right'],
                body      : () => [
                    ...(touch ? [
                        Na__ClientTour__Row('oneFinger',  'Turn',  'Drag one finger across the screen.'),
                        Na__ClientTour__Row('pinch',      'Zoom',  'Pinch two fingers together, or spread them apart.'),
                        Na__ClientTour__Row('twoFingers', 'Slide', 'Drag two fingers across the screen.')
                    ] : [
                        Na__ClientTour__Row('mouseLeft',  'Turn',  'Hold the left mouse button down and move the mouse.'),
                        Na__ClientTour__Row('mouseWheel', 'Zoom',  'Roll the wheel on your mouse forwards or backwards.'),
                        Na__ClientTour__Row('mouseRight', 'Slide', 'Hold the right mouse button down and move the mouse.')
                    ]),
                    Na__ClientTour__Para(`Lost your way? ${click} Reset View on this bar to go back to the start.`, 'na-client-tour__para--quiet')
                ]
            },
            // TEMPORARILY REMOVED (29-Oct-2026, v2.79.5): the Tools & Settings step, which opened the menu, based on
            // J. Watchorn's comments and awaiting the directors' feedback. To restore, delete this comment's /* and */.
            /*
            {
                id        : 'menu',
                title     : 'Tools & Settings',
                target    : () => el('naToolsMenu'),
                available : () => !!el('naToolsMenu'),
                place     : ['left', 'bottom', 'top'],
                enter     : () => {
                    const menu = el('naToolsMenu');
                    menuState.swapped = Na__ClientTour__MenuIsSwapped();
                    menuState.opened = !menu.open;
                    if (menuState.opened) {
                        if (menuState.swapped && el('naNavToolbarMenuBtn')) el('naNavToolbarMenuBtn').click();   // <-- Narrow screens: the bar's Menu swaps the menu in
                        else menu.setAttribute('open', 'open');
                    }
                    const exportRow = el('naImageExportToggle') && el('naImageExportToggle').closest('li');
                    if (exportRow) exportRow.classList.add(Na__ClientTour__ACCENT_CLASS);
                },
                leave     : () => {
                    const exportRow = el('naImageExportToggle') && el('naImageExportToggle').closest('li');
                    if (exportRow) exportRow.classList.remove(Na__ClientTour__ACCENT_CLASS);
                    if (menuState.opened && el('naToolsMenu')) el('naToolsMenu').removeAttribute('open');   // <-- Only if the tour opened it
                    menuState.opened = false;
                },
                body      : () => [
                    Na__ClientTour__Para('This menu has a few handy extras:'),
                    Na__ClientTour__Row('Icon__ToolsMenu__ExportImage__.svg',     'Export Image',        'Save a high quality picture of the view on your screen, to keep, print or share.'),
                    Na__ClientTour__Row('Icon__ToolsMenu__CameraSettings__.svg',  'Camera Settings',     'Change the lens, from a wide view to a close-up.'),
                    Na__ClientTour__Row('Icon__ToolsMenu__ViewModelLayers__.svg', 'Toggle Model Layers', 'Show or hide parts of the model.'),
                    Na__ClientTour__Row('Icon__ToolsMenu__FullScreen__.svg',      'Enter Full Screen',   'Let the model fill your whole screen.'),
                    Na__ClientTour__Para(menuState.swapped ? `${click} Menu on the bar at any time to open this list.`
                                                           : 'You can open it at any time from Tools & Settings, at the top right.', 'na-client-tour__para--quiet')
                ]
            },
            */
            {
                id        : 'help',
                title     : 'Help is always here',
                target    : () => el('naNavToolbarHelpBtn'),
                available : () => Na__ClientTour__Shown(el('naNavToolbarHelpBtn')),
                place     : ['bottom', 'top', 'left', 'right'],
                body      : () => [
                    Na__ClientTour__Para(`Every control is explained in Help, for a mouse, a keyboard or a touchscreen. ${touch ? 'Tap' : 'Press'} it whenever you need a reminder.`),
                    ...(walkOrFly ? [Na__ClientTour__Para('It also explains Walk and Fly, which let you move around your design as if you were there.', 'na-client-tour__para--quiet')] : [])
                ]
            },
            // TEMPORARILY REMOVED (29-Oct-2026, v2.79.5): the sharing step (the person icon's menu opened, with Copy the
            // link to share with family and friends), based on J. Watchorn's comments and awaiting the directors'
            // feedback. To restore, delete this comment's /* and */.
            /*
            {
                id        : 'guest',
                title     : 'See the tour again, or share',
                target    : () => {
                    const menu = Na__ClientTour__GuestMenu();
                    return menu ? [menu.querySelector('.ValeUserLogin__Avatar'), menu.querySelector('.ValeUserLogin__Panel')] : null;
                },
                available : () => Na__ClientTour__Shown(Na__ClientTour__GuestMenu() && Na__ClientTour__GuestMenu().querySelector('.ValeUserLogin__Avatar')),
                place     : ['left', 'bottom'],
                enter     : () => {
                    guestState.opened = false;
                    setTimeout(() => {                                          // <-- After the click that got here has finished: the menu closes on any click outside it
                        const menu = Na__ClientTour__GuestMenu();
                        if (!menu || menu.classList.contains(Na__ClientTour__GUEST_OPEN) || !Na__ClientTour__Run) return;
                        menu.classList.add(Na__ClientTour__GUEST_OPEN);
                        const avatar = menu.querySelector('.ValeUserLogin__Avatar');
                        if (avatar) avatar.setAttribute('aria-expanded', 'true');
                        guestState.opened = true;
                    }, 0);
                },
                leave     : () => {
                    const menu = Na__ClientTour__GuestMenu();
                    if (!menu || !guestState.opened) return;                    // <-- Only if the tour opened it
                    menu.classList.remove(Na__ClientTour__GUEST_OPEN);
                    const avatar = menu.querySelector('.ValeUserLogin__Avatar');
                    if (avatar) avatar.setAttribute('aria-expanded', 'false');
                    guestState.opened = false;
                },
                body      : () => [
                    Na__ClientTour__Para(`This menu is always here: ${press} the person icon at the top right of the screen.`),
                    Na__ClientTour__Row('replay', 'Take the tour again', 'Run this tour again whenever you like.'),
                    Na__ClientTour__Row('help',   'How to look around',  'Every control explained, step by step.'),
                    Na__ClientTour__Row('link',   'Copy the link to this project', 'Share it with family and friends, so they can see your design too.')
                ]
            },
            */
            {
                id        : 'done',
                title     : 'You are all set',
                body      : () => [
                    Na__ClientTour__Para('Enjoy exploring your design.'),
                    Na__ClientTour__Para('If you have any issues, contact your designer and they will be more than happy to help.', 'na-client-tour__para--strong')
                ],
                primary   : 'Start exploring'
            }
        ];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing the Tour
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Place an Element (fixed, in pixels); unchanged values are not written again
    // ------------------------------------------------------------
    function Na__ClientTour__Box(el, left, top, width, height) {
        const key = `${Math.round(left)}|${Math.round(top)}|${Math.round(width)}|${Math.round(height)}`;
        if (el.dataset.box === key) return;
        el.dataset.box = key;
        el.style.left = `${Math.round(left)}px`;
        el.style.top = `${Math.round(top)}px`;
        el.style.width = `${Math.max(0, Math.round(width))}px`;
        el.style.height = `${Math.max(0, Math.round(height))}px`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Where the Card Goes: beside its target on the first side it fits, else docked top or bottom
    // ------------------------------------------------------------
    function Na__ClientTour__PlaceCard(run, hole, places) {
        const { card, arrow } = run;
        const vw = window.innerWidth, vh = window.innerHeight;
        const cw = card.offsetWidth, ch = card.offsetHeight;
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        let left = (vw - cw) / 2, top = (vh - ch) / 2, side = 'none';

        if (hole) {
            const cx = (hole.left + hole.right) / 2, cy = (hole.top + hole.bottom) / 2;
            const tries = {
                top    : () => ({ left : clamp(cx - cw / 2, Na__ClientTour__MARGIN, vw - cw - Na__ClientTour__MARGIN), top : hole.top - Na__ClientTour__GAP - ch }),
                bottom : () => ({ left : clamp(cx - cw / 2, Na__ClientTour__MARGIN, vw - cw - Na__ClientTour__MARGIN), top : hole.bottom + Na__ClientTour__GAP }),
                left   : () => ({ left : hole.left - Na__ClientTour__GAP - cw, top : clamp(cy - ch / 2, Na__ClientTour__MARGIN, vh - ch - Na__ClientTour__MARGIN) }),
                right  : () => ({ left : hole.right + Na__ClientTour__GAP, top : clamp(cy - ch / 2, Na__ClientTour__MARGIN, vh - ch - Na__ClientTour__MARGIN) })
            };
            const fits = (p) => p.left >= Na__ClientTour__MARGIN && p.top >= Na__ClientTour__MARGIN
                             && p.left + cw <= vw - Na__ClientTour__MARGIN && p.top + ch <= vh - Na__ClientTour__MARGIN;
            side = (places || []).find((s) => tries[s] && fits(tries[s]())) || 'dock';
            if (side === 'dock') {                                             // <-- No room beside it (a phone): the card sits on the far half of the screen
                left = (vw - cw) / 2;
                top = cy > vh / 2 ? Na__ClientTour__MARGIN : vh - ch - Na__ClientTour__MARGIN;
            } else {
                ({ left, top } = tries[side]());
            }
            if (side !== 'dock') {                                             // <-- The pointer on the card's edge, opposite the target
                const along = side === 'top' || side === 'bottom' ? clamp(cx - left, 26, cw - 26) : clamp(cy - top, 26, ch - 26);
                arrow.style.left = side === 'top' || side === 'bottom' ? `${Math.round(along)}px` : '';
                arrow.style.top = side === 'left' || side === 'right' ? `${Math.round(along)}px` : '';
            }
        }
        card.dataset.side = side;
        card.style.left = `${Math.round(left)}px`;
        card.style.top = `${Math.round(top)}px`;
    }
    // ------------------------------------------------------------


    // FUNCTION | One Frame: the Spotlight and Its Blocks Over the Target, the Card Beside It
    // ------------------------------------------------------------
    function Na__ClientTour__Layout() {
        const run = Na__ClientTour__Run;
        if (!run) return;
        const step = run.steps[run.index];
        const vw = window.innerWidth, vh = window.innerHeight;
        const targets = (step.target ? [].concat(step.target() || []) : []).filter(Na__ClientTour__Shown);   // <-- One element, or several lit together
        let hole = null;
        if (targets.length) {
            const rects = targets.map((t) => t.getBoundingClientRect());
            const r = {
                left   : Math.min(...rects.map((x) => x.left)),
                top    : Math.min(...rects.map((x) => x.top)),
                right  : Math.max(...rects.map((x) => x.right)),
                bottom : Math.max(...rects.map((x) => x.bottom))
            };
            hole = {
                left   : Math.max(4, r.left - Na__ClientTour__PAD),
                top    : Math.max(4, r.top - Na__ClientTour__PAD),
                right  : Math.min(vw - 4, r.right + Na__ClientTour__PAD),
                bottom : Math.min(vh - 4, r.bottom + Na__ClientTour__PAD)
            };
        }
        const [blockTop, blockBottom, blockLeft, blockRight, blockHole] = run.blocks;
        if (hole) {
            const w = hole.right - hole.left, h = hole.bottom - hole.top;
            Na__ClientTour__Box(run.spot, hole.left, hole.top, w, h);
            Na__ClientTour__Box(blockTop, 0, 0, vw, hole.top);
            Na__ClientTour__Box(blockBottom, 0, hole.bottom, vw, vh - hole.bottom);
            Na__ClientTour__Box(blockLeft, 0, hole.top, hole.left, h);
            Na__ClientTour__Box(blockRight, hole.right, hole.top, vw - hole.right, h);
            Na__ClientTour__Box(blockHole, hole.left, hole.top, step.interactive ? 0 : w, step.interactive ? 0 : h);   // <-- Only the views step lets clicks through
            run.spot.classList.add('is-target');
        } else {
            Na__ClientTour__Box(run.spot, vw / 2, vh / 2, 0, 0);               // <-- No target: the whole screen dims
            Na__ClientTour__Box(blockTop, 0, 0, vw, vh);
            [blockBottom, blockLeft, blockRight, blockHole].forEach((b) => Na__ClientTour__Box(b, 0, 0, 0, 0));
            run.spot.classList.remove('is-target');
        }
        Na__ClientTour__PlaceCard(run, hole, step.place);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show Step n (its leave() for the old one, enter() for the new)
    // ------------------------------------------------------------
    function Na__ClientTour__Show(index) {
        const run = Na__ClientTour__Run;
        if (!run) return;
        const old = run.steps[run.index];
        if (old && old.leave && run.entered) old.leave();
        document.documentElement.classList.remove(`${Na__ClientTour__STEP_CLASS}${old ? old.id : ''}`);
        run.index = Math.max(0, Math.min(run.steps.length - 1, index));
        const step = run.steps[run.index];
        document.documentElement.classList.add(`${Na__ClientTour__STEP_CLASS}${step.id}`);
        if (step.enter) step.enter();
        run.entered = true;

        // WORDS | Progress (the middle steps only), title, body, buttons
        const middle = run.steps.filter((s) => s.target);
        const at = middle.indexOf(step);
        run.progress.textContent = at >= 0 ? `Step ${at + 1} of ${middle.length}` : '';
        run.progress.hidden = at < 0;
        run.title.textContent = step.title;
        while (run.body.firstChild) run.body.removeChild(run.body.firstChild);
        step.body().forEach((node) => run.body.appendChild(node));
        const first = run.index === 0, last = run.index === run.steps.length - 1;
        run.next.textContent = step.primary || (last ? 'Finish' : 'Next');
        run.back.textContent = step.secondary || 'Back';
        run.back.hidden = first && !step.secondary;
        run.skip.hidden = first || last;                                        // <-- The first card has No thanks; the last only finishes
        run.card.dataset.step = step.id;
        run.card.classList.remove('is-arriving');
        void run.card.offsetWidth;                                              // <-- Restart the card's arrival
        run.card.classList.add('is-arriving');
        Na__ClientTour__Layout();
        run.next.focus({ preventScroll : true });
    }
    // ------------------------------------------------------------


    // FUNCTION | Close the Tour ('finished', or left early): it is seen for a week
    // ------------------------------------------------------------
    function Na__ClientTour__Close(reason) {
        const run = Na__ClientTour__Run;
        if (!run) return;
        const step = run.steps[run.index];
        if (step && step.leave && run.entered) step.leave();
        Na__ClientTour__Run = null;
        cancelAnimationFrame(run.frame);
        window.removeEventListener('keydown', run.onKey, true);
        document.documentElement.classList.remove(Na__ClientTour__OPEN_CLASS, `${Na__ClientTour__STEP_CLASS}${step ? step.id : ''}`);
        run.root.remove();
        if (reason === 'finished') Na__ClientTour__Log('tour.finish', `${run.steps.length} steps`, { Steps : run.steps.length });
        else Na__ClientTour__Log('tour.skip', step ? step.title : '', { Step : run.index + 1, Of : run.steps.length });
        Na__ClientTour__MarkSeen();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Start the Tour Now: how = 'first' (its first visit this week), else asked for (Take the tour again)
    // ------------------------------------------------------------
    function Na__ClientTour__Start(how) {
        if (Na__ClientTour__Run) return;
        const steps = Na__ClientTour__Steps().filter((s) => !s.available || s.available());
        Na__ClientTour__Log('tour.start', how === 'first' ? 'First visit' : 'Asked for it', { Steps : steps.length });

        // THE LAYERS | Spotlight, five click blocks, the card
        const root = Na__ClientLinks__El('div', 'na-client-tour');
        const spot = Na__ClientLinks__El('div', 'na-client-tour__spot', null, { 'aria-hidden': 'true' });
        const blocks = ['top', 'bottom', 'left', 'right', 'hole'].map((name) => Na__ClientLinks__El('div', `na-client-tour__block na-client-tour__block--${name}`, null, { 'aria-hidden': 'true' }));
        const card = Na__ClientLinks__El('div', 'na-client-tour__card', null, { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'naClientTourTitle' });
        const arrow = Na__ClientLinks__El('span', 'na-client-tour__arrow', null, { 'aria-hidden': 'true' });
        const skip = Na__ClientLinks__El('button', 'na-client-tour__skip', null, { type: 'button' });
        skip.append(Na__ClientLinks__El('span', null, 'Skip tour'), Na__ClientLinks__Icon('close'));
        const progress = Na__ClientLinks__El('div', 'na-client-tour__progress');
        const title = Na__ClientLinks__El('h2', 'na-client-tour__title', null, { id: 'naClientTourTitle' });
        const body = Na__ClientLinks__El('div', 'na-client-tour__body');
        const actions = Na__ClientLinks__El('div', 'na-client-tour__actions');
        const back = Na__ClientLinks__El('button', 'na-client-tour__btn na-client-tour__btn--secondary', 'Back', { type: 'button' });
        const next = Na__ClientLinks__El('button', 'na-client-tour__btn na-client-tour__btn--primary', 'Next', { type: 'button' });
        actions.append(back, next);
        card.append(arrow, skip, progress, title, body, actions);
        root.append(spot, ...blocks, card);
        document.body.appendChild(root);
        document.documentElement.classList.add(Na__ClientTour__OPEN_CLASS);

        const run = { steps, index: 0, entered: false, root, spot, blocks, card, arrow, skip, progress, title, body, back, next, frame: 0, onKey: null };
        Na__ClientTour__Run = run;

        // BUTTONS | Next / Finish, Back (or No thanks on the welcome), Skip
        next.addEventListener('click', () => {
            if (run.index >= run.steps.length - 1) Na__ClientTour__Close('finished');
            else Na__ClientTour__Show(run.index + 1);
        });
        back.addEventListener('click', () => {
            if (run.index === 0) Na__ClientTour__Close('declined');             // <-- The welcome's No thanks
            else Na__ClientTour__Show(run.index - 1);
        });
        skip.addEventListener('click', () => Na__ClientTour__Close('skipped'));

        // KEYS | Escape closes, the arrows step; nothing reaches the model meanwhile
        run.onKey = (event) => {
            if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') return;   // <-- The focused button's own keys
            event.stopImmediatePropagation();
            event.preventDefault();
            if (event.key === 'Escape') Na__ClientTour__Close('skipped');
            else if (event.key === 'ArrowRight') next.click();
            else if (event.key === 'ArrowLeft' && run.index > 0) Na__ClientTour__Show(run.index - 1);
        };
        window.addEventListener('keydown', run.onKey, true);

        // FOLLOW | The target every frame (a menu dropping down, a window resized)
        const loop = () => {
            if (Na__ClientTour__Run !== run) return;
            Na__ClientTour__Layout();
            run.frame = requestAnimationFrame(loop);
        };
        Na__ClientTour__Show(0);
        run.frame = requestAnimationFrame(loop);
    }
    // ------------------------------------------------------------


    // FUNCTION | Start the Tour If It Has Not Been Seen This Week (when the model first shows)
    // ------------------------------------------------------------
    function Na__ClientTour__MaybeStart(attempt) {
        if (Na__ClientTour__Run || Na__ClientTour__Seen()) return;
        const tries = attempt || 0;
        if ((Na__ClientTour__Busy() || document.visibilityState === 'hidden') && tries < Na__ClientTour__RETRIES) {
            setTimeout(() => Na__ClientTour__MaybeStart(tries + 1), Na__ClientTour__RETRY_MS);
            return;
        }
        Na__ClientTour__Start('first');
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Tour on Screen?
    // ------------------------------------------------------------
    function Na__ClientTour__IsOpen() {
        return !!Na__ClientTour__Run;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__ClientTour__Start,
        Na__ClientTour__MaybeStart,
        Na__ClientTour__IsOpen
    };

// endregion -------------------------------------------------------------------
