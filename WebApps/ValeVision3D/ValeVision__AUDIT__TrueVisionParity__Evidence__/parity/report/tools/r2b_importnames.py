#!/usr/bin/env python3
"""R2 Section B - which NAMES do TV drawing-system files (40-55 incl. LE) import from each
module, and does VV's twin (at its K2 target path) export every one of them?

READ-ONLY on both apps. Reads the extraction JSON for the file lists, re-reads TV importer files
to parse `import { a, b as c } from '...'` statements (comment-stripped). Writes
tools/out/r2b_importnames.json and prints the missing-name table for shared modules.
"""
import json
import os
import posixpath
import re
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r2b_extract import strip_js, TV, VV  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
X = json.load(open(os.path.join(OUT, 'r2b_extract.json'), encoding='utf-8'))
TVR, VVR = X['tv'], X['vv']
M = '02__Src__AppModules/'
DRAW_TOPS = tuple('%d__' % n for n in range(40, 56))


def top(rel):
    return rel[len(M):].split('/')[0] if rel.startswith(M) else ''


def is_draw(rel):
    return rel.startswith(M) and top(rel).startswith(DRAW_TOPS)


RX_IMP = re.compile(r'\bimport\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"]', re.S)
RX_IMP_SPEC = re.compile(r'\bimport\s*\{[^}]*\}\s*from\s*([\'"])([^\'"]+)\1', re.S)

vv_by_target = {rec['target']: rel for rel, rec in VVR.items()}

need = defaultdict(lambda: defaultdict(set))   # tv_module -> name -> {importer}
for rel, rec in TVR.items():
    if rec.get('ext') not in ('.js', '.mjs') or not is_draw(rel):
        continue
    raw = open(os.path.join(TV, rel.replace('/', os.sep)), encoding='utf-8', errors='replace').read()
    code = strip_js(raw)
    # strip_js blanks string contents, so read specifiers from the raw text at the same offsets
    for m in RX_IMP.finditer(code):
        start, end = m.span()
        seg = raw[start:end]
        ms = RX_IMP_SPEC.search(seg)
        if not ms:
            continue
        spec = ms.group(2)
        if not spec.startswith('.'):
            continue
        tgt = posixpath.normpath(posixpath.join(posixpath.dirname(rel), spec))
        for item in m.group(1).split(','):
            item = item.strip()
            if not item:
                continue
            nm = re.match(r'([A-Za-z_$][\w$]*)', item).group(1)
            need[tgt][nm].add(rel)

rows = []
for mod, names in sorted(need.items()):
    vv_rel = vv_by_target.get(mod)
    vv_exp = set(VVR[vv_rel].get('exports', [])) if vv_rel else None
    tv_exp = set(TVR.get(mod, {}).get('exports', []))
    missing = sorted(n for n in names if vv_exp is not None and n not in vv_exp)
    rows.append({
        'module': mod, 'draw': is_draw(mod), 'vv_has_module': vv_rel is not None, 'vv_now': vv_rel,
        'names': sorted(names), 'missing_in_vv': missing,
        'missing_importers': {n: sorted(need[mod][n]) for n in missing},
        'tv_exports_missing': sorted(n for n in names if n not in tv_exp),
    })
json.dump(rows, open(os.path.join(OUT, 'r2b_importnames.json'), 'w', encoding='utf-8'), indent=1)

print('TV-drawing-imported modules OUTSIDE 40-55 (support surface):')
for r in rows:
    if r['draw']:
        continue
    flag = 'VV lacks module' if not r['vv_has_module'] else ('missing %d' % len(r['missing_in_vv']) if r['missing_in_vv'] else 'ok')
    print('  %-95s %s' % (r['module'].replace(M, ''), flag))
    for n in r['missing_in_vv']:
        imps = sorted({i.replace(M, '') for i in r['missing_importers'][n]})
        print('       - %s  <- %s' % (n, ', '.join(imps[:6]) + (' ...' if len(imps) > 6 else '')))
print()
print('Shared modules INSIDE 40-55 that VV has, with names TV drawing files import but VV lacks:')
for r in rows:
    if not r['draw'] or not r['vv_has_module'] or not r['missing_in_vv']:
        continue
    print('  %-95s missing %d' % (r['module'].replace(M, ''), len(r['missing_in_vv'])))
