// =============================================================================
// VALEVISION3D - PRESENTATION MODE - DEV MENU SCENE PERSISTENCE
// =============================================================================
//
// FILE       : Na__PresentationMode__DevMenu__ScenePersistence__.js
// NAMESPACE  : Na__PresentationMode
// MODULE     : PresentationMode - Dev Menu Scene Persistence
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The two writes the Presentation Scenes editor makes: the
//              project.json save (R2-first) and the per-scene thumbnail upload
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - SaveScenesToProject GET-merges the live project.json from Flask, replaces
//   the whole PresentationMode__SavedCameraScenes block (scenes AND groups ride
//   in the same object) plus the CrossSection__SceneData block when one has
//   been loaded or captured, then hands the document to the two-phase R2-first
//   save utility (R2 SSOT write, then Flask mirror).
// - RegenerateThumbnail renders the Three.js composer to a small WebP and
//   uploads it R2-first through the shared asset route (R2 SSOT write, then
//   Flask mirror), the same path the Floor Plan and Elevation editors use.
// - CaptureCrossSectionIfEnabled binds the live section geometry and style to
//   a scene while the Capture Cross Sections toggle is on.
// - Localhost-only by construction: every caller is gated behind the dev menu.
//
// INTEGRATION:
// - Imported by Na__PresentationMode__DevMenu__SceneEditor.js only.
// - Uses Na__AppUtils__R2SaveProjectJson for the write and the thumbnail
//   renderer module for the WebP.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : ValeVision3D's own scene editor (regions "Thumbnail Regeneration" and
//                   "R2-First Save", v1.2.0); no TrueVision counterpart
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.17.0
// - Parity        : new
// - Divergences   : TrueVision merges one key through its worker; ValeVision keeps its whole-document
//                   R2SaveProjectJson path. Thumbnails no longer diverge - both write to R2 first.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.0.0
// - Initial split from the scene editor during port Phase 1. Logic unchanged
//   from scene editor v1.2.0 apart from taking projectCode and showToast as
//   arguments.
//
// 10-Sep-2026 - Version 1.1.0
// - RegenerateThumbnail now calls Na__PresentationMode__Thumbnail__CaptureAndUpload
//   (R2 write, then Flask mirror) instead of POSTing to the Flask-only
//   presentation-thumbnail endpoint. The old path left the WebP on the dev
//   machine, so R2 had no object and the live carousel fell back to GH Pages,
//   which only had the image once the local mirror was committed and pushed.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Scene Data Helpers
    // @delegate: ./Na__PresentationMode__ProjectJson__SceneData.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__ProjectJson__GetActiveConfig
    } from './Na__PresentationMode__ProjectJson__SceneData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Cross Section Per-Scene Bindings (Capture Toggle)
    // @delegate: ../41__System__CrossSectionView/Na__CrossSectionView__SceneData.js
    // ------------------------------------------------------------
    import {
        Na__SectSceneData__IsCaptureEnabled,
        Na__SectSceneData__CaptureForScene,
        Na__SectSceneData__GetProjectBlock
    } from '../41__System__CrossSectionView/Na__CrossSectionView__SceneData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Thumbnail Renderer
    // @delegate: ./Na__PresentationMode__Thumbnail__Renderer.js
    // ------------------------------------------------------------
    import { Na__PresentationMode__Thumbnail__CaptureAndUpload } from './Na__PresentationMode__Thumbnail__Renderer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | R2-First Save Utility
    // @delegate: ../03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js
    // ------------------------------------------------------------
    import { Na__AppUtils__R2SaveProjectJson } from '../03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cross Section Capture
// -----------------------------------------------------------------------------

    // FUNCTION | Capture Live Cross Section Against a Scene (Toggle-Gated)
    // ------------------------------------------------------------
    // When the Capture Cross Sections toggle is ON, bind the live section
    // geometry + fill/line style to the given scene before R2 save. Without
    // this, Save Scene / Save All would re-write the stale block and drop
    // any style changes made after the last Update Camera.
    // ------------------------------------------------------------
    function Na__PresentationMode__DevMenu__CaptureCrossSectionIfEnabled(scene) {
        if (!scene || !Na__SectSceneData__IsCaptureEnabled()) return;
        Na__SectSceneData__CaptureForScene(
            scene.PresentationMode__Scene__Name,
            scene.PresentationMode__Scene__Id
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Thumbnail Regeneration
// -----------------------------------------------------------------------------

    // FUNCTION | Render Viewport WebP and Upload It R2-First (Local Mirror Second)
    // ------------------------------------------------------------
    // Writes the saved relative path onto scene.PresentationMode__Scene__
    // ThumbnailUrl on success. R2 is the SSOT: the old Flask-only endpoint
    // left the WebP on this machine, so the live app had nothing to load
    // until the local mirror was committed and pushed to GH Pages.
    // ------------------------------------------------------------
    async function Na__PresentationMode__DevMenu__RegenerateThumbnail(scene, projectCode, showToast) {
        const sceneId = scene.PresentationMode__Scene__Id;

        try {
            const result = await Na__PresentationMode__Thumbnail__CaptureAndUpload(sceneId, projectCode, showToast); // <-- Render + R2 write + Flask mirror
            if (!result || !result.ok) {
                showToast && showToast(`Thumbnail upload failed: ${result ? result.error : 'no result'}`, true);
                return false;
            }

            scene.PresentationMode__Scene__ThumbnailUrl = result.relUrl;    // <-- Update working scene with saved path
            showToast && showToast(`Thumbnail saved to R2: ${result.relUrl}`);
            return true;
        } catch (error) {
            console.error('[ValeVision3D] Thumbnail regeneration error:', error);
            showToast && showToast('Thumbnail error, see console.', true);
            return false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | R2-First Save
// -----------------------------------------------------------------------------

    // FUNCTION | Save PresentationMode Block to project.json (R2-First)
    // ------------------------------------------------------------
    // The whole PresentationMode__SavedCameraScenes block is written, so the
    // groups array rides along with the scenes in the same object. Returns
    // true on success.
    // ------------------------------------------------------------
    async function Na__PresentationMode__DevMenu__SaveScenesToProject(updatedScenes, projectCode, showToast) {
        if (!projectCode) {
            showToast && showToast('No project loaded.', true);
            return false;
        }

        const fetchUrl = `${window.location.origin}/api/projects/${projectCode}`;

        try {
            // FETCH EXISTING PROJECT DATA FOR MERGE
            const getResponse = await fetch(fetchUrl);
            if (!getResponse.ok) {
                showToast && showToast(`Project not found: ${projectCode}`, true);
                return false;
            }

            const projectData = await getResponse.json();

            const config = Na__PresentationMode__ProjectJson__GetActiveConfig(); // <-- Current full config block (scenes + groups)

            // MERGE UPDATED SCENES into the config
            if (config) {
                config.PresentationMode__SavedCameraScenes__Scenes = updatedScenes;
            }

            projectData.PresentationMode__SavedCameraScenes = config || {
                PresentationMode__SavedCameraScenes__Enabled                  : true,
                PresentationMode__SavedCameraScenes__ShowCarouselByDefault    : true,
                PresentationMode__SavedCameraScenes__AutoPlayEnabledByDefault : false,
                PresentationMode__SavedCameraScenes__DefaultSceneId           : updatedScenes[0]?.PresentationMode__Scene__Id || null,
                PresentationMode__SavedCameraScenes__Scenes                   : updatedScenes
            };

            // CROSS SECTION SCENE BINDINGS | Separate top-level object; only
            // written once loaded/captured so untouched projects stay clean.
            // The block was seeded from project.json at load, so bindings for
            // scenes not edited this session are preserved verbatim.
            const crossSectionBlock = Na__SectSceneData__GetProjectBlock();
            if (crossSectionBlock) {
                projectData.CrossSection__SceneData = crossSectionBlock;
            }

            // TWO-PHASE R2-FIRST SAVE
            await Na__AppUtils__R2SaveProjectJson(projectData, projectCode, showToast);

            showToast && showToast(`Presentation scenes saved to ${projectCode}`);
            return true;

        } catch (error) {
            console.error('[ValeVision3D] Presentation mode save error:', error);
            showToast && showToast(`Save failed: ${error.message}`, true);
            return false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Scene Persistence API
    // ------------------------------------------------------------
    export {
        Na__PresentationMode__DevMenu__CaptureCrossSectionIfEnabled,
        Na__PresentationMode__DevMenu__RegenerateThumbnail,
        Na__PresentationMode__DevMenu__SaveScenesToProject
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
