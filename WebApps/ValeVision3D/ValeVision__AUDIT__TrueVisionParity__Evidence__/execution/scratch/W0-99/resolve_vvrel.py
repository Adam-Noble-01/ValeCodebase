"""W0-99 Parity Scribe - resolve this wave's release placeholders.

Replaces every {{VVREL:W0-NN}} in VV 02__Src__AppModules, 03__Style__AppStylesheets,
80__Testing__PrototypeEnvironment and index.html with exactly 'v2.71.1' (the PortNotes fingerprint
blanks both forms to '#', so no file leaves the 01-Oct-2026 baseline).

Byte-level: only the token bytes change; line endings, BOMs and every other byte are kept. Each file's
SHA-1 is recorded when the plan is built and re-checked immediately before its write (compare and swap);
pre-images go to scratch/W0-99/preimage/ with a manifest. Placeholders outside that scope (the WCP Flask
files, the VV vendor README) and the rule quotations in the AUDIT report and the PLAN are never touched.

Usage:
  python -B resolve_vvrel.py --dry-run      plan only, nothing written
  python -B resolve_vvrel.py --apply        write pre-images, then the files
  python -B resolve_vvrel.py --check        prove no in-scope placeholder remains and every changed file
                                            differs from its pre-image only at the token positions
  python -B resolve_vvrel.py --restore      put the pre-images back (refuses if a file changed since)
"""
import hashlib, json, os, re, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

VERSION = b'v2.71.1'
WAVE_IDS = {'W0-%02d' % i for i in range(1, 20)}
VCB = r'D:\10_CoreLib__ValeCodebase'
VV = os.path.join(VCB, 'WebApps', 'ValeVision3D')
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, 'preimage')
MANIFEST = os.path.join(HERE, 'preimage_manifest.json')
SCOPE_DIRS = ['02__Src__AppModules', '03__Style__AppStylesheets', '80__Testing__PrototypeEnvironment']
SKIP_DIRS = {'.claude', 'node_modules', '.git', '__pycache__'}
TOKEN_ANY = re.compile(rb'\{\{VVREL[^}\n]*\}\}')
TOKEN_OK = re.compile(rb'\{\{VVREL:(W0-\d\d)\}\}')


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def candidates():
    for d in SCOPE_DIRS:
        for dp, dn, fn in os.walk(os.path.join(VV, d)):
            dn[:] = [x for x in dn if x not in SKIP_DIRS]
            for f in fn:
                yield os.path.join(dp, f)
    yield os.path.join(VV, 'index.html')


def rel(p):
    return os.path.relpath(p, VV).replace(os.sep, '/')


def plan():
    rows = []
    for p in candidates():
        try:
            b = open(p, 'rb').read()
        except Exception:
            continue
        if b'{{VVREL' not in b:
            continue
        toks = list(TOKEN_ANY.finditer(b))
        bad = [t.group(0) for t in toks if not TOKEN_OK.fullmatch(t.group(0)) or
               TOKEN_OK.fullmatch(t.group(0)).group(1).decode() not in WAVE_IDS]
        if bad:
            raise SystemExit('REFUSED: %s holds a placeholder that is not a W0 package id: %r' % (rel(p), bad))
        new = TOKEN_OK.sub(VERSION, b)
        rows.append({'rel': rel(p), 'path': p, 'sha1_before': sha1(b), 'sha1_after': sha1(new),
                     'tokens': [t.group(0).decode() for t in toks], 'size_before': len(b), 'size_after': len(new)})
    return rows


def same_except_tokens(old, new):
    """True when `new` equals `old` with each well-formed W0 token replaced by VERSION, and nothing else."""
    return TOKEN_OK.sub(VERSION, old) == new


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--dry-run'
    if mode in ('--dry-run', '--apply'):
        rows = plan()
        n = sum(len(r['tokens']) for r in rows)
        print('%d placeholder(s) in %d file(s) -> %s' % (n, len(rows), VERSION.decode()))
        for r in rows:
            print('  %-110s %d  %s -> %s' % (r['rel'], len(r['tokens']), r['sha1_before'][:8], r['sha1_after'][:8]))
        if mode == '--dry-run':
            return
        if os.path.exists(MANIFEST):
            raise SystemExit('REFUSED: a manifest already exists (%s); run --restore or --check first' % MANIFEST)
        # pre-images first, all of them, before any write
        for r in rows:
            dst = os.path.join(PRE, *r['rel'].split('/'))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, 'wb') as fh:
                fh.write(open(r['path'], 'rb').read())
            if sha1(open(dst, 'rb').read()) != r['sha1_before']:
                raise SystemExit('REFUSED: pre-image of %s does not match its planned SHA-1' % r['rel'])
        with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as fh:
            json.dump([{k: v for k, v in r.items() if k != 'path'} for r in rows], fh, indent=1)
        written = 0
        for r in rows:
            cur = open(r['path'], 'rb').read()
            if sha1(cur) != r['sha1_before']:
                raise SystemExit('STOPPED: %s changed since the plan was built (%s != %s); %d file(s) written so far - '
                                 'run --restore' % (r['rel'], sha1(cur)[:8], r['sha1_before'][:8], written))
            new = TOKEN_OK.sub(VERSION, cur)
            tmp = r['path'] + '.w0-99.tmp'
            with open(tmp, 'wb') as fh:
                fh.write(new)
            os.replace(tmp, r['path'])
            if sha1(open(r['path'], 'rb').read()) != r['sha1_after']:
                raise SystemExit('STOPPED: %s did not read back as planned' % r['rel'])
            written += 1
        print('written: %d file(s)' % written)
        return
    if mode == '--check':
        rows = json.load(open(MANIFEST, encoding='utf-8'))
        ok = True
        for r in rows:
            p = os.path.join(VV, *r['rel'].split('/'))
            cur = open(p, 'rb').read()
            old = open(os.path.join(PRE, *r['rel'].split('/')), 'rb').read()
            good = sha1(cur) == r['sha1_after'] and same_except_tokens(old, cur) and b'{{VVREL' not in cur
            # line endings unchanged
            good = good and old.count(b'\r\n') == cur.count(b'\r\n') and old.count(b'\n') == cur.count(b'\n')
            print('  %s %s' % ('OK  ' if good else 'FAIL', r['rel']))
            ok = ok and good
        left = []
        for p in candidates():
            try:
                b = open(p, 'rb').read()
            except Exception:
                continue
            for m in TOKEN_ANY.finditer(b):
                left.append('%s: %s' % (rel(p), m.group(0).decode()))
        print('in-scope placeholders left: %d' % len(left))
        for x in left:
            print('  ' + x)
        print('CHECK', 'PASS' if ok and not left else 'FAIL')
        sys.exit(0 if ok and not left else 1)
    if mode == '--restore':
        rows = json.load(open(MANIFEST, encoding='utf-8'))
        for r in rows:
            p = os.path.join(VV, *r['rel'].split('/'))
            cur = open(p, 'rb').read()
            if sha1(cur) not in (r['sha1_after'], r['sha1_before']):
                raise SystemExit('REFUSED: %s changed since this pass (%s)' % (r['rel'], sha1(cur)[:8]))
            with open(p, 'wb') as fh:
                fh.write(open(os.path.join(PRE, *r['rel'].split('/')), 'rb').read())
        os.replace(MANIFEST, MANIFEST + '.restored')
        print('restored %d file(s)' % len(rows))
        return
    raise SystemExit(__doc__)


if __name__ == '__main__':
    main()
