"""W0-01 acceptance, checked against the PLAN as written (read-only)."""
import io, json, os, re, sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
EVID = os.path.join(VV, 'ValeVision__AUDIT__TrueVisionParity__Evidence__')
plan = io.open(os.path.join(VV, 'ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md'), encoding='utf-8').read()
reg = json.load(io.open(os.path.join(EVID, 'parity', 'data', 'decision_register.json'), encoding='utf-8'))
canon = json.load(io.open(os.path.join(EVID, 'parity', 'data', 'wp_canonical.json'), encoding='utf-8'))

s2a = plan[plan.index('## 2A. Decisions (01-Oct-2026)'): plan.index('## 3. What was found')]
rows = {m.group(1): m.group(0) for m in re.finditer(r'^\| (D\d+) \|.*$', s2a, flags=re.M)}
results = []


def check(item, ok, note):
    results.append((item, ok, note))


# 1. one D-number per DR, option/default named, a key or constant set
bad = []
for r in reg:
    n = int(r['dr_id'][3:]) + 40
    row = rows.get('D%d' % n, '')
    parts = [p.strip() for p in row.strip().strip('|').split('|')]
    if not (len(parts) == 5 and parts[1] == r['dr_id'] and parts[2] == r['title'].strip()
            and parts[3].startswith('01-Oct-2026 - default, unanswered: ' + r['default_if_unanswered'].strip())
            and len(parts[4]) > 40):
        bad.append(r['dr_id'])
check(1, not bad and len(reg) == 44, 'D41-D84 = DR-01..DR-44, each dated, "default, unanswered" + verbatim K1 default + a Sets cell; bad: %s' % (bad or 'none'))

# 2. the four cross-slice values with their constants
t = s2a[s2a.index('### 2A.3'): s2a.index('### 2A.4')]
need = {
    'face (DR-21)': ['Sheet__FontFamily', 'LayoutEditor__Pdf__FontCdnBase', 'LayoutEditor__Pdf__Fonts[].FileName', 'LayoutEditor__Style__FontFamily', 'D61 (DR-21)'],
    'document id (DR-11)': ['Na__LeModel__GetDocumentId', '{project}_{drawing}', '{project}_{phase}_{drawing}', 'LayoutEditor__DrawingRegister__DocumentCodeFormat', 'D51 (DR-11)'],
    'share link (DR-23)': ['Link__QueryPattern', '?project={projectCode}&open={documentKey}', 'folderId', 'Na__LeShareLink__CODE_PATTERN', 'D63 (DR-23)'],
    'sheet images (DR-29)': ['Na__LePubSheet__IMAGES_DIR', '05__Layout__DrawingDocs__Images', 'D69 (DR-29)'],
}
miss = ['%s: %s' % (k, x) for k, xs in need.items() for x in xs if x not in t]
check(2, not miss, 'four values in 2A.3 with constants; missing: %s' % (miss or 'none'))

# 3. the devlog version step
q = rows.get('D85', '')
miss = [x for x in ('Q-VER', 'patch bumps from v2.71.1', 'devlog-entries-use-patch-bumps', 'DR-34', 'v2.72.0', 'relabel', 'W0-99') if x not in q]
check(3, not miss, 'D85 Q-VER: patch steps from v2.71.1, the memory note, DR-34/S11 minor steps, relabel; missing: %s' % (miss or 'none'))

# 4. R1-R11 and G1-G7 verbatim, and the SHARED SERVICE WORKER note format
missing_r = [x[:12] for x in canon['swarm_rules'] if ('`' + x + '`') not in s2a]
missing_g = [x[:12] for x in canon['standard_gates'] if ('`' + x + '`') not in s2a]
sw = s2a[s2a.index('### 2A.5'): s2a.index('### 2A.6')]
miss_sw = [x for x in ('SHARED SERVICE WORKER:', '- THE SHARED SERVICE WORKER.', '"n/a"', "Adam's call", 'PWA_SW_VERSION_TOKEN', "Service worker token: shared Whitecardopedia worker - Adam's call") if x not in sw]
check(4, not missing_r and not missing_g and not miss_sw,
      'R1-R11 %d/11 and G1-G7 %d/7 verbatim; SW note parts missing: %s' % (11 - len(missing_r), 7 - len(missing_g), miss_sw or 'none'))

# 5. DR-40 gesture items 7-10
d80 = rows.get('D80', '')
miss = [x for x in ('Items 1-6 adopt', 'items 7-10 are held', 'W3-03 writes the four guards', 'W3-04', 'stays held') if x not in d80]
check(5, not miss, 'D80: unanswered, W3-03 writes the four guards, W3-04 held; missing: %s' % (miss or 'none'))

# 7. the open questions
want = [('D85', 'Q-VER'), ('D86', 'Q-63'), ('D87', 'Q-35ASSETS'), ('D88', 'Q-REG'), ('D89', 'Q-AZIMUTH'), ('D90', 'Q-COVER'), ('D91', 'Q-BACKUP')]
bad = [d for d, qid in want if '| %s (R0.2.' % qid not in rows.get(d, '')]
az, cv = rows.get('D89', ''), rows.get('D90', '')
extra = []
if not all(x in az for x in ("planner's ruling, already applied", 'F.8 C20', 'W1-10', 'W2-05')):
    extra.append('Q-AZIMUTH ruling')
if not all(x in cv for x in ('default, unanswered', "planner's ruling, already applied", 'F.8 C22', 'W1-33', 'Na__LeLoadScreen__IsShown')):
    extra.append('Q-COVER parts')
for d in ('D86', 'D87', 'D88', 'D91'):
    if 'default, unanswered' not in rows.get(d, ''):
        extra.append(d + ' default')
if '%LOCALAPPDATA%\\ValeGardenHouses\\ValeVision\\ProjectDataBackups' not in rows.get('D91', ''):
    extra.append('Q-BACKUP path')
check(7, not bad and not extra, 'D85-D91 = the seven questions; problems: %s' % (bad + extra or 'none'))

# Orchestrator note: the dated note that Adam's instruction started the unattended run on the defaults
quote = '"Save this plan to the ValeVision Root and save a working memory for other agents. After that begin working through the plan and ensuring alignment"'
check('note', quote in s2a and 'started the unattended run on the defaults' in s2a and '**Dated note, 01-Oct-2026.**' in s2a,
      'dated note quoting the 01-Oct-2026 instruction')

# Section 0 pointer
check('nav', '- Section 2A (added 01-Oct-2026) records the TrueVision parity decisions D41 to D91' in plan, 'Section 0 points at 2A')

for item, ok, note in results:
    print('%-5s %s  %s' % (item, 'PASS' if ok else 'FAIL', note))
sys.exit(0 if all(ok for _, ok, _ in results) else 1)
