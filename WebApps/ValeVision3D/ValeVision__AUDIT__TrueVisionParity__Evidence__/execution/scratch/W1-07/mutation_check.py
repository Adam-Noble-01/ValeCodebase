# W1-07 scratch: do the ported tests (and the flag test) bite on this package's AutoSave? Each mutant is the
# candidate with one fault planted, held in a throwaway staging tree (the shipped file is never touched); every
# mutant must make at least one of its tests fail, and the unmutated control must pass them all.
#
#   python -B mutation_check.py <staging tree made by port_w1_07.py --stage>
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, 'candidates', 'Na__LayoutEditor__AutoSave__.js')
REL = os.path.join('02__Src__AppModules', '51__System__LayoutEditor', '07__Core__SheetData', 'Na__LayoutEditor__AutoSave__.js')
GUARD = ['node', '--test', os.path.join('80__Testing__PrototypeEnvironment', 'Na__Test__DraftGuard__.test.cjs')]
RESTORE = ['node', os.path.join('80__Testing__PrototypeEnvironment', 'Na__Test__DraftRestore__.test.mjs')]

MUTANTS = [
    ('the judge always restores',
     "        return (draft.base === base) ? 'restore' : 'ask';\n",
     "        return 'restore';\n", ['guard']),
    ('a draft without a base is not asked about',                       # <-- Equivalent for DraftGuard (the base it judges
     "        if (!Object.prototype.hasOwnProperty.call(draft, 'base')) return 'ask';\n",   # is never undefined there); the
     "", ['guard', 'edge']),                                             # scratch edge check judges against undefined
    ('the draft is written while it is being asked about',
     "        if (!key || Na__LeAuto__Asking || !Na__LeCfg__GetAutoSaveSetup().draftEnabled) return false;\n",
     "        if (!key || !Na__LeCfg__GetAutoSaveSetup().draftEnabled) return false;\n", ['guard']),
    ('the draft does not record its base',
     "        if (base !== undefined) draft.base = base;\n",
     "", ['guard']),
    ('the key does not wait for the sheets (1.4.0 undone)',
     "        if (!Na__DrawData__IsLoaded()) return null;\n",
     "", ['restore']),
    ('Discard leaves the draft',
     "            Na__LeAuto__ClearDraft();\n            if (typeof Na__LeAuto__ShowToast === 'function') Na__LeAuto__ShowToast(Na__LeCfg__GetLabel('DraftDiscarded'",
     "            if (typeof Na__LeAuto__ShowToast === 'function') Na__LeAuto__ShowToast(Na__LeCfg__GetLabel('DraftDiscarded'", ['guard']),
    ('no check that another project loaded while the base was asked for',
     "        if (Na__DrawData__GetBlock() !== block || Na__LeAuto__Asking) return false;",
     "        if (Na__LeAuto__Asking) return false;", ['guard']),
    ('the flag published under TrueVision\'s name',
     "        try { window.Na__Pwa__HasUnsavedWork = Na__LeAuto__HasUnsavedWork; }\n",
     "        try { window.TrueVision__Pwa__HasUnsavedWork = Na__LeAuto__HasUnsavedWork; }\n", ['flag']),
]


def run(cmd, cwd):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return p.returncode


def suite(tree, which, autosave_path):
    failed = []
    if 'guard' in which and run(GUARD, tree) != 0:
        failed.append('DraftGuard')
    if 'restore' in which and run(RESTORE, tree) != 0:
        failed.append('DraftRestore')
    if 'flag' in which and run(['node', os.path.join(HERE, 'test_autosave_flag_w1_07.mjs'), autosave_path], HERE) != 0:
        failed.append('flag')
    if 'edge' in which and run(['node', os.path.join(HERE, 'judge_edge_check.cjs'), autosave_path], HERE) != 0:
        failed.append('judge edge (scratch)')
    return failed


def main(stage):
    text = open(CAND, 'rb').read().decode('utf-8')
    work = tempfile.mkdtemp(prefix='w1-07-mutants-')
    tree = os.path.join(work, 'tree')
    shutil.copytree(stage, tree)
    target = os.path.join(tree, REL)
    caught = 0
    control = suite(tree, ['guard', 'restore', 'flag', 'edge'], target)
    print('control (unmutated): %s' % ('all pass' if not control else 'FAILED: ' + ', '.join(control)))
    for name, old, new, which in MUTANTS:
        if text.count(old) != 1:
            print('  SKIP  %s (pattern matched %d times)' % (name, text.count(old)))
            continue
        with open(target, 'wb') as fh:
            fh.write(text.replace(old, new).encode('utf-8'))
        failed = suite(tree, which, target)
        caught += bool(failed)
        print('  %s  %-62s %s' % ('CAUGHT' if failed else 'MISSED', name, ', '.join(failed)))
    with open(target, 'wb') as fh:
        fh.write(text.encode('utf-8'))
    shutil.rmtree(work, ignore_errors=True)
    print('%d/%d mutants caught; control %s' % (caught, len(MUTANTS), 'clean' if not control else 'NOT clean'))
    sys.exit(0 if caught == len(MUTANTS) and not control else 1)


if __name__ == '__main__':
    main(sys.argv[1])
