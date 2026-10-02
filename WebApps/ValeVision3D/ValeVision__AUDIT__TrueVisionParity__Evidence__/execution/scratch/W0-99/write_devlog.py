"""W0-99 Parity Scribe - the Wave 0 entry of ValeVision__DEVLOG__.md (ValeVision3D v2.71.1).

Inserted at the top, above W0-06's records note (newest first), in the house format of audit Section F.5.5. CRLF and
ASCII, as the file is. Removing the inserted block gives back the file byte for byte (checked before the write).
Usage: python -B write_devlog.py --build | --apply | --restore
"""
import hashlib, os, sys, textwrap

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
DEVLOG = os.path.join(VV, 'ValeVision__DEVLOG__.md')
HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, 'devlog__candidate.md')
PRE = os.path.join(HERE, 'preimage_records', 'ValeVision__DEVLOG__.md')
EXPECT = '378bf0f910d6e7e9836d51cc24895ce20d25be84'      # W0-06's final SHA-1 (its Port Record)
TOP = b'# ValeVision3D Development Log\r\n\r\n'
NEXT = b'# ---------------------------------------------------------\r\n## Records note - 01-Oct-2026 (not a release)'
WIDTH = 118

# '#'-prefixed lines and '**...' headings are kept as they are; 'P:' = a paragraph; '-' = a bullet; '' = a blank line.
ENTRY = [
    '# ---------------------------------------------------------',
    "## ValeVision3D v2.71.1 - 01-Oct-2026 - The Drawing Folders Take TrueVision's Numbers, and TrueVision's Code Finds ValeVision's Own Storage",
    '### Ported from TrueVision3D in part, read at b2aa9151: v2.7.1, v2.8.0, v2.18.0, v2.21.0, v2.24.0, v2.30.2, v2.32.1, v2.54.0, v2.67.0, v2.95.0, v2.115.0, v2.116.0, v2.144.0, v2.146.0 and v2.155.0, the configuration of 36 more, and (staged for Adam, not live) v2.75.0 and TrueVision commit 089a02df (Adam-confirmed in TV: v2.7.1; v2.116.0 and v2.155.0 in part; none of the others)',
    '',
    '**Overview**',
    "- Wave 0 of the TrueVision parity programme. Adam, 01-Oct-2026: align ValeVision's drawing system and Layout Editor exactly "
    "with TrueVision's, while ValeVision keeps its own worker, its own Flask server and its own storage. The plan is "
    "`ValeVision__AUDIT__TrueVisionParity__DrawingSystems__.md` at this root; this release is its first wave, nineteen packages "
    "run unattended on the plan's defaults. Adam has answered none of DR-01 to DR-44 yet, so each ran on its K1 default, "
    "recorded as D41 to D91 in section 2A of `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`.",
    "- FOUNDATIONS, NOT FEATURES. Nothing a Vale user sees is meant to change: the drawings open, render, save and print as "
    "before. What changed is underneath - where the drawing folders sit and what they and the key files are called, how a "
    "module ported from TrueVision reaches ValeVision's storage, what the local server refuses, and the whole of the Layout "
    "Editor's configuration.",
    "- One version for the whole wave, a patch step from v2.71.0 (D85, Adam's patch-bump rule). Every module log line and "
    "PORT NOTE the wave wrote in this app's code now names v2.71.1 (seven elsewhere wait: see Known, accepted).",
    '',
    "**The drawing folders take TrueVision's numbers** (W0-02, DR-02)",
    "- ONE SCRIPTED MOVE, RUN FIRST AND ALONE. 42 DrawingViewCore -> 40, 43 FloorPlanViews -> 42, 44 PlanAnnotations -> 43, "
    "45 PlanDimensions -> 44, 46 ElevationViews -> 45, 47 NorthDirection -> 46, and the legacy 40 2dElevationsView -> 91 "
    "(it retires with W6-03). Four files followed: 2dProfileLines into 05__RenderPipeline, SnapshotHistory under "
    "TrueVision's file name, DistanceCulling at TrueVision's path, and the drawing Composer Preset as "
    "`40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js`, TrueVision's eight export names over ValeVision's own "
    "EffectComposer body (DIV-1). 81 renames and 94 rewritten files (imports, CSS imports, config paths, comments); 70 "
    "drawing files now pair with TrueVision's by identical path. The parity ledger's section 2.2 has the map.",
    "- 41 CrossSectionView keeps its name and gains a README saying why (DIV-2); 50 and 51 were shared already.",
    "- RenderFrame takes an optional camera. Nothing passes one yet, so every frame renders as before.",
    '',
    "**Key files under TrueVision's names, and TrueVision's drawing keys** (W0-03, W0-15; DR-33)",
    "- `02__AppData/Na__Hotkeys__3dModelTab__.json` (was Na__ValeVision__HotkeysDictionary__.json; ValeVision's content "
    "kept) and `LE/03__Core__Config/Na__Hotkeys__DrawingTabs__.json` (was Na__LayoutEditor__KeyMappings__.json).",
    "- KEYMAP 1.11.0 AND TRUEVISION'S KEY FILE LANDED TOGETHER, so T stays Text. With the key file blocked, M now arms Move, "
    "space arms Select and Ctrl+S saves, where the old built-in fallback left M dead. The keys TrueVision's later tools use "
    "resolve but do nothing here: ValeVision's keyboard ignores actions it does not have yet.",
    '',
    "**The transport: TrueVision's names over ValeVision's storage** (W0-11 to W0-14; DR-27 (A), DIV-4)",
    "- THE FACADE AT TRUEVISION'S PATHS. `80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (TrueVision's "
    "33 names) and `03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` (its 8) now exist here with TrueVision's names, "
    "parameters and result shapes and ValeVision's bodies: the whitecardopedia-editor-api worker, keys under "
    "VaApps/Projects/<folderId>/, the Flask server. A TrueVision module that imports them links unchanged. A worker route is "
    "called only when the worker's /health lists it, so today's deployed worker (1.5.0) goes on working. Nothing throws, and "
    "no key the pipelines own is ever written.",
    "- THE PROJECT FOLDER COMES FROM THE MASTER INDEX. ProjectLoader gains TrueVision's GetProjectFolderFromUrl and "
    "GetYearFromUrl with ValeVision's meaning: the index entry ?project= names, a four-digit year, and null rather than a "
    "guess. On localhost an asset's fallback is now the Flask copy of the project, not GitHub Pages.",
    "- ON LOCALHOST THE LOAD READS R2'S EDITOR-OWNED KEYS. The loading sequence starts the facade after the master index "
    "and, on localhost only, overlays each editor-owned key R2 holds onto the local project.json before anything reads it "
    "(TrueVision v2.7.1's rule), so a session never edits a disk copy of the sheets that has fallen behind R2. It is bounded "
    "by the fetch timeout, never fatal, and skipped when the two copies name different projects. The sequence also registers "
    "the document it runs as the merge base, adds sceneConfig to the drawings event and announces na-app-scene-ready once "
    "the canvas shows.",
    "- The specification PDF now prints the project's name (it never has in ValeVision), through the facade's display-name "
    "accessor in place of TrueVision's PWA global (proved in Node; the printed page is on the smoke test).",
    "- ASSETS. Assets 1.0.1 and Persistence 1.2.1 are taken whole from TrueVision (snapshots and linework read from the "
    "URL's project folder) with ValeVision's localhost upload and bake gates. R2AssetUpload keeps its two-phase body but takes "
    "TrueVision's contract: a refused or failed upload resolves r2Success false and is never counted as stored, and off "
    "localhost it skips silently, with no toast. Presentation Scenes > Update All Thumbnails no longer fails every scene: the "
    "thumbnail renderer takes TrueVision's CaptureAndUpload(sceneId[, width]) call shape, which the batch walk uses (proved "
    "against stubs; the press itself is on the smoke test).",
    '',
    "**The local server will not lose a save** (W0-09, W0-18, W0-19; `WebApps/Whitecardopedia/server.py` and four new blueprints)",
    "- A GUARDED PROJECT SAVE (TrueVision v2.146.0). A POST to /api/projects/<folderId> carrying an "
    "X-ValeVision-Drawings-Base header is refused with a 409, nothing written, when the drawings on disk have changed since "
    "the window loaded them; a save without the header is judged by nobody, exactly as before. Every overwritten project "
    "file is first copied to `%LOCALAPPDATA%\\ValeGardenHouses\\ValeVision\\ProjectDataBackups` (the last 30, never inside "
    "the repository), and every write is atomic. New: GET drawings-fingerprint, backups and files/<name>; an unknown /api/ "
    "path answers a JSON 404 instead of the index page; a folder id that would leave Projects/ is refused on every project "
    "route.",
    "- NEW BLUEPRINTS, IDLE UNTIL THEIR FEATURES ARRIVE: sheet images (/api/valevision/sheet-images), the spelling dictionary "
    "(/api/valevision/user-config/spellings, over `50__ValeVision__UserConfig/ValeVision__UserSpellings__.json`, re-seeded with "
    "Vale's words), published documents (/api/valevision/published) and statements (/api/valevision/statements, whose delete "
    "quarantines rather than unlinks). TrueVision's rules over ValeVision's folders, tightened where TrueVision's let a path "
    "escape.",
    "- The repository's `.gitignore` keeps the rasters, PDFs and archives of project content out of git (DR-29: JSON only), "
    "and `.gitattributes` checks statements out with LF line endings.",
    '',
    "**The Layout Editor's configuration is TrueVision's** (W0-15, W0-16)",
    "- ONE ADDITIVE PASS. Every TrueVision key, block, note and label is now in `Na__LayoutEditor__AppConfig__.json`, in "
    "TrueVision's formatting. 79 values stay ValeVision's on purpose - brand 17, decisions 12, identity 11, NA paths 3, "
    "TrueVision defects 3, ValeVision-only 8, and 25 withheld for the packages that bring their features - each listed with "
    "its owner in `Na__Test__AppConfigParity__.test.mjs`. The ConfigState units are TrueVision's: the barrel 1.29.0, KeyMap "
    "1.11.0, SheetSetup 1.9.0, ToolSetup 1.5.0, EditorSetup 1.6.0.",
    "- THE STATEMENT WRITER'S SWITCH, OFF: `LayoutEditor__Statement__Enabled = false` (ValeVision-only, DR-10). No job stages "
    "in the Drawing Register (DR-11), no QR cell (DR-12).",
    "- VENDORS AT TRUEVISION'S PATHS. jsPDF 4.1.0 and html2canvas 1.4.1 in `04__Lib__ThirdParty__VersionLocked/` 05 and 06, "
    "byte-identical to TrueVision's; PDF.js 3.11.174 as ValeVision's vendor 07. Download PDF loads the same jsPDF bytes from "
    "vendor 05, and the Classic title block takes Vale's own scan from `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/`. "
    "35__System__PageLayoutSystem is untouched; Image Export still uses it.",
    '',
    "**Start-up order, gates and records** (W0-01, W0-04, W0-05, W0-06, W0-17)",
    "- index.html now runs the authoring gate, the drawings-data and section-bindings listeners and the drawing view config "
    "before the loading sequence starts, as TrueVision does, which closes a latent race between a dispatch and its listener.",
    "- NEW GATES in 80__Testing__PrototypeEnvironment: Na__Verify__ParityNaming__ (identity and Noble Architecture markers), "
    "Na__Verify__PortNotes__ (Source version lines, log order, release placeholders), Na__Verify__UiParity__ (the drawing "
    "chrome against TrueVision's) and Na__Test__LoaderStylesheets__. ModuleGraph 1.1.0 no longer reads prose inside a string "
    "as an import; Exports 1.1.0 checks every name the lazy loader's facade calls.",
    "- The decision record (D41 to D91), the port-order map, and the parity ledger, restructured and now carrying this "
    "wave's rows (its section 8 is the transport). The folder-number registry "
    "(`ValeVision__NOTES__FolderNumberRegistry__.md`) and `ValeVision__PLAN__TrueVisionRealign__DrawingSystems__.md` are new "
    "at this root.",
    '',
    '**Adapted for ValeVision**',
    "- THE TRANSPORT IS VALEVISION'S THROUGHOUT (DIV-4): no TrueVision client, route, portal key or app-content folder was "
    "copied. TrueVision's folder names sit directly inside ValeVision's project folder (05__Layout__DrawingDocs__Images, "
    "06__Layout__PublishedDocuments, 10__StatementDocs), and the sibling files are ValeVision__DrawingNotes__.json and "
    "ValeVision__StatementDocs__.json.",
    "- One list of editor-owned keys, `ProjectData__EditorOwnedKeys` in the main config (13 keys, W0-07), read by the load "
    "overlay now and by the sync fix and worker 1.6.0 once Adam applies them; TrueVision keeps three hand-synchronised lists.",
    "- The unsaved-work flag AutoSave publishes is `window.Na__Pwa__HasUnsavedWork`, a neutral name (K2 K4); nothing reads "
    "it until the prepared registrar is deployed.",
    "- Identity: no Noble Architecture content reaches a Vale user. The dictionary's practice group lists Vale's software, not "
    "TrueVision's; TrueVision's NA scan, letterhead paths and job stages were never copied.",
    '',
    '**Prepared for Adam, not live** (staged under `ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/prepared/`, each with a patch that applies cleanly and its own tests)',
    "- THE SYNC STOPS DELETING EDITOR CONTENT (W0-07, DR-06). Until Adam applies it, a Whitecardopedia Cloud Sync of a "
    "project deletes its Layout Editor snapshots and Views-bar thumbnails on R2 (20 objects on 2026/3047__Doous) and can put a "
    "stale project.json over R2's sheets. The fix lists top-level keys only and keeps R2's copy of every editor-owned key. "
    "Dry-run on 2026/3047__Doous only; nothing was synced.",
    "- WORKER 1.6.0 (W0-10, DR-28): the project and merge-keys routes and six families of guarded file routes, every "
    "folderId checked. NOT DEPLOYED: the live worker answers /health with { ok, worker }, the 1.5.0 shape. It also closes a "
    "live 1.5.0 hazard - a keyed POST to .../projects/2026/delete would delete every 2026 project on R2. Adam runs wrangler dev, "
    "then deploys.",
    "- THE SHARED SERVICE-WORKER PACKAGE (W0-08, DR-07): the registrar holds its reload while sheets are unsaved and never "
    "reloads on a first install; models and thumbnails get a token of their own; the lazily linked Layout Editor stylesheets "
    "are precached; the stale DistanceCulling precache path is corrected; and sheet pictures and published documents get caches "
    "of their own.",
    '',
    '**Not ported, and why**',
    "- TrueVision's transport bodies, its na-truevision-api client, /r2/* routes and portal keys (DIV-4, gate G6).",
    "- TrueVision's DevGate gate in Assets and Persistence: uploads and bakes stay a localhost activity (D24, DR-31 (2)).",
    "- TrueVision's model groups and design-phase start-up (DR-09: W1-01 lands the library uninitialised), its 3D-tab "
    "extras (DR-44), its project-code addressing on the local server (folder ids instead) and its own write format for "
    "project.json (ValeVision keeps its bytes).",
    "- The four gesture changes (DR-40 items 7-10): their configuration rows landed and nothing reads them; W3-03 writes the "
    "guards and W3-04 waits for Adam.",
    "- THE SHARED SERVICE WORKER. This release adds two modules (the facade) and new exports on existing modules - "
    "ProjectLoader +2, the ConfigState barrel +9, KeyMap +4, SheetSetup +3, EditorSetup +2, and RenderPreset's eight names "
    "renamed with its file - and moves 81 files to new URLs. So a warm client holding a mix of old and new files cannot link "
    "the editor, and with the facade now in the start-up graph cannot start, for that one load. The token is still Adam's "
    "call; it was not bumped ('2026-09-18-1'). Deploy this release only with the prepared W0-08 package applied plus one "
    "shell-token bump, or with a full bump.",
    '',
    "**TrueVision releases in this release, and what Adam has confirmed in TrueVision** (DR-01 (c): ported in dependency order, every unconfirmed release named)",
    "- CONFIRMED: v2.7.1 (the localhost overlay, W0-13 - \"Confirmed working end to end\").",
    "- CONFIRMED IN PART: v2.116.0 (Adam's own run stored and pushed a picture in TrueVision; the ValeVision port waits on "
    "his sign-off, and the worker's images bucket was not part of it) and v2.155.0 (his confirmation covers the PDF exporter "
    "fix, not Phase 0's vendor moves, the archive route's revision change or the R2 push).",
    "- NOT CONFIRMED - TrueVision's devlog says not tried by Adam, or not yet confirmed: v2.95.0 (the statement routes), "
    "v2.146.0 (the save guard: \"NOT tried in the app\"), v2.144.0, and the configuration of v2.77.0, v2.107.0, v2.109.0, "
    "v2.111.0, v2.112.0, v2.113.0, v2.114.0, v2.117.0, v2.118.0, v2.119.0, v2.122.0, v2.123.0, v2.127.0, v2.130.0, v2.131.0, "
    "v2.135.0, v2.136.0, v2.138.0, v2.139.0, v2.140.0, v2.141.0, v2.142.0, v2.143.0, v2.147.0, v2.151.0, v2.157.0, v2.158.0 and "
    "v2.163.0.",
    "- NOT CONFIRMED - no record either way: v2.8.0, v2.18.0, v2.21.0, v2.24.0, v2.30.2, v2.32.1, v2.54.0 (its commit's "
    "unlogged Assets 1.0.1 and Persistence 1.2.1), v2.67.0, v2.115.0 and the configuration of v2.71.0, v2.78.0, v2.79.0, "
    "v2.81.0, v2.94.0, v2.104.0, v2.106.0 and v2.149.0; staged only: v2.75.0 and TrueVision commit 089a02df (29-Sep-2026, "
    "after v2.172.0: registrar 1.3.0 and worker logic 1.9.54, with no devlog entry of their own).",
    "- NAMES ONLY, NO BEHAVIOUR: the RenderPreset interface (TrueVision v2.21.0, file 1.1.0 at v2.94.0), the facade's "
    "interface history (v2.36.0, v2.39.0, v2.74.0, v2.88.0) and SectionClipping__State's NAMESPACE and MODULE lines (v2.12.0).",
    '',
    '**Verified** (W0-99, fresh runs on the wave\'s final tree, after the placeholders were resolved)',
    "- Na__Verify__ModuleGraph__ PASS: 518 modules from 1 entry point, 0 failures (517 before the wave; the new one is the "
    "facade). Import-map targets 110, the one documented vendor known issue unchanged.",
    "- Na__Verify__Exports__ PASS: 417 files (415 before; the two facade modules), and the 34 names the lazy loader's facade "
    "calls all exported.",
    "- The path gate PASS through the records-exempt wrapper (0 fail, 1 baseline warning). Run raw it reports 55 retired "
    "folder names, every one inside the audit report, which names them by design.",
    "- Na__Verify__ParityNaming__ PASS, 0 fail and 0 warnings. Na__Verify__PortNotes__ PASS: 515 files, 291 PORT NOTEs, 397 "
    "logs; 0 fail, 151 warnings all on the 01-Oct-2026 baseline, no placeholder pending; `--scribe` PASS. "
    "Na__Verify__UiParity__ (report): the fold, stylesheet order and motion rules pass; the tab strip, veil and panels fail "
    "as expected until W1-34, W1-33 and W1-38; the service-worker token warning stands.",
    "- 16 of 16 tests exit 0: AppConfigParity, DrawingNotesRoute, LoaderStylesheets, NorthCompass, PerSceneLighting, "
    "ProjectDataSaveGuard, PublishedApi, ScrapbookApi, ScrapbookDrawingTitle, ScrapbookScaleBar, SheetImagesApi, "
    "StatementServer --check, TitleBlockCells, TransportFacade (175 checks), UserSpellingsApi, ViewportTitleText. The Python "
    "tests drive Flask test clients over temporary folders; nothing outside the scratch folders changed while they ran.",
    "- The staged packages' own tests, on their staged copies: sync 72/72, service-worker logic 54/54 and registrar 30/30, "
    "worker ProjectFiles 263/263 and MergeKeys 95/95.",
    "- The integrator's gate (21:12-21:38) also ran Na__Test__SpecificationPdf__ and Na__Test__TitleBlockCells__ headless "
    "(both complete), proved every changed file belongs to a package's record, and made two small fixes: the web viewer "
    "stylesheet's TrueVision banner, and a stale allow-list entry in the AppConfig parity test.",
    "- NOT EXERCISED: the app in a browser. Adam's Wave 0 checklist (audit section F.5.4) is deferred to the orchestrator's "
    "smoke test: the app loads; a floor plan, an elevation and a section open from the carousel; a sheet renders, Save "
    "Sheets works and the PDF downloads; Update All Thumbnails; a drawings save reaches the local server and the "
    "specification PDF names the project; Whitecardopedia's Project Editor still saves; then the W0-07 dry run and the W0-08 "
    "package to review. No live sync, no wrangler dev, no deploy, no token bump.",
    '',
    '**Known, accepted**',
    "- Seven release placeholders sit outside this pass's remit and still read as placeholders: the PORT NOTEs of the five "
    "new Whitecardopedia Flask modules (W0-09, W0-18, W0-19) and the vendor README's upgrade line (W0-16). Each should read "
    "v2.71.1; the scribe's tool for them waits on the orchestrator.",
    "- Na__Test__TransportFacade__ asked for its package's placeholder by name, so the scribe's own pass failed it; its check "
    "now accepts the release the placeholder becomes (1.0.1, W0-99). Two scratch harnesses that later packages may adopt "
    "ask the same (W0-08's AutoSave flag test, W0-14's asset contract test).",
    "- A stray test file, `WebApps/Whitecardopedia/Projects/ValeVision__DrawingNotes__.json` (24 bytes), was written by "
    "W0-09's check of the old, unguarded server.py; Adam to delete it. Five new .pyc files in "
    "`WebApps/Whitecardopedia/__pycache__` come back on every reload of the debug server.",
    "- Assets and Persistence now find the project folder only through the master index, so a session whose index fetch "
    "failed recomputes rather than reading stored snapshots and linework.",
    "- Update All Thumbnails now really uploads, through the deployed /assets route, and each thumbnail bumps the build "
    "manifest (every Vale client re-fetches its models once per thumbnail). Prefer a copy project, and apply W0-07 first.",
    "- Na__Test__SpecificationPdf__.html completes only when the repository root is served, not on the Flask server.",
    '',
    '**Files**',
    "- MOVED (W0-02): the seven drawing folders (now 40, 42 to 46 and 91) and four files - the map is in the parity ledger, "
    "section 2.2.",
    "- NEW: `02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js`, "
    "`03__AppUtils/Na__AppUtils__LocalProjectMirror__.js`; the vendors `04__Lib__ThirdParty__VersionLocked/"
    "05__Vendor__JsPdf__v4.1.0/jspdf.umd.js`, `06__Vendor__Html2Canvas__v1.4.1/html2canvas.umd.js`, "
    "`07__Vendor__PdfJs__v3.11.174/build/pdf.min.js` and `pdf.worker.min.js`; "
    "`01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png`; "
    "`50__ValeVision__UserConfig/ValeVision__UserSpellings__.json`; `41__System__CrossSectionView/README__CrossSectionView__.md`; "
    "in 80__Testing__PrototypeEnvironment the AppConfigParity, DrawingNotesRoute, LoaderStylesheets, ProjectDataSaveGuard, "
    "PublishedApi, SheetImagesApi, TransportFacade and UserSpellingsApi tests, Na__Test__StatementServer__.py, the three new "
    "verifiers and Na__Verify__ParityBaseline__.json; at this root the folder-number registry and the realign plan.",
    "- CHANGED: index.html; LoadingSequence 1.7.1; Na__AppConfig__Main.json; ProjectLoader 1.4.1, R2AssetUpload 1.0.2, "
    "HotkeyHandler 1.0.1; DistanceCulling 1.0.1 and SectionClipping__State's header; NavigationHelpPanel 1.4.1; "
    "Thumbnail__Renderer 1.1.1, SceneEditor 1.4.1, SceneReorder 1.0.1, SceneRowBuilders 1.3.1; RenderPreset 1.3.1; "
    "PlanDimensions__Styles__.css; Persistence 1.2.1; in 51__System__LayoutEditor the AppConfig, ConfigState 1.29.0, KeyMap "
    "1.11.0, SheetSetup 1.9.0, ToolSetup 1.5.0, EditorSetup 1.6.0, Readers' PORT NOTE, Assets 1.0.1, AutoSave 1.3.1, History "
    "1.4.2, Toolbar 1.9.3, SpecPdf 1.0.2 and the web viewer stylesheet's banner; the vendor index and README; ModuleGraph "
    "1.1.0, Exports 1.1.0, Na__Test__NorthCompass__ (a folder path) and the two jsPDF test pages; the PLAN (section 2A and dated notes) and the parity ledger.",
    "- WHITECARDOPEDIA (live): server.py, and new Server__ValeVisionShared__Lib__.py, Server__ValeVisionSheetImages__Api__.py, "
    "Server__ValeVisionUserConfig__Api__.py, Server__ValeVisionPublished__Api__.py, Server__ValeVisionStatements__Api__.py. "
    "Repository root: .gitignore, .gitattributes. Staged, not live: the sync tools (W0-07), the shared service worker "
    "(W0-08), worker 1.6.0 (W0-10).",
    "- Every path, package by package: the Port Records in `ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/"
    "port_records/` and the gate report `.../execution/gate_reports/W0.md`. Nothing is committed: Adam "
    "commits from the wave's path list, staging only those paths.",
    '',
    '**Not yet confirmed by Adam.**',
]


def render(entry):
    out = []
    for item in entry:
        if item == '' or item.startswith('#') or item.startswith('**'):
            out.append(item)
        elif item.startswith('- '):
            out.extend(textwrap.wrap(item, width=WIDTH, subsequent_indent='  ', break_long_words=False,
                                     break_on_hyphens=False))
        else:
            out.extend(textwrap.wrap(item, width=WIDTH, break_long_words=False, break_on_hyphens=False))
    return out


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--build'
    cur = open(DEVLOG, 'rb').read()
    if mode == '--restore':
        if sha1(cur) != sha1(open(CAND, 'rb').read()):
            raise SystemExit('REFUSED: the devlog is not this pass\'s output (%s)' % sha1(cur)[:8])
        open(DEVLOG, 'wb').write(open(PRE, 'rb').read())
        print('restored the devlog')
        return
    if sha1(cur) != EXPECT:
        raise SystemExit('REFUSED: the devlog is at %s, expected W0-06\'s %s - re-read its top' % (sha1(cur)[:8], EXPECT[:8]))
    if not cur.startswith(TOP + NEXT):
        raise SystemExit('REFUSED: the devlog top is not the title followed by W0-06\'s records note')
    lines = render(ENTRY)
    block = ('\r\n'.join(lines) + '\r\n\r\n\r\n').encode('ascii')
    new = TOP + block + cur[len(TOP):]
    # removing the block gives back the old bytes exactly
    assert new[:len(TOP)] + new[len(TOP) + len(block):] == cur
    assert b'\r\n' in new and new.count(b'\n') == new.count(b'\r\n')
    assert b'{{VVREL' not in block
    long_lines = [ln for ln in lines if len(ln) > WIDTH and not ln.startswith('#') and not ln.startswith('**')]
    open(CAND, 'wb').write(new)
    print('entry: %d lines, %d bytes; lines over %d chars (unbreakable tokens or headings): %d' % (
        len(lines), len(block), WIDTH, len(long_lines)))
    for ln in long_lines:
        print('   long:', ln[:140])
    print('candidate sha1', sha1(new)[:8])
    if mode == '--apply':
        os.makedirs(os.path.dirname(PRE), exist_ok=True)
        open(PRE, 'wb').write(cur)
        tmp = DEVLOG + '.w0-99.tmp'
        open(tmp, 'wb').write(new)
        if sha1(open(DEVLOG, 'rb').read()) != EXPECT:
            os.remove(tmp)
            raise SystemExit('STOPPED: the devlog changed while the entry was built')
        os.replace(tmp, DEVLOG)
        print('written; live sha1', sha1(open(DEVLOG, 'rb').read())[:8])


if __name__ == '__main__':
    main()
