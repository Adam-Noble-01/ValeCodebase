/* =============================================================================
   PAINTERLYNPR - HUD | SCENE EDITING - ACTIONS
   =============================================================================

   FILE       : PainterlyNPR__SceneEdit__Actions__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - SceneEditing - Actions
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What can be done to what is on the sheet: a placed asset taken
                out, copied, turned, sized, grown again, swapped or moved; a
                material given to an object, a face or a whole plop, or taken off;
                and what a click on the sheet does
   CREATED    : 30-Oct-2026 (v0.7.0)

   DESCRIPTION:
   - Adam, 30-Oct-2026: "add the ability to be able to remove assets so the
     insert system is beautiful but create a select and context menu for delete
     / swap etc and other options".
   - Every action changes only the drawing's data (State.Assets, State.Materials)
     and asks the drawer to rebuild (82, AssetsChanged): so the settings object
     holds the result, and 84__System__UndoHistory can take it back.
   - A plop's materials are keyed by its Uid: taking it out or swapping it takes
     them off too (a later plop may reuse the Uid); a copy takes copies of them.
   - A click on the sheet selects what it lands on; with a material's brush
     taken up (82's MaterialTab) it gives the brush's class instead.
   - ONLY WHILE THE ASSET LIBRARY IS OUT (v0.8.8, Adam: "make it so as you can
     only select items when the assets menu is open, i keep annopyingly
     selecting and highliting things so i need to way to gate it"): with the
     drawer folded a click on the sheet selects and paints nothing, and folding
     it lets the selection go, puts the brush down and cancels a placement
     (WatchLibrary). Editing() is the gate, for a wrapper too.
   - MOVE (v0.8.10) is the Move Tool's (PainterlyNPR__SceneEdit__MoveTool__):
     carried over the ground, lifted with Shift, set down with a click.

   ============================================================================= */

import EditConfig from './Na__SceneEditing__Config.json' with { type: 'json' };
import AssetConfig from '../16__Scene__AssetLibrary/Na__AssetLibrary__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Maths__Clamp as Clamp } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__DeriveSeed,
    PainterlyNPR__SeededRandom__MintSeed,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY as MATERIAL_BY_KEY } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import { PainterlyNPR__AssetLibrary__Catalogue as Catalogue } from '../16__Scene__AssetLibrary/PainterlyNPR__AssetLibrary__Catalogue__.mjs';
import {
    PainterlyNPR__AssetLibrary__MakePlacement,
    PainterlyNPR__AssetLibrary__NextUid,
    PainterlyNPR__AssetLibrary__LIBRARY  as  ASSET_LIBRARY,
} from '../16__Scene__AssetLibrary/PainterlyNPR__AssetLibrary__Placement__.mjs';
import { PainterlyNPR__MaterialAssignment__Assignable } from '../17__Scene__MaterialAssignment/PainterlyNPR__MaterialAssignment__Apply__.mjs';
import { PainterlyNPR__MaterialAssignment__ResolveObject } from '../17__Scene__MaterialAssignment/PainterlyNPR__MaterialAssignment__Faces__.mjs';
import {
    PainterlyNPR__MaterialAssignment__Clear,
    PainterlyNPR__MaterialAssignment__Give,
    PainterlyNPR__MaterialAssignment__LIBRARY  as  MATERIAL_LIBRARY,
} from '../17__Scene__MaterialAssignment/PainterlyNPR__MaterialAssignment__Library__.mjs';
import { PainterlyNPR__CameraRig__Camera as Camera } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';
import {
    PainterlyNPR__Interface__Status,
    PainterlyNPR__Interface__Ui  as  Ui,
} from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__Interface__AssetsChanged } from '../82__Hud__AssetCatalogue/PainterlyNPR__Interface__AssetDrawer__.mjs';
import { PainterlyNPR__AssetDrop__Clear } from '../82__Hud__AssetCatalogue/PainterlyNPR__Interface__AssetDrop__.mjs';
import {
    PainterlyNPR__Interface__MaterialBrush,
    PainterlyNPR__Interface__SetMaterialBrush,
} from '../82__Hud__AssetCatalogue/PainterlyNPR__Interface__MaterialTab__.mjs';
import {
    PainterlyNPR__SceneEdit__Editing,
    PainterlyNPR__SceneEdit__PickAt,
    PainterlyNPR__SceneEdit__Select,
    PainterlyNPR__SceneEdit__Selected,
    PainterlyNPR__SceneEdit__SelectPick,
    PainterlyNPR__SceneEdit__ShowHover,
    PainterlyNPR__SceneEdit__TargetOf,
} from './PainterlyNPR__SceneEdit__Selection__.mjs';
import { PainterlyNPR__MoveTool__Start, PainterlyNPR__MoveTool__Stop } from './PainterlyNPR__SceneEdit__MoveTool__.mjs';

// =============================================================================
// REGION | Scene Editing - Actions
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Configs - Na__SceneEditing__Config.json, and the library's size limits
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const ACTIONS    =  PainterlyNPR__ConfigAccess__Section(EditConfig, 'PainterlyNPR__SceneEditing__Config', 'Actions', ['TurnDeg', 'ScaleStep', 'DuplicateGapM', 'SwapMax']);
    const PLACEMENT  =  PainterlyNPR__ConfigAccess__Section(AssetConfig, 'PainterlyNPR__AssetLibrary__Config', 'Placement', ['ScaleClamp']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plops - taken out, copied, turned, sized, grown again, swapped, moved
// -----------------------------------------------------------------------------

    // FUNCTION | A Plop by Its Uid, and the Library Asset It Was Made From
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__Plop(uid) {
        return State.Assets.find(p => p.Uid === uid) || null;
    }

    function PainterlyNPR__SceneEdit__AssetOf(placement) {
        return placement ? Catalogue.ById.get(placement.AssetId) || null : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Take a Plop Out of the Drawing - and every material given to it
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__RemovePlop(uid) {
        const index  =  State.Assets.findIndex(p => p.Uid === uid);
        if (index < 0) return;
        const placement  =  State.Assets[index];
        State.Assets.splice(index, 1);
        State.Materials  =  PainterlyNPR__MaterialAssignment__Clear(State.Materials, { Uid: uid });   // <-- A later plop may be given this Uid again: nothing of this one's may follow it
        PainterlyNPR__Interface__AssetsChanged(`Took ${placement.Name} (${uid}) out of the drawing`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Copy a Plop - beside it, to the right as the camera sees it
    // ------------------------------------------------------------
    // A plant grows its own shape (its asset's NewShapeEachPlop), furniture is
    // the same piece; its turn, size and materials come with it.
    function PainterlyNPR__SceneEdit__DuplicatePlop(uid) {
        const placement  =  PainterlyNPR__SceneEdit__Plop(uid);
        if (!placement) return;
        if (State.Assets.length >= ASSET_LIBRARY.MaxPlaced) { PainterlyNPR__Interface__Status(`A drawing holds ${ASSET_LIBRARY.MaxPlaced} placed assets at most.`); return; }
        const asset  =  PainterlyNPR__SceneEdit__AssetOf(placement);
        const copy   =  structuredClone(placement);
        copy.Uid     =  PainterlyNPR__AssetLibrary__NextUid(State.Assets);
        if (!asset || (asset.Placement && asset.Placement.NewShapeEachPlop)) copy.Seed = PainterlyNPR__SeededRandom__DeriveSeed(PainterlyNPR__SeededRandom__MintSeed() >>> 0, 'shape');
        const f       =  (Camera && Camera.Forward) || [0, 0, -1];
        const length  =  Math.hypot(f[0], f[2]) || 1;
        const right   =  [-f[2] / length, f[0] / length];                    // <-- Forward across up, flat on the ground
        const spread  =  ((asset && asset.Geometry && asset.Geometry.NominalSpreadM) || 1) * (placement.Scale || 1);
        const step    =  spread + ACTIONS.DuplicateGapM;
        const mm      =  (v) => Math.round(v * 1000) / 1000;
        copy.Position  =  [mm(placement.Position[0] + right[0] * step), placement.Position[1], mm(placement.Position[2] + right[1] * step)];
        State.Assets.push(copy);
        let list  =  State.Materials;
        for (const a of State.Materials.filter(m => m.Object.split('.')[0] === uid)) {
            list  =  PainterlyNPR__MaterialAssignment__Give(list, { Object: `${copy.Uid}.${a.Object.split('.')[1]}`, Face: a.Target === 'Face' ? a.Face : null }, a.Material).List;
        }
        State.Materials  =  list;
        PainterlyNPR__Interface__AssetsChanged(`Copied ${placement.Name} (${uid}) as ${copy.Uid}`);
        PainterlyNPR__SceneEdit__Select({ Kind: 'Plop', Uid: copy.Uid }, true);
    }
    // ------------------------------------------------------------


    // FUNCTION | Turn a Plop About Its Foot - degrees, anticlockwise seen from above
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__TurnPlop(uid, degrees) {
        const placement  =  PainterlyNPR__SceneEdit__Plop(uid);
        if (!placement) return;
        placement.RotationDeg  =  Math.round((((placement.RotationDeg + degrees) % 360) + 360) % 360 * 10) / 10;
        PainterlyNPR__Interface__AssetsChanged(`Turned ${placement.Name} (${uid}) to ${placement.RotationDeg} degrees`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Make a Plop Bigger or Smaller - within the library's limits
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__SizePlop(uid, factor) {
        const placement  =  PainterlyNPR__SceneEdit__Plop(uid);
        if (!placement) return;
        const scale  =  Math.round(Clamp((placement.Scale || 1) * factor, PLACEMENT.ScaleClamp[0], PLACEMENT.ScaleClamp[1]) * 1000) / 1000;
        if (scale === placement.Scale) { PainterlyNPR__Interface__Status(`${placement.Name} (${uid}) is as ${factor > 1 ? 'big' : 'small'} as a plop can be (${placement.Scale}).`); return; }
        placement.Scale  =  scale;
        PainterlyNPR__Interface__AssetsChanged(`Sized ${placement.Name} (${uid}) to ${Math.round(scale * 100)}%`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Grow a Plop Again - the same plant from a new seed
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__ReshapePlop(uid) {
        const placement  =  PainterlyNPR__SceneEdit__Plop(uid);
        if (!placement) return;
        placement.Seed  =  PainterlyNPR__SeededRandom__DeriveSeed(PainterlyNPR__SeededRandom__MintSeed() >>> 0, 'shape');
        PainterlyNPR__Interface__AssetsChanged(`Grew ${placement.Name} (${uid}) a new shape`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Swap a Plop for Another Asset - on the same spot, under the same Uid
    // ------------------------------------------------------------
    // Made as if placed there fresh (the new asset's own turn and size rules);
    // the old one's materials go, its parts being another asset's now.
    function PainterlyNPR__SceneEdit__SwapPlop(uid, assetId) {
        const index  =  State.Assets.findIndex(p => p.Uid === uid);
        const asset  =  Catalogue.ById.get(assetId);
        if (index < 0 || !asset) return;
        const old    =  State.Assets[index];
        const fresh  =  PainterlyNPR__AssetLibrary__MakePlacement(asset, old.Position, PainterlyNPR__SeededRandom__MintSeed(), uid, Camera && Camera.Eye);
        fresh.Position  =  old.Position.slice();
        State.Assets[index]  =  fresh;
        State.Materials  =  PainterlyNPR__MaterialAssignment__Clear(State.Materials, { Uid: uid });
        PainterlyNPR__Interface__AssetsChanged(`Swapped ${old.Name} (${uid}) for ${asset.Identity.DisplayName}`);
    }

    // What a plop might be swapped for: its own type first, then its collection
    function PainterlyNPR__SceneEdit__SwapCandidates(uid) {
        const asset  =  PainterlyNPR__SceneEdit__AssetOf(PainterlyNPR__SceneEdit__Plop(uid));
        if (!asset) return [];
        const others  =  Catalogue.Assets.filter(a => a.AssetId !== asset.AssetId && a.Identity.Collection === asset.Identity.Collection);
        const same    =  others.filter(a => a.Identity.Type === asset.Identity.Type);
        return same.concat(others.filter(a => a.Identity.Type !== asset.Identity.Type)).slice(0, ACTIONS.SwapMax);
    }
    // ------------------------------------------------------------


    // FUNCTION | Move a Plop - the Move Tool, as M starts it (v0.8.10)
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__MovePlop(uid) {
        if (PainterlyNPR__SceneEdit__Plop(uid)) PainterlyNPR__MoveTool__Start(uid);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Materials - given and taken off
// -----------------------------------------------------------------------------

    // FUNCTION | Give a Class to an Object or a Face - one assignment, one rebuild
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__GiveTo(target, key, note) {
        if (!target || !PainterlyNPR__MaterialAssignment__Assignable(key)) return false;
        const result  =  PainterlyNPR__MaterialAssignment__Give(State.Materials, target, key);
        if (!result.Made) { PainterlyNPR__Interface__Status(`A drawing holds ${MATERIAL_LIBRARY.MaxAssignments} material assignments at most.`); return false; }
        State.Materials  =  result.List;
        PainterlyNPR__Interface__AssetsChanged(note || `Gave ${target.Object} ${MATERIAL_BY_KEY[key].Label.toLowerCase()}`);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Give a Class to What Lies Under a Point of the Page
    // ------------------------------------------------------------
    // mode: 'Object' or 'Face'. Returns false off the drawing or over the sky.
    function PainterlyNPR__SceneEdit__GiveAt(clientX, clientY, key, mode) {
        const pick  =  PainterlyNPR__SceneEdit__PickAt(clientX, clientY);
        if (!pick || pick.Sky || !MATERIAL_BY_KEY[key]) return false;
        const target  =  PainterlyNPR__SceneEdit__TargetOf(pick, mode);
        const what    =  target.Face !== null ? `one face of ${pick.Object.Name}` : pick.Object.Name;
        return PainterlyNPR__SceneEdit__GiveTo(target, key, `Gave ${what} ${MATERIAL_BY_KEY[key].Label.toLowerCase()}`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Give a Class to a Whole Plop - every part of it - or to the Selection
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__GiveToPlop(uid, key) {
        const placement  =  PainterlyNPR__SceneEdit__Plop(uid);
        if (!placement || !Scene || !PainterlyNPR__MaterialAssignment__Assignable(key)) return false;
        let list  =  State.Materials;
        for (const object of Scene.Objects.filter(o => o.Uid === uid)) {
            const result  =  PainterlyNPR__MaterialAssignment__Give(list, { Object: `${uid}.${object.Part}`, Face: null }, key);
            if (!result.Made) { PainterlyNPR__Interface__Status(`A drawing holds ${MATERIAL_LIBRARY.MaxAssignments} material assignments at most.`); return false; }
            list  =  result.List;
        }
        State.Materials  =  list;
        PainterlyNPR__Interface__AssetsChanged(`Gave all of ${placement.Name} (${uid}) ${MATERIAL_BY_KEY[key].Label.toLowerCase()}`);
        return true;
    }

    function PainterlyNPR__SceneEdit__GiveToSelection(key) {
        const selection  =  PainterlyNPR__SceneEdit__Selected();
        if (!selection) { PainterlyNPR__Interface__Status('Select something first: click it on the sheet.'); return false; }
        if (selection.Kind === 'Plop') return PainterlyNPR__SceneEdit__GiveToPlop(selection.Uid, key);
        const object  =  Scene ? PainterlyNPR__MaterialAssignment__ResolveObject(Scene, selection.Key) : null;
        return object ? PainterlyNPR__SceneEdit__GiveTo({ Object: selection.Key, Face: null }, key, `Gave ${object.Name} ${MATERIAL_BY_KEY[key].Label.toLowerCase()}`) : false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Has Something Been Given a Class - an object, one face, or a plop
    // ------------------------------------------------------------
    // what: as 17's Clear takes it - { Object }, { Object, Face } or { Uid }.
    function PainterlyNPR__SceneEdit__HasMaterials(what) {
        return PainterlyNPR__MaterialAssignment__Clear(State.Materials, what).length !== State.Materials.length;
    }

    function PainterlyNPR__SceneEdit__ClearMaterials(what, note) {
        const kept  =  PainterlyNPR__MaterialAssignment__Clear(State.Materials, what);
        if (kept.length === State.Materials.length) return;
        State.Materials  =  kept;
        PainterlyNPR__Interface__AssetsChanged(note || 'Took its material off');
    }
    // ------------------------------------------------------------


    // FUNCTION | One Assignment Taken Off, Every One, or Its Object Selected
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__RemoveAssignment(uid) {
        const a  =  State.Materials.find(m => m.Uid === uid);
        if (!a) return;
        State.Materials  =  State.Materials.filter(m => m.Uid !== uid);
        PainterlyNPR__Interface__AssetsChanged(`Took ${MATERIAL_BY_KEY[a.Material] ? MATERIAL_BY_KEY[a.Material].Label.toLowerCase() : a.Material} off (${uid})`);
    }

    function PainterlyNPR__SceneEdit__ClearAllMaterials() {
        if (!State.Materials.length) return;
        const count  =  State.Materials.length;
        State.Materials  =  [];
        PainterlyNPR__Interface__AssetsChanged(`Took all ${count} materials off: every object is in its own class again`);
    }

    function PainterlyNPR__SceneEdit__SelectAssignment(uid) {
        const a       =  State.Materials.find(m => m.Uid === uid);
        const object  =  a && Scene ? PainterlyNPR__MaterialAssignment__ResolveObject(Scene, a.Object) : null;
        if (!object) { PainterlyNPR__Interface__Status(a ? `${a.Object} is no longer in the drawing: take ${uid} off.` : ''); return; }
        PainterlyNPR__SceneEdit__Select(object.Uid ? { Kind: 'Plop', Uid: object.Uid } : { Kind: 'Object', Key: a.Object });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Sheet's Click, and the Selection's Keys
// -----------------------------------------------------------------------------

    // FUNCTION | Folding the Library Away Ends the Editing - once, at boot (a wrapper calls it too)
    // ------------------------------------------------------------
    // Watches the root's classes: when the drawer folds, a move is cancelled,
    // the selection goes, the brush is put down and a placement is cancelled,
    // so nothing stays lit. (Editing(), the gate, is Selection's since v0.8.10.)
    function PainterlyNPR__SceneEdit__WatchLibrary() {
        if (!Ui.Root || Ui.Root.dataset.painterlyWatchLibrary || typeof MutationObserver !== 'function') return;
        Ui.Root.dataset.painterlyWatchLibrary  =  '1';                         // <-- Once a root, however often it is asked
        let open  =  PainterlyNPR__SceneEdit__Editing();
        new MutationObserver(() => {
            const now  =  PainterlyNPR__SceneEdit__Editing();
            if (now === open) return;
            open  =  now;
            if (now) return;
            PainterlyNPR__MoveTool__Stop();
            PainterlyNPR__AssetDrop__Clear();
            if (PainterlyNPR__Interface__MaterialBrush()) PainterlyNPR__Interface__SetMaterialBrush(null);
            PainterlyNPR__SceneEdit__ShowHover(null);
            if (PainterlyNPR__SceneEdit__Selected()) PainterlyNPR__SceneEdit__Select(null);
        }).observe(Ui.Root, { attributes: true, attributeFilter: ['class'] });
    }
    // ------------------------------------------------------------


    // FUNCTION | A Click on the Sheet - paint with the brush, or select
    // ------------------------------------------------------------
    // From the navigation's OnTap (74): a press that never became a drag. Shift
    // flips the brush between object and face for this click. Nothing at all
    // while the asset library is folded away (v0.8.8).
    function PainterlyNPR__SceneEdit__Tap(e) {
        if (!PainterlyNPR__SceneEdit__Editing()) return;
        const brush  =  PainterlyNPR__Interface__MaterialBrush();
        if (brush) {
            const mode  =  e && e.shiftKey ? (brush.Mode === 'Face' ? 'Object' : 'Face') : brush.Mode;
            if (!PainterlyNPR__SceneEdit__GiveAt(e.clientX, e.clientY, brush.Key, mode)) PainterlyNPR__Interface__Status('Nothing there to paint: the sky is the paper. Esc puts the brush down.');
            return;
        }
        const pick  =  PainterlyNPR__SceneEdit__PickAt(e.clientX, e.clientY);
        if (!pick) return;
        if (pick.Sky && !PainterlyNPR__SceneEdit__Selected()) return;         // <-- A click on the sky with nothing selected says nothing
        PainterlyNPR__SceneEdit__SelectPick(pick);
    }
    // ------------------------------------------------------------


    // FUNCTION | Take Out or Copy the Selection - Delete and Ctrl + D
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__RemoveSelected() {
        const selection  =  PainterlyNPR__SceneEdit__Selected();
        if (!selection) return false;
        if (selection.Kind === 'Plop') { PainterlyNPR__SceneEdit__RemovePlop(selection.Uid); return true; }
        PainterlyNPR__Interface__Status("The cottage's own objects stay: only placed assets can be taken out. Right-click it to change its material.");
        return true;
    }

    function PainterlyNPR__SceneEdit__DuplicateSelected() {
        const selection  =  PainterlyNPR__SceneEdit__Selected();
        if (!selection || selection.Kind !== 'Plop') return false;
        PainterlyNPR__SceneEdit__DuplicatePlop(selection.Uid);
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__SceneEdit__AssetOf,
        PainterlyNPR__SceneEdit__ClearAllMaterials,
        PainterlyNPR__SceneEdit__ClearMaterials,
        PainterlyNPR__SceneEdit__DuplicatePlop,
        PainterlyNPR__SceneEdit__DuplicateSelected,
        PainterlyNPR__SceneEdit__Editing,
        PainterlyNPR__SceneEdit__GiveAt,
        PainterlyNPR__SceneEdit__GiveTo,
        PainterlyNPR__SceneEdit__GiveToPlop,
        PainterlyNPR__SceneEdit__GiveToSelection,
        PainterlyNPR__SceneEdit__HasMaterials,
        PainterlyNPR__SceneEdit__MovePlop,
        PainterlyNPR__SceneEdit__Plop,
        PainterlyNPR__SceneEdit__RemoveAssignment,
        PainterlyNPR__SceneEdit__RemovePlop,
        PainterlyNPR__SceneEdit__RemoveSelected,
        PainterlyNPR__SceneEdit__ReshapePlop,
        PainterlyNPR__SceneEdit__SelectAssignment,
        PainterlyNPR__SceneEdit__SizePlop,
        PainterlyNPR__SceneEdit__SwapCandidates,
        PainterlyNPR__SceneEdit__SwapPlop,
        PainterlyNPR__SceneEdit__Tap,
        PainterlyNPR__SceneEdit__TurnPlop,
        PainterlyNPR__SceneEdit__WatchLibrary,
        ACTIONS  as  PainterlyNPR__SceneEdit__ACTIONS,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
