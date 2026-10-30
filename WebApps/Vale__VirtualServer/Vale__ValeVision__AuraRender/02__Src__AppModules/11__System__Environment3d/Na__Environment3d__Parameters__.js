// =============================================================================
// VALEVISION AURA - 3D ENVIRONMENT - PARAMETERS
// =============================================================================
//
// FILE       : Na__Environment3d__Parameters__.js
// NAMESPACE  : Na__Parameters
// MODULE     : 3D Environment - Parameters
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Every one of the engine's parameters, laid out as the engine's
//              own panel lays them out: its sections as folds, its groups and
//              folds nested inside, its sliders, menus, presets and hints
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE ENGINE'S PANEL, NOT A COPY (Adam, 30-Oct-2026: "ensure all parameters
//   are availible from npr in aura" and "dont duplicate code the npr repo
//   remains definitive source"). The sections, groups, folds, labels, ranges,
//   menus, presets and hints are PainterlyNPR's Na__Interface__Panel__Config.json,
//   read through the engine host (Na__EngineHost__Panel__.js). AURA only leaves
//   out the sections it has its own of (AuraConfig__Engine__OwnSections: the
//   saved views, the art direction points, the sheets).
// - A slider, a menu or a preset moves the engine through the engine's own
//   functions (SetControl, SetChoice, ApplyPenPreset, ApplyVegPreset); the
//   drawing set saves the settings after a pause.
// - NOTHING IS LOST: any engine control the panel does not place (one added
//   to the engine before its panel, say) is shown in a last fold.
// - Every readout can be typed into (click it, or Tab to it and press Enter):
//   the value as the readout shows it ("60%", "1.2", "off").
// - Every fold starts folded, one open at a time at each level; a group's hints wait
//   behind its info button, as the engine's own panel keeps them.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 2.2.0 (AURA 0.4.2)
// - The sections carry their icons (Paper and finish, Light, Pen, Wash, Sky;
//   "More from the engine" the parameters' sliders); the groups inside do not.
//
// 30-Oct-2026 - Version 2.1.1 (AURA 0.4.1)
// - The groups inside a section fold the same way: every fold at every level
//   starts folded, opening one folds its open siblings, nothing remembered.
//
// 30-Oct-2026 - Version 2.1.0 (AURA 0.4.1)
// - Every section starts folded and they work as an accordion: opening one
//   folds the others.
//
// 30-Oct-2026 - Version 2.0.0 (AURA 0.3.3)
// - Built from the engine's own panel config: all of its parameters, nested
//   as it nests them, with its pen and vegetation presets, every menu (ink,
//   paper, cloud type, the plants' outline hand and leaf marks) and its hints.
//   AURA's own list of groups and its label overrides are gone.
//
// 30-Oct-2026 - Version 1.1.0
// - Typable readouts (Na__Parameters__TypeIn); groups reordered in the config
//   (paper and finish first, then light, pen, wash, sky).
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Dom__El, Na__Dom__Icon, Na__Dom__PanelIcon, Na__Dom__Clear, Na__Dom__Select } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__EngineHost__Control } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import {
        Na__EnginePanel__Sections,
        Na__EnginePanel__ControlKeys,
        Na__EnginePanel__Seams,
        Na__EnginePanel__SetControl,
        Na__EnginePanel__CanChoose,
        Na__EnginePanel__ChoiceValue,
        Na__EnginePanel__SetChoice,
        Na__EnginePanel__ApplyPenPreset,
        Na__EnginePanel__ApplyVegPreset,
        Na__EnginePanel__PenPreset
    } from '../10__System__EngineHost/Na__EngineHost__Panel__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Parameters__NEEDS     = 'Arrives with PainterlyNPR v0.8.1';          // <-- A preset or menu the pinned engine cannot work yet
    const Na__Parameters__ICONS     = {                                            // <-- A section's key in the engine's panel -> its panel icon
        Paper             : 'PaperAndFinish',
        Light             : 'Light',
        Pen               : 'Pen',
        Wash              : 'Wash',
        Sky               : 'Sky',
        MoreFromTheEngine : 'Parameters'
    };
    const Na__Parameters__State = {
        root    : null,
        rows    : [],                            // <-- { kind: 'range' | 'choice', key, input, output, overrides, by }
        presets : [],                            // <-- The pen preset buttons: { key, button }
        shown   : new Set()                      // <-- The range keys on the panel, so none is left out
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building Blocks
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Fold: a section, or a group inside one ({ root, body, AddHint })
    // ------------------------------------------------------------
    // The info button appears with the fold's first hint and shows its hints at
    // the top of its body. Every fold, a section or a group inside one, starts
    // folded, and each level is an accordion: opening a fold folds its open
    // siblings (Adam, 30-Oct-2026: "keep them all folded and then when a user
    // unfolds the section they want in the parameters the other parameter
    // sections fold"). Nothing is remembered: the panel always opens folded.
    // ------------------------------------------------------------
    function Na__Parameters__Fold(parent, key, title, open, sub, folds) {
        const isOpen = false;
        const root = Na__Dom__El('section', `aura-fold${sub ? ' aura-fold--sub' : ''}${isOpen ? ' is-open' : ''}`);
        const bar = Na__Dom__El('div', 'aura-fold__bar');
        const head = Na__Dom__El('button', 'aura-fold__head', null, { type: 'button', 'aria-expanded': String(isOpen) });
        if (!sub && Na__Parameters__ICONS[key]) head.appendChild(Na__Dom__PanelIcon(Na__Parameters__ICONS[key], 'aura-fold__icon'));
        head.appendChild(Na__Dom__El('span', 'aura-fold__title', title));
        head.appendChild(Na__Dom__Icon('down', 'aura-fold__chevron'));
        head.addEventListener('click', () => {
            const nowOpen = !root.classList.contains('is-open');
            if (nowOpen) {
                parent.querySelectorAll(':scope > .aura-fold.is-open').forEach((other) => {
                    other.classList.remove('is-open');
                    const otherHead = other.querySelector(':scope > .aura-fold__bar > .aura-fold__head');
                    if (otherHead) otherHead.setAttribute('aria-expanded', 'false');
                });
            }
            root.classList.toggle('is-open', nowOpen);
            head.setAttribute('aria-expanded', String(nowOpen));
        });
        bar.appendChild(head);
        const body = Na__Dom__El('div', 'aura-fold__body');
        root.appendChild(bar);
        root.appendChild(body);
        parent.appendChild(root);

        let hints = null;
        const AddHint = (text) => {
            if (!hints) {
                hints = Na__Dom__El('div', 'aura-fold__hints');
                hints.hidden = true;
                body.prepend(hints);
                const info = Na__Dom__El('button', 'aura-fold__info', null, { type: 'button', title: `About ${title}`, 'aria-label': `About ${title}`, 'aria-expanded': 'false' });
                info.appendChild(Na__Dom__Icon('info'));
                info.addEventListener('click', () => {
                    hints.hidden = !hints.hidden;
                    info.setAttribute('aria-expanded', String(!hints.hidden));
                    if (!hints.hidden && !root.classList.contains('is-open')) head.click();   // <-- Asking about a closed fold opens it
                });
                head.after(info);
            }
            hints.appendChild(Na__Dom__El('p', 'aura-fold__hint', text));
        };
        return { root, body, AddHint };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Slider Row: label, range, readout
    // ------------------------------------------------------------
    // overrides: the range and label the engine keeps on the slider itself
    // rather than in its controls config (the drawing discipline's). quiet: the
    // label is its fold's title already, so the row shows only the readout.
    // ------------------------------------------------------------
    function Na__Parameters__Slider(key, overrides, quiet) {
        const control = Na__EngineHost__Control(key, overrides);
        if (!control || control.Min === undefined || control.Max === undefined) return null;
        const row = Na__Dom__El('label', 'aura-param');
        row.appendChild(Na__Dom__El('span', 'aura-param__label', quiet ? null : control.Label));
        const input = Na__Dom__El('input', 'aura-param__range', null, { type: 'range', min: control.Min, max: control.Max, step: control.Step || 0.01, 'aria-label': control.Label });
        input.value = control.Value;
        const output = Na__Dom__El('output', 'aura-param__readout', control.Readout(control.Value), { tabindex: '0', title: 'Click to type a value' });
        input.addEventListener('input', () => {
            const value = parseFloat(input.value);
            Na__EnginePanel__SetControl(key, value);
            output.textContent = control.Readout(value);
            Na__Parameters__MarkPresets();                                     // <-- The engine marks its preset Custom where its own panel would
        });
        output.addEventListener('click', (event) => { event.preventDefault(); Na__Parameters__TypeIn(input, output, control); });   // <-- preventDefault: the label would hand the click to the slider
        output.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== 'F2') return;
            event.preventDefault();
            Na__Parameters__TypeIn(input, output, control);
        });
        row.appendChild(input);
        row.appendChild(output);
        Na__Parameters__State.rows.push({ kind: 'range', key, input, output, overrides });
        Na__Parameters__State.shown.add(key);
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Type a Value Into a Slider's Readout
    // ------------------------------------------------------------
    // A text field stands in for the readout; Enter or leaving it sets the value,
    // Escape puts the readout back. The value goes in through the slider (which
    // clamps and snaps it to its own range and step) and its input event, so a
    // typed value acts exactly as a drag to it would.
    // ------------------------------------------------------------
    function Na__Parameters__TypeIn(input, output, control) {
        if (output.hidden) return;
        const field = Na__Dom__El('input', 'aura-param__typein', null, { type: 'text', 'aria-label': `Type a value for ${control.Label}` });
        field.value = output.textContent;
        let done = false;
        const finish = (commit) => {
            if (done) return;
            done = true;
            const value = commit ? control.Parse(field.value) : NaN;
            field.remove();
            output.hidden = false;
            if (!Number.isFinite(value)) return;                               // <-- Nothing readable: the slider keeps its value
            input.value = String(value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        };
        field.addEventListener('keydown', (event) => {
            event.stopPropagation();                                           // <-- Typing never reaches the app's shortcuts
            if (event.key === 'Enter') { event.preventDefault(); finish(true); }
            else if (event.key === 'Escape') { event.preventDefault(); finish(false); output.focus(); }
        });
        field.addEventListener('blur', () => finish(true));
        field.addEventListener('click', (event) => event.preventDefault());
        output.hidden = true;
        output.after(field);
        field.focus();
        field.select();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Menu Row, as the engine's panel names it (Select, By, Label, Options)
    // ------------------------------------------------------------
    function Na__Parameters__Choice(item) {
        const by = item.By || 'data-select', key = item.Select;
        const options = (item.Options || []).map(([value, label]) => ({ value, label }));
        if (!key || !options.length) return null;
        const row = Na__Dom__El('label', 'aura-param aura-param--choice');
        row.appendChild(Na__Dom__El('span', 'aura-param__label', item.Label || key));
        const select = Na__Dom__Select(options, Na__EnginePanel__ChoiceValue(by, key), 'aura-select aura-param__select');
        if (Na__EnginePanel__CanChoose(by, key)) {
            select.addEventListener('change', () => {
                Na__EnginePanel__SetChoice(by, key, select.value);
                if (key === 'CloudType') Na__Parameters__Sync();               // <-- A cloud type sets the coverage, size and height too
                else Na__Parameters__MarkPresets();
            });
        } else {
            select.disabled = true;
            select.title = Na__Parameters__NEEDS;
        }
        row.appendChild(select);
        Na__Parameters__State.rows.push({ kind: 'choice', key, by, input: select });
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Pen Presets (the engine's buttons) and the Vegetation's (its chips)
    // ------------------------------------------------------------
    function Na__Parameters__PenPresets(buttons) {
        const grid = Na__Dom__El('div', 'aura-param-presets');
        const usable = Na__EnginePanel__Seams();
        buttons.forEach((b) => {
            const key = b.Data[1];
            const button = Na__Dom__El('button', 'aura-param-preset', b.Text || key, { type: 'button', 'data-preset': key, disabled: !usable, title: usable ? null : Na__Parameters__NEEDS });
            button.addEventListener('click', () => { if (Na__EnginePanel__ApplyPenPreset(key)) Na__Parameters__Sync(); });
            grid.appendChild(button);
            Na__Parameters__State.presets.push({ key, button });
        });
        return grid;
    }

    function Na__Parameters__VegPresets(chips) {
        const row = Na__Dom__El('div', 'aura-param-chips');
        const usable = Na__EnginePanel__Seams();
        chips.forEach((c) => {
            const key = c.Data[1];
            const chip = Na__Dom__El('button', 'aura-param-chip', c.Text || key, { type: 'button', disabled: !usable, title: usable ? null : Na__Parameters__NEEDS });
            chip.addEventListener('click', () => { if (Na__EnginePanel__ApplyVegPreset(key)) Na__Parameters__Sync(); });
            row.appendChild(chip);
        });
        return row;
    }

    function Na__Parameters__MarkPresets() {
        const now = Na__EnginePanel__PenPreset();
        Na__Parameters__State.presets.forEach((p) => p.button.classList.toggle('is-active', p.key === now));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Slider the Engine Writes Into Its Panel by Hand (an Element)
    // ------------------------------------------------------------
    // The drawing discipline's: an <input type="range" data-control> inside an
    // Element, carrying its own min, max, step and label. Anything else written
    // by hand is the engine page's own furniture and is left out.
    // ------------------------------------------------------------
    function Na__Parameters__ElementSliders(element, foldTitle, out) {
        if (!element || typeof element !== 'object') return out;
        const attrs = Object.fromEntries((element.Attrs || []).filter((a) => Array.isArray(a)));
        if (element.Element === 'input' && attrs['data-control']) {
            const overrides = attrs['aria-label'] ? { Label: attrs['aria-label'] } : {};
            ['min', 'max', 'step'].forEach((k) => { if (attrs[k] !== undefined && Number.isFinite(parseFloat(attrs[k]))) overrides[k[0].toUpperCase() + k.slice(1)] = parseFloat(attrs[k]); });
            out.push({ key: attrs['data-control'], overrides, quiet: !!attrs['aria-label'] && attrs['aria-label'].toLowerCase() === String(foldTitle).toLowerCase() });   // <-- Not the fold's own title twice
        }
        (element.Children || []).forEach((child) => Na__Parameters__ElementSliders(child, foldTitle, out));
        return out;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building the Panel
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Lay Out the Engine's Items Into a Fold
    // ------------------------------------------------------------
    // The engine's grammar: a titled Group is a fold, open at first; an
    // untitled one adds its items where it stands; a Fold has its own Open.
    // Camera and export buttons are the engine page's (AURA has its own).
    // ------------------------------------------------------------
    function Na__Parameters__Items(items, fold, title, sectionKey, folds) {
        (items || []).forEach((item) => {
            if (!item || typeof item !== 'object') return;
            if (item.Group !== undefined || item.Fold !== undefined) {
                const name = item.Group !== undefined ? item.Group : item.Fold;
                if (!name) { Na__Parameters__Items(item.Items, fold, title, sectionKey, folds); return; }
                const open = item.Fold !== undefined ? item.Open !== false : true;
                const sub = Na__Parameters__Fold(fold.body, `${sectionKey}/${name}`, name, open, true, folds);
                Na__Parameters__Items(item.Items, sub, name, sectionKey, folds);
                if (!sub.body.querySelector('.aura-param, .aura-param-presets, .aura-param-chips')) sub.root.remove();   // <-- Nothing AURA can show in it
            } else if (item.Range) {
                const row = Na__Parameters__Slider(item.Range);
                if (row) fold.body.appendChild(row);
            } else if (item.Select) {
                const row = Na__Parameters__Choice(item);
                if (row) fold.body.appendChild(row);
            } else if (Array.isArray(item.Buttons)) {
                if (item.Buttons.length && item.Buttons.every((b) => Array.isArray(b.Data) && b.Data[0] === 'pen-preset')) fold.body.appendChild(Na__Parameters__PenPresets(item.Buttons));
            } else if (Array.isArray(item.Chips)) {
                if (item.Chips.length && item.Chips.every((c) => Array.isArray(c.Data) && c.Data[0] === 'veg-preset')) fold.body.appendChild(Na__Parameters__VegPresets(item.Chips));
            } else if (typeof item.Hint === 'string') {
                fold.AddHint(item.Hint);
            } else if (item.Element) {
                Na__Parameters__ElementSliders(item, title, []).forEach((s) => {
                    const row = Na__Parameters__Slider(s.key, s.overrides, s.quiet);
                    if (row) fold.body.appendChild(row);
                });
            }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Parameters Panel Into a Container
    // ------------------------------------------------------------
    function Na__Parameters__Build(container) {
        const S = Na__Parameters__State;
        S.root = container;
        S.rows = [];
        S.presets = [];
        S.shown = new Set();
        Na__Dom__Clear(container);
        const folds = {};                                                        // <-- No fold is remembered (2.1.1): the panel always opens folded
        Na__EnginePanel__Sections(Na__AppConfig__Get('Engine__OwnSections', [])).forEach((section) => {
            const fold = Na__Parameters__Fold(container, section.Key, section.Label, section.Open, false, folds);
            Na__Parameters__Items(section.Items, fold, section.Label, section.Key, folds);
            if (!fold.body.querySelector('.aura-param, .aura-param-presets, .aura-param-chips')) fold.root.remove();
        });

        // Any engine control the panel did not place: never out of reach
        const left = Na__EnginePanel__ControlKeys().filter((key) => !S.shown.has(key));
        if (left.length) {
            const fold = Na__Parameters__Fold(container, 'MoreFromTheEngine', 'More from the engine', false, false, folds);
            left.forEach((key) => { const row = Na__Parameters__Slider(key); if (row) fold.body.appendChild(row); });
            if (!fold.body.children.length) fold.root.remove();
        }
        Na__Parameters__MarkPresets();
    }
    // ------------------------------------------------------------


    // FUNCTION | Bring Every Row Back in Step With the Engine (after a preset, loading settings or a new seed)
    // ------------------------------------------------------------
    function Na__Parameters__Sync() {
        Na__Parameters__State.rows.forEach((row) => {
            if (row.kind === 'range') {
                const control = Na__EngineHost__Control(row.key, row.overrides);
                if (!control) return;
                row.input.value = control.Value;
                row.output.textContent = control.Readout(control.Value);
            } else {
                const value = Na__EnginePanel__ChoiceValue(row.by, row.key);
                if (value !== undefined) row.input.value = value;
            }
        });
        Na__Parameters__MarkPresets();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Parameters__Build,
        Na__Parameters__Sync
    };

// endregion -------------------------------------------------------------------
