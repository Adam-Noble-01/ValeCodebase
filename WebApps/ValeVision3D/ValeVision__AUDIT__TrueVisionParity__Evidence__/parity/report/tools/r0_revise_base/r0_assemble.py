# r0_assemble.py - assembles and validates report section R0.
# 1. runs r0_build_decisions.py (decision tables from K1 + K3), 2. splices them into r0_source.md,
# 3. writes parity/report/R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md,
# 4. validates ids (DR, canonical WP, finding, K2 TF/FR) and paths against the trees. Read-only on the apps.
import json, os, re, subprocess, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.normpath(os.path.join(HERE, '..', '..'))
DATA = os.path.join(P, 'data')
REP = os.path.join(P, 'report')
OUT = os.path.join(REP, 'R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md')

TV_ROOT = r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb/na-apps/30__TrueVision__CoreAppCode'
VV_ROOT = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D'
WCP_ROOT = r'D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia'
NAAPPS = r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb/na-apps'

subprocess.run([sys.executable, os.path.join(HERE, 'r0_build_decisions.py')], check=True, stdout=subprocess.DEVNULL)
src = open(os.path.join(HERE, 'r0_source.md'), encoding='utf-8').read()
dec = open(os.path.join(HERE, 'r0_decisions.md'), encoding='utf-8').read()
assert src.count('<!-- R0:DECISIONS -->') == 1
doc = src.replace('<!-- R0:DECISIONS -->', dec.rstrip())
open(OUT, 'w', encoding='utf-8', newline='\n').write(doc)

errors, warns = [], []

# --- ids -------------------------------------------------------------------
DRS = {r['dr_id'] for r in json.load(open(os.path.join(DATA, 'decision_register.json'), encoding='utf-8'))}
W = json.load(open(os.path.join(DATA, 'wp_canonical.json'), encoding='utf-8'))
WPS = {p['wp_id'] for p in W['packages']}
F = json.load(open(os.path.join(DATA, 'findings_verified.json'), encoding='utf-8'))
FL = F if isinstance(F, list) else F.get('findings', [])
FIDS = {x['id'] for x in FL}
TF = json.load(open(os.path.join(DATA, 'target_folder_map.json'), encoding='utf-8'))
FR = json.load(open(os.path.join(DATA, 'file_rename_map.json'), encoding='utf-8'))
def ids_of(obj, key_guess):
    out = set()
    rows = obj if isinstance(obj, list) else next((v for v in obj.values() if isinstance(v, list)), [])
    for r in rows:
        for k in ('id', 'row_id', key_guess):
            if isinstance(r, dict) and k in r:
                out.add(r[k])
    return out
TFIDS = ids_of(TF, 'tf_id')
FRIDS = ids_of(FR, 'fr_id')

for m in sorted(set(re.findall(r'\bDR-\d\d\b', doc))):
    if m not in DRS: errors.append(f'unknown DR {m}')
missing_dr = sorted(DRS - set(re.findall(r'\bDR-\d\d\b', doc)))
if missing_dr: errors.append(f'DRs not mentioned: {missing_dr}')
for m in sorted(set(re.findall(r'\bW[0-6T]-\d\d\b', doc))):
    if m not in WPS: errors.append(f'unknown canonical WP {m}')
for m in sorted(set(re.findall(r'\bS\d\d[ab]?-[FV]\d\d\b', doc))):
    if m not in FIDS: errors.append(f'unknown finding {m}')
for m in sorted(set(re.findall(r'\bTF-[TLRS]\d\d\b', doc))):
    if TFIDS and m not in TFIDS: errors.append(f'unknown K2 folder row {m}')
for m in sorted(set(re.findall(r'\bFR-\d\d\b', doc))):
    if FRIDS and m not in FRIDS: errors.append(f'unknown K2 file row {m}')
raw = sorted(set(re.findall(r'\bWP-S\d\d[ab]?-[0-9A-Za-z]+\b', doc)))
if raw: warns.append(f'raw WP ids present: {raw}')

# --- paths -----------------------------------------------------------------
# K2 target -> today's VV folder (only the renumbered drawing folders and moved files)
T2C = {
    '40__System__DrawingViewCore': '42__System__DrawingViewCore',
    '42__System__FloorPlanViews': '43__System__FloorPlanViews',
    '43__System__PlanAnnotations': '44__System__PlanAnnotations',
    '44__System__PlanDimensions': '45__System__PlanDimensions',
    '45__System__ElevationViews': '46__System__ElevationViews',
    '46__System__NorthDirection': '47__System__NorthDirection',
    '91__System__2dElevationsView': '40__System__2dElevationsView',
}
FILE_T2C = {
    '40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js': '42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js',
    '05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js': '40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js',
    '05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js': '05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js',
    '02__AppData/Na__Hotkeys__3dModelTab__.json': '02__AppData/Na__ValeVision__HotkeysDictionary__.json',
}
NEW_OK = ('80__CloudflareIntegration/', 'Na__AppUtils__LocalProjectMirror__.js', '06__AppAssets__TitleBlocks', '07__Vendor__PdfJs',
          '05__Vendor__JsPdf', '06__Vendor__Html2Canvas', '50__ValeVision__UserConfig', '21__System__SitePlanData', 'README__CrossSectionView__.md')

def check_vv(rel):
    rel = rel.rstrip('/').rstrip('`')
    if any(k in rel for k in NEW_OK):
        return True
    cand = [rel]
    for t, c in FILE_T2C.items():
        if rel.endswith(t):
            cand.append(rel[: -len(t)] + c)
    for t, c in T2C.items():
        if '/' + t in '/' + rel:
            cand.append(('/' + rel).replace('/' + t, '/' + c)[1:])
    for c in cand:
        for base in (os.path.join(VV_ROOT, '02__Src__AppModules'), VV_ROOT):
            if os.path.exists(os.path.join(base, c)):
                return True
    return False

checked = collections.Counter()
for m in re.findall(r'`VVM/([^`]+?)`', doc):
    m = re.sub(r':[0-9][0-9,\-]*$', '', m.split(' ')[0])
    checked['VVM'] += 1
    if not check_vv(m): errors.append(f'VVM path not found (target or today): {m}')
for m in re.findall(r'`VV/([^`]+?)`', doc):
    m = re.sub(r':[0-9][0-9,\-]*$', '', m.split(' ')[0]).rstrip('/')
    if m.startswith('...'): continue
    checked['VV'] += 1
    if not check_vv(m): errors.append(f'VV path not found: {m}')
for m in re.findall(r'`TVM/([^`]+?)`', doc):
    m = re.sub(r':[0-9][0-9,\-]*$', '', m.split(' ')[0]).rstrip('/').rstrip('*').rstrip('/')
    checked['TVM'] += 1
    if not os.path.exists(os.path.join(TV_ROOT, '02__Src__AppModules', m)): errors.append(f'TVM path not found: {m}')
for m in re.findall(r'`TV/([^`]+?)`', doc):
    m = m.split(' ')[0].split(':')[0].rstrip('/')
    checked['TV'] += 1
    if not os.path.exists(os.path.join(TV_ROOT, m)): errors.append(f'TV path not found: {m}')
for m in re.findall(r'`WCP/([^`]+?)`', doc):
    m = m.split(' ')[0].split(':')[0].rstrip('/')
    if '<' in m or '...' in m: continue
    checked['WCP'] += 1
    if not os.path.exists(os.path.join(WCP_ROOT, m)): errors.append(f'WCP path not found: {m}')

# today's-number leak check: a current drawing folder name used without "today"
for line_no, line in enumerate(doc.splitlines(), 1):
    for cur in ('42__System__DrawingViewCore', '43__System__FloorPlanViews', '44__System__PlanAnnotations',
                '45__System__PlanDimensions', '46__System__ElevationViews', '47__System__NorthDirection', '40__System__2dElevationsView'):
        for mo in re.finditer(re.escape(cur), line):
            ctx = line[max(0, mo.start() - 60): mo.end() + 5]
            if 'today' not in ctx and 'Today' not in ctx and '->' not in ctx and 'VV 4' not in ctx and 'FR-' not in ctx:
                warns.append(f'line {line_no}: current folder name without "today": ...{ctx}...')

print('wrote', OUT, len(doc.splitlines()), 'lines,', len(doc), 'chars')
print('paths checked', dict(checked))
print('errors', len(errors)); [print('  E', e) for e in errors]
print('warnings', len(warns)); [print('  W', w) for w in warns[:40]]
sys.exit(1 if errors else 0)
