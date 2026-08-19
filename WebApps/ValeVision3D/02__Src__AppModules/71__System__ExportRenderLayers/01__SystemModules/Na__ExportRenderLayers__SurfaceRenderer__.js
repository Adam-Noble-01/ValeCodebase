// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - SURFACE RENDERER
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__SurfaceRenderer__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Surface Renderer
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Draw the classified structural surfaces and the exact CAD
//              linework into an export target, under export-only materials,
//              with layer isolation doing the exclusion.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - Every pass that renders real geometry (Gray, Albedo, ID masks, Line Art,
//   MLSD, Inpaint, Shadow, Whitecard) goes through here, so the isolation
//   rules exist once instead of nine times.
// - Isolation is by LAYER, not by hiding objects. At batch start the classifier
//   result is tagged onto two spare layers; the export camera is then switched
//   to whichever layer the pass wants. Because layer 0 is left enabled on every
//   object, the live viewport is completely unaffected even mid-export, and
//   shadow-map rendering (which runs from the light's own camera) still sees
//   the whole scene.
// - The default cube, orbit helper, grid, ground plane, fog planes, section
//   gizmos and Video Studio path overlays are never tagged, so they are absent
//   from every structural pass by construction rather than by a blocklist.
// - Fat-line materials are never touched here. Every pass that draws linework
//   swaps in its own export material, and those materials follow the beauty
//   exporter's width-compensation convention rather than resizing the live
//   resolution uniform. See Na__ExportRenderLayers__ExportLineMaterial__.js.
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
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Export Isolation Layers
    // ------------------------------------------------------------
    // Three supports layers 0-31. ValeVision's own systems use the low
    // layers (MaxEngine's ambient occlusion exclusion lives on layer 1),
    // so the export claims the top of the range.
    // ------------------------------------------------------------
    const Na__ErlSurface__LAYER_MESH     = 29;   // <-- Classified structural surfaces
    const Na__ErlSurface__LAYER_LINEWORK = 30;   // <-- Classified exact CAD linework
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Surface Renderer Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Surface Renderer
    // ------------------------------------------------------------
    // Returns:
    //   {
    //     LAYER_MESH, LAYER_LINEWORK,
    //     tagClassification({ classification, guard }),
    //     applyClipping(material),
    //     renderSurfaces(options),
    //     renderLinework(options),
    //     renderBoth(options)
    //   }
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Surfaces__Create() {

        return {

            LAYER_MESH     : Na__ErlSurface__LAYER_MESH,
            LAYER_LINEWORK : Na__ErlSurface__LAYER_LINEWORK,


            // FUNCTION | Tag the Classified Objects Onto the Export Layers
            // ------------------------------------------------------------
            // Called ONCE per preview or per export batch. Every mutation is
            // remembered by the guard first, so a throw halfway through still
            // restores the layer masks of everything already touched.
            // ------------------------------------------------------------
            tagClassification(options) {
                const { classification, guard } = options;

                classification.meshObjects.forEach((object) => {
                    guard.rememberLayers(object);
                    object.layers.enable(Na__ErlSurface__LAYER_MESH);    // <-- Enable, never set; layer 0 stays live
                });

                classification.lineObjects.forEach((object) => {
                    guard.rememberLayers(object);
                    object.layers.enable(Na__ErlSurface__LAYER_LINEWORK);
                });
            },
            // ------------------------------------------------------------


            // FUNCTION | Apply the Active Cross-Section Planes to a Material
            // ------------------------------------------------------------
            // Export-only materials bypass each mesh's own clippingPlanes, so
            // the cut has to be re-applied or Depth, Normals, IDs and masks
            // would show geometry the beauty render has already sliced away.
            // ------------------------------------------------------------
            applyClipping(material) {
                const clipList = Na__SectionClipping__GetClipList();
                if (Array.isArray(material)) {
                    material.forEach((slot) => { if (slot) slot.clippingPlanes = clipList; });
                    return;
                }
                if (material) material.clippingPlanes = clipList;
            },
            // ------------------------------------------------------------


            // FUNCTION | Render Structural Surfaces Only
            // ------------------------------------------------------------
            // options:
            //   renderer, scene, camera, target
            //   overrideMaterial {THREE.Material|null}  Applied to every surface
            //   clearColour      {number|THREE.Color}
            //   clearAlpha       {number}
            //   clear            {boolean}   Clear colour and depth first
            //   clearDepthOnly   {boolean}   Keep the colour, reset the depth
            // ------------------------------------------------------------
            renderSurfaces(options) {
                const {
                    renderer, scene, camera, target,
                    overrideMaterial = null,
                    clearColour      = 0x000000,
                    clearAlpha       = 1.0,
                    clear            = true,
                    clearDepthOnly   = false
                } = options;

                const savedOverride = scene.overrideMaterial;
                const savedLayers   = camera.layers.mask;

                if (overrideMaterial) {
                    this.applyClipping(overrideMaterial);
                    scene.overrideMaterial = overrideMaterial;
                }
                camera.layers.set(Na__ErlSurface__LAYER_MESH);

                renderer.setRenderTarget(target);
                if (clear) {
                    renderer.setClearColor(clearColour, clearAlpha);
                    renderer.clear(true, true, false);
                } else if (clearDepthOnly) {
                    renderer.clear(false, true, false);
                }
                renderer.render(scene, camera);

                scene.overrideMaterial = savedOverride;
                camera.layers.mask     = savedLayers;
            },
            // ------------------------------------------------------------


            // FUNCTION | Render Exact CAD Linework Only
            // ------------------------------------------------------------
            // Never clears depth: linework is meant to be occluded by whatever
            // surfaces the caller already drew, which is how hidden lines stay
            // hidden in Line Art and MLSD.
            // ------------------------------------------------------------
            renderLinework(options) {
                const { renderer, scene, camera, target, clear = false, clearColour = 0x000000 } = options;

                const savedLayers = camera.layers.mask;
                camera.layers.set(Na__ErlSurface__LAYER_LINEWORK);

                renderer.setRenderTarget(target);
                if (clear) {
                    renderer.setClearColor(clearColour, 1.0);
                    renderer.clear(true, true, false);
                }
                renderer.render(scene, camera);

                camera.layers.mask = savedLayers;
            },
            // ------------------------------------------------------------


            // FUNCTION | Render Structural Surfaces and Linework Together
            // ------------------------------------------------------------
            // One draw with both layers enabled, so surfaces and lines share a
            // single depth context - the arrangement the whitecard and gray
            // presentations expect.
            // ------------------------------------------------------------
            renderBoth(options) {
                const {
                    renderer, scene, camera, target,
                    clearColour = 0xffffff,
                    clearAlpha  = 1.0,
                    clear       = true
                } = options;

                const savedLayers = camera.layers.mask;
                camera.layers.set(Na__ErlSurface__LAYER_MESH);
                camera.layers.enable(Na__ErlSurface__LAYER_LINEWORK);

                renderer.setRenderTarget(target);
                if (clear) {
                    renderer.setClearColor(clearColour, clearAlpha);
                    renderer.clear(true, true, false);
                }
                renderer.render(scene, camera);

                camera.layers.mask = savedLayers;
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shared Material Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Build a Flat Unlit Material for Masks and ID Buffers
    // ------------------------------------------------------------
    // No lighting, no fog, no tone mapping - the byte written is the byte
    // asked for, which is what makes an ID dictionary meaningful.
    //
    // THE COLOUR IS AUTHORED IN THE WORKING SPACE ON PURPOSE:
    // Three treats a hex passed to a material as sRGB and converts it into
    // its linear working space. The export targets carry no transfer
    // function, so nothing converts it back, and an ID authored as #ef52a7
    // would land in the PNG as (220, 22, 99). Setting the hex as though it
    // were already linear skips that conversion, so the mask matches the
    // dictionary the manifest publishes.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__CreateFlatMaterial(colourHex) {
        const material = new THREE.MeshBasicMaterial({
            side        : THREE.DoubleSide,
            fog         : false,
            transparent : false,
            depthTest   : true,
            depthWrite  : true
        });
        material.color.setHex(colourHex, THREE.LinearSRGBColorSpace);    // <-- Verbatim; no sRGB to linear conversion
        material.toneMapped = false;                                     // <-- Never let a tone curve move an ID colour
        return material;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Surface Renderer API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__Surfaces__Create,
        Na__ExportRenderLayers__CreateFlatMaterial
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
