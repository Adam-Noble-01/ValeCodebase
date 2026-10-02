"""Scratch (W0-02): syntax-check every file W0-02 changed or moved.

The changed set is `git diff HEAD -M --name-status -- WebApps/ValeVision3D` (new paths), excluding the
orchestrator's untracked records. .js/.mjs/.cjs -> `node --check`; .json -> json.loads; .css/.html are
listed (covered by the path gate and the module-graph harness).
"""
import json, os, subprocess, sys

VCB = r'D:\10_CoreLib__ValeCodebase'
r = subprocess.run(['git', '-C', VCB, 'diff', 'HEAD', '-M', '--name-status', '--', 'WebApps/ValeVision3D'],
                   capture_output=True, text=True, encoding='utf-8')
paths = []
for line in r.stdout.splitlines():
    parts = line.split('\t')
    if not parts or not parts[0]:
        continue
    status = parts[0]
    newp = parts[-1]
    paths.append((status, newp))
counts = {'js': 0, 'json': 0, 'other': 0}
fails = []
for status, p in paths:
    full = os.path.join(VCB, p.replace('/', os.sep))
    ext = os.path.splitext(p)[1].lower()
    if ext in ('.js', '.mjs', '.cjs'):
        counts['js'] += 1
        c = subprocess.run(['node', '--check', full], capture_output=True, text=True)
        if c.returncode:
            fails.append('node --check %s: %s' % (p, c.stderr.strip()[:300]))
    elif ext == '.json':
        counts['json'] += 1
        try:
            json.loads(open(full, 'rb').read().decode('utf-8-sig'))
        except Exception as e:
            fails.append('json %s: %s' % (p, e))
    else:
        counts['other'] += 1
        print('  (not syntax-checked here) %s %s' % (status, p))
print('changed paths: %d  js checked: %d  json parsed: %d  other: %d' % (len(paths), counts['js'], counts['json'], counts['other']))
for f in fails:
    print('FAIL ' + f)
print('RESULT: %s' % ('PASS' if not fails else 'FAIL'))
sys.exit(1 if fails else 0)
