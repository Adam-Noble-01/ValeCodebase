// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - ID MASK PASSES
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__Pass__IdMasks__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - ID Mask Passes
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Flat deterministic colour-per-identity masks for objects,
//              loaded categories and material identities, plus the colour
//              dictionaries the manifest publishes alongside them.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - One generator, three identity strategies. All three share the same
//   mechanism: hash a stable key to a flat colour, swap every classified
//   surface to an unlit material of that colour, draw with no antialiasing.
// - Colours are hashed from names and paths, never from THREE uuids, so two
//   exports of an unchanged scene produce byte-identical masks even across a
//   page reload.
// - Material arrays are preserved. A multi-material mesh receives an array of
//   the same flat material so slot count and draw calls are unchanged, and the
//   material ID key joins every slot name so one mesh keeps one identity.
// - Materials are built once per batch in begin() and disposed in end(). The
//   tile loop never allocates.
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

    // MODULE IMPORTS | Deterministic Colour Hash
    // @delegate: ./Na__ExportRenderLayers__ColourHash__.js
    // ------------------------------------------------------------
    import { Na__ExportRenderLayers__ColourFromKey } from './Na__ExportRenderLayers__ColourHash__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Flat Material Factory and Object Key Builder
    // @delegate: ./Na__ExportRenderLayers__SurfaceRenderer__.js
    // @delegate: ./Na__ExportRenderLayers__SceneClassifier__.js
    // ------------------------------------------------------------
    import { Na__ExportRenderLayers__CreateFlatMaterial } from './Na__ExportRenderLayers__SurfaceRenderer__.js';
    import { Na__ExportRenderLayers__BuildObjectKey }     from './Na__ExportRenderLayers__SceneClassifier__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Identity Strategies
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Key Builders Per Identity Strategy
    // ------------------------------------------------------------
    // Each returns the stable string the colour hash is taken from.
    // ------------------------------------------------------------
    const Na__ErlIdMask__KEY_BUILDERS = {
        object   : (entry) => Na__ExportRenderLayers__BuildObjectKey(entry),
        category : (entry) => entry.categoryName,
        material : (entry) => entry.materialKey
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Generator
// -----------------------------------------------------------------------------

    // FUNCTION | Create an ID Mask Pass Generator
    // ------------------------------------------------------------
    // strategy {'object'|'category'|'material'}
    //
    // Returns a pass generator exposing begin, render, end and a
    // getDictionary() the manifest builder reads after the batch.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Pass__IdMask__Create(strategy) {
        const buildKey = Na__ErlIdMask__KEY_BUILDERS[strategy] || Na__ErlIdMask__KEY_BUILDERS.object;

        let materialsByKey = new Map();     // <-- key    -> THREE.MeshBasicMaterial
        let dictionary     = [];            // <-- Manifest record: colour -> identity


        return {

            needsGBuffer   : false,
            needsLuminance : false,


            // FUNCTION | Build One Flat Material Per Identity and Swap Them In
            // ------------------------------------------------------------
            begin(ctx) {
                materialsByKey = new Map();
                dictionary     = [];

                ctx.classification.meshes.forEach((entry) => {
                    const key = buildKey(entry);

                    if (!materialsByKey.has(key)) {
                        const colour   = Na__ExportRenderLayers__ColourFromKey(key);
                        const material = Na__ExportRenderLayers__CreateFlatMaterial(colour.hex);
                        material.name  = `ExportRenderLayers_Id_${strategy}_${key}`;
                        materialsByKey.set(key, material);

                        dictionary.push({
                            identity : key,
                            colour   : colour.css,
                            rgb      : colour.rgb
                        });
                    }

                    const material = materialsByKey.get(key);
                    ctx.surfaces.applyClipping(material);                // <-- Match the live cross-section cut

                    ctx.guard.rememberMaterial(entry.object);            // <-- Remember BEFORE the swap
                    entry.object.material = Array.isArray(entry.object.material)
                        ? entry.object.material.map(() => material)      // <-- Preserve slot count for multi-material meshes
                        : material;
                });
            },
            // ------------------------------------------------------------


            // FUNCTION | Draw One ID Mask Tile
            // ------------------------------------------------------------
            render(ctx) {
                ctx.surfaces.renderSurfaces({
                    renderer    : ctx.renderer,
                    scene       : ctx.scene,
                    camera      : ctx.camera,
                    target      : ctx.outputTarget,
                    clearColour : 0x000000,                              // <-- Background is pure black; no hashed ID can reach it
                    clearAlpha  : 1.0,
                    clear       : true
                });
            },
            // ------------------------------------------------------------


            // FUNCTION | Dispose the Flat Materials
            // ------------------------------------------------------------
            // Object materials themselves are restored by the state guard;
            // this only frees the temporary export materials.
            // ------------------------------------------------------------
            end() {
                materialsByKey.forEach((material) => material.dispose());
                materialsByKey.clear();
            },
            // ------------------------------------------------------------


            // FUNCTION | Publish the Colour Dictionary for the Manifest
            // ------------------------------------------------------------
            getDictionary() {
                return dictionary.slice();
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Named Generators
// -----------------------------------------------------------------------------

    // FUNCTION | Object ID Mask Generator
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Pass__ObjectIdMask() {
        return Na__ExportRenderLayers__Pass__IdMask__Create('object');
    }
    // ------------------------------------------------------------


    // FUNCTION | Category ID Mask Generator
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Pass__CategoryIdMask() {
        return Na__ExportRenderLayers__Pass__IdMask__Create('category');
    }
    // ------------------------------------------------------------


    // FUNCTION | Material ID Mask Generator
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Pass__MaterialIdMask() {
        return Na__ExportRenderLayers__Pass__IdMask__Create('material');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | ID Mask Pass Generators
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__Pass__ObjectIdMask,
        Na__ExportRenderLayers__Pass__CategoryIdMask,
        Na__ExportRenderLayers__Pass__MaterialIdMask
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
