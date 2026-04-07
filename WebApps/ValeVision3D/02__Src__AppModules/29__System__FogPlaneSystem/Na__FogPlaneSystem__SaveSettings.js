// =============================================================================
// VALEVISION3D - FOG PLANE SYSTEM - SAVE SETTINGS
// =============================================================================
//
// FILE       : Na__FogPlaneSystem__SaveSettings.js
// NAMESPACE  : Na__FogPlane
// MODULE     : SaveSettings
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Per-project save/load for fog plane configuration via Flask API
// CREATED    : 07-Apr-2026
//
// DESCRIPTION:
// - Saves and loads FogPlane__Config data to the project.json file using the
//   same GET-merge-POST pattern as the camera and grid save systems.
// - Data is persisted under the FogPlane__Config key in project.json.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities
    // ------------------------------------------------------------
    import {
        Na__AppUtils__IsRunningOnLocalhost,
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__FetchProjectJson
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Save Fog Settings
// -----------------------------------------------------------------------------

    // FUNCTION | Save Fog Plane Settings to Project JSON
    // ------------------------------------------------------------
    async function Na__FogPlane__SaveSettingsToProject(planeStateA, planeStateB, fogEnabled, falloffMm, showToast) {
        const toast       = showToast || (() => {});
        const projectCode = Na__AppUtils__GetProjectCodeFromUrl();

        if (!projectCode) {
            toast('No project loaded — cannot save fog settings.', true);
            return;
        }

        try {
            const fetchUrl        = `${window.location.origin}/api/projects/${projectCode}`;
            const projectResponse = await fetch(fetchUrl);
            if (!projectResponse.ok) {
                toast(`Project not found: ${projectCode}`, true);
                return;
            }

            const projectData = await projectResponse.json();

            projectData.FogPlane__Config = {
                "FogPlane__Config__Description"       : "Per-project fog plane positions and fall-off settings.",
                "FogPlane__Config__Enabled"            : Boolean(fogEnabled),
                "FogPlane__Config__FalloffDistanceMm"  : falloffMm,
                "FogPlane__Config__PlaneA": {
                    "FogPlane__Config__PlaneA__Active"     : Boolean(planeStateA && planeStateA.active),
                    "FogPlane__Config__PlaneA__PositionMm" : (planeStateA && planeStateA.positionMm) || 0,
                    "FogPlane__Config__PlaneA__NormalX"    : (planeStateA && planeStateA.normal) ? planeStateA.normal.x : 1.0,
                    "FogPlane__Config__PlaneA__NormalZ"    : (planeStateA && planeStateA.normal) ? planeStateA.normal.z : 0.0
                },
                "FogPlane__Config__PlaneB": {
                    "FogPlane__Config__PlaneB__Active"     : Boolean(planeStateB && planeStateB.active),
                    "FogPlane__Config__PlaneB__PositionMm" : (planeStateB && planeStateB.positionMm) || 0,
                    "FogPlane__Config__PlaneB__NormalX"    : (planeStateB && planeStateB.normal) ? planeStateB.normal.x : 0.0,
                    "FogPlane__Config__PlaneB__NormalZ"    : (planeStateB && planeStateB.normal) ? planeStateB.normal.z : 1.0
                }
            };

            const saveResponse = await fetch(fetchUrl, {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(projectData)
            });

            if (saveResponse.ok) {
                toast(`Fog settings saved to ${projectCode}`);
            } else {
                const errorData = await saveResponse.json().catch(() => ({}));
                toast(`Save failed: ${errorData.error || 'Unknown error'}`, true);
            }
        } catch (error) {
            console.error('[ValeVision3D] Save fog settings error:', error);
            toast('Save failed — server unreachable.', true);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Load Fog Settings
// -----------------------------------------------------------------------------

    // FUNCTION | Load Fog Plane Settings from Project JSON
    // ------------------------------------------------------------
    async function Na__FogPlane__LoadSettingsFromProject() {
        try {
            const projectCode = Na__AppUtils__GetProjectCodeFromUrl();
            if (!projectCode) return null;

            const projectData = await Na__AppUtils__FetchProjectJson(projectCode); // <-- Uses GH Pages URL on production, Flask API on localhost
            return projectData.FogPlane__Config || null;
        } catch (err) {
            console.warn('[ValeVision3D] Could not load fog settings from project:', err);
            return null;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Save Settings API
    // ------------------------------------------------------------
    export {
        Na__FogPlane__SaveSettingsToProject,
        Na__FogPlane__LoadSettingsFromProject
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
