#!/usr/bin/env python3
"""R6 (Section F) - computations over the K3 canonical artefacts.

Read-only on both apps. Reads parity/data/*.json, parity/ref/tree_tv.tsv and
parity/report/tools/r6_eol_scan.json; returns plain Python structures that
r6_build_sectionF.py renders. Run directly to print a diagnostic summary.
"""
import collections
import json
import os
import re

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.dirname(TOOLS)
PARITY = os.path.dirname(REPORT)
DATA = os.path.join(PARITY, 'data')
REF = os.path.join(PARITY, 'ref')

WAVES = ['W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'WT']
VV_WAVES = WAVES[:-1]
SCRIBES = {'W0': 'W0-99', 'W1': 'W1-99', 'W2': 'W2-99', 'W3': 'W3-99', 'W4': 'W4-99', 'W5': 'W5-99', 'W6': 'W6-04'}


def load(name, folder=DATA):
    with open(os.path.join(folder, name), encoding='utf-8') as f:
        return json.load(f)


canon = load('wp_canonical.json')
hot = load('hot_file_ownership.json')
drs = load('decision_register.json')
P = {p['wp_id']: p for p in canon['packages']}
ORDER = canon['topological_order']
POS = {w: i for i, w in enumerate(ORDER)}
DR_TITLE = {d['dr_id']: d['title'] for d in drs}

# TV line counts (app-root relative paths)
TV_LINES = {}
with open(os.path.join(REF, 'tree_tv.tsv'), encoding='utf-8') as f:
    next(f)
    for line in f:
        parts = line.rstrip('\n').split('\t')
        if len(parts) >= 2 and parts[1].strip().isdigit():
            TV_LINES[parts[0]] = int(parts[1])

ANN = re.compile(r'\s*\(([^()]*)\)\s*$')


def top_level_arrow(s):
    """True when ' -> ' occurs outside every parenthesis: a move 'A -> B (note)'.
    An arrow inside K3's annotation, as in 'x.js (1.7.0 -> 1.13.0 hunks)', is text (F.8 C27)."""
    depth = 0
    for i, ch in enumerate(s):
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth = max(0, depth - 1)
        elif depth == 0 and s.startswith(' -> ', i):
            return True
    return False


def parse_item(s):
    """'TVM/x/y.js (note) (new)' -> dict(kind, path, new, notes)."""
    s = s.strip()
    if top_level_arrow(s):
        return {'kind': 'move', 'text': s}
    notes = []
    while True:
        m = ANN.search(s)
        if not m:
            break
        notes.insert(0, m.group(1).strip())
        s = s[:m.start()].rstrip()
    new = 'new' in notes
    notes = [n for n in notes if n != 'new']
    return {'kind': 'path', 'path': s, 'new': new, 'notes': notes}


def canon_path(p):
    """Package shorthand -> the canonical repo-qualified form used in hot_file_ownership.json."""
    p = parse_item(p)['path'] if not top_level_arrow(p) else p
    if p.startswith('VVM/'):
        return 'VV/02__Src__AppModules/' + p[4:]
    if p.startswith('TVM/'):
        return 'TV/02__Src__AppModules/' + p[4:]
    return p


HOT = {h['file']: h for h in hot['files']}


def intra_deps(w):
    p = P[w]
    return [d for d in p['depends_on'] if P[d]['wave'] == p['wave']]


def wave_members(wave):
    return [w for w in ORDER if P[w]['wave'] == wave]


def levels(wave):
    """ASAP levels inside a wave (intra-wave edges only), scribe excluded."""
    scribe = SCRIBES.get(wave)
    lv = {}
    for w in wave_members(wave):
        if w == scribe:
            continue
        ds = [d for d in intra_deps(w) if d != scribe]
        lv[w] = 0 if not ds else 1 + max(lv[d] for d in ds)
    by = collections.defaultdict(list)
    for w, l in lv.items():
        by[l].append(w)
    return lv, by


ANC = {}


def ancestors(w):
    if w in ANC:
        return ANC[w]
    s = set()
    for d in P[w]['depends_on']:
        s.add(d)
        s |= ancestors(d)
    ANC[w] = s
    return s


for _w in ORDER:
    ancestors(_w)


def reduced_edges(wave):
    """Transitive reduction of the intra-wave DAG plus entry/exit edges."""
    members = wave_members(wave)
    mset = set(members)
    edges = []
    for w in members:
        ds = [d for d in P[w]['depends_on'] if d in mset]
        keep = []
        for d in ds:
            if not any(d in ancestors(o) for o in ds if o != d):
                keep.append(d)
        for d in keep:
            edges.append((d, w))
    return edges


def entry_nodes(wave):
    members = set(wave_members(wave))
    out = []
    for w in wave_members(wave):
        ext = [d for d in P[w]['depends_on'] if d not in members]
        if ext:
            out.append((w, ext))
    return out


def tv_source_lines(p):
    total = 0
    files = 0
    missing = []
    for s in p['tv_sources']:
        it = parse_item(s)
        if it['kind'] != 'path':
            continue
        path = it['path']
        if path.endswith('/'):
            continue
        if path.startswith('TVM/'):
            rel = '02__Src__AppModules/' + path[4:]
        elif path.startswith('TV/'):
            rel = path[3:]
        else:
            continue
        files += 1
        if rel in TV_LINES:
            total += TV_LINES[rel]
        else:
            missing.append(rel)
    return files, total, missing


def repo_of(edit):
    if edit.startswith('VV/'):
        return 'VV'
    if edit.startswith('WCP/'):
        return 'WCP'
    if edit.startswith('VCB/'):
        return 'VCB'
    if edit.startswith('TV/') or edit.startswith('NAWEB/'):
        return 'TV'
    if edit.startswith('NAAPPS/'):
        return 'NAAPPS'
    return 'other'


def effort():
    rows = []
    for wave in WAVES:
        members = wave_members(wave)
        files = set()
        new = set()
        by_repo = collections.Counter()
        tv_files = set()
        tv_lines = 0
        hot_slots = 0
        for w in members:
            p = P[w]
            for e in p['edits']:
                files.add(e)
            for t in p['vv_targets'] + p.get('tv_targets', []):
                it = parse_item(t)
                if it['kind'] == 'path' and it['new']:
                    new.add(canon_path(it['path']))
            for s in p['tv_sources']:
                it = parse_item(s)
                if it['kind'] != 'path' or it['path'].endswith('/'):
                    continue
                path = it['path']
                rel = ('02__Src__AppModules/' + path[4:]) if path.startswith('TVM/') else (path[3:] if path.startswith('TV/') else None)
                if rel and rel not in tv_files:
                    tv_files.add(rel)
                    tv_lines += TV_LINES.get(rel, 0)
            for e in p['edits']:
                if e in HOT:
                    hot_slots += 1
        for f in files:
            by_repo[repo_of(f)] += 1
        est = sum((P[w]['est_lines'] or 0) for w in members)
        unest = [w for w in members if P[w]['est_lines'] is None]
        sizes = collections.Counter(P[w]['size'] for w in members)
        rows.append({
            'wave': wave, 'packages': len(members), 'est': est, 'unest': unest,
            'files': len(files), 'new': len(new & files) if new else 0, 'new_all': len(new),
            'by_repo': dict(by_repo), 'tv_files': len(tv_files), 'tv_lines': tv_lines,
            'hot_slots': hot_slots, 'sizes': dict(sizes),
            'xl': [w for w in members if P[w]['size'] == 'XL'],
        })
    return rows


def gated_union(wave):
    c = collections.Counter()
    for w in wave_members(wave):
        for g in P[w]['gated_by']:
            c[g] += 1
    return c


def tests_by_wave():
    bt = canon['test_ownership']['by_test']
    port = collections.defaultdict(list)
    rerun = collections.defaultdict(list)
    early = collections.defaultdict(list)
    replaces = set()
    for name, rec in bt.items():
        st = rec.get('status', '')
        if st.startswith('ported'):
            porter = rec.get('porter')
            if porter:
                port[P[porter]['wave']].append((name, porter, st))
            if 'replaces' in st:
                replaces.add(name)
            for r in rec.get('also_run_by', []) or []:
                rerun[P[r]['wave']].append((name, r))
            for r in rec.get('sections_run_earlier_by', []) or []:
                early[P[r]['wave']].append((name, r))
        else:
            for r in rec.get('also_run_by', []) or []:
                rerun[P[r]['wave']].append((name, r))
    vvonly = collections.defaultdict(list)
    for name, uses in canon['test_ownership']['vv_only_new_tests'].items():
        for wp, kind in uses:
            if kind == 'port':
                vvonly[P[wp]['wave']].append((name, wp))
            else:
                rerun[P[wp]['wave']].append((name, wp))
    return port, rerun, early, vvonly, replaces


def critical():
    return canon['critical_path']


if __name__ == '__main__':
    for r in effort():
        print(r)
    for wave in WAVES:
        lv, by = levels(wave)
        print(wave, 'levels', len(by), 'max width', max(len(v) for v in by.values()))
    port, rerun, early, vvonly, rep = tests_by_wave()
    for wave in WAVES:
        print(wave, 'port', len(port[wave]), 'rerun', len(rerun[wave]), 'vvonly', len(vvonly[wave]))
    # TV source lines missing from the snapshot
    miss = []
    for w in ORDER:
        f, t, m = tv_source_lines(P[w])
        miss += m
    print('tv source paths not in tree_tv.tsv:', len(miss), miss[:10])


def bottom_level(wave):
    """Longest path (in est. lines) from each package to the end of its wave, itself included."""
    members = wave_members(wave)
    mset = set(members)
    succ = collections.defaultdict(list)
    for w in members:
        for d in P[w]['depends_on']:
            if d in mset:
                succ[d].append(w)
    bl = {}
    for w in reversed(members):
        dur = P[w]['est_lines'] or 0
        bl[w] = dur + max((bl[s] for s in succ[w]), default=0)
    return bl


def simulate(wave, k):
    """Greedy list scheduling with k agents; priority = bottom level. Returns makespan in est. lines."""
    members = wave_members(wave)
    mset = set(members)
    deps = {w: [d for d in P[w]['depends_on'] if d in mset] for w in members}
    bl = bottom_level(wave)
    done_at = {}
    running = []  # (finish, wp)
    t = 0
    pending = set(members)
    while pending or running:
        ready = [w for w in pending if all(d in done_at and done_at[d] <= t for d in deps[w])]
        ready.sort(key=lambda w: (-bl[w], POS[w]))
        while ready and len(running) < k:
            w = ready.pop(0)
            pending.discard(w)
            running.append((t + (P[w]['est_lines'] or 0), w))
        if not running:
            break
        running.sort()
        fin, w = running.pop(0)
        t = max(t, fin)
        done_at[w] = fin
        # release everything that finishes at the same time
        while running and running[0][0] <= t:
            f2, w2 = running.pop(0)
            done_at[w2] = f2
    return t
