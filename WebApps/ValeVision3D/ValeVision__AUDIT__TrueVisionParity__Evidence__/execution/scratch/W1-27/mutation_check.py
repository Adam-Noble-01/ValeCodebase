# -*- coding: utf-8 -*-
# W1-27 scratch: does Na__Test__FloorAreas__ bite on THIS app's copies? Copies the landed test, Geometry module and
# config into a temporary tree with the app's layout (the test finds them through ../02__Src__AppModules/...), plants
# one fault at a time (each one exact-string edit, asserted to match once) and runs the test, which must then fail.
# A clean control run must pass. The live tree is only read.
#
# Usage: python -B mutation_check.py
import os
import shutil
import subprocess
import sys
import tempfile

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
FA = '02__Src__AppModules/51__System__LayoutEditor/59__Feature__FloorAreas/'
GEO = FA + 'Na__LayoutEditor__FloorAreas__Geometry__.js'
CFG = FA + 'Na__LayoutEditor__FloorAreas__Config__.json'
TEST = '80__Testing__PrototypeEnvironment/Na__Test__FloorAreas__.test.mjs'

MUTANTS = [
    ('the scale is not squared', GEO, 'return (Na__LeAreaGeo__PaperMm2(points) * d * d) / 1000000;', 'return (Na__LeAreaGeo__PaperMm2(points) * d) / 1000000;'),
    ('the perimeter is out by ten', GEO, 'return (Na__LeAreaGeo__PerimeterPaperMm(points) * d) / 1000;', 'return (Na__LeAreaGeo__PerimeterPaperMm(points) * d) / 100;'),
    ('a crossing outline is never reported', GEO, '        if (n < 4) return false;\n        for (let i = 0; i < n; i++) {\n            const a1', '        if (n >= 0) return false;\n        for (let i = 0; i < n; i++) {\n            const a1'),
    ('the box middle is used even outside the room', GEO, 'if (Na__LeAreaGeo__Contains(pts, x, y)) return { x : x, y : y, placement : Na__LeAreaGeo__PLACE_BOX };', 'if (true) return { x : x, y : y, placement : Na__LeAreaGeo__PLACE_BOX };'),
    ('toFixed rounding (half to even in binary)', GEO, 'const whole  = (eased >= 0 ? 1 : -1) * Math.round(Math.abs(eased));', 'const whole  = Math.trunc(eased);'),
    ('the config ships square feet', CFG, '"Measurement__Units"         : "m2",', '"Measurement__Units"         : "ft2",'),
    ('the layer is renamed', CFG, '"Layer__Name"        : "Floor Areas",', '"Layer__Name"        : "Areas",'),
    ('labels run into the next room', CFG, '"Label__ShrinkToFit"      : true,', '"Label__ShrinkToFit"      : false,'),
    ('a palette colour is not hex', CFG, '"#cfe9e6" ]', '"cfe9e6" ]'),
]


def copy_tree(dst):
    for rel in (GEO, CFG, TEST):
        target = os.path.join(dst, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.copyfile(os.path.join(VV, rel.replace('/', os.sep)), target)


def run(dst):
    res = subprocess.run(['node', TEST], cwd=dst, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300)
    fails = sum(1 for l in res.stdout.splitlines() if l.startswith('  FAIL  '))
    return res.returncode, fails


def main():
    base = tempfile.mkdtemp(prefix='w1-27-mutants-')
    try:
        ctrl = os.path.join(base, 'control')
        copy_tree(ctrl)
        code, fails = run(ctrl)
        print('%-48s exit %d, %d check(s) failed  -> %s' % ('control (as landed)', code, fails, 'PASS' if code == 0 else 'UNEXPECTED'))
        bad = 0 if code == 0 else 1
        for i, (name, rel, old, new) in enumerate(MUTANTS, 1):
            dst = os.path.join(base, 'm%02d' % i)
            copy_tree(dst)
            path = os.path.join(dst, rel.replace('/', os.sep))
            text = open(path, encoding='utf-8', newline='').read()
            if text.count(old) != 1:
                print('%-48s MUTATION DID NOT APPLY (%d matches)' % (name, text.count(old)))
                bad += 1
                continue
            with open(path, 'w', encoding='utf-8', newline='') as fh:
                fh.write(text.replace(old, new))
            code, fails = run(dst)
            caught = code != 0
            print('%-48s exit %d, %d check(s) failed  -> %s' % (name, code, fails, 'caught' if caught else 'MISSED'))
            bad += 0 if caught else 1
        print('mutants: %d planted, %d problem(s)' % (len(MUTANTS), bad))
        return 1 if bad else 0
    finally:
        shutil.rmtree(base, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
