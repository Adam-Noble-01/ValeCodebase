"""W2-39 test runs on scratch copies (the acceptance's form).

(a) control: TrueVision's own test, module, config, hatch module and hatch library, all at the pin.
(b) ValeVision: the LANDED test and SiteLegend module, VV's live hatch module and hatch library, and VV's live
    parametric config with only TrueVision's SiteLegend block and its tile merged in, stems carrying this app's
    token (ValeVision__SitePlan__*) - the shape W3-14 will land.
(f) (b) with the config's HiddenByDefault removed, so the module's own FALLBACK list decides (must pass).
(m) mutation controls: m1 the capsule given an odd side count, m2 the ShowLines filter removed (both on (b)),
    m3 the FALLBACK list put back to TrueVision's stems (on (f)); the test must catch each.

Usage: python stage_run.py [live]   ('live' reads the landed files; default reads staged/)
"""
import json
import os
import shutil
import subprocess
import sys

PIN = 'b2aa9151'
TV_REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = VV if (len(sys.argv) > 1 and sys.argv[1] == 'live') else os.path.join(HERE, 'staged')

LE = '02__Src__AppModules/51__System__LayoutEditor/'
FEATURE = LE + '57__Feature__ScrapbookParametric/'
LEGEND = FEATURE + 'Na__LayoutEditor__ScrapbookParametric__SiteLegend__.js'
CONFIG = FEATURE + 'Na__LayoutEditor__ScrapbookParametric__Config__.json'
HATCH = LE + '36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js'
LIBRARY = '52__LayoutEditor__HatchPatternLibrary'
TEST = '80__Testing__PrototypeEnvironment/Na__Test__ScrapbookSiteLegend__.test.mjs'


def tv(rel):
    return subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':' + TV_APP + rel], capture_output=True, check=True).stdout


def put(root, rel, data):
    p = os.path.join(root, *rel.split('/'))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'wb').write(data)


def read(root, rel):
    return open(os.path.join(root, *rel.split('/')), 'rb').read()


def fresh(name):
    root = os.path.join(HERE, name)
    if os.path.isdir(root):
        shutil.rmtree(root)
    os.makedirs(root)
    return root


def run(root, label):
    r = subprocess.run(['node', os.path.join(root, *TEST.split('/'))], capture_output=True, text=True, encoding='utf-8')
    lines = r.stdout.splitlines()
    passed = sum(1 for l in lines if l.startswith('  PASS'))
    failed = [l for l in lines if l.startswith('  FAIL')]
    print('%-4s exit %d  %d PASS  %d FAIL  %s' % (label, r.returncode, passed, len(failed), (lines[-1] if lines else r.stderr.strip()[-300:])))
    for l in failed:
        print('      ' + l.strip()[:220])
    return r.returncode, passed, len(failed)


def vv_token(value):
    return json.loads(json.dumps(value).replace('TrueVision__SitePlan__', 'ValeVision__SitePlan__'))


def build_a():
    root = fresh('run_a')
    for rel in (TEST, LEGEND, CONFIG, HATCH):
        put(root, rel, tv(rel))
    listed = subprocess.run(['git', '-C', TV_REPO, 'ls-tree', '-r', '--name-only', PIN, '--', TV_APP + LIBRARY],
                            capture_output=True, check=True, text=True).stdout.split()
    for full in listed:
        rel = full[len(TV_APP):]
        put(root, rel, tv(rel))
    return root


def build_b(name='run_b'):
    root = fresh(name)
    put(root, TEST, read(SOURCE, TEST))
    put(root, LEGEND, read(SOURCE, LEGEND))
    put(root, HATCH, read(VV, HATCH))
    shutil.copytree(os.path.join(VV, LIBRARY), os.path.join(root, LIBRARY))
    whole = json.loads(read(VV, CONFIG).decode('utf-8'))
    tvc = json.loads(tv(CONFIG).decode('utf-8'))
    assert 'LayoutEditor__ScrapbookParametric__SiteLegend' not in whole, 'VV config already carries the block'
    whole['LayoutEditor__ScrapbookParametric__SiteLegend'] = vv_token(tvc['LayoutEditor__ScrapbookParametric__SiteLegend'])
    tile = [e for e in tvc['LayoutEditor__ScrapbookParametric__Elements']['Elements__List'] if e.get('Element__Id') == 'SiteLegend']
    assert len(tile) == 1
    whole['LayoutEditor__ScrapbookParametric__Elements']['Elements__List'].append(vv_token(tile[0]))
    put(root, CONFIG, json.dumps(whole, indent=4, ensure_ascii=False).encode('utf-8'))
    return root


def mutate(root, old, new):
    p = os.path.join(root, *LEGEND.split('/'))
    t = open(p, 'rb').read().decode('utf-8')
    assert t.count(old) >= 1, old
    open(p, 'wb').write(t.replace(old, new).encode('utf-8'))


def drop_hidden(root):
    p = os.path.join(root, *CONFIG.split('/'))
    whole = json.loads(open(p, 'rb').read().decode('utf-8'))
    del whole['LayoutEditor__ScrapbookParametric__SiteLegend']['SiteLegend__HiddenByDefault']
    open(p, 'wb').write(json.dumps(whole, indent=4, ensure_ascii=False).encode('utf-8'))


def main():
    print('source of landed files:', SOURCE)
    a = run(build_a(), '(a)')
    b = run(build_b(), '(b)')
    m1 = build_b('run_m1')
    mutate(m1, 'const sides  = r < 0.25 ? 6 : 8;', 'const sides  = r < 0.25 ? 5 : 7;')
    m1r = run(m1, '(m1)')
    m2 = build_b('run_m2')
    mutate(m2, '.filter((row) => whole.ShowLines || row.Kind !== Na__LeParamLegend__KIND_LINE)', '.filter((row) => true)')
    m2r = run(m2, '(m2)')
    f = build_b('run_f')
    drop_hidden(f)
    fr = run(f, '(f)')
    m3 = build_b('run_m3')
    drop_hidden(m3)
    mutate(m3, "            'ValeVision__SitePlan__", "            'TrueVision__SitePlan__")
    m3r = run(m3, '(m3)')
    ok = a[0] == 0 and b[0] == 0 and fr[0] == 0 and m1r[0] != 0 and m2r[0] != 0 and m3r[0] != 0
    print('STAGE RUN', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
