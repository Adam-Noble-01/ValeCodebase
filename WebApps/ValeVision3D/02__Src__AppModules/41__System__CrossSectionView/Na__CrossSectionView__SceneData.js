// =============================================================================
// VALEVISION3D - CROSS SECTION VIEW - PER-SCENE DATA BINDINGS
// =============================================================================
//
// FILE       : Na__CrossSectionView__SceneData.js
// NAMESPACE  : Na__SectSceneData
// MODULE     : Cross Section View - Scene Data
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Bind saved cross-section states to Presentation Mode scenes
// CREATED    : 15-Jul-2026
//
// DESCRIPTION:
// - Holds the project's CrossSection__SceneData block: a map of scene NAME →
//   serialized section snapshot (positions, normals, slice depth, enabled
//   flags). Keyed by scene name because SketchUp scene names are stable
//   across cloud re-syncs, so re-uploading a project never orphans the data.
// - The block is a SEPARATE top-level project.json object — the SketchUp
//   cloud-sync plugin only writes its own keys, so a full re-sync of scenes
//   leaves saved cross sections intact.
// - Capture: the Presentation Mode scene editor (localhost dev menu) exposes
//   a "Capture Cross Sections On Scene Update" toggle (default OFF). While
//   ON, every scene Update / Add captures the live section state into this
//   block; the editor's existing R2-first save then persists it.
// - Restore: listens for 'na-pm-scene-activated' (dispatched by the scene
//   transition module). Scenes WITH a saved entry apply it exactly — an
//   entry saved with zero sections clears every cut. Scenes WITHOUT any
//   entry (ValeVision or SketchUp) CLEAR every live section, so a cut never
//   leaks into a scene that never had one. Restore only runs while the
//   cross-section feature is enabled for the project.
//
// INTEGRATION:
// - Na__UiFeature__InitializeCrossSectionControls calls Initialize().
// - The loading sequence dispatches 'na-crosssection-scenedata-loaded' with
//   the raw project block after project.json resolves.
// - Na__PresentationMode__DevMenu__SceneEditor imports the capture API.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 15-Jul-2026 - Version 1.0.0
// - Initial implementation (per-scene cross section persistence).
//
// 15-Jul-2026 - Version 1.0.1
// - Fixed: scenes with no ValeVision/SketchUp binding now CLEAR every live
//   section on activation, instead of leaving the previous scene's cuts on.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Cross Section System Logic
    // ------------------------------------------------------------
    import {
        Na__CrossSection__IsFeatureEnabled,
        Na__CrossSection__SetFeatureEnabled,
        Na__CrossSection__SerializeSections,
        Na__CrossSection__ApplySerializedSections
    } from './Na__CrossSectionView__SystemLogic.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Project Block Keys and Events
    // ------------------------------------------------------------
    const Na__SectSceneData__LOADED_EVENT     = 'na-crosssection-scenedata-loaded';           // <-- Fired by the loading sequence
    const Na__SectSceneData__SKETCHUP_EVENT   = 'na-crosssection-sketchup-sections-loaded';   // <-- SketchUp-native sections (cloud sync plugin)
    const Na__SectSceneData__SCENE_EVENT      = 'na-pm-scene-activated';                      // <-- Fired by the scene transition module
    const Na__SectSceneData__BLOCK_DESCRIPTION =
        'Per-scene ValeVision cross section bindings. Keyed by Presentation Mode scene NAME (stable across '
        + 'SketchUp cloud re-syncs). Owned by ValeVision — the SketchUp cloud sync plugin must never write this object.';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Live Block + Capture Toggle
    // ------------------------------------------------------------
    let Na__SectSceneData__Block          = null;      // <-- CrossSection__SceneData object (null until loaded or first capture)
    let Na__SectSceneData__CaptureEnabled = false;     // <-- Scene editor toggle; always defaults OFF per session
    let Na__SectSceneData__Initialized    = false;
    // ------------------------------------------------------------


    // MODULE VARIABLES | SketchUp-Native Section Map (Read-Only, Plugin-Owned)
    // ------------------------------------------------------------
    // scene NAME → ready-to-apply snapshot, built from the cloud sync
    // plugin's ValeVison3D__SketchUpCameraData block. Never persisted by
    // ValeVision — the plugin re-captures it on every sync. Where a scene
    // has BOTH a SketchUp section and a ValeVision binding, SketchUp wins.
    // ------------------------------------------------------------
    let Na__SectSceneData__SketchUpMap = {};
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Block Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Ensure the Block Skeleton Exists
    // ------------------------------------------------------------
    function Na__SectSceneData__EnsureBlock() {
        if (!Na__SectSceneData__Block) {
            Na__SectSceneData__Block = {
                CrossSection__SceneData__Description : Na__SectSceneData__BLOCK_DESCRIPTION,
                CrossSection__SceneData__Version     : 1,
                CrossSection__SceneData__Scenes      : {}
            };
        }
        if (!Na__SectSceneData__Block.CrossSection__SceneData__Scenes) {
            Na__SectSceneData__Block.CrossSection__SceneData__Scenes = {};
        }
        return Na__SectSceneData__Block;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Binding Key for a Scene
    // ------------------------------------------------------------
    // Scene NAME is the primary key (stable across SketchUp re-syncs);
    // falls back to the scene id for unnamed scenes.
    // ------------------------------------------------------------
    function Na__SectSceneData__ResolveKey(sceneName, sceneId) {
        if (typeof sceneName === 'string' && sceneName.trim() !== '') return sceneName;
        if (typeof sceneId === 'string' && sceneId.trim() !== '') return sceneId;
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Capture API (Scene Editor)
// -----------------------------------------------------------------------------

    // FUNCTION | Set Whether Scene Updates Capture Cross Sections
    // ------------------------------------------------------------
    function Na__SectSceneData__SetCaptureEnabled(enabled) {
        Na__SectSceneData__CaptureEnabled = Boolean(enabled);
    }
    // ------------------------------------------------------------


    // FUNCTION | Is Capture-On-Update Currently Enabled?
    // ------------------------------------------------------------
    function Na__SectSceneData__IsCaptureEnabled() {
        return Na__SectSceneData__CaptureEnabled;
    }
    // ------------------------------------------------------------


    // FUNCTION | Capture the Live Section State Against a Scene
    // ------------------------------------------------------------
    // Serializes the CURRENT sections (including "no sections" — an empty
    // entry legitimately means "this scene shows no cuts") and stores the
    // snapshot under the scene's binding key. Persistence happens via the
    // scene editor's existing R2-first project save.
    // ------------------------------------------------------------
    function Na__SectSceneData__CaptureForScene(sceneName, sceneId) {
        const key = Na__SectSceneData__ResolveKey(sceneName, sceneId);
        if (!key) return null;

        const snapshot = Na__CrossSection__SerializeSections();
        const block    = Na__SectSceneData__EnsureBlock();

        block.CrossSection__SceneData__Scenes[key] = {
            CrossSection__SceneBinding__SceneId       : sceneId || null,
            CrossSection__SceneBinding__UpdatedIso    : new Date().toISOString(),
            CrossSection__SceneBinding__GizmosVisible : snapshot.gizmosVisible,
            CrossSection__SceneBinding__SliceDepthM   : snapshot.sliceDepthM,
            CrossSection__SceneBinding__Sections      : snapshot.sections.map((s) => ({
                CrossSection__Section__Name         : s.name,
                CrossSection__Section__Mode         : s.mode,
                CrossSection__Section__NormalXyz    : s.normalXyz,
                CrossSection__Section__PositionMm   : s.positionMm,
                CrossSection__Section__Enabled      : s.enabled,
                CrossSection__Section__GizmoVisible : s.gizmoVisible
            }))
        };

        console.log(`[CrossSection] Captured ${snapshot.sections.length} section(s) for scene "${key}"`);
        return block.CrossSection__SceneData__Scenes[key];
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Full Project Block for Save Merging (Null When Untouched)
    // ------------------------------------------------------------
    // Returns null when nothing was ever loaded or captured, so save paths
    // never write an empty CrossSection__SceneData key into project.json.
    // ------------------------------------------------------------
    function Na__SectSceneData__GetProjectBlock() {
        return Na__SectSceneData__Block;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | SketchUp-Native Section Import (Cloud Sync Plugin Data)
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the SketchUp Section Map From the Camera Data Block
    // ------------------------------------------------------------
    // The plugin captures section planes in SketchUp Z-up coordinates with
    // positions already in mm. The axis swap here matches the camera
    // converter exactly: Three = (su.x, su.z, -su.y). That mapping is a pure
    // rotation, so the position-along-normal value carries over unchanged.
    // SketchUp keeps geometry on the normal side (front), which is also the
    // three.js clipping convention — normals pass through directly.
    // ------------------------------------------------------------
    function Na__SectSceneData__BuildSketchUpMap(cameraDataBlock) {
        const map    = {};
        const scenes = (cameraDataBlock && Array.isArray(cameraDataBlock.scenes)) ? cameraDataBlock.scenes : [];

        for (let i = 0; i < scenes.length; i++) {
            const sceneEntry = scenes[i];
            const planes     = sceneEntry.section_planes;
            if (!Array.isArray(planes) || planes.length === 0) continue;     // <-- Scene has no SketchUp section: no entry
            const sceneName  = sceneEntry.scene_name;
            if (typeof sceneName !== 'string' || sceneName === '') continue;

            const sections = [];
            for (let p = 0; p < planes.length; p++) {
                const plane  = planes[p];
                const suN    = plane.normal || {};
                const threeX = Number(suN.x) || 0;                           // <-- Three.X = SketchUp.x
                const threeY = Number(suN.z) || 0;                           // <-- Three.Y = SketchUp.z (up)
                const threeZ = -(Number(suN.y) || 0);                        // <-- Three.Z = -SketchUp.y
                if ((threeX * threeX + threeY * threeY + threeZ * threeZ) < 1e-9) continue;

                sections.push({
                    name         : plane.name && plane.name !== '' ? plane.name : `SketchUp Section (${sceneName})`,
                    mode         : (Math.abs(threeY) > 0.9) ? 'PLAN' : 'UPRIGHT',
                    normalXyz    : [threeX, threeY, threeZ],
                    positionMm   : Number(plane.position_mm) || 0,           // <-- Invariant under the axis rotation
                    enabled      : true,
                    gizmoVisible : true
                });
            }
            if (sections.length === 0) continue;

            map[sceneName] = {
                gizmosVisible : true,
                sliceDepthM   : null,                                        // <-- SketchUp sections have no slice depth (infinite cut)
                sections      : sections
            };
        }

        return map;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Restore On Scene Activation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Clear Every Live Section (Empty Snapshot)
    // ------------------------------------------------------------
    // Used whenever a newly-activated scene has no SketchUp or ValeVision
    // binding, so a cut from a previously-visited scene cannot leak forward.
    // ------------------------------------------------------------
    function Na__SectSceneData__ClearSections() {
        return Na__CrossSection__ApplySerializedSections({
            gizmosVisible : true,
            sliceDepthM   : null,
            sections      : []
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Restore the Saved Section State for a Scene (Exact Swap)
    // ------------------------------------------------------------
    // Priority per scene:
    //   1. SketchUp-native section (cloud sync plugin) — WINS when present.
    //   2. ValeVision per-scene binding (CrossSection__SceneData).
    //   3. Neither: CLEAR every live section.
    // A ValeVision entry saved with zero sections still clears all cuts.
    // ------------------------------------------------------------
    function Na__SectSceneData__RestoreForScene(sceneName, sceneId) {
        if (!Na__CrossSection__IsFeatureEnabled()) return false;

        // SKETCHUP-NATIVE SECTION | Source of truth for scenes that have one
        const sketchUpSnapshot = (typeof sceneName === 'string') ? Na__SectSceneData__SketchUpMap[sceneName] : null;
        if (sketchUpSnapshot) {
            return Na__CrossSection__ApplySerializedSections(sketchUpSnapshot);
        }

        const scenes = Na__SectSceneData__Block
            ? (Na__SectSceneData__Block.CrossSection__SceneData__Scenes || {})
            : {};
        const key    = Na__SectSceneData__ResolveKey(sceneName, sceneId);
        const entry  = (key && scenes[key])
            || (sceneId && scenes[sceneId])                                    // <-- Fallback: entry keyed by id from an older capture
            || null;
        if (!entry) return Na__SectSceneData__ClearSections();                 // <-- No binding: clear so cuts don't leak between scenes

        const snapshot = {
            gizmosVisible : entry.CrossSection__SceneBinding__GizmosVisible !== false,
            sliceDepthM   : Number.isFinite(entry.CrossSection__SceneBinding__SliceDepthM)
                ? entry.CrossSection__SceneBinding__SliceDepthM
                : null,
            sections      : (entry.CrossSection__SceneBinding__Sections || []).map((s) => ({
                name         : s.CrossSection__Section__Name,
                mode         : s.CrossSection__Section__Mode,
                normalXyz    : s.CrossSection__Section__NormalXyz,
                positionMm   : s.CrossSection__Section__PositionMm,
                enabled      : s.CrossSection__Section__Enabled !== false,
                gizmoVisible : s.CrossSection__Section__GizmoVisible !== false
            }))
        };

        return Na__CrossSection__ApplySerializedSections(snapshot);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Scene Data Listeners
    // ------------------------------------------------------------
    function Na__SectSceneData__Initialize() {
        if (Na__SectSceneData__Initialized) return;
        Na__SectSceneData__Initialized = true;

        // PROJECT LOAD | Seed the block from project.json (loading sequence event)
        window.addEventListener(Na__SectSceneData__LOADED_EVENT, (event) => {
            const block = event.detail && event.detail.sceneData;
            if (block && typeof block === 'object') {
                Na__SectSceneData__Block = block;                              // <-- Adopt verbatim; unknown scene entries are preserved on save
                const count = Object.keys(block.CrossSection__SceneData__Scenes || {}).length;
                console.log(`[CrossSection] Scene data block loaded (${count} scene binding(s))`);
            }
        });

        // SKETCHUP SECTIONS | Build the plugin-derived map; auto-enable the
        // feature so ported cuts apply without any manual dev-menu step
        window.addEventListener(Na__SectSceneData__SKETCHUP_EVENT, (event) => {
            const block = event.detail && event.detail.sketchUpCameraData;
            Na__SectSceneData__SketchUpMap = Na__SectSceneData__BuildSketchUpMap(block);
            const count = Object.keys(Na__SectSceneData__SketchUpMap).length;
            if (count > 0) {
                Na__CrossSection__SetFeatureEnabled(true);                     // <-- SketchUp sections present: cross sections must work
                console.log(`[CrossSection] SketchUp section planes loaded for ${count} scene(s) — feature auto-enabled`);
            }
        });

        // SCENE ACTIVATION | Exact-swap restore when a bound scene is applied
        window.addEventListener(Na__SectSceneData__SCENE_EVENT, (event) => {
            const detail = event.detail || {};
            Na__SectSceneData__RestoreForScene(detail.sceneName, detail.sceneId);
        });

        console.log('[ValeVision3D] Cross Section scene data bindings initialized');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Cross Section Scene Data API
    // ------------------------------------------------------------
    export {
        Na__SectSceneData__Initialize,
        Na__SectSceneData__SetCaptureEnabled,
        Na__SectSceneData__IsCaptureEnabled,
        Na__SectSceneData__CaptureForScene,
        Na__SectSceneData__RestoreForScene,
        Na__SectSceneData__GetProjectBlock
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
