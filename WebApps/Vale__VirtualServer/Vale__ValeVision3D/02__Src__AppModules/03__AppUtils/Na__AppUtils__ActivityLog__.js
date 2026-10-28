/* =============================================================================
   VALEVISION 3D - APP UTILS - ACTIVITY LOG (WHAT PEOPLE DO IN THE 3D APP)
   =============================================================================

   FILE       : Na__AppUtils__ActivityLog__.js
   NAMESPACE  : (none: listens to the app's own window events)
   MODULE     : AppUtils - Activity Log
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Report ValeVision 3D's mode changes to the activity ledger through
                the shared ValeShared__ActivityLog__.js (window.ValeActivity): the
                model loaded, the Layout Editor or the client drawings opened, the
                floor plan or elevations opened, presentation scenes viewed, the
                navigation mode changed
   CREATED    : 08-Oct-2026

   DESCRIPTION:
   - NO APP CODE CHANGED: the app already announces every mode change as a window
     event (na-app-scene-ready, na-layouteditor-mode-changed, na-drawing-view-changed,
     na-pm-scene-activated, na-navigation-mode-changed); this file listens.
   - PEOPLE, NOT START-UP: the app picks a scene and a navigation mode by itself
     while it loads. Those are reported only after the person has touched, clicked
     or pressed a key, and only when they differ from the last one reported.
   - The few actions with no event (a drawing a client opens, a sheet PDF, the
     specification printed, a cross section placed, the measure tool, a Video
     Studio preview, the project link email) call window.ValeActivity.Log where
     they happen.
   - Who, where from and which project are added by the shared script and the
     server; nothing here can fail the app (no ValeActivity: nothing happens).
     On a client link the shared script adds the link's token to every report,
     so the Server Manager knows which client did what.
   - WHAT A VISIT DOES (1.2.0), heard from the page itself, no module changed:
       image.export      an image actually downloaded after Download Image
                         (Detail: Ratio, Resolution, Enhance, Custom, Lens);
                         the shared script's own download report then stays quiet
       camera.lens       the lens slider let go (Target "35 mm"), once it settles
       camera.correction perspective correction on or off
       layer.toggle      a model layer shown or hidden (Target the layer)
       view.fullscreen   full screen entered or left
       view.reset        Reset View on the bar;  help.open  Help on the bar
       settings.change   a Visual Effects switch, Purge App Cache
       menu.open         Tools & Settings opened, or one of its panels
                         (not while the client tour is driving the menu)
       visit.summary     when the page is hidden or closed after the model
                         showed: time on screen, time active (an input in each
                         5 seconds), and the turns, zooms, slides and key moves
                         made on the model (Target "4 min 20 s"). Under 10
                         seconds on screen is not reported.

   =============================================================================

   DEVELOPMENT LOG:
   28-Oct-2026 - Version 1.2.0 (ValeVision3D v2.78.0)
   - What a visit does (above): exports, the camera, layers, full screen, Reset
     View, Help, settings, the menus, and a visit summary. For the Server
     Manager's Insights view (tab 05).

   09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.76.0)
   - The Drawing Editor page opening (na-app-page-changed, page 'drawing') is
     reported as a view, like the Layout Editor.

   08-Oct-2026 - Version 1.0.0
   - Initial build (activity ledger; the Server Manager's tab 05).

   ============================================================================= */

(function() {

// -----------------------------------------------------------------------------
// REGION | State and Helpers
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | What Was Last Reported
    // ------------------------------------------------------------
    var Na__ActLog__UserActed = false;                                         // <-- Set by the first touch, click or key
    var Na__ActLog__Last      = {};                                            // <-- kind -> last value reported
    var Na__ActLog__EditorOn  = false;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Report One Thing (never throws)
    // ------------------------------------------------------------
    function Na__ActLog__Send(action, target, detail) {
        try {
            if (window.ValeActivity) window.ValeActivity.Log(action, { target: target || '', detail: detail });
        } catch (e) { /* never in the way */ }
    }

    function Na__ActLog__Changed(kind, value) {
        if (Na__ActLog__Last[kind] === value) return false;
        Na__ActLog__Last[kind] = value;
        return true;
    }

    function Na__ActLog__IsClient() {                                          // <-- No sign-in: a client on a project link
        try { return !(window.ValeUserLogin && window.ValeUserLogin.User && window.ValeUserLogin.User()); }
        catch (e) { return false; }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Listeners
// -----------------------------------------------------------------------------

    ['pointerdown', 'keydown', 'touchstart'].forEach(function(name) {
        document.addEventListener(name, function() { Na__ActLog__UserActed = true; }, { capture: true, passive: true });
    });

    // MODEL | Loaded and on screen (with the load time)
    window.addEventListener('na-app-scene-ready', function() {
        if (!Na__ActLog__Changed('model', 'ready')) return;
        var seconds = window.performance ? Math.round(window.performance.now() / 100) / 10 : null;
        Na__ActLog__Send('model.open', '', seconds ? { LoadSeconds: seconds } : undefined);
    });

    // LAYOUT EDITOR | Opened (an author) or the drawings opened (a client); each change of state once
    window.addEventListener('na-layouteditor-mode-changed', function(e) {
        var d = (e && e.detail) || {};
        if (!!d.isActive === Na__ActLog__EditorOn) return;
        Na__ActLog__EditorOn = !!d.isActive;
        if (Na__ActLog__EditorOn) Na__ActLog__Send('view.open', Na__ActLog__IsClient() ? 'the drawings' : 'the Layout Editor');
    });

    // APP PAGES | The Drawing Editor opened (Create Drawing, Saved Drawings, Forward); each change of page once
    window.addEventListener('na-app-page-changed', function(e) {
        var d = (e && e.detail) || {};
        if (!Na__ActLog__Changed('page', d.page || 'model')) return;
        if (d.page === 'drawing') Na__ActLog__Send('view.open', 'the Drawing Editor');
    });

    // DRAWING VIEW | The floor plan or the elevations
    window.addEventListener('na-drawing-view-changed', function(e) {
        var d = (e && e.detail) || {};
        if (!d.isActive) { Na__ActLog__Last.drawing = ''; return; }
        var what = d.kind === 'plan' ? 'the floor plan' : d.kind === 'elevation' ? 'the elevations' : 'a drawing view';
        if (Na__ActLog__Changed('drawing', what)) Na__ActLog__Send('view.open', what);
    });

    // PRESENTATION | A scene viewed (the one picked at start-up is the app's, not the person's)
    window.addEventListener('na-pm-scene-activated', function(e) {
        var d = (e && e.detail) || {};
        var name = d.sceneName || d.sceneId || '';
        if (!name || !Na__ActLog__Changed('scene', name) || !Na__ActLog__UserActed) return;
        Na__ActLog__Send('scene.view', name);
    });

    // NAVIGATION | Walk, orbit, fly
    window.addEventListener('na-navigation-mode-changed', function(e) {
        var mode = String(((e && e.detail) || {}).mode || '');
        if (!mode || !Na__ActLog__Changed('nav', mode) || !Na__ActLog__UserActed) return;
        Na__ActLog__Send('view.mode', mode.toLowerCase() + ' mode');
    });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | What a Visit Does: Exports, Camera, Layers, Settings, Menus (1.2.0)
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | An Export Waiting for Its Download, the Lens Settling
    // ------------------------------------------------------------
    var Na__ActLog__Export     = null;                                         // <-- { at, target, detail }: Download Image pressed
    var Na__ActLog__ExportWait = 180e3;                                        // <-- A 4K render can take a while
    var Na__ActLog__LensTimer  = null;
    var Na__ActLog__LensMs     = 1200;                                         // <-- The lens is reported once it settles
    var Na__ActLog__ActiveVfx  = { naVfxProgressiveToggle: 1, naVfxProfileLinesToggle: 1, naVfxSsaoToggle: 1 };
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Element's Words, a Checkbox's State
    // ------------------------------------------------------------
    function Na__ActLog__Text(id) {
        var el = document.getElementById(id);
        return el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : '';
    }

    function Na__ActLog__Checked(id) {
        var el = document.getElementById(id);
        return !!(el && el.checked);
    }

    function Na__ActLog__TourOpen() {                                          // <-- The client tour drives the menu itself
        return document.documentElement.classList.contains('na-client-tour-open');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What Download Image Will Make (the panel as it stands when pressed)
    // ------------------------------------------------------------
    function Na__ActLog__ExportFacts() {
        var ratio = Na__ActLog__Text('naImageExportRatioValue'), res = Na__ActLog__Text('naImageExportResolutionValue');
        return {
            target : ((res ? res + ' ' : '') + (ratio ? ratio + ' ' : '') + 'image').trim(),
            detail : { Ratio: ratio, Resolution: res, Enhance: Na__ActLog__Checked('naImageExportEnhanceToggle'),
                       Custom: Na__ActLog__Checked('naImageExportCustomToggle'), Lens: Na__ActLog__Text('naCameraLensValue') }
        };
    }
    // ------------------------------------------------------------


    // CLICKS | Download Image, the download itself, the bar, layers, settings, menus
    // ------------------------------------------------------------
    // Capture phase: the click is heard before a module's own handler can stop
    // it. State that the module changes (a panel opening, a layer's button) is
    // read a moment later, once it has.
    // ------------------------------------------------------------
    document.addEventListener('click', function(e) {
        var t = e.target;
        if (!t || !t.closest) return;
        try {
            if (t.closest('#naImageExportAction')) {                           // <-- Armed: reported when the file downloads
                Na__ActLog__Export = Object.assign({ at: Date.now() }, Na__ActLog__ExportFacts());
                return;
            }
            var a = t.closest('a[download]');
            if (a) {
                var x = Na__ActLog__Export;
                if (x && Date.now() - x.at < Na__ActLog__ExportWait && /\.(png|jpe?g|webp)$/i.test(a.getAttribute('download') || '')) {
                    Na__ActLog__Export = null;
                    Na__ActLog__Send('image.export', x.target, x.detail);      // <-- The shared script's download report stays quiet (within 3 s)
                }
                return;
            }
            if (t.closest('#naNavToolbarResetBtn')) { Na__ActLog__Send('view.reset'); return; }
            if (t.closest('#naNavToolbarHelpBtn'))  { Na__ActLog__Send('help.open'); return; }
            if (t.closest('#naPurgeAppCacheAction')) { Na__ActLog__Send('settings.change', 'Purge App Cache'); return; }

            var layer = t.closest('#naModelToggleList button[data-category]');
            if (layer) {
                window.setTimeout(function() {
                    var shown = layer.classList.contains('na-model-toggle__button--active');
                    Na__ActLog__Send('layer.toggle', String(layer.textContent || '').trim() + (shown ? ' (shown)' : ' (hidden)'),
                                     { Layer: layer.dataset.category || '', Shown: shown });
                }, 0);
                return;
            }

            var vfx = t.closest('.na-dev-toggle');
            if (vfx && Na__ActLog__ActiveVfx[vfx.id]) {
                window.setTimeout(function() {
                    var on = vfx.getAttribute('aria-pressed') === 'true';
                    var label = vfx.querySelector('.na-dev-toggle__label');
                    Na__ActLog__Send('settings.change', (label ? label.textContent.trim() : vfx.id) + ': ' + (on ? 'on' : 'off'));
                }, 0);
                return;
            }

            var menuButton = t.closest('#naToolsMenu .na-dropdown-menu__button--has-submenu');
            if (menuButton && !Na__ActLog__TourOpen()) {
                window.setTimeout(function() {
                    var panel = menuButton.nextElementSibling;
                    var share = menuButton.id === 'naSendEmailMenuButton' && document.querySelector('.na-email-workers-overlay.is-visible');
                    if (!share && !(panel && panel.classList.contains('na-dropdown-menu__panel') && panel.classList.contains('is-open'))) return;
                    var words = menuButton.querySelector('.na-dropdown-menu__btn-label');
                    Na__ActLog__Send('menu.open', String((words || menuButton).textContent || '').replace(/[▾\s]+$/, '').trim());
                }, 0);
            }
        } catch (err) { /* never in the way */ }
    }, true);
    // ------------------------------------------------------------


    // TOOLS & SETTINGS | Opened by the person (not the start-up teaser, not the tour)
    // ------------------------------------------------------------
    // This file runs in the <head>: the menu exists once the page is parsed.
    // ------------------------------------------------------------
    function Na__ActLog__WatchToolsMenu() {
        var menu = document.getElementById('naToolsMenu');
        if (!menu) return;
        menu.addEventListener('toggle', function() {
            if (menu.open && Na__ActLog__UserActed && !Na__ActLog__TourOpen()) Na__ActLog__Send('menu.open', 'Tools & Settings');
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Na__ActLog__WatchToolsMenu, { once: true });
    else Na__ActLog__WatchToolsMenu();
    // ------------------------------------------------------------


    // CAMERA | The lens (once it settles) and perspective correction
    // ------------------------------------------------------------
    document.addEventListener('change', function(e) {
        var t = e.target;
        if (!t || !t.id) return;
        if (t.id === 'naCameraLensSlider') {
            window.clearTimeout(Na__ActLog__LensTimer);
            Na__ActLog__LensTimer = window.setTimeout(function() {
                var lens = Na__ActLog__Text('naCameraLensValue') || (t.value + ' mm');
                if (Na__ActLog__Changed('lens', lens)) Na__ActLog__Send('camera.lens', lens, { FocalLength: Number(t.value) || 0 });
            }, Na__ActLog__LensMs);
        } else if (t.id === 'naVerticalCorrectionToggle') {
            Na__ActLog__Send('camera.correction', t.checked ? 'On' : 'Off');
        }
    }, true);
    // ------------------------------------------------------------


    // FULL SCREEN | Entered or left (the menu, F11 aside: the browser's own full screen is not the app's)
    // ------------------------------------------------------------
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function(name) {
        document.addEventListener(name, function() {
            var on = !!(document.fullscreenElement || document.webkitFullscreenElement);
            if (Na__ActLog__Changed('fullscreen', on ? 'on' : 'off')) Na__ActLog__Send('view.fullscreen', on ? 'Entered' : 'Left');
        });
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Visit Summary: Time on Screen, Time Active, Moves on the Model (1.2.0)
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | This Visit So Far (from the model showing; reset at each report)
    // ------------------------------------------------------------
    var Na__Visit = { ready: false, since: 0, shownMs: 0, active: 0, turns: 0, zooms: 0, slides: 0, keys: 0,
                      lastInput: 0, lastWheel: 0, lastKey: 0 };
    var Na__Visit__MinSeconds = 10;                                            // <-- Shorter visits are not reported
    var Na__Visit__TickMs     = 5000;                                          // <-- Active: an input within each 5 seconds
    var Na__Visit__Pointers   = {};                                            // <-- Pointers down on the model
    var Na__Visit__Gesture    = null;                                          // <-- The gesture they make together
    var Na__Visit__MoveKeys   = /^(Arrow(Up|Down|Left|Right)|[wasdqeWASDQE])$/;
    // ------------------------------------------------------------


    // HELPER FUNCTION | "4 min 20 s"
    // ------------------------------------------------------------
    function Na__Visit__Words(seconds) {
        var m = Math.floor(seconds / 60), s = seconds % 60;
        return m ? m + ' min' + (s ? ' ' + s + ' s' : '') : s + ' s';
    }
    // ------------------------------------------------------------


    // FUNCTION | Report This Stretch of the Visit, Then Start Counting Again
    // ------------------------------------------------------------
    function Na__Visit__Report() {
        if (!Na__Visit.ready) return;
        var now = Date.now();
        var shown = Na__Visit.shownMs + (Na__Visit.since ? now - Na__Visit.since : 0);
        var seconds = Math.round(shown / 1000);
        if (seconds >= Na__Visit__MinSeconds) {
            Na__ActLog__Send('visit.summary', Na__Visit__Words(seconds), {
                Seconds: seconds, ActiveSeconds: Math.min(seconds, Na__Visit.active), Turns: Na__Visit.turns,
                Zooms: Na__Visit.zooms, Slides: Na__Visit.slides, Keys: Na__Visit.keys
            });
        }
        Na__Visit.shownMs = 0;
        Na__Visit.since = document.visibilityState === 'visible' ? now : 0;
        Na__Visit.active = Na__Visit.turns = Na__Visit.zooms = Na__Visit.slides = Na__Visit.keys = 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Distance and Middle of Two Pointers
    // ------------------------------------------------------------
    function Na__Visit__Pair() {
        var ids = Object.keys(Na__Visit__Pointers);
        if (ids.length < 2) return null;
        var a = Na__Visit__Pointers[ids[0]], b = Na__Visit__Pointers[ids[1]];
        return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }
    // ------------------------------------------------------------


    // LISTENERS | Any input keeps the visit active; gestures on the model are counted
    // ------------------------------------------------------------
    // One finger or the left button: a turn. The right or middle button (or
    // Ctrl, Shift or Cmd with the left, as the orbit controls take them): a
    // slide. Two fingers: a zoom when their spread changes by an eighth, else
    // a slide. A burst of wheel steps, or of arrow / WASD / Q E presses, is one.
    // ------------------------------------------------------------
    ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(function(name) {
        window.addEventListener(name, function() { Na__Visit.lastInput = Date.now(); }, { capture: true, passive: true });
    });

    window.addEventListener('pointerdown', function(e) {
        if (!Na__Visit.ready || !e.target || e.target.id !== 'renderCanvas') return;
        Na__Visit__Pointers[e.pointerId] = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
        if (!Na__Visit__Gesture) {
            Na__Visit__Gesture = { max: 0, moved: false, pinch0: null, pinch1: null,
                                   slide: e.pointerType === 'mouse' && (e.button === 1 || e.button === 2 || (e.button === 0 && (e.ctrlKey || e.metaKey || e.shiftKey))) };
        }
        var n = Object.keys(Na__Visit__Pointers).length;
        Na__Visit__Gesture.max = Math.max(Na__Visit__Gesture.max, n);
        if (n === 2) Na__Visit__Gesture.pinch0 = Na__Visit__Gesture.pinch1 = Na__Visit__Pair();
    }, { capture: true, passive: true });

    window.addEventListener('pointermove', function(e) {
        var p = Na__Visit__Pointers[e.pointerId];
        if (!p || !Na__Visit__Gesture) return;
        p.x = e.clientX;
        p.y = e.clientY;
        if (Math.hypot(p.x - p.x0, p.y - p.y0) > 6) Na__Visit__Gesture.moved = true;
        if (Object.keys(Na__Visit__Pointers).length === 2) Na__Visit__Gesture.pinch1 = Na__Visit__Pair();
    }, { capture: true, passive: true });

    ['pointerup', 'pointercancel'].forEach(function(name) {
        window.addEventListener(name, function(e) {
            if (!Na__Visit__Pointers[e.pointerId]) return;
            delete Na__Visit__Pointers[e.pointerId];
            if (Object.keys(Na__Visit__Pointers).length) return;                // <-- The gesture ends with its last finger
            var g = Na__Visit__Gesture;
            Na__Visit__Gesture = null;
            if (!g) return;
            if (g.max >= 2 && g.pinch0 && g.pinch1) {
                var spread = g.pinch0.d ? g.pinch1.d / g.pinch0.d : 1;
                if (Math.abs(spread - 1) > 0.125) Na__Visit.zooms += 1;
                else if (Math.hypot(g.pinch1.mx - g.pinch0.mx, g.pinch1.my - g.pinch0.my) > 10) Na__Visit.slides += 1;
            } else if (g.moved) {
                if (g.slide) Na__Visit.slides += 1;
                else Na__Visit.turns += 1;
            }
        }, { capture: true, passive: true });
    });

    window.addEventListener('wheel', function(e) {
        if (!Na__Visit.ready || !e.target || e.target.id !== 'renderCanvas') return;
        var now = Date.now();
        if (now - Na__Visit.lastWheel > 700) Na__Visit.zooms += 1;
        Na__Visit.lastWheel = now;
    }, { capture: true, passive: true });

    window.addEventListener('keydown', function(e) {
        if (!Na__Visit.ready || e.ctrlKey || e.metaKey || e.altKey || !Na__Visit__MoveKeys.test(e.key || '')) return;
        var el = document.activeElement;
        if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
        var now = Date.now();
        if (now - Na__Visit.lastKey > 800) Na__Visit.keys += 1;
        Na__Visit.lastKey = now;
    });
    // ------------------------------------------------------------


    // TIMING | From the model showing; active in each 5 seconds with an input; reported when the page goes
    // ------------------------------------------------------------
    window.addEventListener('na-app-scene-ready', function() {
        if (Na__Visit.ready) return;
        Na__Visit.ready = true;
        Na__Visit.since = document.visibilityState === 'visible' ? Date.now() : 0;
        Na__Visit.lastInput = Date.now();
        window.setInterval(function() {
            if (Na__Visit.since && Date.now() - Na__Visit.lastInput <= Na__Visit__TickMs) Na__Visit.active += Na__Visit__TickMs / 1000;
        }, Na__Visit__TickMs);
    });

    document.addEventListener('visibilitychange', function() {
        if (!Na__Visit.ready) return;
        if (document.visibilityState === 'hidden') {
            if (Na__Visit.since) { Na__Visit.shownMs += Date.now() - Na__Visit.since; Na__Visit.since = 0; }
            Na__Visit__Report();                                                // <-- A tab hidden may never come back (a phone, a closed laptop)
        } else if (!Na__Visit.since) {
            Na__Visit.since = Date.now();
        }
    });

    window.addEventListener('pagehide', Na__Visit__Report);                     // <-- Hidden first, so usually nothing is left by now
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
