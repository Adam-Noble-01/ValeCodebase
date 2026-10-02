"""W1 integrator gate, CONTINUATION (W1-07, W1-19..W1-22, W1-25..W1-28, W1-36..W1-38) - step 2 cross-check. Read-only.

1. git status --porcelain=v1 --untracked-files=all at D:/10_CoreLib__ValeCodebase, minus the exact baseline lines
   (execution/baseline_dirty__01-Oct-2026.txt) and the orchestrator's records (ValeVision__AUDIT__TrueVisionParity__*,
   ValeVision__WORKING_MEMORY__TrueVisionParity__*).
2. Each path is classified against the Wave 1 part 1 checkpoint (execution/checkpoints/W1__20261002-0331, written
   02-Oct 03:31:37) and its mtime: after the checkpoint = touched in the W2.
3. Paths untouched since the checkpoint must be byte-identical to it: tracked files - today's `git diff HEAD --binary -M`
   section equals the checkpoint patch's section (keyed by its 'diff --git' header); new files - equal to the zip copy.
4. Continuation-touched paths are attributed to the W2 Port Records (strict = in a record's files part;
   loose = anywhere in the record), hash-attested (live sha1 / sha256 prefix stated in a W2 record, or in a
   W2 package's scratch hash list), and checked against the packages' declared edits (wp_canonical.json).
5. Declared edits of the W2 packages that are not dirty-since-checkpoint are listed.
Writes C2/crosscheck_c2.json and C2/crosscheck_c2.txt.
"""
import datetime, hashlib, json, os, re, subprocess, sys, zipfile

VCB = r'D:\10_CoreLib__ValeCodebase'
EXEC = os.path.join(VCB, r'WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution')
OUT = os.path.join(EXEC, 'scratch', 'W2-GATE')
BASE = os.path.join(EXEC, 'baseline_dirty__01-Oct-2026.txt')
CP = os.path.join(EXEC, 'checkpoints', 'W1__20261002-1026')
CP_TIME = os.path.getmtime(CP + '__files.txt')
PR = os.path.join(EXEC, 'port_records')
SCR = os.path.join(EXEC, 'scratch')
DATA = os.path.join(EXEC, '..', 'parity', 'data')
EXCLUDE_PREFIX = ('WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__', 'WebApps/ValeVision3D/ValeVision__WORKING_MEMORY__TrueVisionParity__')
CONT = sorted(f[:-3] for f in os.listdir(os.path.join(EXEC, 'port_records')) if f.startswith('W2-') and f.endswith('.md'))

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


def git(*a, text=True):
    return subprocess.run(['git', '-C', VCB] + list(a), capture_output=True, text=text, **({'encoding': 'utf-8'} if text else {}))


baseline_lines = set(l.rstrip('\n') for l in open(BASE, encoding='utf-8') if l.strip())
cp_paths = {}
for l in open(CP + '__files.txt', encoding='utf-8'):
    l = l.rstrip('\n')
    if l.strip():
        cp_paths[l[3:]] = l[:2]
st = git('status', '--porcelain=v1', '--untracked-files=all').stdout.splitlines()


def files_parts(text):
    """The lines of a Port Record that list its changed files (header Files: block + 'files changed' sections)."""
    lines = text.split('\n')
    parts, in_files = [], False
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

# scratch hash lists of the W2 packages
hash_lists = {}
for d in CONT:
    root0 = os.path.join(SCR, d)
    if not os.path.isdir(root0):
        continue
    for root, _, files in os.walk(root0):
        for fn in files:
            low = fn.lower()
            if ('sha' in low or 'hash' in low or 'written' in low or 'manifest' in low or 'landed' in low) and low.endswith(('.txt', '.json', '.log')):
                fp = os.path.join(root, fn)
                if os.path.getsize(fp) < 3_000_000:
                    hash_lists.setdefault(d, []).append(open(fp, encoding='utf-8', errors='replace').read().lower())


def sections(blob):
    out = {}
    for p in re.split(rb'(?m)^(?=diff --git )', blob):
        if p.startswith(b'diff --git '):
            out[p.split(b'\n', 1)[0]] = p
    return out


cp_sec = sections(open(CP + '.patch', 'rb').read())
zf = zipfile.ZipFile(CP + '__new.zip')
znames = set(zf.namelist())

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
    in_cp = path in cp_paths
    touched = (mtime is not None and mtime > CP_TIME) or (mtime is None and not in_cp)
    rows.append({'code': code, 'path': path, 'old': old, 'in_w1a_checkpoint': in_cp, 'w1a_code': cp_paths.get(path),
                 'mtime': datetime.datetime.fromtimestamp(mtime).strftime('%d-%b %H:%M:%S') if mtime else None,
                 'touched_in_cont': touched, 'strict_cont': [r for r in strict_owners if r in CONT],
                 'loose_cont': [r for r in loose if r in CONT], 'strict_any': strict_owners})

# 3. untouched paths byte-identical to the W1 checkpoint
names = git('diff', 'HEAD', '--name-status', '-M').stdout.splitlines()
tracked_untouched = set(r['path'] for r in rows if not r['touched_in_cont'] and r['code'] != '??')
sides = set()
for n in names:
    parts = n.split('\t')
    if any(p in tracked_untouched for p in parts[1:]):
        sides.update(parts[1:])
now_sec = sections(git('diff', 'HEAD', '--binary', '-M', '--', *sorted(sides), text=False).stdout) if sides else {}
same, changed, notcmp = [], [], []
for r in rows:
    if r['touched_in_cont']:
        continue
    p = r['path']
    if p.endswith('.pyc') or '/__pycache__/' in p:
        notcmp.append((p, 'bytecode (checkpoint.py leaves .pyc out)'))
        continue
    if r['code'] == '??':
        if p not in znames:
            notcmp.append((p, 'not in the W1 zip'))
            continue
        live = open(os.path.join(VCB, *p.split('/')), 'rb').read()
        (same if live == zf.read(p) else changed).append(p)
    else:
        keys = [k for k in now_sec if (b' b/' + p.encode('utf-8')) in k]
        if not keys:
            notcmp.append((p, 'no current diff section'))
            continue
        k = keys[0]
        if k not in cp_sec:
            notcmp.append((p, 'header not in the W1 patch: ' + k.decode('utf-8', 'replace')[:140]))
            continue
        (same if now_sec[k] == cp_sec[k] else changed).append(p)

# 4. W2-touched: hash attestation, declared edits
recs_low = {rid: records[rid].lower() for rid in CONT if rid in records}
doc = json.load(open(os.path.join(DATA, 'wp_canonical.json'), encoding='utf-8'))


def norm(p):
    p = p.strip().split(' ')[0].replace('\\', '/')
    for a, b in (('VVM/', 'WebApps/ValeVision3D/02__Src__AppModules/'), ('LE/', 'WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/'),
                 ('VV/', 'WebApps/ValeVision3D/'), ('WCP/', 'WebApps/Whitecardopedia/'), ('VCB/', '')):
        if p.startswith(a):
            return b + p[len(a):]
    return p


declared, targets = {}, {}
for pk in doc['packages']:
    if pk['wp_id'] not in CONT:
        continue
    for e in pk.get('edits', []) + [h if isinstance(h, str) else h.get('path', '') for h in pk.get('hot_files', [])]:
        declared.setdefault(norm(e), set()).add(pk['wp_id'])
    for e in pk.get('vv_targets', []):
        targets.setdefault(norm(e), set()).add(pk['wp_id'])

for r in rows:
    if not r['touched_in_cont']:
        continue
    fp = os.path.join(VCB, *r['path'].split('/'))
    r['declared_by'] = sorted(declared.get(r['path'], []))
    r['target_of'] = sorted(targets.get(r['path'], []))
    if not os.path.isfile(fp):
        r['attest'] = 'MISSING'
        continue
    b = open(fp, 'rb').read()
    s1, s256 = hashlib.sha1(b).hexdigest(), hashlib.sha256(b).hexdigest()
    crlf = b.count(b'\r\n')
    lf = b.count(b'\n') - crlf
    r['sha1'], r['sha256'], r['size'] = s1[:12], s256[:16], len(b)
    r['eol'] = 'mixed' if (crlf and lf) else ('CRLF' if crlf else 'LF')
    r['bom'] = b.startswith(b'\xef\xbb\xbf')
    who = [rid for rid, t in recs_low.items() if s1[:8] in t or s256[:8] in t]
    if who:
        r['attest'] = 'record:' + ','.join(who)
        continue
    who = [d for d, ts in hash_lists.items() if any(s1[:12] in t or s256[:12] in t for t in ts)]
    gate_written = os.path.join(OUT, 'preimage', 'written.sha1')
    if not who and os.path.isfile(gate_written) and s1 in open(gate_written, encoding='utf-8').read():
        r['attest'] = 'gate:W2-GATE'
        continue
    r['attest'] = ('scratch:' + ','.join(who)) if who else 'NONE'

with open(os.path.join(OUT, 'crosscheck_w2.json'), 'w', encoding='utf-8', newline='\n') as fh:
    json.dump(rows, fh, indent=1, ensure_ascii=False)

by_code = {}
for r in rows:
    by_code[r['code']] = by_code.get(r['code'], 0) + 1
cont = [r for r in rows if r['touched_in_cont']]
untouched = [r for r in rows if not r['touched_in_cont']]
cont_new = [r for r in cont if not r['in_w1a_checkpoint']]
cont_again = [r for r in cont if r['in_w1a_checkpoint']]
no_strict = [r for r in cont if not r['strict_cont']]
no_owner = [r for r in no_strict if not r['loose_cont']]
cp_gone = [p for p in cp_paths if p not in set(r['path'] for r in rows)]
out_declared = [r for r in cont if not r['declared_by']]
att = {}
for r in cont:
    k = r.get('attest', '?').split(':')[0]
    att[k] = att.get(k, 0) + 1
L = []
L.append('W1 checkpoint: %s (mtime %s)' % (os.path.basename(CP), datetime.datetime.fromtimestamp(CP_TIME).strftime('%d-%b %H:%M:%S')))
L.append('changed since baseline (records excluded): %d  by status code: %s' % (len(rows), json.dumps(by_code, sort_keys=True)))
L.append('untouched since the W1 checkpoint: %d (byte-identical to it: %d; changed: %d; not comparable: %d)' % (len(untouched), len(same), len(changed), len(notcmp)))
L.append('touched in the W2: %d (new since W1: %d; W1 paths written again: %d)' % (len(cont), len(cont_new), len(cont_again)))
L.append('W1 checkpoint paths no longer dirty: %d %s' % (len(cp_gone), cp_gone[:10]))
L.append('W2-touched with a strict W2 owner: %d; loose mention only: %d; no W2 record at all: %d' % (len(cont) - len(no_strict), len(no_strict) - len(no_owner), len(no_owner)))
L.append('hash attestation of the W2-touched: %s' % json.dumps(att, sort_keys=True))
L.append('W2-touched outside every W2 edits/hot list: %d (new files %d, existing files %d)' % (len(out_declared), len([r for r in out_declared if r['code'] == '??']), len([r for r in out_declared if r['code'] != '??'])))
L.append('')
L.append('== UNTOUCHED SINCE W1 BUT CHANGED (defect) ==')
L.extend('  ' + p for p in changed)
L.append('== UNTOUCHED, NOT COMPARABLE ==')
L.extend('  %s  (%s)' % x for x in notcmp)
L.append('')
L.append('== CONTINUATION-TOUCHED, NO STRICT CONTINUATION OWNER ==')
for r in no_strict:
    L.append('  %s %s  mtime %s  loose: %s  any strict: %s' % (r['code'], r['path'], r['mtime'], ','.join(r['loose_cont']) or '-', ','.join(r['strict_any']) or '-'))
L.append('')
L.append('== CONTINUATION-TOUCHED, MORE THAN ONE STRICT CONTINUATION OWNER ==')
for r in cont:
    if len(r['strict_cont']) > 1:
        L.append('  %s %s  <- %s' % (r['code'], r['path'], ','.join(r['strict_cont'])))
L.append('')
L.append('== CONTINUATION-TOUCHED OUTSIDE EVERY CONTINUATION EDITS LIST ==')
for r in out_declared:
    L.append('  %s %s  vv_target of %s  strict: %s' % (r['code'], r['path'], ','.join(r['target_of']) or '-', ','.join(r['strict_cont']) or '-'))
L.append('')
L.append('== HASH NOT ATTESTED ==')
for r in cont:
    if r.get('attest') in ('NONE', 'MISSING'):
        L.append('  %s  %s  sha1 %s sha256 %s  owners %s' % (r['path'], r.get('attest'), r.get('sha1'), r.get('sha256'), ','.join(r['strict_cont']) or '-'))
L.append('')
L.append('== ALL CONTINUATION-TOUCHED (code path mtime eol sha1 <- strict owners | attest | declared) ==')
for r in cont:
    L.append('  %s %s  %s  %s%s  %s  <- %s | %s | %s%s' % (r['code'], r['path'], r['mtime'], r.get('eol'), ' BOM' if r.get('bom') else '', r.get('sha1'),
             ','.join(r['strict_cont']) or '-', r.get('attest'), ','.join(r['declared_by']) or '-', '' if r['in_w1a_checkpoint'] else '  [new since W1]'))
L.append('')
L.append('== DECLARED EDITS OF CONTINUATION PACKAGES NOT DIRTY-SINCE-W1 ==')
touched_set = set(r['path'] for r in cont)
for path, pks in sorted(declared.items()):
    if path not in touched_set:
        full = os.path.join(VCB, *path.split('/'))
        L.append('  %s  <- %s  (%s)' % (path, ','.join(sorted(pks)), 'exists' if os.path.exists(full) else 'ABSENT'))
open(os.path.join(OUT, 'crosscheck_w2.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(L) + '\n')
print('\n'.join(L[:9]))
