"""Print selected lines (1-based) of a UTF-8 text file, wrapped for reading.

Usage: python grab_lines.py <file> <line> [<line> ...]   (a range a-b is accepted)
"""
import sys, io, textwrap

path = sys.argv[1]
want = []
for a in sys.argv[2:]:
    if '-' in a:
        lo, hi = a.split('-')
        want.extend(range(int(lo), int(hi) + 1))
    else:
        want.append(int(a))
lines = io.open(path, encoding='utf-8', errors='replace').read().split('\n')
out = io.StringIO()
for n in want:
    if 1 <= n <= len(lines):
        out.write('--- line %d ---\n' % n)
        out.write(textwrap.fill(lines[n - 1], 200) + '\n')
sys.stdout.buffer.write(out.getvalue().encode('utf-8'))
