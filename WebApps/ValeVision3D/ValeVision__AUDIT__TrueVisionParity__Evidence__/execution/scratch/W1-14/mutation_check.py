# W1-14 scratch: prove the ported leaf section of Na__Test__ViewportRotation__ bites.
# Builds a throwaway mini app tree under scratch/W1-14/mut/<case>/ holding VV's test and a MUTATED copy of
# VV's ViewportRotation leaf, runs the test there, and expects exit 1 for every mutation (exit 0 for the
# unmutated control). Nothing in the app tree is touched.
import os
import shutil
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TEST = r'80__Testing__PrototypeEnvironment\Na__Test__ViewportRotation__.test.mjs'
LEAF = r'02__Src__AppModules\51__System__LayoutEditor\20__System__Viewports\Na__LayoutEditor__ViewportRotation__.js'

CASES = [
    ('control', None, None),
    ('turn-vector-sign', 'y : (dx * sin) + (dy * cos)', 'y : (dx * sin) - (dy * cos)'),
    ('wrap-keeps-minus-180', 'if (d <= -180) d += 360;', 'if (d < -180) d += 360;'),
    ('detent-ignored', 'if (Math.abs(d - right) <= detentDeg) d = right;', 'if (Math.abs(d - right) < 0) d = right;'),
    ('pdf-matrix-e', 'const e   = (Cx * (1 - cos)) - (Cy * sin);', 'const e   = (Cx * (1 - cos)) + (Cy * sin);'),
    ('bounds-level-shortcut', "if (!Na__LeVpRot__IsTurned(viewport)) return { X : f.X, Y : f.Y, WidthMm : f.WidthMm, HeightMm : f.HeightMm };",
     "if (!Na__LeVpRot__IsTurned(viewport)) return { X : f.X, Y : f.Y, WidthMm : f.HeightMm, HeightMm : f.WidthMm };"),
]

leaf_src = open(os.path.join(VV, LEAF), 'rb').read().decode('utf-8')
results = []
for name, old, new in CASES:
    root = os.path.join(HERE, 'mut', name)
    if os.path.exists(root):
        shutil.rmtree(root)
    os.makedirs(os.path.join(root, os.path.dirname(TEST)))
    os.makedirs(os.path.join(root, os.path.dirname(LEAF)))
    shutil.copyfile(os.path.join(VV, TEST), os.path.join(root, TEST))
    src = leaf_src
    if old is not None:
        if src.count(old) != 1:
            raise SystemExit('mutation anchor not found once: ' + name)
        src = src.replace(old, new)
    with open(os.path.join(root, LEAF), 'wb') as fh:
        fh.write(src.encode('utf-8'))
    run = subprocess.run(['node', os.path.join(root, TEST)], capture_output=True, text=True)
    fails = [l.strip() for l in run.stdout.splitlines() if l.strip().startswith('FAIL')]
    want = 0 if old is None else 1
    ok = run.returncode == want
    results.append(ok)
    print('%-24s exit %d (want %d) %s  %d failing check(s)%s' % (
        name, run.returncode, want, 'OK ' if ok else 'BAD', len(fails),
        ('  e.g. ' + fails[0][:90]) if fails else ''))
    shutil.rmtree(root)
shutil.rmtree(os.path.join(HERE, 'mut'), ignore_errors=True)
print('ALL OK' if all(results) else 'SOMETHING DID NOT BITE')
