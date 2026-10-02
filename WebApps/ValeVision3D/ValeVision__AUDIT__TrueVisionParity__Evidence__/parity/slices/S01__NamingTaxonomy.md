# S01 - Folder and Module Naming Taxonomy (TrueVision3D -> ValeVision3D)

TV = TrueVision3D v2.172.0 (lead), git b2aa9151. VV = ValeVision3D v2.71.0 (target), git 7b4e593a.
Paths are relative to each app root. TVM / VVM = `02__Src__AppModules`; LE = `51__System__LayoutEditor`.

> **[VERIFIER] Provenance.** When the adversarial verifier started (01-Oct-2026) this file did not exist in
> `parity/slices/` - the survey agent returned its JSON but the markdown never landed. This file was therefore
> rebuilt by the verifier from the survey's returned JSON (summary, 65 findings, 9 work packages, 12 decisions),
> with every correction made in place and marked **[VERIFIER]**. The survey JSON stays the source for the long
> `tv_paths` / `vv_paths` lists of each finding; this file records what is true after verification. Verifier work
> files: `parity/verify_s01/` (graph.py, surface.py, coverage.py, touch.py, events.py and their outputs).

---

## 1. Headline conclusions

1. **The drawing system sits two folder numbers apart.** VV holds DrawingViewCore..NorthDirection at 42..47; TV at
   40, 42..46. TV numbers 40 and 42-47 name a different system in VV, and so does 62. Cause: VV plan D05
   (`VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md:53`) avoided the legacy 40 and 41.
   - **[VERIFIER] corrected counts.** Of the 249 paired files in 40-55, only **69** sit at paths that differ by the
     folder number (VV 42/43/44/45/46/47 = 15+10+8+15+13+8 pairs); the 180 pairs in 50 and 51 already share paths.
     **67 VV files (235 references)** in src, styles, tests and `index.html` contain an old VV folder name
     (25 inside the moved folders, 41 elsewhere, plus `index.html` with 27); the devlog, ledger and plan hold 34
     more references that are history. The survey's "106 files" (`s01work/vv_renumber_touch_files.txt`) also
     counted 39 files that only mention TV paths (PORT NOTEs) or `41__System__CrossSectionView`
     (e.g. `05/Na__RenderEffect__SectionClipping__State.js`, `21/...ScenePersistence__.js`,
     `41/Na__CrossSectionView__SystemLogic.js`) - those need no edit. Verified list:
     `parity/verify_s01/renumber_touch_verified.txt`.
   - **[VERIFIER] this reverses a recorded decision on both sides.** VV D05, and TV's own plan
     (`TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` section 4 lines 288-291 "Ported files keep their
     ValeVision names verbatim ... with the folder number translated (4.1)" and section 4.1 line 306 "Fixed for the
     whole of this work"). The renumber is still the right recommendation (S02a D-S02a-01 and S09 D-S09-02 reach the
     same answer independently) but it is Adam's call, and both plans need a dated revision note (D-S01-15).
   - Fix once, atomically, before any further port: WP-S01-01R (71 VV files move, plus the 8 legacy files).
2. **The LE subfolders already share TV's exact names** (both apps 15-Sep-2026: VV v2.47.0, TV v2.55.0; ledger
   1113-1143). VV lacks 17 TV subfolders (21, 26, 27, 28, 31, 32, 33, 36, 37, 51, 52, 53, 54, 58, 59, 65, 66). VV's
   only extra is `01__Core__Loader` (permanent). **[VERIFIER] confirmed**: per-subfolder file and line counts match
   (TV 341 files / 150,637 lines; VV 161 / 62,817).
3. **Namespaces and exports are almost aligned.** Of 232 paired JS/CSS files in 40-55 (249 pairs with JSON), one
   header NAMESPACE differs: `40/Na__DrawView__SectionAdapter__.js` (TV `Na__DrawView__SectionAdapter`, VV
   `Na__DrawSection`); its 13 exports are identical. No FILE-line divergence. VV adds 18 export names TV lacks, in 12
   files; TV has 269 export names VV lacks in shared files. **[VERIFIER] all confirmed by an independent extraction.**
4. Five file renames are needed so twins share one path; three more need Adam's decision (section 5).
   **[VERIFIER] confirmed**: `Na__AppUtils__SnapshotHistory` is the only pair whose names differ by the trailing `__`.
5. `--Vale_*` CSS custom properties are a SHARED vocabulary TV uses too (TV
   `03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css:28-35,210-212`). Never "rebrand" them.
   App-specific identifiers: model category keys `TrueVision__*`/`ValeVision__*`; project file names; local routes
   `/api/truevision` vs `/api/valevision`; header `X-TrueVision-Drawings-Base`; Statement storage keys
   `Na__TrueVision__Statement*`; public URLs `noble-architecture.com/q/` and `/s/`.
   **[VERIFIER] add:** app-named window globals (`window.TrueVision__Pwa__ProjectContext`,
   `window.TrueVision__Pwa__HasUnsavedWork`) - see S01-V04/V05; and note that `noble-architecture.com` by itself is
   NOT a TV marker - VV's own R2 CDN (`cdn.noble-architecture.com/VaApps/...`) and web fonts live there (S01-F44/F49).
6. TV's drawing system imports modules VV does not have: `03/Na__AppUtils__KeyScope__.js` (4 importers),
   `03/Na__AppUtils__LocalProjectMirror__.js` (6), `26/Na__ModelGroup__PhaseLibrary__.js` (4),
   `27/Na__ContextMenuSystem__Ui__MenuRenderer__.js` (2), `05/Na__RenderLoop__InteractiveOverlays__.js` (2),
   `25/Na__DoorAnimation__FindDoorGroups.js` (1), `80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js`
   (16), and ProjectLoader `GetProjectFolderFromUrl` (12 files) / `GetYearFromUrl` (11). **[VERIFIER] confirmed, and
   incomplete**: VV also lacks names in modules it DOES have - `Na__RenderLoop__IsPaused` (S01-V01),
   `Na__ModelToggle__SetCategoryVisibleByKey/BorrowRegistry/RestoreRegistry` and six `Na__DoorAnim__*` exports of
   ClickToOpenDoors (S01-V02) - and the whole design-phase (modelGroups) layer behind PhaseLibrary (S01-V03).
7. UI: the top-bar fold Adam named is already in VV and in sync (VV v2.70.0 from TV v2.83.0; tokens
   `--Vale_HeaderFold*` identical at TV AppHeader.css 210-212 / VV 206-208; the `body.na-layout-editor--active`
   rules for `.app-header`, `.na-le-tabs`, `.na-le-host` identical; only comments differ). **[VERIFIER] confirmed.**
   The real UI gaps: TabStrip 2.0.0 (TV v2.158.0, five tabs), VV's Layout Mode switch (TV has none), and the
   Register, Statements, Share, Publish and ObjectSnap UI. **[VERIFIER] add:** TV's web viewer now shows published
   files only (S01-V06) - porting it changes what VV's public viewer does.

## 2. Current top-level map (number: TV | VV | relation)

- Same name and number (18): 01 AppCore, 02 AppData, 03 AppUtils, 04 MathUtils, 05 RenderPipeline (VV adds
  `01__Engine__PureEngine/`, `02__Engine__MaxEngine/`), 06, 07, 10, 11, 15, 20, 21, 25, 26, 30, 50, 51, 70.
- Collisions (same number, different system): 40 TV DrawingViewCore | VV 2dElevationsView (legacy); 42 FloorPlanViews |
  DrawingViewCore; 43 PlanAnnotations | FloorPlanViews; 44 PlanDimensions | PlanAnnotations; 45 ElevationViews |
  PlanDimensions; 46 NorthDirection | ElevationViews; 47 DrawingPlanes | NorthDirection; 62 TV AppInstallability (WCP's
  62 too) | VV EmailWorkers.
- Same role, different engine: 41 TV SectionCutEngine | VV CrossSectionView (DIV-2).
- TV-only: 27, 48, 49, 52, 53, 54, 55, 75, 76 (VV has the feature as 60), 80 (client).
- VV-only: 28, 29, 31, 35 (legacy), 60, 61, 63, 64, 69, 71.
- **[VERIFIER] confirmed** against `ref/tree_tv.tsv` / `ref/tree_vv.tsv` (37 TV and 37 VV top-level module folders;
  WCP has 14).

## 3. Target VV top-level map

Tier 1 (WP-S01-01R, before any port):
- `40__System__2dElevationsView` -> `91__System__2dElevationsView`, or retire (D-S01-02). Its
  `Na__RenderEffect__2dProfileLines__.js` moves first to `05__RenderPipeline/` (ComposerPreset__.js:93 imports it).
  **[VERIFIER] cross-slice conflict:** S02a (D-S02a-04) proposes `39__System__2dElevationsView` and, as an option,
  moving 2dProfileLines into DrawingViewCore. Planner must pick one (D-S01-13). Verifier view: keep S01's choice -
  9x keeps legacy out of every range TV is growing in, and an `Na__RenderEffect__*` file belongs beside
  `05/Na__RenderEffect__ProfileLines__.js` (folder follows base name).
- 42 DrawingViewCore -> 40; 43 FloorPlanViews -> 42; 44 PlanAnnotations -> 43; 45 PlanDimensions -> 44;
  46 ElevationViews -> 45; 47 NorthDirection -> 46. Each full folder name is unique, so a single-pass rewrite of
  full names is collision-safe. **[VERIFIER] confirmed** (no VV text contains a TV full name that equals a VV old
  full name).

New folders at TV names, created by their ports: 47 DrawingPlanes, 48 CrossSectionViews, 49 ElevationDepthFog,
52 Layout__PublishedDocuments, 53 Data__Layout__PublishedSchema, 54 ColourPalette, 55 SpellCheck,
27 ContextMenuSystem (at least MenuRenderer), 80 CloudflareIntegration (client facade with a VV body).
Unchanged: 41 CrossSectionView (permanent DIV-2; add a README naming the twins), 50, 51; 35 PageLayoutSystem kept
and reserved after its LE dependencies move out (WP-S01-02).
Tier 2 (registry only): reserve 28, 29, 31, 35, 60, 61, 63, 64, 69, 71 and 9x for VV (D-S01-05).
Tier 3 (deferred): 62 EmailWorkers -> 92 only after its tracked node_modules are untracked (D-S01-08).
Not ported: TV 62 AppInstallability (VV uses WCP's PWA, `VV/index.html:19,34-44`), TV 75. **[VERIFIER] caveat:** TV's
LE reads and writes PWA globals that WCP's PWA does not provide (S01-V04, S01-V05) - "not ported" is right for the
folder, but those two seams need a VV answer.

## 4. LE subfolders

Shared names, no renames: 03, 05, 07, 10, 15, 20, 25, 30, 35, 40, 50, 55, 56, 57, 60, 70, 80.
Create (TV-only), TV version and files/lines - **[VERIFIER] all counts confirmed**:
21 SitePlanData (v2.155.0 move) 2/1,168; 26 DraftMode (v2.107.0) 4/649; 27 DrawingGrid (v2.114.0) 5/1,451;
28 ObjectSnap (v2.129.0) 16/5,534; 31 DocumentKeys (v2.110.0, v2.115.0) 2/457; 32 OrthoMode (v2.113.0) 3/438;
33 DrawingAxes (v2.131.0) 3/680; 36 HatchPatternTools (v2.90.0-v2.126.0) 3/1,480; 37 VectorTools
(v2.130.0-v2.151.0) 18/7,385; 51 DrawingRegister (created 19-Sep, v2.69.0-v2.71.0) 10/3,659; 52 StatementWriter
(v2.95.0-v2.172.0) 33/16,898; 53 ProjectQrCode (v2.100.0, moved v2.155.0) 6/1,895; 54 SheetImages (v2.116.0)
17/4,709; 58 ScrapbookSpecification (v2.91.0-v2.144.0) 5/2,220; 59 FloorAreas (v2.104.0-v2.148.0) 10/4,222;
65 DocumentPublishing (v2.155.0) 7/2,604; 66 DocumentSharing (v2.166.0) 7/2,116.
VV-only: `01__Core__Loader` (permanent; ledger 1244). Placement rule (ledger 1115-1117): a file's folder follows its
base name; split units and `__Config__.json` files sit with their base.
**[VERIFIER] coverage:** every TV-only file inside a SHARED LE subfolder (41 files) is assigned to a finding
(F08, F17, F25, F32, F35, F37, F38); every VV-only LE file (6) to F17, F18 or F39.

## 5. File-level renames (VV now -> VV target = TV path)

a) Every file in 42..47 keeps its name under 40, 42..46 (WP-S01-01R).
b) `40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js` -> `05__RenderPipeline/` (same name).
   Repoint `42/Na__DrawView__ComposerPreset__.js:91,93` and `40/Na__ElevationView__SystemLogic.js:47`
   (`'./...'` becomes `'../05__RenderPipeline/...'`). **[VERIFIER] confirmed**: these are the only two importers.
c) `03/Na__AppUtils__SnapshotHistory__.js` -> `03/Na__AppUtils__SnapshotHistory.js`. Repoint
   `44/Na__PlanAnnotations__History__.js:63,65` and `45/Na__PlanDimensions__History__.js:59,61` (plus header comments
   at :38 in both). **[VERIFIER] confirmed** - no other importer, not in the WCP precache list.
d) `LE/03__Core__Config/Na__LayoutEditor__KeyMappings__.json` -> `Na__Hotkeys__DrawingTabs__.json` (TV v2.115.0,
   DEVLOG:5041-5053). Repoint `ConfigState__KeyMap__.js:63` (`Na__LeCfg__KeyMapUrl`). **[VERIFIER] note:** TV kept
   the JSON's internal keys (`LayoutEditor__KeyMappings__Description` etc.), so only the FILE name changes; comments
   naming the file sit in `ConfigState__.js:154`, `ConfigState__KeyMap__.js:13,154`, `Controls__Pc__.js:19`,
   `Controls__TouchScreen__.js:29`, `Measurements__.js:56` and AppConfig descriptions at :277 and :457.
e) `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` (ns Na__LeOsnap, VV 1.2.0) is RETIRED, replaced by
   `LE/28__System__ObjectSnap/*` (TV v2.129.0, DEVLOG:3712-3727, confirmed). Storage key `na-layouteditor-osnap` kept.
   **[VERIFIER] add:** 11 VV files import Snapping__ (list in WP-S01-04R); 11 of its 14 names survive in TV's
   ObjectSnap units, the three `Na__LeOsnap__TONE_*` constants do not (VV PointerDrag:137,343 and DimensionTool:172,
   291,316 pass them) - TV's `Na__LeOsnap__Snap` ignores a string 4th argument (`ObjectSnap__Search__.js:505-511`)
   but the import itself would fail, so the TONE imports must go.
f) `02__AppData/Na__ValeVision__HotkeysDictionary__.json` -> `02__AppData/Na__Hotkeys__3dModelTab__.json`; the root
   key `Na__ValeVision__HotkeysDictionary` stays (TV's root key is `Na__TrueVision__HotkeysDictionary`). Repoint
   `03/Na__AppUtils__ValeVision__HotkeyHandler__.js:116` (+ header :13, :28) and
   `10/Na__UiFeature__NavigationHelpPanel__Controls.js:84` (+ :22). **[VERIFIER] add:** `index.html:1261` and
   `:1776` (comments) also name the file.
g) DECISION D-S01-06: `42/Na__DrawView__ComposerPreset__.js` -> `40/Na__DrawView__RenderPreset__.js`, exports
   `Na__DrawView__RenderPreset__{ApplyStyles,Enter,Exit,GetCamera,GetExportOverrides,Initialize,IsActive,RenderFrame}`;
   composer body stays (DIV-1). Importers: `LoadingSequence.js:425` (+ @delegate :1319), `43 FloorPlan
   ModeController:123`, `46 Elevation ModeController:115`, `LE SnapshotRenderer:132`, `index.html:1412`.
   **[VERIFIER] confirmed** (suffix sets identical; importer list complete).
h) DECISION D-S01-07: `05/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js` -> `05/`. Importers:
   `LoadingSequence.js:216`, `31 FrameRenderer:112`, `31 Timeline__Thumbnails:117`, `42 Transitions__:63`, WCP SW
   precache line 318. **[VERIFIER] confirmed.**
i) `35/01__Dependencies__VersionLocked/jspdf.umd.js` -> copy to `04__Lib__ThirdParty__VersionLocked/
   05__Vendor__JsPdf__v4.1.0/jspdf.umd.js` (same 4.1.0 build, `git diff --no-index -w` empty - confirmed). Repoint
   LE AppConfig :402 and `ConfigState__SheetSetup__.js:396`.
j) `35/PageLayoutSystem__TitleBlock__A3__.png` -> `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/
   TitleBlock__ClassicScan__A3__.png` (VV keeps its own scan, md5 59777a65 vs TV 7614f27e - confirmed). Repoint LE
   AppConfig :104-108.
Twins kept apart on purpose: TV 41 `Na__SectionCut__CapGeometry__`/`SceneData__` vs VV 41
`Na__CrossSectionView__CapGeometry`/`SceneData`; TV `10/Na__Hotkeys__Manager.js` vs VV
`03/Na__AppUtils__ValeVision__HotkeyHandler__.js`; TV 76 vs VV 60 fullscreen. TV has already followed the old
MarkupFocus move (`40/Na__DrawView__MarkupFocus__.js` exists in TV - confirmed).

## 6. Naming rulebook (the swarm's contract)

R1. TV is the numbering authority. A VV folder holding the same system as a TV folder carries TV's exact
`NN__Category__Name`, at top level, in LE subfolders and nested sub-subfolders.
R2. VV-only folders never take a number TV uses or has used. Legacy goes to 9x. VV-only numbers go in the registry.
R3. LE placement: a file's folder follows its base name; split units and `__Config__.json` files sit with their base.
`01__Core__Loader` is the only VV-only LE subfolder.
R4. A shared module's file name equals TV's, character for character, legacy names without a trailing `__`
included. Do not "fix" one side. The header FILE line equals the file name. ([VERIFIER] legacy-name counts are
method-dependent: by .js/.json/.css under 02__Src__AppModules the verifier counts TV 72 / VV 116; the survey said
77/104. The rule is unaffected.)
R5. Config names: top-level system `Na__<System>__AppConfig__.json` (TV 13); LE subsystem / 5x feature
`Na__<Prefix>__<Feature>__Config__.json` (TV 27); app-wide `02__AppData/Na__AppConfig__Main.json`; hotkeys
`Na__Hotkeys__3dModelTab__/DrawingTabs__/DocumentTabs__.json`; VV-only legacy `__Config.json` stay. (Counts confirmed.)
R6. Stylesheets `Na__<System>__Styles__<Role>__.css` (VV-only legacy `__Stylesheet__.css` stay); folder READMEs
`README__<Topic>__.md`; tests `Na__Test__<Feature>__.test.mjs|.test.cjs|.test.py|.html`,
`Na__TestEnv__<X>Bundle__.cjs`, `Na__Verify__<X>__.mjs`, sandbox `TestEnv__*`. Ported tests keep TV's names.
R7. Headers: banner line 2 is "VALEVISION3D - " + TV's text verbatim; NAMESPACE and MODULE lines are TV's; PORT NOTE
per VV plan 4.2; the DEVELOPMENT LOG keeps TV's entries and adds a "Ported from TrueVision3D vX" line.
R8. Namespaces and export names are TV's. A VV-only name is additive and listed under Divergences.
R9. Console prefix `[ValeVision3D <System>]`, `<System>` exactly TV's.
R10. CSS custom properties, CSS classes (`na-<block>__<el>--<mod>`, LE `na-le-*`), DOM ids (naCamelCase) and window
events (`na-kebab-case`, constants `Na__<Ns>__<X>_EVENT`) are identical to TV. `--Vale_*`, `--Na_Le_*`, `--na-le-*`,
`--na-spec-*`, `--Na_Viewer*` are shared; values may differ for brand. ([VERIFIER] 43 shared event names confirmed;
VV-only events include `na-pause-render-loop` / `na-resume-render-loop`, a divergent implementation of a SHARED
mechanism - see S01-V01 - not only VV-only systems.)
R11. Browser storage keys are identical (the apps run on different origins: TV's ProjectVision server :8090, VV's
Flask :8000, different live hosts). A key that embeds the app name swaps it (`ValeVision3D__AuthoringUnlocked`
already; `Na__TrueVision__Statement*` -> `Na__ValeVision__Statement*`).
R12. Runtime model category keys are `ValeVision__<Category>`; SketchUp tag names are shared; every
`TrueVision__<Category>` literal is a seam.
R13. Project data: VV keeps worker `whitecardopedia-editor-api`, prefix `VaApps/Projects/<folderId>/` and
`project.json`; TV sibling files `TrueVision__<X>__.json` become `ValeVision__<X>__.json`; TV's numbered content
sub-folders keep their names. **[VERIFIER] add:** both workers bind the SAME R2 bucket `noble-architecture-cdn`
(TV `80__CloudflareIntegration/CloudflareWorker/wrangler.toml:35`, WCP `CloudflareWorker/wrangler.jsonc:24-25`) and
serve through the same CDN host; isolation is by prefix (`NaProjectPortal/` guarded by TV's `R2_PREFIX`,
wrangler.toml:41,50; `VaApps/` hard-coded in each VV handler) and by worker. VV's worker has route-specific handlers,
not TV's generic `/r2/read|write|list|delete`, so every new VV R2 key needs a VV handler and must sit under
`VaApps/Projects/<folderId>/`.
R14. Local server: routes `/api/valevision/<feature>`; blueprints `WCP/Server__ValeVision<Feature>__Api__.py`
registered in `WCP/server.py`; probe `/api/check-localhost` (`{isLocalhost:true}`, server.py:322); headers
`X-ValeVision-*`; label "local development server". **[VERIFIER] add:** `WCP/server.py` already serves project write
routes outside any blueprint (POST `/api/projects/<folder_id>` :439, `/drawing-notes` :790, `/assets` :752,
`/presentation-thumbnail/<scene_id>` :708, visibility/rename/delete :493/:560/:649, GET `/api/editor-config` :334) -
reuse them before adding routes (S01-F14/F45).
R15. Brand lives in config VALUES, never in keys or code. **[VERIFIER] add:** NA-only markers are `NaProjectPortal`,
`30__TrueVision__AppContent`, `/na-apps/30__TrueVision__CoreAppCode`, the `/q/` and `/s/` resolvers, NA logo and
letterhead assets, `Noble Architecture Ltd`, `TrueVision 3D Project Hub`, and TV's PDF font CDN base (LE AppConfig
:502). `cdn.noble-architecture.com/VaApps/...` and `www.noble-architecture.com/assets/...` fonts are VV's own.
R16. Root docs `ValeVision__<KIND>__<Topic>__.md` (DEVLOG, README, PLAN, NOTES, PARITY, TASKS). App-root content
folders mirror TV: `50__ValeVision__UserConfig`, `51__LayoutEditor__UserScrapbookContent`,
`52__LayoutEditor__HatchPatternLibrary`.
R17. Title block scans in `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/`; vendors in
`04__Lib__ThirdParty__VersionLocked/NN__Vendor__<Pkg>__v<ver>/` with TV's numbers (05 jsPDF, 06 html2canvas);
vendor index files keep the `Vale__` prefix.
R18. An LE or 5x stylesheet TV imports from its CSS index joins VV's `Na__LeLoad__STYLESHEETS`
(`LE/01__Core__Loader/Na__LayoutEditor__Loader__.js:125-134`) in TV's relative order (Surfaces first, WebViewer last).
R19. VV keeps `index.html` lowercase; ported text says "index.html".
R20. Historical ledger rows keep their paths; add a "Folder renumbering" section with the old->new map.
**[VERIFIER] added rules:**
R21. App-named window globals are identity seams: VV never reads a `window.TrueVision__*` global. Shared state goes
through a module accessor (preferred) or a neutral `window.Na__*` global published by VV.
R22. Where both apps implement the same mechanism differently (render-loop holds, PWA hooks), VV exports TV's names
with VV bodies (e.g. `Na__RenderLoop__IsPaused`), so TV files keep their imports.
R23. A TV file that reads design phases (`modelGroups`, `Na__PhaseLib__*`, `Viewport__ModelSourceId`) is never
"port_verbatim" until D-S01-14 is settled (VV has no design phases).

## 7. Wiring notes

W1. Outside-folder dependency surface of TV 40-55. **[VERIFIER] recomputed with an independent import graph
(`verify_s01/surface.txt`):**
- Present in VV, same path, every imported name present: ConfirmDialog, DevGate__, R2AssetUpload__,
  `Na__Math__Units`, SectionClipping__State, PerSceneLighting__, five 10/ nav files, ContentStamp__, LibraryLoader,
  six 21/ files, ViewBuildingStoreys, three 30/ ImageExport files, vendored clipper2-js and three-edge-projection
  (identical with `-w`), and the import map (identical in both index files).
- Present but MISSING NAMES (survey listed these as "no change" - corrected):
  `05/Na__RenderLoop__Invalidation.js` lacks `Na__RenderLoop__IsPaused` (S01-V01);
  `26/Na__UiFeature__ModelToggle__Controls.js` lacks `SetCategoryVisibleByKey`, `BorrowRegistry`, `RestoreRegistry`
  (S01-V02); `25/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` lacks six `Na__DoorAnim__*` (S01-V02);
  `03/Na__AppUtils__ProjectLoader.js` lacks `GetProjectFolderFromUrl`, `GetYearFromUrl` (S01-F15).
- Different path or name: DistanceCulling (F20), SnapshotHistory (F19).
- Missing in VV: KeyScope__, LocalProjectMirror__, PhaseLibrary__, MenuRenderer__, InteractiveOverlays__,
  FindDoorGroups, ApiClient__.
W2. index.html: TV `Index.html:885-919` vs VV `index.html:1375-1442` (confirmed). Ports of 47, 48, 49 and LE/66 add
imports AND initialisation in TV's order (TV init blocks at Index.html:1734 (66), :1742 (47), :1777 (49); 48 also
needs its DOM panel, TV Index.html:599-606).
W3. Stylesheets (confirmed): TV CSS index :161-174 (LE) and :182, :190 (ColourPalette, SpellCheck); VV links 8 editor
sheets from the loader and imports `Styles__Boot__` (VV CSS index :92). To add to VV STYLESHEETS: DraftMode,
DrawingGrid, ObjectSnap, DrawingAxes, SheetImages, Share. CSS index: ColourPalette, SpellCheck, plus the 47 and 49
Dev-menu sheets (TV CSS index :123, :130). Self-linked by their panels (confirmed): Patterns, VectorTools,
DrawingRegister, Statement, ScrapbookCustom/Parametric/Specification, FloorAreas.
`52/Na__PubDoc__Styles__Main__.css`: **[VERIFIER] correction** - not "referenced by nothing": it is linked by
`80__Testing__PrototypeEnvironment/Na__Test__PublishedReader__Harness__.html:43` and listed in the 52 README; no
runtime link exists.
W4. KeyScope: three scopes, three hotkey files (TV v2.110.0, v2.115.0); VV needs KeyScope verbatim, a
`Na__KeyScope__Is(Na__KeyScope__MODEL)` guard in its HotkeyHandler (which today checks only input/textarea/select),
and renames d) and f).
W5. Transport facade (DIV-4): D-S01-03 and WP-S01-06R.
W6. DIV-1 / DIV-2 seams in LE/25 SnapshotRenderer: TV :182 RenderPreset and :222 ProfileLines; VV :132 ComposerPreset,
:162/:173 CrossSectionView SystemLogic, :174 LineworkSettings. **[VERIFIER] add:** TV imports THREE 41 modules there -
`Na__SectionCut__Serialize__` (:213), `Na__SectionCut__ConfigState__` GetAppearance/SetAppearance (:223) and
`Na__SectionCut__Engine__` SetModelRoot (:244); a SectionAdapter back-port (D-S01-04 item 1) must cover SetModelRoot
too. TV also imports PhaseLibrary (:237-243), DoorPose (:217), DepthFog RenderLayer (:232) and the ModelToggle names
VV lacks (:212).
W7. WCP shared SW (`WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`)
precaches VV paths (:276-352) and holds `PWA_SW_VERSION_TOKEN` (:229, `2026-09-18-1`). **[VERIFIER] correction:**
`WebApps/live_sw.js` is not a live copy - it is a tracked older copy at token `2026-09-10-6` (:68). The SW the pages
register is the WebApps-root stub `Na__Pwa__ServiceWorker__.js` (importScripts of the logic file; served by
`WCP/server.py:915`), yet the WCP devlog (`LOG__Whitecardopedia__DEVLOG.md:405,439`) calls `live_sw.js` "the file
the browser actually registers". Confirm which file the deployed site registers before relying on one bump. Also the
registrar reloads open VV pages on every SW update without checking unsaved editor work (S01-V05).
W8. Hot config files (confirmed): LE AppConfig (104-108, 402), `ConfigState__SheetSetup__.js:396`,
`ConfigState__KeyMap__.js`, `02__AppData/Na__AppConfig__Main.json`, the VV loader (STYLESHEETS and the
name-copy checks at :284-292).

## 8. UI notes

U1. Header fold in sync; each ModeController sets the body class (TV :425, VV :284) - confirmed. No action.
U2. TabStrip 2.0.0 (TV v2.158.0) vs VV 1.5.0 - confirmed; porting needs the loader facade to answer the new tabs
before the editor loads.
U3. VV's Layout Mode switch (VV-only exports `Na__LeMode__IsAvailable/IsLayoutModeOn/SetLayoutMode`,
`Na__DrawData__Get/SetLayoutModeEnabled`, 5 label keys) - Adam decides (D-S01-11).
U4. TV-only UI: Document Register, Design Statements, Share (v2.166.0), published web viewer, Snap dropdown.
U5. VV keeps tab-strip CSS in `Styles__Boot__.css`; TV in `LE/10/Na__LayoutEditor__Styles__Main__.css`.
**[VERIFIER] U6.** TV's web viewer (LE/80, since v2.155.0) shows only PUBLISHED files and imports 52 PubDoc
(S01-V06); VV's web viewer still renders live (ported from TV v2.65.0 at VV v2.58.0). A whole-file port changes VV's
public behaviour - decision D-S01-16.

## 9. Ledger and plan corrections

(1) Ledger 34-35 and 1218 treat SceneRowBuilders/SceneReorder as back-ported or pending; TV v2.68.2 deleted them and
declared VV's split deliberate (DEVLOG:9813-9836). **[VERIFIER] add ledger 29** ("scene editor splits ... all
landed").
(2) Ledger 44-49 says VV has no Verify scripts; VV has both (ledger 868).
(3) Ledger 1230 lists the loader as a pending back-port; ledger 1244 says it is not a candidate.
(4) TV PORT NOTEs saying "ValeVision has no web viewer" are stale. **[VERIFIER] full list:** `LE/80/...WebViewer__.js:53`,
`__WebViewer__Drawings__.js:42`, `__WebViewer__Spec__.js:46`, `__WebViewer__TouchControls__.js:51`,
`LE/66/...Share__Links__.js:63`, `LE/66/...Styles__Share__.css:6`; and "ValeVision has no north system" in
`45/Na__Elevation__AutoName__.js:51` and `AutoNameText__.js:34` (VV has had 47 NorthDirection since v2.67.0).
(5) TV plan TD04 says Classic is not ported, but TV has `TitleBlock__Classic__.js` and its own scan.
(6) VV plan D05 is superseded by the renumber - **[VERIFIER]** and so are TV plan section 4 (lines 288-291) and 4.1.
**[VERIFIER] (7)** Ledger 1189 says "ValeVision has no service worker or installability module, so there is no
shell cache to evict" - wrong: VV registers WCP's shared SW (`VV/index.html:44`) and its shell is precached
(SW logic :276-352). The same claim sits in VV `LE/07/Na__LayoutEditor__AutoSave__.js` PORT NOTE :48-53.

## 10. Planner ordering

1. WP-S01-01R first; it blocks every port touching 40-49. Settle D-S01-01, D-S01-02, D-S01-13 and D-S01-15 before it.
2. Then WP-S01-02, WP-S01-03R, WP-S01-05 and WP-S01-10 in parallel.
3. WP-S01-04R goes with the ObjectSnap port.
4. WP-S01-06R, WP-S01-07 and WP-S01-11 go with the transport, SpellCheck and Hatch ports (WP-S01-11 before any
   further SW token bump if possible).
5. WP-S01-08R any time after WP-S01-01R. WP-S01-09 deferred.

---

## 11. Findings ledger (verifier verdicts)

Verdicts: CONFIRMED = checked against the files and right; CORRECTED = right in substance, statement fixed (see the
correction note); every finding was checked (critical and high: all 30).

| Id | Sev | Action | Title (short) | Verdict |
|---|---|---|---|---|
| S01-F01 | critical | renumber_folder | Drawing folders two numbers off TV | CORRECTED - counts (69 path-differing pairs; 67 files / 235 refs to edit, not 106) and the reversal of TV plan 4/4.1 + VV D05 |
| S01-F02 | high | renumber_folder | Legacy 40 2dElevationsView collides with TV 40 | CONFIRMED (index.html:1375-1376, SystemLogic:67, FacePick:39 comment). Target number conflicts with S02a (D-S01-13) |
| S01-F03 | high | rename_move | 2dProfileLines to 05__RenderPipeline | CONFIRMED (only importers ComposerPreset:93, SystemLogic:47) |
| S01-F04 | medium | keep_vv_divergence | 41 CrossSectionView vs SectionCutEngine | CONFIRMED |
| S01-F05 | high | rename_move | LE loads jsPDF + Classic scan from legacy 35 | CONFIRMED (AppConfig:104-108,402; SheetSetup:396; jsPDF identical; scans differ) |
| S01-F06 | high | port_adapted (was port_verbatim) | 47 DrawingPlanes + InteractiveOverlays | CORRECTED - config tokens need VV category keys; supersedes VV GizmoGrip/FacePick; needs IsPaused (V01); TV importers 42/45 DevMenu editors |
| S01-F07 | low | port_verbatim | 48 CrossSectionViews placeholder | CONFIRMED (0.1.0; Index.html:909; DOM at :599-606) |
| S01-F08 | high | port_verbatim | 49 ElevationDepthFog | CORRECTED - wiring surface is 9 TV files outside 49, incl. LoadingSequence, 21 Thumbnail renderer and the DIV-1 RenderPreset seam |
| S01-F09 | high | port_adapted | 52 + 53 published documents | CORRECTED - TV WebViewer imports 52 (V06); TV added a tv-published SW cache; PubDoc stylesheet is linked by a test harness |
| S01-F10 | medium | port_verbatim | 54 ColourPalette | CONFIRMED (README__PublishedSchema__.md:86-88; PlanAnnotations Toolbar:114) |
| S01-F11 | medium | port_adapted | 55 SpellCheck | CONFIRMED (Config:13-14; Dictionary:101,116) |
| S01-F12 | medium | port_verbatim | 27 ContextMenuSystem MenuRenderer | CONFIRMED (also imported by TV LoadingSequence) |
| S01-F13 | critical | build_vv_transport | ApiClient facade at TV path | CONFIRMED (33 exports; 16 drawing/LE importers, 27 in all; 21 names used) |
| S01-F14 | high | build_vv_transport | LocalProjectMirror at TV path | CORRECTED - WCP/server.py already has POST /api/projects/<id>, /drawing-notes, /assets etc. |
| S01-F15 | high | needs_decision | ProjectLoader GetProjectFolderFromUrl/GetYearFromUrl | CONFIRMED (12 and 11 drawing importers) |
| S01-F16 | high | port_adapted | KeyScope + VV hotkey guard | CONFIRMED |
| S01-F17 | high | rename_move | Hotkey file renames | CONFIRMED (internal JSON keys unchanged in TV; comment refs listed in 5d/5f) |
| S01-F18 | high | retire_vv | Snapping__ -> 28 ObjectSnap | CONFIRMED (11 VV importers; TONE_* constants dropped by TV) |
| S01-F19 | low | rename_move | SnapshotHistory trailing __ | CONFIRMED |
| S01-F20 | medium | needs_decision | DistanceCulling path | CONFIRMED |
| S01-F21 | high | needs_decision | ComposerPreset vs RenderPreset names | CONFIRMED |
| S01-F22 | low | keep_vv_divergence | SectionAdapter namespace | CORRECTED - add the three TV 41 imports in SnapshotRenderer (Serialize :213, ConfigState :223, Engine SetModelRoot :244) |
| S01-F23 | high | port_verbatim | TV-only 40 files | CONFIRMED |
| S01-F24 | medium | port_adapted | TV-only 42/45/50 files + FindDoorGroups | CONFIRMED (TV AutoName PORT NOTEs stale: "no north system") |
| S01-F25 | medium | needs_decision | Site-plan family | CONFIRMED (verifier line count of the 8 listed files 3,881, survey 4,482) |
| S01-F26 | high | port_verbatim | Draft/Grid/Ortho/Axes | CONFIRMED (no VV equivalent under any name) |
| S01-F27 | high | port_verbatim | DocumentKeys | CONFIRMED |
| S01-F28 | medium | port_verbatim | HatchPatternTools + library | CONFIRMED (library has no "TrueVision" text; Meta__Author is the shared author line) |
| S01-F29 | high | port_verbatim | VectorTools | CONFIRMED |
| S01-F30 | high | port_adapted | DrawingRegister | CONFIRMED |
| S01-F31 | medium | needs_decision | StatementWriter | CONFIRMED |
| S01-F32 | medium | needs_decision | ProjectQr family | CONFIRMED (Config:10 /q/ base) |
| S01-F33 | high | port_adapted | SheetImages | CONFIRMED |
| S01-F34 | medium | port_adapted | ScrapbookSpecification | CONFIRMED (RowEditor:91 imports SpellCheck Field/WordBar) |
| S01-F35 | medium | port_verbatim | FloorAreas | CONFIRMED |
| S01-F36 | high | port_adapted | Publishing + Sharing | CORRECTED - VV's own 61 ShareProjectLink is the natural share-URL host |
| S01-F37 | high | port_adapted (was port_verbatim) | TV-only units in shared LE subfolders | CORRECTED - ModelSource/PhaseLibrary depend on design phases VV lacks (V03); PlanDoors and PdfFonts are not verbatim |
| S01-F38 | high | port_verbatim | Spec/notes units + CabinetInfill | CORRECTED - 9 files, not 10 |
| S01-F39 | medium | keep_vv_divergence | VV loader | CONFIRMED |
| S01-F40 | low | keep_vv_divergence | ThumbnailBake | CONFIRMED |
| S01-F41 | medium | keep_vv_divergence | 18 VV-only export names | CONFIRMED (exact) |
| S01-F42 | high | port_whole_reapply_vv | Seam checklist | CORRECTED - add window globals, design phases, missing ModelToggle/DoorAnim/IsPaused names |
| S01-F43 | high | port_adapted | Category key literals | CONFIRMED |
| S01-F44 | high | port_adapted | Project file names / storage | CORRECTED - shared bucket and CDN; prefix isolation |
| S01-F45 | high | build_vv_transport | Local-server naming | CORRECTED - VV Flask route inventory |
| S01-F46 | medium | port_adapted | Storage keys | CONFIRMED |
| S01-F47 | medium | no_action | Shared CSS/event vocabulary | CONFIRMED (verifier counts: na-le- classes TV 665 / VV 301 in LE CSS; 43 shared events) |
| S01-F48 | medium | port_adapted | Banner/console rule; leak | CORRECTED - two more leaks (45 PlanDimensions__Styles__.css banner; SpecPdf__.js:147 TV global) |
| S01-F49 | medium | needs_decision | NA URLs and brand content | CORRECTED - add FontCdnBase (AppConfig:502); VV's legit NA-hosted URLs |
| S01-F50 | high | update_wiring | Stylesheet registration | CONFIRMED |
| S01-F51 | high | update_wiring | index.html wiring | CONFIRMED |
| S01-F52 | medium | update_wiring | WCP SW precache/token | CORRECTED - live_sw.js is a stale copy; registered stub; registrar reload |
| S01-F53 | low | no_action | Header fold in sync | CONFIRMED |
| S01-F54 | high | port_adapted | TabStrip 2.0.0 / Layout Mode | CONFIRMED |
| S01-F55 | medium | port_test | Test naming | CONFIRMED |
| S01-F56 | low | retire_vv | Legacy 04__Lib__ThirdParty__Three | CONFIRMED (17 tracked; only SW comments mention it) |
| S01-F57 | low | needs_decision | Tracked node_modules in 62 | CONFIRMED (1,877 tracked, 1,857 node_modules) |
| S01-F58 | medium | needs_decision | VV-only numbers / 62 collision | CONFIRMED |
| S01-F59 | low | needs_decision | 60 vs 76 fullscreen | CONFIRMED (no LE reference either side) |
| S01-F60 | medium | fix_ledger | Stale ledger/plan rows | CORRECTED - add ledger 29, 1189, AutoSave PORT NOTE, 8 stale TV notes |
| S01-F61 | low | port_adapted | Root docs / content folders | CORRECTED - TV root has 12 PLAN docs, not 13 |
| S01-F62 | low | keep_vv_divergence | Permanent structural divergences | CONFIRMED |
| S01-F63 | low | no_action | Config/stylesheet/README conventions | CONFIRMED (13 / 27 counts) |
| S01-F64 | medium | backport_to_tv | Seam-minimising back-ports | CORRECTED - item 1 must include SetModelRoot; add a project-display-name accessor (V04) |
| S01-F65 | low | keep_vv_divergence | VV 21 splits deliberate | CONFIRMED |

### Correction notes (complete replacement texts are in the verifier's returned JSON)

- **F01** - see section 1 item 1. Evidence: `verify_s01/renumber_touch_verified.txt`; TV plan :288-291, :304-321.
- **F06** - `47/Na__DrawingPlanes__Bounds__.js` PORT NOTE :48-50 says VV's category keys differ, so the token lists
  in `Na__DrawingPlanes__AppConfig__.json:12-14` (`MainBuildingModel`, `Storey__`, `LandscapeEnvironment`) change;
  `Na__DrawingPlanes__Grip__.js` PORT NOTE :60-61 "Supersedes Na__Elevation__GizmoGrip__ and
  Na__Elevation__FacePick__ there when it is [ported]" (VV wires both from `index.html:1417-1418` and its Elevation
  DevMenu editor 1.0.0); TV importers of 47 are `42/Na__FloorPlan__DevMenu__Editor__.js` (2.0.0) and
  `45/Na__Elevation__DevMenu__Editor__.js` (2.1.0), whose VV copies are 1.0.0; Grip imports
  `Na__RenderLoop__IsPaused` (:83, :204, :706), which VV lacks (S01-V01).
- **F08** - TV files outside 49 that import it: `01/Na__AppFlow__LoadingSequence.js`,
  `21/Na__PresentationMode__Thumbnail__Renderer.js`, `40/Na__DrawView__RenderPreset__.js` (DIV-1: lands in VV's
  ComposerPreset), `45/Na__Elevation__DevMenu__RowBuilders__.js`, `45/Na__Elevation__ModeController__.js`,
  `45/Na__Elevation__ProjectJson__Data__.js` (RecordData), `LE/20/...Viewport2d__DepthFog__.js`,
  `LE/25/...SnapshotRenderer__.js`, plus the TV CSS index (:130) and `Index.html:919`. RenderLayer's PORT NOTE (:71-73)
  says the two calls "land in different places" in VV.
- **F09** - TV `LE/80/Na__LayoutEditor__WebViewer__.js:96-100` imports `Na__PubDoc__Document__`,
  `__LoadingScreen__`, `__Urls__`; `LE/66/...Share__Manifest__.js` imports `Na__PubDoc__Urls__`. TV v2.155.0 added a
  `tv-published-` SW cache (DEVLOG:1328) - VV needs a rule in the WCP SW or accepts network-only reads.
- **F14 / F45** - `WCP/server.py` routes: GET/POST `/api/projects/<folder_id>` (:408/:439, whole project.json
  write), `/drawing-notes` GET/POST (:790, `ValeVision__DrawingNotes__.json` whole-file), `/assets` (:752),
  `/presentation-thumbnail/<scene_id>` (:708), `/visibility` (:493), `/rename` (:560), `/delete` (:649),
  `/api/editor-config` (:334), `/api/projects/discover` (:824), `/api/check-localhost` (:322); VV's
  `03/Na__AppUtils__R2SaveProjectJson__.js` already does "Phase 1 R2 via worker, Phase 2 local mirror via Flask"
  (:15-18, :155). TV's MergeKeys reads, merges and POSTs the whole document (LocalProjectMirror :18-22), which maps
  onto VV's existing POST route. Missing in VV: a generic `/files/<fileName>` sibling route, the drawings
  fingerprint route with the 409 save guard and backups (TV v2.146.0), the statements routes, and a health probe
  with a service name.
- **F22 / F64** - see W6.
- **F36** - VV already has `61__Feature__ShareProjectLink` (`Na__Feature__ShareProjectLink__UrlGeneratorLogic__.js`
  builds absolute ValeVision3D URLs as the app address plus `?project=<code>`, and emails them). That is the natural
  VV host for LE/66 document links in place of NA's `/s/` resolver; offer it as option (a) of D-S01-10.
- **F37** - `Na__LayoutEditor__ModelSource__.js` resolves a viewport's DESIGN PHASE through
  `Na__ModelGroup__PhaseLibrary__.js`, which registers the project's `modelGroups` (TV ProjectLoader :175-196); TV's
  own PORT NOTEs say "ValeVision has no model groups" (`50/...Pipeline__.js:53`, `LE/20/...Viewport3d__.js:47`,
  `LE/20/...ViewportIdentity__.js:59`). PlanDoors needs DoorPose, FindDoorGroups, six ClickToOpenDoors exports and a
  VV swing category key; PdfFonts fetches TTF cuts from NA's host (`LayoutEditor__Pdf__FontCdnBase`, TV LE AppConfig
  :502). Verifier line count: 14 LE files 3,861 + PhaseLibrary 602 = 4,463 (survey 4,705).
- **F38** - nine files (NoteRegions x3, Panel__MarginNotes__Leaderless, Panel__MarginNotes__Regions,
  SpecData__Lockstep, SpecLockstep, SpecMargin__Column, CabinetInfill), 4,856 lines.
- **F42** - add seams: (12) app-named window globals (V04/V05); (13) design-phase code paths (V03); (14) names
  missing from shared VV modules (`Na__RenderLoop__IsPaused`, ModelToggle x3, `Na__DoorAnim__*` x6).
- **F44** - see R13 addition.
- **F48** - also `45/Na__PlanDimensions__Styles__.css:8` banner "TRUEVISION3D - PLAN DIMENSIONS - STYLES" (its PORT
  NOTE precedes the banner) and `LE/50/Na__LayoutEditor__SpecPdf__.js:147` reading `window.TrueVision__Pwa__ProjectContext`.
- **F49** - add `LayoutEditor__Pdf__FontCdnBase` (TV LE AppConfig :502); the lint must not ban
  `noble-architecture.com` wholesale (VV `Na__AppConfig__Main.json:365,368,370`, `ProjectLoader.js:92,111,127`,
  `Na__CoreUi__Styles__Fonts__.css:12,23`).
- **F52** - see W7.
- **F60** - see section 9.
- **F61** - TV root PLAN docs: DraftMode, DrawingMenus, DrawingPlanes, ElevationDepthFog, FloorAreas,
  PublishingSystem, ScrapbookSystem, SheetImages, SitePlanComposites, SitePlanDrawings, ValeVisionRealign__DrawingSystems,
  VectorTools (12). TV root also holds `DEPENDENCY_CHART.md` and `__StupidProof__Plan__Fix__ProfileLines__GPU__Drain__.md`
  outside the convention, and VV root `install-guide.html`.

## 12. Findings added by the verifier

**S01-V01 - `Na__RenderLoop__IsPaused` missing in VV; VV's render-loop hold is event-based** (wiring, medium,
update_wiring). TV `05/Na__RenderLoop__Invalidation.js` keeps the hold reasons in the module and exports
`Pause`, `Resume`, `IsPaused` (:71, :88); TV LoadingSequence (:305, :1144) and
`47/Na__DrawingPlanes__Grip__.js` (:83, :204, :706) read IsPaused. VV's Invalidation (1.1.0) exports Pause/Resume as
event dispatchers (`na-pause-render-loop` / `na-resume-render-loop`) and VV's LoadingSequence owns the reason set
(:1181, :1507-1514). Fix: add `Na__RenderLoop__IsPaused` at TV's name in VV's Invalidation by mirroring the reason
set inside the module (Pause/Resume already pass through it) while keeping the events; PORT NOTE "adapted".
Blocks a verbatim 47 port.

**S01-V02 - Names missing from VV modules the drawing system shares** (wiring, medium, port_adapted).
`26/Na__UiFeature__ModelToggle__Controls.js`: TV exports `Na__ModelToggle__SetCategoryVisibleByKey`,
`BorrowRegistry`, `RestoreRegistry`, imported by TV `LE/25/...SnapshotRenderer__.js:212` and used at :602, :784, :815;
VV's export block (:409-415) has none. `25/3dObjectIInteraction__Animation__ClickToOpenDoors__.js`: TV exports
`Na__DoorAnim__ApplyPanelTransform`, `ComputePanelLocalPose`, `DescribeDoors`, `GetLiveProgress`,
`MOD_TYPE_FIXED`, `MOD_TYPE_ROT_ONLY`, used by `50/...DoorPose__.js`; VV's copy lacks all six. The survey's W1 called
both files "present, no change". Fix: add the names at TV's paths with the SnapshotRenderer (S04a) and DoorPose (S02b)
ports; until then those ports carry an import seam.

**S01-V03 - Design phases (`modelGroups`) are TrueVision-only** (decision, high, needs_decision). TV's project data
can hold several design phases (`modelGroups`; TV ProjectLoader :175-196 with `HasModelGroups`,
`ExtractModelGroup`, `GetActiveGroupIndex`, `FetchTrueVisionProjectData`), switched by a Design Phase menu
(`Index.html:202-205, 338-341`, `26/Na__UiFeature__ModelGroupSelector.js`, `...ModelGroupTransitionOverlay__.js`) and
registered for drawings by `26/Na__ModelGroup__PhaseLibrary__.js` (602 lines). TV's LE uses it in ModelSource__,
SnapshotRenderer (phase staging, BorrowRegistry/Pin), ViewportIdentity, ModeController and the PL Pipeline; TV's own
PORT NOTEs say VV has no model groups. VV has no phases (no `modelGroups`, no menu). Decide: (a) VV stays
single-phase - port PhaseLibrary/ModelSource only if they reduce to "the live model" with no groups (verify), or stub
them at TV's names; (b) VV adopts `modelGroups` in `project.json` through its exporter. Recommend (a).

**S01-V04 - TV LE reads TV PWA globals for the project's display name** (wiring, medium, port_adapted).
`window.TrueVision__Pwa__ProjectContext` is read by TV `LE/50/...SpecDocument__.js:161`, `...SpecPdf__.js`,
`LE/51/...Register__Pdf__.js:213`, `LE/57/...Panel__ScrapbookParametric__.js:290` and the Statement TrueVisionHub
section, and set by TV's 62 PWA modules and LoadingSequence :383. WCP's PWA defines no such global. VV
`LE/50/Na__LayoutEditor__SpecPdf__.js:147` already reads the TV global, so VV's specification PDF never carries the
project name. VV knows the name (`64/Na__Feature__BreadcrumbNav__Controls.js:161-162` reads `projectJson.projectName`).
Fix: a module accessor (e.g. `Na__DrawData__GetProjectDisplayName`) with a VV body over project.json, used instead of
the global in every ported file; offer it to TV (D-S01-04). Rule R21.

**S01-V05 - WCP's shared SW registrar can reload a VV editor with unsaved sheets** (wiring, medium, update_wiring).
`WCP/.../Whitecardopedia__Pwa__ServiceWorker__Registrar__.js:108-150` reloads every controlled page once on
`controllerchange`, deferring only while `window.Na__LoadWatchdog__IsLoadingActive`. TV's registrar holds while
`window.TrueVision__Pwa__HasUnsavedWork` (TV registrar :59, :133-134, :167). VV AutoSave exports
`Na__LeAuto__HasUnsavedWork` but publishes nothing, and its PORT NOTE (:48-53) says VV "has no service worker" -
wrong (`VV/index.html:44` loads the WCP registrar). Every SW token bump (WP-S01-01R and most ports) can reload an
open VV editor. Fix: VV publishes a neutral `window.Na__Pwa__HasUnsavedWork` (AutoSave), and WCP's registrar holds
the reload while it returns true (WCP hot file); correct the PORT NOTE and ledger 1189.

**S01-V06 - TV LE/80 WebViewer now depends on 52/53 and shows published files only** (ui, high, needs_decision).
TV `LE/80/Na__LayoutEditor__WebViewer__.js:96-100` imports 52 PubDoc (Document, LoadingScreen, Urls); since TV
v2.155.0 (DEVLOG:1266-1331) the web viewer shows baked files and never renders. VV's WebViewer (VV v2.58.0, from TV
v2.65.0) renders live. Porting TV's WebViewer drags in 52, 53, 65 and the transport facade, and changes what VV's
public site does. Decision D-S01-16.

## 13. Work packages

Original packages: WP-S01-02, WP-S01-05, WP-S01-07, WP-S01-09 stand as written. WP-S01-01, WP-S01-03, WP-S01-04,
WP-S01-06 and WP-S01-08 are superseded by corrected versions (R suffix) below. Two packages are added (10, 11).

**WP-S01-01R - Drawing-system folder renumber (atomic, first).** Scope as WP-S01-01, with: (1) move
`Na__RenderEffect__2dProfileLines__.js` to `05__RenderPipeline/` and repoint `ComposerPreset__.js:91,93` and
`SystemLogic.js:47`; (2) move legacy 40 to the number D-S01-13 settles and fix `SystemLogic.js:67`; (3) git mv
42->40, 43->42, 44->43, 45->44, 46->45, 47->46; (4) rewrite every full old folder name in the 67 files of
`verify_s01/renumber_touch_verified.txt` (235 references; devlog, ledger and plan rows are history); (5)
SnapshotHistory rename; (6)/(7) D-S01-06 / D-S01-07 if approved; (8) bump the WCP token in the logic file and
confirm which file the deployed site registers (W7); (9) VV devlog entry, ledger "Folder renumbering" section, dated
revision notes in VV plan D05 and (TV-side, if D-S01-12 allows) TV plan section 4/4.1. Hot files: as WP-S01-01 minus
`05/Na__RenderEffect__SectionClipping__State.js`, `21/Na__PresentationMode__DevMenu__ScenePersistence__.js`,
`41/Na__CrossSectionView__SystemLogic.js` (no old folder name in them). Acceptance: zero hits for the seven old folder
names outside history; both Verify scripts pass; `git diff -M` shows renames; all **69** shared drawing files in
40/42-46 pair by identical path with TV (2 VV-only, 10 TV-only remain unpaired); Adam's in-app checklist.

**WP-S01-03R - Hotkey file renames and identity hygiene.** WP-S01-03 plus: comment references in `index.html:1261,
1776`, `ConfigState__.js:154`, `ConfigState__KeyMap__.js:13,154`, `Controls__Pc__.js:19`,
`Controls__TouchScreen__.js:29`, `Measurements__.js:56`, LE AppConfig :277, :457, HotkeyHandler :13, :28,
NavigationHelpPanel :22; the banner of `45/Na__PlanDimensions__Styles__.css`. Acceptance: no reference to the FILE
names `Na__LayoutEditor__KeyMappings__.json` or `Na__ValeVision__HotkeysDictionary__.json` outside history (the JSON's
internal `LayoutEditor__KeyMappings__*` keys stay - TV kept them); no `[TrueVision3D` prefix and no `TRUEVISION3D`
banner in VV src.

**WP-S01-04R - Retire VV Snapping__ for TV 28 ObjectSnap.** WP-S01-04 plus the three missing importers
`30/Na__LayoutEditor__SheetTools__.js`, `30/...SheetTools__ContextMenu__.js`, `30/...SheetTools__Keyboard__.js`
(VV's Snapping__ has 11 importers), and removal of the `Na__LeOsnap__TONE_*` imports (PointerDrag :137; DimensionTool).

**WP-S01-06R - Transport and identity facade scaffold.** WP-S01-06 with a corrected VV starting point: the VV
`Na__AppUtils__LocalProjectMirror__.js` wraps routes WCP/server.py already has - `MergeKeys` = read project.json, merge
keys client-side, POST `/api/projects/<folder_id>` (as TV does against its own server); `WriteSiblingFile` for the
notes file = POST `/drawing-notes` - and adds only what is missing: generic sibling files, drawings fingerprint + 409
guard + backups, statements. The ApiClient facade's bodies call VV's route-specific worker handlers (no generic /r2/*
on whitecardopedia-editor-api); every new key under `VaApps/Projects/<folderId>/`.

**WP-S01-08R - Parity naming lint.** WP-S01-08 with rule (3) narrowed: fail on `TrueVision__` literals, `[TrueVision3D`,
`TRUEVISION3D`, `window.TrueVision__`, `/api/truevision`, `NaProjectPortal`, `30__TrueVision__AppContent`,
`/na-apps/30__TrueVision__CoreAppCode`, `noble-architecture.com/q/`, `noble-architecture.com/s/`; allow
`cdn.noble-architecture.com/VaApps/` and `www.noble-architecture.com/assets/` (VV's own).

**WP-S01-10 (new) - Shared-module export parity for the drawing system.** Add `Na__RenderLoop__IsPaused` to VV's
Invalidation (S01-V01); add the three ModelToggle names and six `Na__DoorAnim__*` names at TV's paths (S01-V02) when
their consumers are ported. Size S.

**WP-S01-11 (new) - PWA seams the Layout Editor needs from WCP.** Neutral unsaved-work flag published by VV
AutoSave and honoured by WCP's registrar (S01-V05); a project-display-name accessor replacing
`window.TrueVision__Pwa__ProjectContext` in VV SpecPdf (and in every ported TV file) (S01-V04). Size S. Hot file outside
VV: WCP registrar.

## 14. Decisions

Survey decisions D-S01-01..12 stand, with these verifier notes: **D-S01-01** - the renumber reverses TV plan section 4
and 4.1 as well as VV D05, and saves path rewrites on 69 drawing-file pairs plus every TV import specifier into
40/42-46 (not "249 pairs"). **D-S01-03** - VV's Flask already has the main write routes (F14). **D-S01-10** - option
(a) can be VV's own 61 ShareProjectLink URL scheme.
Added: **D-S01-13** legacy 40 target (91 vs S02a's 39) and 2dProfileLines destination (05 vs 40); **D-S01-14** design
phases in VV; **D-S01-15** confirm the renumber over TV plan 4/4.1 and that "its own ... file structure" in Adam's
brief means storage layout, not the source tree; **D-S01-16** published-only web viewer in VV or not.

---

## Verification

**Inputs.** The survey JSON (the markdown was missing and is rebuilt here); `ref/*` (tree, drift, devlog, ledger and
port-note indexes); both app trees (read-only); WCP `server.py`, worker and PWA modules; NAAPPS scrapbook API (for
the content-folder naming check). Every claim below was checked against files, not against the survey's own work
files.

**What was checked.**
- All 2 critical and 28 high findings (100 percent), and all 35 medium/low findings at least by spot check (F04 and F31 only partly: F04's export-overlap percentages and F31's statement routes were not recomputed).
- An independent import graph of both apps (754 TV / 512 VV source files) rebuilt the outside-folder dependency
  surface of TV 40-55, every importer list behind a rename, and VV-only / TV-only export names (exact match: 18 / 269).
- Folder map, file counts and line counts for every top-level folder and every LE subfolder; the renumber touch list
  recomputed (67 + 3 history files, not 106).
- Devlog and plan citations opened: TV DEVLOG v2.68.2 (9778-9836), v2.83.0, v2.115.0 (5041-5053), v2.129.0
  (3712-3727), v2.155.0 (1266-1331), the devlog index for every other cited version; TV plan sections 2.2, 4, 4.1;
  VV plan D05-D12; ledger rows 29, 34-49, 868, 1087-1246.
- "VV lacks X" claims: searched all VVM folders, other names and namespaces for DrawingPlanes, depth fog, draft,
  grid, ortho, axes, vector tools, hatches, document keys, register, statements, QR, publish, share, palette, spell
  check, key scope, local mirror, ApiClient. Only "share" has a VV relative (61 ShareProjectLink, a different
  feature); every other "lacks" holds.
- Vendors and import maps: clipper2-js, three-edge-projection utils and jsPDF identical with `-w`; import maps
  identical.
- Identity: banners, console prefixes, `TrueVision__` literals, window globals, storage keys, R2 bucket bindings,
  CDN and font hosts.

**What was corrected** (18 findings): F01, F06, F08, F09, F14, F22, F36, F37, F38, F42, F44, F45, F48, F49, F52, F60,
F61, F64 (detail, action, title or evidence - see section 11). Actions changed: F06 and F37 from port_verbatim to
port_adapted. No finding was refuted outright.

**What was added**: S01-V01..V06; rules R21-R23; WP-S01-01R, -03R, -04R, -06R, -08R (superseding the originals),
WP-S01-10, WP-S01-11; decisions D-S01-13..16.

**Cross-slice conflicts for the planner**: legacy 40 target and 2dProfileLines destination (S01 vs S02a, D-S01-13);
the transport shim agrees with S09 (D-S09-04); the renumber agrees with S02a (D-S02a-01) and S09 (D-S09-02).

**What remains unverified**:
- Whether PhaseLibrary/ModelSource degrade cleanly to a single phase with no `modelGroups` (needs a run).
- Which service-worker file the deployed (GitHub Pages) site registers - the stub or `live_sw.js` (W7).
- Byte-level content drift inside paired files (other slices) and the route semantics of the transport facade
  (transport slice).
- Binary `.lnk` deploy shortcut targets in VV 62 (not readable as text).
- Counting-method differences (legacy name counts, CSS class counts) were not reconciled with the survey's method;
  they do not change any rule.
