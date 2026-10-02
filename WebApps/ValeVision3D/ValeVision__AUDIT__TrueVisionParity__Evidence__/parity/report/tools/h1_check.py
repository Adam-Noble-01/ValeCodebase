# -*- coding: utf-8 -*-
"""H1 - read-only checks that the report sections and the K artefacts agree on the facts H1 harmonised.

  I   ids: every DR, package, TF, FR, F.8 row and Q-xx id cited in R0-R6, K1-K3 docs and the K JSON exists;
  Q   every front-matter question (R0.2.1 Q-VER, R0.2.11) is named in each package of its Gates column (JSON);
  A   release watermark: one tally everywhere; W0-06 acceptance carries the exact text of R0's R0.2.9 note;
  B   62 -> 92 only on request (K2 JSON and docs, R1, R2, R5, R6, K3); legacy 40 -> 91 in W0-02;
  C   the "TrueVision 3D Project Hub": lands inert, never rendered, one named G4 exception - nowhere "never lands";
  D   service-worker question: resolved in code everywhere it is mentioned;
  E   positionMm sign: the code (VV -h, TV +h) and every section say the same;
  F   probe: /api/health for ported modules (W2-34, W0-19), no "/api/check-localhost probe" left in K3;
  G   end-state caveat (thirteen differences, four tabs) in R0, R4 and R6;
  H   no NA job phase (T01-T04) in Vale acceptance text or examples;
  M   R3 C.4's R0 column equals R0.3's seam-to-PD list; H2-derived counts (165, 93, 65,429) in R0.
Exit 1 on any FAIL.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REP = os.path.dirname(HERE)
PAR = os.path.dirname(REP)
DATA = os.path.join(PAR, 'data')
VV = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules'
TV = r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb/na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules'
RES = []


def check(cid, name, ok, detail=''):
    RES.append((cid, name, bool(ok), detail))


def jl(n):
    return json.load(open(os.path.join(DATA, n), encoding='utf-8'))


def rd(n):
    return open(os.path.join(REP, n), encoding='utf-8').read()


SECTIONS = {k: rd(k) for k in sorted(os.listdir(REP)) if k.endswith('.md') and k[:2] in ('R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'K1', 'K2', 'K3')
            and '.pre_' not in k}
R0, R1, R2, R3, R4, R5, R6 = (next(v for k, v in SECTIONS.items() if k.startswith(p)) for p in ('R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6'))
K1 = SECTIONS['K1__DecisionRegister.md']
K2T, K2R, K3 = SECTIONS['K2__TargetMaps.md'], SECTIONS['K2__NamingRulebook.md'], SECTIONS['K3__WorkPackages.md']
W = jl('wp_canonical.json')
P = {p['wp_id']: p for p in W['packages']}
DRS = {d['dr_id'] for d in jl('decision_register.json')}
TF = {t['id']: t for t in jl('target_folder_map.json')}
FR = {f['id']: f for f in jl('file_rename_map.json')}
REC = jl('wp_corrections_applied.json')
ROWS = set(REC['rows'])
QIDS = set(re.findall(r'\*\*(Q-[A-Z0-9]+)\*\*', R0)) | {'Q-VER'}


def ptext(w, fields=('goal', 'vv_adaptations', 'acceptance', 'notes', 'hard_gate', 'risk')):
    p = P[w]
    out = []
    for f in fields:
        v = p.get(f)
        out += v if isinstance(v, list) else [v or '']
    return '\n'.join(out)


# ------------------------------------------------------------------ I
bad = []
blobs = dict(SECTIONS)
blobs['wp_canonical.json'] = json.dumps(W, ensure_ascii=False)
blobs['target_folder_map.json'] = json.dumps(list(TF.values()), ensure_ascii=False)
blobs['file_rename_map.json'] = json.dumps(list(FR.values()), ensure_ascii=False)
for name, t in blobs.items():
    for m in set(re.findall(r'\bDR-\d\d\b', t)) - DRS:
        bad.append('%s: %s' % (name, m))
    for m in set(re.findall(r'\b(?:W[0-6]|WT)-\d\d\b', t)) - set(P):
        bad.append('%s: %s' % (name, m))
    for m in set(re.findall(r'\bTF-[TLRS]\d\d\b', t)) - set(TF):
        bad.append('%s: %s' % (name, m))
    for m in set(re.findall(r'\bFR-\d\d\b', t)) - set(FR):
        bad.append('%s: %s' % (name, m))
    for m in set(re.findall(r'F\.8 (C\d+)', t)) - ROWS:
        bad.append('%s: F.8 %s' % (name, m))
    for m in set(re.findall(r'(?<![A-Za-z])Q-(?:VER|63|35ASSETS|REG|AZIMUTH|COVER|BACKUP|[A-Z]{3,})\b', t)) - QIDS:
        bad.append('%s: %s' % (name, m))
check('I', 'every DR, package, TF, FR, F.8 row and Q id cited in R0-R6, K1-K3 and the K JSON exists', not bad,
      '; '.join(bad[:20]) or '%d documents, Q ids %s, F.8 rows C1-C%d' % (len(blobs), sorted(QIDS), max(int(c[1:]) for c in ROWS)))

# ------------------------------------------------------------------ Q
gates = {}
for m in re.finditer(r'^\| \*\*(Q-[A-Z0-9]+)\*\* \|(.*)$', R0, re.M):
    cells = [c.strip() for c in re.split(r'(?<!\\)\|', m.group(2))]
    gates[m.group(1)] = sorted(set(re.findall(r'\b(?:W[0-6]|WT)-\d\d\b', cells[4])))
gates['Q-VER'] = ['W0-01']
miss = ['%s not in %s' % (q, w) for q, ws in gates.items() for w in ws if q not in ptext(w)]
check('Q', 'every front-matter question is named in each package of its Gates column (wp_canonical.json)', not miss and len(gates) == 7,
      '; '.join(miss) or ', '.join('%s -> %s' % (q, '/'.join(ws)) for q, ws in sorted(gates.items())))

# ------------------------------------------------------------------ A
TALLY = '51 ported / 11 partial / 17 pending sign-off / 80 never considered / 4 reopened / 2 deliberate / 7 not drawing / 4 VV-origin / 1 n/a, 112 open'
note = re.search(r'with this text: "(Release Watermark \(177 rows\) seeded from [^"]+)"', R0)
w006 = P['W0-06']['acceptance'][0]
rows = json.load(open(os.path.join(HERE, 'r5work', 'release_rows_final.json'), encoding='utf-8'))
import collections  # noqa: E402
cnt = collections.Counter(r['cls'] for r in rows)
recount = (cnt['PORTED'], cnt['PARTIAL'], cnt['PENDING-SIGNOFF'], cnt['NOT-CONSIDERED'], cnt['REOPENED'], cnt['DELIBERATE'],
           cnt['NOT-DRAWING'], cnt['VV-ORIGIN'], cnt['N/A'])
open_n = cnt['PARTIAL'] + cnt['PENDING-SIGNOFF'] + cnt['NOT-CONSIDERED'] + cnt['REOPENED']
stale = [k for k, t in blobs.items() if 'classification counts 55/6/14/83/6/7/4/2' in t and k not in ('R6__F_SwarmDelegationPlan.md', 'wp_canonical.json')]
stale += ['wp_canonical.json W0-06'] if '55/6/14/83' in w006 else []
f3 = R6[R6.index('### F.3 Work-package catalogue'):R6.index('### F.4 Hot-file ownership')]
stale += ['R6 F.3'] if '55/6/14/83' in f3 else []
ok = (note and note.group(1) in w006 and TALLY in note.group(1) and recount == (51, 11, 17, 80, 4, 2, 7, 4, 1) and open_n == 112
      and 'DIV-3 and DIV-5 closed' in w006 and not stale and '| **Open (needs a package)** | PARTIAL + PENDING + NOT-CONSIDERED + REOPENED | 102 | **112** |' in R5
      and '7 of them are parked' in K1)
check('A', 'one release tally (51/11/17/80/4/2/7/4/1, 112 open; 7 of the 88 parked); W0-06 item 1 = R0.2.9 note text', ok,
      'recount %s open %d; stale %s; note found %s' % (recount, open_n, stale, bool(note)))

# ------------------------------------------------------------------ B
t32, f22 = TF['TF-T32'], FR['FR-22']
okb = (t32['action'] == 'keep' and t32['target_vv'].endswith('62__Feature__EmailWorkers/') and 'only on request' in t32['phase']
       and 'only on request' in f22['phase'] and f22['target_vv'].endswith('92__Feature__EmailWorkers/')
       and 'W3 (deferred)' not in K2T + K2R and 'W3 (deferred)' not in json.dumps([t32, f22])
       and 'move to `92__Feature__EmailWorkers` in W3' not in K2R
       and '62 -> 92 only if D-S01-08 is answered (a)' in P['W6-03']['hard_gate'] and 'only if Adam answers D-S01-08 (a)' in P['W6-03']['goal']
       and TF['TF-T20']['target_vv'].endswith('91__System__2dElevationsView/') and 'W0-02' in R1)
check('B', '62 stays (DR-03 default) and moves to 92 only on request everywhere; legacy 40 -> 91 in W0-02', okb,
      'TF-T32 %s/%s/%s; FR-22 %s' % (t32['action'], t32['target_vv'], t32['phase'], f22['phase']))

# ------------------------------------------------------------------ C
p15 = re.search(r'^\| P15 \|.*$', R6, re.M).group(0)
okc = ('present but never rendered' in p15 and 'TrueVision 3D Project Hub") never land' not in p15
       and 'never land in VV' in p15 and 'Hub' not in p15.split('never land in VV')[0].split('NA-only markers')[1]
       and 'present but never rendered' in R0 and 'never rendered (R0 PD-15)' in R2
       and 'TrueVisionHub' in P['W0-04']['vv_adaptations'][0] and 'TrueVisionHub' in W['standard_gates'][3]
       and 'excluded from VV\'s DEFINITIONS via config' in P['W4-12']['vv_adaptations'][0]
       and 'section in any rendered statement' in K2R)
check('C', 'Hub section: lands inert at TV\'s path, never rendered, one named G4 exception (R0 PD-15, R2 B.3.7, R6 P15, K2 V2, K3)', okc, p15[:160])

# ------------------------------------------------------------------ D
okd = ('Resolved in code' in R3 and 'confirm before W0-08 is handed to Adam' not in R3
       and 'is unverified.' not in K2T.split('## 12. Open issues')[1].split('## 13.')[0]
       and 'Resolved in code' in R0 and 'Nothing to apply' in REC['rows']['C5']['json_line'])
check('D', 'service-worker question resolved in code (one live check left) in R0, R3, R6, K2, K3', okd)

# ------------------------------------------------------------------ E
vl = open(os.path.join(VV, '41__System__CrossSectionView', 'Na__CrossSectionView__SystemLogic.js'), encoding='utf-8').read().split('\n')
tl = open(os.path.join(TV, '41__System__SectionCutEngine', 'Na__SectionCut__Serialize__.js'), encoding='utf-8').read().split('\n')
al = open(os.path.join(VV, '42__System__DrawingViewCore', 'Na__DrawView__SectionAdapter__.js'), encoding='utf-8').read().split('\n')
el = open(os.path.join(TV, '41__System__SectionCutEngine', 'Na__SectionCut__Engine__.js'), encoding='utf-8').read().split('\n')
code_ok = ('-s.plane.constant' in vl[1501] and 'positionMm' in vl[1501] and 'record.plane.constant' in tl[193] and '-record' not in tl[193]
           and 'new THREE.Vector3(0, -1, 0)' in al[298] and '-cutHeightMm' in al[299] and 'PLAN_NORMAL_Y = -1' in el[132]
           and 'Na__Math__ConvertMmToUnits(cutHeightMm)' in el[366])
texts_ok = ('VV stores `positionMm = -h` and TV stores `+h`' in R3 and 'TV\'s comment is the error' not in R0
            and 'positionMm sign, camelCase per-scene entries' in R0 and 'writes positionMm = +plane.constant where VV writes -plane.constant' in K1
            and 'positionMm sign, per-scene keys' in R6)
check('E', 'positionMm sign: VV stores -h (SystemLogic :1502), TV +h (Serialize :194); R0, R3 S4/C.5, R6 WT-02 and K1 DR-41 say so', code_ok and texts_ok,
      'code %s texts %s' % (code_ok, texts_ok))

# ------------------------------------------------------------------ F
k3blob = json.dumps(W, ensure_ascii=False)
okf = ('/api/check-localhost probe' not in k3blob and "service 'whitecardopedia-local-dev'" in P['W0-19']['acceptance'][1]
       and 'GET /api/health' in P['W0-19']['acceptance'][1] and '/api/health probe' in P['W2-34']['goal']
       and 'Settled: R6 F.8 C28' in R3 and '/api/health (A)' in K1)
check('F', 'local-server probe: /api/health with service whitecardopedia-local-dev for W2-34 and W0-19 (DR-28 (A)); facade per DR-27 (A)', okf)

# ------------------------------------------------------------------ G
okg = ('thirteen ways' in R0 and 'thirteen ways' in R6 and 'R0.1.8, E1-E13' in R4 and 'four tabs, not five' in R6
       and 'Four tabs: 3D Model, Drawings, Specification, Document Register' in R0 and 'shows four tabs after W4-10' in R4)
check('G', 'end-state caveat (thirteen on-screen differences on the K1 defaults; four tabs while DR-10 is off) in R0, R4 and R6', okg)

# ------------------------------------------------------------------ H
offend = []
for w, p in P.items():
    for f in ('acceptance', 'vv_adaptations', 'goal', 'notes'):
        v = p.get(f)
        for s in (v if isinstance(v, list) else [v or '']):
            for m in re.finditer(r'T0[1-4]', s):
                ctx = s[max(0, m.start() - 60):m.end() + 10]
                if not re.search(r"never NA's T01-T04|no T01-T04", ctx):
                    offend.append('%s %s: ...%s...' % (w, f, ctx))
for name in ('R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md', 'R3__C_WiringRequirements.md', 'R4__D_BroaderUiParity.md',
             'R1__A_FolderNaming_FolderDivergence.md', 'R2__B_ModuleNaming_Divergence.md', 'R5__E_ParityMatrix_Watermark_Inventory.md'):
    if re.search(r'Doous_T0[1-4]', SECTIONS[name]):
        offend.append(name + ': a Vale document code with an NA phase')
if "would print '2026/3047__Doous_T01_D01'" in K1:
    offend.append('K1 DR-11 example')
check('H', 'no NA job phase (T01-T04) in Vale acceptance text, adaptations, notes or examples (JSON; R0-R5; K1 DR-11)', not offend, '; '.join(offend[:8]))

# ------------------------------------------------------------------ M
rule = re.search(r'Section C\'s seam table \(R3 C\.4, S1-S23\).*?\n((?:  - .*\n)+)', R0).group(1)
r0map = {}
for part in re.split(r';\s*', rule.replace('\n', ' ')):
    m = re.match(r'\s*-?\s*(S\d+)(?: and (S\d+))? (.+?)\s*\.?\s*$', part)
    if not m:
        continue
    pds = set(re.findall(r'PD-\d\d|R0\.3\.6|DIV-2', m.group(3)))
    for s in (m.group(1), m.group(2)):
        if s:
            r0map[s] = pds
c4 = R3[R3.index('### C.4 The VV adapter seams'):R3.index('**S1 in detail')]
r3map = {}
for line in c4.split('\n'):
    mm = re.match(r'^\| (S\d+) \|', line)
    if mm:
        last = re.split(r'(?<!\\)\|', line)[-2]
        r3map[mm.group(1)] = set(re.findall(r'PD-\d\d|R0\.3\.6|DIV-2', last))
diff = ['%s R0 %s R3 %s' % (s, sorted(r0map.get(s, [])), sorted(r3map.get(s, []))) for s in sorted(set(r0map) | set(r3map), key=lambda x: int(x[1:]))
        if (r0map.get(s, set()) - {'DIV-2'}) != (r3map.get(s, set()) - {'DIV-2'})]
counts = ('165 packages' in R0 and '(93 files)' in R0 and '**65,429**' in R0 and 'W5-01 -> W5-05 -> W5-07 -> W5-99' in R0
          and '24 packages are hard-gated' in R0 and 'gates 124 packages' in R0 and '(92 files)' not in R0 and '65,179' not in R0)
check('M', 'R3 C.4 R0 column = R0.3 seam list (S1-S23); R0 carries the post-H2 counts (165, 93, 65,429, W5-07, 24 hard gates)',
      not diff and len(r3map) == 23 and counts, '; '.join(diff) or 'counts %s' % counts)

w = max(len(n) for _, n, _, _ in RES)
for cid, name, ok, detail in RES:
    print('%s %-3s %s' % ('PASS' if ok else 'FAIL', cid, name))
    if detail:
        print('         ' + detail[:400])
nf = sum(1 for r in RES if not r[2])
print('%d checks, %d failed' % (len(RES), nf))
sys.exit(1 if nf else 0)
