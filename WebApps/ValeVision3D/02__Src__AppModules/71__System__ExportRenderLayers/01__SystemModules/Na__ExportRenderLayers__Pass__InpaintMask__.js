// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - INPAINT MASK PASS
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__Pass__InpaintMask__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Inpaint Mask Pass
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : White where Qwen may change pixels, black where they are
//              protected, driven by an explicit category selection.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - The row stays disabled until the developer picks at least one category
//   group. An all-white mask says "change everything", which is not a
//   meaningful condition and must never be produced by default.
// - Selected categories render white; every other structural surface renders
//   black and still writes depth, so a protected wall correctly occludes an
//   editable roof behind it. Background is black - protected - because pixels
//   with no geometry are outside the intended edit region.
// - Category-root selection is the first implementation. Exact per-object
//   picking can be layered on later without changing the exported bytes,
//   because the selection arrives as a plain list of names.
// - The manifest records the polarity and the selected category names, so the
//   ComfyUI graph author can see exactly what the white region means.
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

    // MODULE IMPORTS | Flat Material Factory
    // @delegate: ./Na__ExportRenderLayers__SurfaceRenderer__.js
    // ------------------------------------------------------------
    import { Na__ExportRenderLayers__CreateFlatMaterial } from './Na__ExportRenderLayers__SurfaceRenderer__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Generator
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Inpaint Mask Pass Generator
    // ------------------------------------------------------------
    // Reads ctx.selectedCategories, which the controller keeps in the
    // developer session state.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Pass__InpaintMask() {
        let editableMaterial  = null;   // <-- White: Qwen may change these pixels
        let protectedMaterial = null;   // <-- Black: keep, but still occlude
        let selectedNames     = [];


        return {

            needsGBuffer   : false,
            needsLuminance : false,


            // FUNCTION | Build the Two Mask Materials and Assign Them
            // ------------------------------------------------------------
            begin(ctx) {
                selectedNames = Array.isArray(ctx.selectedCategories) ? ctx.selectedCategories.slice() : [];

                if (selectedNames.length === 0) {
                    throw new Error('Select at least one category group before exporting the Inpaint Mask.');
                }

                const selectedSet = new Set(selectedNames);

                editableMaterial  = Na__ExportRenderLayers__CreateFlatMaterial(0xffffff);
                protectedMaterial = Na__ExportRenderLayers__CreateFlatMaterial(0x000000);
                editableMaterial.name  = 'ExportRenderLayers_InpaintEditable';
                protectedMaterial.name = 'ExportRenderLayers_InpaintProtected';

                ctx.surfaces.applyClipping(editableMaterial);
                ctx.surfaces.applyClipping(protectedMaterial);

                ctx.classification.meshes.forEach((entry) => {
                    const material = selectedSet.has(entry.categoryName) ? editableMaterial : protectedMaterial;

                    ctx.guard.rememberMaterial(entry.object);            // <-- Remember BEFORE the swap
                    entry.object.material = Array.isArray(entry.object.material)
                        ? entry.object.material.map(() => material)      // <-- Preserve slot count
                        : material;
                });
            },
            // ------------------------------------------------------------


            // FUNCTION | Draw One Inpaint Mask Tile
            // ------------------------------------------------------------
            render(ctx) {
                ctx.surfaces.renderSurfaces({
                    renderer    : ctx.renderer,
                    scene       : ctx.scene,
                    camera      : ctx.camera,
                    target      : ctx.outputTarget,
                    clearColour : 0x000000,                              // <-- No geometry is protected, not editable
                    clearAlpha  : 1.0,
                    clear       : true
                });
            },
            // ------------------------------------------------------------


            // FUNCTION | Dispose the Mask Materials
            // ------------------------------------------------------------
            end() {
                if (editableMaterial)  { editableMaterial.dispose();  editableMaterial  = null; }
                if (protectedMaterial) { protectedMaterial.dispose(); protectedMaterial = null; }
            },
            // ------------------------------------------------------------


            // FUNCTION | Publish the Selection for the Manifest
            // ------------------------------------------------------------
            getDictionary() {
                return [{
                    identity : 'editableCategories',
                    colour   : '#ffffff',
                    rgb      : [255, 255, 255],
                    members  : selectedNames.slice()
                }];
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Inpaint Mask Pass Generator
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__Pass__InpaintMask
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
