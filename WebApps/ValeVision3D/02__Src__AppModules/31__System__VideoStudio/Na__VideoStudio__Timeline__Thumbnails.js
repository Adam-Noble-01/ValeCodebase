// =============================================================================
// VALEVISION3D - VIDEO STUDIO - TIMELINE KEYFRAME THUMBNAILS
// =============================================================================
//
// FILE       : Na__VideoStudio__Timeline__Thumbnails.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Timeline Keyframe Thumbnails
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Render and cache a small preview image of the shot each
//              keyframe holds, for the Video Studio timeline tiles
// CREATED    : 02-Sep-2026
//
// DESCRIPTION:
// - A timeline of numbered dots tells you nothing about the film.  A timeline
//   of the actual shots is readable at a glance, which is the whole reason
//   this module exists: it puts the camera at a waypoint, renders one frame
//   through the live pipeline, and keeps the picture.
// - Every render happens inside ONE synchronous task.  The browser composites
//   only at the end of a task, so a burst of twenty waypoint renders followed
//   by a restore of the live camera is invisible on screen.  Yielding between
//   waypoints would paint each one and turn the whole thing into a flicker,
//   so this module never awaits anything mid-burst.
// - Results are cached against a signature of the waypoint's camera block, its
//   lens and the path's model layer state.  Nothing re-renders unless the shot
//   it shows actually changed, so a single dragged waypoint costs one frame
//   rather than a whole rebuild.
//
// WHY NOT THE EXPORT FRAME RENDERER:
// - Na__VideoStudio__Export__FrameRenderer resizes the renderer, the composer
//   and every effect target to the export resolution, and hides the canvas
//   while it does it.  That is correct for a 4K render and far too heavy for a
//   192px tile.  Rendering at the viewport's own size and cropping to the
//   export aspect gets the same framing for a fraction of the work.
//
// FRAMING:
// - camera.fov is the VERTICAL field of view and is left alone, exactly as the
//   export leaves it alone, so a centred crop of the rendered frame to the
//   export aspect shows precisely what the video will show.  When the export
//   aspect is wider than the viewport there is no width left to crop, so the
//   tile gives up a little top and bottom instead; at tile size that is not
//   a difference anyone can see.
//
// DRAWING BUFFER LIFETIME:
// - preserveDrawingBuffer is off on the live renderer, so a rendered frame
//   survives only until the browser next composites.  Each frame is therefore
//   copied into its own 2D canvas immediately after its render call, with no
//   await in between.
//
// INTEGRATION:
// - Na__VideoStudio__Timeline__Controls calls SyncVideo before it builds tiles.
// - SetRenderContext is called once from Na__VideoStudio__DevMenu__Controls,
//   which already holds every reference needed.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 02-Sep-2026 - Version 1.0.0
// - Initial implementation for the Video Studio timeline.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Video Data Layer
    // @delegate: ./Na__VideoStudio__ProjectJson__VideoData.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__ProjectJson__GetSortedKeyframes,
        Na__VideoStudio__ProjectJson__GetExportOptions,
        Na__VideoStudio__ProjectJson__GetModelLayerOptions,
        Na__VideoStudio__ProjectJson__GetKeyframeLensMm
    } from './Na__VideoStudio__ProjectJson__VideoData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Keyframe Camera State
    // @delegate: ./Na__VideoStudio__Camera__PathSampler.js
    // ------------------------------------------------------------
    import { Na__VideoStudio__Camera__ApplyKeyframe } from './Na__VideoStudio__Camera__PathSampler.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Model Layers Session
    // @delegate: ./Na__VideoStudio__Playback__ModelLayers.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__ModelLayers__Begin,
        Na__VideoStudio__ModelLayers__End
    } from './Na__VideoStudio__Playback__ModelLayers.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Path Visualizer Suppression
    // @delegate: ./Na__VideoStudio__Viewport__PathVisualizer.js
    // ------------------------------------------------------------
    import { Na__VideoStudio__PathVisualizer__SetSuppressed } from './Na__VideoStudio__Viewport__PathVisualizer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Per-Frame Scene Systems
    // The same set the export frame renderer drives, minus the door animation:
    // a thumbnail is a still, so doors are left exactly as the scene has them
    // rather than being swung open and left that way.
    // ------------------------------------------------------------
    import { Na__VerticalCorrection__ApplyFrame } from '../11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js';
    import { Na__CameraFollow__Update }           from '../25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__CameraFollowBillboards__.js';
    import { Na__DistanceCulling__Update }        from '../05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js';
    import { Na__FogPlaneSystem__GetFogPass }     from '../29__System__FogPlaneSystem/Na__FogPlaneSystem__SystemLogic.js';
    import { Na__FogPlane__UpdateFogPassPerFrame } from '../29__System__FogPlaneSystem/Na__FogPlaneSystem__FogShaderEffect.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Cross Section Overlay (After-Composer Pass)
    // ------------------------------------------------------------
    import { Na__SectionClipping__GetOverlayRenderer } from '../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Thumbnail Geometry
    // ------------------------------------------------------------
    // Rendered at roughly twice the tile's on-screen height so the picture
    // stays crisp on a high density display without storing anything large.
    // ------------------------------------------------------------
    const Na__VsThumb__HEIGHT_PX     = 128;         // <-- Stored thumbnail height
    const Na__VsThumb__MAX_WIDTH_PX  = 320;         // <-- Guard against an absurd authored aspect
    const Na__VsThumb__FORMAT        = 'image/webp';
    const Na__VsThumb__QUALITY       = 0.82;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Burst Ceiling
    // ------------------------------------------------------------
    // One burst blocks the main thread for as long as it runs, so there has to
    // be a point at which it stops and picks up on the next call.  Eight
    // full-pipeline frames is a comfortable fraction of a second on any machine
    // that can run this app at all; a longer path fills in over the following
    // few passes, with the strip showing what it has as it goes.  That reads
    // far better than one long freeze, and costs only one extra live redraw
    // per burst.
    // ------------------------------------------------------------
    const Na__VsThumb__MAX_PER_BURST = 8;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Render Context References
    // ------------------------------------------------------------
    let Na__VsThumb__Renderer    = null;   // <-- Live WebGLRenderer
    let Na__VsThumb__Scene       = null;   // <-- Three.js scene, for the direct render fallback
    let Na__VsThumb__Camera      = null;   // <-- Live perspective camera
    let Na__VsThumb__Controls    = null;   // <-- OrbitControls, resynced after the burst
    let Na__VsThumb__GetPipeline = null;   // <-- Lazy render pipeline state getter
    // ------------------------------------------------------------


    // MODULE VARIABLES | Thumbnail Cache
    // ------------------------------------------------------------
    // keyframeId -> { signature, dataUrl }.  Stored as a data URL rather than a
    // canvas element because a canvas can only live at one place in the DOM and
    // the timeline rebuilds its tiles constantly; an image source can be handed
    // out any number of times.
    // ------------------------------------------------------------
    const Na__VsThumb__Cache = new Map();
    // ------------------------------------------------------------


    // MODULE VARIABLES | Scratch Canvas
    // ------------------------------------------------------------
    let Na__VsThumb__ScratchCanvas = null;   // <-- Reused for every capture; resized as the aspect demands
    // ------------------------------------------------------------


    // MODULE VARIABLES | Suspension
    // ------------------------------------------------------------
    // Set while something else has the renderer resized and reconfigured under
    // it, which in practice means an MP4 export.  A burst that fired mid-export
    // would render at export resolution, capture a frame the export was about
    // to write, and restore a camera the export was still using.
    // ------------------------------------------------------------
    let Na__VsThumb__Suspended = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render Context Registration
// -----------------------------------------------------------------------------

    // FUNCTION | Register the Live Render Context for Thumbnail Capture
    // ------------------------------------------------------------
    // options: { renderer, scene, camera, controls, getRenderPipelineState }
    // ------------------------------------------------------------
    function Na__VideoStudio__Thumbnails__SetRenderContext(options) {
        if (!options) return;

        Na__VsThumb__Renderer    = options.renderer    || null;
        Na__VsThumb__Scene       = options.scene       || null;
        Na__VsThumb__Camera      = options.camera      || null;
        Na__VsThumb__Controls    = options.controls    || null;
        Na__VsThumb__GetPipeline = options.getRenderPipelineState || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Pipeline Can Render a Thumbnail Yet
    // ------------------------------------------------------------
    // False before the model finishes loading, and false while an export owns
    // the renderer.  Either way the timeline draws placeholders and asks again.
    // ------------------------------------------------------------
    function Na__VideoStudio__Thumbnails__IsReady() {
        if (Na__VsThumb__Suspended) return false;
        if (!Na__VsThumb__Renderer || !Na__VsThumb__Camera) return false;
        return !!Na__VsThumb__ResolvePipeline().composer;
    }
    // ------------------------------------------------------------


    // FUNCTION | Hold Off Rendering While Something Else Owns the Renderer
    // ------------------------------------------------------------
    // Called around an MP4 export.  Nothing is dropped: the timeline keeps
    // asking on its usual retry, so any waypoint that went stale during the
    // export renders as soon as the renderer is handed back.
    // ------------------------------------------------------------
    function Na__VideoStudio__Thumbnails__SetSuspended(suspended) {
        Na__VsThumb__Suspended = (suspended === true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pipeline Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Render Pipeline State Surface
    // ------------------------------------------------------------
    // Mirrors the export frame renderer's resolver, filling absent MaxEngine
    // extras with no-ops so PureEngine needs no branching downstream.
    // ------------------------------------------------------------
    function Na__VsThumb__ResolvePipeline() {
        const noop  = () => {};
        const empty = {
            composer: null, renderProfileNormals: noop,
            updateAoUniforms: noop, renderDepthPrePass: noop
        };

        const state = (typeof Na__VsThumb__GetPipeline === 'function') ? Na__VsThumb__GetPipeline() : null;
        if (!state) return empty;

        if (typeof state.render === 'function' && !state.composer) {
            return { ...empty, composer: state };                            // <-- A bare composer was handed over
        }

        const fn = (candidate) => (typeof candidate === 'function') ? candidate : noop;

        return {
            composer            : state.composer || null,
            renderProfileNormals: fn(state.renderProfileNormals),
            updateAoUniforms    : fn(state.updateAoUniforms),
            renderDepthPrePass  : fn(state.renderDepthPrePass)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cache Keys
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Signature a Cached Thumbnail Is Valid For
    // ------------------------------------------------------------
    // Everything that changes the picture goes in: where the camera stands,
    // where it looks, what lens it is on, the aspect the shot is framed to, and
    // which model layers this path hides.  Everything else is deliberately
    // left out, so editing a hold time does not throw the picture away.
    // ------------------------------------------------------------
    function Na__VsThumb__BuildSignature(keyframe, framingKey) {
        return JSON.stringify({
            cam  : keyframe.VideoStudio__Keyframe__CameraPosition || null,
            lens : Na__VideoStudio__ProjectJson__GetKeyframeLensMm(keyframe),
            fit  : framingKey
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Per-Video Half of the Signature
    // ------------------------------------------------------------
    function Na__VsThumb__BuildFramingKey(video) {
        const exportOptions = Na__VideoStudio__ProjectJson__GetExportOptions(video);
        const layerOptions  = Na__VideoStudio__ProjectJson__GetModelLayerOptions(video);

        const aspect = (exportOptions.height > 0)
            ? (exportOptions.width / exportOptions.height)
            : 1.5;

        return {
            aspect : Number(aspect.toFixed(4)),
            layers : layerOptions.enabled ? (layerOptions.visibility || null) : null
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Frame Capture
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get a Scratch Canvas at the Requested Size
    // ------------------------------------------------------------
    function Na__VsThumb__GetScratch(width, height) {
        if (!Na__VsThumb__ScratchCanvas) {
            Na__VsThumb__ScratchCanvas = document.createElement('canvas');
        }

        const canvas = Na__VsThumb__ScratchCanvas;
        if (canvas.width !== width)  canvas.width  = width;
        if (canvas.height !== height) canvas.height = height;

        return canvas;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render One Frame Through the Live Pipeline
    // ------------------------------------------------------------
    // The realtime loop's per-frame sequence, minus the navigation updates
    // because the caller owns the camera, and minus the door animation because
    // a still should not leave doors standing open.
    // ------------------------------------------------------------
    function Na__VsThumb__RenderOneFrame(pipeline, sectionOverlayRenderer) {
        const camera = Na__VsThumb__Camera;

        Na__VerticalCorrection__ApplyFrame();                                // <-- Shear; no-ops when correction is off
        Na__CameraFollow__Update(camera);                                    // <-- Billboards face THIS camera, not the live one
        Na__FogPlane__UpdateFogPassPerFrame(Na__FogPlaneSystem__GetFogPass(), camera);
        Na__DistanceCulling__Update(camera.position);                        // <-- MaxEngine culling; internal no-op when off

        pipeline.updateAoUniforms(camera);                                   // <-- Sync SSAO camera matrices
        pipeline.renderDepthPrePass();                                       // <-- Depth capture for SSAO and fog
        pipeline.renderProfileNormals();                                     // <-- Profile lines normals pre-pass

        pipeline.composer.render();                                          // <-- Full post-processing chain

        if (sectionOverlayRenderer) sectionOverlayRenderer(camera);          // <-- Section caps after post, as the live loop does
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Copy the Live Canvas into a Thumbnail Data URL
    // ------------------------------------------------------------
    // Must run in the same task as the render that produced the frame.  The
    // crop is centred and sized to the export aspect, so the tile shows the
    // framing the video will have rather than the framing the window happens
    // to have.
    // ------------------------------------------------------------
    function Na__VsThumb__CaptureToDataUrl(aspect) {
        const source = Na__VsThumb__Renderer.domElement;
        const srcW   = source.width  || 1;
        const srcH   = source.height || 1;

        // CROP | Take the tallest region of the export aspect that fits inside
        // the rendered frame, centred on it.
        const cropH = Math.min(srcH, srcW / aspect);
        const cropW = cropH * aspect;
        const cropX = (srcW - cropW) / 2;
        const cropY = (srcH - cropH) / 2;

        const outH = Na__VsThumb__HEIGHT_PX;
        const outW = Math.max(2, Math.min(Na__VsThumb__MAX_WIDTH_PX, Math.round(outH * aspect)));

        const canvas = Na__VsThumb__GetScratch(outW, outH);
        const ctx    = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, outW, outH);
        ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

        return canvas.toDataURL(Na__VsThumb__FORMAT, Na__VsThumb__QUALITY);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Bring a Video's Thumbnails Up to Date
    // ------------------------------------------------------------
    // Renders only the waypoints whose picture has actually changed, all in one
    // synchronous burst so nothing flickers, then puts the live camera and every
    // per-frame system back exactly as they were.
    //
    // Returns { rendered, pending, ready }:
    //   rendered  how many frames this call drew
    //   pending   how many waypoints are still waiting on a later call
    //   ready     false when the pipeline cannot render yet, so the caller
    //             knows to draw placeholders and try again
    // ------------------------------------------------------------
    function Na__VideoStudio__Thumbnails__SyncVideo(video) {
        const idle = { rendered: 0, pending: 0, ready: false };
        if (!video) return idle;
        if (Na__VsThumb__Suspended) return idle;                             // <-- An export owns the renderer; ask again later

        const pipeline = Na__VsThumb__ResolvePipeline();
        if (!Na__VsThumb__Renderer || !Na__VsThumb__Camera || !pipeline.composer) return idle;

        const keyframes = Na__VideoStudio__ProjectJson__GetSortedKeyframes(video);
        if (keyframes.length === 0) return { rendered: 0, pending: 0, ready: true };

        const framingKey = Na__VsThumb__BuildFramingKey(video);

        // STALE SET | Work out what actually needs drawing before touching the
        // camera, so a fully cached path costs nothing at all.
        const stale = [];
        keyframes.forEach((keyframe) => {
            const id        = keyframe.VideoStudio__Keyframe__Id;
            const signature = Na__VsThumb__BuildSignature(keyframe, framingKey);
            const cached    = Na__VsThumb__Cache.get(id);
            if (!cached || cached.signature !== signature) stale.push({ keyframe, id, signature });
        });

        if (stale.length === 0) return { rendered: 0, pending: 0, ready: true };

        const batch   = stale.slice(0, Na__VsThumb__MAX_PER_BURST);
        const pending = stale.length - batch.length;

        const camera = Na__VsThumb__Camera;

        // SAVED STATE | Everything the burst mutates
        const savedPosition   = camera.position.clone();
        const savedQuaternion = camera.quaternion.clone();
        const savedFov        = camera.fov;

        const sectionOverlayRenderer = Na__SectionClipping__GetOverlayRenderer();   // <-- Null until a section exists
        const layerOptions           = Na__VideoStudio__ProjectJson__GetModelLayerOptions(video);

        let layerSession = false;
        let rendered     = 0;

        Na__VideoStudio__PathVisualizer__SetSuppressed('thumbnails', true);   // <-- The path must never appear in a tile

        try {
            layerSession = Na__VideoStudio__ModelLayers__Begin(layerOptions.enabled, layerOptions.visibility);

            batch.forEach(({ keyframe, id, signature }) => {
                if (!Na__VideoStudio__Camera__ApplyKeyframe(camera, keyframe)) return;

                camera.updateMatrixWorld(true);
                Na__VsThumb__RenderOneFrame(pipeline, sectionOverlayRenderer);

                const dataUrl = Na__VsThumb__CaptureToDataUrl(framingKey.aspect);   // <-- Same task; buffer still valid
                if (dataUrl) {
                    Na__VsThumb__Cache.set(id, { signature, dataUrl });
                    rendered++;
                }
            });

        } catch (error) {
            console.warn('[VideoStudio] Thumbnail render failed:', error && error.message);

        } finally {
            Na__VideoStudio__ModelLayers__End(layerSession);

            // RESTORE | Put the viewpoint back.
            camera.position.copy(savedPosition);
            camera.quaternion.copy(savedQuaternion);
            camera.fov = savedFov;
            camera.updateProjectionMatrix();
            camera.updateMatrixWorld(true);

            if (Na__VsThumb__Controls && typeof Na__VsThumb__Controls.update === 'function') {
                Na__VsThumb__Controls.update();
            }

            Na__VideoStudio__PathVisualizer__SetSuppressed('thumbnails', false);   // <-- Before the redraw, so the path is in it

            // REDRAW | The canvas is currently holding the last waypoint's
            // frame, and RequestRender only schedules a redraw for the next
            // animation frame.  Leaving it there would let the browser
            // composite that frame first, which is a visible flash of a view
            // the user is not standing at.  Rendering the live camera here,
            // still inside this task, means the only frame ever composited is
            // the right one, and the whole burst is invisible.
            try {
                Na__VsThumb__RenderOneFrame(pipeline, sectionOverlayRenderer);
            } catch (redrawError) {
                console.warn('[VideoStudio] Thumbnail redraw failed:', redrawError && redrawError.message);
            }

            Na__RenderLoop__RequestRender();                                 // <-- Hand the loop back its normal cadence
        }

        return { rendered, pending, ready: true };
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Cached Thumbnail as an Image Source
    // ------------------------------------------------------------
    // Returns null when the waypoint has not been rendered yet, which is the
    // timeline's cue to draw a numbered placeholder tile instead.
    // ------------------------------------------------------------
    function Na__VideoStudio__Thumbnails__Get(keyframeId) {
        const entry = Na__VsThumb__Cache.get(keyframeId);
        return entry ? entry.dataUrl : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Drop Cached Thumbnails
    // ------------------------------------------------------------
    // Pass a keyframe id to drop one, or nothing to drop the lot.  Used by the
    // timeline's Refresh control, and on project load.
    // ------------------------------------------------------------
    function Na__VideoStudio__Thumbnails__Invalidate(keyframeId) {
        if (keyframeId) Na__VsThumb__Cache.delete(keyframeId);
        else            Na__VsThumb__Cache.clear();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Timeline Thumbnail API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__Thumbnails__SetRenderContext,
        Na__VideoStudio__Thumbnails__IsReady,
        Na__VideoStudio__Thumbnails__SetSuspended,
        Na__VideoStudio__Thumbnails__SyncVideo,
        Na__VideoStudio__Thumbnails__Get,
        Na__VideoStudio__Thumbnails__Invalidate
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
