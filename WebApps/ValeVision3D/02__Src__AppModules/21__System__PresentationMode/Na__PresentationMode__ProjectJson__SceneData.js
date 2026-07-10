// =============================================================================
// VALEVISION3D - PRESENTATION MODE - PROJECT JSON SCENE DATA
// =============================================================================
//
// FILE       : Na__PresentationMode__ProjectJson__SceneData.js
// NAMESPACE  : Na__PresentationMode
// MODULE     : PresentationMode - Project JSON Scene Data
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read, validate, normalise and expose saved camera scenes from
//              the per-project PresentationMode__SavedCameraScenes JSON block
// CREATED    : 11-Jun-2026
//
// DESCRIPTION:
// - Reads and validates the PresentationMode__SavedCameraScenes block from a
//   loaded project.json data object.
// - Provides helpers to check whether a project has valid saved scenes, sort
//   scenes by their Order field, retrieve the default scene, get a scene by id,
//   and resolve thumbnail URLs relative to the project base path.
// - Holds module-level state for the currently active project's scene config
//   and the currently selected scene id.
// - Does not modify the DOM or perform any camera operations — pure data layer.
//
// INTEGRATION:
// - Called from Na__AppFlow__LoadingSequence.js after projectData is fetched.
// - Consumed by Na__PresentationMode__UI__SceneCarousel.js and
//   Na__PresentationMode__Camera__SceneTransition.js.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Jun-2026 - Version 1.0.0
// - Initial implementation for Presentation Mode system.
//
// 10-Jul-2026 - Version 1.1.0
// - Added Na__PresentationMode__ProjectJson__ShouldTrustSceneOrbitTarget: lets
//   callers tell whether the active config's per-scene orbit target was
//   deliberately human-authored or is just raw SketchUp camera.target data
//   (Source === 'SketchUpCameraData'), so scene navigation can decide whether
//   to trust it as an orbit pivot. See Na__PresentationMode__Camera__SceneTransition.js.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project URL Utilities
    // ------------------------------------------------------------
    import {
        Na__AppUtils__IsRunningOnLocalhost,
        Na__AppUtils__NormalizeProjectFolderId,
        Na__AppUtils__ResolveAssetUrl,
        Na__AppUtils__EmitFallbackToast
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | JSON Section and Scene Key Names
    // ------------------------------------------------------------
    const Na__PresentationMode__SECTION_KEY      = 'PresentationMode__SavedCameraScenes';          // <-- Root block key in project.json
    const Na__PresentationMode__ENABLED_KEY       = 'PresentationMode__SavedCameraScenes__Enabled'; // <-- Enabled flag key
    const Na__PresentationMode__SCENES_KEY        = 'PresentationMode__SavedCameraScenes__Scenes';  // <-- Scenes array key
    const Na__PresentationMode__DEFAULT_SCENE_KEY = 'PresentationMode__SavedCameraScenes__DefaultSceneId'; // <-- Default scene id key
    const Na__PresentationMode__SOURCE_KEY        = 'PresentationMode__SavedCameraScenes__Source';  // <-- Provenance marker key ('SketchUpCameraData' or explicit/authored)
    const Na__PresentationMode__SKETCHUP_SOURCE   = 'SketchUpCameraData';                           // <-- Source value stamped by the SketchUp auto-conversion path
    const Na__PresentationMode__GH_PAGES_BASE     = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/Projects'; // <-- Production base
    const Na__PresentationMode__DEFAULT_YEAR      = '2026';                                         // <-- Year fallback for URL building
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Active Project Scene Config and Selection
    // ------------------------------------------------------------
    let Na__PresentationMode__ActiveConfig      = null;   // <-- Full PresentationMode__SavedCameraScenes block for current project
    let Na__PresentationMode__ActiveProjectCode = null;   // <-- Project code used to resolve thumbnail URLs
    let Na__PresentationMode__ActiveSceneId     = null;   // <-- Currently displayed/selected scene id
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Validation Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Validate a Single Scene Object Has Minimum Required Fields
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__IsValidScene(scene) {
        if (!scene || typeof scene !== 'object') return false;

        const id   = scene.PresentationMode__Scene__Id;
        const name = scene.PresentationMode__Scene__Name;
        const cam  = scene.PresentationMode__Scene__CameraPosition;

        if (!id || typeof id !== 'string')   return false;  // <-- Id must exist
        if (!name || typeof name !== 'string') return false; // <-- Name must exist
        if (!cam || typeof cam !== 'object')  return false;  // <-- Camera block must exist

        const pos = cam.Camera__DefaultPos;
        if (!pos) return false;

        const x = pos.Camera__DefaultPos__PosX;
        const y = pos.Camera__DefaultPos__PosY;
        const z = pos.Camera__DefaultPos__PosZ;

        return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z); // <-- Position values must be numeric
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Filter Raw Scenes Array to Valid Scenes Only
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__FilterValidScenes(scenes) {
        if (!Array.isArray(scenes)) return [];
        return scenes.filter(Na__PresentationMode__ProjectJson__IsValidScene); // <-- Discard any malformed entries
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Scene Data Accessors
// -----------------------------------------------------------------------------

    // FUNCTION | Get Raw PresentationMode Block from project.json Data
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__GetSavedCameraScenes(projectData) {
        if (!projectData || typeof projectData !== 'object') return null;
        return projectData[Na__PresentationMode__SECTION_KEY] || null; // <-- Return the block or null if absent
    }
    // ------------------------------------------------------------


    // FUNCTION | Check Whether projectData Contains Valid Saved Scenes
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__HasValidSavedScenes(projectData) {
        const config = Na__PresentationMode__ProjectJson__GetSavedCameraScenes(projectData);
        if (!config) return false;                                           // <-- No section at all

        if (config[Na__PresentationMode__ENABLED_KEY] !== true) return false; // <-- Explicitly disabled

        const scenes = Na__PresentationMode__ProjectJson__FilterValidScenes(config[Na__PresentationMode__SCENES_KEY]);
        return scenes.length > 0;                                            // <-- At least one valid scene required
    }
    // ------------------------------------------------------------


    // FUNCTION | Check Whether a Scene Config's Per-Scene Orbit Target Is Trustworthy
    // ------------------------------------------------------------
    // SketchUp Cloud Sync scenes stash each shot's raw camera.target under the
    // PresentationMode__Scene__OrbitHelperCubePosition field label, but it is
    // NOT the resolved OrbitHelperCube GLB centre — just that one shot's
    // look-at point, which can land far from the model's true orbit pivot on
    // wide/establishing shots (see Na__SketchUp__ConvertSceneData__.js). Only
    // explicitly human-authored scenes (dev menu "Update From Camera") place
    // that value on purpose, so only those are trusted as an orbit pivot.
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__ShouldTrustSceneOrbitTarget(config) {
        return !!config && config[Na__PresentationMode__SOURCE_KEY] !== Na__PresentationMode__SKETCHUP_SOURCE;
    }
    // ------------------------------------------------------------


    // FUNCTION | Sort Scenes Array by Order Field (ascending)
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__SortScenesByOrder(scenes) {
        if (!Array.isArray(scenes)) return [];
        return [...scenes].sort((a, b) => {
            const orderA = Number.isFinite(a.PresentationMode__Scene__Order) ? a.PresentationMode__Scene__Order : 999;
            const orderB = Number.isFinite(b.PresentationMode__Scene__Order) ? b.PresentationMode__Scene__Order : 999;
            return orderA - orderB;                                          // <-- Ascending order
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Default Scene from the Active Config
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__GetDefaultScene(config) {
        if (!config) return null;

        const sorted = Na__PresentationMode__ProjectJson__SortScenesByOrder(
            Na__PresentationMode__ProjectJson__FilterValidScenes(config[Na__PresentationMode__SCENES_KEY])
        );
        if (sorted.length === 0) return null;

        const defaultId = config[Na__PresentationMode__DEFAULT_SCENE_KEY];
        if (defaultId) {
            const match = sorted.find(s => s.PresentationMode__Scene__Id === defaultId);
            if (match) return match;                                         // <-- Use configured default
        }

        return sorted[0];                                                    // <-- Fallback to first sorted scene
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Specific Scene by Id
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__GetSceneById(config, sceneId) {
        if (!config || !sceneId) return null;

        const scenes = Na__PresentationMode__ProjectJson__FilterValidScenes(config[Na__PresentationMode__SCENES_KEY]);
        return scenes.find(s => s.PresentationMode__Scene__Id === sceneId) || null; // <-- Return matching scene or null
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Thumbnail URL for a Scene
    // ------------------------------------------------------------
    // Thumbnail URL from JSON is a relative path like:
    //   "PresentationMode/Thumbnails/Scene_001.webp"
    // Resolved against the project base path depending on environment.
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__ResolveThumbnailUrl(scene, projectCode) {
        const pair = Na__PresentationMode__ProjectJson__ResolveThumbnailUrlPair(scene, projectCode);
        return pair ? pair.primary : null;                                   // <-- Primary (R2-first on production)
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Thumbnail URL Pair (R2 primary + GH fallback)
    // ------------------------------------------------------------
    // Returns { primary, fallback } so the carousel can swap from the R2 CDN
    // to GH Pages via an onerror handler, matching the Whitecardopedia
    // R2-first + fallback-toast behaviour.
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__ResolveThumbnailUrlPair(scene, projectCode) {
        const rawUrl = scene && scene.PresentationMode__Scene__ThumbnailUrl;
        if (!rawUrl) return null;

        if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/')) {
            return { primary: rawUrl, fallback: rawUrl };                    // <-- Already absolute, pass through
        }

        const code = projectCode || Na__PresentationMode__ActiveProjectCode;
        if (!code) return null;

        const folderId = Na__AppUtils__NormalizeProjectFolderId(code);

        if (Na__AppUtils__IsRunningOnLocalhost()) {
            const localUrl = `/Projects/${folderId}/${rawUrl}?t=${Date.now()}`; // <-- Flask static path + cache-bust
            return { primary: localUrl, fallback: localUrl };
        }

        const resolved = Na__AppUtils__ResolveAssetUrl(folderId, rawUrl);    // <-- { primary: R2, fallback: GH }
        return resolved || {
            primary:  `${Na__PresentationMode__GH_PAGES_BASE}/${folderId}/${rawUrl}`,  // <-- Defensive GH fallback
            fallback: `${Na__PresentationMode__GH_PAGES_BASE}/${folderId}/${rawUrl}`
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State Management
// -----------------------------------------------------------------------------

    // FUNCTION | Store Active Project Scene Config (called by loading sequence)
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__SetActiveConfig(config, projectCode) {
        Na__PresentationMode__ActiveConfig      = config || null;      // <-- Persist config for this session
        Na__PresentationMode__ActiveProjectCode = projectCode || null; // <-- Persist project code for URL resolution
        Na__PresentationMode__ActiveSceneId     = null;                // <-- Reset selection on new project load
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Stored Active Config
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__GetActiveConfig() {
        return Na__PresentationMode__ActiveConfig; // <-- Return currently loaded project config block
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Currently Active Scene Id
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__SetActiveSceneId(sceneId) {
        Na__PresentationMode__ActiveSceneId = sceneId || null; // <-- Track which scene is currently showing
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Currently Active Scene Id
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__GetActiveSceneId() {
        return Na__PresentationMode__ActiveSceneId; // <-- Return current selection
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Sorted Valid Scenes from Active Config
    // ------------------------------------------------------------
    function Na__PresentationMode__ProjectJson__GetSortedScenes() {
        if (!Na__PresentationMode__ActiveConfig) return [];

        const scenes = Na__PresentationMode__ProjectJson__FilterValidScenes(
            Na__PresentationMode__ActiveConfig[Na__PresentationMode__SCENES_KEY]
        );
        return Na__PresentationMode__ProjectJson__SortScenesByOrder(scenes); // <-- Pre-sorted, pre-filtered
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Presentation Mode Scene Data API
    // ------------------------------------------------------------
    export {
        Na__PresentationMode__ProjectJson__GetSavedCameraScenes,
        Na__PresentationMode__ProjectJson__HasValidSavedScenes,
        Na__PresentationMode__ProjectJson__ShouldTrustSceneOrbitTarget,
        Na__PresentationMode__ProjectJson__SortScenesByOrder,
        Na__PresentationMode__ProjectJson__GetDefaultScene,
        Na__PresentationMode__ProjectJson__GetSceneById,
        Na__PresentationMode__ProjectJson__ResolveThumbnailUrl,
        Na__PresentationMode__ProjectJson__ResolveThumbnailUrlPair,
        Na__PresentationMode__ProjectJson__SetActiveConfig,
        Na__PresentationMode__ProjectJson__GetActiveConfig,
        Na__PresentationMode__ProjectJson__SetActiveSceneId,
        Na__PresentationMode__ProjectJson__GetActiveSceneId,
        Na__PresentationMode__ProjectJson__GetSortedScenes
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
