from k3_common import *

# =============================================================================
# W5 - CONVERGENCE AND DECISION-GATED OPTIONS: the toolbar taken whole once
# every feature it imports exists, the stylesheet and mode-controller
# convergence checks, and the optional or decision-gated packages.
# W6 - CLOSE-OUT: legacy retirements, the test sweep, the shared service
# worker refresh, the final scribe pass.
# =============================================================================

QRCFG = VLE('53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json')
RENAMEH = 'WCP/CloudflareWorker/src/handlers/CloudflareHandler__ProjectRename__.js'
MASTERIDX = 'WCP/02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json'
FETCHPROJ = 'WCP/Tools__DevUtils/AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py'
BUILDBUCKET = 'WCP/Tools__DevUtils/AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py'
CACHECTL = VVM('70__System__DevTools/Na__UiFeature__DevMenu__CacheAndStorage__Controls.js')
CACHECSS = 'VV/03__Style__AppStylesheets/Na__UiFeature__Styles__DevMenu__CacheAndStorage__.css'

P('W5-01', 'W5', 'Toolbar taken whole at TV 1.24.0',
  'With every module the toolbar imports now in VV (drafting aids 26/27/28/32/33, vector tools 37 and VectorQuality, Sheet Images 54, Floor Areas 59, Document Sharing 66), take TV Toolbar 1.24.0 whole, re-applying only the VV header; the Select and Move tooltips follow DR-40 item 7.',
  tv=[TLE('40__Ui__Panels/Na__LayoutEditor__Toolbar__.js')],
  vv=[TOOLBAR, AC],
  hot=[TOOLBAR, AC],
  deps=['W4-99'],
  gated=['DR-01', 'DR-40', 'DR-18', 'DR-13', 'DR-14', 'DR-23'],
  size='M', est=420, est_note='TV 628 vs VV 394 lines at baseline (366 diff lines); W1-35 and W3-05 already moved VV part of the way',
  adapt=['VV header only; seams only for a feature Adam declines (none by default). AppConfig ToolSelectTitle and ToolMoveTitle take TV\'s auto-Move wording only if W3-04 has landed (DR-40 item 7); otherwise they keep VV\'s wording and the PORT NOTE says so.',
         'Share goes through 66 over VV\'s own links and worker (DIV-4); the Snap split styling comes from 28\'s stylesheet already linked by W2-19.'],
  acc=['The strip matches TV\'s order and words: name | Select, Move, Text, Leader, Dimension, Draw, Rectangle, Circle, Arc, Floor Area, Eyedropper | Image | Snap + arrow | Draft | Grid | Grid Snap | Ortho | Axes | hints | Raster | Vector | Save Sheets, Download PDF, Share.',
       'Each toggle is lit while on and re-syncs on its CHANGED event; F3, F6, F7, F8 and F9 light their buttons; the snap arrow opens the styled snap options menu; Share never calls TV\'s worker.',
       'diff against TV HEAD b2aa9151 shows the header and PORT NOTE only.'],
  tests=['Na__Test__DrawingGrid__.test.mjs (re-run)', 'Na__Test__OrthoMode__.test.mjs (re-run)', 'Na__Test__DrawingAxes__.test.mjs (re-run)',
         'Na__Test__ObjectSnap__.test.mjs (re-run)', 'Na__Test__VectorQuality__.test.mjs (re-run)', 'Na__Test__ShareLinks__.test.mjs (re-run)'],
  src=['WP-S06a-10v', 'WP-S10-12'],
  risk='Ten static imports from other systems: by W5 they all exist, so the port is verbatim; without their stylesheet lines the split button renders unstyled (checked by Na__Test__LoaderStylesheets__).')

P('W5-02', 'W5', 'Stylesheet convergence: Styles__Main, Styles__Main__Paper, Boot and the CSS index',
  'Bring Styles__Main and Styles__Main__Paper to TV except the regions VV keeps in its Boot sheet (tab strip, Dev section, loading screen, DR-24), confirm every Paper region arrived with its owner, take any region still missing, and check the CSS index and the loader STYLESHEETS list against TV\'s order; record the DevToolsMenu / DrawView DevMenu order decision.',
  tv=[TLE('10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css'), TLE('10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css'),
      'TV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css'],
  vv=[MAINCSS, PAPER, BOOTCSS, LDR, CSSIDX],
  hot=[MAINCSS, PAPER, BOOTCSS, LDR, CSSIDX],
  deps=['W4-99'],
  gated=['DR-24', 'DR-39'],
  size='S', est=300, est_note='residual after the owner packages (baseline: Main 593 vs 362, Paper 889 vs 632)',
  adapt=['Rules TV keeps in Styles__Main for its eager CSS index stay in VV\'s Boot sheet (VV loads LE stylesheets lazily, DR-24): one copy only, recorded region by region in the PORT NOTE.'],
  acc=['No .na-le-tabs rule remains in VV Styles__Main__.css and tab-strip rules exist once (Boot); the Dev menu panels and the tab strip look the same before and after the first editor load.',
       'Every Styles__Main__Paper region is either byte-identical to TV or listed as a Boot-sheet seam; the 2 px rubber band and grip states match TV side by side; VV\'s snap marker keeps its styling.',
       'The loader STYLESHEETS list and the CSS index follow TV\'s order (Surfaces, Main, Main__Paper, DraftMode, DrawingGrid, ObjectSnap, DrawingAxes, Panels, Specification x3, SheetImages, Share, WebViewer; 27, 54 and 55 in the index); Na__Test__LoaderStylesheets__ passes.'],
  tests=['Na__Test__LoaderStylesheets__.test.mjs (re-run)'],
  src=['WP-S03b-11', 'WP-S09-04'],
  risk='Cascade order between Boot (page) and Main (loader) - compare side by side with TV.')

P('W5-03', 'W5', 'Mode-controller convergence check and the remaining hunks',
  'After every feature package has applied its TV hunk (W1-W4), diff VV\'s ModeController against TV HEAD and land whatever is left (change-reason routing, the SectionForKind rule, Leave cleanup, Build/Attach/Ready/Initialize order), so the remaining difference is the recorded VV seams only (lazy loader, Layout Mode, VV transport).',
  tv=[TLE('05__Core__ModeController/Na__LayoutEditor__ModeController__.js')],
  vv=[MC, LDR],
  hot=[MC, LDR],
  deps=['W5-02'],
  gated=['DR-24', 'DR-25', 'DR-05'],
  size='S', est=200, est_note='residual; baseline TV 1,292 vs VV 906 lines (828 diff lines), almost all landed by the owner packages',
  acc=['For every region, git diff --no-index -w against TV shows only the listed VV seams; the Build, Attach, Ready and Initialize orders equal TV\'s (Build: document tab ... Area; Attach: Pc, Touch, Tools, Grid, Axes, MarginGrip, RegionGrip; Ready: Cfg ... DrawCfg; Initialize: Vw ... DocKeys).',
       'The Ready chain resolves with any one feature config file missing; every feature works on the first editor load through the loader; loader CheckNames reports no mismatch; G1/G2 pass.'],
  tests=['each feature\'s own test (re-run): Na__Test__DrawingGrid__, Na__Test__DrawingAxes__, Na__Test__SheetImages__, Na__Test__VectorTools__, Na__Test__FloorAreas__, Na__Test__NoteRegions__, Na__Test__SpecLockstep__'],
  src=['WP-S03a-12'],
  risk='Low by now; it fails loudly if a feature package skipped its hunk.')

P('W5-04', 'W5', 'Optional 3D-tab port: Cache & Storage dev panel (DR-44); full screen and the Scene Inspector split only on request',
  'Port TV\'s localhost-only Cache & Storage dev panel adapted to Whitecardopedia\'s registrar; leave VV\'s 60 full-screen row and the Scene Inspector rules where they are unless Adam asks for them (DR-44 default).',
  tv=[TVM('70__System__DevTools/Na__UiFeature__DevMenu__CacheAndStorage__Controls.js'), 'TV/03__Style__AppStylesheets/Na__UiFeature__Styles__DevMenu__CacheAndStorage__.css',
      TVM('76__System__FullscreenMode/Na__UiFeature__FullscreenMode__SystemLogic.js') + ' (only on request)', TVM('76__System__FullscreenMode/Na__UiFeature__FullscreenMode__Prompt.js') + ' (only on request)'],
  vv=[NEW(CACHECTL), NEW(CACHECSS), IDX, CSSIDX],
  hot=[IDX, CSSIDX],
  deps=['W5-02'],
  gated=['DR-44', 'DR-07'],
  size='M', est=520,
  adapt=['Reads window.Whitecardopedia__Pwa__ServiceWorker__Registrar (WCP registrar :378) where TV reads window.TrueVision__Pwa__ServiceWorker__Registrar (TV panel :238); never edits or bumps the shared worker (DR-07): any token need goes into the Port Record for W6-02.',
         'index.html import and initialise call at TV\'s position (TV Index.html :852 and :1616-1617); CSS index line at TV\'s position (TV index :41).'],
  acc=['On localhost only: Bust Caches clears the Whitecardopedia caches and reloads; Full Reset needs a two-step confirm; the panel never appears on the live site.',
       'No change to any drawing-tab behaviour; G4 finds no window.TrueVision__ read.'],
  tests=[],
  src=['WP-S10-14'],
  risk='Low; 3D tab only. Optional: skip entirely if Adam does not want it.')

P('W5-05', 'W5', 'Vale QR resolver and switching the project QR on (only when Adam picks the resolver, DR-12)',
  'Create the Vale q/ resolver outside the app (port of NaWeb/q/index.html: text-node rendering; accepts ?key, ?p=, ?project= and #key; relative location.replace to WebApps/ValeVision3D/?project=<folderId>), give each master-index entry a permanent qrKey written once by the Python index writer and preserved by the rename handler, then switch ProjectQr__Enabled and the title-block QR cell on with the Vale base URL.',
  tv=['NAWEB/q/index.html', 'NAWEB/q/index.json'],
  vv=[NEW('VCB/q/index.html'), NEW('VCB/q/index.json'), NEW('VCB/q/README.md'), R2COMMON, RENAMEH, MASTERIDX, QRCFG, AC, TESTDIR + 'Na__Test__ProjectQr__.test.mjs'],
  hot=[R2COMMON, RENAMEH, MASTERIDX, QRCFG, AC],
  deps=['W5-01'],
  gated=['DR-12', 'DR-43', 'DR-06'],
  size='M', est=650,
  adapt=['Key = a permanent qrKey per master-index entry (DR-12 recommendation), never the bare projectCode (13 shared) or the folderId (changes on rename); NA\'s link is never shipped.',
         'Resolver hosted from ValeCodebase like the existing t/ resolver (VCB/t/index.html), README with never-move / never-hand-edit rules.'],
  acc=['Every enabled VV folder in the master index resolves to its own project, including the 13 shared codes; old key forms keep resolving after a project rename.',
       'OpenCV reads a print-size render of a VV code (Na__Test__ProjectQr__Decode__.py); Adam scans a printed drawing with a phone; section 4 of Na__Test__ProjectQr__ adapted and passing.'],
  tests=['Na__Test__ProjectQr__.test.mjs (section 4 adapted)', 'Na__Test__ProjectQr__Decode__.py (re-run)'],
  src=['WP-S07a-05'],
  risk='Printed codes outlive the repository: the q/ location and key form are permanent once a Vale drawing is issued. Runs only after Adam chooses the resolver; until then the QR code stays off (DR-12 (A)).')

P('W5-06', 'W5', 'Vale site-plan data pipeline (only if DR-08 = A)',
  'Land a Vale project\'s site-plan export under WCP/Projects/{year}/{folder}/SitePlan__DrawingData__{Existing,Proposed}/ with TV\'s folder and manifest names, register SitePlan__DataStores in project.json from the Whitecardopedia project builder, and sync the folders to VaApps/Projects/{folderId}/; no worker change (static reads).',
  tv=[],
  vv=[FETCHPROJ, SYNC, BUILDBUCKET],
  hot=[FETCHPROJ, SYNC, BUILDBUCKET],
  deps=['W4-99'],
  gated=['DR-08', 'DR-06', 'DR-29'],
  size='XL', est=None, est_note='not estimated: spans the SketchUp Plugins repository (GLB Builder export, ValeVision Cloud Sync tag capture) and the Whitecardopedia pipeline, neither read beyond file names',
  split_justification='Kept whole and conditional: it runs only if Adam answers DR-08 with (A); size and split are settled when it is scheduled.',
  adapt=['Folder names SitePlan__DrawingData__{Existing,Proposed}/ and the project key SitePlan__DataStores kept from TV; the store accepts both manifest names (D-S04a-03, S04a-V04).',
         'First check that ValeVision Cloud Sync\'s tag capture does not turn site-plan tags into 3D scene-visibility categories (unverified, raw WP-S04a-11R).'],
  acc=['A Vale project exported from SketchUp draws a site plan on localhost (WCP server) and live (VaApps CDN); an Existing export can never overwrite the Proposed store (TV REQ-34 guard).',
       'No change to TV\'s NaProjectPortal data or worker; no site-plan tag appears as a 3D scene-visibility category in VV; the W0-07 sync fix is applied before the first upload.'],
  tests=[],
  src=['WP-S04a-11R'],
  risk='High and cross-repository; only worth doing under DR-08 (A).')

P('W5-99', 'W5', 'Parity Scribe pass for Wave 5',
  'S11 B10 procedure for W5: devlog entries and ledger rows for the toolbar, the convergence checks and whichever optional packages ran; DR-12/DR-08/DR-44 outcomes recorded.',
  vv=[DEVLOG, LEDGER],
  hot=[DEVLOG, LEDGER],
  deps=[],
  gated=['DR-35', 'DR-34'],
  size='S', est=250,
  acc=['Every W5 Port Record has its devlog entry; zero {{VVREL tokens; optional packages that did not run are recorded as "not run (DR-xx unanswered or declined)".'],
  src=[],
  risk='Single writer of the two documents.')

# ---------------------------------------------------------------- W6 ---------

P('W6-03', 'W6', 'Legacy retirements: 35 PageLayoutSystem, 91 2dElevationsView, the old three.js folder; 62 EmailWorkers only on request',
  'Retire the legacy drawing tools once nothing needs them (DR-03): remove 35__System__PageLayoutSystem with the legacy Create Drawing entry (ImageExport Controls :627, index.html :354), remove 91__System__2dElevationsView after re-homing or dropping the legacy ExportOverrides import (index.html :1376), retire 04__Lib__ThirdParty__Three/; move 62 -> 92 EmailWorkers only if Adam answers D-S01-08 (a) (untrack its node_modules first).',
  tv=[],
  vv=['VVM/35__System__PageLayoutSystem/ (retired)', 'VVM/91__System__2dElevationsView/ (retired)', 'VV/04__Lib__ThirdParty__Three/ (retired)',
      'VVM/62__Feature__EmailWorkers/ -> VVM/92__Feature__EmailWorkers/ (only if D-S01-08 (a))', IMGEXPCTL, IDX, CSSIDX, GITIGNORE],
  hot=[IMGEXPCTL, IDX, CSSIDX, GITIGNORE],
  deps=['W5-99'],
  gated=['DR-03'],
  size='M', est=400, est_note='deletions of 35 (9 source files + assets), 91 (4 files after FR-08 moved 2dProfileLines out), the old three.js folder (2 files); references edited by hand',
  adapt=['K2 FR-21, FR-23, FR-25 (and FR-22 only on request); the folder numbers 35 and 91 become burnt numbers in the registry (K2 rulebook), never reused.',
         'User-visible removal (the legacy Create Drawing page and Image Export\'s send-to-drawing tab): Adam confirms before this package starts.'],
  acc=['No file in VV references 35__System__PageLayoutSystem, 91__System__2dElevationsView or 04__Lib__ThirdParty__Three; G1, G2 and the K2 path gate (with the retired names added to --names) pass.',
       'Image Export still exports images; the Tools menu no longer offers the legacy Create Drawing page; the email form and its auth overlay still work (and, if moved, wrangler deploy succeeds from 92 with no node_modules tracked).'],
  tests=[],
  src=['WP-S01-09'],
  risk='Medium: it edits shared 3D-tab files (Image Export, index.html); the EmailWorkers deploy shortcut is a binary .lnk that cannot be edited as text.')

P('W6-01', 'W6', 'Test sweep: every TV test accounted for, the full VV suite green',
  'Run every ported test and verifier from the VV app root (node for mjs/cjs, python for py, browser harnesses on WCP Flask), re-run the VV-owned suites, and close the TV test inventory: each of TV\'s 102 test files is ported (named package), VV-owned, or excluded with a reason.',
  tv=['TV/80__Testing__PrototypeEnvironment/ (inventory of 102 files)'],
  vv=[TESTDIR + ' (no new files unless a gap is found)'],
  hot=[],
  deps=['W6-03'],
  gated=['DR-01'],
  size='S', est=150,
  adapt=['Excluded with reasons: Na__Test__DrawingProfileLines__.html (imports TV\'s 40 Na__DrawView__ProfileLines__, which VV never ports - DIV-1, K2 TargetMaps), Na__Test__IosTextureProbe__.html (an on-device WebGL probe for one TV iPad fault; no app module), Na__Verify__RubySyntax__.py (checks SketchUp plugin Ruby, outside the drawing system).',
         'VV-owned environment kept (VV versions differ by design): TestEnv__* sandbox and Flask files, Na__TestEnv__Styles__PrototypeSandbox__.css; VV-owned suites re-run: Na__Test__PerSceneLighting__, Na__Test__ScrapbookApi__, Na__Test__ScrapbookServer__.'],
  acc=['Every test in the K3 test-ownership table exits 0 from the VV app root; G1 to G5 pass on the final tree; the harness counts are recorded for the scribe.',
       'The TV test inventory closes with zero unaccounted files.'],
  tests=['all ported suites (re-run)', 'Na__Test__PerSceneLighting__.test.mjs (re-run)', 'Na__Test__ScrapbookApi__.test.py (re-run)', 'Na__Test__ScrapbookServer__.py (re-run)'],
  src=['WP-S02b-08', 'WP-S05a-09', 'WP-S05b-10'],
  risk='Low; failures here point back at a feature package that skipped its test.')

P('W6-02', 'W6', 'Shared service worker: precache refresh and the consolidated token request (DR-07)',
  'Collect the SHARED SERVICE WORKER notes from every Port Record, refresh the Whitecardopedia precache list for VV\'s new modules and lazily linked stylesheets (and drop the retired ones), and hand Adam one consolidated token bump with a log line naming the VV versions; Adam bumps at deploy.',
  tv=[],
  vv=[SWLOGIC],
  hot=[SWLOGIC],
  deps=['W6-03'],
  gated=['DR-07'],
  size='S', est=120,
  adapt=['Prepared, not bumped: the token change is Adam\'s at deploy (DR-07 default); models and thumbnails caches keep their own token (W0-08).'],
  acc=['Every VV module and stylesheet added by W0-W6 that the shell needs offline is in the precache list; no retired path remains in it; a dry-run install on localhost caches no 404.',
       'The request names the exact token line to change and the VV versions it covers.'],
  tests=[],
  src=[],
  risk='The shared worker also serves Whitecardopedia: one change, reviewed by Adam.')

P('W6-04', 'W6', 'Final Parity Scribe pass and close-out',
  'S11 B10 procedure for W6 plus the close-out: regenerate the drift table for every drawing-system file (identical, header-only, or declared seam), update the VV plan and README, record every DR answer used and every held item (DR-40 items 7-10 if still held, optional packages not run), and hand Adam the commit.',
  vv=[DEVLOG, LEDGER, VVPLAN, 'VV/ValeVision__README__.md'],
  hot=[DEVLOG, LEDGER, VVPLAN, 'VV/ValeVision__README__.md'],
  deps=[],
  gated=['DR-35', 'DR-34'],
  size='S', est=400,
  acc=['Every drawing-system file in VV is identical to TV HEAD b2aa9151, header-only, or carries a declared seam listed in the ledger (DIV-1, DIV-2, DIV-4, facade, lazy loader, Layout Mode, VV-only exports); zero {{VVREL tokens.',
       'The ledger records the TV HEAD the port was pinned to and any later TV release that needs a fresh pin.'],
  src=[],
  notes=['Last instance of the WP-S11-04 / WP-S12-17 procedure owned by W0-99.'],
  risk='Single writer of the two documents.')
