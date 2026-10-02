"""Does the W2-29 acceptance harness bite? Copies the files it reads into a throwaway app root, applies one
mutation per run and expects acceptance_check.mjs to exit 1 (the control copy must exit 0). Touches nothing live."""
import os
import shutil
import subprocess
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
MUT = os.path.join(HERE, '..', 'mut')
LE = os.path.join('02__Src__AppModules', '51__System__LayoutEditor')
FILES = [
    os.path.join(LE, '36__System__HatchPatternTools', 'Na__LayoutEditor__Panel__Patterns__.js'),
    os.path.join(LE, '36__System__HatchPatternTools', 'Na__LayoutEditor__Styles__Patterns__.css'),
    os.path.join(LE, '36__System__HatchPatternTools', 'Na__LayoutEditor__HatchPatterns__.js'),
    os.path.join(LE, '05__Core__ModeController', 'Na__LayoutEditor__ModeController__.js'),
    os.path.join(LE, '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json'),
    os.path.join(LE, '01__Core__Loader', 'Na__LayoutEditor__Loader__.js'),
]
MODE = FILES[3]
PANEL = FILES[0]
CFG = FILES[4]
PACK = os.path.join('52__LayoutEditor__HatchPatternLibrary', '02__ConstructionMaterialHatches', 'HatchPack__Index__.json')


def sub(rel, old, new):
    def apply(root):
        p = os.path.join(root, rel)
        b = open(p, 'rb').read()
        assert b.count(old) >= 1, (rel, old)
        open(p, 'wb').write(b.replace(old, new, 1))
    return apply


def remove(rel):
    return lambda root: os.remove(os.path.join(root, rel))


MUTANTS = [
    ('control', None),
    ('ready chain without the hatch library', sub(MODE, b'Na__LeHatch__Ready(), Na__LeDocKeys', b'Na__LeDocKeys')),
    ('Patterns registration line removed', sub(MODE,
        b"        Na__LePanelPatterns__Register();                                       // <-- Patterns: the hatch library and each site plan layer's hatch\r\n", b'')),
    ('AccordionSections without patterns', sub(CFG, b'"leaders", "patterns" ]', b'"leaders" ]')),
    ('adapted panel: never hidden while loading', sub(PANEL, b'        Na__LePanels__SetSectionVisible(Na__LePanelPatterns__ID, false);\n', b'')),
    ('Construction pack swatch ink lost', sub(PACK, b'#333333', b'#43A047')),
    ('stylesheet missing', remove(FILES[1])),
]


def build(root):
    if os.path.exists(root):
        shutil.rmtree(root)
    for rel in FILES:
        os.makedirs(os.path.dirname(os.path.join(root, rel)), exist_ok=True)
        shutil.copyfile(os.path.join(VV, rel), os.path.join(root, rel))
    shutil.copytree(os.path.join(VV, '52__LayoutEditor__HatchPatternLibrary'), os.path.join(root, '52__LayoutEditor__HatchPatternLibrary'),
                    ignore=shutil.ignore_patterns('*.png'))


def main():
    bad = 0
    for i, (name, mutate) in enumerate(MUTANTS):
        root = os.path.join(MUT, str(i))
        build(root)
        if mutate:
            mutate(root)
        env = dict(os.environ, W229_VV_ROOT=root)
        r = subprocess.run(['node', os.path.join(HERE, 'acceptance_check.mjs')], env=env, capture_output=True, text=True)
        want = 0 if mutate is None else 1
        good = r.returncode == want
        bad += not good
        fails = [l.strip() for l in r.stdout.splitlines() if l.strip().startswith('FAIL')]
        print(('OK   ' if good else 'BAD  ') + f'{name}: exit {r.returncode} (want {want})' + (f' - first FAIL: {fails[0]}' if fails else ''))
    shutil.rmtree(MUT)
    print('MUTATION CHECK ' + ('PASS' if not bad else 'FAIL') + f' ({len(MUTANTS) - bad}/{len(MUTANTS)})')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
