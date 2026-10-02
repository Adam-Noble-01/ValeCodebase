"""W1-99: compare a fresh git status with the W1 gate's final snapshot. Read-only.

Usage: python -B status_diff.py <fresh_status.txt> [<baseline_status.txt>]
The baseline defaults to scratch/W1-GATE/status_final.txt. Lines are compared as sets (order-insensitive);
lines under execution/scratch/ are reported separately (scratch churn is expected).
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
EXEC = os.path.dirname(os.path.dirname(HERE))
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


def load(p):
    raw = open(p, 'rb').read()
    for enc in ('utf-8-sig', 'utf-16'):
        try:
            txt = raw.decode(enc)
            if '\x00' in txt:
                continue
            break
        except Exception:
            continue
    return set(l.rstrip('\r') for l in txt.split('\n') if l.strip())


fresh = load(sys.argv[1])
base = load(sys.argv[2] if len(sys.argv) > 2 else os.path.join(EXEC, 'scratch', 'W1-GATE', 'status_final.txt'))
SCR = 'execution/scratch/'
only_fresh = sorted(fresh - base)
only_base = sorted(base - fresh)
f_s = [l for l in only_fresh if SCR in l]
f_o = [l for l in only_fresh if SCR not in l]
b_s = [l for l in only_base if SCR in l]
b_o = [l for l in only_base if SCR not in l]
print('fresh %d lines, baseline %d lines' % (len(fresh), len(base)))
print('only in fresh (outside scratch): %d' % len(f_o))
for l in f_o:
    print('  + ' + l)
print('only in baseline (outside scratch): %d' % len(b_o))
for l in b_o:
    print('  - ' + l)
print('scratch-only differences: +%d / -%d' % (len(f_s), len(b_s)))
