// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - SCENE STATE GUARD
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__SceneStateGuard__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Scene State Guard
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Snapshot every renderer, scene, camera and per-object value the
//              export system may touch, and put all of it back from a finally
//              block - after success, after cancellation, and after failure.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - State restoration is an acceptance condition for this feature, not tidy-up
//   polish. A structural preview that leaves the composer in a debug mode, or
//   an aborted export that leaves the camera cropped, is a defect.
// - Nothing is serialised. Object and material references are retained exactly
//   so restoration is a reference match, not a structural clone that merely
//   looks right.
// - Two layers of tracking:
//     * Global snapshot   - taken at Create(); renderer, scene and camera.
//     * Per-object remember - opt-in, called immediately BEFORE each mutation
//                             so a throw halfway through a swap still restores
//                             every object already touched.
// - remember* helpers are idempotent per object: the FIRST value seen is the
//   one restored, so repeated swaps across many tiles never capture an
//   already-mutated value as the "original".
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
// REGION | Guard Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Create a Scene State Guard and Snapshot Immediately
    // ------------------------------------------------------------
    // options: { renderer, scene, camera }
    //
    // Returns:
    //   {
    //     rememberVisible(object),
    //     rememberMaterial(object),
    //     rememberLayers(object),
    //     rememberLineResolution(material),
    //     rememberRenderOrder(object),
    //     restorePassScoped(),
    //     restore()
    //   }
    //
    // Call Create() BEFORE the first mutation and restore() from finally.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__StateGuard__Create(options) {
        const { renderer, scene, camera } = options;


        // GLOBAL SNAPSHOT | Renderer
        // ------------------------------------------------------------
        const savedRenderTarget    = renderer.getRenderTarget();
        const savedActiveCubeFace  = renderer.getActiveCubeFace();
        const savedActiveMipLevel  = renderer.getActiveMipmapLevel();
        const savedViewport        = renderer.getViewport(new THREE.Vector4());
        const savedScissor         = renderer.getScissor(new THREE.Vector4());
        const savedScissorTest     = renderer.getScissorTest();
        const savedClearColor      = renderer.getClearColor(new THREE.Color());
        const savedClearAlpha      = renderer.getClearAlpha();
        const savedPixelRatio      = renderer.getPixelRatio();
        const savedSize            = renderer.getSize(new THREE.Vector2());
        const savedOutputSpace     = renderer.outputColorSpace;
        const savedToneMapping     = renderer.toneMapping;
        const savedToneExposure    = renderer.toneMappingExposure;
        const savedAutoClear       = renderer.autoClear;
        const savedAutoClearColor  = renderer.autoClearColor;
        const savedAutoClearDepth  = renderer.autoClearDepth;
        const savedAutoClearSten   = renderer.autoClearStencil;
        const savedShadowEnabled   = renderer.shadowMap.enabled;
        const savedShadowAutoUpd   = renderer.shadowMap.autoUpdate;
        const savedLocalClipping   = renderer.localClippingEnabled;
        const savedSortObjects     = renderer.sortObjects;


        // GLOBAL SNAPSHOT | Scene
        // ------------------------------------------------------------
        const savedSceneBackground = scene.background;
        const savedSceneOverride   = scene.overrideMaterial;
        const savedSceneFog        = scene.fog;
        const savedSceneEnv        = scene.environment;


        // GLOBAL SNAPSHOT | Camera
        // ------------------------------------------------------------
        const savedCameraAspect    = camera.isPerspectiveCamera ? camera.aspect : null;
        const savedCameraLayerMask = camera.layers.mask;
        const savedCameraNear      = camera.near;
        const savedCameraFar       = camera.far;
        const savedCameraView      = (camera.view && camera.view.enabled)
            ? { ...camera.view }                                          // <-- Shallow copy; every field is a number or a boolean
            : null;


        // PER-OBJECT TRACKING | First-seen values only
        // ------------------------------------------------------------
        const visibilityMap    = new Map();   // <-- object  -> boolean
        const materialMap      = new Map();   // <-- object  -> Material | Material[]
        const layerMaskMap     = new Map();   // <-- object  -> number
        const lineResMap       = new Map();   // <-- material-> THREE.Vector2 clone
        const renderOrderMap   = new Map();   // <-- object  -> number


        return {

            // FUNCTION | Remember an Object's Visibility Before Changing It
            // ------------------------------------------------------------
            rememberVisible(object) {
                if (!object || visibilityMap.has(object)) return;
                visibilityMap.set(object, object.visible);
            },
            // ------------------------------------------------------------


            // FUNCTION | Remember an Object's Material Before Swapping It
            // ------------------------------------------------------------
            // Material arrays are stored by reference; the array itself is
            // never mutated, so the original reference is a complete record.
            // ------------------------------------------------------------
            rememberMaterial(object) {
                if (!object || materialMap.has(object)) return;
                materialMap.set(object, object.material);
            },
            // ------------------------------------------------------------


            // FUNCTION | Remember an Object's Layer Mask Before Tagging It
            // ------------------------------------------------------------
            rememberLayers(object) {
                if (!object || layerMaskMap.has(object)) return;
                layerMaskMap.set(object, object.layers.mask);
            },
            // ------------------------------------------------------------


            // FUNCTION | Remember a Fat-Line Material's Resolution Uniform
            // ------------------------------------------------------------
            // LineMaterial resolves screen-space width against this vector,
            // so every export that renders linework must set and restore it.
            // ------------------------------------------------------------
            rememberLineResolution(material) {
                if (!material || !material.resolution || lineResMap.has(material)) return;
                lineResMap.set(material, material.resolution.clone());
            },
            // ------------------------------------------------------------


            // FUNCTION | Remember an Object's Render Order Before Changing It
            // ------------------------------------------------------------
            rememberRenderOrder(object) {
                if (!object || renderOrderMap.has(object)) return;
                renderOrderMap.set(object, object.renderOrder);
            },
            // ------------------------------------------------------------


            // FUNCTION | Restore Only the Values One Pass Mutates
            // ------------------------------------------------------------
            // Materials, visibility, render order and fat-line resolutions
            // are PASS scoped: the batch exporter calls this after each layer
            // so the scene is never left pointing at an export material that
            // the pass is about to dispose. Layer tags are batch scoped and
            // are deliberately left alone here.
            //
            // Safe to call repeatedly. Each call clears what it restored, so
            // the next pass captures fresh originals.
            // ------------------------------------------------------------
            restorePassScoped() {
                try {
                    materialMap.forEach((material, object)  => { object.material    = material; });
                    visibilityMap.forEach((visible, object) => { object.visible     = visible; });
                    renderOrderMap.forEach((order, object)  => { object.renderOrder = order; });
                    lineResMap.forEach((resolution, material) => { material.resolution.copy(resolution); });
                } catch (passRestoreError) {
                    console.error('[ExportRenderLayers] Pass-scoped state restore failed:', passRestoreError);
                }

                materialMap.clear();
                visibilityMap.clear();
                renderOrderMap.clear();
                lineResMap.clear();
            },
            // ------------------------------------------------------------


            // FUNCTION | Restore Everything, In Reverse Order of Risk
            // ------------------------------------------------------------
            // Per-object values first (they are what a half-finished pass
            // most likely corrupted), then scene, camera and renderer.
            // Each block is independently guarded so one failure cannot
            // strand the rest of the restore.
            // ------------------------------------------------------------
            restore() {

                // PER-OBJECT | Materials, visibility, render order, line widths
                // ------------------------------------------------------------
                this.restorePassScoped();


                // PER-OBJECT | Layer tags, applied once per batch
                // ------------------------------------------------------------
                try {
                    layerMaskMap.forEach((mask, object) => { object.layers.mask = mask; });
                } catch (layerRestoreError) {
                    console.error('[ExportRenderLayers] Layer mask restore failed:', layerRestoreError);
                }

                layerMaskMap.clear();


                // SCENE | Background, override material, fog, environment
                // ------------------------------------------------------------
                try {
                    scene.background      = savedSceneBackground;
                    scene.overrideMaterial = savedSceneOverride;
                    scene.fog             = savedSceneFog;
                    scene.environment     = savedSceneEnv;
                } catch (sceneRestoreError) {
                    console.error('[ExportRenderLayers] Scene state restore failed:', sceneRestoreError);
                }


                // CAMERA | Crop, layers, aspect, clip planes
                // ------------------------------------------------------------
                try {
                    camera.layers.mask = savedCameraLayerMask;
                    camera.near        = savedCameraNear;
                    camera.far         = savedCameraFar;

                    if (savedCameraView) {
                        camera.setViewOffset(
                            savedCameraView.fullWidth,  savedCameraView.fullHeight,
                            savedCameraView.offsetX,    savedCameraView.offsetY,
                            savedCameraView.width,      savedCameraView.height
                        );                                                 // <-- The live viewport was already cropped; keep it that way
                    } else {
                        camera.clearViewOffset();                          // <-- Safe when no offset is set (three guards internally)
                    }

                    if (savedCameraAspect !== null) camera.aspect = savedCameraAspect;
                    camera.updateProjectionMatrix();
                } catch (cameraRestoreError) {
                    console.error('[ExportRenderLayers] Camera state restore failed:', cameraRestoreError);
                }


                // RENDERER | Targets, viewport, clear state, colour management
                // ------------------------------------------------------------
                try {
                    renderer.setRenderTarget(savedRenderTarget, savedActiveCubeFace, savedActiveMipLevel);
                    renderer.setViewport(savedViewport);
                    renderer.setScissor(savedScissor);
                    renderer.setScissorTest(savedScissorTest);
                    renderer.setClearColor(savedClearColor, savedClearAlpha);
                    renderer.setPixelRatio(savedPixelRatio);
                    renderer.setSize(savedSize.x, savedSize.y, false);     // <-- Drawing buffer only; canvas CSS is owned by the stylesheet

                    renderer.outputColorSpace     = savedOutputSpace;
                    renderer.toneMapping          = savedToneMapping;
                    renderer.toneMappingExposure  = savedToneExposure;
                    renderer.autoClear            = savedAutoClear;
                    renderer.autoClearColor       = savedAutoClearColor;
                    renderer.autoClearDepth       = savedAutoClearDepth;
                    renderer.autoClearStencil     = savedAutoClearSten;
                    renderer.shadowMap.enabled    = savedShadowEnabled;
                    renderer.shadowMap.autoUpdate = savedShadowAutoUpd;
                    renderer.localClippingEnabled = savedLocalClipping;
                    renderer.sortObjects          = savedSortObjects;
                } catch (rendererRestoreError) {
                    console.error('[ExportRenderLayers] Renderer state restore failed:', rendererRestoreError);
                }
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Scene State Guard API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__StateGuard__Create
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
