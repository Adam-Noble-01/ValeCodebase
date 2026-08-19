// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - FILENAME AND MANIFEST BUILDER
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__Manifest__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Filename and Manifest Builder
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build sanitised deterministic filenames and the JSON manifest
//              that tells a downstream workflow exactly what each image is.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - Filename contract:
//     ValeVision3D__{ProjectCode}__{SceneSlug}__{CameraSlug}__{PassName}__{W}x{H}.png
//   The double underscore either side of the pass name is the stable token a
//   downstream script matches on, so slugs collapse their own separators but
//   never the system's delimiter.
// - Every file in one export set shares the same base identity. A per-file
//   timestamp would break the correspondence between a Depth map and the
//   Beauty render it belongs to, which is the whole point of the set.
// - When project, scene or camera metadata is unavailable the fallbacks are
//   STABLE, not random: UnknownProject, CurrentScene, and a short hash of the
//   camera's world and projection matrices. Re-exporting the same view twice
//   therefore produces the same filenames.
// - The manifest is the honesty layer. It states which images are native Qwen
//   control types, which are adapter-specific, which are approximations and
//   which are helper buffers, and it records the depth range in metres,
//   polarity, colour space and thresholds for each one.
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

    // MODULE IMPORTS | Deterministic String Hash
    // @delegate: ./Na__ExportRenderLayers__ColourHash__.js
    // ------------------------------------------------------------
    import { Na__ExportRenderLayers__HashString } from './Na__ExportRenderLayers__ColourHash__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Adapter Base Model Resolution
    // @delegate: ./Na__ExportRenderLayers__PassRegistry__.js
    // ------------------------------------------------------------
    import { Na__ExportRenderLayers__Registry__ResolveBaseModels } from './Na__ExportRenderLayers__PassRegistry__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Filename Contract
    // ------------------------------------------------------------
    const Na__ErlManifest__APP_PREFIX      = 'ValeVision3D';
    const Na__ErlManifest__MANIFEST_SUFFIX = '__RenderLayersManifest__';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Stable Fallback Slugs
    // ------------------------------------------------------------
    const Na__ErlManifest__FALLBACK_PROJECT = 'UnknownProject';
    const Na__ErlManifest__FALLBACK_SCENE   = 'CurrentScene';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Slug Sanitisation
// -----------------------------------------------------------------------------

    // FUNCTION | Sanitise a User-Derived Value Into a Filename Slug
    // ------------------------------------------------------------
    // ASCII letters, digits, hyphens and underscores only. Repeated
    // separators inside the value collapse to one, so a folder id like
    // "2026/63853__Bressard-Kayode" becomes "2026_63853_Bressard-Kayode"
    // without ever producing a stray double underscore that could be
    // mistaken for the system's pass delimiter.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Slugify(value, fallback) {
        const text = String(value == null ? '' : value).trim();
        if (!text) return fallback;

        const slug = text
            .normalize('NFKD')
            .replace(/[^\x20-\x7E]/g, '')                                // <-- Drop anything outside printable ASCII
            .replace(/[^A-Za-z0-9_-]+/g, '_')                            // <-- Everything else becomes one underscore
            .replace(/_{2,}/g, '_')                                      // <-- Collapse runs; the system delimiter is added outside
            .replace(/^[_-]+|[_-]+$/g, '');

        return slug || fallback;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Short Stable Hash of the Active Camera
    // ------------------------------------------------------------
    // Used as the camera slug when no named scene is active. Derived from
    // the world matrix and the projection parameters, so the same framing
    // always yields the same slug and a moved camera always yields a
    // different one.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__CameraHash(camera) {
        if (!camera) return 'Cam000000';

        camera.updateMatrixWorld();

        const parts = [
            ...camera.matrixWorld.elements.map((value) => value.toFixed(4)),
            (camera.fov  || 0).toFixed(4),
            (camera.near || 0).toFixed(4),
            (camera.far  || 0).toFixed(4)
        ];

        const hash = Na__ExportRenderLayers__HashString(parts.join(','));
        return `Cam${hash.toString(16).padStart(8, '0').slice(0, 6)}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Identity and Filenames
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Shared Identity for One Export Set
    // ------------------------------------------------------------
    // options: { projectCode, sceneName, cameraName, camera }
    //
    // Returns { projectSlug, sceneSlug, cameraSlug, base }
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Manifest__BuildIdentity(options) {
        const { projectCode, sceneName, cameraName, camera } = options;

        const projectSlug = Na__ExportRenderLayers__Slugify(projectCode, Na__ErlManifest__FALLBACK_PROJECT);
        const sceneSlug   = Na__ExportRenderLayers__Slugify(sceneName,   Na__ErlManifest__FALLBACK_SCENE);
        const cameraSlug  = cameraName
            ? Na__ExportRenderLayers__Slugify(cameraName, Na__ExportRenderLayers__CameraHash(camera))
            : Na__ExportRenderLayers__CameraHash(camera);

        return {
            projectSlug,
            sceneSlug,
            cameraSlug,
            base : `${Na__ErlManifest__APP_PREFIX}__${projectSlug}__${sceneSlug}__${cameraSlug}`
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build One Pass Filename
    // ------------------------------------------------------------
    // The suffix arrives from the registry already carrying its leading and
    // trailing double underscore, e.g. "__DepthMap__".
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Manifest__BuildFilename(identity, suffix, width, height) {
        return `${identity.base}${suffix}${width}x${height}.png`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Manifest Filename
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Manifest__BuildManifestFilename(identity) {
        return `${identity.base}${Na__ErlManifest__MANIFEST_SUFFIX}.json`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Manifest Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Serialise a Matrix Into a Plain Array
    // ------------------------------------------------------------
    function Na__ErlManifest__MatrixToArray(matrix) {
        return matrix && matrix.elements ? Array.from(matrix.elements) : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Export Set Manifest
    // ------------------------------------------------------------
    // options:
    //   identity        {object}  Shared identity from BuildIdentity
    //   projectCode     {string|null}
    //   sceneName       {string|null}
    //   cameraName      {string|null}
    //   camera          {THREE.Camera}
    //   engineName      {string}
    //   width, height   {number}
    //   aspectRatio     {string|null}
    //   timestampIso    {string}
    //   depthRange      {object}  Global view-space range
    //   visibleCategories {array}
    //   thresholds      {object}  Active full screen tuning
    //   passRecords     {array}   One record per exported pass
    //
    // Returns a plain object ready for JSON.stringify.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Manifest__Build(options) {
        const {
            identity, projectCode, sceneName, cameraName, camera,
            engineName, width, height, aspectRatio, timestampIso,
            depthRange, visibleCategories, thresholds, passRecords
        } = options;

        camera.updateMatrixWorld();

        return {
            application : {
                name        : 'ValeVision3D',
                system      : 'Export Render Layers',
                schema      : 'ValeVision3D.RenderLayersManifest.v1'
            },

            project : {
                projectCode : projectCode || null,
                sceneName   : sceneName   || null,
                cameraName  : cameraName  || null,
                identity    : {
                    projectSlug : identity.projectSlug,
                    sceneSlug   : identity.sceneSlug,
                    cameraSlug  : identity.cameraSlug,
                    filenameBase: identity.base
                }
            },

            render : {
                engine       : engineName || 'Unknown',
                width,
                height,
                aspectRatio  : aspectRatio || `${width}:${height}`,
                timestampIso,
                colourNote   : 'Every pass is written as an eight-bit PNG. colourSpace states whether the bytes are display sRGB or a linear data encoding.'
            },

            camera : {
                matrixWorld        : Na__ErlManifest__MatrixToArray(camera.matrixWorld),
                matrixWorldInverse : Na__ErlManifest__MatrixToArray(camera.matrixWorldInverse),
                projectionMatrix   : Na__ErlManifest__MatrixToArray(camera.projectionMatrix),
                fieldOfViewDegrees : camera.fov  || null,
                near               : camera.near || null,
                far                : camera.far  || null
            },

            structuralDepthRange : {
                nearMetres      : depthRange.nearM,
                farMetres       : depthRange.farM,
                rangeMetres     : depthRange.rangeM,
                nearMillimetres : depthRange.nearMm,
                farMillimetres  : depthRange.farMm,
                rangeMillimetres: depthRange.rangeMm,
                inverted        : depthRange.invert,
                measuredMeshes  : depthRange.meshCount,
                usedCameraPlanes: depthRange.isFallback,
                note            : 'One range for the whole output image, derived from the visible structural bounds. Depth is linear view depth, never the logarithmic hardware sample.'
            },

            visibleCategories : Array.isArray(visibleCategories) ? visibleCategories.slice() : [],

            edgeTuning : thresholds || {},

            passes : Array.isArray(passRecords) ? passRecords.slice() : []
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build One Pass Record for the Manifest
    // ------------------------------------------------------------
    // options:
    //   pass       {object}  Registry entry
    //   filename   {string}
    //   dictionary {array|null}  ID colour dictionary, when the pass has one
    //   thresholds {object|null} Pass-specific tuning, when the pass has any
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Manifest__BuildPassRecord(options) {
        const { pass, filename, dictionary = null, thresholds = null } = options;

        const record = {
            id                : pass.id,
            label             : pass.label,
            filename,
            suffix            : pass.suffix,
            group             : pass.group,
            generator         : pass.generator,
            qwenUse           : pass.qwenUse,
            qwenAdapterFamilies: Array.isArray(pass.qwenAdapterFamilies) ? pass.qwenAdapterFamilies.slice() : [],
            qwenBaseModels    : Na__ExportRenderLayers__Registry__ResolveBaseModels(pass),
            isEssential       : pass.isEssential === true,
            colourSpace       : pass.colourSpace,
            polarity          : pass.polarity,
            background        : pass.background,
            isApproximation   : !!pass.isApproximation,
            invertedFrom      : pass.invertOutput ? 'LineArt' : null
        };

        if (pass.approximationNote) record.approximationNote = pass.approximationNote;
        if (dictionary && dictionary.length) record.colourDictionary = dictionary;
        if (thresholds) record.thresholds = thresholds;

        return record;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Filename and Manifest Builder API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__Manifest__BuildIdentity,
        Na__ExportRenderLayers__Manifest__BuildFilename,
        Na__ExportRenderLayers__Manifest__BuildManifestFilename,
        Na__ExportRenderLayers__Manifest__Build,
        Na__ExportRenderLayers__Manifest__BuildPassRecord
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
