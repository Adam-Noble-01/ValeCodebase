# ValeVision AURA

Vale Garden Houses' pen and wash drawing app, at <https://app.valegardenhouses.com/aura/>. It draws a project in
British architectural pen and wash with Adam's own renderer, **PainterlyNPR**, and lays the drawings out on Vale's
drawing page with handwritten notes. AURA is the third way Vale shows a 3D model, beside Whitecard and MaxModels in
ValeVision 3D: a Whitecard or MaxModel is carried into AURA and drawn by the AURA library.

## Who Sees What

| Who | Gets |
|---|---|
| **Managers and App Admins** (the shared Vale sign-in) | `/aura/?project=<library id>`, from ValeVision Gallery: an AURA icon on project cards that have a 3D model, and **Open in AURA** on every project page |
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
  engine runs on a PC for now and will be rewritten for WebAssembly; its binaries, like the engine's, will be served
  as static files and kept on the device by AURA's service worker. The AURA API only reads and writes small JSON files.

## How It Works

| Part | Where |
|---|---|
| The page (static, plain ES modules, no build step) | this folder, served by nginx at `/aura/` |
| The core engine (PainterlyNPR v0.5.0 at 29bbcf1) | `04__Lib__CoreEngine__VersionLocked/01__CoreLib__PainterlyNPR__v0.5.0/`, reached as `PainterlyNPR/...` through the import map |
| The API (Flask) | `Server__Api\Api__ValeVision__AuraRender\wsgi.py`, proxied at `/aura/api/` (systemd `vale@ValeVision__AuraRender`, port 8006) |
| Config (read by the page through `api/config` and by the API) | `02__Src__AppModules/02__AppData/Na__AppConfig__AuraRender__.json` |
| A project's drawing set | `Vale__Projects__MasterLibrary\ValeProjects__<year>\<id>\ValeVision__AuraRender\UserData__AuraDrawings\<id>__AuraDrawingSet__.json` (user data: the API only); schema: the `.example` in the schema project |
| The handwriting engine (PC only) | `02__Src__AppModules/31__System__Handwriting/01__Engine__PythonReference/` (its own README) |

### The modules (`02__Src__AppModules`)

| Folder | What it does |
|---|---|
| `01__AppCore` | Start-up, the shared sign-in and the level gate, the app state and its events, the config |
| `02__AppData` | The app config |
| `03__AppUtils` | The API client, DOM builders and line icons, toasts, ids and dates |
| `10__System__EngineHost` | The one door to PainterlyNPR: boot, camera, parameters, settings, stills for the sheets |
| `11__System__Environment3d` | The 3D Environment tab: the engine's live drawing, orbit and zoom, presets, saved views, parameters |
| `20__System__DrawingSheets` | Vale's drawing page (A1 to A4, landscape and portrait), the title block, the sheet surface, tabs, the workspace |
| `21__System__Viewports` | Elevations and the roof plan to scale, 3D views, their cameras, the render queue, editing |
| `30__System__Annotations` | Handwritten notes and leader notes on the sheet |
| `31__System__Handwriting` | The handwriting client, the studio's hand-drawn leader arrows, and the Python engine (PC only) |
| `40__Feature__DrawingSet` | The drawing set document, and saving it |

## Using It

- **3D Environment:** drag to orbit; scroll, or press + and -, to move nearer or further (the camera moves; the page
  never magnifies). The drawing shows the engine's quick preview while the camera moves and refines into pen and wash
  when it rests. The presets are the engine's; **Save view** keeps the camera for a sheet's 3D viewport. The
  parameters are the engine's own controls (light, pen, wash, sky, paper), saved with the project's drawing set.
- **Sheets:** **New sheet** (A1, A2, A3 or A4, landscape or portrait). Vale's title column sits at the bottom right in
  landscape and along the foot at the bottom left in portrait, the same size on every sheet (scaled down only on A4).
  With nothing selected, the panel holds the title block: client, address, title, scale (written from the views when
  left empty), date, drawing number, drawn and checked by, and revisions.
- **Add a view:** the four elevations and the roof plan at 1:20, 1:50, 1:100 or 1:200, or a 3D view (a preset, a saved
  view, or the 3D Environment's view now). Drag to move, drag a handle to resize, Alt and drag inside a scaled view to
  pan it, Delete to remove. A scaled view is at most 300 x 200 mm: the engine draws one sheet that size, its pen
  widths true on the paper. Pictures are drawn by the engine one at a time ("Drawing in pen and wash...").
- **Notes:** the **Note** tool (N) places words where you press; the **Leader** tool (L) is pressed on what it points at
  and dragged to where the words go. The panel holds the words, letter height, width, ink, hand and **Write a new
  copy**. A note is written by the handwriting engine; until then it shows typed and pale.
- Saving is automatic, a moment after each change. If someone else saved the same drawing set first, nothing is
  overwritten: AURA says so and offers to load theirs.

## Run It on This PC

```bat
python ..\Server__DeveloperTools\ValeDev__LocalServer__.py
```

Then open <http://127.0.0.1:8030/aura/?project=64135__Holt>, signed in as a Manager or App Admin. The dev server mounts
AURA's API itself. The handwriting runs here when the Vale Handwriting Studio's `.venv` is in its place
(`Dev__EarlyStageDev__TestingFiles\Experiment__HandwritingTest`) or `AURA_HANDWRITING_PYTHON` names a Python with torch.

## Not Yet

- A project's own AURA model: ValeVision Cloud Sync's AURA export tab (a Painterly Scene Package into the project's
  `ValeVision__AuraRender/Content__AuraScenePackages`). Until then every project draws the engine's demo cottage.
- Cross sections and floor plans (the roof plan is a plan from above).
- The handwriting in the browser (WebAssembly), so notes are written on the live server too.
- PDF and print export of a sheet; 2x print-quality pictures (`AuraConfig__Viewport__RenderScale`).
- Scaled views larger than the engine's 300 x 200 mm sheet.
- The install card (`Shared__AppInstall`) and a `/help/install-app/` entry; the Server Manager's activity tab names
  `/aura/` as a route only once its `Vsm__AppRoutes` list has it.

## History

See `AuraRender__DEVLOG__.md`.
