// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - AMBIENT OCCLUSION PASS
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__Pass__AmbientOcclusion__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Ambient Occlusion Pass
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Produce a clean greyscale ambient occlusion factor - white
//              unoccluded, black occluded - from the export G-buffer.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - This is a helper / reference buffer, not a recognised Qwen control type.
//   The registry labels it accordingly and it is off by default.
// - It deliberately does NOT scrape alpha from the live MaxEngine ambient
//   occlusion composer. Two reasons: PureEngine does not own that path at all,
//   so the layer would silently vanish under the default engine; and the live
//   ambient occlusion pre-pass excludes layer-one geometry, so visible content
//   would be missing from an image that claims to describe the whole scene.
// - The occlusion radius is authored in millimetres in AppConfig and converted
//   to scene units through the shared units helper, so it means the same
//   physical distance whatever the model's extents.
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

    // MODULE IMPORTS | Derivation Modes
    // @delegate: ./Na__ExportRenderLayers__FullscreenPass__.js
    // ------------------------------------------------------------
    import { Na__ErlFullscreen__MODE } from './Na__ExportRenderLayers__FullscreenPass__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Generator
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Ambient Occlusion Pass Generator
    // ------------------------------------------------------------
    // The sample radius, intensity and count are applied to the full screen
    // pass by the batch's configure() step, so this generator only selects
    // the derivation mode.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Pass__AmbientOcclusion() {
        return {

            needsGBuffer   : true,
            needsLuminance : false,


            // FUNCTION | Draw One Ambient Occlusion Tile
            // ------------------------------------------------------------
            render(ctx) {
                ctx.fullscreen.render({
                    renderer   : ctx.renderer,
                    target     : ctx.outputTarget,
                    mode       : Na__ErlFullscreen__MODE.OCCLUSION,
                    background : 0xffffff,                               // <-- No geometry reads as fully open
                    edgeColour : 0xffffff
                });
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Ambient Occlusion Pass Generator
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__Pass__AmbientOcclusion
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
