"""W3 gate FIX-1: take the STALE allow-list row Panels/AccordionSections off Na__Test__AppConfigParity__.test.mjs.
W3-10 flipped the last withheld value (floor-areas), so VV's AccordionSections now equals TrueVision's and the test warns
(--strict fails). Removes exactly one line, bytes in / bytes out, the file's own line endings kept. Backup first.
Usage: python fix_stale_allowlist.py [--apply]"""
import hashlib, os, shutil, sys

P = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Test__AppConfigParity__.test.mjs'
OUT = os.path.dirname(os.path.abspath(__file__))
b = open(P, 'rb').read()
print('before sha1', hashlib.sha1(b).hexdigest(), len(b), 'CRLF' if b.count(b'\r\n') else 'LF')
needle = b"'Panels/AccordionSections',"
lines = b.split(b'\n')
hits = [i for i, l in enumerate(lines) if needle in l]
assert len(hits) == 1, hits
i = hits[0]
assert b"'withheld'" in lines[i] and b'W3-10' in lines[i], lines[i]
print('remove line', i + 1, ':', lines[i].decode('utf-8').strip())
new = b'\n'.join(lines[:i] + lines[i + 1:])
assert len(new) == len(b) - len(lines[i]) - 1
if '--apply' in sys.argv:
    bk = os.path.join(OUT, 'backup')
    os.makedirs(bk, exist_ok=True)
    shutil.copy2(P, os.path.join(bk, os.path.basename(P)))
    open(P, 'wb').write(new)
    print('after sha1', hashlib.sha1(new).hexdigest(), len(new))
else:
    print('dry run')
