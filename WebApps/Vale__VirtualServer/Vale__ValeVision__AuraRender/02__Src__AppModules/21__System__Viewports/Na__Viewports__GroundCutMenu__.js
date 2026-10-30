// =============================================================================
// VALEVISION AURA - VIEWPORTS - THE GROUND CUT'S MENU AND ADJUST PANEL
// =============================================================================
//
// FILE       : Na__Viewports__GroundCutMenu__.js
// NAMESPACE  : Na__GroundCutMenu
// MODULE     : Viewports - Ground Cut Menu
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Right-click an elevation viewport on a sheet to choose how it
//              meets the ground, seed a new swish, and open a small panel of
//              live sliders for it
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - Adam, 30-Oct-2026: "Rather than try and gauge this, just allow the user to
//   right-click and change the ground elevation ground plane cutoff effect. In
//   the right-click context menu, you should be able to adjust different
//   settings and be able to seed new watercolour swishes". Asked, he chose the
//   menu plus a small Adjust panel.
// - THE MENU IS THE ENGINE'S (its look, keys and submenus), opened through the
//   host. It lists the kinds, New swish, Flip, Colour, Ink ground line,
//   Adjust..., Show it (AURA's own: when the cut is made) and AURA's Undo and
//   Redo. A right drag still pans the sheet: only a right click that did not
//   move opens it (Na__DrawingSheets__Controls__Pc__).
// - THE ADJUST PANEL floats beside the viewport, draggable by its head, with
//   every control the engine lists for a cut: its label, range, step, readout
//   (click it to type a value) and hint are the engine's. A slider shows a
//   quick painting as it moves; let go, the change is saved as one step and
//   the finished painting follows. It closes with its x, Escape, another tab,
//   or its viewport going; an undo or redo rebuilds it from the drawing set.
// - Every change goes through the engine's Clean, so the viewport keeps only
//   what differs from its kind's starting look.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.5.13)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__Select, Na__AppState__On } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__El, Na__Dom__IconButton, Na__Dom__Select, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__EngineHost__GroundCut, Na__EngineHost__GroundCutLoad, Na__EngineHost__OpenMenu } from '../10__System__EngineHost/Na__EngineHost__GroundCut__.js';
    import { Na__Surface__RedrawLayer } from '../20__System__DrawingSheets/Na__DrawingSheets__Surface__.js';
    import { Na__DrawingSet__Viewport } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';
    import {
        Na__GroundCut__Applies, Na__GroundCut__Of, Na__GroundCut__Write, Na__GroundCut__Cut,
        Na__GroundCut__Preview, Na__GroundCut__EndPreview, Na__GroundCut__Changed
    } from './Na__Viewports__GroundCut__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__GroundCutMenu__State = {
        panel    : null,                         // <-- The Adjust panel's element
        viewport : null,                         // <-- The viewport it adjusts
        history  : null,                         // <-- AURA's undo history module, for the menu's Undo and Redo
        frame    : 0,                            // <-- A quick painting waiting for the next animation frame
        wired    : false
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Changing a Cut
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Sheet Open Now and a Viewport on It by Id
    // ------------------------------------------------------------
    function Na__GroundCutMenu__Find(id) {
        const d = Na__AppState__Data;
        const sheet = d.doc ? (d.doc.AuraDrawingSet__Sheets || []).find((s) => s.Sheet__Id === d.tab) || null : null;
        return sheet ? Na__DrawingSet__Viewport(sheet, id) : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Change a Viewport's Settings: mutate(settings) returns the next, kept in the engine's clean form
    // ------------------------------------------------------------
    // live: a slider moving (a quick painting, nothing saved yet); otherwise one
    // saved step, the quick painting standing until the finished one is ready.
    // ------------------------------------------------------------
    function Na__GroundCutMenu__Change(viewport, mutate, live) {
        const engine = Na__EngineHost__GroundCut();
        if (!engine || !viewport) return;
        const now = Na__GroundCut__Of(viewport).Settings;
        const next = mutate(now ? JSON.parse(JSON.stringify(now)) : {});
        Na__GroundCut__Write(viewport, { settings: engine.Settings.PainterlyNPR__GroundCut__Clean(next) });
        Na__GroundCutMenu__Show(viewport, live);
    }

    // Show it: quickly while a slider moves; saved and finished otherwise
    function Na__GroundCutMenu__Show(viewport, live) {
        const S = Na__GroundCutMenu__State;
        const cut = Na__GroundCut__Cut(viewport, Na__AppState__Data.doc);
        if (live) {
            if (!cut || S.frame) return;
            S.frame = requestAnimationFrame(() => { S.frame = 0; Na__GroundCut__Preview(viewport); });   // <-- One quick painting a frame, however fast the slider moves
            return;
        }
        if (S.frame) { cancelAnimationFrame(S.frame); S.frame = 0; }
        if (cut) Na__GroundCut__Preview(viewport);
        Na__GroundCut__EndPreview(viewport);
        Na__GroundCut__Changed(viewport);
        Na__Surface__RedrawLayer('viewports');
        if (S.panel && S.viewport === viewport) Na__GroundCutMenu__Fill();
    }

    // When the cut is made: 'Auto', 'On' or 'Off'
    function Na__GroundCutMenu__SetMode(viewport, mode) {
        Na__GroundCut__Write(viewport, { mode });
        Na__GroundCut__EndPreview(viewport);
        Na__GroundCut__Changed(viewport);
        Na__Surface__RedrawLayer('viewports');
        if (Na__GroundCutMenu__State.panel && Na__GroundCutMenu__State.viewport === viewport) Na__GroundCutMenu__Fill();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Right-Click Menu
// -----------------------------------------------------------------------------

    // FUNCTION | A Right Click on the Sheet: an elevation viewport's menu (true when it opened)
    // ------------------------------------------------------------
    function Na__GroundCutMenu__OnContextMenu(event) {
        if (Na__AppState__Data.tab === 'environment') return false;
        const under = (el) => (el && el.closest ? el.closest('[data-hit="viewport"]') : null);
        const hit = under(event.target) || under(document.elementFromPoint(event.clientX, event.clientY));   // <-- The desk may have the event if it held the pointer for a pan
        const viewport = hit ? Na__GroundCutMenu__Find(hit.getAttribute('data-id')) : null;
        if (!Na__GroundCut__Applies(viewport)) return false;
        Na__AppState__Select('viewport', viewport.Viewport__Id);
        const x = event.clientX, y = event.clientY;
        const S = Na__GroundCutMenu__State;
        const history = S.history ? Promise.resolve(S.history)                   // <-- Fetched on the first menu, so this module adds nothing to the app's load order
            : import('../40__Feature__DrawingSet/Na__DrawingSet__History__.js').then((m) => { S.history = m; return m; }).catch(() => null);
        Promise.all([Na__EngineHost__GroundCutLoad(), history]).then(() => Na__EngineHost__OpenMenu(Na__GroundCutMenu__Items(viewport, x, y), x, y, 'Ground cut-off'));
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Menu's Items, in the Engine's Form
    // ------------------------------------------------------------
    function Na__GroundCutMenu__Items(viewport, x, y) {
        const engine = Na__EngineHost__GroundCut();
        if (!engine) return [{ Label: 'The ground cut needs PainterlyNPR v0.8.13 or later (sync the engine)', Disabled: true }];
        const E = engine.Settings;
        const rec = Na__GroundCut__Of(viewport);
        const s = E.PainterlyNPR__GroundCut__Resolve(rec.Settings, viewport.Viewport__Id);
        const cut = Na__GroundCut__Cut(viewport, Na__AppState__Data.doc);
        const change = (mutate) => () => Na__GroundCutMenu__Change(viewport, mutate, false);
        const items = [];
        if (!cut) items.push({ Heading: rec.Mode === 'Off' ? 'Off for this viewport' : 'Drag the bottom edge up past the ground to cut it' });
        E.PainterlyNPR__GroundCut__Kinds().forEach((k) => items.push({
            Label: k.Label, Title: k.Hint, Checked: k.Key === s.Kind, Action: change((st) => E.PainterlyNPR__GroundCut__WithKind(st, k.Key))
        }));
        items.push({ Separator: true });
        items.push({ Label: 'New swish', Hint: 'a new seed', Disabled: s.Plain, Title: 'Paint the swish again from a new seed', Action: change((st) => E.PainterlyNPR__GroundCut__NewSeed(st)) });
        items.push({ Label: 'Flip', Checked: s.Flip, Disabled: s.Plain, Title: 'Mirror it: its heavy end to the other side', Action: change((st) => Object.assign(st, { Flip: !s.Flip })) });
        items.push({ Label: 'Colour', Disabled: s.Plain, Submenu: E.PainterlyNPR__GroundCut__Colours(s.Kind).map((c) => ({
            Label: c.Key === s.Colour ? `${c.Label} (now)` : c.Label, Swatch: c.Swatch, Action: change((st) => Object.assign(st, { Colour: c.Key }))
        })) });
        items.push({ Label: 'Ink ground line', Checked: s.InkLine, Disabled: s.Plain, Action: change((st) => Object.assign(st, { InkLine: !s.InkLine })) });
        items.push({ Label: 'Adjust...', Disabled: s.Plain, Title: 'Every setting, live, in a small panel', Action: () => Na__GroundCutMenu__Open(viewport, x, y) });
        items.push({ Separator: true });
        items.push({ Label: 'Show it', Submenu: Na__AppConfig__Get('GroundCut__Modes', []).map((m) => ({
            Label: m.Label, Title: m.Hint, Checked: m.Key === rec.Mode, Action: () => Na__GroundCutMenu__SetMode(viewport, m.Key)
        })) });
        items.push(...Na__GroundCutMenu__HistoryItems());
        return items;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Undo and Redo, Named for the Step (AURA's history, as the engine's own menus name theirs)
    // ------------------------------------------------------------
    function Na__GroundCutMenu__HistoryItems() {
        const h = Na__GroundCutMenu__State.history;
        if (!h) return [];
        const name = (label) => label.charAt(0).toLowerCase() + label.slice(1);
        const undo = h.Na__History__Label('undo'), redo = h.Na__History__Label('redo');
        return [
            { Separator: true },
            { Label: undo ? `Undo ${name(undo)}` : 'Undo', Hint: 'Ctrl+Z', Disabled: !undo, Action: () => h.Na__History__Undo() },
            { Label: redo ? `Redo ${name(redo)}` : 'Redo', Hint: 'Ctrl+Y', Disabled: !redo, Action: () => h.Na__History__Redo() }
        ];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Adjust Panel
// -----------------------------------------------------------------------------

    // FUNCTION | Open the Panel for a Viewport, Beside the Point the Menu Opened At
    // ------------------------------------------------------------
    function Na__GroundCutMenu__Open(viewport, x, y) {
        const S = Na__GroundCutMenu__State;
        Na__GroundCutMenu__Close();
        Na__GroundCutMenu__Wire();
        S.viewport = viewport;
        S.panel = Na__Dom__El('div', 'aura-groundcut', null, { role: 'dialog', 'aria-label': 'Ground cut-off' });
        document.body.appendChild(S.panel);
        Na__GroundCutMenu__Fill();
        const r = S.panel.getBoundingClientRect();
        S.panel.style.left = `${Math.max(8, Math.min(x + 16, window.innerWidth - r.width - 8))}px`;   // <-- Kept on screen
        S.panel.style.top = `${Math.max(8, Math.min(y - 24, window.innerHeight - r.height - 8))}px`;
    }

    function Na__GroundCutMenu__Close() {
        const S = Na__GroundCutMenu__State;
        if (S.panel) S.panel.remove();
        S.panel = null;
        S.viewport = null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Fill the Panel From the Viewport's Settings Now
    // ------------------------------------------------------------
    function Na__GroundCutMenu__Fill() {
        const S = Na__GroundCutMenu__State;
        const engine = Na__EngineHost__GroundCut();
        const viewport = S.viewport;
        if (!S.panel || !engine || !viewport) return;
        const E = engine.Settings;
        const rec = Na__GroundCut__Of(viewport);
        const s = E.PainterlyNPR__GroundCut__Resolve(rec.Settings, viewport.Viewport__Id);
        const panel = Na__Dom__Clear(S.panel);
        const change = (mutate, live) => Na__GroundCutMenu__Change(viewport, mutate, live);

        // The head: its title (drag it to move the panel) and its close
        const head = Na__Dom__El('div', 'aura-groundcut__head');
        head.appendChild(Na__Dom__El('span', 'aura-groundcut__title', 'Ground cut-off'));
        const close = Na__Dom__IconButton('close', 'aura-button aura-groundcut__close', null, 'Close');
        close.addEventListener('click', () => Na__GroundCutMenu__Close());
        head.appendChild(close);
        panel.appendChild(head);
        Na__GroundCutMenu__Draggable(panel, head);

        const body = Na__Dom__El('div', 'aura-groundcut__body');
        panel.appendChild(body);
        const row = (label, control) => {
            const r = Na__Dom__El('label', 'aura-param aura-param--choice');
            r.appendChild(Na__Dom__El('span', 'aura-param__label', label));
            r.appendChild(control);
            return r;
        };

        // The kind, its colour, and when it shows
        const kind = Na__Dom__Select(E.PainterlyNPR__GroundCut__Kinds().map((k) => ({ value: k.Key, label: k.Label })), s.Kind, 'aura-param__select');
        kind.addEventListener('change', () => change((st) => E.PainterlyNPR__GroundCut__WithKind(st, kind.value), false));
        body.appendChild(row('Kind', kind));
        if (!s.Plain) {
            const colour = Na__Dom__Select(E.PainterlyNPR__GroundCut__Colours(s.Kind).map((c) => ({ value: c.Key, label: c.Label })), s.Colour, 'aura-param__select');
            colour.addEventListener('change', () => change((st) => Object.assign(st, { Colour: colour.value }), false));
            body.appendChild(row('Colour', colour));
        }
        const mode = Na__Dom__Select(Na__AppConfig__Get('GroundCut__Modes', []).map((m) => ({ value: m.Key, label: m.Label })), rec.Mode, 'aura-param__select');
        mode.addEventListener('change', () => Na__GroundCutMenu__SetMode(viewport, mode.value));
        body.appendChild(row('Show it', mode));

        if (!Na__GroundCut__Cut(viewport, Na__AppState__Data.doc)) {
            body.appendChild(Na__Dom__El('p', 'aura-panel__hint', rec.Mode === 'Off' ? 'Off for this viewport: nothing is cut.' : 'Shown once the bottom edge is dragged up past the building\'s ground line.'));
        }
        if (s.Plain) {
            body.appendChild(Na__Dom__El('p', 'aura-panel__hint', 'A plain cut: the drawing stops at the edge and nothing is painted.'));
            return;
        }

        // New swish, Flip, back to the kind's own look
        const buttons = Na__Dom__El('div', 'aura-groundcut__buttons');
        const seed = Na__Dom__IconButton('dice', 'aura-button', 'New swish', 'Paint the swish again from a new seed');
        seed.addEventListener('click', () => change((st) => E.PainterlyNPR__GroundCut__NewSeed(st), false));
        const flip = Na__Dom__IconButton('refresh', 'aura-button', 'Flip', 'Mirror it: its heavy end to the other side');
        flip.setAttribute('aria-pressed', String(s.Flip));
        flip.addEventListener('click', () => change((st) => Object.assign(st, { Flip: !st.Flip }), false));
        const reset = Na__Dom__IconButton('undo', 'aura-button', 'Reset', 'Back to the kind\'s own look (the seed and Flip kept)');
        reset.addEventListener('click', () => change((st) => E.PainterlyNPR__GroundCut__WithKind(st, st.Kind || s.Kind), false));
        [seed, flip, reset].forEach((b) => buttons.appendChild(b));
        body.appendChild(buttons);

        // Every control the engine lists: its toggles, then its sliders
        E.PainterlyNPR__GroundCut__Controls().forEach((c) => {
            if (c.Type === 'Toggle') {
                const check = Na__Dom__El('input', null, null, { type: 'checkbox' });
                check.checked = !!s[c.Key];
                check.addEventListener('change', () => change((st) => Object.assign(st, { [c.Key]: check.checked }), false));
                const t = Na__Dom__El('label', 'aura-check', null, { title: c.Hint });
                t.appendChild(check);
                t.appendChild(Na__Dom__El('span', null, c.Label));
                body.appendChild(t);
                return;
            }
            body.appendChild(Na__GroundCutMenu__Slider(c, s.Values[c.Key], change));
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Slider Row: the engine's label, range and readout (click the readout to type)
    // ------------------------------------------------------------
    function Na__GroundCutMenu__Slider(c, value, change) {
        const r = Na__Dom__El('label', 'aura-param', null, { title: c.Hint });
        r.appendChild(Na__Dom__El('span', 'aura-param__label', c.Label));
        const input = Na__Dom__El('input', 'aura-param__range', null, { type: 'range', min: c.Min, max: c.Max, step: c.Step, 'aria-label': c.Label });
        input.value = value;
        const output = Na__Dom__El('output', 'aura-param__readout', c.Readout(value), { tabindex: '0', title: 'Click to type a value' });
        const set = (live) => change((st) => { st.Values = Object.assign({}, st.Values, { [c.Key]: parseFloat(input.value) }); return st; }, live);
        input.addEventListener('input', () => { output.textContent = c.Readout(parseFloat(input.value)); set(true); });
        input.addEventListener('change', () => set(false));
        const typeIn = (event) => {
            if (event) event.preventDefault();                                   // <-- The label would hand the click to the slider
            if (output.hidden) return;
            const field = Na__Dom__El('input', 'aura-param__typein', null, { type: 'text', 'aria-label': `Type a value for ${c.Label}` });
            field.value = output.textContent;
            output.hidden = true;
            output.after(field);
            field.focus();
            field.select();
            let done = false;
            const finish = (keep) => {
                if (done) return;
                done = true;
                const v = keep && c.Readout.Parse ? c.Readout.Parse(field.value) : NaN;
                field.remove();
                output.hidden = false;
                if (Number.isFinite(v)) {                                        // <-- Through the slider: its own range and step clamp and snap it
                    input.value = String(v);
                    output.textContent = c.Readout(parseFloat(input.value));
                    set(false);
                }
            };
            field.addEventListener('keydown', (e) => {
                e.stopPropagation();                                             // <-- Typing is not the sheet's
                if (e.key === 'Enter') { e.preventDefault(); finish(true); }
                else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
            });
            field.addEventListener('blur', () => finish(true));
        };
        output.addEventListener('click', typeIn);
        output.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'F2') typeIn(e); });
        r.appendChild(input);
        r.appendChild(output);
        return r;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Drag the Panel by Its Head
    // ------------------------------------------------------------
    function Na__GroundCutMenu__Draggable(panel, head) {
        head.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 || e.target.closest('button')) return;
            e.preventDefault();
            const r = panel.getBoundingClientRect();
            const dx = e.clientX - r.left, dy = e.clientY - r.top;
            const move = (m) => {
                panel.style.left = `${Math.max(0, Math.min(m.clientX - dx, window.innerWidth - r.width))}px`;
                panel.style.top = `${Math.max(0, Math.min(m.clientY - dy, window.innerHeight - 40))}px`;
            };
            const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What Closes or Rebuilds the Panel (wired once)
    // ------------------------------------------------------------
    function Na__GroundCutMenu__Wire() {
        const S = Na__GroundCutMenu__State;
        if (S.wired) return;
        S.wired = true;
        document.addEventListener('keydown', (e) => {
            if (!S.panel || e.key !== 'Escape' || (e.target && e.target.classList && e.target.classList.contains('aura-param__typein'))) return;
            e.preventDefault();
            e.stopPropagation();                                                 // <-- Closing the panel is all Escape does: the viewport stays selected
            Na__GroundCutMenu__Close();
        }, true);
        Na__AppState__On('tab', () => Na__GroundCutMenu__Close());
        Na__AppState__On('restored', () => {                                     // <-- An undo or redo wrote the viewport back: the panel shows it as it is now
            if (!S.panel) return;
            if (!Na__GroundCutMenu__Find(S.viewport.Viewport__Id)) Na__GroundCutMenu__Close();
            else Na__GroundCutMenu__Fill();
        });
        Na__AppState__On('changed', () => {                                      // <-- Its viewport deleted
            if (S.panel && !Na__GroundCutMenu__Find(S.viewport.Viewport__Id)) Na__GroundCutMenu__Close();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__GroundCutMenu__OnContextMenu,
        Na__GroundCutMenu__Open,
        Na__GroundCutMenu__Close
    };

// endregion -------------------------------------------------------------------
