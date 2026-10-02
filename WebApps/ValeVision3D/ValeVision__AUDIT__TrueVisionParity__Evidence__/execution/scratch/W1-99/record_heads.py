"""W1-99: print the first fenced block (the Port Record header) of each W1 Port Record. Read-only.

Usage: python -B record_heads.py [W1-01 W1-02 ...]   (default: every W1-*.md)
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
EXEC = os.path.dirname(os.path.dirname(HERE))
PR = os.path.join(EXEC, 'port_records')
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ids = sys.argv[1:] or sorted(f[:-3] for f in os.listdir(PR) if f.startswith('W1-') and f.endswith('.md'))
for wid in ids:
    t = open(os.path.join(PR, wid + '.md'), encoding='utf-8', errors='replace').read()
    m = re.search(r'```[a-z]*\n(.*?)\n```', t, re.S)
    title = t.splitlines()[0] if t else ''
    print('=' * 100)
    print(wid, '|', title)
    print(m.group(1) if m else '(no fenced block)')
