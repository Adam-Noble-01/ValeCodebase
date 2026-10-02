"""W1-99: print the '## ' sections of W1 Port Records whose heading matches a pattern. Read-only.

Usage: python -B record_sections.py "<regex>" [W1-01 W1-02 ...]
Also lists every '## ' heading of each record (so nothing is missed).
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
EXEC = os.path.dirname(os.path.dirname(HERE))
PR = os.path.join(EXEC, 'port_records')
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

pat = re.compile(sys.argv[1], re.I)
ids = sys.argv[2:] or sorted(f[:-3] for f in os.listdir(PR) if f.startswith('W1-') and f.endswith('.md'))
for wid in ids:
    t = open(os.path.join(PR, wid + '.md'), encoding='utf-8', errors='replace').read()
    parts = re.split(r'(?m)^(## .*)$', t)
    heads = [parts[i] for i in range(1, len(parts), 2)]
    print('=' * 100)
    print(wid, 'headings:', ' | '.join(h[3:] for h in heads))
    for i in range(1, len(parts), 2):
        if pat.search(parts[i]):
            print('-' * 60)
            print(parts[i])
            print(parts[i + 1].rstrip())
