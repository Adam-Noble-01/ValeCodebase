# =============================================================================
# W1-16 | Mutation control for the Geometry/Painter test copy: the checks bite
# =============================================================================
#
# Copies ValeVision's Geometry and Painter (as landed) into a temporary SRC
# tree OUTSIDE the repository, plants one fault per run, points the scratch
# test copy at that tree and expects the run to FAIL. A clean copy must PASS.
# ValeVision's own files are only read.
#
# Usage: python mutation_control.py <scratch dir outside the repo>
# =============================================================================
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV_SRC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules'
FEATURE = os.path.join('51__System__LayoutEditor', '54__Feature__SheetImages')
GEO = 'Na__LayoutEditor__SheetImages__Geometry__.js'
PAINTER = 'Na__LayoutEditor__SheetImages__Painter__.js'

MUTANTS = [
    ('clean copy', None, None, None, 0),
    ('storage floor 256 -> 255 px', GEO, 'const Na__LeImgGeo__MIN_STORE_PX = 256;', 'const Na__LeImgGeo__MIN_STORE_PX = 255;', 1),
    ('corner scale ignores the snap', GEO, 'if (snap && Number.isFinite(snap.x) && Number.isFinite(snap.y)) {', 'if (false) {', 1),
    ('frame drawn under the picture', PAINTER, "if (p.State === Na__LeImgPaint__STATE_READY && p.Href) {", "if (p.Frame && p.Frame.WidthMm > 0) out += '<rect stroke=\"' + Na__LeImgPaint__Escape(p.Frame.Colour) + '\"/>';\n        if (p.State === Na__LeImgPaint__STATE_READY && p.Href) {", 1),
    ('placeholder caption not escaped', PAINTER, "'\" fill=\"' + Na__LeImgPaint__PLACE_INK + '\" text-anchor=\"middle\">' + Na__LeImgPaint__Escape(p.Caption) + '</text>'", "'\" fill=\"' + Na__LeImgPaint__PLACE_INK + '\" text-anchor=\"middle\">' + p.Caption + '</text>'", 1),
]


def main():
    work = sys.argv[1]
    os.makedirs(work, exist_ok=True)
    test = os.path.join(work, 'Na__Test__SheetImages__Mutant__.test.mjs')
    results = []
    for label, file_name, old, new, want_fail in MUTANTS:
        root = os.path.join(work, 'src_' + str(len(results)))
        if os.path.exists(root):
            shutil.rmtree(root)
        os.makedirs(os.path.join(root, FEATURE))
        for name in (GEO, PAINTER):
            shutil.copyfile(os.path.join(VV_SRC, FEATURE, name), os.path.join(root, FEATURE, name))
        if file_name:
            path = os.path.join(root, FEATURE, file_name)
            text = open(path, encoding='utf-8').read()
            if text.count(old) != 1:
                raise SystemExit('STOP: mutant "%s" anchor found %d times' % (label, text.count(old)))
            open(path, 'w', encoding='utf-8', newline='\n').write(text.replace(old, new))
        subprocess.run([sys.executable, '-B', os.path.join(HERE, 'make_test_copy.py'), test, root], check=True, capture_output=True)
        run = subprocess.run(['node', test], capture_output=True, text=True)
        failed = run.returncode != 0
        fails = [line.strip() for line in run.stdout.splitlines() if line.strip().startswith('FAIL')]
        expected = failed == bool(want_fail)
        results.append((label, run.returncode, fails[:3], expected))
        shutil.rmtree(root)
    for label, code, fails, expected in results:
        print('%-36s exit %d  %s  %s' % (label, code, 'as expected' if expected else 'UNEXPECTED', fails))
    if not all(r[3] for r in results):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
