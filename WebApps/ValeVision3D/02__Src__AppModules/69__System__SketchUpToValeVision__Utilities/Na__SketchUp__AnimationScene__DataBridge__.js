// =============================================================================
// VALEVISION3D - SKETCHUP TO VALEVISION - ANIMATION SCENE DATA BRIDGE
// =============================================================================
//
// FILE       : Na__SketchUp__AnimationScene__DataBridge__.js
// NAMESPACE  : Na__SketchUp
// MODULE     : AnimationSceneDataBridge
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Validate, build the PresentationMode scene config from
//              ValeVison3D__SketchUpCameraData, call SetActiveConfig,
//              and dispatch na-presentation-mode-scenes-loaded.
//              Also resolves the single authoritative launch scene object
//              used by Na__AppFlow__LoadingSequence to set the boot camera.
// CREATED    : 25-Jun-2026
//
// DESCRIPTION:
// - Entry point called by Na__AppFlow__LoadingSequence.js after project.json
//   is loaded, whenever ValeVison3D__SketchUpCameraData is present and there
//   are no explicit PresentationMode__SavedCameraScenes in project.json.
// - Orchestrates LoadSceneData -> ConvertSceneData -> SetActiveConfig.
// - Dispatches na-presentation-mode-scenes-loaded with skipCameraApply: true
//   so the carousel registers its UI state but does NOT apply the camera yet;
//   the loading sequence applies the scene camera as the final authoritative step.
// - Does not overwrite explicit presentation scenes; only fills the gap when
//   none exist.
// - ResolveDefaultLaunchScene returns the first applicable scene object for
//   direct camera apply by the loading sequence. Works for all cases:
//   explicit PresentationMode scenes, SketchUp scenes (1 or more), or null.
//
// CONTRACT: Camera__DefaultPosition is superseded by SketchUp scene data when
// present. To change the launch camera, update the SketchUp scene and re-sync
// rather than using the Save Camera dev tool.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 25-Jun-2026 - Version 1.0.0
// - Initial placeholder scaffolding.
//
// 25-Jun-2026 - Version 1.0.1
// - Fixed the event contract: now dispatches detail.sceneConfig with the INNER
//   PresentationMode__SavedCameraScenes block (was detail.config + a wrapped
//   object), matching the carousel listener so auto-built scenes actually load.
// - Passes projectData.images to the loader for real dated-filename matching.
//
// 26-Jun-2026 - Version 1.1.0
// - Added Na__SketchUp__AnimationScene__ResolveDefaultLaunchScene: returns the
//   first scene object (explicit or SketchUp, including single-scene projects)
//   for authoritative boot-camera apply in Na__AppFlow__LoadingSequence.
// - Both dispatch sites now include skipCameraApply: true so the carousel
//   registers UI state without jumping the camera prematurely; the loading
//   sequence applies camera once, after the orbit cube resolves.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Scene Data Loader
    // @delegate: ./Na__SketchUp__LoadSceneData__.js
    // ------------------------------------------------------------
    import {
        Na__SketchUp__LoadSceneData__ReadBlock,
        Na__SketchUp__LoadSceneData__ResolveSceneFiles
    } from './Na__SketchUp__LoadSceneData__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scene Data Converter
    // @delegate: ./Na__SketchUp__ConvertSceneData__.js
    // ------------------------------------------------------------
    import {
        Na__SketchUp__ConvertSceneData__ConvertBlock,
        Na__SketchUp__ConvertSceneData__ConvertScene
    } from './Na__SketchUp__ConvertSceneData__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Presentation Mode Scene Data Store
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__ProjectJson__HasValidSavedScenes,
        Na__PresentationMode__ProjectJson__GetSavedCameraScenes,
        Na__PresentationMode__ProjectJson__GetDefaultScene
    } from '../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Attempt To Build Presentation Scenes From SketchUp Camera Data
    // ------------------------------------------------------------
    // projectData  {object} - parsed project.json
    // projectCode  {string} - the ?project= URL query value
    // Returns true if scenes were generated and loaded; false otherwise.
    // ------------------------------------------------------------
    function Na__SketchUp__AnimationScene__TryBuildScenesFromSketchUp(projectData, projectCode) {
        if (!projectData) return false;

        if (Na__PresentationMode__ProjectJson__HasValidSavedScenes(projectData)) {
            return false;                                                     // <-- Explicit scenes already present; do not override
        }

        const block = Na__SketchUp__LoadSceneData__ReadBlock(projectData);
        if (!block) return false;                                             // <-- No SketchUp camera data in this project

        const sceneFiles = Na__SketchUp__LoadSceneData__ResolveSceneFiles(block, projectData.images);

        const savedScenesBlock = Na__SketchUp__ConvertSceneData__ConvertBlock(block, sceneFiles);
        if (!savedScenesBlock) return false;                                  // <-- Conversion produced no valid scenes

        // DISPATCH IN THE SAME SHAPE AS THE EXPLICIT-SCENES PATH
        // skipCameraApply: true — carousel registers UI state (active config,
        // default scene, card list) but does NOT jump the camera. The loading
        // sequence applies the boot camera as the single authoritative step
        // after the orbit cube resolves (see Na__AppFlow__LoadingSequence.js).
        window.dispatchEvent(new CustomEvent('na-presentation-mode-scenes-loaded', {
            detail: {
                sceneConfig     : savedScenesBlock,                          // <-- Inner block (matches carousel listener)
                projectCode     : projectCode,
                source          : 'SketchUpCameraData',                      // <-- Provenance marker for diagnostics
                skipCameraApply : true                                        // <-- Defer camera apply to loading sequence
            }
        }));

        console.log(`[Na__SketchUp__AnimationScene] Built ${savedScenesBlock.PresentationMode__SavedCameraScenes__Scenes.length} scene(s) from SketchUp camera data for project: ${projectCode}`);

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Authoritative Default Launch Scene for Boot Camera Apply
    // ------------------------------------------------------------
    // Called by Na__AppFlow__LoadingSequence after the orbit cube resolves, to
    // obtain the single scene object that should be used as the initial camera.
    // Priority:
    //   1. Explicit PresentationMode__SavedCameraScenes -> GetDefaultScene
    //   2. ValeVison3D__SketchUpCameraData -> scenes[0] converted (1 or more scenes)
    //   3. null  -> loading sequence falls back to Camera__DefaultPosition
    //
    // projectData  {object} - parsed project.json
    // Returns { scene: <scene object>, source: 'explicit'|'sketchup' } or null.
    // ------------------------------------------------------------
    function Na__SketchUp__AnimationScene__ResolveDefaultLaunchScene(projectData) {
        if (!projectData) return null;

        // EXPLICIT PRESENTATION SCENES PATH
        if (Na__PresentationMode__ProjectJson__HasValidSavedScenes(projectData)) {
            const config       = Na__PresentationMode__ProjectJson__GetSavedCameraScenes(projectData);
            const defaultScene = Na__PresentationMode__ProjectJson__GetDefaultScene(config);
            if (defaultScene) return { scene: defaultScene, source: 'explicit' };  // <-- Use saved default scene
        }

        // SKETCHUP SCENE DATA PATH (1 or more scenes)
        const block = Na__SketchUp__LoadSceneData__ReadBlock(projectData);
        if (!block || !Array.isArray(block.scenes) || block.scenes.length === 0) return null;

        const firstEntry     = block.scenes[0];
        const convertedScene = Na__SketchUp__ConvertSceneData__ConvertScene(firstEntry, 0, ''); // <-- thumbName '' - not needed for camera apply
        if (!convertedScene) return null;                                         // <-- Invalid camera data on first scene

        return { scene: convertedScene, source: 'sketchup' };                    // <-- First SketchUp scene as boot camera
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Animation Scene Data Bridge API
    // ------------------------------------------------------------
    export {
        Na__SketchUp__AnimationScene__TryBuildScenesFromSketchUp,
        Na__SketchUp__AnimationScene__ResolveDefaultLaunchScene
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
