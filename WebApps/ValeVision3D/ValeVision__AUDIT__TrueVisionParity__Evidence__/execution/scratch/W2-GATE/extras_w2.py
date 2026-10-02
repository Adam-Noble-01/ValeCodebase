"""W1 integrator gate (continuation) - read-only extra checks, each printed as its own section:
 A. syntax sweep over every W2-touched file: .js/.mjs/.cjs -> node --check; .py -> py_compile (bytecode to
    scratch); .json -> strict parse with a duplicate-key hook; .html -> every inline <script> block through node --check;
    line endings and BOM per file.
 B. release placeholders ({{VVREL...}}) in every dirty file of the programme (VV and WCP), the WCP Flask files and
    execution/prepared, by id; any outside the PortNotes verifier's scope.
 C. G6 transport rule: na-truevision-api, NaProjectPortal/, a /r2/ route, a TrueVision__ literal in
    02__Src__AppModules (node_modules skipped), 03__Style__AppStylesheets and index.html.
 D. ignored files (git status --ignored) under WebApps/ValeVision3D and WebApps/Whitecardopedia modified after the W1a
    checkpoint (node_modules, .claude, .wrangler skipped); files under WCP Projects/ modified after it.
 E. shared Vale infrastructure and WCP Flask files: git status / git diff HEAD --stat on WCP Tools__DevUtils,
    62__Feature__AppInstallability, CloudflareWorker; newest mtimes; server.py and the Server__ValeVision*.py blueprints'
    mtimes against the W1 checkpoint.
Usage: python -B extras_c2.py   (writes C2/extras_c2.txt; prints the same)"""
import datetime, json, os, py_compile, re, subprocess, sys

VCB = r'D:\10_CoreLib__ValeCodebase'
VVR = os.path.join(VCB, r'WebApps\ValeVision3D')
WCP = os.path.join(VCB, r'WebApps\Whitecardopedia')
EXEC = os.path.join(VVR, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\execution')
OUT = os.path.join(EXEC, 'scratch', 'W2-GATE')
CP_TIME = os.path.getmtime(os.path.join(EXEC, 'checkpoints', 'W1__20261002-1026__files.txt'))
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
rows = json.load(open(os.path.join(OUT, 'crosscheck_w2.json'), encoding='utf-8'))
L = []


def say(s=''):
    L.append(s)
    print(s, flush=True)


def ts(t):
    return datetime.datetime.fromtimestamp(t).strftime('%d-%b %H:%M:%S')


# ---------------------------------------------------------------- A
say('== A. syntax sweep (W2-touched files) ==')
tmp = os.path.join(OUT, 'syntax_tmp')
os.makedirs(tmp, exist_ok=True)
res = {'js': [0, []], 'py': [0, []], 'json': [0, []], 'html-inline': [0, []], 'other': [0, []]}
eol = {'LF': 0, 'CRLF': 0, 'mixed': [], 'bom': []}


def dup_hook(pairs):
    keys = [k for k, _ in pairs]
    if len(set(keys)) != len(keys):
        seen, dups = set(), []
        for k in keys:
            if k in seen:
                dups.append(k)
            seen.add(k)
        raise ValueError('duplicate keys: ' + ', '.join(dups[:5]))
    return dict(pairs)


for r in rows:
    if not r['touched_in_cont']:
        continue
    p = r['path']
    full = os.path.join(VCB, *p.split('/'))
    if not os.path.isfile(full):
        continue
    b = open(full, 'rb').read()
    crlf = b.count(b'\r\n')
    lf = b.count(b'\n') - crlf
    if crlf and lf:
        eol['mixed'].append('%s (CRLF %d / LF %d)' % (p, crlf, lf))
    elif crlf:
        eol['CRLF'] += 1
    else:
        eol['LF'] += 1
    if b.startswith(b'\xef\xbb\xbf'):
        eol['bom'].append(p)
    ext = os.path.splitext(p)[1].lower()
    if ext in ('.js', '.mjs', '.cjs'):
        res['js'][0] += 1
        q = subprocess.run(['node', '--check', full], capture_output=True, text=True)
        if q.returncode != 0:
            res['js'][1].append('%s: %s' % (p, (q.stderr or q.stdout).strip()[:400]))
    elif ext == '.py':
        res['py'][0] += 1
        try:
            py_compile.compile(full, cfile=os.path.join(tmp, os.path.basename(p) + 'c'), doraise=True)
        except Exception as e:
            res['py'][1].append('%s: %s' % (p, str(e)[:400]))
    elif ext == '.json':
        res['json'][0] += 1
        try:
            json.loads(b.decode('utf-8-sig'), object_pairs_hook=dup_hook)
        except Exception as e:
            res['json'][1].append('%s: %s' % (p, str(e)[:400]))
    elif ext == '.html':
        text = b.decode('utf-8')
        for i, m in enumerate(re.finditer(r'<script(\s[^>]*)?>(.*?)</script>', text, re.S)):
            attrs, body = m.group(1) or '', m.group(2)
            if 'src=' in attrs or not body.strip() or 'importmap' in attrs or 'application/json' in attrs:
                continue
            res['html-inline'][0] += 1
            fn = os.path.join(tmp, '%s__inline_%d.%s' % (os.path.basename(p), i, 'mjs' if 'module' in attrs else 'js'))
            open(fn, 'w', encoding='utf-8', newline='\n').write(body)
            q = subprocess.run(['node', '--check', fn], capture_output=True, text=True)
            if q.returncode != 0:
                res['html-inline'][1].append('%s block %d: %s' % (p, i, (q.stderr or q.stdout).strip()[:400]))
    else:
        res['other'][0] += 1
for k, (n, bad) in res.items():
    say('%-12s checked %3d  failures %d' % (k, n, len(bad)))
    for x in bad:
        say('    ' + x)
say('line endings: LF %d, CRLF %d, mixed %d %s; BOM %d %s' % (eol['LF'], eol['CRLF'], len(eol['mixed']), eol['mixed'], len(eol['bom']), eol['bom']))

# ---------------------------------------------------------------- B
say('')
say('== B. release placeholders (every dirty file of the programme, the WCP Flask files, execution/prepared) ==')
TOK = re.compile(r'\{\{VVREL[^}\n]*\}\}')
SCOPE = ('WebApps/ValeVision3D/02__Src__AppModules/', 'WebApps/ValeVision3D/03__Style__AppStylesheets/', 'WebApps/ValeVision3D/80__Testing__PrototypeEnvironment/')
per_id, in_scope, out_scope, files = {}, 0, [], set()


def scan(rel, full):
    global in_scope
    try:
        text = open(full, encoding='utf-8', errors='replace').read()
    except Exception:
        return
    for i, ln in enumerate(text.splitlines(), 1):
        for m in TOK.finditer(ln):
            tid = m.group(0)
            per_id[tid] = per_id.get(tid, 0) + 1
            files.add(rel)
            if rel.startswith(SCOPE) or rel == 'WebApps/ValeVision3D/index.html':
                in_scope += 1
            else:
                out_scope.append('%s:%d  %s' % (rel, i, ln.strip()[:170]))


for r in rows:
    p = r['path']
    full = os.path.join(VCB, *p.split('/'))
    if os.path.isfile(full) and not p.endswith(('.png', '.pyc', '.zip', '.ttf', '.pdf', '.webp', '.jpg', '.glb')):
        scan(p, full)
for fn in os.listdir(WCP):
    if fn == 'server.py' or (fn.startswith('Server__ValeVision') and fn.endswith('.py')):
        scan('WebApps/Whitecardopedia/' + fn, os.path.join(WCP, fn))
for root, _, fns in os.walk(os.path.join(EXEC, 'prepared')):
    for fn in fns:
        full = os.path.join(root, fn)
        scan(os.path.relpath(full, VCB).replace('\\', '/'), full)
say('placeholders: %d in %d file(s) (in the PortNotes verifier scope %d, outside it %d)' % (sum(per_id.values()), len(files), in_scope, len(out_scope)))
for k in sorted(per_id):
    say('  %-22s %d' % (k, per_id[k]))
say('outside the verifier scope:')
for x in out_scope:
    say('  ' + x)

# ---------------------------------------------------------------- C
say('')
say('== C. G6 transport rule ==')
PAT = re.compile(r'na-truevision-api|NaProjectPortal/|["\'`/]r2/|TrueVision__(?!PLAN)')
hits = []
roots = [os.path.join(VVR, '02__Src__AppModules'), os.path.join(VVR, '03__Style__AppStylesheets')]
nfiles = 0
for base in roots:
    for root, dirs, fns in os.walk(base):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.wrangler', '.claude')]
        for fn in fns:
            if not fn.endswith(('.js', '.mjs', '.cjs', '.json', '.css', '.html')):
                continue
            nfiles += 1
            fp = os.path.join(root, fn)
            text = open(fp, encoding='utf-8', errors='replace').read()
            for i, ln in enumerate(text.splitlines(), 1):
                if PAT.search(ln):
                    hits.append('%s:%d  %s' % (os.path.relpath(fp, VVR), i, ln.strip()[:160]))
fp = os.path.join(VVR, 'index.html')
for i, ln in enumerate(open(fp, encoding='utf-8', errors='replace').read().splitlines(), 1):
    if PAT.search(ln):
        hits.append('index.html:%d  %s' % (i, ln.strip()[:160]))
say('files scanned: %d (+ index.html); hits: %d' % (nfiles, len(hits)))
for h in hits[:60]:
    say('  ' + h)

# ---------------------------------------------------------------- D
say('')
say('== D. ignored by-products and project data since the W1 checkpoint (%s) ==' % ts(CP_TIME))
out = subprocess.run(['git', '-C', VCB, 'status', '--porcelain=v1', '--ignored', '--untracked-files=all', '--', 'WebApps/ValeVision3D', 'WebApps/Whitecardopedia'],
                     capture_output=True, text=True, encoding='utf-8').stdout.splitlines()
ign = [l[3:].strip('"') for l in out if l.startswith('!! ')]
skip = ('node_modules', '.claude', '.wrangler')
ihits = []
for p in ign:
    if any(('/' + s + '/') in ('/' + p) for s in skip):
        continue
    full = os.path.join(VCB, *p.rstrip('/').split('/'))
    if os.path.isdir(full):
        for root, dirs, fns in os.walk(full):
            dirs[:] = [d for d in dirs if d not in skip]
            for fn in fns:
                fp = os.path.join(root, fn)
                if os.path.getmtime(fp) > CP_TIME:
                    ihits.append(fp)
    elif os.path.isfile(full) and os.path.getmtime(full) > CP_TIME:
        ihits.append(full)
say('ignored entries: %d; ignored files modified after the W1 checkpoint: %d' % (len(ign), len(ihits)))
for h in ihits[:40]:
    say('  %s  %s' % (h, ts(os.path.getmtime(h))))
proj = os.path.join(WCP, 'Projects')
recent = []
for root, dirs, fns in os.walk(proj):
    for fn in fns:
        fp = os.path.join(root, fn)
        if os.path.getmtime(fp) > CP_TIME:
            recent.append(fp)
say('files under WCP Projects/ modified after the W1 checkpoint: %d' % len(recent))
for r in recent[:40]:
    say('  %s  %s' % (r, ts(os.path.getmtime(r))))

# ---------------------------------------------------------------- E
say('')
say('== E. shared Vale infrastructure (live) and WCP Flask files ==')
for rel in ('WebApps/Whitecardopedia/Tools__DevUtils', 'WebApps/Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability', 'WebApps/Whitecardopedia/CloudflareWorker/src'):
    st = subprocess.run(['git', '-C', VCB, 'status', '--porcelain=v1', '--untracked-files=all', '--', rel], capture_output=True, text=True, encoding='utf-8').stdout.splitlines()
    df = subprocess.run(['git', '-C', VCB, 'diff', 'HEAD', '--stat', '--', rel], capture_output=True, text=True, encoding='utf-8').stdout.strip()
    newest, newest_f = 0, ''
    full = os.path.join(VCB, *rel.split('/'))
    for root, dirs, fns in os.walk(full):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.wrangler')]
        for fn in fns:
            t = os.path.getmtime(os.path.join(root, fn))
            if t > newest:
                newest, newest_f = t, os.path.join(root, fn)
    say('%s: git status lines %d, git diff HEAD --stat %s; newest file %s (%s)' % (rel, len(st), repr(df) if df else "''", ts(newest) if newest else '-', os.path.relpath(newest_f, full) if newest_f else '-'))
    for l in st[:10]:
        say('    ' + l)
for fn in sorted(os.listdir(WCP)):
    if fn == 'server.py' or (fn.startswith('Server__ValeVision') and fn.endswith('.py')):
        t = os.path.getmtime(os.path.join(WCP, fn))
        say('  %-45s mtime %s  %s' % (fn, ts(t), 'AFTER the W1 checkpoint' if t > CP_TIME else 'before the W1 checkpoint'))
pyc = os.path.join(WCP, '__pycache__')
if os.path.isdir(pyc):
    for fn in sorted(os.listdir(pyc)):
        t = os.path.getmtime(os.path.join(pyc, fn))
        if t > CP_TIME:
            say('  __pycache__/%s  mtime %s  AFTER the W1 checkpoint' % (fn, ts(t)))
open(os.path.join(OUT, 'extras_w2.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(L) + '\n')
