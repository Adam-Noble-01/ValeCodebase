// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - RENDER TARGET POOL
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__RenderTargetPool__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Render Target Pool
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Own the small, fixed set of tile-sized WebGL render targets the
//              structural exporter reuses across every pass, and dispose them
//              on teardown or context loss.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - The export is bounded by ONE full-size 2D output canvas plus this pool.
//   It is never bounded by how many layers were ticked. Ten selected passes
//   allocate exactly the same GPU memory as one.
// - Three slots only:
//     * structural - RGBA16F. rgb = encoded view normal, a = globally
//                    normalised linear view depth. Half float rather than
//                    float halves the footprint, and the alpha channel
//                    carries a pre-normalised 0..1 value so half float's
//                    mantissa is spent where it matters.
//     * output     - RGBA8, no MSAA. Every pass lands here and is read back
//                    from here. MSAA would soften ID masks into invalid
//                    in-between colours, so samples stay at zero.
//     * scratch    - RGBA8, allocated lazily. Only the passes that genuinely
//                    need a second colour buffer (HED's luminance term,
//                    ambient occlusion's source) ever touch it.
// - Targets resize in place. A preview at 1600px and an export tile at 2112px
//   reuse the same GPU allocations rather than churning them.
//
// COLOUR SPACE, AND WHY BOTH TARGETS ARE NoColorSpace:
// - Every pass this system writes is DATA. Depth, Normal, the edge families
//   and the masks all encode meaning into bytes, so the byte written must be
//   the byte intended, with no transfer function anywhere in the path.
// - Making the output target sRGB was tried and is wrong. Three gamma-encoded
//   the raw values the system's own full screen shader writes, so the Normal
//   map's 128,128,255 background left as 230,230,230 and every derived pass
//   was lifted the same way. Measured on a real export: the shader wrote
//   linear 0.789, the file contained byte 230 rather than 201.
// - The authored-colour problem that change was trying to solve is fixed at
//   its actual source instead. Three converts a material colour from sRGB into
//   its linear working space on assignment, so the ID mask materials now
//   author their colours in the WORKING space and skip that conversion; see
//   Na__ExportRenderLayers__SurfaceRenderer__.js. The byte written is then the
//   byte the manifest promises, with the target left alone.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Aug-2026 - Version 1.0.0
// - Initial implementation for the Export Render Layers system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Utilities
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Target Factories
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Structural G-Buffer Target
    // ------------------------------------------------------------
    // NearestFilter throughout: the edge shaders sample exact texels and
    // any interpolation would invent geometry that is not there.
    // ------------------------------------------------------------
    function Na__ErlPool__CreateStructuralTarget(width, height) {
        const target = new THREE.WebGLRenderTarget(width, height, {
            minFilter     : THREE.NearestFilter,
            magFilter     : THREE.NearestFilter,
            format        : THREE.RGBAFormat,
            type          : THREE.HalfFloatType,
            depthBuffer   : true,
            stencilBuffer : false,
            samples       : 0,
            colorSpace    : THREE.NoColorSpace                          // <-- Data, not colour; no transfer function
        });
        target.texture.name = 'ExportRenderLayers_StructuralGBuffer';
        return target;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build an Eight-Bit Output Target
    // ------------------------------------------------------------
    // samples: 0 is deliberate. ID masks, silhouettes and inpaint masks
    // must stay binary / flat so every read-back colour has a manifest
    // dictionary entry.
    // ------------------------------------------------------------
    function Na__ErlPool__CreateByteTarget(width, height, name, wantDepth) {
        const target = new THREE.WebGLRenderTarget(width, height, {
            minFilter     : THREE.NearestFilter,
            magFilter     : THREE.NearestFilter,
            format        : THREE.RGBAFormat,
            type          : THREE.UnsignedByteType,
            depthBuffer   : !!wantDepth,
            stencilBuffer : false,
            samples       : 0,
            colorSpace    : THREE.NoColorSpace                          // <-- Bytes are written exactly as encoded; see the header
        });
        target.texture.name = name;
        return target;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pool Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Create a Render Target Pool
    // ------------------------------------------------------------
    // Returns:
    //   {
    //     acquireStructural(w, h),
    //     acquireOutput(w, h),
    //     acquireScratch(w, h),
    //     dispose()
    //   }
    //
    // Acquire calls resize in place and return the same target every time.
    // Callers must never dispose a returned target themselves.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__TargetPool__Create() {
        let structuralTarget = null;
        let outputTarget     = null;
        let scratchTarget    = null;


        // SUB FUNCTION | Resize a Target Only When the Size Actually Changed
        // ---------------------------------------------------------------
        function resizeIfNeeded(target, width, height) {
            if (target.width !== width || target.height !== height) {
                target.setSize(width, height);
            }
            return target;
        }
        // ---------------------------------------------------------------


        return {

            // FUNCTION | Acquire the Structural G-Buffer Target
            // ------------------------------------------------------------
            acquireStructural(width, height) {
                if (!structuralTarget) {
                    structuralTarget = Na__ErlPool__CreateStructuralTarget(width, height);
                    return structuralTarget;
                }
                return resizeIfNeeded(structuralTarget, width, height);
            },
            // ------------------------------------------------------------


            // FUNCTION | Acquire the Eight-Bit Output Target
            // ------------------------------------------------------------
            acquireOutput(width, height) {
                if (!outputTarget) {
                    outputTarget = Na__ErlPool__CreateByteTarget(width, height, 'ExportRenderLayers_Output', true);
                    return outputTarget;
                }
                return resizeIfNeeded(outputTarget, width, height);
            },
            // ------------------------------------------------------------


            // FUNCTION | Acquire the Lazy Eight-Bit Scratch Target
            // ------------------------------------------------------------
            acquireScratch(width, height) {
                if (!scratchTarget) {
                    scratchTarget = Na__ErlPool__CreateByteTarget(width, height, 'ExportRenderLayers_Scratch', true);
                    return scratchTarget;
                }
                return resizeIfNeeded(scratchTarget, width, height);
            },
            // ------------------------------------------------------------


            // FUNCTION | Dispose Every Allocated Target
            // ------------------------------------------------------------
            // Called on feature teardown and on WebGL context loss. Safe to
            // call more than once; a re-acquire simply rebuilds the target.
            // ------------------------------------------------------------
            dispose() {
                if (structuralTarget) { structuralTarget.dispose(); structuralTarget = null; }
                if (outputTarget)     { outputTarget.dispose();     outputTarget     = null; }
                if (scratchTarget)    { scratchTarget.dispose();    scratchTarget    = null; }
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Render Target Pool API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__TargetPool__Create
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
