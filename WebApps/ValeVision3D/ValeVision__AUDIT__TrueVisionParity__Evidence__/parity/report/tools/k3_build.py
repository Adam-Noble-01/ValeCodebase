#!/usr/bin/env python3
"""K3 - build and validate the canonical work-package catalogue.

Reads the catalogue modules (k3_cat_w0..w4, w56, wt) and the Section F (R6) F.8 corrections layer
(k3_f8_corrections.py, H2 01-Oct-2026; K3_NO_F8=1 builds without it), the raw packages
(data/work_packages.json), K1's decisions (data/decision_register.json,
data/decision_raw_map.json), K2's maps (data/file_rename_map.json) and the
tree snapshots (ref/tree_tv.tsv, ref/tree_vv.tsv). Read-only on both apps:
paths outside the snapshots are checked with os.path.exists only.

Writes data/wp_canonical.json, data/wp_raw_map.json,
data/hot_file_ownership.json and (via k3_report_md) report/K3__WorkPackages.md.
Exit 0 = every validation passed; 1 = errors (nothing written unless --force).
"""
import csv, collections, importlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAR = os.path.normpath(os.path.join(HERE, '..', '..'))
DATA = os.path.join(PAR, 'data')
REF = os.path.join(PAR, 'ref')
REPORT = os.path.join(PAR, 'report')
sys.path.insert(0, HERE)

import k3_common as C
for _m in ['k3_cat_w0', 'k3_cat_w1', 'k3_cat_w2', 'k3_cat_w3', 'k3_cat_w4', 'k3_cat_w56', 'k3_cat_wt']:
    importlib.import_module(_m)
# Section F (R6) F.8 corrections layer (H2, 01-Oct-2026): defines W5-07 here, applies the other rows below.
import k3_f8_corrections as F8  # noqa: E402

ROOTS = {
    'TV': r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode',
    'VV': r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D',
    'WCP': r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia',
    'VCB': r'D:\10_CoreLib__ValeCodebase',
    'NAAPPS': r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps',
    'NAWEB': r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb',
}
TV_HEAD, VV_HEAD = 'b2aa9151 (v2.172.0)', '7b4e593a (v2.71.0)'
WAVES = ['W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6']
LANES = WAVES + ['WT']
SCRIBE = {'W0': 'W0-99', 'W1': 'W1-99', 'W2': 'W2-99', 'W3': 'W3-99', 'W4': 'W4-99', 'W5': 'W5-99', 'W6': 'W6-04'}
RECORD_PACKAGES = {'W0-01', 'W0-06'}          # records packages allowed to touch the ledger/devlog/plan besides the scribes
SW_OWNERS = {'W0-08', 'W6-02'}                 # R6 / DR-07

DROPPED = {
    'WP-S03b-01': 'Optional bridge (TV-format records read through a VV adapter) made unnecessary: the same-wave whole-file ports '
                  'take History 1.7.0 (W1-21), Layers 1.4.0 and Shapes 1.6.0 (W1-20) and MarkupBridge 1.20.0 (W1-28), so no '
                  'interim bridge is ever live (DR-05 rule: no throwaway stubs).',
}

# Raw ids refuted by the verifiers (data/raw/verify__*.json "refuted_work_packages") and the live ids that replace them.
RETIRED = {
    'WP-S01-01': ['WP-S01-01R'], 'WP-S01-03': ['WP-S01-03R'], 'WP-S01-04': ['WP-S01-04R'], 'WP-S01-06': ['WP-S01-06R'], 'WP-S01-08': ['WP-S01-08R'],
    'WP-S02a-14': ['WP-S02b-04R'], 'WP-S02a-15': ['WP-S03b-05'],
    'WP-S02b-02': ['WP-S02b-02R'], 'WP-S02b-03': ['WP-S06b-08'], 'WP-S02b-04': ['WP-S02b-04R'], 'WP-S02b-05': ['WP-S04a-07R'],
    'WP-S02b-06': ['WP-S04a-06'], 'WP-S02b-07': ['WP-S04a-08R'], 'WP-S02b-10': ['WP-S02b-10R'],
    'WP-S03a-01': ['WP-S03a-V01'], 'WP-S03a-03': ['WP-S03a-V03'], 'WP-S03a-04': ['WP-S03a-V04'], 'WP-S03a-11': ['WP-S03a-V02'],
    'WP-S03b-02': ['WP-S03b-02R'], 'WP-S03b-03': ['WP-S03b-03R'], 'WP-S03b-06': ['WP-S03b-06R'], 'WP-S03b-07': ['WP-S03b-07R'], 'WP-S03b-09': ['WP-S03b-09R'],
    'WP-S04a-01': ['WP-S04a-01R'], 'WP-S04a-03': ['WP-S04a-03R'], 'WP-S04a-05': ['WP-S04a-05R'], 'WP-S04a-07': ['WP-S04a-07R'],
    'WP-S04a-08': ['WP-S04a-08R'], 'WP-S04a-10': ['WP-S04a-10R'], 'WP-S04a-11': ['WP-S04a-11R'], 'WP-S04a-13': ['WP-S04a-13R'],
    'WP-S04b-02': ['WP-S04b-02R'], 'WP-S04b-06': ['WP-S04b-06R'], 'WP-S04b-11': ['WP-S04b-11R'],
    'WP-S05a-01': ['WP-S03a-V03'], 'WP-S05a-02': ['WP-S03a-09'], 'WP-S05a-04': ['WP-S03a-V01'], 'WP-S05a-05': ['WP-S03a-02'],
    'WP-S05a-07': ['WP-S05a-07Ra', 'WP-S05a-07Rb'], 'WP-S05a-08': ['WP-S05a-08R'],
    'WP-S05b-03': ['WP-S03b-03R', 'WP-S03b-04', 'WP-S05a-08R', 'WP-S03a-V01', 'WP-S06a-07'],
    'WP-S05b-04': ['WP-S03b-06R', 'WP-S03b-07R', 'WP-S05b-V1'],
    'WP-S05b-05': ['WP-S06a-07', 'WP-S06a-02', 'WP-S05a-06', 'WP-S05b-07'],
    'WP-S05b-06': ['WP-S06a-07', 'WP-S06a-01', 'WP-S05a-06', 'WP-S05b-V2'],
    'WP-S05b-08': ['WP-S05b-V3', 'WP-S05b-V4'],
    'WP-S05b-09': ['WP-S05a-06', 'WP-S05a-08R', 'WP-S05b-V4'],
    'WP-S06a-03': ['WP-S06a-03v'], 'WP-S06a-04': ['WP-S06a-04v'], 'WP-S06a-05': ['WP-S06a-05v'], 'WP-S06a-08': ['WP-S06a-08v'], 'WP-S06a-10': ['WP-S06a-10v'],
    'WP-S06b-07': ['WP-S06b-07a', 'WP-S06b-07b'], 'WP-S06b-10': ['WP-S06b-10a', 'WP-S06b-10b'], 'WP-S06b-11': ['WP-S06a-03v'],
    'WP-S06b-12': ['WP-S08-03', 'WP-S08-11'],
    'WP-S07b-01': ['WP-S06b-01'], 'WP-S07b-05': ['WP-S07b-05A', 'WP-S07b-05B', 'WP-S07b-05C'], 'WP-S07b-06': ['WP-S07b-05C', 'WP-S07b-05A'],
    'WP-S07b-07': ['WP-S07b-05A', 'WP-S07b-05C'],
    'WP-S09-05': ['WP-S03a-V03', 'WP-S03a-02'], 'WP-S09-09': ['WP-S09-09R'], 'WP-S09-11': ['WP-S09-11R'], 'WP-S09-12': ['WP-S09-12R'],
    'WP-S10-03': ['WP-S10-03R'], 'WP-S10-04': ['WP-S10-04R'], 'WP-S10-07': ['WP-S10-07R'], 'WP-S10-08': ['WP-S10-08R'],
    'WP-S12-09': ['WP-S12-V09R'],
}

HARD_GATE = {
    'W0-07': 'Prepared and dry-run only; Adam applies the sync fix (DR-06) before any package writes under VaApps/Projects/{folderId}/ subfolders (R8).',
    'W0-08': 'Prepared and tested, not bumped; Adam bumps the shared token at deploy (DR-07).',
    'W0-10': 'Built and proven under wrangler dev; only Adam deploys the worker (DR-28).',
    'W3-04': 'Held until Adam confirms DR-40 items 7-10 (DR-01 default holds the four gesture changes).',
    'W4-12': 'Lands switched off: LayoutEditor__Statement__Enabled = false until Adam answers DR-10.',
    'W4-13': 'Lands switched off: LayoutEditor__Statement__Enabled = false until Adam answers DR-10.',
    'W5-04': 'Optional (DR-44 default: VV unchanged; Cache & Storage optional).',
    'W5-05': 'Runs only after Adam chooses the Vale resolver (DR-12 default (A) keeps the QR code off).',
    'W5-06': 'Runs only if Adam answers DR-08 with (A) (default (B): site plans dormant).',
    'W6-02': 'Prepared, not bumped; Adam bumps the shared token at deploy (DR-07).',
    'W6-03': 'Adam confirms the user-visible removals first (DR-03); 62 -> 92 only if D-S01-08 is answered (a).',
}

SIZE_LIMIT_LINES, SIZE_LIMIT_FILES = 2500, 15

# --------------------------------------------------------------------------- helpers
def load_json(name):
    with open(os.path.join(DATA, name), encoding='utf-8') as f:
        return json.load(f)

def tree(fn):
    files, dirs = {}, set()
    with open(os.path.join(REF, fn), encoding='utf-8') as f:
        for r in csv.DictReader(f, delimiter='\t'):
            p = r['relpath'].replace(chr(92), '/')
            if '.claude/' in p or 'node_modules' in p:
                continue
            files[p] = r['lines']
            parts = p.split('/')
            for i in range(1, len(parts)):
                dirs.add('/'.join(parts[:i]))
    return files, dirs

PAREN = re.compile(r'\s*\([^()]*\)\s*$')

def is_new(entry):
    # '(new)' may be followed by further annotations, as in '... (new) (F.8 C14)' (H2)
    return bool(re.search(r'\(new(?: in TV)?\)(?:\s*\([^()]*\))*\s*$', entry.strip()))

def strip_notes(entry):
    s = entry.strip()
    prev = None
    while prev != s:
        prev = s
        s = PAREN.sub('', s).strip()
    return s

def canon(p):
    """Canonical repo-qualified path: VV/..., TV/..., WCP/..., VCB/..., NAAPPS/..., NAWEB/..."""
    if p.startswith('VVM/'):
        return 'VV/02__Src__AppModules/' + p[4:]
    if p.startswith('TVM/'):
        return 'TV/02__Src__AppModules/' + p[4:]
    return p

def split_entry(entry):
    """An entry may be 'A -> B' (a move). Returns list of (canonical path, created?)."""
    raw = strip_notes(entry)
    if ' -> ' in raw:
        a, b = [x.strip() for x in raw.split(' -> ', 1)]
        b = strip_notes(b)
        return [(canon(a), False), (canon(b), True)]
    return [(canon(raw), is_new(entry))]

def short(p):
    p = p.rstrip('/')
    return p.split('/')[-1] if '/' in p else p

def root_of(cp):
    pre = cp.split('/', 1)[0]
    return pre, (cp.split('/', 1)[1] if '/' in cp else '')

def disk_exists(cp):
    pre, rel = root_of(cp)
    base = ROOTS.get(pre)
    if not base:
        return None
    return os.path.exists(os.path.join(base, rel.replace('/', os.sep)))

def mermaid_id(w):
    return w.replace('-', '_')

# --------------------------------------------------------------------------- load
CAT = C.CAT
RAW = load_json('work_packages.json')
RAW_BY_ID = {r['id']: r for r in RAW}
DRS = load_json('decision_register.json')
DR_BY_ID = {d['dr_id']: d for d in DRS}
DRMAP = load_json('decision_raw_map.json')['raw_id_map']
FRMAP = load_json('file_rename_map.json')
TV_FILES, TV_DIRS = tree('tree_tv.tsv')
VV_FILES, VV_DIRS = tree('tree_vv.tsv')

errors, warnings, notes_log = [], [], []
def err(msg): errors.append(msg)
def warn(msg): warnings.append(msg)

for p in CAT:
    p.setdefault('tv_targets', [])
    p.setdefault('lane', 'ValeVision')
    p['hard_gate'] = HARD_GATE.get(p['wp_id'], 'Runs only with Adam\'s per-package approval (DR-36 (b)); default (a): not run.' if p['wave'] == 'WT' else '')
    if p['wp_id'] in ('WT-10', 'WT-11'):
        p['hard_gate'] += ' Optional (DR-42 default: none happen).'

# R6 F.8 corrections (H2): package text and targets, the planner steps and the K3 rule amendments.
F8_LOG = F8.apply(CAT)

BY_ID = {}
for p in CAT:
    if p['wp_id'] in BY_ID:
        err('duplicate wp_id %s' % p['wp_id'])
    BY_ID[p['wp_id']] = p
    if p['wave'] not in LANES:
        err('%s: unknown wave %s' % (p['wp_id'], p['wave']))
    if not re.match(r'^(W[0-6]|WT)-\d\d$', p['wp_id']) or not p['wp_id'].startswith(p['wave'] + '-'):
        err('%s: id does not match wave %s' % (p['wp_id'], p['wave']))

def lane_index(w):
    return LANES.index(BY_ID[w]['wave'])

# --------------------------------------------------------------------------- barrier deps
auto_deps = collections.defaultdict(list)
for wave in WAVES:
    members = [p for p in CAT if p['wave'] == wave]
    sid = SCRIBE[wave]
    if sid not in BY_ID:
        err('wave %s has no scribe package %s' % (wave, sid))
        continue
    scribe = BY_ID[sid]
    for p in members:
        if p['wp_id'] != sid and p['wp_id'] not in scribe['depends_on']:
            scribe['depends_on'].append(p['wp_id'])
            auto_deps[sid].append(p['wp_id'])
    if wave != 'W0':
        prev = SCRIBE[WAVES[WAVES.index(wave) - 1]]
        for p in members:
            if p['wp_id'] == sid:
                continue
            same_wave = [d for d in p['depends_on'] if d in BY_ID and BY_ID[d]['wave'] == wave]
            if not same_wave and prev not in p['depends_on']:
                p['depends_on'].insert(0, prev)
                auto_deps[p['wp_id']].append(prev)
for p in CAT:
    if p['wave'] == 'WT' and not p['depends_on']:
        p['depends_on'].append('W0-01')
        auto_deps[p['wp_id']].append('W0-01')

# --------------------------------------------------------------------------- dependency validation
for p in CAT:
    seen = set()
    for d in p['depends_on']:
        if d not in BY_ID:
            err('%s depends on unknown package %s' % (p['wp_id'], d))
            continue
        if d == p['wp_id']:
            err('%s depends on itself' % d)
        if d in seen:
            warn('%s lists dependency %s twice' % (p['wp_id'], d))
        seen.add(d)
        q = BY_ID[d]
        if p['wave'] != 'WT':
            if q['wave'] == 'WT':
                err('%s (VV wave) depends on TrueVision-lane package %s' % (p['wp_id'], d))
            elif WAVES.index(q['wave']) > WAVES.index(p['wave']):
                err('%s (%s) depends on later-wave %s (%s)' % (p['wp_id'], p['wave'], d, q['wave']))
    for s in p.get('soft_after', []):
        if s not in BY_ID:
            err('%s soft_after unknown %s' % (p['wp_id'], s))
    p['depends_on'] = list(dict.fromkeys(p['depends_on']))

# topological order (Kahn), stable by catalogue order
indeg = {p['wp_id']: 0 for p in CAT}
children = collections.defaultdict(list)
for p in CAT:
    for d in p['depends_on']:
        if d in BY_ID:
            indeg[p['wp_id']] += 1
            children[d].append(p['wp_id'])
order_key = {p['wp_id']: (LANES.index(p['wave']), i) for i, p in enumerate(CAT)}
ready = sorted([w for w, n in indeg.items() if n == 0], key=order_key.get)
TOPO = []
while ready:
    w = ready.pop(0)
    TOPO.append(w)
    for c in children[w]:
        indeg[c] -= 1
        if indeg[c] == 0:
            ready.append(c)
            ready.sort(key=order_key.get)
if len(TOPO) != len(CAT):
    stuck = [w for w, n in indeg.items() if n > 0]
    err('dependency cycle among: %s' % ', '.join(sorted(stuck)))
TOPO_POS = {w: i for i, w in enumerate(TOPO)}

ANC = {}
def ancestors(w):
    if w in ANC:
        return ANC[w]
    s = set()
    for d in BY_ID[w]['depends_on']:
        if d in BY_ID:
            s.add(d)
            s |= ancestors(d)
    ANC[w] = s
    return s
if not errors or len(TOPO) == len(CAT):
    for w in TOPO:
        ancestors(w)

def ordered(a, b):
    return a in ANC.get(b, set()) or b in ANC.get(a, set())

# barrier check
for p in CAT:
    if p['wave'] in WAVES and p['wave'] != 'W0' and p['wp_id'] in ANC:
        prev = SCRIBE[WAVES[WAVES.index(p['wave']) - 1]]
        if prev not in ANC[p['wp_id']]:
            err('%s does not depend (transitively) on the previous wave scribe %s' % (p['wp_id'], prev))
# scribe must close its wave
for wave in WAVES:
    sid = SCRIBE[wave]
    if sid in ANC:
        missing = [p['wp_id'] for p in CAT if p['wave'] == wave and p['wp_id'] != sid and p['wp_id'] not in ANC[sid]]
        if missing:
            err('scribe %s does not close %s' % (sid, missing))

# --------------------------------------------------------------------------- raw coverage
raw_ids = set(RAW_BY_ID)
primary = collections.defaultdict(list)
splits = collections.defaultdict(list)
for p in CAT:
    for r in p['source_wp_ids']:
        primary[r].append(p['wp_id'])
    for r in p['split_from']:
        splits[r].append(p['wp_id'])
for r, ws in primary.items():
    if r not in raw_ids:
        err('%s: source_wp_ids names %s, which is not a live raw id' % (ws, r))
    if len(ws) > 1:
        err('raw id %s is the primary source of more than one package: %s' % (r, ws))
for r, ws in splits.items():
    if r not in raw_ids:
        err('%s: split_from names %s, which is not a live raw id' % (ws, r))
for r in DROPPED:
    if r not in raw_ids:
        err('dropped id %s is not a live raw id' % r)
    if r in primary:
        err('dropped id %s is also mapped to %s' % (r, primary[r]))
unmapped = sorted(raw_ids - set(primary) - set(DROPPED))
for r in unmapped:
    err('raw id %s is neither mapped nor dropped' % r)
for r in splits:
    if r in DROPPED:
        warn('dropped id %s also appears in split_from of %s' % (r, splits[r]))

# retired aliases
alias_refs = collections.defaultdict(set)
for r in RAW:
    for d in r.get('depends_on', []):
        for m in re.findall(r'WP-S\d+[ab]?-[0-9A-Za-z]+', d):
            if m not in raw_ids:
                alias_refs[m].add(r['id'])
for d in DRS:
    b = d.get('blocks') or {}
    if isinstance(b, dict):
        for s in b.get('superseded_wp_refs', []):
            a = s.split('->')[0].strip()
            alias_refs[a].add(d['dr_id'])
        for w in b.get('work_packages', []):
            if w not in raw_ids:
                alias_refs[w].add(d['dr_id'] + ' blocks')
REFUTED_REASON = {}
for fn in sorted(os.listdir(os.path.join(DATA, 'raw'))):
    if fn.startswith('verify__') and fn.endswith('.json'):
        with open(os.path.join(DATA, 'raw', fn), encoding='utf-8') as f:
            v = json.load(f)
        for x in v.get('refuted_work_packages') or []:
            REFUTED_REASON[x['id']] = x.get('reason', '')
for a in sorted(set(alias_refs) | set(REFUTED_REASON)):
    if a not in RETIRED:
        err('retired/referenced raw id %s has no alias mapping' % a)
for a, reps in RETIRED.items():
    for r in reps:
        if r not in raw_ids:
            err('alias %s -> %s: replacement is not a live raw id' % (a, r))
    if a in raw_ids:
        err('alias %s is also a live raw id' % a)

# --------------------------------------------------------------------------- gates
def drs_of_raw(rid):
    out = {}
    raw = RAW_BY_ID.get(rid)
    if not raw:
        return out
    for d in raw.get('depends_on', []):
        for m in re.findall(r'D-S\d+[ab]?-[0-9A-Za-z]+', d):
            dr = DRMAP.get(m)
            if dr:
                out.setdefault(dr, []).append('raw %s depends on %s' % (rid, m))
    return out

DR_BLOCKS = collections.defaultdict(list)
for d in DRS:
    b = d.get('blocks') or {}
    if isinstance(b, dict):
        for w in b.get('work_packages', []):
            DR_BLOCKS[w].append(d['dr_id'])

for p in CAT:
    prov = collections.defaultdict(list)
    for g in p['gated_by']:
        prov[g].append('K3')
    for r in p['source_wp_ids']:
        for dr, why in drs_of_raw(r).items():
            prov[dr].extend(why)
        for dr in DR_BLOCKS.get(r, []):
            prov[dr].append('%s blocks %s' % (dr, r))
    if p['wave'] in ('W1', 'W2', 'W3', 'W4', 'W5') and p['tv_sources'] and not p['wp_id'].endswith('-99'):
        prov['DR-01'].append('port gate: every W1-W5 port of TV code')
    if p['wave'] == 'WT':
        prov['DR-36'].append('TrueVision lane')
    for dr in prov:
        if dr not in DR_BY_ID:
            err('%s gated by unknown %s' % (p['wp_id'], dr))
    p['gated_by'] = sorted(prov, key=lambda x: int(x.split('-')[1]))
    p['gate_provenance'] = {k: sorted(set(v)) for k, v in sorted(prov.items(), key=lambda kv: int(kv[0].split('-')[1]))}

# --------------------------------------------------------------------------- edits, size, rules
DOC_FILES = {canon(C.DEVLOG), canon(C.LEDGER)}
SW_FILES = {canon(C.SWLOGIC), canon(C.SWREG)}
for p in CAT:
    edits = {}
    for e in p['vv_targets'] + p['hot_files'] + p['tv_targets']:
        for cp, created in split_entry(e):
            if cp.endswith('/') or cp.endswith('/ '):
                continue
            edits[cp] = edits.get(cp, False) or created
    p['_edits'] = edits
    files = [x for x in edits if not x.endswith('/')]
    p['file_count'] = len(files)
    est = p['est_lines']
    if est is None:
        by_lines = p['size'] or 'XL'
    else:
        by_lines = 'S' if est <= 300 else 'M' if est <= 1200 else 'L' if est <= SIZE_LIMIT_LINES else 'XL'
    size = 'XL' if p['file_count'] > SIZE_LIMIT_FILES else by_lines
    if p['size'] and p['size'] != size:
        p['size_note'] = 'catalogue said %s; K3 sizes mechanically (S <= 300 lines, M <= 1,200, L <= 2,500, XL above, or more than 15 files)' % p['size']
    p['size'] = size
    over = (est or 0) > SIZE_LIMIT_LINES or p['file_count'] > SIZE_LIMIT_FILES or est is None
    if over and not p.get('split_justification'):
        err('%s exceeds the split threshold (%s lines, %d files) without split_justification' % (p['wp_id'], est, p['file_count']))
    # R5/G7: only scribes and records packages write the ledger/devlog
    if p['wave'] in WAVES and not (p['wp_id'] in SCRIBE.values() or p['wp_id'] in RECORD_PACKAGES):
        bad = [x for x in edits if x in DOC_FILES]
        if bad:
            err('%s edits %s but is not a scribe or records package (R5/G7)' % (p['wp_id'], bad))
    # R6: shared service worker
    if p['wp_id'] not in SW_OWNERS:
        bad = [x for x in edits if x in SW_FILES]
        if bad:
            err('%s edits the shared service worker %s (R6/DR-07)' % (p['wp_id'], bad))
    # R7: TV edits only in the WT lane
    if p['wave'] != 'WT':
        bad = [x for x in edits if x.startswith(('TV/', 'NAAPPS/', 'NAWEB/'))]
        if bad:
            err('%s (VV wave) edits TrueVision files %s (R7/DR-36)' % (p['wp_id'], bad))
    if p['wave'] == 'WT':
        bad = [x for x in edits if x.startswith(('VV/', 'WCP/', 'VCB/'))]
        if bad:
            err('%s (TrueVision lane) edits Vale files %s' % (p['wp_id'], bad))

# --------------------------------------------------------------------------- path existence
FILE_RULES1, FOLDER_RULES1, FILE_RULES2 = {}, [], {}
for r in FRMAP:
    if r['phase'] not in ('W1', 'W1b') or not r['current_vv'] or not r['target_vv']:
        continue
    cur, tgt = r['current_vv'], r['target_vv']
    if r['level'] == 'folder':
        FOLDER_RULES1.append((cur, tgt))
    elif r['phase'] == 'W1':
        FILE_RULES1[cur] = tgt
    else:
        FILE_RULES2[cur] = tgt

def renumber(rel, stage):
    if stage >= 2 and rel in FILE_RULES2:
        return FILE_RULES2[rel]
    if stage >= 1:
        if rel in FILE_RULES1:
            return FILE_RULES1[rel]
        for a, b in FOLDER_RULES1:
            if rel.startswith(a):
                return b + rel[len(a):]
    return rel

VV_STAGE = {}
for stage in (0, 1, 2):
    fs = {renumber(f, stage) for f in VV_FILES}
    ds = set()
    for f in fs:
        parts = f.split('/')
        for i in range(1, len(parts)):
            ds.add('/'.join(parts[:i]))
    VV_STAGE[stage] = (fs, ds)

def vv_exists(rel, stage):
    fs, ds = VV_STAGE[stage]
    rel2 = rel.rstrip('/')
    if rel2 in fs or rel2 in ds:
        return True
    if rel2.split('/')[0] in ('02__Src__AppModules', '03__Style__AppStylesheets', '80__Testing__PrototypeEnvironment', '01__AppAssets__ValeVision') \
            and not rel2.startswith('02__Src__AppModules/62__Feature__EmailWorkers'):
        return False          # inside the snapshot scope: trust the snapshot
    return os.path.exists(os.path.join(ROOTS['VV'], rel2.replace('/', os.sep)))

def tv_exists(rel):
    rel2 = rel.rstrip('/')
    if rel2 in TV_FILES or rel2 in TV_DIRS:
        return True
    return os.path.exists(os.path.join(ROOTS['TV'], rel2.replace('/', os.sep)))

created_by = {}
for w in TOPO:
    p = BY_ID[w]
    for cp, created in p['_edits'].items():
        if created:
            if cp in created_by:
                err('%s and %s both create %s' % (created_by[cp], w, cp))
            else:
                created_by[cp] = w

stage_of = {}
for w in TOPO:
    a = ANC.get(w, set())
    stage_of[w] = 2 if 'W0-03' in a else 1 if 'W0-02' in a else 0

path_report = []
for w in TOPO:
    p = BY_ID[w]
    for e in p['tv_sources']:
        for cp, _ in split_entry(e):
            pre, rel = root_of(cp)
            ok = tv_exists(rel) if pre == 'TV' else disk_exists(cp)
            if not ok:
                err('%s: TV source not found: %s' % (w, cp))
    for e in p['tv_targets']:
        for cp, created in split_entry(e):
            if created or e.strip().endswith('(deleted)'):
                continue
            pre, rel = root_of(cp)
            ok = tv_exists(rel) if pre == 'TV' else disk_exists(cp)
            if not ok:
                err('%s: TV target not found: %s' % (w, cp))
    for e in p['vv_targets']:
        for cp, created in split_entry(e):
            if created:
                if cp.startswith('VV/'):
                    rel = cp[3:]
                    if vv_exists(rel, stage_of[w]) and w not in ('W0-02', 'W0-03'):
                        warn('%s: marks %s as new but it already exists in VV' % (w, cp))
                continue
            if cp in created_by and created_by[cp] in ANC.get(w, set()):
                continue
            if cp in created_by and created_by[cp] != w:
                err('%s: edits %s, created by %s which is not an ancestor' % (w, cp, created_by[cp]))
                continue
            pre, rel = root_of(cp)
            if pre == 'VV':
                st = stage_of[w]
                ok = vv_exists(rel, st) or (w in ('W0-02', 'W0-03') and (vv_exists(rel, 0) or vv_exists(rel, 2)))
                if not ok and e.strip().endswith('(retired)'):
                    ok = vv_exists(rel, 0)
            else:
                ok = disk_exists(cp)
            if not ok:
                err('%s: VV target not found (stage %d): %s' % (w, stage_of[w], cp))

# --------------------------------------------------------------------------- hot files
editors = collections.defaultdict(list)
for w in TOPO:
    for cp in BY_ID[w]['_edits']:
        editors[cp].append(w)
HOT = []
for cp, ws in sorted(editors.items()):
    if len(ws) < 2:
        continue
    by_lane = collections.defaultdict(list)
    for w in ws:
        by_lane[BY_ID[w]['wave']].append(w)
    conflicts, ok = [], True
    for lane, lw in by_lane.items():
        if len(lw) < 2:
            continue
        lw_sorted = sorted(lw, key=TOPO_POS.get)
        for i in range(len(lw_sorted)):
            for j in range(i + 1, len(lw_sorted)):
                a, b = lw_sorted[i], lw_sorted[j]
                if not ordered(a, b):
                    ok = False
                    err('hot file %s: %s and %s (both %s) are not ordered by the DAG' % (cp, a, b, lane))
        conflicts.append({'wave': lane, 'serial_order': lw_sorted})
    if cp in DOC_FILES:
        rule = 'integrator: the wave\'s Parity Scribe (Wn-99, W6-04) is the only writer; W0-01/W0-06 write it before W0-99 (S11 B10, R5)'
        integrator = 'Parity Scribe of each wave'
    elif cp in SW_FILES:
        rule = 'single owner per DR-07: W0-08 prepares, W6-02 refreshes; no other package edits it (R6)'
        integrator = 'W0-08 / W6-02'
    elif conflicts:
        rule = '; '.join('%s serial: %s' % (c['wave'], ' -> '.join(c['serial_order'])) for c in conflicts)
        rule += ' (DAG-enforced)' if ok else ' (NOT ORDERED)'
        if len(by_lane) > 1:
            rule += '; across waves: wave barrier'
        integrator = None
    else:
        rule = 'one editor per wave; the wave barrier orders them (%s)' % ' -> '.join(ws)
        integrator = None
    HOT.append({'file': cp, 'editors': ws, 'waves': sorted({BY_ID[w]['wave'] for w in ws}, key=LANES.index),
                'same_wave_serial_orders': conflicts, 'integrator': integrator, 'rule': rule, 'dag_verified': ok})

# --------------------------------------------------------------------------- critical path
def longest(nodes, weight):
    best, prev = {}, {}
    for w in TOPO:
        if w not in nodes:
            continue
        base, arg = 0, None
        for d in BY_ID[w]['depends_on']:
            if d in nodes and best.get(d, 0) > base:
                base, arg = best[d], d
        best[w] = base + weight(w)
        prev[w] = arg
    end = max(best, key=best.get)
    path = []
    while end:
        path.append(end)
        end = prev[end]
    return list(reversed(path)), max(best.values())

VV_NODES = {p['wp_id'] for p in CAT if p['wave'] in WAVES}
WT_NODES = {p['wp_id'] for p in CAT if p['wave'] == 'WT'}
CP_LINES, CP_LINES_TOTAL = longest(VV_NODES, lambda w: BY_ID[w]['est_lines'] or 0)
CP_COUNT, CP_COUNT_TOTAL = longest(VV_NODES, lambda w: 1)
WT_PATH, WT_TOTAL = longest(WT_NODES, lambda w: BY_ID[w]['est_lines'] or 0)
PER_WAVE_CP = {}
for wave in WAVES:
    nodes = {p['wp_id'] for p in CAT if p['wave'] == wave}
    PER_WAVE_CP[wave] = longest(nodes, lambda w: BY_ID[w]['est_lines'] or 0)

# --------------------------------------------------------------------------- tests
def tests_inventory(files):
    return {p.split('/', 1)[1]: v for p, v in files.items() if p.startswith('80__Testing__PrototypeEnvironment/') and p.count('/') == 1}
TV_TESTS = tests_inventory(TV_FILES)
VV_TESTS = tests_inventory(VV_FILES)
TEST_RE = re.compile(r'((?:Na__(?:Test|TestEnv|Verify)__|TestEnv__)[A-Za-z0-9_]*?(?:\.test\.mjs|\.test\.cjs|\.test\.py|\.mjs|\.cjs|\.py|\.html|\.css|\.bat|\.js|\.json|\.md))')
claims = collections.defaultdict(list)
for w in TOPO:
    p = BY_ID[w]
    seen = set()
    for t in p['tests_to_port']:
        if re.search(r're-run|\(full\)|adapted\)', t):
            kind = 'rerun'
        elif re.search(r'section|\bparts?\b|\bhalf\b', t):
            kind = 'partial'
        else:
            kind = 'port'
        for name in TEST_RE.findall(t):
            if name in seen:
                continue
            seen.add(name)
            claims[name].append((w, kind))
    for v in p['vv_targets']:
        if '80__Testing__PrototypeEnvironment/' in v and is_new(v):
            for name in TEST_RE.findall(v):
                if name not in seen:
                    seen.add(name)
                    claims[name].append((w, 'port'))
EXCLUDED_TESTS = {
    'Na__Test__DrawingProfileLines__.html': 'Imports TV 40 Na__DrawView__ProfileLines__.js (harness :64), which VV never ports (DIV-1; K2 TargetMaps "never port TV\'s ProfileLines").',
    'Na__Test__IosTextureProbe__.html': 'An on-device WebGL probe for one TV iPad fault (file header); it loads no app module.',
    'Na__Verify__RubySyntax__.py': 'Syntax-checks SketchUp plugin Ruby (file header); outside the drawing system.',
}
VV_OWNED_ENV = {
    'Na__TestEnv__Styles__PrototypeSandbox__.css', 'TestEnv__FlaskLocalServer.bat', 'TestEnv__FlaskLocalServer.py',
    'TestEnv__PrototypeTestingSandbox__DomAndLayout.html', 'TestEnv__PrototypeTestingSandbox__Main__.js', 'TestEnv__README__.md',
    'TestEnv__SubAppData__Config.json',
}
VV_OWNED_SUITES = {'Na__Test__PerSceneLighting__.test.mjs', 'Na__Test__ScrapbookApi__.test.py', 'Na__Test__ScrapbookServer__.py'}
TEST_OWNERSHIP = {}
normalised_tests = []
for name in sorted(TV_TESTS):
    c = claims.get(name, [])
    creator = created_by.get('VV/80__Testing__PrototypeEnvironment/' + name)
    porters = [w for w, k in c if k == 'port']
    if creator:
        porters = [creator] + [w for w in porters if w != creator]
    reruns = [w for w, k in c if k in ('rerun', 'partial') and w != creator]
    if name in EXCLUDED_TESTS:
        TEST_OWNERSHIP[name] = {'status': 'excluded', 'reason': EXCLUDED_TESTS[name], 'claims': c}
        if c:
            err('excluded test %s is claimed by %s' % (name, c))
        continue
    if name in VV_OWNED_ENV:
        TEST_OWNERSHIP[name] = {'status': 'vv-owned environment', 'reason': 'VV keeps its own version (VV identity, VV Flask server); diff reviewed in W6-01, not ported.', 'also_run_by': [w for w, _ in c]}
        continue
    if name in VV_OWNED_SUITES and not porters:
        TEST_OWNERSHIP[name] = {'status': 'vv-owned suite', 'reason': 'VV already has its own version; re-run in W6-01.', 'also_run_by': sorted(set(reruns + [w for w, _ in c]), key=TOPO_POS.get)}
        continue
    if name in ('Na__Verify__ModuleGraph__.mjs', 'Na__Verify__Exports__.mjs'):
        TEST_OWNERSHIP[name] = {'status': 'vv-owned harness', 'reason': 'VV has both harnesses; W0-04 fixes them (G1/G2 for every package).', 'also_run_by': [w for w, _ in c]}
        continue
    if not porters:
        if name in VV_TESTS:
            TEST_OWNERSHIP[name] = {'status': 'vv-has, re-run', 'porter': None, 'also_run_by': reruns}
            continue
        err('TV test %s is neither ported, VV-owned nor excluded' % name)
        continue
    porter = porters[0]
    later = porters[1:]
    if later:
        normalised_tests.append({'test': name, 'porter': porter, 'normalised_to_rerun': later})
    partial = [w for w, k in c if k == 'partial']
    early_partial = [w for w in partial if TOPO_POS[w] < TOPO_POS[porter]]
    TEST_OWNERSHIP[name] = {'status': 'ported' if name not in VV_TESTS else 'ported (replaces VV copy)', 'porter': porter,
                            'also_run_by': sorted(set(later + reruns) - set(early_partial), key=TOPO_POS.get),
                            'sections_run_earlier_by': early_partial}
    if any(TOPO_POS[w] < TOPO_POS[porter] for w in later):
        warn('test %s: %s claims to port it before its creator %s' % (name, [w for w in later if TOPO_POS[w] < TOPO_POS[porter]], porter))
VV_ONLY_TESTS = {name: c for name, c in claims.items() if name not in TV_TESTS}

# --------------------------------------------------------------------------- outputs
STD_GATE_IDS = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']
for p in CAT:
    if p['wave'] == 'WT':
        p['harness_gates'] = ['TV: node 80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs and Na__Verify__Exports__.mjs exit 0 in TV',
                              'TV devlog entry written from a fresh read of the devlog top; TV Port Record returned for the next VV scribe pass']
    elif p['wp_id'] in SCRIBE.values():
        p['harness_gates'] = ['G1 and G2 re-run on the wave\'s final tree; counts recorded', 'G4 port-note verifier: zero {{VVREL: tokens after the pass']
    elif p['wp_id'] in ('W0-01', 'W0-05', 'W0-06', 'W0-07', 'W0-08', 'W0-09', 'W0-10', 'W0-18', 'W0-19', 'W5-06', 'W6-02'):
        p['harness_gates'] = ['G1', 'G2', 'G7'] + (['G5'] if p['tests_to_port'] else [])
    else:
        p['harness_gates'] = list(STD_GATE_IDS) if p['wp_id'] not in ('W0-02', 'W0-03', 'W0-04') else ['G1', 'G2', 'G3', 'G5', 'G7']
    p['auto_added_depends_on'] = auto_deps.get(p['wp_id'], [])

def clean(p):
    out = {k: v for k, v in p.items() if not k.startswith('_')}
    out['edits'] = sorted(p['_edits'])
    return out

summary_waves = []
for lane in LANES:
    ps = [p for p in CAT if p['wave'] == lane]
    if not ps:
        continue
    summary_waves.append({
        'wave': lane, 'packages': len(ps), 'est_lines': sum(p['est_lines'] or 0 for p in ps),
        'unestimated': [p['wp_id'] for p in ps if p['est_lines'] is None],
        'sizes': dict(collections.Counter(p['size'] for p in ps)),
        'scribe': SCRIBE.get(lane), 'critical_path': PER_WAVE_CP[lane][0] if lane in PER_WAVE_CP else WT_PATH,
        'critical_path_lines': PER_WAVE_CP[lane][1] if lane in PER_WAVE_CP else WT_TOTAL,
    })

canonical = {
    'id': 'K3', 'generated': '01-Oct-2026', 'tv_head': TV_HEAD, 'vv_head': VV_HEAD,
    'description': 'K3 canonical work-package catalogue: every raw work package (data/work_packages.json, 221) merged, split and '
                   'ordered into waves W0-W6 plus the TrueVision lane WT, with dependencies, gates, hot-file ownership and acceptance.',
    'path_notation': {'TVM/': 'TV app root/02__Src__AppModules', 'TV/': ROOTS['TV'], 'VVM/': 'VV app root/02__Src__AppModules',
                      'VV/': ROOTS['VV'], 'WCP/': ROOTS['WCP'], 'VCB/': ROOTS['VCB'], 'NAAPPS/': ROOTS['NAAPPS'], 'NAWEB/': ROOTS['NAWEB'],
                      '(new)': 'created by this package', 'edits': 'canonical repo-qualified paths this package writes (vv_targets + hot_files + tv_targets)'},
    'size_rule': 'S <= 300 est. lines, M <= 1,200, L <= 2,500, XL above 2,500 or more than 15 files; every XL carries split_justification.',
    'standard_gates': C.STANDARD_GATES,
    'swarm_rules': C.SWARM_RULES,
    **({'f8_corrections': F8.meta()} if F8.ENABLED else {}),
    'waves': summary_waves,
    'topological_order': TOPO,
    'critical_path': {'by_est_lines': {'path': CP_LINES, 'est_lines': CP_LINES_TOTAL},
                      'by_package_count': {'path': CP_COUNT, 'packages': CP_COUNT_TOTAL},
                      'per_wave': {w: {'path': v[0], 'est_lines': v[1]} for w, v in PER_WAVE_CP.items()},
                      'truevision_lane': {'path': WT_PATH, 'est_lines': WT_TOTAL}},
    'test_ownership': {'tv_inventory': len(TV_TESTS), 'by_test': TEST_OWNERSHIP, 'normalised_duplicate_ports': normalised_tests,
                       'vv_only_new_tests': {k: v for k, v in sorted(VV_ONLY_TESTS.items())}},
    'packages': [clean(BY_ID[w]) for w in sorted(BY_ID, key=lambda x: (LANES.index(BY_ID[x]['wave']), x))],
    'validation': {'errors': errors, 'warnings': warnings},
}

raw_map = {
    'id': 'K3', 'generated': '01-Oct-2026',
    'description': 'Every live raw work package (data/work_packages.json) mapped to exactly one canonical K3 package (its primary owner), '
                   'or dropped with a reason; split_into lists the other canonical packages that carry part of it; retired_aliases maps the '
                   'raw ids the verifiers refuted (still referenced by raw depends_on lists and K1 blocks) to their live replacements.',
    'raw_count': len(raw_ids),
    'map': {r: {'canonical': primary[r][0] if r in primary else None, 'split_into': sorted(set(splits.get(r, [])), key=lambda x: (LANES.index(BY_ID[x]['wave']), x)),
                'raw_title': RAW_BY_ID[r]['title'], 'raw_slice': RAW_BY_ID[r].get('slice'), 'raw_size': RAW_BY_ID[r].get('size'),
                'status': 'dropped' if r in DROPPED else 'mapped'} for r in sorted(raw_ids)},
    'dropped': DROPPED,
    'split_notes': {r: sorted(set(ws), key=lambda x: (LANES.index(BY_ID[x]['wave']), x)) for r, ws in sorted(splits.items())},
    'retired_aliases': {a: {'replaced_by': reps,
                            'canonical': sorted({primary[r][0] for r in reps if r in primary}, key=lambda x: (LANES.index(BY_ID[x]['wave']), x)),
                            'referenced_by': sorted(alias_refs.get(a, [])),
                            'verifier_reason': REFUTED_REASON.get(a, '')} for a, reps in sorted(RETIRED.items())},
    'coverage': {'live_raw_ids': len(raw_ids), 'mapped': len([r for r in raw_ids if r in primary]), 'dropped': len(DROPPED),
                 'unmapped': unmapped, 'retired_aliases': len(RETIRED), 'canonical_packages': len(CAT)},
}

hot_doc = {
    'id': 'K3', 'generated': '01-Oct-2026',
    'description': 'Every file written by more than one canonical package, with its editors in topological order and the rule that '
                   'orders them: an integrator, or a serial order inside a wave that the dependency DAG enforces; across waves the '
                   'wave barrier (R11) orders editors.',
    'files': HOT,
    'counts': {'files_with_multiple_editors': len(HOT), 'same_wave_serialised': sum(1 for h in HOT if h['same_wave_serial_orders']),
               'unordered': sum(1 for h in HOT if not h['dag_verified'])},
}

if __name__ == '__main__':
    force = '--force' in sys.argv
    print('packages:', len(CAT), ' raw:', len(raw_ids), ' mapped:', raw_map['coverage']['mapped'], ' dropped:', len(DROPPED))
    print('errors:', len(errors), ' warnings:', len(warnings))
    print('F.8 layer:', ('on, %d ops logged' % len(F8_LOG)) if F8.ENABLED else 'off (K3_NO_F8=1)')
    for e in errors:
        print('  ERROR', e)
    for w in warnings:
        print('  WARN ', w)
    if errors and not force:
        sys.exit(1)
    with open(os.path.join(DATA, 'wp_canonical.json'), 'w', encoding='utf-8') as f:
        json.dump(canonical, f, indent=1, ensure_ascii=False)
    with open(os.path.join(DATA, 'wp_raw_map.json'), 'w', encoding='utf-8') as f:
        json.dump(raw_map, f, indent=1, ensure_ascii=False)
    with open(os.path.join(DATA, 'hot_file_ownership.json'), 'w', encoding='utf-8') as f:
        json.dump(hot_doc, f, indent=1, ensure_ascii=False)
    import k3_verify_outputs
    vfails, vfacts = k3_verify_outputs.verify()
    for f in vfails:
        print('  VERIFY FAIL', f)
    import k3_report_md
    k3_report_md.write(canonical, raw_map, hot_doc, os.path.join(REPORT, 'K3__WorkPackages.md'), (vfacts, vfails))
    print('written; independent re-check:', 'PASS' if not vfails else 'FAIL (%d)' % len(vfails))
    if vfails:
        sys.exit(1)
    sys.exit(1 if errors else 0)
