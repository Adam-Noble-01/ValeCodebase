# r0_stats.py - read-only statistics for report section R0 (Executive Summary).
# Reads parity/ref/tree_tv.tsv, tree_vv.tsv, drift_all.tsv, drift_summary.json and
# parity/data/findings_verified.json, wp_canonical.json. Writes nothing except stdout.
import csv, json, os, collections, sys

P = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
REF = os.path.join(P, 'ref')
DATA = os.path.join(P, 'data')

def load_tree(name):
    rows = {}
    with open(os.path.join(REF, name), encoding='utf-8') as f:
        r = csv.DictReader(f, delimiter='\t')
        for row in r:
            try:
                n = int(row['lines']) if row['lines'] else 0
            except ValueError:
                n = 0
            rows[row['relpath'].replace('\\', '/')] = n
    return rows

tv = load_tree('tree_tv.tsv')
vv = load_tree('tree_vv.tsv')

LE = '02__Src__AppModules/51__System__LayoutEditor/'

def le_sub(tree):
    out = collections.defaultdict(lambda: [0, 0])
    for k, n in tree.items():
        if k.startswith(LE):
            rest = k[len(LE):]
            sub = rest.split('/')[0] if '/' in rest else '(root)'
            out[sub][0] += 1
            out[sub][1] += n
    return out

tvs, vvs = le_sub(tv), le_sub(vv)

# shared relpaths inside LE
tv_le = {k[len(LE):]: n for k, n in tv.items() if k.startswith(LE)}
vv_le = {k[len(LE):]: n for k, n in vv.items() if k.startswith(LE)}
shared = set(tv_le) & set(vv_le)
tv_only = set(tv_le) - set(vv_le)
vv_only = set(vv_le) - set(tv_le)
print('LE totals: TV files', len(tv_le), 'lines', sum(tv_le.values()), '| VV files', len(vv_le), 'lines', sum(vv_le.values()))
print('LE shared', len(shared), 'TV-only', len(tv_only), 'lines', sum(tv_le[k] for k in tv_only), 'VV-only', len(vv_only), sorted(vv_only))

# per LE subfolder: tv files/lines, vv files/lines, tv-only files/lines
print('\nLE subfolder | TV files | TV lines | VV files | VV lines | TV-only files | TV-only lines')
subs = sorted(set(tvs) | set(vvs))
rows = []
for s in subs:
    to = [k for k in tv_only if (k.split('/')[0] if '/' in k else '(root)') == s]
    rows.append((s, tvs[s][0], tvs[s][1], vvs[s][0], vvs[s][1], len(to), sum(tv_le[k] for k in to)))
for r in sorted(rows, key=lambda x: -x[6]):
    print(' | '.join(str(x) for x in r))

# drift state per LE subfolder from drift_all.tsv
print('\nLE drift by subfolder (state counts, diff lines):')
dr = collections.defaultdict(collections.Counter)
dl = collections.Counter()
with open(os.path.join(REF, 'drift_all.tsv'), encoding='utf-8') as f:
    for row in csv.DictReader(f, delimiter='\t'):
        if row['vv_folder'] == '51__System__LayoutEditor':
            rel = row['relpath'].replace('\\', '/')
            s = rel.split('/')[0] if '/' in rel else '(root)'
            dr[s][row['state']] += 1
            try:
                dl[s] += int(row['diff_lines'] or 0)
            except ValueError:
                pass
for s in sorted(dr, key=lambda x: -dl[x]):
    print(s, dict(dr[s]), dl[s])

# top-level TV-only folders
def top(tree):
    out = collections.defaultdict(lambda: [0, 0])
    for k, n in tree.items():
        if k.startswith('02__Src__AppModules/'):
            rest = k[len('02__Src__AppModules/'):]
            if '/' in rest:
                out[rest.split('/')[0]][0] += 1
                out[rest.split('/')[0]][1] += n
    return out
tt, vt = top(tv), top(vv)
print('\nTop-level folders TV:')
for k in sorted(tt):
    print(' TV', k, tt[k])
print('Top-level folders VV:')
for k in sorted(vt):
    print(' VV', k, vt[k])

# findings stats
F = json.load(open(os.path.join(DATA, 'findings_verified.json'), encoding='utf-8'))
fl = F if isinstance(F, list) else F.get('findings', F)
print('\nfindings', len(fl))
sev = collections.Counter(x.get('severity') for x in fl)
print('severity', dict(sev))
crit = [x for x in fl if x.get('severity') == 'critical']
print('critical by slice/category:')
for x in crit:
    print(' ', x['id'], x['category'], x['action'], '|', x['title'][:110])
added = sum(1 for x in fl if x.get('added_by_verifier'))
print('added_by_verifier', added)
