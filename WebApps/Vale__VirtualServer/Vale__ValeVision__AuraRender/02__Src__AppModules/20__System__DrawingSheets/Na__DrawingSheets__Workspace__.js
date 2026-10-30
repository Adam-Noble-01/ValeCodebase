// =============================================================================
// VALEVISION AURA - DRAWING SHEETS - THE WORKSPACE
// =============================================================================
//
// FILE       : Na__DrawingSheets__Workspace__.js
// NAMESPACE  : Na__Workspace
// MODULE     : Drawing Sheets - Workspace
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A sheet tab's working space, laid out as ValeVision 3D's Layout
//              Editor: the sheet's panel on the left, the tools (select, note,
//              leader, adding views, zoom) over the sheet on its desk, and the
//              selection's panel on the right; both panels resizable
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE LEFT PANEL is the sheet itself, in folding sections: Sheet (name,
//   paper, orientation), Title block, Revisions.
// - THE RIGHT PANEL follows the selection, in folding sections: Viewport (its
//   settings), Art direction points (the selected viewport's, edited on its
//   picture: Na__Viewports__ArtDirection__) and Note (a note's words and hand).
//   A section with nothing selected for it says how to start.
// - Sections fold and the panels' inner edges drag them wider or narrower,
//   each remembered in this browser (Na__AppUtils__Panels__).
// - KEYS: Delete removes what is selected; Escape lets it go and returns to the
//   select tool; V, N and L pick the tools. Never while typing in a field.
// - NAVIGATION is ValeVision 3D's Layout Editor's (Na__DrawingSheets__Navigation__,
//   the PC and touchscreen controls, Na__Hotkeys__DrawingSheets__.json): the
//   wheel zooms about the cursor, a middle or right drag (or Space and a left
//   drag) pans, two fingers pinch and pan, one finger pans from the grey desk,
//   a double tap on the desk fits; F, 1, + and - zoom, Page Up and Page Down
//   turn the sheets.
// - ADD A VIEW: the four elevations and the roof plan to scale, the engine's
//   perspectives, the 3D Environment's own view, or a saved view.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.3.0 (AURA 0.5.0)
// - "Add a view" lists the drawing set's scenes first (a viewport shows a
//   scene, SketchUp to LayOut), then the new ones it can make.
//
// 30-Oct-2026 - Version 1.2.1 (AURA 0.3.3)
// - The sheet is the pictures' paper: Show hands the Surface the drawing set's
//   paper (the engine's bare paper), and again after the engine's settings
//   change while a sheet is on view.
//
// 30-Oct-2026 - Version 1.2.0 (AURA 0.3.0)
// - The Layout Editor's two panels (Adam: "I want the same two panel layout
//   with dropdown sections etc and 2x resizable panels"): the sheet's sections
//   on the left, the tools over the sheet, the selection's sections on the
//   right with the selected viewport's Art direction points.
//
// 30-Oct-2026 - Version 1.1.0 (AURA 0.1.3)
// - The sheet's navigation is the Layout Editor's: its controls attach to the
//   desk before the surface, the zoom buttons and Fit go through
//   Na__DrawingSheets__Navigation__, each sheet is fitted the first time it is
//   shown, and a press on the grey desk only lets the selection go.
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__On, Na__AppState__Set, Na__AppState__Select, Na__AppState__Touch, Na__AppState__ActiveSheet } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__El, Na__Dom__IconButton, Na__Dom__Clear, Na__Dom__Field, Na__Dom__Select } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__SheetScale, Na__Format__Date } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__Panels__Section, Na__Panels__Resizable } from '../03__AppUtils/Na__AppUtils__Panels__.js';
    import { Na__EngineHost__Presets, Na__EngineHost__OnChange } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__EnginePanel__Paper } from '../10__System__EngineHost/Na__EngineHost__Panel__.js';
    import { Na__Surface__Mount, Na__Surface__Render, Na__Surface__On, Na__Surface__RedrawLayer, Na__Surface__SetPaper } from './Na__DrawingSheets__Surface__.js';
    import { Na__SheetNav__ZoomBy, Na__SheetNav__Fit, Na__SheetNav__FitOnce } from './Na__DrawingSheets__Navigation__.js';
    import { Na__SheetPc__Attach } from './Na__DrawingSheets__Controls__Pc__.js';
    import { Na__SheetTouch__Attach } from './Na__DrawingSheets__Controls__TouchScreen__.js';
    import { Na__Tabs__Delete } from './Na__DrawingSheets__Tabs__.js';
    import { Na__ViewportEditor__Mount, Na__ViewportEditor__Add, Na__ViewportEditor__Remove, Na__ViewportEditor__Panel } from '../21__System__Viewports/Na__Viewports__Editor__.js';
    import { Na__RenderQueue__Clear, Na__RenderQueue__OnStatus } from '../21__System__Viewports/Na__Viewports__RenderQueue__.js';
    import { Na__ViewportPoints__Mount, Na__ViewportPoints__Panel, Na__ViewportPoints__SetOpen } from '../21__System__Viewports/Na__Viewports__ArtDirection__.js';
    import { Na__Annotations__Mount, Na__Annotations__OnPaper, Na__Annotations__Panel, Na__Annotations__Remove, Na__Annotations__RemoveBend } from '../30__System__Annotations/Na__Annotations__Layer__.js';
    import { Na__DrawingSet__Viewport, Na__DrawingSet__Annotation } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Workspace__State = {
        root    : null,
        panel   : null,                          // <-- The right panel: the selection's sections
        left    : null,                          // <-- The left panel: the sheet's sections
        status  : null,
        tools   : null,
        addView : null,
        onSheetChanged : null,                   // <-- The tabs redraw a renamed sheet
        paperTimer : 0                           // <-- A settings burst settling before the paper is made again
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Toolbar
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The "Add a view" Choices, Rebuilt as Scenes Come and Go
    // ------------------------------------------------------------
    // The drawing set's scenes first (SketchUp to LayOut: a viewport shows a
    // scene), then a new one: an elevation, the roof plan, a preset or the 3D
    // Environment's view now (an elevation or a preset already a scene is that
    // scene, not a copy).
    // ------------------------------------------------------------
    function Na__Workspace__AddViewOptions() {
        const doc = Na__AppState__Data.doc;
        const options = [{ value: '', label: 'Add a view...' }];
        ((doc && doc.AuraDrawingSet__SavedViews) || []).forEach((v) => options.push({ value: `Scene:${v.View__Id}`, label: `Scene: ${v.View__Name}` }));
        Na__AppConfig__Get('Viewport__Elevations', []).forEach((e) => options.push({ value: `Elevation:${e.Key}`, label: `New: ${e.Label}, to scale` }));
        options.push({ value: 'Plan:RoofPlan', label: 'New: Roof Plan, to scale' });
        Na__EngineHost__Presets(Na__AppConfig__Get('Engine__CameraPresets')).filter((p) => p.Mode !== 'Ortho')
            .forEach((p) => options.push({ value: `Preset:${p.Key}`, label: `New 3D: ${p.Label}` }));
        options.push({ value: 'Live:', label: 'New 3D: the 3D Environment\'s view now' });
        return options;
    }

    function Na__Workspace__RefreshAddView() {
        const holder = Na__Workspace__State.addView;
        if (!holder) return;
        const select = Na__Dom__Select(Na__Workspace__AddViewOptions(), '', 'aura-select aura-select--add');
        select.setAttribute('aria-label', 'Add a view to the sheet');
        select.addEventListener('change', () => {
            const [kind, key] = select.value.split(':');
            if (kind === 'Elevation') Na__ViewportEditor__Add({ kind: 'Elevation', side: key });
            else if (kind === 'Plan') Na__ViewportEditor__Add({ kind: 'Plan' });
            else if (kind === 'Preset') Na__ViewportEditor__Add({ kind: 'Perspective', preset: key });
            else if (kind === 'Scene') Na__ViewportEditor__Add({ sceneId: key });
            else if (kind === 'Live') Na__ViewportEditor__Add({ kind: 'Perspective', live: true });
            Na__Workspace__RefreshAddView();
            Na__Workspace__RenderPanel();
        });
        Na__Dom__Clear(holder);
        holder.appendChild(select);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Light the Tool in Use
    // ------------------------------------------------------------
    function Na__Workspace__MarkTool() {
        const tools = Na__Workspace__State.tools;
        if (!tools) return;
        tools.querySelectorAll('[data-tool]').forEach((b) => {
            const on = b.dataset.tool === Na__AppState__Data.tool;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', String(on));
        });
        const desk = Na__Workspace__State.root && Na__Workspace__State.root.querySelector('[data-sheet-desk]');
        if (desk) desk.dataset.tool = Na__AppState__Data.tool;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Toolbar
    // ------------------------------------------------------------
    function Na__Workspace__BuildToolbar(bar) {
        Na__Dom__Clear(bar);
        const tools = Na__Dom__El('div', 'aura-segmented', null, { role: 'group', 'aria-label': 'Tools' });
        [['select', 'pointer', 'Select', 'Select, move and resize (V)'],
         ['note', 'note', 'Note', 'Place a handwritten note: press where it goes (N)'],
         ['leader', 'leader', 'Leader', 'Place a leader note: press on what it points at, drag to where the words go (L)']].forEach(([tool, icon, label, title]) => {
            const b = Na__Dom__IconButton(icon, 'aura-segmented__item', label, title);
            b.dataset.tool = tool;
            b.addEventListener('click', () => Na__AppState__Set({ tool }));
            tools.appendChild(b);
        });
        bar.appendChild(tools);
        Na__Workspace__State.tools = tools;

        Na__Workspace__State.addView = Na__Dom__El('div', 'aura-toolbar__add');
        bar.appendChild(Na__Workspace__State.addView);
        Na__Workspace__RefreshAddView();

        const zoom = Na__Dom__El('div', 'aura-toolbar__zoom');
        const out = Na__Dom__IconButton('zoomOut', 'aura-icon-button', null, 'Zoom out (-). The wheel zooms about the pointer; a middle or right drag pans');
        out.addEventListener('click', () => Na__SheetNav__ZoomBy(1 / 1.25));
        const fit = Na__Dom__IconButton('fit', 'aura-icon-button', null, 'Fit the sheet (F)');
        fit.addEventListener('click', () => Na__SheetNav__Fit());
        const inn = Na__Dom__IconButton('zoomIn', 'aura-icon-button', null, 'Zoom in (+)');
        inn.addEventListener('click', () => Na__SheetNav__ZoomBy(1.25));
        zoom.appendChild(out); zoom.appendChild(fit); zoom.appendChild(inn);
        bar.appendChild(zoom);

        Na__Workspace__State.status = Na__Dom__El('span', 'aura-toolbar__status', '', { role: 'status', 'aria-live': 'polite' });
        bar.appendChild(Na__Workspace__State.status);
        Na__Workspace__MarkTool();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Sheet Panel
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | One Title Block Field
    // ------------------------------------------------------------
    function Na__Workspace__FieldInput(sheet, key, label, options) {
        const o = options || {};
        const input = Na__Dom__El(o.multiline ? 'textarea' : 'input', 'aura-input', null, o.multiline ? { rows: 3, maxlength: 240 } : { type: 'text', maxlength: 120, placeholder: o.placeholder || '' });
        input.value = sheet.Sheet__Fields[key] || '';
        input.addEventListener('input', () => {
            sheet.Sheet__Fields[key] = input.value;
            Na__AppState__Touch('sheet', sheet.Sheet__Id);
            Na__Surface__Render(sheet);
        });
        return Na__Dom__Field(label, input);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Sheet Itself, in the Left Panel: Sheet, Title block, Revisions
    // ------------------------------------------------------------
    function Na__Workspace__SheetPanel(container, sheet) {
        const changed = (rerender) => {
            Na__AppState__Touch('sheet', sheet.Sheet__Id);
            if (rerender) Na__Surface__Render(sheet);
            if (Na__Workspace__State.onSheetChanged) Na__Workspace__State.onSheetChanged(sheet);
        };

        const main = Na__Panels__Section(container, { id: 'sheet-sheet', title: 'Sheet' });
        const name = Na__Dom__El('input', 'aura-input', null, { type: 'text', maxlength: 80 });
        name.value = sheet.Sheet__Name;
        name.addEventListener('input', () => { sheet.Sheet__Name = name.value || 'Sheet'; changed(false); });
        main.body.appendChild(Na__Dom__Field('Name', name));

        const paperRow = Na__Dom__El('div', 'aura-field-pair');
        const sizes = Object.keys(Na__AppConfig__Get('Sheet__PaperSizes', {})).map((k) => ({ value: k, label: k }));
        const size = Na__Dom__Select(sizes, sheet.Sheet__PaperSize);
        size.addEventListener('change', () => { sheet.Sheet__PaperSize = size.value; changed(true); Na__SheetNav__Fit(); });
        const turn = Na__Dom__Select([{ value: 'landscape', label: 'Landscape' }, { value: 'portrait', label: 'Portrait' }], sheet.Sheet__Orientation);
        turn.addEventListener('change', () => { sheet.Sheet__Orientation = turn.value; changed(true); Na__SheetNav__Fit(); });
        paperRow.appendChild(Na__Dom__Field('Paper', size));
        paperRow.appendChild(Na__Dom__Field('Orientation', turn));
        main.body.appendChild(paperRow);
        const remove = Na__Dom__IconButton('trash', 'aura-button aura-button--danger', 'Delete sheet');
        remove.addEventListener('click', () => Na__Tabs__Delete(sheet));
        main.body.appendChild(remove);

        const block = Na__Panels__Section(container, { id: 'sheet-title', title: 'Title block' });
        block.body.appendChild(Na__Workspace__FieldInput(sheet, 'Client', 'Client'));
        block.body.appendChild(Na__Workspace__FieldInput(sheet, 'Address', 'Address', { multiline: true }));
        block.body.appendChild(Na__Workspace__FieldInput(sheet, 'Title', 'Title'));
        const auto = Na__Format__SheetScale((sheet.Sheet__Viewports || []).map((v) => v.Viewport__ScaleDenominator), sheet.Sheet__PaperSize);
        block.body.appendChild(Na__Workspace__FieldInput(sheet, 'Scale', 'Scale', { placeholder: `${auto} (from the views)` }));
        const pair1 = Na__Dom__El('div', 'aura-field-pair');
        pair1.appendChild(Na__Workspace__FieldInput(sheet, 'Date', 'Date', { placeholder: Na__Format__Date() }));
        pair1.appendChild(Na__Workspace__FieldInput(sheet, 'DrawingNo', 'Drawing No.'));
        block.body.appendChild(pair1);
        const pair2 = Na__Dom__El('div', 'aura-field-pair');
        pair2.appendChild(Na__Workspace__FieldInput(sheet, 'DrawnBy', 'Drawn by'));
        pair2.appendChild(Na__Workspace__FieldInput(sheet, 'CheckedBy', 'Checked by'));
        block.body.appendChild(pair2);

        // Revisions: the newest last, as the title block lists them
        const revs = Na__Panels__Section(container, { id: 'sheet-revisions', title: 'Revisions' });
        const count = (sheet.Sheet__Fields.Revisions || []).length;
        revs.meta.textContent = count ? String(count) : '';
        const list = Na__Dom__El('div', 'aura-revisions');
        (sheet.Sheet__Fields.Revisions || []).forEach((rev, i) => {
            const row = Na__Dom__El('div', 'aura-revisions__row');
            ['Rev', 'Date', 'Details'].forEach((key) => {
                const input = Na__Dom__El('input', `aura-input aura-input--${key.toLowerCase()}`, null, { type: 'text', maxlength: key === 'Details' ? 60 : 12, 'aria-label': key });
                input.value = rev[key] || '';
                input.addEventListener('input', () => { rev[key] = input.value; Na__AppState__Touch('sheet', sheet.Sheet__Id); Na__Surface__Render(sheet); });
                row.appendChild(input);
            });
            const drop = Na__Dom__IconButton('close', 'aura-icon-button aura-icon-button--quiet', null, 'Remove this revision');
            drop.addEventListener('click', () => { sheet.Sheet__Fields.Revisions.splice(i, 1); changed(true); Na__Workspace__RenderSheetPanel(); });
            row.appendChild(drop);
            list.appendChild(row);
        });
        revs.body.appendChild(list);
        const add = Na__Dom__IconButton('plus', 'aura-button', 'Add revision');
        add.addEventListener('click', () => {
            const all = sheet.Sheet__Fields.Revisions;
            all.push({ Rev: String.fromCharCode(65 + Math.min(25, all.length)), Date: Na__Format__Date(), Details: '' });
            changed(true);
            Na__Workspace__RenderSheetPanel();
        });
        revs.body.appendChild(add);
    }

    // The left panel drawn again (a new sheet, a revision added or removed)
    function Na__Workspace__RenderSheetPanel() {
        const left = Na__Workspace__State.left;
        const sheet = Na__AppState__ActiveSheet();
        if (!left) return;
        Na__Dom__Clear(left);
        if (sheet) Na__Workspace__SheetPanel(left, sheet);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Right Panel for What Is Selected: Viewport, Art direction points, Note
    // ------------------------------------------------------------
    // Each section always there, folded or open as left; one with nothing
    // selected for it says how to start. The Art direction points section of a
    // selected viewport lends it the engine while it is open.
    // ------------------------------------------------------------
    function Na__Workspace__RenderPanel(focusWords) {
        const panel = Na__Workspace__State.panel;
        const sheet = Na__AppState__ActiveSheet();
        if (!panel) return;
        Na__Dom__Clear(panel);
        if (!sheet) return;
        const sel = Na__AppState__Data.selection;
        const viewport = sel && sel.kind === 'viewport' ? Na__DrawingSet__Viewport(sheet, sel.id) : null;
        const annotation = sel && sel.kind === 'annotation' ? Na__DrawingSet__Annotation(sheet, sel.id) : null;

        const vp = Na__Panels__Section(panel, { id: 'sheet-viewport', title: 'Viewport' });
        if (viewport) Na__ViewportEditor__Panel(vp.body, viewport);
        else vp.body.appendChild(Na__Dom__El('p', 'aura-panel__hint', 'Select a viewport on the sheet, or add one with Add a view over the sheet.'));

        const points = Na__Panels__Section(panel, { id: 'sheet-points', title: 'Art direction points', onToggle: (open) => Na__ViewportPoints__SetOpen(open, viewport) });
        if (viewport) Na__ViewportPoints__Panel(points, viewport);
        else points.body.appendChild(Na__Dom__El('p', 'aura-panel__hint', 'Select a viewport to edit its art direction points on its picture. A 3D view of a saved view shares the points the 3D Environment gives that view.'));

        const note = Na__Panels__Section(panel, { id: 'sheet-note', title: 'Note' });
        if (annotation) Na__Annotations__Panel(note.body, annotation, focusWords === true);
        else note.body.appendChild(Na__Dom__El('p', 'aura-panel__hint', 'Select a note, or place one with Note (N) or Leader (L).'));
        if (annotation && !note.IsOpen()) note.SetOpen(true);                    // <-- A note just placed is written straight away
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keys
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Delete, Escape and the Tool Keys, Never While Typing
    // ------------------------------------------------------------
    function Na__Workspace__OnKey(e) {
        if (Na__AppState__Data.tab === 'environment') return;
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement && document.activeElement.tagName) || '') || (document.activeElement && document.activeElement.isContentEditable);
        if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
        const sheet = Na__AppState__ActiveSheet();
        const sel = Na__AppState__Data.selection;
        if ((e.key === 'Delete' || e.key === 'Backspace') && sheet && sel) {
            if (sel.kind === 'viewport') Na__ViewportEditor__Remove(Na__DrawingSet__Viewport(sheet, sel.id));
            else {
                const annotation = Na__DrawingSet__Annotation(sheet, sel.id);
                if (!Na__Annotations__RemoveBend(annotation)) Na__Annotations__Remove(annotation);   // <-- A selected bend point goes first, the note only when none is
            }
            e.preventDefault();
        } else if (e.key === 'Escape') {
            Na__AppState__Select(null);
            Na__AppState__Set({ tool: 'select' });
        } else if (e.key === 'v' || e.key === 'V') Na__AppState__Set({ tool: 'select' });
        else if (e.key === 'n' || e.key === 'N') Na__AppState__Set({ tool: 'note' });
        else if (e.key === 'l' || e.key === 'L') Na__AppState__Set({ tool: 'leader' });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount and Show
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Two Panels' Grips (the tab's grid reads their widths)
    // ------------------------------------------------------------
    function Na__Workspace__WireGrips(root) {
        const w = Na__AppConfig__Get('Panels__WidthPx', {});
        [['left', '--aura-sheet-left-width', 'sheet', w.SheetLeft || 280], ['right', '--aura-sheet-right-width', 'selection', w.SheetRight || 320]].forEach(([side, cssVar, label, initial]) => {
            const grip = root.querySelector(`[data-sheet-grip="${side}"]`);
            const column = grip && grip.closest('.aura-column');
            if (!grip || !column) return;
            Na__Panels__Resizable({ grip, panel: column, host: root, cssVar, side, id: `sheet-${side}`, label, min: w.Min || 240, max: w.Max || 640, initial });
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Workspace in Its Skeleton (index.html), Once
    // ------------------------------------------------------------
    function Na__Workspace__Mount(root, onSheetChanged) {
        const S = Na__Workspace__State;
        S.root = root;
        S.panel = root.querySelector('[data-sheet-panel]');
        S.left = root.querySelector('[data-sheet-left]');
        S.onSheetChanged = onSheetChanged || null;
        Na__Workspace__BuildToolbar(root.querySelector('[data-sheet-toolbar]'));
        Na__Workspace__WireGrips(root);
        const desk = root.querySelector('[data-sheet-desk]');
        Na__SheetPc__Attach(desk);                                               // <-- Before the surface: a pan is claimed before a tool sees the press
        Na__SheetTouch__Attach(desk);
        Na__Surface__Mount(desk);
        Na__ViewportEditor__Mount();
        Na__ViewportPoints__Mount();
        Na__Annotations__Mount((focusWords) => Na__Workspace__RenderPanel(focusWords));
        Na__Surface__On('paper', (event, mm) => {
            if (Na__AppState__Data.tool === 'select') { Na__AppState__Select(null); return null; }
            return Na__Annotations__OnPaper(event, mm);
        });
        Na__Surface__On('desk', () => Na__AppState__Select(null));               // <-- The grey round the paper: nothing to place there
        Na__RenderQueue__OnStatus((text) => { if (S.status) S.status.textContent = text; });
        Na__AppState__On('select', () => Na__Workspace__RenderPanel());
        Na__AppState__On('tool', () => Na__Workspace__MarkTool());
        Na__AppState__On('changed', (detail) => { if (detail && detail.reason === 'views') Na__Workspace__RefreshAddView(); });
        document.addEventListener('keydown', Na__Workspace__OnKey);
        S.panel.addEventListener('aura-panel-refresh', () => { Na__Workspace__RefreshAddView(); Na__Workspace__RenderPanel(); });
        Na__EngineHost__OnChange(() => {                                        // <-- The paper changed under a sheet on view (an undo, say): once a burst has settled
            if (Na__AppState__Data.tab === 'environment') return;               // <-- The 3D tab's sliders: the sheet takes its paper when it is opened
            clearTimeout(S.paperTimer);
            S.paperTimer = setTimeout(() => Na__EnginePanel__Paper(Na__Surface__SetPaper), 150);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Show a Sheet (the tab was opened)
    // ------------------------------------------------------------
    function Na__Workspace__Show(sheet) {
        Na__RenderQueue__Clear();                                                // <-- Another sheet's pictures no longer wait
        Na__AppState__Select(null);
        Na__Surface__Render(sheet);
        Na__EnginePanel__Paper(Na__Surface__SetPaper);                           // <-- The pictures' own paper (0.3.3): at once when known, else once its tile is made
        if (sheet) requestAnimationFrame(() => Na__SheetNav__FitOnce(sheet.Sheet__Id));   // <-- The desk has its size once shown
        Na__Workspace__RefreshAddView();
        Na__Workspace__RenderSheetPanel();
        Na__Workspace__RenderPanel();
        Na__Workspace__MarkTool();
    }

    function Na__Workspace__Redraw() {
        const sheet = Na__AppState__ActiveSheet();
        if (sheet) Na__Surface__RedrawLayer('viewports');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Workspace__Mount,
        Na__Workspace__Show,
        Na__Workspace__Redraw,
        Na__Workspace__RenderPanel
    };

// endregion -------------------------------------------------------------------
