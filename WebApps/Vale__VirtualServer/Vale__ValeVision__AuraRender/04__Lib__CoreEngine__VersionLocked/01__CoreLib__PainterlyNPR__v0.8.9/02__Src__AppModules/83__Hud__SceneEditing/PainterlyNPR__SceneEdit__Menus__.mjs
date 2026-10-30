/* =============================================================================
   PAINTERLYNPR - HUD | SCENE EDITING - MENUS AND KEYS
   =============================================================================

   FILE       : PainterlyNPR__SceneEdit__Menus__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - SceneEditing - Menus
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What the right-click menu offers over each thing - a placed
                asset, one of the cottage's objects, the sky, the drawer's cards
                and lists - and the selection's keys
   CREATED    : 30-Oct-2026 (v0.7.0)

   DESCRIPTION:
   - The menu itself is 80's ContextMenu; this module is its provider. A right
     click on the sheet selects what it lands on (only while the asset library
     is out, v0.8.8: folded away it offers the sky's menu, the library first),
     then offers what can be done to it: for a plop, move, turn, size, grow again, copy, swap, its
     materials and taking it out; for an object, its material or one face's;
     over the sky, the selection, the brush and the library.
   - Keys, ignored while typing: Delete and Backspace take the selected plop
     out, Escape lets the selection go (after the brush and a placement have
     had it), Ctrl + D copies the plop. Undo and redo are 84's keys; the sheet's
     menus offer them too, named for what they would take back.

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import {
    PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY   as  MATERIAL_BY_KEY,
    PainterlyNPR__MaterialClasses__MATERIAL_CLASSES  as  MATERIAL_CLASSES,
} from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import {
    PainterlyNPR__AssetLibrary__LoadCatalogue,
    PainterlyNPR__AssetLibrary__Catalogue  as  Catalogue,
} from '../16__Scene__AssetLibrary/PainterlyNPR__AssetLibrary__Catalogue__.mjs';
import { PainterlyNPR__MaterialAssignment__Assignable } from '../17__Scene__MaterialAssignment/PainterlyNPR__MaterialAssignment__Apply__.mjs';
import {
    PainterlyNPR__MaterialAssignment__LoadLibrary,
    PainterlyNPR__MaterialAssignment__MaterialLibrary  as  MaterialLibrary,
} from '../17__Scene__MaterialAssignment/PainterlyNPR__MaterialAssignment__Library__.mjs';
import {
    PainterlyNPR__ContextMenu__IsOpen,
    PainterlyNPR__ContextMenu__Register,
    PainterlyNPR__ContextMenu__Wire,
} from '../80__System__HudOverlay/PainterlyNPR__Interface__ContextMenu__.mjs';
import { PainterlyNPR__Interface__Ui as Ui } from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__Interface__SetAssetDrawer } from '../82__Hud__AssetCatalogue/PainterlyNPR__Interface__AssetDrawer__.mjs';
import { PainterlyNPR__AssetDrop__Arm } from '../82__Hud__AssetCatalogue/PainterlyNPR__Interface__AssetDrop__.mjs';
import {
    PainterlyNPR__Interface__MaterialBrush,
    PainterlyNPR__Interface__SetMaterialBrush,
} from '../82__Hud__AssetCatalogue/PainterlyNPR__Interface__MaterialTab__.mjs';
import {
    PainterlyNPR__SceneEdit__AssetOf,
    PainterlyNPR__SceneEdit__ClearMaterials,
    PainterlyNPR__SceneEdit__DuplicatePlop,
    PainterlyNPR__SceneEdit__DuplicateSelected,
    PainterlyNPR__SceneEdit__Editing,
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
    PainterlyNPR__SceneEdit__TurnPlop,
    PainterlyNPR__SceneEdit__WatchLibrary,
    PainterlyNPR__SceneEdit__ACTIONS  as  ACTIONS,
} from './PainterlyNPR__SceneEdit__Actions__.mjs';
import {
    PainterlyNPR__UndoHistory__Label,
    PainterlyNPR__UndoHistory__Redo,
    PainterlyNPR__UndoHistory__Undo,
} from '../84__System__UndoHistory/PainterlyNPR__Interface__UndoHistory__.mjs';
import {
    PainterlyNPR__SceneEdit__PickAt,
    PainterlyNPR__SceneEdit__Select,
    PainterlyNPR__SceneEdit__Selected,
    PainterlyNPR__SceneEdit__SelectPick,
    PainterlyNPR__SceneEdit__SelectPlop,
    PainterlyNPR__SceneEdit__ShowHover,
    PainterlyNPR__SceneEdit__TargetOf,
} from './PainterlyNPR__SceneEdit__Selection__.mjs';

// =============================================================================
// REGION | Scene Editing - Menus and Keys
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | The Menus' Parts
// -----------------------------------------------------------------------------

    // FUNCTION | Every Material as Items - under the library's groups once it is read
    // ------------------------------------------------------------
    // current: the class it has now (marked), or null. give(key) gives one.
    function PainterlyNPR__SceneEdit__MaterialItems(current, give) {
        if (!MaterialLibrary.Loaded) PainterlyNPR__MaterialAssignment__LoadLibrary();   // <-- Grouped from the next menu on
        const item   =  (m) => ({ Label: m.Label, Swatch: m.Pigment, Hint: m.Key === current ? 'now' : '', Action: () => give(m.Key) });
        if (!MaterialLibrary.Loaded) return MATERIAL_CLASSES.filter(c => PainterlyNPR__MaterialAssignment__Assignable(c.Key)).map(item);
        const items  =  [];
        for (const group of MaterialLibrary.Groups) {
            const list  =  MaterialLibrary.Materials.filter(m => m.Group === group.Code);
            if (!list.length) continue;
            items.push({ Heading: group.Label });
            items.push(...list.map(item));
        }
        return items;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Class in Words, and the Brush in the Class a Pixel Is Drawn In
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__ClassLabel(id) {
        const cls  =  MATERIAL_CLASSES[id];
        return cls ? cls.Label.toLowerCase() : 'no class';
    }

    function PainterlyNPR__SceneEdit__SampleItem(pick) {
        const cls  =  MATERIAL_CLASSES[pick.Class];
        if (!cls || !PainterlyNPR__MaterialAssignment__Assignable(cls.Key)) return null;
        return { Label: `Paint with ${cls.Label.toLowerCase()}`, Swatch: cls.Pigment, Title: 'Take up the brush in the class this spot is drawn in, and click to give it elsewhere', Action: () => PainterlyNPR__Interface__SetMaterialBrush(cls.Key) };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Plop's Items - and, from the sheet, its part and face under the pointer
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__PlopItems(uid, pick) {
        const placement  =  PainterlyNPR__SceneEdit__Plop(uid);
        if (!placement) return [];
        if (!Catalogue.Loaded) PainterlyNPR__AssetLibrary__LoadCatalogue();  // <-- A drawing loaded before the drawer was ever opened: the swaps are there from the next menu on
        const asset   =  PainterlyNPR__SceneEdit__AssetOf(placement);
        const swaps   =  PainterlyNPR__SceneEdit__SwapCandidates(uid);
        const turn    =  ACTIONS.TurnDeg;
        const step    =  Math.round((ACTIONS.ScaleStep - 1) * 100);
        const grows   =  !asset || !!(asset.Placement && asset.Placement.NewShapeEachPlop);
        const items   =  [
            { Label: 'Move', Title: 'Then click the sheet where it should stand', Action: () => PainterlyNPR__SceneEdit__MovePlop(uid) },
            { Label: 'Turn anticlockwise', Hint: `${turn}°`, Action: () => PainterlyNPR__SceneEdit__TurnPlop(uid, turn) },
            { Label: 'Turn clockwise', Hint: `${turn}°`, Action: () => PainterlyNPR__SceneEdit__TurnPlop(uid, -turn) },
            { Label: 'Bigger', Hint: `+${step}%`, Action: () => PainterlyNPR__SceneEdit__SizePlop(uid, ACTIONS.ScaleStep) },
            { Label: 'Smaller', Hint: `-${step}%`, Action: () => PainterlyNPR__SceneEdit__SizePlop(uid, 1 / ACTIONS.ScaleStep) },
            { Label: 'Grow a new shape', Disabled: !grows, Title: grows ? 'The same plant, grown again from a new seed' : 'A made piece keeps its one shape', Action: () => PainterlyNPR__SceneEdit__ReshapePlop(uid) },
            { Label: 'Copy beside it', Hint: 'Ctrl+D', Action: () => PainterlyNPR__SceneEdit__DuplicatePlop(uid) },
            { Label: 'Swap for', Disabled: !swaps.length, Submenu: swaps.length ? swaps.map(a => ({ Label: a.Identity.DisplayName, Hint: a.AssetId.slice(4), Action: () => PainterlyNPR__SceneEdit__SwapPlop(uid, a.AssetId) })) : null },
            { Separator: true },
        ];
        if (pick) {
            items.push({ Label: 'Give this part', Title: `The part under the pointer, now ${PainterlyNPR__SceneEdit__ClassLabel(pick.Object.MaterialId)}`, Submenu: PainterlyNPR__SceneEdit__MaterialItems(MATERIAL_CLASSES[pick.Object.MaterialId].Key, (key) => PainterlyNPR__SceneEdit__GiveTo({ Object: pick.Key, Face: null }, key, `Gave part of ${placement.Name} (${uid}) ${MATERIAL_BY_KEY[key].Label.toLowerCase()}`)) });
            const face  =  pick.Organic ? null : PainterlyNPR__SceneEdit__TargetOf(pick, 'Face');
            if (face && face.Face !== null) items.push({ Label: 'Give this face', Submenu: PainterlyNPR__SceneEdit__MaterialItems(MATERIAL_CLASSES[pick.Class] ? MATERIAL_CLASSES[pick.Class].Key : null, (key) => PainterlyNPR__SceneEdit__GiveTo(face, key, `Gave one face of ${placement.Name} (${uid}) ${MATERIAL_BY_KEY[key].Label.toLowerCase()}`)) });
        }
        items.push({ Label: 'Give all of it', Submenu: PainterlyNPR__SceneEdit__MaterialItems(null, (key) => PainterlyNPR__SceneEdit__GiveToPlop(uid, key)) });
        items.push({ Label: 'Take its materials off', Disabled: !PainterlyNPR__SceneEdit__HasMaterials({ Uid: uid }), Action: () => PainterlyNPR__SceneEdit__ClearMaterials({ Uid: uid }, `Took the materials off ${placement.Name} (${uid})`) });
        if (pick) items.push(PainterlyNPR__SceneEdit__SampleItem(pick));
        items.push(...PainterlyNPR__SceneEdit__HistoryItems());
        items.push({ Separator: true });
        items.push({ Label: 'Take it out of the drawing', Hint: 'Delete', Danger: true, Action: () => PainterlyNPR__SceneEdit__RemovePlop(uid) });
        return items;
    }
    // ------------------------------------------------------------


    // FUNCTION | One of the Cottage's Objects - its material, or one face's
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__ObjectItems(pick) {
        const object  =  pick.Object;
        const face    =  pick.Organic ? null : PainterlyNPR__SceneEdit__TargetOf(pick, 'Face');
        const onFace  =  !!(face && face.Face !== null);
        const own     =  onFace && PainterlyNPR__SceneEdit__HasMaterials({ Object: pick.Key, Face: face.Face });
        const pixel   =  MATERIAL_CLASSES[pick.Class] ? MATERIAL_CLASSES[pick.Class].Key : null;
        return [
            { Label: 'Give this object', Submenu: PainterlyNPR__SceneEdit__MaterialItems(MATERIAL_CLASSES[object.MaterialId].Key, (key) => PainterlyNPR__SceneEdit__GiveTo({ Object: pick.Key, Face: null }, key, `Gave ${object.Name} ${MATERIAL_BY_KEY[key].Label.toLowerCase()}`)) },
            { Label: 'Give this face', Disabled: !onFace, Title: onFace ? 'The one face under the pointer, as SketchUp paints' : 'A plant is all one face: give the object', Submenu: onFace ? PainterlyNPR__SceneEdit__MaterialItems(pixel, (key) => PainterlyNPR__SceneEdit__GiveTo(face, key, `Gave one face of ${object.Name} ${MATERIAL_BY_KEY[key].Label.toLowerCase()}`)) : null },
            own ? { Label: "Take this face's material off", Action: () => PainterlyNPR__SceneEdit__ClearMaterials({ Object: pick.Key, Face: face.Face }, `Took the material off one face of ${object.Name}`) } : null,
            { Label: 'Take its materials off', Disabled: !PainterlyNPR__SceneEdit__HasMaterials({ Object: pick.Key }), Title: 'Back to the class the cottage gave it', Action: () => PainterlyNPR__SceneEdit__ClearMaterials({ Object: pick.Key }, `Took the materials off ${object.Name}`) },
            PainterlyNPR__SceneEdit__SampleItem(pick),
            ...PainterlyNPR__SceneEdit__HistoryItems(),
        ];
    }
    // ------------------------------------------------------------


    // FUNCTION | Undo and Redo - named for what they would take back (84's history)
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__HistoryItems() {
        const name  =  (label) => label.charAt(0).toLowerCase() + label.slice(1);
        const undo  =  PainterlyNPR__UndoHistory__Label('Undo');
        const redo  =  PainterlyNPR__UndoHistory__Label('Redo');
        return [
            { Separator: true },
            { Label: undo ? `Undo ${name(undo)}` : 'Undo', Hint: 'Ctrl+Z', Disabled: !undo, Action: () => PainterlyNPR__UndoHistory__Undo() },
            { Label: redo ? `Redo ${name(redo)}` : 'Redo', Hint: 'Ctrl+Y', Disabled: !redo, Action: () => PainterlyNPR__UndoHistory__Redo() },
        ];
    }
    // ------------------------------------------------------------


    // FUNCTION | Over the Sky - the selection, the brush, the library
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__SkyItems() {
        const open   =  !!(Ui.Root && Ui.Root.classList.contains('PainterlyNPR--assetsOpen'));
        const brush  =  PainterlyNPR__Interface__MaterialBrush();
        return [
            { Label: 'Let the selection go', Hint: 'Esc', Disabled: !PainterlyNPR__SceneEdit__Selected(), Action: () => PainterlyNPR__SceneEdit__Select(null) },
            { Label: 'Put the brush down', Hint: 'Esc', Disabled: !brush, Action: () => PainterlyNPR__Interface__SetMaterialBrush(null) },
            { Separator: true },
            { Label: open ? 'Fold the asset library away' : 'Open the asset library', Action: () => PainterlyNPR__Interface__SetAssetDrawer(!open) },
            ...PainterlyNPR__SceneEdit__HistoryItems(),
        ];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Provider - what was right-clicked, and its menu
// -----------------------------------------------------------------------------

    // FUNCTION | Answer for a Right Click - { Title, Items } or null (no menu)
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__Provide(e, x, y) {
        const t  =  e.target;
        if (!t || !t.closest) return null;

        const given  =  t.closest('[data-assignment-uid]');
        if (given) {
            const uid  =  given.dataset.assignmentUid;
            const a    =  State.Materials.find(m => m.Uid === uid);
            if (!a) return null;
            return { Title: `${MATERIAL_BY_KEY[a.Material] ? MATERIAL_BY_KEY[a.Material].Label : a.Material} · ${uid}`, Items: [
                { Label: 'Select what it was given to', Action: () => PainterlyNPR__SceneEdit__SelectAssignment(uid) },
                { Label: 'Take it off', Danger: true, Action: () => PainterlyNPR__SceneEdit__RemoveAssignment(uid) },
            ] };
        }

        const placed  =  t.closest('[data-assets-placed] [data-uid]');
        if (placed) {
            const placement  =  PainterlyNPR__SceneEdit__Plop(placed.dataset.uid);
            if (!placement) return null;
            PainterlyNPR__SceneEdit__SelectPlop(placement.Uid);
            return { Title: `${placement.Name} · ${placement.Uid}`, Items: PainterlyNPR__SceneEdit__PlopItems(placement.Uid, null) };
        }

        const swatch  =  t.closest('[data-material-key]');
        if (swatch) {
            const key        =  swatch.dataset.materialKey;
            const brush      =  PainterlyNPR__Interface__MaterialBrush();
            const selection  =  PainterlyNPR__SceneEdit__Selected();
            const holding    =  !!(brush && brush.Key === key);
            return { Title: MATERIAL_BY_KEY[key].Label, Items: [
                { Label: holding ? 'Put the brush down' : 'Paint with it', Hint: holding ? 'Esc' : '', Action: () => PainterlyNPR__Interface__SetMaterialBrush(holding ? null : key) },
                { Label: 'Give it to the selection', Disabled: !selection, Title: selection ? '' : 'Click something on the sheet first', Action: () => PainterlyNPR__SceneEdit__GiveToSelection(key) },
            ] };
        }

        const card  =  t.closest('[data-asset-id]');
        if (card) {
            const asset      =  Catalogue.ById.get(card.dataset.assetId);
            if (!asset) return null;
            const selection  =  PainterlyNPR__SceneEdit__Selected();
            const plop       =  selection && selection.Kind === 'Plop' ? selection.Uid : null;
            return { Title: `${asset.Identity.DisplayName} · ${asset.AssetId}`, Items: [
                { Label: 'Place it', Title: 'Then click the sheet where it should stand', Action: () => PainterlyNPR__AssetDrop__Arm({ AssetId: asset.AssetId }) },
                { Label: plop ? `Swap ${plop} for it` : 'Swap the selection for it', Disabled: !plop, Title: plop ? '' : 'Select a placed asset first', Action: () => PainterlyNPR__SceneEdit__SwapPlop(plop, asset.AssetId) },
            ] };
        }

        if (!t.closest('#PainterlyNPR__App__Sheet') || t.closest('.PainterlyNPR__Handle, .PainterlyNPR__PointNode, button, select')) return null;
        if (!PainterlyNPR__SceneEdit__Editing()) return { Title: 'The drawing: open the asset library to select', Items: PainterlyNPR__SceneEdit__SkyItems() };   // <-- Nothing selected while it is folded away (v0.8.8)
        const pick  =  PainterlyNPR__SceneEdit__PickAt(x, y);
        if (!pick) return { Title: 'The drawing', Items: [{ Label: 'Still drawing: right-click again once it has settled', Disabled: true }] };
        if (pick.Sky) return { Title: 'The sky: paper', Items: PainterlyNPR__SceneEdit__SkyItems() };
        PainterlyNPR__SceneEdit__SelectPick(pick, true);                       // <-- A right click selects what it lands on, as a left click does
        if (pick.Uid) {
            const placement  =  PainterlyNPR__SceneEdit__Plop(pick.Uid);
            return { Title: `${placement ? placement.Name : pick.Object.Name} · ${pick.Uid}`, Items: PainterlyNPR__SceneEdit__PlopItems(pick.Uid, pick) };
        }
        return { Title: `${pick.Object.Name} · ${PainterlyNPR__SceneEdit__ClassLabel(pick.Class)}`, Items: PainterlyNPR__SceneEdit__ObjectItems(pick) };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Wiring - the menu, and the selection's keys
// -----------------------------------------------------------------------------

    // FUNCTION | Wire the Scene Editing - once, at boot, after the drawer is built
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__Wire() {
        PainterlyNPR__ContextMenu__Wire();
        PainterlyNPR__ContextMenu__Register(PainterlyNPR__SceneEdit__Provide);
        PainterlyNPR__SceneEdit__WatchLibrary();                                 // <-- Folding the library away lets the selection and the brush go (v0.8.8)

        // With the brush up, what a click would give it to is outlined under the pointer
        const sheet  =  document.querySelector('#PainterlyNPR__App__Sheet');
        let outlined  =  false;
        if (sheet) sheet.addEventListener('pointermove', (e) => {
            const brush  =  PainterlyNPR__Interface__MaterialBrush();
            if (!brush || e.buttons) { if (outlined) { PainterlyNPR__SceneEdit__ShowHover(null); outlined = false; } return; }   // <-- A drag is an orbit or a pan: no outline while it lasts
            PainterlyNPR__SceneEdit__ShowHover({ X: e.clientX, Y: e.clientY, Mode: e.shiftKey ? (brush.Mode === 'Face' ? 'Object' : 'Face') : brush.Mode });
            outlined  =  true;
        });
        if (sheet) sheet.addEventListener('pointerleave', () => { if (outlined) { PainterlyNPR__SceneEdit__ShowHover(null); outlined = false; } });

        window.addEventListener('keydown', (e) => {
            const active  =  document.activeElement;
            if (e.defaultPrevented || PainterlyNPR__ContextMenu__IsOpen() || (active && (/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) || active.isContentEditable))) return;
            const plain  =  !e.ctrlKey && !e.metaKey && !e.altKey;
            if ((e.key === 'Delete' || e.key === 'Backspace') && plain) { if (PainterlyNPR__SceneEdit__RemoveSelected()) e.preventDefault(); return; }
            if (e.key === 'Escape' && PainterlyNPR__SceneEdit__Selected()) { PainterlyNPR__SceneEdit__Select(null); return; }
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'd' || e.key === 'D')) {
                if (PainterlyNPR__SceneEdit__DuplicateSelected()) e.preventDefault();   // <-- Only with a plop selected: otherwise the browser's own Ctrl + D
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__SceneEdit__Provide,
        PainterlyNPR__SceneEdit__Wire,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
