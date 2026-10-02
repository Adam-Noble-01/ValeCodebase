#!/usr/bin/env python3
"""R2 Section B - analyse the extraction: namespace / FILE / MODULE / banner / export
divergences between twins paired at their K2 target path, drawing-scope relevance,
export-name collisions, VV-only and TV-only module inventories.

Reads tools/out/r2b_extract.json; writes tools/out/r2b_analysis.json and prints a summary.
"""
import json
import os
import re
import posixpath
from collections import defaultdict, Counter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
X = json.load(open(os.path.join(OUT, 'r2b_extract.json'), encoding='utf-8'))
TVR, VVR = X['tv'], X['vv']
M = '02__Src__AppModules/'
LE = M + '51__System__LayoutEditor/'

DRAW_TOPS = ('40__', '41__', '42__', '43__', '44__', '45__', '46__', '47__', '48__', '49__',
             '50__', '51__', '52__', '53__', '54__', '55__')


def top(rel):
    if not rel.startswith(M):
        return rel.split('/')[0]
    return rel[len(M):].split('/')[0]


def system(rel):
    """System key: top-level folder, or LE subfolder for the Layout Editor."""
    if rel.startswith(LE):
        rest = rel[len(LE):].split('/')
        return '51/' + (rest[0] if len(rest) > 1 else '(root)')
    if rel.startswith(M):
        return top(rel)
    return rel.split('/')[0] + '/'


def is_draw(rel):
    return rel.startswith(M) and top(rel).startswith(DRAW_TOPS)


# ---------------------------------------------------------------------------
# TV drawing-system import surface: modules OUTSIDE 40-55 imported by TV files inside them
# ---------------------------------------------------------------------------
def resolve(frm, spec):
    if not spec.startswith('.'):
        return None
    return posixpath.normpath(posixpath.join(posixpath.dirname(frm), spec))


tv_surface = defaultdict(set)
for rel, rec in TVR.items():
    if not is_draw(rel):
        continue
    for spec in rec.get('imports', []):
        tgt = resolve(rel, spec)
        if tgt and tgt in TVR and not is_draw(tgt):
            tv_surface[tgt].add(rel)

# ---------------------------------------------------------------------------
# Pairs
# ---------------------------------------------------------------------------
rows = []
for p in X['pairs']:
    t, v = p['target'], p['vv_now']
    tr, vr = TVR[t], VVR[v]
    if tr.get('ext') not in ('.js', '.mjs', '.cjs', '.css', '.json'):
        continue
    te, ve = set(tr.get('exports', [])), set(vr.get('exports', []))
    row = {
        'target': t, 'vv_now': v, 'system': system(t), 'ext': tr['ext'],
        'draw_scope': is_draw(t) or t in tv_surface,
        'surface_importers': sorted(tv_surface.get(t, [])),
        'tv_ns': tr.get('NAMESPACE', ''), 'vv_ns': vr.get('NAMESPACE', ''),
        'tv_file': tr.get('FILE', ''), 'vv_file': vr.get('FILE', ''),
        'tv_mod': tr.get('MODULE', ''), 'vv_mod': vr.get('MODULE', ''),
        'tv_banner': tr.get('banner_text', ''), 'vv_banner': vr.get('banner_text', ''),
        'tv_banner_app': tr.get('banner_app', ''), 'vv_banner_app': vr.get('banner_app', ''),
        'tv_ver': tr.get('ver', ''), 'vv_ver': vr.get('ver', ''),
        'tv_lines': tr.get('lines', 0), 'vv_lines': vr.get('lines', 0),
        'exp_tv_only': sorted(te - ve), 'exp_vv_only': sorted(ve - te), 'exp_common': len(te & ve),
        'n_tv': len(te), 'n_vv': len(ve),
    }
    # likely renames: same tail after the last '__' with a different prefix, or same prefix
    # with one tail a prefix of the other
    ren = []
    for a in row['exp_vv_only']:
        for b in row['exp_tv_only']:
            ta, tb = a.rsplit('__', 1)[-1], b.rsplit('__', 1)[-1]
            pa, pb = a.rsplit('__', 1)[0], b.rsplit('__', 1)[0]
            if ta == tb and pa != pb:
                ren.append((a, b, 'prefix'))
    row['renames'] = ren
    rows.append(row)

base = lambda r: r.rsplit('/', 1)[-1]

ns_div = [r for r in rows if r['ext'] in ('.js', '.mjs', '.cjs', '.css') and r['tv_ns'] != r['vv_ns']]
file_div = [r for r in rows if r['tv_file'] != r['vv_file']]
file_vs_name_vv = [r for r in rows if r['vv_file'] and r['vv_file'] != base(r['target'])]
file_vs_name_tv = [r for r in rows if r['tv_file'] and r['tv_file'] != base(r['target'])]
mod_div = [r for r in rows if r['tv_mod'] != r['vv_mod']]
banner_div = [r for r in rows if r['tv_banner'] != r['vv_banner']]
banner_app_wrong = [r for r in rows if r['vv_banner_app'] == 'TRUEVISION3D']
exp_div = [r for r in rows if r['exp_tv_only'] or r['exp_vv_only']]

# all VV/TV files (not only pairs) whose FILE line differs from the file name
file_line_wrong = {'tv': [], 'vv': []}
for app, R in (('tv', TVR), ('vv', VVR)):
    for rel, rec in R.items():
        if rec.get('FILE') and rec['FILE'] != base(rel):
            file_line_wrong[app].append((rel, rec['FILE']))
# VV files whose banner carries TRUEVISION3D (identity leak)
leaks = sorted(rel for rel, rec in VVR.items() if rec.get('banner_app') == 'TRUEVISION3D')

# ---------------------------------------------------------------------------
# VV-only and TV-only files (post-renumber targets)
# ---------------------------------------------------------------------------
vv_only = [(VVR_rel, VVR[VVR_rel]) for VVR_rel in VVR if VVR[VVR_rel]['target'] in set(X['vv_only'])]
tv_only = [(t, TVR[t]) for t in X['tv_only']]

# ---------------------------------------------------------------------------
# Export-name collisions: a name exported by a VV file that is NOT its pair, and also
# exported by a different TV file (would clash in VV once TV's module is ported), plus
# VV-internal and TV-internal duplicates.
# ---------------------------------------------------------------------------
pair_tv_for_vv = {p['vv_now']: p['target'] for p in X['pairs']}
tv_name_owner = defaultdict(set)
for rel, rec in TVR.items():
    for nme in rec.get('exports', []):
        if nme in ('default',) or nme.startswith('*'):
            continue
        if rel in [] :
            continue
        tv_name_owner[nme].add(rel)
vv_name_owner = defaultdict(set)
for rel, rec in VVR.items():
    for nme in rec.get('exports', []):
        if nme in ('default',) or nme.startswith('*'):
            continue
        vv_name_owner[nme].add(rel)
collisions = []
for nme, vfiles in vv_name_owner.items():
    tfiles = tv_name_owner.get(nme, set())
    if not tfiles:
        continue
    vt = {VVR[v]['target'] for v in vfiles}
    if vt != tfiles:
        collisions.append({'name': nme, 'vv_files': sorted(vfiles), 'vv_targets': sorted(vt), 'tv_files': sorted(tfiles)})
collisions.sort(key=lambda c: c['name'])

# re-export aware: ignore names TV re-exports (shim) when they also live in the owner
# ---------------------------------------------------------------------------
# Namespace prefixes (Na__<Ns>__) used by VV-only files and by TV-only files
# ---------------------------------------------------------------------------
def prefixes(rec):
    out = set()
    for nme in rec.get('exports', []):
        m = re.match(r'(Na__[A-Za-z0-9]+)__', nme)
        if m:
            out.add(m.group(1))
    return out

vv_only_targets = set(X['vv_only'])
tv_only_set = set(X['tv_only'])
pref_vv_only = defaultdict(set)
for rel, rec in VVR.items():
    if rec['target'] in vv_only_targets:
        for p in prefixes(rec):
            pref_vv_only[p].add(rel)
pref_tv_all = defaultdict(set)
for rel, rec in TVR.items():
    for p in prefixes(rec):
        pref_tv_all[p].add(rel)
ns_shared_by_unpaired = []
for p, vfiles in sorted(pref_vv_only.items()):
    if p in pref_tv_all:
        ns_shared_by_unpaired.append({'prefix': p, 'vv_only_files': sorted(vfiles), 'tv_files': sorted(pref_tv_all[p])})

res = {
    'counts': {
        'pairs_src': len(rows), 'pairs_draw_scope': sum(1 for r in rows if r['draw_scope']),
        'ns_div': len(ns_div), 'file_div': len(file_div), 'mod_div': len(mod_div),
        'banner_div': len(banner_div), 'exp_div': len(exp_div),
        'vv_only_files': len(vv_only), 'tv_only_files': len(tv_only),
    },
    'rows': rows,
    'ns_div': [r['target'] for r in ns_div],
    'file_div': [r['target'] for r in file_div],
    'mod_div': [r['target'] for r in mod_div],
    'banner_div': [r['target'] for r in banner_div],
    'banner_app_wrong': [r['target'] for r in banner_app_wrong],
    'file_line_wrong': file_line_wrong,
    'leaks': leaks,
    'collisions': collisions,
    'ns_shared_by_unpaired': ns_shared_by_unpaired,
    'tv_surface': {k: sorted(v) for k, v in tv_surface.items()},
}
json.dump(res, open(os.path.join(OUT, 'r2b_analysis.json'), 'w', encoding='utf-8'), indent=1)

print(json.dumps(res['counts'], indent=1))
print('\nNAMESPACE differences (js/css pairs):')
for r in ns_div:
    print('  ', r['target'], '| TV', repr(r['tv_ns']), '| VV', repr(r['vv_ns']), '| draw', r['draw_scope'])
print('\nFILE-line differences between twins:')
for r in file_div:
    print('  ', r['target'], '| TV', repr(r['tv_file']), '| VV', repr(r['vv_file']))
print('\nFILE line != file name (TV):', len(file_line_wrong['tv']))
for a in file_line_wrong['tv']:
    print('   ', a)
print('FILE line != file name (VV):', len(file_line_wrong['vv']))
for a in file_line_wrong['vv']:
    print('   ', a)
print('\nMODULE-line differences:')
for r in mod_div:
    print('  ', r['target'], '| TV', repr(r['tv_mod']), '| VV', repr(r['vv_mod']))
print('\nBanner text differences (after app token):')
for r in banner_div:
    print('  ', r['target'], '| TV', repr(r['tv_banner']), '| VV', repr(r['vv_banner']), r['vv_banner_app'])
print('\nVV banner with TRUEVISION3D:', leaks)
print('\nExport-name collisions (same name, different module):', len(collisions))
for c in collisions:
    print('  ', c['name'], '| VV', c['vv_files'], '| TV', c['tv_files'])
print('\nShared short namespaces between VV-only files and TV files:')
for c in ns_shared_by_unpaired:
    print('  ', c['prefix'], '| VV-only', c['vv_only_files'], '| TV', c['tv_files'][:6])
