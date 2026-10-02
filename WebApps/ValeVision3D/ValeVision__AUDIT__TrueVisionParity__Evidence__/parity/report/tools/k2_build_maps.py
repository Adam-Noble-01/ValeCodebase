#!/usr/bin/env python3
"""K2 - build and validate the canonical target maps.

Writes
  parity/data/target_folder_map.json   one row per folder (scopes: top, le_sub, root_content, style)
  parity/data/file_rename_map.json     one row per VV file / folder that is renamed, moved, merged,
                                       retired or answered by a VV-bodied shim at TV's path
and fills the generated tables of parity/report/K2__TargetMaps.md between
<!-- BEGIN:K2:<name> --> / <!-- END:K2:<name> --> markers.

Every importer list is measured from the live trees by k2_refscan.scan (READ-ONLY);
file and line counts come from parity/ref/tree_*.tsv; decision ids are checked
against parity/data/decisions.json; every proposed VV number is checked against
TrueVision's current folder list AND every folder name TrueVision's devlog has
ever used (s01work/tv_devlog_foldernames.txt).

Rows assume Adam accepts the recommended decisions; every row that depends on a
decision lists the raw decision ids (K1 consolidates them).
"""
import csv, json, os, re, subprocess, sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import k2_refscan as RS  # noqa: E402

PAR = os.path.normpath(os.path.join(HERE, '..', '..'))
DATA = os.path.join(PAR, 'data')
REF = os.path.join(PAR, 'ref')
REPORT = os.path.join(PAR, 'report')
VV = RS.VV
TV = RS.TV
M = '02__Src__AppModules'
LE = M + '/51__System__LayoutEditor'

ACTIONS_FOLDER = {'keep', 'renumber', 'rename', 'move', 'merge', 'retire', 'add', 'add_later'}
SCOPES = {'top', 'le_sub', 'root_content', 'style'}
KINDS_FILE = {'rename', 'move', 'merge', 'retire', 'shim'}


# -----------------------------------------------------------------------------
# reference data
# -----------------------------------------------------------------------------
def load_tree(name):
    out = {}
    with open(os.path.join(REF, name), encoding='utf-8') as f:
        for r in csv.DictReader(f, delimiter='\t'):
            out[r['relpath'].replace(chr(92), '/')] = int(r['lines'] or 0)
    return out


TREE = {'vv': load_tree('tree_vv.tsv'), 'tv': load_tree('tree_tv.tsv')}
DECISIONS = {r['id'] for r in json.load(open(os.path.join(DATA, 'decisions.json'), encoding='utf-8'))}
_K1_MAP = os.path.join(DATA, 'decision_raw_map.json')
RAW2DR = json.load(open(_K1_MAP, encoding='utf-8')).get('raw_id_map', {}) if os.path.exists(_K1_MAP) else {}
FINDINGS = {r['id'] for r in json.load(open(os.path.join(DATA, 'findings_verified.json'), encoding='utf-8'))}
WPS = {r['id'] for r in json.load(open(os.path.join(DATA, 'work_packages.json'), encoding='utf-8'))}
TV_TOP = sorted(d for d in os.listdir(os.path.join(TV, M)) if os.path.isdir(os.path.join(TV, M, d)))
VV_TOP = sorted(d for d in os.listdir(os.path.join(VV, M)) if os.path.isdir(os.path.join(VV, M, d)))
TV_LE = sorted(d for d in os.listdir(os.path.join(TV, LE)) if os.path.isdir(os.path.join(TV, LE, d)))
VV_LE = sorted(d for d in os.listdir(os.path.join(VV, LE)) if os.path.isdir(os.path.join(VV, LE, d)))
TV_HISTORY_FOLDERS = []
for ln in open(os.path.join(PAR, 's01work', 'tv_devlog_foldernames.txt'), encoding='utf-8'):
    parts = ln.strip().split('\t')
    if len(parts) == 2:
        TV_HISTORY_FOLDERS.append(parts[1])


def stats(app, prefix):
    t = TREE[app]
    if prefix.endswith('/'):
        fs = [p for p in t if p.startswith(prefix)]
    else:
        fs = [p for p in t if p == prefix]
    return [len(fs), sum(t[p] for p in fs)]


def num(folder):
    m = re.match(r'^(\d\d)__', folder or '')
    return m.group(1) if m else None


# -----------------------------------------------------------------------------
# importer measurement (live, read-only)
# -----------------------------------------------------------------------------
_scan_cache = {}


def scan(patterns, app='vv'):
    key = (tuple(patterns), app)
    if key not in _scan_cache:
        _scan_cache[key] = RS.scan(list(patterns), app, app == 'vv', True)
    return _scan_cache[key]


def importer_summary(pattern, app='vv', exclude_prefix=None, top=10):
    res = scan([pattern], app)[pattern]
    files, refs, kinds = 0, 0, defaultdict(int)
    rows = []
    for f, r in sorted(res.items()):
        if set(r['kinds']) == {'history'}:
            continue
        live_lines = [ln for ln in r['lines'] if ln[1] != 'history']
        files += 1
        refs += len(live_lines)
        for ln in live_lines:
            kinds[ln[1]] += 1
        rel = f.split('/', 1)[1] if f.startswith(('VV/', 'TV/')) else f
        inside = bool(exclude_prefix) and rel.startswith(exclude_prefix)
        code_lines = sorted({ln[0] for ln in live_lines if ln[1] in ('import', 'css', 'string')})
        cmt_lines = sorted({ln[0] for ln in live_lines if ln[1] == 'comment'})
        rows.append((len(live_lines), rel, code_lines, cmt_lines, inside))
    rows.sort(key=lambda x: (-x[0], x[1]))
    main = []
    for n, rel, code, cmt, inside in rows:
        s = rel
        if code:
            s += ':' + ','.join(map(str, code[:12])) + ('...' if len(code) > 12 else '')
        if cmt:
            s += ' (comments :' + ','.join(map(str, cmt[:6])) + ('...' if len(cmt) > 6 else '') + ')'
        if inside:
            s += ' [inside]'
        main.append(s)
    hist = sorted(f.split('/', 1)[1] for f, r in res.items() if 'history' in r['kinds'])
    return {
        'files': files,
        'refs': refs,
        'by_kind': dict(kinds),
        'inside_folder_files': sum(1 for x in rows if x[4]),
        'main': main[:top] if top else main,
        'all_files': [x[1] for x in rows],
        'history_docs_not_edited': hist,
    }


def importer_list(pattern, app='vv'):
    s = importer_summary(pattern, app, top=0)
    return s['main']


# -----------------------------------------------------------------------------
# row builders
# -----------------------------------------------------------------------------
TF = []
FR = []


def tf(**kw):
    kw.setdefault('importers_to_update', {'files': 0, 'refs': 0, 'main': []})
    kw.setdefault('config_paths_to_update', [])
    kw.setdefault('decision_refs', [])
    kw.setdefault('evidence', [])
    kw.setdefault('work_packages', [])
    kw.setdefault('phase', '-')
    TF.append(kw)


def fr(**kw):
    kw.setdefault('importers', [])
    kw.setdefault('decision_refs', [])
    kw.setdefault('self_imports_to_fix', [])
    kw.setdefault('work_packages', [])
    kw.setdefault('evidence', [])
    FR.append(kw)


def topstats(row):
    cv, tv = row.get('current_vv'), row.get('tv_equivalent')
    row['vv_files_lines'] = stats('vv', cv) if cv else None
    row['tv_files_lines'] = stats('tv', tv) if tv else None


# ---- TOP LEVEL ---------------------------------------------------------------
RENUMBER = [
    ('42__System__DrawingViewCore', '40__System__DrawingViewCore', 'S01-F01'),
    ('43__System__FloorPlanViews', '42__System__FloorPlanViews', 'S01-F01'),
    ('44__System__PlanAnnotations', '43__System__PlanAnnotations', 'S02b-F01'),
    ('45__System__PlanDimensions', '44__System__PlanDimensions', 'S02b-F01'),
    ('46__System__ElevationViews', '45__System__ElevationViews', 'S01-F01'),
    ('47__System__NorthDirection', '46__System__NorthDirection', 'S11-F45'),
]
RENUMBER_DECISIONS = ['D-S01-01', 'D-S01-15', 'D-S02a-01', 'D-S09-02', 'D-S02b-V03']
RENUMBER_WPS = ['WP-S01-01R', 'WP-S02a-01']
CSS_INDEX = '03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css'
CSS_LINES = {'42__System__DrawingViewCore': 85, '43__System__FloorPlanViews': 86, '46__System__ElevationViews': 87,
             '47__System__NorthDirection': 88, '44__System__PlanAnnotations': 89, '45__System__PlanDimensions': 90}
EXTRA_CONFIG = {
    '42__System__DrawingViewCore': ['02__Src__AppModules/02__AppData/Na__AppConfig__Main.json:385 (DrawingView__Config__Description text names the folder)'],
    '47__System__NorthDirection': ['80__Testing__PrototypeEnvironment/Na__Test__NorthCompass__.test.mjs:53 (path segment \'47__System__NorthDirection\')',
                                   '02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__Config__.json:90 (description text)'],
}


def build_top():
    # VV folders, in number order, plus TV-only folders
    vv_rows = {
        '01__AppCore': ('keep', 'shared', 'Same name and number. VV-only Na__AppCore__GpuLifecycle__ / LoadWatchdog__ stay; TV-only Na__AppLoader__ProjectDataLoader__ is a TV placeholder - not ported (S12-F44). Na__AppFlow__LoadingSequence.js is the busiest importer of the renumbered folders (11 refs) and is edited by the W1 rewrite only.', [], ['S12-F44']),
        '02__AppData': ('keep', 'shared', 'Same name and number. The 3D hotkey dictionary file is renamed to TV\'s name in W1b (file_rename_map FR-13); VV-only Na__AppConfig__MaterialsLibrary.json stays.', ['D-S03a-03', 'D-S05a-04'], ['S01-F17', 'S03a-F30']),
        '03__AppUtils': ('keep', 'shared', 'Same name and number. Membership changes: SnapshotHistory__ renamed to TV\'s Na__AppUtils__SnapshotHistory.js (W1, FR-10); TV\'s KeyScope__ ported (S03a); Na__AppUtils__LocalProjectMirror__ added as a VV-bodied shim at TV\'s path (FR-17); Na__AppUtils__R2DrawingNotes__ retired after the spec transport port (FR-18). VV-only R2SaveProjectJson__, ResilientLoad__, LoadingOverlay__ and ValeVision__HotkeyHandler__ stay (the handler is kept apart from TV 10/Na__Hotkeys__Manager.js, D-S05a-04).', ['D-S02b-12R', 'D-S11-08', 'D-S09-04', 'D-S12-01', 'D-S05a-04'], ['S01-F19', 'S01-F14', 'S12-F22']),
        '04__MathUtils': ('keep', 'shared', 'Same name, number and file.', [], []),
        '05__RenderPipeline': ('keep', 'shared', 'Same name and number. Receives Na__RenderEffect__2dProfileLines__.js from the legacy folder (W1, FR-08: an Na__RenderEffect__* file sits with its family, TV keeps Na__RenderEffect__ProfileLines__ here) and Na__RenderEffect__DistanceCulling__.js from 02__Engine__MaxEngine/ (W1, FR-11, TV path). Gains TV\'s Na__RenderLoop__InteractiveOverlays__.js with the 47 port and Na__RenderLoop__IsPaused (export) in Invalidation. VV-only subfolders 01__Engine__PureEngine/ and 02__Engine__MaxEngine/ stay (VV dual engine, DIV-1).', ['D-S01-13', 'D-S01-07', 'D-S09-V02'], ['S01-F03', 'S01-F06', 'S01-V01']),
        '06__Scene__LightingEffects': ('keep', 'shared', 'Same name and number.', [], []),
        '07__Scene__EnvironmentEffects': ('keep', 'shared', 'Same name and number.', [], []),
        '10__NavigationAndCameras': ('keep', 'shared', 'Same name and number. TV-only Na__Hotkeys__Manager.js is NOT ported (VV keeps 03/Na__AppUtils__ValeVision__HotkeyHandler__.js, gated by KeyScope) unless Adam picks D-S05a-04 (b).', ['D-S05a-04'], ['S05a-F04', 'S11-V08']),
        '11__CameraUtils': ('keep', 'shared', 'Same name and number.', [], []),
        '15__ModelLoader': ('keep', 'shared', 'Same name and number.', [], []),
        '20__System__MaterialsSystem': ('keep', 'shared', 'Same name and number.', [], []),
        '21__System__PresentationMode': ('keep', 'shared', 'Same name and number. VV\'s split units (ScenePersistence__, SceneReorder__, SceneRowBuilders__) are deliberate (TV v2.68.2 accepted them).', [], ['S01-F65']),
        '25__System__3dObject__InteractionSystem': ('keep', 'shared', 'Same name and number. Gains TV\'s Na__DoorAnimation__FindDoorGroups.js and six Na__DoorAnim__* exports with the door-pose port (S01-V02).', ['D-S02b-02'], ['S01-V02', 'S01-F24']),
        '26__System__ToggleModelElements': ('keep', 'shared', 'Same name and number. TV-only design-phase layer (Na__ModelGroup__PhaseLibrary__.js etc.) follows D-S01-14 (a): stub or single-phase reduction at TV\'s names, no Design Phase menu.', ['D-S01-14', 'D-S09-07'], ['S01-V03']),
        '28__System__GridLineSystem': ('keep', 'vv_reserved', 'VV-only. Number 28 is free in TV\'s top level (TV uses 28 only as LE/28__System__ObjectSnap, a different scope). Reserve it in the shared registry (D-S01-05 a); no move.', ['D-S01-05'], ['S01-F58']),
        '29__System__FogPlaneSystem': ('keep', 'vv_reserved', 'VV-only. Free in TV. Reserve (D-S01-05 a). Two files are precached by the shared WCP service worker (logic :351-352), another reason not to move it.', ['D-S01-05'], ['S01-F58']),
        '30__System__ImageExport': ('keep', 'shared', 'Same name and number. Hosts the legacy Create Drawing entry (Na__UiFeature__ImageExport__Controls.js:364, :564-646, opens 35 at :627) until 35 is retired.', ['D-S09-10'], ['S09-F46']),
        '31__System__VideoStudio': ('keep', 'vv_reserved', 'VV-only. Free in TV. Reserve (D-S01-05 a).', ['D-S01-05'], ['S01-F58']),
        '35__System__PageLayoutSystem': ('retire', 'legacy_vv', 'VV legacy (Create Drawing / Layout View). TV retired its own copy (then at 90__System__PageLayoutSystem) in v2.155.0 (TV DEVLOG:1287-1290) after moving jsPDF, html2canvas and the Classic scan out. VV does the same: W2 copies jspdf.umd.js to 04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/ (FR-19) and Vale\'s own scan to 01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/ (FR-20); W3 removes the folder, the Create Drawing button (index.html:354, overlay :215) and its handler (ImageExport Controls :564-646) once Adam confirms the Layout Editor covers it. Number 35 stays VV-reserved and is never reused.', ['D-S01-02', 'D-S09-10', 'D-S03b-10'], ['S01-F05', 'S08-F20', 'S09-F03', 'S09-F04', 'S09-F46']),
        '41__System__CrossSectionView': ('keep', 'shared_number_div2', 'Same number and role as TV 41__System__SectionCutEngine, different engine (DIV-2). Keep VV\'s name: renaming the folder would resolve none of TV\'s 16 import statements into 41 (14 in 12 TV code files, 2 in Index.html), because every file name differs (Na__SectionCut__* vs Na__CrossSectionView__*). Add 41__System__CrossSectionView/README__CrossSectionView__.md naming the twins and TV\'s 48__System__CrossSectionViews. Ported files reach the engine through 40/Na__DrawView__SectionAdapter__.js (the seam); TV\'s three direct 41 imports in LE SnapshotRenderer stay a seam until the D-S01-04 back-port.', ['D-S01-09', 'D-S01-04', 'D-S12-V02'], ['S01-F04', 'S01-F22', 'S01-F64']),
        '50__System__ProjectedLinework': ('keep', 'shared', 'Same name and number (fixed by both plans). TV-only DoorPose__, FlushJoins__, Storeys__ are ported in place (S02b).', ['D-S02b-01', 'D-S02b-02'], ['S02b-F04']),
        '51__System__LayoutEditor': ('keep', 'shared', 'Same name and number; subfolders mapped in scope le_sub.', [], ['S01-F01']),
        '60__Feature__FullScreenMode': ('keep', 'vv_reserved', 'VV-only number for the same feature TV keeps at 76__System__FullscreenMode (different implementation). Keep VV\'s for drawing parity (D-S10-07 b); reserve 60. If Adam adopts TV 76 (D-S10-07 a) the folder is retired and TV 76 ported at its own number.', ['D-S10-07', 'D-S01-05'], ['S01-F59', 'S10-F27']),
        '61__Feature__ShareProjectLink': ('keep', 'vv_reserved', 'VV-only. Free in TV. Reserve. Natural VV host for document share URLs (D-S01-10 option a, D-S08-05).', ['D-S01-05', 'D-S01-10'], ['S01-F36']),
        '62__Feature__EmailWorkers': ('keep', 'collision_deferred', 'VV-only, but 62 is TV\'s (and WCP\'s) 62__Feature__AppInstallability. Nothing ports across the number (VV uses WCP\'s PWA, never TV 62), so the collision is nominal: record it and keep 62 (DR-03: recommendation "keep 62 for now", default "62 unchanged"). The move to 92__Feature__EmailWorkers (FR-22) runs only if Adam asks (D-S01-08 (a); K3 W6-03), and only after its 1,857 tracked node_modules files are untracked (1,877 tracked files in the folder; BUILD__Deploy__EmailWorker.bat.lnk holds an absolute path Adam must re-point).', ['D-S01-08', 'D-S01-05'], ['S01-F57', 'S01-F58']),
        '63__Feature__AppNotificationEmail': ('keep', 'vv_reserved', 'VV-only. Free in TV. Reserve.', ['D-S01-05'], ['S01-F58']),
        '64__Feature__BreadcrumbNav': ('keep', 'vv_reserved', 'VV-only. Free in TV. Reserve. It already reads projectJson.projectName - the source for the project-display-name accessor that replaces window.TrueVision__Pwa__ProjectContext (S01-V04).', ['D-S01-05'], ['S01-F58', 'S01-V04']),
        '69__System__SketchUpToValeVision__Utilities': ('keep', 'vv_reserved', 'VV-only. Free in TV. Reserve.', ['D-S01-05'], ['S01-F58']),
        '70__System__DevTools': ('keep', 'shared', 'Same name and number.', [], []),
        '71__System__ExportRenderLayers': ('keep', 'vv_reserved', 'VV-only. Free in TV. Reserve.', ['D-S01-05'], ['S01-F58']),
    }
    i = 0
    for folder in VV_TOP:
        i += 1
        rid = 'TF-T%02d' % i
        cur = M + '/' + folder + '/'
        if folder == '40__System__2dElevationsView':
            row = dict(id=rid, scope='top', current_vv=cur, target_vv=M + '/91__System__2dElevationsView/',
                       tv_equivalent=None, action='renumber', numbering='legacy_vv',
                       reason=('VV legacy Tools > Elevation View sits on TV\'s 40 (DrawingViewCore) and must vacate it first. '
                               '91 (not S02a\'s 39): the 9x band is the legacy band TV itself used (TV kept its legacy PageLayoutSystem at '
                               '90__System__PageLayoutSystem until v2.155.0, TV DEVLOG:1287), 91 has never been used by TV, and 39 sits inside '
                               'the 3x/4x ranges TV is still filling (TV took 47, 48, 49 in Sep-2026). Its 2dProfileLines file leaves first (FR-08). '
                               'Retirement of the tool itself is D-S01-02 (W3, FR-25).'),
                       phase='W1', decision_refs=['D-S01-13', 'D-S01-02', 'D-S02a-04', 'D-S09-10'],
                       evidence=['VV index.html:1375-1376 (imports), :519-526 (Tools menu), :1874, :2149', 'VV 40/Na__ElevationView__SystemLogic.js:47 (2dProfileLines import), :67 (config path)', 'TV TrueVision__DEVLOG__.md:1287', 'S01-F02', 'S02a-F02'],
                       work_packages=['WP-S01-01R', 'WP-S02a-01'])
            s = importer_summary('40__System__2dElevationsView', exclude_prefix=M + '/40__System__2dElevationsView/')
            row['importers_to_update'] = s
            row['config_paths_to_update'] = ['02__Src__AppModules/40__System__2dElevationsView/Na__ElevationView__SystemLogic.js:67 Na__Elev__CONFIG_PATH (becomes 91__.../Na__ElevationView__Config.json)']
            row['risk'] = 'Low: 6 live files; the 2dProfileLines specifier rewrite must run before the folder-name rewrite (k2_renumber_apply.py T1 before T7).'
            topstats(row)
            TF.append(row)
            continue
        ren = [x for x in RENUMBER if x[0] == folder]
        if ren:
            old, new, fid = ren[0]
            s = importer_summary(old, exclude_prefix=M + '/' + old + '/')
            row = dict(id=rid, scope='top', current_vv=cur, target_vv=M + '/' + new + '/', tv_equivalent=M + '/' + new + '/',
                       action='renumber', numbering='shared',
                       reason=('Same system as TV %s. Renumber so every TV file and test ports with unchanged specifiers: TV holds 175 import '
                               'specifiers (+6 CSS @imports, 17 path strings) into 40/42-46 across 92 files, and TV 47 DrawingPlanes collides '
                               'with VV 47 North under the current map. One atomic W1 change, executed by k2_renumber_apply.py, proven on a copy: '
                               '0 retired names left, both Verify harnesses and all 6 VV node tests pass, 70 drawing files pair with TV by identical path.') % new,
                       phase='W1', decision_refs=list(RENUMBER_DECISIONS) + (['D-S01-06', 'D-S02a-10'] if old == '42__System__DrawingViewCore' else []),
                       evidence=['TV TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md:304-322 (4.1 map this reverses)', 'VV ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md:53 (D05)', fid, 'S02a-F01', 'S09-F01', 'verify_s01/renumber_touch_verified.txt', 'k2work/renumber_sim_report.json'],
                       work_packages=list(RENUMBER_WPS))
            row['importers_to_update'] = s
            cfg = ['%s:%d @import' % (CSS_INDEX, CSS_LINES[old])]
            cfg += EXTRA_CONFIG.get(old, [])
            row['config_paths_to_update'] = cfg
            row['risk'] = ('High contention, low technical risk: index.html, LoadingSequence, the CSS index and LE hub files are hot for every later '
                           'package, so W1 lands alone and first. Service-worker hazard: returning users\' stale-while-revalidate JS cache can mix old '
                           'and new module URLs on the first load after deploy unless the shared token is bumped (D-S10-13).')
            topstats(row)
            TF.append(row)
            continue
        spec = vv_rows.get(folder)
        if not spec:
            raise SystemExit('no row spec for VV folder ' + folder)
        action, numbering, reason, decs, ev = spec
        tv_eq = M + '/' + folder + '/' if folder in TV_TOP else None
        if folder == '41__System__CrossSectionView':
            tv_eq = M + '/41__System__SectionCutEngine/'
        if folder == '60__Feature__FullScreenMode':
            tv_eq = M + '/76__System__FullscreenMode/'
        target = cur
        if action == 'retire':
            target = None
        # 62__Feature__EmailWorkers keeps 62 (DR-03); its optional move to 92 is FR-22 (K3 W6-03, only on request; H1).
        row = dict(id=rid, scope='top', current_vv=cur, target_vv=target, tv_equivalent=tv_eq, action=action, numbering=numbering,
                   reason=reason, decision_refs=decs, evidence=ev)
        if folder == '35__System__PageLayoutSystem':
            row['importers_to_update'] = importer_summary('35__System__PageLayoutSystem', exclude_prefix=cur)
            row['config_paths_to_update'] = ['LE AppConfig :105-108 ClassicScanAssets, :402 Pdf__JsPdfScriptPath', 'LE ConfigState__SheetSetup__.js:396 fallback', '80__Testing__PrototypeEnvironment/Na__Test__SpecificationPdf__.html:31', '80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html:70', '30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js:627']
            row['phase'] = 'W2 (extract) + W3 (retire)'
            row['risk'] = 'Medium: the two test pages and the ImageExport handler were missed by S01; W3 deletes a user-visible menu item (Adam\'s call).'
            row['work_packages'] = ['WP-S01-02', 'WP-S09-10']
        elif folder == '62__Feature__EmailWorkers':
            row['importers_to_update'] = importer_summary('62__Feature__EmailWorkers', exclude_prefix=cur)
            row['config_paths_to_update'] = [CSS_INDEX + ':65 @import', 'index.html:1382 import', 'CloudflareWorker/ wrangler project and BUILD__Deploy__EmailWorker.bat.lnk (absolute path, not text-checkable)']
            row['phase'] = 'W3 (only on request; K3 W6-03)'
            row['risk'] = 'None while 62 stays. If FR-22 runs: medium - 1,857 tracked node_modules files make the git mv heavy until untracked, and the .lnk deploy shortcut breaks silently.'
            row['work_packages'] = ['WP-S01-09']
        elif folder == '05__RenderPipeline':
            row['phase'] = 'W1 (receives two files)'
        elif folder == '03__AppUtils':
            row['phase'] = 'W1 (SnapshotHistory) + W2'
        else:
            row['risk'] = 'None (no path change).'
        row.setdefault('risk', 'Low.')
        topstats(row)
        TF.append(row)
    # TV-only folders
    tv_only = [
        ('27__System__ContextMenuSystem', 'add', 'W2 (with LE/52)', 'TV-only. LE/52 Statement Writer imports its Na__ContextMenuSystem__Ui__MenuRenderer__.js (Statement Page:159, Editor Figure), so the folder lands at TV\'s number with the Statement Writer port; the rest of TV\'s 3D right-click menu follows D-S10-11 (skip for drawing parity). Number 27 is free in VV.', ['D-S07b-01', 'D-S10-11'], ['S01-F12', 'S07b-F02', 'S10-F28']),
        ('47__System__DrawingPlanes', 'add', 'W2 (after W1)', 'TV-only (9 files). Lands at TV\'s number once W1 has vacated VV 47; adapted config tokens (VV category keys), IsPaused export and InteractiveOverlays first. Supersedes VV\'s FacePick/GizmoGrip wiring (files stay, as in TV).', ['D-S02a-01', 'D-S02a-11', 'D-S11-01'], ['S01-F06', 'S02a-F42', 'S11-V09']),
        ('48__System__CrossSectionViews', 'add', 'W2 (with the Dev-menu rebuild, WP-S02a-08/09)', 'TV-only 0.1.0 placeholder (1 file). Ported byte-for-byte with the Dev-menu rebuild (K1 DR-26): its DOM ids naCrossSectionDevItem/Toggle/Panel collide with VV 41\'s Cross Section Tool gate, so VV renames ITS OWN VV-only gate ids (VV index.html:855-866 and 41/Na__UiFeature__CrossSectionView__DevControls.js:79-83; no CSS uses them) - TV\'s file and ids stay untouched. If Adam declines the placeholder, D-S09-09 (a) applies: 48 stays free for it.', ['D-S02a-06', 'D-S09-09', 'D-S11-07'], ['S01-F07', 'S09-F47', 'S02a-F46']),
        ('49__System__ElevationDepthFog', 'add', 'W2 (after W1)', 'TV-only (8 files). Same number as TV (D-S02b-04 a), so Na__Test__ElevationDepthFog__ ports with no path edit. Its one RenderFrame call lands in VV\'s RenderPreset (DIV-1).', ['D-S02b-04'], ['S01-F08', 'S02b-F02', 'S02b-F41']),
        ('52__System__Layout__PublishedDocuments', 'add', 'W2 late (publishing wave, after its prerequisites)', 'TV-only published-document READER. Added with the publishing port (K1 DR-22 a: adopt TV\'s publishing and published-only viewer, after DR-06, DR-28, DR-29, DR-21, DR-11); VV\'s live viewer stays until then. Number 52 is free in VV top level.', ['D-S01-16', 'D-S08-01', 'D-S10-02'], ['S01-F09', 'S01-V06']),
        ('53__Data__Layout__PublishedSchema', 'add', 'W2 late (publishing wave)', 'TV-only shared contract (folder and file names, path builders). Lands with 52/65; its folder names are used verbatim under VaApps/Projects/<folderId>/ (D-S12-03 A, K1 DR-29).', ['D-S01-16', 'D-S12-03', 'D-S08-01'], ['S01-F09']),
        ('54__Feature__ColourPalette', 'add', 'W2', 'TV-only (6 files). Same number; stylesheet joins VV\'s CSS index (not the loader list) because 43 PlanAnnotations\' 3D-tab toolbar uses it.', ['D-S06b-01', 'D-S10-10'], ['S01-F10', 'S06b-F43', 'S10-F12']),
        ('55__Feature__SpellCheck', 'add', 'W2', 'TV-only (7 files). Same number; dictionary at VV/50__ValeVision__UserConfig/ValeVision__UserSpellings__.json with a WCP blueprint /api/valevision/user-config/spellings.', ['D-S06a-11', 'D-S06b-01', 'D-S06b-03'], ['S01-F11', 'S06b-F46']),
        ('62__Feature__AppInstallability', 'keep', '-', 'TV-only (TV\'s PWA). NOT added: VV runs under the shared Whitecardopedia PWA (WCP 62__Feature__AppInstallability; VV index.html:19,34-44). The two seams TV\'s LE needs from it get neutral VV answers instead (S01-V04 display-name accessor, S01-V05 window.Na__Pwa__HasUnsavedWork).', ['D-S03b-07'], ['S01-V04', 'S01-V05']),
        ('75__System__UserInstructionsSystem', 'keep', '-', 'TV-only 3D-tab user guide. NOT added for drawing parity (D-S10-11). Number 75 stays TV\'s.', ['D-S10-11'], ['S10-F28']),
        ('76__System__FullscreenMode', 'keep', '-', 'TV-only implementation of the feature VV keeps at 60__Feature__FullScreenMode. NOT added unless D-S10-07 (a).', ['D-S10-07'], ['S01-F59', 'S10-F27']),
        ('80__CloudflareIntegration', 'add', 'W2 (first, before any transport-importing port)', 'TV client folder. VV adds it with ONE VV-bodied file at TV\'s path, Na__CloudflareIntegration__ApiClient__.js (namespace Na__CfApi, TV\'s 33 export names and signatures over whitecardopedia-editor-api and WCP Flask; FR-16). Never an app-root worker folder in VV: VV\'s worker stays WCP/CloudflareWorker (DIV-4).', ['D-S01-03', 'D-S09-04', 'D-S09-V01', 'D-S12-01', 'D-S07a-08'], ['S01-F13', 'S12-F43']),
    ]
    j = 0
    for folder, action, phase, reason, decs, ev in tv_only:
        j += 1
        tvp = M + '/' + folder + '/'
        tgt = tvp if action in ('add', 'add_later') else None
        row = dict(id='TF-T%02d' % (len(VV_TOP) + j), scope='top', current_vv=None, target_vv=tgt, tv_equivalent=tvp, action=action,
                   numbering='tv_only' if action != 'keep' else 'tv_only_not_ported', reason=reason, phase=phase, decision_refs=decs, evidence=ev,
                   risk='Low (new folder at a number free in VV).' if action != 'keep' else 'None.')
        if folder in ('80__CloudflareIntegration',):
            s = importer_summary('80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__', app='tv', top=12)
            row['importers_to_update'] = {'files': 0, 'refs': 0, 'main': [], 'tv_files_outside_naming_it': s['files'], 'tv_main': s['main']}
        elif action in ('add', 'add_later'):
            s = importer_summary(folder, app='tv', exclude_prefix=M + '/' + folder + '/', top=0)
            outside = [m for m in s['main'] if not m.endswith('[inside]')]
            row['importers_to_update'] = {'files': 0, 'refs': 0, 'main': [], 'tv_files_outside_naming_it': len(outside), 'tv_main': outside[:12]}
        topstats(row)
        TF.append(row)


# ---- LE SUBFOLDERS -------------------------------------------------------------
LE_SPEC = {
    '01__Core__Loader': ('keep', 'vv_reserved_le', '-', 'VV-only lazy loader (permanent seam, D-S09-01 a / D-S11-05 b). TV reserves LE/01 for it ("it is where the loader goes if it is back-ported", TV DEVLOG:11718). Every TV LE stylesheet TV imports from its CSS index joins Na__LeLoad__STYLESHEETS (Loader.js:125-134) in TV order.', ['D-S09-01', 'D-S11-05'], ['S01-F39', 'S10-F24']),
    '03__Core__Config': ('keep', 'shared', 'W1b', 'Shared. Only file-name divergence: Na__LayoutEditor__KeyMappings__.json -> Na__Hotkeys__DrawingTabs__.json (FR-12, name only in W1b; TV content + KeyMap 1.11.0 together in WP-S03a-02). TV config VALUES that point at NA hosts are replaced by VV values (rulebook R15).', ['D-S03a-03', 'D-S04b-07', 'D-S05b-04'], ['S01-F17', 'S03a-F08', 'S09-F06']),
    '05__Core__ModeController': ('keep', 'shared', '-', 'Shared; 3 drifted files.', ['D-S01-11', 'D-S10-02'], []),
    '07__Core__SheetData': ('keep', 'shared', '-', 'Shared. VV-only Na__LayoutEditor__DrawingCode__.js stays (loader leaf, D-S03b-02); 3 TV-only units land in place.', ['D-S03b-02', 'D-S03b-08'], ['S03b-F05', 'S01-F39']),
    '10__Core__SheetSurface': ('keep', 'shared', '-', 'Shared. TV-only TitleBlock__QrCell__ lands with the QR decision.', ['D-S03a-06'], []),
    '15__Core__Markup': ('keep', 'shared', '-', 'Shared. 3 TV-only units land in place.', [], ['S03b-F27']),
    '20__System__Viewports': ('keep', 'shared', '-', 'Shared. 6 TV-only units land at identical paths (ModelSource/PlanDoors per D-S01-14 and D-S04a-10).', ['D-S01-14', 'D-S04a-10'], ['S04a-F01', 'S01-F37']),
    '21__System__SitePlanData': ('add', 'tv_only', 'W2 (dormant)', 'TV-only (moved here from top-level 52__System__SitePlanData in TV v2.155.0). Created at TV\'s number with the site-plan client code ported dormant and verbatim (D-S04a-01 B = K1 DR-08; the Drawing Type row hidden by config). D-S06a-01 (a, never) and D-S06a-02 (stubs) are superseded by DR-08; if Adam excludes site plans instead, LE/21 stays empty and is never reused.', ['D-S04a-01', 'D-S06a-01', 'D-S06a-02', 'D-S03b-08'], ['S04a-F02']),
    '25__System__RenderStyles': ('keep', 'shared', '-', 'Shared. SitePlanComposites__ (+Config) land with the site-plan decision.', ['D-S04a-01'], ['S04a-F03']),
    '26__System__DraftMode': ('add', 'tv_only', 'W2', 'TV-only drafting aid; create at TV\'s number.', ['D-S04b-01', 'D-S05a-V2'], ['S04b-F01']),
    '27__System__DrawingGrid': ('add', 'tv_only', 'W2', 'TV-only drafting aid; create at TV\'s number.', ['D-S04b-01'], ['S04b-F01']),
    '28__System__ObjectSnap': ('add', 'tv_only', 'W2', 'TV-only (16 files). Replaces VV 30/Na__LayoutEditor__Snapping__.js through a one-wave re-export shim (FR-14, FR-15). Storage key na-layouteditor-osnap kept.', ['D-S04b-01', 'D-S04b-02', 'D-S04b-09'], ['S04b-F01', 'S01-F18', 'S04b-F02']),
    '30__System__SheetTools': ('keep', 'shared', 'W2', 'Shared. VV-only Snapping__ retires (FR-14/15); 4 TV-only units land in place.', ['D-S04b-09', 'D-S05a-V2'], ['S05a-F01', 'S05a-F29']),
    '31__System__DocumentKeys': ('add', 'tv_only', 'W2', 'TV-only; holds Na__Hotkeys__DocumentTabs__.json (third hotkey file).', ['D-S03a-03'], ['S05a-F02']),
    '32__System__OrthoMode': ('add', 'tv_only', 'W2', 'TV-only drafting aid; create at TV\'s number.', ['D-S04b-01'], ['S04b-F01']),
    '33__System__DrawingAxes': ('add', 'tv_only', 'W2', 'TV-only drafting aid; create at TV\'s number.', ['D-S04b-01'], ['S04b-F01']),
    '35__System__DrawingTools': ('keep', 'shared', '-', 'Shared; the only LE subfolder with identical files (2).', [], []),
    '36__System__HatchPatternTools': ('add', 'tv_only', 'W2', 'TV-only; with app-root 52__LayoutEditor__HatchPatternLibrary (Construction pack, D-S05b-01 a).', ['D-S05b-01', 'D-S05b-02'], ['S05b-F01', 'S05b-F03']),
    '37__System__VectorTools': ('add', 'tv_only', 'W2', 'TV-only (18 files).', ['D-S05b-04'], ['S05b-F02']),
    '40__Ui__Panels': ('keep', 'shared', '-', 'Shared. Panel__SitePlanComposites__ follows the site-plan decision.', ['D-S04a-01'], ['S06a-F01']),
    '50__Feature__Specification': ('keep', 'shared', '-', 'Shared. 8 TV-only units land in place.', [], ['S01-F38']),
    '51__Feature__DrawingRegister': ('add', 'tv_only', 'W2', 'TV-only (10 files). Create at TV\'s number (D-S07a-01 A). PDF.js comes from a VV vendor folder, not PlanVision (D-S03a-07).', ['D-S07a-01', 'D-S03b-01', 'D-S03a-07'], ['S07a-F01']),
    '52__Feature__StatementWriter': ('add', 'tv_only', 'W2 last (behind LayoutEditor__Statement__Enabled)', 'TV-only (33 files, nine subfolders 01__Core__Data .. 09__Standard__Sections created verbatim). In scope (D-S07b-01 a = K1 DR-10), scheduled last, switch OFF until Adam answers; the pure Lockstep leaf (01__Core__Data) lands early with the spec lockstep. Needs 27 MenuRenderer and vendor 06 html2canvas.', ['D-S07b-01', 'D-S07b-03', 'D-S03a-08'], ['S07b-F02']),
    '53__Feature__ProjectQrCode': ('add', 'tv_only', 'W2 (switched off)', 'TV-only (moved here from top-level 53__System__ProjectQrCode in TV v2.155.0). Ported switched off (K1 DR-12 A); NA\'s /q/ base never ships; the facade\'s ProjectLoader helpers must exist first (53 ProjectLink imports them).', ['D-S07a-04', 'D-S03a-06', 'D-S01-10', 'D-S09-08'], ['S07a-F01']),
    '54__Feature__SheetImages': ('add', 'tv_only', 'W2', 'TV-only (17 files). Storage folder name per D-S07a-07 / D-S12-03 (conflict, K1).', ['D-S07a-07', 'D-S08-14', 'D-S12-03'], ['S07a-F01']),
    '55__Feature__Scrapbook': ('keep', 'shared', '-', 'Shared.', [], ['S06a-F01']),
    '56__Feature__ScrapbookCustom': ('keep', 'shared', '-', 'Shared; WCP blueprint names stay VV\'s (Server__ValeVisionScrapbook__Api__.py).', [], ['S06a-F02']),
    '57__Feature__ScrapbookParametric': ('keep', 'shared', '-', 'Shared. 5 TV-only units land in place (site-legend / QR units follow their decisions).', ['D-S04a-01', 'D-S03a-06'], ['S06a-F01']),
    '58__Feature__ScrapbookSpecification': ('add', 'tv_only', 'W2', 'TV-only (5 files); needs 55 SpellCheck.', ['D-S06a-11'], ['S06a-F01', 'S01-F34']),
    '59__Feature__FloorAreas': ('add', 'tv_only', 'W2 (last)', 'TV-only (10 files).', ['D-S06b-01'], ['S06b-F48']),
    '60__Feature__PdfExport': ('keep', 'shared', '-', 'Shared. TV-only PdfFonts__ lands with VV-hosted Open Sans cuts (D-S03a-05).', ['D-S03a-05'], ['S03a-F38']),
    '65__Feature__DocumentPublishing': ('add', 'tv_only', 'W2 late (publishing wave)', 'TV-only (7 files). Added with the publishing port (K1 DR-22 a) after its prerequisites (DR-06 sync purge, DR-28 worker files family, DR-29 storage names, DR-21 PdfFonts, DR-11 register).', ['D-S01-16', 'D-S08-01', 'D-S10-02'], ['S01-F36']),
    '66__Feature__DocumentSharing': ('add', 'tv_only', 'W2 late (after 65)', 'TV-only (7 files). Link form = VV app URL ?project=<folderId>&open=<key> (K1 DR-23); no resolver host, no NA base; lands after publishing (DR-22).', ['D-S01-10', 'D-S08-05', 'D-S09-08', 'D-S01-16'], ['S01-F36']),
    '70__DevTools__DevMenu': ('keep', 'shared', '-', 'Shared.', [], []),
    '80__Feature__WebViewer': ('keep', 'shared', '-', 'Shared. Whole-file ports wait for D-S01-16 (TV\'s viewer is published-only since v2.155.0).', ['D-S01-16'], ['S01-V06']),
}


def build_le():
    allsubs = sorted(set(TV_LE) | set(VV_LE))
    i = 0
    for sub in allsubs:
        i += 1
        spec = LE_SPEC.get(sub)
        if not spec:
            raise SystemExit('no LE spec for ' + sub)
        action, numbering, phase, reason, decs, ev = spec
        cur = LE + '/' + sub + '/' if sub in VV_LE else None
        tvp = LE + '/' + sub + '/' if sub in TV_LE else None
        tgt = cur if action == 'keep' and cur else (tvp if action in ('add', 'add_later') else cur)
        row = dict(id='TF-L%02d' % i, scope='le_sub', current_vv=cur, target_vv=tgt, tv_equivalent=tvp, action=action, numbering=numbering,
                   reason=reason, phase=phase, decision_refs=decs, evidence=ev,
                   risk='None (no path change).' if action == 'keep' else 'Low (new subfolder at TV\'s number, free in VV).')
        if action in ('add', 'add_later'):
            s = importer_summary(sub, app='tv', exclude_prefix=LE + '/' + sub + '/', top=0)
            outside = [m for m in s['main'] if not m.endswith('[inside]')]
            row['importers_to_update'] = {'files': 0, 'refs': 0, 'main': [], 'tv_files_outside_naming_it': len(outside), 'tv_main': outside[:12]}
        topstats(row)
        TF.append(row)


# ---- APP-ROOT CONTENT ------------------------------------------------------------
def build_root():
    rows = [
        dict(current_vv=None, target_vv='50__ValeVision__UserConfig/', tv_equivalent='50__TrueVision__UserConfig/', action='add', numbering='root_shared_number',
             reason='TV\'s user spelling dictionary folder. VV takes the same number with the app token swapped: 50__ValeVision__UserConfig/ValeVision__UserSpellings__.json (keys prefixed ValeVision__UserSpellings__), written by a new WCP blueprint Server__ValeVisionUserConfig__Api__.py (/api/valevision/user-config/spellings). Lands with 55 SpellCheck.',
             phase='W2 (with 55)', decision_refs=['D-S06b-03', 'D-S06a-11'], evidence=['TV 55/Na__SpellCheck__Config__.json:13 Dictionary__File', 'TV 55/Na__SpellCheck__Dictionary__.js:116', 'S06b-F46', 'S09-F50'],
             config_paths_to_update=['55/Na__SpellCheck__Config__.json Dictionary__File, Dictionary__ApiPath, Labels__AddWordTitle, Labels__Unreadable (TV values name 50__TrueVision__UserConfig)', '55/Na__SpellCheck__Dictionary__.js:116 default dictionaryFile', 'WCP/server.py: register the new blueprint'],
             risk='Low; the file is user data (Adam curates it).'),
        dict(current_vv='51__LayoutEditor__UserScrapbookContent/', target_vv='51__LayoutEditor__UserScrapbookContent/', tv_equivalent='51__LayoutEditor__UserScrapbookContent/', action='keep', numbering='root_shared',
             reason='Same name in both apps (load-bearing: TV ScrapbookCustom Transport:82 and Config:16; VV WCP/Server__ValeVisionScrapbook__Api__.py:81). Contents are each app\'s user data - never copied across. Deleted items go to 00__Deleted__Quarantine (both).',
             phase='-', decision_refs=[], evidence=['S06a-F02', 'WCP/Server__ValeVisionScrapbook__Api__.py:80-81'], risk='None.'),
        dict(current_vv=None, target_vv='52__LayoutEditor__HatchPatternLibrary/', tv_equivalent='52__LayoutEditor__HatchPatternLibrary/', action='add', numbering='root_shared_number',
             reason='Name and location are load-bearing (TV LE/36 Na__LayoutEditor__HatchPatterns__.js:109 Na__LeHatch__FOLDER). Create with HatchLibrary__Index__.json, 02__ConstructionMaterialHatches/ and 05__SitePlanHatches/ verbatim (K1 DR-19 follows DR-08: both packs, Construction first so Brickwork stays the default). The two OS_Symbol__Examples PNGs are reference images named only in comments and NA notes - not copied. Static: served by WCP/server.py\'s /ValeVision3D/<path> route, no transport.',
             phase='W2 (with LE/36)', decision_refs=['D-S05b-01', 'D-S04a-01'], evidence=['S05b-F03', 'S09-F50'], risk='Low.'),
        dict(current_vv=None, target_vv='01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/', tv_equivalent='01__AppAssets__TrueVision/06__AppAssets__TitleBlocks/', action='add', numbering='root_asset',
             reason='TV\'s asset convention for the Classic title block scan (TV v2.155.0). VV adds the same subfolder number under its own asset root, holding VALE\'s scan (md5 59777a65, from 35/PageLayoutSystem__TitleBlock__A3__.png) - never TV\'s NA scan (md5 7614f27e).',
             phase='W2', decision_refs=['D-S03b-10'], evidence=['TV LE AppConfig:136-140', 'VV LE AppConfig:105-108', 'S03b-F36', 'S09-F04'],
             config_paths_to_update=['LE AppConfig LayoutEditor__TitleBlock__ClassicScanAssets A3/A4/A2/A1 (:105-108)'], risk='Low.'),
        dict(current_vv=None, target_vv='04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/', tv_equivalent='04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/', action='add', numbering='root_vendor_shared',
             reason='Same vendor number as TV. jspdf.umd.js is the identical 4.1.0 build already vendored in VV 35 (git diff --no-index -w empty, S01-F05). Note it in Vale__Dependencies__ImportMap__Index__.json and the README as a UMD script, not an import-map entry, as TV does.',
             phase='W2', decision_refs=['D-S01-02'], evidence=['TV LE AppConfig:498', 'TV ConfigState__SheetSetup__.js:553', 'S01-F05', 'S08-F20', 'S09-F03'],
             config_paths_to_update=['LE AppConfig :402 LayoutEditor__Pdf__JsPdfScriptPath', 'LE ConfigState__SheetSetup__.js:396 fallback', '80__Testing__PrototypeEnvironment/Na__Test__SpecificationPdf__.html:31', '80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html:70 (page has <base href="../">)', '04__Lib__ThirdParty__VersionLocked/Vale__Dependencies__ImportMap__Index__.json + Vale__Dependencies__VersionLock__README__.md'],
             risk='Low.'),
        dict(current_vv=None, target_vv='04__Lib__ThirdParty__VersionLocked/06__Vendor__Html2Canvas__v1.4.1/', tv_equivalent='04__Lib__ThirdParty__VersionLocked/06__Vendor__Html2Canvas__v1.4.1/', action='add', numbering='root_vendor_shared',
             reason='Same vendor number as TV; only the Statement Writer PDF uses it (TV LE AppConfig:1330, ConfigState__EditorSetup__.js:208-209). Lands with LE/52 (K1 DR-10).', phase='W2 last (with LE/52)', decision_refs=['D-S07b-01', 'D-S03a-08'], evidence=['S09-F03'], risk='Low.'),
        dict(current_vv=None, target_vv='04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/', tv_equivalent=None, action='add_later', numbering='root_vendor_vv_first',
             reason='The Drawing Register needs PDF.js 3.11.174. TV reads it from PlanVision\'s folder (/na-apps/20__PlanVision__CoreAppCode/..., TV LE AppConfig:1200-1201), an NA-only path. VV vendors it at the next free vendor number, 07, records it in the registry, and offers TV the same folder (removes TV\'s cross-app path) - TV must not take 07 for anything else.',
             phase='W2 (with LE/51)', decision_refs=['D-S03a-07', 'D-S11-06'], evidence=['TV LE AppConfig:1200-1201'], risk='Low; vendor-number collision only if TV ignores the registry.'),
        dict(current_vv='04__Lib__ThirdParty__Three/', target_vv=None, tv_equivalent=None, action='retire', numbering='root_legacy_vv',
             reason='Legacy three.js copy (17 tracked files) superseded by 04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0 (VV D40). No live reference in src, styles, tests or index.html; only history and a WCP SW comment (logic :131).',
             phase='W3', decision_refs=[], evidence=['S01-F56'], risk='None (verify with k2_refscan "04__Lib__ThirdParty__Three" before the delete).'),
        dict(current_vv=None, target_vv=None, tv_equivalent='80__CloudflareIntegration/', action='keep', numbering='root_tv_only_not_ported',
             reason='TV\'s worker project (na-truevision-api). NOT added: VV\'s worker is whitecardopedia-editor-api in WCP/CloudflareWorker (DIV-4). VV gains only the CLIENT folder 02__Src__AppModules/80__CloudflareIntegration/.',
             phase='-', decision_refs=['D-S12-01'], evidence=['S12-F43'], risk='None.'),
        dict(current_vv='60__DistributionEmails/', target_vv='60__DistributionEmails/', tv_equivalent='60__DistributionEmails/', action='keep', numbering='root_shared', reason='Same name; brand content differs by design.', phase='-', risk='None.'),
        dict(current_vv='79__Testing__GenerateObjects/', target_vv='79__Testing__GenerateObjects/', tv_equivalent='79__Testing__GenerateObjects/', action='keep', numbering='root_shared', reason='Same name and files.', phase='-', risk='None.'),
        dict(current_vv='80__Testing__PrototypeEnvironment/', target_vv='80__Testing__PrototypeEnvironment/', tv_equivalent='80__Testing__PrototypeEnvironment/', action='keep', numbering='root_shared', reason='Same name. Ported tests keep TV\'s file names (rulebook R6); VV keeps both Verify harnesses.', phase='-', decision_refs=[], evidence=['S01-F55'], risk='None.'),
        dict(current_vv='00__Archive/', target_vv='00__Archive/', tv_equivalent='00__ArchivedVersions/', action='keep', numbering='root_out_of_scope', reason='Archive folders; outside the drawing system. No change.', phase='-', risk='None.'),
        dict(current_vv='95__SketchUpSisterTools__ToolsAndUtils/', target_vv='95__SketchUpSisterTools__ToolsAndUtils/', tv_equivalent='90__rubyScript__SketchUpSisterTools__ToolsAndUtils/', action='keep', numbering='root_out_of_scope', reason='SketchUp sister tools; outside the drawing system and outside 02__Src__AppModules numbering. Recorded in the registry (app-root scope) only.', phase='-', risk='None.'),
    ]
    for i, r in enumerate(rows, 1):
        r['id'] = 'TF-R%02d' % i
        r['scope'] = 'root_content'
        r.setdefault('decision_refs', [])
        r.setdefault('evidence', [])
        r.setdefault('config_paths_to_update', [])
        r.setdefault('importers_to_update', {'files': 0, 'refs': 0, 'main': []})
        r['vv_files_lines'] = stats('vv', r['current_vv']) if r['current_vv'] else None
        r['tv_files_lines'] = stats('tv', r['tv_equivalent']) if r['tv_equivalent'] else None
        if r['current_vv'] == '04__Lib__ThirdParty__Three/':
            r['importers_to_update'] = importer_summary('04__Lib__ThirdParty__Three')
        TF.append(r)


# ---- STYLESHEETS ------------------------------------------------------------------
STYLE_SPEC = {
    'Na__CoreUi__Styles__Index__.css': ('keep', 'W1 + W2', 'Same name. W1 rewrites its 6 drawing @imports (:85-90) by the renumber only (no reorder in W1). Later packages: add 47 and 49 Dev-menu sheets and 54/55 at TV\'s positions (TV :123, :130, :182, :190), move the DrawView Dev sheet after the plan/elevation/north/planes sheets as TV (S02a-F13). Never add LE editor sheets here (they go to the VV loader list, R18); keep VV-only imports (61, 62, 60, 64, 31 x2, 71, LE Boot).', ['D-S09-01', 'D-S10-11'], ['S01-F50', 'S02a-F13', 'S09-F17', 'S10-F16']),
    'Na__UiFeature__Styles__AppHeader__.css': ('keep', '-', 'Same name. The top-bar fold Adam named is already identical (tokens --Vale_HeaderFold*, TV :210-212 / VV :206-208); only Vale brand items differ (D-S10-08).', ['D-S10-08'], ['S01-F53', 'S10-F01', 'S10-F23']),
    'Na__UiFeature__Styles__LoadingOverlays__.css': ('keep', 'W2', 'Same name. Take TV\'s veil region verbatim plus a VV-only --boot modifier (S10-F04/F05).', ['D-S10-03'], ['S10-F04', 'S10-F05']),
    'Na__UiFeature__Styles__DropdownAndToast__.css': ('keep', 'W2/W3', 'Same name. Keep VV\'s Confirm Dialog region (S09-V01); toast offset is D-S10-06; its Scene Inspector region (VV :969-1239) is what TV split into Na__UiFeature__Styles__SceneInspector__.css (optional move, FR-24); its "Elevation View - Cursor and UI States" region (VV :1341-1372) belongs to the legacy 91 tool and retires with it.', ['D-S10-06', 'D-S10-11', 'D-S01-02'], ['S09-V01', 'S10-F21', 'S10-F28']),
    'Na__UiFeature__Styles__SceneInspector__.css': ('add_later', 'W3 (optional)', 'TV-only file holding the Scene Inspector rules VV keeps inside DropdownAndToast (:969-1239). Optional structural alignment only - K1 DR-44 skips the stylesheet split for drawing parity (D-S10-11). If wanted: move the region verbatim into a file of TV\'s name and import it after DropdownAndToast (TV CSS index :36).', ['D-S10-11'], ['S10-F28']),
    'Na__UiFeature__Styles__DevMenu__CacheAndStorage__.css': ('add_later', 'W3', 'TV-only (Dev menu Cache & Storage panel). D-S10-11 recommends porting the panel, adapted to the WCP registrar.', ['D-S10-11'], ['S10-F28']),
    'Na__UiFeature__Styles__PwaInstallability__.css': ('keep', '-', 'TV-only (TV\'s PWA prompt). NOT added: VV uses the WCP PWA.', [], ['S01-V05']),
    'Na__CoreUi__Styles__Fonts__.css': ('keep', 'W2', 'Same name. Add Open Sans Medium (500); move VV\'s font sources to a Vale-owned location with the NA URL second (D-S10-05).', ['D-S10-05'], ['S10-F22', 'S07b-F41']),
    'Na__CoreUi__Styles__BaseLayout__.css': ('keep', '-', 'Same name; trivial drift.', [], []),
    'Na__CoreUi__Styles__RenderCanvas__.css': ('keep', '-', 'Same name; strip offset is D-S10-04.', ['D-S10-04'], ['S10-F20']),
    'Na__ImageExport__Styles__ViewportOverlays__.css': ('keep', '-', 'Same name; safe frame under the strip is D-S10-04.', ['D-S10-04'], ['S10-F20']),
    'Na__PresentationMode__Styles__SceneCarousel__.css': ('keep', 'W2', 'Same name; modal 1.2.0 rules come with WP-S02a-04.', [], ['S02a-F47', 'S10-F34']),
    'Na__UiFeature__Styles__ControlsHelpPanel__.css': ('keep', '-', 'Same name.', [], ['S10-F34']),
    'Na__UiFeature__Styles__DevToolsMenu__.css': ('keep', '-', 'Same name.', [], ['S10-F34']),
    'Na__UiFeature__Styles__NavigationToolbar__.css': ('keep', '-', 'Same name.', [], ['S10-F34']),
}


def numstat(a, b):
    try:
        out = subprocess.run(['git', 'diff', '--no-index', '-w', '--numstat', a, b], capture_output=True, text=True).stdout.strip()
        if not out:
            return 'identical (-w)'
        p = out.split()
        return '+%s -%s (VV->TV, -w)' % (p[0], p[1])
    except Exception:
        return 'n/a'


def build_style():
    sd = '03__Style__AppStylesheets'
    tvs = sorted(os.listdir(os.path.join(TV, sd)))
    vvs = sorted(os.listdir(os.path.join(VV, sd)))
    allf = sorted(set(tvs) | set(vvs))
    for i, f in enumerate(allf, 1):
        action, phase, reason, decs, ev = STYLE_SPEC[f]
        cur = sd + '/' + f if f in vvs else None
        tvp = sd + '/' + f if f in tvs else None
        tgt = cur if action == 'keep' and cur else (tvp if action in ('add', 'add_later') else None)
        diff = numstat(os.path.join(VV, cur), os.path.join(TV, tvp)) if cur and tvp else ('TV-only' if tvp else 'VV-only')
        row = dict(id='TF-S%02d' % i, scope='style', current_vv=cur, target_vv=tgt, tv_equivalent=tvp, action=action,
                   numbering='style', reason=reason + ' Content drift: ' + diff + '.', phase=phase, decision_refs=decs, evidence=ev,
                   importers_to_update={'files': 0, 'refs': 0, 'main': []}, config_paths_to_update=[],
                   risk='None (name unchanged).' if action == 'keep' else 'Low.')
        if f == 'Na__CoreUi__Styles__Index__.css':
            row['config_paths_to_update'] = ['%s:%d' % (CSS_INDEX, n) for n in (85, 86, 87, 88, 89, 90)]
        if f == 'Na__UiFeature__Styles__SceneInspector__.css':
            row['config_paths_to_update'] = [CSS_INDEX + ' (new @import after DropdownAndToast, TV :36)']
        row['vv_files_lines'] = stats('vv', cur) if cur else None
        row['tv_files_lines'] = stats('tv', tvp) if tvp else None
        TF.append(row)


# ---- FILE RENAME MAP ---------------------------------------------------------------
def build_files():
    # folder-level rows for the renumber
    leg = importer_summary('40__System__2dElevationsView', exclude_prefix=M + '/40__System__2dElevationsView/', top=0)
    fr(id='FR-01', level='folder', kind='move', current_vv=M + '/40__System__2dElevationsView/', target_vv=M + '/91__System__2dElevationsView/', tv_twin=None,
       reason='Vacate TV\'s 40 first (legacy VV tool, 7 files after FR-08). 91 proved free: not in TV\'s current top level, never in TV\'s devlog folder history (TV used 90 for its own legacy PageLayoutSystem).',
       importers=leg['main'], risk='Low.', decision_refs=['D-S01-13', 'D-S01-02', 'D-S02a-04'], phase='W1', work_packages=['WP-S01-01R'],
       notes='Folder-level row: the 6 files that move with it keep their names. Rewrite order: FR-08\'s specifier first, then the folder name.')
    for k, (old, new, fid) in enumerate(RENUMBER, 2):
        s = importer_summary(old, exclude_prefix=M + '/' + old + '/', top=0)
        fr(id='FR-%02d' % k, level='folder', kind='move', current_vv=M + '/' + old + '/', target_vv=M + '/' + new + '/', tv_twin=M + '/' + new + '/',
           reason='Drawing-system renumber to TV\'s number (folder-level row; every file inside keeps its name except FR-09). %d importer files / %d refs (%d inside the folder).' % (s['files'], s['refs'], s['inside_folder_files']),
           importers=s['all_files'], risk='See TF row; executed only by k2_renumber_apply.py --mode git in W1.', decision_refs=list(RENUMBER_DECISIONS), phase='W1', work_packages=list(RENUMBER_WPS),
           notes='The PORT NOTE bullet "Import paths follow the ValeVision folder numbers (...)" in 28 files becomes false and is deleted by the same change (T8).')
    s = importer_summary('Na__RenderEffect__2dProfileLines__', top=0)
    fr(id='FR-08', level='file', kind='move', current_vv=M + '/40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js', target_vv=M + '/05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js',
       tv_twin=None, reason='VV-only render pass (DIV-1) used by the composer route. A file\'s folder follows its base name (ledger 1115-1117): Na__RenderEffect__* lives in 05 beside Na__RenderEffect__ProfileLines__.js in both apps; TV\'s 40 DrawingViewCore holds only Na__DrawView__* files. Moving it into DrawingViewCore (S02a option) would put a non-DrawView file in a shared folder.',
       importers=s['main'], self_imports_to_fix=["'../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js' -> './Na__RenderEffect__SectionClipping__State.js' (still resolves either way; normalised)"],
       risk='Low (2 importers).', decision_refs=['D-S01-13', 'D-S02a-04'], phase='W1', work_packages=['WP-S01-01R'],
       evidence=['VV 42/Na__DrawView__ComposerPreset__.js:91,93', 'VV 40/Na__ElevationView__SystemLogic.js:47', 'S01-F03'])
    s = importer_summary('Na__DrawView__ComposerPreset', top=0)
    fr(id='FR-09', level='file', kind='rename', current_vv=M + '/42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js', target_vv=M + '/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js',
       tv_twin=M + '/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js',
       reason='Same eight-function interface: TV\'s RenderPreset was ported FROM VV ComposerPreset 1.2.0 "interface only" and says "the seam is the eight function names" (TV RenderPreset__.js:24-25, :31-32). Rename file and exports Na__DrawView__ComposerPreset__* -> Na__DrawView__RenderPreset__*; keep VV\'s composer body (DIV-1). Also give RenderFrame an optional camera argument so TV\'s RenderFrame(cam) calls stay correct (S02a-F14).',
       importers=s['main'], risk='Low mechanically (6 live importer files + the file itself, 52 code refs); behaviour unchanged.',
       decision_refs=['D-S01-06', 'D-S02a-10'], phase='W1', work_packages=['WP-S01-01R', 'WP-S02a-12'],
       notes='Header after the rename: banner "VALEVISION3D - DRAWING VIEW CORE - RENDER PRESET", MODULE "Drawing View Core - Render Preset" (TV text), NAMESPACE keeps VV\'s private Na__DrawPreset (VV body; listed as a divergence). PORT NOTE must be rewritten by hand: VV-authored, renamed to TV\'s interface name; Parity diverged (DIV-1).',
       evidence=['S01-F21', 'S02a-F14'])
    s = importer_summary('Na__AppUtils__SnapshotHistory__', top=0)
    fr(id='FR-10', level='file', kind='rename', current_vv=M + '/03__AppUtils/Na__AppUtils__SnapshotHistory__.js', target_vv=M + '/03__AppUtils/Na__AppUtils__SnapshotHistory.js',
       tv_twin=M + '/03__AppUtils/Na__AppUtils__SnapshotHistory.js',
       reason='VV added a trailing __ on port. TV is the naming lead and keeps legacy names without the suffix (ConfirmDialog.js and ProjectLoader.js lack it in both apps), so VV takes TV\'s name; a TV-side rename (D-S11-08 b) is not scheduled.',
       importers=s['main'], risk='None (2 importers, both in folders W1 renumbers anyway).', decision_refs=['D-S02b-12R', 'D-S11-08'], phase='W1', work_packages=['WP-S01-01R', 'WP-S09-10'],
       notes='The two PORT NOTE bullets "Snapshot history imported from Na__AppUtils__SnapshotHistory__.js ..." (PlanAnnotations History :38, PlanDimensions History :38) become false and are deleted (T8).',
       evidence=['S01-F19', 'S09-F05', 'S11-F44', 'S02b-F05'])
    s = importer_summary('Na__RenderEffect__DistanceCulling__', top=0)
    fr(id='FR-11', level='file', kind='move', current_vv=M + '/05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js', target_vv=M + '/05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js',
       tv_twin=M + '/05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js',
       reason='Same module at a different depth. TV\'s 40 Transitions, 42 and 45 ModeControllers (and LoadingSequence) import it from 05/, so the move removes a seam from three drawing files. Done inside W1 because W1 already rewrites every importer (D-S09-V02 b).',
       importers=s['main'], self_imports_to_fix=["'../../04__MathUtils/Na__Math__Units.js' -> '../04__MathUtils/Na__Math__Units.js' (TV :57 has the same)"],
       risk='Low. The shared WCP precache entry (logic :318) goes stale but cannot break an install: the precache is best-effort per URL (logic :592-600).', decision_refs=['D-S01-07', 'D-S09-V02', 'D-S10-13'], phase='W1', work_packages=['WP-S01-01R'],
       notes='No WCP edit in W1 (K1 DR-07: no feature package edits or bumps the shared worker). The precache line WCP Whitecardopedia__Pwa__ServiceWorker__Logic__.js:318 is updated by the DR-07 service-worker package (k2_renumber_apply.py --edit-wcp-sw does it if Adam wants it in W1). WebApps/live_sw.js:157 is a stale tracked copy (token 2026-09-10-6) - confirm which file the deployed site registers before touching it (S01 W7).',
       evidence=['TV 05/Na__RenderEffect__DistanceCulling__.js:57', 'S01-F20', 'S09-F22'])
    s = importer_summary('Na__LayoutEditor__KeyMappings__', top=0)
    fr(id='FR-12', level='file', kind='rename', current_vv=LE + '/03__Core__Config/Na__LayoutEditor__KeyMappings__.json', target_vv=LE + '/03__Core__Config/Na__Hotkeys__DrawingTabs__.json',
       tv_twin=LE + '/03__Core__Config/Na__Hotkeys__DrawingTabs__.json',
       reason='TV renamed its drawing-tab key file in v2.115.0 (TV DEVLOG:5043, "was Na__LayoutEditor__KeyMappings__.json"); internal keys (LayoutEditor__KeyMappings__*) were kept, so only the FILE name changes. Rename name-only in W1b (content unchanged) so S04b/S05b key rows and TV\'s tests target TV\'s name; TV\'s CONTENT lands only together with ConfigState__KeyMap__ 1.11.0 (WP-S03a-02), never on VV\'s 1.0.0 matcher.',
       importers=s['main'], risk='Low for the name-only step; the content step is behaviour (T would reach Trim without the When-aware matcher).',
       decision_refs=['D-S03a-03', 'D-S05a-04', 'D-S04b-07', 'D-S05b-04'], phase='W1b', work_packages=['WP-S01-03R', 'WP-S03a-02'],
       evidence=['S01-F17', 'S03a-F08', 'S05a-F03', 'S09-F06'])
    s = importer_summary(r'Na__ValeVision__HotkeysDictionary__\.json', top=0)
    fr(id='FR-13', level='file', kind='rename', current_vv=M + '/02__AppData/Na__ValeVision__HotkeysDictionary__.json', target_vv=M + '/02__AppData/Na__Hotkeys__3dModelTab__.json',
       tv_twin=M + '/02__AppData/Na__Hotkeys__3dModelTab__.json',
       reason='Same file by role and schema: TV\'s Manager header says its array schema "is the same schema ValeVision3D\'s hotkey dictionary uses" (TV 10/Na__Hotkeys__Manager.js:17-21); TV renamed its own (was Na__AppConfig__Hotkeys.json) in v2.115.0 (TV DEVLOG:5042). D-S05a-04\'s "different schema" is only the root key and action prefixes (app tokens). Rename the FILE; keep root key Na__ValeVision__HotkeysDictionary, the ValeVision__* actions and VV\'s handler (handler choice stays D-S05a-04).',
       importers=s['main'], risk='Low: two runtime fetches (HotkeyHandler :116, NavigationHelpPanel :84) - miss the second and the help panel empties.',
       decision_refs=['D-S03a-03', 'D-S05a-04'], phase='W1b', work_packages=['WP-S01-03R', 'WP-S03a-V03'],
       evidence=['S01-F17', 'S03a-F30', 'S05a-F04', 'S11-V08'])
    s = importer_summary('Na__LayoutEditor__Snapping__', top=0)
    fr(id='FR-14', level='file', kind='shim', current_vv=LE + '/30__System__SheetTools/Na__LayoutEditor__Snapping__.js', target_vv=LE + '/30__System__SheetTools/Na__LayoutEditor__Snapping__.js',
       tv_twin=LE + '/28__System__ObjectSnap/ (Na__LayoutEditor__ObjectSnap__Search__.js, __State__.js, __Marker__.js, __.js)',
       reason='Step 1 of 2 (TV did exactly this: "a re-export for an hour", TV ObjectSnap__.js:60-63). In the ObjectSnap port commit, replace VV\'s 455-line Snapping__ by a re-export shim that imports ONLY from __Search__ (Find, Snap, ShowMarker, HideMarker, Clear, IsEnabled, KIND_END, KIND_MID) and __State__ (CHANGED_EVENT) and declares TONE_VERTEX / TONE_DIMENSION / TONE_VIEWPORT as local strings - never the controller (controller -> Measurements -> Shape/Rectangle/Dimension tools -> shim would be a cycle, TV ObjectSnap__.js:33-37). Repoint the Toggle importers (Keyboard :123, Toolbar :110, ContextMenu :100) to the controller and ModeController :228 to __Search__ in the same commit.',
       importers=s['main'], risk='Medium: visible snap behaviour change in one step (marker colours by target, D-S04b-02).',
       decision_refs=['D-S04b-09', 'D-S04b-02', 'D-S04b-01'], phase='W2', work_packages=['WP-S04b-06R'],
       notes='10 importing files (ModeController :228, ContextMenu :100, HitResolution :112, Keyboard :123, PointerDrag :137, DimensionTool :129, LeaderTool :77, RectangleTool :98, ShapeTool :121, Toolbar :110) + 2 comment-only mentions (SheetTools__.js:336, ShapeTool :82). S01\'s "11 importers" counted SheetTools__.js, which only names it in a comment.',
       evidence=['S04b-F02', 'S01-F18', 'S05a-F29', 'S05b-F39', 'S11-V07'])
    fr(id='FR-15', level='file', kind='retire', current_vv=LE + '/30__System__SheetTools/Na__LayoutEditor__Snapping__.js', target_vv=None,
       tv_twin=None, reason='Step 2 of 2: delete the shim once its last importer is repointed to 28__System__ObjectSnap (the hub and drawing-tool ports, S05a/S05b), behind a grep gate (no Na__LayoutEditor__Snapping__ and no Na__LeOsnap__TONE_ outside history). TV has no file of this name.',
       importers=s['main'], risk='Low.', decision_refs=['D-S04b-09'], phase='W2 (after the SheetTools/DrawingTools hub ports)', work_packages=['WP-S04b-09'],
       evidence=['S04b-F02'])
    tvs = importer_summary('80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__', app='tv', top=0)
    fr(id='FR-16', level='file', kind='shim', current_vv=None, target_vv=M + '/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js',
       tv_twin=M + '/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js',
       reason='VV-bodied facade at TV\'s path with TV\'s namespace (Na__CfApi), all 33 export names and signatures, implemented over whitecardopedia-editor-api, WCP Flask and VaApps/Projects/<folderId>/ (DIV-4 kept). Its VV twins today are three per-route clients it fronts: 03/Na__AppUtils__R2SaveProjectJson__.js, R2AssetUpload__.js, R2DrawingNotes__.js. Every TV importer then ports with unchanged specifiers.',
       importers=['(TV importers that port unchanged, %d files): ' % tvs['files']] + tvs['main'],
       risk='High value / medium risk: transport semantics (S12 b.4-b.6); land before the first port that imports it.',
       decision_refs=['D-S01-03', 'D-S09-04', 'D-S09-V01', 'D-S12-01', 'D-S07a-08'], phase='W2 (first)', work_packages=['WP-S01-06R', 'WP-S09-06'],
       notes='D-S09-V01 (c: facade over per-document VV clients) and D-S12-01 (A: facade straight onto the worker routes) differ on the body only; the PATH and NAME are the same either way.',
       evidence=['S01-F13', 'S12-F43'])
    tvs = importer_summary('Na__AppUtils__LocalProjectMirror__', app='tv', top=0)
    fr(id='FR-17', level='file', kind='shim', current_vv=None, target_vv=M + '/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js',
       tv_twin=M + '/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js',
       reason='VV-bodied local-mirror shim at TV\'s path (Na__LocalMirror, 8 exports) over WCP/server.py routes (POST /api/projects/<folder_id> exists at :439; /files/<name>, drawings-fingerprint and statement routes are new).',
       importers=['(TV importers that port unchanged, %d files): ' % tvs['files']] + tvs['main'], risk='Medium (localhost writes).',
       decision_refs=['D-S01-03', 'D-S09-04', 'D-S12-01'], phase='W2 (first)', work_packages=['WP-S01-06R', 'WP-S09-06'], evidence=['S01-F14', 'S12-F43'])
    s = importer_summary('Na__AppUtils__R2DrawingNotes__', top=0)
    fr(id='FR-18', level='file', kind='retire', current_vv=M + '/03__AppUtils/Na__AppUtils__R2DrawingNotes__.js', target_vv=None,
       tv_twin='(role absorbed by 80/Na__CloudflareIntegration__ApiClient__.js ReadProjectFile/WriteProjectFile and 03/Na__AppUtils__LocalProjectMirror__.js WriteSiblingFile)',
       reason='VV-only notes client; its only importer is SpecData__Transport__ :90. Retire once TV\'s SpecData Transport 1.3.0 / Lockstep are ported over the facade. Conditional: under D-S09-V01 (c) the facade may keep calling it as a per-document client - then it stays (kind becomes keep).',
       importers=s['main'], risk='Low.', decision_refs=['D-S12-01', 'D-S09-V01', 'D-S06b-V01'], phase='W2 late (WP-S06b-01 first extends it to 1.1.0; retire when the spec transport is re-based onto the facade)', work_packages=['WP-S06b-01', 'WP-S09-06'],
       evidence=['S12-F22'])
    s = importer_summary(r'35__System__PageLayoutSystem/01__Dependencies__VersionLocked/jspdf\.umd\.js', top=0)
    fr(id='FR-19', level='file', kind='move', current_vv=M + '/35__System__PageLayoutSystem/01__Dependencies__VersionLocked/jspdf.umd.js', target_vv='04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js',
       tv_twin='04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js',
       reason='Identical 4.1.0 build; TV moved its copy here in v2.155.0. COPY now (the legacy 35 page keeps its own copy until 35 retires, FR-21), repoint the LE config, the SheetSetup fallback and both test pages.',
       importers=s['main'], risk='Low.', decision_refs=['D-S01-02'], phase='W2', work_packages=['WP-S01-02', 'WP-S09-10', 'WP-S03a-V02'],
       notes='The two test pages (Na__Test__SpecificationPdf__.html:31, Na__Test__TitleBlockCells__.html:70) were missed by S01 and S09.',
       evidence=['S01-F05', 'S08-F20', 'S09-F03', 'S06b-F54'])
    s = importer_summary(r'PageLayoutSystem__TitleBlock__A3__\.png', top=0)
    fr(id='FR-20', level='file', kind='move', current_vv=M + '/35__System__PageLayoutSystem/PageLayoutSystem__TitleBlock__A3__.png', target_vv='01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png',
       tv_twin='01__AppAssets__TrueVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png (CONTENT DIFFERS - NA scan, never copied)',
       reason='TV\'s asset path and file name; VV\'s own Vale scan (md5 59777a65; the 02__VizDpt__ copy 05085a29 is not the live one). COPY now, delete the 35 original with FR-21.',
       importers=s['main'], risk='Low.', decision_refs=['D-S03b-10'], phase='W2', work_packages=['WP-S01-02', 'WP-S09-10', 'WP-S03a-V02'], evidence=['S03b-F36', 'S09-F04'])
    s = importer_summary('35__System__PageLayoutSystem', exclude_prefix=M + '/35__System__PageLayoutSystem/', top=0)
    fr(id='FR-21', level='folder', kind='retire', current_vv=M + '/35__System__PageLayoutSystem/', target_vv=None, tv_twin='(TV retired its copy, 90__System__PageLayoutSystem, in v2.155.0 - TV DEVLOG:1287)',
       reason='Retire the legacy Create Drawing tool after FR-19/FR-20 and Adam\'s confirmation; remove the Create Drawing button (index.html:354, overlay :215) and its handler (ImageExport Controls :364, :564-646, :627). Number 35 stays reserved, never reused.',
       importers=s['main'], risk='Medium (user-visible menu item removed).', decision_refs=['D-S01-02', 'D-S09-10'], phase='W3', work_packages=['WP-S01-02'], evidence=['S09-F46'])
    s = importer_summary('62__Feature__EmailWorkers', exclude_prefix=M + '/62__Feature__EmailWorkers/', top=0)
    fr(id='FR-22', level='folder', kind='move', current_vv=M + '/62__Feature__EmailWorkers/', target_vv=M + '/92__Feature__EmailWorkers/', tv_twin=None,
       reason='Clears the nominal collision with TV/WCP 62__Feature__AppInstallability. 92 proved free (never used by TV). Runs only if Adam asks (D-S01-08 (a); K3 W6-03): the DR-03 default keeps 62 (TF-T32). Never before node_modules is untracked (1,857 of 1,877 tracked files).',
       importers=s['main'], risk='Medium (deploy shortcut .lnk embeds an absolute path).', decision_refs=['D-S01-08', 'D-S01-05'], phase='W3 (only on request; K3 W6-03)', work_packages=['WP-S01-09'], evidence=['S01-F57', 'S01-F58'])
    s = importer_summary('04__Lib__ThirdParty__Three', top=0)
    fr(id='FR-23', level='folder', kind='retire', current_vv='04__Lib__ThirdParty__Three/', target_vv=None, tv_twin=None,
       reason='Unreferenced legacy three.js copy (17 tracked files); superseded by 04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0.',
       importers=s['main'], risk='None.', decision_refs=[], phase='W3', evidence=['S01-F56'])
    fr(id='FR-24', level='region', kind='move', current_vv='03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css (lines 969-1239, REGION "Scene Inspector - Dev Tools Panel")',
       target_vv='03__Style__AppStylesheets/Na__UiFeature__Styles__SceneInspector__.css', tv_twin='03__Style__AppStylesheets/Na__UiFeature__Styles__SceneInspector__.css',
       reason='Optional structural alignment, NOT recommended for drawing parity (K1 DR-44 skips the stylesheet split): TV split this region out of DropdownAndToast into its own sheet. If Adam wants identical 3D-tab file structure, move it verbatim and import it right after DropdownAndToast (TV CSS index :36).',
       importers=['03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css (new @import)'], risk='Low (cascade order kept by importing it immediately after DropdownAndToast).',
       decision_refs=['D-S10-11'], phase='W3 (optional)', evidence=['S10-F28'])
    s = importer_summary('40__System__2dElevationsView', exclude_prefix=M + '/40__System__2dElevationsView/', top=0)
    fr(id='FR-25', level='folder', kind='retire', current_vv=M + '/91__System__2dElevationsView/ (after FR-01)', target_vv=None, tv_twin=None,
       reason='Retire the legacy Elevation View once Adam confirms the Elevation drawings cover it (D-S01-02 b later): remove the Tools-menu item (index.html:519-526), the imports (:1375-1376), the export-override chain (:1874) and init (:2149), and the DropdownAndToast "Elevation View - Cursor and UI States" region (:1341-1372). Its 2dProfileLines pass has already left (FR-08), so the composer is unaffected.',
       importers=s['main'], risk='Medium (user-visible tool removed).', decision_refs=['D-S01-02', 'D-S09-10'], phase='W3', evidence=['S09-F46', 'S01-F02'])


# -----------------------------------------------------------------------------
# validation
# -----------------------------------------------------------------------------
def validate():
    errs = []
    req_tf = ['scope', 'current_vv', 'target_vv', 'tv_equivalent', 'action', 'reason', 'importers_to_update', 'config_paths_to_update', 'risk', 'decision_refs', 'evidence']
    req_fr = ['current_vv', 'target_vv', 'tv_twin', 'kind', 'reason', 'importers', 'risk', 'decision_refs']
    ids = set()
    for r in TF:
        for k in req_tf:
            if k not in r:
                errs.append('%s missing %s' % (r.get('id'), k))
        if r['id'] in ids:
            errs.append('duplicate id ' + r['id'])
        ids.add(r['id'])
        if r['scope'] not in SCOPES:
            errs.append('%s bad scope' % r['id'])
        if r['action'] not in ACTIONS_FOLDER:
            errs.append('%s bad action %s' % (r['id'], r['action']))
        for d in r['decision_refs']:
            if d not in DECISIONS:
                errs.append('%s unknown decision %s' % (r['id'], d))
        for e in r['evidence']:
            if re.match(r'^S\d\d[ab]?-[FV]\d+$', e) and e not in FINDINGS:
                errs.append('%s unknown finding %s' % (r['id'], e))
        for w in r.get('work_packages', []):
            if w not in WPS:
                errs.append('%s unknown WP %s' % (r['id'], w))
        cv, tv = r['current_vv'], r['tv_equivalent']
        if cv and not os.path.exists(os.path.join(VV, cv)):
            errs.append('%s current_vv missing on disk: %s' % (r['id'], cv))
        if tv and not os.path.exists(os.path.join(TV, tv)):
            errs.append('%s tv_equivalent missing on disk: %s' % (r['id'], tv))
        if r['action'] in ('renumber', 'move', 'add', 'add_later') and r['target_vv'] and r['target_vv'] != cv:
            if os.path.exists(os.path.join(VV, r['target_vv'])) and not any(o['current_vv'] == r['target_vv'] and o['action'] in ('renumber', 'move') for o in TF):
                errs.append('%s target already occupied in VV: %s' % (r['id'], r['target_vv']))
    # unique final targets per scope
    seen = {}
    for r in TF:
        t = r['target_vv']
        if t:
            if t in seen:
                errs.append('target collision %s and %s -> %s' % (seen[t], r['id'], t))
            seen[t] = r['id']
    # final top-level numbers unique and VV-only numbers free in TV (current + history)
    final_top = [r['target_vv'].split('/')[1] for r in TF if r['scope'] == 'top' and r['target_vv']]
    nums = defaultdict(list)
    for f in final_top:
        nums[num(f)].append(f)
    tv_nums_now = {num(f): f for f in TV_TOP}
    tv_hist = defaultdict(set)
    for f in TV_HISTORY_FOLDERS:
        if num(f):
            tv_hist[num(f)].add(f)
    collisions = []
    for n, fs in nums.items():
        if len(fs) > 1:
            errs.append('final VV top-level number %s used twice: %s' % (n, fs))
        for f in fs:
            if n in tv_nums_now and tv_nums_now[n] != f:
                collisions.append((n, f, tv_nums_now[n]))
    for r in TF:
        if r['scope'] == 'top' and r['action'] in ('renumber', 'move') and r.get('numbering') in ('legacy_vv', 'collision_deferred'):
            n = num(r['target_vv'].split('/')[1])
            if n in tv_nums_now:
                errs.append('%s target number %s is used by TV now (%s)' % (r['id'], n, tv_nums_now[n]))
            hist_top = [h for h in tv_hist.get(n, ()) if h.startswith(n + '__System') or h.startswith(n + '__Feature')]
            if hist_top:
                errs.append('%s target number %s appears in TV devlog history: %s' % (r['id'], n, hist_top))
    for r in FR:
        for k in req_fr:
            if k not in r:
                errs.append('%s missing %s' % (r.get('id'), k))
        if r['kind'] not in KINDS_FILE:
            errs.append('%s bad kind' % r['id'])
        for d in r['decision_refs']:
            if d not in DECISIONS:
                errs.append('%s unknown decision %s' % (r['id'], d))
        for w in r.get('work_packages', []):
            if w not in WPS:
                errs.append('%s unknown WP %s' % (r['id'], w))
        cv = r['current_vv']
        if cv and '(' not in cv and not os.path.exists(os.path.join(VV, cv)):
            errs.append('%s current_vv missing: %s' % (r['id'], cv))
        tw = r['tv_twin']
        if tw and '(' not in tw and not os.path.exists(os.path.join(TV, tw)):
            errs.append('%s tv_twin missing in TV: %s' % (r['id'], tw))
    return errs, collisions


# -----------------------------------------------------------------------------
# markdown tables
# -----------------------------------------------------------------------------
def cell(v):
    if v is None:
        return '-'
    if isinstance(v, list):
        return '<br>'.join(cell(x) for x in v) if v else '-'
    if isinstance(v, dict):
        return '%s files / %s refs' % (v.get('files', 0), v.get('refs', 0))
    return str(v).replace('|', '/').replace('\n', ' ')


def short(p):
    if not p:
        return '-'
    if p.rstrip('/') == '02__Src__AppModules/51__System__LayoutEditor':
        return '51__System__LayoutEditor/'
    return p.replace('02__Src__AppModules/51__System__LayoutEditor/', 'LE/').replace('02__Src__AppModules/', '').replace('03__Style__AppStylesheets/', 'styles/')


def md_tables(collisions):
    out = {}
    for scope, title in (('top', 'top'), ('le_sub', 'le'), ('root_content', 'root'), ('style', 'style')):
        lines = ['| Id | VV now | VV target | TV equivalent | Action | Phase | Importers to update | K1 DR | Raw decision ids |', '|---|---|---|---|---|---|---|---|---|']
        for r in TF:
            if r['scope'] != scope:
                continue
            imp = r['importers_to_update']
            if imp.get('files'):
                impc = '%d files / %d refs' % (imp['files'], imp['refs'])
            elif imp.get('tv_files_outside_naming_it') is not None:
                impc = 'none in VV; %d TV files outside it name it (they port unchanged)' % imp['tv_files_outside_naming_it']
            else:
                impc = '-'
            lines.append('| %s | %s | %s | %s | **%s** | %s | %s | %s | %s |' % (
                r['id'], short(r['current_vv']), short(r['target_vv']), short(r['tv_equivalent']), r['action'], r.get('phase', '-'), impc,
                ', '.join(r.get('dr_refs', [])) or '-', ', '.join(r['decision_refs']) or '-'))
        out[title] = '\n'.join(lines)
    lines = ['| Id | Kind | Level | VV now | VV target | TV twin | Phase | Importers | K1 DR | Raw decision ids |', '|---|---|---|---|---|---|---|---|---|---|']
    for r in FR:
        imps = r['importers']
        n = len([x for x in imps if not x.startswith('(TV importers')])
        lines.append('| %s | **%s** | %s | %s | %s | %s | %s | %s | %s | %s |' % (
            r['id'], r['kind'], r.get('level', 'file'), short(r['current_vv']), short(r['target_vv']), short(r['tv_twin']), r.get('phase', '-'),
            ('%d files' % n) if n else '-', ', '.join(r.get('dr_refs', [])) or '-', ', '.join(r['decision_refs']) or '-'))
    out['files'] = '\n'.join(lines)
    # collision table: every top-level number either app uses, now and after
    vv_now = {num(f): f for f in VV_TOP}
    vv_final, row_by_target, row_by_current = {}, {}, {}
    for r in TF:
        if r['scope'] != 'top':
            continue
        if r['target_vv']:
            f = r['target_vv'].split('/')[1]
            vv_final[num(f)] = f
            row_by_target[f] = r
        if r['current_vv']:
            row_by_current[r['current_vv'].split('/')[1]] = r
    tv_now = {num(f): f for f in TV_TOP}
    allnums = sorted(set(vv_now) | set(vv_final) | set(tv_now) | {'90', '91', '92', '93', '94', '95', '96', '97', '98', '99'})
    lines = ['| No. | TV today | VV today | VV target | When | Status after the change |', '|---|---|---|---|---|---|']
    for n in allnums:
        t, v, vf = tv_now.get(n), vv_now.get(n), vv_final.get(n)
        when = row_by_target[vf].get('phase', '-') if vf in row_by_target else (row_by_current[v].get('phase', '-') if v in row_by_current else '-')
        if t and vf and t == vf:
            if v == vf:
                st = 'shared (same system, same name)'
            elif v:
                moved_to = row_by_current[v]['target_vv'].split('/')[1] if row_by_current[v]['target_vv'] else 'retired'
                src = row_by_target[vf].get('current_vv')
                st = 'shared after W1: VV %s leaves for %s; ' % (v, moved_to)
                st += ('VV %s renumbers into it' % src.split('/')[1]) if src else ('TV\'s folder lands here with its port')
            else:
                act = row_by_target[vf]['action']
                st = 'VV gains TV\'s folder at TV\'s number' + (' (decision-gated)' if act == 'add_later' else '')
        elif t and vf and t != vf:
            st = '**COLLISION** (%s vs %s)' % (t, vf)
            if n == '41':
                st = 'same number and role, different engine (DIV-2, kept on purpose)'
            if n == '62':
                st = 'nominal collision, kept (DR-03 default): VV EmailWorkers stays at 62 and moves to 92 only on request (FR-22, K3 W6-03); TV\'s AppInstallability is never ported (VV uses the WCP PWA)'
        elif t and not vf:
            if n == '62':
                st = 'nominal collision, kept (DR-03 default): VV EmailWorkers moves to 92 only on request (FR-22, K3 W6-03); TV\'s AppInstallability is never ported (VV uses the WCP PWA)'
            elif n in ('75', '76'):
                st = 'TV-only, not ported'
            else:
                st = 'TV-only (VV may gain it at this number)'
        elif vf and not t:
            st = 'VV-only, reserved for VV in the registry'
            if v != vf and v is None:
                src = [k for k, rr in row_by_current.items() if rr.get('target_vv') and rr['target_vv'].split('/')[1] == vf]
                st = 'VV-only band: %s moves here' % (src[0] if src else '?')
        elif n == '92':
            st = 'VV-only band: reserved for 62__Feature__EmailWorkers if Adam asks for the move (FR-22, K3 W6-03)'
            when = 'W3 (only on request; K3 W6-03)'
        elif n == '90':
            st = 'TV historical (90__System__PageLayoutSystem, retired v2.155.0) - burnt, never reuse'
        elif v and not vf:
            st = 'VV legacy, retired; number burnt (never reused)' if n == '35' else 'VV folder retired'
        else:
            st = 'free - VV-only band (93-99 for future VV-only folders)'
        lines.append('| %s | %s | %s | %s | %s | %s |' % (n, t or '-', v or '-', vf or '-', when, st))
    out['collisions'] = '\n'.join(lines)
    return out


def fill_md(tables):
    p = os.path.join(REPORT, 'K2__TargetMaps.md')
    if not os.path.exists(p):
        return False
    txt = open(p, encoding='utf-8').read()
    for name, body in tables.items():
        pat = re.compile(r'(<!-- BEGIN:K2:%s -->).*?(<!-- END:K2:%s -->)' % (name, name), re.S)
        if pat.search(txt):
            txt = pat.sub(lambda m: m.group(1) + '\n' + body + '\n' + m.group(2), txt)
    open(p, 'w', encoding='utf-8', newline='\n').write(txt)
    return True


def main():
    build_top()
    build_le()
    build_root()
    build_style()
    build_files()
    order = ['id', 'scope', 'current_vv', 'target_vv', 'tv_equivalent', 'action', 'reason', 'importers_to_update',
             'config_paths_to_update', 'risk', 'decision_refs', 'dr_refs', 'evidence', 'phase', 'numbering', 'work_packages',
             'vv_files_lines', 'tv_files_lines']
    for i, r in enumerate(TF):
        r.setdefault('importers_to_update', {'files': 0, 'refs': 0, 'main': []})
        r.setdefault('config_paths_to_update', [])
        r.setdefault('decision_refs', [])
        r.setdefault('evidence', [])
        r.setdefault('work_packages', [])
        r.setdefault('phase', '-')
        r.setdefault('risk', 'Low.')
        TF[i] = {k: r[k] for k in order if k in r} | {k: v for k, v in r.items() if k not in order}
    forder = ['id', 'level', 'kind', 'current_vv', 'target_vv', 'tv_twin', 'reason', 'importers', 'self_imports_to_fix',
              'risk', 'decision_refs', 'dr_refs', 'phase', 'work_packages', 'notes', 'evidence']
    for i, r in enumerate(FR):
        r.setdefault('level', 'file')
        r.setdefault('notes', '')
        FR[i] = {k: r[k] for k in forder if k in r} | {k: v for k, v in r.items() if k not in forder}
    unmapped = set()
    for rows in (TF, FR):
        for r in rows:
            r['dr_refs'] = sorted({RAW2DR[d] for d in r['decision_refs'] if d in RAW2DR}, key=lambda x: int(x.split('-')[1]))
            unmapped |= {d for d in r['decision_refs'] if d not in RAW2DR}
    if RAW2DR and unmapped:
        print('raw decision ids with no K1 DR mapping:', sorted(unmapped))
    errs, collisions = validate()
    json.dump(TF, open(os.path.join(DATA, 'target_folder_map.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    json.dump(FR, open(os.path.join(DATA, 'file_rename_map.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    tables = md_tables(collisions)
    json.dump(tables, open(os.path.join(PAR, 'k2work', 'k2_tables.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    filled = fill_md(tables)
    by = defaultdict(lambda: defaultdict(int))
    for r in TF:
        by[r['scope']][r['action']] += 1
    kinds = defaultdict(int)
    for r in FR:
        kinds[r['kind']] += 1
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    print('target_folder_map rows: %d %s' % (len(TF), {k: dict(v) for k, v in by.items()}))
    print('file_rename_map rows: %d %s' % (len(FR), dict(kinds)))
    print('final-number collisions with TV (kept on purpose / deferred):', collisions)
    print('MD tables filled:', filled)
    if errs:
        print('VALIDATION ERRORS (%d):' % len(errs))
        for e in errs:
            print('  ' + e)
        sys.exit(1)
    print('VALIDATION: PASS')


if __name__ == '__main__':
    main()
