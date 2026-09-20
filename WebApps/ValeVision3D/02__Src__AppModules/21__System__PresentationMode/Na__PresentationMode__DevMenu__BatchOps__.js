// =============================================================================
// VALEVISION3D - PRESENTATION MODE - DEV MENU BATCH OPERATIONS
// =============================================================================
//
// FILE       : Na__PresentationMode__DevMenu__BatchOps__.js
// NAMESPACE  : Na__PmBatch
// MODULE     : PresentationMode - Dev Menu Batch Operations
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Walk every saved scene in turn, re-rendering all thumbnails or
//              exporting a full-size image of each
// CREATED    : 19-Sep-2026
//
// DESCRIPTION:
// - Two operations, one walk. Both step the live viewport through the scene
//   list with the INSTANT camera apply - never the animated flight - because
//   a batch that waited 1.8 seconds a scene for an easing curve nobody is
//   watching would take a minute longer for nothing.
//
//   1. UpdateAllThumbnails : re-renders each scene at thumbnail size, uploads
//      each WebP, and writes the returned path onto the scene record. The
//      RECORDS are left for the caller to commit in one save, so twenty scenes
//      cost twenty small image writes and one project write instead of twenty
//      of each.
//
//   2. DownloadAllImages   : renders each scene through the Image Export
//      panel's own path, at whatever that panel is currently set to, and
//      saves each one.
//
// - THE LIVE VIEW IS PUT BACK. Both operations snapshot the camera pose, the
//   orbit target and the model layer visibility before the first scene and
//   restore all three afterwards, including after a stop or a failure. A batch
//   that left the author parked inside scene nineteen with half the model
//   switched off would be worse than no batch.
//
// - THE INSTANT APPLY IS ALREADY POSE-ONLY IN THIS APP, which is why there is
//   no "skip the navigation mode" option here. ValeVision enters walk or fly
//   only on ARRIVAL of an animated flight; the instant snap places the camera,
//   the orbit target and the model layers and stops. TrueVision's instant
//   apply did enter the mode, which cost it a pointer-lock request per
//   interior scene and a run of thumbnails each slightly adrift of its own
//   saved pose - fixed there on 19-Sep-2026 by copying the behaviour this app
//   already had.
//
// - DRAWING SCENES ARE SKIPPED, not silently, but counted and reported. A
//   floor plan or elevation scene holds a camera derived by its own drawing
//   and is rendered flat with its own overlays; snapping the perspective
//   camera to one and pressing render produces a picture of the 3D model with
//   a drawing's name on it. Their own panels own their thumbnails.
//
// - LAYOUT-EDITOR-ONLY SCENES ARE INCLUDED. Being hidden from the carousel is
//   a viewer decision; it is no reason for a scene to miss a thumbnail
//   refresh, and those scenes are exactly the ones whose thumbnail is the only
//   place you ever see them.
//
// INTEGRATION:
// - Driven by Na__PresentationMode__DevMenu__SceneEditor.js.
// - Progress is reported through a handle from
//   Na__PresentationMode__DevMenu__Modal__.js, supplied by the caller.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 21__System__PresentationMode/Na__PresentationMode__DevMenu__BatchOps__.js
// - Ported on     : 19-Sep-2026 for ValeVision3D (Presentation Scenes alignment)
// - Parity        : adapted
// - Divergences   : (1) no skipNavigationMode - this app's instant apply never
//                   entered walk/fly, so there is nothing to skip. (2) model
//                   layer visibility is PresentationMode__Scene__ModelLayerVisibility
//                   captured through Na__ModelToggle__CaptureVisibilityMap,
//                   not TrueVision's Visibility block. (3) the image export
//                   returns a CANVAS and is saved through this app's encoder,
//                   which throws rather than writing an empty PNG, instead of
//                   TrueVision's data URL. (4) drawing scenes are recognised
//                   by the FloorPlanId / ElevationId keys directly.
// - Back-port     : n/a
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Sep-2026 - Version 1.0.0
// - Initial implementation alongside the Presentation Scenes menu alignment.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Camera Scene Application and Capture
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__Camera__ApplySceneCameraState,
        Na__PresentationMode__Camera__BuildSceneCameraJson
    } from './Na__PresentationMode__Camera__SceneTransition.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Model Layer Visibility (snapshot / restore)
    // ------------------------------------------------------------
    // @delegate: ../26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js
    // ------------------------------------------------------------
    import { Na__ModelToggle__CaptureVisibilityMap } from '../26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Thumbnail Capture and Upload
    // ------------------------------------------------------------
    import { Na__PresentationMode__Thumbnail__CaptureAndUpload } from './Na__PresentationMode__Thumbnail__Renderer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Image Export Panel (its settings, its render, its save)
    // ------------------------------------------------------------
    // @delegate: ../30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js
    // ------------------------------------------------------------
    import {
        Na__UiFeature__ImageExport__IsReady,
        Na__UiFeature__ImageExport__RenderCurrentView,
        Na__UiFeature__ImageExport__DownloadCanvas
    } from '../30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Hidden-Tab-Safe Frame Yield
    // ------------------------------------------------------------
    import { Na__ExportYield__NextPaint } from '../30__System__ImageExport/Na__ImageExport__AsyncYield__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Project Code for Export Filenames
    // ------------------------------------------------------------
    import { Na__AppUtils__GetProjectCodeFromUrl } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Live Viewport References
    // ------------------------------------------------------------
    let Na__PmBatch__Camera    = null;   // <-- Live perspective camera
    let Na__PmBatch__Controls  = null;   // <-- Live orbit controls
    let Na__PmBatch__IsRunning = false;  // <-- One batch at a time, whichever kind
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Context Registration
// -----------------------------------------------------------------------------

    // FUNCTION | Register the Live Camera and Controls
    // ------------------------------------------------------------
    function Na__PmBatch__SetContext(camera, controls) {
        Na__PmBatch__Camera   = camera   || null;
        Na__PmBatch__Controls = controls || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Batch Already Walking the Scene List?
    // ------------------------------------------------------------
    function Na__PmBatch__IsBusy() {
        return Na__PmBatch__IsRunning === true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Eligibility
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is This Scene Driven by a 2D Drawing?
    // ------------------------------------------------------------
    function Na__PmBatch__IsDrawingScene(scene) {
        if (!scene || typeof scene !== 'object') return false;
        return Boolean(scene.PresentationMode__Scene__FloorPlanId || scene.PresentationMode__Scene__ElevationId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Split a Scene List Into What a Batch Can and Cannot Walk
    // ------------------------------------------------------------
    // Exported so the caller can tell the user what a batch is about to do
    // BEFORE it starts, rather than after: "18 scenes, 3 drawings skipped" is
    // a sentence worth reading in the confirmation, not the summary.
    // ------------------------------------------------------------
    function Na__PmBatch__PartitionScenes(scenes) {
        const eligible = [];
        const skipped  = [];

        (Array.isArray(scenes) ? scenes : []).forEach((scene) => {
            if (Na__PmBatch__IsDrawingScene(scene)) { skipped.push(scene); return; }
            if (!scene || !scene.PresentationMode__Scene__CameraPosition) { skipped.push(scene); return; }
            eligible.push(scene);
        });

        return { eligible : eligible, skipped : skipped };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Live View Snapshot and Restore
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Capture the Live View as a Scene-Shaped Restore Point
    // ------------------------------------------------------------
    // Built in the scene format on purpose: restoring is then the SAME instant
    // apply the batch used on every scene, so there is one code path for
    // "put the camera here" and the restore cannot drift from the walk.
    // ------------------------------------------------------------
    function Na__PmBatch__SnapshotLiveView() {
        if (!Na__PmBatch__Camera) return null;

        const built = Na__PresentationMode__Camera__BuildSceneCameraJson(Na__PmBatch__Camera, Na__PmBatch__Controls);
        if (!built) return null;

        const snapshot = {
            PresentationMode__Scene__Id                      : '__BatchRestorePoint__',
            PresentationMode__Scene__Name                    : 'Restore point',
            PresentationMode__Scene__CameraPosition          : { ...built.cameraPosition },
            PresentationMode__Scene__OrbitHelperCubePosition : { ...built.orbitHelperCubePosition }
        };

        const visibility = Na__ModelToggle__CaptureVisibilityMap();
        if (visibility) snapshot.PresentationMode__Scene__ModelLayerVisibility = visibility;

        return snapshot;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put the Live View Back
    // ------------------------------------------------------------
    function Na__PmBatch__RestoreLiveView(snapshot) {
        if (!snapshot || !Na__PmBatch__Camera) return;
        Na__PresentationMode__Camera__ApplySceneCameraState(Na__PmBatch__Camera, Na__PmBatch__Controls, snapshot);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Park the Viewport on One Scene and Let It Paint
    // ------------------------------------------------------------
    // The paint wait is not decoration. The instant apply only asks the render
    // loop for a frame; without waiting for it the capture that follows can
    // read a framebuffer still holding the previous scene, which is how a
    // batch produces twenty thumbnails all one scene out of step.
    // ------------------------------------------------------------
    async function Na__PmBatch__ParkOnScene(scene) {
        Na__PresentationMode__Camera__ApplySceneCameraState(Na__PmBatch__Camera, Na__PmBatch__Controls, scene);
        await Na__ExportYield__NextPaint();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Does the Viewport Actually Have Pixels to Render Into?
    // ------------------------------------------------------------
    // A minimised window, a collapsed pane or a tab that has never been shown
    // can leave the renderer's canvas at zero by zero. Every render in the
    // batch would then be a zero-area draw and every capture a blank, and the
    // run would report a wall of failures rather than the one fact that
    // explains them. Checked up front and again before every scene.
    // ------------------------------------------------------------
    function Na__PmBatch__HasDrawableViewport() {
        const canvas = document.querySelector('canvas');
        return Boolean(canvas && canvas.width > 0 && canvas.height > 0);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Short Display Name for a Scene
    // ------------------------------------------------------------
    function Na__PmBatch__SceneLabel(scene) {
        return (scene && (scene.PresentationMode__Scene__Name || scene.PresentationMode__Scene__Id)) || 'Untitled scene';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Batch - Update All Thumbnails
// -----------------------------------------------------------------------------

    // FUNCTION | Re-Render and Re-Upload Every Scene's Thumbnail
    // ------------------------------------------------------------
    // MUTATES the scene objects it is given: each successful upload writes the
    // returned path onto PresentationMode__Scene__ThumbnailUrl. It does NOT
    // commit or save - the caller owns persistence, and saving the whole block
    // once at the end is the entire reason this is a batch.
    //
    // Returns { updated, failed, skipped, stopped, noViewport }.
    // ------------------------------------------------------------
    async function Na__PmBatch__UpdateAllThumbnails(scenes, progress) {
        if (Na__PmBatch__IsRunning)             return { updated : 0, failed : 0, skipped : 0, stopped : true };
        if (!Na__PmBatch__Camera)               return { updated : 0, failed : 0, skipped : 0, stopped : true };
        if (!Na__PmBatch__HasDrawableViewport()) return { updated : 0, failed : 0, skipped : 0, stopped : true, noViewport : true };

        const partition = Na__PmBatch__PartitionScenes(scenes);
        const queue     = partition.eligible;
        const total     = queue.length;

        Na__PmBatch__IsRunning = true;
        const restorePoint = Na__PmBatch__SnapshotLiveView();

        let updated    = 0;
        let failed     = 0;
        let stopped    = false;
        let noViewport = false;   // <-- Set if the window collapses part-way through

        try {
            for (let index = 0; index < total; index++) {
                if (progress && typeof progress.IsStopped === 'function' && progress.IsStopped()) { stopped = true; break; }

                // THE WINDOW CAN BE MINIMISED MID-WALK, and a collapsed window
                // takes the canvas to zero by zero with it. Rendering into that
                // is not a slow render, it is a render with nothing to render
                // into, and the rest of the run would be blanks.
                if (!Na__PmBatch__HasDrawableViewport()) { stopped = true; noViewport = true; break; }

                const scene = queue[index];
                const label = Na__PmBatch__SceneLabel(scene);

                if (progress && typeof progress.Update === 'function') {
                    progress.Update(index, total, `Rendering ${label}`);   // <-- The dialog prints the count itself
                }

                await Na__PmBatch__ParkOnScene(scene);

                try {
                    const result = await Na__PresentationMode__Thumbnail__CaptureAndUpload(scene.PresentationMode__Scene__Id);
                    if (result && result.ok) {
                        scene.PresentationMode__Scene__ThumbnailUrl = result.relUrl; // <-- Caller commits the record
                        updated++;
                    } else {
                        failed++;
                        console.warn('[ValeVision3D] Batch thumbnail failed for', label, result && result.error);
                    }
                } catch (thumbError) {
                    failed++;
                    console.error('[ValeVision3D] Batch thumbnail error for', label, thumbError);
                }
            }
        } finally {
            Na__PmBatch__RestoreLiveView(restorePoint);                      // <-- Always, stop or throw included
            Na__PmBatch__IsRunning = false;
        }

        return {
            updated    : updated,
            failed     : failed,
            skipped    : partition.skipped.length,
            stopped    : stopped,
            noViewport : noViewport
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Batch - Download All Images
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Filename for One Exported Scene
    // ------------------------------------------------------------
    // Ordinal first so a folder of them sorts into presentation order, then
    // the scene name reduced to something a file system will take on any OS.
    // ------------------------------------------------------------
    function Na__PmBatch__BuildExportFilename(scene, ordinal, width, height) {
        const projectCode = Na__AppUtils__GetProjectCodeFromUrl() || 'ValeVision3D';
        const safeName    = Na__PmBatch__SceneLabel(scene)
            .replace(/[^a-zA-Z0-9]+/g, '-')                                  // <-- Anything awkward becomes a hyphen
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || scene.PresentationMode__Scene__Id;

        const ordinalText = String(ordinal).padStart(2, '0');
        return `${projectCode}__${ordinalText}__${safeName}__${width}x${height}.png`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Export a Full-Size Image of Every Scene, In Order
    // ------------------------------------------------------------
    // Each image is rendered through the Image Export panel's own path at
    // whatever that panel is currently set to, so "the current export
    // settings" means the same thing here as at the Download Image button -
    // and an untouched panel is already holding its configured defaults.
    //
    // Returns { exported, failed, skipped, stopped, notReady, noViewport }.
    // ------------------------------------------------------------
    async function Na__PmBatch__DownloadAllImages(scenes, progress) {
        if (Na__PmBatch__IsRunning)                 return { exported : 0, failed : 0, skipped : 0, stopped : true,  notReady : false };
        if (!Na__PmBatch__Camera)                   return { exported : 0, failed : 0, skipped : 0, stopped : true,  notReady : false };
        if (!Na__UiFeature__ImageExport__IsReady()) return { exported : 0, failed : 0, skipped : 0, stopped : false, notReady : true  };
        if (!Na__PmBatch__HasDrawableViewport())    return { exported : 0, failed : 0, skipped : 0, stopped : true,  notReady : false, noViewport : true };

        const partition = Na__PmBatch__PartitionScenes(scenes);
        const queue     = partition.eligible;
        const total     = queue.length;

        Na__PmBatch__IsRunning = true;
        const restorePoint = Na__PmBatch__SnapshotLiveView();

        let exported   = 0;
        let failed     = 0;
        let stopped    = false;
        let noViewport = false;   // <-- Set if the window collapses part-way through

        try {
            for (let index = 0; index < total; index++) {
                if (progress && typeof progress.IsStopped === 'function' && progress.IsStopped()) { stopped = true; break; }
                if (!Na__PmBatch__HasDrawableViewport()) { stopped = true; noViewport = true; break; }

                const scene = queue[index];
                const label = Na__PmBatch__SceneLabel(scene);

                if (progress && typeof progress.Update === 'function') {
                    progress.Update(index, total, `Exporting ${label}`);   // <-- The dialog prints the count itself
                }

                await Na__PmBatch__ParkOnScene(scene);

                try {
                    // The renderer's own tile progress rides into the same
                    // status line, so a single slow scene still reports.
                    const onTile = (text) => {
                        if (progress && typeof progress.Update === 'function') {
                            progress.Update(index, total, `Exporting ${label} - ${text}`);
                        }
                    };

                    const result = await Na__UiFeature__ImageExport__RenderCurrentView(onTile);
                    if (result && result.canvas) {
                        await Na__UiFeature__ImageExport__DownloadCanvas(
                            result.canvas,
                            Na__PmBatch__BuildExportFilename(scene, index + 1, result.width, result.height)
                        );
                        exported++;
                        await Na__ExportYield__NextPaint();                  // <-- Let the save start before the next render
                    } else {
                        failed++;
                    }
                } catch (exportError) {
                    failed++;
                    console.warn('[ValeVision3D] Batch export failed for', label, exportError);
                }
            }
        } finally {
            Na__PmBatch__RestoreLiveView(restorePoint);
            Na__PmBatch__IsRunning = false;
        }

        return {
            exported   : exported,
            failed     : failed,
            skipped    : partition.skipped.length,
            stopped    : stopped,
            notReady   : false,
            noViewport : noViewport
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Dev Menu Batch Operations API
    // ------------------------------------------------------------
    export {
        Na__PmBatch__SetContext          as Na__PresentationMode__DevMenu__SetBatchContext,
        Na__PmBatch__IsBusy              as Na__PresentationMode__DevMenu__IsBatchBusy,
        Na__PmBatch__PartitionScenes     as Na__PresentationMode__DevMenu__PartitionBatchScenes,
        Na__PmBatch__UpdateAllThumbnails as Na__PresentationMode__DevMenu__UpdateAllThumbnails,
        Na__PmBatch__DownloadAllImages   as Na__PresentationMode__DevMenu__DownloadAllImages
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
