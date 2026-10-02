"""Print selected cells of catalogue rows from Section F (inspection only)."""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MD = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'R6__F_SwarmDelegationPlan.md')
text = open(MD, encoding='utf-8').read()
cols = ['', 'ID', 'Title', 'Sources', 'Hot', 'Deps', 'Gated', 'Size', 'Acceptance', 'Tests']
want = sys.argv[1].split(',')
show = sys.argv[2].split(',') if len(sys.argv) > 2 else ['Sources', 'Gated', 'Acceptance']
for wid in want:
    m = re.search(r'(?m)^\| ' + re.escape(wid) + r' \|.*$', text)
    if not m:
        print('no row', wid)
        continue
    cells = re.split(r'(?<!\\)\|', m.group(0))
    print('=' * 10, wid)
    for name in show:
        print('--', name, ':', cells[cols.index(name)].strip()[:3000])
