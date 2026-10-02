"""W0-99 incident: an accidental `git add -A` (a shell command substitution) staged the whole working tree.

Read-only analysis: what the index held BEFORE (from the last pre-incident snapshot, status_after_prep.txt, taken by
this package with git status --porcelain=v1 --untracked-files=all) against the gate's snapshots, so the restore can
rebuild exactly that index and nothing else.
"""
import collections, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
GATE = os.path.join(HERE, '..', 'W0-GATE')


def staged(path):
    rows = []
    for ln in open(path, encoding='utf-8'):
        ln = ln.rstrip('\n')
        if not ln:
            continue
        x, y, rest = ln[0], ln[1], ln[3:]
        if x not in (' ', '?', '!'):
            rows.append((x + y, rest))
    return rows


for name, p in [('gate status_final (21:34)', os.path.join(GATE, 'status_final.txt')),
                ('W0-99 status_start', os.path.join(HERE, 'status_start.txt')),
                ('W0-99 status_before_gates', os.path.join(HERE, 'status_before_gates.txt')),
                ('W0-99 status_after_prep (last before the incident)', os.path.join(HERE, 'status_after_prep.txt'))]:
    rows = staged(p)
    kinds = collections.Counter(c[0] for c, _ in rows)
    print('%-52s staged entries: %d %s' % (name, len(rows), dict(kinds)))

rows = staged(os.path.join(HERE, 'status_after_prep.txt'))
bad = [r for r in rows if r[0][0] != 'R']
print('non-rename staged entries before the incident:', bad[:10])
renames = []
for code, rest in rows:
    old, new = rest.split(' -> ', 1)
    renames.append((code, old.strip('"'), new.strip('"')))
print('renames:', len(renames), collections.Counter(c for c, _, _ in renames))
for r in renames[:3]:
    print('  ', r)
import json
json.dump(renames, open(os.path.join(HERE, 'index_incident__renames_before.json'), 'w', encoding='utf-8'), indent=1)
print('wrote index_incident__renames_before.json')
