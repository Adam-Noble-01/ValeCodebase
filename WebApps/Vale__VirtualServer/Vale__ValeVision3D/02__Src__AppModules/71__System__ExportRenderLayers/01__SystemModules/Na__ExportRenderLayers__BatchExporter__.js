// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - BATCH EXPORTER
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__BatchExporter__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Batch Exporter
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Run one export: validate, freeze the framing, render every
//              selected pass at the same camera and crop, write each file as
//              it finishes, write the manifest last, and restore all state.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - The whole batch is FROZEN at the start. Camera matrices, the visible
//   category set, the tile plan inputs and the global depth range are all
//   computed once, before the first pixel, so every image in the set describes
//   the same moment. Nothing recalculates them mid-run.
// - Files are written as they finish, not batched at the end. If pass seven
//   fails, passes one to six are already on disk and the error names them.
// - The manifest is written LAST and only after every selected image has been
//   written, so a manifest on disk is a promise that the set beside it is
//   complete.
// - State restoration is in finally and is unconditional. Success,
//   cancellation, a shader error, a refused folder write and a lost WebGL
//   context all leave the viewport exactly as they found it.
// - Beauty and Whitecard delegate to the existing tiled beauty exporter, so
//   the active engine, profile lines, fog, ambient occlusion where available,
//   FXAA and vertical correction all behave exactly as they already do. This
//   module never reimplements the beauty composer.
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

    // MODULE IMPORTS | Render Loop Invalidation
    // @delegate: ../../05__RenderPipeline/Na__RenderLoop__Invalidation.js
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Active Render Engine Name
    // @delegate: ../../05__RenderPipeline/Na__RenderEngine__State.js
    // ------------------------------------------------------------
    import { Na__RenderEngine__GetActiveEngine } from '../../05__RenderPipeline/Na__RenderEngine__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Vertical Perspective Correction
    // @delegate: ../../11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js
    // ------------------------------------------------------------
    import { Na__VerticalCorrection__ApplyFrame } from '../../11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Existing Tiled Beauty Exporter
    // @delegate: ../../30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js
    // ------------------------------------------------------------
    import { Na__StaticExport__RenderToCanvas } from '../../30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Shared Tile Plan Clamping
    // @delegate: ../../30__System__ImageExport/Na__ImageExport__StaticExport__TilePlan__.js
    // ------------------------------------------------------------
    import { Na__TilePlan__ClampToDeviceLimits } from '../../30__System__ImageExport/Na__ImageExport__StaticExport__TilePlan__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Hidden-Tab-Safe Async Yield
    // @delegate: ../../30__System__ImageExport/Na__ImageExport__AsyncYield__.js
    // ------------------------------------------------------------
    import { Na__ExportYield__NextPaint } from '../../30__System__ImageExport/Na__ImageExport__AsyncYield__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Export Render Layers System Modules
    // ------------------------------------------------------------
    import { Na__ExportRenderLayers__Classify }              from './Na__ExportRenderLayers__SceneClassifier__.js';
    import { Na__ExportRenderLayers__StateGuard__Create }    from './Na__ExportRenderLayers__SceneStateGuard__.js';
    import { Na__ExportRenderLayers__DepthRange__Calculate } from './Na__ExportRenderLayers__DepthRange__.js';
    import { Na__ExportRenderLayers__SurfacePreset__Create } from './Na__ExportRenderLayers__Pass__SurfacePreset__.js';
    import { Na__ExportRenderLayers__InvertCanvas }            from './Na__ExportRenderLayers__CanvasInvert__.js';
    import { Na__ExportRenderLayers__ShadowMask__CheckAvailability } from './Na__ExportRenderLayers__Pass__ShadowMask__.js';

    import {
        Na__ExportRenderLayers__CreateGenerator,
        Na__ExportRenderLayers__CreateRenderContext
    } from './Na__ExportRenderLayers__PassRenderers__.js';

    import { Na__ExportRenderLayers__RenderPassTiled } from './Na__ExportRenderLayers__TiledPassRenderer__.js';

    import {
        Na__ExportRenderLayers__Manifest__BuildIdentity,
        Na__ExportRenderLayers__Manifest__BuildFilename,
        Na__ExportRenderLayers__Manifest__BuildManifestFilename,
        Na__ExportRenderLayers__Manifest__Build,
        Na__ExportRenderLayers__Manifest__BuildPassRecord
    } from './Na__ExportRenderLayers__Manifest__.js';

    import {
        Na__ExportRenderLayers__FileWriter__Create,
        Na__ExportRenderLayers__RequestDirectory,
        Na__ExportRenderLayers__EncodePng
    } from './Na__ExportRenderLayers__FileWriter__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Validation
// -----------------------------------------------------------------------------

    // FUNCTION | Validate Everything Before Any State Is Mutated
    // ------------------------------------------------------------
    // Throws with a user-presentable message. Called before the state guard
    // exists, so a rejection here cannot leave anything to restore.
    // ------------------------------------------------------------
    function Na__ErlBatch__Validate(options) {
        const { renderer, scene, camera, modelRoot, selectedPasses, outputWidth, outputHeight, config } = options;

        if (!renderer)  throw new Error('The renderer is not ready yet.');
        if (!scene)     throw new Error('The scene is not ready yet.');
        if (!camera)    throw new Error('The camera is not ready yet.');
        if (!modelRoot) throw new Error('No model has been loaded yet.');

        if (!Array.isArray(selectedPasses) || selectedPasses.length === 0) {
            throw new Error('Tick at least one render layer before exporting.');
        }

        if (!Number.isFinite(outputWidth) || !Number.isFinite(outputHeight) || outputWidth < 8 || outputHeight < 8) {
            throw new Error('The requested export dimensions are not valid.');
        }

        const maxDimension = Number.isFinite(config.ExportRenderLayers__Config__MaxExportDimensionPx)
            ? config.ExportRenderLayers__Config__MaxExportDimensionPx
            : 8192;

        if (Math.max(outputWidth, outputHeight) > maxDimension) {
            throw new Error(`The longest edge is limited to ${maxDimension} pixels for render layer exports.`);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Check Any Conditional Availability a Pass Declares
    // ------------------------------------------------------------
    // Runs before the first state mutation for that pass, so an unavailable
    // layer fails cleanly rather than half-configuring the scene.
    // ------------------------------------------------------------
    function Na__ErlBatch__CheckConditionalAvailability(pass, options) {
        if (pass.conditionalAvailability !== 'shadowMap') return { available: true, reason: '' };
        return Na__ExportRenderLayers__ShadowMask__CheckAvailability(options);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Batch Export
// -----------------------------------------------------------------------------

    // FUNCTION | Export Every Selected Render Layer as One Aligned Set
    // ------------------------------------------------------------
    // options:
    //   renderer, scene, camera, controls, modelRoot
    //   getRenderPipelineState {Function}  Lazy pipeline getter
    //   config                 {object}    ExportRenderLayers__Config block
    //   lineworkConfig         {object}    models.RenderConfig__Linework block
    //   selectedPasses         {array}     Registry entries, in registry order
    //   selectedCategories     {array}     Category names for the inpaint mask
    //   outputWidth,           {number}
    //   outputHeight           {number}
    //   aspectRatio            {string|null}
    //   projectCode            {string|null}
    //   sceneName              {string|null}
    //   cameraName             {string|null}
    //   cancelToken            {object|null}
    //   onProgress             {Function|null}
    //
    // Returns: Promise<{ writtenFiles, mode, width, height, wasClamped }>
    // ------------------------------------------------------------
    async function Na__ExportRenderLayers__Batch__Run(options) {
        const {
            renderer, scene, camera, controls, modelRoot,
            getRenderPipelineState, config, lineworkConfig,
            selectedPasses, selectedCategories,
            outputWidth, outputHeight, aspectRatio,
            projectCode, sceneName, cameraName,
            cancelToken = null,
            onProgress  = null
        } = options;

        const progress = (typeof onProgress === 'function') ? onProgress : () => {};


        // VALIDATE | Nothing has been touched yet, so a throw here is free
        // ------------------------------------------------------------
        Na__ErlBatch__Validate({ renderer, scene, camera, modelRoot, selectedPasses, outputWidth, outputHeight, config });

        const fit  = Na__TilePlan__ClampToDeviceLimits(outputWidth, outputHeight);
        const outW = fit.width;
        const outH = fit.height;


        // CLASSIFY | One traversal; the tile loops never re-classify
        // ------------------------------------------------------------
        const classification = Na__ExportRenderLayers__Classify(modelRoot, config);
        if (classification.meshes.length === 0) {
            throw new Error('No visible structural geometry was found to export.');
        }


        // GUARD | Snapshot BEFORE the first mutation
        // ------------------------------------------------------------
        const guard = Na__ExportRenderLayers__StateGuard__Create({ renderer, scene, camera });

        const controlsWereEnabled = controls ? controls.enabled : null;

        // COMPOSED PRESETS | One instance per kind, reused across the batch
        // ------------------------------------------------------------
        const surfacePresets = {
            clay    : Na__ExportRenderLayers__SurfacePreset__Create('clay'),
            lineart : Na__ExportRenderLayers__SurfacePreset__Create('lineart')
        };
        const revertAllPresets = () => {
            Object.keys(surfacePresets).forEach((kind) => {
                try { surfacePresets[kind].revert(); }
                catch (revertError) { console.error(`[ExportRenderLayers] ${kind} preset revert failed:`, revertError); }
            });
        };

        let context      = null;
        let writer       = null;
        let activeGenerator = null;

        try {
            // FREEZE FRAMING | Output aspect first; everything downstream reads it
            // ------------------------------------------------------------
            if (controls) controls.enabled = false;                      // <-- No navigation mid-export

            camera.clearViewOffset();
            if (camera.isPerspectiveCamera) camera.aspect = outW / outH;
            camera.updateProjectionMatrix();
            Na__VerticalCorrection__ApplyFrame();                        // <-- Shear on the full-frame projection
            camera.updateMatrixWorld();


            // DEPTH RANGE | One global range for the whole output image
            // ------------------------------------------------------------
            const depthRange = Na__ExportRenderLayers__DepthRange__Calculate({ camera, classification, config });


            // CONTEXT | Shared GPU objects for every structural pass
            // ------------------------------------------------------------
            context = Na__ExportRenderLayers__CreateRenderContext({
                renderer, scene, camera,
                classification, guard, config, lineworkConfig,
                depthRange,
                outputWidth  : outW,
                outputHeight : outH,
                selectedCategories
            });


            // IDENTITY | One shared base name for every file in this set
            // ------------------------------------------------------------
            const identity = Na__ExportRenderLayers__Manifest__BuildIdentity({
                projectCode, sceneName, cameraName, camera
            });


            // DESTINATION | Ask once, before any rendering time is spent
            // ------------------------------------------------------------
            progress({ stage: 'destination', message: 'Choose a destination folder...' });

            const directoryHandle = await Na__ExportRenderLayers__RequestDirectory(
                config.ExportRenderLayers__Config__PreferFileSystemAccess !== false
            );
            writer = Na__ExportRenderLayers__FileWriter__Create({ directoryHandle });


            // PASS LOOP | Pass-major: render, encode, write, release
            // ------------------------------------------------------------
            const passRecords = [];
            const passCount   = selectedPasses.length;

            for (let passIndex = 0; passIndex < passCount; passIndex++) {
                const pass = selectedPasses[passIndex];

                if (cancelToken && cancelToken.cancelled) throw new Error('Export cancelled.');

                const availability = Na__ErlBatch__CheckConditionalAvailability(pass, { renderer, scene });
                if (!availability.available) {
                    throw new Error(`${pass.label} is unavailable. ${availability.reason}`);
                }

                progress({
                    stage     : 'render',
                    passIndex : passIndex + 1,
                    passCount,
                    passLabel : pass.label,
                    message   : `Rendering ${pass.label} (${passIndex + 1} of ${passCount})...`
                });

                let canvas     = null;
                let dictionary = null;
                let thresholds = null;

                try {
                    if (pass.usesBeautyRenderer) {
                        // COMPOSED PATH | The live engine renders it, not this module
                        if (pass.surfacePreset && surfacePresets[pass.surfacePreset]) {
                            surfacePresets[pass.surfacePreset].apply({
                                classification, guard, config,
                                getPipelineState : getRenderPipelineState    // <-- Line Art suppresses ambient occlusion through it
                            });
                        }

                        const beauty = await Na__StaticExport__RenderToCanvas({
                            renderer, scene, camera,
                            getRenderPipelineState,
                            elevationOverrides : null,
                            targetWidth        : outW,
                            targetHeight       : outH,
                            onProgress         : (message) => progress({
                                stage     : 'render',
                                passIndex : passIndex + 1,
                                passCount,
                                passLabel : pass.label,
                                message
                            })
                        });
                        canvas = beauty.canvas;

                        if (pass.invertOutput) {
                            Na__ExportRenderLayers__InvertCanvas(canvas);    // <-- Canny is Line Art with the polarity flipped
                        }

                        if (pass.surfacePreset && surfacePresets[pass.surfacePreset]) {
                            surfacePresets[pass.surfacePreset].revert();
                        }

                    } else {
                        // STRUCTURAL PATH | Dedicated targets, shared tile plan
                        activeGenerator = Na__ExportRenderLayers__CreateGenerator(pass.generator);
                        if (!activeGenerator) {
                            throw new Error(`${pass.label} has no generator implementation registered.`);
                        }

                        if (typeof activeGenerator.begin === 'function') activeGenerator.begin(context);

                        canvas = await Na__ExportRenderLayers__RenderPassTiled({
                            context,
                            generator    : activeGenerator,
                            outputWidth  : outW,
                            outputHeight : outH,
                            cancelToken,
                            onProgress   : (tileIndex, tileCount) => progress({
                                stage     : 'render',
                                passIndex : passIndex + 1,
                                passCount,
                                passLabel : pass.label,
                                tileIndex,
                                tileCount,
                                message   : tileCount > 1
                                    ? `Rendering ${pass.label} (${passIndex + 1} of ${passCount}) - part ${tileIndex} of ${tileCount}...`
                                    : `Rendering ${pass.label} (${passIndex + 1} of ${passCount})...`
                            })
                        });

                        if (typeof activeGenerator.getDictionary === 'function') dictionary = activeGenerator.getDictionary();
                        if (typeof activeGenerator.getThresholds === 'function') thresholds = activeGenerator.getThresholds();
                    }


                    // ENCODE AND WRITE | One file at a time, released immediately
                    // ------------------------------------------------------------
                    progress({
                        stage     : 'write',
                        passIndex : passIndex + 1,
                        passCount,
                        passLabel : pass.label,
                        message   : `Saving ${pass.label}...`
                    });

                    const filename = Na__ExportRenderLayers__Manifest__BuildFilename(identity, pass.suffix, outW, outH);
                    const blob     = await Na__ExportRenderLayers__EncodePng(canvas);
                    await writer.write(filename, blob);

                    passRecords.push(Na__ExportRenderLayers__Manifest__BuildPassRecord({
                        pass, filename, dictionary, thresholds
                    }));

                } finally {
                    // RELEASE | Drop the full-size canvas before the next pass
                    // ------------------------------------------------------------
                    if (canvas) {
                        canvas.width  = 1;                               // <-- Frees the backing store immediately in every engine
                        canvas.height = 1;
                        canvas = null;
                    }

                    revertAllPresets();                                  // <-- Idempotent; safe after a mid-pass throw

                    // RESTORE THEN DISPOSE | Order matters, and this is why
                    // ------------------------------------------------------------
                    // Passes swap export materials onto real scene objects. The
                    // yield between layers lets the live render loop paint a
                    // frame, so the scene must be pointing at its own materials
                    // again BEFORE the generator disposes the export ones.
                    // Disposing first would leave the viewport referencing freed
                    // GPU resources for exactly one frame.
                    // ------------------------------------------------------------
                    guard.restorePassScoped();

                    if (activeGenerator && typeof activeGenerator.end === 'function') {
                        try {
                            activeGenerator.end(context);
                        } catch (endError) {
                            console.error('[ExportRenderLayers] Pass teardown failed:', endError);
                        }
                    }
                    activeGenerator = null;
                }

                await Na__ExportYield__NextPaint();                      // <-- Keep the browser responsive between layers
            }


            // MANIFEST | Written last, so its presence means the set is complete
            // ------------------------------------------------------------
            progress({ stage: 'write', message: 'Writing the manifest...' });

            const manifest = Na__ExportRenderLayers__Manifest__Build({
                identity, projectCode, sceneName, cameraName, camera,
                engineName        : Na__RenderEngine__GetActiveEngine(),
                width             : outW,
                height            : outH,
                aspectRatio,
                timestampIso      : new Date().toISOString(),
                depthRange        : context.depthRange,                  // <-- The measured range, not the provisional one
                visibleCategories : classification.categoryNames,
                thresholds        : context.fullscreen.describeThresholds(),
                passRecords
            });

            const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
            await writer.write(Na__ExportRenderLayers__Manifest__BuildManifestFilename(identity), manifestBlob);

            return {
                writtenFiles : writer.getWritten(),
                mode         : writer.mode,
                retained     : writer.getRetained(),                     // <-- Empty in folder mode; the fallback's manual-save hook
                width        : outW,
                height       : outH,
                wasClamped   : fit.wasClamped
            };

        } catch (batchError) {
            // REPORT | Name what already landed before re-throwing
            // ------------------------------------------------------------
            const written = writer ? writer.getWritten() : [];
            if (written.length > 0) {
                console.warn(`[ExportRenderLayers] Export stopped after writing ${written.length} file(s):`, written);
                batchError.na_writtenFiles = written;                    // <-- The controller reports these to the developer
                batchError.na_retained     = writer.getRetained();       // <-- Blobs stay alive for a manual save
            }
            throw batchError;

        } finally {
            // RESTORE | Unconditional, and in the safest order
            // ------------------------------------------------------------
            revertAllPresets();

            guard.restore();                                             // <-- Scene, camera, renderer, materials, layers, line widths

            try { if (context) context.dispose(); } catch (disposeError) { console.error('[ExportRenderLayers] Context dispose failed:', disposeError); }

            if (controls && controlsWereEnabled !== null) controls.enabled = controlsWereEnabled;

            Na__VerticalCorrection__ApplyFrame();                        // <-- Re-apply shear so the live viewport stays corrected
            Na__RenderLoop__RequestRender();                             // <-- Redraw with restored state
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Batch Exporter API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__Batch__Run
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
