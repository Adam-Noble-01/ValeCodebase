# ValeVision AURA: DEVLOG

## Version 0.5.8, 30-Oct-2026: AURA Scenes on the Landing Page (Example Cottage and Test)

**Asked by Adam:** "make a ValeVision Aura Scene I can access but that isnt visible to anyone else with the cottage scene
for testing / show aura scenes here like TheiaVideo and on my version and manager director or admin level they have the
examplke cottage scene, create a third scene too called test which ill use as a destructivce scene for mre experimental
things". **His calls:** the Example Cottage for managers, directors and admins; Test for him alone; Test starts from the
demo cottage; the landing page lists the projects switched on, then the scenes.

**Built:**
- **The landing page** (`/aura/` on its own; `41__Feature__SceneIndex/Na__SceneIndex__Page__.js`,
  `Na__UiFeature__Styles__SceneIndex__.css`): cards like Theia's project index, in place of "Open AURA from a project".
  Every project switched on for AURA comes first, with the Gallery's thumbnail, its number, its sheets, when its drawing
  set was last saved, and a word when it has no whitecard yet. AURA's own scenes follow, with a brush for a picture and
  "Only you" on one nobody else can open. A card opens `?project=<id>`.
- **AURA's own scenes** (`Vale__Projects__MasterLibrary/ValeAuraScenes__Library/`, with its README): folders laid out as
  projects beside the year folders, so the Gallery, ValeVision 3D and Theia never list them.
  - **Example Cottage** (`AuraScene__ExampleCottage`, audience Management: everyone AURA lets in).
  - **Test** (`AuraScene__Test`, audience Owner: Adam's account alone).
  - Each draws the engine's demo cottage into its own drawing set, so wrecking Test never touches the example.
- **The API:** `GET api/projects` (`AuraRender__Api__Index__` 1.0.0) gives the cards. `AuraRender__Api__Core__` 1.2.0's
  `project_folder` finds a scene only for its audience, so every route (the project, its drawings, its scene) checks
  it, and a scene someone else owns answers 404 as if it did not exist. `wsgi.py` 1.3.0 registers the index.
- **The page** (`Na__AppCore__AuraApp__.js`): a scene's crumbs lead back to **AURA scenes**; it has no "Open this
  project in ValeVision 3D" item and no "no whitecard" note. The avatar menu gains **All AURA scenes** wherever a
  project is open. `AuraConfig__App__Version` 0.5.8.

**Checked here (no browser):** in a sandbox library, with Flask's test client:
- Adam's cards are Thrower, Example Cottage and Test.
- A manager's are Thrower and Example Cottage, and every Test route answers that manager 404 (the project, its
  drawings, its scene, a save).
- An employee is refused (403), and a project not switched on stays off.
- Adam's save of Test writes Test's own drawing set and leaves the cottage's folder untouched.
- Both page modules parse.

**Not checked:** a browser (Adam tests).

**Live:** needs `server-api` (Core, Index, wsgi) and then a restart of `vale@ValeVision__AuraRender`, then `aura` (this
version) and `projects` (the two scene records; their drawing sets are made on the server by the first save).

## Version 0.5.7, 30-Oct-2026: The Engine's Right-Click Menu and Move Tool in the 3D Environment

**Asked by Adam:** "Update Aura so it has the same right click context menu and options / Update both aura and the NPR
preview adding a new Move Tool you press m when an asset is selected and you can move it around show a gimbal for the
move tool". **His calls:** a ghost while it moves, the drawing redrawn once it is set down; "Ground only, pressing shift
allows for up and down movement, show only show the giumbal when shift is held otherwise show that same graphic and
effect that appears on the insert"; a 10 mm step; "Commit NPR, sync AURA".

**Built** (nothing of the engine copied into AURA; the work is PainterlyNPR v0.8.10, 0710926, pinned here as
`01__CoreLib__PainterlyNPR__v0.8.10` and the import map moved to it):
- **The right-click menu** over the 3D Environment's drawing and the Assets drawer is the engine's own, with the same
  items as PainterlyNPR's app:
  - **A placed asset:** Move (M), turn, size, grow a new shape, copy beside it, swap, its parts' and faces' materials,
    take it out.
  - **One of the model's objects:** its material or one face's.
  - **The sky:** let the selection go, put the brush down, open or fold the library.
  - **Cards and swatches** in the drawer get their own menus.
  - **Every menu ends with Undo and Redo,** named for the step and taken from AURA's own history.
- **The keys, on the 3D Environment tab only** (the engine's): Delete takes the selected asset out, Esc lets it go,
  Ctrl + D copies it, M moves it.
- **The menu is kept to those places** by the engine's new Scope, so the scene tabs' menu, the sheets' and the browser's
  own (text fields) are as before. A pin without the seam is never wired, so an older pin can't take the whole page's
  right click.
- **The Move Tool:**
  - **Start:** M with an asset selected and the drawer out (or the menu's Move, or a placed row's Move button).
  - **Without Shift:** the asset rides the ground under the pointer, shown with the insert's own footprint and height
    marker, a dashed trail back to where it stood and the distance beside it.
  - **With Shift:** the gimbal shows at its foot (red, green, blue, as SketchUp's axes) and the pointer lifts or lowers
    it. Shift with a press on the red or green arrow moves it along that arrow.
  - **Setting it down:** a click, or a drag let go, sets it down: one change, one undo step in AURA's history, one save.
    Enter sets it down too; Esc or M leaves it where it was.
  - **While it is on,** right-drag still pans and the wheel still zooms.
- **The host** (`Na__EngineHost__Assets__.js` 1.2.0): it wires the engine's `SceneEdit__Wire({ Scope, Active, History })`
  with the stage's sheet and the drawer as the scope, the Environment tab as the keys' gate, and AURA's history,
  fetched once everything has loaded so the app's module order is unchanged. It links the engine's ContextMenu
  stylesheet. Its own copies of the library gate (`AssetsOpen`, `WatchDrawer`) are retired for the engine's
  `SceneEdit__Tap` gate and `SceneEdit__WatchLibrary`, in the pin since v0.8.8.
- The worker's cache version 2026-10-30-13 (an engine sync). `AuraConfig__App__Version` 0.5.7.

**Checked here (no browser):**
- The host parses, and every named import AURA takes from the engine resolves in the v0.8.10 pin, and in v0.8.9 for
  the host.
- The sync's `--check` finds the new copy untouched; its lock says WorkingTreeClean true at 0710926.
- PainterlyNPR's module test passes (118 modules, 700 imports).
- The Move Tool was driven in Node with the engine's camera: a 30 px carry moved the foot 29.9 px on screen with no
  jump, on 10 mm steps; Shift lifted it with x and z kept; Esc left it untouched.

**Not checked:** a browser (Adam tests): the menu over AURA's drawing and drawer, the gimbal, a move's undo in AURA's
history, the save that follows it.

**Not yet:** on a touch screen there is no Shift, so a finger carries over the ground only. The sync script's `--check`
sorts version folders as text, so it calls v0.8.9 the newest copy and v0.8.10 "NEWER". It only reports wrongly; the
copy is right.

**Live:** needs `aura` (this version, with the v0.8.10 pin). No API change.

## AURA Scene API 1.1.0, 30-Oct-2026: Library Assets Stored Once (No App Version: the Page Is Unchanged)

**Asked by Adam** (the scene schema's brief): library assets, "save a copy but instance it where possible". The schema's
"To Build Next" item 1: when a drawing set is saved with an asset the project has not stored, the API copies its MOD
and DAT into `Content__AuraScene__AssetFiles` and lists it in the scene.

**Built:**
- **On a drawing-set save** (`AuraRender__Api__Drawings__.py` 1.2.0, `PUT api/projects/<id>/drawings`): after the set is
  written, every asset Id in `AuraDrawingSet__Engine.Settings.Assets` the scene has not stored is stored. The answer
  lists them in `assetsStored`. Storing never fails the save: an error is logged and the next save tries again.
- **The store** (`AuraRender__Api__Scene__.py` 1.1.0, `store_assets`):
  - one record per asset Id however many placements; the files keep the library's names, flat in the folder;
  - copied from the engine AURA's import map pins (`Vale__CoreEngine__ImportMap__Index__.json`'s `PainterlyNPR/`
    folder, its `12__Data__AssetLibrary`), so the API stores the library the page draws; `AssetFile__LibraryVersion`
    is that pin's (`PainterlyNPR v0.8.10` now);
  - `AssetFile__Instanced` from the DAT's `Placement.NewShapeEachPlop` (trees false, the bench true);
  - a copy already holding the same bytes is left alone, anything else is written beside it and renamed into place
    (`copy_in`, now shared with the import), so a file the Server Manager pushed never stops the API;
  - the scene is written through the library writer with its `_rev`, under the import's lock, so a re-import and an
    asset store never write over each other; the re-import already carries the stored assets over;
  - every autosave of a set with nothing new costs one read of the scene, no lock;
  - only Ids of the library's own form (`NPR_CC_TTFI`) are looked up; an Id the pin lacks is logged and skipped;
  - a project with no scene yet stores nothing (the scene is made on its first open; the next save stores them).
- **GET scene** also answers `assetBase`, where the stored files are served (behind the library gate, as the models).
- **The sync** (`AuraRender__BuildUtil__SyncCoreEngine__.py` 1.2.0): the pin carries the asset library's MOD `.glb`
  files (26, 3.0 MB at v0.8.9; they are committed in PainterlyNPR, so no engine change). Never `.skp`. The page never
  fetches them, so the service worker never caches them.

**Checked** (a sandbox `VALE_ROOT` holding a copy of Thrower's record, whitecard and AURA folder; Flask's test client
with the sign-in stubbed; a test pin made by the sync script's new rule from PainterlyNPR's 0e79f92, in the sandbox):
- The test pin: 412 files, 26 `.glb` and no `.skp`; its `--check` untouched.
- On AURA's real pin (v0.8.9, synced before the rule): the set saves, nothing is stored, the scene stays at rev 1.
- One mature oak placed: its MOD (418,860 bytes) and DAT stored, byte for byte the pin's, one record, scene rev 2,
  valid against the contract, model files and objects unchanged.
- A second oak: nothing stored, the scene and the files untouched.
- A bench beside them, an unknown Id and `../../etc`: only the bench stored (Instanced true).
- A re-import keeps both records; with no scene, the set saves and nothing is made.
- Thrower's live folder untouched (scene rev 1, no asset files).

**Not yet:**
- **The pin:** v0.8.10 (0710926), synced with the new rule by another session, carries the 26 `.glb`; the test run
  again on it passes. A pin without them stores nothing and logs why; the first save on one with them stores
  everything placed.
- **The sync's `--check`** sorted version folders as text, so v0.8.9 read as newer than v0.8.10: they now sort by
  version number (`Na__Sync__VersionFolders`), and `--check` passes on the live folders.
- **Live:** needs `server-api` (and a restart of `vale@ValeVision__AuraRender`) and `aura` (the v0.8.10 pin).
- AURA still draws a placement from the engine's generator, not the stored copy; the stored MOD is for SketchUp and
  the apps that read GLBs (the schema's "How AURA's Tools Use It").

## Version 0.5.6, 30-Oct-2026: Cameras, the Lens and the Elevation Planes

**Asked by Adam** (a screenshot of the 3D Environment's panel, the room under its sections ringed): "Read your NPR
Skill / Add a Cameras tab / It should contain two diffeent features, adjust camera lense angle same as ValeVision 3D
(you must read that repo before editing) / 2. show elevation camera planes, switches on the elevation camera planes
alowing you to reposition them, look at the way these kinds of plan and section planes work in TrueVision 3D AND COPY
THAT FUINCTIONALITY". This is the elevation camera tool 0.5.0 left for another agent ("we need to be able to adjust
elevation cut position").

**His calls:** an elevation not cut until its plane is moved (drawings stay as they were); the roof plan gets a plane
too; the lens only for now (Perspective Correction needs an engine seam); from TrueVision's tools, the drag with snap
and a typed position (no Move to face, no switch per plane).

**Read first:** ValeVision 3D's `11__CameraUtils/Na__UiFeature__CameraLens__Controls.js` and its config's
`cameraLens`; TrueVision 3D's `TrueVision__PLAN__DrawingPlanes__.md`, `47__System__DrawingPlanes` (config, maths,
plane mesh) and `45__System__ElevationViews` (the camera stands off in front of its plane; Section mode removes what
is in front); PainterlyNPR's camera rig (near planes 0.1 m for the wash, 0.2 m for the pen).

**Built:**
- **A third panel section, Cameras** (`11__System__Environment3d/Na__Environment3d__Cameras__.js` 1.0.0, new; its icon
  `Icon__PanelSections__Cameras__.svg`), after Parameters and Art direction points.
- **The lens**, ValeVision 3D's: a full-frame focal length, 24 to 75 mm in whole millimetres, turned into the engine
  camera's FovY (2 atan(24 / 2f): the engine's 30 degrees is 45 mm, ValeVision's default). Its readout is typed into
  as every parameter's is, and shows the camera's real lens even outside the slider, following the camera however it
  changed (ValeVision's 14-Aug-2026 lesson). A change is a camera move: the scene's tab stays lit and Update from
  camera keeps it. An elevation or the roof plan reads "To scale" and the slider rests.
- **The cut** (`21__System__Viewports/Na__Viewports__Views__.js` 2.1.0): a scaled scene's `View__CutM`, its drawing
  plane, one number in metres along the plane's normal from the world origin (a height, for the roof plan). Nothing in
  front of it is drawn: the camera's eye stands 0.2 m before the plane, so the engine's own near clip cuts there and
  the pen stops exactly at it (`ApplyCut`, in `SceneCamera` and `Camera`, so the 3D Environment, every viewport and
  its stills agree). Not cut is the camera 60 m out, as before. A plane behind the scene's centre takes the target
  back so the camera still looks forward. `UpdateScene` keeps a scaled scene's centre at its own depth.
- **The planes** (`Na__Environment3d__DrawingPlanes__.js` 1.0.0, new), TrueVision 3D's drawing planes:
  - **Show elevation planes** draws every elevation's plane and the roof plan's over the drawing.
  - Each plane has a faint face and a solid outline in its own colour (chosen from the scene's id, so a deletion
    never recolours the rest), its scene's name in capitals in a boxed tab inside the top-left corner, a boxed plus
    in each other corner, and an arrow from each corner the way the drawing looks.
  - Sized from the building, never the garden: its span plus an overshoot, the larger of 1.5 m and 8 % of its
    longer side.
  - **Drag** a grip or the name: the plane moves along its own normal only (the point on the normal nearest the
    pointer's ray). Its absolute position snaps to the world grid, the **Snap** step 10, 25, 50, 100, 250 or 500 mm
    (50 by default, kept in this browser). Too square on to the camera it holds still and says so. Escape puts it back.
  - **A never-cut plane** waits dashed, NOT CUT on its tab, an overshoot in front of the building; its first drag cuts
    it there.
  - **Each plane's row** in the section shows its colour and takes its position typed in millimetres; clearing it, or
    its cross, is not cut.
  - **Cut elevations at the building** (asked next: "UPDATE THE ASSOCIATE SCENES FOR THROWER SO THEY HAVE THE CORRECT
    CUTS ASSIGNED"; his calls: a button rather than values typed or the server's file written, "Offset the cut 50mm
    infrtont of box plane", the roof plan not cut). One press sets every elevation's cut 50 mm
    (`AuraConfig__Cameras__CutAtBuildingM`) in front of the face of the building's box, measured from the building
    drawn now. That is the box the planes are sized from, so the cuts suit the demo cottage today and a project's own
    whitecard once it is drawn. The roof plan is left as it is; all the cuts are one undo step. For the cottage AURA
    draws for Thrower now (box x -4.68 to 4.68, z -3.16 to 4.35 m) that is Front 4 400, Right 4 730, Rear 3 210 and
    Left 4 730 mm. It is pressed in Thrower's own AURA, so the drawing set is saved through Adam's session.
  - A cut is the scene's: saved, one undo step, every viewport of it follows. An open elevation's live camera
    follows at once, and its cut is held as the camera moves (`HoldOrientation`, `Na__Environment3d__Stage__.js`
    2.1.0). + Add Scene and Duplicate carry the cut.
  - Planes are an SVG layer over the canvas, never part of the engine, so no sheet, still or export can hold one.
  - The snap and drag maths are TrueVision's, ported as they are (`03__AppUtils/Na__AppUtils__PlaneMaths__.js` 1.0.0,
    new).
- **The engine host** (`Na__EngineHost__PainterlyNpr__.js` 1.7.0): `ProjectWorld` and `PointerRay`, the engine's own
  camera rig (Compute, Project, Unproject) for drawing over the drawing; `BuildingBounds` measured once a scene.
- **The drawing set** (`Na__DrawingSet__Model__.js` 1.5.0): `View__CutM` on a scene (null: not cut), kept by
  Normalise; an older set loads with nothing cut. The config's `AuraConfig__Cameras__*` keys hold the lens, the cut's
  offsets and the planes' snap, bounds, look and drag.

**Checked:**
- All 46 AURA modules parse and every named import resolves, the engine's against the v0.8.7 pin.
- In Node, the cut on the real Views module (22 checks, all pass):
  - each side cut 6 m out puts the eye 6.2 m out along its normal, the roof plan's 0.2 m above its plane;
  - a plane behind the centre keeps the eye at the plane, the distance 1 m and the camera looking forward;
  - applying it twice changes nothing (elevation and plan);
  - taking a cut away is 60 m from the scene's centre again, and UpdateScene keeps the centre's depth;
  - TrueVision's snap (20 013 to 20 000 on 50), the axis solve and the 6-degree steep test.
- Not run in a browser here: Adam tests it.

**Not yet:**
- The building does not stand in front of a plane: they are drawn over the drawing. The faces are faint for that
  reason; seen square on in an elevation or the plan a plane is left out.
- A cut leaves its cut faces open (no poche).
- Grips are a fixed size on screen.
- Perspective Correction (an engine lens-shift seam) and TrueVision's Move to face.
- Wrappers note for PainterlyNPR: AURA now stands an orthographic eye anywhere from 1 m to 60 m from its target. The
  engine's aerial perspective is measured from the eye (`AerialRange`: distance + 8 m), so it still starts 8 m behind
  the target. Its `71__Camera__ElevationPlane` README describes this tool, which could move into the engine when the
  Noble Architecture wrapper needs it.

(Uncommitted, waiting on Adam.)

## Version 0.5.5, 30-Oct-2026: Sheet Pictures at Their Frame's True Size

**Asked by Adam:** "For some reason Aura Does not look as good as NPR's preview / investigate why / does aura have all of
the same poaram,ets mapped?", then, on the findings, "Yes, fix sheets". **His calls:** "True size, same framing" for
3D views, "Fade inside the frame" for elevations and the roof plan, "Commit NPR and sync AURA" for the engine seam.

**What was wrong:** every parameter was mapped, and the 3D Environment is the engine's own A3 canvas. The sheets were
the difference:
- a 3D view's picture was the engine's whole A3 sheet shrunk into its frame (a 180 x 120 mm frame: 43%), so the four
  technical pens printed thinner than their widths (0.13 mm at 0.056 mm) and the bleed, rings and grain shrank with
  them;
- an elevation's frame cut its true-scale picture off hard: the vignette lay outside the frame;
- pictures were lossy WebP (0.92), which halves the colour and smooths the pens, grain and washes.

**Built:**
- **PainterlyNPR v0.8.9** (0e79f92, committed at Adam's word, not pushed): `PainterlyNPR__ArtDirection__SetFrame` fits
  the engine's vignette to a host's frame; with no frame it draws as before. Synced: the pin is
  `01__CoreLib__PainterlyNPR__v0.8.9` (WorkingTreeClean true, with v0.8.7's GLB scenes and v0.8.8's gate), the import
  map and its index point at it, and the worker's token is `2026-10-30-12`.
- **A still drawn for its frame** (`Na__EngineHost__PainterlyNpr__.js` 1.8.0, `RenderStill`'s `frameMm` and `scaled`):
  - a 3D view widens its field of view (an orthographic preset its half-height) by the factor the whole sheet used to
    shrink by, so the framing is unchanged, and its points shrink with it through the engine's own `RefitPoints`;
  - only the frame's part of the sheet is read back, with the vignette fitted inside it (both kinds);
  - a frame bigger than the engine's sheet takes the sheet's most and enlarges it, as before;
  - `FitsFrames` says whether the pin can; an older pin draws the whole sheet, as before.
- **The render queue** (`Na__Viewports__RenderQueue__.js` 1.3.0):
  - pictures are lossless PNG, kept within `AuraConfig__Viewport__PictureCacheMb` (768), forty at most;
  - the frame's size is in a picture's key;
  - a viewport waits with its newest ask only, and a resized frame is drawn again once it has rested for
    `AuraConfig__Viewport__RedrawSettleMs` (400 ms);
  - meanwhile its last picture stands in, pale (`.aura-vp__picture--stale`), never an empty frame.
- **The sheet** (`Na__Viewports__Editor__.js` 2.1.0): a scaled picture sits at its own size about the frame's middle, a
  3D one fits its frame; a redraw that failed says "This view could not be drawn", never a pale stand-in.
- **Went live early:** another session's push of the shared working folder (17:25:30 UTC) carried this version to
  production before it was marked ready; the code was complete by then (the repoint was its last step), and the
  failed-redraw message above came after it.

**Checked:** PainterlyNPR's module test (117 modules, 686 imports) and config test pass. The pin's `--check` passes, and
the engine's Init is unchanged from v0.8.7. Every AURA module edited parses. AURA's 617 named imports resolve against
the new pin. In Node, the points' shrink matches the engine's RefitPoints exactly (a 180 x 120 mm frame: 0.4286, a
30 degree view becomes 64.03 degrees).

**Not yet:**
- Not run in a browser here: Adam tests it.
- While a viewport's points are edited on its sheet, the live engine's preview is still the whole sheet shrunk; its
  still is drawn true size when the editing ends. That preview is WebP (`Na__Viewports__ArtDirection__.js`), not
  changed here.
- A 3D frame bigger than A3 (on A1 or A2) still enlarges the engine's sheet: thicker pens. The engine draws on nothing
  bigger.
- A small frame now gets a simpler drawing (the Drawing Discipline reads millimetres on the paper), as a hand would.
- The Thrower drawing set's own sun (2 degrees, 14 degrees) and seed are not the engine's starting -44 / 38: they are
  its saved settings, left alone.

(Uncommitted, waiting on Adam.)

## Version 0.5.4, 30-Oct-2026: AURA Draws the Project's Own Model (the Whitecard From ValeVision 3D)

**Asked by Adam:** "We need to update Aura so it can now load the Whitecard model from ValeVision or (SketchUp
Eventually) ... This first method of creating an aura file should copy all GLB files accross and make them avaiblible
to Auras tools", then, when the scene file was codified but AURA still drew the demo cottage: "You didnt finish the task
FFS STOP GIVING UP".

**Built:**
- **The engine draws a GLB model** (PainterlyNPR v0.8.7, a915620, pinned here as `01__CoreLib__PainterlyNPR__v0.8.7`, the
  import map moved to it; nothing copied into AURA): `10__Import__ScenePackage`'s new Glb module reads GLB files and
  builds them in the cottage's place (`SetBase`), objects in the scene file's Id order with their category, material
  class and role; the pen's hard edges from each mesh file's linework twin (SketchUp's own edges, node for node), smooth
  silhouette edges from the mesh; the sun's square and the wash's footprint from the buildings; the lawn just under the
  site's own ground. Placed assets and given materials (0.4.0's drawer) build on top of it, and every rebuild keeps it.
  The demo cottage is byte for byte what v0.8.5 drew.
- **The API** (`Server__Api/Api__ValeVision__AuraRender/AuraRender__Api__Scene__.py` 1.0.0, in `wsgi.py`):
  `GET api/projects/<id>/scene` (the scene and its _rev, where its model files are served, and whether ValeVision 3D
  holds a whitecard, and a newer one); `POST api/projects/<id>/scene/import` (method one: every GLB of
  `ValeVision3D/Content__3dModel__GlbFiles`, checked against `valeVision_ModelUrls`, copied byte for byte into
  `Content__AuraScene__ModelFiles` with each copy's SHA-256 checked; a re-import zips the replaced files into
  `00__Archive`, reads the zip back and only then deletes the older zip, keeps every object's Id and what the scene said
  of it, marks a gone node missing, and keeps the model placement). One import a project at a time across workers (a
  library lock); the write is the library writer's, with its _rev check and revisions. The import rules are config:
  `AuraConfig__SceneImport__Rules`, `__ComponentRules`, `__SkipNodes`.
- **AURA opens the project's model** (`10__System__EngineHost/Na__EngineHost__Scene__.js` 1.0.0, called by AuraApp
  after the engine boots and before the 3D Environment and the sheets mount, so nothing is drawn twice): it reads the
  scene; **the first time a project with a whitecard opens with no scene, the API makes it** (the first method of making
  an aura file, no button); it fetches the model files from the library (behind the gate: signed-in staff), reads them
  with the engine's reader and hands the engine its base, the loader counting the megabytes. When ValeVision 3D's
  whitecard is newer, a note offers **Update the scene** (a re-import, then the page opens again). With no whitecard, an
  API from before the scene routes or an engine from before the seam, the demo cottage is drawn and a note says why;
  the build module is read through its namespace and the Glb module imported only when needed, so an older pin still
  loads.
- **The worker's cache version** 2026-10-30-11 (an engine sync). `AuraConfig__App__Version` 0.5.4.

**Checked here (no browser):** the engine in Node with its own modules and Thrower's real GLBs and scene file: 17 objects
with the scene's Ids, 17,314 triangles, 19,414 hard edges from SketchUp's linework and 7,046 smooth ones, built in under
0.1 s; the cottage byte for byte as the v0.8.5 pin; PainterlyNPR's module test (117 modules, 686 imports). The API with
Flask's test client in a sandbox copy of Thrower: the first import gives exactly the PC-built scene (Ids and hashes),
valid against the 1.0.0 contract; after a changed whitecard the scene reports Newer; the re-import keeps every surviving
Id, marks the gone node missing and appends the new one; the third import leaves one zip; unknown projects 404. Every
changed module parses; the new module's imports resolve against the v0.8.7 pin.

**Not checked:** a browser (Adam tests): the loader's counts, the first live picture of Thrower, its elevations and roof
plan, the note for a newer whitecard.

**Not yet:** storing a placed asset's MOD and DAT in `Content__AuraScene__AssetFiles` on a drawing set's save (the pin
has no `.glb` yet); AURA's own `library-access` (its folders are gated through ValeVision 3D's meanwhile); the sync map's
`ServerMadeContent` for the two scene content folders; method two (SketchUp's Painterly Scene Package); brick
indication and window shadow lines on a GLB model (a GLB carries no surfaces).

**Live:** needs `server-api` (the scene API, then a restart of `vale@ValeVision__AuraRender`) and `aura` (this
version, with the v0.8.7 pin). Thrower's scene is made on the server the first time it opens.

## Version 0.5.3, 30-Oct-2026: Leaders Leave Beside the First Line

**Asked by Adam** (a screenshot, the leader meeting the left side of the words at their first line ringed): "Ensure
the leaders when created attach to this kind of position of the text box currently they awkwardly attach to the tops
of the boxes which looks shit ensuring flipping right / left jusiticfcation switches the leader side in realtion to
its host box".

**Built:**
- **Where a leader leaves** (`Na__Handwriting__PenLeaders__.js` 1.4.0, `Na__Annotations__Layer__.js`): unless dragged
  or picked, a leader now leaves the words' side, level with the middle of the first line. That is half a capital
  down for architect's capitals, or the small letters' middle in a joined-up hand. Before, it left the top or bottom
  of the box.
- **The side follows the justification:** words set Left lead from the left, Right from the right. Centre and Box
  lead from the side nearer what the leader points at.
- A place dragged or picked in the panel still wins. The panel's automatic choice now reads "Beside the first line".
- Existing leaders with no place set move to the new start when the sheet next draws.

**Checked:** both files parse, the import check is clean, and the start points were checked for each justification
and tip (a picked place still wins, and a call without the note behaves as before).

## Version 0.5.2, 30-Oct-2026: Parameters Above the Art Direction Points

**Asked by Adam** (a screenshot of the 3D Environment's panel): "Flip the order of these".

**Built:** the panel's two sections swap: **Parameters** first, then **Art direction points**
(`Na__Environment3d__Stage__.js` 2.0.1). Each still folds and is remembered as before; nothing else moves.

**Checked:** the module parses. Not run in a browser here: Adam tests it.

(Uncommitted, waiting on Adam.)

## Version 0.5.1, 30-Oct-2026: Selecting Only While the Assets Drawer Is Out

**Asked by Adam:** "In both apps make it so as you can only select items when the assets menu is open, i keep
annopyingly selecting and highliting things so i need to way to gate it".

**Built** (`10__System__EngineHost/Na__EngineHost__Assets__.js` 1.1.0):
- With the Assets drawer folded away, a click on the 3D Environment's drawing selects nothing and paints nothing
  (`AssetsTap` asks `Na__EngineHost__AssetsOpen` first). Orbit, pan, zoom and the art direction points are untouched.
- Folding the drawer away does what leaving the tab does: the selection goes, the brush is put down and a placement is
  cancelled, so nothing stays outlined (`WatchDrawer`, watching the root's `PainterlyNPR--assetsOpen`).
- **PainterlyNPR v0.8.8** (288832c, pushed) has the same gate as engine seams, `PainterlyNPR__SceneEdit__Editing` and
  `PainterlyNPR__SceneEdit__WatchLibrary`, used by its own app. AURA's pin (v0.8.7) is without them, so the host keeps
  its two small helpers until the next sync, then takes the engine's.

**Checked:** the module parses.

**Not yet:** not run in a browser here: Adam tests it.

(Uncommitted, waiting on Adam.)

## Version 0.5.0, 30-Oct-2026: Scenes, SketchUp to LayOut

**Asked by Adam** (a screenshot with the Saved views section ringed, and an arrow from its icon to the strip): "Removed
the saved views menu section its useless and dosnt work trace the code clean up / 2. move Saved Views Logo to the views
tags and at the end of that list add a +Add Scene, right clicking the tabs should allow for renaming of scenes, these
scenes becoime viewports in the layout think SketchUp -> Layout logic". **His calls:** "Scenes SketchUp Style populate
all like now by default. when in the elevations its locks the camera to those orientations, i will get anothe ragent to
build a elevations camera tool as we need to be able to adjust elevation cut position etc"; an updated scene's
viewports all follow; right-click offers Rename, Update from camera, Duplicate, Delete; Set and Reload go.

**Built:**
- **Scene tabs** in the 3D Environment's toolbar (`Na__Environment3d__Stage__.js` 2.0.0): the Saved views icon, a tab
  a scene, then **+ Add Scene**, scrolling sideways when there are more than fit.
  - **A click opens a scene**: its camera and its art direction points. The tab stays lit while the camera moves, as a
    SketchUp scene tab does, and point edits save into the scene.
  - **An elevation or the roof plan** opens square and to scale (at the scale of the first viewport showing it), and
    holds its orientation while open: pan and zoom, never orbit. R brings it back. The engine's navigation can only
    hold the camera still, not its orientation, so a move that turns it is squared again in the same frame; a seam in
    PainterlyNPR's navigation, and the elevation camera tool (the cut position), are to come.
  - **+ Add Scene** keeps the camera and the points as "Scene N" (while an elevation is open, a copy of it centred where
    it is now, so it stays to scale).
  - **Right-click a tab:** Rename (typed in the tab; Enter or leaving keeps it, Escape does not; a name in use gets a
    number), Update from camera (SketchUp's Update Scene: a 3D scene takes the camera, a scaled one where it is
    centred; every viewport showing it follows; another scene than the open one asks first and keeps its own points),
    Duplicate, Delete (with the viewports showing it, after naming them; undo brings both back).
  - **The engine's presets** stay as the picker after the tabs; picking one lets the open scene go.
- **The Saved views section is gone** from the panel, with its list, form, `SaveView` and `RenderViews`, 0.4.4's
  viewport strip, Set and Reload, and their styles (`.aura-views__*` in two stylesheets, `.aura-vpstrip*`). The panel is
  Art direction points and Parameters.
- **On a sheet** (`Na__Viewports__Editor__.js` 2.0.0, `Na__DrawingSheets__Workspace__.js` 1.3.0): "Add a view" lists
  the scenes first, then new ones (an elevation, the roof plan, a preset, the 3D Environment's view now; one already a
  scene is that scene). A viewport's panel has a **Scene** picker in place of Side and View, says how many other
  viewports show it, and keeps its own scale, pen, frame and title. Alt-drag and a frame resize pan that viewport only.

**The data** (`Na__DrawingSet__Model__.js` 1.4.0, `Na__Viewports__Views__.js` 2.0.0):
- **A scene** is a record of `AuraDrawingSet__SavedViews` (the API takes only its four root keys, so the key keeps its
  name): `View__Id`, `View__Name`, `View__Kind` (Perspective, Elevation, Plan), `View__Side`, `View__Camera` (a 3D
  scene's, in 0.4.4's three-stage form), `View__Preset` (a 3D scene that starts from an engine preset, read from the
  engine, never copied), `View__CentreM` (a scaled scene's; null is centred on the building) and `View__Points`.
- **A viewport** is `Viewport__SceneId`, `Viewport__Kind` (its scene's, kept for the sheet's code), frame, scale, plan
  kind, profile, title, and `Viewport__PanM` (its own pan, metres from the scene's centre).
- **Older documents move across on load:** each viewport gets the scene it was showing (an elevation's side and centre,
  a saved view, a preset, 0.4.4's own camera), an identical one shared, its points with it; the old keys
  (`Viewport__Side`, `CentreM`, `CameraSource`, `Points`, `View`) go. So "populate all like now": every view there was
  is a tab. A second load changes nothing. `FitToSheet` (A3) refits each scene's points by its kind, after the move.
- **Agreed:** the A3 session (FitToSheet runs after Normalise, scaled scenes refit true scale), the whitecard session (a
  scene's camera is in AURA's world metres, after the AURA scene file's model placement, which nothing reads yet).

**Checked:** every module in the 3D Environment, viewports, drawing set and sheets parses; every relative named import
in AURA resolves (0 problems); in Node, a new drawing set makes six scenes for its six viewports, and an older set (two
sheets, elevations with and without a centre and points, a saved view, a preset, a 0.4.4 own camera) moves onto five
scenes, the two Front Elevations sharing one, and normalises again unchanged.

**Not yet:**
- Not run in a browser here: Adam tests it.
- Not to be pushed with nothing else: an older AURA cannot read a drawing set this version has saved (the handwriting
  session, pushing 0.4.9, was asked to wait for Adam's word).
- The orientation hold is AURA's; an engine seam would be cleaner. The elevation camera tool is another job (Adam).

(Uncommitted, waiting on Adam.)

## Version 0.4.9, 30-Oct-2026: Architect's Capitals, Even Joined-Up Lines, and Box Handles

**Asked by Adam:**
- With two screenshots of garbled capital notes and a scan of a hand-lettered note: "Investigate why the model is
  failing off like this? on multiline text, do we need to tell it to break lines properly? the writing needs to be like
  image 03, all caps (but can do regular) but neat".
- "Also the careful and quick hand presets do not work, they fail to generate only the first does".
- With a screenshot, the note box's left side ringed: "Add a handle here so you can drag to set the text box size,
  remove the box size from the menu its simply not intuitive".

**His calls:**
- Architect's capitals by default.
- Old notes redrawn in capitals.
- Titles in capitals.
- One letter size on every joined-up line.
- A joined-up note shown line by line, with a line the model can't write lettered in capitals.

**What was wrong:**
- **Capitals, not line breaks.** The Graves model learned from ordinary handwriting (IAM-OnDB), where capitals mostly
  start sentences. Given a line of them it loses its place: TTTT, AMD for AND, PRINTIMG, letters dropped. The notes
  already wrap by words (each line one phrase, at most 42 characters), and the failures are inside the lines.
- **Measured:** two notes in capitals and in ordinary case, with all three hands and two copies each. Capitals failed
  outright 4 times in 12 and came out garbled the other 8. Ordinary case wrote all 12 legibly.
- **Careful and Quick were not broken.** In capitals any hand fails at random: Steady failed one of the test notes too,
  and got through on Adam's note by the luck of its seed.
- **A real layout flaw:** each phrase was scaled to its own ink height, so a line with a g, a y or a slip came out
  smaller. Over 148 phrases, lines without descenders were drawn 45% larger.

**Built:**
- **Architect's capitals** (`02__Engine__Wasm/Na__HandwritingEngine__Capitals__.js` 1.0.0, new). Single-stroke
  capitals, figures and symbols (A to Z, 0 to 9, punctuation, ± × ° Ø ² ³ & # % @), each a few pen strokes, spaced by
  their sides.
  - Every letter is drawn with a seeded hand's variation: height, width, lean and drop; corners off true; stroke ends
    carried over a joint or short; a slight bow; a fine tremor.
  - The note's hand sets how much: Careful neatest, Quick liveliest.
  - Lower case is lettered in capitals. A capital stands 0.7 of the letter height, so a note keeps its size.
  - It needs no model, so it is drawn on the page at once (a few milliseconds a note). It never fails and never
    misspells.
- **Letters per note** (`Annotation__Letters`; the panel's Letters, after Hand): Architect's capitals (the default)
  or Joined-up handwriting. Notes from before take the default, so they are redrawn in capitals; switching one back
  writes its joined-up copy again from its seed.
- **The joined-up hand, steadier:**
  - **One letter size on every line** (`Na__HandwritingEngine__Neural__.js` 1.2.0): the model's own scale (470 units
    to a letter height) with the densest band of ink at one height.
  - **A run typed in capitals** (NG, LED) is drawn in capitals at once.
  - **A phrase the model cannot write** after its tries is lettered in capitals with a warning; a note never fails as
    a whole now.
  - **Numbers and symbols** stand as tall as a capital on the baseline (they were a whole letter height tall, so
    "1 : 50" towered over its words).
  - **One gap where runs meet** (NG31 tight, a typed space one word gap; the studio's lead space now 0).
  - **Line by line:** the worker posts each line's ink as it is written, and the sheet draws it with the typed rest
    beneath.
- **Titles in capitals:** the title block's entries and every viewport's title (`Na__Handwriting__Lettering__.js`
  1.1.0) are drawn at once. They never wait, stall or show typed.
- **Each ink path carries its line** (`L`) and, in capitals, its word in the line (`U`), for UI HELPER's Justify.
- **The box's two sides** (`Na__Annotations__Layer__.js` 1.5.0): a selected note has a handle on each side; drag
  either to size the box its words wrap to. The panel's Width (mm) is gone.
- **The old stroke capitals go** (`TechStrokes` 1.2.0); the capitals engine draws them now.

**AURA 0.3.4 (live 30-Oct-2026 15:05:49, logged here):** handwriting in the title block and viewport titles
(Adam: "Use handwriting in the titleblock and viewports not text"), through the model, kept on each device and
typed until written. Its short entries often stalled (a four-letter word stalled in up to 75% of tries), which is a
further reason the titles are capitals now.

**Checked:**
- Every changed module parses. The import check finds no problem in these files (its 8 are in another session's 3D
  Environment work in progress).
- Six notes ran through the real layout: three in capitals (a few milliseconds each) and three joined-up (partial ink
  arrives line by line). Every path carries L, and capitals carry U.
- The title block proof letters every entry, including the address and "1:50, 1:100 AT A1".
- Looked at: the glyph sheet at 9 mm, words at 30 px/mm, and the scanned note's words in each hand.

**Not yet:** the joined-up hand can still misform a letter that the check cannot see ("te#" for "text"). Capitals are
the answer for drawings that will be issued.

## Version 0.4.8, 30-Oct-2026: A Parameter Dump for Developers

**Asked by Adam** (a screenshot of the avatar menu, an arrow under "Save the drawing set now"): "For developers in here
in the Aura App, add a parameter dump button, this dumps literally all settings for everything to a json file for
debugging / handover to coding agents"

**Built:**
- **The button** (`Na__AppCore__AuraApp__.js`): **Download a parameter dump**, under a Developer tools heading at the
  foot of the avatar menu's own items. App Admins only (`adminOnly`), as ValeVision 3D's and Theia's developer tools.
- **The dump** (new `Na__AppCore__ParameterDump__.js` 1.0.0): one JSON file,
  `ValeVisionAura__ParameterDump__<library id>__<yyyymmdd-hhmmss>.json`, made in the browser and downloaded. Nothing
  goes to the server, and taking it changes nothing. One key a part:
  - `Meta`: when, who (code, name, level, role), the app's version and page, the browser (window, screen, pixel
    ratio, cores, memory), the service worker and the PWA's `aura-` caches by name (a stale cache shows here), and
    `Errors`.
  - `Project`: the project's record, without the client's address.
  - `Page`: the open tab and sheet, the selection, the tool, unsaved edits, the drawing set's revision, the header's
    save state and the engine's status line.
  - `Engine`: everything PainterlyNPR holds (below).
  - `DrawingSet`: the whole document: sheets, viewports, notes, saved views, the engine's saved settings.
  - `AppConfig`: every key of the app config, as the page has it (new `Na__AppConfig__All`).
  - `Handwriting`: the engine's loading state.
  - `BrowserStorage`: this browser's AURA and PainterlyNPR keys (panel widths, work mode, open folds). No other
    app's keys.
- **The engine's part** (new `Na__EngineHost__Dump__.js` 1.0.0, in the engine host: only that folder imports the
  engine; recorded in the import map's index). Read only: it sets nothing and asks for no render.
  - The whole `State`, not only what a drawing set saves (that is there too, as `SavedSettings`).
  - The live camera and points, and the 3D Environment's own when a sheet's viewport has borrowed the engine.
  - Every range control: its path into State, label, range, value and the engine's own readout.
  - The two choices with their options, and the camera presets with their cameras.
  - The render graph: its flags, the inputs' versions, every pass's status, stamp and last time. Read through the
    module's namespace, so a pin without one of those exports still loads.
  - The GPU in sizes only: targets, scale, largest texture, the renderer's name. No pixels.
  - The scene's counts and the building's bounds.
- **Plain JSON whatever it meets:** Maps become objects, NaN and Infinity their names, typed arrays their type and
  length, elements their tag; a part that throws is written as `{ DumpError }`, listed in `Meta.Errors`, and the toast
  says how many parts could not be read.
- **Checked on the local server** (Thrower, engine v0.8.5): signed out, the engine started on a spare canvas, then a
  dump taken before and after it started. No part failed either time; about 77 KB, with 89 controls, 18 passes, the
  GPU, the scene and all 20 State keys. The save made its blob link and toast and took the link away again (the
  download itself held back). The menu item shows only to a signed-in App Admin, so it was not seen there.
- **Live** on app.valegardenhouses.com/aura/ (it went up with the push of the versions after it; the live module is
  byte for byte the PC's). The API reads the config fresh, so no restart.

(Committed at Adam's word: "Commit it". The code and its records only: the versions round it were not done yet.)

## Version 0.4.7, 30-Oct-2026: Where a Leader Leaves Its Words, and Justified Notes

**Asked by Adam** (a screenshot of a leader note: where the leader meets the words circled, with arrows to the left and
to the right under the note): "Add controls to move the point where it hits the textr box / add jusfity text left,
right, centre and box"

**Built:**
- **Where a leader leaves** (`Na__Handwriting__PenLeaders__.js` 1.3.0, `Na__Annotations__Layer__.js` 1.4.0).
  - A selected leader shows a small square where it meets the words. Drag it and it slides round the words' box to
    the nearest side: under, over, or either end. The leader always leaves that side square to it.
  - The note panel's **Leader leaves** picks a place instead: Automatically (as before, toward the tip), under, over
    or beside the words. A dragged place shows as "Where dragged", and its square fills in.
  - The place is stored as a side and a share along it (`Annotation__LeaderFrom { Side, At }`), so it stays in the
    same place on the box when the words change.
- **Justify** (new `Na__Annotations__Justify__.js` 1.0.0).
  - Four buttons in the note panel: Set left, Centred, Set right, and Box (justified).
  - They are set on the sheet from the ink already written, so they are instant and the hand-written copy stays the
    same copy.
  - Centre and right move each line within the note's own inked width.
  - Box widens every line but the last to the widest, sharing the extra between its word spaces. A short line (a
    paragraph's end) is left as it is.
  - Lines come from each ink path's line number when the engine gives one; the handwriting session is adding it.
    Otherwise every path is measured from its own path text and the lines are split at the widest vertical gaps.
  - Words are the gaps clearly wider than a pen lift.
  - A note not yet written shows its typed stand-in centred or right too.
  - Four new icons (`Na__AppUtils__Dom__.js`).
- **The data** (`Na__DrawingSet__Model__.js`): `Annotation__LeaderFrom` (null: automatic) and `Annotation__Align`
  ('Left'). Older notes load as before, and the undo list says "Move where a leader leaves" and "Justify a note".
- **Checked in node:**
  - synthetic three-line ink: centred, right and box offsets as expected, the last line left alone;
  - the drag snaps to the nearest side.
- Not run in the browser.

**Not yet:** box justify on joined-up writing depends on the gaps between its words. Where the model writes words
close together, a line may stay as written.

(Uncommitted, waiting on Adam.)

## Version 0.4.6, 30-Oct-2026: Page Whiteness, Ready for the Next Engine Sync

**Asked by Adam:** "Add a new sheet parameter - page whiteness alows for tuning the page to be whiter"

**Built:**
- **In PainterlyNPR (v0.8.5), not here.** Page whiteness is an engine control (Paper and finish, under Sheet,
  0 to 100%, default 0%): it lifts the paper's tone toward white, the washes with it, the ink untouched. AURA builds its
  parameters from the engine's panel config, so the slider appears in AURA by itself once the pin carries v0.8.5.
  Nothing of it is copied here.
- **The sheets' paper** (`Na__EngineHost__Panel__.js`): the bare paper tile is made again when Page whiteness moves
  (it is in the tile's key), and the sheets' flat tone is the engine's `PainterlyNPR__Paper__Tone()` when the pin has
  it, so a sheet and its pictures stay one piece of paper. On the current pin (v0.8.2) nothing changes.
- **Saved views** (`Na__EngineHost__PainterlyNpr__.js`, ApplySettings): a view saved before Page whiteness opens at 0%,
  its own sheet's tone, instead of keeping whatever the slider last read.

**Not yet:**
- Not tested in the browser (Adam tests). Production needs a push.

**Synced** (Adam: "Commit and sync"): PainterlyNPR v0.8.5 committed as aea59fd (with v0.8.4's folding panel) and
copied from the commit into `01__CoreLib__PainterlyNPR__v0.8.5`; index.html's import map and its record point at it,
and `--check` says the copy is untouched and the same as the repo. Init did not change since v0.8.3, so the engine
host needed nothing new. The v0.8.3 folder stays until Adam has checked v0.8.5.

(AURA's own files uncommitted, waiting on Adam.)

## Version 0.4.5, 30-Oct-2026: Spline Leaders You Bend by Hand

**Asked by Adam** (two screenshots: a hand-drawn sheet's leaders, long and smooth, curving under their notes; and
AURA's, a straight, wobbly line): "Image 01 shows the leaders how we need / image 02 shows our crappy leaders / Add
natural feeling spline, each time you click and drag a point it smoothly iterpolits it / and the you can edit the
spline after if needed / holding control and clicking the spline should insert new points / control shift click or
select delet delete poihs / Aim: create beautiful leaders"

**Built:**
- **The curve** (`Na__Handwriting__PenLeaders__.js` 1.2.0). A leader now leaves straight down (or up) from under its
  words, near the side it is heading for, and swoops to its tip. Like image 01, it arrives a little off the straight
  line, and the note's seed decides which way and how far. It leaves from the note's side only when the tip is beside
  the words.
- **Bend points.** With bend points, the leader is a centripetal Catmull-Rom spline through every one. It passes
  through each point exactly and never loops or overshoots when points bunch up. It still leaves its words along the
  same downward line.
- **The line.**
  - One smooth path at the nib's width, in place of the studio's many short wobbly strokes. A hand's slow, faint tremor
    of 0.05 mm (`Na__PenLeaders__TREMOR_MM`) fades out at both ends.
  - The variable pen keeps a pressure swell along it.
  - The arrowhead is laid along the curve's arrival over its last 2 mm.
- **Editing** (`Na__Annotations__Layer__.js` 1.3.0):
  - A selected leader shows its bend points as small handles. Drag one and the leader follows smoothly as you drag.
  - Ctrl + click the leader to add a point there, in its place along the curve; it is picked up so the same drag
    places it.
  - Ctrl + Shift + click a point to take it out, or click it (it fills in) and press Delete. Delete takes the note only
    when no point is selected.
  - The note panel says how, and gains Straighten once a leader has points.
  - The hit line follows the curve.
  - Cmd works for Ctrl on a Mac.
- **The data** (`Na__DrawingSet__Model__.js`): `Annotation__BendsMm`, an array of `{ X, Y }` mm on the sheet from the
  words to the tip. Older notes load with none, and the undo list says "Bend a leader" (`Na__DrawingSet__History__.js`).

**Not yet:** not tested in the browser (Adam tests). The bend points stay on the sheet when the note is moved, as the
tip does. Production needs a push.

(Uncommitted, waiting on Adam.)

## Version 0.4.4, 30-Oct-2026: The Strip Is the Drawing's Viewports, Each With Its Own View

**Asked by Adam** (with a screenshot of the 3D Environment's toolbar, the five camera presets ringed): "Ensure these
reflect the drawing viewports, clicking them should open the viewport in the viewer 3d page and allow you to view, set,
load, reload the views that go on to become the the viewports, this data will have have to be jsonified per viewport in
my style, see the ValeVision 3D Drawing layout editor and speak with the other agent currently working on building out
the structure schema for per project file saving." **His calls:** every viewport of every sheet in the strip, the
engine presets gone from it; Set changes that viewport only; an elevation or the roof plan takes only its centre; the
data stays in the drawing set.

**Built:**
- **The viewport strip** (`Na__Environment3d__Stage__.js` 1.5.0) replaces the camera presets: each sheet's name, then
  its viewports as chips ("Front Elevation 1:50", "View From the Garden"). It scrolls sideways when there are more than
  fit, and it redraws when a viewport is added, retitled or removed, or after an undo.
- **A click opens the viewport here**: its camera (a scaled view square to the building and to scale) and its art
  direction points, which the Art direction points section now edits (`Na__Environment3d__ArtDirection__.js` 1.1.0, a
  viewport owner beside the saved view). Its chip stays lit while you look round.
- **Set** (lit once the camera is off the viewport's view) writes the view back:
  - A 3D viewport takes the camera as its own. One that showed a saved view takes a copy of that view's points in the
    same step, so it draws as it did and stands alone from then on.
  - An elevation or the roof plan takes only where the camera is centred (`Viewport__CentreM`, as the sheet's Alt-drag
    pan does); its side and scale stay, and the live camera goes back square and to scale.
- **Reload** puts the camera back as the viewport has it. Saved views stay in the panel, as views to load and then Set
  into a viewport.
- **The engine's camera presets** are a "Presets" picker after Reload (Adam, on the first hand-over: "Fix these"):
  starting points, not the strip. Pick one and the live camera goes there; a viewport open in the strip stays open, so a
  preset can be Set into it. R still resets the camera.
- **The sheet's View picker** (`Na__Viewports__Editor__.js` 1.3.0) shows "Its own view" for a viewport set this way;
  picking a preset or a saved view there lets its own camera go.

**The data, per viewport** (`Na__DrawingSet__Model__.js` 1.3.0, `Na__Viewports__Views__.js` 1.2.0). Every viewport
carries one block, in three-stage keys with their units, after ValeVision 3D's saved camera scenes
(`PresentationMode__Scene__CameraPosition`) and the Layout Editor's viewport records:

```json
"Viewport__View": {
    "View__Camera": {
        "Camera__Mode": "Perspective", "Camera__TargetM": [1.5, 3.25, -2.125], "Camera__YawDeg": 37.123457,
        "Camera__PitchDeg": 12.5, "Camera__DistanceM": 23.456789, "Camera__FovYDeg": 32,
        "Camera__HalfHeightM": 10, "Camera__Ceiling": 1
    },
    "View__SetIso": "2026-10-30T15:42:10.000Z",
    "View__SetBy": "USR00000001"
}
```

- `View__Camera` is null until a 3D viewport is set: the viewport then follows `Viewport__CameraSource` (a preset or a
  saved view), as before. An elevation's or the roof plan's is always null: their view is their side, scale and
  `Viewport__CentreM`, so nothing stored can take them off true scale.
- `Na__DrawingSet__CameraToJson` and `CameraFromJson` are the only crossing between the file and the engine's camera
  object. **Saved views use the same form** (Adam: "Fix these"): `NewSavedView` writes it, every reader goes through
  `CameraFromJson`, and Normalise moves a saved view from before 0.4.4 (the engine's `{ Mode, Yaw, ... }`) across
  through `Na__DrawingSet__CameraJson`, so the file has one camera shape. Normalise gives older documents the block, so nothing needs migrating. The block sits inside
  `AuraDrawingSet__Sheets`: no new root key, no API change.
- **Agreed with the Project AURA structure session:** inside the drawing set, no new file. They are making no change to
  the root keys, Normalise or the API. The points are copied when a viewport leaves its saved view, and scaled views
  take the centre only. The signatures of `Na__Views__Camera`, `PointsOwner`, `Points` and `SetPoints` (the sheet's
  point editor and the render queue call them) are unchanged.

**Checked:** every changed module parses (node --check); every relative named import across the app resolves (a
scan: 0 problems); the camera's file form round-trips in Node (within a micrometre, inside Set's 1e-4 tolerance), and
an unreadable block is dropped to null; Normalise moves an old-form saved view across, keeps a new-form one as it is,
and drops one whose camera cannot be read (as before, when it had none).

**Not yet:**
- Not run in a browser here: Adam tests it.
- Push this with nothing older left open: AURA 0.4.3 or earlier, opening a drawing set this version saved, would read
  its saved views' new camera form as a broken camera.

(Uncommitted, waiting on Adam.)

## Version 0.4.3, 30-Oct-2026: The Engine's Sheet Is A3, and Sheet Pictures at 300 dpi

**Asked by Adam:** "ensure in both Aura and the NPR Viewer the page for the 3D Viewer represents an A3 Peiece of paper
sizes and proportions, this is key so they linework represents how it would actrually look printed at scale". Asked
four questions first, he chose A3 landscape; the same cameras, so the drawing grows on the bigger page; saved points
moved with the picture; and "Documents should be 300 dpi on both". The engine's half is PainterlyNPR v0.8.3, in its
own DEVLOG. (It landed after 0.4.4, which took the next number while this was in flight.)

**Built:**
- **The sheet is the engine's.** AURA reads it from the engine (`Na__EngineHost__SheetMm`) everywhere. So the 3D
  Environment's canvas, its fitted shape, the scaled viewports' true scale (sheet height x scale / 2000 m: 1:50 on A3
  is a 7.425 m half-height) and the largest scaled frame all become A3 at the next sync, with no number of it written
  here. `index.html`'s canvas attributes (2100 x 1485) and the stage's placeholder size are only first paint; the host
  sets the size from the engine.
- **Sheet pictures at 300 dpi** (`Na__Viewports__RenderQueue__.js` 1.2.0): stills are drawn at
  `AuraConfig__Viewport__RenderDpi` (300) on the paper, in place of the engine's 5 px/mm screen size
  (`Viewport__RenderScale` is gone). The engine's A3 sheet at 300 dpi is 4961 x 3508 px. A GPU that cannot hold it
  draws that picture at screen size instead, and says so in the console.
- **Points from the old sheet** (`Na__DrawingSet__Model__.js` 1.3.1, `Na__DrawingSet__Persistence__.js` 1.2.0): a
  drawing set keeps the engine sheet its points were placed on, as `AuraDrawingSet__Engine.SheetMm` (inside Engine,
  the API takes only its four root keys). When a set loads, or is new, `Na__DrawingSet__FitToSheet` moves points from
  another sheet onto today's with the engine's own `RefitPoints`. A set that names no sheet was placed before A3.
  Saved views, the 3D Environment's points and 3D viewports grow with the picture (x 1.485 about the centre). An
  elevation's or the roof plan's points keep their millimetres and follow the centre, because those views are true
  scale.
- **The seam** (`Na__EngineHost__PainterlyNpr__.js` 1.6.0): `Na__EngineHost__RefitPoints` reaches the engine's
  RefitPoints through the module's namespace. The v0.8.2 pin, which has no such export, still loads, and the points
  stay as they are.
- **The engine is synced: PainterlyNPR v0.8.3 at c1917f0** (Adam: "Yes, commit v0.8.3", then "Sync now"), in
  `04__Lib__CoreEngine__VersionLocked/01__CoreLib__PainterlyNPR__v0.8.3/`, copied from the commit. It brings v0.8.0's
  four technical pens and v0.8.1's paper as well as the A3 sheet. `c1917f0` is the pen session's follow-up, which takes
  an uncommitted Page whiteness item back out of the panel config. index.html's import map and its record point at
  it, and the worker's `AURA_VERSION` is 2026-10-30-9. The engine's Init changed only by v0.8.3's two lines for its
  own page (the sheet's shape and tag), which AURA's host does not need: its stage fits the canvas. All 78 names AURA
  imports from the engine are exported by the new pin. The v0.8.2 folder stays until Adam has checked this one.
- The wording that said 300 x 200 now names the engine's sheet: the viewport editor's hint (read from the engine), the
  config's ScaledFrameNote, the notes in the host, the model, the views and the stage, and the README.

**Not yet:**
- **The cost of 300 dpi.** Each sheet picture is about 5.6 times the pixels it was, needs about 2 GB of GPU memory and
  takes several times longer, so a sheet of six views fills in slowly. Lower `AuraConfig__Viewport__RenderDpi` if
  that is too slow. A lost WebGL context cannot be caught: only a refused size falls back.
- Not tested in the browser (Adam tests). Production needs a push: the next push sends the new pin and every
  session's open AURA work with it.

(Uncommitted, waiting on Adam.)

## Version 0.4.2, 30-Oct-2026: Icons on the Panel's Sections

**Asked by Adam:** "Load your graphic designer skill and create icons for this app" (a screenshot of the 3D
Environment's panel: Saved views, Art direction points, Parameters; Paper and finish, Light, Pen, Wash, Sky), then
"add them to THE LIVE APP and push the vale server ... and add the gaphics tro the graphic designer skill lib".

**Built:**
- **Eight line icons**, `01__AppAssets__AuraRender/UiIcons__MenuIcons__PanelSections/Icon__PanelSections__<Name>__.svg`
  (1024 artboard, house ink #172b3a, round caps; 336 to 1,040 bytes): Saved views (a view of a house with a bookmark),
  Art direction points (a pin in its ring of reach), Parameters (three sliders), Paper and finish (a sheet with its
  corner curling), Light (the sun), Pen (a drawing nib), Wash (a round brush laying a wash), Sky (a cloud).
- **Their weight is the app's own glyphs'**: 76.8 per 1024 = `Na__Dom__Icon`'s 1.8 on 24, so at 20 px each draws the
  chevron's 1.5 px line. The Gold Standards' 60 was tried first and looked spindly beside the 16 px semibold titles.
- **Wiring:** `Na__Dom__PanelIcon` (`03__AppUtils/Na__AppUtils__Dom__.js` 1.1.0) makes the `<img>`; a section takes
  `spec.icon` (`Na__AppUtils__Panels__.js` 1.2.0; the Stage's three sections, 1.4.1); a parameters section takes its
  icon from its key in the engine's panel (`Na__Environment3d__Parameters__.js` 2.2.0: Paper, Light, Pen, Wash, Sky,
  and "More from the engine" the sliders), the groups inside none; 20 px, the title still left-aligned
  (`Na__CoreUi__Styles__Panels__.css` 1.1.0).
- **The skill's copies:** the 20-Series folder `2026-10-30__AuraRender__PanelSections`, the specs and generator in
  `01__ProductionFiles` (vector-graphic-artist).

**Checked:** lint clean (bar the deliberate weight note), every gap at least 0.94 of a stroke, browser against resvg
0.996 or better; the real panel modules, stylesheets and the pinned engine's panel config in a harness page: all eight
load, the five parameter sections get the right icons, the groups inside none, no errors. Not yet seen in the signed-in
app on the server.

## AURA Scene Schema 1.0.0, 30-Oct-2026: The Scene File and Its Folders (No App Version: Nothing Reads It Yet)

**Asked by Adam:** "update Aura so it can now load the Whitecard model from ValeVision or (SketchUp Eventually) ...
create a per project subfolder in the established style ... This first method of creating an aura file should copy all
GLB files accross and make them avaiblible to Auras tools ... Create a schema for the file structure required because we
will have to store the main asset glb files but user added glb files such as tree and scene dfressing from our library
... build out a example ... for me to inspect first ... once im happy we will codify into a final schema and then build
out the Thrower project". **His calls:** library assets, "save a copy but instance it where possible"; the example "in
the espablished style" in the project's own folder (the first one was built in a staging folder and moved); a re-import
"zipped and archived, keep the last save, deleted each subiquent zip once one is backed up as a failsage"; then "Yes,
codify it".

**Codified:**
- **The scene** (the "aura file"): one per project, `<project>/ValeVision__AuraRender/UserData__AuraScene/<id>__AuraScene__.json`
  (user data, the API only): the source and every import, one model placement into the engine's world (+Y up, front
  +Z), the model files (`ModelFile__*`: part, kind, use, role, size, SHA-256), the engine objects made from them
  (`Object__*`: Id from 1 and never reused, file and node, mesh, SketchUp persistent id, category, material, role) and
  the library assets stored (`AssetFile__*`). Placed assets and given materials stay the drawing set's (0.4.0); a
  material's `#Id` is the scene's `Object__Id`.
- **Its folders:** `Content__AuraScene__ModelFiles` (byte-for-byte copies of ValeVision 3D's whitecard GLBs, names
  unchanged; `00__Archive` keeps one zip, the last replaced set, the older one deleted only once the new zip checks
  out) and `Content__AuraScene__AssetFiles` (each library asset's MOD `.glb` and DAT `.json` once, library names; every
  placement an instance of it, the geometry shared where the asset keeps one shape).
- **The contract:** `05__Contracts__JsonSchemas/AuraRender__Schema__AuraScene__1.0.0__.json` (JSON Schema 2020-12, in
  PainterlyNPR's form) and its README; the rules and the import: `AuraRender__SCHEMA__AuraScene__.md` at the root.
- **The schema project** (`12345__ExampleProject__Schema/ValeVision__AuraRender/`): the two content folders with
  placeholders and the archive zip's name, `UserData__AuraScene/PROJECTNUMBER__PROJECTNAME__AuraScene__.json.example`
  (abridged from Thrower), and the package example's note (method two).
- **Thrower** (`63403__Thrower/ValeVision__AuraRender/`): the first scene, 7 model files, 17 objects (the 14 columns 5
  instanced shapes); first built as an example for Adam to inspect (dummy GLBs, 4 example stored assets), then for real
  (below). Adam's drawing set there untouched (its hash the same before and after).

**Checked:** the contract is valid draft 2020-12; Thrower's scene and the schema project's example are valid against it;
every GLB well formed; the example edit's placements and materials valid against PainterlyNPR's AssetPlacement and
MaterialAssignment 1.0.0.

**Thrower built for real** (the same day, Adam: "Yes, build Thrower"), on the PC, before AURA's API import exists: the 7
whitecard GLBs copied byte for byte over the dummies (2,307,120 bytes, each SHA-256 equal to its source; the copies
dated today, so newer than any dummy that may have reached the server), the example's 4 asset copies and 2 placeholders
taken out (nothing is placed in Thrower's drawing set), and the scene written as import 1 (rev 1, valid against 1.0.0):
7 model files, 17 objects, no stored assets. The drawing set's hash the same before and after. A scoped compare
(`projects --scope ValeProjects__2026/63403__Thrower`): the 7 GLBs to push (2.31 MB, nothing else); the example's 8
asset files already on the server (a push in the hour before had carried them up), waiting for `engine delete` at
Adam's word; the scene file PC only. `seed` has no scope (it would upload every PC-only user-data file in the library),
so the scene file waits for AURA's API. The live drawing set on the server is Adam's rev 120 (rev 55 here).

**On the server** (Adam: "Yes, push and delete", then "Applied, push now"): the library gate did not cover AURA's
folders, so the push waited. The routes file's `valevision` list gained AURA's three scene content folders
(ValeVision 3D's `library-access` answers for them: signed-in staff; AURA's own route cannot until its API answers
`library-access`), tested, and applied at 16:18:29 UTC (nginx `607291531112`; run here once `nginx-status` showed
Adam's apply had not reached the server). Thrower's 7 GLBs had already gone up at 16:08:43 in another session's
`projects` push, so they were reachable without sign-in for ten minutes; nginx's access log shows no request for them
in that window. They now answer 401 signed out, as their ValeVision 3D originals do. The example's 8 asset files,
pushed at 15:57:36 the same way, were deleted (16:08:40 and 16:20:23, backed up; the first delete call passed paths
with a stray `\r` and the engine refused all but one).

**Not yet:** the API (read, save, import, re-import, storing an asset, its own `library-access`), the sync map's
`ServerMadeContent`, pinning the library's MOD `.glb` files, the engine's GLB scene and the page.

(Uncommitted, waiting on Adam.)

## Version 0.4.1, 30-Oct-2026: Parameter Sections Fold Like an Accordion

**Asked by Adam:** "The UI in Aura sucks the sections do not close in the menus (fold) keep them all folded and then
when a user unfolds the section they want in the parametyers the other paraemer sections foilds otherwise the menu
becomes hard to use".

**Then, on seeing the first pass:** "complete bullshit you didnt fix it": only the top-level sections had been changed; the
groups inside them (Wash, Windows, Kuwahara...) still opened at first and stayed open together.

**Built:**
- **Every fold in the Parameters panel starts folded, at every level**, on every load, and **opening one folds its open
  siblings**: one section open, and inside it one group open (`11__System__Environment3d/Na__Environment3d__Parameters__.js`
  2.1.1, `Na__Parameters__Fold`). Nothing about the folds is remembered any more (the `ValeVisionAura__ParameterFolds`
  store is no longer read). The info button still opens a closed fold, folding its siblings.
- **The side panels' sections do the same** (`03__AppUtils/Na__AppUtils__Panels__.js` 1.1.0): Saved views, Art direction
  points and Parameters in the 3D Environment, and the sheets' Sheet, Title block, Revisions, Viewport, Art direction
  points and Note, all folded at first; opening one folds the others through their own `SetOpen`, so the art direction
  points still hear that their section closed.
- The same behaviour is in PainterlyNPR's own panel (its v0.8.4, `80__System__HudOverlay` Panel and Wire). AURA's
  panel is built by AURA from the engine's config, so this needs no new pin.

**Not yet:** the writing style's folds (`31__System__Handwriting/Na__Handwriting__Style__.js`) are unchanged.
Not run in the browser here: Adam tests it. On app.valegardenhouses.com it arrives only with a push.

(Uncommitted, waiting on Adam.)

## Version 0.4.0, 30-Oct-2026: The Engine's Assets and Materials Drawer, and No Copies of the Engine

**Asked by Adam:** "add the materials and assets loader from npr renderer to aura / dont duplicate code the npr repo
remains definitive source / ensure your skills reflect this, no duplicating code".

**Built:**
- **The Assets drawer in the 3D Environment** is PainterlyNPR's own (`82__Hud__AssetCatalogue`, both tabs), mounted
  from the pinned engine by a new host module, `10__System__EngineHost/Na__EngineHost__Assets__.js`: a slim tab down
  the stage's left edge, pulled out to the engine's drawer width (the stage refits the drawing in what is left).
  - **Objects:** the asset library's 26 assets, searched and filtered, with Rendered or Proxy pictures. Drag a card onto
    the drawing, or click it and then the drawing. The placed list turns, moves and takes out each one.
  - **Materials:** the material classes as swatches. Click one and each click on the drawing gives it to the object
    under the pointer, or one face of it (Give to Face; Shift flips it), or drag a swatch onto the drawing. The given
    list selects or takes off each one.
  - A click on the drawing selects what is there (a placed asset whole, or an object), outlined over the drawing.
    Leaving the tab puts the brush down, lets a carried card go and clears the selection.
- **Kept with the drawing set and undone with it:** placed assets and given materials are engine settings (`Assets`,
  `Materials`, written only when there are any). Each change is saved, takes a step in 0.3.1's history and redraws the
  sheets' stills. An undo, or opening the set, puts them back whole and the engine rebuilds the scene (host 1.5.0).
- **Nothing of the engine's is copied into AURA any more:**
  - The sync (`AuraRender__BuildUtil__SyncCoreEngine__.py` 1.1.0) pins what the engine reads from outside its
    modules: the asset and material libraries (their .json and .webp only, never .skp or .glb) and its stylesheets,
    beside `02__Src__AppModules` as in PainterlyNPR. It copies HEAD's commit with git archive (the repository's own
    bytes), so other sessions' open work no longer blocks a sync; `--allow-dirty` still copies the working tree.
  - The engine's palette, copied value for value into `Na__UiFeature__Styles__ArtDirection__.css` in 0.3.0, is gone:
    the host links PainterlyNPR's own Variables from the pin, and AURA overrides only the font. AURA's look for the
    engine's general classes (buttons, chips, hints) now reaches the drawer too: a skin, not a copy.
  - The engine host's header: the folder is the door. This module, `Na__EngineHost__Panel__` (0.3.3) and
    `Na__EngineHost__Assets__` import from the engine; nothing else in AURA does.
- **What the engine gained for it (PainterlyNPR v0.8.2):** its two libraries read from its own files, so from the pin;
  `BuildAssetDrawer({ Factory: false })` (the factory stays in PainterlyNPR, and its pictures come with the pin); the
  drawer's open state on `Ui.Root`; `OnAssetsChanged`.
- **The engine is PainterlyNPR v0.8.2 at 69b2e36** (committed at Adam's word: "Yes, commit v0.8.2"), synced from the
  commit into `04__Lib__CoreEngine__VersionLocked/01__CoreLib__PainterlyNPR__v0.8.2` (376 files: 237 modules, 80 asset
  library, 55 material library, 4 stylesheets; `WorkingTreeClean: true`; `--check` clean). Its Init is the one the
  host was read against. `index.html` and the import map record point at it; `AURA_VERSION` is `2026-10-30-6`. All
  78 named imports and both namespace imports from `PainterlyNPR/` in the host folder resolve in it. The working-tree
  test pin it was built on (`v0.7.4`) was deleted, never pushed; v0.6.0 is kept until Adam has checked this one.
- v0.8.0 (the pens) and v0.8.1 (0.3.3's engine seams) were uncommitted at this sync, so they were not in this pin:
  0.3.3's parameters fell back where a v0.8.1 seam was missing (its own design). v0.8.1 was then committed (70e63eb,
  at Adam's word) and the same 0.8.2 folder re-synced from it (`WorkingTreeClean: true`, Init unchanged, every host
  import resolves, the v0.8.1 seams in); `AURA_VERSION` is `2026-10-30-7`. Live at 15:14:03 UTC (the Server Manager
  app's aura push; a compare after it: 652 code files unchanged). v0.8.0 is still uncommitted.

**Live:** 15:05:49 UTC (stamp 20261030-150549), with 0.3.3 and 0.3.4, pushed from the Server Manager app on Adam's
"When it's clear" (+314 ~16 -0: nothing deleted, the test pin never on the server); no API change, no restart. A
compare after it: 652 code files unchanged; /aura/ serves the v0.8.2 import map and worker `2026-10-30-6`.

**Not yet:**
- Not run in a browser here: Adam tests it, live.
- The engine's right-click menu (move, turn, swap, copy, a material from the menu) cancels the browser's menu on the
  whole page, so it waits for an engine seam that keeps it to the 3D Environment.
- The assets stand in the engine's demo scene (the cottage); a project's own model is still to come.
- Still repeated from the engine: the host's Boot (PainterlyNPR's planned `07__System__LibraryHost` retires it) and
  `Na__Format__ParseReadout` (the engine's controls have their own Parse since v0.5.2).

## Version 0.3.3, 30-Oct-2026: Every Engine Parameter, the Paper Defaults, and Sheets on the Pictures' Paper

**Asked by Adam** (with a sheet whose white paper showed every picture's cream rectangle, and the 3D Environment's
Paper and finish: Cartridge, grain 150%, dry ink 5%, painted area 62%, edge irregularity 64%): "read your NPR skill then
update AURA / The 2d page paper should reflect the paper used in the parameters make image 02 the defaults, should dry
ink be in that section? we need the other parameters from the NPR Engine Aura is missing loads ensure all parameters
are availible from npr in aura / update the npr viewwer to make make those paper defaults the same too". Through the
coordinating session (0.4.0), the rule for it: "dont duplicate code the npr repo remains definitive source".

**Built:**
- **Every parameter, laid out by the engine's own panel** (`11 Parameters` 2.0.0, and a new part of the engine host,
  `10__System__EngineHost/Na__EngineHost__Panel__.js`):
  - AURA builds its Parameters from PainterlyNPR's `Na__Interface__Panel__Config.json`: its sections, groups and folds
    (nested, as PainterlyNPR v0.7.2 nests them), labels, sliders, menus, presets and hints.
  - That is all 88 of the engine's controls where AURA showed 19. The menus are Sheet, Ink family, Cloud type, Outline
    hand and Leaf marks. There are six pen presets and four vegetation presets, and each group's hints sit behind an
    info button.
  - AURA leaves out only the sections it has its own of (`AuraConfig__Engine__OwnSections`: Camera, ArtDirection,
    Export). `Engine__ParameterGroups`, `Engine__LabelOverrides` and `Engine__Discipline` are gone, so every label is
    the engine's: "Grain relief" where AURA said "Paper grain".
  - A slider, menu or preset moves the engine through its own functions (SetControl, SetChoice, ApplyPenPreset,
    ApplyVegPreset), so the pen preset is marked Custom exactly where PainterlyNPR marks it.
  - Any engine control the panel does not place lands in a last fold, "More from the engine".
- **Dry ink belongs to the pen**, which answers Adam's question. It is what a dry pen does on the paper's tooth: the
  line skips the valleys. Every pen preset sets it, and PainterlyNPR's own panel has it under Pen, 4 · The mark.
  AURA now shows it there too; it is stored with the paper only because it reads the grain.
- **The defaults are the engine's** (PainterlyNPR v0.8.1's starting state, not a copy in AURA): Cartridge, grain relief
  150%, dry ink 5%, painted area 62% and edge irregularity 64%. The Fineliner preset (the starting one) carries the 5%
  dry ink too, so the drawing still starts as that preset. A new drawing set starts with these defaults from a pin that
  has v0.8.1; a saved set keeps its own.
- **The sheets are the pictures' paper** (`20 Surface` 1.2.0, `Workspace` 1.2.1):
  - The paper is the engine's own bare paper (PainterlyNPR v0.8.1, `BarePaper`): the paper and compositor programs over
    an empty wash, so it has the same tone and grain as the pictures, at the engine's millimetres.
  - It comes as a 153.6 mm tile whose last 9.6 mm is crossfaded into its first, so it repeats with no seam. It is laid
    as an SVG pattern from the sheet's corner, and made again when the paper, seed or grain relief changes.
  - The title column stands on a ground of the same paper, drawn in the sheet's millimetres so the grain runs on.
    Vale's title artwork is multiplied onto it (TitleBlock), and a viewport's "something to press" rect is clear
    (Editor).

**Checks:**
- AURA's module check: 41 modules, 482 imports, no problems, on the 0.7.4 test pin and again on the v0.8.2 pin from
  69b2e36.
- PainterlyNPR's Test__AppModules: 116 modules, 684 imports, OK.

**Not yet:**
- Not run in the browser here: Adam tests it locally.
- **Live with v0.8.1 since 15:14:03 UTC.**
  - PainterlyNPR v0.8.1 is committed (70e63eb, at Adam's word: "Yes, commit v0.8.1"). AURA is re-synced from it into
    the same 0.8.2 folder, clean, with `AURA_VERSION` at `2026-10-30-7`; the module check is still clean (41 modules,
    482 imports).
  - The Server Manager app pushed the lane twice. At 15:05:49 UTC (stamp 20261030-150549) 0.3.3 went live on the
    69b2e36 pin, where it ran its fallback: presets and some menus greyed, flat paper on sheets, the old defaults. At
    15:14:03 UTC the 70e63eb pin and the new worker followed, so the presets, every menu, the paper's grain on sheets
    and Adam's paper defaults are live.
  - On a pin without v0.8.1 the fallback would return; nothing in AURA needs changing either way.
- A 3D view's picture is scaled to cover its frame, so its grain is a little larger than the sheet's. True-scale views
  match it exactly.
- PainterlyNPR's asset factory renders in the starting style, so pictures it renders from now on are on cartridge. The 26
  it has were made on cold-pressed.

(Uncommitted, waiting on Adam.)

## Version 0.3.2, 30-Oct-2026: Real Pens and the Advanced Writing Style

**Asked by Adam:** "Add more parameters in an advanced writing style dropdown exposing all of the possible paramers
for the writing model. Create a new pen size mertric calculated from the paper size so we can figure out ACTUAL real
pen sizes as the artists use a 0.18mm fineline as stated in the guidance to simulate the STAEDTLER Mars matic 700
technical drawing pen. 0.18mm pen accurately". **His calls:** leaders "Constant, like the pen"; the style "Per note";
old notes "Rewrite with 0.18 mm". The engine's own pen calibration (his brief: four calibrated technical pens in
PainterlyNPR's linework) went to its own session, "PainterlyNPR physical technical pen calibration" (PainterlyNPR
v0.8.0); this entry is AURA's notes and leaders only.

**Built:**
- **The pens** (`AuraConfig__Handwriting__Pens`): STAEDTLER Mars matic 700 M013, M018, M025 and M035 at 0.13, 0.18,
  0.25 and 0.35 mm, from PainterlyNPR's pen guidance (`08__Data__StrokeLibrary/PainterlyNPR__PenPresets__PointWeights__.md`)
  and with the same keys and fields as the engine session's `Na__TechnicalPens__Config.json` (agreed with it by
  message), so notes and linework are one pen set. A note's pen is `Annotation__PenKey`, M018 (0.18 mm, the lettering
  tier) unless chosen. **A technical pen:** every stroke of a note and its leader is the nib's own width (the guidance:
  pressure-variable width is a labelled non-technical mode).
- **The pen is applied on the sheet.** The engine now writes widths relative to the nib (1 is the nib; the ink is
  `Relative`), and the sheet multiplies by the note's pen in millimetres, so a new pen redraws at once, without
  writing the note again; the ink's key covers the style but not the pen (so undo's ink cache still fits).
- **The metric** (the panel, under Pen): the sheet is drawn in paper millimetres, so the pen's width is its printed
  width at 100% on the sheet's own paper. The panel says that, what the line measures if the sheet is printed on a
  smaller paper (0.18 mm on an A1 sheet: 0.13 on A2, 0.09 on A3, 0.064 on A4), and its width on screen at the zoom
  now (0.58 px at zoom 1: under a pixel, so it looks paler than it prints). Read again whenever the pointer comes
  over it, so it follows the zoom.
- **The Advanced writing style** (a fold in the note's panel, `31__System__Handwriting/Na__Handwriting__Style__.js`,
  its 25 controls in `AuraConfig__Handwriting__StyleGroups`): the model's hand (neatness, tries, retry neatness,
  lowest neatness, letter check, steps a character, fewest and most steps), lines and words (line spacing, longest
  and shortest phrase, wrap, word gap, space width, space before, margin), hand movement (variation, slant spread,
  baseline wave, wave frequency, straighten tilt), pen and numbers (technical or variable width, weight swing, draw
  numbers exactly, copy number). Sliders with typable readouts, each with a hover hint. A setting is the note's own
  (`Annotation__Style`, only what differs), else its hand's (a hand may now set any of them), else the studio's
  value; **Back to the hand** or a new hand clears the note's own. A note is written again when a slider is let go,
  not while it moves, and the panel never rebuilds under a held slider.
- **The engine** (Layout and Neural 1.1.0): every constant of the studio's layout and neural pen became a setting
  with hard limits (`Na__Layout__STYLE`), defaulting to the studio's value; the retry warning said "calmer" where a
  retry writes looser (the neatness is lowered) and now says so.
- **Leaders** (1.1.0): the note's nib, constant, with the studio's bow, drift and arrowhead unchanged (the random
  draws keep their order, so a leader keeps its shape when the pen changes); the variable pen keeps the swell.
- **Old notes** (Adam's call): their key changed, so each is written once more as its sheet opens, at 0.18 mm, with
  the same words and copy number. `Na__DrawingSet__Model__` 1.2.0 gives older notes the two new fields.
- `AuraConfig__Annotation__PenWidthMm` (0.3) and `AuraConfig__Handwriting__LineSpacing` are gone: the pen and line
  spacing are each note's now.

**Checked here (no browser):** the style module, the client's ink key and the engine together in Node, against the
app's own config: defaults reproduce the earlier ink exactly (the same paths at the same size); a new pen keeps the
key and a style change changes it; own settings store only what differs, drop when set back, clamp to range; all
eleven parameters tried move the ink as they should (line spacing, word gap, margin, slant, wave and its frequency,
variation, neatness, tilt, exact numbers, phrase length); the technical pen gives every stroke exactly the nib, the
variable one swings 0.97 to 1.03 times it; the same note writes the same ink again. A proof sheet at 12 px/mm (0.18
mm notes, a 0.35 mm note, a variable pen, a leader) looked at: an even fine line, a clearly bolder 0.35 mm, the
leader one width with its bow and arrowhead. All modules parse; every named import resolves.

**Not checked:** the panel in a browser (Adam tests): the Pen field and its metric, the fold, typing a value, a
note rewritten as a slider is let go, old notes rewriting at 0.18 mm, undo over a pen or style change.

**Not yet:** 3D viewports print the engine's pens off their true width (a still scaled to its frame). The engine
session will take a host's own pixels per mm for a frame; AURA's render queue passes it once that engine is synced.

**Live (Adam: "PUSH ALL READY FFS STOP ASKING ME SO MUCH TO PUISH JUST DO IT!"):** already on the server when the
push was due. `engine compare` of every mapping at 14:38 UTC found all lanes in step (`aura` 338 code files
unchanged), so 0.3.1 and 0.3.2 had gone up in a push that is not in this PC's `sessions.log` (another machine).
Through Cloudflare: the nine handwriting, annotation, drawing-set, history and config files byte-identical to this
PC, the live config at 0.3.2, `/aura/` 200, `api/health` 200, `api/handwriting/model` 401 signed out. No API file
changed after the 13:18 restart, so none was needed.

(Uncommitted, waiting on Adam.)

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

**Live (Adam: "Tested, push it"):** `push aura` at 14:01:45 UTC (stamp `20261030-140145`): the two new stylesheets
added and 9 files replaced, nothing deleted. Part of 0.3.0 was already on the server: another session's `aura` push at
about 13:36 UTC had sent index.html, the Stage, the panels helper and early drafts of the rest mid-build, so the live
page may have been inconsistent until 14:01. No API change, so no restart. Through Cloudflare: `/aura/`, both new
stylesheets, the viewport points module, the engine's point stylesheet and `api/health` 200; compare after: 334
unchanged.

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
  `render` (four tries with a looser pen, the coverage check, levelling, wrapping, protected numbers, slant, baseline,
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
