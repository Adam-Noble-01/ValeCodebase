/* =============================================================================
 * VALE OBJECT LIBRARY - TOOLBAR, KEYBOARD, HINT AND THE ADDRESS BAR
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__Controls__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Controls
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Toolbar, keyboard, hint and the address bar
 * CREATED    : 16-Oct-2026
 *
 * DESCRIPTION:
 * - Part of the Object Library demo
 * - Loaded by ValeObjectLibrary__Demo__2.0.0__.html
 * - Shares state through window.ValeObjectLibrary__Modules
 *
 * -----------------------------------------------------------------------------
 *
 * DEVELOPMENT LOG:
 * 16-Oct-2026 - Version 2.0.0
 * - Separated from ValeObjectLibrary__Demo__2.0.0__.html
 *
 * ============================================================================= */

(function (App) {
    'use strict';

    const Data     = App.Data;
    const Model    = App.Model;
    const State    = App.State;
    const Elements = App.Elements;

    // =====================================================================
    // REGION | Controls, Keyboard, Hint, Address Bar
    // =====================================================================

    // FUNCTION | Toolbar, header buttons and panel toggles
    // ------------------------------------------------------------
    App.ValeObjectLibrary_InitControls = function () {
        Elements.zoomOut.addEventListener('click', function () { App.ValeObjectLibrary_ZoomBy(1 / 1.3); });
        Elements.zoomIn.addEventListener('click', function () { App.ValeObjectLibrary_ZoomBy(1.3); });
        Elements.zoomReadout.addEventListener('click', App.ValeObjectLibrary_ZoomReset);
        Elements.fitAll.addEventListener('click', App.ValeObjectLibrary_FitAll);
        Elements.fitSelection.addEventListener('click', App.ValeObjectLibrary_FitSelection);

        Elements.detailButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                App.ValeObjectLibrary_SetDetail(button.getAttribute('data-detail'));
                App.ValeObjectLibrary_FitAll();
            });
        });

        Elements.viewButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                App.ValeObjectLibrary_HideHint();
                App.ValeObjectLibrary_SetView(button.getAttribute('data-view'));
            });
        });

        Elements.links.addEventListener('click', function () {
            State.allLinks = !State.allLinks;
            if (App.ValeObjectLibrary_IsForce()) {
                App.ValeObjectLibrary_Refresh();                                 // <-- Links bring the Resources into the network as nodes
            } else {
                App.ValeObjectLibrary_RenderRefs(false);
            }
            App.ValeObjectLibrary_UpdateControls();
        });

        Elements.navigatorToggle.addEventListener('click', function () {
            State.navigatorOn = !State.navigatorOn;
            Elements.navigator.hidden = !State.navigatorOn;
            App.ValeObjectLibrary_UpdateControls();
            App.ValeObjectLibrary_QueueFrame();
        });

        if (Elements.inspectorClose) {
            Elements.inspectorClose.addEventListener('click', function () {
                State.inspectorDismissed = true;
                App.ValeObjectLibrary_SetInspectorOpen(false);
            });
        }
        if (Elements.inspectorOpen) {
            Elements.inspectorOpen.addEventListener('click', function () {
                State.inspectorDismissed = false;
                App.ValeObjectLibrary_SetInspectorOpen(true);
            });
        }

        Elements.tourButton.addEventListener('click', App.ValeObjectLibrary_TourStart);
        Elements.tourNext.addEventListener('click', function () { App.ValeObjectLibrary_TourStep(1); });
        Elements.tourBack.addEventListener('click', function () { App.ValeObjectLibrary_TourStep(-1); });
        Elements.tourClose.addEventListener('click', App.ValeObjectLibrary_TourEnd);

        Elements.helpButton.addEventListener('click', function (event) {
            event.stopPropagation();
            App.ValeObjectLibrary_ToggleHelp();
        });
        document.addEventListener('click', function (event) {
            if (!Elements.help.hidden && !Elements.help.contains(event.target)) {
                App.ValeObjectLibrary_ToggleHelp(false);
            }
        });
    };

    App.ValeObjectLibrary_ToggleHelp = function (show) {
        const open = show === undefined ? Elements.help.hidden : show;
        Elements.help.hidden = !open;
        Elements.helpButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    App.ValeObjectLibrary_UpdateControls = function () {
        // The same four steps, named for each view - the network starts from its centre
        const labels = {
            scheme  : { scheme: null,                                           library: ['Start',         'Back to the start: Vale Object Library on its own'] },
            family  : { scheme: ['Families',   'Open the chart to the Families'],  library: ['Collections',   'Open the centre to its collections'] },
            assembly: { scheme: ['Assemblies', 'Open the chart to the Assemblies'], library: ['Ranges',        'Open each collection to its ranges'] },
            parts   : { scheme: ['Parts',      'Open every box, down to the Components and Products'], library: ['Whole network', 'Open everything - select a component or product to see the Resources it uses'] },
            all     : { scheme: ['All',        'Open every box. Resources appear when you select a part'], library: null }
        };
        Elements.detailButtons.forEach(function (button) {
            const detail = button.getAttribute('data-detail');
            const label  = labels[detail][State.view === 'library' ? 'library' : 'scheme'];
            button.hidden = !label;
            if (label) {
                button.textContent = label[0];
                button.title       = label[1];
            }
            button.classList.toggle('is-on', detail === State.detail);
        });
        document.querySelectorAll('.strip-legend__item').forEach(function (chip) {
            const legend = chip.getAttribute('data-legend');
            const on     = legend === 'library' ? State.detail === 'scheme'
                         : legend === 'category' ? State.detail === 'family'
                         : legend === 'range' ? State.detail === 'assembly'
                         : State.detail === 'parts' || State.detail === 'all';
            chip.classList.toggle('is-on', on);
            chip.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        Elements.viewButtons.forEach(function (button) {
            const on = button.getAttribute('data-view') === State.view;
            button.classList.toggle('is-on', on);
            button.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        Elements.links.hidden = true;                                        // <-- Resources are drawn for the selected part, not as a web of every link
        Elements.links.classList.toggle('is-on', State.allLinks);
        Elements.links.setAttribute('aria-pressed', State.allLinks ? 'true' : 'false');
        Elements.navigatorToggle.classList.toggle('is-on', State.navigatorOn);
        Elements.navigatorToggle.setAttribute('aria-pressed', State.navigatorOn ? 'true' : 'false');
    };
    // ------------------------------------------------------------

    // FUNCTION | Keyboard - CAD-style view keys, arrows to move, a clicker for the tour
    // ------------------------------------------------------------
    App.ValeObjectLibrary_InitKeyboard = function () {
        document.addEventListener('keydown', function (event) {
            const typing = event.target.closest && event.target.closest('input, textarea, select, [contenteditable]');
            if (!typing && (event.key === '/' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f'))) {
                event.preventDefault();
                Elements.searchInput.focus();
                return;
            }
            if (typing || event.altKey || event.ctrlKey || event.metaKey) {
                return;
            }
            const onButton = event.target.closest && event.target.closest('button, a');
            if (State.tourIndex >= 0) {
                if (event.key === 'ArrowRight' || event.key === 'PageDown' || (event.key === ' ' && !onButton)) {
                    event.preventDefault();                                  // <-- Space on a focused button is left to the button, or it would step twice
                    App.ValeObjectLibrary_TourStep(1);
                    return;
                }
                if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
                    event.preventDefault();
                    App.ValeObjectLibrary_TourStep(-1);
                    return;
                }
                if (event.key === 'Escape') {
                    App.ValeObjectLibrary_TourEnd();
                    return;
                }
            }
            switch (event.key) {
                case 'f': case 'F': case 'Home':
                    App.ValeObjectLibrary_FitAll();
                    break;
                case 'z': case 'Z':
                    App.ValeObjectLibrary_FitSelection();
                    break;
                case '+': case '=':
                    App.ValeObjectLibrary_ZoomBy(1.3);
                    break;
                case '-': case '_':
                    App.ValeObjectLibrary_ZoomBy(1 / 1.3);
                    break;
                case '0':
                    App.ValeObjectLibrary_ZoomReset();
                    break;
                case '?':
                    App.ValeObjectLibrary_ToggleHelp();
                    break;
                case 'Escape':
                    if (!Elements.help.hidden) {
                        App.ValeObjectLibrary_ToggleHelp(false);
                    } else {
                        App.ValeObjectLibrary_Select(null);
                    }
                    break;
                case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown':
                    event.preventDefault();
                    App.ValeObjectLibrary_NavigateSelection(event.key.slice(5).toLowerCase());
                    break;
                case 'Enter': case ' ':
                    if (onButton) {
                        return;                                              // <-- Let a focused button do its own thing
                    }
                    if (State.selection && State.selection.type === 'node') {
                        event.preventDefault();
                        App.ValeObjectLibrary_ToggleNode(Model.byUid.get(State.selection.uid));
                    }
                    break;
                default:
                    return;
            }
            App.ValeObjectLibrary_HideHint();
        });
    };
    // ------------------------------------------------------------

    // FUNCTION | The first-visit hint
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ShowHint = function () {
        Elements.hint.classList.remove('is-gone');
        window.clearTimeout(State.hintTimer);                               // <-- Stays until the first click, so the route in is still on screen
        if (State.transform) {
            App.ValeObjectLibrary_PlaceHint(State.transform);
        }
    };

    // FUNCTION | Leader from the prompt down onto the first box
    // ------------------------------------------------------------
    App.ValeObjectLibrary_PlaceHint = function (transform) {
        if (!Elements.hint || Elements.hint.classList.contains('is-gone') || State.view === 'schemes' || !Model.root) {
            return;
        }
        const box = App.Layout.pos.get(Model.root.uid);
        if (!box) {
            return;
        }
        const tipX = transform.applyX(box.x + box.w / 2);
        const tipY = transform.applyY(box.y - box.h / 2) - 8;               // <-- Stem tip sits just above the first box
        Elements.hint.style.left = Math.round(tipX) + 'px';
        Elements.hint.style.top  = Math.round(tipY) + 'px';
        Elements.hint.style.transform = 'translateY(-100%)';
    };

    App.ValeObjectLibrary_HideHint = function () {
        if (Elements.hint) {
            Elements.hint.classList.add('is-gone');
        }
    };
    // ------------------------------------------------------------

    // FUNCTION | Keep the selection in the address bar, so a link opens on the same object
    // ------------------------------------------------------------
    App.ValeObjectLibrary_UpdateHash = function () {
        if (State.view === 'schemes') {
            try {
                history.replaceState(null, '', location.pathname + location.search + '#schemes');
            } catch (error) {
                // Some browsers refuse replaceState on file:// - the chart works without it
            }
            return;
        }
        const selection = State.selection;
        let id = '';
        if (selection) {
            id = selection.type === 'resource' ? selection.id : Model.byUid.get(selection.uid).def.id;
        }
        let hash = id ? '#' + encodeURIComponent(id) : '';
        if (State.view === 'library') {
            hash = '#library' + (id ? '/' + encodeURIComponent(id) : '');           // <-- page.html#library/PRD-VG726 opens the library view on it
        }
        try {
            history.replaceState(null, '', location.pathname + location.search + hash);
        } catch (error) {
            // Some browsers refuse replaceState on file:// - the chart works without it
        }
    };
    // ------------------------------------------------------------

    // FUNCTION | Data problems, shown on the canvas as well as in the console
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ShowIssues = function () {
        const issues = Model.issues;
        if (!issues.length) {
            return;
        }
        const box = Elements.issues;
        box.textContent = '';
        App.ValeObjectLibrary_Put(box, 
            App.ValeObjectLibrary_El('strong', { text: App.ValeObjectLibrary_Plural(issues.length, 'problem', 'problems') + ' in the library data file' }),
            App.ValeObjectLibrary_El('ul', null, issues.slice(0, 6).map(function (message) { return App.ValeObjectLibrary_El('li', { text: message }); })),
            issues.length > 6 ? App.ValeObjectLibrary_El('div', { text: 'And ' + (issues.length - 6) + ' more in the browser console.' }) : null,
            App.ValeObjectLibrary_El('button', { type: 'button', class: 'issues__close', text: 'Dismiss', onclick: function () { box.hidden = true; } }));
        box.hidden = false;
    };

    App.ValeObjectLibrary_ShowFatal = function (message) {
        const element = document.createElement('div');
        element.className   = 'fatal';
        element.textContent = message;
        document.getElementById('ValeObjectLibrary_Canvas').appendChild(element);
    };
    // ------------------------------------------------------------

    // endregion -----------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
