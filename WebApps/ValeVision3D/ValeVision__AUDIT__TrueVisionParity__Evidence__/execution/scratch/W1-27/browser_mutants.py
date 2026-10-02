# -*- coding: utf-8 -*-
# W1-27 scratch: does the browser harness bite? Plants one fault at a time in a COPY of a landed Floor Areas
# module (an overlay folder under mutants/, the live tree untouched), runs browser_w1_27.mjs on this app's
# tree with that overlay, and runs analyse_w1_27.py on the result: it must report the named check(s) failed.
# The overlays are deleted afterwards (re-created by this script).
#
# Usage: python -B browser_mutants.py
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
FA = '02__Src__AppModules/51__System__LayoutEditor/59__Feature__FloorAreas/'

MUTANTS = [
    ('m1-ready-on-import', FA + 'Na__LayoutEditor__FloorAreas__.js',
     '    // MODULE EXPORTS | Floor Areas API\n',
     '    Na__LeArea__Ready();\n    // MODULE EXPORTS | Floor Areas API\n',
     ['vv A1', 'vv A2', 'vv A3']),
    ('m2-layer-at-the-bottom', FA + 'Na__LayoutEditor__FloorAreas__.js',
     ", type : Na__LeArea__LAYER_TYPE, index : Na__LeModel__LayerIndexAboveDrawings(sheet) });",
     ", type : Na__LeArea__LAYER_TYPE });",
     ['C3', 'D layer']),
    ('m3-label-left-aligned', FA + 'Na__LayoutEditor__FloorAreas__Paint__.js',
     "FontMm : line.sizeMm, Weight : line.weight, Colour : line.colour, Align : 'center'",
     "FontMm : line.sizeMm, Weight : line.weight, Colour : line.colour, Align : 'left'",
     ['C19', 'D paint']),
    ('m4-hidden-layer-skipped', FA + 'Na__LayoutEditor__FloorAreas__.js',
     "            .filter((entry) => Na__LeArea__IsScaled(entry.viewport))\n",
     "            .filter((entry) => Na__LeArea__IsScaled(entry.viewport) && Na__LeModel__GetLayerById(sheet, entry.viewport.Viewport__LayerId).Layer__Visible !== false)\n",
     ['C13', 'D hiddenViewports']),
]


def main():
    bad = 0
    lines = []
    for name, rel, old, new, expect in MUTANTS:
        root = os.path.join(HERE, 'mutants', name)
        src = os.path.join(VV, rel.replace('/', os.sep))
        text = open(src, encoding='utf-8', newline='').read()
        if text.count(old) != 1:
            lines.append('%-26s MUTATION DID NOT APPLY (%d matches)' % (name, text.count(old)))
            bad += 1
            continue
        dst = os.path.join(root, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, 'w', encoding='utf-8', newline='') as fh:
            fh.write(text.replace(old, new))
        run = subprocess.run(['node', 'browser_w1_27.mjs', '--overlay', root, '--tag', '__' + name, 'vv'], cwd=HERE,
                             capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=900)
        result = os.path.join(HERE, 'logs', 'browser__vv__' + name + '.json')
        report = os.path.join(HERE, 'logs', 'analysis__' + name + '.txt')
        ana = subprocess.run(['python', '-B', 'analyse_w1_27.py', '--vv', result, '--out', report], cwd=HERE,
                             capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300)
        failed = [l[6:] for l in ana.stdout.splitlines() if l.startswith('FAIL  ')]
        caught = all(any(f.startswith(e + ' ') or f == e for f in failed) for e in expect)
        lines.append('%-26s harness: %s | analysis exit %d, %d check(s) failed; expected %s -> %s' % (
            name, (run.stdout.strip().splitlines() or ['?'])[-1][:90], ana.returncode, len(failed), ', '.join(expect), 'caught' if caught else 'MISSED'))
        if not caught:
            bad += 1
            lines.extend('      failed: ' + f[:150] for f in failed[:8])
    shutil.rmtree(os.path.join(HERE, 'mutants'), ignore_errors=True)
    lines.append('browser mutants: %d planted, %d problem(s)' % (len(MUTANTS), bad))
    text = '\n'.join(lines)
    with open(os.path.join(HERE, 'logs', 'browser_mutants.txt'), 'w', encoding='utf-8') as fh:
        fh.write(text + '\n')
    print(text)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
