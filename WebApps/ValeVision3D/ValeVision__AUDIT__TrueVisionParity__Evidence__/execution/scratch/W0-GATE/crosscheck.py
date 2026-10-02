"""W0 integrator gate - step 2: every file changed in the repo since the baseline belongs to some package's Port Record.

git status --porcelain=v1 --untracked-files=all at D:/10_CoreLib__ValeCodebase, minus the exact baseline lines
(execution/baseline_dirty__01-Oct-2026.txt) and the orchestrator's records (ValeVision__AUDIT__TrueVisionParity__*,
ValeVision__WORKING_MEMORY__TrueVisionParity__*). For each remaining path: which Port Records name it (by repo-relative
path tail, app-relative path or, failing those, basename). Read-only. Writes scratch/W0-GATE/crosscheck.json + .txt.
"""
import json, os, re, subprocess, sys

VCB = r'D:\10_CoreLib__ValeCodebase'
EXEC = os.path.join(VCB, r'WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution')
OUT = os.path.join(EXEC, 'scratch', 'W0-GATE')
BASE = os.path.join(EXEC, 'baseline_dirty__01-Oct-2026.txt')
PR = os.path.join(EXEC, 'port_records')
EXCLUDE_PREFIX = ('WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__', 'WebApps/ValeVision3D/ValeVision__WORKING_MEMORY__TrueVisionParity__')

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

baseline = set(l.rstrip('\n') for l in open(BASE, encoding='utf-8') if l.strip())
st = subprocess.run(['git', '-C', VCB, 'status', '--porcelain=v1', '--untracked-files=all'], capture_output=True, text=True, encoding='utf-8').stdout.splitlines()

records = {}
for fn in sorted(os.listdir(PR)):
    if fn.endswith('.md'):
        records[fn[:-3]] = open(os.path.join(PR, fn), encoding='utf-8', errors='replace').read().replace('\\', '/')

rows = []
for line in st:
    if line in baseline:
        continue
    code, path = line[:2], line[3:]
    old = None
    if ' -> ' in path:
        old, path = path.split(' -> ', 1)
        old = old.strip('"')
    path = path.strip('"')
    if path.startswith(EXCLUDE_PREFIX):
        continue
    # the forms a Port Record may use for this path
    app_rel = None
    for root in ('WebApps/ValeVision3D/', 'WebApps/Whitecardopedia/'):
        if path.startswith(root):
            app_rel = path[len(root):]
    base = path.rsplit('/', 1)[-1]
    hits_full, hits_app, hits_base = [], [], []
    for rid, txt in records.items():
        if path in txt:
            hits_full.append(rid)
        elif app_rel and app_rel in txt:
            hits_app.append(rid)
        elif base in txt:
            hits_base.append(rid)
    old_hits = []
    if old:
        ob = old.rsplit('/', 1)[-1]
        old_hits = [rid for rid, txt in records.items() if ob in txt]
    rows.append({'code': code, 'path': path, 'old': old, 'full': hits_full, 'app': hits_app, 'base': hits_base, 'old_base': old_hits})

with open(os.path.join(OUT, 'crosscheck.json'), 'w', encoding='utf-8', newline='\n') as fh:
    json.dump(rows, fh, indent=1, ensure_ascii=False)

none = [r for r in rows if not (r['full'] or r['app'] or r['base'] or r['old_base'])]
weak = [r for r in rows if not (r['full'] or r['app']) and (r['base'] or r['old_base'])]
by_code = {}
for r in rows:
    by_code[r['code']] = by_code.get(r['code'], 0) + 1
lines = []
lines.append('changed since baseline (records excluded): %d  by status code: %s' % (len(rows), json.dumps(by_code)))
lines.append('named by full or app-relative path: %d; by basename only: %d; by nobody: %d' % (len(rows) - len(none) - len(weak), len(weak), len(none)))
lines.append('')
lines.append('== NAMED BY NO PORT RECORD ==')
for r in none:
    lines.append('%s %s%s' % (r['code'], r['path'], (' (from ' + r['old'] + ')') if r['old'] else ''))
lines.append('')
lines.append('== BASENAME-ONLY MATCHES ==')
for r in weak:
    lines.append('%s %s%s  <- %s' % (r['code'], r['path'], (' (from ' + r['old'] + ')') if r['old'] else '', ','.join(sorted(set(r['base'] + r['old_base'])))))
lines.append('')
lines.append('== ALL (code path <- records) ==')
for r in rows:
    who = sorted(set(r['full'] + r['app'])) or sorted(set(r['base'] + r['old_base']))
    lines.append('%s %s%s  <- %s' % (r['code'], r['path'], (' (from ' + r['old'] + ')') if r['old'] else '', ','.join(who) or '-'))
open(os.path.join(OUT, 'crosscheck.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
print('\n'.join(lines[:3]))
print('unnamed:', len(none), ' basename-only:', len(weak))
