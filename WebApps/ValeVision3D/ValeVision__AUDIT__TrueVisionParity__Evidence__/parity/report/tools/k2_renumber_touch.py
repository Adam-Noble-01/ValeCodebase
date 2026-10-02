#!/usr/bin/env python3
"""Summarise the renumber touch list from k2_refscan.py --json output.

Reads k2work/renumber_refs.json (one key per old folder name) and prints:
- the union of files that must be edited (history docs excluded), split into
  files inside the moved folders and files outside them;
- per old folder name: files and refs, by kind (import / css / string / comment);
- the list compared with verify_s01/renumber_touch_verified.txt.
Writes k2work/renumber_touch_k2.tsv (file, refs, kinds, inside_moved).
"""
import json, os, re, sys
PAR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity'
res = json.load(open(os.path.join(PAR, 'k2work', 'renumber_refs.json'), encoding='utf-8'))
MOVED = re.compile(r'^VV/02__Src__AppModules/(40__System__2dElevationsView|42__System__DrawingViewCore|43__System__FloorPlanViews|44__System__PlanAnnotations|45__System__PlanDimensions|46__System__ElevationViews|47__System__NorthDirection)/')
union = {}
hist = {}
for pat, files in res.items():
    for f, r in files.items():
        kinds = r['kinds']
        if set(kinds) == {'history'}:
            hist[f] = hist.get(f, 0) + r['refs']
            continue
        u = union.setdefault(f, {'refs': 0, 'kinds': {}, 'pats': set()})
        u['refs'] += r['refs']
        u['pats'].add(pat)
        for k, v in kinds.items():
            u['kinds'][k] = u['kinds'].get(k, 0) + v
inside = [f for f in union if MOVED.match(f)]
outside = [f for f in union if not MOVED.match(f)]
tot = sum(u['refs'] for u in union.values())
print('EDIT FILES (non-history): %d files, %d refs; inside moved folders %d, outside %d' % (len(union), tot, len(inside), len(outside)))
kinds = {}
for u in union.values():
    for k, v in u['kinds'].items():
        kinds[k] = kinds.get(k, 0) + v
print('by kind', kinds)
print('HISTORY (not edited):', hist)
ver = os.path.join(PAR, 'verify_s01', 'renumber_touch_verified.txt')
vset = set()
for ln in open(ver, encoding='utf-8'):
    m = re.match(r'^\s*(\d+)\s+(\S.*)$', ln.rstrip())
    if m and not ln.startswith(('files', 'survey', 'mine', 'inside')):
        vset.add('VV/' + m.group(2))
mine = set(union) | set(hist)
print('in verify_s01 not in K2:', sorted(vset - mine))
print('in K2 not in verify_s01:', sorted(mine - vset))
with open(os.path.join(PAR, 'k2work', 'renumber_touch_k2.tsv'), 'w', encoding='utf-8') as out:
    out.write('file\trefs\tkinds\tinside_moved\tpatterns\n')
    for f in sorted(union):
        u = union[f]
        out.write('%s\t%d\t%s\t%s\t%s\n' % (f, u['refs'], json.dumps(u['kinds']), bool(MOVED.match(f)), ','.join(sorted(u['pats']))))
print('outside-folder files:')
for f in sorted(outside):
    print('  %3d %s %s' % (union[f]['refs'], f, union[f]['kinds']))
