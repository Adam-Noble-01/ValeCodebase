// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - MODE CONTROLLER
// =============================================================================
//
// FILE       : Na__LayoutEditor__ModeController__.js
// NAMESPACE  : Na__LeMode
// MODULE     : Layout Editor - Mode Controller
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Enter and leave the sheet editor, own its shell, and keep the paper in step with the model
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - Entering: any drawing mode is exited first, the 3D overlays (carousel,
//   nav toolbar, help, export frame) go behind a body class, the WebGL
//   canvas stays alive but invisible so snapshots still render, and the
//   host fills the space under the header and tab strip with the panels,
//   toolbar and stage (D22 to D24). Leaving puts it all back.
// - The shell is built once, on the first entry, after the config and the
//   model are ready. Editing is allowed on localhost, or anywhere when
//   Main.json turns the web read-only flag off.
// - Sheet model changes are routed to the surface by reason so a pan does
//   not rebuild the chrome and a rename does not re-render a viewport.
// - Answers the panels' Edit In Drawing request by leaving and opening the
//   plan or elevation in its own edit mode (D34).
//
// INTEGRATION:
// - Initialized from index.html with the render context; the tab strip and
//   Dev menu call Enter and Leave.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : ValeVision3D 43__System__FloorPlanViews/Na__FloorPlan__ModeController__.js (mode pattern) and Lantern Designer 30__System__DrawingEditorMode
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config, Model, Surface, Navigation, Tools, Panels, Toolbar, Snapshots
    // ------------------------------------------------------------
    import { Na__LeCfg__SetAppConfig, Na__LeCfg__Ready, Na__LeCfg__IsEnabled, Na__LeCfg__IsReadOnlyOnWeb, Na__LeCfg__GetLabel } from './Na__LayoutEditor__ConfigState__.js';
    import {
        Na__LeModel__CHANGED_EVENT,
        Na__LeModel__Initialize,
        Na__LeModel__GetSheets,
        Na__LeModel__GetSheetById,
        Na__LeModel__GetActiveSheet,
        Na__LeModel__SetActiveSheetId
    } from './Na__LayoutEditor__SheetModel__.js';
    import { Na__LeSurface__Mount, Na__LeSurface__SetSheet, Na__LeSurface__Refresh, Na__LeSurface__SetZoom, Na__LeSurface__GetZoom } from './Na__LayoutEditor__SheetSurface__.js';
    import { Na__LeNav__Attach, Na__LeNav__Detach, Na__LeNav__Fit } from './Na__LayoutEditor__Navigation__.js';
    import { Na__LeTools__Attach, Na__LeTools__Detach } from './Na__LayoutEditor__SheetTools__.js';
    import { Na__LePanels__Mount, Na__LePanels__Refresh } from './Na__LayoutEditor__PanelHost__.js';
    import { Na__LePanelLayers__Register } from './Na__LayoutEditor__Panel__Layers__.js';
    import { Na__LePanelSheet__Register } from './Na__LayoutEditor__Panel__Sheet__.js';
    import { Na__LePanelViewport__EDIT_EVENT, Na__LePanelViewport__Register } from './Na__LayoutEditor__Panel__ViewportSettings__.js';
    import { Na__LePanelText__Register } from './Na__LayoutEditor__Panel__Text__.js';
    import { Na__LePanelDims__Register } from './Na__LayoutEditor__Panel__Dimensions__.js';
    import { Na__LePanelStyles__Register } from './Na__LayoutEditor__Panel__Styles__.js';
    import { Na__LeToolbar__Mount } from './Na__LayoutEditor__Toolbar__.js';
    import { Na__LeSnap__Initialize } from './Na__LayoutEditor__SnapshotRenderer__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Drawing Modes, Render Loop, Projection Events, Localhost
    // ------------------------------------------------------------
    import { Na__FloorPlanMode__IsEngaged, Na__FloorPlanMode__ExitPlan, Na__FloorPlanMode__EnterPlan, Na__FloorPlanMode__SetEditMode } from '../43__System__FloorPlanViews/Na__FloorPlan__ModeController__.js';
    import { Na__ElevationMode__IsEngaged, Na__ElevationMode__ExitElevation, Na__ElevationMode__EnterElevation, Na__ElevationMode__SetEditMode } from '../46__System__ElevationViews/Na__Elevation__ModeController__.js';
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    import { Na__PlPipe__CHANGED_EVENT } from '../50__System__ProjectedLinework/Na__ProjectedLinework__Pipeline__.js';
    import { Na__AppUtils__IsRunningOnLocalhost } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Ids, Classes and Events
    // ------------------------------------------------------------
    const Na__LeMode__CHANGED_EVENT = 'na-layouteditor-mode-changed';
    const Na__LeMode__HOST_ID       = 'naLayoutEditorHost';
    const Na__LeMode__BODY_CLASS    = 'na-layout-editor--active';
    const Na__LeMode__CANVAS_ID     = 'renderCanvas';
    // ------------------------------------------------------------

    // MODULE VARIABLES | Context, Shell and State
    // ------------------------------------------------------------
    let Na__LeMode__Context   = null;
    let Na__LeMode__ReadyOnce = null;
    let Na__LeMode__Host      = null;
    let Na__LeMode__Stage     = null;
    let Na__LeMode__Active    = false;
    let Na__LeMode__Built     = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shell
// -----------------------------------------------------------------------------

    // FUNCTION | May This Session Edit Sheets
    // ------------------------------------------------------------
    function Na__LeMode__IsEditable() {
        return Na__AppUtils__IsRunningOnLocalhost() || !Na__LeCfg__IsReadOnlyOnWeb();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Host, Columns, Toolbar and Stage Once
    // ------------------------------------------------------------
    function Na__LeMode__Build() {
        if (Na__LeMode__Built) return;
        Na__LeMode__Built = true;
        const editable = Na__LeMode__IsEditable();
        const toast    = Na__LeMode__Context ? Na__LeMode__Context.showToast : null;

        let host = document.getElementById(Na__LeMode__HOST_ID);
        if (!host) { host = document.createElement('div'); host.id = Na__LeMode__HOST_ID; document.body.appendChild(host); }
        host.className = 'na-le-host';
        host.hidden = true;
        host.innerHTML = '<div class="na-le-shell"><div class="na-le-column na-le-column--left"></div><div class="na-le-centre"><div class="na-le-centre__toolbar"></div><div class="na-le-stage" tabindex="0"></div></div><div class="na-le-column na-le-column--right"></div></div>';
        Na__LeMode__Host  = host;
        Na__LeMode__Stage = host.querySelector('.na-le-stage');

        Na__LeSurface__Mount(Na__LeMode__Stage, { editable : editable });
        Na__LePanels__Mount({ left : host.querySelector('.na-le-column--left'), right : host.querySelector('.na-le-column--right'), editable : editable, showToast : toast });
        Na__LePanelSheet__Register();
        Na__LePanelLayers__Register();
        Na__LePanelViewport__Register();
        Na__LePanelText__Register();
        Na__LePanelDims__Register();
        Na__LePanelStyles__Register();
        Na__LeToolbar__Mount(host.querySelector('.na-le-centre__toolbar'), { editable : editable, showToast : toast });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Announce
    // ------------------------------------------------------------
    function Na__LeMode__Dispatch() {
        const sheet = Na__LeModel__GetActiveSheet();
        window.dispatchEvent(new CustomEvent(Na__LeMode__CHANGED_EVENT, { detail : { isActive : Na__LeMode__Active, sheetId : sheet ? sheet.Sheet__Id : null } }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Enter and Leave
// -----------------------------------------------------------------------------

    // FUNCTION | Open the Editor on a Sheet (the first sheet when none is named)
    // ------------------------------------------------------------
    function Na__LeMode__Enter(sheetId) {
        if (!Na__LeMode__Context || !Na__LeCfg__IsEnabled()) return false;
        const sheets = Na__LeModel__GetSheets();
        const sheet  = (sheetId && Na__LeModel__GetSheetById(sheetId)) || sheets[0] || null;
        if (!sheet) return false;
        Na__LeMode__Build();

        if (!Na__LeMode__Active) {
            if (Na__FloorPlanMode__IsEngaged())  Na__FloorPlanMode__ExitPlan(null);          // <-- The editor starts from the 3D view
            if (Na__ElevationMode__IsEngaged())  Na__ElevationMode__ExitElevation(null);
            document.body.classList.add(Na__LeMode__BODY_CLASS);
            const canvas = document.getElementById(Na__LeMode__CANVAS_ID);
            if (canvas) canvas.style.visibility = 'hidden';                     // <-- Alive for offscreen snapshots
            Na__LeMode__Host.hidden = false;
            Na__LeMode__Active = true;
            Na__LeNav__Attach();
            Na__LeTools__Attach({ editable : Na__LeMode__IsEditable() });
        }
        Na__LeModel__SetActiveSheetId(sheet.Sheet__Id);
        Na__LeSurface__SetSheet(sheet);
        Na__LePanels__Refresh();
        window.requestAnimationFrame(() => { if (Na__LeMode__Active) Na__LeNav__Fit(); });   // <-- Stage has a size once shown
        Na__LeMode__Dispatch();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Close the Editor and Give the 3D View Back
    // ------------------------------------------------------------
    function Na__LeMode__Leave() {
        if (!Na__LeMode__Active) return false;
        Na__LeTools__Detach();
        Na__LeNav__Detach();
        Na__LeSurface__SetSheet(null);
        Na__LeModel__SetActiveSheetId(null);
        Na__LeMode__Host.hidden = true;
        document.body.classList.remove(Na__LeMode__BODY_CLASS);
        const canvas = document.getElementById(Na__LeMode__CANVAS_ID);
        if (canvas) canvas.style.visibility = '';
        Na__LeMode__Active = false;
        Na__RenderLoop__RequestRender();
        Na__LeMode__Dispatch();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | State
    // ------------------------------------------------------------
    function Na__LeMode__IsActive() { return Na__LeMode__Active; }
    function Na__LeMode__Ready()    { return Na__LeMode__ReadyOnce || Promise.resolve(false); }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Model and Request Handling
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Route a Model Change to the Right Refresh
    // ------------------------------------------------------------
    function Na__LeMode__OnSheetsChanged(event) {
        if (!Na__LeMode__Active) return;
        const reason = event.detail ? event.detail.reason : 'all';
        const active = Na__LeModel__GetActiveSheet();
        if (reason === 'loaded' || reason === 'sheet-deleted') {
            if (!active) { const first = Na__LeModel__GetSheets()[0]; if (first) Na__LeMode__Enter(first.Sheet__Id); else Na__LeMode__Leave(); return; }
            Na__LeSurface__SetSheet(active);
        } else if (reason === 'sheet-updated' || reason === 'fields') Na__LeSurface__Refresh(reason === 'fields' ? 'chrome' : 'sheet');
        else if (reason === 'viewports' || reason === 'viewport') Na__LeSurface__Refresh('frames');
        else if (reason === 'annotations' || reason === 'annotation' || reason === 'dimensions' || reason === 'dimension') Na__LeSurface__Refresh('markup');
        else if (reason === 'layers') Na__LeSurface__Refresh('all');
        else if (reason === 'selection') { Na__LeSurface__Refresh('markup'); Na__LeSurface__Refresh('selection'); }
        else if (reason === 'active') { if (active) Na__LeSurface__SetSheet(active); }
        Na__LePanels__Refresh();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Edit In Drawing: Leave, Then Open the Plan or Elevation in Edit Mode
    // ------------------------------------------------------------
    function Na__LeMode__OnRequestDrawing(event) {
        const detail = event.detail || {};
        if (!detail.plan && !detail.elevation) return;
        Na__LeMode__Leave();
        if (detail.plan) { Na__FloorPlanMode__EnterPlan(detail.plan); Na__FloorPlanMode__SetEditMode(true); }
        else { Na__ElevationMode__EnterElevation(detail.elevation); Na__ElevationMode__SetEditMode(true); }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Register the Render Context and Load the Config
    // ------------------------------------------------------------
    // context: { renderer, scene, camera, controls, pipelineRef, modelRoot, appConfig, showToast }
    // Resolves to true when the feature is enabled.
    // ------------------------------------------------------------
    function Na__LeMode__Initialize(context) {
        if (!context) return Promise.resolve(false);
        Na__LeMode__Context = context;
        Na__LeCfg__SetAppConfig(context.appConfig || null);
        Na__LeMode__ReadyOnce = Na__LeCfg__Ready().then(() => {
            if (!Na__LeCfg__IsEnabled()) return false;
            Na__LeModel__Initialize();
            Na__LeSnap__Initialize(context);
            window.addEventListener(Na__LeModel__CHANGED_EVENT, Na__LeMode__OnSheetsChanged);
            window.addEventListener(Na__LePanelViewport__EDIT_EVENT, Na__LeMode__OnRequestDrawing);
            window.addEventListener(Na__PlPipe__CHANGED_EVENT, () => { if (Na__LeMode__Active) Na__LeSurface__Refresh('frames'); });
            window.addEventListener('resize', () => { if (Na__LeMode__Active) Na__LeSurface__SetZoom(Na__LeSurface__GetZoom()); });
            console.log('[ValeVision3D] Layout Editor ready (' + (Na__LeMode__IsEditable() ? 'editable' : Na__LeCfg__GetLabel('ReadOnlyNote', 'read-only')) + ').');
            return true;
        }).catch((error) => {
            console.error('[ValeVision3D] Layout Editor failed to initialise:', error);
            return false;
        });
        return Na__LeMode__ReadyOnce;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Mode Controller API
    // ------------------------------------------------------------
    export {
        Na__LeMode__CHANGED_EVENT,
        Na__LeMode__Initialize,
        Na__LeMode__Ready,
        Na__LeMode__Enter,
        Na__LeMode__Leave,
        Na__LeMode__IsActive,
        Na__LeMode__IsEditable
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
