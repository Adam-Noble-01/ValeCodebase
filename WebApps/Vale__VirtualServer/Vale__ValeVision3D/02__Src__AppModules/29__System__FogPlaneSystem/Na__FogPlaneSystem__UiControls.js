// =============================================================================
// VALEVISION3D - FOG PLANE SYSTEM - UI CONTROLS
// =============================================================================
//
// FILE       : Na__FogPlaneSystem__UiControls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : FogPlaneControls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Wire Dev Tools HTML panel to the Fog Plane System
// CREATED    : 07-Apr-2026
//
// DESCRIPTION:
// - Caches DOM element references for the fog plane Dev Tools controls.
// - Wires toggle, slider, button, and save events to system logic functions.
// - Listens for na-fogplane-state-changed events to update button visibility.
// - Listens for na-fogplane-settings-loaded to sync slider + toggle once the
//   system has loaded the per-project saved settings (avoids 1 m default flash).
// - Localhost-only: fog plane controls only appear on localhost.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Apr-2026 - Version 1.0.0
// - Initial implementation.
//
// 26-Jun-2026 - Version 1.1.0
// - Fixed falloff slider always showing 1 m default: UI initialised before the
//   fog system finished loading project.json. Now re-syncs on the new
//   na-fogplane-settings-loaded event via Na__FogUi__SyncControlsFromSystem().
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | System Logic API
    // @delegate: ./Na__FogPlaneSystem__SystemLogic.js
    // ------------------------------------------------------------
    import {
        Na__FogPlaneSystem__SetFogEnabled,
        Na__FogPlaneSystem__SetFalloffMm,
        Na__FogPlaneSystem__SelectFace,
        Na__FogPlaneSystem__RemovePlane,
        Na__FogPlaneSystem__SetPlanesVisible,
        Na__FogPlaneSystem__SaveSettings,
        Na__FogPlaneSystem__IsFogEnabled,
        Na__FogPlaneSystem__GetFalloffMm
    } from './Na__FogPlaneSystem__SystemLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Confirm Dialog (gates destructive write)
    // ------------------------------------------------------------
    import { Na__AppUtils__ConfirmDialog__Show } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants - DOM Element IDs
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fog Plane Panel IDs
    // ------------------------------------------------------------
    const Na__FogUi__TOGGLE_BTN_ID       = 'naFogPlaneToggle';
    const Na__FogUi__PANEL_ID            = 'naFogPlanePanel';
    const Na__FogUi__FOG_ENABLE_ID       = 'naFogPlaneEnableToggle';
    const Na__FogUi__PLANE_VISIBLE_ID    = 'naFogPlanePlaneVisibleToggle';
    const Na__FogUi__FALLOFF_SLIDER_ID   = 'naFogPlaneFalloffSlider';
    const Na__FogUi__FALLOFF_VALUE_ID    = 'naFogPlaneFalloffValue';
    const Na__FogUi__SELECT_A_BTN_ID     = 'naFogPlaneSelectA';
    const Na__FogUi__SELECT_B_BTN_ID     = 'naFogPlaneSelectB';
    const Na__FogUi__REMOVE_A_BTN_ID     = 'naFogPlaneRemoveA';
    const Na__FogUi__REMOVE_B_BTN_ID     = 'naFogPlaneRemoveB';
    const Na__FogUi__SAVE_BTN_ID         = 'naFogPlaneSaveSettings';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Cached DOM Elements
    // ------------------------------------------------------------
    let Na__FogUi__ToggleBtn      = null;
    let Na__FogUi__Panel          = null;
    let Na__FogUi__FogEnable      = null;
    let Na__FogUi__PlaneVisible   = null;
    let Na__FogUi__FalloffSlider  = null;
    let Na__FogUi__FalloffValue   = null;
    let Na__FogUi__SelectABtn     = null;
    let Na__FogUi__SelectBBtn     = null;
    let Na__FogUi__RemoveABtn     = null;
    let Na__FogUi__RemoveBBtn     = null;
    let Na__FogUi__SaveBtn        = null;
    // ------------------------------------------------------------

    // MODULE VARIABLES | Falloff Step Array
    // ------------------------------------------------------------
    let Na__FogUi__FalloffSteps  = [250, 500, 1000, 2000, 2500, 5000, 10000, 20000];
    let Na__FogUi__FalloffIndex  = 2;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | DOM Cache
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Cache All DOM References
    // ------------------------------------------------------------
    function Na__FogUi__CacheDomElements() {
        Na__FogUi__ToggleBtn     = document.getElementById(Na__FogUi__TOGGLE_BTN_ID);
        Na__FogUi__Panel         = document.getElementById(Na__FogUi__PANEL_ID);
        Na__FogUi__FogEnable     = document.getElementById(Na__FogUi__FOG_ENABLE_ID);
        Na__FogUi__PlaneVisible  = document.getElementById(Na__FogUi__PLANE_VISIBLE_ID);
        Na__FogUi__FalloffSlider = document.getElementById(Na__FogUi__FALLOFF_SLIDER_ID);
        Na__FogUi__FalloffValue  = document.getElementById(Na__FogUi__FALLOFF_VALUE_ID);
        Na__FogUi__SelectABtn    = document.getElementById(Na__FogUi__SELECT_A_BTN_ID);
        Na__FogUi__SelectBBtn    = document.getElementById(Na__FogUi__SELECT_B_BTN_ID);
        Na__FogUi__RemoveABtn    = document.getElementById(Na__FogUi__REMOVE_A_BTN_ID);
        Na__FogUi__RemoveBBtn    = document.getElementById(Na__FogUi__REMOVE_B_BTN_ID);
        Na__FogUi__SaveBtn       = document.getElementById(Na__FogUi__SAVE_BTN_ID);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Display Label Updaters
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Update Falloff Display Label
    // ------------------------------------------------------------
    function Na__FogUi__UpdateFalloffLabel() {
        if (!Na__FogUi__FalloffValue) return;
        const mm = Na__FogUi__FalloffSteps[Na__FogUi__FalloffIndex];
        Na__FogUi__FalloffValue.textContent = mm >= 1000 ? `${mm / 1000} m` : `${mm} mm`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sync Slider + Toggle From Authoritative System State
    // ------------------------------------------------------------
    // Re-reads the falloff + enabled values from the fog system and pushes
    // them into the DOM. Called during initial defaults AND when the system
    // finishes loading the per-project saved settings, so the Dev menu reflects
    // project.json (e.g. 5 m) rather than the 1 m hardcoded default.
    // ------------------------------------------------------------
    function Na__FogUi__SyncControlsFromSystem() {
        const savedFalloffMm = Na__FogPlaneSystem__GetFalloffMm();           // <-- Authoritative value from system
        const matchIndex     = Na__FogUi__FalloffSteps.indexOf(savedFalloffMm);
        if (matchIndex >= 0) {
            Na__FogUi__FalloffIndex = matchIndex;                            // <-- Snap to the saved step
        }

        if (Na__FogUi__FalloffSlider) {
            Na__FogUi__FalloffSlider.value = Na__FogUi__FalloffIndex;        // <-- Reflect on slider position
        }

        if (Na__FogUi__FogEnable) {
            Na__FogUi__FogEnable.checked = Na__FogPlaneSystem__IsFogEnabled(); // <-- Reflect enabled state
        }

        Na__FogUi__UpdateFalloffLabel();                                     // <-- Refresh "N m" / "N mm" label
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Wiring
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Wire All Control Events
    // ------------------------------------------------------------
    function Na__FogUi__WireEvents() {

        if (Na__FogUi__ToggleBtn && Na__FogUi__Panel) {
            Na__FogUi__ToggleBtn.addEventListener('click', () => {
                Na__FogUi__Panel.classList.toggle('is-open');
            });
        }

        if (Na__FogUi__FogEnable) {
            Na__FogUi__FogEnable.addEventListener('change', () => {
                Na__FogPlaneSystem__SetFogEnabled(Na__FogUi__FogEnable.checked);
                Na__RenderLoop__RequestRender();
            });
        }

        if (Na__FogUi__PlaneVisible) {
            Na__FogUi__PlaneVisible.addEventListener('change', () => {
                Na__FogPlaneSystem__SetPlanesVisible(Na__FogUi__PlaneVisible.checked);
            });
        }

        if (Na__FogUi__FalloffSlider) {
            Na__FogUi__FalloffSlider.addEventListener('input', () => {
                Na__FogUi__FalloffIndex = parseInt(Na__FogUi__FalloffSlider.value, 10);
                const mm = Na__FogUi__FalloffSteps[Na__FogUi__FalloffIndex];
                Na__FogPlaneSystem__SetFalloffMm(mm);
                Na__FogUi__UpdateFalloffLabel();
                Na__RenderLoop__RequestRender();
            });
        }

        if (Na__FogUi__SelectABtn) {
            Na__FogUi__SelectABtn.addEventListener('click', () => Na__FogPlaneSystem__SelectFace('A'));
        }
        if (Na__FogUi__SelectBBtn) {
            Na__FogUi__SelectBBtn.addEventListener('click', () => Na__FogPlaneSystem__SelectFace('B'));
        }

        if (Na__FogUi__RemoveABtn) {
            Na__FogUi__RemoveABtn.addEventListener('click', () => {
                Na__FogPlaneSystem__RemovePlane('A');
                Na__RenderLoop__RequestRender();
            });
        }
        if (Na__FogUi__RemoveBBtn) {
            Na__FogUi__RemoveBBtn.addEventListener('click', () => {
                Na__FogPlaneSystem__RemovePlane('B');
                Na__RenderLoop__RequestRender();
            });
        }

        if (Na__FogUi__SaveBtn) {
            Na__FogUi__SaveBtn.addEventListener('click', async () => {
                const confirmed = await Na__AppUtils__ConfirmDialog__Show({
                    title        : 'Overwrite Saved Fog Settings?',
                    message      : 'This will overwrite the fog plane positions and falloff stored in this project.',
                    confirmLabel : 'Overwrite',
                    isDestructive: true
                });
                if (!confirmed) return;
                Na__FogPlaneSystem__SaveSettings();
            });
        }

        window.addEventListener('na-fogplane-state-changed', (event) => {
            const detail = event.detail || {};
            if (detail.slot === 'A' && Na__FogUi__RemoveABtn) {
                Na__FogUi__RemoveABtn.style.display = detail.active ? '' : 'none';
            }
            if (detail.slot === 'B' && Na__FogUi__RemoveBBtn) {
                Na__FogUi__RemoveBBtn.style.display = detail.active ? '' : 'none';
            }
        });

        // SYNC ON SAVED-SETTINGS LOAD | Fog system loads project.json async,
        // after this UI initialises — re-sync slider + toggle when it completes.
        window.addEventListener('na-fogplane-settings-loaded', () => {
            Na__FogUi__SyncControlsFromSystem();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Apply Defaults
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Apply Config Defaults to DOM Elements
    // ------------------------------------------------------------
    function Na__FogUi__ApplyDefaults(config) {
        const falloffConfig = config?.FogPlane__Falloff__Config;
        if (falloffConfig && falloffConfig.FogPlane__Falloff__Config__StepsMm) {
            Na__FogUi__FalloffSteps = falloffConfig.FogPlane__Falloff__Config__StepsMm;
        }

        const savedFalloffMm  = Na__FogPlaneSystem__GetFalloffMm();
        const matchIndex       = Na__FogUi__FalloffSteps.indexOf(savedFalloffMm);
        Na__FogUi__FalloffIndex = matchIndex >= 0
            ? matchIndex
            : (falloffConfig?.FogPlane__Falloff__Config__DefaultIndex ?? 2);

        if (Na__FogUi__FalloffSlider) {
            Na__FogUi__FalloffSlider.min   = 0;
            Na__FogUi__FalloffSlider.max   = Na__FogUi__FalloffSteps.length - 1;
            Na__FogUi__FalloffSlider.step  = 1;
        }

        if (Na__FogUi__PlaneVisible) {
            Na__FogUi__PlaneVisible.checked = false;
        }

        if (Na__FogUi__RemoveABtn) Na__FogUi__RemoveABtn.style.display = 'none';
        if (Na__FogUi__RemoveBBtn) Na__FogUi__RemoveBBtn.style.display = 'none';

        Na__FogUi__SyncControlsFromSystem();                                 // <-- Set slider value, label, enable toggle
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch Fog Plane Config for UI Defaults
    // ------------------------------------------------------------
    async function Na__FogUi__LoadConfig() {
        try {
            const response = await fetch('./02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__Config.json');
            if (!response.ok) return null;
            const data = await response.json();
            return data.FogPlane__System__Config || null;
        } catch (err) {
            console.warn('[ValeVision3D] Fog plane UI config load error:', err);
            return null;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Fog Plane UI Controls
    // ------------------------------------------------------------
    async function Na__UiFeature__InitializeFogPlaneControls() {
        Na__FogUi__CacheDomElements();
        if (!Na__FogUi__ToggleBtn || !Na__FogUi__Panel) return;

        const config = await Na__FogUi__LoadConfig();
        Na__FogUi__ApplyDefaults(config);
        Na__FogUi__WireEvents();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Fog Plane UI Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeFogPlaneControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
