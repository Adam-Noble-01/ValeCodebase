"""W3-06: every line that differs between a live VV file and TV's text at b2aa9151 must be the banner, inside the PORT NOTE
block, or the test's printed title. Also asserts no NA identity token and LF line endings."""
import difflib
import os
import subprocess
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport3dZoom__.js',
    '02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ViewportClipboard__.js',
    '80__Testing__PrototypeEnvironment/Na__Test__ViewportRotation__.test.mjs',
]
IDENTITY = ['TRUEVISION3D', '[TrueVision3D', 'NaProjectPortal', 'noble-architecture.com', '80__CloudflareIntegration', '/api/truevision', '/na-apps/']
bad = 0
for rel in FILES:
    tv = subprocess.run(['git', '-C', r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb', 'show',
                         'b2aa9151:na-apps/30__TrueVision__CoreAppCode/' + rel], check=True, capture_output=True).stdout.decode('utf-8')
    with open(os.path.join(VV, rel), 'rb') as fh:
        raw = fh.read()
    vv = raw.decode('utf-8')
    if b'\r\n' in raw:
        print('FAIL CRLF in', rel); bad += 1
    vl = vv.split('\n')
    # PORT NOTE block span in VV
    start = next(i for i, l in enumerate(vl) if l.startswith('// PORT NOTE:'))
    end = next(i for i in range(start, len(vl)) if vl[i].startswith('// - Back-port'))
    unexplained = []
    sm = difflib.SequenceMatcher(None, tv.split('\n'), vl, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        for j in range(j1, j2):
            line = vl[j]
            if j == 1 and line.startswith('// VALEVISION3D - '):
                continue
            if start - 3 <= j <= end + 4:      # the note plus its rule-line frame (the test's note is a new block)
                continue
            if "console.log('\\nValeVision3D - rotatable viewports" in line:
                continue
            unexplained.append((j + 1, line))
        if tag == 'delete':
            for i in range(i1, i2):
                l = tv.split('\n')[i]
                if not (l.startswith('// PORT NOTE') or l.startswith('// - Ported to') or l.startswith('// - Parity') or l.startswith('// - Divergences')):
                    unexplained.append(('TV' + str(i + 1), l))
    hits = [t for t in IDENTITY if t in vv]
    print('%-100s unexplained=%d identity=%s' % (rel, len(unexplained), hits or 'none'))
    for u in unexplained:
        print('   ', u)
    bad += len(unexplained) + len(hits)
print('RESULT:', 'PASS' if bad == 0 else 'FAIL')
sys.exit(1 if bad else 0)
