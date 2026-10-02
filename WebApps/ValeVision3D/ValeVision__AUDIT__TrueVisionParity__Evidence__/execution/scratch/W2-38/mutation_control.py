# Plant one fault in each module (in a scratch run tree only) and prove its test catches it.
import os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, 'run_tvcfg_live')
FEAT = os.path.join(ROOT, '02__Src__AppModules', '51__System__LayoutEditor', '57__Feature__ScrapbookParametric')
CASES = [
    ('Na__LayoutEditor__ScrapbookParametric__CabinetInfill__.js', 'Na__Test__ScrapbookCabinetInfill__.test.mjs',
     "const Na__LeParamInfill__UP_DEG          = -90;", "const Na__LeParamInfill__UP_DEG          = 90;"),
    ('Na__LayoutEditor__ScrapbookParametric__ProjectQr__.js', 'Na__Test__ScrapbookProjectQr__.test.mjs',
     "Object.freeze([ 'SizeMm', 'Form', 'BodyWidthMm', 'ProjectName' ])", "Object.freeze([ 'SizeMm', 'Form', 'BodyWidthMm' ])"),
]
for mod, test, old, new in CASES:
    p = os.path.join(FEAT, mod)
    clean = open(p, 'rb').read()
    s = clean.decode('utf-8')
    assert s.count(old) == 1, (mod, old)
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))
    r = subprocess.run(['node', os.path.join(ROOT, '80__Testing__PrototypeEnvironment', test)], capture_output=True, text=True)
    fails = [l for l in r.stdout.splitlines() if l.startswith('  FAIL  ')]
    print(mod, '-> planted fault exit', r.returncode, 'failing checks', len(fails), '(caught)' if r.returncode == 1 and fails else '(NOT CAUGHT)')
    for l in fails[:3]:
        print('    ', l[:150])
    open(p, 'wb').write(clean)
    r = subprocess.run(['node', os.path.join(ROOT, '80__Testing__PrototypeEnvironment', test)], capture_output=True, text=True)
    print(mod, '-> clean copy exit', r.returncode)
