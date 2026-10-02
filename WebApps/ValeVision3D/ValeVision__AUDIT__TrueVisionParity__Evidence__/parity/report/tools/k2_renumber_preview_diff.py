#!/usr/bin/env python3
"""Write a reviewable unified diff of the W1 renumber (live VV -> simulated copy).

Reads k2work/renumber_sim_report.json (written by k2_renumber_apply.py --mode copy),
maps every rewritten pre-move path to its post-move path in the copy, and writes
k2work/renumber_W1_preview.diff (text diff, CRLF stripped for readability) plus the
list of moves at the top. READ-ONLY on the live app.
"""
import difflib, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from k2_renumber_apply import final_path, VV_DEFAULT, WCP_SW_REL  # noqa: E402

PAR = os.path.normpath(os.path.join(HERE, '..', '..'))
rep = json.load(open(os.path.join(PAR, 'k2work', 'renumber_sim_report.json'), encoding='utf-8'))
sim = rep['root']
fm = [tuple(x) for x in rep['file_moves']]
dm = [tuple(x) for x in rep['folder_moves']]
out = ['# W1 renumber preview - live ValeVision3D -> simulated result (k2_renumber_apply.py --mode copy)',
       '# moves:']
for fid, old, new in fm:
    out.append('#   %s  %s -> %s' % (fid, old, new))
for did, old, new in dm:
    out.append('#   %s  02__Src__AppModules/%s/ -> 02__Src__AppModules/%s/' % (did, old, new))
out.append('# files rewritten: %d' % len(rep['files_rewritten']))
out.append('')
n_lines = 0
for rel in rep['files_rewritten']:
    post = final_path(rel, fm, dm)
    a = open(os.path.join(VV_DEFAULT, rel), encoding='utf-8', errors='replace').read().replace('\r\n', '\n').splitlines(keepends=True)
    b = open(os.path.join(sim, post), encoding='utf-8', errors='replace').read().replace('\r\n', '\n').splitlines(keepends=True)
    d = list(difflib.unified_diff(a, b, 'a/' + rel, 'b/' + post, n=0))
    n_lines += len(d)
    out.extend(x.rstrip('\n') for x in d)
if rep.get('wcp_sw'):
    live = os.path.normpath(os.path.join(VV_DEFAULT, WCP_SW_REL))
    a = open(live, encoding='utf-8').read().replace('\r\n', '\n').splitlines(keepends=True)
    b = open(rep['wcp_sw'], encoding='utf-8').read().replace('\r\n', '\n').splitlines(keepends=True)
    out.extend(x.rstrip('\n') for x in difflib.unified_diff(a, b, 'a/WCP/' + os.path.basename(live), 'b/WCP/' + os.path.basename(live), n=0))
p = os.path.join(PAR, 'k2work', 'renumber_W1_preview.diff')
open(p, 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
print('wrote', p, 'diff lines', n_lines)
