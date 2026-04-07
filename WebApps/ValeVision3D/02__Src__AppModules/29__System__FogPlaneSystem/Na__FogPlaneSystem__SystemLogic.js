// =============================================================================
// VALEVISION3D - FOG PLANE SYSTEM - SYSTEM LOGIC
// =============================================================================
//
// FILE       : Na__FogPlaneSystem__SystemLogic.js
// NAMESPACE  : Na__FogPlaneSystem
// MODULE     : SystemLogic
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Main orchestrator for the Fog Plane System
// CREATED    : 07-Apr-2026
//
// DESCRIPTION:
// - Loads the system config JSON and initialises all sub-modules.
// - Coordinates state between the fog shader, plane creation, camera
//   constraint, and save/load sub-modules.
// - Provides the per-frame update function and overlay render function
//   for the render loop in Na__AppFlow__LoadingSequence.js.
// - Exposes a single Na__FogPlaneSystem__Initialize entry point.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Fog Shader Effect
    // @delegate: ./Na__FogPlaneSystem__FogShaderEffect.js
    // ------------------------------------------------------------
    import {
        Na__FogPlane__CreateFogPass,
        Na__FogPlane__UpdateFogPassPerFrame,
        Na__FogPlane__SetPlaneUniforms,
        Na__FogPlane__SetFalloffDistance,
        Na__FogPlane__SetEnabled
    } from './Na__FogPlaneSystem__FogShaderEffect.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Plane Creation
    // @delegate: ./Na__FogPlaneSystem__PlaneCreation.js
    // ------------------------------------------------------------
    import {
        Na__FogPlane__InitializePlaneCreation,
        Na__FogPlane__StartFaceSelection,
        Na__FogPlane__RemovePlane,
        Na__FogPlane__SetPlanesVisible,
        Na__FogPlane__GetPlaneState,
        Na__FogPlane__RestorePlaneFromData,
        Na__FogPlane__HasActivePlanes,
        NA__FOGPLANE__OVERLAY_LAYER
    } from './Na__FogPlaneSystem__PlaneCreation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Camera Constraint
    // @delegate: ./Na__FogPlaneSystem__CameraConstraint.js
    // ------------------------------------------------------------
    import {
        Na__FogPlane__InitializeCameraConstraint,
        Na__FogPlane__SetConstraintEnabled,
        Na__FogPlane__UpdateConstraintPlane,
        Na__FogPlane__ApplyCameraConstraint
    } from './Na__FogPlaneSystem__CameraConstraint.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Save Settings
    // @delegate: ./Na__FogPlaneSystem__SaveSettings.js
    // ------------------------------------------------------------
    import {
        Na__FogPlane__SaveSettingsToProject,
        Na__FogPlane__LoadSettingsFromProject
    } from './Na__FogPlaneSystem__SaveSettings.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Unit Conversion
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | System State
    // ------------------------------------------------------------
    let Na__FogPlane__SysConfig     = null;                                      // <-- Parsed system config JSON
    let Na__FogPlane__SysFogPass    = null;                                      // <-- ShaderPass instance
    let Na__FogPlane__SysFogEnabled = false;                                     // <-- Master fog toggle
    let Na__FogPlane__SysFalloffMm  = 1000;                                      // <-- Current falloff in mm
    let Na__FogPlane__SysScene      = null;                                      // <-- Scene reference
    let Na__FogPlane__SysCamera     = null;                                      // <-- Camera reference
    let Na__FogPlane__SysRenderer   = null;                                      // <-- Renderer reference
    let Na__FogPlane__SysControls   = null;                                      // <-- Orbit controls reference
    let Na__FogPlane__SysShowToast  = null;                                      // <-- Toast notification callback
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Loader
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch Fog Plane System Config JSON
    // ------------------------------------------------------------
    async function Na__FogPlane__LoadConfig() {
        try {
            const response = await fetch('./02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__Config.json');
            if (!response.ok) throw new Error(`Config fetch failed: ${response.status}`);
            const data = await response.json();
            return data.FogPlane__System__Config || null;
        } catch (err) {
            console.error('[ValeVision3D] Fog plane config load error:', err);
            return null;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plane Drag Callback
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Handle Plane Drag Updates (Sync Shader + Constraint)
    // ------------------------------------------------------------
    function Na__FogPlane__OnPlaneDragUpdate(slotId, slotState) {
        if (!Na__FogPlane__SysFogPass) return;

        Na__FogPlane__SetPlaneUniforms(
            Na__FogPlane__SysFogPass,
            slotId,
            slotState.positionUnits || slotState.anchorPoint,
            slotState.normal,
            slotState.active
        );

        Na__FogPlane__UpdateConstraintPlane(
            slotId,
            slotState.active,
            slotState.positionUnits || slotState.anchorPoint,
            slotState.normal
        );

        Na__FogPlane__SetConstraintEnabled(Na__FogPlane__HasActivePlanes());
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per-Frame Update
// -----------------------------------------------------------------------------

    // FUNCTION | Per-Frame Fog System Update (Camera Uniforms + Constraint)
    // ------------------------------------------------------------
    function Na__FogPlaneSystem__UpdatePerFrame(camera, controls) {
        Na__FogPlane__UpdateFogPassPerFrame(Na__FogPlane__SysFogPass, camera);
        Na__FogPlane__ApplyCameraConstraint(camera, controls);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Overlay Render
// -----------------------------------------------------------------------------

    // FUNCTION | Render Layer 1 Overlay (Fog Planes + Elevation Planes)
    // ------------------------------------------------------------
    function Na__FogPlaneSystem__RenderOverlay(renderer, scene, camera) {
        camera.layers.set(NA__FOGPLANE__OVERLAY_LAYER);
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(scene, camera);
        camera.layers.enableAll();
        renderer.autoClear = true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Setters (called from UI Controls)
// -----------------------------------------------------------------------------

    // FUNCTION | Toggle Fog Effect On/Off
    // ------------------------------------------------------------
    function Na__FogPlaneSystem__SetFogEnabled(enabled) {
        Na__FogPlane__SysFogEnabled = enabled;
        Na__FogPlane__SetEnabled(Na__FogPlane__SysFogPass, enabled);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Fog Fall-Off Distance
    // ------------------------------------------------------------
    function Na__FogPlaneSystem__SetFalloffMm(distanceMm) {
        Na__FogPlane__SysFalloffMm = distanceMm;
        Na__FogPlane__SetFalloffDistance(Na__FogPlane__SysFogPass, distanceMm);
    }
    // ------------------------------------------------------------


    // FUNCTION | Enter Face Selection Mode
    // ------------------------------------------------------------
    function Na__FogPlaneSystem__SelectFace(slotId) {
        Na__FogPlane__StartFaceSelection(slotId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove a Fog Plane
    // ------------------------------------------------------------
    function Na__FogPlaneSystem__RemovePlane(slotId) {
        Na__FogPlane__RemovePlane(slotId);
        Na__FogPlane__SetPlaneUniforms(Na__FogPlane__SysFogPass, slotId, null, null, false);
        Na__FogPlane__UpdateConstraintPlane(slotId, false, null, null);
        Na__FogPlane__SetConstraintEnabled(Na__FogPlane__HasActivePlanes());
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle Plane Mesh Visibility
    // ------------------------------------------------------------
    function Na__FogPlaneSystem__SetPlanesVisible(visible) {
        Na__FogPlane__SetPlanesVisible(visible);
    }
    // ------------------------------------------------------------


    // FUNCTION | Save Current Fog Configuration
    // ------------------------------------------------------------
    async function Na__FogPlaneSystem__SaveSettings() {
        const stateA = Na__FogPlane__GetPlaneState('A');
        const stateB = Na__FogPlane__GetPlaneState('B');
        await Na__FogPlane__SaveSettingsToProject(stateA, stateB, Na__FogPlane__SysFogEnabled, Na__FogPlane__SysFalloffMm, Na__FogPlane__SysShowToast);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Fog Pass (for pipeline wiring)
    // ------------------------------------------------------------
    function Na__FogPlaneSystem__GetFogPass() {
        return Na__FogPlane__SysFogPass;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Falloff in Mm
    // ------------------------------------------------------------
    function Na__FogPlaneSystem__GetFalloffMm() {
        return Na__FogPlane__SysFalloffMm;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Fog Enabled State
    // ------------------------------------------------------------
    function Na__FogPlaneSystem__IsFogEnabled() {
        return Na__FogPlane__SysFogEnabled;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Clipping Plane Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Build Renderer Clipping Planes for Active Fog Planes
    // ------------------------------------------------------------
    function Na__FogPlaneSystem__GetClippingPlanes() {
        const planes = [];
        const falloffUnits = Na__Math__ConvertMmToUnits(Na__FogPlane__SysFalloffMm);

        for (const id of ['A', 'B']) {
            const state = Na__FogPlane__GetPlaneState(id);
            if (!state || !state.active) continue;

            const normal   = state.normal.clone();
            const position = state.positionUnits.clone();
            const offset   = position.dot(normal) - falloffUnits;
            planes.push(new THREE.Plane(normal, -offset));
        }
        return planes;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Main Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize the Fog Plane System
    // ------------------------------------------------------------
    async function Na__FogPlaneSystem__Initialize(context) {
        const {
            scene, camera, renderer, controls,
            modelRoot, showToast
        } = context;

        Na__FogPlane__SysScene    = scene;
        Na__FogPlane__SysCamera   = camera;
        Na__FogPlane__SysRenderer = renderer;
        Na__FogPlane__SysControls = controls;
        Na__FogPlane__SysShowToast = showToast || null;

        Na__FogPlane__SysConfig = await Na__FogPlane__LoadConfig();
        if (!Na__FogPlane__SysConfig) {
            console.warn('[ValeVision3D] Fog plane system config not loaded. System disabled.');
            return;
        }

        const effectConfig  = Na__FogPlane__SysConfig.FogPlane__Effect__Config  || {};
        const falloffConfig = Na__FogPlane__SysConfig.FogPlane__Falloff__Config || {};
        const cameraConfig  = Na__FogPlane__SysConfig.FogPlane__Camera__Config  || {};

        Na__FogPlane__SysFalloffMm = falloffConfig.FogPlane__Falloff__Config__DefaultMm || 1000;

        Na__FogPlane__SysFogPass = Na__FogPlane__CreateFogPass({
            ...effectConfig,
            FogPlane__Falloff__Config__DefaultMm: Na__FogPlane__SysFalloffMm
        });

        Na__FogPlane__InitializePlaneCreation(
            scene, camera, renderer, controls, modelRoot,
            Na__FogPlane__SysConfig,
            Na__FogPlane__OnPlaneDragUpdate
        );

        Na__FogPlane__InitializeCameraConstraint(
            cameraConfig.FogPlane__Camera__Config__PaddingMm || 200
        );

        const savedConfig = await Na__FogPlane__LoadSettingsFromProject();
        if (savedConfig) {
            Na__FogPlane__SysFogEnabled = Boolean(savedConfig.FogPlane__Config__Enabled);
            Na__FogPlane__SysFalloffMm  = savedConfig.FogPlane__Config__FalloffDistanceMm || Na__FogPlane__SysFalloffMm;

            Na__FogPlane__SetEnabled(Na__FogPlane__SysFogPass, Na__FogPlane__SysFogEnabled);
            Na__FogPlane__SetFalloffDistance(Na__FogPlane__SysFogPass, Na__FogPlane__SysFalloffMm);

            if (savedConfig.FogPlane__Config__PlaneA) {
                Na__FogPlane__RestorePlaneFromData('A', {
                    active     : savedConfig.FogPlane__Config__PlaneA.FogPlane__Config__PlaneA__Active,
                    positionMm : savedConfig.FogPlane__Config__PlaneA.FogPlane__Config__PlaneA__PositionMm,
                    normalX    : savedConfig.FogPlane__Config__PlaneA.FogPlane__Config__PlaneA__NormalX,
                    normalZ    : savedConfig.FogPlane__Config__PlaneA.FogPlane__Config__PlaneA__NormalZ
                });
            }
            if (savedConfig.FogPlane__Config__PlaneB) {
                Na__FogPlane__RestorePlaneFromData('B', {
                    active     : savedConfig.FogPlane__Config__PlaneB.FogPlane__Config__PlaneB__Active,
                    positionMm : savedConfig.FogPlane__Config__PlaneB.FogPlane__Config__PlaneB__PositionMm,
                    normalX    : savedConfig.FogPlane__Config__PlaneB.FogPlane__Config__PlaneB__NormalX,
                    normalZ    : savedConfig.FogPlane__Config__PlaneB.FogPlane__Config__PlaneB__NormalZ
                });
            }

            Na__FogPlane__SetConstraintEnabled(Na__FogPlane__HasActivePlanes());
            Na__FogPlane__SetPlanesVisible(false);
        }

        console.log('[ValeVision3D] Fog Plane System initialized');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Fog Plane System API
    // ------------------------------------------------------------
    export {
        Na__FogPlaneSystem__Initialize,
        Na__FogPlaneSystem__UpdatePerFrame,
        Na__FogPlaneSystem__RenderOverlay,
        Na__FogPlaneSystem__GetFogPass,
        Na__FogPlaneSystem__SetFogEnabled,
        Na__FogPlaneSystem__SetFalloffMm,
        Na__FogPlaneSystem__SelectFace,
        Na__FogPlaneSystem__RemovePlane,
        Na__FogPlaneSystem__SetPlanesVisible,
        Na__FogPlaneSystem__SaveSettings,
        Na__FogPlaneSystem__IsFogEnabled,
        Na__FogPlaneSystem__GetFalloffMm,
        Na__FogPlaneSystem__GetClippingPlanes,
        NA__FOGPLANE__OVERLAY_LAYER
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
