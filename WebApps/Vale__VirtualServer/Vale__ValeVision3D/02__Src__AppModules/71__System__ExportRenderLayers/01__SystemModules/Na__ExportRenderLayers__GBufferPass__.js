// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - STRUCTURAL G-BUFFER PASS
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__GBufferPass__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Structural G-Buffer Pass
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Render every visible structural surface into one half-float
//              buffer carrying view-space normals and globally normalised
//              linear view depth - the single source every depth-derived and
//              edge-derived Qwen conditioning map reads from.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - Channel layout of the RGBA16F target:
//     rgb = viewNormal * 0.5 + 0.5
//     a   = clamp((viewDepth - nearM) / rangeM, 0, 1)   0 = near, 1 = far
// - Coverage is carried by the NORMAL, not by alpha. The target clears to
//   rgb = (0.5, 0.5, 0.5), which decodes to a zero-length normal - impossible
//   for real geometry, since every surface normal is unit length. That frees
//   the whole alpha range for depth with no sentinel value stolen from it,
//   which matters because half float only has an eleven-bit mantissa.
// - The material uses Three's logarithmic depth chunks so occlusion matches
//   ValeVision's logarithmic-depth renderer exactly, but the EXPORTED depth is
//   computed from view space (-mvPosition.z) rather than read back from the
//   logarithmic hardware sample. Exporting the log depth directly would give
//   Qwen a non-linear map that looks plausible and reads wrong.
// - Skinning, morph targets, instancing and BatchedMesh are supported through
//   the standard chunk chain, so anything ValeVision can render, it can export.
// - Cross-section clipping planes are re-applied every pass because an
//   override material bypasses per-mesh material.clippingPlanes entirely.
// - Surfaces are treated as opaque and double sided; back faces flip their
//   normal so a single-sided SketchUp face still reports outward orientation.
//   Exact linework is excluded by camera layer isolation, never by hiding.
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

    // MODULE IMPORTS | Cross Section Clipping Plane List
    // @delegate: ../../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js
    // ------------------------------------------------------------
    import { Na__SectionClipping__GetClipList } from '../../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shader Source
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Structural G-Buffer Vertex Shader
    // ------------------------------------------------------------
    // The chunk chain mirrors Three's own normal material so skinning,
    // morph targets, instancing and batching behave identically.
    // ------------------------------------------------------------
    const Na__ErlGBuffer__VertexShader = /* glsl */`
        #include <common>
        #include <batching_pars_vertex>
        #include <morphtarget_pars_vertex>
        #include <skinning_pars_vertex>
        #include <logdepthbuf_pars_vertex>
        #include <clipping_planes_pars_vertex>

        varying vec3  vNaViewNormal;
        varying float vNaViewDepth;

        void main() {
            #include <beginnormal_vertex>
            #include <morphnormal_vertex>
            #include <skinbase_vertex>
            #include <skinnormal_vertex>
            #include <defaultnormal_vertex>

            #include <begin_vertex>
            #include <morphtarget_vertex>
            #include <skinning_vertex>
            #include <project_vertex>
            #include <logdepthbuf_vertex>
            #include <clipping_planes_vertex>

            vNaViewNormal = transformedNormal;                  // <-- Already in view space after defaultnormal_vertex
            vNaViewDepth  = -mvPosition.z;                      // <-- Positive linear distance along the view axis
        }
    `;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Structural G-Buffer Fragment Shader
    // ------------------------------------------------------------
    const Na__ErlGBuffer__FragmentShader = /* glsl */`
        #include <common>
        #include <logdepthbuf_pars_fragment>
        #include <clipping_planes_pars_fragment>

        uniform float u_naDepthNear;
        uniform float u_naDepthRange;

        varying vec3  vNaViewNormal;
        varying float vNaViewDepth;

        void main() {
            #include <clipping_planes_fragment>
            #include <logdepthbuf_fragment>

            vec3 viewNormal = normalize( vNaViewNormal );
            if ( ! gl_FrontFacing ) viewNormal = -viewNormal;   // <-- Single-sided SketchUp faces still report outward

            float linearDepth = clamp(
                ( vNaViewDepth - u_naDepthNear ) / max( u_naDepthRange, 1e-6 ),
                0.0,
                1.0
            );

            gl_FragColor = vec4( viewNormal * 0.5 + 0.5, linearDepth );
        }
    `;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | G-Buffer Pass Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Structural G-Buffer Pass
    // ------------------------------------------------------------
    // Returns:
    //   {
    //     material,                          <-- Exposed for compileAsync warm-up
    //     render({ renderer, scene, camera, target, depthRange, exportLayer }),
    //     dispose()
    //   }
    //
    // render() leaves the renderer's target unset; the caller's state guard
    // owns putting the live target back.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__GBuffer__Create() {

        // MATERIAL | One shared export-only shader, never a live material
        // ------------------------------------------------------------
        const material = new THREE.ShaderMaterial({
            uniforms: {
                u_naDepthNear  : { value: 0.1 },
                u_naDepthRange : { value: 1.0 }
            },
            vertexShader   : Na__ErlGBuffer__VertexShader,
            fragmentShader : Na__ErlGBuffer__FragmentShader,
            side           : THREE.DoubleSide,                          // <-- Never a hole where a face points away
            transparent    : false,                                     // <-- Glass participates as an opaque plane
            depthTest      : true,
            depthWrite     : true,
            clipping       : true,                                      // <-- Required before three honours clippingPlanes on a ShaderMaterial
            fog            : false
        });
        material.name = 'ExportRenderLayers_StructuralGBuffer';


        // CLEAR COLOUR | Zero-length normal marks "no geometry"
        // ------------------------------------------------------------
        const clearColour = new THREE.Color(0.5, 0.5, 0.5);


        return {

            material,


            // FUNCTION | Render the Structural G-Buffer for One Tile or Preview
            // ------------------------------------------------------------
            // options:
            //   renderer    {THREE.WebGLRenderer}
            //   scene       {THREE.Scene}
            //   camera      {THREE.Camera}   View offset already applied
            //   target      {THREE.WebGLRenderTarget}  Pool structural target
            //   depthRange  {object}         Global range from the depth module
            //   exportLayer {number}         Layer holding structural surfaces
            // ------------------------------------------------------------
            render(options) {
                const { renderer, scene, camera, target, depthRange, exportLayer } = options;

                // SECTION CUTS | Override materials bypass per-mesh clipping
                material.clippingPlanes = Na__SectionClipping__GetClipList();

                material.uniforms.u_naDepthNear.value  = depthRange.nearM;
                material.uniforms.u_naDepthRange.value = depthRange.rangeM;

                const savedOverride = scene.overrideMaterial;
                const savedLayers   = camera.layers.mask;

                scene.overrideMaterial = material;                      // <-- Every drawn object becomes the G-buffer shader
                camera.layers.set(exportLayer);                         // <-- Structural surfaces only; linework and helpers excluded

                renderer.setRenderTarget(target);
                renderer.setClearColor(clearColour, 1.0);               // <-- Alpha 1.0 = far; rgb decodes to a zero normal
                renderer.clear(true, true, false);
                renderer.render(scene, camera);

                scene.overrideMaterial = savedOverride;
                camera.layers.mask     = savedLayers;
            },
            // ------------------------------------------------------------


            // FUNCTION | Dispose the Shared Export Material
            // ------------------------------------------------------------
            dispose() {
                material.dispose();
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Structural G-Buffer Pass API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__GBuffer__Create
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
