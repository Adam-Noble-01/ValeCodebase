// =============================================================================
// VALEVISION3D - VIDEO STUDIO - DETERMINISTIC FRAME RENDERER
// =============================================================================
//
// FILE       : Na__VideoStudio__Export__FrameRenderer.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Deterministic Frame Renderer
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Render exact, individually addressable frames at export
//              resolution through the live post-processing pipeline
// CREATED    : 12-Aug-2026
//
// DESCRIPTION:
// - Borrows the live WebGLRenderer, resizes it and the whole effect chain to
//   the export resolution once, renders any number of frames through it, then
//   restores every mutated value.  Same borrow-and-restore discipline as
//   Na__ImageExport__StaticExport__TiledRenderer.js, which is the precedent
//   for touching the live engine safely.
// - Each frame runs the exact per-frame sequence the realtime loop runs, so an
//   exported frame carries profile lines, SSAO, fog planes, camera-follow
//   billboards, distance culling and the cross section overlay identically to
//   what the viewport shows.
// - Frames are rendered on demand rather than in real time.  The camera is
//   placed at an exact point on the timeline, one frame is rendered, and the
//   caller reads the canvas.  Machine speed therefore has no effect on the
//   result: a slow GPU produces the same video as a fast one, just later.
//
// ANTI-ALIASING:
// - With antiAliasSamples at 4, 8 or 16 the effect chain runs that many times
//   per frame with sub-pixel camera jitter and the results are averaged onto
//   the canvas (Na__VideoStudio__Export__Supersampler.js). The composer stops
//   drawing to the canvas for the session and FXAA stands aside; both are put
//   back by end(). At 1 the frame is a single pass with FXAA, exactly as
//   before the setting existed.
// - The per-frame scene systems (doors, billboards, culling) still run once
//   per frame. Only the passes that read the projection repeat per sample.
//
// NO TILING:
// - The still exporter tiles because a 12000px 2D output canvas exceeds
//   browser limits.  Video tops out at 3840x2160, well inside every desktop
//   WebGL framebuffer limit, so each frame is a single pass.  That also keeps
//   fat linework and profile line widths correct with no seam compensation.
//
// DRAWING BUFFER LIFETIME:
// - preserveDrawingBuffer is off on the live renderer, so the framebuffer is
//   valid only until the browser next composites.  renderFrame therefore
//   returns the canvas and the caller MUST capture from it synchronously in
//   the same task, before any await.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 12-Aug-2026 - Version 1.0.0
// - Initial implementation for the Video Studio system.
//
// 11-Sep-2026 - Version 1.0.1
// - end() resyncs the orbit controls only while orbit owns the camera, so an
//   export started in walk or fly hands back the view it borrowed unchanged.
//
// 11-Sep-2026 - Version 1.1.0
// - Supersampled anti-aliasing: antiAliasSamples renders each frame 4, 8 or
//   16 times with sub-pixel jitter and averages them, so shallow linework no
//   longer leaves the export stair-stepped. Shadow maps are drawn once per
//   frame rather than once per sample.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Vertical Perspective Correction
    // ------------------------------------------------------------
    import { Na__VerticalCorrection__ApplyFrame } from '../11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Fog Plane System (Per-Frame Shader Uniform Refresh)
    // ------------------------------------------------------------
    import { Na__FogPlaneSystem__GetFogPass } from '../29__System__FogPlaneSystem/Na__FogPlaneSystem__SystemLogic.js';
    import { Na__FogPlane__UpdateFogPassPerFrame } from '../29__System__FogPlaneSystem/Na__FogPlaneSystem__FogShaderEffect.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Linework Settings (Export Line Width Compensation)
    // ------------------------------------------------------------
    import { Na__LineworkSettings__SetExportScales } from '../05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Cross Section Overlay (After-Composer Pass)
    // ------------------------------------------------------------
    import {
        Na__SectionClipping__GetOverlayRenderer,
        Na__SectionClipping__GetExportModeHandler
    } from '../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Per-Frame Scene Systems
    // ------------------------------------------------------------
    import { Na__DoorAnimation__Update }  from '../25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js';
    import { Na__DoorProximity__Update }  from '../25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js';
    import { Na__CameraFollow__Update }   from '../25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__CameraFollowBillboards__.js';
    import { Na__DistanceCulling__Update } from '../05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Path Visualizer Suppression
    // @delegate: ./Na__VideoStudio__Viewport__PathVisualizer.js
    // ------------------------------------------------------------
    import { Na__VideoStudio__PathVisualizer__SetSuppressed } from './Na__VideoStudio__Viewport__PathVisualizer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Supersampled Anti-Aliasing
    // @delegate: ./Na__VideoStudio__Export__Supersampler.js
    // ------------------------------------------------------------
    import { Na__VideoStudio__Supersampler__Create } from './Na__VideoStudio__Export__Supersampler.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Export Resolution Bounds
    // ------------------------------------------------------------
    // 8K needs a 7680px framebuffer. Desktop WebGL reports a 16384 max texture
    // size almost universally, so the width is not the constraint; VRAM for the
    // composer's render targets is, which the Dev menu warns about before an
    // 8K render starts.
    const Na__VsFrame__MAX_DIMENSION = 7680;   // <-- 8K UHD width
    const Na__VsFrame__MIN_DIMENSION = 128;    // <-- Below this the effect chain is meaningless
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pipeline Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Render Pipeline State Surface
    // ------------------------------------------------------------
    // Mirrors the resolver used by the still exporter: surfaces the composer
    // plus every optional resize and pre-pass hook, filling absent MaxEngine
    // extras with no-ops so PureEngine needs no branching downstream.
    // fxaaPass is null when the engine does not expose it; supersampling then
    // still works, it just averages FXAA-softened samples.
    // ------------------------------------------------------------
    function Na__VsFrame__ResolvePipeline(getRenderPipelineState) {
        const noop  = () => {};
        const empty = {
            composer: null, renderProfileNormals: noop, setProfileLinesSize: noop, setFxaaSize: noop,
            setDepthPrePassSize: noop, setAoSize: noop, updateAoUniforms: noop, renderDepthPrePass: noop,
            fxaaPass: null
        };

        const state = (typeof getRenderPipelineState === 'function') ? getRenderPipelineState() : null;
        if (!state) return empty;

        // BACKWARD COMPAT | A legacy getter may return the composer directly
        if (typeof state.render === 'function' && !state.composer) {
            return { ...empty, composer: state };
        }

        const fn = (candidate) => (typeof candidate === 'function') ? candidate : noop;

        return {
            composer            : state.composer || null,
            renderProfileNormals: fn(state.renderProfileNormals),
            setProfileLinesSize : fn(state.setProfileLinesSize),
            setFxaaSize         : fn(state.setFxaaSize),
            setDepthPrePassSize : fn(state.setDepthPrePassSize),
            setAoSize           : fn(state.setAoSize),
            updateAoUniforms    : fn(state.updateAoUniforms),
            renderDepthPrePass  : fn(state.renderDepthPrePass),
            fxaaPass            : state.fxaaPassRef || null
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Clamp a Requested Export Size to Renderable, Even Dimensions
    // ------------------------------------------------------------
    // H.264 encodes in 4:2:0 chroma, which requires even dimensions on both
    // axes.  Returns { width, height, wasClamped }.
    // ------------------------------------------------------------
    function Na__VideoStudio__FrameRenderer__ClampExportSize(requestedWidth, requestedHeight) {
        const rawW = Math.round(requestedWidth)  || Na__VsFrame__MIN_DIMENSION;
        const rawH = Math.round(requestedHeight) || Na__VsFrame__MIN_DIMENSION;

        const scale = Math.min(
            1,
            Na__VsFrame__MAX_DIMENSION / Math.max(rawW, rawH)                // <-- Uniform downscale preserves aspect
        );

        let width  = Math.max(Na__VsFrame__MIN_DIMENSION, Math.round(rawW * scale));
        let height = Math.max(Na__VsFrame__MIN_DIMENSION, Math.round(rawH * scale));

        width  -= (width  % 2);                                              // <-- Force even for 4:2:0 chroma
        height -= (height % 2);

        return { width, height, wasClamped: (width !== rawW || height !== rawH) };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render Session
// -----------------------------------------------------------------------------

    // FUNCTION | Begin a Deterministic Frame Render Session
    // ------------------------------------------------------------
    // options:
    //   renderer               {THREE.WebGLRenderer}  Live renderer (borrowed)
    //   scene                  {THREE.Scene}
    //   camera                 {THREE.PerspectiveCamera}
    //   controls               {OrbitControls|null}
    //   getRenderPipelineState {Function}  Pipeline state getter
    //   width, height          {number}    Export dimensions in pixels
    //   animationsEnabled      {boolean}   Drive proximity doors along the path
    //   antiAliasSamples       {number}    1 for a single FXAA pass, or 4, 8 or
    //                                      16 to supersample every frame
    //
    // Returns a session object:
    //   canvas                 {HTMLCanvasElement}  Read frames from this
    //   width, height          {number}             Clamped dimensions in use
    //   antiAliasSamples       {number}             Samples per frame in use
    //   renderFrame(deltaMs)   Renders one frame; capture SYNCHRONOUSLY after
    //   end()                  Restores all live-engine state (always call it)
    //
    // Throws when the pipeline has no composer to render through.
    // ------------------------------------------------------------
    function Na__VideoStudio__FrameRenderer__BeginSession(options) {
        const {
            renderer, scene, camera, controls = null,
            getRenderPipelineState,
            width : requestedWidth,
            height: requestedHeight,
            animationsEnabled = true,
            antiAliasSamples  = 1
        } = options;

        if (!renderer || !camera) {
            throw new Error('Frame renderer needs a live renderer and camera.');
        }

        const fit      = Na__VideoStudio__FrameRenderer__ClampExportSize(requestedWidth, requestedHeight);
        const outW     = fit.width;
        const outH     = fit.height;
        const pipeline = Na__VsFrame__ResolvePipeline(getRenderPipelineState);
        const composer = pipeline.composer;

        if (!composer) {
            throw new Error('Render pipeline is not ready. Load the model before exporting.');
        }

        // SAVED STATE | Everything mutated below is restored by end()
        // ------------------------------------------------------------
        const savedSize       = renderer.getSize(new THREE.Vector2());
        const savedPixelRatio = renderer.getPixelRatio();
        const savedAspect     = camera.aspect;
        const savedFov        = camera.fov;
        const savedPosition   = camera.position.clone();
        const savedQuaternion = camera.quaternion.clone();

        // LINE WIDTH COMPENSATION | Profile lines resolve against the physical
        // viewport height, so they need scaling to the export height.  Fat
        // linework resolves against each material's load-time resolution
        // uniform, which already scales with the framebuffer, so it needs none.
        // ------------------------------------------------------------
        const savedPhysicalHeight = savedSize.y * savedPixelRatio;
        const profileExportScale  = (savedPhysicalHeight > 0) ? (outH / savedPhysicalHeight) : 1.0;

        // CONTEXT LOSS GUARD | Surface GPU death as a real error
        // ------------------------------------------------------------
        let contextLost = false;
        const onContextLost = () => { contextLost = true; };
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);

        const sectionOverlayRenderer   = Na__SectionClipping__GetOverlayRenderer();     // <-- Null until a section exists
        const sectionExportModeHandler = Na__SectionClipping__GetExportModeHandler();   // <-- Null until the system initializes

        let isEnded = false;

        // SESSION SETUP | Renderer, composer and camera to export dimensions
        // ------------------------------------------------------------
        Na__VideoStudio__PathVisualizer__SetSuppressed('export', true);       // <-- Overlay must never appear in a frame

        // BLANK THE CANVAS | The drawing buffer is about to become the export
        // resolution while the element's CSS box stays viewport-sized, so the
        // browser scales every rendered frame into it and the result reads as a
        // flicker. Hiding the element stops that being visible. It does not
        // affect rendering: WebGL draws into the drawing buffer regardless of
        // whether the element is composited, and the VideoFrame is constructed
        // from that buffer, not from the page.
        const savedCanvasVisibility = renderer.domElement.style.visibility;
        renderer.domElement.style.visibility = 'hidden';

        renderer.setPixelRatio(1);                                            // <-- Exact 1:1 pixel mapping
        renderer.setSize(outW, outH, false);                                  // <-- Drawing buffer only; leave canvas CSS alone

        if (typeof composer.setPixelRatio === 'function') {
            composer.setPixelRatio(1);                                        // <-- Composer holds its own ratio from construction
        }
        composer.setSize(outW, outH);
        pipeline.setProfileLinesSize(outW, outH);
        pipeline.setFxaaSize(outW, outH);
        pipeline.setDepthPrePassSize(outW, outH);                             // <-- MaxEngine extra; no-op under PureEngine
        pipeline.setAoSize(outW, outH);                                       // <-- MaxEngine extra; no-op under PureEngine

        // ASPECT | camera.fov is the VERTICAL field of view, and it is left
        // untouched here. Setting only the aspect therefore holds the vertical
        // framing exactly as the viewport shows it and changes how much is seen
        // to the left and right. A 1:1 export at 2160 shows the same top and
        // bottom as a 16:9 export at 2160, cropped at the sides. Nothing is ever
        // squashed to fit the frame.
        camera.aspect = outW / outH;
        camera.updateProjectionMatrix();

        Na__LineworkSettings__SetExportScales(profileExportScale, 1.0);

        if (sectionExportModeHandler) {
            sectionExportModeHandler(true, 1.0);                              // <-- Hide plane gizmos, keep outline widths
        }

        // SUPERSAMPLING | Null unless 4, 8 or 16 samples were asked for. While
        // it runs, the composer leaves each sample in its read buffer instead
        // of drawing it to the canvas, and FXAA stands aside so the samples
        // are averaged sharp. Both are put back by end().
        // ------------------------------------------------------------
        const supersampler = Na__VideoStudio__Supersampler__Create({
            renderer,
            width   : outW,                                                   // <-- The composer's buffer size at pixel ratio 1
            height  : outH,
            samples : antiAliasSamples
        });

        const fxaaPass            = pipeline.fxaaPass;
        const savedFxaaEnabled    = fxaaPass ? fxaaPass.enabled : true;
        const savedRenderToScreen = composer.renderToScreen;

        if (supersampler) {
            composer.renderToScreen = false;                                  // <-- Every pass renders offscreen; the result ends in readBuffer
            if (fxaaPass) fxaaPass.enabled = false;
        }

        // HELPER FUNCTION | Run the Effect Chain Once Through the Projection
        // ------------------------------------------------------------
        // Everything in here reads the camera's projection, so it repeats for
        // every supersample: fog and SSAO copy the (jittered) matrices into
        // their uniforms, and each pre-pass renders through them.
        // ------------------------------------------------------------
        function renderEffectChain() {
            Na__FogPlane__UpdateFogPassPerFrame(Na__FogPlaneSystem__GetFogPass(), camera);
            pipeline.updateAoUniforms(camera);                                // <-- Sync SSAO camera matrices
            pipeline.renderDepthPrePass();                                    // <-- Depth capture for SSAO and fog
            pipeline.renderProfileNormals();                                  // <-- Profile lines normals pre-pass

            composer.render();                                                // <-- Full post-processing chain
        }
        // ------------------------------------------------------------

        // HELPER FUNCTION | Render, Jitter and Average Every Sample of a Frame
        // ------------------------------------------------------------
        // Shadow maps are drawn with the first sample and reused by the rest.
        // Lights and geometry are frozen for the length of a frame and the
        // jitter moves only the view camera, so every later shadow pass would
        // redraw identical maps.
        // ------------------------------------------------------------
        function renderSupersampledFrame() {
            const shadowMap        = renderer.shadowMap;
            const shadowAutoUpdate = shadowMap.autoUpdate;

            supersampler.captureBaseProjection(camera);                       // <-- After the lens and shear are settled for this frame

            try {
                for (let i = 0; i < supersampler.sampleCount; i++) {
                    if (i === 1) shadowMap.autoUpdate = false;                // <-- Keep the maps the first sample drew

                    supersampler.applyJitter(camera, i);
                    renderEffectChain();
                    supersampler.accumulate(composer.readBuffer.texture, i);
                }
            } finally {
                shadowMap.autoUpdate = shadowAutoUpdate;
                supersampler.restoreProjection(camera);                       // <-- Unjittered for the section overlay and the next frame
            }

            if (contextLost) {
                throw new Error('The graphics context was lost during export. Close other tabs and try a lower resolution.');
            }

            supersampler.present();                                           // <-- The averaged frame onto the canvas
        }
        // ------------------------------------------------------------

        return {
            canvas : renderer.domElement,
            width  : outW,
            height : outH,
            wasClamped : fit.wasClamped,
            antiAliasSamples : supersampler ? supersampler.sampleCount : 1,

            // FUNCTION | Render Exactly One Frame at the Current Camera State
            // ------------------------------------------------------------
            // The caller places the camera first, then calls this, then reads
            // the canvas synchronously before yielding.
            // ------------------------------------------------------------
            renderFrame(deltaMs) {
                if (contextLost) {
                    throw new Error('The graphics context was lost during export. Close other tabs and try a lower resolution.');
                }

                const frameDelta = Number.isFinite(deltaMs) ? deltaMs : 0;

                // PER-FRAME SYSTEMS | Same order the realtime loop uses, minus
                // the navigation updates because the timeline owns the camera.
                // Once per frame, however many samples follow.
                Na__VerticalCorrection__ApplyFrame();                         // <-- Shear; no-ops when correction is off

                if (animationsEnabled) {
                    Na__DoorProximity__Update(camera.position);                // <-- Doors open as the path approaches them
                    Na__DoorAnimation__Update(frameDelta);                     // <-- Advance door swing by exactly one frame
                }

                Na__CameraFollow__Update(camera);                             // <-- Rotate camera-follow billboards
                Na__DistanceCulling__Update(camera.position);                 // <-- MaxEngine culling; internal no-op when off

                if (supersampler) {
                    renderSupersampledFrame();
                } else {
                    renderEffectChain();                                      // <-- One pass; FXAA draws it to the canvas
                }

                if (sectionOverlayRenderer) {
                    sectionOverlayRenderer(camera);                           // <-- Section caps after post, as the live loop does
                }

                return renderer.domElement;                                   // <-- Valid only until the caller yields
            },
            // ------------------------------------------------------------

            // FUNCTION | Restore All Borrowed Live-Engine State
            // ------------------------------------------------------------
            // Safe to call more than once; the caller should always call it in
            // a finally block.
            // ------------------------------------------------------------
            end() {
                if (isEnded) return;
                isEnded = true;

                renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

                if (supersampler) {
                    composer.renderToScreen = savedRenderToScreen;            // <-- The live loop draws to the canvas again
                    if (fxaaPass) fxaaPass.enabled = savedFxaaEnabled;
                    supersampler.dispose();                                   // <-- Frees the export-sized accumulation buffer
                }

                Na__LineworkSettings__SetExportScales(1.0, 1.0);              // <-- Back to live viewport line widths

                if (sectionExportModeHandler) {
                    sectionExportModeHandler(false, 1.0);                     // <-- Restore gizmo visibility
                }

                camera.position.copy(savedPosition);                          // <-- Put the user's viewpoint back
                camera.quaternion.copy(savedQuaternion);
                camera.fov    = savedFov;
                camera.aspect = savedAspect;
                camera.updateProjectionMatrix();
                camera.updateMatrixWorld(true);

                // ORBIT ONLY | Walk and fly switch the controls off while they
                // own the camera; an update would re-aim the restored view at
                // orbit's leftover target and clamp its distance to it.
                if (controls && controls.enabled !== false && typeof controls.update === 'function') {
                    controls.update();                                        // <-- Resync orbit controls to the restored camera
                }

                renderer.setPixelRatio(savedPixelRatio);
                renderer.setSize(savedSize.x, savedSize.y);

                if (typeof composer.setPixelRatio === 'function') {
                    composer.setPixelRatio(savedPixelRatio);                  // <-- Restore in lockstep with the renderer
                }
                composer.setSize(savedSize.x, savedSize.y);
                pipeline.setProfileLinesSize(savedSize.x, savedSize.y);
                pipeline.setFxaaSize(savedSize.x, savedSize.y);
                pipeline.setDepthPrePassSize(savedSize.x, savedSize.y);
                pipeline.setAoSize(savedSize.x, savedSize.y);

                Na__VerticalCorrection__ApplyFrame();                         // <-- Re-apply shear to the live viewport
                pipeline.renderProfileNormals();                              // <-- Refresh normals at viewport size

                Na__VideoStudio__PathVisualizer__SetSuppressed('export', false);

                renderer.domElement.style.visibility = savedCanvasVisibility;  // <-- Viewport visible again

                Na__RenderLoop__RequestRender();                              // <-- Redraw with restored state
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Frame Renderer API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__FrameRenderer__BeginSession,
        Na__VideoStudio__FrameRenderer__ClampExportSize
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
