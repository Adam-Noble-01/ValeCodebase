// =============================================================================
// VALEVISION3D - RENDER PIPELINE - MAXENGINE COMPOSER SETUP
// =============================================================================
//
// FILE       : Na__RenderPipeline__MaxEngine__Setup.js
// NAMESPACE  : Na__RenderPipeline
// MODULE     : MaxEngine Composer Setup
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : ValeVision MaxEngine — full PBR pipeline with SSAO (TrueVision port)
// CREATED    : 10-Jun-2026
//
// DESCRIPTION:
// - The opt-in, per-model "MaxEngine" render pipeline ported from TrueVision3D.
// - Adds screen-space ambient occlusion (SSAO + AO blur) on top of the shared
//   ProfileLines / Fog / FXAA stack used by PureEngine.
// - Pairs with the DataLib-driven PBR materials hot-swap (glass, mirrors, etc.)
//   activated by the loading sequence when this engine is selected.
//
// PASS ORDER (each pass reads from the previous pass's output via tDiffuse):
//   1. RenderPass        – renders the scene to a colour RT
//   2. Profile Lines     – architectural edge outlines (optional)
//   3. Fog               – fog plane shader pass (optional, via insertFogPass)
//   4. SSAO              – screen-space ambient occlusion (optional)
//   5. AO Blur           – 5x5 gaussian to smooth AO noise
//   6. FXAA              – fast approximate anti-aliasing (always last)
//
// DEPTH PRE-PASS:
// The fog and SSAO passes need a depth texture. This texture is captured into
// a SEPARATE WebGLRenderTarget (depthPrePassTarget) which is rendered BEFORE
// the EffectComposer runs each frame. This is critical because the composer
// ping-pongs between two internal render targets — attaching a DepthTexture
// directly to those targets causes a WebGL feedback loop. When profile lines
// are enabled their normal pass already writes an equivalent depth texture,
// so the dedicated pre-pass becomes a no-op (saving a full scene render).
//
// AO-EXCLUDED LAYER:
// Meshes tagged AoExclude (foliage etc.) are moved to Three.js layer 1 by the
// materials swap. Layer 1 stays visible in the main render but is temporarily
// disabled during depth/normal pre-passes so the SSAO shader never receives
// depth data for excluded geometry.
//
// LOGARITHMIC DEPTH:
// The renderer uses logarithmicDepthBuffer: true. Both the fog shader and the
// SSAO shader invert the log encoding via:
//   clipW = pow(cameraFar + 1.0, storedDepth) - 1.0
//
// ENGINE ISOLATION:
// No PureEngine file may import from this folder and vice versa. Shared
// infrastructure (ProfileLines, RenderLoop Invalidation) lives in the parent
// 05__RenderPipeline folder. See .cursor/rules/07-RenderEngine-Architecture-.mdc.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Jun-2026 - Version 1.0.0
// - Ported from TrueVision3D Na__RenderPipeline__PostProcessing__Setup.js.
// - Adapted to ValeVision's pipeline-state contract: exposes insertFogPass,
//   depthTexture, profileNormalTarget, profileColorTarget, profileLinesPassRef
//   so ImageExport / ElevationView / GridLines / 2D profile lines keep working.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Post Processing
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
    import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
    import { Na__RenderEffect__ProfileLines__Create } from '../Na__RenderEffect__ProfileLines__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Ambient Occlusion Effect (MaxEngine only)
    // ------------------------------------------------------------
    import {
        Na__RenderEffect__AmbientOcclusion__Create,
        Na__RenderEffect__AmbientOcclusion__CreatePerformanceMonitor
    } from '../../07__Scene__EnvironmentEffects/Na__RenderEffect__AmbientOcclusion__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | MaxEngine Composer Setup
// -----------------------------------------------------------------------------

    // FUNCTION | Setup MaxEngine Post Processing Composer
    // ------------------------------------------------------------
    // Parameters:
    //   renderer           – the WebGLRenderer
    //   scene              – the Three.js scene
    //   camera             – the perspective camera
    //   profileLinesConfig – AppConfig block for profile lines (or null)
    //   fogPass            – pre-built fog ShaderPass (or null; usually wired later via insertFogPass)
    //   orbitTarget        – orbit target Vector3 (for profile-line width scaling)
    //   aoConfig           – AppConfig block RenderEffect__AmbientOcclusion (or null)
    // ------------------------------------------------------------
    function Na__RenderPipeline__MaxEngine__SetupComposer(renderer, scene, camera, profileLinesConfig, fogPass, orbitTarget, aoConfig) {
        const pixelRatio = renderer.getPixelRatio();
        const width      = window.innerWidth * pixelRatio;
        const height     = window.innerHeight * pixelRatio;

        // AO-EXCLUDED LAYER SETUP | Layer 1 = AO-excluded objects (visible in main render)
        camera.layers.enable(1);                                           // <-- Keeps AoExclude meshes visible while pre-passes blind them

        // DEPTH PRE-PASS TARGET | Separate RT with a FloatType DepthTexture.
        // Rendered once per frame BEFORE the EffectComposer to provide a clean
        // depth texture for fog and SSAO without a WebGL feedback loop.
        const depthPrePassTarget = new THREE.WebGLRenderTarget(width, height, {
            minFilter    : THREE.NearestFilter,
            magFilter    : THREE.NearestFilter,
            format       : THREE.RedFormat,
            type         : THREE.UnsignedByteType,
            depthTexture : new THREE.DepthTexture(width, height, THREE.FloatType)
        });

        // COLOUR RENDER TARGET | Used by the EffectComposer ping-pong buffers.
        // Deliberately has NO DepthTexture (feedback loop) and NO MSAA samples
        // (SSAO requires a clean single-sample depth; FXAA provides the AA).
        const renderTarget = new THREE.WebGLRenderTarget(width, height, {
            minFilter    : THREE.LinearFilter,
            magFilter    : THREE.LinearFilter,
            format       : THREE.RGBAFormat,
            type         : THREE.HalfFloatType
        });

        const composer = new EffectComposer(renderer, renderTarget);

        // PASS 1 — SCENE RENDER
        composer.addPass(new RenderPass(scene, camera));

        // PASS 2 — PROFILE LINES (optional)
        let renderProfileNormals = () => {};
        let setProfileLinesSize = () => {};
        let invalidateProfileLinesCache = () => {};
        let profileLinesPassRef = null;
        let profileNormalTarget = null;                                    // <-- Exposed for 2D profile lines module
        let profileColorTarget  = null;                                    // <-- Exposed for 2D profile lines module
        let profileLinesDepthTexture = null;                               // <-- Depth texture from profile normal pass (avoids separate depth pre-pass)

        const profileLinesEnabled = profileLinesConfig
            && profileLinesConfig.RenderEffect__ProfileLines__Enabled === true;
        if (profileLinesEnabled) {
            const profileLines = Na__RenderEffect__ProfileLines__Create(renderer, scene, camera, profileLinesConfig, window.innerWidth, window.innerHeight, orbitTarget);
            profileLines.pass.material.depthWrite = false;
            profileLines.pass.material.depthTest  = false;
            composer.addPass(profileLines.pass);
            renderProfileNormals = profileLines.renderProfileNormals;
            setProfileLinesSize = profileLines.setSize;
            invalidateProfileLinesCache = profileLines.invalidateSceneCache;
            profileLinesPassRef = profileLines.pass;
            profileNormalTarget = profileLines.normalRenderTarget;         // <-- Expose for 2D elevation profile lines
            profileColorTarget  = profileLines.profileColorRenderTarget;   // <-- Expose for 2D elevation profile lines
            profileLinesDepthTexture = profileLines.depthTexture;          // <-- Normal pass already writes depth; reuse it
        }

        // DEPTH SOURCE | Use normal-pass depth when available, fall back to dedicated pre-pass
        const depthTexture = profileLinesDepthTexture || depthPrePassTarget.depthTexture;
        const needsSeparateDepthPrePass = !profileLinesDepthTexture;       // <-- Only render the extra depth pass when profile lines are off

        // SUB FUNCTION | Render Depth Pre-Pass (called from render loop)
        // ------------------------------------------------------------
        function renderDepthPrePass() {
            if (!needsSeparateDepthPrePass) return;                        // <-- Normal pass depth is shared; skip redundant render
            camera.layers.disable(1);                                      // <-- Exclude AO-exempt meshes from depth capture
            renderer.setRenderTarget(depthPrePassTarget);
            renderer.clear();
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
            camera.layers.enable(1);                                       // <-- Restore layer 1 visibility for main render
        }
        // ------------------------------------------------------------

        function setDepthPrePassSize(w, h) {
            const currentPixelRatio = renderer.getPixelRatio();
            depthPrePassTarget.setSize(w * currentPixelRatio, h * currentPixelRatio);
        }

        // PASS 3 — FOG (optional, usually wired later via insertFogPass)
        let fogPassRef = null;
        if (fogPass) {
            fogPass.material.depthWrite = false;
            fogPass.material.depthTest  = false;
            fogPass.uniforms['tDepth'].value = depthTexture;
            composer.addPass(fogPass);
            fogPassRef = fogPass;
        }

        // PASS 4 + 5 — SSAO + AO BLUR (optional)
        let updateAoUniforms = () => {};
        let setAoSize        = () => {};
        let monitorAoFrame   = () => {};
        let disableAo        = () => {};
        let enableAo         = () => {};
        let aoPassRef        = null;
        const aoEnabled = aoConfig
            && aoConfig.RenderEffect__AmbientOcclusion__Enabled === true;
        if (aoEnabled) {
            const aoState = Na__RenderEffect__AmbientOcclusion__Create(camera, aoConfig, depthTexture);

            composer.addPass(aoState.pass);                                // <-- SSAO
            composer.addPass(aoState.blurPass);                            // <-- AO Blur

            updateAoUniforms = aoState.updateUniforms;
            setAoSize        = aoState.setSize;
            disableAo        = aoState.disable;
            enableAo         = aoState.enable;
            aoPassRef        = aoState.pass;
            monitorAoFrame   = Na__RenderEffect__AmbientOcclusion__CreatePerformanceMonitor(aoState, aoConfig);
        }

        // LATE FOG PASS INSERTION | Wire a fog pass after async system init.
        // Inserted BEFORE the SSAO pass when AO is present (fog must be applied
        // to the scene colour before occlusion darkening), else before FXAA.
        function insertFogPass(lateFogPass) {
            if (!lateFogPass || fogPassRef) return;
            try {
                lateFogPass.material.depthWrite = false;
                lateFogPass.material.depthTest  = false;
                lateFogPass.uniforms['tDepth'].value = depthTexture;

                const anchorPass = aoPassRef || fxaaPass;                  // <-- Insert before SSAO when AO active, else before FXAA
                const anchorIdx  = composer.passes.indexOf(anchorPass);
                if (anchorIdx >= 0) {
                    composer.passes.splice(anchorIdx, 0, lateFogPass);
                } else {
                    composer.addPass(lateFogPass);
                }
                fogPassRef = lateFogPass;
            } catch (err) {
                console.error('[ValeVision3D] MaxEngine failed to insert fog pass:', err);
            }
        }

        // Runtime toggle — AO ON/OFF; returns the new state as a boolean
        function toggleAo() {
            if (!aoPassRef) return false;
            const currentlyOn = aoPassRef.enabled;
            if (currentlyOn) { disableAo(); } else { enableAo(); }
            return !currentlyOn;
        }

        // Runtime toggle — profile lines ON/OFF; returns new state
        let profileLinesRuntimeEnabled = true;
        function toggleProfileLines() {
            if (!profileLinesPassRef) return false;
            profileLinesRuntimeEnabled = !profileLinesRuntimeEnabled;
            profileLinesPassRef.enabled = profileLinesRuntimeEnabled;
            return profileLinesRuntimeEnabled;
        }

        // Wrapped renderProfileNormals that respects the runtime toggle and
        // excludes AO-exempt meshes (layer 1) from the normal/depth capture so
        // the SSAO shader never processes foliage pixels via this depth path.
        const originalRenderProfileNormals = renderProfileNormals;
        renderProfileNormals = () => {
            if (!profileLinesRuntimeEnabled) return;
            camera.layers.disable(1);                                      // <-- Exclude AO-exempt meshes from normals + depth capture
            originalRenderProfileNormals();
            camera.layers.enable(1);                                       // <-- Restore layer 1 visibility for main render
        };

        // PASS 6 — FXAA (always last)
        const fxaaPass = new ShaderPass(FXAAShader);
        fxaaPass.material.depthWrite = false;
        fxaaPass.material.depthTest  = false;
        fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
        fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
        composer.addPass(fxaaPass);

        function setFxaaSize(w, h) {
            const currentPixelRatio = renderer.getPixelRatio();
            fxaaPass.material.uniforms['resolution'].value.x = 1 / (w * currentPixelRatio);
            fxaaPass.material.uniforms['resolution'].value.y = 1 / (h * currentPixelRatio);
        }

        return {
            engineName : 'MaxEngine',                                      // <-- Identifies the active engine for diagnostics
            composer,
            renderProfileNormals,
            setProfileLinesSize,
            invalidateProfileLinesCache,
            setFxaaSize,
            toggleProfileLines,
            insertFogPass,
            depthTexture,
            profileNormalTarget,
            profileColorTarget,
            profileLinesPassRef,
            renderDepthPrePass,                                            // <-- MaxEngine extra: per-frame depth capture for SSAO/fog
            setDepthPrePassSize,                                           // <-- MaxEngine extra: resize the depth pre-pass RT
            updateAoUniforms,                                              // <-- MaxEngine extra: sync camera matrices into SSAO shader
            setAoSize,                                                     // <-- MaxEngine extra: update AO resolution uniforms
            monitorAoFrame,                                                // <-- MaxEngine extra: FPS-based AO auto-disable
            toggleAo                                                       // <-- MaxEngine extra: runtime AO toggle
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | MaxEngine Render Pipeline API
    // ------------------------------------------------------------
    export {
        Na__RenderPipeline__MaxEngine__SetupComposer
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
