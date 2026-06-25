// =============================================================================
// VALEVISION3D - SKETCHUP TO VALEVISION - LOAD SCENE DATA
// =============================================================================
//
// FILE       : Na__SketchUp__LoadSceneData__.js
// NAMESPACE  : Na__SketchUp
// MODULE     : LoadSceneData
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read ValeVison3D__SketchUpCameraData from projectData and
//              resolve R2-first image/thumbnail URLs for each scene
// CREATED    : 25-Jun-2026
//
// DESCRIPTION:
// - Reads the ValeVison3D__SketchUpCameraData block from a loaded project.json.
// - Validates its structure and returns null if absent or malformed.
// - Resolves full-resolution image and thumbnail URLs for each scene using
//   the R2-first strategy provided by Na__AppUtils__ProjectLoader.
// - Note: "ValeVison3D" (one 'i') matches the convention in project.json.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project URL Utilities
    // @delegate: ../03__AppUtils/Na__AppUtils__ProjectLoader.js
    // ------------------------------------------------------------
    import {
        Na__AppUtils__NormalizeProjectFolderId,
        Na__AppUtils__ResolveAssetUrl
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Camera Data JSON Keys
    // ------------------------------------------------------------
    const Na__SketchUp__CAMERA_DATA_KEY    = 'ValeVison3D__SketchUpCameraData'; // <-- Root key (one 'i' — matches SketchUp plugin + web convention)
    const Na__SketchUp__SCENES_ARRAY_KEY   = 'scenes';                          // <-- Array of scene objects within the block
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Read And Validate ValeVison3D__SketchUpCameraData From projectData
    // ------------------------------------------------------------
    // Returns the raw ValeVison3D__SketchUpCameraData block or null if absent/invalid.
    // ------------------------------------------------------------
    function Na__SketchUp__LoadSceneData__ReadBlock(projectData) {
        if (!projectData || typeof projectData !== 'object') return null;

        const block = projectData[Na__SketchUp__CAMERA_DATA_KEY];
        if (!block || typeof block !== 'object') return null;

        const scenes = block[Na__SketchUp__SCENES_ARRAY_KEY];
        if (!Array.isArray(scenes) || scenes.length === 0) return null;

        return block;                                                        // <-- Block present and has at least one scene
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Image And Thumbnail URLs For Each SketchUp Scene
    // ------------------------------------------------------------
    // Returns an array of { scene, imageUrl, thumbnailUrl } objects.
    // imageUrl is the full-resolution PNG; thumbnailUrl is the 524p WebP/JPG.
    // Both use R2 as primary with GH Pages as fallback (via ResolveAssetUrl).
    // ------------------------------------------------------------
    function Na__SketchUp__LoadSceneData__ResolveSceneUrls(block, projectCode) {
        if (!block) return [];

        const scenes      = block[Na__SketchUp__SCENES_ARRAY_KEY] || [];
        const folderId    = Na__AppUtils__NormalizeProjectFolderId(projectCode);

        return scenes
            .filter(s => s && s.scene_name)
            .map(scene => {
                const imageName     = na_derive_image_filename(scene.scene_name);
                const thumbName     = na_derive_thumbnail_filename(scene.scene_name);
                const imageUrls     = Na__AppUtils__ResolveAssetUrl(folderId, imageName);
                const thumbUrls     = Na__AppUtils__ResolveAssetUrl(folderId, thumbName);

                return {
                    scene,
                    imageUrl     : imageUrls.primary,
                    imageFallback: imageUrls.fallback,
                    thumbUrl     : thumbUrls.primary,
                    thumbFallback: thumbUrls.fallback
                };
            });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | URL Derivation Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Derive Full-Resolution Image Filename From Scene Name
    // ------------------------------------------------------------
    // SketchUp scene name: "IMG01__LivingRoom"
    // Expected filename:   "IMG01__LivingRoom__WhitecardImage__*.png"
    // The filename uses a wildcard for the date; we match by prefix pattern.
    // For direct URL resolution we use the scene_name as the filename fragment.
    // ------------------------------------------------------------
    function na_derive_image_filename(sceneName) {
        return `${sceneName}__WhitecardImage__latest.png`;                   // <-- Placeholder; Python sync overwrites with dated filename
    }

    // HELPER FUNCTION | Derive Thumbnail Filename From Scene Name
    // ------------------------------------------------------------
    function na_derive_thumbnail_filename(sceneName) {
        return `${sceneName}__WhitecardImage__latest__524p.webp`;            // <-- Generated by the 524p thumbnail script
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Load Scene Data API
    // ------------------------------------------------------------
    export {
        Na__SketchUp__LoadSceneData__ReadBlock,
        Na__SketchUp__LoadSceneData__ResolveSceneUrls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
