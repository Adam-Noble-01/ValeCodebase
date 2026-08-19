// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - ALBEDO BUFFER PASS
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__Pass__AlbedoBuffer__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Albedo Buffer Pass
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Material base colour with no direct lighting, fog, ambient
//              occlusion, reflections or tone mapping.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - A helper buffer, not a Qwen control mode. Its real value is diagnostic:
//   it answers "did the material swap actually apply the colours I expect?"
//   in one image, and it doubles as an optional edit reference.
// - Each distinct source material gets ONE unlit stand-in carrying that
//   material's base colour and colour map. Building them per material rather
//   than per mesh keeps the count low on models with thousands of meshes.
// - toneMapped is forced off so the exported bytes are the authored base
//   colour rather than whatever the active tone curve would have made of it.
// - Materials with no colour of their own fall back to mid grey rather than
//   black, so an untextured mesh is still visible in the buffer.
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
// REGION | Stand-In Material Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build an Unlit Stand-In for One Source Material
    // ------------------------------------------------------------
    function Na__ErlAlbedo__CreateStandIn(sourceMaterial) {
        const material = new THREE.MeshBasicMaterial({
            color       : (sourceMaterial && sourceMaterial.color) ? sourceMaterial.color.clone() : new THREE.Color(0x808080),
            map         : (sourceMaterial && sourceMaterial.map)   ? sourceMaterial.map           : null,
            side        : (sourceMaterial && sourceMaterial.side !== undefined) ? sourceMaterial.side : THREE.DoubleSide,
            fog         : false,
            transparent : false,                                         // <-- Albedo is a data buffer; glass shows its own base colour
            depthTest   : true,
            depthWrite  : true
        });
        material.toneMapped = false;                                     // <-- Exported bytes are the authored colour, untouched
        material.name = `ExportRenderLayers_Albedo_${(sourceMaterial && sourceMaterial.name) || 'Unnamed'}`;
        return material;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Generator
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Albedo Buffer Pass Generator
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Pass__AlbedoBuffer() {
        let standInsBySource = new Map();    // <-- Source material -> unlit stand-in


        // SUB HELPER FUNCTION | Resolve or Build One Stand-In
        // ---------------------------------------------------------------
        function resolveStandIn(sourceMaterial, ctx) {
            if (standInsBySource.has(sourceMaterial)) return standInsBySource.get(sourceMaterial);

            const standIn = Na__ErlAlbedo__CreateStandIn(sourceMaterial);
            ctx.surfaces.applyClipping(standIn);
            standInsBySource.set(sourceMaterial, standIn);
            return standIn;
        }
        // ---------------------------------------------------------------


        return {

            needsGBuffer   : false,
            needsLuminance : false,


            // FUNCTION | Build One Stand-In per Source Material and Swap Them In
            // ------------------------------------------------------------
            begin(ctx) {
                standInsBySource = new Map();

                ctx.classification.meshes.forEach((entry) => {
                    const original = entry.object.material;

                    ctx.guard.rememberMaterial(entry.object);            // <-- Remember BEFORE the swap

                    entry.object.material = Array.isArray(original)
                        ? original.map((slot) => resolveStandIn(slot, ctx))   // <-- Slot-for-slot; multi-material meshes keep their groups
                        : resolveStandIn(original, ctx);
                });
            },
            // ------------------------------------------------------------


            // FUNCTION | Draw One Albedo Tile
            // ------------------------------------------------------------
            render(ctx) {
                ctx.surfaces.renderSurfaces({
                    renderer    : ctx.renderer,
                    scene       : ctx.scene,
                    camera      : ctx.camera,
                    target      : ctx.outputTarget,
                    clearColour : 0x000000,
                    clearAlpha  : 1.0,
                    clear       : true
                });
            },
            // ------------------------------------------------------------


            // FUNCTION | Dispose the Stand-In Materials
            // ------------------------------------------------------------
            // Colour maps are shared references owned by the live materials
            // and are deliberately NOT disposed here.
            // ------------------------------------------------------------
            end() {
                standInsBySource.forEach((standIn) => standIn.dispose());
                standInsBySource.clear();
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Albedo Buffer Pass Generator
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__Pass__AlbedoBuffer
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
