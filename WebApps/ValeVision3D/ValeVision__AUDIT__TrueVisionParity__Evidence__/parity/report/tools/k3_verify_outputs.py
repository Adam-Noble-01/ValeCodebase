#!/usr/bin/env python3
"""K3 - independent re-check of the written outputs (reads only the JSON files on disk).

Proves from data/wp_canonical.json, data/wp_raw_map.json, data/hot_file_ownership.json and
data/work_packages.json, without importing the catalogue modules:
  1. every raw id is the primary source of exactly one package, or dropped, and the raw map agrees;
  2. every dependency exists, VV waves only look backwards, the graph is acyclic (Kahn);
  3. the stored critical path (by est. lines) is a real chain and its weight is the maximum;
  4. every file edited by two packages appears in the hot-file table, and same-lane editors are DAG-ordered;
  5. every scribe closes its wave and every wave-n package reaches the wave n-1 scribe.
Exit 0 = all proofs hold.
"""
import collections, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, '..', '..', 'data'))
LANES = ['W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'WT']
SCRIBE = {'W0': 'W0-99', 'W1': 'W1-99', 'W2': 'W2-99', 'W3': 'W3-99', 'W4': 'W4-99', 'W5': 'W5-99', 'W6': 'W6-04'}


def load(name):
    with open(os.path.join(DATA, name), encoding='utf-8') as f:
        return json.load(f)


def verify():
    canon, rawmap, hot, raw = load('wp_canonical.json'), load('wp_raw_map.json'), load('hot_file_ownership.json'), load('work_packages.json')
    P = {p['wp_id']: p for p in canon['packages']}
    fails, facts = [], []

    # 0. field schema of every package
    REQ = {'wp_id': str, 'wave': str, 'title': str, 'goal': str, 'tv_sources': list, 'vv_targets': list, 'hot_files': list,
           'depends_on': list, 'gated_by': list, 'size': str, 'vv_adaptations': list, 'acceptance': list, 'tests_to_port': list,
           'source_wp_ids': list, 'risk': str}
    for p in canon['packages']:
        for k, t in REQ.items():
            if not isinstance(p.get(k), t):
                fails.append('%s: field %s missing or not %s' % (p.get('wp_id'), k, t.__name__))
        if not (p.get('est_lines') is None or isinstance(p.get('est_lines'), int)):
            fails.append('%s: est_lines not int/None' % p['wp_id'])
        if p.get('size') not in ('S', 'M', 'L', 'XL'):
            fails.append('%s: bad size %s' % (p['wp_id'], p.get('size')))
        if p['wp_id'] not in ('W0-99',) and not p['acceptance']:
            fails.append('%s: no acceptance' % p['wp_id'])
        for g in p['gated_by']:
            if not g.startswith('DR-'):
                fails.append('%s: gate %s is not a DR id' % (p['wp_id'], g))
    facts.append('schema: %d packages carry every required field with the right type' % len(canon['packages']))

    # 1. raw coverage
    raw_ids = {r['id'] for r in raw}
    owners = collections.defaultdict(list)
    for p in canon['packages']:
        for r in p['source_wp_ids']:
            owners[r].append(p['wp_id'])
    dropped = set(rawmap['dropped'])
    for r in sorted(raw_ids):
        n = len(owners.get(r, []))
        if r in dropped:
            if n:
                fails.append('dropped %s also owned by %s' % (r, owners[r]))
        elif n != 1:
            fails.append('raw %s owned by %d packages %s' % (r, n, owners.get(r, [])))
        elif rawmap['map'][r]['canonical'] != owners[r][0]:
            fails.append('raw map disagrees for %s' % r)
    extra = set(owners) - raw_ids
    if extra:
        fails.append('owned ids not in raw set: %s' % sorted(extra))
    facts.append('raw ids: %d live = %d owned once + %d dropped' % (len(raw_ids), len([r for r in raw_ids if len(owners.get(r, [])) == 1]), len(dropped & raw_ids)))

    # 2. DAG
    indeg = {w: 0 for w in P}
    kids = collections.defaultdict(list)
    for w, p in P.items():
        for d in p['depends_on']:
            if d not in P:
                fails.append('%s -> missing %s' % (w, d))
                continue
            if p['wave'] != 'WT':
                if P[d]['wave'] == 'WT' or LANES.index(P[d]['wave']) > LANES.index(p['wave']):
                    fails.append('%s (%s) depends forward/sideways on %s (%s)' % (w, p['wave'], d, P[d]['wave']))
            indeg[w] += 1
            kids[d].append(w)
    q = [w for w, n in indeg.items() if n == 0]
    topo = []
    while q:
        w = q.pop()
        topo.append(w)
        for c in kids[w]:
            indeg[c] -= 1
            if indeg[c] == 0:
                q.append(c)
    if len(topo) != len(P):
        fails.append('cycle: %d of %d sorted' % (len(topo), len(P)))
    facts.append('topological sort: %d of %d packages' % (len(topo), len(P)))
    anc = {}
    for w in topo:
        s = set()
        for d in P[w]['depends_on']:
            s.add(d)
            s |= anc.get(d, set())
        anc[w] = s

    # 3. critical path
    best = {}
    for w in topo:
        if P[w]['wave'] == 'WT':
            continue
        best[w] = (P[w]['est_lines'] or 0) + max([best[d] for d in P[w]['depends_on'] if d in best] or [0])
    stored = canon['critical_path']['by_est_lines']
    if max(best.values()) != stored['est_lines']:
        fails.append('critical path weight %s != recomputed %s' % (stored['est_lines'], max(best.values())))
    path = stored['path']
    for a, b in zip(path, path[1:]):
        if a not in P[b]['depends_on']:
            fails.append('critical path link %s -> %s is not a dependency' % (a, b))
    if sum(P[w]['est_lines'] or 0 for w in path) != stored['est_lines']:
        fails.append('critical path sum mismatch')
    facts.append('critical path: %d packages, %s est. lines (recomputed maximum %s)' % (len(path), stored['est_lines'], max(best.values())))

    # 4. hot files
    editors = collections.defaultdict(list)
    for w in topo:
        for f in P[w]['edits']:
            editors[f].append(w)
    multi = {f: ws for f, ws in editors.items() if len(ws) > 1}
    table = {h['file']: h for h in hot['files']}
    if set(multi) != set(table):
        fails.append('hot-file table differs: missing %s, extra %s' % (sorted(set(multi) - set(table))[:5], sorted(set(table) - set(multi))[:5]))
    unordered = 0
    for f, ws in multi.items():
        by_lane = collections.defaultdict(list)
        for w in ws:
            by_lane[P[w]['wave']].append(w)
        for lane, lw in by_lane.items():
            for i in range(len(lw)):
                for j in range(i + 1, len(lw)):
                    a, b = lw[i], lw[j]
                    if a not in anc[b] and b not in anc[a]:
                        unordered += 1
                        fails.append('unordered same-lane editors of %s: %s, %s' % (f, a, b))
    facts.append('hot files: %d with several editors, %d unordered same-lane pairs' % (len(multi), unordered))

    # 5. barrier
    for lane in LANES[:-1]:
        s = SCRIBE[lane]
        members = [w for w in P if P[w]['wave'] == lane and w != s]
        missing = [w for w in members if w not in anc[s]]
        if missing:
            fails.append('scribe %s misses %s' % (s, missing))
        if lane != 'W0':
            prev = SCRIBE[LANES[LANES.index(lane) - 1]]
            for w in members + [s]:
                if prev not in anc[w]:
                    fails.append('%s does not reach %s' % (w, prev))
    facts.append('wave barrier: every scribe closes its wave; every package reaches the previous scribe')
    return fails, facts


if __name__ == '__main__':
    fails, facts = verify()
    for f in facts:
        print('OK  ', f)
    for f in fails:
        print('FAIL', f)
    sys.exit(1 if fails else 0)
