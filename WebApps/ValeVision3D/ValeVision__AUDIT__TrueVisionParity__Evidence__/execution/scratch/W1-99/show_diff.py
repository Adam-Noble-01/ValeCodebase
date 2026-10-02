"""W1-99: a unified diff of a live record against its candidate (read-only), optionally only lines matching a filter.

Usage: python -B show_diff.py <live> <candidate> [--max N] [--only-added] [--grep TEXT]
"""
import difflib, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
live, cand = sys.argv[1], sys.argv[2]
args = sys.argv[3:]
mx = int(args[args.index('--max') + 1]) if '--max' in args else 100000
only_added = '--only-added' in args
grep = args[args.index('--grep') + 1] if '--grep' in args else None
a = open(live, encoding='utf-8', errors='replace').read().splitlines()
b = open(cand, encoding='utf-8', errors='replace').read().splitlines()
n = 0
for ln in difflib.unified_diff(a, b, 'live', 'candidate', n=0, lineterm=''):
    if only_added and not ln.startswith('+'):
        continue
    if grep and grep not in ln:
        continue
    print(ln[:2000])
    n += 1
    if n >= mx:
        break
