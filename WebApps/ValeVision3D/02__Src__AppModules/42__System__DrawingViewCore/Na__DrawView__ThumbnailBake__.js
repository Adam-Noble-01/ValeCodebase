// =============================================================================
// VALEVISION3D - DRAWING VIEW CORE - THUMBNAIL BAKE
// =============================================================================
//
// FILE       : Na__DrawView__ThumbnailBake__.js
// NAMESPACE  : Na__DrawThumb
// MODULE     : Drawing View Core - Thumbnail Bake
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Give plan and elevation scene cards a real picture: open each drawing, capture it, upload it, save once
// CREATED    : 15-Sep-2026
//
// DESCRIPTION:
// - A drawing's scene card is created with the conventional thumbnail path
//   (PresentationMode/Thumbnails/<scene id>.webp) so it has something to
//   resolve, but nothing rendered that picture unless someone previewed the
//   drawing and pressed Save Thumbnail. Seed N / E / S / W left four cards
//   pointing at four files that did not exist, and the carousel showed four
//   broken images.
// - BAKING a drawing is what Save Thumbnail does, done for the author: the
//   drawing is opened, its framing is recorded (the thumbnail IS the framing),
//   the viewport is captured and uploaded R2-first with the local mirror, and
//   the card keeps the path it already had.
// - ONE RUN, MANY DRAWINGS. Requests are queued and run together on the next
//   tick, so seeding four elevations makes one run, not four. The first drawing
//   of a run flies in from 3D as a preview does; every drawing after it flips
//   in one frame. The full-screen loading overlay covers the whole run, and the
//   view is put back afterwards: the drawing that was previewing, or the 3D
//   camera exactly where it was.
// - ONE SAVE. When something baked, the owning editor's own Save runs once at
//   the end, so the recorded framing lands with the linework bake and the
//   drawings block exactly as Save Elevations or Save Floor Plans writes them.
//   The scenes are re-broadcast so every card fetches its picture again.
// - MISSING ONLY on request. FindMissing probes each card's picture the way
//   the carousel loads it, so Bake Missing Thumbnails never replaces a
//   thumbnail an author framed by hand.
// - KIND-AGNOSTIC. The floor plan and elevation editors hand in an adapter
//   (enter, isShowing, getActive, exit, storeFraming), so this module knows
//   nothing about either mode controller.
//
// INTEGRATION:
// - Na__FloorPlan__DevMenu__Editor__ and Na__Elevation__DevMenu__Editor__ queue
//   the drawings they add, seed or give a card, and ask FindMissing for their
//   Bake Missing Thumbnails buttons.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : none
// - Ported on     : 15-Sep-2026 for ValeVision3D v2.46.0
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : candidate. TrueVision's drawing cards have the same path-without-a-picture gap.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 15-Sep-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Scene Config, Thumbnail Capture and the Project Code
    // ------------------------------------------------------------
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__ProjectJson__GetActiveConfig,
        Na__PresentationMode__ProjectJson__BroadcastScenesChanged,
        Na__PresentationMode__ProjectJson__ResolveThumbnailUrlPair
    } from '../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';
    import { Na__PresentationMode__Thumbnail__CaptureAndUpload } from '../21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js';
    import { Na__DrawData__GetProjectCode } from './Na__DrawView__ProjectData__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Viewport, the 3D Camera, the Overlay and the Render Loop
    // ------------------------------------------------------------
    import { Na__DrawView__IsActive } from './Na__DrawView__ActiveView__.js';
    import { Na__DrawView__Transitions__GetCamera, Na__DrawView__Transitions__GetControls } from './Na__DrawView__Transitions__.js';
    import { Na__AppUtils__LoadingOverlay__Create } from '../03__AppUtils/Na__AppUtils__LoadingOverlay__.js';
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Scene Keys
    // ------------------------------------------------------------
    const Na__DrawThumb__SCENES_KEY  = 'PresentationMode__SavedCameraScenes__Scenes';
    const Na__DrawThumb__SCENE_ID    = 'PresentationMode__Scene__Id';
    const Na__DrawThumb__SCENE_THUMB = 'PresentationMode__Scene__ThumbnailUrl';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Timing
    // ------------------------------------------------------------
    const Na__DrawThumb__SHOW_TIMEOUT_MS  = 12000;    // <-- A flight in from 3D takes 1.4 s; a drawing not on screen by now is not coming
    const Na__DrawThumb__PROBE_TIMEOUT_MS = 8000;     // <-- A picture that neither loads nor fails by now counts as missing
    const Na__DrawThumb__SETTLE_FRAMES    = 2;        // <-- Frames between a drawing taking the viewport and its capture
    const Na__DrawThumb__FRAME_FALLBACK_MS = 100;     // <-- A hidden tab runs no frames; a timer keeps the run moving
    const Na__DrawThumb__DISMISS_HOLD_MS  = 900;      // <-- How long the overlay's final line stays up
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Queue and the Run
    // ------------------------------------------------------------
    let Na__DrawThumb__Pending = [];      // <-- Requests waiting for the next run: { items, adapter, save, showToast }
    let Na__DrawThumb__Timer   = null;    // <-- The next-tick run, once scheduled
    let Na__DrawThumb__Running = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Scene a Card Id Names, in the Live Config
    // ------------------------------------------------------------
    function Na__DrawThumb__SceneById(sceneId) {
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        const scenes = (config && Array.isArray(config[Na__DrawThumb__SCENES_KEY])) ? config[Na__DrawThumb__SCENES_KEY] : [];
        return scenes.find((scene) => scene && scene[Na__DrawThumb__SCENE_ID] === sceneId) || null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wait One Animation Frame
    // ------------------------------------------------------------
    function Na__DrawThumb__NextFrame() {
        return new Promise((resolve) => {
            let done = false;
            const finish = () => { if (!done) { done = true; resolve(); } };
            window.requestAnimationFrame(finish);
            window.setTimeout(finish, Na__DrawThumb__FRAME_FALLBACK_MS);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wait Until a Condition Holds, Frame by Frame, or Give Up
    // ------------------------------------------------------------
    async function Na__DrawThumb__WaitUntil(test, timeoutMs) {
        const started = Date.now();
        while (!test()) {
            if (Date.now() - started > timeoutMs) return false;
            await Na__DrawThumb__NextFrame();
        }
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Does a Picture Load?
    // ------------------------------------------------------------
    // An image probe rather than a fetch: it loads exactly as the carousel's
    // card does, and a cross-origin picture on R2 needs no CORS answer to it.
    // ------------------------------------------------------------
    function Na__DrawThumb__ProbePicture(url) {
        return new Promise((resolve) => {
            if (!url) { resolve(false); return; }
            const image = new Image();
            let timer = null;
            const finish = (loaded) => {
                window.clearTimeout(timer);
                image.onload  = null;
                image.onerror = null;
                resolve(loaded);
            };
            timer = window.setTimeout(() => finish(false), Na__DrawThumb__PROBE_TIMEOUT_MS);
            image.onload  = () => finish(true);
            image.onerror = () => finish(false);
            image.src     = url;
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remember the 3D Camera, and Put It Back
    // ------------------------------------------------------------
    // Leaving a drawing parks the perspective camera at the drawing's approach
    // pose, which is right for a preview and wrong for a bake the author never
    // asked to see. The pose and the orbit target go back exactly.
    // ------------------------------------------------------------
    function Na__DrawThumb__CaptureCameraPose() {
        const camera   = Na__DrawView__Transitions__GetCamera();
        const controls = Na__DrawView__Transitions__GetControls();
        if (!camera) return null;
        return {
            position   : camera.position.clone(),
            quaternion : camera.quaternion.clone(),
            fov        : camera.fov,
            target     : (controls && controls.target) ? controls.target.clone() : null
        };
    }
    function Na__DrawThumb__RestoreCameraPose(pose) {
        const camera   = Na__DrawView__Transitions__GetCamera();
        const controls = Na__DrawView__Transitions__GetControls();
        if (!pose || !camera) return;
        camera.position.copy(pose.position);
        camera.quaternion.copy(pose.quaternion);
        if (Number.isFinite(pose.fov)) camera.fov = pose.fov;
        camera.updateProjectionMatrix();
        if (controls && controls.target && pose.target) {
            controls.target.copy(pose.target);
            if (typeof controls.update === 'function') controls.update();
        }
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Overlay's Wording
    // ------------------------------------------------------------
    function Na__DrawThumb__Status(index, total, label) {
        return 'Baking thumbnail ' + index + ' of ' + total + '\n' + (label || '');
    }
    function Na__DrawThumb__Summary(baked, failed, saved) {
        if (baked === 0) return (failed === 1 ? 'The thumbnail could not be baked.' : 'No thumbnails could be baked.') + ' The console has the reason.';
        let text = (baked === 1) ? '1 thumbnail baked' : baked + ' thumbnails baked';
        if (failed > 0) text += ', ' + failed + ' failed';
        return text + (saved ? ' and saved.' : ', but the save failed.');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Baking
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Bake One Drawing: Open It, Record Its Framing, Capture and Upload
    // ------------------------------------------------------------
    async function Na__DrawThumb__BakeOne(item, adapter, projectCode, relayErrors) {
        const scene = Na__DrawThumb__SceneById(item.sceneId);
        if (!scene) return false;                                                // <-- The card went while the run waited
        if (adapter.enter(item.drawing) === false) return false;

        const showing = await Na__DrawThumb__WaitUntil(() => adapter.isShowing(item.drawing), Na__DrawThumb__SHOW_TIMEOUT_MS);
        if (!showing) {
            console.warn('[ValeVision3D] Thumbnail bake: "' + item.label + '" never took the viewport.');
            return false;
        }
        for (let frame = 0; frame < Na__DrawThumb__SETTLE_FRAMES; frame++) await Na__DrawThumb__NextFrame();

        adapter.storeFraming();                                                  // <-- The thumbnail IS the framing
        const result = await Na__PresentationMode__Thumbnail__CaptureAndUpload(item.sceneId, projectCode, relayErrors);
        if (!result || !result.ok) {
            console.warn('[ValeVision3D] Thumbnail bake failed for "' + item.label + '": ' + (result ? result.error : 'no result'));
            return false;
        }
        scene[Na__DrawThumb__SCENE_THUMB] = result.relUrl;                        // <-- The path the card already had, confirmed
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Bake Every Drawing of One Kind, Then Put the View Back and Save
    // ------------------------------------------------------------
    async function Na__DrawThumb__RunGroup(group) {
        const items       = Array.from(group.items.values());
        const adapter     = group.adapter;
        const toast       = (typeof group.showToast === 'function') ? group.showToast : () => {};
        const projectCode = Na__DrawData__GetProjectCode();
        if (items.length === 0) return;
        if (!projectCode) { toast('No project loaded, so no thumbnails were baked.', true); return; }

        // WHERE THE VIEW WAS | A drawing of this kind previewing, or the 3D camera
        const wasShowing = adapter.getActive();
        const pose       = Na__DrawView__IsActive() ? null : Na__DrawThumb__CaptureCameraPose();

        const overlay     = Na__AppUtils__LoadingOverlay__Create({ opaque : true });   // <-- Nothing of the drawings flicking past shows through
        const relayErrors = (message, isError) => { if (isError) toast(message, true); };
        overlay.show(Na__DrawThumb__Status(1, items.length, items[0].label));

        let baked = 0, failed = 0;
        try {
            for (let i = 0; i < items.length; i++) {
                overlay.setStatus(Na__DrawThumb__Status(i + 1, items.length, items[i].label));
                try {
                    if (await Na__DrawThumb__BakeOne(items[i], adapter, projectCode, relayErrors)) baked++;
                    else failed++;
                } catch (error) {
                    console.error('[ValeVision3D] Thumbnail bake error:', error);
                    failed++;
                }
            }
        } finally {
            if (wasShowing) adapter.enter(wasShowing);                           // <-- Back to the drawing that was previewing (a flip, no flight)
            else {
                adapter.exit();
                if (pose) Na__DrawThumb__RestoreCameraPose(pose);                // <-- Another kind was on screen: its pose is not ours to restore
            }
            Na__PresentationMode__ProjectJson__BroadcastScenesChanged();         // <-- Every card fetches its picture again
        }

        let saved = true;
        if (baked > 0 && typeof group.save === 'function') {
            overlay.setStatus('Saving');
            try { saved = (await group.save()) !== false; }
            catch (error) { console.error('[ValeVision3D] Thumbnail bake save error:', error); saved = false; }
        }

        const message = Na__DrawThumb__Summary(baked, failed, saved);
        overlay.dismiss(message, failed > 0 || !saved, Na__DrawThumb__DISMISS_HOLD_MS);
        console.log('[ValeVision3D] ' + message);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Run Everything Queued, a Kind at a Time
    // ------------------------------------------------------------
    // Requests of one kind merge into one group, one overlay and one save.
    // Anything queued while a run is under way joins the next pass of the loop.
    // ------------------------------------------------------------
    async function Na__DrawThumb__Run() {
        Na__DrawThumb__Timer = null;
        if (Na__DrawThumb__Running) return;
        Na__DrawThumb__Running = true;
        try {
            while (Na__DrawThumb__Pending.length > 0) {
                const requests = Na__DrawThumb__Pending;
                Na__DrawThumb__Pending = [];
                const groups = new Map();
                requests.forEach((request) => {
                    const kind  = request.adapter.kind;
                    const group = groups.get(kind) || { adapter : request.adapter, save : request.save, showToast : request.showToast, items : new Map() };
                    request.items.forEach((item) => { if (item && item.sceneId && !group.items.has(item.sceneId)) group.items.set(item.sceneId, item); });
                    groups.set(kind, group);
                });
                for (const group of groups.values()) await Na__DrawThumb__RunGroup(group);
            }
        } finally {
            Na__DrawThumb__Running = false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Queue Drawings for Baking (they run together on the next tick)
    // ------------------------------------------------------------
    // request: {
    //   items     : [ { drawing, sceneId, label } ],
    //   adapter   : { kind, enter(drawing), isShowing(drawing), getActive(), exit(), storeFraming() },
    //   save      : async () => boolean   the owning editor's Save, run once when something baked
    //   showToast : (message, isError) => void
    // }
    // ------------------------------------------------------------
    function Na__DrawThumb__Queue(request) {
        if (!request || !request.adapter || !Array.isArray(request.items) || request.items.length === 0) return false;
        Na__DrawThumb__Pending.push(request);
        if (!Na__DrawThumb__Timer && !Na__DrawThumb__Running) {
            Na__DrawThumb__Timer = window.setTimeout(() => { void Na__DrawThumb__Run(); }, 0);
        }
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Which of These Drawings' Cards Have No Picture That Loads
    // ------------------------------------------------------------
    // items: [ { drawing, sceneId, label } ]. Resolves to the items whose card
    // picture fails to load (or has no path). An item without a card is left
    // out: there is nothing to give a picture to.
    // ------------------------------------------------------------
    async function Na__DrawThumb__FindMissing(items) {
        const projectCode = Na__DrawData__GetProjectCode();
        const checks = (items || []).map(async (item) => {
            const scene = item ? Na__DrawThumb__SceneById(item.sceneId) : null;
            if (!scene) return null;
            const pair = Na__PresentationMode__ProjectJson__ResolveThumbnailUrlPair(scene, projectCode);
            if (!pair) return item;
            if (await Na__DrawThumb__ProbePicture(pair.primary)) return null;
            if (pair.fallback && pair.fallback !== pair.primary && await Na__DrawThumb__ProbePicture(pair.fallback)) return null;
            return item;
        });
        return (await Promise.all(checks)).filter(Boolean);
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Bake Running or Waiting to Run?
    // ------------------------------------------------------------
    function Na__DrawThumb__IsBusy() {
        return Na__DrawThumb__Running || Na__DrawThumb__Pending.length > 0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Drawing Thumbnail Bake API
    // ------------------------------------------------------------
    export {
        Na__DrawThumb__Queue,
        Na__DrawThumb__FindMissing,
        Na__DrawThumb__IsBusy
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
