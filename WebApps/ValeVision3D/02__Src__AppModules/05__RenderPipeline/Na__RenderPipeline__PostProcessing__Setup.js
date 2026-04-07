// -----------------------------------------------------------------------------
// REGION | Render Pipeline - Post Processing Setup
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Post Processing
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
    import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
    import { Na__RenderEffect__ProfileLines__Create } from './Na__RenderEffect__ProfileLines__.js';
    // ------------------------------------------------------------


    // FUNCTION | Setup Post Processing Composer
    // ------------------------------------------------------------
    function Na__RenderPipeline__SetupComposer(renderer, scene, camera, profileLinesConfig, fogPass, orbitTarget) {
        const pixelRatio = renderer.getPixelRatio();
        const width      = window.innerWidth * pixelRatio;
        const height     = window.innerHeight * pixelRatio;

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

        // Wrapped renderProfileNormals that respects the runtime toggle
        const originalRenderProfileNormals = renderProfileNormals;
        renderProfileNormals = () => {
            if (!profileLinesRuntimeEnabled) return;
            originalRenderProfileNormals();
        };
        
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
            profileLinesPassRef
        };
    }
    // ------------------------------------------------------------


    // MODULE EXPORTS | Render Pipeline API
    // ------------------------------------------------------------
    export {
        Na__RenderPipeline__SetupComposer
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
