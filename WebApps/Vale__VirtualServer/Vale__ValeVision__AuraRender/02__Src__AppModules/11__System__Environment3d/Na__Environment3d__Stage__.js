// =============================================================================
// VALEVISION AURA - 3D ENVIRONMENT - THE STAGE
// =============================================================================
//
// FILE       : Na__Environment3d__Stage__.js
// NAMESPACE  : Na__Environment3d
// MODULE     : 3D Environment - Stage
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The 3D Environment tab: the engine's live drawing of the scene,
//              orbited and zoomed by hand, the drawing set's scenes as tabs, a
//              new seed, and the parameters beside it
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE DRAWING IS THE ENGINE'S OWN CANVAS (its A3 sheet, 420 x 297 mm at 5
//   px/mm, since PainterlyNPR 0.8.3), shown whole in the stage at its own shape. While the camera moves the engine shows
//   its navigation preview; when it rests it refines into pen and wash.
// - NAVIGATION IS THE ENGINE'S (PainterlyNPR 74__Camera__Navigation, through
//   the engine host): ValeVision 3D's orbit mode without its helper cube. Left
//   drag orbits, right drag (or Ctrl / Shift + left) pans, middle drag dollies,
//   the wheel zooms; one finger orbits, two pinch and pan; W A S D, the arrows,
//   Q and E move the camera, R resets it, + - 0 zoom. Its keys live only while
//   this tab is open. Zoom moves the camera, never a magnified page (Adam).
// - SCENE TABS, SKETCHUP TO LAYOUT (Adam, 30-Oct-2026: "move Saved Views Logo
//   to the views tags and at the end of that list add a +Add Scene, right
//   clicking the tabs should allow for renaming of scenes, these scenes becoime
//   viewports in the layout think SketchUp -> Layout logic"). The toolbar's
//   tabs are the drawing set's scenes, after the Saved views icon; a viewport
//   on a sheet shows one, and every viewport of a scene follows it.
//   - A click opens a scene: its camera and its art direction points. It stays
//     lit while the camera moves, as a SketchUp scene tab does.
//   - An elevation or the roof plan opens square and to scale, and its
//     orientation is held while it is open: pan and zoom, never orbit (Adam:
//     "when in the elevations its locks the camera to those orientations").
//     R brings it back. Its cut is held too: the camera's eye stays at its
//     drawing plane (the Cameras section, AURA 0.5.6).
//   - + Add Scene keeps the camera and the points as a new scene (a scaled
//     scene's copy, centred where it is now, while one is open).
//   - A right-click: Rename, Update from camera (a 3D scene takes the camera
//     whole, a scaled one where it is centred; every viewport follows),
//     Duplicate, Delete (and the viewports showing it, after asking).
// - THE ENGINE'S CAMERA PRESETS are a picker after the tabs: starting points.
//   Picking one leaves the open scene (no tab lit).
// - RENDERED OR PROXY: the toolbar's switch (and Shift + R) keeps the live view
//   a quick proxy preview to work in, or lets it refine into pen and wash when
//   the camera rests - the engine's own work mode. Remembered per viewer. The
//   sheets' pictures are always rendered.
// - THE PANEL folds by section (Parameters, Art direction points, then
//   Cameras: the lens and the elevation planes, Na__Environment3d__Cameras__
//   and Na__Environment3d__DrawingPlanes__), and its left edge drags it wider
//   or narrower (Na__AppUtils__Panels__, after ValeVision 3D's Layout Editor).
// - THE ASSETS DRAWER down the stage's left edge is PainterlyNPR's own
//   (Na__EngineHost__Assets__): trees, plants and furniture dragged onto the
//   drawing, materials given to an object or a face. A click on the drawing is
//   the engine's too: it paints with the brush, or selects what is there.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 2.2.0 (AURA 0.5.9)
// - Each scene keeps its own sun (Na__Environment3d__SceneSun__, mounted at
//   the head of the Parameters before the Art Direction section opens the
//   first one): + Add Scene and Duplicate carry the sun with the scene.
//
// 30-Oct-2026 - Version 2.1.0 (AURA 0.5.6)
// - A third section, Cameras (Adam: "Add a Cameras tab"): the lens and the
//   elevation planes, whose layer is mounted over the canvas under the points.
// - HoldOrientation holds an open elevation's cut as well (Na__Views__
//   ApplyCut), and runs again when a scene changes or an undo lands; + Add
//   Scene and Duplicate carry the cut, a new scaled scene its centre at the
//   open one's depth.
//
// 30-Oct-2026 - Version 2.0.1 (AURA 0.5.2)
// - The panel's sections flipped: Parameters first, then Art direction points
//   (Adam: "Flip the order of these").
//
// 30-Oct-2026 - Version 2.0.0 (AURA 0.5.0)
// - Scene tabs: the Saved views section went from the panel (Adam: "its
//   useless and dosnt work"); its icon leads the tabs, + Add Scene ends them,
//   and a right-click renames, updates, duplicates or deletes one. A scaled
//   scene holds its orientation (HoldOrientation). 0.4.4's viewport strip,
//   Set and Reload, and the saved views list and form, are gone.
//
// 30-Oct-2026 - Version 1.5.1 (AURA 0.4.3, landed after 0.4.4)
// - Notes only: the canvas is the engine's A3 sheet, fitted at its own shape.
//
// 30-Oct-2026 - Version 1.5.0 (AURA 0.4.4)
// - The viewport strip, Set and Reload in the toolbar in place of the camera
//   presets (Na__Environment3d__RenderStrip, OpenViewport, SetViewport,
//   ReloadViewport); the preset marker became MarkCamera. The presets stay as
//   a picker after Reload (WirePresets). A saved view's camera goes through
//   the drawing set's file form (CameraToJson and CameraFromJson).
//
// 30-Oct-2026 - Version 1.4.1 (AURA 0.4.2)
// - The panel's three sections carry their icons (Saved views, Art direction
//   points, Parameters).
//
// 30-Oct-2026 - Version 1.4.0 (AURA 0.4.0)
// - The engine's Assets drawer in its own column left of the stage (Adam: "add
//   the materials and assets loader from npr renderer to aura"); the
//   navigation's tap goes to the engine as well, and leaving the tab puts its
//   brush down and lets its selection go.
//
// 30-Oct-2026 - Version 1.3.0 (AURA 0.3.0)
// - The panel's three folding sections and its resize grip; Art direction
//   points (Na__Environment3d__ArtDirection__) over the drawing, the canvas in
//   a wrapper that holds the engine's point layer; saved views carry their
//   points and show which one is being edited; a click on bare drawing lets
//   the selected point go (the navigation's OnTap).
//
// 30-Oct-2026 - Version 1.2.0 (AURA 0.2.2)
// - The Rendered / Proxy switch in the toolbar, and Shift + R (Adam: "Add
//   toggle to aura for proxy view / rendered view ... add the hotkey shift + R").
//
// 30-Oct-2026 - Version 1.1.0 (AURA 0.1.3)
// - The canvas's own orbit and zoom handlers gave way to the engine's
//   navigation (Na__EngineHost__AttachNavigation): pan, dolly, touch and
//   keys as ValeVision 3D's, the preset buttons lit as the camera moves.
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__Touch, Na__AppState__On } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__El, Na__Dom__IconButton, Na__Dom__PanelIcon, Na__Dom__Clear, Na__Dom__Select } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Toast__Show } from '../03__AppUtils/Na__AppUtils__Toast__.js';
    import { Na__Panels__Section, Na__Panels__Resizable } from '../03__AppUtils/Na__AppUtils__Panels__.js';
    import {
        Na__EngineHost__Presets, Na__EngineHost__ApplyPreset, Na__EngineHost__SetCamera, Na__EngineHost__Camera,
        Na__EngineHost__AttachNavigation, Na__EngineHost__NewSeed, Na__EngineHost__Redraw, Na__EngineHost__SceneCounts,
        Na__EngineHost__WorkMode, Na__EngineHost__SetWorkMode, Na__EngineHost__Points, Na__EngineHost__RefreshPoints,
        Na__EngineHost__Borrowed, Na__EngineHost__Sun
    } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__EngineHost__AttachAssets, Na__EngineHost__AssetsTap, Na__EngineHost__AssetsAway } from '../10__System__EngineHost/Na__EngineHost__Assets__.js';
    import { Na__DrawingSet__NewScene, Na__DrawingSet__SceneName, Na__DrawingSet__Scene } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';
    import {
        Na__Views__IsScaled, Na__Views__SceneCamera, Na__Views__SceneLock, Na__Views__UpdateScene, Na__Views__ScenesUsing,
        Na__Views__ApplyCut, Na__Views__ScaledCentre
    } from '../21__System__Viewports/Na__Viewports__Views__.js';
    import { Na__Parameters__Build, Na__Parameters__Sync } from './Na__Environment3d__Parameters__.js';
    import { Na__SceneSun3d__Mount } from './Na__Environment3d__SceneSun__.js';
    import { Na__Cameras__Build, Na__Cameras__SetOpen, Na__Cameras__Sync } from './Na__Environment3d__Cameras__.js';
    import { Na__DrawingPlanes__Mount, Na__DrawingPlanes__Redraw } from './Na__Environment3d__DrawingPlanes__.js';
    import {
        Na__ArtDirection3d__Mount, Na__ArtDirection3d__Show, Na__ArtDirection3d__SetOpen, Na__ArtDirection3d__UseScene,
        Na__ArtDirection3d__LeaveScene, Na__ArtDirection3d__Owner, Na__ArtDirection3d__Adopt, Na__ArtDirection3d__Keep,
        Na__ArtDirection3d__OnTap
    } from './Na__Environment3d__ArtDirection__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Environment3d__State = {
        root       : null,
        canvas     : null,
        presetBar  : null,                       // <-- The toolbar
        tabs       : null,                       // <-- The scene tabs in it
        tabsKey    : '',                         // <-- The tabs as last drawn: redrawn only when a scene comes, goes or is renamed
        renaming   : false,                      // <-- A tab's name is being typed: the tabs wait
        menu       : null,                       // <-- The right-click menu, while it is open
        stage      : null,                       // <-- The room the drawing is fitted into
        navigation : null                        // <-- The engine's navigation on the canvas: { Detach, Home }
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Camera by Hand
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Hand the Canvas to the Engine's Navigation
    // ------------------------------------------------------------
    // Its keys act only while this tab is open: a sheet tab's V, N and L, and
    // its arrows, are the sheet's. A press takes the keyboard from a panel
    // control, so W A S D move the camera rather than type into the last box.
    // R brings an open scene back, as the engine's R brings its preset back.
    // ------------------------------------------------------------
    function Na__Environment3d__WireCanvas(canvas) {
        canvas.addEventListener('pointerdown', () => canvas.focus({ preventScroll: true }), true);
        Na__Environment3d__State.navigation = Na__EngineHost__AttachNavigation(canvas, {
            Active  : () => Na__AppState__Data.tab === 'environment',
            OnMove  : () => Na__Environment3d__HoldOrientation(),
            OnReset : () => {
                const scene = Na__Environment3d__OpenScene();
                if (scene) Na__EngineHost__SetCamera(Na__Views__SceneCamera(scene, Na__AppState__Data.doc), 'Custom');
            },
            OnTap   : (e) => {
                Na__ArtDirection3d__OnTap();                                     // <-- A click on bare drawing lets the point being edited go
                Na__EngineHost__AssetsTap(e);                                    // <-- And is the engine's: paint with the brush up, else select what is there
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Open Elevation or Roof Plan Keeps Its Orientation and Its Cut (pan and zoom only)
    // ------------------------------------------------------------
    // The engine's navigation can hold the camera still, not its orientation
    // alone, so a move that turned the camera is put square again at once (the
    // same frame: only the square view is drawn). A seam in PainterlyNPR's
    // navigation would do it there. The eye is stood at the scene's cut again
    // too (Na__Views__ApplyCut), so a key that walks the camera never walks it
    // through the plane, and a cut set in the Cameras section, or undone,
    // reaches the live drawing at once.
    // ------------------------------------------------------------
    function Na__Environment3d__HoldOrientation() {
        const open = Na__Environment3d__OpenScene();
        const lock = Na__Views__SceneLock(open);
        if (!lock || Na__EngineHost__Borrowed()) return;
        const camera = Na__EngineHost__Camera().Camera;
        const held = Na__Views__ApplyCut(Object.assign({}, camera, { Mode: 'Ortho', Yaw: lock.Yaw, Pitch: lock.Pitch }), open);
        const near = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) < 1e-6;
        if (camera.Mode === 'Ortho' && near(camera.Yaw, lock.Yaw) && near(camera.Pitch, lock.Pitch) && near(camera.Distance, held.Distance)
            && [0, 1, 2].every((i) => near(camera.Target[i], held.Target[i]))) return;
        Na__EngineHost__SetCamera(held, 'Custom');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Tabs
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Scene Open Here (its points are being edited), if Any
    // ------------------------------------------------------------
    function Na__Environment3d__OpenScene() {
        return Na__DrawingSet__Scene(Na__AppState__Data.doc, Na__ArtDirection3d__Owner());
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Tabs: the Saved views icon, a tab a scene, + Add Scene (only when they changed)
    // ------------------------------------------------------------
    function Na__Environment3d__RenderTabs() {
        const S = Na__Environment3d__State;
        const doc = Na__AppState__Data.doc;
        if (!S.tabs || !doc || S.renaming) return;
        const scenes = doc.AuraDrawingSet__SavedViews || [];
        const key = JSON.stringify(scenes.map((v) => [v.View__Id, v.View__Name, v.View__Kind]));
        if (key !== S.tabsKey) {
            S.tabsKey = key;
            Na__Dom__Clear(S.tabs);
            S.tabs.appendChild(Na__Dom__PanelIcon('SavedViews', 'aura-scenes__icon'));
            const list = Na__Dom__El('div', 'aura-segmented aura-scenes__list');
            scenes.forEach((scene) => {
                const kind = scene.View__Kind === 'Elevation' ? 'an elevation, to scale' : scene.View__Kind === 'Plan' ? 'the roof plan, to scale' : 'a 3D view';
                const tab = Na__Dom__El('button', 'aura-segmented__item aura-scenes__tab', scene.View__Name, {
                    type: 'button', 'aria-pressed': 'false', dataset: { scene: scene.View__Id },
                    title: `${scene.View__Name}: ${kind}. Right-click to rename, update, duplicate or delete it`
                });
                tab.addEventListener('click', () => Na__Environment3d__OpenSceneTab(scene.View__Id));
                tab.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    Na__Environment3d__ShowMenu(scene.View__Id, tab, e.clientX, e.clientY);
                });
                list.appendChild(tab);
            });
            S.tabs.appendChild(list);
            const add = Na__Dom__IconButton('plus', 'aura-button aura-scenes__add', 'Add Scene', 'Keep the camera and its art direction points as a new scene, for a viewport on a sheet');
            add.addEventListener('click', () => Na__Environment3d__AddScene());
            S.tabs.appendChild(add);
        }
        Na__Environment3d__MarkScene();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Light the Open Scene's Tab
    // ------------------------------------------------------------
    function Na__Environment3d__MarkScene() {
        const S = Na__Environment3d__State;
        if (!S.tabs) return;
        const open = Na__ArtDirection3d__Owner();
        S.tabs.querySelectorAll('[data-scene]').forEach((b) => {
            const on = b.dataset.scene === open;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', String(on));
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Open a Scene: its camera and its points
    // ------------------------------------------------------------
    function Na__Environment3d__OpenSceneTab(sceneId) {
        const doc = Na__AppState__Data.doc;
        const scene = Na__DrawingSet__Scene(doc, sceneId);
        if (!scene) return;
        Na__ArtDirection3d__UseScene(scene);
        Na__EngineHost__SetCamera(Na__Views__SceneCamera(scene, doc), 'Custom');
        Na__Environment3d__MarkScene();
    }
    // ------------------------------------------------------------


    // FUNCTION | + Add Scene: the camera and points now, as a new scene
    // ------------------------------------------------------------
    // While an elevation or the roof plan is open the new scene is one too
    // (the same side and cut, centred where the camera looks now), so it stays
    // square and to scale; otherwise it is a 3D scene of the camera. It is the
    // open scene from then on.
    // ------------------------------------------------------------
    function Na__Environment3d__AddScene() {
        const doc = Na__AppState__Data.doc;
        if (!doc) return null;
        Na__ArtDirection3d__Keep();
        const open = Na__Environment3d__OpenScene();
        const camera = Na__EngineHost__Camera().Camera;
        const name = Na__DrawingSet__SceneName(doc, `Scene ${(doc.AuraDrawingSet__SavedViews || []).length + 1}`);
        const scene = Na__Views__IsScaled(open)
            ? Na__DrawingSet__NewScene({ name, kind: open.View__Kind, side: open.View__Side, centre: Na__Views__ScaledCentre(open, camera.Target),
                                         cut: open.View__CutM, points: Na__EngineHost__Points(), sun: Na__EngineHost__Sun() })
            : Na__DrawingSet__NewScene({ name, kind: 'Perspective', camera, points: Na__EngineHost__Points(), sun: Na__EngineHost__Sun() });
        doc.AuraDrawingSet__SavedViews.push(scene);
        Na__ArtDirection3d__Adopt(scene);
        Na__AppState__Touch('views');
        Na__Environment3d__RenderTabs();
        Na__Toast__Show(`Added "${scene.View__Name}". Right-click its tab to rename it; put it on a sheet from "Add a view".`);
        return scene;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Right-Click Menu: Rename, Update From Camera, Duplicate, Delete
// -----------------------------------------------------------------------------

    // FUNCTION | Show the Menu for a Scene at the Pointer
    // ------------------------------------------------------------
    function Na__Environment3d__ShowMenu(sceneId, tab, x, y) {
        const S = Na__Environment3d__State;
        Na__Environment3d__CloseMenu();
        const menu = Na__Dom__El('div', 'aura-scenes__menu', null, { role: 'menu' });
        [['Rename', () => Na__Environment3d__RenameScene(sceneId, tab)],
         ['Update from camera', () => Na__Environment3d__UpdateScene(sceneId)],
         ['Duplicate', () => Na__Environment3d__DuplicateScene(sceneId)],
         ['Delete', () => Na__Environment3d__DeleteScene(sceneId)]].forEach(([label, act]) => {
            const item = Na__Dom__El('button', `aura-scenes__item${label === 'Delete' ? ' aura-scenes__item--danger' : ''}`, label, { type: 'button', role: 'menuitem' });
            item.addEventListener('click', () => { Na__Environment3d__CloseMenu(); act(); });
            menu.appendChild(item);
        });
        document.body.appendChild(menu);
        const r = menu.getBoundingClientRect();
        menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - r.width - 8))}px`;   // <-- Kept on screen
        menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - r.height - 8))}px`;
        S.menu = menu;
        menu.querySelector('button').focus();
    }

    function Na__Environment3d__CloseMenu() {
        const S = Na__Environment3d__State;
        if (S.menu) S.menu.remove();
        S.menu = null;
    }

    // Any press outside it, Escape, a scroll or a resize closes it
    function Na__Environment3d__WireMenu() {
        const S = Na__Environment3d__State;
        document.addEventListener('pointerdown', (e) => { if (S.menu && !S.menu.contains(e.target)) Na__Environment3d__CloseMenu(); }, true);
        document.addEventListener('keydown', (e) => { if (S.menu && e.key === 'Escape') { e.preventDefault(); Na__Environment3d__CloseMenu(); } }, true);
        window.addEventListener('resize', () => Na__Environment3d__CloseMenu());
        window.addEventListener('scroll', () => Na__Environment3d__CloseMenu(), true);
    }
    // ------------------------------------------------------------


    // FUNCTION | Rename a Scene in Its Tab: Enter or leaving the box keeps it, Escape does not
    // ------------------------------------------------------------
    function Na__Environment3d__RenameScene(sceneId, tab) {
        const S = Na__Environment3d__State;
        const doc = Na__AppState__Data.doc;
        const scene = Na__DrawingSet__Scene(doc, sceneId);
        if (!scene || !tab || !tab.isConnected) return;
        const input = Na__Dom__El('input', 'aura-input aura-scenes__rename', null, { type: 'text', maxlength: 60, 'aria-label': `New name for ${scene.View__Name}` });
        input.value = scene.View__Name;
        input.style.width = `${Math.max(120, tab.offsetWidth)}px`;
        S.renaming = true;
        tab.replaceWith(input);
        input.focus();
        input.select();
        let done = false;
        const finish = (keep) => {
            if (done) return;
            done = true;
            S.renaming = false;
            const clean = input.value.trim();
            if (keep && clean && clean !== scene.View__Name) {
                scene.View__Name = Na__DrawingSet__SceneName(doc, clean, scene);    // <-- A name another scene has gets a number
                Na__AppState__Touch('views');
            }
            S.tabsKey = '';                                                      // <-- Drawn again, the box gone
            Na__Environment3d__RenderTabs();
        };
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();                                                 // <-- Typing is not the camera's
            if (e.key === 'Enter') { e.preventDefault(); finish(true); }
            else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
        });
        input.addEventListener('blur', () => finish(true));
    }
    // ------------------------------------------------------------


    // FUNCTION | Update a Scene From the Camera (SketchUp's Update Scene): every viewport of it follows
    // ------------------------------------------------------------
    // The open scene takes the camera and the points as they are; another takes
    // the camera only (its own points stay), after asking, and is opened. A
    // scaled scene takes where the camera is centred, its side kept.
    // ------------------------------------------------------------
    function Na__Environment3d__UpdateScene(sceneId) {
        const doc = Na__AppState__Data.doc;
        const scene = Na__DrawingSet__Scene(doc, sceneId);
        if (!scene) return;
        Na__ArtDirection3d__Keep();
        const open = Na__ArtDirection3d__Owner() === sceneId;
        const used = Na__Views__ScenesUsing(doc, sceneId).length;
        if (!open && !window.confirm(`Update "${scene.View__Name}" from the camera as it is now?${used ? ` ${used === 1 ? 'The viewport' : `All ${used} viewports`} showing it follow${used === 1 ? 's' : ''}.` : ''}`)) return;
        Na__Views__UpdateScene(scene, Na__EngineHost__Camera().Camera, open ? Na__EngineHost__Points() : scene.View__Points);
        if (open) Na__ArtDirection3d__Adopt(scene);
        else Na__ArtDirection3d__UseScene(scene);
        if (Na__Views__IsScaled(scene)) Na__EngineHost__SetCamera(Na__Views__SceneCamera(scene, doc), 'Custom');   // <-- Square and to scale, as it now is
        Na__AppState__Touch('views');
        Na__Environment3d__MarkScene();
        Na__Toast__Show(`Updated "${scene.View__Name}"${used ? `: ${used === 1 ? 'its viewport follows' : `its ${used} viewports follow`}` : ''}.`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Duplicate a Scene, Next to It, Under the Next Free Name
    // ------------------------------------------------------------
    function Na__Environment3d__DuplicateScene(sceneId) {
        const doc = Na__AppState__Data.doc;
        const scene = Na__DrawingSet__Scene(doc, sceneId);
        if (!scene) return;
        Na__ArtDirection3d__Keep();
        const copy = Na__DrawingSet__NewScene({
            name: Na__DrawingSet__SceneName(doc, scene.View__Name), kind: scene.View__Kind, side: scene.View__Side, camera: scene.View__Camera,
            preset: scene.View__Preset, centre: scene.View__CentreM, cut: scene.View__CutM, points: scene.View__Points, sun: scene.View__Sun
        });
        const list = doc.AuraDrawingSet__SavedViews;
        list.splice(list.indexOf(scene) + 1, 0, copy);
        Na__AppState__Touch('views');
        Na__Environment3d__RenderTabs();
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete a Scene, and the Viewports Showing It, After Asking (undo brings both back)
    // ------------------------------------------------------------
    function Na__Environment3d__DeleteScene(sceneId) {
        const doc = Na__AppState__Data.doc;
        const scene = Na__DrawingSet__Scene(doc, sceneId);
        if (!scene) return;
        const used = Na__Views__ScenesUsing(doc, sceneId);
        if (used.length) {
            const sheets = [...new Set(used.map((u) => u.Sheet.Sheet__Name))].join(', ');
            if (!window.confirm(`"${scene.View__Name}" is shown in ${used.length} viewport${used.length === 1 ? '' : 's'} (${sheets}). Delete the scene and ${used.length === 1 ? 'that viewport' : 'those viewports'}? Undo brings them back.`)) return;
        }
        if (Na__ArtDirection3d__Owner() === sceneId) Na__ArtDirection3d__LeaveScene();   // <-- Its points stay on the drawing, now the working set's
        used.forEach((u) => { u.Sheet.Sheet__Viewports = u.Sheet.Sheet__Viewports.filter((v) => v !== u.Viewport); });
        doc.AuraDrawingSet__SavedViews = (doc.AuraDrawingSet__SavedViews || []).filter((v) => v !== scene);
        [...new Set(used.map((u) => u.Sheet.Sheet__Id))].forEach((id) => Na__AppState__Touch('viewport', id));
        Na__AppState__Touch('views');
        Na__Environment3d__RenderTabs();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Camera Presets
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Engine's Camera Presets, in One Picker After the Tabs
    // ------------------------------------------------------------
    // Starting points: pick one and the live camera goes there, the open scene
    // let go (its tab unlit), so Add Scene can keep it. The picker reads
    // "Presets" again after each pick, so the same one can be picked twice.
    // ------------------------------------------------------------
    function Na__Environment3d__WirePresets(bar) {
        const options = [{ value: '', label: 'Presets' }].concat(Na__EngineHost__Presets(Na__AppConfig__Get('Engine__CameraPresets'))
            .map((p) => ({ value: p.Key, label: `${p.Label}${p.Mode === 'Ortho' ? ' (orthographic)' : ''}` })));
        const pick = Na__Dom__Select(options, '', 'aura-select aura-env__presets');
        pick.title = 'Move the camera to one of the engine\'s presets (R puts it back to the start)';
        pick.setAttribute('aria-label', 'Camera presets');
        pick.addEventListener('change', () => {
            if (!pick.value) return;
            Na__ArtDirection3d__UseScene(null);                                  // <-- Off any scene: the working points
            Na__EngineHost__ApplyPreset(pick.value);
            pick.value = '';
            Na__Environment3d__MarkScene();
        });
        bar.appendChild(pick);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendered or Proxy
// -----------------------------------------------------------------------------

    const Na__Environment3d__WORK_MODE_STORE = 'AuraRender.WorkMode';          // <-- This viewer's choice, as PainterlyNPR keeps its own


    // FUNCTION | Set the Live View's Work Mode: 'Rendered' or 'Proxy'
    // ------------------------------------------------------------
    function Na__Environment3d__SetWorkMode(mode, remember) {
        const now = Na__EngineHost__SetWorkMode(mode === 'Proxy' ? 'Proxy' : 'Rendered');
        const bar = Na__Environment3d__State.presetBar;
        if (bar) bar.querySelectorAll('[data-work-mode]').forEach((b) => {
            const on = b.dataset.workMode === now;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', String(on));
        });
        if (remember === false) return now;
        try { window.localStorage.setItem(Na__Environment3d__WORK_MODE_STORE, now); }
        catch (error) { /* a blocked store: the mode still switches, it is just not remembered */ }
        return now;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Switch in the Toolbar, Shift + R, and This Viewer's Last Choice
    // ------------------------------------------------------------
    // Shift + R is taken in the capture phase, ahead of the engine's navigation,
    // whose R alone resets the camera: a key taken here is passed over there.
    // ------------------------------------------------------------
    function Na__Environment3d__WireWorkMode(bar) {
        const group = Na__Dom__El('div', 'aura-segmented', null, { role: 'group', 'aria-label': 'Rendered or proxy view' });
        [['Rendered', 'Rendered', 'Draw the pen and wash when the camera rests (Shift + R)'],
         ['Proxy', 'Proxy', 'Keep the quick proxy preview while you work: the renderer never kicks in (Shift + R)']].forEach(([mode, label, title]) => {
            const b = Na__Dom__El('button', 'aura-segmented__item', label, { type: 'button', title, dataset: { workMode: mode }, 'aria-pressed': 'false' });
            b.addEventListener('click', () => Na__Environment3d__SetWorkMode(mode));
            group.appendChild(b);
        });
        bar.appendChild(group);

        window.addEventListener('keydown', (e) => {
            if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || (e.key || '').toLowerCase() !== 'r') return;
            if (Na__AppState__Data.tab !== 'environment' || e.repeat) return;
            const focus = document.activeElement;
            if (focus && (/^(INPUT|TEXTAREA|SELECT)$/.test(focus.tagName) || focus.isContentEditable)) return;
            e.preventDefault();
            const now = Na__Environment3d__SetWorkMode(Na__EngineHost__WorkMode() === 'Proxy' ? 'Rendered' : 'Proxy');
            Na__Toast__Show(now === 'Proxy' ? 'Proxy view: the quick preview, no pen and wash (Shift + R to render)' : 'Rendered view: pen and wash when the camera rests');
        }, true);

        let saved = null;
        try { saved = window.localStorage.getItem(Na__Environment3d__WORK_MODE_STORE); } catch (error) { saved = null; }
        Na__Environment3d__SetWorkMode(saved === 'Proxy' ? 'Proxy' : 'Rendered', false);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount and Show
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fit the Engine's Sheet Whole in the Stage, at Its Own Shape (A3)
    // ------------------------------------------------------------
    // Sized in pixels from the stage's room (a ResizeObserver), so a narrow or
    // short window letterboxes the drawing instead of stretching it. The point
    // layer over it is drawn again at the new size.
    // ------------------------------------------------------------
    function Na__Environment3d__Fit() {
        const S = Na__Environment3d__State;
        const stage = S.stage;
        if (!stage || !S.canvas) return;
        const style = window.getComputedStyle(stage);
        const w = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const h = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        if (w <= 0 || h <= 0) return;
        const aspect = S.canvas.width / S.canvas.height || Math.SQRT2;   // <-- The canvas's own (the engine's sheet); A3 is about root two until it is sized
        const width = Math.floor(Math.min(w, h * aspect));
        S.canvas.style.width = `${width}px`;
        S.canvas.style.height = `${Math.floor(width / aspect)}px`;
        if (Na__AppState__Data.tab === 'environment') Na__EngineHost__RefreshPoints();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Canvas's Wrapper: the canvas and the engine's point layer over it
    // ------------------------------------------------------------
    // index.html has it; a page from before it gets one made round the canvas
    // (moving a canvas keeps its WebGL context).
    // ------------------------------------------------------------
    function Na__Environment3d__SheetWrap(canvas) {
        let wrap = canvas.closest('[data-env-sheet]');
        if (wrap) return wrap;
        wrap = Na__Dom__El('div', 'aura-env__sheet', null, { dataset: { envSheet: '' } });
        canvas.parentElement.insertBefore(wrap, canvas);
        wrap.appendChild(canvas);
        return wrap;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Tab Around the Engine's Canvas
    // ------------------------------------------------------------
    // root holds the page's skeleton (index.html): the toolbar, the stage with the
    // canvas, the side panel and the status line. This fills them in.
    // ------------------------------------------------------------
    function Na__Environment3d__Mount(root, canvas) {
        const S = Na__Environment3d__State;
        S.root = root;
        S.canvas = canvas;
        canvas.tabIndex = 0;
        const sheetWrap = Na__Environment3d__SheetWrap(canvas);
        S.stage = sheetWrap.parentElement;
        Na__EngineHost__AttachAssets(root, root.querySelector('[data-env-assets]'), sheetWrap);   // <-- First: it links the engine's tokens, which the point editor reads too
        Na__AppState__On('tab', (tab) => { if (tab !== 'environment') Na__EngineHost__AssetsAway(); });
        Na__Environment3d__WireCanvas(canvas);
        if (window.ResizeObserver && S.stage) new ResizeObserver(() => Na__Environment3d__Fit()).observe(S.stage);

        // Toolbar: the scene tabs (the Saved views icon, a tab a scene, + Add Scene), the presets, a new seed, then Rendered or Proxy
        const bar = root.querySelector('[data-env-toolbar]');
        S.presetBar = bar;
        Na__Dom__Clear(bar);
        S.tabs = Na__Dom__El('div', 'aura-scenes', null, { role: 'group', 'aria-label': 'Scenes: each one a viewport on a sheet' });
        bar.appendChild(S.tabs);
        Na__Environment3d__WireMenu();
        Na__Environment3d__WirePresets(bar);
        const seed = Na__Dom__IconButton('dice', 'aura-button', 'New seed', 'Every stroke, wash and grain is seeded: a new seed is a new hand, the same building');
        seed.addEventListener('click', () => { Na__EngineHost__NewSeed(); Na__Parameters__Sync(); });
        bar.appendChild(seed);
        Na__Environment3d__WireWorkMode(bar);

        // Side panel: two folding sections - the parameters, then the art
        // direction points (Adam: "Flip the order of these") - and a grip on
        // its left edge to resize it
        const panel = root.querySelector('[data-env-panel]');
        Na__Dom__Clear(panel);
        Na__Environment3d__WirePanelGrip(root, panel);

        const params = Na__Panels__Section(panel, { id: 'env-params', title: 'Parameters', icon: 'Parameters' });
        const holder = Na__Dom__El('div', 'aura-params');
        params.body.appendChild(holder);
        Na__Parameters__Build(holder);
        Na__SceneSun3d__Mount(params.body, () => Na__Environment3d__OpenScene());   // <-- Each scene's own sun (0.5.9); before the points' section opens the first

        const points = Na__Panels__Section(panel, { id: 'env-points', title: 'Art direction points', icon: 'ArtDirectionPoints', onToggle: (open) => Na__ArtDirection3d__SetOpen(open) });
        Na__ArtDirection3d__Mount(points, sheetWrap, canvas, () => Na__Environment3d__MarkScene());

        // Then the cameras (Adam: "Add a Cameras tab"): the lens, and the
        // elevation planes, whose layer lies over the canvas under the points
        Na__DrawingPlanes__Mount(sheetWrap, canvas);
        const cameras = Na__Panels__Section(panel, { id: 'env-cameras', title: 'Cameras', icon: 'Cameras', onToggle: (open) => Na__Cameras__SetOpen(open) });
        Na__Cameras__Build(cameras, { onCut: () => Na__Environment3d__HoldOrientation() });

        // The scene line under the stage
        const scene = root.querySelector('[data-env-scene]');
        if (scene) {
            const counts = Na__EngineHost__SceneCounts();
            scene.textContent = `${Na__AppConfig__Get('Scene__DemoLabel', 'Demo scene')}${counts ? ` (${counts.Objects} objects, ${counts.Edges} edges)` : ''}`;
            scene.title = Na__AppConfig__Get('Scene__DemoNote', '');
        }

        Na__Environment3d__RenderTabs();
        Na__AppState__On('saved', () => Na__Environment3d__RenderTabs());
        Na__AppState__On('changed', (detail) => {                               // <-- A scene added, renamed or removed (here or from a sheet)
            Na__Environment3d__RenderTabs();
            if (detail && detail.reason === 'views') Na__Environment3d__HoldOrientation();   // <-- A scene's cut moved: the open one's live camera follows
        });
        Na__AppState__On('restored', () => {                                    // <-- An undo or redo
            Na__Environment3d__RenderTabs();
            Na__Environment3d__HoldOrientation();
            Na__Cameras__Sync();
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Panel's Resize Grip (on its left edge), Made Round the Panel
    // ------------------------------------------------------------
    // The tab's grid reads --aura-env-panel-width; the drawing refits as the
    // stage changes size (its ResizeObserver).
    // ------------------------------------------------------------
    function Na__Environment3d__WirePanelGrip(root, panel) {
        let column = panel.closest('.aura-column');
        if (!column) {
            column = Na__Dom__El('div', 'aura-column aura-column--right');
            panel.parentElement.insertBefore(column, panel);
            column.appendChild(panel);
        }
        let grip = column.querySelector('.aura-grip');
        if (!grip) {
            grip = Na__Dom__El('div', 'aura-grip');
            column.insertBefore(grip, panel);
        }
        const w = Na__AppConfig__Get('Panels__WidthPx', {});
        Na__Panels__Resizable({ grip, panel: column, host: root, cssVar: '--aura-env-panel-width', side: 'right', id: 'env-panel', label: 'settings',
                                min: w.Min || 240, max: w.Max || 640, initial: w.Environment || 340 });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Tab Is Shown Again: bring the live drawing back (stills, or a sheet's viewport, borrowed the engine)
    // ------------------------------------------------------------
    function Na__Environment3d__Show() {
        Na__ArtDirection3d__Show();                                             // <-- First: a sheet's viewport gives the engine back
        requestAnimationFrame(() => Na__Environment3d__Fit());                  // <-- The stage has its size once shown
        Na__EngineHost__Redraw();
        Na__Parameters__Sync();
        Na__Environment3d__RenderTabs();
        Na__Cameras__Sync();
        Na__DrawingPlanes__Redraw();                                            // <-- Its watch stopped while a sheet was open
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Environment3d__Mount,
        Na__Environment3d__Show,
        Na__Environment3d__AddScene,
        Na__Environment3d__RenderTabs
    };

// endregion -------------------------------------------------------------------
