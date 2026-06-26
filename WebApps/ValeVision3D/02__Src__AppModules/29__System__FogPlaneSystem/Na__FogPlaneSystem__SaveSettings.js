// =============================================================================
// VALEVISION3D - FOG PLANE SYSTEM - SAVE SETTINGS
// =============================================================================
//
// FILE       : Na__FogPlaneSystem__SaveSettings.js
// NAMESPACE  : Na__FogPlane
// MODULE     : SaveSettings
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Per-project save/load for fog plane configuration — R2-first two-phase save
// CREATED    : 07-Apr-2026
//
// DESCRIPTION:
// - Saves FogPlane__Config data to project.json using the R2-first two-phase save:
//   R2 SSOT (Worker) first, then local disk mirror (Flask).
// - Loads FogPlane__Config data from project.json via Na__AppUtils__FetchProjectJson.
// - Data is persisted under the FogPlane__Config key in project.json.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Apr-2026 - Version 1.0.0
// - Initial implementation.
//
// 26-Jun-2026 - Version 1.1.0
// - Replaced GET-merge-POST-to-Flask with R2-first two-phase save via
//   Na__AppUtils__R2SaveProjectJson (R2 SSOT write, then Flask mirror).
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

    // MODULE IMPORTS | R2-First Save Utility
    // @delegate: ../03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js
    // ------------------------------------------------------------
    import { Na__AppUtils__R2SaveProjectJson } from '../03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Save Fog Settings
// -----------------------------------------------------------------------------

    // FUNCTION | Save Fog Plane Settings to Project JSON (R2-First)
    // ------------------------------------------------------------
    async function Na__FogPlane__SaveSettingsToProject(planeStateA, planeStateB, fogEnabled, falloffMm, showToast) {
        const toast       = showToast || (() => {});
        const projectCode = Na__AppUtils__GetProjectCodeFromUrl();

        if (!projectCode) {
            toast('No project loaded — cannot save fog settings.', true);
            return;
        }

        try {
            // FETCH EXISTING PROJECT DATA FOR MERGE
            const fetchUrl        = `${window.location.origin}/api/projects/${projectCode}`;
            const projectResponse = await fetch(fetchUrl);
            if (!projectResponse.ok) {
                toast(`Project not found: ${projectCode}`, true);
                return;
            }

            const projectData = await projectResponse.json();

            // MERGE FOG PLANE CONFIG
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

            // TWO-PHASE R2-FIRST SAVE
            await Na__AppUtils__R2SaveProjectJson(projectData, projectCode, toast);

            toast(`Fog settings saved to ${projectCode}`);
        } catch (error) {
            console.error('[ValeVision3D] Save fog settings error:', error);
            toast(`Save failed — ${error.message}`, true);
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
