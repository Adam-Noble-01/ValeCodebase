// =============================================================================
// VALEVISION3D - CAMERA UTILS - SAVE CAMERA SETTINGS
// =============================================================================
//
// FILE       : Na__UiFeature__SaveCameraSettings.js
// NAMESPACE  : Na__UiFeature
// MODULE     : SaveCameraSettings
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Localhost-only camera position save action for the Dev Tools menu
// CREATED    : 24-Feb-2026
//
// DESCRIPTION:
// - Provides a save action inside the localhost-only Dev Tools menu that writes
//   the current camera position and orbit target back into the active project's
//   project.json via the local Flask API.
// - Fetches the existing project.json, merges Camera__DefaultPosition and
//   OrbitHelperCube__Position, then POSTs the updated document back.
// - Button is hidden on production (non-localhost) environments.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 24-Feb-2026 - Version 1.0.0
// - Extracted from index.html inline script block (lines 888-949).
// - Refactored closures: camera, controls, and showToast are now explicit
//   parameters rather than captured from the parent script scope.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Camera JSON Builder
    // ------------------------------------------------------------
    import { Na__UiFeature__BuildCameraJson } from './Na__UiFeature__CameraPosition__Controls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities
    // ------------------------------------------------------------
    import { Na__AppUtils__IsRunningOnLocalhost, Na__AppUtils__GetProjectCodeFromUrl } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Confirm Dialog (gates destructive write)
    // ------------------------------------------------------------
    import { Na__AppUtils__ConfirmDialog__Show } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Save Camera Settings
// -----------------------------------------------------------------------------

    // FUNCTION | Save Camera Settings to Project JSON (Localhost Only)
    // ------------------------------------------------------------
    async function Na__UiFeature__SaveCameraSettings(camera, controls, showToast) {
        const projectCode = Na__AppUtils__GetProjectCodeFromUrl();
        if (!projectCode) {
            showToast('No project loaded — cannot save camera settings.', true);
            return;
        }

        // CONFIRM | Block accidental overwrites of saved camera state
        const confirmed = await Na__AppUtils__ConfirmDialog__Show({
            title        : 'Overwrite Saved Camera?',
            message      : `This will overwrite the camera position and orbit target saved in ${projectCode}.`,
            confirmLabel : 'Overwrite',
            isDestructive: true
        });
        if (!confirmed) return;

        try {
            const cameraJsonString = Na__UiFeature__BuildCameraJson(
                camera,                                                      // <-- Current camera state
                controls,                                                    // <-- Current orbit controls
                4                                                            // <-- Decimal precision
            );
            const cameraData = JSON.parse(cameraJsonString);                 // <-- Parse built camera JSON

            const fetchUrl = `${window.location.origin}/api/projects/${projectCode}`;
            const projectResponse = await fetch(fetchUrl);                   // <-- Fetch existing project.json
            if (!projectResponse.ok) {
                showToast(`Project not found: ${projectCode}`, true);
                return;
            }

            const projectData = await projectResponse.json();                // <-- Parse project data

            // CLEANUP LEGACY CAMERA BLOCKS
            if (projectData.valeVision_Camera__DefaultPosition) {
                delete projectData.valeVision_Camera__DefaultPosition;        // <-- Remove legacy camera payload to avoid target precedence conflicts
            }
            if (projectData.Camera__DefaultPosition && projectData.Camera__DefaultPosition.Camera__DefaultTarget) {
                delete projectData.Camera__DefaultPosition.Camera__DefaultTarget; // <-- Remove deprecated target key from modern camera block
            }

            projectData.Camera__DefaultPosition  = cameraData.Camera__DefaultPosition;  // <-- Merge camera position
            projectData.OrbitHelperCube__Position = cameraData.OrbitHelperCube__Position; // <-- Merge orbit target

            const saveResponse = await fetch(fetchUrl, {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(projectData)                        // <-- Send merged project data
            });

            if (saveResponse.ok) {
                showToast(`Camera settings saved to ${projectCode}`);
            } else {
                const errorData = await saveResponse.json().catch(() => ({}));
                showToast(`Save failed: ${errorData.error || 'Unknown error'}`, true);
            }
        } catch (error) {
            console.error('[ValeVision3D] Save camera settings error:', error);
            showToast('Save failed — server unreachable.', true);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Localhost-Only Camera Configurations Submenu
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeSaveCameraButton(camera, controls, showToast) {
        if (!Na__AppUtils__IsRunningOnLocalhost()) return;                   // <-- Only on localhost

        const menuItem  = document.getElementById('naCameraConfigItem');     // <-- Wrapper for whole Camera Configurations submenu
        const toggleBtn = document.getElementById('naCameraConfigToggle');   // <-- Submenu open/close button
        const panel     = document.getElementById('naCameraConfigPanel');    // <-- Submenu panel container
        const button    = document.getElementById('naSaveCameraSettingsButton');
        if (!menuItem || !button) return;

        menuItem.style.display = '';                                         // <-- Reveal the Dev Tools menu item

        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                const isOpen = panel.classList.contains('is-open');
                panel.classList.toggle('is-open', !isOpen);                  // <-- Toggle submenu open state
                toggleBtn.setAttribute('aria-expanded', String(!isOpen));    // <-- Sync accessibility state
            });
        }

        button.addEventListener('click', () => Na__UiFeature__SaveCameraSettings(camera, controls, showToast)); // <-- Wire up save handler
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Save Camera Settings API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeSaveCameraButton
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
