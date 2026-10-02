#!/usr/bin/env python3
"""Per-folder file inventory from ref/drift_all.tsv and the two trees.

Prints, for every paired folder (and every LE subfolder), the counts of
identical / header-only / drifted / tv-only / vv-only files and the tv-only and
vv-only file names, and writes k2work/folder_inventory.json for the map builder.
"""
import csv, json, os
from collections import defaultdict
PAR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity'
REF = os.path.join(PAR, 'ref')

def load(p):
    with open(os.path.join(REF, p), encoding='utf-8') as f:
        return list(csv.DictReader(f, delimiter='\t'))

drift = load('drift_all.tsv')
inv = {}
for r in drift:
    vf, tf, rel = r['vv_folder'], r['tv_folder'], r['relpath'].replace(chr(92), '/')
    if vf == '51__System__LayoutEditor':
        sub = rel.split('/')[0] if '/' in rel else '(root)'
        key = 'LE/' + sub
    else:
        key = vf + ' -> ' + tf
    d = inv.setdefault(key, {'vv_folder': vf, 'tv_folder': tf, 'states': defaultdict(int), 'tv_only': [], 'vv_only': [], 'tv_lines': 0, 'vv_lines': 0})
    d['states'][r['state']] += 1
    d['tv_lines'] += int(r['tv_lines'] or 0)
    d['vv_lines'] += int(r['vv_lines'] or 0)
    if r['state'] == 'tv-only':
        d['tv_only'].append(rel)
    elif r['state'] == 'vv-only':
        d['vv_only'].append(rel)

for k in sorted(inv):
    d = inv[k]
    print('%-62s %s tv_lines=%d vv_lines=%d' % (k, dict(d['states']), d['tv_lines'], d['vv_lines']))
    if d['vv_only']:
        print('    VV-only:', d['vv_only'])
    if d['tv_only'] and len(d['tv_only']) <= 12:
        print('    TV-only:', d['tv_only'])
    elif d['tv_only']:
        print('    TV-only: %d files (first 6) %s' % (len(d['tv_only']), d['tv_only'][:6]))

for k, d in inv.items():
    d['states'] = dict(d['states'])
json.dump(inv, open(os.path.join(PAR, 'k2work', 'folder_inventory.json'), 'w', encoding='utf-8'), indent=1)
