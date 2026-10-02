# W1-23 - the harness must catch the signature trap, not pass by accident.
# Each mutant mixes old and new files (or plants a fault in a copy of a candidate) and must be CAUGHT:
# its scenario log differs from the before-set's, or a contract check fails. The control (all candidate)
# must match and pass. Writes nothing outside scratch/W1-23 (mutant copies in scratch/W1-23/mutants/).
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SNAP = 'Na__LayoutEditor__SnapshotRenderer__.js'
WIN = 'Na__LayoutEditor__Viewport2d__Window__.js'
FRAME = 'Na__LayoutEditor__Viewport2d__Frame__.js'
VP3 = 'Na__LayoutEditor__Viewport3d__.js'
VP2 = 'Na__LayoutEditor__Viewport2d__.js'
LINE = 'Na__LayoutEditor__Viewport2d__Linework__.js'
PDF = 'Na__LayoutEditor__PdfExporter__.js'


def plant(folder, leaf, old, new):
    os.makedirs(os.path.join(HERE, folder), exist_ok=True)
    text = open(os.path.join(HERE, 'candidate', leaf), 'rb').read().decode('utf-8')
    if text.count(old) != 1:
        raise SystemExit('cannot plant in %s: anchor found %d times' % (leaf, text.count(old)))
    open(os.path.join(HERE, folder, leaf), 'wb').write(text.replace(old, new).encode('utf-8'))


# Planted faults in copies of the candidates
plant('mutants/noguard', SNAP, "        if (depthFog) return Promise.resolve(null);", "        // guard removed")
plant('mutants/nullsource', WIN, "modelSource : Na__LeVp2d__LiveModelSource() };", "modelSource : null };")
plant('mutants/swapped3d', VP3, "renderId, view, stillWanted);", "renderId, stillWanted, view);")
plant('mutants/stillninth', FRAME, "phaseId, () => !state.parked)", "() => !state.parked, phaseId)")

CASES = [
    ('control: every file the candidate', '', False),
    ('SnapshotRenderer new, every caller old (callers not moved)', ','.join(l + '=before' for l in (WIN, FRAME, LINE, VP2, VP3, PDF)), True),
    ('SnapshotRenderer old, every caller new', SNAP + '=before', True),
    ('Viewport3d old (view window and stillWanted one slot early)', VP3 + '=before', True),
    ('Frame old (stillWanted in the design phase slot)', FRAME + '=before', True),
    ('Window old (Describe without modelSource)', WIN + '=before', True),
    ('planted: depth fog guard removed', SNAP + '=mutants/noguard', True),
    ('planted: Describe modelSource null', WIN + '=mutants/nullsource', True),
    ('planted: Viewport3d passes stillWanted before the window', VP3 + '=mutants/swapped3d', True),
    ('planted: Frame passes stillWanted ninth again', FRAME + '=mutants/stillninth', True),
]

before = os.path.join(HERE, 'harness__before.json')
results = []
for index, (name, mix, expect_caught) in enumerate(CASES):
    out = os.path.join(HERE, 'mutants', 'harness__case%02d.json' % index)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cmd = ['node', os.path.join(HERE, 'w1_23_harness.mjs'), '--set', 'candidate', '--out', out]
    if mix:
        cmd += ['--mix', mix]
    run = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    contract_failed = run.returncode != 0
    cmp = subprocess.run(['node', os.path.join(HERE, 'w1_23_harness.mjs'), 'compare', before, out], capture_output=True, text=True)
    differs = cmp.returncode != 0
    caught = contract_failed or differs
    ok = caught == expect_caught
    first = cmp.stdout.strip().splitlines()
    detail = first[0] if first else ''
    fails = [l.strip() for l in run.stdout.splitlines() if l.strip().startswith('FAIL')]
    results.append(ok)
    print('%s  %-62s caught=%-5s (log %s; contract %s)' % ('OK  ' if ok else 'BAD ', name, caught, 'differs' if differs else 'identical', 'FAILED' if contract_failed else 'pass/skip'))
    if differs:
        print('        ' + detail[:220])
    for f in fails[:3]:
        print('        ' + f[:220])

print('')
print('%d/%d cases as expected (control matches; every mutant caught)' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
