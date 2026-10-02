"""Print, for each changed path with more than one strict owner (or a path given on the command line), the lines of each
owner's Port Record files part that name it - to tell a real edit from a mention. Read-only."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
EXEC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution'
OUT = os.path.join(EXEC, 'scratch', 'W0-GATE')
PR = os.path.join(EXEC, 'port_records')
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
import importlib.util
spec = importlib.util.spec_from_file_location('cs', os.path.join(OUT, 'crosscheck_strict.py'))
rows = json.load(open(os.path.join(OUT, 'crosscheck_strict.json'), encoding='utf-8'))
want = sys.argv[1:]
src = {fn[:-3]: open(os.path.join(PR, fn), encoding='utf-8', errors='replace').read().replace('\\', '/') for fn in os.listdir(PR) if fn.endswith('.md')}
for r in rows:
    path = r['path']
    if want:
        if not any(w in path for w in want):
            continue
    elif len(r['strict']) < 2:
        continue
    base = path.rsplit('/', 1)[-1]
    print('=' * 100)
    print(r['code'], path, '<-', ','.join(r['strict']))
    for rid in (r['strict'] or sorted(set(r['full'] + r['app'] + r['base']))):
        for i, ln in enumerate(src[rid].split('\n'), 1):
            if base in ln:
                print('   %s:%d  %s' % (rid, i, ln.strip()[:260]))
