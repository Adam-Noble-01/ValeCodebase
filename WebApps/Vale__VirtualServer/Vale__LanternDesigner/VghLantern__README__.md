# Lantern Designer

Vale Garden Houses' parametric roof lantern configurator and specification workspace, at
<https://app.valegardenhouses.com/lantern-designer/>. Sign in with your Vale account: the same email and password as
ValeVision and ValeVision 3D.

## How It Works

| Part | Where |
|---|---|
| The app (no build step: classic scripts sharing one global scope, plus two ES module bootstraps for the 3D pipeline) | this folder; the entry page is `index.html` |
| Designs | the Vale Projects Master Library, one per library project: `Vale__Projects__MasterLibrary\ValeProjects__<year>\<project>\LanternDesigner\UserData__LanternDesign\VghLantern__ProjectFile__<project>__.json` |
| The API (designs and their history, library search, per-user settings, the library indexes) | `Server__Api\Api__LanternDesigner\wsgi.py` (`vale@LanternDesigner`, port 8003), reached at `api/...` relative to this page |
| Sign-in | the shared Vale sign-in: `Server__Api\Api__Shared` and `AppAssets__CommonApplicationAssets\Shared__UserLogin` |
| Per-user settings | `Server__UserAccountData\UserData__UserAppConfigs\LanternDesigner\UserConfig__<USR code>__LanternDesigner__.json` |
| Component and profile libraries | `05__Data__LanternComponentLibrary`, `06__Data__LanternProfileLibrary`, `VghLantern__AssetRegistry__.json` (rebuilt with the utilities in `60__Dev__WebBuildUtils`) |
| Install, updates, activity | `VghLantern__Pwa__Manifest__.webmanifest` and `VghLantern__Pwa__ServiceWorker__.js` (scope `/lantern-designer/`), and the shared `Shared__AppInstall`, `Shared__AppUpdate` and `Shared__ActivityLog` scripts in `index.html` |

- **The Master Library is the single source of truth** (Adam, 15-Oct-2026). A project may have a ValeVision model and
  no lanterns, lanterns and no model, or both. A design's key is its library project id (`Metadata__LibraryId`, e.g.
  `57079__Mordaunt`); `Metadata__ProjectCode` stays the job number printed on drawings and letters, because schemes of
  one job share it.
- **A design names the client and their address**, so it lives in a `UserData__` bucket: nginx never serves it, only
  the API does, to signed-in people. The Server Manager collects designs to the PC and never pushes them. They are
  git-ignored.
- **New design:** type the Vale job number. The job's projects in the library are offered; pick one that has no design
  yet, or add the job to the library as a new project (`<job number>__<Name>`, every folder of the schema project,
  `ProjectType: "LanternDesign"`, which the Gallery leaves out until it has 3D work). The client's details come from the
  Vale database placeholder (`12__System__ValeDatabaseApi`) when it has the job. "Not in the Database? Click Here"
  takes the job number, name and client by hand.
- **Who can do what:** everyone signed in opens designs; Employee and up create and save; a design is deleted by the
  person who started it, or by Management and up (the library project and its other work stay); Affiliates view only;
  AppAdmins get Developer Tools (SketchUp and CAD export) in the avatar menu.
- **Saves:** autosave sends the whole design with the version it was loaded at. If someone saved it in the meantime,
  the app asks whose version wins. Revisions are kept in the project's `ProjectData__Revisions` (one per 10 minutes of
  editing, the last 20).
- **Ownership and edits (v0.7.0):** the project list shows who created each design (its owner) and who last modified
  it; **History** on each row shows everyone who has worked on it, each person's editing sessions (saves less than 30
  minutes apart are one session) and every change of status, project, document or client name, newest first. The API
  records all of it in the design's server stamp (`api/projects/<id>/history`); the app can never write it. The 20
  prototype designs show *Prototype* as their creator: they predate sign-in.
- **Lantern sizes (v0.8.0):** Length (the long axis, `WidthMm`) and Width (`DepthMm`) are measured to the finished
  exterior of the builders upstand, including the roof covering the builder dresses over it (GRP, EPDM, felt). In
  Form and Size, three **Set Out To** cards can set them out to the **eaves datum** (where the glaze bar datum meets
  the eaves plate, the factory's measure) or the **internal upstand** (the solid kerb, no plasterboard) instead. The
  exterior is then worked out (plus two 125mm head beams, or two upstand thicknesses) and stays the one number every
  output reads; switching never moves the lantern. Set out either way, the drawing's length, width and ridge length
  cannot be typed: a click explains why and opens Form and Size at the cards. The rules live in
  `02__Src__AppModules\04__MathUtils__LanternGeometry\VghLantern__Geometry__PlanSizeBasis__.js`.
- **Duplicating a lantern (v0.8.1):** **Duplicate** in the editor bar (beside + Lantern) copies the lantern being
  edited; **Duplicate Lantern** in a tab's right click menu copies that tab. The copy is added at the end with its own
  id, the next drawing number and its name numbered on ("Kitchen (2)"). It replaced the Quantity slider: each lantern
  is its own named, numbered lantern for the cut sheets. A lantern saved with a Quantity above 1 keeps it (and its
  takeoff) and shows the retired slider until it is set back to 1.
- **Glazing panels (v0.9.0):** the glass is cut into panels between the glaze bars, hips, ridge and eaves (and any
  transom), each edge 3mm off the upright web of the member's aluminium core, rather than one slab per slope. At the
  eaves the unit stops 3mm short of the eaves extrusion upstand and its top pane runs on to the glaze bar cap ends
  (a provisional 6mm). Identical panels share a code, GZ01 the largest; a pane and its mirror image are two codes. The
  cut lives in `02__Src__AppModules\04__MathUtils__LanternGeometry\VghLantern__Geometry__GlazingPanelLayout__.js`; the
  3D view, the projected drawings and the SketchUp export (payload 1.2.0) all build from it, and hovering a pane in the
  3D View names its code and sizes. Its numbers live in the system indexes: the glass build-up and the 3mm in the glaze
  bar index's `GlazingInterface`, each core's web on its own index entry, the eaves glass stop in the base frame's
  `EavesInterface`. `60__Dev__WebBuildUtils\VghLantern__DevCheck__GlazingPanels__.cjs` re-measures those from the
  assets and proves the cut.
- **Roof Glazing Panel Units (v0.10.0):** the glazing department's sheet for each lantern: a top-down plan with an
  RU bubble on every unit (each slope's bubbles on one line just inside its eaves), and a table with one row per unit
  type - its straight-on cut drawing (overall width and length, the oversail, every other cut edge, every corner that
  is not square; a long narrow pane is drawn broken through its plain middle), code, quantity, length and width
  rounded DOWN to the millimetre (the sealed unit's beneath when it differs), area in m2, glass type, thickness and
  cavity - closed by the total glass of every unit. It shows in the Specification tab's **Roof Glazing Panel Units**
  section and on a page of the same name per lantern in Preview and Send (its own switch, after the cutting list); the
  old per-slope Glazing Areas section is off, on the tab and in the pack. **RU** (Roof glazing Unit) is Vale's standard
  code for these (GZ in v0.9.0). Nothing is built until one of those draws it: the tab when the section is on screen,
  the pack as its pages are drawn, each cached per lantern state. Built by
  `35__System__SpecificationMode\VghLantern__Specification__GlazingSchedule__.js` (what is drawn, as paper millimetre
  primitives) and drawn by `...GlazingScheduleRenderer__.js` (SVG on screen, native jsPDF in the file, and the pack page
  layout both follow, so the preview and the PDF break at the same rows). Thickness and cavity come from
  `VghLantern__Glazing__Options__Config__BuildUps` in the main config, provisional typical values marked * until Vale's
  glazing panel design confirms them. `60__Dev__WebBuildUtils\VghLantern__DevCheck__GlazingSchedule__.cjs` proves it.
- **Measuring in the 3D View (v0.10.1):** the **Measure** section of the 3D View Tools menu audits the built model.
  **Vertex to Vertex** boxes the corner nearest the cursor (AutoCAD's endpoint square); **Face to Face** puts a ring on
  the face under it (Polycam's reticle). From the first point the red, green and blue axes (SketchUp's colours: model
  X, Y, Z, which three.js draws as X, Z and Y) run dashed and the free line is purple; within 6 degrees of an axis, or
  square to the first face (magenta), it snaps and the dimension is dead straight, and a snapped face to face measures
  to the second face's plane, so a gap between parallel faces is exact wherever you click. Arrow keys lock as in
  SketchUp, Shift holds the nearest axis, Alt measures free. Whole millimetres by default, 0.01 mm for forensic work.
  Dimensions are drawn over the canvas, never into the scene, so none can reach a sheet, and are never saved; they go
  when the lantern changes. The system is `02__Src__AppModules\28__System__MeasureTool3d` (settings in
  `Na__Measure3d__Config.json`); the icons are TrueVision's, in `01__AppAssets__VghLantern\06__UiIcons__MenuIcons__MeasureTools`.
- **Info tips (v0.8.0):** the small Vale blue "i" opens a Vale tooltip (hover, or a click or tap to pin it) saying what
  a control means, so the panel itself can stay short. Any element with `data-vgh-tip="<key>"` opens one;
  `VghLantern__AppCore__InfoTooltip.VghLantern__InfoTooltip__IconMarkup(key, label)` writes the "i"; the words live in
  `02__Src__AppModules\01__AppCore\Na__InfoTooltip__Config.json` (`Title` and short `Paragraphs` per key). First used on
  the three Set Out To cards.
- **Printed drawing QR codes** still open the General Drawing Terms page at `/t/` on GitHub Pages
  (`Na__Terms__Config.json`, `TermsQrBaseUrl`); it moves when GitHub Pages is retired.

## Run It on This PC

**Check a change before it ships:** double-click `Start__VghLantern__TestServer__8031__.bat`. The testing server opens
<http://localhost:8031/lantern-designer/> in the default browser under a "Testing Server" overlay (amber: sandbox data;
red: real data). It is the 8030 dev server below, wrapped, plus:

- **Sandbox data by default:** test accounts, one per permission level, and copies of the 20 demo jobs, in
  `%LOCALAPPDATA%\VghLantern__TestServer\Sandbox`. **Your own Vale account does not exist there:** sign in with the box
  beside the sign-in card (one click per account; the password is also in the server window). Sign-ins, saves and New
  design never touch the real mirror. `--real` gives your own account and the real designs (saves change the PC
  mirror); `--reset-sandbox` rebuilds the sandbox.
- **The deploy check:** a file the Server Manager would not push, or nginx would not serve, answers 404 as it would on
  the server, and the overlay lists it with the rule that excludes it.
- **Problem lists** in the overlay's badge: missing files, API errors (tracebacks in the server window), and script
  errors, failed loads and `console.error` in the browser.
- Saving a `.py` file restarts it by itself. Settings: `80__Testing__LocalTestServer\Na__TestServer__Config.json`.
  None of it syncs to the server.

The plain dev server, every Vale app at once:

```bat
python ..\Server__DeveloperTools\ValeDev__LocalServer__.py
```

Then open <http://127.0.0.1:8030/lantern-designer/>. It serves the mirror exactly as the server does, API included,
and it **writes the real mirror**: test sign-ins and saves on the testing server above, or against a sandbox
`VALE_ROOT` (see the `vgh-app-server` skill, operations section 15).

The dev checks in `60__Dev__WebBuildUtils` need `npm ci` once (lockfile committed), and read the library's copy of
`3010__WalkersPalace`.

## History

The prototype lived in `WebApps\Vale__LanternDesigner` (localhost server on port 8006, GitHub Pages demo). It was moved
here on 15-Oct-2026 and that folder retired; see its `MigrationDetails__README__.md` and `VghLantern__DEVLOG__.md`
(v0.6.0).
