# W1-08 scratch: plant one fault at a time in a copy of the data module and prove w1_08_check.mjs catches it.
# Usage: python -B w1_08_mutants.py [--live]   (--live mutates the landed file's copy instead of the candidate)
import os
import subprocess
import sys

HERE  = os.path.dirname(os.path.abspath(__file__))
VV    = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
LIVE  = '--live' in sys.argv
SRC   = (os.path.join(VV, '02__Src__AppModules', '42__System__FloorPlanViews', 'Na__FloorPlan__ProjectJson__Data__.js') if LIVE
         else os.path.join(HERE, 'candidates', 'Na__FloorPlan__ProjectJson__Data__.js'))
MUT   = os.path.join(HERE, 'mutants')
CHECK = os.path.join(HERE, 'w1_08_check.mjs')

text = open(SRC, 'rb').read().decode('utf-8')

MUTANTS = [
    ('CreatePlan writes into the first argument (the old ValeVision convention)',
     '    function Na__FpData__EnsureArray(sceneConfig) {\n        return Na__DrawData__GetFloorPlansArray();',
     '    function Na__FpData__EnsureArray(sceneConfig) {\n        if (sceneConfig && typeof sceneConfig === \'object\') { if (!Array.isArray(sceneConfig.LayoutEditor__DrawingsData__FloorPlans)) sceneConfig.LayoutEditor__DrawingsData__FloorPlans = []; return sceneConfig.LayoutEditor__DrawingsData__FloorPlans; }\n        return Na__DrawData__GetFloorPlansArray();'),
    ('GetFloorPlans reads a block handed in as the first argument',
     '        const raw = Na__DrawData__GetFloorPlansArray();',
     '        const raw = (sceneConfig && Array.isArray(sceneConfig.LayoutEditor__DrawingsData__FloorPlans)) ? sceneConfig.LayoutEditor__DrawingsData__FloorPlans : Na__DrawData__GetFloorPlansArray();'),
    ('GetStoreyLevel writes its guess onto the record',
     '        return Na__FpLevel__Resolve(\n            plan[Na__FpData__PLAN_STOREY],',
     '        plan[Na__FpData__PLAN_STOREY] = plan[Na__FpData__PLAN_STOREY] || \'ground\';\n        return Na__FpLevel__Resolve(\n            plan[Na__FpData__PLAN_STOREY],'),
    ('SetStoreyLevel announces nothing',
     '            window.dispatchEvent(new CustomEvent(Na__FpData__STOREY_CHANGED_EVENT, {',
     '            if (false) window.dispatchEvent(new CustomEvent(Na__FpData__STOREY_CHANGED_EVENT, {'),
    ('the storey event is misnamed',
     "const Na__FpData__STOREY_CHANGED_EVENT = 'na-floorplan-storey-changed';",
     "const Na__FpData__STOREY_CHANGED_EVENT = 'na-floorplan-storey-change';"),
    ('SetStoreyLevel stores an empty string instead of taking the key off',
     "        if (wanted === '') delete plan[Na__FpData__PLAN_STOREY];",
     "        if (wanted === '') plan[Na__FpData__PLAN_STOREY] = '';"),
    ('SetStoreyLevel accepts a key that names no storey',
     "        if (wanted !== '' && !Na__FpLevel__IsKey(wanted, Na__FpCfg__GetStoreyLevelSetup())) return false;",
     "        if (false) return false;"),
    ('STYLE_KEYS is no longer exported (K2 X2 seam lost)',
     '        Na__FpData__STYLE_KEYS,',
     ''),
    ('the Dimensions default is lost from the normaliser',
     '        if (!Array.isArray(plan[Na__FpData__PLAN_DIMENSIONS])) {',
     '        if (false) {'),
    ('the Dimensions default is lost from CreatePlan',
     '        plan[Na__FpData__PLAN_DIMENSIONS]  = [];',
     '        // (lost)'),
    ('the trimmed exclusion tokens are lost',
     '            ? tokens.map((t) => String(t).trim()).filter((t) => t.length > 0)',
     '            ? tokens.slice()'),
    ('SetClientDimensionsEnabled ignores its second argument',
     '        return Na__DrawData__SetClientDimensionsEnabled(enabled === true);',
     '        return Na__DrawData__SetClientDimensionsEnabled(sceneConfig === true);'),
    ('CreatePlan forgets the config default cut offset',
     '        plan[Na__FpData__PLAN_CUT_OFFSET]  = Number.isFinite(opts.cutOffsetMm)  ? opts.cutOffsetMm  : cutOffset.defaultMm;',
     '        plan[Na__FpData__PLAN_CUT_OFFSET]  = Number.isFinite(opts.cutOffsetMm)  ? opts.cutOffsetMm  : 1000;'),
]

os.makedirs(MUT, exist_ok=True)
caught = 0
for index, (label, old, new) in enumerate(MUTANTS, 1):
    assert text.count(old) == 1, 'anchor not unique for mutant: ' + label
    path = os.path.join(MUT, 'mutant_%02d__Na__FloorPlan__ProjectJson__Data__.js' % index)
    with open(path, 'wb') as f:
        f.write(text.replace(old, new).encode('utf-8'))
    run = subprocess.run(['node', CHECK, '--quiet', '--data', path] + (['--live'] if LIVE else []), capture_output=True, text=True)
    failed = [l.strip() for l in run.stdout.splitlines() if l.strip().startswith('FAIL ')]
    ok = run.returncode == 1 and failed
    caught += 1 if ok else 0
    print('%-4s %-72s exit %d  %s' % ('OK' if ok else 'MISS', label, run.returncode, (failed[0][:90] if failed else run.stdout.strip()[-120:])))
print('\n%d / %d planted faults caught' % (caught, len(MUTANTS)))
for name in os.listdir(MUT):
    os.remove(os.path.join(MUT, name))
os.rmdir(MUT)
sys.exit(0 if caught == len(MUTANTS) else 1)
