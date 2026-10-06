// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - PASS RENDERER DISPATCHER
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__PassRenderers__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Pass Renderer Dispatcher
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build the shared render context every pass generator draws
//              through, and hand back the generator a registry pass names.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - This file is a dispatcher and a context factory. It deliberately knows
//   nothing about the UI, filenames or file writing, and every actual pixel is
//   produced by a generator in its own Na__ExportRenderLayers__Pass__*.js file.
// - The render context is created ONCE per preview or per export batch and
//   carries the GPU objects the generators share: the structural G-buffer, the
//   full screen derivation pass, the surface renderer, the target pool, the
//   state guard, the classification and the global depth range.
// - The context also carries a neutral clay material used as the greyscale
//   luminance reference by the Canny and HED-compatible families. It is built
//   once here rather than in each of those generators.
// - Generators are looked up by name, so the registry stays pure data and no
//   pass-specific conditional ever reaches the controller.
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

    // MODULE IMPORTS | Millimetre to Scene Unit Conversion
    // @delegate: ../../04__MathUtils/Na__Math__Units.js
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits } from '../../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Measured Depth Range Refinement
    // @delegate: ./Na__ExportRenderLayers__DepthRange__.js
    // ------------------------------------------------------------
    import { Na__ExportRenderLayers__DepthRange__RefineFromRender } from './Na__ExportRenderLayers__DepthRange__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Shared Export Infrastructure
    // ------------------------------------------------------------
    import { Na__ExportRenderLayers__GBuffer__Create }    from './Na__ExportRenderLayers__GBufferPass__.js';
    import { Na__ExportRenderLayers__Fullscreen__Create } from './Na__ExportRenderLayers__FullscreenPass__.js';
    import { Na__ExportRenderLayers__Surfaces__Create }   from './Na__ExportRenderLayers__SurfaceRenderer__.js';
    import { Na__ExportRenderLayers__TargetPool__Create } from './Na__ExportRenderLayers__RenderTargetPool__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Pass Generators
    // ------------------------------------------------------------
    import {
        Na__ExportRenderLayers__Pass__DepthMap,
        Na__ExportRenderLayers__Pass__NormalBuffer,
        Na__ExportRenderLayers__Pass__CannyEdges,
        Na__ExportRenderLayers__Pass__SilhouetteMask
    } from './Na__ExportRenderLayers__Pass__Structural__.js';

    import { Na__ExportRenderLayers__Pass__AmbientOcclusion } from './Na__ExportRenderLayers__Pass__AmbientOcclusion__.js';

    import {
        Na__ExportRenderLayers__Pass__ObjectIdMask,
        Na__ExportRenderLayers__Pass__CategoryIdMask,
        Na__ExportRenderLayers__Pass__MaterialIdMask
    } from './Na__ExportRenderLayers__Pass__IdMasks__.js';

    import { Na__ExportRenderLayers__Pass__InpaintMask } from './Na__ExportRenderLayers__Pass__InpaintMask__.js';

    import { Na__ExportRenderLayers__Pass__ShadowMask } from './Na__ExportRenderLayers__Pass__ShadowMask__.js';

    import {
        Na__ExportRenderLayers__Pass__GrayControl,
        Na__ExportRenderLayers__CreateClayMaterial
    } from './Na__ExportRenderLayers__Pass__GrayControl__.js';

    import { Na__ExportRenderLayers__Pass__AlbedoBuffer } from './Na__ExportRenderLayers__Pass__AlbedoBuffer__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Generator Lookup
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Generator Name to Factory
    // ------------------------------------------------------------
    // The registry stores only the generator NAME, so registry entries stay
    // pure data and adding a pass never means editing a switch statement.
    // ------------------------------------------------------------
    const Na__ErlDispatch__GENERATORS = {
        DepthMap        : Na__ExportRenderLayers__Pass__DepthMap,
        NormalBuffer    : Na__ExportRenderLayers__Pass__NormalBuffer,
        CannyEdges      : Na__ExportRenderLayers__Pass__CannyEdges,
        SilhouetteMask  : Na__ExportRenderLayers__Pass__SilhouetteMask,
        AmbientOcclusion: Na__ExportRenderLayers__Pass__AmbientOcclusion,
        ObjectIdMask    : Na__ExportRenderLayers__Pass__ObjectIdMask,
        CategoryIdMask  : Na__ExportRenderLayers__Pass__CategoryIdMask,
        MaterialIdMask  : Na__ExportRenderLayers__Pass__MaterialIdMask,
        InpaintMask     : Na__ExportRenderLayers__Pass__InpaintMask,

        GrayControl     : Na__ExportRenderLayers__Pass__GrayControl,
        AlbedoBuffer    : Na__ExportRenderLayers__Pass__AlbedoBuffer,
        ShadowMask      : Na__ExportRenderLayers__Pass__ShadowMask
    };
    // ------------------------------------------------------------


    // FUNCTION | Build a Pass Generator by Registry Generator Name
    // ------------------------------------------------------------
    // Returns null when the name is unknown, so a stale registry entry
    // degrades to a disabled row rather than throwing at initialization.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__CreateGenerator(generatorName) {
        const factory = Na__ErlDispatch__GENERATORS[generatorName];
        if (typeof factory !== 'function') {
            console.warn(`[ExportRenderLayers] No generator registered under "${generatorName}".`);
            return null;
        }
        return factory();
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render Context
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Shared Render Context for One Preview or Batch
    // ------------------------------------------------------------
    // options:
    //   renderer, scene, camera
    //   classification   {object}  Result of the scene classifier
    //   guard            {object}  Scene state guard, already snapshotted
    //   config           {object}  ExportRenderLayers__Config block
    //   lineworkConfig   {object}  models.RenderConfig__Linework block
    //   depthRange       {object}  Global view-space depth range
    //   outputWidth      {number}  Full output width in pixels
    //   outputHeight     {number}  Full output height in pixels
    //   selectedCategories {array} Category names driving the inpaint mask
    //
    // Returns a context carrying the shared GPU objects plus dispose().
    // The tile loop mutates only width, height and outputTarget.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__CreateRenderContext(options) {
        const {
            renderer, scene, camera,
            classification, guard, config, lineworkConfig,
            depthRange, outputWidth, outputHeight,
            selectedCategories = []
        } = options;

        const pool       = Na__ExportRenderLayers__TargetPool__Create();
        const gbuffer    = Na__ExportRenderLayers__GBuffer__Create();
        const fullscreen = Na__ExportRenderLayers__Fullscreen__Create();
        const surfaces   = Na__ExportRenderLayers__Surfaces__Create();


        // LUMINANCE REFERENCE | Neutral clay shared by Canny and HED
        // ------------------------------------------------------------
        const luminanceMaterial = Na__ExportRenderLayers__CreateClayMaterial({
            colourHex : 0xb4b4b4,
            roughness : 0.85
        });
        surfaces.applyClipping(luminanceMaterial);


        // OCCLUSION RADIUS | Config is integer millimetres; the scene is metres
        // ------------------------------------------------------------
        const aoRadiusMm    = Number.isFinite(config.ExportRenderLayers__Config__AoRadiusMm)
            ? config.ExportRenderLayers__Config__AoRadiusMm
            : 900;
        const aoRadiusUnits = Na__Math__ConvertMmToUnits(aoRadiusMm);


        // LAYER TAGGING | One traversal; the tile loop never re-classifies
        // ------------------------------------------------------------
        // This has to happen BEFORE the depth probe below, because the probe
        // renders the G-buffer and the G-buffer isolates by export layer.
        // ------------------------------------------------------------
        surfaces.tagClassification({ classification, guard });


        // DEPTH RANGE | Replace the bounding-box guess with a measurement
        // @delegate: ./Na__ExportRenderLayers__DepthRange__.js
        // ------------------------------------------------------------
        const measuredRange = Na__ExportRenderLayers__DepthRange__RefineFromRender({
            renderer, scene, camera,
            gbuffer, fullscreen, pool,
            meshLayer        : surfaces.LAYER_MESH,
            provisionalRange : depthRange,
            config,
            outputWidth,
            outputHeight
        });

        fullscreen.configure({ config, depthRange: measuredRange, aoRadiusUnits });


        return {
            renderer,
            scene,
            camera,

            classification,
            guard,
            config,
            lineworkConfig,
            depthRange : measuredRange,                                  // <-- The measured range, not the bounding-box guess

            pool,
            gbuffer,
            fullscreen,
            surfaces,
            luminanceMaterial,
            aoRadiusUnits,

            outputWidth,
            outputHeight,
            selectedCategories,

            width        : outputWidth,     // <-- Overwritten per tile with the tile framebuffer size
            height       : outputHeight,
            gutter       : 0,
            outputTarget : null,


            // FUNCTION | Dispose Every GPU Object This Context Owns
            // ------------------------------------------------------------
            dispose() {
                luminanceMaterial.dispose();
                gbuffer.dispose();
                fullscreen.dispose();
                pool.dispose();
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Pass Renderer Dispatcher API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__CreateGenerator,
        Na__ExportRenderLayers__CreateRenderContext
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
