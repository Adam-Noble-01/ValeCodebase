# ValeVision AURA

Vale Garden Houses' pen and wash drawing app, at <https://app.valegardenhouses.com/aura/>. It draws a project in
British architectural pen and wash with Adam's own renderer, **PainterlyNPR**, and lays the drawings out on Vale's
drawing page with handwritten notes. AURA is the third way Vale shows a 3D model, beside Whitecard and MaxModels in
ValeVision 3D: a Whitecard or MaxModel is carried into AURA and drawn by the AURA library.

## Who Sees What

| Who | Gets |
|---|---|
| **Managers and App Admins** (the shared Vale sign-in) | `/aura/?project=<library id>`, from ValeVision Gallery, on the projects switched on one by one: the AURA icon on the project's card and **Open in AURA** on its page |
| **Which projects** | Only those ticked **Available in ValeVision AURA** in the Gallery's Project Editor (`auraEnabled` in the project record; Adam, 30-Oct-2026). Every project is off until ticked. The Gallery shows no shortcut to the rest, and every API route refuses them (403, `notSwitchedOn`) |
| **AURA's own scenes** (0.5.8) | `/aura/` on its own shows a card for every project switched on, then AURA's own scenes (`Vale__Projects__MasterLibrary/ValeAuraScenes__Library`): **Example Cottage** for managers, directors and App Admins, and **Test** for Adam alone. A scene someone else owns is never listed for them, and every route answers them 404 |
| **Employees, Affiliates, clients** | Nothing yet (Adam, 30-Oct-2026). The Gallery never shows them the link, the page tells them plainly, and every API route refuses them. One config value opens it later (`AuraConfig__Access__MinimumLevel`) |

## The Arrangement: One Core Library, Two Wrappers

```
D:\11_RefLib__StudioRepository__RemoteSystem\Na__PainterlyNPR      (C:\01_Code\Na__PainterlyNPR on another machine)
    PainterlyNPR: the core library. The engine is its 02__Src__AppModules. The single source of truth.
        |
        |  60__Dev__WebBuildUtils/AuraRender__BuildUtil__SyncCoreEngine__.py  (a pinned copy, byte for byte, with a lock)
        v
Vale__ValeVision__AuraRender (this app)          the Vale wrapper: Gallery projects, Vale's drawing page, the server
Noble Architecture's TrueVision 3D wrapper       the second wrapper, to come, round the same engine
```

- **Nothing in AURA edits the engine, and nothing of it is copied into AURA** (Adam, 30-Oct-2026: "dont duplicate
  code the npr repo remains definitive source"): no code, config value, data, stylesheet or piece of its interface.
  A change goes into PainterlyNPR (by its own rules: committed only on Adam's word), then the sync script brings the
  new version into a new folder of `04__Lib__CoreEngine__VersionLocked`, and the import map in `index.html` (and its
  record `Vale__CoreEngine__ImportMap__Index__.json`) moves to it. What AURA needs that the engine cannot give is added
  to PainterlyNPR as a seam (an option, a hook, an export) and synced.
- **The pin is the engine's runtime:** its `02__Src__AppModules` whole, and beside it what it reads from outside
  them: the asset and material libraries (`12__Data__AssetLibrary`, `07__Data__MaterialRecipes`: their .json and
  .webp) and its stylesheets (`03__Style__AppStylesheets`, for its design tokens). The sync copies a commit (git
  archive), never the working tree, except with `--allow-dirty` for a local test that is never pushed.
- **Only `02__Src__AppModules/10__System__EngineHost` imports the engine:** `Na__EngineHost__PainterlyNpr__`
  (boot, camera, parameters, settings, points, stills), `Na__EngineHost__Panel__` (the engine's panel config, its
  menus and paper), `Na__EngineHost__Assets__` (its Assets drawer) and `Na__EngineHost__Dump__` (the parameter
  dump's read of it). Boot is PainterlyNPR's own AppCore Init minus
  its panel, repeated here until it moves into PainterlyNPR as `07__System__LibraryHost` (the next copy to retire).
- **Heavy work runs on the user's own machine, never on the server** (Adam, 30-Oct-2026: the server is resource
  constrained). The engine draws in the browser (WebGL 2 today; WebGPU and WebAssembly to come). The handwriting
  engine runs in the browser too, in WebAssembly (since AURA 0.2.1): its modules are served as static files, and its
  15 MB model, sent once to signed-in staff by the API, is kept on the device. The AURA API only reads and writes
  small JSON files and sends files.

## How It Works

| Part | Where |
|---|---|
| The page (static, plain ES modules, no build step) | this folder, served by nginx at `/aura/` |
| The core engine (PainterlyNPR v0.8.3 at c1917f0, with v0.8.0 and v0.8.1: the A3 sheet; copied from the commit) | `04__Lib__CoreEngine__VersionLocked/01__CoreLib__PainterlyNPR__v0.8.3/`, reached as `PainterlyNPR/...` through the import map; its libraries and stylesheets beside its modules |
| The API (Flask) | `Server__Api\Api__ValeVision__AuraRender\wsgi.py`, proxied at `/aura/api/` (systemd `vale@ValeVision__AuraRender`, port 8006) |
| Config (read by the page through `api/config` and by the API) | `02__Src__AppModules/02__AppData/Na__AppConfig__AuraRender__.json` |
| A project's drawing set | `Vale__Projects__MasterLibrary\ValeProjects__<year>\<id>\ValeVision__AuraRender\UserData__AuraDrawings\<id>__AuraDrawingSet__.json` (user data: the API only); schema: the `.example` in the schema project |
| A project's scene (the "aura file": schema 1.0.0) and its own model (0.5.4) | `...\<id>\ValeVision__AuraRender\UserData__AuraScene\<id>__AuraScene__.json` (user data: the API only), its model files copied from ValeVision 3D's whitecard into `Content__AuraScene__ModelFiles` (a replaced set zipped in `00__Archive`, one zip kept) and the library assets stored in `Content__AuraScene__AssetFiles`; contract `05__Contracts__JsonSchemas/AuraRender__Schema__AuraScene__1.0.0__.json`, rules `AuraRender__SCHEMA__AuraScene__.md`, example in the schema project. Made and read by the API (`AuraRender__Api__Scene__.py`: `GET api/projects/<id>/scene`, `POST api/projects/<id>/scene/import`); loaded into the engine by `10__System__EngineHost/Na__EngineHost__Scene__.js` (PainterlyNPR's GLB scenes, v0.8.7). The content folders are behind the library gate (signed-in staff, through the `valevision` route's `library-access` until AURA's API answers it) |
| The handwriting engine (WebAssembly, in a Web Worker) | `02__Src__AppModules/31__System__Handwriting/02__Engine__Wasm/` (its own README); built and checked by `60__Dev__WebBuildUtils/AuraRender__BuildUtil__Handwriting*`; the Python it came from is the reference in `01__Engine__PythonReference/` |
| The handwriting model (15 MB, signed-in staff only) | `Server__Api\Api__ValeVision__AuraRender\Content__AuraHandwritingModel\` (the weights are git-ignored), sent by `api/handwriting/model` and `api/handwriting/weights/<sha256>` |

### The modules (`02__Src__AppModules`)

| Folder | What it does |
|---|---|
| `01__AppCore` | Start-up, the shared sign-in and the level gate, the app state and its events, the config, the developers' parameter dump (`Na__AppCore__ParameterDump__`) |
| `02__AppData` | The app config |
| `03__AppUtils` | The API client, DOM builders and line icons, toasts, ids and dates, the panels' folding sections and resize grips, the undo history's snapshot store, the drawing planes' snap and drag maths (TrueVision 3D's, `Na__AppUtils__PlaneMaths__`) |
| `10__System__EngineHost` | The one door to PainterlyNPR: boot, camera, parameters, settings, Art Direction Points (the engine's own editor, lent to a sheet's viewport while its points are edited), stills for the sheets; the engine's panel config (`Na__EngineHost__Panel__`); the engine's Assets drawer, placed assets and given materials (`Na__EngineHost__Assets__`); everything the engine holds, read only, for the parameter dump (`Na__EngineHost__Dump__`) |
| `11__System__Environment3d` | The 3D Environment tab: the engine's live drawing and its navigation, the engine's Assets drawer down its left edge, the scene tabs (each scene a viewport on a sheet, SketchUp to LayOut), the presets, the Art direction points section, parameters (built from the engine's own panel config), the Cameras section (the lens, and the elevation planes drawn over the drawing: `Na__Environment3d__Cameras__`, `Na__Environment3d__DrawingPlanes__`) |
| `20__System__DrawingSheets` | Vale's drawing page (A1 to A4, landscape and portrait, on the engine's own paper), the title block, the sheet surface, tabs, the workspace, and the sheets' navigation (the Layout Editor's, with its key map `Na__Hotkeys__DrawingSheets__.json`) |
| `21__System__Viewports` | Elevations and the roof plan to scale, 3D views, their cameras and points, the render queue, editing, and a viewport's Art direction points edited on its picture |
| `30__System__Annotations` | Handwritten notes and leader notes on the sheet |
| `31__System__Handwriting` | The handwriting client, the writing style and the technical pens (with their real-size metric), the studio's hand-drawn leader arrows, the WebAssembly engine, and the Python reference it was ported from |
| `40__Feature__DrawingSet` | The drawing set document, saving it, the refresh guard, and undo and redo (with its key map `Na__Hotkeys__DrawingSet__.json`) |
| `41__Feature__SceneIndex` | `/aura/` on its own: the cards for the projects switched on and AURA's own scenes (0.5.8) |

## Using It

- **The landing page** (0.5.8): `/aura/` on its own lists every project switched on for AURA, then
  AURA's own scenes: **Example Cottage** for managers, directors and admins, and **Test**, Adam's alone,
  for experiments that may break it. Both draw the engine's demo cottage, each in its own drawing set.
- **The project's own model** (0.5.4): AURA draws the project's whitecard, not the engine's demo cottage. The first time a
  project opens, AURA copies ValeVision 3D's whitecard GLBs into the project's AURA folder (its scene, the "aura file")
  and draws from that copy, so a later SketchUp sync never changes a finished drawing. When ValeVision 3D has a newer
  whitecard, a note offers **Update the scene**: objects keep their Ids (and so their materials), the replaced files are
  zipped. A project with no whitecard in ValeVision 3D still draws the cottage, and a note says so.
- **3D Environment:** ValeVision 3D's orbit mode, without the helper cube (the engine's `74__Camera__Navigation`).
  Left drag orbits; right drag, or Ctrl or Shift and a left drag, pans; middle drag dollies; the wheel zooms (the
  camera moves; the page never magnifies). One finger orbits, two pinch and pan. W A S D and the arrows move the
  camera, Q and E lower and raise it (Alt finer, Shift moving the target too); R returns to the last preset; + - 0
  zoom. The drawing shows the engine's quick preview while the camera moves and refines into pen and wash when it
  rests; **Rendered | Proxy** in the toolbar (or Shift + R) keeps it the quick preview to work in. The presets are the
  engine's; **Save view** keeps the camera and its art direction points for a sheet's 3D viewport (a name in use
  replaces that view). **Parameters** are PainterlyNPR's own panel, all of it (0.3.3): Paper and finish, Light, Pen,
  Wash and Sky, their groups and folds nested as the engine nests them, every slider, the menus (paper, ink, cloud
  type, the plants' outline hand and leaf marks), the pen presets (Technical, Fineliner, Sketch, Expressive, Hatched,
  Broad nib) and the vegetation's (Quiet, Natural, Leafy, Scribbly). A group's **i** shows its notes. Every readout
  can be typed into. They are saved with the project's drawing set; a new set starts with the engine's own starting
  state (cartridge paper, grain relief 150%, dry ink 5%, painted area 62%, edge irregularity 64%).
- **Assets and materials** (PainterlyNPR's own drawer, the **Assets** tab down the 3D Environment's left edge):
  **Objects** are the asset library's trees, plants, hedges and furniture, searched and filtered, shown rendered or as
  proxies. Drag a card onto the drawing (or click it, then the drawing) and it stands on the ground there, its own
  plant; the list under the cards turns, moves or takes out each one. **Materials** are the material classes: click a
  swatch, then each click on the drawing gives it to the object under the pointer, or one face of it (Give to Face;
  Shift flips it), or drag a swatch onto the drawing; Esc puts the brush down. A click on the drawing otherwise
  selects what is there, outlined. Both are saved with the drawing set, undone with Ctrl + Z, and drawn on every
  sheet's 3D views and elevations.
- **Right-click and the Move Tool** (0.5.7, PainterlyNPR v0.8.10, the engine's own): right-click the drawing or the
  drawer for the same menus as PainterlyNPR's app (an asset's Move, turn, size, copy, swap, materials and take out; an
  object's or a face's material; the sky's selection, brush and library), each ending with Undo and Redo from AURA's
  history. Delete, Esc, Ctrl + D and M are its keys on this tab. **M** moves the selected asset: it rides the ground
  under the pointer with the insert's footprint marker; hold **Shift** for the gimbal (red, green, blue) to lift or
  lower it; a click sets it down (10 mm steps, one undo step); Esc or M leaves it.
- **Scenes** (0.5.0, SketchUp to LayOut): the 3D Environment's toolbar tabs, after the Saved views icon. A scene is
  what a viewport looks at (a 3D camera, or an elevation or the roof plan square and to scale) with its art direction
  points; every viewport on a sheet shows one, and all follow it. Click a tab to open it (an elevation keeps its
  orientation: pan and zoom only); **+ Add Scene** keeps the camera as a new one; right-click a tab to Rename, Update
  from camera, Duplicate or Delete it. A sheet's "Add a view" lists the scenes first; a viewport's panel picks its
  scene and keeps its own scale, pen, frame, title and pan.
- **Cameras** (0.5.6, the 3D Environment's third section): the **lens** is ValeVision 3D's, a full-frame focal length
  from 24 to 75 mm (the engine's view is a 45 mm lens), its readout typed into; like an orbit, Update from camera keeps
  it in the open scene. Elevations and the roof plan are to scale and have none. **Elevation planes** are TrueVision
  3D's drawing planes: **Show elevation planes** draws every elevation's plane and the roof plan's over the drawing,
  each in its own colour with its scene's name. A plane is where its drawing is cut: nothing in front of it is drawn.
  Drag one by a corner grip or its name and it moves along its own direction only, on the **Snap** grid (10, 25, 50,
  100, 250 or 500 mm from the model's origin; off, to the millimetre); Escape puts it back. Each plane's row takes
  its position typed in millimetres; clear it, or press its cross, for not cut. **Cut elevations at the building** puts
  every elevation's cut 50 mm in front of the building's box, measured from the building drawn (the roof plan is left
  as it is). A plane never moved is not cut: it
  waits, dashed, 1.5 m in front of the building. A cut is the scene's: every viewport of it follows, and undo takes
  it back. Planes never appear on a sheet or in a picture.
- **The panels:** every panel's sections fold (Parameters, Art direction points, Cameras in the 3D Environment),
  and a panel's inner edge drags it wider or narrower (double-click puts it back); both are remembered in this browser.
  The 3D Environment's sections and its parameter sections (Paper and finish, Light, Pen, Wash, Sky) carry line icons,
  `01__AppAssets__AuraRender/UiIcons__MenuIcons__PanelSections` (house ink, the app's own glyph weight).
- **Art direction points** are PainterlyNPR's own, one set a view. Press a type (Focus, Fade to paper, Line control,
  Indication, Hatch, Detail suppression, Drawing discipline, Line run-out), then click the drawing where it should
  act: dropped on an object it anchors there and follows it. Click a point to edit it: its sliders hang beside it;
  drag it, Alt-drag a copy, Delete, Ctrl+D, [ and ] to size, H to switch off, Escape to let go. Opening a scene loads
  its points and edits save into it, while the camera moves too; with no scene open they wait for Add Scene. A scene
  holds 8.
- **Sheets:** ValeVision 3D's Layout Editor layout: the sheet on the left (Sheet, Title block, Revisions), the tools
  over the sheet, the selection on the right (Viewport, Art direction points, Note), both panels resizable.
  **New sheet** (A1, A2, A3 or A4, landscape or portrait). The sheet is the pictures' own paper (0.3.3): the drawing
  set's paper, tone and grain, drawn by the engine, so every picture sits on one sheet. Vale's title column sits at the bottom right in
  landscape and along the foot at the bottom left in portrait, the same size on every sheet (scaled down only on A4).
  The title block holds client, address, title, scale (written from the views when left empty), date, drawing number,
  drawn and checked by, and revisions. A selected viewport's **Art direction points** are edited on its picture while
  that section is open (every viewport of a scene shares its points); the picture shows the drawing as it
  refines, and is drawn again in full when the section folds or the viewport is let go. Moving round a sheet is the
  Layout Editor's:
  the wheel zooms about the cursor, a middle or right drag (or Space and a left drag) pans, two fingers pinch and pan,
  one finger pans from the grey desk, a double tap on the desk fits; F fits, 1 is 100 percent, + and - zoom, Page Up
  and Page Down turn the sheets.
- **Add a view:** the four elevations and the roof plan at 1:20, 1:50, 1:100 or 1:200, or a 3D view (a preset, a saved
  view, or the 3D Environment's view now). Drag to move, drag a handle to resize, Alt and drag inside a scaled view to
  pan it, Delete to remove. A scaled view is at most the engine's own sheet, A3 (420 x 297 mm): the engine draws one sheet that size, its pen
  widths true on the paper. Pictures are drawn by the engine one at a time ("Drawing in pen and wash..."), each for its
  frame (0.5.5, PainterlyNPR 0.8.9): at the frame's true size, so a 3D view's pens, grain and bleed are their real
  millimetres too, with the engine's vignette fitted inside the frame. They are lossless PNG; a resized frame is drawn
  again once it rests, its last picture standing in, pale.
- **Notes:** the **Note** tool (N) places words where you press; the **Leader** tool (L) is pressed on what it points at
  and dragged to where the words go. The panel holds the words, letter height, ink, hand, **Letters**, **Pen** and
  **Write a new copy**. Size the box by dragging the handle on either side of a selected note; the words wrap to it.
- **Letters:** a note is lettered in drawn **architect's capitals** (the default: single-stroke capitals, neat, never
  misspelt, drawn at once with no download) or written in **joined-up handwriting** by the model in the browser (a
  moment a line, shown line by line as it is written; the first on a device waits while the 15 MB model is fetched,
  once). The model cannot write capitals, so in a joined-up note anything typed in capitals is drawn in capitals.
  The title block's entries and the viewport titles are lettered in capitals too.
- **Pens:** a note and its leader are drawn with a STAEDTLER Mars matic 700 technical pen, one width throughout:
  0.13, 0.18 (the default, the lettering pen), 0.25 or 0.35 mm, the same four as PainterlyNPR's linework. The sheet
  is drawn in paper millimetres, so the pen is its true width when the sheet prints at 100% on its own paper; the
  panel says so, what it measures printed on a smaller paper (an A1 sheet on A3 halves it), and how wide it shows
  on screen now (under a pixel it looks paler than it prints). A new pen redraws the note at once.
- **Advanced writing style** (a fold under the note's panel): every setting of the writing model and its layout, a
  note at a time: neatness and the model's retries, letter check and step limits; line spacing, phrase lengths,
  wrapping, word and space gaps, margin; variation, slant, baseline wave and tilt; the pen's width mode (technical,
  or the studio's variable weight), exact numbers, and the copy number. It starts from the note's hand; a change is
  the note's own; **Back to the hand**, or choosing a hand, clears them. Hover a setting for what it does; its value
  can be typed.
- Saving is automatic, a moment after each change. If someone else saved the same drawing set first, nothing is
  overwritten: AURA says so and offers to load theirs. Ctrl + R or F5 asks first: save and refresh, cancel, or abandon
  the changes.
- **Undo and redo:** Ctrl + Z undoes the last change to the drawing set, anywhere in AURA, and opens the tab it was
  made on; Ctrl + Y or Ctrl + Shift + Z redoes it (Cmd on a Mac or iPad keyboard), as do the two arrows in the header.
  The last 100 changes back and 100 forward, for this visit. A drag or a run of typing is one change; in a text box
  the keys undo its words. The 3D camera is not undone.

## Run It on This PC

```bat
python ..\Server__DeveloperTools\ValeDev__LocalServer__.py
```

Then open <http://127.0.0.1:8030/aura/?project=64135__Holt>, signed in as a Manager or App Admin, once the project is
ticked **Available in ValeVision AURA** in the Gallery's Project Editor (<http://127.0.0.1:8030/project-gallery/>, the
menu). The dev server mounts AURA's API itself. The handwriting needs its model beside the API
(`Server__Api\Api__ValeVision__AuraRender\Content__AuraHandwritingModel\`); on a new PC, build it once with
`60__Dev__WebBuildUtils\AuraRender__BuildUtil__HandwritingWeights__.py` (the engine's README says how).

## Not Yet

- For a project's own model (0.5.4 draws it): storing a placed asset's MOD and DAT in the scene's
  `Content__AuraScene__AssetFiles` (the pin has no `.glb` yet); brick indication and window shadow lines on it (a GLB
  carries no surfaces); method two, ValeVision Cloud Sync's AURA export tab (a Painterly Scene Package into
  `Content__AuraScenePackages`).
- Cross sections and floor plans with their cut faces filled: since 0.5.6 an elevation or the roof plan can be cut,
  its cut faces left open (no poche).
- The elevation planes drawn behind the building where it stands in front of them (they are drawn over the drawing),
  Perspective Correction for the lens (an engine seam: the engine has no lens shift yet), and moving a plane to a
  picked face (TrueVision's Move to face).
- PDF and print export of a sheet. Its pictures are already 300 dpi on the paper (`AuraConfig__Viewport__RenderDpi`, AURA 0.4.3).
- Scaled views larger than the engine's A3 sheet (420 x 297 mm).
- The install card (`Shared__AppInstall`) and a `/help/install-app/` entry; the Server Manager's activity tab names
  `/aura/` as a route only once its `Vsm__AppRoutes` list has it.

## History

See `AuraRender__DEVLOG__.md`.
