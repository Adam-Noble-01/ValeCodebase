// =============================================================================
// VALEVISION3D - ELEVATION VIEW UI CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__ElevationView__Controls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : Elevation View - UI Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Wire DOM elements to the Elevation View system logic
// CREATED    : 11-Mar-2026
//
// DESCRIPTION:
// - Initialises the Elevation View sub-panel inside the Tools dropdown.
// - Wires toggle button, selection, view switching, plane visibility, and
//   reselect controls to the corresponding system logic functions.
// - Listens for 'na-elevation-state-changed' events to show/hide controls
//   contextually based on the current elevation system state.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Elevation View System Logic
    // ------------------------------------------------------------
    import {
        Na__ElevationView__Initialize,
        Na__ElevationView__StartSelection,
        Na__ElevationView__ViewElevation,
        Na__ElevationView__BackTo3D,
        Na__ElevationView__TogglePlane,
        Na__ElevationView__Reselect,
        Na__ElevationView__GetState
    } from './Na__ElevationView__SystemLogic.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element IDs
    // ------------------------------------------------------------
    const Na__ElevUi__TOGGLE_BTN_ID       = 'naElevationViewToggle';              // <-- Panel toggle button
    const Na__ElevUi__PANEL_ID            = 'naElevationViewPanel';               // <-- Sub-panel container
    const Na__ElevUi__SELECT_FACE_ID      = 'naElevationSelectFace';              // <-- Select face button
    const Na__ElevUi__VIEW_BTN_ID         = 'naElevationViewBtn';                 // <-- View Elevation button
    const Na__ElevUi__BACK_BTN_ID         = 'naElevationBackTo3D';                // <-- Back to 3D button
    const Na__ElevUi__PLANE_TOGGLE_ROW_ID = 'naElevationPlaneToggleRow';          // <-- Plane toggle row wrapper
    const Na__ElevUi__PLANE_TOGGLE_ID     = 'naElevationPlaneToggle';             // <-- Plane toggle checkbox
    const Na__ElevUi__RESELECT_ID         = 'naElevationReselect';                // <-- Reselect button
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Elevation State Values
    // ------------------------------------------------------------
    const Na__ElevUi__STATE_IDLE      = 'IDLE';
    const Na__ElevUi__STATE_SELECTING = 'SELECTING';
    const Na__ElevUi__STATE_READY     = 'ELEVATION_READY';
    const Na__ElevUi__STATE_VIEWING   = 'VIEWING_ELEVATION';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | DOM Reference Cache
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Cached DOM Elements
    // ------------------------------------------------------------
    let Na__ElevUi__ToggleBtn       = null;
    let Na__ElevUi__Panel           = null;
    let Na__ElevUi__SelectFaceBtn   = null;
    let Na__ElevUi__ViewBtn         = null;
    let Na__ElevUi__BackBtn         = null;
    let Na__ElevUi__PlaneToggleRow  = null;
    let Na__ElevUi__PlaneToggle     = null;
    let Na__ElevUi__ReselectBtn     = null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | UI State Management
// -----------------------------------------------------------------------------

    // FUNCTION | Update UI Visibility Based on Elevation State
    // ------------------------------------------------------------
    function Na__ElevUi__UpdateVisibility(state) {
        if (!Na__ElevUi__SelectFaceBtn) return;

        const isIdle      = (state === Na__ElevUi__STATE_IDLE);
        const isSelecting = (state === Na__ElevUi__STATE_SELECTING);
        const isReady     = (state === Na__ElevUi__STATE_READY);
        const isViewing   = (state === Na__ElevUi__STATE_VIEWING);
        const hasElevation = isReady || isViewing;

        Na__ElevUi__SelectFaceBtn.style.display  = (isIdle || isSelecting) ? '' : 'none';
        Na__ElevUi__SelectFaceBtn.textContent     = isSelecting ? 'Click a Building Face...' : 'Select Elevation Face';
        Na__ElevUi__SelectFaceBtn.disabled        = isSelecting;

        Na__ElevUi__ViewBtn.style.display         = isReady ? '' : 'none';
        Na__ElevUi__BackBtn.style.display          = isViewing ? '' : 'none';
        Na__ElevUi__PlaneToggleRow.style.display   = hasElevation ? '' : 'none';
        Na__ElevUi__ReselectBtn.style.display      = hasElevation ? '' : 'none';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Elevation State Changed Event
    // ------------------------------------------------------------
    function Na__ElevUi__OnStateChanged(event) {
        const state = event.detail ? event.detail.state : Na__ElevUi__STATE_IDLE;
        Na__ElevUi__UpdateVisibility(state);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Elevation View UI Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeElevationViewControls(scene, camera, renderer, controls, pipelineRef, modelRoot, useTouchControls) {

        // CACHE DOM REFERENCES
        Na__ElevUi__ToggleBtn      = document.getElementById(Na__ElevUi__TOGGLE_BTN_ID);
        Na__ElevUi__Panel          = document.getElementById(Na__ElevUi__PANEL_ID);
        Na__ElevUi__SelectFaceBtn  = document.getElementById(Na__ElevUi__SELECT_FACE_ID);
        Na__ElevUi__ViewBtn        = document.getElementById(Na__ElevUi__VIEW_BTN_ID);
        Na__ElevUi__BackBtn        = document.getElementById(Na__ElevUi__BACK_BTN_ID);
        Na__ElevUi__PlaneToggleRow = document.getElementById(Na__ElevUi__PLANE_TOGGLE_ROW_ID);
        Na__ElevUi__PlaneToggle    = document.getElementById(Na__ElevUi__PLANE_TOGGLE_ID);
        Na__ElevUi__ReselectBtn    = document.getElementById(Na__ElevUi__RESELECT_ID);

        if (!Na__ElevUi__ToggleBtn || !Na__ElevUi__Panel) {
            console.warn('[ValeVision3D] Elevation View DOM elements not found');
            return;
        }

        // INITIALIZE SYSTEM LOGIC
        Na__ElevationView__Initialize(scene, camera, renderer, controls, pipelineRef, modelRoot, useTouchControls);

        // PANEL TOGGLE
        Na__ElevUi__ToggleBtn.addEventListener('click', () => {
            const isOpen = Na__ElevUi__Panel.classList.contains('is-open');
            Na__ElevUi__Panel.classList.toggle('is-open', !isOpen);
        });

        // SELECT FACE BUTTON
        Na__ElevUi__SelectFaceBtn.addEventListener('click', () => {
            Na__ElevationView__StartSelection();
        });

        // VIEW ELEVATION BUTTON
        Na__ElevUi__ViewBtn.addEventListener('click', () => {
            Na__ElevationView__ViewElevation();
        });

        // BACK TO 3D BUTTON
        Na__ElevUi__BackBtn.addEventListener('click', () => {
            Na__ElevationView__BackTo3D();
        });

        // PLANE VISIBILITY TOGGLE
        Na__ElevUi__PlaneToggle.addEventListener('change', () => {
            const visible = Na__ElevationView__TogglePlane();
            Na__ElevUi__PlaneToggle.checked = visible;
        });

        // RESELECT BUTTON
        Na__ElevUi__ReselectBtn.addEventListener('click', () => {
            Na__ElevUi__PlaneToggle.checked = true;                                // <-- Reset checkbox
            Na__ElevationView__Reselect();
        });

        // LISTEN FOR STATE CHANGES
        window.addEventListener('na-elevation-state-changed', Na__ElevUi__OnStateChanged);

        // SET INITIAL UI STATE
        Na__ElevUi__UpdateVisibility(Na__ElevationView__GetState());

        console.log('[ValeVision3D] Elevation View UI controls initialized');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Elevation View Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeElevationViewControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
