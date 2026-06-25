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
//              and dispatch na-presentation-mode-scenes-loaded
// CREATED    : 25-Jun-2026
//
// DESCRIPTION:
// - Entry point called by Na__AppFlow__LoadingSequence.js after project.json
//   is loaded, whenever ValeVison3D__SketchUpCameraData is present and there
//   are no explicit PresentationMode__SavedCameraScenes in project.json.
// - Orchestrates LoadSceneData -> ConvertSceneData -> SetActiveConfig.
// - Dispatches na-presentation-mode-scenes-loaded to trigger the UI carousel.
// - Does not overwrite explicit presentation scenes; only fills the gap when
//   none exist.
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
        Na__SketchUp__LoadSceneData__ResolveSceneUrls
    } from './Na__SketchUp__LoadSceneData__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scene Data Converter
    // @delegate: ./Na__SketchUp__ConvertSceneData__.js
    // ------------------------------------------------------------
    import {
        Na__SketchUp__ConvertSceneData__ConvertBlock
    } from './Na__SketchUp__ConvertSceneData__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Presentation Mode Scene Data Store
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__ProjectJson__HasValidSavedScenes,
        Na__PresentationMode__ProjectJson__SetActiveConfig
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

        const resolvedUrls = Na__SketchUp__LoadSceneData__ResolveSceneUrls(block, projectCode);

        const savedScenesBlock = Na__SketchUp__ConvertSceneData__ConvertBlock(block, resolvedUrls);
        if (!savedScenesBlock) return false;                                  // <-- Conversion produced no valid scenes

        const wrappedConfig = {
            PresentationMode__SavedCameraScenes: savedScenesBlock            // <-- Wrap in root key for SetActiveConfig
        };

        Na__PresentationMode__ProjectJson__SetActiveConfig(
            { PresentationMode__SavedCameraScenes: savedScenesBlock },
            projectCode
        );

        window.dispatchEvent(new CustomEvent('na-presentation-mode-scenes-loaded', {
            detail: {
                config      : wrappedConfig,
                projectCode : projectCode,
                source      : 'SketchUpCameraData'
            }
        }));

        console.log(`[Na__SketchUp__AnimationScene] Built ${savedScenesBlock.PresentationMode__SavedCameraScenes__Scenes.length} scene(s) from SketchUp camera data for project: ${projectCode}`);

        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Animation Scene Data Bridge API
    // ------------------------------------------------------------
    export {
        Na__SketchUp__AnimationScene__TryBuildScenesFromSketchUp
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
