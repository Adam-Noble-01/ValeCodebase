"""W1 integrator gate - step 2: every file changed in the repo since the baseline belongs to some package's Port Record.

git status --porcelain=v1 --untracked-files=all at D:/10_CoreLib__ValeCodebase, minus the exact baseline lines
(execution/baseline_dirty__01-Oct-2026.txt) and the orchestrator's records (ValeVision__AUDIT__TrueVisionParity__*,
ValeVision__WORKING_MEMORY__TrueVisionParity__*). Each remaining path is classified against the W0 checkpoint
(execution/checkpoints/W0__20261001-2225__files.txt) and its mtime (after the checkpoint = touched during W1), and
attributed to the Port Records that name it: strict = inside a record's files part; loose = anywhere in the record
(full repo path, app-relative path, or basename). Read-only. Writes scratch/W1-GATE/crosscheck.json + crosscheck.txt.
"""
import datetime, json, os, re, subprocess, sys

VCB = r'D:\10_CoreLib__ValeCodebase'
EXEC = os.path.join(VCB, r'WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution')
OUT = os.path.join(EXEC, 'scratch', 'W1-GATE')
BASE = os.path.join(EXEC, 'baseline_dirty__01-Oct-2026.txt')
W0CP = os.path.join(EXEC, 'checkpoints', 'W0__20261001-2225__files.txt')
CP_TIME = datetime.datetime(2026, 10, 1, 22, 25, 19).timestamp()
PR = os.path.join(EXEC, 'port_records')
EXCLUDE_PREFIX = ('WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__', 'WebApps/ValeVision3D/ValeVision__WORKING_MEMORY__TrueVisionParity__')

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

baseline_lines = set(l.rstrip('\n') for l in open(BASE, encoding='utf-8') if l.strip())
baseline_paths = set(l[3:].split(' -> ')[-1].strip('"') for l in baseline_lines)
w0_paths = {}
for l in open(W0CP, encoding='utf-8'):
    l = l.rstrip('\n')
    if l.strip():
        w0_paths[l[3:]] = l[:2]
st = subprocess.run(['git', '-C', VCB, 'status', '--porcelain=v1', '--untracked-files=all'], capture_output=True, text=True, encoding='utf-8').stdout.splitlines()


def files_parts(text):
    """The lines of a Port Record that list its changed files (header Files: block + 'files changed' sections)."""
    lines = text.split('\n')
    parts = []
    in_files = False
    for ln in lines[:500]:
        if re.match(r'^\s*Files( changed)?\s*(\(|:)', ln):
            in_files = True
            parts.append(ln)
            continue
        if in_files:
            if re.match(r'^\s*(Not ported|Tests|New or renamed|SHARED SERVICE WORKER|Transport touched|Hot files)', ln) or ln.startswith('```'):
                in_files = False
                continue
            parts.append(ln)
    i = 0
    while i < len(lines):
        m = re.match(r'^(#+)\s+(.*)$', lines[i])
        if m and re.search(r'\bfiles?\b', m.group(2), re.I) and re.search(r'chang|written|touched|landed|created|edited|new|^\d*\.?\s*files', m.group(2), re.I):
            level = len(m.group(1))
            j = i + 1
            while j < len(lines):
                m2 = re.match(r'^(#+)\s+', lines[j])
                if m2 and len(m2.group(1)) <= level:
                    break
                j += 1
            parts.extend(lines[i:j])
            i = j
            continue
        i += 1
    return '\n'.join(parts)


records, strict = {}, {}
for fn in sorted(os.listdir(PR)):
    if fn.endswith('.md'):
        t = open(os.path.join(PR, fn), encoding='utf-8', errors='replace').read().replace('\\', '/')
        records[fn[:-3]] = t
        strict[fn[:-3]] = files_parts(t)

rows = []
for line in st:
    if line in baseline_lines:
        continue
    code, path = line[:2], line[3:]
    old = None
    if ' -> ' in path:
        old, path = path.split(' -> ', 1)
        old = old.strip('"')
    path = path.strip('"')
    if path.startswith(EXCLUDE_PREFIX):
        continue
    full = os.path.join(VCB, *path.split('/'))
    mtime = os.path.getmtime(full) if os.path.exists(full) else None
    app_rel = None
    for root in ('WebApps/ValeVision3D/', 'WebApps/Whitecardopedia/'):
        if path.startswith(root):
            app_rel = path[len(root):]
    base = path.rsplit('/', 1)[-1]
    tail2 = '/'.join(path.split('/')[-2:])
    loose, strict_owners = [], []
    for rid, txt in records.items():
        if path in txt or (app_rel and app_rel in txt) or base in txt:
            loose.append(rid)
        s = strict[rid]
        if path in s or (app_rel and app_rel in s) or tail2 in s or base in s:
            strict_owners.append(rid)
    in_w0 = path in w0_paths
    touched_w1 = (mtime is not None and mtime > CP_TIME) or (mtime is None and not in_w0)
    rows.append({
        'code': code, 'path': path, 'old': old, 'in_baseline_by_path': path in baseline_paths,
        'in_w0_checkpoint': in_w0, 'w0_code': w0_paths.get(path), 'mtime': datetime.datetime.fromtimestamp(mtime).strftime('%d-%b %H:%M:%S') if mtime else None,
        'touched_in_w1': touched_w1, 'loose': loose, 'strict': strict_owners,
        'w1_strict': [r for r in strict_owners if r.startswith('W1-')], 'w1_loose': [r for r in loose if r.startswith('W1-')],
    })

with open(os.path.join(OUT, 'crosscheck.json'), 'w', encoding='utf-8', newline='\n') as fh:
    json.dump(rows, fh, indent=1, ensure_ascii=False)

by_code = {}
for r in rows:
    by_code[r['code']] = by_code.get(r['code'], 0) + 1
w1 = [r for r in rows if r['touched_in_w1']]
w0_only = [r for r in rows if not r['touched_in_w1']]
w1_new = [r for r in w1 if not r['in_w0_checkpoint']]
w1_again = [r for r in w1 if r['in_w0_checkpoint']]
w1_none = [r for r in w1 if not r['w1_strict']]
w1_none_loose = [r for r in w1_none if not r['w1_loose']]
w0_gone = [p for p in w0_paths if p not in set(r['path'] for r in rows)]
lines = []
lines.append('changed since baseline (records excluded): %d  by status code: %s' % (len(rows), json.dumps(by_code, sort_keys=True)))
lines.append('in the W0 checkpoint list and untouched since 22:25:19: %d; touched in W1: %d (new since W0: %d, W0 paths written again: %d)' % (len(w0_only), len(w1), len(w1_new), len(w1_again)))
lines.append('W0 checkpoint paths no longer in git status: %d %s' % (len(w0_gone), w0_gone[:10]))
lines.append('W1-touched paths with a strict W1 owner: %d; loose W1 mention only: %d; no W1 record at all: %d' % (len(w1) - len(w1_none), len(w1_none) - len(w1_none_loose), len(w1_none_loose)))
lines.append('')
lines.append('== W1-TOUCHED, NO STRICT W1 OWNER ==')
for r in w1_none:
    lines.append('%s %s  mtime %s  loose W1: %s  any strict: %s' % (r['code'], r['path'], r['mtime'], ','.join(r['w1_loose']) or '-', ','.join(r['strict']) or '-'))
lines.append('')
lines.append('== W1-TOUCHED, MORE THAN ONE STRICT W1 OWNER ==')
for r in w1:
    if len(r['w1_strict']) > 1:
        lines.append('%s %s  <- %s' % (r['code'], r['path'], ','.join(r['w1_strict'])))
lines.append('')
lines.append('== ALL W1-TOUCHED (code path mtime <- strict W1 owners) ==')
for r in w1:
    lines.append('%s %s  %s  <- %s%s' % (r['code'], r['path'], r['mtime'], ','.join(r['w1_strict']) or '-', '' if r['in_w0_checkpoint'] else '  [new since W0]'))
lines.append('')
lines.append('== W0 PATHS UNTOUCHED IN W1, WITH NO STRICT OWNER AT ALL ==')
for r in w0_only:
    if not r['strict']:
        lines.append('%s %s  loose: %s' % (r['code'], r['path'], ','.join(r['loose']) or '-'))
open(os.path.join(OUT, 'crosscheck.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
print('\n'.join(lines[:5]))
