"""W1-99 Parity Scribe - the Wave 1 pass over ValeVision__PARITY__TrueVisionLedger__.md (ValeVision3D v2.71.2).

Appends within the structure W0-06 established (and W0-99 first filled); never touches the Archive (section 9) or rewrites
a history row:
  1.4  the Wave 1 service-worker line
  2.1  a dated note (49 created; the app-root hatch library)      2.3  a dated note (nine LE subfolders created)
  3    a dated note on the refreshed "Blocked by"; the rows Wave 1 changed (new state, old kept as [was: ...]); the
       TrueVision-only rows that landed now name their ValeVision path; "Blocked by" refreshed from the end-of-Wave-1
       port-order map; new 3.8 (Wave 1 by package) with the audit's WP-S03a-10 / WP-S03b-12 records items
  4    a dated intro bullet and count line; class flips (4 PORTED, 36 PARTIAL); dated notes on every row Wave 1 carried
  5.1  a dated note                                               6    a dated note on the loader row; Wave 1's offers
  7    the TrueVision-side items Wave 1 and the two audit packages queue for WT-08
  8.1  a dated note on the facade's new callers
Pure CRLF and ASCII, as the file is. The Archive (from '## 9.' to the end) is proven byte-identical.

Usage: python -B update_ledger_w1.py --build | --apply | --restore
"""
import collections, hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'W0-99'))
sys.path.insert(0, HERE)
import ledger_lib as L                                   # noqa: E402  (W0-99's read-only helpers)
import blocked_by_w1 as BB                               # noqa: E402
import importers as IMP                                  # noqa: E402

CAND = os.path.join(HERE, 'ledger__candidate.md')
PRE = os.path.join(HERE, 'preimage_records', 'ValeVision__PARITY__TrueVisionLedger__.md')
EXPECT = '3db558ae4fd707065b6355d3413b780fcdddec06'     # W0-99's final SHA-1 (its Port Record)
REL = 'v2.71.2'
ARCHIVE_HEAD = '## 9. Archive - the ledger as it stood before 01-Oct-2026'


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def was(new, old):
    old = old.strip()
    return new if old in ('', '-') else '%s [was: %s]' % (new, old)


def app(old, add):
    old = old.strip()
    return add if old in ('', '-') else '%s; %s' % (old, add)


def note(text):
    return '**[02-Oct-2026 note (W1-99): %s]**' % text


R = lambda new: (lambda old: was(new, old))
A = lambda add: (lambda old: app(old, add))
SET = lambda new: (lambda old: new)
LOADED = lambda rel: (lambda old: was(IMP.loaded_by(rel), old))


def SRC(ver, rel, date, how):
    return R('%s (TrueVision3D %s, %s; read at b2aa9151) - %s' % (ver, rel, date, how))


def landed(rel, src, parity, seams, nothing_yet=None, transport=None, loaded=None, open_tv=None):
    """A TrueVision-only row (3.5) whose file Wave 1 landed at TrueVision's path."""
    spec = {
        0: SET('`%s`' % rel),
        1: SET('same path'),
        2: R(src),
        4: R(parity),
        5: A(seams),
        6: R(open_tv or 'none (taken whole at b2aa9151)'),
    }
    if loaded:
        spec[7] = R(loaded)
    else:
        lb = IMP.loaded_by(rel)
        if lb == '-':
            spec[7] = R('- (nothing imports it yet%s)' % (('; ' + nothing_yet) if nothing_yet else ''))
        else:
            spec[7] = R(lb + ((' - ' + nothing_yet) if nothing_yet else ''))
    if transport:
        spec[8] = R(transport)
    return spec


V = 'v2.71.2'
FLIPS = {
    # ---------------- W1-01 ----------------
    '01__AppCore/Na__AppFlow__LoadingSequence.js': {
        4: A("W1-01 (v2.71.2): TrueVision v2.82.0's overlay bracket replayed - BeginFrame after the drawing branch, "
             "EndFrame in the tick's finally; VV module 1.7.2"),
        5: A('BeginFrame is skipped while the Video Studio preview plays (DR-32, ValeVision-only); no catch round '
             'RenderFrame yet (W2-07)'),
        6: A("after W1-01: TrueVision's design-phase start-up is not taken (DR-09 (a): the library lands uninitialised); "
             'the engine-hold stand-down, the thrown-frame catch and ArmNextFrame wait for W2-07'),
    },
    '05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js': landed(
        '05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js',
        '1.0.0 (TrueVision3D v2.82.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-01)',
        'verbatim - landed W1-01, v2.71.2', 'W1-01: banner and PORT NOTE only'),
    '05__RenderPipeline/Na__RenderLoop__Invalidation.js': {
        2: R("no module version in TrueVision; IsPaused as it has stood since TrueVision3D v2.24.0 (11-Sep-2026, commit "
             "aa580db3; read at b2aa9151) - one hunk (W1-01)"),
        4: R("adapted - TrueVision's name Na__RenderLoop__IsPaused over a ValeVision body (K2 X3) (W1-01, v2.71.2); "
             "VV module 1.1.1"),
        5: R("IsPaused mirrors ValeVision's hold reasons, updated before Pause and Resume dispatch; ValeVision's "
             "na-pause/resume-render-loop events kept (K2 E2); its PORT NOTE carries '- Legacy :' (TrueVision's file "
             "has no module version)"),
        6: R("none for IsPaused; TrueVision's engine-hold stand-down is W2-07's"),
    },
    '26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js': landed(
        '26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js',
        '1.0.0 (TrueVision3D v2.32.0, 13-Sep-2026; read at b2aa9151) - taken whole (W1-01)',
        'verbatim - landed W1-01, v2.71.2; never initialised (DR-09 (a): every drawing reads the live model)',
        'W1-01: banner, console prefix and PORT NOTE', 'ModelSource whole, W2-16'),
    '26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js': {
        2: R("no module version in TrueVision; SetCategoryVisibleByKey since TrueVision3D v2.25.0 (commit f8321d60), "
             "BorrowRegistry, RestoreRegistry and the new-map rebuild since v2.32.0 (read at b2aa9151) - hunks (W1-01)"),
        4: R("diverged (both copies descend from the 10-Feb-2026 original) - TrueVision's three names over ValeVision "
             "bodies (K2 X3) (W1-01, v2.71.2); VV module 1.2.3"),
        5: R("the ValeVision-only na-model-visibility-changed dispatch kept (K2 E3); SetCategoryVisibleByKey is exact-key "
             "and silent; borrowed entries carry no dev button; its PORT NOTE carries '- Legacy :'"),
        6: R("TrueVision's GetVisibilityState, ApplyVisibilityState, SetAllCategoriesVisible, its token-matcher "
             "SetCategoryVisibility, the SubmenuWired guard and its display names not taken (listed in the PORT NOTE)"),
    },
    # ---------------- W1-02 ----------------
    '25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js': {
        2: R("1.9.0 (TrueVision3D v2.42.0, 14-Sep-2026; read at b2aa9151), which carries 1.8.0 (v2.10.0) - taken whole "
             "(W1-02)"),
        4: R("adapted - TrueVision 1.9.0 taken whole, ValeVision's Video Studio seams re-applied (W1-02, v2.71.2); door "
             "clicks are left-button only (TrueVision 1.8.0)"),
        5: R("NAMESPACE ValeVision3D; the Video Studio clock kept from ValeVision's 1.7.1 (SpeedScale, SetSpeedScale, "
             "GetSpeedScale, GetBaseDurationMs, SettleClosed, SnapAllClosed and their exports; K2 X2)"),
        6: R('none (TV 1.9.0 taken whole at b2aa9151)'),
    },
    '25__System__3dObject__InteractionSystem/Na__DoorAnimation__FindDoorGroups.js': landed(
        '25__System__3dObject__InteractionSystem/Na__DoorAnimation__FindDoorGroups.js',
        '1.1.0 (TrueVision3D v2.3.6, 06-Jun-2026; read at b2aa9151) - taken whole (W1-02)',
        'verbatim - landed W1-02, v2.71.2', 'W1-02: banner and PORT NOTE only',
        "DoorPose imports it with W2-06"),
    # ---------------- W1-03 ----------------
    '02__AppData/Na__AppConfig__Main.json': {
        4: A("W1-03 (v2.71.2): TrueVision's models.RenderConfig__Linework.RenderConfig__Linework__OrthoDepthBiasMm = 2 "
             "(v2.38.1)"),
    },
    '05__RenderPipeline/Na__RenderEffect__Supersampler__.js': {
        2: R("1.0.0 as TrueVision3D v2.103.0 left it (21-Sep-2026; read at b2aa9151) - the present-pass clamp (W1-03)"),
        4: R("verbatim (code) - the present-pass clamp min(rgb, a) taken (W1-03, v2.71.2); VV module 1.1.1"),
        5: R("ValeVision's own header text (ValeVision authored present(target, scale), which TrueVision took at "
             "v2.56.0 and never logged)"),
        6: R('none (the code equals TrueVision 1.0.0 at b2aa9151)'),
    },
    '15__ModelLoader/Na__ModelLoader__MultiModel.js': {
        2: R('1.4.0 (TrueVision3D v2.64.1, 18-Sep-2026; read at b2aa9151) - hunks, 1.3.0 now among them (W1-03)'),
        4: R("diverged (hunk replay; two independent lines since 10-Feb-2026) - TrueVision 1.3.0's ortho depth bias taken "
             "(W1-03, v2.71.2); VV module 1.3.1"),
        5: R("the bias reads RenderConfig__Linework__OrthoDepthBiasMm (2 mm when absent); TrueVision's LineworkColours__ "
             "split and InstanceConsolidation not taken (3D-tab concerns)"),
        6: R("none for the drawing system (1.3.0's bias taken; 1.3.1-1.4.0 were already here)"),
    },
    # ---------------- W1-04 ----------------
    '40__System__DrawingViewCore/Na__DrawView__Transitions__.js': {
        2: R('1.1.0 (TrueVision3D v2.112.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-04)'),
        4: R('verbatim - TrueVision 1.1.0 taken whole (W1-04, v2.71.2)'),
        5: R("banner and console prefix; ReturnToOrbit is TrueVision's body, proven equal to ValeVision's SetOrbitMode "
             "exit (W1-04, section 1)"),
        6: R("none (TV 1.1.0 taken whole at b2aa9151); the old '21-Sep 1.1.0 [2.110.0]' named the wrong release: 1.1.0 "
             "shipped in v2.112.0"),
    },
    '42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js': {
        2: R('1.1.0 (TrueVision3D v2.18.0, 07-Sep-2026; still 1.1.0 at HEAD b2aa9151)'),
        4: A('W1-04 (v2.71.2): TakeViewport asks SuspendThreeD({ returnToOrbit : true }) (a ValeVision-only hunk; '
             'module 1.2.3)'),
    },
    '45__System__ElevationViews/Na__Elevation__ModeController__.js': {
        2: R("1.0.0 (TrueVision3D v2.18.0, 07-Sep-2026); TrueVision's file is at 1.1.0 (v2.94.0, the depth-fog source, "
             "W2-03)"),
        4: A('W1-04 (v2.71.2): TakeViewport asks SuspendThreeD({ returnToOrbit : true }) (a ValeVision-only hunk; '
             'module 1.1.2)'),
    },
    # ---------------- W1-05 ----------------
    '40__System__DrawingViewCore/Na__DrawView__ProjectData__.js': {
        2: R('1.6.0 (TrueVision3D v2.146.0, 22-Sep-2026; read at b2aa9151) - taken whole (W1-05)'),
        4: R("adapted - TrueVision 1.6.0 taken whole over the ValeVision facade (W1-05); the ValeVision-only document "
             "code added (W1-12); v2.71.2"),
        5: R("the Layout Mode switch (DR-25; LAYOUT_MODE_KEY and two ValeVision-only exports); R2 judging behind "
             "Na__DrawData__R2_JUDGING = false (DR-30); the block description without the cloud-sync sentence; "
             "Na__DrawData__GetDocumentCode in its own ValeVision-only region (DR-11)"),
        6: R('none (TV 1.6.0 taken whole at b2aa9151)'),
        8: R('VV facade: Na__CfApi__IsConfigured, MergeAndSaveKeys, GetLoadedProjectData; Na__LocalMirror__MergeKeys, '
             'DrawingsFingerprint (W1-05, W1-12; DIV-4, no code seam)'),
    },
    '46__System__NorthDirection/Na__North__ProjectJson__Data__.js': {
        2: R('1.0.0 (TrueVision3D v2.80.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-05)'),
        4: R('verbatim - TrueVision 1.0.0 taken whole (W1-05, v2.71.2): Save passes the save report on'),
        5: R("banner; PORT NOTE (TrueVision's DESCRIPTION kept: its dev-owned key lists are ProjectData__EditorOwnedKeys "
             "here)"),
        6: R('none (TV 1.0.0 taken whole at b2aa9151)'),
    },
    '41__System__CrossSectionView/Na__CrossSectionView__SceneData.js': {
        4: A("W1-05 (v2.71.2): registers its project block through ProjectData's RegisterSectionBlockProvider "
             "(TrueVision's call site) in place of ProjectData's hard import; module 1.2.0"),
        10: SET('W1-05, W2-02, W2-05'),
    },
    '03__AppUtils/Na__AppUtils__LocalProjectMirror__.js': {
        7: LOADED('03__AppUtils/Na__AppUtils__LocalProjectMirror__.js'),
    },
    '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js': {
        7: LOADED('80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js'),
    },
    # ---------------- W1-06 ----------------
    '21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js': {
        2: R('1.2.0 (TrueVision3D v2.146.0, 22-Sep-2026; read at b2aa9151) - taken whole (W1-06)'),
        4: R('verbatim - TrueVision 1.2.0 taken whole (W1-06, v2.71.2)'),
        5: R("banner; a PORT NOTE (TrueVision's file has none)"),
        6: R('none (TV 1.2.0 taken whole at b2aa9151)'),
    },
    '40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js': landed(
        '40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js',
        '1.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-06)',
        'verbatim - landed W1-06, v2.71.2; inert', 'W1-06: banner and PORT NOTE only',
        "the 2.x Dev menus import it with W2-04 and W2-05"),
    '40__System__DrawingViewCore/Na__DrawView__DraftGuard__.js': landed(
        '40__System__DrawingViewCore/Na__DrawView__DraftGuard__.js',
        '1.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-06)',
        'verbatim - landed W1-06, v2.71.2; inert', 'W1-06: banner, console prefix and PORT NOTE',
        "the 2.x Dev menus import it with W2-04 and W2-05"),
    '40__System__DrawingViewCore/Na__DrawView__DraftMaths__.js': landed(
        '40__System__DrawingViewCore/Na__DrawView__DraftMaths__.js',
        '1.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-06)',
        'verbatim - landed W1-06, v2.71.2; inert', 'W1-06: banner and PORT NOTE only', 'inert with its importer'),
    '40__System__DrawingViewCore/Na__DrawView__DrawingUsage__.js': landed(
        '40__System__DrawingViewCore/Na__DrawView__DrawingUsage__.js',
        '1.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-06)',
        'verbatim - landed W1-06, v2.71.2; inert', 'W1-06: banner and PORT NOTE only', 'inert with its importer'),
    '40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js': {
        2: R('1.1.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-06)'),
        4: R("adapted - authored in ValeVision first, ported back whole from TrueVision 1.1.0 (W1-06, v2.71.2)"),
        5: R("the re-stamp through the Layout Editor loader (Na__LeLoad__PrepareRestamp before anything is written, "
             "then RestampForScene; C.4 S23, DR-24) in place of TrueVision's lazy Viewport3d import; 41 "
             "CrossSectionView SceneData for RenameSceneKey (DIV-2)"),
        6: R('none (TV 1.1.0 taken whole at b2aa9151)'),
    },
    '40__System__DrawingViewCore/Na__DrawView__RowAccordion__.js': {
        2: R("no version of its own - the file as TrueVision3D v2.86.0 left it (20-Sep-2026; read at b2aa9151) - taken "
             "whole (W1-06)"),
        4: R("verbatim (app-name tokens) - authored in ValeVision first (v2.21.14), ported back whole from TrueVision "
             "v2.86.0 (W1-06, v2.71.2)"),
        5: R("banner and console prefix; TrueVision's two 'TrueVision only' comments kept verbatim and explained in the "
             "PORT NOTE"),
        6: R('none (taken whole at b2aa9151)'),
    },
    '40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css': {
        2: R("no version of its own - the sheet as TrueVision3D v2.86.0 left it (20-Sep-2026; read at b2aa9151) - taken "
             "whole (W1-06)"),
        4: R("verbatim (rules) - authored in ValeVision first, ported back whole from TrueVision v2.86.0 (W1-06, "
             "v2.71.2)"),
        5: R("REGION banner; the Folded Drawing Row comment names this folder's real number, 40"),
        6: R('none (taken whole at b2aa9151)'),
    },
    # ---------------- W1-08 ----------------
    '42__System__FloorPlanViews/Na__FloorPlan__AppConfig__.json': {
        4: R("adapted (additive) - TrueVision's FloorPlanViews__StoreyLevels__Config block and its six storey labels at "
             "TrueVision's places (W1-08, v2.71.2)"),
        5: R("ValeVision's description and its ten own labels kept (D33 styles, exclusions, thumbnails)"),
    },
    '42__System__FloorPlanViews/Na__FloorPlan__ConfigState__.js': {
        2: R('1.1.0 (TrueVision3D v2.87.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-08)'),
        4: R('verbatim - TrueVision 1.1.0 taken whole (W1-08, v2.71.2)'),
        5: R('banner and console prefix'),
        6: R('none (TV 1.1.0 taken whole at b2aa9151)'),
    },
    '42__System__FloorPlanViews/Na__FloorPlan__DevMenu__StoreyRow__.js': landed(
        '42__System__FloorPlanViews/Na__FloorPlan__DevMenu__StoreyRow__.js',
        '1.0.0 (TrueVision3D v2.87.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-08)',
        'verbatim - landed W1-08, v2.71.2; not mounted', 'W1-08: banner and PORT NOTE only',
        "TrueVision's 2.0.0 row builders mount it with W2-04"),
    '42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js': {
        2: R('1.1.0 (TrueVision3D v2.87.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-08)'),
        4: R('adapted - TrueVision 1.1.0 taken whole, three ValeVision seams re-applied (W1-08, v2.71.2)'),
        5: R("the FloorPlan__Dimensions default; SetExcludeTokens trims and drops empty tokens; Na__FpData__STYLE_KEYS "
             "exported (K2 X2)"),
        6: R('none (TV 1.1.0 taken whole at b2aa9151)'),
    },
    '42__System__FloorPlanViews/Na__FloorPlan__StoreyLevel__.js': landed(
        '42__System__FloorPlanViews/Na__FloorPlan__StoreyLevel__.js',
        '1.0.0 (TrueVision3D v2.87.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-08)',
        'verbatim - landed W1-08, v2.71.2', 'W1-08: banner and PORT NOTE only'),
    '42__System__FloorPlanViews/Na__FloorPlan__Styles__DevMenu__.css': {
        2: R("no version of its own - TrueVision3D v2.87.0's sheet (20-Sep-2026, commit bef15277; read at b2aa9151) - "
             "taken whole (W1-08)"),
        4: R("adapted - TrueVision's sheet whole with ValeVision's Style Toggles region kept (D33, DR-32) (W1-08, "
             "v2.71.2)"),
        5: R("REGION banner; a PORT NOTE with '- Legacy :' (no module version); ValeVision's Style Toggles region after "
             "TrueVision's last"),
        6: R('none (taken whole at b2aa9151)'),
    },
    # ---------------- W1-09 ----------------
    '49__System__ElevationDepthFog/Na__ElevationDepthFog__AppConfig__.json': landed(
        '49__System__ElevationDepthFog/Na__ElevationDepthFog__AppConfig__.json',
        'TrueVision3D v2.94.0 (20-Sep-2026; read at b2aa9151) - byte for byte (W1-09)',
        'verbatim, byte for byte - landed W1-09, v2.71.2; inert', 'W1-09: none (JSON carries no header)',
        loaded="named by `Na__ElevationDepthFog__ConfigState__.js` (its Load is first called with W2-03)",
        open_tv='none (byte for byte at b2aa9151)'),
    '49__System__ElevationDepthFog/Na__ElevationDepthFog__ConfigState__.js': landed(
        '49__System__ElevationDepthFog/Na__ElevationDepthFog__ConfigState__.js',
        '1.0.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-09)',
        'verbatim - landed W1-09, v2.71.2', 'W1-09: banner, console prefix and PORT NOTE'),
    '49__System__ElevationDepthFog/Na__ElevationDepthFog__Maths__.js': landed(
        '49__System__ElevationDepthFog/Na__ElevationDepthFog__Maths__.js',
        '1.0.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-09)',
        'verbatim - landed W1-09, v2.71.2', 'W1-09: banner and PORT NOTE only'),
    '49__System__ElevationDepthFog/Na__ElevationDepthFog__RecordData__.js': landed(
        '49__System__ElevationDepthFog/Na__ElevationDepthFog__RecordData__.js',
        '1.0.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-09)',
        'verbatim - landed W1-09, v2.71.2', 'W1-09: banner and PORT NOTE only'),
    '49__System__ElevationDepthFog/Na__ElevationDepthFog__Shader__.js': landed(
        '49__System__ElevationDepthFog/Na__ElevationDepthFog__Shader__.js',
        "1.0.0 as TrueVision3D v2.103.0 left it (20-Sep-2026 / 21-Sep-2026; read at b2aa9151) - taken whole (W1-09)",
        'verbatim (GLSL byte-identical) - landed W1-09, v2.71.2; inert',
        "W1-09: banner and PORT NOTE; one log line for v2.103.0, which TrueVision's header does not record",
        "the render layer imports it with W2-03"),
    # ---------------- W1-10 ----------------
    '45__System__ElevationViews/Na__Elevation__AppConfig__.json': {
        4: R("adapted (label union) - TrueVision's twelve labels at TrueVision's places (W1-10, v2.71.2)"),
        5: R("ValeVision-only keys kept (21 labels and the section target group, D28); six description values stay "
             "ValeVision's (TrueVision's ElevationViews__Description names its own project file; the Plane, Gizmo, "
             "SceneGroup, FacePick and Grip notes describe ValeVision's live tools)"),
    },
    '45__System__ElevationViews/Na__Elevation__AutoNameText__.js': landed(
        '45__System__ElevationViews/Na__Elevation__AutoNameText__.js',
        '1.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-10)',
        'verbatim - landed W1-10, v2.71.2', 'W1-10: banner and PORT NOTE only',
        'inert until W2-05; Na__Test__DrawingDrafts__ loads it'),
    '45__System__ElevationViews/Na__Elevation__AutoName__.js': landed(
        '45__System__ElevationViews/Na__Elevation__AutoName__.js',
        '1.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-10)',
        'verbatim - landed W1-10, v2.71.2; inert', 'W1-10: banner and PORT NOTE only',
        "the Elevations Dev menu 2.1.0 calls it with W2-05"),
    '45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js': {
        2: R('1.1.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-10)'),
        4: R("adapted - TrueVision 1.1.0 taken whole (W1-10, v2.71.2); module 1.1.1 -> 1.1.0 (DR-34 (a)); every "
             "elevation now carries its Elevation__DepthFog block, off"),
        5: R("a ValeVision Only region: F_SEEDED_FROM, SEEDED_VALUES, SetAzimuthDeg and SetSeededFrom (retire with "
             "W2-05, Q-AZIMUTH (b)); STYLE_KEYS exported (D33); Elevation__SeededFrom preserved, no longer written "
             "by the normaliser (DR-32); exclusion tokens stored as typed (W2-05 decides the trim)"),
        6: R('none (TV 1.1.0 taken whole at b2aa9151)'),
    },
    '45__System__ElevationViews/Na__Elevation__Styles__DevMenu__.css': {
        2: R("no version of its own - TrueVision3D v2.86.0's sheet (20-Sep-2026, commit bef15277; read at b2aa9151) - "
             "taken whole (W1-10)"),
        4: R("adapted - TrueVision's sheet whole (the identity region) with ValeVision's Compass Preset Strip kept "
             "until W2-05 (W1-10, v2.71.2)"),
        5: R("REGION banner; a PORT NOTE with '- Legacy :'; the Compass Preset Strip region and its narrow-panel rule "
             "(ValeVision's 1.x Elevations Dev menu)"),
        6: R('none (taken whole at b2aa9151)'),
    },
    # ---------------- W1-11 ----------------
    '46__System__NorthDirection/Na__North__AppConfig__.json': {
        4: R("verbatim - byte-identical to TrueVision's at b2aa9151 (W1-11, v2.71.2): ShownByDefault and the three "
             "Show Compass labels added"),
    },
    '46__System__NorthDirection/Na__North__CompassGizmo__.js': {
        2: R('1.1.0 (TrueVision3D v2.84.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-11)'),
        4: R('verbatim - TrueVision 1.1.0 taken whole after the overlay registry (W1-01) (W1-11, v2.71.2)'),
        5: R("banner; the Video Studio preview guard lives in LoadingSequence (DR-32), not here"),
        6: R('none (TV 1.1.0 taken whole at b2aa9151)'),
    },
    '46__System__NorthDirection/Na__North__DevMenu__Editor__.js': {
        2: R('1.1.0 (TrueVision3D v2.84.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-11)'),
        4: R('verbatim - TrueVision 1.1.0 taken whole (W1-11, v2.71.2): Show Compass'),
        5: R("banner; ValeVision v2.67.0's mode-changed and snapshot-queue listeners retired (DR-32): the overlay "
             "registry keeps the compass out of every render but the live 3D frame"),
        6: R('none (TV 1.1.0 taken whole at b2aa9151)'),
    },
    # ---------------- W1-12 ----------------
    '51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js': {
        2: R("1.1.0 (TrueVision3D v2.88.0, 20-Sep-2026; read at b2aa9151) - its interface; the body is ValeVision's "
             "(W1-12)"),
        4: A("W1-12 (v2.71.2): Fetch reads clientDrawingName and siteAddress at the project root through the facade "
             "(the dormant S12-F24 read of the presentation block fixed); header re-synced; module 1.0.1"),
        8: R('VV facade: Na__CfApi__GetLoadedProjectData (W1-12)'),
    },
    # ---------------- W1-13 ----------------
    '51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js': {
        2: R('1.2.1 (TrueVision3D v2.140.0, 22-Sep-2026; read at b2aa9151) - taken whole (W1-13)'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.2.1 (W1-13, v2.71.2); the "
             "site plan list inert (DR-08 (B))"),
        5: R("banner and PORT NOTE; the stale 1.0.0 header over 1.2.0 code is gone (S03b-12)"),
        6: R("none (TV 1.2.1 taken whole at b2aa9151); 1:200 in ValeVision's list is configuration, W1-22 (DR-17)"),
    },
    '51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js': landed(
        '51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js',
        '1.0.0 (TrueVision3D v2.147.0, 22-Sep-2026; read at b2aa9151) - taken whole (W1-13)',
        'verbatim - landed W1-13, v2.71.2; inert', 'W1-13: banner and PORT NOTE only',
        'SheetRecords 1.39.0 imports it with W1-19'),
    '51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__NoteRegions__.js': landed(
        '51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__NoteRegions__.js',
        '1.0.0 (TrueVision3D v2.143.0, 22-Sep-2026; read at b2aa9151) - taken whole (W1-13)',
        'verbatim - landed W1-13, v2.71.2; inert', 'W1-13: banner and PORT NOTE only',
        'SheetRecords 1.39.0 imports it with W1-19'),
    '51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__DimensionRounding__.js': landed(
        '51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__DimensionRounding__.js',
        '1.0.0 (TrueVision3D v2.139.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-13)',
        'verbatim - landed W1-13, v2.71.2; inert', 'W1-13: banner and PORT NOTE only',
        'its callers land with W1-28, W2-26 and W3-12'),
    '51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__MeasureParse__.js': {
        2: R('1.1.0 (TrueVision3D v2.119.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-13)'),
        4: R("verbatim - TrueVision 1.1.0 taken whole (W1-13, v2.71.2); Array lands with no caller (Ctrl-drag copy "
             "stays held, DR-40 item 8)"),
        6: R('none (TV 1.1.0 taken whole at b2aa9151)'),
    },
    '51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__PaintOrder__.js': landed(
        '51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__PaintOrder__.js',
        '1.0.0 (TrueVision3D v2.106.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-13)',
        "verbatim - landed W1-13, v2.71.2; inert", "W1-13: banner and a PORT NOTE (TrueVision's file has none)",
        'its consumers land with W1-28'),
    '51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__ShapeRings__.js': landed(
        '51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__ShapeRings__.js',
        '1.1.0 (TrueVision3D v2.160.0, 23-Sep-2026; 1.0.0 in v2.150.0; read at b2aa9151) - taken whole (W1-13)',
        'verbatim - landed W1-13, v2.71.2', 'W1-13: banner and PORT NOTE only'),
    '51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js': landed(
        '51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js',
        '1.0.0 (TrueVision3D v2.89.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-13)',
        'verbatim - landed W1-13, v2.71.2; dormant (DR-08 (B))', 'W1-13: banner, console prefix and PORT NOTE',
        'the site plan wiring lands with W2-14 and W2-16'),
    '51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__Config__.json': landed(
        '51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__Config__.json',
        'Meta 1.0.0 (TrueVision3D v2.89.0, 20-Sep-2026; read at b2aa9151) - byte for byte (W1-13)',
        'verbatim, byte for byte - landed W1-13, v2.71.2; dormant (DR-08 (B))', 'W1-13: none (JSON carries no header)',
        loaded='named by `Na__LayoutEditor__SitePlanComposites__.js` (dormant)',
        open_tv='none (byte for byte at b2aa9151)'),
    '51__System__LayoutEditor/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Numbering__.js': landed(
        '51__System__LayoutEditor/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Numbering__.js',
        "1.0.1 (TrueVision3D v2.69.0, 19-Sep-2026, the first release that names it; commit b6baf301; read at b2aa9151) - "
        "taken whole (W1-13)",
        'verbatim - landed W1-13, v2.71.2; inert (LE/51 created)', 'W1-13: banner and PORT NOTE only',
        "the sheet model's renumber imports it with W1-21"),
    # ---------------- W1-14 ----------------
    '51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__VectorQuality__.js': landed(
        '51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__VectorQuality__.js',
        '1.0.0 (TrueVision3D v2.136.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-14)',
        'verbatim - landed W1-14, v2.71.2; unwired', 'W1-14: banner and PORT NOTE only',
        'SheetSurface, the toolbar and the Paper CSS wire it with W1-28 and W5-01'),
    '51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js': landed(
        '51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js',
        '1.0.0 (TrueVision3D v2.138.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-14)',
        'verbatim - landed W1-14, v2.71.2; inert', 'W1-14: banner and PORT NOTE only',
        'the hub takes and W3-06 import it'),
    '51__System__LayoutEditor/26__System__DraftMode/Na__LayoutEditor__DraftMode__State__.js': landed(
        '51__System__LayoutEditor/26__System__DraftMode/Na__LayoutEditor__DraftMode__State__.js',
        '1.0.0 (TrueVision3D v2.107.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-14)',
        'verbatim - landed W1-14, v2.71.2; inert (LE/26 created)', 'W1-14: banner and PORT NOTE only',
        'its controller lands with W2-18'),
    '51__System__LayoutEditor/27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__State__.js': landed(
        '51__System__LayoutEditor/27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__State__.js',
        '1.0.0 (TrueVision3D v2.114.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-14)',
        'verbatim - landed W1-14, v2.71.2; inert (LE/27 created)', 'W1-14: banner and PORT NOTE only',
        'its controller lands with W2-18'),
    '51__System__LayoutEditor/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js': landed(
        '51__System__LayoutEditor/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js',
        '1.0.0 (TrueVision3D v2.113.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-14)',
        'verbatim - landed W1-14, v2.71.2; inert (LE/32 created)', 'W1-14: banner and PORT NOTE only',
        'its controller lands with W2-18'),
    '51__System__LayoutEditor/37__System__VectorTools/Na__LayoutEditor__VectorTools__Curves__.js': landed(
        '51__System__LayoutEditor/37__System__VectorTools/Na__LayoutEditor__VectorTools__Curves__.js',
        '1.0.0 (TrueVision3D v2.130.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-14)',
        'verbatim - landed W1-14, v2.71.2; inert (LE/37 created)', 'W1-14: banner and PORT NOTE only',
        'the vector tools and object snap import it with W2-27, W2-28 and W2-42'),
    # ---------------- W1-15 ----------------
    '51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json': landed(
        '51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json',
        'as TrueVision3D v2.120.0 left it (21-Sep-2026; read at b2aa9151) (W1-15)',
        'adapted - landed W1-15, v2.71.2: ProjectQr__Enabled false, no Link BaseUrl or IndexUrl (DR-12 (A), DR-43)',
        'W1-15: the notes rewritten for ValeVision; ProjectQr__PortedFrom (the JSON PORT NOTE)',
        loaded='named by `Na__ProjectQr__Symbol__.js` (switched off; nothing imports the QR system yet)',
        open_tv='none (read at b2aa9151)'),
    '51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Encoder__.js': landed(
        '51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Encoder__.js',
        '1.0.0 (TrueVision3D v2.81.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-15)',
        'verbatim - landed W1-15, v2.71.2; switched off (LE/53 created)',
        "W1-15: banner, console prefix and PORT NOTE; DESCRIPTION's example address dropped (K2 V2)",
        'inert with the QR system'),
    '51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Painter__.js': landed(
        '51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Painter__.js',
        '1.0.0 (TrueVision3D v2.81.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-15)',
        'verbatim - landed W1-15, v2.71.2; switched off', 'W1-15: banner and PORT NOTE only',
        'the title-block QR cell imports it with W1-26'),
    '51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__ProjectLink__.js': landed(
        '51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__ProjectLink__.js',
        '1.1.0 (TrueVision3D v2.81.0, 20-Sep-2026; moved by v2.155.0; read at b2aa9151) - taken whole (W1-15)',
        "adapted - landed W1-15, v2.71.2: ValeVision's identity (the master-index folder and year; the code a "
        "permanent qrKey that no entry has yet)",
        "W1-15: BuildUrl and CurrentUrl TrueVision's line for line; never the ?project= token",
        'switched off',
        "ProjectLoader identity only: Na__AppUtils__InitMasterIndex, GetProjectFolderFromUrl, GetYearFromUrl (W1-15)"),
    '51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Symbol__.js': landed(
        '51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Symbol__.js',
        '1.2.0 (TrueVision3D v2.120.0, 21-Sep-2026; moved by v2.155.0; read at b2aa9151) - taken whole (W1-15)',
        'adapted - landed W1-15, v2.71.2: fails closed (IsEnabled needs the config read and Enabled true)',
        "W1-15: no Noble Architecture address; the fallbacks stay empty for good", 'switched off'),
    '51__System__LayoutEditor/53__Feature__ProjectQrCode/README__ProjectQrCode__.md': landed(
        '51__System__LayoutEditor/53__Feature__ProjectQrCode/README__ProjectQrCode__.md',
        'TrueVision3D v2.81.0 to v2.155.0 (read at b2aa9151) - rewritten (W1-15)',
        'rewritten for ValeVision - landed W1-15, v2.71.2',
        "W1-15: switched off three times over; the Vale address budget; TrueVision's call shapes and proofs kept",
        loaded='- (documentation)', open_tv='none (read at b2aa9151)'),
    # ---------------- W1-16 ----------------
    '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Config__.json': landed(
        '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Config__.json',
        'Meta 1.1.0 (TrueVision3D v2.121.0, 21-Sep-2026; read at b2aa9151) (W1-16)',
        "adapted - landed W1-16, v2.71.2: Sources__PagesBaseUrl is ValeVision's Pages base; Meta__Folders for "
        "ValeVision's storage",
        'W1-16: Meta__PortedFrom (the JSON PORT NOTE); the bronze frame kept (DR-13 (a))',
        loaded='named by `Na__LayoutEditor__SheetImages__Setup__.js` (inert)', open_tv='none (read at b2aa9151)'),
    '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Encode__.js': landed(
        '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Encode__.js',
        '1.1.0 (TrueVision3D v2.121.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-16)',
        'verbatim - landed W1-16, v2.71.2; inert (LE/54 created)', 'W1-16: banner and PORT NOTE only',
        'the editing set imports it with W3-02'),
    '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Geometry__.js': landed(
        '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Geometry__.js',
        '1.1.0 (TrueVision3D v2.121.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-16)',
        'verbatim - landed W1-16, v2.71.2; inert', 'W1-16: banner and PORT NOTE only',
        'SheetRecords 1.39.0 imports it with W1-19'),
    '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Paint__.js': landed(
        '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Paint__.js',
        '1.0.0 (TrueVision3D v2.116.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-16)',
        'verbatim - landed W1-16, v2.71.2; inert', 'W1-16: banner and PORT NOTE only',
        'ShapeGeometry 1.9.0 imports it with W1-26'),
    '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Painter__.js': landed(
        '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Painter__.js',
        '1.0.0 (TrueVision3D v2.116.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-16)',
        'verbatim - landed W1-16, v2.71.2; inert', 'W1-16: banner, console prefix and PORT NOTE',
        'SheetChrome 1.14.0 imports it with W1-26'),
    '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Pdf__.js': landed(
        '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Pdf__.js',
        '1.0.0 (TrueVision3D v2.116.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-16)',
        'verbatim - landed W1-16, v2.71.2; inert', 'W1-16: banner, console prefix and PORT NOTE',
        'PdfExporter 1.12.0 imports it with W3-16'),
    '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Setup__.js': landed(
        '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Setup__.js',
        '1.1.0 (TrueVision3D v2.121.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-16)',
        "adapted - landed W1-16, v2.71.2: the Pages-base fallback is ValeVision's (no Noble Architecture address)",
        'W1-16: banner, console prefix and PORT NOTE', "the mode controller's Ready waits on it with W3-09"),
    '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Source__.js': landed(
        '51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Source__.js',
        '1.0.0 (TrueVision3D v2.116.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-16)',
        "verbatim - landed W1-16, v2.71.2; inert; its two imports resolve to ValeVision's own modules at "
        "TrueVision's paths",
        'W1-16: banner, console prefix and PORT NOTE', 'the feature core imports it with W3-02',
        'VV facade: Na__CfApi__SheetImageLocation; Na__AppUtils__IsRunningOnLocalhost (W1-16; DIV-4, no code seam)'),
    # ---------------- W1-17 ----------------
    '51__System__LayoutEditor/36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js': landed(
        '51__System__LayoutEditor/36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js',
        '1.5.0 (TrueVision3D v2.164.0, 29-Sep-2026; read at b2aa9151) - taken whole (W1-17)',
        "verbatim - landed W1-17, v2.71.2; inert (LE/36 created); the library at the app root "
        "(52__LayoutEditor__HatchPatternLibrary/, 22 JSON files)",
        "W1-17: banner, five console prefixes and a PORT NOTE (TrueVision's file has none); its stylesheet waits for "
        "W2-29",
        'SheetRecords, SheetChrome and the Patterns panel import it with W1-19, W1-26 and W2-29'),
    # ---------------- W1-18 ----------------
    '51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__GradientTool__.js': {
        2: R('1.1.0 (TrueVision3D v2.150.0, 22-Sep-2026; read at b2aa9151) - taken whole (W1-18)'),
        4: R('verbatim - TrueVision 1.1.0 taken whole (W1-18, v2.71.2)'),
        5: R("banner and console prefix; DrawPdf's holes argument has no caller until SheetChrome 1.14.0 (W1-26)"),
        6: R('none (TV 1.1.0 taken whole at b2aa9151)'),
    },
    '51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__LineStyleTool__.js': {
        2: R('1.1.0 (TrueVision3D v2.152.0, 23-Sep-2026; read at b2aa9151) - taken whole (W1-18)'),
        4: R('verbatim - TrueVision 1.1.0 taken whole (W1-18, v2.71.2)'),
        5: R("banner and console prefix; the optional prefix and dashed labels have no caller until Panel__Dimensions "
             "1.7.0 (W3-12)"),
        6: R('none (TV 1.1.0 taken whole at b2aa9151)'),
    },
    # ---------------- W1-23 ----------------
    '51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js': {
        2: R('1.13.0 (TrueVision3D v2.161.0, 28-Sep-2026; read at b2aa9151) - signature hunks only (W1-23)'),
        4: A("W1-23 (v2.71.2): Render2d and Render3d take TrueVision's positional signatures (modelSourceId, "
             "stillWanted, depthFog / viewWindow); GetModelRoot and both fingerprints take an optional modelSourceId, "
             "ignored (the live model, DR-09); a depthFog request answers null until W2-15; module 1.7.1"),
    },
    '51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__.js': {
        2: R("1.16.0 (TrueVision3D v2.164.0, 29-Sep-2026; read at b2aa9151) - call-shape hunks (W1-23)"),
        4: A("W1-23 (v2.71.2): Fill, ForceRender and RenderForExport hand the Model Source where TrueVision's do; "
             "module 1.8.1"),
    },
    '51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js': {
        2: R("1.4.0 (TrueVision3D v2.140.0, 22-Sep-2026; read at b2aa9151) - call-shape hunks (W1-23)"),
        4: A("W1-23 (v2.71.2): the underlay render takes TrueVision's Render2d call (phase id, stillWanted); module "
             "1.1.1"),
    },
    '51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Linework__.js': {
        2: R("1.2.0 (TrueVision3D v2.95.0, 20-Sep-2026; read at b2aa9151) - call-shape hunks (W1-23)"),
        4: A("W1-23 (v2.71.2): EnsureLinework(definition, onPhase, force, modelSource, waited); module 1.1.1"),
    },
    '51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Window__.js': {
        2: R("1.2.0 (TrueVision3D v2.140.0, 22-Sep-2026; read at b2aa9151) - Describe's hunk (W1-23)"),
        4: A("W1-23 (v2.71.2): Describe returns a live-model Model Source, never null (S04a verifier); module 1.0.1"),
    },
    '51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport3d__.js': {
        2: R("1.8.1 (TrueVision3D v2.161.0, 28-Sep-2026; read at b2aa9151) - the render call's hunk (W1-23)"),
        4: A("W1-23 (v2.71.2): RenderNow passes TrueVision's Render3d shape (renderId null: the live model); module "
             "1.6.2"),
    },
    # ---------------- W1-23 / W1-24 ----------------
    '51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js': {
        2: R('1.12.0 (TrueVision3D v2.160.0, 23-Sep-2026; read at b2aa9151) - hunks (W1-23, W1-24)'),
        4: R("adapted (hunk replay) - TrueVision's EnsureLinework call (W1-23); FAST picture packing (1.11.0), the "
             "strict and pictureCompression options, the awaited save, LoadLibrary split and exported (W1-24); VV "
             "module 1.2.2 (v2.71.2)"),
        5: A('EnsureJsPdf without the Open Sans wait until PdfFonts (W1-25)'),
        6: R("1.2.0, 1.4.0's Open Sans half, 1.6.0-1.10.0 and the rest of 1.12.0 (W1-25, W1-28, W3-06, W3-09, W3-11, "
             "W3-16)"),
    },
    # ---------------- W1-29 / W1-30 ----------------
    '03__AppUtils/Na__AppUtils__KeyScope__.js': landed(
        '03__AppUtils/Na__AppUtils__KeyScope__.js',
        '1.1.0 (TrueVision3D v2.115.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-29)',
        'verbatim - landed W1-29, v2.71.2',
        "W1-29: the header names ValeVision's 3D handler where TrueVision names its Manager (DR-33)"),
    '03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js': {
        4: A("W1-29 (v2.71.2): TrueVision Manager 2.1.0's key-scope guard and typing test replayed; a binding with no "
             "callback is skipped before preventDefault (a ValeVision seam); module 1.0.2"),
    },
    '51__System__LayoutEditor/31__System__DocumentKeys/Na__Hotkeys__DocumentTabs__.json': landed(
        '51__System__LayoutEditor/31__System__DocumentKeys/Na__Hotkeys__DocumentTabs__.json',
        'Meta 1.1.0 (TrueVision3D v2.115.0, 21-Sep-2026; read at b2aa9151) - byte for byte (W1-30)',
        'verbatim, byte for byte - landed W1-30, v2.71.2', 'W1-30: none (JSON carries no header)',
        loaded='named by `Na__LayoutEditor__DocumentKeys__.js`', open_tv='none (byte for byte at b2aa9151)'),
    '51__System__LayoutEditor/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js': landed(
        '51__System__LayoutEditor/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js',
        '1.1.0 (TrueVision3D v2.115.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-30)',
        'verbatim - landed W1-30, v2.71.2 (LE/31 created); wired by the mode controller (W1-32)',
        'W1-30: banner, console prefix and PORT NOTE'),
    # ---------------- W1-31 / W1-33 / W1-34 (the loader) ----------------
    '51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js': {
        4: A("W1-31, W1-33, W1-34 (v2.71.2): TrueVision's entry points and view names mirrored (VIEW_REGISTER, "
             "VIEW_STATEMENT, Ready, HasFeature, IsSitePlanSheet, OpenRegister and OpenStatements, refusing until "
             "W4-10 and W4-13) with the registration pattern in its header; the body class at the press and the "
             "no-wait hand-over to the first-open veil (W1-33); its header for TabStrip 2.0.0 (W1-34); module 1.1.3; "
             "its PORT NOTE's Back-port line now says what this row says"),
        5: R("ValeVision-only facade: TrueVision's names answered the same before and after the editor loads; two "
             "CheckNames rows for the view names (W1-33); the site-plan row waits for W1-21"),
    },
    '51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js': {
        4: A("W1-31, W1-33 (v2.71.2): TrueVision's headline 'Your Drawings Are Loading', the boot veil's look "
             "(na-le-veil--boot) and Na__LeLoadScreen__IsShown (Q-COVER part 2); module 1.0.2"),
    },
    '51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css': {
        4: A("W1-33, W1-34 (v2.71.2): the Shell Hiding region moved in from Styles__Main (plus the ValeVision-only "
             ".na-vs-tl selector), the boot veil's rules, and TrueVision's Tab Strip region byte for byte (UiParity "
             "check 2 passes)"),
    },
    # ---------------- W1-32 / W1-33 / W1-34 / W1-35 (hubs and config) ----------------
    '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json': {
        4: A("W1-32, W1-34, W1-35 (v2.71.2): the FocusNote reworded without its Floor Areas, Patterns and site plan "
             "clauses; the four tab-strip labels and the MarginNotes description took TrueVision's values; "
             "MarginToggle and MarginToggleTitle deleted (TrueVision has neither); the gate took the seven stale rows "
             "off the parity test's allow-list (72 seams)"),
        5: R("72 seams: brand 17, decision 12, identity 11, NA path 3, TrueVision defect 3, ValeVision-only 6, withheld "
             "20 (each with its owner in the test's allow-list)"),
    },
    '51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js': {
        2: R('1.1.0 (TrueVision3D v2.83.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-33)'),
        4: R('adapted - TrueVision 1.1.0 taken whole with two ValeVision seams (W1-33, v2.71.2): both veils'),
        5: R("Na__LeVeil__DrawingSettled exported (ValeVision-only, for WaitForFirstDrawing); FirstOpen's immediate "
             "option (Q-COVER part 2, R6 F.8 C22); banner and console prefix"),
        6: R('none (TV 1.1.0 taken whole at b2aa9151)'),
    },
    '51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js': {
        2: R('1.32.0 (TrueVision3D v2.166.0, 29-Sep-2026; read at b2aa9151) - hunks only (W1-32, W1-33, W1-34)'),
        4: R("adapted (hunk replay; never whole before W5-03) - the KeyScope reader and Follow, DocumentKeys Ready and "
             "Initialize, the view names, EnterUnder and Quiet, FOLD_GROUP, PreloadMetrics' promise, the refusing "
             "OpenRegister and OpenStatements (W1-32); the first-open veil at TrueVision's call site (W1-33); "
             "OpenSpecification through EnterUnder (W1-34); VV module 1.18.3 (v2.71.2)"),
        5: A("the loader INTEGRATION; Layout Mode (DR-25); the scene-broadcast listeners; the Snapping shim until "
             "W2-19; the immediate first-open seam (Q-COVER); refusing OpenRegister and OpenStatements bodies"),
        6: R("the feature hunks of 1.21.0-1.32.0 stay with their packages (W1-36 keys and paging; W2-16, W2-19, W2-29, "
             "W2-31, W2-35, W3-05, W3-07, W3-09, W3-10, W3-11, W4-09, W4-10, W4-13)"),
    },
    '51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js': {
        2: R('2.0.0 (TrueVision3D v2.158.0, 23-Sep-2026; read at b2aa9151) - taken whole (W1-34)'),
        4: R('adapted - authored in ValeVision first, ported back whole from TrueVision 2.0.0 (W1-34, v2.71.2)'),
        5: R("one import, from the loader (28 facade names); the Register and Statements tabs only while HasFeature "
             "(DR-38 (a)); Layout Mode visibility (DR-25); New sheet awaited; a state-event render; the drawing rows "
             "carry ValeVision's drag-to-reorder until W4-10"),
        6: R('none (TV 2.0.0 taken whole at b2aa9151)'),
    },
    '51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css': {
        4: A("W1-33 (v2.71.2): the 3D-furniture hiding block moved to Styles__Boot, a start-up sheet (a pointer comment "
             "in its place)"),
    },
    '51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js': {
        2: R("hunks up to TrueVision's Toolbar 1.12.0 (v2.70.0), then 1.17.0 (named in no release entry) and 1.19.0 "
             "(TrueVision3D v2.124.0, 21-Sep-2026); TrueVision's file is 1.24.0 (read at b2aa9151) (W1-35)"),
        4: R("adapted (hunk replay; never whole before W5-01) - Notes, Undo, Redo, Fit and 100% gone (W1-35, v2.71.2; "
             "DR-40 item 3); VV module 1.9.4"),
        5: R("the Snapping__ import (W2-19 repoints it); this app's Select and Move hover texts (DR-40 item 7); "
             "TrueVision's controls for features not yet here are absent"),
        6: R("1.13.0-1.16.0, 1.18.0 and 1.20.0-1.24.0 (Draft, Ortho, Grid, Image, the Snap split and menu, Circle, Arc, "
             "Axes, the lockstep note, Share; W2-19, W5-01)"),
    },
    '51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css': {
        4: A("W1-34 (v2.71.2): the dead .na-le-tabs__tab--spec rule removed (TrueVision still carries it; offered to "
             "WT-08)"),
    },
    '51__System__LayoutEditor/55__Feature__Scrapbook/Na__LayoutEditor__Panel__Scrapbook__.js': {
        2: R('1.2.1 (TrueVision3D v2.91.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-32)'),
        4: R('adapted - TrueVision 1.2.1 taken whole (W1-32, v2.71.2): the tab hover text'),
        5: R("the SheetModel import without IsSitePlanSheet, and a show rule that also shows on a failed load (no site "
             "plan sheets until SheetModel 1.35.1, W1-21)"),
        6: R('none (TV 1.2.1 taken whole at b2aa9151)'),
    },
    '51__System__LayoutEditor/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js': {
        4: A("W1-34 (v2.71.2): the NoSheets fallback equals the config's (TrueVision's) value; module 1.4.1"),
    },
}

# -----------------------------------------------------------------------------
# Release Watermark: class flips, VV release, packages added, dated notes
# -----------------------------------------------------------------------------
WM = {
    'v2.24.0': {'vv_app': 'IsPaused VV v2.71.2 (W1-01)', 'pk': ['W1-01'],
                'note': "v2.71.2 took this realignment's Na__RenderLoop__IsPaused (commit aa580db3) with a ValeVision body over its own hold reasons (W1-01). No confirmation line either way in TrueVision"},
    'v2.25.0': {'vv_app': 'SetCategoryVisibleByKey VV v2.71.2 (W1-01)', 'pk': ['W1-01'],
                'note': "v2.71.2 took Na__ModelToggle__SetCategoryVisibleByKey (commit f8321d60) with a ValeVision body, exact-key and silent (W1-01)"},
    'v2.32.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: PhaseLibrary uninitialised and ModelToggle\'s registry borrow W1-01; the Model Source argument slots W1-23)', 'pk': ['W1-23'],
                'note': "landed in v2.71.2: the design-phase library verbatim and never initialised (DR-09 (a): every drawing reads the live model) and ModelToggle's BorrowRegistry, RestoreRegistry and new-map rebuild (W1-01); the modelSourceId slots on Render2d, Render3d, GetModelRoot and both fingerprints, with Describe answering a live-model stub (W1-23). Waiting: ModelSource whole (W2-16) and SnapshotRenderer's phase lines (W2-15). No confirmation line either way in TrueVision"},
    'v2.38.1': {'cls': 'PORTED', 'vv': 'VV v2.71.2 (W1-03)',
                'note': "PORTED in v2.71.2 (W1-03): MultiModel takes the ortho depth bias as a distance, models.RenderConfig__Linework.RenderConfig__Linework__OrthoDepthBiasMm = 2, so plans, elevations and their sheet base images stop drawing lines up to 75 mm behind a face. The SnapshotRenderer it names is its verification, not a change; the token it bumped is TrueVision's own. NOT confirmed by Adam in TrueVision (it answers his own fascia report); TrueVision's realign plan row X can close (WT-08)"},
    'v2.39.0': {'vv_app': "VV v2.71.2 (part: ProjectData's local copy and Save(showToast, report), W1-05)",
                'note': "landed in v2.71.2: ProjectData 1.6.0 whole, carrying 1.1.0's local copy and Save(showToast, report) through the facade (W1-05). Waiting: the sheet model's save report and its toast (W1-21, not run in this wave, so Save Sheets shows no success toast until it lands). Waits for Adam's sign-off in TrueVision"},
    'v2.42.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: the door module's 1.9.0 contract and FindDoorGroups, W1-02)",
                'note': "landed in v2.71.2: the door module taken whole at TrueVision's 1.9.0 with ValeVision's Video Studio seams (DescribeDoors, ComputePanelLocalPose, the pose helpers and the MOD types; door clicks left-button only, 1.8.0) and FindDoorGroups 1.1.0 (W1-02). Nothing calls the new names until DoorPose (W2-06); the plan doors themselves wait for W2-06, W2-11, W2-16 and W3-15. TrueVision parked the port on Adam's sign-off; ported under DR-01 (c), not confirmed"},
    'v2.48.0': {'note': "v2.71.2 mirrored names only: the loader facade's IsSitePlanSheet rule and a private 'siteplan' copy (W1-31) and TabStrip 2.0.0's site-plan row class (W1-34); no ValeVision sheet carries Sheet__DrawingType (DR-08 (B), dormant)"},
    'v2.49.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: ScaleManager's site plan scale list, inert, W1-13)",
                'note': "landed in v2.71.2: ScaleManager 1.2.1 whole carries this release's site plan list - inert, no ValeVision viewport is a site plan one (DR-08 (B)); the site plan store, viewports and data wait for W2-14 and W2-16. The S11 verifier records Adam confirming site plan viewports in TrueVision"},
    'v2.50.0': {'note': "v2.71.2 moved Render3d's viewWindow to TrueVision's argument position (W1-23); nothing renders differently"},
    'v2.56.0': {'note': "W1-03 (v2.71.2) records that TrueVision took ValeVision's present(target, scale) here (ValeVision's Supersampler 1.1.0); TrueVision's Supersampler header never logged it (WT-08)"},
    'v2.61.0': {'note': "ScaleManager taken whole at TrueVision's 1.2.1 in v2.71.2 (W1-13): this release's sheet label was already here, and the stale 1.0.0 header is gone"},
    'v2.64.0': {'note': "v2.71.2 moved stillWanted to TrueVision's argument positions in Render2d and Render3d (W1-23); nothing renders differently"},
    'v2.69.0': {'note': "the Drawing Register numbering leaf this entry first names (Register__Numbering 1.0.1, TrueVision commit b6baf301) landed inert in v2.71.2 (W1-13, recorded under v2.71.0); the register's font (PdfFonts, W1-25) did not run in this wave"},
    'v2.71.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: Register__Numbering inert W1-13; the document code accessor W1-12)', 'pk': ['W1-12'],
                'note': "landed in v2.71.2: Register__Numbering 1.0.1 (Na__LeRegNum__Plan), inert until the sheet model's renumber (W1-21), and Na__DrawData__GetDocumentCode, ValeVision's {project} (the numeric projectCode, DR-11) (W1-12). Waiting: the record fields and the DrawingNumber default (W1-19), Sheets (W1-21), the format and the title block (W1-22); none ran in this wave"},
    'v2.74.0': {'note': "v2.71.2 re-read ProjectRecord against TrueVision's 1.1.0 and fixed its dormant read: Fetch takes clientDrawingName and siteAddress from the project root through the facade, not the presentation block (W1-12; S12-F24)"},
    'v2.80.0': {'note': "the north data module taken whole at TrueVision's 1.0.0 in v2.71.2 (W1-05): its Save passes the save report on"},
    'v2.81.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: the Project QR system, switched off, W1-15)',
                'note': "landed in v2.71.2, switched off (DR-12 (A)): LE/53__Feature__ProjectQrCode - Encoder and Painter verbatim, Symbol failing closed, ProjectLink on ValeVision's identity (a permanent master-index qrKey that no entry has yet), the config with Enabled false and no address, the README rewritten, both tests (W1-15). The folder this row's L126 note calls missing exists now. Waiting: the title-block QR cell and Modern 1.5.0 (W1-26 after OC-01, not run in this wave) and the Vale resolver (W5-05, held). Not signed off by Adam in TrueVision"},
    'v2.82.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: the interactive overlay registry and the render loop's bracket, W1-01)",
                'note': "landed in v2.71.2: Na__RenderLoop__InteractiveOverlays__ 1.0.0 verbatim and the loading sequence's BeginFrame / EndFrame bracket, skipped while the Video Studio preview plays (DR-32) (W1-01); the compass registers with it (W1-11). The drawing planes wait for W2-40 and W2-01. Not signed off by Adam in TrueVision"},
    'v2.83.0': {'cls': 'PORTED', 'vv_app': 'VV v2.71.2 (the first-open veil whole, W1-33; the wording W1-31; the metrics promise W1-32)',
                'note': "PORTED in v2.71.2: LoadingVeil 1.1.0 taken whole with two ValeVision seams (DrawingSettled; FirstOpen's immediate option, Q-COVER), FirstOpen at TrueVision's call site, TrueVision's veil region in LoadingOverlays line for line, the 3D-furniture hiding in a start-up sheet, and the boot cover in the veil's look reading 'Your Drawings Are Loading' (W1-31, W1-32, W1-33); UiParity checks 1 (fold) and 3 (veil) pass. TrueVision's entry ends 'Not yet confirmed by Adam'; DR-01's register counts releases up to v2.85.0 as returned to ValeVision on 20-Sep"},
    'v2.84.0': {'vv_app': 'VV v2.71.2 (Show Compass and the overlay registry, W1-11, W1-01)',
                'note': "landed in v2.71.2: CompassGizmo and the North editor taken whole at TrueVision's 1.1.0 after the overlay registry (Show Compass, kept per browser), the config's ShownByDefault and three labels (W1-11, W1-01). Waiting: the drawing planes half (W2-40, W2-01). TrueVision's entry: 'NOT yet confirmed by Adam'"},
    'v2.86.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: the draft core W1-06; auto names and the identity labels W1-10; ProjectData's payload guard W1-05)", 'pk': ['W1-05'],
                'note': "landed in v2.71.2: DraftMaths, DrawingUsage, DevRowShell and DraftGuard 1.0.0 (inert until the 2.x editors), RowAccordion's guards, RenameDrawing 1.1.0, the Dev menu modal's details, footnote and commit button, the DrawView Dev sheet's shell region and Na__Test__DrawingDrafts__ (W1-06); AutoName and AutoNameText (inert), the twelve elevation labels and the identity region (W1-10); RegisterPayloadGuard (W1-05). Waiting: the Floor Plans and Elevations Dev menus 2.x (W2-04, W2-05) and the 48 placeholder (W2-05). Pending Adam's sign-off in TrueVision; ported under DR-01 (c)"},
    'v2.87.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: the storey level, W1-08)',
                'note': "landed in v2.71.2: StoreyLevel and the StoreyRow builder (not mounted until W2-04), ConfigState 1.1.0, the data module 1.1.0 with FloorPlan__StoreyLevel, the storey config block and six labels, the storey-note CSS and Na__Test__FloorPlanStoreyLevel__ (W1-08). Waiting: the viewport title's storey wording (W2-10) and the Dev menu row (W2-04). Not signed off by Adam in TrueVision"},
    'v2.88.0': {'note': "v2.71.2 (W1-12): TrueVision's 1.1.0 read and its body deliberately not taken (no Project Admin or PlanVision here); ProjectRecord now reads the project root's clientDrawingName and siteAddress through the facade, and Na__Test__ProjectRecordAddress__ is ported as a Vale variant (15 cases)"},
    'v2.89.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: SitePlanComposites and its config, dormant, W1-13; the hatch module's token and tile polylines W1-17)", 'pk': ['W1-17'],
                'note': "landed in v2.71.2, dormant (DR-08 (B)): SitePlanComposites 1.0.0 and its config byte for byte (W1-13), and the hatch module 1.5.0 that carries this release's Token and TilePolylines (W1-17). Waiting: the site plan store and painter (W2-14, W2-16). Not confirmed by Adam in TrueVision (its composites plan P10 is open)"},
    'v2.90.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: the hatch module, W1-17)',
                'note': "landed in v2.71.2, inert: HatchPatterns 1.5.0, which carries this release's SvgPaint and DrawPdf (W1-17). Waiting: Shape__Hatch in the records and the chrome (W1-19, W1-26; not run in this wave), the Patterns panel (W2-29) and Panel__Shapes (W3-12). No confirmation line in TrueVision"},
    'v2.91.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: the Properties tab hint and Panel__Scrapbook 1.2.1, W1-32)",
                'note': "landed in v2.71.2: the mode controller's Properties tab hint (shown once PanelHost 1.5.0 or later lands, W1-38) and the Scrapbook tab's hover text, Panel__Scrapbook 1.2.1 whole (W1-32). Waiting: the Specification Scrapbook (W2-35, W2-30). No line records that Adam tried it in TrueVision"},
    'v2.94.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: the fog leaves and test W1-09; the elevation data module 1.1.0 W1-10; the depthFog render slot W1-23)', 'pk': ['W1-10', 'W1-23'],
                'note': "landed in v2.71.2, inert: 49__System__ElevationDepthFog's AppConfig, ConfigState, Maths, RecordData and Shader and Na__Test__ElevationDepthFog__ (W1-09); the elevation data module 1.1.0, so every elevation now carries its Elevation__DepthFog block, switched off (W1-10); Render2d's depthFog slot (W1-23). Nothing draws fog: the render layer, Dev row and wiring wait for W2-03, sheets for W2-12 and W2-16. TrueVision's fog plan: 'Awaiting Adam's test'"},
    'v2.95.0': {'vv_app': "VV v2.71.2 (part: Na__LePdf__LoadLibrary exported W1-24; the 'statement' view name W1-31, W1-32)",
                'note': "v2.71.2 added PdfExporter's exported LoadLibrary (no importer until W4-12) and the 'statement' view name in the loader and the mode controller, whose OpenStatements refuses until W4-13 (W1-24, W1-31, W1-32). The writer stays off (DR-10). 'NOT CONFIRMED BY ADAM' in TrueVision"},
    'v2.100.0': {'note': "v2.71.2 carried only the QR README's Shape__Qr section (W1-15); the Portal element waits for W2-38"},
    'v2.101.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: the hatch module's own ink and the Site Plan pack 1.1.0, W1-17)",
                 'note': "landed in v2.71.2, inert: the hatch module (1.2.0's pattern ink) and the Site Plan pack's Grassland, Rough Grassland and Mixed Woodland 1.0.1, shipped because site plans port dormant (DR-08 (B), DR-19) (W1-17). Waiting: Viewport2d__SitePlan (W2-16) and the site plan data (W2-14). 'NOT YET TRIED BY ADAM' in TrueVision"},
    'v2.103.0': {'cls': 'PORTED', 'vv': 'VV v2.71.2 (W1-03, W1-09)',
                 'note': "PORTED in v2.71.2: the supersampler's present-pass clamp min(rgb, a), live (W1-03), and the fog shader's premultiplied layer, inert until the fog lands (W1-09). Not confirmed by Adam in TrueVision"},
    'v2.106.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: PaintOrder 1.0.0 inert W1-13; the viewport-folds-the-group rule W1-32)", 'pk': ['W1-32'],
                 'note': "landed in v2.71.2: PaintOrder 1.0.0, inert until the paint order lands (W1-13), and the mode controller's FOLD_GROUP and SectionForKind without the site plan clause (W1-32). Waiting: the layer stack itself - SheetSurface 1.13.0, MarkupBridge 1.20.0, Groups 1.4.0 and the PDF paint plan (W1-28) and the restack (W1-19); neither ran in this wave. No confirmation line in TrueVision"},
    'v2.107.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: the Draft mode state leaf, W1-14)', 'pk': ['W1-14'],
                 'note': "landed in v2.71.2, inert: Na__LayoutEditor__DraftMode__State__ 1.0.0 in LE/26 (W1-14). Waiting: the controller, panel and wiring (W2-18, W2-16, W3-05). TrueVision: 'Not ported. It waits for Adam's sign-off'; ported under DR-01 (c)"},
    'v2.110.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: KeyScope and the 3D handler's guard W1-29; DocumentKeys and its key map W1-30; the mode controller's reader and wiring W1-32)",
                 'note': "landed in v2.71.2 and LIVE: the 3D keys answer only on the 3D tab (KeyScope 1.1.0 and the guard replayed into ValeVision's own handler, DR-33), the documents' keyboard (DocumentKeys 1.1.0 and Na__Hotkeys__DocumentTabs__.json) and the mode controller's KeyScope reader, Follow and DocumentKeys Ready and Initialize; Na__Test__DocumentKeys__ 75/75 (W1-29, W1-30, W1-32). The Statements page's own keys wait for the Statement Writer (W4-12, off under DR-10). 'NOT tried by Adam; NOT in ValeVision' in TrueVision"},
    'v2.111.0': {'note': "Toolbar 1.14.0's readout zoom sync is superseded: v2.124.0's Toolbar 1.19.0 removed the readout it served (W1-35), so nothing of it is to take"},
    'v2.112.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: Transitions 1.1.0 W1-04; DocumentKeys 1.0.1 W1-30; the mode controller's returnToOrbit W1-32)", 'pk': ['W1-30'],
                 'note': "landed in v2.71.2: opening a drawing really leaves Walk and Fly - Transitions 1.1.0 whole, asked for by the plan and elevation controllers (W1-04) and by the Layout Editor (W1-32). Waiting: Page Up and Page Down turning the drawing (W1-36, not run in this wave), the register's Ctrl+S (W4-10) and the Fly controls 1.0.1 render-loop release, which no package owns (W1-04 F2). 'NOT tried by Adam; NOT in ValeVision' in TrueVision. The Section E.1.2 note's 'the Walk/Fly exit third already works' predates the returnToOrbit rule"},
    'v2.113.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: the Ortho mode state leaf, W1-14)',
                 'note': "landed in v2.71.2, inert: Na__LayoutEditor__OrthoMode__State__ 1.0.0 in LE/32 (W1-14). Waiting: the controller and wiring (W2-18, W3-05). 'NOT tried by Adam' in TrueVision"},
    'v2.114.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: the Drawing grid state leaf, W1-14)',
                 'note': "landed in v2.71.2, inert: Na__LayoutEditor__DrawingGrid__State__ 1.0.0 in LE/27 (W1-14). Waiting: the grid, its panel and stylesheet (W2-18, W3-05). 'Adam has not tried it' in TrueVision"},
    'v2.115.0': {'vv_app': "VV v2.71.2 (part: KeyScope 1.1.0's ControlKeepsKey W1-29; DocumentKeys 1.1.0 and Na__Hotkeys__DocumentTabs__.json W1-30)",
                 'note': "landed in v2.71.2: KeyScope 1.1.0 (ControlKeepsKey, inert until W1-36 and W3-03) and the document-tab key file under TrueVision's name with DocumentKeys 1.1.0 (W1-29, W1-30). Waiting: Navigation and Controls (W1-36, not run in this wave) and SheetTools Keyboard (W3-03). No confirmation line in TrueVision"},
    'v2.116.0': {'vv_app': "VV v2.71.2 (part: the Sheet Images render leaves W1-16; ProjectData's RegisterSaveStep W1-05)", 'pk': ['W1-05'],
                 'note': "landed in v2.71.2, inert: LE/54's render leaves - Setup (ValeVision's Pages base), Geometry, Painter, Paint, Source (through the facade's SheetImageLocation), Pdf, Encode and the config (W1-16) - and ProjectData's RegisterSaveStep (W1-05). Waiting: the editing set (W3-02), storage and publish (W3-18) and the switch-on (W3-09). Tried by Adam in TrueVision on his own server; no sign-off line"},
    'v2.119.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: MeasureParse 1.1.0's Array, W1-13)",
                 'note': "landed in v2.71.2: MeasureParse 1.1.0 whole, its Array parser with no caller - Ctrl-drag copy (CopyDrag, W3-03) stays held with the gestures (DR-40 item 8, W3-04) (W1-13). 'Adam has not tried it' in TrueVision"},
    'v2.120.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: the QR symbol's grey, the config, the README and the tests, W1-15)",
                 'note': "landed in v2.71.2, switched off: Symbol 1.2.0 (PortalDarkColour), the config, the README, Na__Test__ProjectQr__ 1.1.0 (62/62) and the Decode test's two inks (W1-15). Waiting: the Portal block (W2-38) and the title-block cell (W1-26). 'NOT tried by Adam' in TrueVision"},
    'v2.121.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: Encode, Geometry and Setup 1.1.0 and the config, W1-16)',
                 'note': "landed in v2.71.2, inert: print-size storage maths - Encode 1.1.0, Geometry 1.1.0, Setup 1.1.0 and the config Meta 1.1.0 (W1-16). Waiting: Publish (W3-18) and the switch-on (W3-09). 'NOT signed off by Adam' in TrueVision"},
    'v2.123.0': {'note': "TrueVision's Toolbar 1.17.0 (the Notes toggle gone) rode in this release's commit d76d7638 with no release entry of its own; ValeVision took it in v2.71.2 (W1-35, recorded under v2.124.0)"},
    'v2.124.0': {'cls': 'PORTED', 'vv': 'VV v2.71.2 (W1-35)',
                 'note': "PORTED in v2.71.2: Undo, Redo, Fit and the zoom readout leave the drawing toolbar, and the Notes toggle with them (Toolbar 1.17.0 and 1.19.0 hunks; DR-40 item 3); their keys and right-click entries stay; the MarginToggle labels are deleted (W1-35). Two comment-only hunks follow with their files' whole takes: Navigation (W1-36) and Eyedropper (W2-21). 'NOT tried by Adam; NOT in ValeVision' in TrueVision"},
    'v2.126.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: the hatch module, the Construction Materials pack and the root index, W1-17)',
                 'note': "landed in v2.71.2, inert: the hatch module (1.3.0's line pt and colour), the Construction Materials pack 1.0.0 with 14 patterns and the root index 1.1.0 (Construction first, Brickwork the default) at the app root (W1-17). Waiting: the colour palette (W1-37, not run in this wave), the Patterns panel (W2-29) and Panel__Shapes (W3-12). 'NOT tried by Adam' in TrueVision"},
    'v2.129.0': {'note': "cited only in v2.71.2: the DrawingGrid state's INTEGRATION comment carries this release's renamed object snap units (W1-14); the object snap waits for W2-19 and W2-42"},
    'v2.130.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: the curves leaf, W1-14)',
                 'note': "landed in v2.71.2, inert: Na__LayoutEditor__VectorTools__Curves__ 1.0.0 in LE/37 (W1-14). Waiting: the rest of the vector tools (W2-27, W2-28, W2-41; switched on with W3-07). 'NOT tried by Adam' in TrueVision"},
    'v2.136.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: the vector quality leaf, W1-14)',
                 'note': "landed in v2.71.2, unwired: Na__LayoutEditor__VectorQuality__ 1.0.0 (W1-14). Waiting: SheetSurface's Ready and NoteRedraw, the toolbar select and the Paper CSS rule (W1-28, W5-01). The Vector control is 'NOT yet confirmed' by Adam in TrueVision"},
    'v2.138.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: the rotation leaf and its test section, W1-14)',
                 'note': "landed in v2.71.2, inert: Na__LayoutEditor__ViewportRotation__ 1.0.0 and the rotation test's leaf section, 16/16 (W1-14). Waiting: the handles, the turned window, the snap index and the chrome (W3-06, after W3-03). 'NOT tried by Adam' in TrueVision"},
    'v2.139.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: DimensionRounding and its test, W1-13)',
                 'note': "landed in v2.71.2, inert: DimensionRounding 1.0.0 and Na__Test__DimensionRoundUp__, 21/21 (W1-13). Waiting: the dimension tool, its panel and the markup bridge (W2-26, W3-12, W1-28). 'NOT tried by Adam' in TrueVision"},
    'v2.140.0': {'note': "v2.71.2 took ScaleManager 1.2.1 whole, whose only change here is the log line for 1:200 (W1-13); the scale itself is configuration (W1-22, not run in this wave, so ScaleManager's DESCRIPTION names 1:200 while the list is still 1:20, 1:50, 1:100). The 2D window and frame call shapes came from their 1.2.0 and 1.4.0 files (W1-23). Hide swings wait for W2-11, W2-16 and W3-15"},
    'v2.143.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: the note-regions record leaf, W1-13)', 'pk': ['W1-13'],
                 'note': "landed in v2.71.2, inert: SheetRecords__NoteRegions 1.0.0, its record checks passing on ValeVision's config (W1-13). Waiting: SheetRecords (W1-19) and the regions UI (W2-22, W2-32, W3-11). 'NOT tried by Adam' in TrueVision"},
    'v2.145.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: Na__DrawData__IsLoaded, W1-05)',
                 'note': "landed in v2.71.2: ProjectData's IsLoaded (W1-05). Waiting: AutoSave 1.5.0's draft restore (W1-07) and the sheet model (W1-21); neither ran in this wave. 'NOT tried by Adam' in TrueVision"},
    'v2.146.0': {'vv_app': "VV v2.71.2 (part: ProjectData 1.6.0's drawings save guard W1-05; the modal's third answer W1-06)", 'pk': ['W1-06'],
                 'note': "landed in v2.71.2: the drawings save guard in ProjectData 1.6.0 - GetBase, WhenBaseKnown, LearnBase, CheckBase and the SavedIso stamp, over the local server's guard (W1-05) - and the Dev menu modal's altLabel (W1-06). R2 judging stays off behind Na__DrawData__R2_JUDGING (DR-30). Waiting: AutoSave 1.5.0 and the project-file draft guard (W1-07, not run in this wave). 'NOT tried in the app' in TrueVision"},
    'v2.147.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: the leaderless-notes record leaf, W1-13)',
                 'note': "landed in v2.71.2, inert: SheetRecords__LeaderlessNotes 1.0.0 (W1-13). Waiting: SheetRecords (W1-19) and the margin and its panel (W2-32). 'NOT tried by Adam' in TrueVision"},
    'v2.150.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: ShapeRings W1-13; the hatch module's even-odd holes W1-17; GradientTool 1.1.0 W1-18)", 'pk': ['W1-17', 'W1-18'],
                 'note': "landed in v2.71.2: ShapeRings (W1-13), the hatch module's even-odd holes (W1-17) and GradientTool 1.1.0's even-odd clip, unused until a holed shape is passed (W1-18). Waiting: the Boolean tools and Shape__Holes (W2-27, W2-41, W3-07, W3-03). Adam tried the Boolean tools in TrueVision ('It works INCREDIBLE!', recorded in v2.151.0); the gradient's PDF clip is not recorded as tried"},
    'v2.152.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: LineStyleTool 1.1.0, W1-18)',
                 'note': "landed in v2.71.2: LineStyleTool 1.1.0 whole; its optional prefix and dashed labels have no caller until Panel__Dimensions 1.7.0 (W3-12) (W1-18). Waiting: W3-12, W1-26, W1-28. 'NOT tried by Adam' in TrueVision"},
    'v2.155.0': {'vv_app': "VV v2.71.2 (part: PdfExporter 1.11.0's FAST picture packing W1-24; the QR system at its moved path W1-15)", 'pk': ['W1-24', 'W1-15'],
                 'note': "landed in v2.71.2: every sheet PDF packs its viewport pictures FAST, the Sub predictor (PdfExporter 1.11.0's fix: Chrome's viewer painted black blocks over large Paeth pictures; files grow) (W1-24), and the QR system at its moved path, LE/53__Feature__ProjectQrCode (W1-15). Adam's confirmation in TrueVision covers this PDF fix ('CONFIRMED by Adam in Chrome 23-Sep-2026'); Phase 0's moves were the option he chose, not a confirmed test"},
    'v2.156.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: the viewer guard on the first-open veil, W1-33)', 'pk': ['W1-33'],
                 'note': "landed in v2.71.2: the mode controller skips the first-open veil in the web viewer (TrueVision's guard) (W1-33). Until the published viewer lands (W4-09) a Vale client's first drawing on the live read-only site fills in uncovered: a one-line seam until W4-09, or holding the live deploy, is to be decided before Wave 1 is deployed (W1-33, section 1.1). 'NOT tried on a phone yet' in TrueVision"},
    'v2.158.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.2 (part: TabStrip 2.0.0 through the loader W1-34; EnterUnder and Quiet W1-32; the names W1-31; the Quiet guard W1-33)', 'pk': ['W1-33'],
                 'note': "landed in v2.71.2 and LIVE: the tab strip reads 3D Model, Drawings (a menu of every drawing, rows draggable until the register) and Specification; the Specification opens over the first sheet through EnterUnder; Boot's Tab Strip region is TrueVision's byte for byte (UiParity check 2 passes); four labels took TrueVision's values (W1-31, W1-32, W1-33, W1-34). Waiting: the Document Register and Design Statements tabs (W4-10, W4-13; DR-38 (a)). 'NOT tried on a real phone' in TrueVision"},
    'v2.160.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: ShapeRings 1.1.0's FacesFromRings, W1-13)",
                 'note': "landed in v2.71.2: ShapeRings 1.1.0 (W1-13). Waiting: the publisher and the PDF exporter's site fills (W4-03, W3-16). No confirmation line in TrueVision"},
    'v2.164.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.2 (part: the hatch module's TileMarks, W1-17)", 'pk': ['W1-17'],
                 'note': "landed in v2.71.2, inert: the hatch module 1.5.0 (TileMarks for the site legend) (W1-17); the legend elements wait for W2-39 and W3-14. 'NOT tried by Adam' in TrueVision"},
    'v2.166.0': {'note': "v2.71.2 carried names only: the mode controller's VIEW_REGISTER and VIEW_STATEMENT and its OpenRegister(options) and OpenStatements(options), refusing until their features land (W1-32), mirrored by the loader facade (W1-31); the share links wait for W4-07 and W4-08"},
}

EXPECT_FLIP_COUNTS = {('NOT-CONSIDERED', 'PARTIAL'): 28, ('PENDING-SIGNOFF', 'PARTIAL'): 6, ('REOPENED', 'PARTIAL'): 2,
                      ('PENDING-SIGNOFF', 'PORTED'): 1, ('PARTIAL', 'PORTED'): 1, ('NOT-CONSIDERED', 'PORTED'): 2}


def W(lines_text):
    return lines_text.strip('\n').split('\n')


S14_BULLET = W('''
- **Wave 1 (ValeVision3D v2.71.2, 02-Oct-2026; W1-99).** The wave adds 42 modules - most land inert, imported by nothing
  until a later package wires them - five configuration files, a README, TrueVision's 22-file hatch library at the app
  root and eleven test files; and it adds exports to existing modules: ProjectData +8 (TrueVision's seven and the
  ValeVision-only GetDocumentCode), the door module +11, the floor plan data module +7 and its ConfigState +1, the
  elevation data module +5, MeasureParse +4, ModelToggle +3, RowAccordion +3, RenameDrawing +2, CompassGizmo +2,
  Invalidation's IsPaused, Transitions' ReturnToOrbit, the loader facade +7, the mode controller +4, LoadingVeil's
  FirstOpen, LoadingScreen's IsShown, TabStrip's CloseMenu and PdfExporter's LoadLibrary. It also changes the positional
  signatures of Render2d and Render3d and what Describe returns (W1-23). A warm client holding a mix of old and new files
  can fail to link the start-up graph (CompassGizmo with the North editor; ProjectData with its importers; the floor plan
  data with its ConfigState), fail to link the editor (the mode controller with an old LoadingVeil or LoadingScreen; the
  tab strip with an old loader), or link and misbehave (an old Viewport3d with the new SnapshotRenderer draws a zoomed 3D
  viewport whole; an old Window leaves the 2D frames empty). Bump needed: yes, once at deploy - the same consolidated
  W0/W1 bump (the prepared W0-08 package applied plus one shell-token bump, or a full bump); nothing extra. W6-02's
  precache refresh should add KeyScope, InteractiveOverlays, LocalProjectMirror (now loaded on every project),
  StoreyLevel, the three 49 leaves the elevation data module loads and the 49 AppConfig, DocumentKeys and its key map,
  FindDoorGroups (with DoorPose, W2-06) and the four draft modules (with W2-04 and W2-05). Service worker token: shared
  Whitecardopedia worker - Adam's call; it was not bumped (`'2026-09-18-1'`).
''')

S21_NOTE = W('''
**02-Oct-2026 note (W1-99, ValeVision3D v2.71.2).** 49 now holds TrueVision's depth-fog leaves at its own number (W1-09,
inert until W2-03): the 49 row's "lands here" is half done, and 47 and 48 are still empty. Inside 51 the Layout Editor gained
nine of TrueVision's subfolders (section 2.3), and the app root gained TrueVision's hatch library,
`52__LayoutEditor__HatchPatternLibrary/` (W1-17: its root index, the Construction Materials pack and the Site Plan pack -
22 JSON files, inert).
''')

S23_NOTE = W('''
**02-Oct-2026 note (W1-99).** Wave 1 created nine of TrueVision's Layout Editor subfolders at TrueVision's numbers: LE/26
DraftMode, LE/27 DrawingGrid, LE/32 OrthoMode and LE/37 VectorTools (their first leaves, W1-14), LE/31 DocumentKeys (W1-30),
LE/36 HatchPatternTools (W1-17), LE/51 DrawingRegister (its numbering leaf, W1-13), LE/53 ProjectQrCode (W1-15) and LE/54
SheetImages (W1-16). ValeVision now has 27 (26 shared plus LE/01); 8 of TrueVision's 34 are still to come (21, 28, 33, 52,
58, 59, 65, 66). The folder-number registry's ValeVision column was not touched in this pass: it is not a scribe file.
''')

S38 = W('''
### 3.8 Wave 1 (ValeVision3D v2.71.2): what each package changed

Written 02-Oct-2026 by the Wave 1 Parity Scribe (W1-99) from the twenty-six Port Records of the packages that ran
(`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/port_records/`) and the integrator's gate report
(`.../execution/gate_reports/W1.md`, PASS_WITH_NOTES). "Rows" are the rows above that the package changed; work that is not a
module of this register (tests, the three stylesheets in `03__Style__AppStylesheets/`, the door README, the app-root hatch
library) is named in the second column.

| Package | What it changed | Rows | Elsewhere in this ledger |
|---|---|---|---|
| W1-01 | The interactive overlay registry (InteractiveOverlays 1.0.0, live: the render loop brackets each frame, skipped during the Video Studio preview), Na__RenderLoop__IsPaused, ModelToggle's three registry names, and the design-phase library landed uninitialised (DR-09) | 3.1 LoadingSequence; 3.4 Invalidation, ModelToggle; 3.5 InteractiveOverlays, PhaseLibrary (landed) | 4 (v2.24.0, v2.25.0, v2.32.0, v2.82.0) |
| W1-02 | The door module taken whole at TrueVision 1.9.0 (door clicks left-button only, TrueVision 1.8.0), FindDoorGroups 1.1.0 and the door README | 3.4 ClickToOpenDoors; 3.5 FindDoorGroups (landed) | 4 (v2.42.0) |
| W1-03 | The ortho depth bias (the MultiModel hunk and OrthoDepthBiasMm 2 mm) and the supersampler's present clamp | 3.1 MultiModel; 3.2 the main config; 3.4 Supersampler | 4 (v2.38.1, v2.56.0, v2.103.0) |
| W1-04 | Transitions 1.1.0 whole (the walk exit only when asked); the plan and elevation mode controllers ask for it | 3.1 Transitions and the two mode controllers | 4 (v2.112.0) |
| W1-05 | ProjectData 1.6.0 whole over the facade (local copy, payload guards, save steps, IsLoaded, the drawings save guard; R2 judging off, DR-30); the north data module 1.0.0 whole; 41 SceneData registers its block | 3.1 ProjectData, North data; 3.6 41 SceneData; 3.5 LocalProjectMirror (now loaded) | 4 (v2.39.0, v2.86.0, v2.116.0, v2.145.0, v2.146.0); 8.1 |
| W1-06 | The draft core (DraftMaths, DrawingUsage, DevRowShell, DraftGuard; inert until W2-04 and W2-05), RowAccordion and RenameDrawing 1.1.0 ported back whole, the Dev menu modal 1.2.0, the DrawView Dev sheet, the modal's CSS, the CSS index order and Na__Test__DrawingDrafts__. PARTIAL at its return; its last item (the ported test) passes since W1-10 (gate item 4.2) | 3.1 Modal, RenameDrawing, RowAccordion, the DrawView Dev sheet; 3.5 the four new modules | 4 (v2.86.0, v2.146.0) |
| W1-08 | The floor plan storey level: StoreyLevel, StoreyRow (not mounted until W2-04), ConfigState 1.1.0, the data module 1.1.0 (its trimmed tokens kept), the config block and labels, the storey CSS and the test | 3.1 ConfigState, the data module, the Dev sheet; 3.2 the floor plan config; 3.5 StoreyLevel, StoreyRow | 4 (v2.87.0) |
| W1-09 | Elevation depth fog's pure leaves and config (folder 49 created, inert) and the fog test | 3.5 the five 49 files | 2.1; 4 (v2.94.0, v2.103.0) |
| W1-10 | Elevation auto names (inert until W2-05); the data module 1.1.0 with the fog accessors (every elevation carries its fog block, off); twelve labels; the identity region; the elevation geometry harness | 3.1 the data module, the Dev sheet; 3.2 the elevation config; 3.5 AutoName, AutoNameText | 4 (v2.86.0, v2.94.0) |
| W1-11 | North's Show Compass: CompassGizmo and the North editor 1.1.0 whole, the config with ShownByDefault and three labels | 3.1 CompassGizmo, the North editor; 3.2 the North config | 4 (v2.84.0) |
| W1-12 | The document code accessor Na__DrawData__GetDocumentCode (ValeVision-only, DR-11); ProjectRecord reads the project root through the facade; the address test as a Vale variant | 3.1 ProjectData, ProjectRecord | 4 (v2.71.0, v2.74.0, v2.88.0); 8.1 |
| W1-13 | Layout Editor pure leaves A: ShapeRings 1.1.0, DimensionRounding, PaintOrder, MeasureParse 1.1.0, the note-regions and leaderless-notes records, Register__Numbering (LE/51 created), ScaleManager 1.2.1 whole, SitePlanComposites and its config (dormant), the round-up test | 3.1 ScaleManager, MeasureParse; 3.5 the nine new files | 4 (fourteen rows) |
| W1-14 | Layout Editor pure leaves B: ViewportRotation, the vector curves, the Draft mode, drawing grid and ortho state leaves, VectorQuality (LE/26, 27, 32 and 37 created), the rotation test's leaf section | 3.5 the six new modules | 4 (v2.107.0, v2.113.0, v2.114.0, v2.129.0, v2.130.0, v2.136.0, v2.138.0) |
| W1-15 | Project QR (LE/53 created), switched off: Encoder and Painter verbatim, Symbol failing closed, ProjectLink on ValeVision's identity, the config off with no address, the README rewritten, two tests | 3.5 the six files of LE/53 | 4 (v2.81.0, v2.100.0, v2.120.0, v2.155.0) |
| W1-16 | Sheet Images render leaves (LE/54 created): Setup, Geometry, Painter, Paint, Source (through the facade), Pdf, Encode and the config with ValeVision's Pages base, inert | 3.5 the eight files of LE/54 | 4 (v2.116.0, v2.121.0); 8.1 |
| W1-17 | PARTIAL: the hatch module 1.5.0 (LE/36 created) and TrueVision's whole hatch library at the app root (`52__LayoutEditor__HatchPatternLibrary/`: the root index, the Construction Materials pack 1.0.0 with 14 patterns, the Site Plan pack 1.2.0 with 5), inert; the Patterns stylesheet held back for W2-29 (an orchestrator correction is proposed) | 3.5 HatchPatterns | 2.1; 4 (v2.89.0, v2.90.0, v2.101.0, v2.126.0, v2.150.0, v2.164.0) |
| W1-18 | GradientTool 1.1.0 and LineStyleTool 1.1.0 whole (nothing changes until W1-26 and W3-12 pass the new arguments) | 3.1 GradientTool, LineStyleTool | 4 (v2.150.0, v2.152.0) |
| W1-23 | The render calls take TrueVision's positional signatures (the Model Source slot, depthFog, stillWanted, viewWindow) and Describe hands back a live-model Model Source; nothing renders differently | 3.1 SnapshotRenderer, Viewport2d, its Frame, Linework and Window, Viewport3d, PdfExporter | 4 (v2.32.0, v2.50.0, v2.64.0, v2.94.0, v2.140.0) |
| W1-24 | PdfExporter's interim parity: FAST picture packing (TrueVision 1.11.0), the strict and pictureCompression options, the awaited save, LoadLibrary split and exported | 3.1 PdfExporter | 4 (v2.95.0, v2.155.0) |
| W1-29 | KeyScope 1.1.0 and the 3D handler's scope guard | 3.5 KeyScope (landed); 3.6 HotkeyHandler | 4 (v2.110.0, v2.115.0) |
| W1-30 | The documents' keyboard: DocumentKeys 1.1.0 and Na__Hotkeys__DocumentTabs__.json (LE/31 created) | 3.5 both files | 4 (v2.110.0, v2.112.0, v2.115.0) |
| W1-31 | The loader facade's TrueVision entry points and view names (OpenRegister and OpenStatements refusing until W4-10 and W4-13), the registration pattern, the loading screen's headline; Na__Test__LoaderFacade__ | 3.6 Loader, LoadingScreen | 6 (the loader row) |
| W1-32 | The mode controller's feature-independent hunks (the KeyScope reader and Follow, DocumentKeys wiring, the view names, EnterUnder and Quiet, FOLD_GROUP, the Properties hint, refusing OpenRegister and OpenStatements, PreloadMetrics' promise, SuspendThreeD's returnToOrbit); Panel__Scrapbook 1.2.1; the FocusNote value; Na__Test__DocumentKeys__ | 3.1 the mode controller, Panel__Scrapbook; 3.2 the Layout Editor config | 4 (v2.83.0, v2.91.0, v2.106.0, v2.110.0, v2.112.0, v2.158.0, v2.166.0) |
| W1-33 | The first-open veil and the header fold exactly as TrueVision's: LoadingVeil 1.1.0 whole (two seams), FirstOpen at TrueVision's call site, the boot veil's look and IsShown, the shell hiding moved into Boot, TrueVision's veil region in `03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css`; four checks of the loader test (an importer update) | 3.1 LoadingVeil, the mode controller, Styles__Main; 3.6 Loader, LoadingScreen, Styles__Boot | 4 (v2.83.0, v2.156.0, v2.158.0) |
| W1-34 | TabStrip 2.0.0 whole through the loader (3D Model, the Drawings menu, Specification; the Register and Statements tabs gated), Boot's Tab Strip region, OpenSpecification through EnterUnder, four labels, the dead --spec rule, the Dev menu's NoSheets fallback | 3.1 TabStrip, the mode controller, Styles__Specification, the Dev menu; 3.2 the Layout Editor config; 3.6 Loader, Styles__Boot | 4 (v2.48.0, v2.158.0); 7 |
| W1-35 | The toolbar's subtractive phase: Notes, Undo, Redo, Fit and 100% gone (TrueVision 1.17.0 and 1.19.0; DR-40 item 3); the MarginToggle labels deleted and the MarginNotes description TrueVision's | 3.1 Toolbar; 3.2 the Layout Editor config | 4 (v2.111.0, v2.123.0, v2.124.0) |
| Not run | W1-07, W1-19, W1-20, W1-21, W1-22, W1-25, W1-26, W1-27, W1-28, W1-36, W1-37 and W1-38: skipped by the workflow because W1-17 or W1-06 was not DONE when they were due; dispatchable in a Wave 1 continuation (gate item 4.3) | none (their rows keep them under Packages) | 4 (the rows that say "not run in this wave") |
| Gate | FIX-1: the seven stale rows off the AppConfig parity test's allow-list (`80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs` 1.0.2) | 3.2 the Layout Editor config | - |
| W1-99 | 136 release placeholders resolved to v2.71.2 in 101 files; three dated notes in the PLAN (D22); this pass | none | this pass |

**The audit's records items for this wave (WP-S03a-10 and WP-S03b-12, ValeVision's half; W1-99).** Checked against the
ledger, the PLAN and the files on 02-Oct-2026:

- The loader's one status - CLOSED: this ledger gives it one status everywhere (W0-06), and the Loader's and LoadingScreen's
  own PORT NOTE Back-port lines say the same since v2.71.2 (W1-31); section 6's row carries the note.
- "The two verification harnesses ... ValeVision has no equivalent" - CLOSED: the Archive row carries W0-06's correction.
- The stale back-port row "The whole Layout Editor" - CLOSED (section 6 and the Archive row, W0-06).
- The PLAN's D22 text and its drawings-block comment "the live site ignores it" - CLOSED: dated notes added on 02-Oct-2026
  (W1-99): since v2.45.0 one rule holds on localhost and on the live site alike, Layout Mode on and a sheet.
- ValeVision PORT NOTEs that read "Parity: new / Ported from Lantern Designer" (the mode controller, the tab strip) and the
  ConfigState units' "the same split applies to TrueVision's copy" - CLOSED: rewritten to K2 H5 by W1-32, W1-34 and W0-15.
- Stale per-file logs: ScaleManager's 1.0.0 header over 1.2.0 code - CLOSED by W1-13 (TrueVision's 1.2.1 and its log, whole);
  History's second 1.3.0 - CLOSED by W0-06 (renumbered 1.4.1); SheetChrome 1.8.0 and LeaderGeometry 1.1.0 - OPEN: their
  whole-file takes are W1-26's, which did not run in this wave.
- The rows that said "this tree has no PWA worker" (the eleven S03b names, among W0-06's twenty) - CLOSED: each Archive row
  carries W0-06's dated correction, and no live row says it.
- The QR folder name - CLOSED: the Archive row carries W0-06's correction (TrueVision's QR system is
  LE/53__Feature__ProjectQrCode), and the folder exists here since v2.71.2 (W1-15).
- TrueVision's halves of both packages are queued for WT-08 in section 7.
''')

S3_NOTE = W('''
**Refreshed 02-Oct-2026 by W1-99 (ValeVision3D v2.71.2).** "Blocked by" now comes from the same analysis re-run on the
end-of-Wave-1 working tree (`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/scratch/W1-99/pom/port_order_map__endW1.json`;
the end-of-Wave-0 values stay in W0-99's map). Wave 1 cleared the blockers of {cleared} more TrueVision modules (`none`
{none0} -> {none1}; lists {list0} -> {list1}). Three modules left the map's prerequisite closure once Wave 1 gave them the
names other modules need from them (RenameDrawing, Invalidation and the door module); nothing blocks them, so their cells
keep `none`. Rows
Wave 1 changed carry their new state with the old kept as "[was: ...]", and the TrueVision-only rows of 3.5 that landed now
name their ValeVision path; section 3.8 lists the changes by package.
''')

WM_INTRO = W('''
- **After Wave 1 (ValeVision3D v2.71.2, 02-Oct-2026; W1-99).** Four releases became PORTED: v2.38.1 (the ortho depth bias),
  v2.83.0 (the first-open veil, now whole), v2.103.0 (the supersampler clamp and the fog shader) and v2.124.0 (the slimmed
  toolbar). Thirty-six more are now PARTIAL, most of them as inert leaves that later packages wire, each row saying what
  landed and what waits: 28 from NOT-CONSIDERED, 6 from PENDING-SIGNOFF (v2.42.0, v2.49.0, v2.82.0, v2.86.0, v2.87.0,
  v2.107.0) and 2 from REOPENED (v2.32.0, v2.71.0). Seven rows already PARTIAL gained more (v2.39.0, v2.84.0, v2.95.0,
  v2.115.0, v2.116.0, v2.146.0, v2.155.0), and dated notes on 17 more record names, argument positions or files Wave 1
  took with no change of class. The newest fully ported release is now v2.124.0; the low-water stays v2.28.0. Twelve
  Wave 1 packages did not run (section 3.8), so several rows still wait on a package of this wave. The only TrueVision
  release Adam has confirmed that Wave 1 carried is v2.155.0's PDF exporter fix; every other release it carried is named as
  unconfirmed in the v2.71.2 devlog entry (DR-01 (c)).
''')

S51_NOTE = W('''
- **02-Oct-2026 note (W1-99).** Wave 1 (ValeVision3D v2.71.2) also ran on every default: no answer to DR-01..DR-44 or the
  seven questions arrived. DR-40 items 7-10 stay held (MeasureParse's Array landed with no caller; the guards are W3-03's).
  Choices made inside packages, for Adam's eye: W1-04 kept TrueVision's ReturnToOrbit body, proven equal to the planned
  SetOrbitMode exit (keep it, recommended, or restore the seam); W1-33 met DR-39's part 3 with TrueVision's own
  once-per-session first-open veil, so the loader never waits on WaitForFirstDrawing (D79 names the older design); W1-33's
  viewer guard leaves the live site's first drawing uncovered until W4-09 (a one-line seam, or hold the live deploy - to be
  decided before Wave 1 is deployed); W1-35 took TrueVision's whole MarginNotes description, its leaderless clause included;
  W1-34's drawing rows carry the drag without the old rename hover; W1-17's Patterns stylesheet waits for an orchestrator
  correction (move it to W2-29); module versions follow the patch-step rule (the loader 1.1.3, the mode controller 1.18.3,
  the toolbar 1.9.4) where the audit's titles say "1.2", "1.19.0" or "1.10.0".
''')

LOADER_NOTE = (' **[02-Oct-2026 note (W1-99): aligned - W1-31 rewrote the Loader\'s and the LoadingScreen\'s PORT NOTE '
               'Back-port lines to this status in ValeVision3D v2.71.2]**')

S6_OFFERS = W('''

**Offers raised by Wave 1 (02-Oct-2026, ValeVision3D v2.71.2; W1-99).** None happens on DR-42's default and TrueVision is
not edited (DR-36 (a)); each is recorded so the TrueVision lane can take it with Adam's approval.

| Item | ValeVision source | Status in TrueVision (02-Oct-2026) | Evidence | Next |
|---|---|---|---|---|
| Dispatch `na-model-visibility-changed` when a model category is shown or hidden | `26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js` 1.2.3 (kept by W1-01, K2 E3) | OPEN - TrueVision's pipeline and snapshot renderer listen for it, and nothing in TrueVision dispatches it | W1-01 Port Record; WP-S09-14; S02b-V01 | WT-12 (held) |
| Prepare the re-stamp before anything is written when a drawing is renamed | `40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js` 1.1.0 (W1-06; the loader route, C.4 S23) | OPEN - TrueVision imports the stamper lazily after the first write | W1-06 Port Record | no package yet (DR-42) |
| Exclusion tokens trimmed and empty ones dropped on save | `42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js` 1.1.0 (a W1-08 seam) | OPEN - TrueVision stores the list as typed; its style rows have no caller yet | W1-08 Port Record; W1-10 F3 (the elevation twin is W2-05's call) | no package yet (DR-42) |
| Let the North editor hear its panel closing by any route | `46__System__NorthDirection/Na__North__DevMenu__Editor__.js` 1.1.0 (TrueVision's code; the gap is in both apps) | OPEN - a compass shown only because its panel was open stays up after a sheet opens | W1-11 Port Record | no package yet (DR-42) |
| A document-code accessor beside the project code | `40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` Na__DrawData__GetDocumentCode (W1-12, DR-11) | OPEN - TrueVision's ?project= token is its code; exporting the same name there would remove five ValeVision seams | W1-12 Port Record | WT-10 / WT-11 (held; DR-42) |
| The dead `.na-le-tabs__tab--spec` rule | `51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css` (removed by W1-34) | OPEN - TrueVision's 2.0.0 strip names the tab --specification and still carries the rule | W1-34 Port Record; S03a-10 | WT-08 (held; section 7) |
''')

S7_ROWS = W('''

**Added 02-Oct-2026 by the Wave 1 Parity Scribe (W1-99, ValeVision3D v2.71.2)**: the TrueVision halves of the audit's
WP-S03a-10 and WP-S03b-12, and the TrueVision-side notes in Wave 1's Port Records. Items marked "config" change what
TrueVision does and need a TrueVision-lane package beyond WT-08's comment-only remit, each with Adam's approval.

| TrueVision record | What it says | What is true on 02-Oct-2026 | Draft wording for WT-08 |
|---|---|---|---|
| `LE/03/Na__LayoutEditor__AppConfig__.json:367-369` (config) | `LayoutEditor__Labels__MeasureOffsetAgain`, `MeasureNoOffsetSide` and `MeasureDimOffsetTitle` sit inside `LayoutEditor__Selection__Config` | GetLabel reads only the Labels block, so they are dead in TrueVision and the code fallbacks print; ValeVision has them in Labels | "Move the three into LayoutEditor__Labels__Config." (S03a-10) |
| `LE/50/Na__LayoutEditor__Styles__Specification__.css` and the label `SheetTabEditTitle` (config) | the `.na-le-tabs__tab--spec` rule and the label | Dead since TabStrip 2.0.0 (the tab is --specification; no row renames on a double-click); ValeVision removed the rule (W1-34) and keeps the label key, as TrueVision does | "Delete the dead rule; retire SheetTabEditTitle when the register owns renaming." (S03a-10) |
| `LE/70/Na__LayoutEditor__DevMenu__Controls__.js:25-29` PORT NOTE and the `NoSheets` fallback at `:207` | "verbatim"; "Add one from the Dev menu or the + tab." | ValeVision's copy is its own 1.4.1 (loader reads, the Layout Mode switch); TrueVision's own config reads "No sheets yet. New Sheet below makes the first; the tab strip and its Drawings menu appear with it." | "Parity : diverged - ValeVision's copy reads through its loader and adds the Layout Mode switch"; the fallback takes the config's words (ValeVision's did, W1-34). (S03a-10) |
| `LE/05/Na__LayoutEditor__ModeController__.js` DEVELOPMENT LOG | no entry for v2.155.0's viewer change (TV devlog :1334-1335 records it) | The change is in TrueVision's code | "Add the v2.155.0 entry." (S03a-10) |
| `LE/05/Na__LayoutEditor__LoadingVeil__.js:54` (in the Back-port row above) | "Back-port : PENDING" | ValeVision carries 1.1.0 whole since v2.71.2 (W1-33; two seams) | "Back-port : done - ValeVision v2.71.2 (whole; two seams)." |
| `LE/10/Na__LayoutEditor__SheetSurface__.js` DEVELOPMENT LOG | no entry for v2.155.0's ShowPublished | The export is in TrueVision's code | "Log ShowPublished under v2.155.0." (S03b-12) |
| `LE/15/Na__LayoutEditor__PaintOrder__.js` | no PORT NOTE block | ValeVision's copy carries one (W1-13) | "Add a PORT NOTE: authored in TrueVision3D first; ported whole to ValeVision v2.71.2." (S03b-12) |
| `LE/07/Na__LayoutEditor__SheetRecords__.js` DEVELOPMENT LOG | no entry for the 29-Sep-2026 edge fields (commit 55014c6a: LineTypeScale, FillHex) | In TrueVision's code; ValeVision takes them with SheetRecords 1.39.0 (W1-19) | "Log the 29-Sep-2026 fields." (S03b-12) |
| `TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` TD04 | Modern title block only | TrueVision keeps a Classic title block with a placeholder scan; ValeVision's Classic uses Vale's own scan (D26) | "TD04 revised: Classic kept, with a placeholder scan." (S03b-12) |
| `25/3dObjectIInteraction__Animation__ClickToOpenDoors__README__.md` and the module's OnPointerDown comment | an index.html integration sample; no V1.8.0 under Recent Changes; "LEFT BUTTON ONLY (v1.5.0)" | Both apps start their doors from the loading sequence; the left-button rule is 1.8.0 | "Point Main App Integration at the loading sequence; add V1.8.0; the comment names 1.8.0." (W1-02) |
| `05/Na__RenderEffect__Supersampler__.js` header; the realign plan's row X | neither v2.56.0's present(target, scale) (taken from ValeVision) nor v2.103.0's clamp is logged; row X "ValeVision port: Pending" | Both are in the code; ValeVision logs the clamp (W1-03) and carries the depth bias (v2.71.2) | "Add both log entries" (WP-S02b-10R item 3); row X: "x - ValeVision v2.71.2". (W1-03) |
| `49/Na__ElevationDepthFog__Shader__.js` header | no entry for v2.103.0's premultiplied layer | In the code; ValeVision logs it (W1-09) | "Add the v2.103.0 entry." (W1-09) |
| `40/Na__DrawView__Styles__DevMenu__.css`, `40/Na__DrawView__RowAccordion__.js`, `21/Na__PresentationMode__DevMenu__Modal__.js` | the Folded Drawing Row comment names `42__System__DrawingViewCore`; two "TrueVision only" comments; the modal's INTEGRATION lists SceneEditor and BatchOps only | The folder is 40 in both apps; both apps carry the code (W1-06); DevRowShell, DraftGuard and AutoSave consume the modal too | "40"; drop "TrueVision only"; list every consumer. (W1-06) |
| `45/Na__Elevation__ProjectJson__Data__.js` DESCRIPTION and INTEGRATION | the pre-v2.21.0 nested storage and the whole-presentation-block save | Records live in LayoutEditor__DrawingsData since v2.21.0 and save through Na__DrawData__Save | "Describe today's storage and save." (W1-10) |
| TrueVision's devlog for commit b6baf301 (19-Sep-2026) and PdfExporter 1.4.0 (14-Sep-2026) | no release entry of their own | Register__Numbering 1.0.1 and the exporter's options and LoadLibrary split are in both apps (W1-13, W1-24) | Named in the one TV devlog records note above. (W1-13, W1-24) |
| `36/Na__LayoutEditor__HatchPatterns__.js`; the library's `HatchLibrary__Index__.json` | no PORT NOTE block; Meta__EmptyPacks names folders that exist only on Adam's TrueVision disk | ValeVision's copy carries a PORT NOTE (W1-17) | "Add a PORT NOTE; reword Meta__EmptyPacks." (W1-17; S05b b10) |
| `35/Na__LayoutEditor__LineStyleTool__.js` and `35/Na__LayoutEditor__GradientTool__.js` PORT NOTEs | LineStyleTool holds the ValeVision port for sign-off; GradientTool names ValeVision's pre-v2.55 path and 1.0.0, and its 1.1.0 log ends "not in ValeVision" | ValeVision carries both at 1.1.0 since v2.71.2 (W1-18) | "Back-port : done - ValeVision v2.71.2." (W1-18) |
| `LE/03` AppConfig `LayoutEditor__TitleBlock__QrCellNote` | names the pre-v2.155.0 path `02__Src__AppModules/53__Feature__ProjectQrCode/` | The QR system is LE/53__Feature__ProjectQrCode in both apps; ValeVision carries TrueVision's note verbatim until W1-26 or the config's owner rewords it | "Point the note at 51__System__LayoutEditor/53__Feature__ProjectQrCode/." (S07a-F31; W1-15 F5) |
| The 124 TV files with "ValeVision : not yet ported" lines (row above) | not yet ported | Wave 1 ported about forty of them whole (section 3.8) | Updated from the Port Records, file by file, in WT-08's pass |
''')

S81_NOTE = W('''

**02-Oct-2026 note (W1-99, ValeVision3D v2.71.2).** The facade has more callers since Wave 1: ProjectData 1.6.0 saves through
`Na__CfApi__MergeAndSaveKeys` and `Na__CfApi__IsConfigured` and the local mirror's `MergeKeys` and `DrawingsFingerprint`, so
the local mirror is loaded on every project, and reads `Na__CfApi__GetLoadedProjectData` for the document code (W1-05,
W1-12); ProjectRecord reads the project root through `Na__CfApi__GetLoadedProjectData` (W1-12); the Sheet Images source asks
`Na__CfApi__SheetImageLocation` (W1-16, inert); the QR link reads ProjectLoader's master index for its key (W1-15, switched
off). No TrueVision transport was copied (gate G6: no `na-truevision-api`, `NaProjectPortal/` or `/r2/` route in ValeVision's
code). Wave 1 changed neither the local server, nor the worker, nor the editor-owned key list, and deployed nothing.
''')


def build(text_lines):
    lines = list(text_lines)
    reg = L.register_rows(lines)
    mods = BB.load_map()
    old_bb = {r['i']: r['cells'][11] for r in reg}

    # ---- Module Register flips ----------------------------------------------------
    flipped, seen = [], set()
    for r in reg:
        vv, tv = L.row_paths(r)
        key = vv or tv
        cells = list(r['cells'])
        spec = None
        if key in FLIPS:
            spec = FLIPS[key]
        elif tv in FLIPS and r['sub'] == '3.5':
            spec, key = FLIPS[tv], tv
        if spec:
            if key in seen:
                raise SystemExit('two register rows for %s' % key)
            seen.add(key)
            for col, fn in spec.items():
                cells[col] = fn(cells[col])
            flipped.append(key)
        r['cells'] = cells
    missing = set(FLIPS) - seen
    if missing:
        raise SystemExit('flip keys not found in the register: %s' % sorted(missing))

    # ---- Blocked by: the end-of-Wave-1 map --------------------------------------------
    bb = BB.compute(reg, mods)
    kept_none = []
    for r in reg:
        new = bb[r['i']]
        if new == '-' and old_bb[r['i']] == 'none':
            new = 'none'                                   # left the map's closure: nothing blocks it
            kept_none.append(r['cells'][0] if not r['cells'][0].startswith('-') else r['cells'][1])
        r['cells'][11] = new
        lines[r['i']] = L.join_row(r['cells'])
    if len(kept_none) != 3:
        raise SystemExit('expected 3 rows to keep none, got %d: %s' % (len(kept_none), kept_none))
    kinds0 = collections.Counter('none' if v == 'none' else '-' if v == '-' else 'list' for v in old_bb.values())
    kinds1 = collections.Counter('none' if r['cells'][11] == 'none' else '-' if r['cells'][11] == '-' else 'list'
                                 for r in reg)
    s3 = [x.format(cleared=kinds1['none'] - kinds0['none'], none0=kinds0['none'], none1=kinds1['none'],
                   list0=kinds0['list'], list1=kinds1['list']) for x in S3_NOTE]

    # ---- 3.8 before the '---' that closes section 3 ---------------------------------------
    i4 = lines.index('## 4. Release Watermark')
    j = i4 - 1
    while lines[j] != '---':
        j -= 1
    assert lines[j - 1] == '' and lines[j - 2].startswith('| W0-99 | 56 release placeholders resolved')
    lines[j - 1:j - 1] = [''] + S38
    # ---- section 3: the dated note after W0-99's "Filled" note ------------------------------
    k = [n for n, ln in enumerate(lines) if ln.startswith('**Filled 01-Oct-2026 by W0-99 (ValeVision3D v2.71.1).** "Blocked by"')]
    assert len(k) == 1
    k = k[0]
    e = k
    while lines[e] != '':
        e += 1
    assert lines[e - 1].startswith('register 610; section 3.7 lists the changes by package.')
    lines[e:e] = [''] + s3

    # ---- Release Watermark ---------------------------------------------------------------
    i4 = lines.index('## 4. Release Watermark')
    i5 = lines.index('## 5. Decisions')
    done, flips = set(), collections.Counter()
    for n in range(i4, i5):
        ln = lines[n]
        if not ln.startswith('| v2.'):
            continue
        c = L.split_row(ln)
        ver = c[0].split()[0]
        if ver not in WM:
            continue
        spec = WM[ver]
        if 'cls' in spec:
            old_cls = c[4].strip('*')
            new_cls = spec['cls']
            if old_cls == new_cls:
                raise SystemExit('%s: class already %s' % (ver, new_cls))
            flips[(old_cls, new_cls)] += 1
            c[4] = '**%s**' % new_cls if new_cls != 'PORTED' else new_cls
        if 'vv' in spec:
            assert c[5] == '-', (ver, c[5])
            c[5] = spec['vv']
        if 'vv_app' in spec:
            c[5] = app(c[5], spec['vv_app'])
        if 'pk' in spec:
            have = [p.strip() for p in c[6].split(',') if p.strip() and p.strip() != '-']
            c[6] = ', '.join(have + [p for p in spec['pk'] if p not in have])
        c[10] = note(spec['note']) if c[10].strip() in ('', '-') else c[10].rstrip() + ' ' + note(spec['note'])
        lines[n] = L.join_row(c)
        done.add(ver)
    if set(WM) - done:
        raise SystemExit('watermark versions not found: %s' % sorted(set(WM) - done))
    if dict(flips) != EXPECT_FLIP_COUNTS:
        raise SystemExit('class flips %r, expected %r' % (dict(flips), EXPECT_FLIP_COUNTS))
    # class counts after the flips (all rows of the table)
    counts = collections.Counter()
    for n in range(i4, i5):
        if lines[n].startswith('| v2.') or lines[n].startswith('| (unnumbered'):   # 173 releases + 4 unlogged features
            counts[L.split_row(lines[n])[4].strip('*')] += 1
    if sum(counts.values()) != 177:
        raise SystemExit('watermark rows counted: %d, expected 177' % sum(counts.values()))
    open_n = counts['PARTIAL'] + counts['PENDING-SIGNOFF'] + counts['NOT-CONSIDERED'] + counts['REOPENED']
    wm_counts = ['After Wave 1 (v2.71.2): PORTED %d, PARTIAL %d, PENDING-SIGNOFF %d, NOT-CONSIDERED %d, REOPENED %d (the 40'
                 % (counts['PORTED'], counts['PARTIAL'], counts['PENDING-SIGNOFF'], counts['NOT-CONSIDERED'],
                    counts['REOPENED']),
                 'rows the bullet above names moved); every other class unchanged; open **%d**.' % open_n]
    # intro bullet after W0-99's bullet
    k = [n for n, ln in enumerate(lines) if ln.startswith('- **After Wave 0 (ValeVision3D v2.71.1, 01-Oct-2026; W0-99).**')]
    assert len(k) == 1
    e = k[0] + 1
    while lines[e].startswith('  '):
        e += 1
    assert lines[e] == '' and lines[e - 1].startswith('  v2.116.0 and v2.155.0 in part')
    lines[e:e] = WM_INTRO
    k = [n for n, ln in enumerate(lines) if ln.startswith('After Wave 0 (v2.71.1): PARTIAL 17 and NOT-CONSIDERED 74')]
    assert len(k) == 1 and lines[k[0] + 1].startswith('v2.155.0 moved); every other class unchanged; open still **112**.')
    assert lines[k[0] + 2] == ''
    lines[k[0] + 2:k[0] + 2] = [''] + wm_counts

    # ---- 1.4, 2.1, 2.3 ----------------------------------------------------------------
    k = [n for n, ln in enumerate(lines) if ln.startswith('- **Wave 0 (ValeVision3D v2.71.1, 01-Oct-2026; W0-99).** The wave')]
    assert len(k) == 1
    e = k[0] + 1
    while lines[e].startswith('  '):
        e += 1
    assert lines[e] == '' and lines[e + 1] == '### 1.5 How this file is kept'
    lines[e:e] = S14_BULLET
    k = lines.index('| 91 | - | - | `91__System__2dElevationsView` | ValeVision legacy, moved from 40 by W0-02; retires with W6-03 |')
    assert lines[k + 1] == '' and lines[k + 2] == '### 2.2 Folder renumbering (01-Oct-2026)'
    lines[k + 1:k + 1] = [''] + S21_NOTE
    k = lines.index('### 2.3 Layout Editor subfolders')
    e = k + 2
    while lines[e] != '':
        e += 1
    assert lines[e - 1].startswith('their packages run. The registry')
    lines[e:e] = [''] + S23_NOTE

    # ---- 5.1 ---------------------------------------------------------------------------
    k = lines.index('### 5.2 D01 to D40, as they stand on 01-Oct-2026')
    assert lines[k - 1] == '' and lines[k - 2].startswith('  questions arrived during the wave. DR-40 items 7-10 stay held')
    lines[k - 1:k - 1] = S51_NOTE

    # ---- 6: the loader row's note, then Wave 1's offers ---------------------------------------
    k = [n for n, ln in enumerate(lines) if ln.startswith('| **The lazy Layout Editor loader** |')]
    assert len(k) == 1
    c = L.split_row(lines[k[0]])
    assert c[4].endswith('the next package that writes the Loader (W1-31) aligns it')
    c[4] = c[4] + LOADER_NOTE
    lines[k[0]] = L.join_row(c)
    loader_row = lines[k[0]]
    k = lines.index('## 7. TrueVision-side records waiting for the TrueVision lane')
    j = k - 1
    while lines[j] != '---':
        j -= 1
    assert lines[j - 1] == '' and lines[j - 2].startswith('| Published and statement routes:')
    lines[j - 1:j - 1] = [''] + S6_OFFERS

    # ---- 7 rows after the WT-08 table ---------------------------------------------------
    k = lines.index('## 8. Transport (DIV-4)')
    j = k - 1
    while lines[j] != '---':
        j -= 1
    assert lines[j - 1] == '' and lines[j - 2].startswith('| `TrueVision__NOTES__FolderNumberRegistry__.md` |')
    lines[j - 1:j - 1] = [''] + S7_ROWS

    # ---- 8.1 note after "Callers today" ---------------------------------------------------
    k = [n for n, ln in enumerate(lines) if ln.startswith('Callers today: `Na__AppFlow__LoadingSequence.js` (start-up')]
    assert len(k) == 1
    e = k[0]
    while lines[e] != '':
        e += 1
    assert lines[e - 1].startswith('the real server.py among them).')
    lines[e:e] = [''] + S81_NOTE
    return lines, flipped, dict(flips), counts, open_n, kinds0, kinds1, loader_row


def checks(old_lines, new_lines, loader_row):
    old_t = '\r\n'.join(old_lines)
    new_t = '\r\n'.join(new_lines)
    new_t.encode('ascii')
    for ln in new_lines:
        assert '\r' not in ln and '\n' not in ln
    a_old = old_t[old_t.index('## 9. Archive'):]
    a_new = new_t[new_t.index('## 9. Archive'):]
    assert a_old == a_new, 'Archive changed'
    assert old_t[:old_t.index('## 1. Header')] == new_t[:new_t.index('## 1. Header')]
    stop = new_lines.index(ARCHIVE_HEAD)
    cur, bad = None, []
    for n, ln in enumerate(new_lines[:stop]):
        if ln.startswith('| ') and n + 1 < len(new_lines) and new_lines[n + 1].startswith('|---'):
            cur = len(L.split_row(ln))
            continue
        if ln.startswith('|---'):
            continue
        if ln.startswith('| '):
            if cur is None or len(L.split_row(ln)) != cur:
                bad.append((n + 1, len(L.split_row(ln)), cur))
        elif not ln.startswith('|'):
            cur = None
    assert not bad, 'table rows with the wrong column count: %r' % bad[:5]
    cur, bad = None, []
    for n, ln in enumerate(new_lines[:stop]):
        if ln.startswith('| ') and n + 1 < len(new_lines) and new_lines[n + 1].startswith('|---'):
            cur = ln.count('|')
            continue
        if ln.startswith('| ') and ln.count('|') != cur:
            bad.append((n + 1, ln.count('|'), cur))
    assert not bad, 'table rows with a bare pipe in a cell: %r' % bad[:5]
    reg = L.register_rows(new_lines)
    assert len(reg) == 610, len(reg)
    assert all(r['cells'][11] for r in reg), 'an empty Blocked by cell'
    old_stop = old_lines.index(ARCHIVE_HEAD)
    in_tables = lambda ln: ln.startswith('| ') and not ln.startswith('|---')
    keep = [ln for ln in old_lines[:old_stop] if not in_tables(ln)]
    it = iter(new_lines[:stop])
    lost = [ln for ln in keep if not any(ln == x for x in it)]
    assert not lost, 'old lines lost or reordered: %r' % lost[:3]
    new_set = set(new_lines[:stop])
    changed = [ln for ln in old_lines[:old_stop] if in_tables(ln) and ln not in new_set]
    reg_old = {L.join_row(r['cells']) for r in L.register_rows(old_lines)}
    wm_old = {ln for ln in changed if ln.startswith('| v2.') and ln.split(' | ')[0][2:].split()[0] in WM}
    loader_old = {ln for ln in changed if ln.startswith('| **The lazy Layout Editor loader** |')}
    unplanned = [ln for ln in changed if ln not in reg_old and ln not in wm_old and ln not in loader_old]
    assert not unplanned, 'table rows changed outside the plan: %r' % [u[:90] for u in unplanned[:3]]
    assert len(loader_old) == 1 and loader_row in new_set
    # every old register row that changed is a planned flip or a Blocked by refresh
    print('checks: ASCII, CRLF, Archive identical, preamble identical, column counts, no bare pipes, 610 register rows, '
          'every Blocked by filled, %d old table rows rewritten (%d register, %d watermark, %d section 6), every other old '
          'line kept in order' % (len(changed), len([c for c in changed if c in reg_old]), len(wm_old), len(loader_old)))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--build'
    if mode == '--restore':
        cur = open(L.LEDGER, 'rb').read()
        if sha1(cur) != sha1(open(CAND, 'rb').read()):
            raise SystemExit('REFUSED: the ledger is not this pass\'s output (%s)' % sha1(cur)[:8])
        open(L.LEDGER, 'wb').write(open(PRE, 'rb').read())
        print('restored the ledger to', sha1(open(PRE, 'rb').read())[:8])
        return
    cur = open(L.LEDGER, 'rb').read()
    if sha1(cur) != EXPECT:
        raise SystemExit('REFUSED: the ledger is at %s, expected W0-99\'s %s' % (sha1(cur)[:8], EXPECT[:8]))
    old_lines = L.read_lines()
    new_lines, flipped, flips, counts, open_n, k0, k1, loader_row = build(old_lines)
    checks(old_lines, new_lines, loader_row)
    out = '\r\n'.join(new_lines).encode('ascii')
    open(CAND, 'wb').write(out)
    print('register rows flipped: %d; watermark flips %r; classes now %r; open %d' % (len(flipped), flips, dict(counts),
                                                                                    open_n))
    print('Blocked by: end of W0 %r -> end of W1 %r' % (dict(k0), dict(k1)))
    print('candidate: %d -> %d lines, %d -> %d bytes, sha1 %s' % (len(old_lines), len(new_lines), len(cur), len(out),
                                                                sha1(out)[:8]))
    if mode == '--apply':
        os.makedirs(os.path.dirname(PRE), exist_ok=True)
        open(PRE, 'wb').write(cur)
        tmp = L.LEDGER + '.w1-99.tmp'
        open(tmp, 'wb').write(out)
        if sha1(open(L.LEDGER, 'rb').read()) != EXPECT:
            os.remove(tmp)
            raise SystemExit('STOPPED: the ledger changed while the candidate was built')
        os.replace(tmp, L.LEDGER)
        print('written; live sha1', sha1(open(L.LEDGER, 'rb').read())[:8])


if __name__ == '__main__':
    main()
