// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - SCENE CLASSIFIER
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__SceneClassifier__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Scene Classifier
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Positively identify the structural surfaces and the exact CAD
//              linework that belong in a structural export, and nothing else.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - Traverses ONLY Na__ModelGroup__Root. Because the classification is
//   positive rather than subtractive, the default dev cube, the orbit helper,
//   the grid system, the ground plane, section gizmos, fog planes, Video
//   Studio path overlays and every other scene helper are excluded for free -
//   they simply never appear in the result.
// - The model loader tags each loaded root: descendants of a root carrying
//   userData.Na__ModelType === 'mesh' are structural surfaces; descendants of
//   a root carrying 'linework' are exact CAD edges. The name of the containing
//   category group (a direct child of the model root) is preserved on every
//   entry so category masks and the manifest never need a second traversal.
// - LineSegments2 is checked BEFORE any mesh test. ValeVision's fat-line
//   objects derive from Mesh and present mesh-like flags; classifying them as
//   surfaces would flood the depth and normal buffers with ribbon geometry.
// - Visibility is honoured for the object AND every ancestor up to the model
//   root, so a hidden category group removes its whole subtree.
// - Transparent glass and mirror surfaces stay in the structural set. Depth,
//   normals, IDs and silhouettes must treat a window as an opaque plane; only
//   a pass that explicitly wants visual transparency should think otherwise.
//
// SKY DOMES AND BACKDROPS:
// - A backdrop mesh that encloses the camera is catastrophic for every
//   structural pass. It reads as geometry everywhere, so the Silhouette mask
//   comes out solid, the Normal buffer never shows its background, and Depth
//   loses the sky. It looks harmless in a Beauty render because it is white.
// - Names listed in ExportRenderLayers__Config__ExcludeNameTokens are matched
//   case-insensitively against each object AND its category, and excluded from
//   the structural set. Exclusion is by name rather than by geometry because a
//   name is something a modeller controls; a heuristic that dropped anything
//   enclosing the camera would also drop a legitimate interior.
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

    // MODULE CONSTANTS | Model Type Tags Written by the Multi-Model Loader
    // ------------------------------------------------------------
    const Na__ErlClassify__TYPE_MESH     = 'mesh';        // <-- Structural surface root tag
    const Na__ErlClassify__TYPE_LINEWORK = 'linework';    // <-- Exact CAD edge root tag
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Object Predicates
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Detect a Fat-Line Object
    // ------------------------------------------------------------
    // LineSegments2 sets isLineSegments2 / isLine2 / isMesh all at once.
    // This MUST be tested before the mesh predicate.
    // ------------------------------------------------------------
    function Na__ErlClassify__IsFatLine(object) {
        return !!(object.isLineSegments2 || object.isLine2 || object.isLineSegments || object.isLine);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Detect a Renderable Structural Mesh
    // ------------------------------------------------------------
    function Na__ErlClassify__IsStructuralMesh(object) {
        if (Na__ErlClassify__IsFatLine(object)) return false;              // <-- Fat lines first, always
        if (!object.isMesh && !object.isSkinnedMesh && !object.isInstancedMesh) return false;
        if (!object.geometry) return false;
        if (!object.material) return false;
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Test Visibility Through the Ancestor Chain
    // ------------------------------------------------------------
    // Walks up to (and including) stopAt. A hidden category group or a
    // hidden mesh root removes the whole subtree from the export.
    // ------------------------------------------------------------
    function Na__ErlClassify__IsVisibleThroughAncestors(object, stopAt) {
        let node = object;
        while (node) {
            if (node.visible === false) return false;
            if (node === stopAt) return true;
            node = node.parent;
        }
        return true;                                                       // <-- Detached from stopAt; treat as visible
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Classification Traversal
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Model Type Tag on a Node or Its Ancestors
    // ------------------------------------------------------------
    // The loader tags the ROOT of each loaded GLB, so descendants inherit
    // the tag by lookup rather than by copy.
    // ------------------------------------------------------------
    function Na__ErlClassify__ResolveModelType(object, stopAt) {
        let node = object;
        while (node) {
            const tag = node.userData && node.userData.Na__ModelType;
            if (tag === Na__ErlClassify__TYPE_MESH || tag === Na__ErlClassify__TYPE_LINEWORK) return tag;
            if (node === stopAt) return null;
            node = node.parent;
        }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Owning Category Group Name
    // ------------------------------------------------------------
    // Category groups are the direct children of the model root, named by
    // the multi-model loader (e.g. ValeVision__ProposedDoors).
    // ------------------------------------------------------------
    function Na__ErlClassify__ResolveCategoryName(object, modelRoot) {
        let node = object;
        while (node && node.parent) {
            if (node.parent === modelRoot) return node.name || 'UncategorisedGroup';
            node = node.parent;
        }
        return 'UncategorisedGroup';
    }
    // ------------------------------------------------------------


    // FUNCTION | Classify the Loaded Model Into Export-Ready Collections
    // ------------------------------------------------------------
    // modelRoot {THREE.Group}  Na__ModelGroup__Root, and nothing above it.
    //
    // Returns:
    //   {
    //     meshes         : [ { object, categoryName, materialKey } ],
    //     lineworkObjects: [ { object, categoryName } ],
    //     categoryNames  : [ string ],           <-- Visible categories, in scene order
    //     meshObjects    : [ THREE.Mesh ],       <-- Flat list for hot loops
    //     lineObjects    : [ THREE.Object3D ],   <-- Flat list for hot loops
    //     isEmpty        : boolean
    //   }
    //
    // Classification runs ONCE per preview or per export batch. Nothing in
    // the tile loop may traverse the scene again.
    // ------------------------------------------------------------
    // HELPER FUNCTION | Test a Name Against the Configured Exclusion Tokens
    // ------------------------------------------------------------
    function Na__ErlClassify__IsExcludedByName(object, categoryName, tokens) {
        if (!tokens || tokens.length === 0) return false;

        const objectName = String(object.name || '').toLowerCase();
        const category   = String(categoryName || '').toLowerCase();

        for (let i = 0; i < tokens.length; i++) {
            const token = String(tokens[i] || '').toLowerCase();
            if (!token) continue;
            if (objectName.includes(token) || category.includes(token)) return true;
        }

        return false;
    }
    // ------------------------------------------------------------


    function Na__ExportRenderLayers__Classify(modelRoot, config) {
        const meshes          = [];
        const lineworkObjects = [];
        const categoryNames   = [];
        const seenCategories  = new Set();
        const excludedNames   = [];

        const excludeTokens = (config && Array.isArray(config.ExportRenderLayers__Config__ExcludeNameTokens))
            ? config.ExportRenderLayers__Config__ExcludeNameTokens
            : [];

        if (!modelRoot) {
            return { meshes, lineworkObjects, categoryNames, meshObjects: [], lineObjects: [], isEmpty: true };
        }

        modelRoot.traverse((object) => {
            const isFatLine = Na__ErlClassify__IsFatLine(object);
            const isMesh    = Na__ErlClassify__IsStructuralMesh(object);
            if (!isFatLine && !isMesh) return;                             // <-- Groups, lights, helpers: skip

            if (!Na__ErlClassify__IsVisibleThroughAncestors(object, modelRoot)) return;

            const modelType = Na__ErlClassify__ResolveModelType(object, modelRoot);
            if (modelType === null) return;                                // <-- Untagged geometry is not part of the loaded model

            const categoryName = Na__ErlClassify__ResolveCategoryName(object, modelRoot);

            if (Na__ErlClassify__IsExcludedByName(object, categoryName, excludeTokens)) {
                excludedNames.push(object.name || categoryName);         // <-- Reported, never silently dropped
                return;
            }

            if (!seenCategories.has(categoryName)) {
                seenCategories.add(categoryName);
                categoryNames.push(categoryName);
            }

            if (modelType === Na__ErlClassify__TYPE_LINEWORK || isFatLine) {
                lineworkObjects.push({ object, categoryName });            // <-- Exact CAD edges
                return;
            }

            meshes.push({
                object,
                categoryName,
                materialKey : Na__ErlClassify__BuildMaterialKey(object)    // <-- Stable identity for the material ID mask
            });
        });

        if (excludedNames.length > 0) {
            console.log(`[ExportRenderLayers] Excluded ${excludedNames.length} object(s) by name token:`, excludedNames.slice(0, 12));
        }

        return {
            meshes,
            lineworkObjects,
            categoryNames,
            excludedNames,
            meshObjects : meshes.map((entry) => entry.object),
            lineObjects : lineworkObjects.map((entry) => entry.object),
            isEmpty     : meshes.length === 0 && lineworkObjects.length === 0
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Stable Material Identity Key
    // ------------------------------------------------------------
    // Material arrays are preserved by joining every slot's name, so a
    // multi-material mesh keeps one deterministic identity.
    // ------------------------------------------------------------
    function Na__ErlClassify__BuildMaterialKey(object) {
        const material = object.material;
        if (Array.isArray(material)) {
            return material.map((slot) => (slot && slot.name) || 'Unnamed').join('+');
        }
        return (material && material.name) || 'Unnamed';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Derived Lookups
// -----------------------------------------------------------------------------

    // FUNCTION | Build a Full Hierarchy Path for One Classified Object
    // ------------------------------------------------------------
    // Used by the object ID mask so its colours survive a reload; the
    // category path plus object name is stable across sessions where a
    // THREE uuid is not.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__BuildObjectKey(entry) {
        const name = entry.object.name || `Node${entry.object.id}`;
        return `${entry.categoryName}/${name}`;
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Scene Classifier API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__Classify,
        Na__ExportRenderLayers__BuildObjectKey
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
