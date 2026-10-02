"""Print a slice of Section F between two heading prefixes; table rows are split into cells (inspection only).
Usage: python show_section.py "<start prefix>" "<end prefix>" [max chars per cell]"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MD = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'R6__F_SwarmDelegationPlan.md')
start, end = sys.argv[1], sys.argv[2]
cap = int(sys.argv[3]) if len(sys.argv) > 3 else 1200
on = False
for line in open(MD, encoding='utf-8').read().split('\n'):
    if line.startswith(start):
        on = True
    elif on and line.startswith(end):
        break
    if not on:
        continue
    if line.startswith('| ') and not line.startswith('|---'):
        cells = [c.strip() for c in re.split(r'(?<!\\)\|', line)[1:-1]]
        print('ROW:')
        for i, c in enumerate(cells):
            print('   [%d] %s' % (i, c[:cap]))
    else:
        print(line[:cap])
