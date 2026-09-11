// =============================================================================
// VALEVISION3D - VIDEO STUDIO - EXPORT SUPERSAMPLER
// =============================================================================
//
// FILE       : Na__VideoStudio__Export__Supersampler.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Export Supersampler
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Anti-alias exported video frames by rendering each one several
//              times with sub-pixel camera jitter and averaging the results
// CREATED    : 11-Sep-2026
//
// DESCRIPTION:
// - FXAA is the only anti-aliasing the live pipeline has. It works out edges
//   from each pixel's neighbours and searches along an edge for about 20px at
//   most, so a long shallow line (an eaves or ridge line a degree or two off
//   horizontal) keeps its hard steps: every step is longer than the search can
//   see. Those steps also crawl along the line as the camera moves, which a
//   still hides and a video does not.
// - The supersampler renders the whole frame N times, shifting the projection
//   by a fraction of a pixel each time, and averages the N results. Every pixel
//   then records how much of its area each surface and line really covers, so
//   shallow lines resolve into smooth gradients and a line drifting across the
//   pixel grid changes smoothly instead of jumping a pixel at a time.
// - The jitter goes into the projection matrix itself, so EVERY pass sees it:
//   the scene, the fat linework, the profile line normal pre-pass, fog, SSAO
//   and its blur. Jittering the scene pass alone, which is what three's
//   SSAARenderPass does, would leave the profile lines as stepped as before.
//
// SAMPLE PATTERNS:
// - The Direct3D standard multisample positions, the ones GPUs use for
//   hardware MSAA. Each is an N-rooks pattern: no two samples share a row or a
//   column, so a near-horizontal or near-vertical edge, the worst case for
//   stair-stepping, gets N distinct coverage levels rather than a few.
// - Every offset sits inside the pixel (a box filter). Lines stay as sharp as
//   the viewport draws them, just without the steps.
// - Each pattern is re-centred on the pixel centre when the module loads. The
//   16 sample table as published averages 1/32px off centre, which would nudge
//   the whole picture against the section overlay drawn after it.
//
// ACCUMULATION:
// - Each sample's final composer output is added into a half-float target at
//   a weight of 1/N, and the total is then copied to the canvas, where the
//   encoder reads it. Half float holds a 16 sample sum without banding, and
//   blending into it works wherever WebGL2 renders to half float at all, which
//   the composer's own targets already rely on.
// - The copy to the canvas does no blending and no colour conversion, exactly
//   like the FXAA pass it stands in for, so the colours and alpha reaching the
//   encoder are what the composer would have drawn, averaged.
// - FXAA itself is bypassed while supersampling (the frame renderer switches
//   the pass off). It would soften each sample before the average and blur
//   the linework for nothing.
//
// USAGE (per frame, inside one synchronous block):
//   supersampler.captureBaseProjection(camera);
//   for (let i = 0; i < supersampler.sampleCount; i++) {
//       supersampler.applyJitter(camera, i);
//       ...pre-passes and composer.render()...
//       supersampler.accumulate(composer.readBuffer.texture, i);
//   }
//   supersampler.restoreProjection(camera);
//   supersampler.present();
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Sep-2026 - Version 1.0.0
// - Initial implementation: 4x, 8x and 16x supersampled anti-aliasing for MP4
//   exports.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Direct3D Standard Multisample Positions
    // ------------------------------------------------------------
    // Integer offsets on a 16 x 16 grid across one pixel, so each value is
    // sixteenths of a pixel from the pixel centre.
    // ------------------------------------------------------------
    const Na__VsSs__RAW_PATTERNS = {
        4 : [
            [-2, -6], [ 6, -2], [-6,  2], [ 2,  6]
        ],
        8 : [
            [ 1, -3], [-1,  3], [ 5,  1], [-3, -5],
            [-5,  5], [-7, -1], [ 3,  7], [ 7, -7]
        ],
        16: [
            [ 1,  1], [-1, -3], [-3,  2], [ 4, -1],
            [-5, -2], [ 2,  5], [ 5,  3], [ 3, -5],
            [-2,  6], [ 0, -7], [-4, -6], [-6,  4],
            [-8,  0], [ 7, -4], [ 6,  7], [-7, -8]
        ]
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Shared Full Screen Vertex Shader
    // ------------------------------------------------------------
    const Na__VsSs__VERTEX_SHADER = /* glsl */`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sample Pattern Preparation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert a Raw Pattern to Centred Pixel Offsets
    // ------------------------------------------------------------
    function Na__VsSs__CentrePattern(rawPattern) {
        const count = rawPattern.length;
        const meanX = rawPattern.reduce((sum, p) => sum + p[0], 0) / count;
        const meanY = rawPattern.reduce((sum, p) => sum + p[1], 0) / count;

        return rawPattern.map(p => [
            (p[0] - meanX) / 16,                                             // <-- Sixteenths to pixels, mean at the pixel centre
            (p[1] - meanY) / 16
        ]);
    }
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Centred Offsets by Sample Count, in Pixels
    // ------------------------------------------------------------
    const Na__VsSs__PATTERNS = Object.freeze({
        4 : Na__VsSs__CentrePattern(Na__VsSs__RAW_PATTERNS[4]),
        8 : Na__VsSs__CentrePattern(Na__VsSs__RAW_PATTERNS[8]),
        16: Na__VsSs__CentrePattern(Na__VsSs__RAW_PATTERNS[16])
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Supersampler Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Create a Supersampler for One Export Session
    // ------------------------------------------------------------
    // options:
    //   renderer      {THREE.WebGLRenderer}  Live renderer (borrowed)
    //   width, height {number}               Export size in pixels, which is
    //                                        also the composer's buffer size
    //   samples       {number}               4, 8 or 16
    //
    // Returns null for any count without a pattern (1 included), so the caller
    // falls back to a single FXAA frame. Call dispose() when the session ends.
    // ------------------------------------------------------------
    function Na__VideoStudio__Supersampler__Create(options) {
        const { renderer, width, height, samples } = options || {};

        const offsets = Na__VsSs__PATTERNS[samples];
        if (!renderer || !offsets || !(width > 0) || !(height > 0)) return null;

        const sampleCount  = offsets.length;
        const sampleWeight = 1 / sampleCount;

        // ACCUMULATION TARGET | Colour only; nothing here needs depth
        // ------------------------------------------------------------
        const accumTarget = new THREE.WebGLRenderTarget(width, height, {
            minFilter     : THREE.NearestFilter,
            magFilter     : THREE.NearestFilter,
            format        : THREE.RGBAFormat,
            type          : THREE.HalfFloatType,
            depthBuffer   : false,
            stencilBuffer : false
        });
        accumTarget.texture.name = 'Na__VideoStudio__Supersampler__Accumulation';

        // ACCUMULATE MATERIAL | Adds one sample at 1/N weight: ONE, ONE on
        // colour and alpha alike, so alpha averages exactly as colour does
        // ------------------------------------------------------------
        const accumMaterial = new THREE.ShaderMaterial({
            name           : 'Na__VideoStudio__Supersampler__Accumulate',
            uniforms       : {
                tSample : { value: null },
                uWeight : { value: sampleWeight }
            },
            vertexShader   : Na__VsSs__VERTEX_SHADER,
            fragmentShader : /* glsl */`
                uniform sampler2D tSample;
                uniform float     uWeight;
                varying vec2      vUv;
                void main() {
                    gl_FragColor = texture2D(tSample, vUv) * uWeight;
                }
            `,
            blending           : THREE.CustomBlending,
            blendEquation      : THREE.AddEquation,
            blendSrc           : THREE.OneFactor,
            blendDst           : THREE.OneFactor,
            blendEquationAlpha : THREE.AddEquation,
            blendSrcAlpha      : THREE.OneFactor,
            blendDstAlpha      : THREE.OneFactor,
            depthTest          : false,
            depthWrite         : false
        });

        // PRESENT MATERIAL | Straight copy to the canvas, as the FXAA pass
        // would have written it: no blending, no colour conversion
        // ------------------------------------------------------------
        const presentMaterial = new THREE.ShaderMaterial({
            name           : 'Na__VideoStudio__Supersampler__Present',
            uniforms       : {
                tAccum : { value: accumTarget.texture }
            },
            vertexShader   : Na__VsSs__VERTEX_SHADER,
            fragmentShader : /* glsl */`
                uniform sampler2D tAccum;
                varying vec2      vUv;
                void main() {
                    gl_FragColor = texture2D(tAccum, vUv);
                }
            `,
            blending   : THREE.NoBlending,
            depthTest  : false,
            depthWrite : false
        });

        const accumQuad   = new FullScreenQuad(accumMaterial);
        const presentQuad = new FullScreenQuad(presentMaterial);

        // SCRATCH | Reused every frame, never reallocated
        // ------------------------------------------------------------
        const baseProjection        = new THREE.Matrix4();
        const baseProjectionInverse = new THREE.Matrix4();
        const jitterMatrix          = new THREE.Matrix4();
        const savedClearColor       = new THREE.Color();

        let isDisposed = false;

        return {
            sampleCount,

            // FUNCTION | Remember the Frame's Unjittered Projection
            // ------------------------------------------------------------
            // Call once per frame, after anything that rebuilds the projection
            // (a lens change, the vertical correction shear) and before the
            // first applyJitter.
            // ------------------------------------------------------------
            captureBaseProjection(camera) {
                baseProjection.copy(camera.projectionMatrix);
                baseProjectionInverse.copy(camera.projectionMatrixInverse);
            },
            // ------------------------------------------------------------

            // FUNCTION | Shift the Projection for One Sample
            // ------------------------------------------------------------
            // A clip-space translation applied after the projection, so it
            // shifts whatever frustum the camera has, sheared by vertical
            // correction or not. Two NDC units span the frame, hence 2 / size.
            // ------------------------------------------------------------
            applyJitter(camera, index) {
                const offset = offsets[index % sampleCount];

                jitterMatrix.makeTranslation(
                    (2 * offset[0]) / width,
                    (2 * offset[1]) / height,
                    0
                );

                camera.projectionMatrix.copy(baseProjection).premultiply(jitterMatrix);
                camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();   // <-- Fog and SSAO rebuild positions from this
            },
            // ------------------------------------------------------------

            // FUNCTION | Put the Unjittered Projection Back
            // ------------------------------------------------------------
            restoreProjection(camera) {
                camera.projectionMatrix.copy(baseProjection);
                camera.projectionMatrixInverse.copy(baseProjectionInverse);
            },
            // ------------------------------------------------------------

            // FUNCTION | Add One Rendered Sample into the Running Total
            // ------------------------------------------------------------
            // Sample 0 clears the total first. The renderer's target, clear
            // colour and autoClear are all handed back as found.
            // ------------------------------------------------------------
            accumulate(sampleTexture, index) {
                const savedTarget     = renderer.getRenderTarget();
                const savedAutoClear  = renderer.autoClear;
                const savedClearAlpha = renderer.getClearAlpha();
                renderer.getClearColor(savedClearColor);

                renderer.autoClear = false;                                  // <-- Rendering must add to the total, not wipe it
                renderer.setRenderTarget(accumTarget);

                if (index === 0) {
                    renderer.setClearColor(0x000000, 0);
                    renderer.clear(true, false, false);                      // <-- Fresh total for this frame
                    renderer.setClearColor(savedClearColor, savedClearAlpha);
                }

                accumMaterial.uniforms.tSample.value = sampleTexture;
                accumQuad.render(renderer);
                accumMaterial.uniforms.tSample.value = null;                 // <-- Drop the reference to the composer's buffer

                renderer.autoClear = savedAutoClear;
                renderer.setRenderTarget(savedTarget);
            },
            // ------------------------------------------------------------

            // FUNCTION | Copy the Averaged Frame to the Canvas
            // ------------------------------------------------------------
            present() {
                const savedTarget = renderer.getRenderTarget();

                renderer.setRenderTarget(null);                              // <-- The canvas the encoder reads
                presentQuad.render(renderer);
                renderer.setRenderTarget(savedTarget);
            },
            // ------------------------------------------------------------

            // FUNCTION | Release GPU Resources
            // ------------------------------------------------------------
            // Safe to call more than once. The quads are left alone on
            // purpose: FullScreenQuad.dispose() frees the one triangle every
            // ShaderPass in the app shares, which would make the live
            // pipeline upload it again on its next frame for no reason.
            // ------------------------------------------------------------
            dispose() {
                if (isDisposed) return;
                isDisposed = true;

                accumTarget.dispose();
                accumMaterial.dispose();
                presentMaterial.dispose();
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Supersampler API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__Supersampler__Create
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
