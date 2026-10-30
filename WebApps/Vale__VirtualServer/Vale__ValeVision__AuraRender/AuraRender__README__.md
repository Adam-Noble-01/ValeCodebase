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

- **Nothing in AURA edits the engine.** A change goes into PainterlyNPR (by its own rules: committed only on Adam's
  word), then the sync script brings the new version into a new folder of `04__Lib__CoreEngine__VersionLocked`, and
  the import map in `index.html` (and its record `Vale__CoreEngine__ImportMap__Index__.json`) moves to it.
- **Only `02__Src__AppModules/10__System__EngineHost` imports the engine.** It boots it the way PainterlyNPR's own
  AppCore Init does, minus PainterlyNPR's panel; when the Noble Architecture wrapper needs the same seam it moves into
  PainterlyNPR as `07__System__LibraryHost` (Adam's call, 30-Oct-2026: in AURA for now).
- **Heavy work runs on the user's own machine, never on the server** (Adam, 30-Oct-2026: the server is resource
  constrained). The engine draws in the browser (WebGL 2 today; WebGPU and WebAssembly to come). The handwriting
  engine runs in the browser too, in WebAssembly (since AURA 0.2.1): its modules are served as static files, and its
  15 MB model, sent once to signed-in staff by the API, is kept on the device. The AURA API only reads and writes
  small JSON files and sends files.

## How It Works

| Part | Where |
|---|---|
| The page (static, plain ES modules, no build step) | this folder, served by nginx at `/aura/` |
| The core engine (PainterlyNPR v0.6.0 at e28fba5) | `04__Lib__CoreEngine__VersionLocked/01__CoreLib__PainterlyNPR__v0.6.0/`, reached as `PainterlyNPR/...` through the import map |
| The API (Flask) | `Server__Api\Api__ValeVision__AuraRender\wsgi.py`, proxied at `/aura/api/` (systemd `vale@ValeVision__AuraRender`, port 8006) |
| Config (read by the page through `api/config` and by the API) | `02__Src__AppModules/02__AppData/Na__AppConfig__AuraRender__.json` |
| A project's drawing set | `Vale__Projects__MasterLibrary\ValeProjects__<year>\<id>\ValeVision__AuraRender\UserData__AuraDrawings\<id>__AuraDrawingSet__.json` (user data: the API only); schema: the `.example` in the schema project |
| The handwriting engine (WebAssembly, in a Web Worker) | `02__Src__AppModules/31__System__Handwriting/02__Engine__Wasm/` (its own README); built and checked by `60__Dev__WebBuildUtils/AuraRender__BuildUtil__Handwriting*`; the Python it came from is the reference in `01__Engine__PythonReference/` |
| The handwriting model (15 MB, signed-in staff only) | `Server__Api\Api__ValeVision__AuraRender\Content__AuraHandwritingModel\` (the weights are git-ignored), sent by `api/handwriting/model` and `api/handwriting/weights/<sha256>` |

### The modules (`02__Src__AppModules`)

| Folder | What it does |
|---|---|
| `01__AppCore` | Start-up, the shared sign-in and the level gate, the app state and its events, the config |
| `02__AppData` | The app config |
| `03__AppUtils` | The API client, DOM builders and line icons, toasts, ids and dates, the panels' folding sections and resize grips, the undo history's snapshot store |
| `10__System__EngineHost` | The one door to PainterlyNPR: boot, camera, parameters, settings, Art Direction Points (the engine's own editor, lent to a sheet's viewport while its points are edited), stills for the sheets |
| `11__System__Environment3d` | The 3D Environment tab: the engine's live drawing and its navigation, presets, saved views with their points, the Art direction points section, parameters |
| `20__System__DrawingSheets` | Vale's drawing page (A1 to A4, landscape and portrait), the title block, the sheet surface, tabs, the workspace, and the sheets' navigation (the Layout Editor's, with its key map `Na__Hotkeys__DrawingSheets__.json`) |
| `21__System__Viewports` | Elevations and the roof plan to scale, 3D views, their cameras and points, the render queue, editing, and a viewport's Art direction points edited on its picture |
| `30__System__Annotations` | Handwritten notes and leader notes on the sheet |
| `31__System__Handwriting` | The handwriting client, the studio's hand-drawn leader arrows, the WebAssembly engine, and the Python reference it was ported from |
| `40__Feature__DrawingSet` | The drawing set document, saving it, the refresh guard, and undo and redo (with its key map `Na__Hotkeys__DrawingSet__.json`) |

## Using It

- **3D Environment:** ValeVision 3D's orbit mode, without the helper cube (the engine's `74__Camera__Navigation`).
  Left drag orbits; right drag, or Ctrl or Shift and a left drag, pans; middle drag dollies; the wheel zooms (the
  camera moves; the page never magnifies). One finger orbits, two pinch and pan. W A S D and the arrows move the
  camera, Q and E lower and raise it (Alt finer, Shift moving the target too); R returns to the last preset; + - 0
  zoom. The drawing shows the engine's quick preview while the camera moves and refines into pen and wash when it
  rests; **Rendered | Proxy** in the toolbar (or Shift + R) keeps it the quick preview to work in. The presets are the
  engine's; **Save view** keeps the camera and its art direction points for a sheet's 3D viewport (a name in use
  replaces that view). The parameters are the engine's own controls (light, pen, wash, sky, paper), saved with the
  project's drawing set.
- **The panels:** every panel's sections fold (Saved views, Art direction points, Parameters in the 3D Environment),
  and a panel's inner edge drags it wider or narrower (double-click puts it back); both are remembered in this browser.
- **Art direction points** are PainterlyNPR's own, one set a view. Press a type (Focus, Fade to paper, Line control,
  Indication, Hatch, Detail suppression, Drawing discipline, Line run-out), then click the drawing where it should
  act: dropped on an object it anchors there and follows it. Click a point to edit it: its sliders hang beside it;
  drag it, Alt-drag a copy, Delete, Ctrl+D, [ and ] to size, H to switch off, Escape to let go. Picking a saved view
  loads its points and edits save into it; moving the camera off it brings the points along, unsaved. A view holds 8.
- **Sheets:** ValeVision 3D's Layout Editor layout: the sheet on the left (Sheet, Title block, Revisions), the tools
  over the sheet, the selection on the right (Viewport, Art direction points, Note), both panels resizable.
  **New sheet** (A1, A2, A3 or A4, landscape or portrait). Vale's title column sits at the bottom right in
  landscape and along the foot at the bottom left in portrait, the same size on every sheet (scaled down only on A4).
  The title block holds client, address, title, scale (written from the views when left empty), date, drawing number,
  drawn and checked by, and revisions. A selected viewport's **Art direction points** are edited on its picture while
  that section is open (a saved view's 3D viewport shares the view's points); the picture shows the drawing as it
  refines, and is drawn again in full when the section folds or the viewport is let go. Moving round a sheet is the
  Layout Editor's:
  the wheel zooms about the cursor, a middle or right drag (or Space and a left drag) pans, two fingers pinch and pan,
  one finger pans from the grey desk, a double tap on the desk fits; F fits, 1 is 100 percent, + and - zoom, Page Up
  and Page Down turn the sheets.
- **Add a view:** the four elevations and the roof plan at 1:20, 1:50, 1:100 or 1:200, or a 3D view (a preset, a saved
  view, or the 3D Environment's view now). Drag to move, drag a handle to resize, Alt and drag inside a scaled view to
  pan it, Delete to remove. A scaled view is at most 300 x 200 mm: the engine draws one sheet that size, its pen
  widths true on the paper. Pictures are drawn by the engine one at a time ("Drawing in pen and wash...").
- **Notes:** the **Note** tool (N) places words where you press; the **Leader** tool (L) is pressed on what it points at
  and dragged to where the words go. The panel holds the words, letter height, width, ink, hand and **Write a new
  copy**. A note is written by the handwriting engine in the browser (a moment a line; the first note on a device
  waits while the 15 MB model is fetched, once); until then it shows typed and pale.
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

- A project's own AURA model: ValeVision Cloud Sync's AURA export tab (a Painterly Scene Package into the project's
  `ValeVision__AuraRender/Content__AuraScenePackages`). Until then every project draws the engine's demo cottage.
- Cross sections and floor plans (the roof plan is a plan from above).
- PDF and print export of a sheet; 2x print-quality pictures (`AuraConfig__Viewport__RenderScale`).
- Scaled views larger than the engine's 300 x 200 mm sheet.
- The install card (`Shared__AppInstall`) and a `/help/install-app/` entry; the Server Manager's activity tab names
  `/aura/` as a route only once its `Vsm__AppRoutes` list has it.

## History

See `AuraRender__DEVLOG__.md`.
