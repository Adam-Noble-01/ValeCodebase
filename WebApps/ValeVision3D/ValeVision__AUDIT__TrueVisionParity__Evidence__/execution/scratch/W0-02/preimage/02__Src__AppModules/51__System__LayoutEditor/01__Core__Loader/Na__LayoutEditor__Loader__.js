// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - LOADER
// =============================================================================
//
// FILE       : Na__LayoutEditor__Loader__.js
// NAMESPACE  : Na__LeLoad
// MODULE     : Layout Editor - Loader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Keep the Layout Editor off the start-up path: decide when it is offered, and load it the first time it is used
// CREATED    : 15-Sep-2026
//
// DESCRIPTION:
// - THE ONLY LAYOUT EDITOR MODULE THE PAGE IMPORTS. index.html used to import
//   the mode controller, the tab strip and the Dev section, and through them
//   the whole editor: 73 modules (1.9 MB) and three stylesheets on every
//   start-up, for every project, drawings or not.
// - OFFERED when the project's Layout Mode switch is on AND it has at least
//   one sheet, on localhost and on the live site alike. This module answers
//   that from the raw drawings block, before the editor exists, and imports
//   the tab strip the first time the answer is yes. A project without
//   drawings never fetches it.
// - LOADED the first time something needs the editor itself: a sheet tab, the
//   plus tab, a tab rename or drag, or a Dev section action. The full-screen
//   loading screen covers the wait while the modules, the three stylesheets
//   and the editor's configs arrive; then the mode controller is initialised
//   with the render context index.html used to hand it directly.
// - THE FACADE. The tab strip and the Dev section reach the editor only
//   through this module. Before the load they get answers read from the raw
//   block (the sheets, the switch, nothing open, nothing unsaved) and every
//   action loads first; after it, every call goes straight to the real
//   module, so neither UI needs to know which side of the load it is on.
// - A LATE START. The drawings block arrived while the page started; the
//   editor arrives later. Once it has initialised, the sheet model's project
//   load is announced once more, so auto save, history and the spec links
//   take the start they would have had.
// - A drawing rename that has to re-stamp a baked 3D snapshot loads the
//   editor quietly (no screen), because only the editor computes the stamp.
//
// INTEGRATION:
// - index.html calls Na__LeLoad__Initialize with the render context.
// - Na__LayoutEditor__TabStrip__ and Na__LayoutEditor__DevMenu__Controls__
//   import the facade; Na__DrawView__RenameDrawing__ imports the re-stamp.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : none
// - Ported on     : 15-Sep-2026 for ValeVision3D v2.45.0
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : candidate. TrueVision's Index.html still imports the editor at start-up.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Sep-2026 - Version 1.1.0
// - Short tab names, ported from TrueVision3D v2.70.0. GetTabLabel, GetShortCode
//   and GetDrawingNumber on the facade, composed from the dependency-free
//   Na__LayoutEditor__DrawingCode__ leaf rather than from the editor, because
//   the tab strip and the Dev menu name sheets before the editor is loaded - a
//   tab that gained its code only once the bundle arrived would rename itself
//   under the reader. SheetViews carries each record's Sheet__Fields for the
//   same reason (read only, for the drawing number).
// - The pre-load default name follows the config to "New Drawing".
//
// 15-Sep-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Drawings Block, the Authoring Gate and the Loading Screen
    // ------------------------------------------------------------
    // All three are on the start-up path already or belong to the loader. An
    // import added here that reaches into the editor puts the whole editor
    // back on every start-up: editor modules are only ever import()ed below.
    // ------------------------------------------------------------
    import {
        Na__DrawData__CHANGED_EVENT,
        Na__DrawData__GetSheetsArray,
        Na__DrawData__GetLayoutModeEnabled,
        Na__DrawData__SetLayoutModeEnabled,
        Na__DrawData__Save
    } from '../../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    import { Na__DevGate__IsAuthoringEnabled } from '../../03__AppUtils/Na__AppUtils__DevGate__.js';
    import { Na__LeCode__StoredNumber, Na__LeCode__ShortCode, Na__LeCode__Compose } from '../07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js';   // <-- A leaf with no imports of its own: the tab code rules, without pulling the editor in
    import {
        Na__LeLoadScreen__Show,
        Na__LeLoadScreen__SetStatus,
        Na__LeLoadScreen__Hide,
        Na__LeLoadScreen__ShowError
    } from './Na__LayoutEditor__LoadingScreen__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Event Names and Views the Tab Strip and Dev Section Use
    // ------------------------------------------------------------
    // Copies of the names the editor's modules declare, so both UIs can listen
    // before those modules exist. Compared with the real constants the moment
    // the editor loads; a mismatch is reported in the console.
    // ------------------------------------------------------------
    const Na__LeLoad__SHEETS_EVENT = 'na-layouteditor-sheets-changed';        // <-- Na__LeModel__CHANGED_EVENT
    const Na__LeLoad__MODE_EVENT   = 'na-layouteditor-mode-changed';          // <-- Na__LeMode__CHANGED_EVENT
    const Na__LeLoad__SPEC_EVENT   = 'na-layouteditor-spec-changed';          // <-- Na__LeSpec__CHANGED_EVENT
    const Na__LeLoad__VIEW_SHEET   = 'sheet';                                 // <-- Na__LeMode__VIEW_SHEET
    const Na__LeLoad__VIEW_SPEC    = 'spec';                                  // <-- Na__LeMode__VIEW_SPEC
    const Na__LeLoad__STATE_EVENT  = 'na-layouteditor-loader-changed';        // <-- This module: a project loaded or saved, Layout Mode switched, the editor loaded
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Stylesheets That Load With the Editor
    // ------------------------------------------------------------
    // Linked in this order, which is the cascade order the rules were written
    // in: a sheet split in two keeps its halves next to each other.
    // ------------------------------------------------------------
    const Na__LeLoad__STYLESHEETS = [
        new URL('../10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css', import.meta.url).href,   // <-- FIRST: the ground, paper and shadow tokens every sheet below reads
        new URL('../10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css', import.meta.url).href,
        new URL('../10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css', import.meta.url).href,
        new URL('../40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css', import.meta.url).href,
        new URL('../50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css', import.meta.url).href,
        new URL('../50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Notes__.css', import.meta.url).href,
        new URL('../50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Read__.css', import.meta.url).href,
        new URL('../80__Feature__WebViewer/Na__LayoutEditor__Styles__WebViewer__.css', import.meta.url).href   // <-- LAST: it reshapes the shell and the specification page for the read-only web viewer
    ];
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Main Config Block, Dev Section Ids, Record Fallbacks and Wording
    // ------------------------------------------------------------
    const Na__LeLoad__MAIN_BLOCK       = 'LayoutEditor__Config';               // <-- Na__AppConfig__Main.json: the web read-only flag
    const Na__LeLoad__DEV_ITEM_ID      = 'naLayoutEditorDevItem';              // <-- index.html
    const Na__LeLoad__DEV_TOGGLE_ID    = 'naLayoutEditorDevToggle';
    const Na__LeLoad__NAME_FORMAT      = 'New Drawing';                        // <-- The config's DefaultNameFormat, for a record without a name
    const Na__LeLoad__PAPER_SIZE       = 'A3';                                 // <-- The config's DefaultPaperSize, for a record without one
    const Na__LeLoad__STATUS_FILES     = 'Fetching the drawing tools';
    const Na__LeLoad__STATUS_SETTINGS  = 'Reading the drawing settings';
    const Na__LeLoad__STATUS_DRAWING   = 'Drawing the Views';                    // <-- A real count is appended: "Drawing the Views  -  1 of 2"
    const Na__LeLoad__MSG_SWITCHED_OFF = 'The Layout Editor is switched off in its config.';
    const Na__LeLoad__MSG_DEV_FAILED   = 'The Layout Editor Dev section could not load. The console has the reason.';
    // ------------------------------------------------------------

    // MODULE VARIABLES | Context, the Loaded Editor and the Imports in Flight
    // ------------------------------------------------------------
    let Na__LeLoad__Context    = null;    // <-- The render context from index.html, handed to the mode controller on load
    let Na__LeLoad__Editor     = null;    // <-- { mode, model, spec, config, viewport3d, pdf } once loaded
    let Na__LeLoad__Loading    = null;    // <-- The load in flight, shared by every caller meanwhile
    let Na__LeLoad__Disabled   = false;   // <-- The editor's own config has it off (known only after a load)
    let Na__LeLoad__TabsImport = null;    // <-- The tab strip import, started the first time the editor is offered
    let Na__LeLoad__DevImport  = null;    // <-- The Dev section import, started the first time the section is opened
    let Na__LeLoad__Offered    = null;    // <-- The last announced answer to IsAvailable
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Before the Editor Exists
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Sheet Records as the Project Supplied Them
    // ------------------------------------------------------------
    function Na__LeLoad__RawRecords() {
        const records = Na__DrawData__GetSheetsArray();
        return Array.isArray(records)
            ? records.filter((record) => record && typeof record === 'object' && typeof record.Sheet__Id === 'string')
            : [];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read-Only Views of the Sheets, Ordered as the Sheet Model Orders Them
    // ------------------------------------------------------------
    // The records are not normalised here. That needs the editor's config, and
    // writing defaults into them before it has loaded would change what the
    // next save writes. A view carries what the tab strip and the Dev list
    // show, with the sheet model's own fallbacks where a field is missing.
    // ------------------------------------------------------------
    function Na__LeLoad__SheetViews() {
        return Na__LeLoad__RawRecords().map((record, index) => ({
            Sheet__Id        : record.Sheet__Id,
            Sheet__Name      : (typeof record.Sheet__Name === 'string' && record.Sheet__Name) ? record.Sheet__Name : Na__LeLoad__NAME_FORMAT.split('{index}').join(String(index + 1)),
            Sheet__Order     : (typeof record.Sheet__Order === 'number' && Number.isFinite(record.Sheet__Order)) ? record.Sheet__Order : index + 1,
            Sheet__PaperSize : (typeof record.Sheet__PaperSize === 'string' && record.Sheet__PaperSize) ? record.Sheet__PaperSize : Na__LeLoad__PAPER_SIZE,
            Sheet__Fields    : (record.Sheet__Fields && typeof record.Sheet__Fields === 'object') ? record.Sheet__Fields : {},   // <-- Read only, and only for the tab's drawing code: a tab must not change when the editor finishes loading
            Sheet__Viewports : Array.isArray(record.Sheet__Viewports) ? record.Sheet__Viewports : []
        })).sort((a, b) => a.Sheet__Order - b.Sheet__Order);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Web Read-Only Flag, Read as the Config Module Reads It
    // ------------------------------------------------------------
    function Na__LeLoad__IsReadOnlyOnWeb() {
        const config = Na__LeLoad__Context ? Na__LeLoad__Context.appConfig : null;
        const main   = (config && typeof config === 'object') ? config[Na__LeLoad__MAIN_BLOCK] : null;
        return !main || main['LayoutEditor__Config__ReadOnlyOnWeb'] !== false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Does a Sheet Viewport Hold a Baked Snapshot of This Scene?
    // ------------------------------------------------------------
    // The same test Na__LeVp3d__RestampForScene applies before it re-stamps.
    // ------------------------------------------------------------
    function Na__LeLoad__HasBakedSnapshotOf(sceneId) {
        return Na__LeLoad__RawRecords().some((sheet) => Array.isArray(sheet.Sheet__Viewports) && sheet.Sheet__Viewports.some((viewport) => {
            const slot = viewport ? viewport.Viewport__SnapshotAsset : null;
            return !!(viewport && viewport.Viewport__SceneId === sceneId && slot && slot.Asset__Path && slot.Asset__Fingerprint);
        }));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Toast Through the App
    // ------------------------------------------------------------
    function Na__LeLoad__Toast(message, isError) {
        const toast = Na__LeLoad__Context ? Na__LeLoad__Context.showToast : null;
        if (typeof toast === 'function') toast(message, isError === true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Import the Editor's Entry Modules
    // ------------------------------------------------------------
    // The mode controller brings the rest of the editor with it. The other five
    // are already in its graph; they are named here for the facade to call.
    // Literal specifiers, so the module graph harness walks the editor too.
    // ------------------------------------------------------------
    function Na__LeLoad__ImportEditor() {
        return Promise.all([
            import('../05__Core__ModeController/Na__LayoutEditor__ModeController__.js'),
            import('../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js'),
            import('../50__Feature__Specification/Na__LayoutEditor__SpecData__.js'),
            import('../03__Core__Config/Na__LayoutEditor__ConfigState__.js'),
            import('../20__System__Viewports/Na__LayoutEditor__Viewport3d__.js'),
            import('../60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js')
        ]).then(([mode, model, spec, config, viewport3d, pdf]) => ({ mode, model, spec, config, viewport3d, pdf }));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Link the Editor's Stylesheets and Wait for Them
    // ------------------------------------------------------------
    // Linked at the end of the head. Their selectors are the editor's own
    // (na-le- classes and body.na-layout-editor--active), so landing after the
    // page's other sheets changes no other rule. A sheet that fails is
    // reported and not waited on: an unstyled editor is still an editor.
    // ------------------------------------------------------------
    function Na__LeLoad__LinkStylesheets() {
        return Promise.all(Na__LeLoad__STYLESHEETS.map((href) => new Promise((resolve) => {
            if (document.querySelector('link[data-na-le-stylesheet="' + href + '"]')) { resolve(); return; }
            const link = document.createElement('link');
            link.rel  = 'stylesheet';
            link.href = href;
            link.setAttribute('data-na-le-stylesheet', href);
            link.addEventListener('load', () => resolve(), { once : true });
            link.addEventListener('error', () => {
                console.warn('[ValeVision3D] Layout Editor stylesheet failed to load: ' + href);
                resolve();
            }, { once : true });
            document.head.appendChild(link);
        })));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Check the Name Copies Against the Editor's Own
    // ------------------------------------------------------------
    function Na__LeLoad__CheckNames(editor) {
        [
            [ Na__LeLoad__SHEETS_EVENT, editor.model.Na__LeModel__CHANGED_EVENT, 'the sheet model change event'   ],
            [ Na__LeLoad__MODE_EVENT,   editor.mode.Na__LeMode__CHANGED_EVENT,   'the mode change event'          ],
            [ Na__LeLoad__SPEC_EVENT,   editor.spec.Na__LeSpec__CHANGED_EVENT,   'the specification change event' ],
            [ Na__LeLoad__VIEW_SHEET,   editor.mode.Na__LeMode__VIEW_SHEET,      'the sheet view name'            ],
            [ Na__LeLoad__VIEW_SPEC,    editor.mode.Na__LeMode__VIEW_SPEC,       'the specification view name'    ]
        ].forEach(([copy, real, what]) => {
            if (copy === real) return;
            console.error('[ValeVision3D] Layout Editor loader: ' + what + ' is "' + real + '" but the loader holds "' + copy + '". The tab strip and Dev section miss it until the loader copy is updated.');
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Announce the Project Load the Editor Started Too Late to Hear
    // ------------------------------------------------------------
    // The sheet model announces a project load as 'loaded', and three modules
    // act on it: auto save puts an unsaved browser draft back, history takes
    // its baseline, and the spec links carry bubble codes across. The mode
    // controller ignores it while no sheet is open. Announced once, in the
    // model's own shape, after all of them are listening.
    // ------------------------------------------------------------
    function Na__LeLoad__AnnounceProjectLoad(editor) {
        window.dispatchEvent(new CustomEvent(editor.model.Na__LeModel__CHANGED_EVENT, {
            detail : { reason : 'loaded', sheetId : null, itemId : null }
        }));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch, Link and Initialise the Editor
    // ------------------------------------------------------------
    // Resolves to the editor, or to null when its config has it off. Rejects
    // when a file cannot be fetched or linked, or the editor fails to start.
    // ------------------------------------------------------------
    async function Na__LeLoad__Run() {
        if (!Na__LeLoad__Context) throw new Error('Na__LeLoad__Initialize has not run.');
        const started = performance.now();

        Na__LeLoadScreen__SetStatus(Na__LeLoad__STATUS_FILES);
        const loaded = await Promise.all([ Na__LeLoad__ImportEditor(), Na__LeLoad__LinkStylesheets() ]);
        const editor = loaded[0];

        Na__LeLoadScreen__SetStatus(Na__LeLoad__STATUS_SETTINGS);
        const enabled = await editor.mode.Na__LeMode__Initialize(Na__LeLoad__Context);   // <-- The call index.html used to make at start-up
        if (!enabled) {
            if (editor.config.Na__LeCfg__IsEnabled()) throw new Error('The editor did not start. The console has the reason.');
            Na__LeLoad__Disabled = true;
            Na__LeLoad__SyncOffer(true);
            return null;
        }

        Na__LeLoad__CheckNames(editor);
        Na__LeLoad__Editor = editor;                                             // <-- From here every facade call goes straight to the editor
        Na__LeLoad__AnnounceProjectLoad(editor);
        Na__LeLoad__SyncOffer(true);
        console.log('[ValeVision3D] Layout Editor loaded on first use (' + Math.round(performance.now() - started) + ' ms).');
        return editor;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Load, Shared by Everyone Who Asks While It Runs
    // ------------------------------------------------------------
    function Na__LeLoad__Load() {
        if (Na__LeLoad__Editor)   return Promise.resolve(Na__LeLoad__Editor);
        if (Na__LeLoad__Disabled) return Promise.resolve(null);
        if (!Na__LeLoad__Loading) {
            Na__LeLoad__Loading = Na__LeLoad__Run().finally(() => { Na__LeLoad__Loading = null; });
        }
        return Na__LeLoad__Loading;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Run an Action on the Editor, Loading It First if Needed
    // ------------------------------------------------------------
    // Loaded: the action runs at once, with no screen. Not loaded: the loading
    // screen shows (unless quiet), the editor loads, the action runs, and the
    // screen hides once the result has painted. A long action (a bake) hands
    // back its promise and the screen hides as it starts; its progress
    // belongs to the Dev section. Resolves to the action's result, or null
    // when the editor could not be had.
    // ------------------------------------------------------------
    // HELPER FUNCTION | Hold the Screen Until the First Sheet Is Drawn
    // ------------------------------------------------------------
    // Reached through the facade rather than imported, because importing the
    // editor's own modules up here would load eagerly the very bundle this
    // file exists to defer. An older editor without the call is simply not
    // waited for.
    // ------------------------------------------------------------
    function Na__LeLoad__AwaitFirstDrawing(editor) {
        const wait = editor && editor.mode && editor.mode.Na__LeMode__WaitForFirstDrawing;
        if (typeof wait !== 'function') return Promise.resolve(true);
        const onProgress = (drawn, total) => {
            Na__LeLoadScreen__SetStatus(total > 1 ? Na__LeLoad__STATUS_DRAWING + '  -  ' + drawn + ' of ' + total : Na__LeLoad__STATUS_DRAWING);
        };
        try { return Promise.resolve(wait(onProgress)).catch(() => true); }
        catch (error) { return Promise.resolve(true); }                          // <-- A wait that throws must never keep the screen up
    }
    // ------------------------------------------------------------


    async function Na__LeLoad__WithEditor(action, quiet) {
        if (Na__LeLoad__Editor) return action(Na__LeLoad__Editor);
        if (!quiet) Na__LeLoadScreen__Show();

        let editor = null;
        try {
            editor = await Na__LeLoad__Load();
        } catch (error) {
            console.error('[ValeVision3D] Layout Editor failed to load:', error);
            if (!quiet) Na__LeLoadScreen__ShowError(String((error && error.message) || error));
            return null;
        }

        if (!editor) {                                                           // <-- The editor's own config has it off
            if (!quiet) Na__LeLoadScreen__Hide(true);
            Na__LeLoad__Toast(Na__LeLoad__MSG_SWITCHED_OFF, true);
            return null;
        }

        try {
            return action(editor);
        } finally {
            // THE SCREEN USED TO GO TWO FRAMES AFTER THE SHEET OPENED, which is
            // long before the sheet is drawn: the viewports are rendered from
            // the model one at a time, and the reader was handed a blank page
            // that filled in underneath them. Now it waits for the pictures to
            // actually be on the paper, counted against what the model says the
            // sheet has, and says how far along it is while it waits. A Dev
            // action with no sheet open answers at once, as before.
            if (!quiet) {
                await Na__LeLoad__AwaitFirstDrawing(editor);
                Na__LeLoadScreen__Hide();                                        // <-- Waits for the first paint, then fades
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Offering the Editor
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Import the Tab Strip the First Time the Editor Is Offered
    // ------------------------------------------------------------
    function Na__LeLoad__ImportTabs() {
        Na__LeLoad__TabsImport = import('../05__Core__ModeController/Na__LayoutEditor__TabStrip__.js')
            .then((tabs) => tabs.Na__LeTabs__Initialize())
            .catch((error) => console.error('[ValeVision3D] Layout Editor tab strip failed to load:', error));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Ask Again Whether the Editor Is Offered, and Say So
    // ------------------------------------------------------------
    // force: announce even when the answer has not changed, because a project
    // load or save can rename or reorder the sheets the strip is showing.
    // ------------------------------------------------------------
    function Na__LeLoad__SyncOffer(force) {
        const offered = Na__LeLoad__IsAvailable();
        if (offered && !Na__LeLoad__TabsImport) Na__LeLoad__ImportTabs();
        if (force !== true && offered === Na__LeLoad__Offered) return;
        Na__LeLoad__Offered = offered;
        window.dispatchEvent(new CustomEvent(Na__LeLoad__STATE_EVENT, {
            detail : { offered : offered, loaded : !!Na__LeLoad__Editor }
        }));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Reveal the Dev Section and Import It When First Opened
    // ------------------------------------------------------------
    // The first click on the section's toggle is spent importing it, so the
    // section is asked to open itself; from then on it owns its toggle.
    // ------------------------------------------------------------
    function Na__LeLoad__WireDevSection() {
        const item   = document.getElementById(Na__LeLoad__DEV_ITEM_ID);
        const toggle = document.getElementById(Na__LeLoad__DEV_TOGGLE_ID);
        if (!item || !toggle) return false;
        item.style.display = '';                                                // <-- As the section always did; the Dev Tools container itself is localhost-only
        const onFirstClick = () => {
            if (Na__LeLoad__DevImport) return;
            toggle.removeEventListener('click', onFirstClick);
            Na__LeLoad__DevImport = import('../70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js')
                .then((dev) => dev.Na__LayoutEditor__DevMenu__Initialize({ showToast : Na__LeLoad__Context ? Na__LeLoad__Context.showToast : null, open : true }))
                .catch((error) => {
                    console.error('[ValeVision3D] Layout Editor Dev section failed to load:', error);
                    Na__LeLoad__Toast(Na__LeLoad__MSG_DEV_FAILED, true);
                });
        };
        toggle.addEventListener('click', onFirstClick);
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Questions (answered from the raw block until the editor loads)
// -----------------------------------------------------------------------------

    // FUNCTION | Has the Editor Loaded?
    // ------------------------------------------------------------
    function Na__LeLoad__IsLoaded() { return !!Na__LeLoad__Editor; }
    function Na__LeLoad__GetEditor() { return Na__LeLoad__Editor; }
    // ------------------------------------------------------------


    // FUNCTION | Is the Editor Offered (tab strip shown, sheets can open)
    // ------------------------------------------------------------
    // The mode controller's rule once it has loaded; the same rule read from
    // the raw block before that: Layout Mode on AND at least one sheet.
    // ------------------------------------------------------------
    function Na__LeLoad__IsAvailable() {
        if (Na__LeLoad__Editor)   return Na__LeLoad__Editor.mode.Na__LeMode__IsAvailable();
        if (Na__LeLoad__Disabled) return false;
        return Na__DrawData__GetLayoutModeEnabled() && Na__LeLoad__RawRecords().length > 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Project's Layout Mode Switch
    // ------------------------------------------------------------
    function Na__LeLoad__IsLayoutModeOn() { return Na__DrawData__GetLayoutModeEnabled(); }
    // ------------------------------------------------------------


    // FUNCTION | May This Session Edit Sheets (the mode controller's rule)
    // ------------------------------------------------------------
    function Na__LeLoad__IsEditable() {
        if (Na__LeLoad__Editor) return Na__LeLoad__Editor.mode.Na__LeMode__IsEditable();
        return Na__DevGate__IsAuthoringEnabled() || !Na__LeLoad__IsReadOnlyOnWeb();
    }
    // ------------------------------------------------------------


    // FUNCTION | Open Sheet, View, Sheets and Unsaved State
    // ------------------------------------------------------------
    function Na__LeLoad__IsActive()       { return !!Na__LeLoad__Editor && Na__LeLoad__Editor.mode.Na__LeMode__IsActive(); }
    function Na__LeLoad__GetView()        { return Na__LeLoad__Editor ? Na__LeLoad__Editor.mode.Na__LeMode__GetView() : Na__LeLoad__VIEW_SHEET; }
    function Na__LeLoad__GetSheets()      { return Na__LeLoad__Editor ? Na__LeLoad__Editor.model.Na__LeModel__GetSheets() : Na__LeLoad__SheetViews(); }

    // WHAT A SHEET IS CALLED ON SCREEN | The same answer loaded or not
    // ------------------------------------------------------------
    // "D03 - Elevations": the short code cut from the sheet's drawing number,
    // then its name. Composed here from the leaf rather than handed to the
    // editor, because the tab strip and the Dev menu draw sheet names before
    // the editor exists - and a tab that gained its code only once the bundle
    // arrived would rename itself under the reader. The loaded model's
    // Na__LeModel__GetTabLabel composes the same two parts through the same
    // configured format.
    // ------------------------------------------------------------
    function Na__LeLoad__GetTabLabel(sheet, name) {
        if (!sheet) return '';
        const words = (typeof name === 'string') ? name : sheet.Sheet__Name;
        return Na__LeCode__Compose(Na__LeCode__ShortCode(Na__LeCode__StoredNumber(sheet)), words, Na__LeLoad__GetLabel('TabLabelFormat', '{code} - {name}'));
    }
    function Na__LeLoad__GetShortCode(sheet) { return Na__LeCode__ShortCode(Na__LeCode__StoredNumber(sheet)); }
    function Na__LeLoad__GetDrawingNumber(sheet) { return Na__LeCode__StoredNumber(sheet); }
    // ------------------------------------------------------------
    function Na__LeLoad__GetActiveSheet() { return Na__LeLoad__Editor ? Na__LeLoad__Editor.model.Na__LeModel__GetActiveSheet() : null; }
    function Na__LeLoad__IsDirty()        { return !!Na__LeLoad__Editor && Na__LeLoad__Editor.model.Na__LeModel__IsDirty(); }
    function Na__LeLoad__IsSpecDirty()    { return !!Na__LeLoad__Editor && Na__LeLoad__Editor.spec.Na__LeSpec__IsDirty(); }
    // ------------------------------------------------------------


    // FUNCTION | Labels: the Config's Wording Once Loaded, the Caller's Fallback Before
    // ------------------------------------------------------------
    function Na__LeLoad__GetLabel(keySuffix, fallback) {
        return Na__LeLoad__Editor ? Na__LeLoad__Editor.config.Na__LeCfg__GetLabel(keySuffix, fallback) : fallback;
    }
    function Na__LeLoad__FormatLabel(keySuffix, fallback, tokens) {
        if (Na__LeLoad__Editor) return Na__LeLoad__Editor.config.Na__LeCfg__FormatLabel(keySuffix, fallback, tokens);
        let text = fallback;
        Object.keys(tokens || {}).forEach((key) => { text = text.split('{' + key + '}').join(String(tokens[key])); });
        return text;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Actions (each loads the editor first when it has not loaded)
// -----------------------------------------------------------------------------

    // FUNCTION | Load the Editor Behind the Loading Screen (options.quiet: no screen)
    // ------------------------------------------------------------
    // Resolves to the loaded modules, or null when the editor could not be had.
    // ------------------------------------------------------------
    function Na__LeLoad__Require(options) {
        return Na__LeLoad__WithEditor((editor) => editor, !!(options && options.quiet));
    }
    // ------------------------------------------------------------


    // FUNCTION | Open a Sheet (the first sheet when none is named)
    // ------------------------------------------------------------
    function Na__LeLoad__Enter(sheetId) {
        if (Na__LeLoad__Editor) return Promise.resolve(Na__LeLoad__Editor.mode.Na__LeMode__Enter(sheetId));
        if (!Na__LeLoad__IsAvailable()) return Promise.resolve(false);           // <-- Nothing to open: never load for it
        return Na__LeLoad__WithEditor((editor) => editor.mode.Na__LeMode__Enter(sheetId), false).then((entered) => entered === true);
    }
    // ------------------------------------------------------------


    // FUNCTION | Back to the 3D Model (nothing to leave before the load)
    // ------------------------------------------------------------
    function Na__LeLoad__Leave() {
        return !!Na__LeLoad__Editor && Na__LeLoad__Editor.mode.Na__LeMode__Leave();
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Project Specification Tab
    // ------------------------------------------------------------
    function Na__LeLoad__OpenSpecification(noteId) {
        return Na__LeLoad__WithEditor((editor) => editor.mode.Na__LeMode__OpenSpecification(noteId), false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch Layout Mode On or Off (never loads the editor; the caller saves)
    // ------------------------------------------------------------
    function Na__LeLoad__SetLayoutMode(enabled) {
        let next = enabled === true;
        if (Na__LeLoad__Editor) next = Na__LeLoad__Editor.mode.Na__LeMode__SetLayoutMode(next);   // <-- Off leaves an open sheet first
        else Na__DrawData__SetLayoutModeEnabled(next);
        Na__LeLoad__SyncOffer(true);
        return next;
    }
    // ------------------------------------------------------------


    // FUNCTION | Sheet Changes the Tab Strip and Dev Section Make
    // ------------------------------------------------------------
    // A sheet handed in may be a view from before the load, so an update finds
    // the live record by its id first.
    // ------------------------------------------------------------
    function Na__LeLoad__CreateSheet(options) {
        return Na__LeLoad__WithEditor((editor) => editor.model.Na__LeModel__CreateSheet(options || {}), false);
    }
    function Na__LeLoad__UpdateSheet(sheet, patch) {
        const sheetId = sheet ? sheet.Sheet__Id : null;
        return Na__LeLoad__WithEditor((editor) => {
            const live = editor.model.Na__LeModel__GetSheetById(sheetId);
            return live ? editor.model.Na__LeModel__UpdateSheet(live, patch) : null;
        }, false);
    }
    function Na__LeLoad__ReorderSheet(sheetId, index) {
        return Na__LeLoad__WithEditor((editor) => editor.model.Na__LeModel__ReorderSheet(sheetId, index), false);
    }
    function Na__LeLoad__DuplicateSheet(sheetId) {
        return Na__LeLoad__WithEditor((editor) => editor.model.Na__LeModel__DuplicateSheet(sheetId), false);
    }
    function Na__LeLoad__DeleteSheet(sheetId) {
        return Na__LeLoad__WithEditor((editor) => editor.model.Na__LeModel__DeleteSheet(sheetId), false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Save the Drawings Block
    // ------------------------------------------------------------
    // Before the load nothing can have been edited, so the block is saved as
    // the project supplied it, through the same save path the model uses.
    // ------------------------------------------------------------
    function Na__LeLoad__Save(showToast) {
        if (Na__LeLoad__Editor) return Na__LeLoad__Editor.model.Na__LeModel__Save(showToast);
        return Na__DrawData__Save(showToast);
    }
    // ------------------------------------------------------------


    // FUNCTION | Load the Snapshot Stamper Before a Rename Writes Anything
    // ------------------------------------------------------------
    // A rename re-stamps the baked 3D snapshots of the scene it renames, and
    // only the editor computes the stamp. A project without such a snapshot
    // resolves at once and loads nothing; one with it loads the editor
    // quietly. Called before the rename writes, so the rename itself stays
    // one uninterrupted step. Resolves true when re-stamping can run.
    // ------------------------------------------------------------
    async function Na__LeLoad__PrepareRestamp(sceneId) {
        if (Na__LeLoad__Editor) return true;
        if (!sceneId || !Na__LeLoad__HasBakedSnapshotOf(sceneId)) return false;
        return !!(await Na__LeLoad__Require({ quiet : true }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-Stamp the Baked 3D Snapshots of a Renamed Scene (0 when the editor has not loaded)
    // ------------------------------------------------------------
    function Na__LeLoad__RestampForScene(sceneId) {
        if (!Na__LeLoad__Editor || !sceneId) return 0;
        return Na__LeLoad__Editor.viewport3d.Na__LeVp3d__RestampForScene(sceneId);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Take the Render Context and Start Watching for Drawings
    // ------------------------------------------------------------
    // context: { renderer, scene, camera, controls, pipelineRef, modelRoot, appConfig, showToast }
    // ------------------------------------------------------------
    function Na__LeLoad__Initialize(context) {
        if (Na__LeLoad__Context || !context) return false;
        Na__LeLoad__Context = context;
        window.addEventListener(Na__DrawData__CHANGED_EVENT, () => Na__LeLoad__SyncOffer(true));   // <-- A project loaded or saved: its sheets and its switch may differ
        window.addEventListener(Na__LeLoad__SHEETS_EVENT, () => { if (!Na__LeLoad__TabsImport) Na__LeLoad__SyncOffer(false); });   // <-- The first sheet made in the Dev section brings the strip in
        Na__LeLoad__WireDevSection();
        Na__LeLoad__SyncOffer(true);                                             // <-- A block that landed before this ran
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Loader API
    // ------------------------------------------------------------
    export {
        Na__LeLoad__SHEETS_EVENT,
        Na__LeLoad__MODE_EVENT,
        Na__LeLoad__SPEC_EVENT,
        Na__LeLoad__STATE_EVENT,
        Na__LeLoad__VIEW_SHEET,
        Na__LeLoad__VIEW_SPEC,
        Na__LeLoad__Initialize,
        Na__LeLoad__IsLoaded,
        Na__LeLoad__GetEditor,
        Na__LeLoad__IsAvailable,
        Na__LeLoad__IsLayoutModeOn,
        Na__LeLoad__IsEditable,
        Na__LeLoad__IsActive,
        Na__LeLoad__GetView,
        Na__LeLoad__GetSheets,
        Na__LeLoad__GetTabLabel,
        Na__LeLoad__GetShortCode,
        Na__LeLoad__GetDrawingNumber,
        Na__LeLoad__GetActiveSheet,
        Na__LeLoad__IsDirty,
        Na__LeLoad__IsSpecDirty,
        Na__LeLoad__GetLabel,
        Na__LeLoad__FormatLabel,
        Na__LeLoad__Require,
        Na__LeLoad__Enter,
        Na__LeLoad__Leave,
        Na__LeLoad__OpenSpecification,
        Na__LeLoad__SetLayoutMode,
        Na__LeLoad__CreateSheet,
        Na__LeLoad__UpdateSheet,
        Na__LeLoad__ReorderSheet,
        Na__LeLoad__DuplicateSheet,
        Na__LeLoad__DeleteSheet,
        Na__LeLoad__Save,
        Na__LeLoad__PrepareRestamp,
        Na__LeLoad__RestampForScene
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
