// =============================================================================
// VALEVISION3D - DRAWING VIEW CORE - COMPOSER PRESET
// =============================================================================
//
// FILE       : Na__DrawView__ComposerPreset__.js
// NAMESPACE  : Na__DrawPreset
// MODULE     : Drawing View Core - Composer Preset
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Put the live composer into drawing mode while a 2D drawing owns the viewport
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - A drawing renders THROUGH the live composer rather than around it (plan
//   decision D12), the way the legacy Elevation View does: the RenderPass
//   camera is swapped to the drawing's orthographic camera and the passes
//   that would shade a parallel drawing like a surface are switched off for
//   the duration. Everything is put back exactly on exit.
// - What changes on entry:
//     RenderPass camera      -> the drawing camera
//     fog                    -> off (fog plane system), restored on exit
//     ambient occlusion      -> off under MaxEngine, restored on exit
//     scene background       -> the paper colour, restored on exit
//     profile lines          -> the ortho-aware 2D pre-pass at a fixed width
//                               (the 3D pre-pass reads the perspective camera
//                               and would ink the wrong edges), colour and
//                               threshold overridable from config
// - Owns the ONE way a drawing frame is rendered: RenderFrame runs the 2D
//   normals pre-pass, the composer, then the section overlay through the
//   drawing camera. The render loop calls it each frame and the thumbnail
//   renderer calls it for captures, so the card can never differ from the
//   viewport.
// - Announces itself on na-elevation-camera-changed exactly as the legacy tool
//   does, so the Cross Sections tool parks its gizmo drags and the render
//   loop's active-camera bookkeeping stays coherent.
//
// INTEGRATION:
// - Initialised from index.html with the renderer, scene, cameras and the
//   pipeline ref; every tuned value is read from Na__DrawView__ConfigState__.
// - Na__FloorPlan__ModeController__ and the elevation controller call Enter
//   when their camera takes the viewport and Exit before flying back.
// - Na__AppFlow__LoadingSequence.js calls RenderFrame from the drawing branch.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProfileLines__.js (purpose only)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.18.0 (port Phase 2)
// - Parity        : diverged (D12)
// - Divergences   :
//   - TrueVision bypasses its composer and inks silhouettes with its own Sobel overlay; ValeVision keeps
//     the composer and reuses Na__2dProfileLines__Create from the legacy Elevation View.
//   - The fixed 2D edge width is written straight to the pass uniform (the 3D pre-pass rewrites it every
//     frame, so nothing needs restoring); the LineworkSettings profile factor still multiplies it.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.2.0
// - GetExportOverrides: the image export renders a drawing through the ortho
//   camera with the 2D profile pre-pass, keeping the visible height and
//   fitting the width to the export aspect (port Phase 4).
//
// 09-Sep-2026 - Version 1.1.0
// - Config reading moved to Na__DrawView__ConfigState__ (port Phase 3); the
//   preset no longer fetches the system JSON itself.
//
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 2.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Core
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Ortho-Aware Profile Lines Pre-Pass (legacy Elevation View)
    // ------------------------------------------------------------
    // @delegate: ../40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js
    // ------------------------------------------------------------
    import { Na__2dProfileLines__Create } from '../40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Fog, Linework Settings, Section Overlay and Render Loop
    // ------------------------------------------------------------
    import {
        Na__FogPlaneSystem__SetFogEnabled,
        Na__FogPlaneSystem__IsFogEnabled
    } from '../29__System__FogPlaneSystem/Na__FogPlaneSystem__SystemLogic.js';
    import { Na__LineworkSettings__GetProfileLineFactor } from '../05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js';
    import { Na__SectionClipping__GetOverlayRenderer } from '../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js';
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Drawing Config
    // ------------------------------------------------------------
    // @delegate: ./Na__DrawView__ConfigState__.js
    // ------------------------------------------------------------
    import { Na__DrawCfg__GetRenderSetup } from './Na__DrawView__ConfigState__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Thumbnail Renderer Frame Hook
    // ------------------------------------------------------------
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js
    // ------------------------------------------------------------
    import { Na__PresentationMode__Thumbnail__SetFrameRenderer } from '../21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Event Shared With the Legacy Elevation View
    // ------------------------------------------------------------
    const Na__DrawPreset__CAMERA_EVENT = 'na-elevation-camera-changed';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Injected References
    // ------------------------------------------------------------
    let Na__DrawPreset__Renderer    = null;
    let Na__DrawPreset__Scene       = null;
    let Na__DrawPreset__PerspCamera = null;
    let Na__DrawPreset__PipelineRef = null;   // <-- { current } mutable ref; rebuilt on engine switch
    // ------------------------------------------------------------

    // MODULE VARIABLES | Active Preset State
    // ------------------------------------------------------------
    let Na__DrawPreset__Active         = false;
    let Na__DrawPreset__Camera         = null;   // <-- The drawing camera while active
    let Na__DrawPreset__Styles         = null;   // <-- Per-drawing style toggles in force
    let Na__DrawPreset__ProfilePass2d  = null;   // <-- Ortho-aware normals pre-pass (per composer instance)
    let Na__DrawPreset__Saved          = null;   // <-- Everything to put back on exit
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pipeline Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Live Pipeline State (null before the model loads)
    // ------------------------------------------------------------
    function Na__DrawPreset__Pipeline() {
        return (Na__DrawPreset__PipelineRef && Na__DrawPreset__PipelineRef.current) || null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find the Composer's RenderPass
    // ------------------------------------------------------------
    function Na__DrawPreset__GetRenderPass() {
        const pipeline = Na__DrawPreset__Pipeline();
        if (!pipeline || !pipeline.composer || !pipeline.composer.passes) return null;
        const passes = pipeline.composer.passes;
        for (let i = 0; i < passes.length; i++) {
            if (passes[i].isRenderPass) return passes[i];
        }
        return (passes[0] && passes[0].camera) ? passes[0] : null;               // <-- Fallback: first pass with a camera
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get or Create the 2D Profile Pre-Pass for the Live Composer
    // ------------------------------------------------------------
    function Na__DrawPreset__EnsureProfilePass() {
        if (Na__DrawPreset__ProfilePass2d) return Na__DrawPreset__ProfilePass2d;
        if (!Na__DrawPreset__Renderer || !Na__DrawPreset__Scene || !Na__DrawPreset__PipelineRef) return null;
        Na__DrawPreset__ProfilePass2d = Na__2dProfileLines__Create(Na__DrawPreset__Renderer, Na__DrawPreset__Scene, Na__DrawPreset__PipelineRef);
        return Na__DrawPreset__ProfilePass2d;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the Fixed Drawing Edge Width, Colour and Threshold
    // ------------------------------------------------------------
    // The 3D pre-pass rewrites u_edgeWidth every frame, so the width needs no
    // restoring. Colour and threshold are not rewritten, so their originals
    // are stashed for exit.
    // ------------------------------------------------------------
    function Na__DrawPreset__ApplyEdgeUniforms(setup) {
        const pipeline = Na__DrawPreset__Pipeline();
        const pass     = pipeline && pipeline.profileLinesPassRef;
        if (!pass || !pass.material || !pass.material.uniforms) return;
        const u = pass.material.uniforms;

        if (u.u_edgeWidth) u.u_edgeWidth.value = setup.edgeWidth * Na__LineworkSettings__GetProfileLineFactor();

        if (u.u_edgeColor && setup.edgeColour !== null) {
            Na__DrawPreset__Saved.edgeColour = u.u_edgeColor.value.clone();
            u.u_edgeColor.value.set(setup.edgeColour);
        }
        if (u.u_edgeThresholdNormal && Number.isFinite(setup.edgeThresholdNormal)) {
            Na__DrawPreset__Saved.edgeThreshold = u.u_edgeThresholdNormal.value;
            u.u_edgeThresholdNormal.value = setup.edgeThresholdNormal;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put the Edge Colour and Threshold Back
    // ------------------------------------------------------------
    function Na__DrawPreset__RestoreEdgeUniforms() {
        const pipeline = Na__DrawPreset__Pipeline();
        const pass     = pipeline && pipeline.profileLinesPassRef;
        if (!pass || !pass.material || !pass.material.uniforms || !Na__DrawPreset__Saved) return;
        const u = pass.material.uniforms;
        if (Na__DrawPreset__Saved.edgeColour && u.u_edgeColor)         u.u_edgeColor.value.copy(Na__DrawPreset__Saved.edgeColour);
        if (Number.isFinite(Na__DrawPreset__Saved.edgeThreshold) && u.u_edgeThresholdNormal) {
            u.u_edgeThresholdNormal.value = Na__DrawPreset__Saved.edgeThreshold;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Switch Ambient Occlusion Off, Remembering Whether It Was On
    // ------------------------------------------------------------
    // MaxEngine exposes only a toggle that returns the new state, so the pass
    // is toggled once and, if that turned it ON, toggled straight back.
    // ------------------------------------------------------------
    function Na__DrawPreset__SuspendAo() {
        const pipeline = Na__DrawPreset__Pipeline();
        if (!pipeline || typeof pipeline.toggleAo !== 'function') return false;
        const nowOn = pipeline.toggleAo();
        if (nowOn) {
            pipeline.toggleAo();                                                 // <-- It was off; leave it off
            return false;
        }
        return true;                                                             // <-- It was on; now off, restore on exit
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Enter, Exit, Styles
// -----------------------------------------------------------------------------

    // FUNCTION | Put the Composer Into Drawing Mode
    // ------------------------------------------------------------
    // context: { camera, styles }
    //   camera - the drawing's THREE.OrthographicCamera
    //   styles - { profileLinework, glassOpaque, whitecard, ... } per drawing
    // ------------------------------------------------------------
    function Na__DrawView__ComposerPreset__Enter(context) {
        if (!context || !context.camera) return false;
        if (Na__DrawPreset__Active) Na__DrawView__ComposerPreset__Exit();       // <-- Never stack two presets

        const renderPass = Na__DrawPreset__GetRenderPass();
        if (!renderPass) {
            console.warn('[ValeVision3D] Drawing preset: composer not ready, rendering the drawing unstyled.');
        }

        const setup = Na__DrawCfg__GetRenderSetup();
        Na__DrawPreset__Camera = context.camera;
        Na__DrawPreset__Styles = Object.assign({ profileLinework : true }, context.styles || {});
        Na__DrawPreset__Saved  = {
            renderPassCamera : renderPass ? renderPass.camera : null,
            background       : Na__DrawPreset__Scene ? Na__DrawPreset__Scene.background : null,
            fogWasOn         : Na__FogPlaneSystem__IsFogEnabled(),
            aoWasOn          : false,
            edgeColour       : null,
            edgeThreshold    : NaN
        };

        // CAMERA | The composer draws the drawing camera from here on
        Na__DrawPreset__Camera.updateMatrixWorld(true);
        if (renderPass) renderPass.camera = Na__DrawPreset__Camera;

        // FOG AND AO | Meaningless on a parallel drawing
        if (setup.disableFog && Na__DrawPreset__Saved.fogWasOn) Na__FogPlaneSystem__SetFogEnabled(false);
        if (setup.disableAo) Na__DrawPreset__Saved.aoWasOn = Na__DrawPreset__SuspendAo();

        // PAPER | The drawing sits on white, not on the sky
        if (Na__DrawPreset__Scene) Na__DrawPreset__Scene.background = new THREE.Color(setup.backgroundColour);

        // PROFILE LINES | Ortho-aware pre-pass at a fixed width
        const pass2d = Na__DrawPreset__EnsureProfilePass();
        if (pass2d) pass2d.invalidateSceneCache();                               // <-- The model may have changed since last time
        Na__DrawPreset__ApplyEdgeUniforms(setup);
        Na__DrawView__ComposerPreset__ApplyStyles(Na__DrawPreset__Styles);

        Na__DrawPreset__Active = true;

        // ANNOUNCE | Same contract as the legacy Elevation View
        window.dispatchEvent(new CustomEvent(Na__DrawPreset__CAMERA_EVENT, {
            detail : {
                camera                 : Na__DrawPreset__Camera,
                isOrtho                : true,
                render2dProfileNormals : Na__DrawPreset__RenderProfileNormals
            }
        }));

        Na__PresentationMode__Thumbnail__SetFrameRenderer(Na__DrawView__ComposerPreset__RenderFrame); // <-- Captures render the same frame
        Na__RenderLoop__RequestRender();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Put Everything Back
    // ------------------------------------------------------------
    function Na__DrawView__ComposerPreset__Exit() {
        if (!Na__DrawPreset__Active) return false;
        const saved      = Na__DrawPreset__Saved || {};
        const renderPass = Na__DrawPreset__GetRenderPass();
        const pipeline   = Na__DrawPreset__Pipeline();

        if (renderPass && saved.renderPassCamera) renderPass.camera = saved.renderPassCamera;
        if (Na__DrawPreset__Scene) Na__DrawPreset__Scene.background = saved.background;
        if (saved.fogWasOn) Na__FogPlaneSystem__SetFogEnabled(true);
        if (saved.aoWasOn && pipeline && typeof pipeline.toggleAo === 'function') pipeline.toggleAo();
        if (pipeline && pipeline.profileLinesPassRef) pipeline.profileLinesPassRef.enabled = true;   // <-- The 3D toggle owns it again
        Na__DrawPreset__RestoreEdgeUniforms();

        Na__DrawPreset__Active = false;
        Na__DrawPreset__Camera = null;
        Na__DrawPreset__Styles = null;
        Na__DrawPreset__Saved  = null;

        window.dispatchEvent(new CustomEvent(Na__DrawPreset__CAMERA_EVENT, {
            detail : { camera : Na__DrawPreset__PerspCamera, isOrtho : false }
        }));

        Na__PresentationMode__Thumbnail__SetFrameRenderer(null);
        Na__RenderLoop__RequestRender();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply a Drawing's Style Toggles While the Preset Is Live
    // ------------------------------------------------------------
    // Only the profile-line toggle is a composer matter; the material toggles
    // belong to Na__DrawView__MaterialPreset__.
    // ------------------------------------------------------------
    function Na__DrawView__ComposerPreset__ApplyStyles(styles) {
        const next     = Object.assign({}, Na__DrawPreset__Styles || {}, styles || {});
        Na__DrawPreset__Styles = next;

        const pipeline = Na__DrawPreset__Pipeline();
        const setup    = Na__DrawCfg__GetRenderSetup();
        if (pipeline && pipeline.profileLinesPassRef) {
            pipeline.profileLinesPassRef.enabled = setup.profileEnabled && next.profileLinework !== false;
        }
        Na__RenderLoop__RequestRender();
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Frame Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Run the 2D Normals Pre-Pass Through the Drawing Camera
    // ------------------------------------------------------------
    function Na__DrawPreset__RenderProfileNormals(camera) {
        const pipeline = Na__DrawPreset__Pipeline();
        if (!pipeline || !pipeline.profileLinesPassRef || !pipeline.profileLinesPassRef.enabled) return;
        const pass2d = Na__DrawPreset__EnsureProfilePass();
        if (pass2d) pass2d.renderProfileNormals(camera || Na__DrawPreset__Camera);
    }
    // ------------------------------------------------------------


    // FUNCTION | Render One Drawing Frame (pre-pass, composer, section overlay)
    // ------------------------------------------------------------
    // Returns false when the preset is not active so the caller can fall back
    // to the ordinary 3D frame.
    // ------------------------------------------------------------
    function Na__DrawView__ComposerPreset__RenderFrame() {
        if (!Na__DrawPreset__Active || !Na__DrawPreset__Camera) return false;
        const pipeline = Na__DrawPreset__Pipeline();

        if (pipeline && pipeline.composer) {
            if (typeof pipeline.renderDepthPrePass === 'function') pipeline.renderDepthPrePass(); // <-- MaxEngine depth texture (no-op when shared)
            Na__DrawPreset__RenderProfileNormals(Na__DrawPreset__Camera);
            pipeline.composer.render();
        } else if (Na__DrawPreset__Renderer && Na__DrawPreset__Scene) {
            Na__DrawPreset__Renderer.render(Na__DrawPreset__Scene, Na__DrawPreset__Camera);       // <-- No composer yet: plain render
        }

        const drawOverlay = Na__SectionClipping__GetOverlayRenderer();
        if (typeof drawOverlay === 'function') drawOverlay(Na__DrawPreset__Camera);              // <-- Cap fills and outlines on top
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Preset Live?
    // ------------------------------------------------------------
    function Na__DrawView__ComposerPreset__IsActive() {
        return Na__DrawPreset__Active;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Drawing Camera in Force (null When Inactive)
    // ------------------------------------------------------------
    function Na__DrawView__ComposerPreset__GetCamera() {
        return Na__DrawPreset__Active ? Na__DrawPreset__Camera : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Image Export Overrides While a Drawing Is on Screen (null in 3D)
    // ------------------------------------------------------------
    // The same contract the legacy Elevation View offers the tiled renderer:
    // the ortho camera, the 2D profile normals pass, and a frustum that keeps
    // the visible HEIGHT while fitting the width to the export aspect, so the
    // drawing is cropped or extended sideways rather than rescaled.
    // ------------------------------------------------------------
    function Na__DrawView__ComposerPreset__GetExportOverrides() {
        if (!Na__DrawPreset__Active || !Na__DrawPreset__Camera || !Na__DrawPreset__Camera.isOrthographicCamera) return null;
        const camera = Na__DrawPreset__Camera;
        let   saved  = null;

        return {
            camera               : camera,
            renderProfileNormals : Na__DrawPreset__RenderProfileNormals,
            resizeFrustum        : (outputWidth, outputHeight) => {
                saved = { left : camera.left, right : camera.right, top : camera.top, bottom : camera.bottom };
                const halfWidth = ((camera.top - camera.bottom) / 2) * (outputWidth / outputHeight);
                camera.left  = -halfWidth;
                camera.right =  halfWidth;
                camera.updateProjectionMatrix();
            },
            restoreFrustum       : () => {
                if (!saved) return;
                camera.left   = saved.left;
                camera.right  = saved.right;
                camera.top    = saved.top;
                camera.bottom = saved.bottom;
                camera.updateProjectionMatrix();
                saved = null;
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize the Composer Preset
    // ------------------------------------------------------------
    // context: { renderer, scene, camera, pipelineRef }
    // ------------------------------------------------------------
    function Na__DrawView__ComposerPreset__Initialize(context) {
        if (!context || !context.renderer || !context.scene || !context.pipelineRef) {
            console.warn('[ValeVision3D] Drawing composer preset init skipped - missing renderer, scene or pipeline ref.');
            return false;
        }
        Na__DrawPreset__Renderer    = context.renderer;
        Na__DrawPreset__Scene       = context.scene;
        Na__DrawPreset__PerspCamera = context.camera || null;
        Na__DrawPreset__PipelineRef = context.pipelineRef;

        // ENGINE SWITCH | The composer is rebuilt, so the pre-pass bound to the
        // old render targets is dropped and, if a drawing is up, re-applied.
        window.addEventListener('na-render-engine-changed', () => {
            Na__DrawPreset__ProfilePass2d = null;
            if (!Na__DrawPreset__Active) return;
            const renderPass = Na__DrawPreset__GetRenderPass();
            if (renderPass) {
                Na__DrawPreset__Saved.renderPassCamera = renderPass.camera;      // <-- The new composer's own camera
                renderPass.camera = Na__DrawPreset__Camera;
            }
            Na__DrawPreset__ApplyEdgeUniforms(Na__DrawCfg__GetRenderSetup());
            Na__DrawView__ComposerPreset__ApplyStyles(Na__DrawPreset__Styles);
        });
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Drawing Composer Preset API
    // ------------------------------------------------------------
    export {
        Na__DrawView__ComposerPreset__Initialize,
        Na__DrawView__ComposerPreset__Enter,
        Na__DrawView__ComposerPreset__Exit,
        Na__DrawView__ComposerPreset__ApplyStyles,
        Na__DrawView__ComposerPreset__RenderFrame,
        Na__DrawView__ComposerPreset__IsActive,
        Na__DrawView__ComposerPreset__GetCamera,
        Na__DrawView__ComposerPreset__GetExportOverrides
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
