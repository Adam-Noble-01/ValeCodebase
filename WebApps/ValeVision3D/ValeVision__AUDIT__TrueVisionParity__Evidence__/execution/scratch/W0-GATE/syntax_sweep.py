"""W0 gate: syntax sweep over every file this wave changed or created.
.js/.mjs/.cjs -> node --check; .py -> py_compile with the bytecode written to scratch (never beside the source);
.json -> json.loads (strict, duplicate keys reported). index.html -> its inline <script type="module"> blocks via node --check.
Read-only on the tree."""
import json, os, re, subprocess, sys, py_compile, tempfile
VCB = r'D:\10_CoreLib__ValeCodebase'
OUT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W0-GATE'
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
rows = json.load(open(os.path.join(OUT, 'crosscheck.json'), encoding='utf-8'))
tmp = os.path.join(OUT, 'syntax_tmp')
os.makedirs(tmp, exist_ok=True)
res = {'js': [0, []], 'py': [0, []], 'json': [0, []], 'html-inline': [0, []]}

def dup_hook(pairs):
    keys = [k for k, _ in pairs]
    d = {}
    for k, v in pairs:
        d[k] = v
    if len(set(keys)) != len(keys):
        seen, dups = set(), []
        for k in keys:
            if k in seen:
                dups.append(k)
            seen.add(k)
        raise ValueError('duplicate keys: ' + ', '.join(dups[:5]))
    return d

for r in rows:
    p = r['path']
    full = os.path.join(VCB, *p.split('/'))
    if not os.path.isfile(full) or '04__Lib__ThirdParty' in p:
        continue
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
            json.loads(open(full, encoding='utf-8-sig').read(), object_pairs_hook=dup_hook)
        except Exception as e:
            res['json'][1].append('%s: %s' % (p, str(e)[:400]))
    elif p.endswith('index.html'):
        text = open(full, encoding='utf-8').read()
        blocks = re.findall(r'<script\s+type="module"[^>]*>(.*?)</script>', text, re.S)
        for i, b in enumerate(blocks):
            res['html-inline'][0] += 1
            fn = os.path.join(tmp, 'index_inline_%d.mjs' % i)
            open(fn, 'w', encoding='utf-8', newline='\n').write(b)
            q = subprocess.run(['node', '--check', fn], capture_output=True, text=True)
            if q.returncode != 0:
                res['html-inline'][1].append('%s block %d: %s' % (p, i, (q.stderr or q.stdout).strip()[:400]))
for k, (n, bad) in res.items():
    print('%-12s checked %3d  failures %d' % (k, n, len(bad)))
    for b in bad:
        print('    ' + b)
