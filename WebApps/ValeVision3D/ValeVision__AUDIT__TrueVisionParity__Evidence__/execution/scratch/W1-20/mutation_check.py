# -*- coding: utf-8 -*-
# W1-20 scratch: prove the harness bites. Each mutant plants one fault in a COPY of the new units (in the OS temp
# folder) - most of them put back a line of this app's old units - and the harness must fail on it; the
# unmutated control must pass. Nothing in the repository is touched.
#
#   python -B mutation_check.py <new units dir> <old units dir> <tv units dir>

import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
HARNESS = os.path.join(HERE, 'harness_w1_20.mjs')

MUTANTS = [
    ('PruneGroups forgets leaders (the old exists())', 'Na__LayoutEditor__SheetModel__Groups__.js',
     "            if (kind === 'leader')     return !!(sheet.Sheet__Leaders || []).some((l) => l.Leader__Id === id);\n", ''),
    ('PruneGroups forgets viewports', 'Na__LayoutEditor__SheetModel__Groups__.js',
     "            if (kind === 'viewport')   return !!(sheet.Sheet__Viewports || []).some((v) => v.Viewport__Id === id);\n", ''),
    ('PruneGroups forgets dimensions', 'Na__LayoutEditor__SheetModel__Groups__.js',
     "            if (kind === 'dimension')  return !!(sheet.Sheet__Dimensions || []).some((d) => d.Dimension__Id === id);\n", ''),
    ('DeleteLayer re-homes no shapes (this app\'s 1.0.0)', 'Na__LayoutEditor__SheetModel__Layers__.js',
     "            s.Shape__LayerId = Na__LeModel__DefaultLayerId(sheet, image ? 'image' : (area ? 'area' : 'vector'));",
     "            s.Shape__LayerId = s.Shape__LayerId;"),
    ('InsertShape throws its fallback away (this app\'s 1.0.0)', 'Na__LayoutEditor__SheetModel__Shapes__.js',
     "        item.Shape__LayerId = layerId;                                           // <-- Written here",
     "        void layerId;                                                            // <-- Written here"),
    ('DeleteLeader does not prune', 'Na__LayoutEditor__SheetModel__Leaders__.js',
     "        Na__LeModel__PruneGroups(sheet);                                        // <-- A group that held it lets it go; one left with one member dissolves\n", ''),
    ('DeleteDimension does not prune', 'Na__LayoutEditor__SheetModel__TextAndDimensions__.js',
     "        Na__LeModel__PruneGroups(sheet);                                        // <-- A group that held it lets it go; one left with one member dissolves\n", ''),
    ('DeleteViewport does not prune', 'Na__LayoutEditor__SheetModel__Viewports__.js',
     "        Na__LeModel__PruneGroups(sheet);                                        // <-- A group that held it lets it go; one left with one member dissolves\n", ''),
    ('Dispatch does not move the Revision', 'Na__LayoutEditor__SheetModel__State__.js',
     "        Na__LeModel__Revision += 1;\n", ''),
    ('UpdateViewport ignores hideSwings null', 'Na__LayoutEditor__SheetModel__Viewports__.js',
     "        else if (patch.hideSwings === null) delete viewport.Viewport__HideSwings;", "        else if (patch.hideSwings === null) void 0;"),
    ('UpdateLayer does not trim the selection', 'Na__LayoutEditor__SheetModel__Layers__.js',
     "        if (patch.visible === false || patch.selectable === false) Na__LeModel__DropUnpickable(sheet);\n", ''),
    ('RenameAreaGroup leaves its rooms behind', 'Na__LayoutEditor__SheetModel__AreaGroups__.js',
     "            if (Na__LeModel__AreaGroupKey(shape.Shape__Area.Area__Group) === was) shape.Shape__Area.Area__Group = clean;",
     "            if (false) shape.Shape__Area.Area__Group = clean;"),
    ('CreateDimension forgets the line weight', 'Na__LayoutEditor__SheetModel__TextAndDimensions__.js',
     "        if (Number.isFinite(opts.linePt)) record.Dimension__LinePt = opts.linePt;", "        if (false) record.Dimension__LinePt = opts.linePt;"),
    ('UpdateShape replaces the hatch instead of merging it', 'Na__LayoutEditor__SheetModel__Shapes__.js',
     "                ? Object.assign({}, item.Shape__Hatch, patch.hatch)", "                ? Object.assign({}, patch.hatch)"),
]


def run(new_dir, old_dir, tv_dir):
    out = subprocess.run(['node', HARNESS, '--new', new_dir, '--old', old_dir, '--tv', tv_dir], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    tail = out.stdout.decode('utf-8', 'replace').strip().split('\n')[-1]
    return out.returncode, tail


def main(argv):
    new_dir, old_dir, tv_dir = argv[0], argv[1], argv[2]
    code, tail = run(new_dir, old_dir, tv_dir)
    print('control (unmutated)  exit %d  %s' % (code, tail[:160]))
    problems = 0 if code == 0 else 1
    for name, fname, old, new in MUTANTS:
        tmp = tempfile.mkdtemp(prefix='w1-20-mutant-')
        try:
            for f in os.listdir(new_dir):
                shutil.copy2(os.path.join(new_dir, f), os.path.join(tmp, f))
            path = os.path.join(tmp, fname)
            text = open(path, 'r', encoding='utf-8').read()
            if text.count(old) != 1:
                print('MUTANT NOT APPLIED (%d matches): %s' % (text.count(old), name)); problems += 1; continue
            with open(path, 'w', encoding='utf-8', newline='\n') as fh:
                fh.write(text.replace(old, new))
            code, tail = run(tmp, old_dir, tv_dir)
            caught = code != 0
            if not caught:
                problems += 1
            print('%-8s exit %d  %-58s %s' % ('caught' if caught else 'MISSED', code, name, tail[:150]))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    print('mutation check: %d problem(s) over %d mutants and the control' % (problems, len(MUTANTS)))
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main(sys.argv[1:])
