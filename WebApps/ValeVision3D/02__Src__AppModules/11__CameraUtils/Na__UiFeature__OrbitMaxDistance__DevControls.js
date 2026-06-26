// =============================================================================
// VALEVISION3D - CAMERA UTILS - ORBIT MAX DISTANCE DEV CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__OrbitMaxDistance__DevControls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : OrbitMaxDistance DevControls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Dev Tools panel for per-project orbit max zoom radius override
// CREATED    : 29-Apr-2026
//
// DESCRIPTION:
// - Adds a localhost-only Dev Tools dropdown panel to view, apply, save and
//   clear a per-project orbit max zoom distance (radius from helper cube, mm).
// - Apply Live: mutates controls.maxDistance instantly via the nav bundle
//   setter, with no persistence to project.json.
// - Save to Project: writes Navmode__OrbitMaxDistanceMm via R2-first two-phase
//   save (Worker SSOT, then Flask mirror).
// - Clear from Project: deletes Navmode__OrbitMaxDistanceMm from project.json
//   via R2-first save, and resets controls.maxDistance to the per-device default.
// - Per-project override applies equally to PC and iPad devices; the iPad
//   bonus multiplier does NOT stack on top of a project override (decision
//   confirmed before implementation).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 29-Apr-2026 - Version 1.0.0
// - Initial implementation alongside iPad +50% bonus multiplier and AppFlow
//   project.json override read.
//
// 26-Jun-2026 - Version 1.1.0
// - Replaced GET-merge-POST-to-Flask with R2-first two-phase save via
//   Na__AppUtils__R2SaveProjectJson (R2 SSOT write, then Flask mirror).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Math Utilities (Mm <-> Units)
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits, Na__Math__ConvertUnitsToMm } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities
    // ------------------------------------------------------------
    import { Na__AppUtils__IsRunningOnLocalhost, Na__AppUtils__GetProjectCodeFromUrl } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | R2-First Save Utility
    // @delegate: ../03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js
    // ------------------------------------------------------------
    import { Na__AppUtils__R2SaveProjectJson } from '../03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Confirm Dialog (gates destructive write)
    // ------------------------------------------------------------
    import { Na__AppUtils__ConfirmDialog__Show } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM IDs
    // ------------------------------------------------------------
    // Note: wrapper / submenu open-close are owned by the Camera Configurations
    // submenu (see Na__UiFeature__SaveCameraSettings.js); this module only
    // owns the inline controls flattened inside that panel.
    const Na__OrbitMaxDistance__CurrentId     = 'naOrbitMaxDistanceCurrent';     // <-- Live effective max display
    const Na__OrbitMaxDistance__InputId       = 'naOrbitMaxDistanceInput';       // <-- Number input (mm)
    const Na__OrbitMaxDistance__ApplyBtnId    = 'naOrbitMaxDistanceApply';       // <-- Apply Live button
    const Na__OrbitMaxDistance__SaveBtnId     = 'naOrbitMaxDistanceSave';        // <-- Save to Project button
    const Na__OrbitMaxDistance__ClearBtnId    = 'naOrbitMaxDistanceClear';       // <-- Clear from Project button
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Project JSON Key
    // ------------------------------------------------------------
    const Na__OrbitMaxDistance__ProjectJsonKey = 'Navmode__OrbitMaxDistanceMm';  // <-- project.json override key (mm)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Compute Per-Device Default Max Distance (Mm)
    // ------------------------------------------------------------
    function Na__OrbitMaxDistance__ComputeDeviceDefaultMm(deviceConfig) {
        if (!deviceConfig || !deviceConfig.activeConfig) return null;            // <-- No device config available

        if (deviceConfig.isTouch) {
            const baseMm     = deviceConfig.activeConfig.Navmode__IpadControls__OrbitMaxDistanceMm;
            const multiplier = Number.isFinite(deviceConfig.activeConfig.Navmode__IpadControls__OrbitMaxDistanceMultiplier)
                && deviceConfig.activeConfig.Navmode__IpadControls__OrbitMaxDistanceMultiplier > 0
                ? deviceConfig.activeConfig.Navmode__IpadControls__OrbitMaxDistanceMultiplier
                : 1;
            return Number.isFinite(baseMm) ? baseMm * multiplier : null;         // <-- iPad: base * bonus multiplier
        }

        const mouseMm = deviceConfig.activeConfig.Navmode__MouseControls__OrbitMaxDistanceMm;
        return Number.isFinite(mouseMm) ? mouseMm : null;                        // <-- PC: raw mouse value
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Mm Value for Display
    // ------------------------------------------------------------
    function Na__OrbitMaxDistance__FormatMm(mmValue) {
        if (!Number.isFinite(mmValue)) return '—';                               // <-- Sentinel for unknown
        return `${Math.round(mmValue).toLocaleString()} mm`;                     // <-- Thousands-separated mm
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read Current Effective Max Distance (Mm)
    // ------------------------------------------------------------
    function Na__OrbitMaxDistance__ReadCurrentMm(controls) {
        if (!controls || !Number.isFinite(controls.maxDistance)) return null;
        return Na__Math__ConvertUnitsToMm(controls.maxDistance);                 // <-- Live snapshot of current cap
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Refresh Effective Max Display
    // ------------------------------------------------------------
    function Na__OrbitMaxDistance__RefreshDisplay(controls, currentEl) {
        if (!currentEl) return;
        currentEl.textContent = Na__OrbitMaxDistance__FormatMm(
            Na__OrbitMaxDistance__ReadCurrentMm(controls)
        );
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Apply / Save / Clear Actions
// -----------------------------------------------------------------------------

    // FUNCTION | Apply Override Value Live (No Persistence)
    // ------------------------------------------------------------
    function Na__OrbitMaxDistance__ApplyLive(setMaxDistanceMm, mmValue, controls, currentEl, showToast) {
        if (!Number.isFinite(mmValue) || mmValue <= 0) {
            if (showToast) showToast('Enter a positive value in mm.', true);
            return;
        }
        if (typeof setMaxDistanceMm !== 'function') {
            if (showToast) showToast('Nav bundle setter unavailable.', true);
            return;
        }

        setMaxDistanceMm(mmValue);                                               // <-- Mutate controls.maxDistance via bundle setter
        Na__OrbitMaxDistance__RefreshDisplay(controls, currentEl);               // <-- Sync effective display
        if (showToast) showToast(`Orbit max set to ${Math.round(mmValue).toLocaleString()} mm (live).`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Save Override Value to Project JSON — R2-First (Localhost Only)
    // ------------------------------------------------------------
    async function Na__OrbitMaxDistance__SaveToProject(mmValue, setMaxDistanceMm, controls, currentEl, showToast) {
        if (!Number.isFinite(mmValue) || mmValue <= 0) {
            if (showToast) showToast('Enter a positive value in mm before saving.', true);
            return;
        }

        const projectCode = Na__AppUtils__GetProjectCodeFromUrl();
        if (!projectCode) {
            if (showToast) showToast('No project loaded — cannot save override.', true);
            return;
        }

        // CONFIRM | Block accidental writes of the per-project orbit cap
        const confirmed = await Na__AppUtils__ConfirmDialog__Show({
            title        : 'Save Orbit Max Override?',
            message      : `Save orbit max ${Math.round(mmValue).toLocaleString()} mm into ${projectCode}? This will overwrite any existing override.`,
            confirmLabel : 'Save',
            isDestructive: true
        });
        if (!confirmed) return;

        try {
            // FETCH EXISTING PROJECT DATA FOR MERGE
            const fetchUrl        = `${window.location.origin}/api/projects/${projectCode}`;
            const projectResponse = await fetch(fetchUrl);
            if (!projectResponse.ok) {
                if (showToast) showToast(`Project not found: ${projectCode}`, true);
                return;
            }

            const projectData = await projectResponse.json();
            projectData[Na__OrbitMaxDistance__ProjectJsonKey] = mmValue;         // <-- Merge override key

            // TWO-PHASE R2-FIRST SAVE
            await Na__AppUtils__R2SaveProjectJson(projectData, projectCode, showToast);

            if (typeof setMaxDistanceMm === 'function') {
                setMaxDistanceMm(mmValue);                                       // <-- Reflect saved value live
            }
            Na__OrbitMaxDistance__RefreshDisplay(controls, currentEl);
            if (showToast) showToast(`Orbit max ${Math.round(mmValue).toLocaleString()} mm saved to ${projectCode}.`);
        } catch (error) {
            console.error('[ValeVision3D] Save orbit max distance error:', error);
            if (showToast) showToast(`Save failed — ${error.message}`, true);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear Override From Project JSON — R2-First (Restore Per-Device Default)
    // ------------------------------------------------------------
    async function Na__OrbitMaxDistance__ClearFromProject(setMaxDistanceMm, controls, currentEl, deviceConfig, inputEl, showToast) {
        const projectCode = Na__AppUtils__GetProjectCodeFromUrl();
        if (!projectCode) {
            if (showToast) showToast('No project loaded — nothing to clear.', true);
            return;
        }

        try {
            // FETCH EXISTING PROJECT DATA FOR MERGE
            const fetchUrl        = `${window.location.origin}/api/projects/${projectCode}`;
            const projectResponse = await fetch(fetchUrl);
            if (!projectResponse.ok) {
                if (showToast) showToast(`Project not found: ${projectCode}`, true);
                return;
            }

            const projectData = await projectResponse.json();
            const hadOverride = Object.prototype.hasOwnProperty.call(projectData, Na__OrbitMaxDistance__ProjectJsonKey);
            if (hadOverride) {
                delete projectData[Na__OrbitMaxDistance__ProjectJsonKey];        // <-- Remove override key
            }

            // TWO-PHASE R2-FIRST SAVE
            await Na__AppUtils__R2SaveProjectJson(projectData, projectCode, showToast);

            const defaultMm = Na__OrbitMaxDistance__ComputeDeviceDefaultMm(deviceConfig);
            if (Number.isFinite(defaultMm) && typeof setMaxDistanceMm === 'function') {
                setMaxDistanceMm(defaultMm);                                     // <-- Restore per-device default cap
            }
            Na__OrbitMaxDistance__RefreshDisplay(controls, currentEl);

            if (inputEl && Number.isFinite(defaultMm)) {
                inputEl.value = Math.round(defaultMm);                           // <-- Reset input to default
            }

            if (hadOverride) {
                if (showToast) showToast(`Override cleared from ${projectCode}.`);
            } else {
                if (showToast) showToast(`No override stored on ${projectCode} — defaults restored.`);
            }
        } catch (error) {
            console.error('[ValeVision3D] Clear orbit max distance error:', error);
            if (showToast) showToast(`Clear failed — ${error.message}`, true);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Localhost-Only Orbit Max Distance Dev Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeOrbitMaxDistanceDevControls(params) {
        const {
            controls,                                                            // <-- Active OrbitControls instance
            setMaxDistanceMm,                                                    // <-- Nav bundle setter
            showToast,                                                           // <-- Toast callback
            deviceConfig                                                         // <-- { activeConfig, isTouch }
        } = params || {};

        if (!Na__AppUtils__IsRunningOnLocalhost()) return;                       // <-- Hide on production

        // Wrapper visibility and submenu open/close are owned by the parent
        // Camera Configurations submenu (Na__UiFeature__SaveCameraSettings).
        // This module only owns the inline orbit-max controls.
        const currentEl  = document.getElementById(Na__OrbitMaxDistance__CurrentId);
        const inputEl    = document.getElementById(Na__OrbitMaxDistance__InputId);
        const applyBtn   = document.getElementById(Na__OrbitMaxDistance__ApplyBtnId);
        const saveBtn    = document.getElementById(Na__OrbitMaxDistance__SaveBtnId);
        const clearBtn   = document.getElementById(Na__OrbitMaxDistance__ClearBtnId);

        if (!inputEl || !applyBtn || !saveBtn || !clearBtn) return;              // <-- Required inline controls absent

        // Pre-populate input with current effective max (mm)
        const initialCurrentMm = Na__OrbitMaxDistance__ReadCurrentMm(controls);
        if (Number.isFinite(initialCurrentMm)) {
            inputEl.value = Math.round(initialCurrentMm);
        }

        Na__OrbitMaxDistance__RefreshDisplay(controls, currentEl);

        // Keep effective display in sync if controls.maxDistance changes elsewhere
        if (controls && typeof controls.addEventListener === 'function') {
            controls.addEventListener('change', () => {
                Na__OrbitMaxDistance__RefreshDisplay(controls, currentEl);
            });
        }

        applyBtn.addEventListener('click', () => {
            const mmValue = parseFloat(inputEl.value);
            Na__OrbitMaxDistance__ApplyLive(setMaxDistanceMm, mmValue, controls, currentEl, showToast);
        });

        saveBtn.addEventListener('click', () => {
            const mmValue = parseFloat(inputEl.value);
            Na__OrbitMaxDistance__SaveToProject(mmValue, setMaxDistanceMm, controls, currentEl, showToast);
        });

        clearBtn.addEventListener('click', () => {
            Na__OrbitMaxDistance__ClearFromProject(setMaxDistanceMm, controls, currentEl, deviceConfig, inputEl, showToast);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Orbit Max Distance Dev Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeOrbitMaxDistanceDevControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
