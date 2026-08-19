// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - STRUCTURAL DERIVED PASSES
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__Pass__Structural__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Structural Derived Passes
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Generators for every layer derived purely from the structural
//              G-buffer - Depth, Normal, True Canny and Silhouette.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - These four layers differ only in which derivation mode runs and which
//   polarity and background bytes are written. The G-buffer render and the
//   optional greyscale luminance render are prepared by the tiled pass
//   renderer before this generator is called, so each generator here is one
//   configure-and-draw step and nothing else.
// - True Canny is the only derived EDGE pass left. The essential Canny Edges
//   output is the Line Art render inverted, which is sharper and complete,
//   because ValeVision already knows where every edge is. This one survives
//   for comparison and for a workflow that genuinely wants detector output.
// - Polarity is explicit and matches the registry metadata: True Canny and
//   Silhouette write white structure on black; Depth writes near-white,
//   far-black on a black background; Normal writes an encoded direction on
//   the conventional 128,128,255 background.
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
// REGION | Generator Factory
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Colour Config Value With a Fallback
    // ------------------------------------------------------------
    function Na__ErlStructural__ReadColour(config, key, fallback) {
        const value = config ? config[key] : undefined;
        if (typeof value !== 'string' || !value.startsWith('#')) return fallback;
        const parsed = parseInt(value.slice(1), 16);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    // ------------------------------------------------------------


    // FUNCTION | Create One G-Buffer Derived Pass Generator
    // ------------------------------------------------------------
    // options:
    //   mode            {number}   Na__ErlFullscreen__MODE value
    //   backgroundKey   {string}   Config key naming the background colour
    //   backgroundFallback {number}
    //   edgeColour      {number}   Colour written where structure is present
    //   needsLuminance  {boolean}  Render a neutral greyscale reference first
    //   luminanceWeightKey {string|null}  Config key for the luminance weight
    //
    // Returns a pass generator: { needsGBuffer, needsLuminance, render(ctx) }
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Pass__Structural__Create(options) {
        const {
            mode,
            backgroundKey      = 'ExportRenderLayers__Config__BackgroundColourEdgesHex',
            backgroundFallback = 0x000000,
            edgeColour         = 0xffffff,
            needsLuminance     = false,
            luminanceWeightKey = null
        } = options;

        return {

            needsGBuffer   : true,
            needsLuminance : !!needsLuminance,


            // FUNCTION | Draw One Derived Tile
            // ------------------------------------------------------------
            // The G-buffer and, when required, the greyscale reference are
            // already rendered for this tile by the caller.
            // ------------------------------------------------------------
            render(ctx) {
                const background = Na__ErlStructural__ReadColour(ctx.config, backgroundKey, backgroundFallback);

                const luminanceWeight = (needsLuminance && luminanceWeightKey && Number.isFinite(ctx.config[luminanceWeightKey]))
                    ? ctx.config[luminanceWeightKey]
                    : 0;

                ctx.fullscreen.render({
                    renderer   : ctx.renderer,
                    target     : ctx.outputTarget,
                    mode,
                    background,
                    edgeColour,
                    luminanceWeight
                });
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Named Generators
// -----------------------------------------------------------------------------

    // FUNCTION | Depth Map Generator - Near White, Far Black, Background Black
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Pass__DepthMap() {
        return Na__ExportRenderLayers__Pass__Structural__Create({
            mode               : Na__ErlFullscreen__MODE.DEPTH,
            backgroundKey      : 'ExportRenderLayers__Config__BackgroundColourMasksHex',
            backgroundFallback : 0x000000
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Normal Buffer Generator - View-Space Normals, 128/128/255 Background
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Pass__NormalBuffer() {
        return Na__ExportRenderLayers__Pass__Structural__Create({
            mode               : Na__ErlFullscreen__MODE.NORMAL,
            backgroundKey      : 'ExportRenderLayers__Config__BackgroundColourNormalHex',
            backgroundFallback : 0x8080ff
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | True Canny Generator - Binary White on Black
    // ------------------------------------------------------------
    // The derived detector. Registered as True Canny; the essential Canny
    // Edges pass is the inverted Line Art render instead.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Pass__CannyEdges() {
        return Na__ExportRenderLayers__Pass__Structural__Create({
            mode               : Na__ErlFullscreen__MODE.CANNY,
            needsLuminance     : true,
            luminanceWeightKey : 'ExportRenderLayers__Config__CannyLuminanceWeight'
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Silhouette Generator - Binary Coverage Mask
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Pass__SilhouetteMask() {
        return Na__ExportRenderLayers__Pass__Structural__Create({
            mode               : Na__ErlFullscreen__MODE.SILHOUETTE,
            backgroundKey      : 'ExportRenderLayers__Config__BackgroundColourMasksHex',
            backgroundFallback : 0x000000
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Structural Derived Pass Generators
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__Pass__DepthMap,
        Na__ExportRenderLayers__Pass__NormalBuffer,
        Na__ExportRenderLayers__Pass__CannyEdges,
        Na__ExportRenderLayers__Pass__SilhouetteMask
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
