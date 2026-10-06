// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - PASS REGISTRY
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__PassRegistry__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Pass Registry
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The single source of truth for every render layer - its
//              identity, its filename suffix, how it is generated, and what a
//              Qwen workflow can honestly do with it.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - The panel, the manifest and the batch exporter are all driven from this
//   list. Adding a pass here adds a row, a preview button, a filename and a
//   manifest record with no other edit anywhere. There is no duplicate row
//   list in index.html and no pass-specific conditional in the controller.
// - Entries carry a generator NAME rather than a function, so the registry
//   stays pure data. The dispatcher resolves the name to an implementation.
// - qwenUse is the honesty field, and it is deliberately conservative:
//     qwen-direct   - a control type the cited adapter model cards actually
//                     list, or the composed image an edit model consumes
//     qwen-adapter  - a real control type, but only for specific adapters
//     helper        - a useful buffer that is NOT a recognised control type
//   isApproximation is separate and additional: HED-compatible and MLSD are
//   engine-generated approximations of what a learned detector would produce.
// - Pose is registered as permanently unavailable rather than omitted. A blank
//   pose image is not a useful condition, and stating why in the panel is more
//   helpful than silently having no row.
// - Suffix tokens include their own leading and trailing double underscore, so
//   the filename builder never has to know the delimiter convention.
//
// ADAPTER FAMILY REFERENCES (verified 19-Aug-2026):
// - Qwen-Image-2512 Fun ControlNet Union: "Canny, HED, Depth, Pose, MLSD,
//   Scribble and Gray", plus "Inpainting mode is also supported". The 2602
//   weight adds Gray control. Base model: Qwen-Image-2512.
//   NOTE: this family does NOT list Normal or Line Art. ValeVision exports
//   only the Canny, Depth, Gray and inpaint members of that list; the HED,
//   MLSD and Scribble passes were removed because an engine-generated
//   approximation of a learned detector was never going to beat the exact
//   linework this system already has.
// - InstantX Qwen Image ControlNet Union: "canny, soft edge, depth, pose".
//   Base model: Qwen-Image. Recommended controlnet_conditioning_scale 0.8-1.0.
// - DiffSynth Blockwise ControlNet, loaded in ComfyUI as a model PATCH rather
//   than a ControlNet: canny, depth, inpaint. Base model: Qwen-Image.
// - DiffSynth In-Context Control Union, a LoRA: canny, depth, pose, lineart,
//   softedge, normal, openpose. Base model: Qwen-Image. Prompts must start
//   with "Context_Control. ".
// - Qwen-Image-Edit-2511 accepts multiple input images and consumes them as
//   edit references. Its card documents no ControlNet compatibility and no
//   structural control input, so a structural map handed to it is a reference
//   image, not a constraint.
//
// TWO CANNYS, AND WHY:
// - Canny Edges is the Line Art render inverted. ValeVision already knows
//   exactly where every edge is, so running an edge detector over a raster to
//   rediscover them can only lose accuracy. The inverted linework is sharper,
//   complete, and correctly hidden-line removed. This is the essential one.
// - True Canny is the genuine derived detector over depth and normal
//   discontinuities, kept so the two can be compared and so a workflow that
//   genuinely wants detector-style output still has one. Off by default.
//
// BASE MODEL SPLIT, AND WHY IT MATTERS:
// - MLSD exists ONLY on the Fun Union, which needs Qwen-Image-2512.
// - Normal and Line Art exist ONLY on the DiffSynth In-Context Control Union,
//   which needs Qwen-Image.
// - Depth and Canny are the only conditions every family carries, which is why
//   they are the safest first test whichever base is loaded.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Aug-2026 - Version 1.0.0
// - Initial implementation for the Export Render Layers system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Adapter Family Identifiers
    // ------------------------------------------------------------
    // Verified against the model cards and the ComfyUI Qwen-Image ControlNet
    // documentation on 19-Aug-2026. The base model matters as much as the
    // control type: an adapter loaded against the wrong base will load
    // without complaint and condition badly or not at all.
    // ------------------------------------------------------------
    const Na__ErlRegistry__FUN_UNION = 'Qwen-Image-2512-Fun-ControlNet-Union';        // <-- base: Qwen-Image-2512
    const Na__ErlRegistry__INSTANTX  = 'InstantX-Qwen-Image-ControlNet-Union';        // <-- base: Qwen-Image
    const Na__ErlRegistry__DS_BLOCK  = 'DiffSynth-Qwen-Image-Blockwise-ControlNet';   // <-- base: Qwen-Image, ComfyUI model patch
    const Na__ErlRegistry__DS_UNION  = 'DiffSynth-Qwen-Image-In-Context-Control-Union'; // <-- base: Qwen-Image, LoRA
    const Na__ErlRegistry__EDIT_2511 = 'Qwen-Image-Edit-2511';                        // <-- Multi-image edit reference, NOT a ControlNet
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Base Model Required by Each Adapter Family
    // ------------------------------------------------------------
    // Published in the manifest so a graph author can see at a glance that
    // MLSD and Normal cannot share one graph: MLSD only exists on the Fun
    // Union, which needs Qwen-Image-2512, while Normal only exists on the
    // DiffSynth In-Context Control Union, which needs Qwen-Image.
    // ------------------------------------------------------------
    const Na__ErlRegistry__ADAPTER_BASE_MODELS = {
        [Na__ErlRegistry__FUN_UNION] : 'Qwen-Image-2512',
        [Na__ErlRegistry__INSTANTX]  : 'Qwen-Image',
        [Na__ErlRegistry__DS_BLOCK]  : 'Qwen-Image',
        [Na__ErlRegistry__DS_UNION]  : 'Qwen-Image',
        [Na__ErlRegistry__EDIT_2511] : 'Qwen-Image-Edit-2511'
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Pass Groups
    // ------------------------------------------------------------
    const Na__ErlRegistry__GROUP_IMAGE      = 'Qwen Images';
    const Na__ErlRegistry__GROUP_STRUCTURAL = 'Structural Conditions';
    const Na__ErlRegistry__GROUP_LINES      = 'Line Conditions';
    const Na__ErlRegistry__GROUP_MASKS      = 'Masks and IDs';
    const Na__ErlRegistry__GROUP_HELPERS    = 'Supporting Buffers';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Capability Notes Shown on Each Row
    // ------------------------------------------------------------
    const Na__ErlRegistry__USE_DIRECT  = 'qwen-direct';
    const Na__ErlRegistry__USE_ADAPTER = 'qwen-adapter';
    const Na__ErlRegistry__USE_HELPER  = 'helper';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Registry Data
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Every Registered Render Layer, In Export Order
    // ------------------------------------------------------------
    // Field reference:
    //   id                  Stable semantic identifier; matches AppConfig
    //                       ExportRenderLayers__Config__DefaultPassIds
    //   label               Human-readable row name
    //   suffix              Filename token, delimiters included
    //   group               Panel grouping heading
    //   defaultEnabled      Ticked for export on first open
    //   isEssential         Part of the working set a Qwen ControlNet
    //                       workflow actually consumes. Drives the panel's
    //                       Essential button, so the definition lives here
    //                       and nowhere else.
    //   qwenUse             qwen-direct | qwen-adapter | helper
    //   qwenAdapterFamilies Adapter families whose model cards list this type
    //   colourSpace         display-sRGB | linear-data
    //   polarity            Plain-English statement of what the bytes mean
    //   background          Background colour written where no geometry exists
    //   requiresSelection   Row stays disabled until a selection is made
    //   isApproximation     Engine-generated stand-in for a learned detector
    //   approximationNote   Recorded verbatim in the manifest when true
    //   available           False registers the row as permanently unavailable
    //   unavailableReason   Shown on the row and in its title attribute
    //   generator           Dispatcher generator name, or null for beauty paths
    //   usesBeautyRenderer  Rendered through the existing tiled beauty exporter
    //   surfacePreset       Composed passes only: which export-only surface
    //                       material to apply first ('clay' | 'lineart' | null)
    //   invertOutput        Composed passes only: invert the finished canvas.
    //                       This is the whole difference between Line Art and
    //                       Canny Edges - same render, opposite polarity.
    //   previewMode         overlay | viewport | composer | none
    //   conditionalAvailability  Runtime availability check key, when any
    // ------------------------------------------------------------
    const Na__ErlRegistry__PASSES = [

        // -- Qwen Images ------------------------------------------------------
        {
            id                 : 'BeautyRender',
            label              : 'Beauty Render',
            suffix             : '__BeautyRender__',
            group              : Na__ErlRegistry__GROUP_IMAGE,
            defaultEnabled     : true,
            isEssential        : true ,
            qwenUse            : Na__ErlRegistry__USE_DIRECT,
            qwenAdapterFamilies: [Na__ErlRegistry__EDIT_2511],
            colourSpace        : 'display-sRGB',
            polarity           : 'Fully composed ValeVision image, exactly as the active engine renders it.',
            background         : 'scene',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            generator          : null,
            usesBeautyRenderer : true,
            surfacePreset      : null,
            previewMode        : 'viewport',
            description        : 'The primary Qwen edit image. Not a ControlNet map.'
        },
        {
            id                 : 'ClayRender',
            label              : 'Clay Render',
            suffix             : '__ClayRender__',
            group              : Na__ErlRegistry__GROUP_IMAGE,
            defaultEnabled     : true,
            isEssential        : true ,
            qwenUse            : Na__ErlRegistry__USE_DIRECT,
            qwenAdapterFamilies: [Na__ErlRegistry__EDIT_2511],
            colourSpace        : 'display-sRGB',
            polarity           : 'Composed image with neutral clay surfaces and exact linework retained.',
            background         : 'scene',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            generator          : null,
            usesBeautyRenderer : true,
            surfacePreset      : 'clay',
            previewMode        : 'composer',
            description        : 'Neutral architectural reference at the same camera and crop as every map.'
        },

        // -- Structural Conditions --------------------------------------------
        {
            id                 : 'DepthMap',
            label              : 'Depth Map',
            suffix             : '__DepthMap__',
            group              : Na__ErlRegistry__GROUP_STRUCTURAL,
            defaultEnabled     : true,
            isEssential        : true ,
            qwenUse            : Na__ErlRegistry__USE_DIRECT,
            qwenAdapterFamilies: [Na__ErlRegistry__FUN_UNION, Na__ErlRegistry__INSTANTX, Na__ErlRegistry__DS_BLOCK, Na__ErlRegistry__DS_UNION],
            colourSpace        : 'linear-data',
            polarity           : 'Near white, far black, background black. Relative linear view depth after one global normalisation.',
            background         : '#000000',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            generator          : 'DepthMap',
            usesBeautyRenderer : false,
            surfacePreset      : null,
            previewMode        : 'overlay',
            description        : 'The strongest single condition for overall massing. Exact geometry, not an estimate.'
        },
        {
            id                 : 'NormalBuffer',
            label              : 'Normal Buffer',
            suffix             : '__NormalBuffer__',
            group              : Na__ErlRegistry__GROUP_STRUCTURAL,
            defaultEnabled     : true,
            isEssential        : true ,
            qwenUse            : Na__ErlRegistry__USE_ADAPTER,
            qwenAdapterFamilies: [Na__ErlRegistry__DS_UNION],
            colourSpace        : 'linear-data',
            polarity           : 'View-space normal encoded as normal * 0.5 + 0.5. Background 128,128,255.',
            background         : '#8080ff',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            generator          : 'NormalBuffer',
            usesBeautyRenderer : false,
            surfacePreset      : null,
            previewMode        : 'overlay',
            description        : 'Separates shallow mouldings, roof facets and glazing bars that share a depth.'
        },
        {
            id                 : 'CannyEdges',
            label              : 'Canny Edges',
            suffix             : '__CannyEdges__',
            group              : Na__ErlRegistry__GROUP_STRUCTURAL,
            defaultEnabled     : true,
            isEssential        : true ,
            qwenUse            : Na__ErlRegistry__USE_DIRECT,
            qwenAdapterFamilies: [Na__ErlRegistry__FUN_UNION, Na__ErlRegistry__INSTANTX, Na__ErlRegistry__DS_BLOCK, Na__ErlRegistry__DS_UNION],
            colourSpace        : 'linear-data',
            polarity           : 'White lines on black. The Line Art render, inverted.',
            background         : '#000000',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            generator          : null,
            usesBeautyRenderer : true,
            surfacePreset      : 'lineart',
            invertOutput       : true,
            previewMode        : 'composer',
            description        : 'Exact CAD linework and profile lines, inverted. ValeVision knows where every edge is, so detecting them back out of a raster can only lose accuracy.'
        },
        {
            id                 : 'TrueCanny',
            label              : 'True Canny',
            suffix             : '__TrueCanny__',
            group              : Na__ErlRegistry__GROUP_STRUCTURAL,
            defaultEnabled     : false,
            isEssential        : false,
            qwenUse            : Na__ErlRegistry__USE_DIRECT,
            qwenAdapterFamilies: [Na__ErlRegistry__FUN_UNION, Na__ErlRegistry__INSTANTX, Na__ErlRegistry__DS_BLOCK, Na__ErlRegistry__DS_UNION],
            colourSpace        : 'linear-data',
            polarity           : 'Binary white edges on black.',
            background         : '#000000',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            generator          : 'CannyEdges',
            usesBeautyRenderer : false,
            surfacePreset      : null,
            previewMode        : 'overlay',
            description        : 'A genuine edge detector over depth and normal discontinuities, for comparison against the inverted linework.'
        },
        {
            id                 : 'LineArt',
            label              : 'Line Art',
            suffix             : '__LineArt__',
            group              : Na__ErlRegistry__GROUP_LINES,
            defaultEnabled     : true,
            isEssential        : true ,
            qwenUse            : Na__ErlRegistry__USE_ADAPTER,
            qwenAdapterFamilies: [Na__ErlRegistry__DS_UNION],
            colourSpace        : 'display-sRGB',
            polarity           : 'Dark lines on white. Hidden lines suppressed by the renderer.',
            background         : '#ffffff',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            generator          : null,
            usesBeautyRenderer : true,
            surfacePreset      : 'lineart',
            previewMode        : 'composer',
            description        : "ValeVision's own profile-line renderer over flat white, with the exact CAD linework. Not a derived edge composite."

        },
        {
            id                 : 'GrayControl',
            label              : 'Gray Control',
            suffix             : '__GrayControl__',
            group              : Na__ErlRegistry__GROUP_MASKS,
            defaultEnabled     : false,
            isEssential        : false,
            qwenUse            : Na__ErlRegistry__USE_ADAPTER,
            qwenAdapterFamilies: [Na__ErlRegistry__FUN_UNION],
            colourSpace        : 'display-sRGB',
            polarity           : 'Neutral monochrome clay with real lighting and shadows.',
            background         : '#ffffff',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            generator          : 'GrayControl',
            usesBeautyRenderer : false,
            surfacePreset      : null,
            previewMode        : 'overlay',
            description        : 'Communicates light, volume and relief without the material palette.'
        },
        {
            id                 : 'InpaintMask',
            label              : 'Inpaint Mask',
            suffix             : '__InpaintMask__',
            group              : Na__ErlRegistry__GROUP_MASKS,
            defaultEnabled     : false,
            isEssential        : false,
            qwenUse            : Na__ErlRegistry__USE_ADAPTER,
            qwenAdapterFamilies: [Na__ErlRegistry__FUN_UNION, Na__ErlRegistry__DS_BLOCK],
            colourSpace        : 'linear-data',
            polarity           : 'White where Qwen may change pixels, black where they are protected.',
            background         : '#000000',
            requiresSelection  : true,
            isApproximation    : false,
            available          : true,
            generator          : 'InpaintMask',
            usesBeautyRenderer : false,
            surfacePreset      : null,
            previewMode        : 'overlay',
            description        : 'Select one or more category groups below to enable this row.'
        },
        {
            id                 : 'SilhouetteMask',
            label              : 'Silhouette Mask',
            suffix             : '__SilhouetteMask__',
            group              : Na__ErlRegistry__GROUP_MASKS,
            defaultEnabled     : false,
            isEssential        : false,
            qwenUse            : Na__ErlRegistry__USE_HELPER,
            qwenAdapterFamilies: [],
            colourSpace        : 'linear-data',
            polarity           : 'White where any structural surface is visible, black elsewhere.',
            background         : '#000000',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            generator          : 'SilhouetteMask',
            usesBeautyRenderer : false,
            surfacePreset      : null,
            previewMode        : 'overlay',
            description        : 'Compositing, mask construction, and confirming nothing was left out.'
        },
        {
            id                 : 'CategoryIdMask',
            label              : 'Category ID Mask',
            suffix             : '__CategoryIdMask__',
            group              : Na__ErlRegistry__GROUP_MASKS,
            defaultEnabled     : false,
            isEssential        : false,
            qwenUse            : Na__ErlRegistry__USE_HELPER,
            qwenAdapterFamilies: [],
            colourSpace        : 'linear-data',
            polarity           : 'One deterministic flat colour per loaded category group, black background.',
            background         : '#000000',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            generator          : 'CategoryIdMask',
            usesBeautyRenderer : false,
            surfacePreset      : null,
            previewMode        : 'overlay',
            description        : 'Usually more useful than object IDs: extension, house, doors, roof, landscape.'
        },
        {
            id                 : 'ObjectIdMask',
            label              : 'Object ID Mask',
            suffix             : '__ObjectIdMask__',
            group              : Na__ErlRegistry__GROUP_MASKS,
            defaultEnabled     : false,
            isEssential        : false,
            qwenUse            : Na__ErlRegistry__USE_HELPER,
            qwenAdapterFamilies: [],
            colourSpace        : 'linear-data',
            polarity           : 'One deterministic flat colour per object, black background.',
            background         : '#000000',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            generator          : 'ObjectIdMask',
            usesBeautyRenderer : false,
            surfacePreset      : null,
            previewMode        : 'overlay',
            description        : 'Colours hash from category path plus object name, so they survive a reload.'
        },
        {
            id                 : 'MaterialIdMask',
            label              : 'Material ID Mask',
            suffix             : '__MaterialIdMask__',
            group              : Na__ErlRegistry__GROUP_MASKS,
            defaultEnabled     : false,
            isEssential        : false,
            qwenUse            : Na__ErlRegistry__USE_HELPER,
            qwenAdapterFamilies: [],
            colourSpace        : 'linear-data',
            polarity           : 'One deterministic flat colour per material identity, black background.',
            background         : '#000000',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            generator          : 'MaterialIdMask',
            usesBeautyRenderer : false,
            surfacePreset      : null,
            previewMode        : 'overlay',
            description        : 'Can later drive automatic masks for glass, painted timber, brick or roof finishes.'
        },

        // -- Supporting Buffers -------------------------------------------------
        {
            id                 : 'AmbientOcclusion',
            label              : 'Ambient Occlusion',
            suffix             : '__AmbientOcclusion__',
            group              : Na__ErlRegistry__GROUP_HELPERS,
            defaultEnabled     : false,
            isEssential        : false,
            qwenUse            : Na__ErlRegistry__USE_HELPER,
            qwenAdapterFamilies: [],
            colourSpace        : 'linear-data',
            polarity           : 'White unoccluded, black occluded.',
            background         : '#ffffff',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            generator          : 'AmbientOcclusion',
            usesBeautyRenderer : false,
            surfacePreset      : null,
            previewMode        : 'overlay',
            description        : 'Computed from the export G-buffer, not scraped from the MaxEngine composer.'
        },
        {
            id                 : 'AlbedoBuffer',
            label              : 'Albedo Buffer',
            suffix             : '__AlbedoBuffer__',
            group              : Na__ErlRegistry__GROUP_HELPERS,
            defaultEnabled     : false,
            isEssential        : false,
            qwenUse            : Na__ErlRegistry__USE_HELPER,
            qwenAdapterFamilies: [],
            colourSpace        : 'display-sRGB',
            polarity           : 'Material base colour with no lighting, fog, occlusion or tone mapping.',
            background         : '#000000',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            generator          : 'AlbedoBuffer',
            usesBeautyRenderer : false,
            surfacePreset      : null,
            previewMode        : 'overlay',
            description        : 'Diagnoses material preservation. Not a standard Qwen ControlNet mode.'
        },
        {
            id                 : 'ShadowMask',
            label              : 'Shadow Mask',
            suffix             : '__ShadowMask__',
            group              : Na__ErlRegistry__GROUP_HELPERS,
            defaultEnabled     : false,
            isEssential        : false,
            qwenUse            : Na__ErlRegistry__USE_HELPER,
            qwenAdapterFamilies: [],
            colourSpace        : 'linear-data',
            polarity           : 'White lit, black shadowed.',
            background         : '#ffffff',
            requiresSelection  : false,
            isApproximation    : false,
            available          : true,
            conditionalAvailability : 'shadowMap',
            generator          : 'ShadowMask',
            usesBeautyRenderer : false,
            surfacePreset      : null,
            previewMode        : 'overlay',
            description        : 'Reads the shadow maps the live viewport already produced. Nothing is re-lit.'
        }
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Registry Accessors
// -----------------------------------------------------------------------------

    // FUNCTION | List Every Registered Pass, In Export Order
    // ------------------------------------------------------------
    // Returns shallow copies so a consumer cannot mutate the registry by
    // accident. The registry is the source of truth, not a scratch object.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Registry__GetAll() {
        return Na__ErlRegistry__PASSES.map((pass) => ({ ...pass }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Find One Pass by ID
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Registry__GetById(passId) {
        const pass = Na__ErlRegistry__PASSES.find((entry) => entry.id === passId);
        return pass ? { ...pass } : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Distinct Group Headings, In Registry Order
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Registry__GetGroups() {
        const groups = [];
        Na__ErlRegistry__PASSES.forEach((pass) => {
            if (!groups.includes(pass.group)) groups.push(pass.group);
        });
        return groups;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Default Export Selection
    // ------------------------------------------------------------
    // AppConfig owns the default selection; the registry's own
    // defaultEnabled flags are the fallback when the config omits it.
    // Unavailable passes can never end up selected.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Registry__GetDefaultSelection(config) {
        const configured = config && config.ExportRenderLayers__Config__DefaultPassIds;

        const candidateIds = Array.isArray(configured) && configured.length > 0
            ? configured
            : Na__ErlRegistry__PASSES.filter((pass) => pass.defaultEnabled).map((pass) => pass.id);

        return candidateIds.filter((passId) => {
            const pass = Na__ErlRegistry__PASSES.find((entry) => entry.id === passId);
            if (!pass) {
                console.warn(`[ExportRenderLayers] Default pass id "${passId}" is not registered.`);
                return false;
            }
            return pass.available !== false && pass.requiresSelection !== true;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Base Models a Pass Can Actually Be Used With
    // ------------------------------------------------------------
    // Derived from the pass's adapter families rather than authored, so it
    // cannot drift. Published in the manifest because loading an adapter
    // against the wrong base is the single easiest way to build a graph that
    // runs, produces an image, and conditions on nothing.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Registry__ResolveBaseModels(pass) {
        const families = Array.isArray(pass.qwenAdapterFamilies) ? pass.qwenAdapterFamilies : [];
        const bases = [];

        families.forEach((family) => {
            const base = Na__ErlRegistry__ADAPTER_BASE_MODELS[family];
            if (base && !bases.includes(base)) bases.push(base);
        });

        return bases;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Essential Pass IDs
    // ------------------------------------------------------------
    // The set a Qwen ControlNet workflow actually consumes: the composed
    // edit image plus the structural conditions the cited adapter model
    // cards list. Helper buffers, ID masks and the approximation-only
    // families are deliberately excluded.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Registry__GetEssentialIds() {
        return Na__ErlRegistry__PASSES
            .filter((pass) => pass.isEssential === true && pass.available !== false)
            .map((pass) => pass.id);
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Short Capability Note Shown on a Row
    // ------------------------------------------------------------
    // The note is derived from registry data rather than authored per pass,
    // so a new entry cannot forget to declare what it actually is.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Registry__DescribeCapability(pass, isAvailable) {
        const parts = [];

        const available = (isAvailable === undefined) ? (pass.available !== false) : (isAvailable !== false);

        if (!available)                                          parts.push('unavailable');
        else if (pass.qwenUse === Na__ErlRegistry__USE_DIRECT)   parts.push('Qwen direct');
        else if (pass.qwenUse === Na__ErlRegistry__USE_ADAPTER) parts.push('Qwen adapter-specific');
        else                                                    parts.push('helper buffer');

        if (pass.isApproximation)   parts.push('approximation');
        if (pass.requiresSelection) parts.push('requires selection');

        return parts.join(', ');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Pass Registry API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__Registry__GetAll,
        Na__ExportRenderLayers__Registry__GetById,
        Na__ExportRenderLayers__Registry__GetGroups,
        Na__ExportRenderLayers__Registry__GetDefaultSelection,
        Na__ExportRenderLayers__Registry__GetEssentialIds,
        Na__ExportRenderLayers__Registry__ResolveBaseModels,
        Na__ExportRenderLayers__Registry__DescribeCapability
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
