"""W1 gate: syntax sweep over every file this wave touched (crosscheck.json, touched_in_w1).
.js/.mjs/.cjs -> node --check; .py -> py_compile with the bytecode written to scratch (never beside the source);
.json -> strict parse with a duplicate-key hook; .html -> every inline <script type="module"> / classic <script> block
through node --check (module blocks as .mjs). Also reports each file's line endings and BOM. Read-only on the tree."""
import json, os, re, subprocess, sys, py_compile

VCB = r'D:\10_CoreLib__ValeCodebase'
OUT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-GATE'
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
rows = [r for r in json.load(open(os.path.join(OUT, 'crosscheck.json'), encoding='utf-8')) if r['touched_in_w1']]
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
    print('%-12s checked %3d  failures %d' % (k, n, len(bad)))
    for x in bad:
        print('    ' + x)
print('line endings: LF %d, CRLF %d, mixed %d %s; BOM %d %s' % (eol['LF'], eol['CRLF'], len(eol['mixed']), eol['mixed'], len(eol['bom']), eol['bom']))
