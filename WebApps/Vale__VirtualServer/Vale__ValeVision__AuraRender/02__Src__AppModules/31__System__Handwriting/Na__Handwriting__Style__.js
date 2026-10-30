// =============================================================================
// VALEVISION AURA - HANDWRITING - THE WRITING STYLE AND THE PEN
// =============================================================================
//
// FILE       : Na__Handwriting__Style__.js
// NAMESPACE  : Na__HandwritingStyle
// MODULE     : Handwriting - Style
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A note's writing style (its hand, then whatever was changed in
//              its Advanced writing style) and its pen (a STAEDTLER Mars matic
//              700 nib, true in millimetres on the paper), and the panel parts
//              that set them
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE STYLE is every setting of the writing model and the studio's layout
//   (AuraConfig__Handwriting__StyleGroups; Adam, 30-Oct-2026: "exposing all of
//   the possible paramers for the writing model"). A setting is the note's
//   own value (Annotation__Style, only what was changed in it), else its
//   hand's (AuraConfig__Handwriting__Hands may set any key), else the
//   studio's default. Choosing a hand clears the note's own.
// - THE PEN is one of the four calibrated technical pens
//   (AuraConfig__Handwriting__Pens, the same set as PainterlyNPR's
//   Na__TechnicalPens__Config.json), the note's Annotation__PenKey, 0.18 mm
//   (M018, the lettering tier) unless chosen otherwise. The ink is written
//   with widths relative to the nib and the sheet applies the nib, so a new pen
//   redraws a note at once; its leader takes the same pen.
// - THE METRIC (Adam: "a new pen size metric calculated from the paper size so
//   we can figure out ACTUAL real pen sizes"): the sheet is drawn in paper
//   millimetres, so a pen's width is its printed width at 100% on the sheet's
//   own paper. The panel says so, what it measures if the sheet is printed on
//   a smaller paper (an A1 sheet printed on A3 halves every pen), and how wide
//   it shows on screen at the zoom now (under a pixel it shows paler than it
//   will print).
// - Pure browser code with no engine: runs on every device, written or not.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.1.0
// - A note's letters (AURA 0.4.9): Na__HandwritingStyle__Letters, 'Capitals'
//   (drawn architect's capitals, AuraConfig__Handwriting__DefaultLetters) or
//   'Joined' (the model's hand), and their choices for the panel.
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build (AURA 0.3.2). The hands moved here from the client, which
//   re-exports Na__Handwriting__Hand.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Dom__El, Na__Dom__Icon, Na__Dom__IconButton, Na__Dom__Field, Na__Dom__Select } from '../03__AppUtils/Na__AppUtils__Dom__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    const Na__HandwritingStyle__FOLDS_KEY  = 'ValeVisionAura__WritingStyleFolds';   // <-- Which folds are open, in this browser
    const Na__HandwritingStyle__SEED_MAX   = 2147483647;
    const Na__HandwritingStyle__FALLBACK   = { Key: 'M018', Tier: 1, Name: 'Minor features', Label: '0.18 mm', Pen: 'STAEDTLER Mars matic 700 M018', WidthMm: 0.18 };

    const Na__HandwritingStyle__State = {
        busy : 0                                 // <-- A slider held or a value being typed: the panel is not rebuilt under it
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hands, Settings and Pens
// -----------------------------------------------------------------------------

    // FUNCTION | A Hand ({ Key, Label, Neatness, Variation, and any style key })
    // ------------------------------------------------------------
    function Na__HandwritingStyle__Hand(key) {
        const hands = Na__AppConfig__Get('Handwriting__Hands', []);
        return hands.find((h) => h.Key === key) || hands[0] || { Key: 'Steady', Label: 'Steady hand', Neatness: 1.1, Variation: 0.3 };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Note's Letters ('Capitals' or 'Joined'), and the Choices ({ value, label })
    // ------------------------------------------------------------
    function Na__HandwritingStyle__LettersOptions() {
        return Na__AppConfig__Get('Handwriting__Letters', [{ Key: 'Capitals', Label: 'Architect\'s capitals' }, { Key: 'Joined', Label: 'Joined-up handwriting' }])
            .map((l) => ({ value: l.Key, label: l.Label }));
    }

    function Na__HandwritingStyle__Letters(annotation) {
        const keys = Na__HandwritingStyle__LettersOptions().map((o) => o.value);
        const own = annotation && annotation.Annotation__Letters;
        return keys.includes(own) ? own : Na__AppConfig__Get('Handwriting__DefaultLetters', 'Capitals');
    }
    // ------------------------------------------------------------


    // FUNCTION | The Style's Groups and Every Control in Them
    // ------------------------------------------------------------
    function Na__HandwritingStyle__Groups() {
        return Na__AppConfig__Get('Handwriting__StyleGroups', []);
    }

    function Na__HandwritingStyle__Controls() {
        const all = [];
        Na__HandwritingStyle__Groups().forEach((group) => (group.Controls || []).forEach((control) => all.push(control)));
        return all;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Value as a Control Takes It: in its range, one of its choices, or its default
    // ------------------------------------------------------------
    function Na__HandwritingStyle__Clean(control, value) {
        if (control.Kind === 'Choice') return (control.Options || []).some((o) => o.Value === value) ? value : control.Default;
        if (control.Kind === 'Toggle') return typeof value === 'boolean' ? value : control.Default !== false;
        const n = typeof value === 'boolean' || value === null || value === '' ? NaN : Number(value);
        if (!Number.isFinite(n)) return control.Default;
        return Math.min(control.Max, Math.max(control.Min, n));
    }
    // ------------------------------------------------------------


    // FUNCTION | A Setting Before the Note's Own: its hand's value, else the studio's default
    // ------------------------------------------------------------
    function Na__HandwritingStyle__Base(annotation, control) {
        const hand = Na__HandwritingStyle__Hand(annotation.Annotation__HandKey);
        return Na__HandwritingStyle__Clean(control, hand[control.Key] !== undefined ? hand[control.Key] : control.Default);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Note's Writing Style: { Neatness, Variation, LineSpacing, ... } (everything but the copy number)
    // ------------------------------------------------------------
    function Na__HandwritingStyle__Effective(annotation) {
        const own = annotation.Annotation__Style && typeof annotation.Annotation__Style === 'object' ? annotation.Annotation__Style : {};
        const style = {};
        Na__HandwritingStyle__Controls().forEach((control) => {
            if (control.Kind === 'Seed') return;
            style[control.Key] = own[control.Key] !== undefined ? Na__HandwritingStyle__Clean(control, own[control.Key]) : Na__HandwritingStyle__Base(annotation, control);
        });
        return style;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set One of the Note's Own Settings (one equal to the hand's is dropped: a note keeps only what differs)
    // ------------------------------------------------------------
    function Na__HandwritingStyle__SetOwn(annotation, control, value) {
        const own = Object.assign({}, annotation.Annotation__Style || {});
        const clean = Na__HandwritingStyle__Clean(control, value);
        if (clean === Na__HandwritingStyle__Base(annotation, control)) delete own[control.Key];
        else own[control.Key] = clean;
        annotation.Annotation__Style = Object.keys(own).length ? own : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Pens, and a Note's Pen ({ Key, Tier, Name, Label, Pen, WidthMm, Use })
    // ------------------------------------------------------------
    function Na__HandwritingStyle__Pens() {
        const pens = Na__AppConfig__Get('Handwriting__Pens', []);
        return pens.length ? pens : [Na__HandwritingStyle__FALLBACK];
    }

    function Na__HandwritingStyle__Pen(annotation) {
        const pens = Na__HandwritingStyle__Pens();
        const key = (annotation && annotation.Annotation__PenKey) || Na__AppConfig__Get('Handwriting__DefaultPen', 'M018');
        return pens.find((p) => p.Key === key) || pens.find((p) => p.Key === Na__AppConfig__Get('Handwriting__DefaultPen', 'M018')) || pens[0];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Pen's Real Size
// -----------------------------------------------------------------------------

    // FUNCTION | A Pen on a Sheet: { Paper, OnPaperMm, Printed: [{ Paper, Mm }], ScreenPx }
    // ------------------------------------------------------------
    // Printed: what the same line measures if the sheet is scaled to fit a
    // smaller paper (ISO A sizes keep their proportion, so the scale is one
    // long side over the other). ScreenPx: the line's width on screen now.
    // ------------------------------------------------------------
    function Na__HandwritingStyle__Metric(widthMm, sheet, pxPerMm) {
        const sizes = Na__AppConfig__Get('Sheet__PaperSizes', {});
        const paper = sheet && sizes[sheet.Sheet__PaperSize] ? sheet.Sheet__PaperSize : Na__AppConfig__Get('Sheet__DefaultPaperSize', 'A3');
        const long = (key) => Math.max(Number(sizes[key] && sizes[key].WidthMm) || 0, Number(sizes[key] && sizes[key].HeightMm) || 0);
        const own = long(paper);
        const printed = Object.keys(sizes)
            .filter((key) => own > 0 && long(key) > 0 && long(key) < own - 0.5)
            .sort((a, b) => long(b) - long(a))
            .map((key) => ({ Paper: key, Mm: widthMm * long(key) / own }));
        return { Paper: paper, OnPaperMm: widthMm, Printed: printed, ScreenPx: widthMm * (Number(pxPerMm) || 0) };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Metric in Words for the Panel
    // ------------------------------------------------------------
    function Na__HandwritingStyle__MetricText(pen, sheet, pxPerMm) {
        const m = Na__HandwritingStyle__Metric(pen.WidthMm, sheet, pxPerMm);
        const mm = (v) => (v >= 0.1 ? v.toFixed(2) : v.toFixed(3)).replace(/0$/, '');
        const words = [`${pen.Pen} (${pen.Name.toLowerCase()}): ${mm(m.OnPaperMm)} mm on the ${m.Paper} paper, its true width printed at 100%.`];
        if (m.Printed.length) {
            words.push(`Printed on ${m.Printed.map((p, i) => `${p.Paper}${i ? '' : ' it measures'} ${mm(p.Mm)} mm`).join(', on ')}.`);
        }
        if (m.ScreenPx > 0) {
            const px = m.ScreenPx < 1 ? m.ScreenPx.toFixed(2) : m.ScreenPx.toFixed(1);
            words.push(`On screen now ${px} px${m.ScreenPx < 1 ? ': under a pixel, so it shows paler than it prints' : ''}.`);
        }
        return words.join(' ');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Panel: the Pen, and the Advanced Writing Style
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Folds Remembered in This Browser
    // ------------------------------------------------------------
    function Na__HandwritingStyle__Folds() {
        try { return JSON.parse(window.localStorage.getItem(Na__HandwritingStyle__FOLDS_KEY) || '{}') || {}; }
        catch (error) { return {}; }
    }

    function Na__HandwritingStyle__SaveFold(key, open) {
        try {
            const folds = Na__HandwritingStyle__Folds();
            folds[key] = open;
            window.localStorage.setItem(Na__HandwritingStyle__FOLDS_KEY, JSON.stringify(folds));
        } catch (error) { /* <-- A private window: the folds are not remembered */ }
    }

    function Na__HandwritingStyle__Fold(key, label, openByDefault) {
        const folds = Na__HandwritingStyle__Folds();
        const open = folds[key] !== undefined ? !!folds[key] : !!openByDefault;
        const section = Na__Dom__El('section', `aura-fold${open ? ' is-open' : ''}`);
        const head = Na__Dom__El('button', 'aura-fold__head', null, { type: 'button', 'aria-expanded': String(open) });
        head.appendChild(Na__Dom__El('span', 'aura-fold__title', label));
        head.appendChild(Na__Dom__Icon('down', 'aura-fold__chevron'));
        head.addEventListener('click', () => {
            const nowOpen = !section.classList.contains('is-open');
            section.classList.toggle('is-open', nowOpen);
            head.setAttribute('aria-expanded', String(nowOpen));
            Na__HandwritingStyle__SaveFold(key, nowOpen);
        });
        const body = Na__Dom__El('div', 'aura-fold__body');
        section.appendChild(head);
        section.appendChild(body);
        return { section, body };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Readout's Words, and Typing Into One
    // ------------------------------------------------------------
    function Na__HandwritingStyle__Readout(control, value) {
        return `${control.Prefix || ''}${Number(value).toFixed(control.Digits === undefined ? 2 : control.Digits)}${control.Unit || ''}`;
    }

    function Na__HandwritingStyle__TypeIn(input, output, control) {
        if (output.hidden) return;
        const field = Na__Dom__El('input', 'aura-param__typein', null, { type: 'text', 'aria-label': `Type a value for ${control.Label}` });
        field.value = output.textContent;
        Na__HandwritingStyle__State.busy += 1;
        let done = false;
        const finish = (commit) => {
            if (done) return;
            done = true;
            Na__HandwritingStyle__State.busy = Math.max(0, Na__HandwritingStyle__State.busy - 1);
            const match = commit ? String(field.value).replace(/−/g, '-').replace(/,/g, '.').match(/[-+]?(?:\d+\.?\d*|\.\d+)/) : null;
            field.remove();
            output.hidden = false;
            if (!match) return;                                                  // <-- Nothing readable: the slider keeps its value
            input.value = String(parseFloat(match[0]));
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };
        field.addEventListener('keydown', (event) => {
            event.stopPropagation();                                             // <-- Typing never reaches the sheet's shortcuts
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


    // HELPER FUNCTION | One Control's Row: a slider with a typable readout, a choice, a tick box, or the copy number
    // ------------------------------------------------------------
    function Na__HandwritingStyle__Row(annotation, control, style, onChange, rows) {
        const title = control.Hint || '';
        if (control.Kind === 'Choice') {
            const row = Na__Dom__El('label', 'aura-param aura-param--choice', null, { title });
            row.appendChild(Na__Dom__El('span', 'aura-param__label', control.Label));
            const select = Na__Dom__Select((control.Options || []).map((o) => ({ value: o.Value, label: o.Label })), style[control.Key], 'aura-select aura-param__select');
            select.addEventListener('change', () => {
                Na__HandwritingStyle__SetOwn(annotation, control, select.value);
                rows.forEach((r) => r.sync && r.sync());
                onChange(true);
            });
            row.appendChild(select);
            return row;
        }
        if (control.Kind === 'Toggle') {
            const row = Na__Dom__El('label', 'aura-param aura-param--choice', null, { title });
            row.appendChild(Na__Dom__El('span', 'aura-param__label', control.Label));
            const box = Na__Dom__El('input', 'aura-param__select', null, { type: 'checkbox' });
            box.checked = !!style[control.Key];
            box.addEventListener('change', () => { Na__HandwritingStyle__SetOwn(annotation, control, box.checked); onChange(true); });
            row.appendChild(box);
            return row;
        }
        if (control.Kind === 'Seed') {
            const row = Na__Dom__El('label', 'aura-param aura-param--choice', null, { title });
            row.appendChild(Na__Dom__El('span', 'aura-param__label', control.Label));
            const number = Na__Dom__El('input', 'aura-input aura-param__select', null, { type: 'number', min: 0, max: Na__HandwritingStyle__SEED_MAX, step: 1 });
            number.value = String(Math.trunc(Number(annotation.Annotation__Seed) || 0));
            number.addEventListener('change', () => {
                const n = Math.trunc(Number(number.value));
                annotation.Annotation__Seed = Number.isFinite(n) ? Math.min(Na__HandwritingStyle__SEED_MAX, Math.max(0, n)) : 0;
                number.value = String(annotation.Annotation__Seed);
                onChange(true);
            });
            row.appendChild(number);
            return row;
        }

        const row = Na__Dom__El('label', 'aura-param', null, { title });
        row.appendChild(Na__Dom__El('span', 'aura-param__label', control.Label));
        const input = Na__Dom__El('input', 'aura-param__range', null, { type: 'range', min: control.Min, max: control.Max, step: control.Step || 0.01 });
        input.value = String(style[control.Key]);
        const output = Na__Dom__El('output', 'aura-param__readout', Na__HandwritingStyle__Readout(control, style[control.Key]), { tabindex: '0', title: 'Click to type a value' });
        input.addEventListener('pointerdown', () => { Na__HandwritingStyle__State.busy += 1; });
        const release = () => { Na__HandwritingStyle__State.busy = Math.max(0, Na__HandwritingStyle__State.busy - 1); };
        input.addEventListener('pointerup', release);
        input.addEventListener('pointercancel', release);
        input.addEventListener('input', () => {
            Na__HandwritingStyle__SetOwn(annotation, control, parseFloat(input.value));
            output.textContent = Na__HandwritingStyle__Readout(control, parseFloat(input.value));
        });
        input.addEventListener('change', () => {                                // <-- Written again once the slider is let go, not while it moves
            Na__HandwritingStyle__State.busy = 0;                                // <-- Let go, wherever the pointer was released
            onChange(true);
        });
        output.addEventListener('click', (event) => { event.preventDefault(); Na__HandwritingStyle__TypeIn(input, output, control); });   // <-- preventDefault: the label would hand the click to the slider
        output.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== 'F2') return;
            event.preventDefault();
            Na__HandwritingStyle__TypeIn(input, output, control);
        });
        row.appendChild(input);
        row.appendChild(output);
        if (control.Key === 'WeightSwing') {                                     // <-- Only a variable pen swings
            rows.push({ sync: () => { input.disabled = Na__HandwritingStyle__Effective(annotation).PenMode !== 'Variable'; } });
            input.disabled = style.PenMode !== 'Variable';
        }
        return row;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Pen Field and Its Metric: onChange(false) when the pen changes (a redraw, no rewrite)
    // ------------------------------------------------------------
    // sheet(): the sheet the note is on; pxPerMm(): the sheet's screen scale
    // now. The metric is read again whenever the pointer comes over it, so it
    // follows the zoom without the sheet having to say it zoomed.
    // ------------------------------------------------------------
    function Na__HandwritingStyle__BuildPen(container, annotation, sheet, pxPerMm, onChange) {
        const group = Na__Dom__El('div', 'aura-field');
        const pen = Na__HandwritingStyle__Pen(annotation);
        const select = Na__Dom__Select(Na__HandwritingStyle__Pens().map((p) => ({ value: p.Key, label: `${p.Label}  ${String(p.Pen).replace(/^STAEDTLER\s+/, '')}` })), pen.Key);
        group.appendChild(Na__Dom__Field('Pen', select));
        const metric = Na__Dom__El('p', 'aura-panel__note');
        const refresh = () => { metric.textContent = Na__HandwritingStyle__MetricText(Na__HandwritingStyle__Pen(annotation), sheet(), pxPerMm()); };
        refresh();
        group.appendChild(metric);
        group.addEventListener('pointerenter', refresh);
        select.addEventListener('change', () => {
            annotation.Annotation__PenKey = select.value;
            refresh();
            onChange(false);
        });
        container.appendChild(group);
        return group;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Advanced Writing Style Fold: onChange(true) when the note must be written again, (true, true) to rebuild the panel
    // ------------------------------------------------------------
    function Na__HandwritingStyle__BuildAdvanced(container, annotation, onChange) {
        const outer = Na__HandwritingStyle__Fold('Advanced', 'Advanced writing style', false);
        const style = Na__HandwritingStyle__Effective(annotation);
        const own = annotation.Annotation__Style ? Object.keys(annotation.Annotation__Style).length : 0;
        outer.body.appendChild(Na__Dom__El('p', 'aura-panel__hint',
            own ? `${own} setting${own === 1 ? '' : 's'} changed from the ${Na__HandwritingStyle__Hand(annotation.Annotation__HandKey).Label.toLowerCase()}. Hover a setting for what it does.`
                : `As the ${Na__HandwritingStyle__Hand(annotation.Annotation__HandKey).Label.toLowerCase()} writes. Changes here are this note's own. Hover a setting for what it does.`));
        const rows = [];
        Na__HandwritingStyle__Groups().forEach((group, index) => {
            const fold = Na__HandwritingStyle__Fold(`Group__${group.Key}`, group.Label, index === 0);
            (group.Controls || []).forEach((control) => fold.body.appendChild(Na__HandwritingStyle__Row(annotation, control, style, onChange, rows)));
            outer.body.appendChild(fold.section);
        });
        const reset = Na__Dom__IconButton('refresh', 'aura-button', 'Back to the hand', 'Clear this note\'s own settings: write it as its hand does');
        reset.disabled = !own;
        reset.addEventListener('click', () => { annotation.Annotation__Style = null; onChange(true, true); });
        outer.body.appendChild(reset);
        container.appendChild(outer.section);
        return outer.section;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Slider Held or a Value Being Typed? (the panel waits to rebuild)
    // ------------------------------------------------------------
    function Na__HandwritingStyle__Busy() {
        return Na__HandwritingStyle__State.busy > 0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__HandwritingStyle__Hand,
        Na__HandwritingStyle__Letters,
        Na__HandwritingStyle__LettersOptions,
        Na__HandwritingStyle__Groups,
        Na__HandwritingStyle__Controls,
        Na__HandwritingStyle__Effective,
        Na__HandwritingStyle__SetOwn,
        Na__HandwritingStyle__Pens,
        Na__HandwritingStyle__Pen,
        Na__HandwritingStyle__Metric,
        Na__HandwritingStyle__MetricText,
        Na__HandwritingStyle__BuildPen,
        Na__HandwritingStyle__BuildAdvanced,
        Na__HandwritingStyle__Busy
    };

// endregion -------------------------------------------------------------------
