#!/usr/bin/env python3
"""R1 (Section A) helper: builds the side-by-side CURRENT folder tables from the
read-only tree snapshots (parity/ref/tree_*.tsv) and the K2 target map
(parity/data/target_folder_map.json), plus the K3 creating package per added folder
(parity/data/wp_canonical.json). Writes markdown fragments to
parity/report/tools/r1_out/*.md. Read-only on both apps.
"""
import csv, json, os, re, sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
PARITY = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, 'r1_out')
os.makedirs(OUT, exist_ok=True)
M = '02__Src__AppModules'
LE = M + '/51__System__LayoutEditor'


def load_tree(name):
    rows = {}
    with open(os.path.join(PARITY, 'ref', name), encoding='utf-8') as f:
        r = csv.DictReader(f, delimiter='\t')
        for row in r:
            p = row['relpath']
            ln = row['lines']
            rows[p] = int(ln) if ln not in ('', None) else 0
    return rows


tv = load_tree('tree_tv.tsv')
vv = load_tree('tree_vv.tsv')


def folder_stats(tree, prefix):
    """files/lines per immediate child folder of prefix; counts recursively."""
    st = defaultdict(lambda: [0, 0])
    loose = [0, 0]
    for p, n in tree.items():
        if not p.startswith(prefix + '/'):
            continue
        rest = p[len(prefix) + 1:]
        if '/' in rest:
            top = rest.split('/')[0]
            if 'node_modules' in rest or '/.wrangler/' in ('/' + rest):
                continue
            st[top][0] += 1
            st[top][1] += n
        else:
            loose[0] += 1
            loose[1] += n
    return st, loose


def names_in(tree, folder):
    pre = folder + '/'
    return {p[len(pre):] for p in tree if p.startswith(pre) and 'node_modules' not in p}


tfm = json.load(open(os.path.join(PARITY, 'data', 'target_folder_map.json'), encoding='utf-8'))
wpc = json.load(open(os.path.join(PARITY, 'data', 'wp_canonical.json'), encoding='utf-8'))
topo = wpc['topological_order']
order = {pid: i for i, pid in enumerate(topo)} if topo and isinstance(topo[0], str) else {d['wp_id']: i for i, d in enumerate(topo)}


def creating_pkg(token):
    hits = []
    for p in wpc['packages']:
        for t in p.get('vv_targets', []):
            if token in t and '(new)' in t:
                hits.append((order.get(p['wp_id'], 9999), p['wp_id']))
    hits.sort()
    return hits[0][1] if hits else ''


def num(name):
    m = re.match(r'^(\d\d)__', name)
    return m.group(1) if m else '--'


# ---------------- top level ----------------
tv_top, _ = folder_stats(tv, M)
vv_top, _ = folder_stats(vv, M)
nums = sorted({num(x) for x in list(tv_top) + list(vv_top)})
pair_by_vv = {}
for r in tfm:
    if r['scope'] == 'top' and r['current_vv'] and r['tv_equivalent']:
        pair_by_vv[r['current_vv'].split('/')[1]] = r['tv_equivalent'].split('/')[1]
lines = ['| No. | TV folder (files / lines) | VV folder (files / lines) | Relation today |', '|---|---|---|---|']
for n in nums:
    tvf = [f for f in tv_top if num(f) == n]
    vvf = [f for f in vv_top if num(f) == n]
    t = tvf[0] if tvf else None
    v = vvf[0] if vvf else None
    if t and v:
        if t == v:
            rel = 'pair (same name)'
        elif pair_by_vv.get(v) == t:
            rel = 'same role, different engine (DIV-2)'
        else:
            rel = '**collision** (different systems)'
    elif t:
        partner = [vf for vf, tf in pair_by_vv.items() if tf == t]
        rel = 'TV-only' + (' (its VV twin sits at %s)' % partner[0] if partner else '')
    else:
        partner = pair_by_vv.get(v)
        rel = 'VV-only' + (' (its TV twin sits at %s)' % partner if partner else '')
    cell = lambda f, st: ('`%s` (%d / %s)' % (f, st[f][0], format(st[f][1], ',')) if f else '-')
    lines.append('| %s | %s | %s | %s |' % (n, cell(t, tv_top), cell(v, vv_top), rel))
open(os.path.join(OUT, 'top_current.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

# ---------------- LE subfolders ----------------
tv_le, tv_le_loose = folder_stats(tv, LE)
vv_le, vv_le_loose = folder_stats(vv, LE)
allsub = sorted(set(tv_le) | set(vv_le), key=lambda s: (num(s), s))
lines = ['| LE sub | TV (files / lines) | VV (files / lines) | Same file names | TV-only files | VV-only files | Relation today |', '|---|---|---|---|---|---|---|']
for s in allsub:
    t = s in tv_le
    v = s in vv_le
    tn = names_in(tv, LE + '/' + s) if t else set()
    vn = names_in(vv, LE + '/' + s) if v else set()
    rel = 'pair (same name)' if t and v else ('TV-only' if t else 'VV-only')
    lines.append('| `%s` | %s | %s | %s | %s | %s | %s |' % (
        s,
        '%d / %s' % (tv_le[s][0], format(tv_le[s][1], ',')) if t else '-',
        '%d / %s' % (vv_le[s][0], format(vv_le[s][1], ',')) if v else '-',
        len(tn & vn) if t and v else '-', len(tn - vn) if t else '-', len(vn - tn) if v else '-', rel))
open(os.path.join(OUT, 'le_current.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

# ---------------- creating packages for added folders ----------------
lines = ['| K2 row | VV target | Created by (K3) |', '|---|---|---|']
for r in tfm:
    if r['action'] in ('add', 'add_later') and r['target_vv']:
        tok = r['target_vv'].rstrip('/').split('/')[-1]
        if r['scope'] == 'style':
            tok = r['target_vv'].split('/')[-1]
        lines.append('| %s | `%s` | %s |' % (r['id'], r['target_vv'], creating_pkg(tok) or '(none found)'))
open(os.path.join(OUT, 'added_creators.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

# ---------------- summary counts ----------------
summary = {
    'tv_top': len(tv_top), 'vv_top': len(vv_top),
    'tv_le': len(tv_le), 'vv_le': len(vv_le),
    'tv_le_files': sum(v[0] for v in tv_le.values()) + tv_le_loose[0],
    'vv_le_files': sum(v[0] for v in vv_le.values()) + vv_le_loose[0],
    'tv_le_lines': sum(v[1] for v in tv_le.values()) + tv_le_loose[1],
    'vv_le_lines': sum(v[1] for v in vv_le.values()) + vv_le_loose[1],
}
json.dump(summary, open(os.path.join(OUT, 'summary.json'), 'w'), indent=1)
print(json.dumps(summary, indent=1))
print('wrote', OUT)
