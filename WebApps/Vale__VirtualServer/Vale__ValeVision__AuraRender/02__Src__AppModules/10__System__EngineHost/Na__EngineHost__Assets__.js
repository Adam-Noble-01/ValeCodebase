// =============================================================================
// VALEVISION AURA - ENGINE HOST - ASSETS AND MATERIALS
// =============================================================================
//
// FILE       : Na__EngineHost__Assets__.js
// NAMESPACE  : Na__EngineHost
// MODULE     : Engine Host - Assets and Materials
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : PainterlyNPR's own Assets drawer (its Objects and Materials
//              tabs) in the 3D Environment: library assets dragged into the
//              drawing, materials given to an object or one face of it, both
//              kept with the drawing set and undone with it
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - NOTHING HERE IS A COPY (Adam, 30-Oct-2026: "add the materials and assets
//   loader from npr renderer to aura / dont duplicate code the npr repo remains
//   definitive source"). The drawer, its cards, the drop, the brush, the
//   selection, the stylesheets and the two libraries' data are the pinned
//   engine's (82__Hud__AssetCatalogue, 83__Hud__SceneEditing, 16 and 17, with
//   12__Data__AssetLibrary and 07__Data__MaterialRecipes pinned beside them),
//   reached through the import map. AURA gives them their places and listens.
//   What AURA needs that the engine lacks is added to PainterlyNPR as a seam
//   and synced, never written here.
// - THE PLACES the engine's interface looks for: Ui.Root (the 3D Environment:
//   the drawer's open state, a carried card and the brush are marked on it),
//   an aside of class PainterlyNPR__AssetDrawer (the drawer builds itself into
//   it), and #PainterlyNPR__App__Sheet (the canvas's wrapper: the drop marker
//   and the selection's outline lie over the drawing in it).
// - THE FACTORY STAYS IN PAINTERLYNPR: the cards' pictures and the swatches
//   are drawn there and come with the pin, so the drawer is built without its
//   factory buttons (BuildAssetDrawer({ Factory: false }), v0.8.2).
// - SAVED AND UNDONE WITH THE DRAWING SET: placed assets and given materials
//   are two of the engine settings AURA keeps (Settings: Assets, Materials).
//   Every change the engine makes is told to the host's listeners (the drawing
//   set saves, its history takes the step, the sheets' stills redraw). Settings
//   put back (a drawing set opened, an undo) rebuild the scene through the
//   engine's own AssetsChanged, which is not told on as a new edit.
// - A CLICK on the drawing (the navigation's tap) is the engine's: with a
//   material's brush up it gives the class to what is under the pointer,
//   otherwise it selects what is there (a placed asset whole, or an object),
//   outlined over the drawing. Leaving the 3D Environment puts the brush down,
//   lets a carried card or an armed placement go, and clears the selection.
// - ONLY WHILE THE DRAWER IS OUT (AURA 0.5.1, Adam: "In both apps make it so as
//   you can only select items when the assets menu is open"): with it folded a
//   click on the drawing selects and paints nothing, and folding it does what
//   leaving the tab does. Since AURA 0.5.7 both are the engine's own seams
//   (SceneEdit__Tap's gate, SceneEdit__WatchLibrary): the host's copies are gone.
// - THE RIGHT-CLICK MENU AND THE MOVE TOOL (AURA 0.5.7, PainterlyNPR v0.8.10;
//   Adam: "Update Aura so it has the same right click context menu and options",
//   and "adding a new Move Tool you press m when an asset is selected"): the
//   engine's own scene editing (83's SceneEdit__Wire), kept by its Scope to the
//   drawing and the drawer, so the scene tabs' menu, the sheets' and the
//   browser's own are untouched; its keys (Delete, Esc, Ctrl + D, M) only on
//   the 3D Environment tab (Active); its menu's Undo and Redo are AURA's own
//   history. A pin without the Scope seam is never wired: its menu would take
//   the whole page's right click.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.2.0 (AURA 0.5.7)
// - The engine's right-click menu and its Move Tool in the 3D Environment
//   (WireSceneEditing, on PainterlyNPR v0.8.10's SceneEdit__Wire options:
//   Scope, Active, History). AssetsOpen and WatchDrawer retired for the
//   engine's own gate and SceneEdit__WatchLibrary (in the pin since v0.8.8).
//
// 30-Oct-2026 - Version 1.1.0 (AURA 0.5.1)
// - The drawing is selected and painted only while the drawer is out
//   (AssetsOpen, AssetsTap); folding it lets the selection, the brush and a
//   placement go (WatchDrawer, from AttachAssets).
//
// 30-Oct-2026 - Version 1.0.0 (AURA 0.4.0)
// - Initial build, on PainterlyNPR v0.8.2's seams: BuildAssetDrawer({ Factory:
//   false }), OnAssetsChanged, the drawer's open state on Ui.Root, and the two
//   libraries read from the engine's own files (so from the pin).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports - the Core Library (PainterlyNPR, pinned)
// -----------------------------------------------------------------------------

    import { PainterlyNPR__AppCore__State as State } from 'PainterlyNPR/01__AppCore/PainterlyNPR__AppCore__State__.mjs';
    import { PainterlyNPR__Interface__Ui as Ui } from 'PainterlyNPR/80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
    import {
        PainterlyNPR__Interface__AssetsChanged,
        PainterlyNPR__Interface__BuildAssetDrawer,
        PainterlyNPR__Interface__OnAssetsChanged
    } from 'PainterlyNPR/82__Hud__AssetCatalogue/PainterlyNPR__Interface__AssetDrawer__.mjs';
    import { PainterlyNPR__AssetDrop__Clear } from 'PainterlyNPR/82__Hud__AssetCatalogue/PainterlyNPR__Interface__AssetDrop__.mjs';
    import { PainterlyNPR__Interface__SetMaterialBrush } from 'PainterlyNPR/82__Hud__AssetCatalogue/PainterlyNPR__Interface__MaterialTab__.mjs';
    import { PainterlyNPR__SceneEdit__Select } from 'PainterlyNPR/83__Hud__SceneEditing/PainterlyNPR__SceneEdit__Selection__.mjs';
    import {
        PainterlyNPR__SceneEdit__Tap,
        PainterlyNPR__SceneEdit__WatchLibrary
    } from 'PainterlyNPR/83__Hud__SceneEditing/PainterlyNPR__SceneEdit__Actions__.mjs';
    import * as Na__Engine__ContextMenu from 'PainterlyNPR/80__System__HudOverlay/PainterlyNPR__Interface__ContextMenu__.mjs';   // <-- Through its namespace: a pin without the Scope seam still loads
    import * as Na__Engine__SceneEditMenus from 'PainterlyNPR/83__Hud__SceneEditing/PainterlyNPR__SceneEdit__Menus__.mjs';
    import { Na__AppState__Data } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__EngineHost__Notify } from './Na__EngineHost__PainterlyNpr__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__EngineHostAssets__State = {
        mounted  : false,
        applying : false,                        // <-- Settings being put back: the engine's rebuild is not a new edit
        editing  : false,                        // <-- The engine's right-click menu, keys and Move Tool are wired
        history  : null                          // <-- AURA's undo history module, for the menu's Undo and Redo
    };

    // MODULE CONSTANTS | What Is Placed in the Scene and Given to It: kept whole with the drawing set
    // ------------------------------------------------------------
    const Na__EngineHost__SCENE_KEYS = ['Assets', 'Materials'];

    // MODULE CONSTANTS | The Engine's Own Stylesheets for the Drawer, From the Engine's Root (the pin)
    // ------------------------------------------------------------
    // The tokens first: every engine stylesheet reads them. AURA's own look for
    // the engine's general classes (buttons, chips, hints) is in its
    // Na__UiFeature__Styles__ArtDirection__.css, never a copy of the engine's.
    // ------------------------------------------------------------
    const Na__EngineHost__DRAWER_STYLES = [
        '03__Style__AppStylesheets/PainterlyNPR__CoreUi__Styles__Variables__.css',
        '02__Src__AppModules/80__System__HudOverlay/PainterlyNPR__Hud__Styles__InfoBubbles__.css',
        '02__Src__AppModules/80__System__HudOverlay/PainterlyNPR__Hud__Styles__ContextMenu__.css',   // <-- The right-click menu (AURA 0.5.7)
        '02__Src__AppModules/82__Hud__AssetCatalogue/PainterlyNPR__Hud__Styles__AssetDrawer__.css',
        '02__Src__AppModules/83__Hud__SceneEditing/PainterlyNPR__Hud__Styles__SceneEditing__.css'
    ];

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mounting the Drawer
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Engine's Root (the folder holding its 02__Src__AppModules), From the Import Map
    // ------------------------------------------------------------
    function Na__EngineHost__EngineRoot() {
        return new URL('../', import.meta.resolve('PainterlyNPR/'));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Link the Engine's Drawer Stylesheets (once)
    // ------------------------------------------------------------
    function Na__EngineHost__LinkDrawerStyles() {
        if (document.querySelector('link[data-engine-styles="assets"]') || typeof import.meta.resolve !== 'function') return;
        const root = Na__EngineHost__EngineRoot();
        Na__EngineHost__DRAWER_STYLES.forEach((file) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = new URL(file, root).href;
            link.dataset.engineStyles = 'assets';
            document.head.appendChild(link);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Mount the Engine's Assets Drawer in the 3D Environment
    // ------------------------------------------------------------
    // root: the 3D Environment (the engine's Ui.Root while AURA runs it);
    // aside: the drawer's place left of the stage; sheet: the canvas's wrapper.
    // The drawer reads the libraries the first time it is pulled out.
    // ------------------------------------------------------------
    function Na__EngineHost__AttachAssets(root, aside, sheet) {
        const S = Na__EngineHostAssets__State;
        if (S.mounted || !root || !aside) return false;
        S.mounted = true;
        Na__EngineHost__LinkDrawerStyles();
        Ui.Root = root;
        if (sheet) {
            if (!sheet.id) sheet.id = 'PainterlyNPR__App__Sheet';                 // <-- The drop marker and the selection's outline go over the drawing in it
            sheet.classList.add('PainterlyNPR__Sheet');                         // <-- Its cursors while a placement is armed or the brush is up
        }
        aside.classList.add('PainterlyNPR__AssetDrawer');
        PainterlyNPR__Interface__BuildAssetDrawer({ Factory: false });
        PainterlyNPR__Interface__OnAssetsChanged(() => {
            if (!S.applying) Na__EngineHost__Notify('assets');                   // <-- The drawing set saves it, and its history takes the step
        });
        Na__EngineHost__WireSceneEditing(aside, sheet);
        PainterlyNPR__SceneEdit__WatchLibrary();                                 // <-- Folding the drawer away lets go of everything (once a root: the wiring may have asked already)
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Engine's Right-Click Menu, Keys and Move Tool, Kept to the Drawing and the Drawer
    // ------------------------------------------------------------
    // PainterlyNPR v0.8.10's SceneEdit__Wire options: Scope (the menu is the
    // engine's over the drawing and the drawer only), Active (its keys act on
    // the 3D Environment tab only) and History (its Undo and Redo are AURA's).
    // AURA's history module is fetched once everything has loaded, so the host
    // adds nothing to the order the app's modules load in.
    // ------------------------------------------------------------
    function Na__EngineHost__WireSceneEditing(aside, sheet) {
        const S = Na__EngineHostAssets__State;
        if (S.editing || typeof Na__Engine__ContextMenu.PainterlyNPR__ContextMenu__InScope !== 'function') return false;   // <-- A pin before v0.8.10: its menu would cancel the whole page's right click
        S.editing = true;
        import('../40__Feature__DrawingSet/Na__DrawingSet__History__.js').then((m) => { S.history = m; }).catch((error) => console.error('[AURA] the history for the drawing\'s menu', error));
        Na__Engine__SceneEditMenus.PainterlyNPR__SceneEdit__Wire({
            Scope   : [sheet, aside].filter(Boolean),
            Active  : () => Na__AppState__Data.tab === 'environment',
            History : {
                Label : (action) => (S.history ? S.history.Na__History__Label(action === 'Redo' ? 'redo' : 'undo') : null),
                Undo  : () => { if (S.history) S.history.Na__History__Undo(); },
                Redo  : () => { if (S.history) S.history.Na__History__Redo(); }
            }
        });
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Drawing on the Sheet
// -----------------------------------------------------------------------------

    // FUNCTION | A Click on the Drawing: the engine's own (paint with the brush, or select), only while the drawer is out
    // ------------------------------------------------------------
    function Na__EngineHost__AssetsTap(e) {
        if (!Na__EngineHostAssets__State.mounted || !e) return;
        PainterlyNPR__SceneEdit__Tap(e);                                          // <-- Its own gate: folded away, a stray click selects nothing (AURA 0.5.1)
    }
    // ------------------------------------------------------------


    // FUNCTION | The 3D Environment Is Left: the brush down, nothing carried or armed, nothing selected
    // ------------------------------------------------------------
    // So a sheet's Delete, Escape and clicks are the sheet's alone, and the
    // selection's outline is never drawn for a sheet's still.
    // ------------------------------------------------------------
    function Na__EngineHost__AssetsAway() {
        if (!Na__EngineHostAssets__State.mounted) return;
        PainterlyNPR__AssetDrop__Clear();
        PainterlyNPR__Interface__SetMaterialBrush(null);
        PainterlyNPR__SceneEdit__Select(null);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Kept With the Drawing Set
// -----------------------------------------------------------------------------

    // FUNCTION | The Placed Assets and Given Materials, as Settings Keep Them (deep copies; none left out)
    // ------------------------------------------------------------
    // Written only when there are any, as PainterlyNPR's own settings object
    // writes its Materials: a drawing with neither keeps the settings it had.
    // ------------------------------------------------------------
    function Na__EngineHost__AssetsSettings(out) {
        Na__EngineHost__SCENE_KEYS.forEach((k) => {
            if (Array.isArray(State[k]) && State[k].length) out[k] = JSON.parse(JSON.stringify(State[k]));
        });
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Put Them Back From Settings: true when the scene was rebuilt
    // ------------------------------------------------------------
    // Whole values, a missing one meaning none (a drawing set from before them,
    // or a step undone to before the first). Copies, because the engine edits
    // its own lists in place: never the drawing set's, never a history step's.
    // The rebuild is the engine's own (the scene, the drawer's lists, the
    // selection), and is not told on as an edit.
    // ------------------------------------------------------------
    function Na__EngineHost__AssetsFromSettings(settings) {
        const S = Na__EngineHostAssets__State;
        let changed = false;
        Na__EngineHost__SCENE_KEYS.forEach((k) => {
            if (!Array.isArray(State[k])) return;                               // <-- An engine without it
            const next = settings && Array.isArray(settings[k]) ? settings[k] : [];
            if (JSON.stringify(next) === JSON.stringify(State[k])) return;
            State[k] = JSON.parse(JSON.stringify(next));
            changed = true;
        });
        if (!changed) return false;
        S.applying = true;
        try { PainterlyNPR__Interface__AssetsChanged(); }
        finally { S.applying = false; }
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__EngineHost__AttachAssets,
        Na__EngineHost__AssetsTap,
        Na__EngineHost__AssetsAway,
        Na__EngineHost__AssetsSettings,
        Na__EngineHost__AssetsFromSettings
    };

// endregion -------------------------------------------------------------------
