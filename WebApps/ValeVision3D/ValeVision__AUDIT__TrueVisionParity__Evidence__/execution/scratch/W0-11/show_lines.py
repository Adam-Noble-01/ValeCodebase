import sys

# usage: show_lines.py <file> <line> [<line> ...]   (1-based line numbers; prints the full lines)
path = sys.argv[1]
want = [int(x) for x in sys.argv[2:]]
with open(path, 'rb') as f:
    lines = f.read().decode('utf-8', errors='replace').splitlines()
for n in want:
    if 1 <= n <= len(lines):
        print(f'--- {n} ---')
        print(lines[n - 1])
