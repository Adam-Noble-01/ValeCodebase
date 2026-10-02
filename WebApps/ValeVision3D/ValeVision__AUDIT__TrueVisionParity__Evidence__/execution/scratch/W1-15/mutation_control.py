"""Mutation control for the W1-15 seams: prove Na__Test__ProjectQr__.test.mjs catches each fault.

For each planted fault, re-stage the minimal tree (stage_tree.py) from scratch/W1-15/out,
plant the fault in the STAGED copy only (never the live tree), run the test there and
record which checks fail. A fault the test does not catch fails this script. The clean
copy must pass.

    python -B mutation_control.py <stage root>
"""
import os
import subprocess
import sys

HERE  = os.path.dirname(os.path.abspath(__file__))
QRREL = os.path.join('WebApps', 'ValeVision3D', '02__Src__AppModules', '51__System__LayoutEditor', '53__Feature__ProjectQrCode')
TEST  = os.path.join('80__Testing__PrototypeEnvironment', 'Na__Test__ProjectQr__.test.mjs')

FAULTS = [
    ('clean copy', None, None, None),
    ('Symbol fails OPEN again (TrueVision\'s IsEnabled)', 'Na__ProjectQr__Symbol__.js',
     "return !!Na__ProjectQr__Config && Na__ProjectQr__Config[Na__ProjectQr__PREFIX + 'Enabled'] === true;",
     "return !Na__ProjectQr__Config || Na__ProjectQr__Config[Na__ProjectQr__PREFIX + 'Enabled'] !== false;"),
    ('Symbol fails open AND its fallback carries a resolver', 'Na__ProjectQr__Symbol__.js',
     None, None),   # two edits, handled below
    ('ProjectLink keys the code by the address bar token', 'Na__ProjectQr__ProjectLink__.js',
     "projectCode   : Na__QrLink__ResolverKey(year, folder),",
     "projectCode   : text(new URLSearchParams(window.location.search).get('project')),"),
    ('ProjectLink falls back to the bare project code', 'Na__ProjectQr__ProjectLink__.js',
     "const key   = entry ? entry.qrKey : null;",
     "const key   = entry ? (entry.qrKey || entry.projectCode) : null;"),
    ('Config shipped switched on', 'Na__ProjectQr__Config__.json',
     '"ProjectQr__Enabled": false,', '"ProjectQr__Enabled": true,'),
]


def run(stage, name, filename, old, new, extra=None):
    subprocess.run([sys.executable, '-B', os.path.join(HERE, 'stage_tree.py'), stage], check=True, capture_output=True)
    edits = []
    if filename and old is not None:
        edits.append((filename, old, new))
    if extra:
        edits.extend(extra)
    for fn, o, n in edits:
        path = os.path.join(stage, QRREL, fn)
        with open(path, 'rb') as fh:
            text = fh.read().decode('utf-8')
        assert text.count(o) == 1, (name, fn, o)
        with open(path, 'wb') as fh:
            fh.write(text.replace(o, n).encode('utf-8'))
    res = subprocess.run(['node', TEST], cwd=os.path.join(stage, 'WebApps', 'ValeVision3D'), capture_output=True)
    out = res.stdout.decode('utf-8', 'replace')
    fails = [line.strip() for line in out.splitlines() if line.strip().startswith('FAIL')]
    tail = [line for line in out.splitlines() if ' passed, ' in line]
    return res.returncode, fails, (tail[-1].strip() if tail else out[-400:])


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    stage = os.path.abspath(sys.argv[1])
    bad = 0
    for name, fn, old, new in FAULTS:
        extra = None
        if name.startswith('Symbol fails open AND'):
            extra = [('Na__ProjectQr__Symbol__.js',
                      "return !!Na__ProjectQr__Config && Na__ProjectQr__Config[Na__ProjectQr__PREFIX + 'Enabled'] === true;",
                      "return !Na__ProjectQr__Config || Na__ProjectQr__Config[Na__ProjectQr__PREFIX + 'Enabled'] !== false;"),
                     ('Na__ProjectQr__Symbol__.js',
                      "        baseUrl             : '',",
                      "        baseUrl             : 'https://fallback.example.test/q/',")]
        code, fails, tail = run(stage, name, fn, old, new, extra)
        clean = fn is None and extra is None
        caught = code != 0 and len(fails) > 0
        ok = (code == 0 and not fails) if clean else caught
        bad += 0 if ok else 1
        print('%-6s %-58s exit %d  %s' % ('ok' if ok else 'MISSED', name, code, tail))
        for f in fails:
            print('         ' + f)
    print('\n%s' % ('every planted fault was caught and the clean copy passes' if bad == 0 else '%d case(s) not as expected' % bad))
    return 0 if bad == 0 else 1


if __name__ == '__main__':
    raise SystemExit(main())
