#!/usr/bin/env python3
"""H2 - re-validate the corrected K3 artefacts and Section F after the F.8 corrections (read-only).

Checks, each printed PASS/FAIL (exit 1 on any FAIL):
  K1  K3's own verifier (schema, raw ids, topological sort, critical path, hot files, barrier);
  K2  the JSON on disk is exactly what k3_build.py generates now (with the F.8 layer);
  I   every id cited exists: package, DR, raw and F.8 row ids, in fields and in free text;
  D   the DAG is acyclic (own Kahn sort) and topological_order respects every edge;
  R   every raw package id still maps (wp_raw_map.json), and the map changed only its package count;
  H   no two same-wave packages edit one hot file without a DAG order; the hot-file table is complete;
  C   critical path (by lines, by count, per wave, WT) and wave totals recomputed independently;
  O   overlay off and nothing applied twice: every op present once, re-applying any op changes nothing;
  A   wp_corrections_applied.json: rows C1-C33, nothing unattributed;
  F   every figure Section F quotes from the JSON, its stale phrases gone, its checkers green.
"""
import collections
import copy
import json
import os
import re
import subprocess
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.dirname(TOOLS)
DATA = os.path.join(os.path.dirname(REPORT), 'data')
sys.path.insert(0, TOOLS)

RESULTS = []


def check(cid, name, ok, detail=''):
    RESULTS.append((cid, name, bool(ok), detail))


def load(name):
    with open(os.path.join(DATA, name), encoding='utf-8') as f:
        return json.load(f)


canon, hot, rawmap = load('wp_canonical.json'), load('hot_file_ownership.json'), load('wp_raw_map.json')
canon_pre, hot_pre, rawmap_pre = load('wp_canonical.pre_h2.json'), load('hot_file_ownership.pre_h2.json'), load('wp_raw_map.pre_h2.json')
raw, drs = load('work_packages.json'), load('decision_register.json')
record = load('wp_corrections_applied.json')
P = {p['wp_id']: p for p in canon['packages']}
LANES = ['W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'WT']
VV = LANES[:-1]
SCRIBE = {'W0': 'W0-99', 'W1': 'W1-99', 'W2': 'W2-99', 'W3': 'W3-99', 'W4': 'W4-99', 'W5': 'W5-99', 'W6': 'W6-04'}
R6 = open(os.path.join(REPORT, 'R6__F_SwarmDelegationPlan.md'), encoding='utf-8').read()
K3MD = open(os.path.join(REPORT, 'K3__WorkPackages.md'), encoding='utf-8').read()

# ---------------------------------------------------------------------------------------------- K1, K2
import k3_verify_outputs as KV  # noqa: E402
fails, facts = KV.verify()
check('K1', "K3's own verifier on the corrected files", not fails, '; '.join(fails or facts))

import k3_build as B  # noqa: E402  (in-memory build; writes nothing)


def norm(x):
    return json.loads(json.dumps(x, ensure_ascii=False))


same = norm(B.canonical) == canon and norm(B.hot_doc) == hot and norm(B.raw_map) == rawmap
check('K2', 'the three JSON files equal a fresh k3_build.py run (F.8 layer on, 0 errors, 0 warnings)',
      same and not B.errors and not B.warnings and B.F8.ENABLED, 'errors %d warnings %d' % (len(B.errors), len(B.warnings)))

# ---------------------------------------------------------------------------------------------- I
PKG = set(P)
DRS = {d['dr_id'] for d in drs}
RAW = {r['id'] for r in raw}
RETIRED = set(rawmap['retired_aliases'])
import r6_corrections as _K6, r6_prose as _T6  # noqa: E402  (H1: rows C34-C36 follow C1-C33)
ROWS = {c[0] for c in _T6.CORRECTIONS} | {c['id'] for c in _K6.CORRECTIONS} | {_K6.PROPOSED['id']}
RX_PKG = re.compile(r'\b(W[0-6]-\d\d|WT-\d\d)\b')
RX_DR = re.compile(r'\bDR-\d\d\b')
RX_ROW = re.compile(r'F\.8 (C\d+)')
RX_RAW = re.compile(r'\bWP-S\d+[ab]?-[0-9A-Za-z]+\b')
missing = collections.Counter()
where = collections.defaultdict(set)


def need(kind, x, at):
    ok = {'pkg': x in PKG, 'dr': x in DRS, 'raw': x in RAW, 'rawref': x in RAW or x in RETIRED, 'row': x in ROWS}[kind]
    if not ok:
        missing[(kind, x)] += 1
        where[(kind, x)].add(at)


def scan_text(s, at):
    for m in RX_PKG.findall(s):
        need('pkg', m, at)
    for m in RX_DR.findall(s):
        need('dr', m, at)
    for m in RX_ROW.findall(s):
        need('row', m, at)
    for m in RX_RAW.findall(s):
        need('rawref', m, at)


def walk(v, at):
    if isinstance(v, str):
        scan_text(v, at)
    elif isinstance(v, list):
        for x in v:
            walk(x, at)
    elif isinstance(v, dict):
        for k, x in v.items():
            walk(x, at)


n_refs = 0
for w, p in P.items():
    for d in p['depends_on'] + p.get('soft_after', []) + p.get('auto_added_depends_on', []):
        need('pkg', d, w + ' depends_on'); n_refs += 1
    for g in list(p['gated_by']) + list(p.get('gate_provenance', {})):
        need('dr', g, w + ' gated_by'); n_refs += 1
    for r in p['source_wp_ids'] + p['split_from']:
        need('raw', r, w + ' raw'); n_refs += 1
    for c in p.get('f8_corrections', []):
        need('row', c, w + ' f8_corrections'); n_refs += 1
    for k, v in p.items():
        if k not in ('depends_on', 'gated_by', 'source_wp_ids', 'split_from', 'gate_provenance', 'edits'):
            walk(v, '%s %s' % (w, k))
for k in ('swarm_rules', 'standard_gates', 'f8_corrections'):
    walk(canon[k], k)
order = canon['topological_order']
for x in order:
    need('pkg', x, 'topological_order')
cp = canon['critical_path']
for x in cp['by_est_lines']['path'] + cp['by_package_count']['path'] + cp['truevision_lane']['path']:
    need('pkg', x, 'critical_path')
for wv, v in cp['per_wave'].items():
    for x in v['path']:
        need('pkg', x, 'critical_path per_wave')
for wv in canon['waves']:
    for x in wv['critical_path'] + wv['unestimated'] + ([wv['scribe']] if wv['scribe'] else []):
        need('pkg', x, 'waves')
for name, t in canon['test_ownership']['by_test'].items():
    for x in ([t.get('porter')] if t.get('porter') else []) + (t.get('also_run_by') or []) + (t.get('sections_run_earlier_by') or []):
        need('pkg', x, 'test_ownership ' + name)
for name, uses in canon['test_ownership']['vv_only_new_tests'].items():
    for wp, _ in uses:
        need('pkg', wp, 'vv_only_new_tests ' + name)
for h in hot['files']:
    for x in h['editors']:
        need('pkg', x, 'hot ' + h['file'])
    for so in h['same_wave_serial_orders']:
        for x in so['serial_order']:
            need('pkg', x, 'hot serial ' + h['file'])
for r, v in rawmap['map'].items():
    for x in ([v['canonical']] if v['canonical'] else []) + v['split_into']:
        need('pkg', x, 'raw map ' + r)
for a, v in rawmap['retired_aliases'].items():
    for x in v['canonical']:
        need('pkg', x, 'retired alias ' + a)
    for x in v['replaced_by']:
        need('raw', x, 'retired alias ' + a)
check('I', 'every package, DR, raw and F.8 row id cited in wp_canonical.json, hot_file_ownership.json and wp_raw_map.json exists',
      not missing, '; '.join('%s %s (%d: %s)' % (k[0], k[1], n, sorted(where[k])[:3]) for k, n in missing.items()) or
      '%d structured references and every id in free text resolve' % n_refs)

# ---------------------------------------------------------------------------------------------- D
indeg = {w: 0 for w in P}
kids = collections.defaultdict(list)
for w, p in P.items():
    for d in p['depends_on']:
        indeg[w] += 1
        kids[d].append(w)
q = sorted(w for w, n in indeg.items() if n == 0)
topo = []
while q:
    w = q.pop(0)
    topo.append(w)
    for c in kids[w]:
        indeg[c] -= 1
        if indeg[c] == 0:
            q.append(c)
pos = {w: i for i, w in enumerate(order)}
viol = [(d, w) for w, p in P.items() for d in p['depends_on'] if pos[d] >= pos[w]]
check('D', 'the DAG is acyclic and topological_order respects every dependency',
      len(topo) == len(P) and set(order) == set(P) and len(order) == len(P) and not viol,
      'Kahn sorted %d of %d; order violations %d' % (len(topo), len(P), len(viol)))

ANC = {}
for w in order:
    s = set()
    for d in P[w]['depends_on']:
        s.add(d)
        s |= ANC[d]
    ANC[w] = s

# ---------------------------------------------------------------------------------------------- R
probs = []
owners = collections.defaultdict(list)
for w, p in P.items():
    for r in p['source_wp_ids']:
        owners[r].append(w)
for r in RAW:
    m = rawmap['map'].get(r)
    if m is None:
        probs.append('%s missing from the map' % r)
    elif m['status'] == 'dropped':
        if m['canonical'] or owners.get(r):
            probs.append('%s dropped but owned' % r)
    elif owners.get(r) != [m['canonical']]:
        probs.append('%s maps to %s but is owned by %s' % (r, m['canonical'], owners.get(r)))
same_map = {k: v for k, v in rawmap.items() if k != 'coverage'} == {k: v for k, v in rawmap_pre.items() if k != 'coverage'}
cov = {k: v for k, v in rawmap['coverage'].items() if k != 'canonical_packages'} == {k: v for k, v in rawmap_pre['coverage'].items() if k != 'canonical_packages'}
check('R', 'every raw package id still maps to exactly one live package or is dropped; the map is unchanged but for its package count',
      not probs and same_map and cov and rawmap['coverage']['canonical_packages'] == len(P),
      '; '.join(probs) or '%d raw ids: %d mapped, %d dropped; canonical_packages %d -> %d'
      % (len(RAW), rawmap['coverage']['mapped'], rawmap['coverage']['dropped'], rawmap_pre['coverage']['canonical_packages'], rawmap['coverage']['canonical_packages']))

# ---------------------------------------------------------------------------------------------- H
editors = collections.defaultdict(list)
for w in order:
    for f in P[w]['edits']:
        editors[f].append(w)
multi = {f: ws for f, ws in editors.items() if len(ws) > 1}
table = {h['file']: h for h in hot['files']}
unordered = []
for f, ws in multi.items():
    by = collections.defaultdict(list)
    for w in ws:
        by[P[w]['wave']].append(w)
    for lane, lw in by.items():
        for i in range(len(lw)):
            for j in range(i + 1, len(lw)):
                if lw[i] not in ANC[lw[j]] and lw[j] not in ANC[lw[i]]:
                    unordered.append((f, lw[i], lw[j]))
table_ok = set(multi) == set(table) and all(table[f]['editors'] == multi[f] for f in multi)
check('H', 'no two same-wave packages edit one hot file without a DAG order; hot_file_ownership.json lists exactly the multi-editor files, editors in topological order',
      not unordered and table_ok and hot['counts']['unordered'] == 0,
      '%d hot files (%d with a same-wave serial order), %d unordered pairs' % (len(multi), hot['counts']['same_wave_serialised'], len(unordered)))

# ---------------------------------------------------------------------------------------------- C
def longest(nodes, weight):
    best, prev = {}, {}
    for w in order:
        if w not in nodes:
            continue
        base, arg = 0, None
        for d in P[w]['depends_on']:
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


vvn = {w for w in P if P[w]['wave'] in VV}
lines = lambda w: P[w]['est_lines'] or 0
cpl_path, cpl = longest(vvn, lines)
cpc_path, cpc = longest(vvn, lambda w: 1)
wt_path, wt = longest({w for w in P if P[w]['wave'] == 'WT'}, lines)
per = {wv: longest({w for w in P if P[w]['wave'] == wv}, lines) for wv in VV}
ok_cp = (cpl == cp['by_est_lines']['est_lines'] and sum(lines(w) for w in cp['by_est_lines']['path']) == cpl
         and all(a in P[b]['depends_on'] for a, b in zip(cp['by_est_lines']['path'], cp['by_est_lines']['path'][1:]))
         and cpc == cp['by_package_count']['packages'] and wt == cp['truevision_lane']['est_lines']
         and all(per[wv][1] == cp['per_wave'][wv]['est_lines'] for wv in VV)
         and cpl == sum(per[wv][1] for wv in VV))
check('C1', 'critical path recomputed: by lines, by package count, per wave and the WT lane; the whole path is the chain of the wave paths',
      ok_cp, 'VV %s lines over %d packages (%d by count); per wave %s; WT %s'
      % ('{:,}'.format(cpl), len(cp['by_est_lines']['path']), cpc, ', '.join('%s %s' % (wv, '{:,}'.format(per[wv][1])) for wv in VV), '{:,}'.format(wt)))
tot_ok, totals = True, []
for wv in canon['waves']:
    ms = [P[w] for w in P if P[w]['wave'] == wv['wave']]
    calc = {'packages': len(ms), 'est_lines': sum(p['est_lines'] or 0 for p in ms),
            'unestimated': sorted(p['wp_id'] for p in ms if p['est_lines'] is None),
            'sizes': dict(collections.Counter(p['size'] for p in ms))}
    if (calc['packages'], calc['est_lines'], calc['unestimated'], calc['sizes']) != (wv['packages'], wv['est_lines'], sorted(wv['unestimated']), wv['sizes']):
        tot_ok = False
    totals.append('%s %d/%s' % (wv['wave'], calc['packages'], '{:,}'.format(calc['est_lines'])))
vv_pk = sum(1 for w in P if P[w]['wave'] in VV)
vv_est = sum(lines(w) for w in P if P[w]['wave'] in VV)
check('C2', 'wave totals recomputed (packages, estimated lines, unestimated, sizes)', tot_ok,
      '%s; VV %d packages, %s lines' % ('; '.join(totals), vv_pk, '{:,}'.format(vv_est)))

# ---------------------------------------------------------------------------------------------- O
import r6_corrections as K  # noqa: E402
miss = K.missing_in_json(P, canon)
back = K.overlaid(P, canon) is P if not miss else False
changed = []
for cid, op in K.package_ops():
    p2 = copy.deepcopy(P[op['pkg']])
    K._apply(p2, op, cid)
    if p2 != P[op['pkg']]:
        changed.append('%s %s %s' % (cid, op['pkg'], op['field']))
for cid, op in K.RULE_OPS:
    lst = canon[op['list']]
    h = {'wp_id': 'K3', op['field']: lst[K.rule_index(lst, op['rule'])]}
    K._apply(h, op, cid)
    if h[op['field']] != lst[K.rule_index(lst, op['rule'])]:
        changed.append('%s K3 %s' % (cid, op['rule']))
inside = [c for c, op in list(K.package_ops()) + K.RULE_OPS if op['kind'] in ('list_sub', 'str_sub') and op['old'] in op['new']]
marks = collections.Counter()
for w, p in P.items():
    for k, v in p.items():
        for s in (v if isinstance(v, list) else [v]):
            if isinstance(s, str):
                for m in re.findall(r'[\[(]F\.8 (C\d+)[\])]', s):
                    marks[(w, m)] += 1
rows_vs_marks = [w for w, p in P.items() if w != K.PROPOSED_ID and sorted({m for (x, m) in marks if x == w}, key=lambda c: int(c[1:])) != p.get('f8_corrections', [])]
check('O', 'overlay off, nothing applied twice: every op present, re-applying any op changes nothing, no op text contains its old text, marks agree with f8_corrections',
      not miss and back and not changed and not inside and not rows_vs_marks,
      'missing %s; re-apply changed %s; old-inside-new %s; mark mismatches %s' % (miss, changed, inside, rows_vs_marks))

# ---------------------------------------------------------------------------------------------- A
rows = record['rows']
check('A', 'wp_corrections_applied.json: rows C1-C%d, every applied row has a change, nothing unattributed' % max(int(c[1:]) for c in ROWS),
      set(rows) == ROWS and not record['unattributed'] and all(r['fields'] for r in rows.values() if r['status'] == 'applied')
      and {c for c, r in rows.items() if r['status'] != 'applied'} == set(K.NOT_APPLICABLE),
      'applied %d, nothing to apply %s, packages corrected %d + added %s, replayed exactly %d'
      % (len(record['summary']['rows_applied']), record['summary']['rows_with_nothing_to_apply'], len(record['summary']['packages_corrected']),
         record['summary']['packages_added'], record['summary']['packages_replayed_exactly']))

# ---------------------------------------------------------------------------------------------- F
def run(script):
    r = subprocess.run([sys.executable, os.path.join(TOOLS, script)], capture_output=True, text=True)
    return r.returncode == 0, (r.stdout.strip().split('\n') or [''])[-1]


for s in ('r6_check_md.py', 'r6_check_mermaid.py', 'h2_diff_r6.py'):
    ok, last = run(s)
    check('F', s, ok, last)

fig = []


def quote(s, why):
    fig.append((s in R6, s, why))


quote("K3's packages (164, and W5-07 that F.8 C33 added: %d)" % len(P), 'INTRO package count')
w0 = [w for w in P if P[w]['wave'] == 'W0']
rest = [w for w in w0 if w not in ('W0-01', 'W0-02', 'W0-99')]
quote('W0-01 decision record: %s lines' % '{:,}'.format(lines('W0-01')), 'F.2.1 W0-01')
quote('W0-02 renumber, alone: %s lines' % '{:,}'.format(lines('W0-02')), 'F.2.1 W0-02')
quote('W0-03 to W0-19: %d packages, %s lines - W0 in all: %d packages, %s lines'
      % (len(rest), '{:,}'.format(sum(lines(w) for w in rest)), len(w0), '{:,}'.format(sum(lines(w) for w in w0))), 'F.2.1 W0')
LABEL = {'W1': 'W1 Core data and hubs', 'W2': 'W2 Subsystems', 'W3': 'W3 SheetTools hub and activation', 'W4': 'W4 Documents',
         'W5': 'W5 Convergence and options', 'W6': 'W6 Close-out'}
for wv, lab in LABEL.items():
    ms = [w for w in P if P[w]['wave'] == wv]
    quote('%s: %d packages, %s lines' % (lab, len(ms), '{:,}'.format(sum(lines(w) for w in ms))), 'F.2.1 ' + wv)
quote('WT lane: %d TrueVision packages' % sum(1 for w in P if P[w]['wave'] == 'WT'), 'F.2.1 WT')
VLE_ = 'VV/02__Src__AppModules/51__System__LayoutEditor/'
VMC, VLDR, VAC = VLE_ + '05__Core__ModeController/Na__LayoutEditor__ModeController__.js', VLE_ + '01__Core__Loader/Na__LayoutEditor__Loader__.js', VLE_ + '03__Core__Config/Na__LayoutEditor__AppConfig__.json'
VCSS = 'VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css'
hubn = {h['file']: len(h['editors']) for h in hot['files']}           # full paths: TV's own ModeController is a WT hot file too
quote('ModeController (%d editors), LE AppConfig (%d), Loader (%d) or CSS index (%d)'
      % (hubn[VMC], hubn[VAC], hubn[VLDR], hubn[VCSS]), 'RK-08 hub editors')
quote('topological sort of %d, critical path %s, %d hot files with %d unordered pairs'
      % (len(order), '{:,}'.format(cpl), len(multi), len(unordered)), 'F.8 intro')
quote('The critical path is %s estimated lines over %d packages (%d packages by count); W4 is the longest stretch (%s lines). %d files'
      % ('{:,}'.format(cpl), len(cp['by_est_lines']['path']), cpc, '{:,}'.format(per['W4'][1]), len(multi)), 'headline')
quote('%d canonical packages: %d in the ValeVision waves' % (len(P), vv_pk), 'headline counts')
fig.append((max(per, key=lambda wv: per[wv][1]) == 'W4', 'W4 is the longest wave stretch', 'headline claim'))
quote('F.8 corrects %d packages and adds W5-07 (C33)' % len(record['summary']['packages_corrected']), 'F.3 convention bullet')

# F.4.2 step 6: later editors of the held packages
later = {w: sorted({x for h in hot['files'] if w in h['editors'] for x in h['editors'] if pos[x] > pos[w]}) for w in
         ('W3-04', 'W5-04', 'W5-05', 'W5-06', 'W5-07', 'W6-03')}
fig.append((later['W3-04'] == [] and later['W5-06'] == [] and later['W5-07'] == [] and later['W6-03'] == []
            and later['W5-04'] == ['W6-03'] and later['W5-05'] == ['W5-07'],
            'later editors %s' % later, 'F.4.2 step 6 (no later editor / W5-04 then W6-03 / W5-05 then W5-07)'))
held = {'W3-04', 'W5-04', 'W5-05', 'W5-06', 'W5-07', 'W6-03'}
prepared = {'W0-07', 'W0-08', 'W0-10', 'W4-12', 'W4-13', 'W6-02'}
gated = {w for w in P if P[w]['wave'] in VV and P[w]['hard_gate']}
fig.append((held | prepared == gated and not held & prepared, 'hard-gated VV packages %s' % sorted(gated), 'F.2.6 / F.4.2 held and prepared lists'))
quote('(W3-04, W5-04, W5-05, W5-06, W5-07, W6-03 and the whole WT lane)', 'F.2.6 held list')
# F.6.1: W1-33's place in the W1 serial orders
def w1_order(path):
    h = table[path]
    return [so['serial_order'] for so in h['same_wave_serial_orders'] if so['wave'] == 'W1'][0]


mc1, ld1 = w1_order(VMC), w1_order(VLDR)
fig.append((len(mc1) == 4 and mc1[1] == 'W1-33' and len(ld1) == 4 and ld1[1] == 'W1-33', 'W1 ModeController %s, Loader %s' % (mc1, ld1),
            'F.6.1: second of four ModeController and Loader editors in W1'))
# P2 evidence: H2 adds no VV port of a WT-edited TV file
wt_edits = {e for w in P if P[w]['wave'] == 'WT' for e in P[w]['edits']}
tle_mc = 'TV/02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js'
src = lambda w: {K_ for K_ in (B.canon(B.strip_notes(s)) for s in P[w]['tv_sources'])}
fig.append((not (src('W5-07') & wt_edits) and sum(1 for w in P if P[w]['wave'] in VV and tle_mc in src(w)) == 16,
            'W5-07 sources %s; VV packages sourcing TLE ModeController: %d' % (sorted(src('W5-07')), sum(1 for w in P if P[w]['wave'] in VV and tle_mc in src(w))),
            'P2 evidence (30 VV packages; TLE ModeController: 16) unaffected'))
# the harness list in F.5.1: H2 text names no Na__Test__ harness
new_texts = [op['new'] for _, op in list(K.package_ops()) + K.RULE_OPS]
fig.append((not any(re.search(r'Na__Test__\w+\.html', t) for t in new_texts), 'no H2 op names an .html harness', 'F.5.1 harness list unaffected'))
# stale phrases
for s in ('does not carry them yet', 'once the planner adds it', 'proposed W5-07', '(and W5-07 once added)', 'the planner patches',
          'Five VV packages', 'no count here includes it', 'still holds K3', 'Proposed, not yet in'):
    fig.append((s not in R6, 'absent: %s' % s, 'stale phrase'))
fig.append((R6.count('not yet in wp_canonical.json') == 1 and '| C33 | New conditional package W5-07 (proposed here; not yet in wp_canonical.json)' in R6,
            "'not yet in wp_canonical.json' only in the C33 audit row", 'audit trail kept'))
st = re.findall(r'(?m)^\| (C\d+) \|.*<br>(Applied to `wp_canonical.json` on 01-Oct-2026|Nothing to apply to `wp_canonical.json` \(checked 01-Oct-2026\))', R6)
fig.append((sorted({c for c, _ in st}, key=lambda c: int(c[1:])) == sorted(ROWS, key=lambda c: int(c[1:])), '%d F.8 rows carry a status line' % len(st), 'F.8 audit lines'))
fig.append(('**Section F corrections applied (01-Oct-2026).**' in K3MD and '| W5-07 |' in K3MD, 'K3__WorkPackages.md carries the notice and W5-07', 'K3 report regenerated'))
bad_fig = [(s, why) for ok, s, why in fig if not ok]
check('F', 'every figure and statement Section F quotes from the JSON (%d checks)' % len(fig), not bad_fig, '; '.join('%s [%s]' % (s[:90], why) for s, why in bad_fig))

# ---------------------------------------------------------------------------------------------- report
width = max(len(n) for _, n, _, _ in RESULTS)
for cid, name, ok, detail in RESULTS:
    print('%-4s %-4s %s' % ('PASS' if ok else 'FAIL', cid, name))
    if detail:
        print('          ' + detail[:600])
bad = [r for r in RESULTS if not r[2]]
print('\n%d checks, %d failed' % (len(RESULTS), len(bad)))
sys.exit(1 if bad else 0)
