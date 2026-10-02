// =============================================================================
// VALEVISION3D - DRAWING VIEW CORE - RENAME DRAWING
// =============================================================================
//
// FILE       : Na__DrawView__RenameDrawing__.js
// NAMESPACE  : Na__DrawRename
// MODULE     : Drawing View Core - Rename Drawing
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Rename a drawing everywhere its name is held, in one saved, confirmed step
// CREATED    : 10-Sep-2026
//
// DESCRIPTION:
// - A drawing's name is not held in one place. The drawing record owns it,
//   its carousel scene card carries a copy, the cross section binding for a
//   section drawing is KEYED by it, and the Layout Editor's 3D snapshot
//   fingerprint includes it. Writing only the record, which is what the name
//   field used to do, left four copies disagreeing and no save behind any
//   of them.
//
// - ONE OPERATION, NOT FOUR. Rename goes through this module from every
//   surface that offers it: the Floor Plans and Elevations panels, and the
//   Presentation Scenes editor renaming a drawing's card. Each writes the
//   record and the scene, re-keys the section binding, re-stamps the sheet
//   viewports, saves the whole document once, and confirms.
//
// - ATOMIC. If the save fails, every in-memory change is put back before the
//   error is reported. A half applied rename is exactly how the record and
//   the card came to disagree in the first place: the drawings block and the
//   presentation block are written by different panels, so a rename that
//   lived only in memory could be picked up by one panel's save and lost by
//   the other's.
//
// - THE SNAPSHOT IS NOT RE-RENDERED. A rename changes no pixels, so the
//   stored R2 picture is still correct. Only the fingerprint that guards it
//   is re-stamped, which keeps the asset, its path and the web build's view
//   of it intact. See Na__LeVp3d__RestampForScene.
//
// - THE STAMPER LOADS ON DEMAND. The Layout Editor is off the start-up path,
//   so the re-stamp is reached through its loader. Renaming a scene that a
//   sheet viewport holds a baked snapshot of loads the editor quietly first,
//   before anything is written; any other rename loads nothing.
//
// INTEGRATION:
// - Na__FloorPlan__DevMenu__Editor__ and Na__Elevation__DevMenu__Editor__
//   pass their name field's requested value straight here.
// - Na__PresentationMode__DevMenu__SceneRowBuilders__ routes a drawing
//   card's name field here so the record follows the card.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : none. TrueVision renames the record only; the divergence this module
//                   closes is specific to ValeVision's separate drawings block (D08) and
//                   the Layout Editor's snapshot assets (D36).
// - Ported on     : 10-Sep-2026 for ValeVision3D v2.21.5
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : candidate once TrueVision carries sheet viewports.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Sep-2026 - Version 1.0.0
// - Initial implementation: one rename path, saved and confirmed.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Drawings Block, Its Save and the Scene Link Checks
    // ------------------------------------------------------------
    // @delegate: ./Na__DrawView__ProjectData__.js
    // ------------------------------------------------------------
    import {
        Na__DrawData__Save,
        Na__DrawData__IsFloorPlanScene,
        Na__DrawData__IsElevationScene,
        Na__DrawData__SCENE_PLAN_ID_KEY,
        Na__DrawData__SCENE_ELEVATION_ID_KEY
    } from './Na__DrawView__ProjectData__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Live Scene Config and Its Carousel Broadcast
    // ------------------------------------------------------------
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__ProjectJson__GetActiveConfig,
        Na__PresentationMode__ProjectJson__BroadcastScenesChanged
    } from '../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Two Kinds of Drawing Record
    // ------------------------------------------------------------
    // @delegate: ../43__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js
    // @delegate: ../46__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js
    // ------------------------------------------------------------
    import {
        Na__FpData__GetPlanById,
        Na__FpData__FindSceneForPlan
    } from '../43__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js';
    import {
        Na__ElevData__GetElevationById,
        Na__ElevData__FindSceneFor
    } from '../46__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Name-Keyed Section Binding and the Sheet Viewports
    // ------------------------------------------------------------
    // @delegate: ../41__System__CrossSectionView/Na__CrossSectionView__SceneData.js
    // @delegate: ../51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js
    // ------------------------------------------------------------
    // The re-stamp comes through the Layout Editor's loader, never straight
    // from Viewport3d: importing Viewport3d here put the whole editor on the
    // start-up path.
    // ------------------------------------------------------------
    import { Na__SectSceneData__RenameSceneKey } from '../41__System__CrossSectionView/Na__CrossSectionView__SceneData.js';
    import { Na__LeLoad__PrepareRestamp, Na__LeLoad__RestampForScene } from '../51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Field Names
    // ------------------------------------------------------------
    const Na__DrawRename__PLAN_NAME  = 'FloorPlan__Name';
    const Na__DrawRename__ELEV_NAME  = 'Elevation__Name';
    const Na__DrawRename__SCENE_ID   = 'PresentationMode__Scene__Id';
    const Na__DrawRename__SCENE_NAME = 'PresentationMode__Scene__Name';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Messages
    // ------------------------------------------------------------
    const Na__DrawRename__MSG_EMPTY = 'A drawing needs a name.';
    const Na__DrawRename__MSG_BUSY  = 'A rename is still saving. Try again in a moment.';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | One Rename at a Time
    // ------------------------------------------------------------
    // Every rename writes the whole project document, so two in flight would
    // race: the second fetches the live file before the first has written it,
    // then saves the older name back over the newer one.
    // ------------------------------------------------------------
    let Na__DrawRename__Busy = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Confirmation Wording
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Join a List Into Readable English
    // ------------------------------------------------------------
    function Na__DrawRename__JoinParts(parts) {
        if (parts.length === 1) return parts[0];
        return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What the Rename Actually Touched
    // ------------------------------------------------------------
    // Naming each piece is the point: the author can see that the rename
    // reached the places a rename used to miss, without opening the file.
    // ------------------------------------------------------------
    function Na__DrawRename__Confirmation(nextName, hasScene, restamped, movedBinding) {
        const parts = [];
        if (hasScene)      parts.push('its scene card');
        if (restamped > 0) parts.push(restamped + ' sheet viewport' + (restamped === 1 ? '' : 's'));
        if (movedBinding)  parts.push('its section binding');

        if (parts.length === 0) return 'Renamed to "' + nextName + '" and saved to R2.';
        return 'Renamed to "' + nextName + '", saved to R2 with ' + Na__DrawRename__JoinParts(parts) + '.';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Rename Itself
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Put Every In-Memory Change Back
    // ------------------------------------------------------------
    // Re-stamping is recomputed rather than remembered: the fingerprint is a
    // function of the scene the viewport can see, so restoring the name and
    // running it again lands on exactly the keys that were there before.
    // ------------------------------------------------------------
    function Na__DrawRename__Revert(state) {
        state.record[state.nameKey] = state.beforeRecordName;
        if (state.scene) state.scene[Na__DrawRename__SCENE_NAME] = state.beforeSceneName;
        if (state.movedBinding) Na__SectSceneData__RenameSceneKey(state.nextName, state.beforeSceneName, state.sceneId);
        if (state.restamped)    Na__LeLoad__RestampForScene(state.sceneId);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply One Rename Across Every Holder of the Name
    // ------------------------------------------------------------
    // target: { record, nameKey, scene }, where scene is null for a drawing
    // that has no carousel card yet.
    // Returns true when the new name is on R2.
    // ------------------------------------------------------------
    async function Na__DrawRename__Apply(target, requestedName, showToast) {
        const toast    = (typeof showToast === 'function') ? showToast : () => {};
        const nextName = String(requestedName === null || requestedName === undefined ? '' : requestedName).trim();

        if (nextName.length === 0) { toast(Na__DrawRename__MSG_EMPTY, true); return false; }
        if (Na__DrawRename__Busy)  { toast(Na__DrawRename__MSG_BUSY,  true); return false; }

        const state = {
            record            : target.record,
            nameKey           : target.nameKey,
            scene             : target.scene || null,
            sceneId           : target.scene ? target.scene[Na__DrawRename__SCENE_ID] : null,
            nextName          : nextName,
            beforeRecordName  : target.record[target.nameKey],
            beforeSceneName   : target.scene ? target.scene[Na__DrawRename__SCENE_NAME] : null,
            movedBinding      : false,
            restamped         : 0
        };

        // ALREADY THERE | Only when EVERY holder reads the requested name. A
        // drawing whose card has drifted out of step is renamed to the name it
        // appears to have already, on purpose: that is how the pair is put back
        // together, so a match on the record alone must not short this out.
        if (state.beforeRecordName === nextName && (!state.scene || state.beforeSceneName === nextName)) return true;

        Na__DrawRename__Busy = true;

        try {
            // THE SHEET VIEWPORTS' STAMPER | The Layout Editor loads on first use,
            // and only it can re-stamp a baked 3D snapshot. It is fetched BEFORE
            // anything below is written, so the rename stays one uninterrupted
            // step. A project with no baked snapshot of this scene loads nothing.
            if (state.sceneId) await Na__LeLoad__PrepareRestamp(state.sceneId);

            state.record[state.nameKey] = nextName;
            if (state.scene) state.scene[Na__DrawRename__SCENE_NAME] = nextName;

            // ORDER MATTERS | The section binding is filed under the name the
            // scene HAD, so it is moved with the old name in hand. The sheet
            // viewports are fingerprinted from the name the scene has NOW, so
            // they are re-stamped after the write above.
            if (state.scene)   state.movedBinding = Na__SectSceneData__RenameSceneKey(state.beforeSceneName, nextName, state.sceneId);
            if (state.sceneId) state.restamped    = Na__LeLoad__RestampForScene(state.sceneId);

            // ONE DOCUMENT | Na__DrawData__Save writes the drawings block, the
            // presentation block and the section bindings together, so the
            // record and its card cannot land in different saves. Only errors
            // are relayed from it: the confirmation below is the success line.
            const relayErrors = (message, isError) => { if (isError) toast(message, true); };
            const saved = await Na__DrawData__Save(relayErrors);

            if (!saved) {
                Na__DrawRename__Revert(state);                                   // <-- Nothing reached R2, so nothing stays changed here
                toast('Rename failed. "' + state.beforeRecordName + '" is unchanged.', true);
                return false;
            }

            Na__PresentationMode__ProjectJson__BroadcastScenesChanged();         // <-- The carousel card carries the name
            toast(Na__DrawRename__Confirmation(nextName, !!state.scene, state.restamped, state.movedBinding), false);
            return true;

        } catch (error) {
            console.error('[ValeVision3D] Drawing rename error:', error);
            Na__DrawRename__Revert(state);
            toast('Rename failed: ' + error.message + '. "' + state.beforeRecordName + '" is unchanged.', true);
            return false;

        } finally {
            Na__DrawRename__Busy = false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Rename a Floor Plan
    // ------------------------------------------------------------
    function Na__DrawRename__RenameFloorPlan(plan, nextName, showToast) {
        if (!plan) return Promise.resolve(false);
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        return Na__DrawRename__Apply({
            record  : plan,
            nameKey : Na__DrawRename__PLAN_NAME,
            scene   : config ? Na__FpData__FindSceneForPlan(config, plan) : null
        }, nextName, showToast);
    }
    // ------------------------------------------------------------


    // FUNCTION | Rename an Elevation or Section
    // ------------------------------------------------------------
    function Na__DrawRename__RenameElevation(elevation, nextName, showToast) {
        if (!elevation) return Promise.resolve(false);
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        return Na__DrawRename__Apply({
            record  : elevation,
            nameKey : Na__DrawRename__ELEV_NAME,
            scene   : config ? Na__ElevData__FindSceneFor(config, elevation) : null
        }, nextName, showToast);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Drawing Record Behind a Scene Card, or Null
    // ------------------------------------------------------------
    // Null for an ordinary 3D card, and also for a drawing card whose record
    // has gone: either way the Scenes editor renames the card by itself.
    // ------------------------------------------------------------
    function Na__DrawRename__FindRecordForScene(scene) {
        if (!scene) return null;

        if (Na__DrawData__IsFloorPlanScene(scene)) {
            const plan = Na__FpData__GetPlanById(null, scene[Na__DrawData__SCENE_PLAN_ID_KEY]);
            if (plan) return { record : plan, nameKey : Na__DrawRename__PLAN_NAME, scene : scene };
        }

        if (Na__DrawData__IsElevationScene(scene)) {
            const elevation = Na__ElevData__GetElevationById(null, scene[Na__DrawData__SCENE_ELEVATION_ID_KEY]);
            if (elevation) return { record : elevation, nameKey : Na__DrawRename__ELEV_NAME, scene : scene };
        }

        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Does a Drawing Record Own This Card's Name?
    // ------------------------------------------------------------
    function Na__DrawRename__OwnsScene(scene) {
        return Na__DrawRename__FindRecordForScene(scene) !== null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rename a Drawing From Its Scene Card
    // ------------------------------------------------------------
    // The reverse direction. Without it the Scenes editor writes the card's
    // name and saves the presentation block on its own, leaving the drawing
    // record on the old name inside a block that save never touches.
    // ------------------------------------------------------------
    function Na__DrawRename__RenameSceneCard(scene, nextName, showToast) {
        const target = Na__DrawRename__FindRecordForScene(scene);
        if (!target) return Promise.resolve(false);
        return Na__DrawRename__Apply(target, nextName, showToast);
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Rename Still Writing?
    // ------------------------------------------------------------
    function Na__DrawRename__IsBusy() { return Na__DrawRename__Busy; }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Drawing Rename API
    // ------------------------------------------------------------
    export {
        Na__DrawRename__RenameFloorPlan,
        Na__DrawRename__RenameElevation,
        Na__DrawRename__RenameSceneCard,
        Na__DrawRename__FindRecordForScene,
        Na__DrawRename__OwnsScene,
        Na__DrawRename__IsBusy
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
