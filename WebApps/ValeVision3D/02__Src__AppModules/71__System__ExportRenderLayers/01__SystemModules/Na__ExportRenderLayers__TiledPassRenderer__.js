// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - TILED PASS RENDERER
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__TiledPassRenderer__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Tiled Pass Renderer
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Render ONE structural pass across the shared tile plan and
//              composite it into a single full-resolution 2D output canvas.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - Pass-major, deliberately. One layer is rendered, encoded, written and its
//   full-size canvas released before the next layer starts. That repeats the
//   compact structural geometry render per layer, which is the cheap half of
//   the trade; retaining ten 8192-pixel RGBA canvases at once is the expensive
//   half, and it is the one that actually kills a browser tab.
// - Tiles come from the SAME planner the beauty exporter uses, so a Depth map
//   and a Beauty render of the same view align to the pixel.
// - WebGL reads bottom-up. Each tile is read back as its interior rectangle
//   only (the gutter is never transferred), then row-flipped into an ImageData
//   and written straight into the output canvas with putImageData, which
//   replaces rather than blends and so cannot soften a mask.
// - Read-back buffers and ImageData objects are cached by tile dimensions, so
//   a 6 x 4 tile grid allocates two buffers, not twenty-four.
// - Cancellation and WebGL context loss are polled BETWEEN tiles only. Nothing
//   here can interrupt a GPU draw or a state restore part-way through.
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

    // MODULE IMPORTS | Vertical Perspective Correction
    // @delegate: ../../11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js
    // ------------------------------------------------------------
    import { Na__VerticalCorrection__ApplyFrame } from '../../11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Hidden-Tab-Safe Async Yield
    // @delegate: ../../30__System__ImageExport/Na__ImageExport__AsyncYield__.js
    // ------------------------------------------------------------
    import { Na__ExportYield__NextPaint } from '../../30__System__ImageExport/Na__ImageExport__AsyncYield__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Shared Tile Plan
    // @delegate: ../../30__System__ImageExport/Na__ImageExport__StaticExport__TilePlan__.js
    // ------------------------------------------------------------
    import {
        Na__TilePlan__Build,
        Na__TilePlan__ProbeCanvas,
        Na__TilePlan__IsIosDevice,
        Na__TilePlan__TILE_INTERIOR_DESKTOP,
        Na__TilePlan__TILE_INTERIOR_IOS,
        Na__TilePlan__TILE_GUTTER
    } from '../../30__System__ImageExport/Na__ImageExport__StaticExport__TilePlan__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pixel Read-Back Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Create a Read-Back Buffer Cache Keyed by Tile Dimensions
    // ------------------------------------------------------------
    // Edge tiles are narrower or shorter than interior tiles, so a grid
    // needs at most four distinct sizes. The cache holds one entry each.
    // ------------------------------------------------------------
    function Na__ErlTiled__CreateBufferCache() {
        const cache = new Map();

        return {
            acquire(width, height) {
                const key = `${width}x${height}`;
                if (cache.has(key)) return cache.get(key);

                const entry = {
                    pixels    : new Uint8Array(width * height * 4),
                    imageData : new ImageData(width, height)
                };
                cache.set(key, entry);
                return entry;
            },
            clear() {
                cache.clear();
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Flip WebGL Rows Into Top-Down ImageData
    // ------------------------------------------------------------
    // pixels    {Uint8Array}       Bottom-up RGBA from readRenderTargetPixels
    // imageData {ImageData}        Top-down destination
    // ------------------------------------------------------------
    function Na__ErlTiled__FlipRows(pixels, imageData, width, height) {
        const destination = imageData.data;
        const rowBytes    = width * 4;

        for (let row = 0; row < height; row++) {
            const sourceOffset      = (height - 1 - row) * rowBytes;     // <-- GL row 0 is the bottom of the tile
            const destinationOffset = row * rowBytes;
            destination.set(pixels.subarray(sourceOffset, sourceOffset + rowBytes), destinationOffset);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Tiled Pass Rendering
// -----------------------------------------------------------------------------

    // FUNCTION | Render One Pass Across the Tile Plan Into an Output Canvas
    // ------------------------------------------------------------
    // options:
    //   context       {object}    Shared render context from the dispatcher
    //   generator     {object}    Pass generator: { needsGBuffer, render, ... }
    //   outputWidth   {number}
    //   outputHeight  {number}
    //   cancelToken   {object|null}  { cancelled: boolean }, polled per tile
    //   onProgress    {Function|null}  Receives (tileIndex, totalTiles)
    //
    // Returns: Promise<HTMLCanvasElement>
    // Throws : Error on canvas allocation failure, context loss, or cancel.
    //
    // The caller owns state restoration; this function mutates the camera's
    // view offset per tile and clears it before returning.
    // ------------------------------------------------------------
    async function Na__ExportRenderLayers__RenderPassTiled(options) {
        const {
            context, generator,
            outputWidth, outputHeight,
            cancelToken = null,
            onProgress  = null
        } = options;

        const progress = (typeof onProgress === 'function') ? onProgress : () => {};
        const renderer = context.renderer;
        const camera   = context.camera;


        // OUTPUT CANVAS | One full-resolution 2D canvas for this layer alone
        // ------------------------------------------------------------
        const outCanvas  = document.createElement('canvas');
        outCanvas.width  = outputWidth;
        outCanvas.height = outputHeight;
        const outCtx     = outCanvas.getContext('2d', { willReadFrequently: false });

        if (!outCtx || !Na__TilePlan__ProbeCanvas(outCanvas, outCtx)) {
            throw new Error(`This device cannot create a ${outputWidth}x${outputHeight} image canvas. Try a lower export resolution.`);
        }


        // TILE PLAN | Identical sub-frustums, gutter and registration to Beauty
        // ------------------------------------------------------------
        const config       = context.config;
        const tileInterior = Na__ErlTiled__ResolveTileInterior(config);
        const tileGutter   = config.ExportRenderLayers__Config__TileGutterPx;

        Na__ErlTiled__WarnOnTileGeometryDivergence(tileInterior, tileGutter);

        const plan = Na__TilePlan__Build({
            outWidth     : outputWidth,
            outHeight    : outputHeight,
            tileInterior : tileInterior,
            gutter       : tileGutter
        });

        const buffers = Na__ErlTiled__CreateBufferCache();
        const gl      = renderer.getContext();

        let contextLost = false;
        const onContextLost = () => { contextLost = true; };
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);

        const yieldEvery = Math.max(1, Math.round(
            Number.isFinite(config.ExportRenderLayers__Config__YieldEveryNTiles)
                ? config.ExportRenderLayers__Config__YieldEveryNTiles
                : 1
        ));

        const savedAutoClear = renderer.autoClear;

        try {
            // CLEAR DISCIPLINE | Every clear in a structural pass is explicit
            // ------------------------------------------------------------
            // Line Art and MLSD draw surfaces first and then linework into the
            // SAME target. With autoClear on, the second render would wipe the
            // first. Clears are therefore issued deliberately by each pass.
            // ------------------------------------------------------------
            renderer.autoClear = false;

            // TARGETS | Sized to the tile framebuffer, reused for every tile
            // ------------------------------------------------------------
            context.width  = plan.fbW;
            context.height = plan.fbH;
            context.gutter = plan.gutter;
            context.outputTarget = context.pool.acquireOutput(plan.fbW, plan.fbH);

            const structuralTarget = generator.needsGBuffer
                ? context.pool.acquireStructural(plan.fbW, plan.fbH)
                : null;
            const luminanceTarget  = generator.needsLuminance
                ? context.pool.acquireScratch(plan.fbW, plan.fbH)
                : null;

            // TILE LOOP | One sub-frustum at a time
            // ------------------------------------------------------------
            for (const tile of plan.tiles) {
                if (cancelToken && cancelToken.cancelled) {
                    throw new Error('Export cancelled.');
                }

                progress(tile.index + 1, plan.totalTiles);
                if ((tile.index % yieldEvery) === 0) {
                    await Na__ExportYield__NextPaint();                  // <-- Paint status + let the GPU drain (hidden-tab safe)
                }


                // SUB-FRUSTUM | Exact crop of the full frame including overscan
                // ------------------------------------------------------------
                camera.setViewOffset(
                    outputWidth, outputHeight,
                    tile.x - plan.gutter, tile.y - plan.gutter,
                    plan.fbW, plan.fbH
                );
                Na__VerticalCorrection__ApplyFrame();                    // <-- Shear operates on this tile's own sub-projection
                camera.updateMatrixWorld();


                // INPUTS | Structural G-buffer and optional greyscale reference
                // ------------------------------------------------------------
                if (structuralTarget) {
                    context.gbuffer.render({
                        renderer,
                        scene       : context.scene,
                        camera,
                        target      : structuralTarget,
                        depthRange  : context.depthRange,
                        exportLayer : context.surfaces.LAYER_MESH
                    });
                }

                if (luminanceTarget) {
                    context.surfaces.renderSurfaces({
                        renderer,
                        scene            : context.scene,
                        camera,
                        target           : luminanceTarget,
                        overrideMaterial : context.luminanceMaterial,
                        clearColour      : 0xffffff,
                        clearAlpha       : 1.0,
                        clear            : true
                    });
                }

                context.fullscreen.setPerTile({
                    structuralTexture : structuralTarget ? structuralTarget.texture : null,
                    luminanceTexture  : luminanceTarget  ? luminanceTarget.texture  : null,
                    width             : plan.fbW,
                    height            : plan.fbH,
                    camera
                });


                // DRAW | The pass writes its bytes into the output target
                // ------------------------------------------------------------
                generator.render(context);


                // GUARD | Abort with a real error instead of a blank image
                // ------------------------------------------------------------
                if (contextLost || (gl && gl.isContextLost && gl.isContextLost())) {
                    throw new Error('Graphics memory was exhausted during export. Try a lower export resolution.');
                }


                // COMPOSITE | Read the interior only, flip rows, place it
                // ------------------------------------------------------------
                const copyWidth  = tile.copyWidth;
                const copyHeight = tile.copyHeight;
                const buffer     = buffers.acquire(copyWidth, copyHeight);

                renderer.readRenderTargetPixels(
                    context.outputTarget,
                    plan.gutter,                                          // <-- Interior origin X in the tile framebuffer
                    plan.fbH - plan.gutter - copyHeight,                  // <-- Interior origin Y, measured from the GL bottom edge
                    copyWidth, copyHeight,
                    buffer.pixels
                );

                Na__ErlTiled__FlipRows(buffer.pixels, buffer.imageData, copyWidth, copyHeight);
                outCtx.putImageData(buffer.imageData, tile.x, tile.y);    // <-- Replaces; never blends a mask into its neighbour
            }

            return outCanvas;

        } finally {
            renderer.autoClear = savedAutoClear;                          // <-- The state guard would catch this too; do not rely on it
            renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
            camera.clearViewOffset();                                     // <-- Safe when no offset is set (three guards internally)
            buffers.clear();
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Warn When the Tile Geometry Diverges From Beauty
    // ------------------------------------------------------------
    // The beauty exporter always uses the planner's own defaults and cannot
    // be reconfigured. If the render layer config overrides the interior or
    // the gutter, the structural passes stop sharing Beauty's sub-frustums
    // and the two renders no longer align to the pixel - which is the whole
    // point of the shared planner. Config wins, because it is the documented
    // SSOT, but the divergence is never silent.
    // ------------------------------------------------------------
    function Na__ErlTiled__WarnOnTileGeometryDivergence(interior, gutter) {
        const defaultInterior = Na__TilePlan__IsIosDevice()
            ? Na__TilePlan__TILE_INTERIOR_IOS
            : Na__TilePlan__TILE_INTERIOR_DESKTOP;

        if (interior !== null && interior !== defaultInterior) {
            console.warn(
                `[ExportRenderLayers] Tile interior is configured to ${interior}px but Beauty always uses ${defaultInterior}px. `
                + 'Structural passes will no longer align to the pixel with the Beauty render.'
            );
        }

        if (Number.isFinite(gutter) && gutter !== Na__TilePlan__TILE_GUTTER) {
            console.warn(
                `[ExportRenderLayers] Tile gutter is configured to ${gutter}px but Beauty always uses ${Na__TilePlan__TILE_GUTTER}px. `
                + 'Structural passes will no longer align to the pixel with the Beauty render.'
            );
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Configured Tile Interior for This Platform
    // ------------------------------------------------------------
    // Returning null lets the shared planner apply its own desktop / iOS
    // defaults, which is what happens when the config omits the values.
    // ------------------------------------------------------------
    function Na__ErlTiled__ResolveTileInterior(config) {
        const configured = Na__TilePlan__IsIosDevice()
            ? config.ExportRenderLayers__Config__TileInteriorIosPx
            : config.ExportRenderLayers__Config__TileInteriorDesktopPx;

        return Number.isFinite(configured) ? configured : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Single Frame Rendering (Preview)
// -----------------------------------------------------------------------------

    // FUNCTION | Render One Pass at Preview Resolution Into a 2D Canvas
    // ------------------------------------------------------------
    // options:
    //   context      {object}  Shared render context
    //   generator    {object}  Pass generator
    //   width        {number}  Preview pixel width
    //   height       {number}  Preview pixel height
    //   targetCanvas {HTMLCanvasElement}  Overlay canvas to paint into
    //
    // No tiling and no view offset: the preview shows the live viewport
    // framing, at a capped resolution, so it can be produced in one frame.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__RenderPassPreview(options) {
        const { context, generator, width, height, targetCanvas } = options;

        const renderer = context.renderer;
        const camera   = context.camera;

        const savedAutoClear = renderer.autoClear;
        renderer.autoClear   = false;                                     // <-- Same explicit-clear discipline as the tiled path

        try {
            Na__ErlTiled__RenderPreviewFrame({ context, generator, width, height, targetCanvas, renderer, camera });
        } finally {
            renderer.autoClear = savedAutoClear;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render and Read Back One Preview Frame
    // ------------------------------------------------------------
    // Split out so the clear-discipline wrapper above stays a single
    // readable statement rather than a long try body.
    // ------------------------------------------------------------
    function Na__ErlTiled__RenderPreviewFrame(options) {
        const { context, generator, width, height, targetCanvas, renderer, camera } = options;

        context.width  = width;
        context.height = height;
        context.gutter = 0;
        context.outputTarget = context.pool.acquireOutput(width, height);

        const structuralTarget = generator.needsGBuffer   ? context.pool.acquireStructural(width, height) : null;
        const luminanceTarget  = generator.needsLuminance ? context.pool.acquireScratch(width, height)    : null;

        camera.updateMatrixWorld();

        if (structuralTarget) {
            context.gbuffer.render({
                renderer,
                scene       : context.scene,
                camera,
                target      : structuralTarget,
                depthRange  : context.depthRange,
                exportLayer : context.surfaces.LAYER_MESH
            });
        }

        if (luminanceTarget) {
            context.surfaces.renderSurfaces({
                renderer,
                scene            : context.scene,
                camera,
                target           : luminanceTarget,
                overrideMaterial : context.luminanceMaterial,
                clearColour      : 0xffffff,
                clearAlpha       : 1.0,
                clear            : true
            });
        }

        context.fullscreen.setPerTile({
            structuralTexture : structuralTarget ? structuralTarget.texture : null,
            luminanceTexture  : luminanceTarget  ? luminanceTarget.texture  : null,
            width,
            height,
            camera
        });

        generator.render(context);


        // READ BACK | Straight into the overlay canvas, rows flipped
        // ------------------------------------------------------------
        const pixels    = new Uint8Array(width * height * 4);
        const imageData = new ImageData(width, height);

        renderer.readRenderTargetPixels(context.outputTarget, 0, 0, width, height, pixels);
        Na__ErlTiled__FlipRows(pixels, imageData, width, height);

        targetCanvas.width  = width;
        targetCanvas.height = height;
        targetCanvas.getContext('2d').putImageData(imageData, 0, 0);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Tiled Pass Renderer API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__RenderPassTiled,
        Na__ExportRenderLayers__RenderPassPreview
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
