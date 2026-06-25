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
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 25-Jun-2026 - Version 1.0.0
// - Initial placeholder scaffolding (fabricated "__latest" filenames).
//
// 25-Jun-2026 - Version 1.0.1
// - Replaced fabricated filenames with real matching against project.json
//   "images" (ResolveSceneFiles): exact scene-name prefix match with an IMG##
//   fallback, then derives the 524p thumbnail filename from the matched image.
// - Module is now pure-data (no URL/environment imports); the carousel resolves
//   R2-first URLs from the relative filenames at render time.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Camera Data JSON Keys And Filename Tokens
    // ------------------------------------------------------------
    const Na__SketchUp__CAMERA_DATA_KEY    = 'ValeVison3D__SketchUpCameraData'; // <-- Root key (one 'i' — matches SketchUp plugin + web convention)
    const Na__SketchUp__SCENES_ARRAY_KEY   = 'scenes';                          // <-- Array of scene objects within the block
    const Na__SketchUp__THUMBNAIL_TOKEN    = '__Thumbnail__524p__';             // <-- 524p thumbnail suffix (matches generator)
    const Na__SketchUp__THUMBNAIL_EXTENSION = '.webp';                          // <-- Primary thumbnail extension
    const Na__SketchUp__IMAGE_EXTENSION    = '.png';                            // <-- Full-resolution scene image extension
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


    // FUNCTION | Resolve Real Image And Thumbnail Filenames For Each SketchUp Scene
    // ------------------------------------------------------------
    // block        {object} - ValeVison3D__SketchUpCameraData block
    // imagesArray  {Array}  - project.json "images" array (real dated filenames)
    // Returns an array of { scene_name, imageName, thumbName } using RELATIVE
    // filenames matched from the project.json images list. The carousel resolves
    // these to R2-first URLs (with GH Pages fallback) at render time, so this
    // module stays pure-data and free of URL/environment concerns.
    // ------------------------------------------------------------
    function Na__SketchUp__LoadSceneData__ResolveSceneFiles(block, imagesArray) {
        if (!block) return [];

        const scenes = block[Na__SketchUp__SCENES_ARRAY_KEY] || [];
        const images = Array.isArray(imagesArray) ? imagesArray : [];

        return scenes
            .filter(s => s && s.scene_name)
            .map(scene => {
                const imageName = na_match_image_for_scene(scene.scene_name, images);
                const thumbName = imageName ? na_derive_thumbnail_filename(imageName) : '';

                return {
                    scene_name : scene.scene_name,
                    imageName  : imageName || '',                            // <-- Real dated PNG filename (or '')
                    thumbName  : thumbName                                   // <-- Derived 524p thumbnail filename (or '')
                };
            });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Filename Matching Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Match A Scene Name To Its Real Image Filename
    // ------------------------------------------------------------
    // SketchUp scene name : "IMG01__3dView__ViewOption-01__"
    // Real image filename : "IMG01__3dView__ViewOption-01____WhitecardImage__25-Jun-2026.png"
    // Strategy:
    //   1. Exact prefix match — the image filename starts with the full scene name.
    //   2. Fallback IMG## match — match on the leading IMG## token alone.
    // Thumbnails (already containing the 524p token) are excluded so the carousel
    // never points a scene at its own thumbnail.
    // ------------------------------------------------------------
    function na_match_image_for_scene(sceneName, images) {
        const candidates = images.filter(name =>
            typeof name === 'string' &&
            name.toLowerCase().endsWith(Na__SketchUp__IMAGE_EXTENSION) &&
            name.indexOf(Na__SketchUp__THUMBNAIL_TOKEN) === -1
        );

        const exact = candidates.find(name => name.startsWith(sceneName));   // <-- Strongest match
        if (exact) return exact;

        const prefixMatch = sceneName.match(/^(IMG\d{2,3})/i);                // <-- e.g. "IMG01"
        if (prefixMatch) {
            const token = `${prefixMatch[1].toUpperCase()}__`;
            const byPrefix = candidates.find(name => name.toUpperCase().startsWith(token));
            if (byPrefix) return byPrefix;
        }

        return null;                                                          // <-- No matching image present
    }

    // HELPER FUNCTION | Derive 524p Thumbnail Filename From A Real Image Filename
    // ------------------------------------------------------------
    // "IMG01__...__WhitecardImage__25-Jun-2026.png"
    //   -> "IMG01__...__WhitecardImage__25-Jun-2026__Thumbnail__524p__.webp"
    // ------------------------------------------------------------
    function na_derive_thumbnail_filename(imageName) {
        const stem = imageName.replace(/\.png$/i, '');                       // <-- Strip .png
        return `${stem}${Na__SketchUp__THUMBNAIL_TOKEN}${Na__SketchUp__THUMBNAIL_EXTENSION}`;
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Load Scene Data API
    // ------------------------------------------------------------
    export {
        Na__SketchUp__LoadSceneData__ReadBlock,
        Na__SketchUp__LoadSceneData__ResolveSceneFiles
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
