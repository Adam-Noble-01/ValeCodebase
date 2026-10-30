// =============================================================================
// VALEVISION AURA - 3D ENVIRONMENT - PARAMETERS
// =============================================================================
//
// FILE       : Na__Environment3d__Parameters__.js
// NAMESPACE  : Na__Parameters
// MODULE     : 3D Environment - Parameters
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The engine's parameters as folding groups of sliders and two
//              choices (ink, paper), built from the engine's own control list
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - EVERY CONTROL IS THE ENGINE'S: its label, range, the state it sets, what it
//   re-renders and its readout come from PainterlyNPR's controls config through
//   the engine host. AURA only chooses which to show, in which group
//   (AuraConfig__Engine__ParameterGroups), so the two apps never drift.
// - A slider moves the engine at once (the navigation preview for the sun,
//   a refine for the rest); the drawing set saves the settings after a pause.
// - Groups fold: a group's open or closed state is kept in this browser.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Dom__El, Na__Dom__Icon, Na__Dom__Clear, Na__Dom__Select } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__EngineHost__Control, Na__EngineHost__SetControl, Na__EngineHost__Choices, Na__EngineHost__SetChoice } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Parameters__FOLDS_KEY = 'ValeVisionAura__ParameterFolds';
    const Na__Parameters__State = { root: null, rows: [] };                     // <-- rows: { key, input, output, kind }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Folds Kept in This Browser
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read and Write the Open Groups
    // ------------------------------------------------------------
    function Na__Parameters__Folds() {
        try { return JSON.parse(window.localStorage.getItem(Na__Parameters__FOLDS_KEY) || '{}') || {}; }
        catch (error) { return {}; }
    }

    function Na__Parameters__SaveFold(key, open) {
        try {
            const folds = Na__Parameters__Folds();
            folds[key] = open;
            window.localStorage.setItem(Na__Parameters__FOLDS_KEY, JSON.stringify(folds));
        } catch (error) { /* private window: the folds are not remembered */ }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building the Panel
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | One Slider Row: label, range, readout
    // ------------------------------------------------------------
    function Na__Parameters__Slider(key) {
        const overrides = Object.assign({}, key === 'Discipline' ? Na__AppConfig__Get('Engine__Discipline', {}) : {});
        const label = Na__AppConfig__Get('Engine__LabelOverrides', {})[key];
        if (label) overrides.Label = label;
        const control = Na__EngineHost__Control(key, overrides);
        if (!control || control.Min === undefined || control.Max === undefined) return null;
        const row = Na__Dom__El('label', 'aura-param');
        row.appendChild(Na__Dom__El('span', 'aura-param__label', control.Label));
        const input = Na__Dom__El('input', 'aura-param__range', null, { type: 'range', min: control.Min, max: control.Max, step: control.Step || 0.01 });
        input.value = control.Value;
        const output = Na__Dom__El('output', 'aura-param__readout', control.Readout(control.Value));
        input.addEventListener('input', () => {
            const value = parseFloat(input.value);
            Na__EngineHost__SetControl(key, value);
            output.textContent = control.Readout(value);
        });
        row.appendChild(input);
        row.appendChild(output);
        Na__Parameters__State.rows.push({ key, input, output, kind: 'range', readout: control.Readout });
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Choice Row: the ink or the paper
    // ------------------------------------------------------------
    function Na__Parameters__Choice(key) {
        const choice = Na__EngineHost__Choices(key);
        if (!choice) return null;
        const row = Na__Dom__El('label', 'aura-param aura-param--choice');
        row.appendChild(Na__Dom__El('span', 'aura-param__label', choice.Label));
        const select = Na__Dom__Select(choice.Options, choice.Value, 'aura-select aura-param__select');
        select.addEventListener('change', () => Na__EngineHost__SetChoice(key, select.value));
        row.appendChild(select);
        Na__Parameters__State.rows.push({ key, input: select, kind: 'choice' });
        return row;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Parameters Panel Into a Container
    // ------------------------------------------------------------
    function Na__Parameters__Build(container) {
        Na__Parameters__State.root = container;
        Na__Parameters__State.rows = [];
        Na__Dom__Clear(container);
        const folds = Na__Parameters__Folds();
        Na__AppConfig__Get('Engine__ParameterGroups', []).forEach((group, index) => {
            const open = folds[group.Key] !== undefined ? !!folds[group.Key] : index < 2;
            const section = Na__Dom__El('section', `aura-fold${open ? ' is-open' : ''}`);
            const head = Na__Dom__El('button', 'aura-fold__head', null, { type: 'button', 'aria-expanded': String(open) });
            head.appendChild(Na__Dom__El('span', 'aura-fold__title', group.Label));
            head.appendChild(Na__Dom__Icon('down', 'aura-fold__chevron'));
            head.addEventListener('click', () => {
                const nowOpen = !section.classList.contains('is-open');
                section.classList.toggle('is-open', nowOpen);
                head.setAttribute('aria-expanded', String(nowOpen));
                Na__Parameters__SaveFold(group.Key, nowOpen);
            });
            const body = Na__Dom__El('div', 'aura-fold__body');
            (group.Selects || []).forEach((key) => { const row = Na__Parameters__Choice(key); if (row) body.appendChild(row); });
            (group.Controls || []).forEach((key) => { const row = Na__Parameters__Slider(key); if (row) body.appendChild(row); });
            section.appendChild(head);
            section.appendChild(body);
            container.appendChild(section);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Bring Every Row Back in Step With the Engine (after loading settings or a new seed)
    // ------------------------------------------------------------
    function Na__Parameters__Sync() {
        Na__Parameters__State.rows.forEach((row) => {
            if (row.kind === 'range') {
                const overrides = row.key === 'Discipline' ? Na__AppConfig__Get('Engine__Discipline', {}) : null;
                const control = Na__EngineHost__Control(row.key, overrides);
                if (!control) return;
                row.input.value = control.Value;
                row.output.textContent = control.Readout(control.Value);
            } else {
                const choice = Na__EngineHost__Choices(row.key);
                if (choice) row.input.value = choice.Value;
            }
        });
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
