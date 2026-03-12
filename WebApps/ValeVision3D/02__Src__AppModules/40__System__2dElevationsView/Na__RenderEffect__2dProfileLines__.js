// =============================================================================
// VALEVISION3D - RENDER EFFECT - 2D PROFILE LINES
// =============================================================================
//
// FILE      : Na__RenderEffect__2dProfileLines__.js
// NAMESPACE : ValeVision3D
// MODULE    : Na__RenderEffect__2dProfileLines__
// AUTHOR    : Adam Noble - Noble Architecture
// PURPOSE   : Orthographic profile lines renderer for 2D elevation views
// CREATED   : 11-Mar-2026
//
// DESCRIPTION:
// - Provides a 2D-specific profile lines renderer that uses the ortho camera
//   instead of the perspective camera captured by the 3D system.
// - Shares the same normal and profile colour render targets as the 3D system
//   so the existing ShaderPass reads correct (ortho-rendered) textures.
// - Uses a fixed edge width (no distance-based falloff in orthographic projection).
// - Maintains its own scene cache for independent control of line/mesh objects.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports and Constants
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Default Config Values
    // ------------------------------------------------------------
    const PROFILE_2D__DEFAULT_EDGE_WIDTH = 1.0;                                  // <-- Fixed line thickness in pixels (no distance scaling)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Utility Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Collect Line Objects for Normal-Pass Visibility Toggle
    // ---------------------------------------------------------------
    function collectLineObjects(scene) {
        const lineObjects = [];
        scene.traverse((obj) => {
            if (obj.isLine2 || obj.isLineSegments2) lineObjects.push(obj);       // <-- Collect all line segment objects
        });
        return lineObjects;
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Collect Visible Mesh Objects
    // ---------------------------------------------------------------
    function collectMeshObjects(scene) {
        const meshObjects = [];
        scene.traverse((obj) => {
            if (obj.isMesh) meshObjects.push(obj);                               // <-- Collect all visible mesh objects
        });
        return meshObjects;
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 2D Profile Lines Effect - Core API
// -----------------------------------------------------------------------------

    // FUNCTION | Create 2D Profile Lines Renderer (Ortho Camera)
    // ------------------------------------------------------------
    function Na__2dProfileLines__Create(renderer, scene, pipelineRef) {
        const pipeline = pipelineRef.current;
        if (!pipeline || !pipeline.profileNormalTarget || !pipeline.profileColorTarget) {
            console.warn('[ValeVision3D] 2D Profile Lines: render targets not available from pipeline');
            return { renderProfileNormals: () => {}, setSize: () => {}, invalidateSceneCache: () => {} };
        }

        const normalRenderTarget       = pipeline.profileNormalTarget;           // <-- Shared normal buffer from 3D system
        const profileColorRenderTarget = pipeline.profileColorTarget;            // <-- Shared colour buffer from 3D system

        const normalMaterial = new THREE.MeshNormalMaterial();                    // <-- Override material for normal prepass

        const edgeColor = pipeline.profileLinesPassRef                           // <-- Read fallback colour from existing ShaderPass
            ? pipeline.profileLinesPassRef.material.uniforms.u_edgeColor.value.clone()
            : new THREE.Color(0x333333);

        const profileColorFallbackMaterial = new THREE.MeshBasicMaterial({
            color              : edgeColor,
            side               : THREE.DoubleSide,
            polygonOffset      : true,
            polygonOffsetFactor: 2,
            polygonOffsetUnits : 2
        });

        let cachedLineObjects      = [];
        let cachedMeshObjects      = [];
        let cachedOriginalMaterials = [];
        let sceneCacheDirty        = true;


        // SUB FUNCTION | Rebuild Cached Scene Object Collections
        // ---------------------------------------------------------------
        function rebuildSceneCache() {
            cachedLineObjects       = collectLineObjects(scene);
            cachedMeshObjects       = collectMeshObjects(scene);
            cachedOriginalMaterials = new Array(cachedMeshObjects.length);        // <-- Pre-allocate to mesh count
            sceneCacheDirty         = false;
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Invalidate Cached Scene Object Collections
        // ---------------------------------------------------------------
        function invalidateSceneCache() {
            sceneCacheDirty = true;
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Resize (Shared Targets Resized by 3D System)
        // ---------------------------------------------------------------
        function setSize() {
            // Render targets are resized by the 3D profile lines system; nothing to do here
        }
        // ---------------------------------------------------------------


        // FUNCTION | Render Normal and Profile Colour Pre-Passes (Ortho)
        // ---------------------------------------------------------------
        function renderProfileNormals(camera) {
            if (!camera) return;

            if (pipeline.profileLinesPassRef) {
                pipeline.profileLinesPassRef.material.uniforms.u_edgeWidth.value = PROFILE_2D__DEFAULT_EDGE_WIDTH; // <-- Fixed width for ortho
            }

            if (sceneCacheDirty) {
                rebuildSceneCache();
            }

            const lineObjects = cachedLineObjects;                               // <-- Reuse cached line segment objects
            const meshObjects = cachedMeshObjects;                               // <-- Reuse cached mesh objects

            lineObjects.forEach((obj) => { obj.visible = false; });              // <-- Hide linework for normal prepass

            const savedOverrideMaterial = scene.overrideMaterial;
            const savedClearColor       = renderer.getClearColor(new THREE.Color());
            const savedClearAlpha       = renderer.getClearAlpha();

            // PASS 1 | Normal buffer (meshes only, MeshNormalMaterial override)
            renderer.setClearColor(0.5, 0.5, 1.0, 1.0);
            scene.overrideMaterial = normalMaterial;
            renderer.setRenderTarget(normalRenderTarget);
            renderer.clear();
            renderer.render(scene, camera);                                      // <-- Ortho camera
            scene.overrideMaterial = savedOverrideMaterial;

            // PASS 2 | Profile colour at half-res (meshes fallback + linework vertex colours)
            lineObjects.forEach((obj) => { obj.visible = true; });               // <-- Restore linework for colour pass

            for (let i = 0, len = meshObjects.length; i < len; i++) {
                cachedOriginalMaterials[i] = meshObjects[i].material;            // <-- Stash into pre-allocated slot
                meshObjects[i].material = profileColorFallbackMaterial;          // <-- Swap mesh to flat fallback colour
            }

            renderer.setClearColor(edgeColor, 1.0);                              // <-- Background receives fallback colour
            renderer.setRenderTarget(profileColorRenderTarget);
            renderer.clear();
            renderer.render(scene, camera);                                      // <-- Ortho camera
            renderer.setRenderTarget(null);

            for (let i = 0, len = meshObjects.length; i < len; i++) {
                meshObjects[i].material = cachedOriginalMaterials[i];            // <-- Restore original mesh materials
            }

            renderer.setClearColor(savedClearColor, savedClearAlpha);
        }
        // ---------------------------------------------------------------


        return {
            renderProfileNormals,
            setSize,
            invalidateSceneCache
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | 2D Profile Lines API
    // ------------------------------------------------------------
    export {
        Na__2dProfileLines__Create
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
