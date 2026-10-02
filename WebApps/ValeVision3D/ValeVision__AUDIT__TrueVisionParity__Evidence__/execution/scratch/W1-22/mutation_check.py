# -*- coding: utf-8 -*-
# W1-22 scratch: prove the harness and the ported test bite on each of this package's own changes. Each mutant
# rewrites ONE landed file's text in a throwaway overlay (the live tree is never touched); the harness runs with
# that overlay as its "new" variant, and the TitleBlockCells test runs in a throwaway mini tree. Every mutant
# must fail at least one of them; the unmutated control must pass both.
#
#   python -B mutation_check.py <work dir outside the repo>
import os
import shutil
import subprocess
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
LE = '02__Src__AppModules/51__System__LayoutEditor/'
CFG = LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json'
SETUP = LE + '03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js'
CELLS = LE + '10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Cells__.js'
TEST = '80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.test.mjs'
TVREC = os.path.join(HERE, 'tv', '02__Src__AppModules', '51__System__LayoutEditor', '07__Core__SheetData', 'Na__LayoutEditor__SheetRecords__.js')
WCP = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Projects'

MUTANTS = [
    ('rows: the number cell back to DrawingNumber "Drawing No."', CFG,
     '{ "Key": "DocumentId",    "Label": "Document ID",   "WidthMm": 24 }', '{ "Key": "DrawingNumber", "Label": "Drawing No.",   "WidthMm": 24 }'),
    ('rows: the Rev cell without its ValuePrefix', CFG,
     '"WidthMm": 28, "ValuePrefix": "Revision" }', '"WidthMm": 28 }'),
    ('scales: 1:200 left out of the config', CFG,
     '"LayoutEditor__Scales__AvailableScaleDenominators": [20, 50, 100, 200]', '"LayoutEditor__Scales__AvailableScaleDenominators": [20, 50, 100]'),
    ('anchors: the VV-only DrawingNumber anchor kept', CFG,
     '                "DocumentId":    { "X": 330, "Y": 289, "FontMm": 2.2, "Align": "left" },\n',
     '                "DocumentId":    { "X": 330, "Y": 289, "FontMm": 2.2, "Align": "left" },\n                "DrawingNumber": { "X": 330, "Y": 289, "FontMm": 2.4, "Align": "left" },\n'),
    ('fallback: the SheetSetup scales without 1:200', SETUP,
     '        scales     : [ 20, 50, 100, 200 ],', '        scales     : [ 20, 50, 100 ],'),
    ('fallback: the SheetSetup rows keep DrawingNumber', SETUP,
     "{ Key : 'DocumentId', Label : 'Document ID', WidthMm : 24 }", "{ Key : 'DrawingNumber', Label : 'Drawing No.', WidthMm : 24 }"),
    ('cells: Widen gone (this app\'s old export list)', CELLS,
     '        Na__LeTitleCells__Widen,\n', ''),
    ('cells: Widen pays the fifth out of the title (no room cap)', CELLS,
     'const share    = (extraSum > 0) ? Math.min(1, room / extraSum) : 0;', 'const share    = (extraSum > 0) ? 1 : 0;'),
]


def live(rel):
    return open(os.path.join(VV, rel.replace('/', os.sep)), 'rb').read().decode('utf-8')


def run_harness(overlay):
    cmd = ['node', os.path.join(HERE, 'harness_w1_22.mjs'), '--pre', os.path.join(HERE, 'preimage'), '--tvrec', TVREC, '--wcp', WCP]
    if overlay:
        cmd += ['--stage', overlay]
    res = subprocess.run(cmd, capture_output=True, cwd=HERE)
    out = res.stdout.decode('utf-8', 'replace')
    fails = [l.strip()[6:].strip() for l in out.splitlines() if l.strip().startswith('FAIL')]
    crashed = res.returncode != 0 and not fails
    return res.returncode, fails, (res.stderr.decode('utf-8', 'replace').strip().splitlines() or [''])[-1] if crashed else ''


def run_test(tree):
    res = subprocess.run(['node', TEST], capture_output=True, cwd=tree)
    out = (res.stdout + res.stderr).decode('utf-8', 'replace')
    fails = [l.strip() for l in out.splitlines() if l.strip().startswith('FAIL') or 'Error' in l]
    return res.returncode, fails


def mini_tree(work, files):
    tree = os.path.join(work, 'tree')
    if os.path.exists(tree):
        shutil.rmtree(tree)
    for rel in (CFG, CELLS, TEST):
        dest = os.path.join(tree, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        data = files.get(rel)
        open(dest, 'wb').write((data if data is not None else live(rel)).encode('utf-8'))
    return tree


def main(work):
    os.makedirs(work, exist_ok=True)
    code, fails, crash = run_harness(None)
    tcode, tfails = run_test(mini_tree(work, {}))
    print('control (landed files): harness exit %d (%d fail), test exit %d' % (code, len(fails), tcode))
    ok = code == 0 and tcode == 0
    for name, rel, old, new in MUTANTS:
        text = live(rel)
        if text.count(old) != 1:
            print('  SETUP ERROR %s: the text to mutate is not found once' % name)
            ok = False
            continue
        mutated = text.replace(old, new)
        overlay = os.path.join(work, 'overlay')
        if os.path.exists(overlay):
            shutil.rmtree(overlay)
        dest = os.path.join(overlay, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        open(dest, 'wb').write(mutated.encode('utf-8'))
        hcode, hfails, crash = run_harness(overlay)
        tcode, tfails = run_test(mini_tree(work, { rel : mutated }))
        caught = hcode != 0 or tcode != 0
        ok = ok and caught
        print(('  CAUGHT  ' if caught else '  MISSED  ') + name)
        if hfails or crash:
            print('          harness: ' + ('; '.join(hfails[:3]) if hfails else 'crashed - ' + crash[:160]))
        if tcode != 0:
            print('          test:    ' + '; '.join(tfails[:2])[:220])
    shutil.rmtree(work, ignore_errors=True)
    print('\n' + ('every mutant caught; control clean' if ok else 'NOT ALL CAUGHT'))
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1]))
