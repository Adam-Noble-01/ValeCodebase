// =============================================================================
// VALEVISION3D - ELEVATION VIEWS - SCENE LINK
// =============================================================================
//
// FILE       : Na__Elevation__SceneLink__.js
// NAMESPACE  : Na__ElevLink
// MODULE     : Elevation Views - Scene Link
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Turn an elevation into a carousel scene filed in the right group
// CREATED    : 07-Sep-2026
//
// DESCRIPTION:
// - An elevation appears to the viewer as an ordinary scene card in the
//   carousel. This module owns that translation: it creates the scene, files
//   it into the right group, and keeps the two in step.
//
// - THE GROUP DEPENDS ON THE MODE (plan decision D28). A plain elevation files
//   into "Elevations"; a section files into "Cross Sections". Switching a
//   drawing's mode moves its card, so the two groups always hold what their
//   names say. Resolution for either target: a group of that name wins, then
//   the configured id, and if NEITHER exists the group is CREATED rather than
//   falling back to whatever group happens to be enabled. Filing a section
//   into "Exterior 3D Views" would be silently wrong in a way the author would
//   only notice much later. A project with NO groups at all gets the default
//   set seeded first, which ships both groups.
//
// - A matched group that is switched OFF is switched on, because a drawing
//   filed into a hidden group would never reach the carousel.
//
// - Every elevation scene carries a REAL camera block holding its head-on
//   pose. The presentation scene validator rejects a scene without finite
//   camera coordinates, so a scene without one would never appear.
//
// INTEGRATION:
// - Na__Elevation__DevMenu__Editor__ calls CreateSceneForElevation on add,
//   SyncSceneGroup on a mode change and RemoveSceneForElevation on delete,
//   then saves through Na__DrawView__ProjectData__.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/45__System__ElevationViews/Na__Elevation__SceneLink__.js
// - Source version: 1.0.0 (07-Sep-2026)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.19.0 (port Phase 3)
// - Parity        : adapted
// - Divergences   :
//   - Target group chosen by mode (Elevations or Cross Sections, D28); SyncSceneGroup moves a card
//     when the mode changes. TrueVision files everything into Elevations.
// - Back-port     : the mode-based group.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.1.0
// - Ported to ValeVision3D: group by mode, SyncSceneGroup.
//
// 07-Sep-2026 - Version 1.0.0
// - Initial implementation for the Elevation Drawings build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Scene Groups Data
    // ------------------------------------------------------------
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__SceneGroups__Data__.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__SceneGroups__GetGroups,
        Na__PresentationMode__SceneGroups__GetDefaultGroups,
        Na__PresentationMode__SceneGroups__NormaliseOrderWithinGroups
    } from '../21__System__PresentationMode/Na__PresentationMode__SceneGroups__Data__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Elevation Data, Config and Framing
    // ------------------------------------------------------------
    // @delegate: ./Na__Elevation__ProjectJson__Data__.js
    // @delegate: ./Na__Elevation__Framing__.js
    // ------------------------------------------------------------
    import {
        Na__ElevData__LinkToScene,
        Na__ElevData__FindSceneFor,
        Na__ElevData__IsSection
    } from './Na__Elevation__ProjectJson__Data__.js';
    import {
        Na__ElevCfg__GetSceneGroupTarget,
        Na__ElevCfg__GetSectionGroupTarget
    } from './Na__Elevation__ConfigState__.js';
    import { Na__ElevFrame__BuildCameraBlock } from './Na__Elevation__Framing__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Presentation Block Key Names
    // ------------------------------------------------------------
    const Na__ElevLink__SCENES_KEY    = 'PresentationMode__SavedCameraScenes__Scenes';
    const Na__ElevLink__GROUPS_KEY    = 'PresentationMode__SavedCameraScenes__Groups';
    const Na__ElevLink__GROUP_ID      = 'PresentationMode__Group__Id';
    const Na__ElevLink__GROUP_NAME    = 'PresentationMode__Group__Name';
    const Na__ElevLink__GROUP_ORDER   = 'PresentationMode__Group__Order';
    const Na__ElevLink__GROUP_ENABLED = 'PresentationMode__Group__Enabled';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Scene Field Names
    // ------------------------------------------------------------
    const Na__ElevLink__SCENE_ID     = 'PresentationMode__Scene__Id';
    const Na__ElevLink__SCENE_NAME   = 'PresentationMode__Scene__Name';
    const Na__ElevLink__SCENE_ORDER  = 'PresentationMode__Scene__Order';
    const Na__ElevLink__SCENE_GROUP  = 'PresentationMode__Scene__GroupId';
    const Na__ElevLink__SCENE_CAMERA = 'PresentationMode__Scene__CameraPosition';
    const Na__ElevLink__SCENE_ORBIT  = 'PresentationMode__Scene__OrbitHelperCubePosition';
    const Na__ElevLink__SCENE_THUMB  = 'PresentationMode__Scene__ThumbnailUrl';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Scene Id Formatting
    // ------------------------------------------------------------
    const Na__ElevLink__THUMB_DIR     = 'PresentationMode/Thumbnails';
    const Na__ElevLink__SCENE_PREFIX  = 'Scene_';
    const Na__ElevLink__SCENE_PADDING = 3;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Group Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Seed the Default Group Set When a Project Has None
    // ------------------------------------------------------------
    function Na__ElevLink__EnsureGroupsExist(sceneConfig) {
        const existing = Na__PresentationMode__SceneGroups__GetGroups(sceneConfig);
        if (existing.length > 0) return existing;

        const defaults = Na__PresentationMode__SceneGroups__GetDefaultGroups();
        if (defaults.length === 0) return [];

        sceneConfig[Na__ElevLink__GROUPS_KEY] = defaults;
        console.log('[ValeVision3D] Seeded the default scene groups so the new elevation has somewhere to live.');
        return Na__PresentationMode__SceneGroups__GetGroups(sceneConfig);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Append a Target Group to a Project That Lacks It
    // ------------------------------------------------------------
    // Ordered last so it never displaces the groups the author already has,
    // and enabled because it is being created at the exact moment a scene is
    // about to be filed into it.
    // ------------------------------------------------------------
    function Na__ElevLink__CreateTargetGroup(sceneConfig, target, groups) {
        if (!Array.isArray(sceneConfig[Na__ElevLink__GROUPS_KEY])) {
            sceneConfig[Na__ElevLink__GROUPS_KEY] = [];
        }

        let highestOrder = 0;
        for (let i = 0; i < groups.length; i++) {
            const order = groups[i][Na__ElevLink__GROUP_ORDER];
            if (Number.isFinite(order) && order > highestOrder) highestOrder = order;
        }

        const group = {};
        group[Na__ElevLink__GROUP_ID]      = target.groupId || 'Group_005';
        group[Na__ElevLink__GROUP_NAME]    = target.groupName || 'Elevations';
        group[Na__ElevLink__GROUP_ORDER]   = highestOrder + 1;
        group[Na__ElevLink__GROUP_ENABLED] = true;

        sceneConfig[Na__ElevLink__GROUPS_KEY].push(group);
        console.log('[ValeVision3D] Created the "' + group[Na__ElevLink__GROUP_NAME] + '" scene group for the new drawing.');
        return group[Na__ElevLink__GROUP_ID];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Which Target a Record Files Into (by mode, D28)
    // ------------------------------------------------------------
    function Na__ElevLink__TargetFor(elevation) {
        return Na__ElevData__IsSection(elevation)
            ? Na__ElevCfg__GetSectionGroupTarget()
            : Na__ElevCfg__GetSceneGroupTarget();
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Which Group an Elevation's Scene Belongs To
    // ------------------------------------------------------------
    // Name match, then id match, then create it. A matched group that is
    // switched off gets switched on, so the drawing is never filed somewhere
    // the carousel cannot show it. Passing no elevation resolves the plain
    // Elevations target.
    // ------------------------------------------------------------
    function Na__ElevLink__ResolveTargetGroupId(sceneConfig, elevation) {
        const target = Na__ElevLink__TargetFor(elevation || null);
        const groups = Na__ElevLink__EnsureGroupsExist(sceneConfig);
        if (groups.length === 0) return null;                                    // <-- Ungrouped project: scene needs no group

        const wantedName = String(target.groupName || '').trim().toLowerCase();

        let matched = null;
        for (let i = 0; i < groups.length; i++) {
            const name = String(groups[i][Na__ElevLink__GROUP_NAME] || '').trim().toLowerCase();
            if (wantedName && name === wantedName) {
                matched = groups[i];
                break;
            }
        }
        if (!matched && target.groupId) {
            for (let i = 0; i < groups.length; i++) {
                if (groups[i][Na__ElevLink__GROUP_ID] === target.groupId) {
                    matched = groups[i];
                    break;
                }
            }
        }

        if (!matched) return Na__ElevLink__CreateTargetGroup(sceneConfig, target, groups);

        if (matched[Na__ElevLink__GROUP_ENABLED] === false && target.autoEnable) {
            matched[Na__ElevLink__GROUP_ENABLED] = true;                         // <-- A hidden group would swallow the drawing
            console.log('[ValeVision3D] Enabled the "' + matched[Na__ElevLink__GROUP_NAME] + '" scene group for the new drawing.');
        }
        return matched[Na__ElevLink__GROUP_ID];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Ensure the Scenes Array Exists
    // ------------------------------------------------------------
    function Na__ElevLink__EnsureScenes(sceneConfig) {
        if (!sceneConfig || typeof sceneConfig !== 'object') return null;
        if (!Array.isArray(sceneConfig[Na__ElevLink__SCENES_KEY])) {
            sceneConfig[Na__ElevLink__SCENES_KEY] = [];
        }
        return sceneConfig[Na__ElevLink__SCENES_KEY];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Allocate the Next Free Scene Id
    // ------------------------------------------------------------
    // Scans every scene, not just the elevation ones, because scene ids are a
    // single space shared with the floor plans and the ordinary 3D views.
    // ------------------------------------------------------------
    function Na__ElevLink__NextSceneId(scenes) {
        let highest = 0;
        for (let i = 0; i < scenes.length; i++) {
            const id = scenes[i] && scenes[i][Na__ElevLink__SCENE_ID];
            if (typeof id !== 'string' || !id.startsWith(Na__ElevLink__SCENE_PREFIX)) continue;
            const parsed = parseInt(id.slice(Na__ElevLink__SCENE_PREFIX.length), 10);
            if (Number.isFinite(parsed) && parsed > highest) highest = parsed;
        }
        return Na__ElevLink__SCENE_PREFIX + String(highest + 1).padStart(Na__ElevLink__SCENE_PADDING, '0');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Carousel Scene for an Elevation
    // ------------------------------------------------------------
    // measurement is what Na__ElevFrame__MeasureModel returned, or null.
    // Returns the new scene, or the existing one if the elevation already has
    // it (moved to the right group for its mode).
    // ------------------------------------------------------------
    function Na__ElevLink__CreateSceneForElevation(sceneConfig, elevation, measurement, fovDegrees) {
        const scenes = Na__ElevLink__EnsureScenes(sceneConfig);
        if (!scenes || !elevation) return null;

        const existing = Na__ElevData__FindSceneFor(sceneConfig, elevation);
        if (existing) {
            existing[Na__ElevLink__SCENE_NAME] = elevation.Elevation__Name;      // <-- Keep the card label in step
            Na__ElevLink__SyncSceneGroup(sceneConfig, elevation);
            return existing;
        }

        const groupId = Na__ElevLink__ResolveTargetGroupId(sceneConfig, elevation);
        const built   = Na__ElevFrame__BuildCameraBlock(elevation, measurement, fovDegrees);

        const scene = {};
        scene[Na__ElevLink__SCENE_ID]     = Na__ElevLink__NextSceneId(scenes);
        scene[Na__ElevLink__SCENE_NAME]   = elevation.Elevation__Name;
        scene[Na__ElevLink__SCENE_ORDER]  = scenes.length + 1;                   // <-- Normalised per group below
        scene[Na__ElevLink__SCENE_CAMERA] = built.camera;
        scene[Na__ElevLink__SCENE_ORBIT]  = built.orbit;
        if (groupId) scene[Na__ElevLink__SCENE_GROUP] = groupId;

        // THUMBNAIL | The conventional path, set at creation exactly as an
        // ordinary scene gets it, so the card has something to resolve.
        scene[Na__ElevLink__SCENE_THUMB] = Na__ElevLink__THUMB_DIR + '/' + scene[Na__ElevLink__SCENE_ID] + '.webp';

        scenes.push(scene);
        Na__ElevData__LinkToScene(elevation, scene);                             // <-- Writes both directions at once

        // Scene Order restarts at 1 inside every group, so the whole list has
        // to be renumbered rather than just appending an index.
        Na__PresentationMode__SceneGroups__NormaliseOrderWithinGroups(scenes, sceneConfig);
        return scene;
    }
    // ------------------------------------------------------------


    // FUNCTION | Move an Elevation's Card to the Group Its Mode Belongs In
    // ------------------------------------------------------------
    // Called when the drawing type flips between Elevation and Section.
    // Returns true when the card actually moved.
    // ------------------------------------------------------------
    function Na__ElevLink__SyncSceneGroup(sceneConfig, elevation) {
        const scenes = Na__ElevLink__EnsureScenes(sceneConfig);
        const scene  = Na__ElevData__FindSceneFor(sceneConfig, elevation);
        if (!scenes || !scene) return false;

        const groupId = Na__ElevLink__ResolveTargetGroupId(sceneConfig, elevation);
        if (!groupId || scene[Na__ElevLink__SCENE_GROUP] === groupId) return false;

        scene[Na__ElevLink__SCENE_GROUP] = groupId;
        scene[Na__ElevLink__SCENE_ORDER] = scenes.length + 1;                    // <-- Joins the end of its new group
        Na__PresentationMode__SceneGroups__NormaliseOrderWithinGroups(scenes, sceneConfig);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove the Carousel Scene Belonging to an Elevation
    // ------------------------------------------------------------
    function Na__ElevLink__RemoveSceneForElevation(sceneConfig, sceneId) {
        const scenes = Na__ElevLink__EnsureScenes(sceneConfig);
        if (!scenes || !sceneId) return false;

        let removed = false;
        for (let i = 0; i < scenes.length; i++) {
            if (scenes[i] && scenes[i][Na__ElevLink__SCENE_ID] === sceneId) {
                scenes.splice(i, 1);
                removed = true;
                break;
            }
        }

        if (removed) Na__PresentationMode__SceneGroups__NormaliseOrderWithinGroups(scenes, sceneConfig);
        return removed;
    }
    // ------------------------------------------------------------


    // FUNCTION | Push a Renamed Elevation Through to Its Scene Card
    // ------------------------------------------------------------
    function Na__ElevLink__SyncSceneName(sceneConfig, elevation) {
        const scene = Na__ElevData__FindSceneFor(sceneConfig, elevation);
        if (!scene) return false;
        scene[Na__ElevLink__SCENE_NAME] = elevation.Elevation__Name;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Update an Elevation Scene's Stored Camera Block
    // ------------------------------------------------------------
    // Called when the direction or the plane changes, so the scene's own pose
    // keeps matching the drawing it represents.
    // ------------------------------------------------------------
    function Na__ElevLink__SyncSceneCamera(sceneConfig, elevation, measurement, fovDegrees) {
        const scene = Na__ElevData__FindSceneFor(sceneConfig, elevation);
        if (!scene) return false;

        const built = Na__ElevFrame__BuildCameraBlock(elevation, measurement, fovDegrees);
        scene[Na__ElevLink__SCENE_CAMERA] = built.camera;
        scene[Na__ElevLink__SCENE_ORBIT]  = built.orbit;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Record Where an Elevation Scene's Thumbnail Now Lives
    // ------------------------------------------------------------
    function Na__ElevLink__SetSceneThumbnail(sceneConfig, elevation, relativeUrl) {
        const scene = Na__ElevData__FindSceneFor(sceneConfig, elevation);
        if (!scene || typeof relativeUrl !== 'string') return false;
        scene[Na__ElevLink__SCENE_THUMB] = relativeUrl;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Scene Id an Elevation Is Displayed By
    // ------------------------------------------------------------
    function Na__ElevLink__GetSceneId(sceneConfig, elevation) {
        const scene = Na__ElevData__FindSceneFor(sceneConfig, elevation);
        return scene ? scene[Na__ElevLink__SCENE_ID] : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Elevation Scene Link API
    // ------------------------------------------------------------
    export {
        Na__ElevLink__ResolveTargetGroupId,
        Na__ElevLink__CreateSceneForElevation,
        Na__ElevLink__SyncSceneGroup,
        Na__ElevLink__RemoveSceneForElevation,
        Na__ElevLink__SyncSceneName,
        Na__ElevLink__SyncSceneCamera,
        Na__ElevLink__SetSceneThumbnail,
        Na__ElevLink__GetSceneId
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
