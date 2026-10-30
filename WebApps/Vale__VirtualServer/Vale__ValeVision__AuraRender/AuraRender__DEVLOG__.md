# ValeVision AURA: DEVLOG

## Version 0.3.1, 30-Oct-2026: Undo and Redo

**Asked by Adam:** "Add a comprehensive user undo / redo caching system to both The NPR Demo Environment and Aura so
to both apps to store 100 undos and 100 redos then add control +z and control + y as keyboard mappings". **His calls:**
one history for the whole drawing set, Ctrl + Z opening the tab the change was on; Undo and Redo buttons as well as
the keys; kept for this visit only. PainterlyNPR's half is its v0.7.4.

**Built:**
- **`40__Feature__DrawingSet/Na__DrawingSet__History__.js`** (1.0.0): one history for the whole drawing set, 100 steps
  back and 100 forward (`AuraConfig__History__MaxUndo`, `__MaxRedo`). A step is the drawing set but its Meta: sheets
  and title blocks, viewports, notes and leaders, saved views, art direction points and the engine's settings; adding
  and deleting a sheet too. The 3D camera, the open tab, the zoom, the selection and the tool are not edits.
  - Every edit is already announced (`Na__AppState__Touch`); it becomes a step once it has settled (400 ms with no
    pointer button held; 1.2 s in a text box, or when the box is left), so a drag or a run of typing is one step. A
    note's handwriting arriving (`ink`) is written into the step that made the note, never a step of its own. What is
    announced before the first key or press (the drawing set opening) is the starting point.
  - Undo writes the step back into the live records by Id, as the Layout Editor's history writes into its sheet
    record: a sheet, viewport, note or saved view still there is the same object, its lists the same arrays. Engine
    settings that differ are applied again (the viewports redraw); handwriting seen before comes back from a small
    cache (120 notes), so an undone note is not written again. The restore is saved like the edit it reverses (a
    Touch with that edit's reason), then `restored` is announced on the app state ({ direction, reason, label, tab }).
  - It opens the tab the change was made on (a sheet the undo brings back first, so undoing a deletion shows the
    sheet); AuraApp keeps the selection if it is still on that sheet. The art direction modules (0.3.0) listen to
    `restored` and take their points from the drawing set again.
  - Each step is named for the arrows' titles: "Move a view", "Resize a view", "Add a note", "Change a note's words",
    "Move a leader's arrow", "Delete a sheet", "Change the title block", "Change the parameters", "Save a view" ...
    else "Several changes".
- **`40__Feature__DrawingSet/Na__Hotkeys__DrawingSet__.json`**: the keys, in the sheets' key map's form: `Edit__Undo`
  Ctrl + Z, `Edit__Redo` Ctrl + Y and `Edit__RedoShift` Ctrl + Shift + Z (the Layout Editor's three), and Cmd + Z and
  Cmd + Shift + Z for a Mac or an iPad keyboard. On every tab; in a text box they are the box's own undo; an open
  dialog (New sheet, the refresh guard) keeps them.
- **`03__AppUtils/Na__AppUtils__SnapshotStore__.js`**: PainterlyNPR v0.7.4's snapshot store, ported: whole snapshots,
  each part of 512 characters or more kept once under a hash of its text and shared by every step that holds it, so a
  note's pen paths are kept once however many steps it is in.
- **The header**: two quiet arrows before the save state (`#auraHistory` in `index.html`; the `undo` and `redo` icons
  in `Na__AppUtils__Dom__`; their styles in the App stylesheet's Header region), greyed when there is nothing, titled
  "Undo: Move a view (Ctrl + Z)", a navy flash when used. They are how a tablet without a keyboard undoes.
- **AuraApp** starts the history after the refresh guard and answers `restored` (`Na__Aura__Restored`). **AppState**
  lists the new event. **Config**: `AuraConfig__History__*`; `AuraConfig__App__Version` 0.3.1.

**Checked here (no browser):** every module parses and every import resolves (33 modules, 162 imports; the only flags
are other modules' browser globals the checker does not know, DOMPoint and WebAssembly). The history itself in Node,
with AURA's own AppState, snapshot store and key map, and stand-ins for the engine, the handwriting and the page: a
drag is one step ("Move a view"), Ctrl + Z puts it back into the same viewport object on its sheet's tab and is saved,
Ctrl + Y and Ctrl + Shift + Z redo; a deleted sheet comes back and its tab opens; a parameter is undone by applying the
engine's settings again (from a new set's null too); typing in a note is one step, and Ctrl + Z in its box is the
box's; a note's handwriting arriving amends its step and comes back with the undo; 130 steps keep 100 undos and give
100 redos; a new edit after an undo clears the redos. 101 steps of a set with a handwritten note took a thirty-ninth of
the room of whole copies.

**Not checked:** anything in a browser (Adam tests): the arrows in the header, the tab reopening, the viewports
redrawing after a parameter is undone, an iPad.

**Not yet:**
- Kept for this visit only (Adam's call): a reload starts a fresh history.
- The 3D Environment's camera is never undone: it is not in the drawing set (a saved view is).
- The push is the `aura` lane on its own; no server change.

(Uncommitted in git, waiting on Adam.)

## Version 0.3.0, 30-Oct-2026: Panels That Fold and Resize, Art Direction Points a View

**Asked by Adam:** "Make the parameters and Saved views sections dropdowns / then add a new section for the Art
Direction Points / then call off the systems from the NPR renderer system so EACH VIEW in Aura gets its own setup of
different art direction nodes / in the drawing editor do the same thing and add dropdown sections with the art
direction points asvailbe per viewport to edit on the 2d page too. Look at ValeVision 3D's layout editor I want the
same two panel layout with dropdown sections etc and 2x resizable panels" (with screenshots: the 3D panel's two
section titles marked, and the sheet tab with its tools to move and its Sheet panel to the left).

**Adam's calls:** a sheet viewport of a saved view draws with that saved view's points (one set a view, edited in the
3D Environment or on the sheet); the tools go over the sheet, between the panels, as ValeVision 3D's Layout Editor
has them; once a saved view is picked, only its points save into it (the camera moving off it leaves it as it was).

**Built:**
- **Folding sections and resizable panels** (`03__AppUtils/Na__AppUtils__Panels__.js`, new, after the Layout Editor's
  PanelHost): a section is a header with its title, a count and a chevron, folded or open as this browser last left
  it; a panel's inner edge is a 6 px grip (drag, arrow keys, Home, double-click), its width a custom property on the
  tab, between `AuraConfig__Panels__WidthPx` Min and Max, kept in this browser. Styles:
  `Na__CoreUi__Styles__Panels__.css` (new).
- **The 3D Environment's panel** (Stage 1.3.0): Saved views, Art direction points, Parameters, each folding (the
  parameter groups fold inside as before), the panel resizable.
- **Art direction points, the engine's own** (`11__System__Environment3d/Na__Environment3d__ArtDirection__.js`, new):
  PainterlyNPR's point editor (65__ArtDirection__InfluencePoints: handles and rings over the drawing, the selected
  point's node of sliders beside it, its list with groups and eyes, typable readouts, its own stylesheets) on a layer
  over AURA's canvas; a button a point type (press it, click the drawing; Esc cancels), placed and anchored exactly as
  the engine's own sheet places them (`Na__EngineHost__PlacePoint`); the engine's keys (Delete, Ctrl+D, [ ], H,
  Escape); Show influence. The handles show while the section is open.
- **One set a view:** a saved view keeps its camera and its points (`View__Points`); picking one loads both, point edits
  save into it, and moving the camera off it brings its points into the unsaved view
  (`AuraDrawingSet__Engine.WorkingPoints`: inside Engine because the AURA API takes only its four root keys). Save
  view under a name in use replaces that view, camera and points, after asking. The saved views list lights the one
  being edited and shows each one's points.
- **Stills draw with their view's points** (engine host 1.4.0, render queue 1.1.0): a viewport of a saved view with the
  view's, every other viewport with its own (`Viewport__Points`); the points are in each picture's key.
- **The sheet tab in the Layout Editor's layout** (Workspace 1.2.0, index.html): the sheet's panel on the left (Sheet,
  Title block, Revisions), the tools over the sheet, the selection's panel on the right (Viewport, Art direction
  points, Note), both resizable.
- **Points edited on the 2D page** (`21__System__Viewports/Na__Viewports__ArtDirection__.js`, new): while a selected
  viewport's Art direction points section is open, the live engine is lent to it (`Na__EngineHost__Borrow`): the
  engine's handles and node lie over its picture, the picture shows the live drawing as it refines, a point dropped
  on the picture anchors to what lies under it, the keys come before the sheet's (Delete removes the point, not the
  viewport), and the other stills wait. Fold the section, select something else or change tab, and the engine goes
  back to the 3D Environment (`Release`) and the viewport's still is drawn again in full.
- Undo and redo (the history session's 'restored' event): the 3D Environment takes its points again from the
  document, and a viewport being edited lets the engine go.

**Checked here (no browser):** every AURA module parses (35) and every named import resolves to an export (405), the
engine's included; the config JSON reads.

**Not checked:** anything in a browser (Adam tests): the engine's editor over AURA's canvas and over a viewport, its
stylesheets in AURA, placing and anchoring on the sheet, the previews, the grips and folds.

**Not yet:** points cannot be renamed or reordered (the engine's own editor cannot yet); a preset or elevation in the
3D Environment has no points of its own (they belong to the unsaved view until it is saved). App__Version is left to
the last of the 0.3.x jobs to land (the coordinating session's rule). (Uncommitted, waiting on Adam.)

## Version 0.2.2, 30-Oct-2026: Rendered or Proxy, and a Guard on Refresh

**Asked by Adam:** "Add toggle to aura for proxy view / rendered view ... To both apps add the hotkey shift + R ... add
a guard modal that pops up if you hit control + r warning you will lose progress if you refresh would you like to save
/ cancel refresh/ abandon the changes". His calls: Shift + R toggles Proxy / Rendered; the guard shows every time;
Ctrl + R, F5 and the browser's own warning are covered.

**Built:**
- **Rendered | Proxy** in the 3D Environment's toolbar, after New seed (Stage 1.2.0): Proxy keeps the live view the
  engine's quick preview and never refines into pen and wash, so the scene can be worked on without the renderer
  kicking in; Rendered refines when the camera rests. The engine's own work mode (`RenderGraph SetProxy`, PainterlyNPR
  v0.6.0), through the host's new `Na__EngineHost__WorkMode` / `SetWorkMode` (host 1.3.0). Remembered per viewer
  (`AuraRender.WorkMode`). Only the live view: a sheet's picture always runs the whole graph, rendered.
- **Shift + R** switches it while the 3D tab is open, with a toast. It is taken in the capture phase, ahead of the
  engine's navigation, whose R alone resets the camera (the pinned v0.6.0 has no NoShift on R yet; PainterlyNPR v0.7.1
  adds it).
- **The refresh guard** (`40__Feature__DrawingSet/Na__DrawingSet__RefreshGuard__.js`, started beside the autosave in
  AuraApp): Ctrl + R, Ctrl + Shift + R, Cmd + R and F5 open AURA's dialog: **Abandon changes** (refresh without
  saving), **Cancel refresh**, **Save and refresh** (the autosave's save, at once; the page refreshes only once the
  drawing set is saved, and a refused save keeps the guard up with the save's own message). It shows every time and
  says whether anything is unsaved. The reload button and closing the tab keep the browser's own "Leave site?", which
  the autosave already asks only with unsaved changes.

**Checked here (no browser):** every changed module parses; all 298 named imports resolve against the pinned
PainterlyNPR v0.6.0 (`SetProxy` included).

**Not yet:** not checked in the browser (Adam tests); not pushed.

(Uncommitted in git, waiting on Adam.)

## Version 0.2.1, 30-Oct-2026: The Handwriting in WebAssembly

**Asked by Adam:** "the handwriting system was never implkemented by the last agent ... Refactor the Hanmdwriting
tool from python to WASM so the Valer Server can send the binary for client side to cache and execute to get
realistic handwritten text. This demo did an excellent job at creating realistic handwritten text and hand drawn
realisic leaders" (the Vale Handwriting Studio, `Dev__EarlyStageDev__TestingFiles\Experiment__HandwritingTest`).
**His calls:** the weights "Signed-in only"; the compiler "AssemblyScript"; the weights "32-bit, 15 MB"; the PC's
Python path "Retire it".

**Built:**
- **The engine in the browser** (`31__System__Handwriting/02__Engine__Wasm`, its own README): the studio's Graves
  network (three peephole LSTMs, the soft window over the words, the mixture of pen movements, the sampling loop and
  its end-of-words test) in AssemblyScript, built into two WebAssembly modules of 13 KB: SIMD, and scalar for a
  browser without SIMD. Both sum every output in the same order with their own maths compiled in, so a note's
  words, settings and seed write the same strokes on every device. The studio's `neural_strokes`, `validate` and
  `render` (four tries with a calmer pen, the coverage check, levelling, wrapping, protected numbers, slant, baseline,
  pen weight, Catmull-Rom curves) ported line by line to JavaScript, all run in a Web Worker so the sheet stays live.
- **The model**: the Epoch 46 checkpoint's own 32-bit weights (15 MB) laid out for the network by
  `60__Dev__WebBuildUtils/AuraRender__BuildUtil__HandwritingWeights__.py` into
  `Server__Api/Api__ValeVision__AuraRender/Content__AuraHandwritingModel` (never web-served; the `.bin` git-ignored,
  its manifest committed). The worker fetches it once per device after checking its SHA-256 and keeps it in an
  `aura-pen-<hash>` cache; a sheet whose notes are all written never fetches it.
- **The API (1.2.0)**: `handwriting/model` (the manifest) and `handwriting/weights/<sha256>` (the weights), both
  behind `require_access` (Managers and App Admins). `handwriting/status` and `handwriting/write` are gone, and with
  them the PC's Python worker (`AuraRender__Handwriting__Worker__.py`, deleted; git keeps it). With
  `VALE_ACCEL_REDIRECT=1` in the service's env nginx streams the weights; without it Flask sends them.
- **The client (2.0.0)**: `Na__Handwriting__Status` loads the engine (the manifest through the API client, then the
  worker), `Na__Handwriting__Write` asks it. The ink keeps its shape and key, so notes already written stay written.
  The note panel (`Na__Annotations__Layer__` 1.1.0) says "Fetching the handwriting engine (15 MB, once on this device),
  then writing this note..." while the first note waits.
- **Two changes from the studio**, both visible in its own ink: (1) no stray dot after each phrase (the pen setting
  down in the padding spaces as the model stopped; the last path of every phrase in its `demo-ink.json`); (2) the
  explicit m has two arches, so "2400 mm" no longer reads "2400 mmm".
- **Paths are half the size** in the drawing set (0.01 mm, relative segments: 33 KB for a two-line note against the
  studio's 77 KB), which matters with whole-document autosaves and the 4 MB limit.
- **Service worker** `2026-10-30-4`: never deletes `aura-pen-` caches (the model survives app updates). **Config**:
  `AuraConfig__App__Version` 0.2.1, `Handwriting__WhereItRuns` rewritten, `Handwriting__ModelNote` added.
- **Dev tools** (`60__Dev__WebBuildUtils`, never synced): `package.json` and its lock (AssemblyScript 0.28.20 and
  binaryen, 106 MB in `node_modules`, git-ignored; `npm ci`), the build (`...HandwritingWasm__.mjs`), the parity check
  against torch (`...HandwritingParity__.py` and `.mjs`) and a proof sheet (`...HandwritingProof__.mjs`).

**Checked here (no browser):** the WebAssembly network against the toolkit's own torch network, step by step along
858- and 490-step pen paths: every mixture weight, mean, spread, correlation, lift chance and window weight within 2e-5;
the SIMD and scalar builds identical to the bit, on every step and on whole sampled phrases; a seed repeats exactly.
0.27 ms a pen step with SIMD (0.9 scalar) in Node: the studio's demo notes in 0.2 to 1.2 s each. The proof sheet
(the studio's demo and quality phrases through the worker's own modules) looked at: real, joined handwriting; the
dot and the m were found there. The worker module driven in Node with stand-ins for the browser: SIMD chosen, the
weights fetched once and checked, a stale `aura-pen-` cache dropped, a second start served from the cache with the
same ink, curly quotes and symbols written, unwritable characters named. The API with Flask's test client: 401
signed out, the manifest and the exact 15,093,440 bytes for a Manager, 304 on a repeat, 404 for a stale hash, the
nginx header when switched on. All 31 modules parse; all 242 named imports resolve.

**Not checked:** anything in a browser (Adam tests): the worker in Edge, the first note's 15 MB fetch and the panel's
line, an iPad (Safari: SIMD from 16.4, the scalar build before), offline.

**Live (Adam: "Push after my test", then to the engine sync session "push eveything ready so i can test"):** a push
after 12:38 UTC that is not in this PC's `sessions.log` carried it (`aura` and `server-api`, the 15 MB weights
included); the engine sync session restarted `vale@ValeVision__AuraRender` at 13:18 UTC (server changelog). Checked
through Cloudflare at 13:19 UTC, signed out: the ten changed files byte-identical to this PC (both WebAssembly
modules, the worker and its three modules, the client, the annotation layer, the config, the service worker);
`api/handwriting/model` and `api/handwriting/weights/<sha256>` 401; `api/handwriting/status` 404; the weights and
manifest 404 straight from `Server__Api`. The signed-in path is Adam's test. The `vgh-app-server` skill's section 13
and its live-state line now describe the new routes.

**Not yet:**
- Optional: `VALE_ACCEL_REDIRECT=1` in `/etc/vale/apps/ValeVision__AuraRender.env`, so nginx streams the weights
  (today Flask sends them, once per device).
- Explicit numbers stand as tall as a whole phrase of handwriting (the studio's sizing), so in a mixed line they are
  taller than the small letters. Not changed.
- The model still misforms a letter now and then (the studio's model); every note says to proofread.

(Uncommitted, waiting on Adam.)

## Version 0.2.0, 30-Oct-2026: Engine Synced to PainterlyNPR v0.6.0

**Asked by Adam:** "Ensure the painted area by default fills up more veritcal height ... THIS SHOULD APPLY TO THE
VIEWPORTS BOTH IN AURA AND The NPR Viewer app" (the foot of every view was blank paper), then "Yes, when they're done"
to committing PainterlyNPR and syncing it into AURA once the other sessions had finished.

**Changed:**
- The engine is PainterlyNPR **v0.6.0 at e28fba5**, synced into `04__Lib__CoreEngine__VersionLocked/01__CoreLib__PainterlyNPR__v0.6.0`
  (211 files; `--check` clean). The import map in `index.html` and its record now point there. The v0.5.0 folder is
  kept until Adam has checked this version, then removed by hand.
- What AURA gains from the engine:
  - v0.5.3, the vignette: the paint is half gone about 24 mm above the foot of the sheet instead of 52 mm, so the 3D
    Environment and every viewport show the foreground, the fence and the base of the building.
  - v0.5.4, the 3D navigation that 0.1.3's engine host imports (`74__Camera__Navigation`). Without this sync AURA
    could not start up.
  - v0.5.2, the controls' own `Parse`, which `Na__EngineHost__Control` prefers to AURA's mirror.
  - v0.6.0, the asset library: nothing in AURA uses it yet.
- `AURA_VERSION` is `2026-10-30-3`, so a browser drops the cache-first copy of the old engine.
- Engine host 1.2.0: Boot keeps the scene's vertex buffer as `Gpu.Buffers.Scene`, as the engine's Init now does. Init's
  only other change builds the engine app's own Assets drawer, which AURA does not have. All 49 named imports from
  `PainterlyNPR/` resolve in the new copy.

**Not yet:**
- Not run in the browser here: Adam tests it locally. Nothing is pushed.
- The `aura` lane must be pushed together with this folder, `index.html` and the service worker, never on its own.
- `Na__Format__ParseReadout`, the mirror of the engine's Parse, can go once Adam has checked v0.6.0.

## Version 0.1.3, 30-Oct-2026: Proper Navigation, 3D and 2D

**Asked by Adam:** "In both apps we need proper panning controls, copy ValeVision 3D's mouse keyboard and touchscreen
navigation mappings and create a similar orbit mode (without the orbit helper cube, it just has free navigation with
zooming, panning, eveything you'd expect on a pc or tablet so create roper hotkey handler script nmouse handler script
nav mode script mappings json touch screen handler. and in Auras 2d drawing view add the same 2d navigation as
ValeVision Layout Editor". His calls: the 3D navigation lives in PainterlyNPR and AURA uses it; the middle button and
the tilt "Same controls as ValeVision 3D"; the sheet's plain wheel zooms about the cursor.

**Built:**
- **3D Environment:** the engine's new navigation (PainterlyNPR v0.5.4, `74__Camera__Navigation`), attached through
  the engine host (`Na__EngineHost__AttachNavigation`, host 1.1.0) in place of the stage's own orbit and zoom. ValeVision
  3D's orbit mode: left drag orbits; right drag, or Ctrl / Shift + left, pans (screen space: what lies at the target
  stays under the pointer); middle drag dollies; the wheel zooms, accelerating on a long spin; one finger orbits, two
  pinch and pan, eased to a stop; W A S D, the arrows, Q and E move the camera (Alt finer, Shift moving the target
  too), R returns to the last preset, + - 0 zoom. Free tilt with ValeVision's floor guard. Its keys act only while the
  3D Environment tab is open; a press on the canvas takes the keyboard from a panel box. The preset buttons light as
  the camera moves.
- **Sheets: the Layout Editor's navigation, ported** (ValeVision 3D 51__System__LayoutEditor: Navigation 1.3.0,
  Controls Pc 1.4.0, Controls TouchScreen 1.1.0, the DrawingTabs key map) into `20__System__DrawingSheets`:
  - `Na__Hotkeys__DrawingSheets__.json` (every binding with an Id, a Label and Enabled) and its reader
    `Na__DrawingSheets__KeyMap__.js`; `Na__DrawingSheets__Navigation__.js` (zoom about a point, fit, pan);
    `Na__DrawingSheets__Controls__Pc__.js` and `Na__DrawingSheets__Controls__TouchScreen__.js`.
  - The wheel zooms about the cursor (one zoom a frame, however many wheel events); a middle or right drag pans; Space
    and a left drag pans (on here: off in the Layout Editor, where Space is the Select tool); the bare left button stays
    the tools'; the right button's menu is kept out of the way.
  - Two fingers pinch and pan; one finger pans from the grey desk; a double tap on the desk fits. A second finger ends
    a tool's drag where it was (the surface's new SetSuppressed), so nothing is left half moved.
  - F fits, 1 is 100 percent, + and - zoom (on here: the Layout Editor ships them off because its arrows nudge and F is
    its Offset); Page Up and Page Down open the sheet before or after. Alt + arrow pans stay off (Alt + Left is Back).
  - A press on the desk takes the keyboard, so Delete, Escape, V, N and L never go to a panel box used a moment ago.
  - Handles are redrawn at their screen size once a wheel or pinch zoom rests (350 ms).
  - The surface (1.1.0) keeps the zoom value and the tools' presses; its own middle-button and Space pans, Ctrl + wheel
    zoom and fit moved out. A press on the grey desk only lets the selection go (it used to place a note off the paper
    with the Note tool). Zoom limits 0.15 to 12, in the key map file.

**Checked here (no browser):** every module parses (Node 22); all 284 named imports across AURA resolve, the engine's
read from the live PainterlyNPR tree the sync will copy. The engine's camera maths run headless (see PainterlyNPR's
v0.5.4 entry).

**Needs before it runs:** the engine synced past v0.5.0 (the coordinating session's 0.2.0: commit, sync, import map):
the host imports the new `74__Camera__Navigation` folder, so AURA will not boot on the pinned v0.5.0.

**Not yet:** not checked in the browser (Adam tests); real touch untested; the Layout Editor's held paper layer while
zooming (no AURA counterpart needed yet).

(Uncommitted in git, waiting on Adam.)

## Version 0.1.2, 30-Oct-2026: Projects Switched On One by One

**Asked by Adam:** "Make all projects NOT available for Aura unless I enable in the project form per project. I will
switch on or off the projects available on a project by project basis" (with the Gallery's menu, Project Editor ringed).

**Built:**
- **The switch:** a tick box in ValeVision Gallery's Project Editor, **Available in ValeVision AURA**, under Visible in
  Gallery, saved in the project record as `auraEnabled` by the Gallery API (1.3.0). A record without it is off, so every
  project starts off and nothing in the library needed changing. Whoever can use the Project Editor can tick it
  (Managers and App Admins). The activity ledger reads "switched on for AURA" or "switched off for AURA".
- **The Gallery** (1.7.0): the AURA icon on a card and **Open in AURA** on the project page show only on projects
  switched on, still for Managers and App Admins only (`canOpenAura`). The switch replaces the card's old 3D model test.
- **The API** (1.1.0): every project route refuses a project that is not switched on (403, `notSwitchedOn`), so an old
  or typed link opens nothing (`project_switched_on`, `_open_project`).
- **The page:** "Not switched on for AURA", with the way back to the Gallery, instead of the API's bare refusal. A
  project switched off while it is open stops saving and says so once (`Na__DrawingSet__Persistence__` 1.1.0).
- `AuraConfig__Access__ProjectSwitchNote` records the rule beside the level.

**Live (Adam: "Tested, push it"):** the files reached the server between 12:25 and 12:34 UTC in a push of all four
lanes (`aura`, `server-api`, `valevisiongallery`, `commonassets`) that carried 0.1.1 too; it is not in this PC's
connection log. The Gallery's API kept running its old code until `vale@ValeVisionGallery` and
`vale@ValeVision__AuraRender` were restarted at 12:37:33 UTC, so Adam's first ticks on Thrower (63403) were saved
without the switch ("Project saved!", no icon). Checked through Cloudflare: both APIs' health 200, the project routes
401 signed out. Adam ticked Thrower again after the restart: "Yes, it shows".

## Version 0.1.1, 30-Oct-2026: Paper First, Typed Values

**Asked by Adam:** "Next in both Aura and the NPR viewer move the paper and finish first 1. Paper & Finish 2. Lighting
3. Pen 4. Wash 5. Sky ... Make all parameters on both apps typable too so you can type values or use sliders"

**Built:**
- **Group order** (`AuraConfig__Engine__ParameterGroups`): Paper and finish, Light, Pen, Wash, Sky. The first two open
  by default for anyone with no folds remembered.
- **Typed values** (`11__System__Environment3d/Na__Environment3d__Parameters__.js`, `Na__Parameters__TypeIn`): click a
  readout (or Tab to it, Enter), type the value as it shows (`60%`, `1.2`, `off`), Enter; Escape puts it back. The value
  goes in through the slider and its input event, so it acts exactly as a drag would.
- **Reading a typed value:** the engine host's `Na__EngineHost__Control` gains `Parse`. It uses the engine's own
  (`.Parse` on a readout, PainterlyNPR v0.5.2) when the pinned engine has it, and until then
  `Na__Format__ParseReadout` (`03__AppUtils`), a mirror of PainterlyNPR's `ParseFrom`, read from the same format data.
  Drop the mirror after the v0.5.2 sync.
- The worker's version `2026-10-30-2`.

**Not yet:** not checked in the browser here (Adam tests it); not pushed to the server.

## Version 0.1.0, 30-Oct-2026: The Foundations

**Asked by Adam:** "We need to build out the structure in my style for a new Project AURA which is a wrapper using my
new NPR Render, it will extend ValeVision 3D Models into a new third Engine separate from Whitecard, MaxModels etc but
a Whitecard / MaxModel can be transported to AURA and rendered using the AURA Library as Noble Architecture will also
be building a wrapper using the same core engine code from the library ... so that repo can serve two codebases."
And: a 3D Environment that loads the NPR renderer's demo scene (the cottage); tabs for drawings with fixed 3D and 2D
viewports on Vale's drawing page set up for A1, A2, A3 and A4, landscape and portrait; elevation scales 1:50 and
1:100 and a top-down roof plan; a full annotation system using the humanised handwriting demo, brought into a system
subfolder of the app's modules; Managers and App Admins only from the Gallery ("employees must not see Project Aura
yet"); "a version up and running on the server that Managers and Devs can view" at `/aura`.

**Adam's calls (30-Oct-2026):** the engine seam lives in AURA for now (PainterlyNPR untouched); the Gallery shortcut
on cards with a 3D model plus a button on every project page; push to the server after his local test. Then: "the NPR
renderer will be Web GPU and Web Assembly but all that work will be done locally on the user machine. Long term ...
rewrite [the text renderer] in WASM ... serve the binaries and cache them in the PWA ... the server is resource
constrained." So the handwriting runs on the user's PC (never torch on the VPS), its ink is saved with each note,
and AURA ships with a service worker that keeps the pinned engine on the device.

**Built:**
- **The app** in the Vale apps' house style (Theia's page, header, spinner, shared sign-in, activity ledger, deploy
  stamp), its modules in numbered folders, its config in one JSON read by the page and the API.
- **The core library, pinned:** PainterlyNPR v0.5.0 at 29bbcf1, 185 files, copied byte for byte by
  `60__Dev__WebBuildUtils/AuraRender__BuildUtil__SyncCoreEngine__.py` with a SHA-256 lock (`--check` proves it).
- **The engine host** (`10__System__EngineHost`): PainterlyNPR's boot without its panel; camera presets, orbit and
  zoom; the engine's own controls; settings saved with the drawing set; stills for the sheets (the PNG export, in
  memory). The engine's interface modules still in its graph are given somewhere to write (status line, a detached
  point layer, hidden view-badge stand-ins).
- **3D Environment:** the engine's live drawing of the cottage, presets, saved views, a new seed, and the parameters
  (light, pen, wash, sky, paper and finish) built from the engine's own controls config.
- **Drawing sheets:** A1 to A4, landscape and portrait, on Vale's drawing page: the RecConcept layouts' 60 x 280.5 mm
  title column (bottom right; turned along the foot at bottom left in portrait; scaled only on A4), its fixed cells
  cut at 300 dpi from Vale's A3 layout, its field cells drawn as vectors, the scale written from the views.
- **Viewports:** the four elevations and the roof plan to scale (1:20, 1:50, 1:100, 1:200), each an orthographic
  engine still at a half-height of 200 mm x scale / 2000 metres (the engine's own 1:100 elevation is 10 m), placed at
  its true 300 x 200 mm, so the pen widths are true on the paper; 3D views from presets or saved views. Move, resize
  (a scaled view's drawing stays put), Alt-drag to pan, a properties panel, and a render queue drawing one still at
  a time, cached by what made it.
- **Annotations:** notes and leader notes; leaders are the studio's seeded hand-drawn arrows; the ink is the studio's
  Graves model through the AURA API's worker (PC only), saved with the note; a typed stand-in until written.
- **The handwriting engine** brought in from the Vale Handwriting Studio (`Experiment__HandwritingTest`, 02-Oct-2026):
  its `engine.py` with only its toolkit path changed, the pinned toolkit (899e9432, MIT) and the Epoch 46 model
  (git-ignored: IAM-OnDB rights; excluded from the server push).
- **The API** (`Api__ValeVision__AuraRender`, port 8006): config, project, drawing sets (a whole-document save with
  `_rev`, a kept revision at most every five minutes), handwriting status and write. Management and AppAdmin only.
- **The Gallery** (1.6.0): the AURA shortcut for Managers and App Admins only.
- **Server registration:** sync mapping `aura` (excluding `*.pt`), route `/aura/` with its API on 8006, `aura` in the
  activity ledger's app list, the library schema's `ValeVision__AuraRender` folders.

**Checked here (no browser):** every JavaScript module parses; all 252 named imports resolve to an export, the
engine's included; the API imports as the dev server imports it and answers health and config, and 401 to every
project route signed out; the handwriting worker wrote "Handmade clay plain tiles" (12.7 s cold, torch and the model
loading) and "Oak porch 2400 mm x 1200 mm" (0.2 s) through the API's own path.

**Not checked:** anything in a browser (Adam tests): the engine booting on AURA's canvas, the stills, the roof plan
(the engine's first top-down view), the sheets, the Gallery shortcut.

**Not yet:** see the README's Not Yet list.

**Live (Adam: "Tested, push it live"):** pushed 30-Oct-2026 11:59 UTC (`aura`, `server-api`, `valevisiongallery`,
`commonassets`; nothing deleted); `vale@ValeVision__AuraRender` enabled on 8006 (Flask only); Adam applied nginx at
12:03 UTC (hash `760db8942de3`). Checked through Cloudflare signed out: `/aura/` 200, `api/health` and `api/config` 200,
the project and handwriting routes 401, the manifest and the Gallery icon 200.

**PainterlyNPR v0.6.0 (another session, same day):** an asset library is being built into the engine, uncommitted. That
session confirmed it keeps what AURA's host relies on: `Load()` with no arguments, Rendered as the default work mode, no
new DOM lookups in the render path, `State.Assets` additive, no export renamed, and the scene buffer kept working for a
host that does not set `Gpu.Buffers.Scene`. Its DEVLOG "Wrappers" line lists what the next sync needs.

(Committed and pushed to GitHub on 30-Oct-2026: `0f15deaf` and `c7052462`.)
