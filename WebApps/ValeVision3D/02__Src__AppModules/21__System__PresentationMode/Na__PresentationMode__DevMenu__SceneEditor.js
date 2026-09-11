// =============================================================================
// VALEVISION3D - PRESENTATION MODE - DEV MENU SCENE EDITOR
// =============================================================================
//
// FILE       : Na__PresentationMode__DevMenu__SceneEditor.js
// NAMESPACE  : Na__PresentationMode
// MODULE     : PresentationMode - Dev Menu Scene Editor
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Localhost-only scene editor inside the Dev Tools menu for
//              creating, editing, grouping, reordering and saving Presentation
//              Mode saved scenes
// CREATED    : 11-Jun-2026
//
// DESCRIPTION:
// - Gated behind Na__AppUtils__IsRunningOnLocalhost(); completely invisible
//   on production/hosted builds.
// - Renders inside the static #naPmDevEditorPanel container (declared in
//   index.html Dev Tools section): a collapsible Scene Groups section at the
//   top (owned by the group editor module), then the scene rows clustered
//   under fold-down group headings, then the cross-section capture toggle and
//   the global actions.
// - Per-scene controls are built by Na__PresentationMode__DevMenu__SceneRowBuilders__:
//   drag handle, position title, move up/down, Name, Group, Nav Mode (Orbit |
//   Fly | Walk), FOV with live lens-mm readout, Move Speed, Easing, Position,
//   then Update Camera, Regen Thumb, Save Scene and Delete.
// - Update Camera and Add Scene From Camera record the live navigation mode
//   with the camera, so a view framed in fly is shown in fly.
// - Reordering (arrows, drag handle, Position field) is confined to a scene's
//   own group; the Group dropdown is the only way to move a scene between
//   groups. Scene Order restarts at 1 inside every group and is renumbered
//   before every save.
// - Global controls: Add New Scene From Camera (filed into the group the
//   carousel is showing), Export JSON, Save All To Project (R2-first two-phase
//   save), Clear All Scenes.
// - The group editor never saves for itself: it raises
//   'na-presentation-groups-changed' and this module answers with the one
//   normalise -> commit -> write path, so groups and scenes, which live in the
//   same project JSON block, can never disagree about what was written.
// - Saving and thumbnail upload are delegated to
//   Na__PresentationMode__DevMenu__ScenePersistence__ (R2-first project.json
//   write, R2-first thumbnail upload); per-group array moves and
//   drag-and-drop wiring to Na__PresentationMode__DevMenu__SceneReorder__.
//
// INTEGRATION:
// - Called from index.html after Na__UiFeature__InitializeLocalhostDevMenu.
// - Requires camera, controls, and showToast references from index.html scope.
// - Scene data state is owned by Na__PresentationMode__ProjectJson__SceneData;
//   group data by Na__PresentationMode__SceneGroups__Data__.
// - Carousel/layout refresh via re-dispatched 'na-presentation-mode-scenes-loaded'.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneEditor.js
//                   (group section, grouped headings, per-group ordering, reorder arrows, drag and drop,
//                   Position field, group filing on add, groups-changed persistence)
// - Source version: TrueVision v2.19.0 scene editor (07-Sep-2026)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.17.0
// - Parity        : adapted
// - Divergences   :
//   - Save path is ValeVision's GET-merge then Na__AppUtils__R2SaveProjectJson (the whole project.json),
//     which also carries the CrossSection__SceneData block; TrueVision merges one key through its worker.
//   - Thumbnails go to R2 first through the shared asset route, then mirror to the local project
//     folder through Flask; TrueVision uploads to R2 directly.
//   - Row builders, reorder helpers and persistence live in their own modules
//     (SceneRowBuilders__, SceneReorder__, ScenePersistence__) to keep this file in budget.
//   - Update Camera, Regen Thumb and Save Scene stay separate buttons (TrueVision folds them into Update Scene).
//   - Destructive prompts use Na__AppUtils__ConfirmDialog__Show rather than window.confirm.
//   - The "refuse Add Scene while a drawing is on screen" guard arrives with the drawing systems in Phase 2.
// - Back-port     : the row-builder split and the confirm dialog.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Sep-2026 - Version 1.3.2
// - Update Camera and Add Scene From Camera record the live navigation mode
//   (PresentationMode__Scene__NavigationMode; orbit is the absent key), and
//   a fly or walk capture stores a target along the camera's own axis rather
//   than orbit's leftover one. Rows gain the Nav Mode switch.
//
// 09-Sep-2026 - Version 1.3.1 (port Phase 2)
// - Add Scene From Camera refuses while a 2D drawing owns the viewport.
//
// 11-Jun-2026 - Version 1.0.0
// - Initial implementation for Presentation Mode system.
//
// 26-Jun-2026 - Version 1.1.0
// - Replaced GET-merge-POST-to-Flask with R2-first two-phase save via
//   Na__AppUtils__R2SaveProjectJson (R2 SSOT write, then Flask mirror).
//
// 15-Jul-2026 - Version 1.2.0
// - Save Scene / Save All now capture cross-section geometry + style when
//   the Capture Cross Sections toggle is ON (was Update Camera / Add only).
//
// 09-Sep-2026 - Version 1.3.0
// - Scene groups (port Phase 1): group editor section, rows clustered under
//   fold-down group headings, per-group ordering with arrows, drag handle and
//   Position field, Group dropdown, new scenes filed into the active group,
//   and the groups-changed listener that persists group edits. Row builders,
//   reorder helpers and the save/thumbnail code moved to their own modules.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Scene Data Helpers
    // @delegate: ./Na__PresentationMode__ProjectJson__SceneData.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__ProjectJson__GetActiveConfig,
        Na__PresentationMode__ProjectJson__SetActiveConfig,
        Na__PresentationMode__ProjectJson__GetActiveSceneId
    } from './Na__PresentationMode__ProjectJson__SceneData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scene Group Data Layer
    // @delegate: ./Na__PresentationMode__SceneGroups__Data__.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__SceneGroups__IsEnabled,
        Na__PresentationMode__SceneGroups__GetEnabledGroups,
        Na__PresentationMode__SceneGroups__GetFallbackGroupId,
        Na__PresentationMode__SceneGroups__ResolveSceneGroupId,
        Na__PresentationMode__SceneGroups__SortScenesForPlayback,
        Na__PresentationMode__SceneGroups__NormaliseOrderWithinGroups,
        Na__PresentationMode__SceneGroups__GetActiveGroupId,
        Na__PresentationMode__SceneGroups__FormatViewCount
    } from './Na__PresentationMode__SceneGroups__Data__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Dev Menu Group Editor (rendered at the top of this panel)
    // @delegate: ./Na__PresentationMode__DevMenu__GroupEditor__.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__DevMenu__RenderGroupEditor,
        Na__PresentationMode__DevMenu__GROUPS_CHANGED_EVENT
    } from './Na__PresentationMode__DevMenu__GroupEditor__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scene Row Builders (presentation only)
    // @delegate: ./Na__PresentationMode__DevMenu__SceneRowBuilders__.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__DevMenu__BuildSceneRow,
        Na__PresentationMode__DevMenu__FovToFocalMm,
        Na__PresentationMode__DevMenu__TRANSITION_DEFAULT_MS
    } from './Na__PresentationMode__DevMenu__SceneRowBuilders__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Camera Scene Transition (capture + build)
    // @delegate: ./Na__PresentationMode__Camera__SceneTransition.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__KEY__NAVIGATION_MODE,
        Na__PresentationMode__Camera__BuildSceneCameraJson
    } from './Na__PresentationMode__Camera__SceneTransition.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Live Navigation Mode (captured with the camera)
    // @delegate: ../10__NavigationAndCameras/Na__NavigationModes__Switcher.js
    // ------------------------------------------------------------
    import {
        Na__NavigationModes__GetActiveMode,
        Na__NavigationModes__IsFreeLookMode
    } from '../10__NavigationAndCameras/Na__NavigationModes__Switcher.js';
    // ------------------------------------------------------------

    // NOTE | Carousel refresh happens via the 'na-presentation-mode-scenes-loaded'
    //        event re-dispatched by Na__PmDev__CommitWorkingScenes, no direct import.
    // @delegate: ./Na__PresentationMode__UI__SceneCarousel.js

    // MODULE IMPORTS | Scene Reorder Helpers (per-group moves, drag and drop)
    // @delegate: ./Na__PresentationMode__DevMenu__SceneReorder__.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__DevMenu__GetGroupSliceBounds,
        Na__PresentationMode__DevMenu__AreScenesInSameGroup,
        Na__PresentationMode__DevMenu__MoveSceneToIndex,
        Na__PresentationMode__DevMenu__ResolveDropIndex,
        Na__PresentationMode__DevMenu__AttachSceneRowDragHandlers
    } from './Na__PresentationMode__DevMenu__SceneReorder__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scene Persistence (R2-first save, thumbnail upload, section capture)
    // @delegate: ./Na__PresentationMode__DevMenu__ScenePersistence__.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__DevMenu__CaptureCrossSectionIfEnabled,
        Na__PresentationMode__DevMenu__RegenerateThumbnail,
        Na__PresentationMode__DevMenu__SaveScenesToProject
    } from './Na__PresentationMode__DevMenu__ScenePersistence__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Cross Section Capture Toggle State
    // @delegate: ../41__System__CrossSectionView/Na__CrossSectionView__SceneData.js
    // ------------------------------------------------------------
    import {
        Na__SectSceneData__SetCaptureEnabled,
        Na__SectSceneData__IsCaptureEnabled
    } from '../41__System__CrossSectionView/Na__CrossSectionView__SceneData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Project Utilities
    // ------------------------------------------------------------
    import {
        Na__AppUtils__IsRunningOnLocalhost,
        Na__AppUtils__GetProjectCodeFromUrl
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Confirm Dialog
    // ------------------------------------------------------------
    import { Na__AppUtils__ConfirmDialog__Show } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Drawing View Broker (is a 2D drawing on screen?)
    // @delegate: ../42__System__DrawingViewCore/Na__DrawView__ActiveView__.js
    // ------------------------------------------------------------
    import { Na__DrawView__IsActive } from '../42__System__DrawingViewCore/Na__DrawView__ActiveView__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Identifiers
    // ------------------------------------------------------------
    const Na__PmDev__PANEL_ID  = 'naPmDevEditorPanel';    // <-- Content container (static in index.html)
    const Na__PmDev__ITEM_ID   = 'naPmDevEditorItem';     // <-- Dev menu wrapper li
    const Na__PmDev__TOGGLE_ID = 'naPmDevEditorToggle';   // <-- Open/close button
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Editor Runtime References
    // ------------------------------------------------------------
    let Na__PmDev__Camera        = null;   // <-- Live camera reference from index.html
    let Na__PmDev__Controls      = null;   // <-- Live controls reference
    let Na__PmDev__ShowToast     = null;   // <-- Toast notification helper
    let Na__PmDev__ProjectCode   = null;   // <-- Project code from the URL, re-read on every scenes-loaded event
    let Na__PmDev__WorkingScenes = [];     // <-- Single shared editable scenes array (rows mutate these objects)
    // ------------------------------------------------------------


    // MODULE VARIABLES | Panel UI State
    // ------------------------------------------------------------
    const Na__PmDev__OpenGroupIds = new Set();   // <-- Group headings the author has unfolded; survives rebuilds
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Working Data (in-memory editable copy)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Deep Clone the Active Config's Scenes Array
    // ------------------------------------------------------------
    function Na__PmDev__GetWorkingScenes() {
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        if (!config) return [];
        const scenes = config.PresentationMode__SavedCameraScenes__Scenes;
        return Array.isArray(scenes) ? JSON.parse(JSON.stringify(scenes)) : []; // <-- Deep clone so edits don't corrupt live state
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Fresh Default Config Block (first scene added)
    // ------------------------------------------------------------
    function Na__PmDev__BuildDefaultConfig(scenes) {
        return {
            PresentationMode__SavedCameraScenes__Description : 'Optional per-project saved camera scenes for Presentation Mode. Camera position and orbit target values are integer millimetres; rotations and FOV use the same format as Camera__DefaultPosition.',
            PresentationMode__SavedCameraScenes__Enabled                 : true,
            PresentationMode__SavedCameraScenes__ShowCarouselByDefault   : true,
            PresentationMode__SavedCameraScenes__AutoPlayEnabledByDefault: false,
            PresentationMode__SavedCameraScenes__DefaultSceneId          : scenes[0]?.PresentationMode__Scene__Id || null,
            PresentationMode__SavedCameraScenes__Scenes                  : scenes
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Merge Working Scenes Back Into Active Config + Live Refresh
    // ------------------------------------------------------------
    // Creates a fresh default config block when the project has no existing
    // PresentationMode section (first scene added via dev menu), then
    // re-dispatches the scenes-loaded event so the carousel, the group bar,
    // the adaptive top-toolbar layout and the Views button all update live
    // without a reload.
    // ------------------------------------------------------------
    function Na__PmDev__CommitWorkingScenes(updatedScenes) {
        let config = Na__PresentationMode__ProjectJson__GetActiveConfig();

        if (!config) {
            config = Na__PmDev__BuildDefaultConfig(updatedScenes);          // <-- First scene: create the section from scratch
        }

        config.PresentationMode__SavedCameraScenes__Scenes = updatedScenes;  // <-- Write back in-place

        // KEEP DEFAULT SCENE ID VALID
        const defaultId = config.PresentationMode__SavedCameraScenes__DefaultSceneId;
        const defaultStillExists = updatedScenes.some(s => s.PresentationMode__Scene__Id === defaultId);
        if (!defaultStillExists) {
            config.PresentationMode__SavedCameraScenes__DefaultSceneId = updatedScenes[0]?.PresentationMode__Scene__Id || null;
        }

        Na__PresentationMode__ProjectJson__SetActiveConfig(config, Na__PmDev__ProjectCode); // <-- Re-register updated config

        // LIVE UI REFRESH | Re-dispatch the scenes event (or cleared event when empty)
        if (updatedScenes.length > 0) {
            window.dispatchEvent(new CustomEvent('na-presentation-mode-scenes-loaded', {
                detail : { sceneConfig: config, projectCode: Na__PmDev__ProjectCode, skipCameraApply: true }  // <-- skipCameraApply: don't jump camera mid-edit
            }));
        } else {
            window.dispatchEvent(new CustomEvent('na-presentation-mode-scenes-cleared')); // <-- Restore legacy bottom-toolbar layout
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Ordering and Reordering (per-group)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Sort a Scenes Array Into Playback Order
    // ------------------------------------------------------------
    // Groups first, then Scene Order within each group, so the panel's row
    // sequence matches the carousel's exactly and array position stays a
    // meaningful thing to reorder against. Falls back to a plain Scene Order
    // sort on an ungrouped project.
    // ------------------------------------------------------------
    function Na__PmDev__SortScenesByOrder(scenes) {
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        return Na__PresentationMode__SceneGroups__SortScenesForPlayback(scenes, config);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Rewrite Order Fields to a Clean 1..N Within Each Group
    // ------------------------------------------------------------
    // Scene Order restarts at 1 inside every group, so the carousel's per-group
    // strip reads 1..N and cross-group cycling walks (Group Order, Scene Order).
    // Also writes an explicit GroupId onto every scene, so what reaches the
    // project JSON is fully resolved rather than depending on the runtime
    // fallback. Tidies legacy projects that used sparse orders like 10/20/30.
    // ------------------------------------------------------------
    function Na__PmDev__NormaliseSceneOrder(scenes) {
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        return Na__PresentationMode__SceneGroups__NormaliseOrderWithinGroups(scenes, config);
    }
    // ------------------------------------------------------------


    // FUNCTION | Persist a Reorder to the Live Config, the Panel and R2
    // ------------------------------------------------------------
    async function Na__PmDev__CommitReorder() {
        const ordered = Na__PmDev__NormaliseSceneOrder(Na__PmDev__WorkingScenes); // <-- Renumber before anything reads Order

        Na__PmDev__CommitWorkingScenes(ordered);                             // <-- Update config + refresh the carousel
        Na__PmDev__RenderEditorPanel();                                      // <-- Rebuild rows in the new order
        await Na__PmDev__SaveToFlask(ordered);                               // <-- Auto-persist, matching every other row action
    }
    // ------------------------------------------------------------


    // FUNCTION | Move a Scene Up or Down by One Position
    // ------------------------------------------------------------
    async function Na__PmDev__MoveSceneByOffset(sceneId, offset) {
        const fromIndex = Na__PmDev__WorkingScenes.findIndex(s => s.PresentationMode__Scene__Id === sceneId);
        if (fromIndex === -1) return;

        const targetIndex = fromIndex + offset;
        if (targetIndex < 0 || targetIndex > Na__PmDev__WorkingScenes.length - 1) return; // <-- Already at an end

        if (!Na__PmDev__MoveSceneToIndex(sceneId, targetIndex)) return;
        await Na__PmDev__CommitReorder();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Move a Scene Within the Working Array (group-confined)
    // ------------------------------------------------------------
    // @delegate: ./Na__PresentationMode__DevMenu__SceneReorder__.js
    // ------------------------------------------------------------
    function Na__PmDev__MoveSceneToIndex(sceneId, targetIndex) {
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        return Na__PresentationMode__DevMenu__MoveSceneToIndex(Na__PmDev__WorkingScenes, config, sceneId, targetIndex);
    }
    // ------------------------------------------------------------


    // FUNCTION | Move a Scene to an Explicit 1-Based Position Within Its Group
    // ------------------------------------------------------------
    // The Position field counts from 1 inside the scene's own group, matching
    // the #N in the row header and the Order written to the project JSON, so it
    // is offset by where that group's run starts in the working array.
    // ------------------------------------------------------------
    async function Na__PmDev__MoveSceneToPosition(sceneId, position) {
        const config      = Na__PresentationMode__ProjectJson__GetActiveConfig();
        const slice       = Na__PresentationMode__DevMenu__GetGroupSliceBounds(Na__PmDev__WorkingScenes, config, sceneId);
        const groupOffset = slice ? slice.start : 0;                         // <-- Where this group's run begins
        if (!Na__PmDev__MoveSceneToIndex(sceneId, groupOffset + position - 1)) return; // <-- Convert to zero-based index
        await Na__PmDev__CommitReorder();
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drag and Drop Reordering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | May the Dragged Row Land on This Row?
    // ------------------------------------------------------------
    // Dragging is a within-group reorder; the Group dropdown is the way to
    // move a scene between groups. Without this guard the clamp in
    // MoveSceneToIndex would silently pin the row to its own group edge,
    // which reads as a broken drag rather than a refused one.
    // ------------------------------------------------------------
    function Na__PmDev__CanDropOn(dragSceneId, targetSceneId) {
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        return Na__PresentationMode__DevMenu__AreScenesInSameGroup(Na__PmDev__WorkingScenes, config, dragSceneId, targetSceneId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Reorder via Drag and Drop Between Two Scene Rows
    // ------------------------------------------------------------
    async function Na__PmDev__HandleSceneDrop(dragSceneId, targetSceneId, placeAfter) {
        if (!Na__PmDev__CanDropOn(dragSceneId, targetSceneId)) return;       // <-- Cross-group drop refused

        const finalIndex = Na__PresentationMode__DevMenu__ResolveDropIndex(
            Na__PmDev__WorkingScenes, dragSceneId, targetSceneId, placeAfter
        );
        if (finalIndex < 0) return;                                          // <-- Dropped on itself or unknown row

        if (!Na__PmDev__MoveSceneToIndex(dragSceneId, finalIndex)) return;
        await Na__PmDev__CommitReorder();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Persistence Wrappers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Save the Working Scenes to project.json (R2-First)
    // ------------------------------------------------------------
    // @delegate: ./Na__PresentationMode__DevMenu__ScenePersistence__.js
    // ------------------------------------------------------------
    function Na__PmDev__SaveToFlask(updatedScenes) {
        return Na__PresentationMode__DevMenu__SaveScenesToProject(updatedScenes, Na__PmDev__ProjectCode, Na__PmDev__ShowToast);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render and Upload One Scene's Thumbnail
    // ------------------------------------------------------------
    // @delegate: ./Na__PresentationMode__DevMenu__ScenePersistence__.js
    // ------------------------------------------------------------
    function Na__PmDev__RegenerateThumbnail(scene) {
        return Na__PresentationMode__DevMenu__RegenerateThumbnail(scene, Na__PmDev__ProjectCode, Na__PmDev__ShowToast);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Bind the Live Cross Section to a Scene (toggle-gated)
    // ------------------------------------------------------------
    // @delegate: ./Na__PresentationMode__DevMenu__ScenePersistence__.js
    // ------------------------------------------------------------
    function Na__PmDev__CaptureCrossSectionIfEnabled(scene) {
        Na__PresentationMode__DevMenu__CaptureCrossSectionIfEnabled(scene);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Row Mutations
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Record the Live Navigation Mode Onto a Scene
    // ------------------------------------------------------------
    // A view framed in fly is a fly scene, so the carousel lands the camera
    // back in fly. Orbit is the absent-key default, so only walk and fly are
    // ever stored; deleting rather than writing 'orbit' keeps one meaning for
    // "no key" and keeps older scenes and new orbit scenes identical.
    // ------------------------------------------------------------
    function Na__PmDev__CaptureLiveNavigationMode(scene) {
        const liveMode = Na__NavigationModes__GetActiveMode();
        if (Na__NavigationModes__IsFreeLookMode(liveMode)) {
            scene[Na__PresentationMode__KEY__NAVIGATION_MODE] = liveMode;
        } else {
            delete scene[Na__PresentationMode__KEY__NAVIGATION_MODE];
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Capture the Live Camera (and Cut) Into a Scene
    // ------------------------------------------------------------
    function Na__PmDev__CaptureLiveCameraIntoScene(scene) {
        if (!Na__PmDev__Camera) return false;
        const built = Na__PresentationMode__Camera__BuildSceneCameraJson(Na__PmDev__Camera, Na__PmDev__Controls);
        if (!built) return false;

        scene.PresentationMode__Scene__CameraPosition         = { ...built.cameraPosition };
        scene.PresentationMode__Scene__OrbitHelperCubePosition = { ...built.orbitHelperCubePosition };

        Na__PmDev__CaptureLiveNavigationMode(scene);                         // <-- Walk or fly travels with the camera it framed
        Na__PmDev__CaptureCrossSectionIfEnabled(scene);                      // <-- Bind the live section state (toggle-gated, default OFF)
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle One Row Action (the single mutation tail)
    // ------------------------------------------------------------
    // Every action ends the same way - renumber, commit, write to R2,
    // rebuild - so that tail lives in exactly one place. Only the mutation
    // itself differs.
    // ------------------------------------------------------------
    async function Na__PmDev__HandleRowMutation(action, targetScene) {
        if (action === 'delete') {
            const ok = await Na__AppUtils__ConfirmDialog__Show({
                title        : 'Delete Scene?',
                message      : `Delete scene "${targetScene.PresentationMode__Scene__Name}"?`,
                confirmLabel : 'Delete',
                isDestructive: true
            });
            if (!ok) return;
            Na__PmDev__WorkingScenes = Na__PmDev__WorkingScenes.filter(
                s => s.PresentationMode__Scene__Id !== targetScene.PresentationMode__Scene__Id
            );                                                               // <-- Normalise below closes the gap it leaves
        } else if (action === 'update') {
            if (!Na__PmDev__CaptureLiveCameraIntoScene(targetScene)) return;
        } else if (action === 'thumb') {
            await Na__PmDev__RegenerateThumbnail(targetScene);               // <-- Render + upload WebP, sets ThumbnailUrl
        } else if (action === 'save-one') {
            Na__PmDev__CaptureCrossSectionIfEnabled(targetScene);            // <-- Persist live section geometry + style
        } else if (action !== 'regroup') {
            return;                                                          // <-- Unknown action, do nothing
        }

        Na__PmDev__NormaliseSceneOrder(Na__PmDev__WorkingScenes);            // <-- Renumber 1..N inside each affected group
        Na__PmDev__CommitWorkingScenes(Na__PmDev__WorkingScenes);            // <-- Refresh carousel + selector bar
        await Na__PmDev__SaveToFlask(Na__PmDev__WorkingScenes);
        Na__PmDev__RenderEditorPanel();                                      // <-- Rows may have moved between group blocks
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Editor Panel Render
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Collapsible Group Heading for the Scene List
    // ------------------------------------------------------------
    // The heading is the fold control for its group. Groups start folded, so
    // the panel opens as a short list of group names rather than every scene on
    // the project expanded at once.
    // ------------------------------------------------------------
    function Na__PmDev__BuildGroupHeading(groupName, sceneCount, isOpen) {
        const heading = document.createElement('button');
        heading.type      = 'button';
        heading.className = 'na-pm-dev__group-heading';
        heading.setAttribute('aria-expanded', String(isOpen));

        const arrow = document.createElement('span');
        arrow.className = 'na-pm-dev__group-heading-arrow';
        arrow.innerHTML = '&#9662;';                                          // <-- Rotates via CSS on aria-expanded
        arrow.setAttribute('aria-hidden', 'true');
        heading.appendChild(arrow);

        const nameEl = document.createElement('span');
        nameEl.className   = 'na-pm-dev__group-heading-name';
        nameEl.textContent = groupName;
        heading.appendChild(nameEl);

        const countEl = document.createElement('span');
        countEl.className   = 'na-pm-dev__group-heading-count';
        countEl.textContent = Na__PresentationMode__SceneGroups__FormatViewCount(sceneCount);
        heading.appendChild(countEl);

        return heading;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Scene Rows, Clustered Under Their Group Headings
    // ------------------------------------------------------------
    // The displayed #N is the scene's position WITHIN its group, matching the
    // per-group Order that is written to the project JSON and the position the
    // carousel shows. Reorder arrows disable at each group's own edges, since
    // reordering never crosses a group boundary.
    //
    // An ungrouped project falls through to one flat, unheaded list numbered
    // 1..N, exactly as the panel looked before this feature existed.
    // ------------------------------------------------------------
    function Na__PmDev__RenderSceneRowsGroupedByGroup(panel) {
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        const groups = Na__PresentationMode__SceneGroups__IsEnabled()
            ? Na__PresentationMode__SceneGroups__GetEnabledGroups(config)
            : [];

        const handlers = {
            camera           : Na__PmDev__Camera,
            showToast        : Na__PmDev__ShowToast,                         // <-- A drawing card's rename saves and confirms on the spot
            onMoveByOffset   : Na__PmDev__MoveSceneByOffset,
            onMoveToPosition : Na__PmDev__MoveSceneToPosition,
            onMutate         : Na__PmDev__HandleRowMutation
        };

        const appendRow = (container, scene, indexInGroup, countInGroup) => {
            const row = Na__PresentationMode__DevMenu__BuildSceneRow(scene, indexInGroup, countInGroup, handlers);
            Na__PresentationMode__DevMenu__AttachSceneRowDragHandlers(row, {
                canDropOn : Na__PmDev__CanDropOn,                            // <-- Same group only
                onDrop    : Na__PmDev__HandleSceneDrop                       // <-- Reorder, renumber, save, rebuild
            });
            container.appendChild(row);
        };

        // UNGROUPED PROJECT | One flat list, legacy behaviour
        if (groups.length === 0) {
            const rowCount = Na__PmDev__WorkingScenes.length;
            Na__PmDev__WorkingScenes.forEach((scene, index) => appendRow(panel, scene, index, rowCount));
            return;
        }

        // GROUPED PROJECT | A fold-down heading, then that group's own run of rows
        groups.forEach((group) => {
            const groupId = group.PresentationMode__Group__Id;
            const inGroup = Na__PmDev__WorkingScenes.filter(scene =>
                Na__PresentationMode__SceneGroups__ResolveSceneGroupId(scene, config) === groupId
            );

            const isOpen  = Na__PmDev__OpenGroupIds.has(groupId);            // <-- Folded unless the author opened it
            const heading = Na__PmDev__BuildGroupHeading(
                group.PresentationMode__Group__Name || groupId,
                inGroup.length,
                isOpen
            );

            const body = document.createElement('div');
            body.className = 'na-pm-dev__group-scenes';
            body.classList.toggle('is-open', isOpen);

            heading.addEventListener('click', () => {
                const willOpen = !body.classList.contains('is-open');
                body.classList.toggle('is-open', willOpen);
                heading.setAttribute('aria-expanded', String(willOpen));
                if (willOpen) {
                    Na__PmDev__OpenGroupIds.add(groupId);                    // <-- Survives the rebuild after a reorder or save
                } else {
                    Na__PmDev__OpenGroupIds.delete(groupId);
                }
            });

            panel.appendChild(heading);
            inGroup.forEach((scene, index) => appendRow(body, scene, index, inGroup.length));
            panel.appendChild(body);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Cross Section Capture Toggle Row
    // ------------------------------------------------------------
    // Default OFF every session; while ON, Update Camera / Add Scene / Save
    // Scene / Save All bind the live cross-section state (geometry + style)
    // to that scene for R2 / web playback.
    // ------------------------------------------------------------
    function Na__PmDev__BuildCaptureToggleRow() {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:8px 0 4px 0;'
            + 'font-family:"Open Sans",sans-serif;font-size:0.75rem;color:#172b3a;cursor:pointer;';

        const check = document.createElement('input');
        check.type      = 'checkbox';
        check.className = 'na-pm-dev__checkbox';
        check.checked   = Na__SectSceneData__IsCaptureEnabled();
        check.addEventListener('change', () => {
            Na__SectSceneData__SetCaptureEnabled(check.checked);
        });

        const text = document.createElement('span');
        text.textContent = 'Capture Cross Sections On Scene Update';
        text.title       = 'While ticked, Update Camera / Add Scene / Save Scene / Save All also save the current cross-section planes and style against that scene.';

        row.appendChild(check);
        row.appendChild(text);
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Global Action Buttons Row
    // ------------------------------------------------------------
    function Na__PmDev__BuildGlobalActions() {
        const globalActions = document.createElement('div');
        globalActions.className = 'na-pm-dev__global-actions';

        // ADD NEW SCENE
        const addBtn = document.createElement('button');
        addBtn.type        = 'button';
        addBtn.className   = 'na-pm-dev__btn na-pm-dev__btn--primary';
        addBtn.textContent = '+ Add Scene From Camera';
        addBtn.addEventListener('click', () => Na__PmDev__AddSceneFromCamera());
        globalActions.appendChild(addBtn);

        // SAVE ALL
        const saveAllBtn = document.createElement('button');
        saveAllBtn.type        = 'button';
        saveAllBtn.className   = 'na-pm-dev__btn';
        saveAllBtn.textContent = 'Save All To Project';
        saveAllBtn.addEventListener('click', async () => {
            // CAPTURE ACTIVE SCENE | Style + geometry for the carousel selection
            const activeId    = Na__PresentationMode__ProjectJson__GetActiveSceneId();
            const activeScene = activeId
                ? Na__PmDev__WorkingScenes.find(s => s.PresentationMode__Scene__Id === activeId)
                : null;
            Na__PmDev__CaptureCrossSectionIfEnabled(activeScene);

            Na__PmDev__NormaliseSceneOrder(Na__PmDev__WorkingScenes);        // <-- Explicit group ids + clean 1..N per group
            Na__PmDev__CommitWorkingScenes(Na__PmDev__WorkingScenes);        // <-- Include all in-row edits + refresh UI
            await Na__PmDev__SaveToFlask(Na__PmDev__WorkingScenes);
        });
        globalActions.appendChild(saveAllBtn);

        // EXPORT JSON
        const exportBtn = document.createElement('button');
        exportBtn.type        = 'button';
        exportBtn.className   = 'na-pm-dev__btn';
        exportBtn.textContent = 'Export JSON';
        exportBtn.addEventListener('click', () => Na__PmDev__ExportJson());
        globalActions.appendChild(exportBtn);

        // CLEAR ALL
        const clearBtn = document.createElement('button');
        clearBtn.type        = 'button';
        clearBtn.className   = 'na-pm-dev__btn na-pm-dev__btn--danger';
        clearBtn.textContent = 'Clear All Scenes';
        clearBtn.addEventListener('click', () => Na__PmDev__ClearAllScenes());
        globalActions.appendChild(clearBtn);

        return globalActions;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rebuild the Entire Scene Editor Panel
    // ------------------------------------------------------------
    function Na__PmDev__RenderEditorPanel() {
        const panel = document.getElementById(Na__PmDev__PANEL_ID);
        if (!panel) return;

        panel.innerHTML = '';                                                // <-- Clear and rebuild

        // SCENE GROUPS SECTION | Collapsible, at the very top of this panel
        // ------------------------------------------------------------
        // The group editor owns everything inside this container. It mutates
        // the shared live config and raises its changed event, which this
        // module answers with the one normalise -> commit -> save path.
        // @delegate: ./Na__PresentationMode__DevMenu__GroupEditor__.js
        // ------------------------------------------------------------
        const groupContainer = document.createElement('div');
        groupContainer.className = 'na-pm-dev__group-container';
        panel.appendChild(groupContainer);
        Na__PresentationMode__DevMenu__RenderGroupEditor(groupContainer, Na__PmDev__ShowToast);

        // SORT ONCE INTO THE WORKING ARRAY so array index == displayed position.
        // Every reorder operation works on array position, so the array and
        // the panel must agree before any row is built. The sort is
        // group-aware, so a group's scenes always form one unbroken run.
        Na__PmDev__WorkingScenes = Na__PmDev__SortScenesByOrder(Na__PmDev__GetWorkingScenes());
        Na__PmDev__NormaliseSceneOrder(Na__PmDev__WorkingScenes);            // <-- Collapse to a clean 1..N inside each group

        if (Na__PmDev__WorkingScenes.length === 0) {
            const empty = document.createElement('p');
            empty.className   = 'na-pm-dev__empty';
            empty.textContent = 'No scenes defined. Add a scene below.';
            panel.appendChild(empty);
        } else {
            Na__PmDev__RenderSceneRowsGroupedByGroup(panel);
        }

        panel.appendChild(Na__PmDev__BuildCaptureToggleRow());
        panel.appendChild(Na__PmDev__BuildGlobalActions());
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Mutations
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Generate Next Unique Scene Id
    // ------------------------------------------------------------
    function Na__PmDev__GetNextSceneId(existingScenes) {
        const usedIds = new Set(existingScenes.map(s => s.PresentationMode__Scene__Id));
        let n = existingScenes.length + 1;
        let candidate = `Scene_${String(n).padStart(3, '0')}`;
        while (usedIds.has(candidate)) {                                    // <-- Avoid collisions after deletes
            n++;
            candidate = `Scene_${String(n).padStart(3, '0')}`;
        }
        return candidate;
    }
    // ------------------------------------------------------------


    // FUNCTION | Add a New Scene From the Current Camera Position
    // ------------------------------------------------------------
    // Builds the scene from the live camera, files it into the group the
    // carousel is currently showing, renders + uploads the WebP thumbnail,
    // commits to the in-memory config (which refreshes the carousel and
    // layout), and auto-saves the project.json.
    // ------------------------------------------------------------
    async function Na__PmDev__AddSceneFromCamera() {
        if (!Na__PmDev__Camera) return;

        // A DRAWING IS NOT A CAMERA. Capturing here would file the perspective
        // camera's pose as an ordinary 3D scene sitting in the drawing's group;
        // a drawing card is created from the drawing's own panel instead.
        if (Na__DrawView__IsActive()) {
            Na__PmDev__ShowToast && Na__PmDev__ShowToast('Leave the drawing before adding a scene from the camera. A drawing card is created from its own panel.', true);
            return;
        }

        const existing = Na__PmDev__WorkingScenes;                          // <-- Shared array (preserves in-row edits)
        const sceneId  = Na__PmDev__GetNextSceneId(existing);               // <-- Auto Scene_001, Scene_002 ...
        const nextNum  = existing.length + 1;

        const built = Na__PresentationMode__Camera__BuildSceneCameraJson(Na__PmDev__Camera, Na__PmDev__Controls);
        if (!built) return;

        const currentFov = parseFloat(Na__PmDev__Camera.fov.toFixed(4));
        const lensMm     = Math.round(Na__PresentationMode__DevMenu__FovToFocalMm(currentFov));

        const newScene = {
            PresentationMode__Scene__Id                          : sceneId,
            PresentationMode__Scene__Name                        : `Scene ${nextNum}`,
            PresentationMode__Scene__ThumbnailUrl                : `PresentationMode/Thumbnails/${sceneId}.webp`,
            PresentationMode__Scene__LensMm                      : lensMm,
            PresentationMode__Scene__TransitionTimeToNextSceneMs : Na__PresentationMode__DevMenu__TRANSITION_DEFAULT_MS,
            PresentationMode__Scene__TransitionEasing            : 'easeInOutCubic',
            PresentationMode__Scene__CameraPosition              : built.cameraPosition,
            PresentationMode__Scene__OrbitHelperCubePosition     : built.orbitHelperCubePosition
        };

        Na__PmDev__CaptureLiveNavigationMode(newScene);                     // <-- Added while flying: a fly scene

        // GROUP | A new scene joins the group the carousel is currently showing
        // ------------------------------------------------------------
        // You frame a kitchen view while browsing Interior 3D Views and that is
        // where it lands, rather than dropping into Exterior and needing to be
        // moved. Falls back to the first enabled group when nothing is active.
        // ------------------------------------------------------------
        const Na__ActiveConfig  = Na__PresentationMode__ProjectJson__GetActiveConfig();
        const Na__NewSceneGroup = Na__PresentationMode__SceneGroups__GetActiveGroupId()
            || Na__PresentationMode__SceneGroups__GetFallbackGroupId(Na__ActiveConfig);
        if (Na__NewSceneGroup) newScene.PresentationMode__Scene__GroupId = Na__NewSceneGroup;

        // CROSS SECTION CAPTURE | Bind the live section state to the new scene (toggle-gated, default OFF)
        Na__PmDev__CaptureCrossSectionIfEnabled(newScene);

        // RENDER + UPLOAD THUMBNAIL FIRST so the carousel card has an image
        await Na__PmDev__RegenerateThumbnail(newScene);                     // <-- Sets ThumbnailUrl on success

        Na__PmDev__WorkingScenes = [...existing, newScene];                 // <-- Append to shared array
        Na__PmDev__NormaliseSceneOrder(Na__PmDev__WorkingScenes);           // <-- Give it a correct 1..N slot inside ITS group
        Na__PmDev__CommitWorkingScenes(Na__PmDev__WorkingScenes);           // <-- Updates config + live UI refresh

        const saved = await Na__PmDev__SaveToFlask(Na__PmDev__WorkingScenes); // <-- Auto-persist to project.json
        Na__PmDev__RenderEditorPanel();                                     // <-- Rebuild panel to show new row

        if (saved) {
            Na__PmDev__ShowToast && Na__PmDev__ShowToast(`Scene "${newScene.PresentationMode__Scene__Name}" added and saved to ${Na__PmDev__ProjectCode}.`);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Export PresentationMode JSON Block as Download
    // ------------------------------------------------------------
    function Na__PmDev__ExportJson() {
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        if (!config) return;

        const jsonStr = JSON.stringify({ PresentationMode__SavedCameraScenes: config }, null, 4);
        const blob    = new Blob([jsonStr], { type: 'application/json' });
        const a       = document.createElement('a');
        a.href        = URL.createObjectURL(blob);
        a.download    = `PresentationMode__SavedCameraScenes__${Na__PmDev__ProjectCode || 'export'}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear All Presentation Scenes with Confirmation
    // ------------------------------------------------------------
    async function Na__PmDev__ClearAllScenes() {
        const ok = await Na__AppUtils__ConfirmDialog__Show({
            title        : 'Clear All Scenes?',
            message      : 'This will delete all Presentation Mode scenes from this project.',
            confirmLabel : 'Clear All',
            isDestructive: true
        });
        if (!ok) return;

        Na__PmDev__WorkingScenes = [];                                       // <-- Empty the shared array
        Na__PmDev__CommitWorkingScenes(Na__PmDev__WorkingScenes);
        await Na__PmDev__SaveToFlask(Na__PmDev__WorkingScenes);
        Na__PmDev__RenderEditorPanel();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Localhost-Only Presentation Mode Scene Editor
    // ------------------------------------------------------------
    function Na__PresentationMode__DevMenu__InitializeSceneEditor(camera, controls, showToast) {
        if (!Na__AppUtils__IsRunningOnLocalhost()) return;                   // <-- Production guard: never shown hosted

        Na__PmDev__Camera      = camera;
        Na__PmDev__Controls    = controls;
        Na__PmDev__ShowToast   = showToast;
        Na__PmDev__ProjectCode = Na__AppUtils__GetProjectCodeFromUrl();

        const menuItem  = document.getElementById(Na__PmDev__ITEM_ID);       // <-- Dev menu wrapper li
        const toggleBtn = document.getElementById(Na__PmDev__TOGGLE_ID);     // <-- Open/close button
        const panel     = document.getElementById(Na__PmDev__PANEL_ID);      // <-- Content container

        if (!menuItem || !toggleBtn || !panel) return;

        menuItem.style.display = '';                                         // <-- Reveal the dev section

        toggleBtn.addEventListener('click', () => {
            const isOpen = panel.classList.contains('is-open');
            panel.classList.toggle('is-open', !isOpen);
            toggleBtn.setAttribute('aria-expanded', String(!isOpen));

            if (!isOpen) {
                Na__PmDev__ProjectCode = Na__AppUtils__GetProjectCodeFromUrl();
                Na__PmDev__RenderEditorPanel();                              // <-- Rebuild on each open so data is fresh
            }
        });

        // RE-RENDER WHEN SCENES LOAD (project switch during same session)
        window.addEventListener('na-presentation-mode-scenes-loaded', (event) => {
            const detail = event.detail || {};
            if (detail.projectCode) Na__PmDev__ProjectCode = detail.projectCode;
            if (panel.classList.contains('is-open')) {
                Na__PmDev__RenderEditorPanel();                              // <-- Refresh if panel already open
            }
        });

        // PERSIST WHEN THE GROUP EDITOR CHANGES SOMETHING
        // ------------------------------------------------------------
        // The group editor mutates the shared live config and raises this
        // event rather than saving for itself. Groups and scenes live in the
        // same project JSON block, so routing both through this one path keeps
        // a single implementation of normalise -> commit -> write to R2 and
        // guarantees a group edit and a scene edit can never disagree about
        // what was written.
        // @delegate: ./Na__PresentationMode__DevMenu__GroupEditor__.js
        // ------------------------------------------------------------
        window.addEventListener(Na__PresentationMode__DevMenu__GROUPS_CHANGED_EVENT, async () => {
            Na__PmDev__WorkingScenes = Na__PmDev__SortScenesByOrder(Na__PmDev__GetWorkingScenes()); // <-- Re-read: groups may have moved scenes
            Na__PmDev__NormaliseSceneOrder(Na__PmDev__WorkingScenes);        // <-- Renumber inside each group
            Na__PmDev__CommitWorkingScenes(Na__PmDev__WorkingScenes);        // <-- Refresh carousel + selector bar
            await Na__PmDev__SaveToFlask(Na__PmDev__WorkingScenes);          // <-- Groups ride along inside the same config object
            Na__PmDev__RenderEditorPanel();                                  // <-- Rebuild rows under their new headings
        });

        console.log('[ValeVision3D] Presentation Mode Dev Editor initialized.');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Dev Menu Scene Editor API
    // ------------------------------------------------------------
    export {
        Na__PresentationMode__DevMenu__InitializeSceneEditor
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
