// =============================================================================
// VALEVISION3D - RENDER PIPELINE - PUREENGINE COMPOSER SETUP
// =============================================================================
//
// FILE       : Na__RenderPipeline__PureEngine__Setup.js
// NAMESPACE  : Na__RenderPipeline
// MODULE     : PureEngine Composer Setup
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : ValeVision PureEngine — the default lightweight whitecard pipeline
// CREATED    : 10-Jun-2026
//
// DESCRIPTION:
// - This is ValeVision's ORIGINAL render pipeline, relocated unchanged into the
//   PureEngine folder as part of the dual-render-engine architecture.
// - PureEngine is the DEFAULT engine for every model and must remain the
//   super-simplified whitecard pipeline: RenderPass -> ProfileLines (optional)
//   -> Fog (optional, via insertFogPass) -> FXAA.
// - NO MaxEngine systems (SSAO, DataLib, depth pre-pass, AO layers) may ever
//   be imported here. See .cursor/rules/07-RenderEngine-Architecture-.mdc.
// - LAYER 1 HERE MEANS AUTHORING HELPERS. The compass and the drawing planes sit
//   on layer 1 so the profile-line passes skip them, and the camera enables it so
//   the scene render draws them. It is not MaxEngine's AO exclusion: nothing else
//   is on that layer under this engine, because restoring the materials returns
//   every AO-excluded mesh to layer 0.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Jun-2026 - Version 1.0.0
// - Relocated verbatim from 05__RenderPipeline/Na__RenderPipeline__PostProcessing__Setup.js.
// - Function renamed Na__RenderPipeline__SetupComposer -> Na__RenderPipeline__PureEngine__SetupComposer.
// - No behavioural changes.
//
// 11-Sep-2026 - Version 1.0.1
// - Pipeline state exposes fxaaPassRef, so the Video Studio exporter can stand
//   FXAA aside while it supersamples. The live chain is unchanged.
//
// 04-Nov-2026 - Version 1.0.2
// - Layer 1 enabled on the camera and blinded around the profile-line passes, as
//   MaxEngine does. On a session that never built MaxEngine the compass and the
//   drawing planes were not drawn at all; after a switch back from MaxEngine they
//   were drawn but entered the normal and colour passes and spoilt the lines.
//
// 13-Nov-2026 - ValeVision3D v2.98.5
// - Render targets, profile lines and FXAA are sized to the 3D view's own box
//   (Na__ViewportSize__Get), which now stops under the top bar, not the window.
//

// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Render Pipeline - PureEngine Post Processing Setup
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Post Processing
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
    import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
    import { Na__RenderEffect__ProfileLines__Create } from '../Na__RenderEffect__ProfileLines__.js';
    import { Na__ViewportSize__Get } from '../../01__AppCore/Na__AppCore__ViewportSize__.js';
    // ------------------------------------------------------------


    // FUNCTION | Setup PureEngine Post Processing Composer
    // ------------------------------------------------------------
    function Na__RenderPipeline__PureEngine__SetupComposer(renderer, scene, camera, profileLinesConfig, fogPass, orbitTarget) {
        const pixelRatio = renderer.getPixelRatio();
        const viewSize   = Na__ViewportSize__Get();                          // <-- The 3D view's box (under the top bar), not the window
        const width      = viewSize.width * pixelRatio;
        const height     = viewSize.height * pixelRatio;

        // HELPER LAYER SETUP | Layer 1 = authoring helpers (compass, drawing planes), drawn by the scene render
        camera.layers.enable(1);                                           // <-- Without this nothing on layer 1 is drawn on a session that never built MaxEngine

        const depthTextureFallback = new THREE.DepthTexture(width, height); // <-- Fallback for fog when profile lines are disabled
        depthTextureFallback.type  = THREE.FloatType;

        const renderTarget = new THREE.WebGLRenderTarget(width, height, {
            minFilter    : THREE.LinearFilter,
            magFilter    : THREE.LinearFilter,
            format       : THREE.RGBAFormat,
            type         : THREE.HalfFloatType,
            samples      : 4,
            depthTexture : depthTextureFallback
        });
        
        const composer = new EffectComposer(renderer, renderTarget);
        composer.addPass(new RenderPass(scene, camera));
        
        let renderProfileNormals = () => {};
        let setProfileLinesSize = () => {};
        let invalidateProfileLinesCache = () => {};
        let profileLinesPassRef = null;
        let profileNormalTarget = null;                                    // <-- Exposed for 2D profile lines module
        let profileColorTarget  = null;                                    // <-- Exposed for 2D profile lines module
        let profileLinesDepthTexture = null;                               // <-- Depth texture from profile normal pass (avoids separate depth render)
        
        const profileLinesEnabled = profileLinesConfig
            && profileLinesConfig.RenderEffect__ProfileLines__Enabled === true;
        if (profileLinesEnabled) {
            const profileLines = Na__RenderEffect__ProfileLines__Create(renderer, scene, camera, profileLinesConfig, viewSize.width, viewSize.height, orbitTarget);
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

        // DEPTH SOURCE | Use normal-pass depth when available, fall back to render target depth
        const depthTexture = profileLinesDepthTexture || depthTextureFallback;

        // FOG PASS | Inserted after profile lines, before FXAA
        let fogPassRef = null;
        if (fogPass) {
            fogPass.material.depthWrite = false;
            fogPass.material.depthTest  = false;
            fogPass.uniforms['tDepth'].value = depthTexture;
            composer.addPass(fogPass);
            fogPassRef = fogPass;
        }

        // LATE FOG PASS INSERTION | Wire a fog pass after async system init
        function insertFogPass(lateFogPass) {
            if (!lateFogPass || fogPassRef) return;
            try {
                lateFogPass.material.depthWrite = false;
                lateFogPass.material.depthTest  = false;
                lateFogPass.uniforms['tDepth'].value = depthTexture;

                const fxaaIdx = composer.passes.indexOf(fxaaPass);
                if (fxaaIdx >= 0) {
                    composer.passes.splice(fxaaIdx, 0, lateFogPass);
                } else {
                    composer.addPass(lateFogPass);
                }
                fogPassRef = lateFogPass;
            } catch (err) {
                console.error('[ValeVision3D] Failed to insert fog pass:', err);
            }
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
        // excludes authoring helpers (layer 1) from the normal, depth and profile
        // colour captures, so the Sobel never outlines them and fog never reads them.
        const originalRenderProfileNormals = renderProfileNormals;
        renderProfileNormals = () => {
            if (!profileLinesRuntimeEnabled) return;
            camera.layers.disable(1);                                      // <-- Exclude helpers from normals + depth + profile colour capture
            originalRenderProfileNormals();
            camera.layers.enable(1);                                       // <-- Restore layer 1 visibility for the scene render
        };
        
        const fxaaPass = new ShaderPass(FXAAShader);
        fxaaPass.material.depthWrite = false;
        fxaaPass.material.depthTest  = false;
        fxaaPass.material.uniforms['resolution'].value.x = 1 / (viewSize.width * pixelRatio);
        fxaaPass.material.uniforms['resolution'].value.y = 1 / (viewSize.height * pixelRatio);
        composer.addPass(fxaaPass);

        function setFxaaSize(w, h) {
            const currentPixelRatio = renderer.getPixelRatio();
            fxaaPass.material.uniforms['resolution'].value.x = 1 / (w * currentPixelRatio);
            fxaaPass.material.uniforms['resolution'].value.y = 1 / (h * currentPixelRatio);
        }
        
        return {
            engineName : 'PureEngine',                                     // <-- Identifies the active engine for diagnostics
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
            fxaaPassRef : fxaaPass                                         // <-- Video export bypasses FXAA while it supersamples
        };
    }
    // ------------------------------------------------------------


    // MODULE EXPORTS | Render Pipeline API
    // ------------------------------------------------------------
    export {
        Na__RenderPipeline__PureEngine__SetupComposer
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
