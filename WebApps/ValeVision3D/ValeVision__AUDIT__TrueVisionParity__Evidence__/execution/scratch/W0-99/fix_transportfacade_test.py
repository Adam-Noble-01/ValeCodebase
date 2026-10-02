"""W0-99 - the one follow-on edit the scribe pass forces: Na__Test__TransportFacade__.test.mjs (W0-12's test).

Its check at :1426 required the literal placeholder {{VVREL:W0-12}} in the two facade modules, so the scribe pass
(which must leave zero placeholders, G4 --scribe) necessarily failed it. The check's intent is that each facade
PORT NOTE names the ValeVision release; it now accepts that release as the placeholder or as the resolved v2.x.y on
the "Ported on" line. A 1.0.1 log entry says so. Byte-level, LF kept, hash-checked, pre-image saved.

Usage: python -B fix_transportfacade_test.py --dry-run | --apply | --restore
"""
import hashlib, os, sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
REL = '80__Testing__PrototypeEnvironment/Na__Test__TransportFacade__.test.mjs'
PATH = os.path.join(VV, *REL.split('/'))
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, 'preimage_fix', 'Na__Test__TransportFacade__.test.mjs')
EXPECT_BEFORE = '7e980611'          # the file as the scribe pass left it (resolve_vvrel.py manifest)

OLD_CHECK = rb"&& /\{\{VVREL:W0-12\}\}/.test(text));"
NEW_CHECK = (rb"&& /Ported on\s*: \d\d-[A-Z][a-z]{2}-\d{4} for ValeVision3D (\{\{VVREL:W0-12\}\}|v2\.\d+\.\d+)/"
             rb".test(text));")
OLD_LOG = b"// DEVELOPMENT LOG:\n// 01-Oct-2026 - Version 1.0.0 (v2.71.1)\n"
NEW_LOG = (b"// DEVELOPMENT LOG:\n"
           b"// 01-Oct-2026 - Version 1.0.1 (v2.71.1)\n"
           b"// - The facade PORT NOTE check accepts the release the wave's Parity\n"
           b"//   Scribe writes where the placeholder stood: each module's Ported on\n"
           b"//   line must name the ValeVision release, as the placeholder or as\n"
           b"//   v2.x.y. It had asked for the placeholder itself, which the scribe's\n"
           b"//   own pass must leave nowhere (W0-99).\n"
           b"//\n"
           b"// 01-Oct-2026 - Version 1.0.0 (v2.71.1)\n")


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def build(cur):
    if cur.count(OLD_CHECK) != 1 or cur.count(OLD_LOG) != 1:
        raise SystemExit('REFUSED: anchors not found exactly once (check %d, log %d)' % (cur.count(OLD_CHECK), cur.count(OLD_LOG)))
    if b'\r\n' in cur:
        raise SystemExit('REFUSED: the file is expected to be LF')
    return cur.replace(OLD_CHECK, NEW_CHECK).replace(OLD_LOG, NEW_LOG)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--dry-run'
    cur = open(PATH, 'rb').read()
    if mode == '--restore':
        pre = open(PRE, 'rb').read()
        if sha1(cur) != sha1(build(pre)):
            raise SystemExit('REFUSED: the file changed since this fix (%s)' % sha1(cur)[:8])
        open(PATH, 'wb').write(pre)
        print('restored', REL, sha1(pre)[:8])
        return
    if not sha1(cur).startswith(EXPECT_BEFORE):
        raise SystemExit('REFUSED: %s is at %s, expected %s' % (REL, sha1(cur)[:8], EXPECT_BEFORE))
    new = build(cur)
    print('%s: %s -> %s (%d -> %d bytes)' % (REL, sha1(cur)[:8], sha1(new)[:8], len(cur), len(new)))
    if mode == '--dry-run':
        return
    os.makedirs(os.path.dirname(PRE), exist_ok=True)
    open(PRE, 'wb').write(cur)
    tmp = PATH + '.w0-99.tmp'
    open(tmp, 'wb').write(new)
    if sha1(open(PATH, 'rb').read()) != sha1(cur):
        os.remove(tmp)
        raise SystemExit('STOPPED: the file changed while the fix was built')
    os.replace(tmp, PATH)
    print('written; read back', sha1(open(PATH, 'rb').read())[:8])


if __name__ == '__main__':
    main()
