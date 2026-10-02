"""W1-99 (continuation) - read-only: print chosen columns of chosen Module Register rows (by path substring), from the
live ledger or from the candidate (--cand). Usage: python -B show_cells_c2.py [--cand] <col,col> <substring> ..."""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'W0-99'))
import ledger_lib as L                                  # noqa: E402

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
args = sys.argv[1:]
path = L.LEDGER
if args and args[0] == '--cand':
    path = os.path.join(HERE, 'ledger__candidate.md')
    args = args[1:]
cols = [int(x) for x in args[0].split(',')]
subs = args[1:]
for r in L.register_rows(L.read_lines(path)):
    key = r['cells'][0] + ' ' + r['cells'][1]
    if any(s in key for s in subs):
        print('== [%s] %s' % (r['sub'], (r['cells'][0] if not r['cells'][0].startswith('-') else r['cells'][1])))
        for c in cols:
            print('   %2d: %s' % (c, r['cells'][c]))
