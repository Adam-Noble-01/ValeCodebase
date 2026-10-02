"""W1-99: lint the Port Record - ASCII only, no release placeholder, no tab, no trailing space; table rows keep their
header's column count. Read-only."""
import os, sys

P = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'port_records', 'W1-99.md')
b = open(P, 'rb').read()
bad = []
try:
    b.decode('ascii')
except UnicodeDecodeError as e:
    bad.append('non-ASCII byte at %d' % e.start)
if b'{{VVREL' in b or b'VVREL:' in b:
    bad.append('placeholder text present')
lines = b.decode('ascii', 'replace').split('\n')
cols = None
for n, ln in enumerate(lines, 1):
    s = ln.rstrip('\r')
    if '\t' in s:
        bad.append('tab at line %d' % n)
    if s != s.rstrip():
        bad.append('trailing space at line %d' % n)
    if s.startswith('|'):
        c = s.count(' | ') + 1 if not s.startswith('|---') else s.count('|') - 1
        if cols is None:
            cols = c
        elif c != cols:
            bad.append('line %d has %d cells, header %d' % (n, c, cols))
    else:
        cols = None
print('%s: %d bytes, %d lines, CRLF %d; %s' % (os.path.basename(P), len(b), len(lines), b.count(b'\r\n'),
                                            'OK' if not bad else 'PROBLEMS: ' + '; '.join(bad)))
sys.exit(1 if bad else 0)
