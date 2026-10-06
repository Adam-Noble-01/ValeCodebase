// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - SHADOW MASK PASS
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__Pass__ShadowMask__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Shadow Mask Pass
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A greyscale direct-shadow factor - white lit, black shadowed -
//              captured without mutating the live shadow setup.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - A helper buffer, not a named Qwen control family. Off by default.
// - THREE.ShadowMaterial renders ONLY the received shadow and is transparent
//   everywhere else, so drawing it over a white ground gives the shadow factor
//   directly. Nothing about the lights, their shadow cameras, or the renderer's
//   shadow map settings is changed: the export reads the shadow maps the live
//   viewport has already produced.
// - Availability is conditional and checked before any state is mutated. The
//   pass reports itself unavailable when the renderer has shadows switched off
//   or the scene has no shadow-casting light, rather than quietly exporting a
//   uniformly white image that looks like a valid result.
// - The multi-model loader sets castShadow and receiveShadow on every loaded
//   mesh, so no per-object flag has to be forced. If a future model arrives
//   with those flags cleared the pass degrades to "everything lit", which the
//   availability note in the panel warns about.
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
// REGION | Availability
// -----------------------------------------------------------------------------

    // FUNCTION | Test Whether a Shadow Mask Can Be Captured At All
    // ------------------------------------------------------------
    // Returns { available: boolean, reason: string }
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__ShadowMask__CheckAvailability(options) {
        const { renderer, scene } = options;

        if (!renderer || !renderer.shadowMap || renderer.shadowMap.enabled !== true) {
            return { available: false, reason: 'Shadow maps are disabled on the renderer.' };
        }

        let castingLights = 0;
        scene.traverse((object) => {
            if (object.isLight && object.castShadow === true && object.visible !== false) castingLights++;
        });

        if (castingLights === 0) {
            return { available: false, reason: 'This scene has no visible shadow-casting light.' };
        }

        return { available: true, reason: '' };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Generator
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Shadow Mask Pass Generator
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Pass__ShadowMask() {
        let shadowMaterial = null;


        return {

            needsGBuffer   : false,
            needsLuminance : false,


            // FUNCTION | Validate Availability, Then Build the Shadow Material
            // ------------------------------------------------------------
            // The availability check runs FIRST so an unavailable pass fails
            // before a single piece of scene state has been touched.
            // ------------------------------------------------------------
            begin(ctx) {
                const availability = Na__ExportRenderLayers__ShadowMask__CheckAvailability({
                    renderer : ctx.renderer,
                    scene    : ctx.scene
                });

                if (!availability.available) {
                    throw new Error(`Shadow Mask is unavailable. ${availability.reason}`);
                }

                shadowMaterial = new THREE.ShadowMaterial({
                    color       : 0x000000,
                    opacity     : 1.0,
                    transparent : true,
                    side        : THREE.FrontSide,                       // <-- Back faces would double-darken a closed solid
                    fog         : false
                });
                shadowMaterial.name = 'ExportRenderLayers_ShadowMask';
                ctx.surfaces.applyClipping(shadowMaterial);
            },
            // ------------------------------------------------------------


            // FUNCTION | Draw One Shadow Mask Tile
            // ------------------------------------------------------------
            render(ctx) {
                ctx.surfaces.renderSurfaces({
                    renderer         : ctx.renderer,
                    scene            : ctx.scene,
                    camera           : ctx.camera,
                    target           : ctx.outputTarget,
                    overrideMaterial : shadowMaterial,
                    clearColour      : 0xffffff,                         // <-- Unshadowed and empty pixels both read as fully lit
                    clearAlpha       : 1.0,
                    clear            : true
                });
            },
            // ------------------------------------------------------------


            // FUNCTION | Dispose the Shadow Material
            // ------------------------------------------------------------
            end() {
                if (shadowMaterial) { shadowMaterial.dispose(); shadowMaterial = null; }
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Shadow Mask Pass Generator
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__Pass__ShadowMask,
        Na__ExportRenderLayers__ShadowMask__CheckAvailability
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
