# W2-27 scratch: prove the pure runner is not vacuous. Copies VV's Geometry, Curves and Offset into a throwaway tree,
# applies one mutation at a time, and runs run__pure.mjs pointed at that tree. Each mutant must exit 1; the unmutated
# control must exit 0. Nothing under the VV app root is touched.
import os
import shutil
import subprocess
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
REL = os.path.join('02__Src__AppModules', '51__System__LayoutEditor', '37__System__VectorTools')
NAMES = ['Geometry', 'Curves', 'Offset']
RUNNER = open(os.path.join(HERE, 'run__pure.mjs'), 'rb').read().decode('utf-8')
VV_TEST_DIR = "'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/80__Testing__PrototypeEnvironment'"

MUTANTS = [
    ('control (no mutation)', None, None, None),
    ('Curves SegmentsFor without the 4-round', 'Curves', 'return Math.min(max - (max % 4), Math.ceil(n / 4) * 4) || 4;', 'return n;'),
    ('Geometry SAME_MM 1e-6 -> 1', 'Geometry', 'const Na__LeVecGeo__SAME_MM  = 1e-6;', 'const Na__LeVecGeo__SAME_MM  = 1;'),
    ('Offset SideOf returns 0 at once', 'Offset', 'if (n < 2 || !point) return 0;', 'return 0;'),
]

results = []
for label, unit, old, new in MUTANTS:
    root = tempfile.mkdtemp(prefix='na-w2-27-mut-')
    try:
        folder = os.path.join(root, REL)
        os.makedirs(folder)
        os.makedirs(os.path.join(root, '80__Testing__PrototypeEnvironment'))
        for n in NAMES:
            f = 'Na__LayoutEditor__VectorTools__' + n + '__.js'
            text = open(os.path.join(VV, REL, f), 'rb').read().decode('utf-8')
            if unit == n:
                if text.count(old) != 1:
                    raise SystemExit('STOP: mutation site not found once: ' + label)
                text = text.replace(old, new)
            open(os.path.join(folder, f), 'wb').write(text.encode('utf-8'))
        runner = RUNNER.replace(VV_TEST_DIR, "'" + os.path.join(root, '80__Testing__PrototypeEnvironment').replace('\\', '/') + "'")
        if runner == RUNNER:
            raise SystemExit('STOP: runner SCRIPT_DIR not replaced')
        rp = os.path.join(root, 'run.mjs')
        open(rp, 'wb').write(runner.encode('utf-8'))
        p = subprocess.run(['node', rp], capture_output=True, text=True)
        last = (p.stdout.strip().splitlines() or [''])[-1]
        want = 0 if unit is None else 1
        ok = p.returncode == want
        results.append(ok)
        print('%-4s %-40s exit %d  %s' % ('ok' if ok else 'FAIL', label, p.returncode, last))
    finally:
        shutil.rmtree(root, ignore_errors=True)

print('mutation check: %d/%d as expected' % (sum(results), len(results)))
raise SystemExit(0 if all(results) else 1)
