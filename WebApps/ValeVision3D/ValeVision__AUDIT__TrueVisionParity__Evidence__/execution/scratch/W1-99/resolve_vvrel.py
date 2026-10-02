"""W1-99 Parity Scribe - resolve Wave 1's release placeholders to the allocated version.

Replaces every {{VVREL:W1-NN}} (NN 01-38) with exactly 'v2.71.2' in:
  VV  02__Src__AppModules, 03__Style__AppStylesheets, 80__Testing__PrototypeEnvironment, index.html
  WCP WebApps/Whitecardopedia/server.py and Server__ValeVision*.py   (scanned; a token there is REFUSED here - a Flask
      file goes through the policy-3 procedure, compile + import in a separate process, then /api/check-localhost)
  execution/prepared/**                                            (the staged copies of shared infrastructure)
(The PortNotes fingerprint blanks both the placeholder and an x.y.z number, so no file leaves the 01-Oct-2026 baseline.)

Byte-level: only the token bytes change; line endings, BOMs and every other byte are kept. Each file's SHA-1 is recorded
when the plan is built and re-checked immediately before its write (compare and swap); pre-images go to
scratch/W1-99/preimage/ with a manifest. A token of any other package id in scope (a W0 leftover, a later wave) is
REFUSED, never resolved here. The rule quotations in the PLAN and the AUDIT report are outside the scope and never touched.

Usage:
  python -B resolve_vvrel.py --dry-run      plan only, nothing written
  python -B resolve_vvrel.py --apply        write pre-images, then the files
  python -B resolve_vvrel.py --check        prove no placeholder remains in scope and every changed file differs from
                                            its pre-image only at the token positions (line endings unchanged)
  python -B resolve_vvrel.py --restore      put the pre-images back (refuses if a file changed since)
"""
import hashlib, json, os, re, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

VERSION = b'v2.71.2'
WAVE_IDS = {'W1-%02d' % i for i in range(1, 39)}
VCB = r'D:\10_CoreLib__ValeCodebase'
VV = os.path.join(VCB, 'WebApps', 'ValeVision3D')
WCP = os.path.join(VCB, 'WebApps', 'Whitecardopedia')
HERE = os.path.dirname(os.path.abspath(__file__))
EXEC = os.path.dirname(os.path.dirname(HERE))
PREPARED = os.path.join(EXEC, 'prepared')
PRE = os.path.join(HERE, 'preimage')
MANIFEST = os.path.join(HERE, 'preimage_manifest.json')
SCOPE_DIRS = ['02__Src__AppModules', '03__Style__AppStylesheets', '80__Testing__PrototypeEnvironment']
SKIP_DIRS = {'.claude', 'node_modules', '.git', '__pycache__', '.wrangler'}
TOKEN_ANY = re.compile(rb'\{\{VVREL[^}\n]*\}\}')
TOKEN_OK = re.compile(rb'\{\{VVREL:(W1-\d\d)\}\}')
BINARY_EXT = ('.png', '.jpg', '.jpeg', '.webp', '.glb', '.gltf', '.bin', '.zip', '.pdf', '.ttf', '.otf', '.woff',
              '.woff2', '.ico', '.pyc', '.ktx2', '.hdr', '.exr', '.mp4', '.svgz')


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def walk(root):
    for dp, dn, fn in os.walk(root):
        dn[:] = [x for x in dn if x not in SKIP_DIRS]
        for f in fn:
            if not f.lower().endswith(BINARY_EXT):
                yield os.path.join(dp, f)


def candidates():
    """(kind, absolute path): kind 'vv' (resolvable here), 'wcp' (Flask: refused here), 'prepared' (staged copies)."""
    for d in SCOPE_DIRS:
        for p in walk(os.path.join(VV, d)):
            yield 'vv', p
    yield 'vv', os.path.join(VV, 'index.html')
    for fn in sorted(os.listdir(WCP)):
        if fn == 'server.py' or (fn.startswith('Server__ValeVision') and fn.endswith('.py')):
            yield 'wcp', os.path.join(WCP, fn)
    if os.path.isdir(PREPARED):
        for p in walk(PREPARED):
            yield 'prepared', p


def rel(p):
    return os.path.relpath(p, VCB).replace(os.sep, '/')


def plan():
    rows, refused = [], []
    scanned = {'vv': 0, 'wcp': 0, 'prepared': 0}
    for kind, p in candidates():
        try:
            b = open(p, 'rb').read()
        except Exception:
            continue
        scanned[kind] += 1
        if b'{{VVREL' not in b:
            continue
        toks = list(TOKEN_ANY.finditer(b))
        bad = [t.group(0).decode() for t in toks
               if not TOKEN_OK.fullmatch(t.group(0)) or TOKEN_OK.fullmatch(t.group(0)).group(1).decode() not in WAVE_IDS]
        if bad or kind == 'wcp':
            refused.append({'rel': rel(p), 'kind': kind, 'tokens': [t.group(0).decode() for t in toks], 'bad': bad})
            continue
        new = TOKEN_OK.sub(VERSION, b)
        rows.append({'rel': rel(p), 'path': p, 'kind': kind, 'sha1_before': sha1(b), 'sha1_after': sha1(new),
                     'tokens': [t.group(0).decode() for t in toks], 'size_before': len(b), 'size_after': len(new),
                     'crlf': b.count(b'\r\n'), 'lf': b.count(b'\n')})
    return rows, refused, scanned


def same_except_tokens(old, new):
    """True when `new` equals `old` with each well-formed W1 token replaced by VERSION, and nothing else."""
    return TOKEN_OK.sub(VERSION, old) == new


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--dry-run'
    if mode in ('--dry-run', '--apply'):
        rows, refused, scanned = plan()
        n = sum(len(r['tokens']) for r in rows)
        per = {}
        for r in rows:
            for t in r['tokens']:
                per[t] = per.get(t, 0) + 1
        print('scanned: VV %d, WCP Flask %d, prepared %d file(s)' % (scanned['vv'], scanned['wcp'], scanned['prepared']))
        print('%d placeholder(s) in %d file(s) -> %s' % (n, len(rows), VERSION.decode()))
        for k in sorted(per):
            print('  %-18s %d' % (k, per[k]))
        for r in rows:
            print('  %-130s %d  %s -> %s' % (r['rel'], len(r['tokens']), r['sha1_before'][:8], r['sha1_after'][:8]))
        if refused:
            print('REFUSED (not resolved by this script): %d file(s)' % len(refused))
            for r in refused:
                print('  %s [%s] %s' % (r['rel'], r['kind'], r['tokens']))
        if mode == '--dry-run':
            return
        if refused:
            raise SystemExit('REFUSED: placeholders this script may not resolve are in scope (above); nothing written')
        if os.path.exists(MANIFEST):
            raise SystemExit('REFUSED: a manifest already exists (%s); run --restore or --check first' % MANIFEST)
        for r in rows:                                      # pre-images first, all of them, before any write
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
            tmp = r['path'] + '.w1-99.tmp'
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
            p = os.path.join(VCB, *r['rel'].split('/'))
            cur = open(p, 'rb').read()
            old = open(os.path.join(PRE, *r['rel'].split('/')), 'rb').read()
            good = sha1(cur) == r['sha1_after'] and same_except_tokens(old, cur) and b'{{VVREL' not in cur
            good = good and old.count(b'\r\n') == cur.count(b'\r\n') and old.count(b'\n') == cur.count(b'\n')
            good = good and old[:3] == cur[:3]                  # a BOM, if any, kept
            print('  %s %s' % ('OK  ' if good else 'FAIL', r['rel']))
            ok = ok and good
        left = []
        for kind, p in candidates():
            try:
                b = open(p, 'rb').read()
            except Exception:
                continue
            for m in TOKEN_ANY.finditer(b):
                left.append('%s [%s]: %s' % (rel(p), kind, m.group(0).decode()))
        print('files checked: %d; placeholders left in scope: %d' % (len(rows), len(left)))
        for x in left:
            print('  ' + x)
        print('CHECK', 'PASS' if ok and not left else 'FAIL')
        sys.exit(0 if ok and not left else 1)
    if mode == '--restore':
        rows = json.load(open(MANIFEST, encoding='utf-8'))
        for r in rows:
            p = os.path.join(VCB, *r['rel'].split('/'))
            cur = open(p, 'rb').read()
            if sha1(cur) not in (r['sha1_after'], r['sha1_before']):
                raise SystemExit('REFUSED: %s changed since this pass (%s)' % (r['rel'], sha1(cur)[:8]))
        for r in rows:
            p = os.path.join(VCB, *r['rel'].split('/'))
            with open(p, 'wb') as fh:
                fh.write(open(os.path.join(PRE, *r['rel'].split('/')), 'rb').read())
        os.replace(MANIFEST, MANIFEST + '.restored')
        print('restored %d file(s)' % len(rows))
        return
    raise SystemExit(__doc__)


if __name__ == '__main__':
    main()
