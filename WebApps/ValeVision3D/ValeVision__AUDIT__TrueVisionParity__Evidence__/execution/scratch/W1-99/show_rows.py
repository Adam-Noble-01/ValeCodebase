"""W1-99: print the candidate ledger's table rows whose text contains any of the given substrings. Read-only.
Usage: python -B show_rows.py <file> <substring> ...
"""
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
path = sys.argv[1]
subs = sys.argv[2:]
for n, ln in enumerate(open(path, encoding='utf-8').read().splitlines(), 1):
    if ln.startswith('| ') and any(s in ln for s in subs):
        print('%d: %s\n' % (n, ln))
