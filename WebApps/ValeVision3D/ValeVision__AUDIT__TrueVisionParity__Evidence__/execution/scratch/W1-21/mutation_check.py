# -*- coding: utf-8 -*-
# W1-21 scratch: prove the harness bites on each of this package's own changes. A copy of the tree under test is
# made once; each mutant rewrites ONE file of the copy (the replacement must match exactly once), the harness runs
# against the copy, and the file is put back. Every mutant must fail the harness; the unmutated copy must pass.
# Never touches the repository.
#
# Usage: python -B mutation_check.py --tree <tree to copy> --work <scratch dir> --old <dir> --tvsheets <file> --wcp <dir>

import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
HARNESS = os.path.join(HERE, 'harness_w1_21.mjs')
LE = os.path.join('02__Src__AppModules', '51__System__LayoutEditor')
SHEETS = os.path.join(LE, '07__Core__SheetData', 'Na__LayoutEditor__SheetModel__Sheets__.js')
FACADE = os.path.join(LE, '07__Core__SheetData', 'Na__LayoutEditor__SheetModel__.js')
HISTORY = os.path.join(LE, '07__Core__SheetData', 'Na__LayoutEditor__History__.js')
LOADER = os.path.join(LE, '01__Core__Loader', 'Na__LayoutEditor__Loader__.js')

SEAM = "if (!data.LayoutEditor__DrawingRegister) { sheets.forEach((sheet, index) => { sheet.Sheet__Order = index + 1; }); return; }"

MUTANTS = [
    ('RenumberSheets seam as a strict no-op (no tab order renumber)', SHEETS,
     SEAM, "if (!data.LayoutEditor__DrawingRegister) { return; }"),
    ('RenumberSheets seam removed (TrueVision\'s config fallback stamps numbers)', SHEETS,
     SEAM, ""),
    ('the facade listens on the raw load event as well (heard twice)', FACADE,
     "        window.addEventListener(Na__DrawData__CHANGED_EVENT, reload);\n",
     "        window.addEventListener(Na__DrawData__CHANGED_EVENT, reload);\n        window.addEventListener('na-layouteditor-drawingsdata-loaded', reload);\n"),
    ('the facade without its late start (no announcement of a load that landed first)', FACADE,
     "        if (Na__DrawData__IsLoaded()) queueMicrotask(() => { if (!Na__LeModel__LoadHeard) reload(null); });",
     ""),
    ('History without the margin step reason', HISTORY,
     "'leader', 'margin', 'groups'", "'leader', 'groups'"),
    ('the loader announces the load again (AnnounceProjectLoad put back)', LOADER,
     "        Na__LeLoad__Editor = editor;",
     "        Na__LeLoad__Editor = editor; window.dispatchEvent(new CustomEvent(editor.model.Na__LeModel__CHANGED_EVENT, { detail : { reason : 'loaded', sheetId : null, itemId : null } }));"),
    ('the loader reads the stored number only again', LOADER,
     "        if (typeof stored === 'string') return stored;\n",
     "        return typeof stored === 'string' ? stored : '';\n"),
    ('the loader pads the default code to three digits', LOADER,
     "Math.round(Number(setup.digits) || 2)", "Math.round(Number(setup.digits) || 2) + 1"),
]


def run(tree, args):
    cmd = ['node', HARNESS, '--root', tree, '--old', args['old'], '--tvsheets', args['tvsheets'], '--wcp', args['wcp']]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', timeout=600)
    fails = [line.strip()[6:] for line in r.stdout.split('\n') if line.strip().startswith('FAIL ')]
    return r.returncode, fails


def main(argv):
    args = {argv[i].lstrip('-'): argv[i + 1] for i in range(0, len(argv), 2)}
    work = os.path.join(args['work'], 'mtree')
    if os.path.exists(work):
        shutil.rmtree(work)
    shutil.copytree(args['tree'], work)
    code, fails = run(work, args)
    print('control (unmutated copy): exit %d, %d failing check(s)' % (code, len(fails)))
    ok = (code == 0)
    caught = 0
    for name, rel, old, new in MUTANTS:
        path = os.path.join(work, rel)
        original = open(path, 'rb').read()
        text = original.decode('utf-8')
        crlf = '\r\n' in text
        body = text.replace('\r\n', '\n') if crlf else text
        if body.count(old) != 1:
            print('MUTANT NOT APPLIED (%d matches): %s' % (body.count(old), name)); ok = False; continue
        mutated = body.replace(old, new)
        if crlf:
            mutated = mutated.replace('\n', '\r\n')
        with open(path, 'wb') as fh:
            fh.write(mutated.encode('utf-8'))
        try:
            code, fails = run(work, args)
        finally:
            with open(path, 'wb') as fh:
                fh.write(original)
        hit = code != 0 and len(fails) > 0
        caught += 1 if hit else 0
        print('%-8s %s  (%d failing: %s)' % ('CAUGHT' if hit else 'MISSED', name, len(fails), '; '.join(fails[:3])[:300]))
        if not hit:
            ok = False
    print('mutants caught: %d/%d' % (caught, len(MUTANTS)))
    shutil.rmtree(work)
    sys.exit(0 if ok and caught == len(MUTANTS) else 1)


if __name__ == '__main__':
    main(sys.argv[1:])
