from k3_common import *

# =============================================================================
# WT - THE TRUEVISION LANE. Edits to TrueVision (the lead app), each only with
# Adam's per-package approval (DR-36 (b)); with DR-36 at its default (a) none of
# them runs and VV carries the seams. They sit outside the VV wave barrier:
# no VV package depends on a WT package (only soft "re-pin if landed" notes).
# Every WT package edits TV/TrueVision__DEVLOG__.md, so the lane is serial:
#   WT-01 -> WT-09 -> WT-02 -> WT-12 -> WT-03 -> WT-04 -> WT-05 -> WT-06 -> WT-07 -> WT-10 -> WT-11 -> WT-08
# Each returns a TV Port Record; the next VV Parity Scribe pass closes the VV
# ledger back-port rows it names. Re-read the TV devlog top before writing
# (parallel TV sessions bump it).
# =============================================================================

T44 = lambda f: TVM('44__System__PlanDimensions/' + f)
TVSW = TVM('62__Feature__AppInstallability/TrueVision__Pwa__ServiceWorker__Logic__.js')
TVIDX = 'TV/Index.html'
TVAC = TLE('03__Core__Config/Na__LayoutEditor__AppConfig__.json')
TVMC = TLE('05__Core__ModeController/Na__LayoutEditor__ModeController__.js')
TVTOAST = 'TV/03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css'
TVFPMC = TVM('42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js')
TVEVMC = TVM('45__System__ElevationViews/Na__Elevation__ModeController__.js')
TVFPED = TVM('42__System__FloorPlanViews/Na__FloorPlan__DevMenu__Editor__.js')
TVEVED = TVM('45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js')
TVSNAPR = TLE('25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js')
TVSCENET = TVM('21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js')
TVSADAPT = TVM('40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js')
TVMB = TLE('15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js')
TVVPSET = TLE('40__Ui__Panels/Na__LayoutEditor__Panel__ViewportSettings__.js')

def WT(wp_id, title, goal, tvt, hot, deps, gated, est, src=None, split=None, acc=None, risk='', notes=None,
       size=None, split_justification=None, soft_after=None, est_note=''):
    P(wp_id, 'WT', title, goal, tv=[], vv=[], hot=hot, deps=deps, gated=['DR-36'] + [g for g in gated if g != 'DR-36'],
      size=size, est=est, est_note=est_note, acc=acc, src=src, split=split, risk=risk, notes=notes,
      split_justification=split_justification, soft_after=soft_after)
    CAT[-1]['tv_targets'] = tvt
    CAT[-1]['lane'] = 'TrueVision (DR-36)'

WT('WT-01', 'TV PlanDimensions split and rewire (VV\'s split adopted by TV)',
   'Make TV 44 Data and Editor import from the split ConfigState and EditorPreview and drop their duplicated getters (back under 900 lines), load ConfigState so one loaded config serves the plan view and the LE MarkupBridge, and repoint every TV consumer as VV does.',
   tvt=[T44('Na__PlanDimensions__Data__.js'), T44('Na__PlanDimensions__Editor__.js'), T44('Na__PlanDimensions__EditorPreview__.js'), T44('Na__PlanDimensions__ConfigState__.js'),
        T44('Na__PlanDimensions__AxisLock__.js'), T44('Na__PlanDimensions__ClientMode__.js'), T44('Na__PlanDimensions__Crosshair__.js'), T44('Na__PlanDimensions__Disclaimer__.js'),
        T44('Na__PlanDimensions__History__.js'), T44('Na__PlanDimensions__Hotkeys__.js'), T44('Na__PlanDimensions__Overlay__.js'), T44('Na__PlanDimensions__VertexEditor__.js'),
        TVM('40__System__DrawingViewCore/Na__DrawView__MarkupMount__.js'), TVM('43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js'), TVFPED, TVFPMC, TVEVMC, TVDEVLOG],
   hot=[TVFPMC, TVEVMC, TVFPED, TVMB, TVDEVLOG],
   deps=['W0-01'], gated=['DR-42'], est=500, est_note='mostly deletions of duplicated getters plus one import specifier per consumer (lines cited in WP-S02b-10R)',
   size='XL', split_justification='19 TV files, but every consumer change is one import specifier, and the split must land atomically: removing the getters from Data before every consumer reads the loaded ConfigState would break TV.',
   acc=['TV Na__PlanDimensions__Data__.js no longer defines Na__PlDim__GetLineSetup and the other getters; exactly one module holds the loaded config; Data and Editor are each under 900 lines.',
        'TV LE MarkupBridge reads the configured (not fallback) dimension line and text settings; TV and VV 44 folders have zero normalised code diff apart from identity strings and folder numbers.',
        'TV Na__Verify__Exports__.mjs and Na__Verify__ModuleGraph__.mjs exit 0.'],
   src=['WP-S02b-10R', 'WP-S11-09'],
   risk='Edits the lead app and may race other TV sessions; re-read each file before writing. TV\'s service worker token may need a bump (TV\'s own worker).',
   notes=['DR-42 item (7). VV is unaffected: VV already has the split.'])

WT('WT-09', 'TV ConfigAccess token, TV record corrections, and the per-drawing Styles and Exclusions rows',
   'Make TV 50 ConfigAccess\'s fallback buildToken equal the JSON token (turns TV\'s StoreyBand check green) and fix the GetAnnotationSetup comment; correct the TV devlog and PORT NOTE claims WP-S02b-10R lists (v2.159.0 FlushJoins note, stale CpuBackend back-port line, unlogged ClipWorker/WorkerPool/AuthoredEdges/ConfigAccess/Shader/Supersampler changes, folder-50 markers); wire 40 StyleRows Styles and Exclusions rows into TV\'s floor-plan and elevation row builders following VV\'s pattern - or record that TV drops them (D-S11-10).',
   tvt=[TVM('50__System__ProjectedLinework/Na__ProjectedLinework__ConfigAccess__.js'), TVM('42__System__FloorPlanViews/Na__FloorPlan__DevMenu__RowBuilders__.js'),
        TVM('45__System__ElevationViews/Na__Elevation__DevMenu__RowBuilders__.js'), TVDEVLOG],
   hot=[TVDEVLOG],
   deps=['WT-01'], gated=['DR-42'], est=220,
   acc=['TV Na__Test__StoreyBand__ passes 53/53; a plan\'s and an elevation\'s Styles toggle and Exclusions field change the drawing in TV as they do in VV (or the TV devlog records that TV drops them and VV follows).',
        'The TV devlog gains one records note; no existing entry is altered.'],
   split=['WP-S02b-10R', 'WP-S11-09'],
   risk='Low; behaviour changes only where TV was silently wrong.')

WT('WT-02', 'TV SectionAdapter pass-throughs and the TD06 section-schema fix',
   'Give TV\'s SectionAdapter the same four calls as VV (Serialize/Apply, outline width, SetModelRoot, RenderDepthInto) as thin pass-throughs over 41, point TV SnapshotRenderer and 49 RenderLayer at the adapter (DR-42 item 1), and fix TD06 in TV\'s 41 Serialize and SceneData (positionMm sign and per-scene entry keys to VV\'s schema, DR-41 (A)).',
   tvt=[TVSADAPT, TVSNAPR, TVM('49__System__ElevationDepthFog/Na__ElevationDepthFog__RenderLayer__.js'), TVM('41__System__SectionCutEngine/Na__SectionCut__Serialize__.js'),
        TVM('41__System__SectionCutEngine/Na__SectionCut__SceneData__.js'), TVPLAN, TVDEVLOG],
   hot=[TVSNAPR, TVPLAN, TVDEVLOG],
   deps=['WT-09'], gated=['DR-41', 'DR-42'], est=220,
   acc=['Neither TV SnapshotRenderer nor 49 RenderLayer imports from 41; TV fog images are pixel-identical before and after; section save/restore around a 3D render and the outline width are unchanged.',
        'A section fixture written with VV\'s schema reads correctly in both apps (positionMm sign, per-scene keys); the S12-V01 census (5 of 155 VV files, 0 of 8 TV files carry section data) means the TV migration is expected to be empty - confirm it.',
        'TV Na__Verify__ModuleGraph__ and Na__Verify__Exports__ exit 0.'],
   src=[], split=['WP-S04a-15'],
   risk='Touches TV\'s fog layer; keep every adapter function a thin pass-through. VV is unchanged (W2-02 landed VV\'s adapter half; VV never ports TV\'s 41 Serialize/SceneData, DR-41).',
   notes=['DR-42 item (1) and DR-41 (A). Once landed, VV\'s SnapshotRenderer and 49 RenderLayer import lines become byte-identical to TV\'s (W2-12/W2-15 seams disappear at the next re-pin).'])

WT('WT-12', 'TV event wiring, dev-owned section keys and record fixes',
   'Make TV SceneTransition dispatch na-pm-scene-activated and ModelToggle dispatch na-model-visibility-changed; add CrossSection__SceneData to Na__DevSavedKeys, DEV_OWNED_PROJECT_DATA_KEYS and TRUEVISION_DEV_OWNED_KEYS (TV and the ProjectVision build); apply the ModuleGraph string false-positive fix; decide the orphan Na__PubDoc__Styles__Main__.css; refresh the stale DevGate/LoadingVeil PORT NOTEs and plan section 2.2 (DIV-4); delete the one-line placeholder Na__AppLoader__ProjectDataLoader__.js.',
   tvt=[TVSCENET, TVM('26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js'), TVM('01__AppCore/Na__AppFlow__LoadingSequence.js'),
        'TV/80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs', TVM('03__AppUtils/Na__AppUtils__DevGate__.js'), TLE('05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js'),
        TVM('01__AppCore/Na__AppLoader__ProjectDataLoader__.js') + ' (deleted)', 'NAAPPS/05__ProjectVision__CoreAppCode/CloudflareR2__ModelSync__Main__.py',
        'NAAPPS/05__ProjectVision__CoreAppCode/ProjectVision__BuildScript__.py', TVPLAN, TVDEVLOG],
   hot=[TVSCENET, TVPLAN, TVDEVLOG],
   deps=['WT-02'], gated=['DR-37', 'DR-42'], est=150,
   acc=['TV section bindings restore on scene change; TV model-layer toggles refresh linework and LE snapshot fingerprints; a ProjectVision build keeps CrossSection__SceneData.',
        'TV Na__Verify__ModuleGraph__ exits 0 with the false-positive fix; the TV devlog gains one entry.'],
   src=['WP-S09-14'],
   risk='Low, but it touches TV and ProjectVision scripts outside the VV swarm.',
   notes=['DR-37 item (4): TV event wiring and dev-owned key lists. VV keeps its working variants and never copies TV\'s broken ones.'])

WT('WT-03', 'TV Statement Writer preparation (all IO through Transport, branding into config, DEFINITIONS filter, CRLF-safe tokeniser)',
   'In TV: route every statement read and write through the Transport unit (picture store, file location and write exported; Publish, Publish__Images and Editor__Cards stop importing CfApi/LocalMirror); move branding strings and storage prefixes into config (Data STARTER, localStorage prefixes, Page title, Publish__Page generator, Header/Footer/Contents defaults); add a config filter on Registry DEFINITIONS; make Md__Tokenise CRLF-tolerant while byte-exact; add .gitattributes eol=lf for statement md/html/json; move the live-RB05 tests to a frozen fixture plus a CRLF twin; fix the stale Standard test (:249) and the key-map filename in NOTES section 14.',
   tvt=[TLE('52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Data__Transport__.js'), TLE('52__Feature__StatementWriter/07__Export__Publish/Na__LayoutEditor__Statement__Publish__.js'),
        TLE('52__Feature__StatementWriter/07__Export__Publish/Na__LayoutEditor__Statement__Publish__Images__.js'), TLE('52__Feature__StatementWriter/04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Cards__.js'),
        TLE('52__Feature__StatementWriter/02__Core__Markdown/Na__LayoutEditor__Statement__Md__Tokenise__.js'), TLE('52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Registry__.js'),
        TVAC, 'NAWEB/.gitattributes', 'TV/TrueVision__NOTES__StatementWriter__.md', 'TV/80__Testing__PrototypeEnvironment/ (statement tests and fixture)', TVDEVLOG],
   hot=[TVAC, 'NAWEB/.gitattributes', TVDEVLOG],
   deps=['WT-12'], gated=['DR-42', 'DR-37', 'DR-10'], est=600,
   acc=['All 7 TV statement node suites green on a frozen fixture and on its CRLF copy; no CfApi/LocalMirror import outside Na__LayoutEditor__Statement__Data__Transport__.js.',
        'No "Noble Architecture" or "TrueVision" runtime string left outside config files; TV Na__Verify__Exports__.mjs passes.'],
   src=['WP-S07b-02'],
   soft_after=[],
   risk='Touches TV\'s live, still-unconfirmed feature; best landed before W4-04 so VV ports the then-identical files verbatim (DR-42 priority (6)); if it lands later, VV re-pins (noted in W4-12).',
   notes=['DR-42 item (6); DR-37 item (1).'])

WT('WT-04', 'TV back-ports: entourage silhouettes, Add Viewport refresh, scrapbook folders and panel hygiene',
   'In TV: add TrueVision__SceneEntourageSilhouette to SnapshotRenderer CONTEXT_CATEGORIES; take VV v2.45.1\'s Add Viewport rebuild on every refresh (Panel__ViewportSettings :647) and the ModeController listeners on na-presentation-mode-scenes-loaded/-cleared; create the 02-05 scrapbook category folders with .gitkeep; sys.dont_write_bytecode in the two scrapbook Python tests; fix the AppConfig multi-select labels; log hygiene (ScrapbookCustom 1.0.1, ViewportLink\'s duplicate 1.3.0, Toolbar Floor Area/Vector entries, PanelHost slider-box entry, stale "Parity: verbatim" panel PORT NOTEs).',
   tvt=[TVSNAPR, TVVPSET, TVMC, TVAC, 'TV/51__LayoutEditor__UserScrapbookContent/ (02-05 .gitkeep)', 'TV/80__Testing__PrototypeEnvironment/Na__Test__ScrapbookApi__.test.py',
        'TV/80__Testing__PrototypeEnvironment/Na__Test__ScrapbookServer__.py', TLE('56__Feature__ScrapbookCustom/Na__LayoutEditor__ScrapbookCustom__.js'),
        TLE('57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ViewportLink__.js'), TLE('40__Ui__Panels/Na__LayoutEditor__Toolbar__.js'),
        TLE('40__Ui__Panels/Na__LayoutEditor__PanelHost__.js'), TVDEVLOG],
   hot=[TVSNAPR, TVMC, TVAC, TVDEVLOG],
   deps=['WT-03'], gated=['DR-42'], est=160,
   acc=['With Context Layer off TV no longer draws entourage silhouettes; a plan or scene added after a sheet opens appears in Add Viewport without a reload; adding or removing a scene card refreshes the open Viewport panel.',
        'Saving a Custom item into Dimensions succeeds in TV; selecting 3 text items reads "Editing 3 selected text items..."; running TV\'s scrapbook Python tests leaves the git tree clean.'],
   src=['WP-S04a-13R', 'WP-S06a-11'], split=['WP-S11-06'],
   risk='TV-side edits in files other TV sessions also edit; keep it one small TV release.',
   notes=['WP-S11-06 items (1) and (6) land here.'])

WT('WT-05', 'Confirm dialog to TrueVision',
   'Bring VV\'s styled confirm dialog into TV: the #naConfirmDialog markup (VV index.html 1322-1333) after #naToastNotification in TV Index.html (TV :798); the Confirm Dialog CSS region (VV DropdownAndToast 1375-1462, not VV\'s Navigation Mode Selector region 1464-1509) and the secondary-action rules (VV 383-402) into TV DropdownAndToast before TV :493; TV devlog entry; TV\'s own worker token bump.',
   tvt=[TVIDX, TVTOAST, TVSW, TVDEVLOG],
   hot=[TVIDX, TVTOAST, TVSW, TVDEVLOG],
   deps=['WT-04'], gated=['DR-44'], est=150,
   acc=['Deleting a sheet from TV\'s Dev section, deleting a specification note and the register\'s destructive actions show the styled modal (light secondary Cancel, red destructive Confirm) identical to VV\'s; Escape and the backdrop cancel; window.confirm is never reached.',
        'No .na-navmode__btn rules arrive in TV; TV Na__Verify__Exports__.mjs passes; the modal\'s z 9999 sits above TV\'s register and statement pages.'],
   src=['WP-S10-07R'], split=['WP-S11-06'],
   risk='Low; TV-side. The VV ledger "Async confirm dialog" row is re-closed by the next VV scribe pass from this package\'s Port Record.',
   notes=['WP-S11-06 item (3) lands here.'])

WT('WT-06', 'TV back-ports: ThumbnailBake, pose-preserving mode changes, Ground Floor quick action',
   'In TV: add VV\'s Na__DrawView__ThumbnailBake__ to 40__System__DrawingViewCore with the plan/elevation dev editors\' bake queueing and Bake Missing Thumbnails; pose-preserving mode release and entry (Switcher ReleaseToOrbit/EnterModeAtPose, walk/fly SyncFromCamera, SceneTransition arrival rules); the Ground Floor Plan quick action in TV\'s floor-plan editor, or a record that StoreyLevel supersedes it.',
   tvt=[TVM('40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js') + ' (new)', TVFPED, TVEVED, TVM('10__NavigationAndCameras/Na__NavigationModes__Switcher.js'),
        TVM('10__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js'), TVM('10__NavigationAndCameras/Na__Navmode__FlyMode__SystemLogic.js'), TVSCENET, TVSW, TVDEVLOG],
   hot=[TVFPED, TVEVED, TVSCENET, TVSW, TVDEVLOG],
   deps=['WT-05'], gated=['DR-42'], est=650, est_note='VV ThumbnailBake is 433 lines; the rest are hunks',
   acc=['Seeded TV drawing cards show baked pictures; Bake Missing Thumbnails fills the gaps; a TV walk/fly scene arrives at its saved pose without entry nudges.',
        'Each TV PORT NOTE names the VV source version; TV\'s worker token bumped (TV Logic :682) for the new module.'],
   src=['WP-S11-06'],
   risk='Edits the lead app; approval per item.')

WT('WT-07', 'Toast offset and 3D canvas clearance aligned (TV takes VV\'s values)',
   'Set TV\'s toast offset to VV\'s 96 px and back-port VV\'s canvas and safe-frame clearance rules to TV (DR-44); VV unchanged.',
   tvt=[TVTOAST, 'TV/03__Style__AppStylesheets/Na__CoreUi__Styles__RenderCanvas__.css', 'TV/03__Style__AppStylesheets/Na__ImageExport__Styles__ViewportOverlays__.css', TVSW, TVDEVLOG],
   hot=[TVTOAST, TVSW, TVDEVLOG],
   deps=['WT-06'], gated=['DR-44'], est=60,
   acc=['The Save Sheets toast sits at the same height in both apps on a drawing tab and in the web viewer; with sheets in the project the 3D view and the image-export safe frame start at the same place in both apps.'],
   src=['WP-S10-10'],
   risk='Low; 3D tab.')

WT('WT-10', 'Offer to TV: DrawingCode leaf and an app-neutral parametric panel (DR-42 items 4 and 5)',
   'Offer TV the two refactors that make VV\'s SheetRecords and Parametric Scrapbook panel byte-identical: adopt VV\'s DrawingCode leaf (tab-code string rules) grown with pure DefaultNumber and ComposeDocumentId so both SheetRecords import one leaf; split a per-app Na__LayoutEditor__ScrapbookParametric__Types__.js out of the 1,346-line panel.',
   tvt=[TLE('07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js') + ' (new in TV)', TLE('07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js'),
        TLE('57__Feature__ScrapbookParametric/Na__LayoutEditor__Panel__ScrapbookParametric__.js'), TLE('57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__Types__.js') + ' (new)', TVDEVLOG],
   hot=[TVDEVLOG],
   deps=['WT-07'], gated=['DR-42', 'DR-11'], est=700,
   acc=['TV SheetRecords imports the DrawingCode leaf and its numbering tests still pass; the parametric panel reads its element types from the Types unit; TV Na__Verify__Exports__ and ModuleGraph pass.',
        'VV follow-up recorded for the scribe: re-port SheetRecords and the parametric panel verbatim and drop the matching seams.'],
   src=[],
   risk='Optional (DR-42 default: none happen). Derived by K3 from DR-42; no raw package carries it.')

WT('WT-11', 'Offer to TV: small app-neutrality changes (DR-42 items 2, 3, 8, 9, 10, 11)',
   'Offer TV the remaining seam-removing changes: one storage-folder helper in ProjectLoader (2); spellings root key, model category prefix and API path read from config (3, the non-statement part); the site-plan config gate for the Drawing Type row (8); the title-block logo stand-in text in config (9); the neutral window.Na__Pwa__HasUnsavedWork flag published by AutoSave (10); the LayoutEditor__Statement__Enabled switch (11).',
   tvt=[TVM('03__AppUtils/Na__AppUtils__ProjectLoader.js'), TVAC, TLE('40__Ui__Panels/Na__LayoutEditor__Panel__Sheet__.js'), TLE('07__Core__SheetData/Na__LayoutEditor__AutoSave__.js'),
        TVM('62__Feature__AppInstallability/TrueVision__Pwa__ServiceWorker__Registrar__.js'), TVMC, TVDEVLOG],
   hot=[TVAC, TVMC, TVDEVLOG],
   deps=['WT-10'], gated=['DR-42', 'DR-07', 'DR-08', 'DR-10', 'DR-43'], est=300,
   acc=['Each item lands as its own approved TV release with a TV devlog entry; TV behaviour unchanged with default config; TV Na__Verify__Exports__ and ModuleGraph pass.',
        'VV follow-up recorded for the scribe: the matching VV seams (ProjectLoader helper, config reads, Drawing Type gate, logo text key, unsaved-work flag, Statement switch) become verbatim.'],
   src=[],
   risk='Optional; each item needs its own approval (DR-36 (b) is per package). Derived by K3 from DR-42.')

WT('WT-08', 'TrueVision record hygiene and the TV halves of the VV scribe packages',
   'In TV, comment-only unless stated: update plan section 12 rows C, N, U, Y, AI, AJ, AK, AM, AP and add the Release Watermark pointer row; section 4.1 folder map; correct the stale PORT NOTE back-port fields (LoadingVeil, ForceRender, SpecPdf, SpecEditor__Notes, PdfFilename, ViewportClipboard, Styles__Surfaces) and the four "ValeVision has no web viewer" notes; add one devlog records note. Plus the TV halves queued by the VV scribe passes: the three Selection-block Measure labels into Labels (S03a-10), PORT NOTE blocks for ModelSource/GlbParse/Store and module-log entries (S04a-12), the register PDF yellow-as-amber fix (Register__Pdf :644, DR-37 item 2), PORT NOTE blocks for Register__DeleteDialog and the 15 SheetImages files and the AutoSave log entry (S07a-08), TV plan/NOTES corrections (S03b-12, S06b-13, S07b-10, S08-13), the back-port memo items (S02a-13, S05b-11), and - only if Adam confirms it is a defect - hatch : d.hatchOn ? d.hatch : null in the four drawing tools (DR-37 item 3).',
   tvt=[TVPLAN, TVDEVLOG, TLE('05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js'), TLE('20__System__Viewports/Na__LayoutEditor__ForceRender__.js'),
        TLE('50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js'), TLE('50__Feature__Specification/Na__LayoutEditor__SpecEditor__Notes__.js'),
        TLE('60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js'), TLE('20__System__Viewports/Na__LayoutEditor__ViewportClipboard__.js'),
        TLE('10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css'), TLE('80__Feature__WebViewer/Na__LayoutEditor__WebViewer__.js'),
        TLE('51__Feature__DrawingRegister/Na__LayoutEditor__Register__Pdf__.js'), TVAC, 'TV/TrueVision__PLAN__SheetImages__.md', 'TV/TrueVision__NOTES__StatementWriter__.md'],
   hot=[TVPLAN, TVDEVLOG, TVAC],
   deps=['WT-11', 'W4-99'], gated=['DR-37', 'DR-35'], est=300,
   size='L', split_justification='Comment-only edits across many TV files (git diff -w shows comments only), plus two one-line fixes; serialised behind every other TV package because it closes their records.',
   acc=['git diff -w of TV source files shows comment lines only, apart from the Labels move, the yellow-as-amber line and (if confirmed) the four hatch lines; TV plan section 12 has no row contradicted by the VV ledger.',
        'The TV register PDF boxes a yellow note in amber; the TV Measure labels resolve from config (no fallback hit); the TV devlog gains one records note and no existing entry is altered.'],
   src=['WP-S11-07'],
   split=['WP-S02a-13', 'WP-S03a-10', 'WP-S03b-12', 'WP-S04a-12', 'WP-S05b-11', 'WP-S06b-13', 'WP-S07a-08', 'WP-S07b-10', 'WP-S08-13'],
   soft_after=['W6-04'],
   risk='Comment-only in the lead app; may race other TV sessions editing the same headers. Waits for W4-99 so the TV notes queued by W1-99..W4-99 exist; notes queued later by W5-99/W6-04 go into a follow-up of this package.')
