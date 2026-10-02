# =============================================================================
# K3 - canonical work-package catalogue: shared helpers and path constants
# =============================================================================
# Path notation used in every K3 record (exact, case-sensitive):
#   TVM/  = TrueVision3D app root /02__Src__AppModules
#   TV/   = TrueVision3D app root
#   NAAPPS/ = D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb/na-apps (TV local server)
#   NAWEB/  = D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb (TV git root: q/ resolver, .gitattributes)
#   VVM/  = ValeVision3D app root /02__Src__AppModules  (TARGET paths, after W0-02)
#   VV/   = ValeVision3D app root
#   WCP/  = D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia
#   VCB/  = D:/10_CoreLib__ValeCodebase (git root)
# A vv_targets entry ending in ' (new)' is created by that package.
# =============================================================================

CAT = []          # every canonical package, appended by the wave modules

def TVM(p): return 'TVM/' + p
def VVM(p): return 'VVM/' + p
def TLE(p): return 'TVM/51__System__LayoutEditor/' + p
def VLE(p): return 'VVM/51__System__LayoutEditor/' + p
def NEW(p): return p + ' (new)'

# ---- hot files (VV target paths) -------------------------------------------
IDX        = 'VV/index.html'
CSSIDX     = 'VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css'
FONTSCSS   = 'VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Fonts__.css'
OVERLAYCSS = 'VV/03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css'
LS         = VVM('01__AppCore/Na__AppFlow__LoadingSequence.js')
MAINCFG    = VVM('02__AppData/Na__AppConfig__Main.json')
HOTKEY3D   = VVM('02__AppData/Na__Hotkeys__3dModelTab__.json')
PLDR       = VVM('03__AppUtils/Na__AppUtils__ProjectLoader.js')
R2SAVE     = VVM('03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js')
R2ASSET    = VVM('03__AppUtils/Na__AppUtils__R2AssetUpload__.js')
R2NOTES    = VVM('03__AppUtils/Na__AppUtils__R2DrawingNotes__.js')
HKHANDLER  = VVM('03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js')
LOCALMIR   = VVM('03__AppUtils/Na__AppUtils__LocalProjectMirror__.js')
FACADE     = VVM('80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js')
INVALID    = VVM('05__RenderPipeline/Na__RenderLoop__Invalidation.js')
LWSETTINGS = VVM('05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js')
SUPERSAMP  = VVM('05__RenderPipeline/Na__RenderEffect__Supersampler__.js')
PROGREF    = VVM('05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js')
HELPPANEL  = VVM('10__NavigationAndCameras/Na__UiFeature__NavigationHelpPanel__Controls.js')
MULTIMODEL = VVM('15__ModelLoader/Na__ModelLoader__MultiModel.js')
MODAL      = VVM('21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js')
THUMB      = VVM('21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js')
DOORS      = VVM('25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js')
MODELTOG   = VVM('26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js')
TILED      = VVM('30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js')
IMGEXPCTL  = VVM('30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js')
XSECT      = VVM('41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js')
XSECTSD    = VVM('41__System__CrossSectionView/Na__CrossSectionView__SceneData.js')
XSECTDEV   = VVM('41__System__CrossSectionView/Na__UiFeature__CrossSectionView__DevControls.js')
PD         = VVM('40__System__DrawingViewCore/Na__DrawView__ProjectData__.js')
RPRESET    = VVM('40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js')
SADAPT     = VVM('40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js')
TRANSIT    = VVM('40__System__DrawingViewCore/Na__DrawView__Transitions__.js')
DRAWDEVCSS = VVM('40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css')
THUMBBAKE  = VVM('40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js')
FPMC       = VVM('42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js')
FPCFG      = VVM('42__System__FloorPlanViews/Na__FloorPlan__AppConfig__.json')
FPCSS      = VVM('42__System__FloorPlanViews/Na__FloorPlan__Styles__DevMenu__.css')
FPDATA     = VVM('42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js')
PATOOLBAR  = VVM('43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js')
EVMC       = VVM('45__System__ElevationViews/Na__Elevation__ModeController__.js')
EVCFG      = VVM('45__System__ElevationViews/Na__Elevation__AppConfig__.json')
EVCSS      = VVM('45__System__ElevationViews/Na__Elevation__Styles__DevMenu__.css')
EVDATA     = VVM('45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js')
EVROWB     = VVM('45__System__ElevationViews/Na__Elevation__DevMenu__RowBuilders__.js')
NORTHDATA  = VVM('46__System__NorthDirection/Na__North__ProjectJson__Data__.js')
PERSIST    = VVM('50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js')
PLCFGACC   = VVM('50__System__ProjectedLinework/Na__ProjectedLinework__ConfigAccess__.js')

LDR      = VLE('01__Core__Loader/Na__LayoutEditor__Loader__.js')
LDRSCR   = VLE('01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js')
BOOTCSS  = VLE('01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css')
AC       = VLE('03__Core__Config/Na__LayoutEditor__AppConfig__.json')
CS       = VLE('03__Core__Config/Na__LayoutEditor__ConfigState__.js')
CS_KM    = VLE('03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js')
CS_SS    = VLE('03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js')
CS_TS    = VLE('03__Core__Config/Na__LayoutEditor__ConfigState__ToolSetup__.js')
CS_ES    = VLE('03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js')
CS_RD    = VLE('03__Core__Config/Na__LayoutEditor__ConfigState__Readers__.js')
KEYS2D   = VLE('03__Core__Config/Na__Hotkeys__DrawingTabs__.json')
MC       = VLE('05__Core__ModeController/Na__LayoutEditor__ModeController__.js')
TABS     = VLE('05__Core__ModeController/Na__LayoutEditor__TabStrip__.js')
VEIL     = VLE('05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js')
ASSETS   = VLE('07__Core__SheetData/Na__LayoutEditor__Assets__.js')
AUTOSAVE = VLE('07__Core__SheetData/Na__LayoutEditor__AutoSave__.js')
DRAWCODE = VLE('07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js')
HIST     = VLE('07__Core__SheetData/Na__LayoutEditor__History__.js')
PROJREC  = VLE('07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js')
SCALEMGR = VLE('07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js')
SM       = VLE('07__Core__SheetData/Na__LayoutEditor__SheetModel__.js')
SM_SHEETS= VLE('07__Core__SheetData/Na__LayoutEditor__SheetModel__Sheets__.js')
SREC     = VLE('07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js')
CTL_PC   = VLE('10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js')
CTL_TOUCH= VLE('10__Core__SheetSurface/Na__LayoutEditor__Controls__TouchScreen__.js')
NAV      = VLE('10__Core__SheetSurface/Na__LayoutEditor__Navigation__.js')
CHROME   = VLE('10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js')
SURF     = VLE('10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js')
MAINCSS  = VLE('10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css')
PAPER    = VLE('10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css')
MB       = VLE('15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js')
SNAPR    = VLE('25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js')
COMPCFG  = VLE('25__System__RenderStyles/Na__LayoutEditor__RenderComposites__Config__.json')
SNAPPING = VLE('30__System__SheetTools/Na__LayoutEditor__Snapping__.js')
ST_STATE = VLE('30__System__SheetTools/Na__LayoutEditor__SheetTools__State__.js')
ST_TOOL  = VLE('30__System__SheetTools/Na__LayoutEditor__SheetTools__ToolState__.js')
ST_HIT   = VLE('30__System__SheetTools/Na__LayoutEditor__SheetTools__HitResolution__.js')
ST_PRESS = VLE('30__System__SheetTools/Na__LayoutEditor__SheetTools__PointerPress__.js')
ST_DRAG  = VLE('30__System__SheetTools/Na__LayoutEditor__SheetTools__PointerDrag__.js')
ST_KEY   = VLE('30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js')
ST_MAIN  = VLE('30__System__SheetTools/Na__LayoutEditor__SheetTools__.js')
ST_CTX   = VLE('30__System__SheetTools/Na__LayoutEditor__SheetTools__ContextMenu__.js')
TOOLBAR  = VLE('40__Ui__Panels/Na__LayoutEditor__Toolbar__.js')
PANELHOST= VLE('40__Ui__Panels/Na__LayoutEditor__PanelHost__.js')
PANELCSS = VLE('40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css')
P_VPSET  = VLE('40__Ui__Panels/Na__LayoutEditor__Panel__ViewportSettings__.js')
P_SHAPES = VLE('40__Ui__Panels/Na__LayoutEditor__Panel__Shapes__.js')
P_LAYERS = VLE('40__Ui__Panels/Na__LayoutEditor__Panel__Layers__.js')
P_SHEET  = VLE('40__Ui__Panels/Na__LayoutEditor__Panel__Sheet__.js')
SPECPDF  = VLE('50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js')
SPECBAR  = VLE('50__Feature__Specification/Na__LayoutEditor__SpecEditor__Bar__.js')
SPECCSS  = VLE('50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css')
MARGRIP  = VLE('50__Feature__Specification/Na__LayoutEditor__MarginGrip__.js')
PARAMPNL = VLE('57__Feature__ScrapbookParametric/Na__LayoutEditor__Panel__ScrapbookParametric__.js')
PARAMCFG = VLE('57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__Config__.json')
VPLINK   = VLE('57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ViewportLink__.js')
PDFX     = VLE('60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js')
PDFNAME  = VLE('60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js')
DEVMENU  = VLE('70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js')
WEBVIEW  = VLE('80__Feature__WebViewer/Na__LayoutEditor__WebViewer__.js')

TESTDIR  = 'VV/80__Testing__PrototypeEnvironment/'
VERIFY_MG= TESTDIR + 'Na__Verify__ModuleGraph__.mjs'
VERIFY_EX= TESTDIR + 'Na__Verify__Exports__.mjs'
T_TBCELLS= TESTDIR + 'Na__Test__TitleBlockCells__.test.mjs'
T_TBCHTML= TESTDIR + 'Na__Test__TitleBlockCells__.html'
T_SPECPDF= TESTDIR + 'Na__Test__SpecificationPdf__.html'

LEDGER   = 'VV/ValeVision__PARITY__TrueVisionLedger__.md'
DEVLOG   = 'VV/ValeVision__DEVLOG__.md'
VVPLAN   = 'VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md'
VENDIDX  = 'VV/04__Lib__ThirdParty__VersionLocked/Vale__Dependencies__ImportMap__Index__.json'
VENDRM   = 'VV/04__Lib__ThirdParty__VersionLocked/Vale__Dependencies__VersionLock__README__.md'

SERVER   = 'WCP/server.py'
WORKER   = 'WCP/CloudflareWorker/src/index.js'
WCORS    = 'WCP/CloudflareWorker/src/CloudflareHelper__Cors__.js'
SWLOGIC  = 'WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js'
SWREG    = 'WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Registrar__.js'
SYNC     = 'WCP/Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py'
AUDIT    = 'WCP/Tools__DevUtils/AutomationUtil__AuditAndBackfillR2__ProjectJsonAndImages__Main__.py'
R2COMMON = 'WCP/Tools__DevUtils/AutomationUtil__R2Common__Lib__.py'
GITIGNORE= 'VCB/.gitignore'
GITATTR  = 'VCB/.gitattributes'

TVDEVLOG = 'TV/TrueVision__DEVLOG__.md'
TVPLAN   = 'TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md'

# ---- standard gates every VV coding package runs (K2 section 12 + W0-04) ----
STANDARD_GATES = [
    'G1: node VV/80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs exits 0 (baseline 01-Oct-2026: 517 modules, 0 failures; the count only grows).',
    'G2: node VV/80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs exits 0 with a non-zero file count (it also checks modules nothing imports yet, so an inert landing must still link).',
    'G3: python parity/report/tools/k2_path_gate.py --root <VV app root> exits 0 (CSS @import, new URL(...), config path strings, retired folder names).',
    'G4 (from W0-04 on): node VV/80__Testing__PrototypeEnvironment/Na__Verify__ParityNaming__.mjs and Na__Verify__PortNotes__.mjs exit 0 (VALEVISION3D banners, FILE lines, no [TrueVision3D prefix, no TrueVision__ literal, no window.TrueVision__, no NaProjectPortal / 30__TrueVision__AppContent / /na-apps/30__TrueVision__CoreAppCode / noble-architecture.com/q/ or /s/, every PORT NOTE carries a Source version, no {{VVREL: token left after the scribe).',
    'G5: every ported or new TV test named in tests_to_port exits 0 under node (mjs/cjs) or python (py) from the VV app root; browser harnesses (.html) are run on the WCP Flask server.',
    'G6: VVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js is VV\'s own facade (W0-12): no VV file contains TV\'s transport (na-truevision-api, NaProjectPortal/, a TV R2 key builder) and no VV file was copied from TV 80__CloudflareIntegration. (This replaces the older slice acceptance line "No file under VVM imports 80__CloudflareIntegration", which predates K1 DR-27.)',
    'G7: the package returns a Port Record (S11 Appendix C) and never edits VV/ValeVision__PARITY__TrueVisionLedger__.md or VV/ValeVision__DEVLOG__.md; module DEVELOPMENT LOG lines carry {{VVREL:<wp_id>}} for the Parity Scribe to resolve.',
]

SWARM_RULES = [
    'R1 (DR-05): one owner per file per wave; a hot file is edited only as its hot_file_ownership rule says (integrator or the stated serial order).',
    'R2 (DR-05): leaves first, hubs last. A TV file is taken whole only once every module and name it imports exists in VV; until then it is not landed (no throwaway stubs) unless a package names an explicit, recorded seam.',
    'R3 (DR-05/K2 H5): a whole-file port takes TV HEAD b2aa9151 text verbatim and re-applies only the listed VV seams (banner token, console prefix, PORT NOTE, app-token literals, VV transport through the facade, VV-only exports). After W0-02 no folder-number seam exists for 40/42-46 and folder paths port unchanged.',
    'R4 (DR-34): a whole-file port takes TV\'s module version and DEVELOPMENT LOG; VV history moves to one PORT NOTE line. Hunk-replayed files keep VV\'s own sequence plus a Source version line.',
    'R5 (S11 B10): coding packages never edit the ledger or the VV devlog; the Parity Scribe pass of each wave allocates VV versions (step size per W0-01: Adam\'s devlog memory says patch bumps, DR-34 assumes v2.72.0 onwards), resolves {{VVREL:}} tokens, writes devlog entries and ledger rows.',
    'R6 (DR-07): no package edits or bumps the shared Whitecardopedia service worker except W0-08 and W6-02; every Port Record carries a SHARED SERVICE WORKER note (new modules, new exports, bump needed yes/no).',
    'R7 (DR-36): no package edits TrueVision except the WT lane, and only with Adam\'s per-package approval; VV never copies TV\'s known-broken variants over working VV ones (DR-37 item 4).',
    'R8 (DR-06/DR-28): no package writes new pictures, published files or statements under VaApps/Projects/{folderId}/ subfolders on R2 until Adam has applied the W0-07 sync fix; worker routes are proven under wrangler dev and deployed by Adam only.',
    'R9 (DR-43/K2 V2): NA-only content never ships in VV; features whose content is NA-only land switched off until Adam supplies Vale content.',
    'R10 (DR-01/DR-40): TV releases Adam has not confirmed are ported but named in the Port Record; the four gesture changes (DR-40 items 7-10) are held until Adam says yes (guard constants in W3-03, removed by W3-04).',
    'R11 (waves): a wave starts only after the previous wave\'s Parity Scribe pass (its xx-99 package) has finished; Adam commits once per wave (S11 B10 item 7).',
]


def P(wp_id, wave, title, goal, tv=None, vv=None, hot=None, deps=None, gated=None,
      size=None, est=None, est_note='', adapt=None, acc=None, tests=None, src=None,
      split=None, risk='', notes=None, split_justification=None, soft_after=None):
    CAT.append({
        'wp_id': wp_id, 'wave': wave, 'title': title, 'goal': goal,
        'tv_sources': tv or [], 'vv_targets': vv or [], 'hot_files': hot or [],
        'depends_on': deps or [], 'gated_by': gated or [], 'size': size,
        'est_lines': est, 'est_note': est_note,
        'vv_adaptations': adapt or [], 'acceptance': acc or [],
        'tests_to_port': tests or [], 'source_wp_ids': src or [],
        'split_from': split or [], 'risk': risk, 'notes': notes or [],
        'split_justification': split_justification,
        'soft_after': soft_after or [],
    })
