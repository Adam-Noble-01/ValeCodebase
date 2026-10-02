# W1-08 scratch: prove G2 (Na__Verify__Exports__.mjs, the live verifier copied unchanged) resolves the five
# storey names against the LANDED data module - and that it bites on a misspelt one. Runs in a throwaway
# replica root (the verifier finds its app root from its own location), never in the live tree.
import os
import shutil
import subprocess
import sys

VV   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
REP  = os.path.join(HERE, 'g2_probe_root')

NAMES = [ 'Na__FpData__GetStoreyLevel', 'Na__FpData__IsStoreyLevelSet', 'Na__FpData__GetStoreyLevelChoices',
          'Na__FpData__SetStoreyLevel', 'Na__FpData__STOREY_CHANGED_EVENT' ]


def probe(names):
    return ('import {\n' + ',\n'.join('    ' + n for n in names) + '\n} from \'../42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js\';\n'
            + 'export {\n' + ',\n'.join('    ' + n for n in names) + '\n};\n')


def run(names, label):
    if os.path.exists(REP):
        shutil.rmtree(REP)
    os.makedirs(os.path.join(REP, '02__Src__AppModules', '42__System__FloorPlanViews'))
    os.makedirs(os.path.join(REP, '02__Src__AppModules', '99__Probe'))
    os.makedirs(os.path.join(REP, '80__Testing__PrototypeEnvironment'))
    shutil.copyfile(os.path.join(VV, '02__Src__AppModules', '42__System__FloorPlanViews', 'Na__FloorPlan__ProjectJson__Data__.js'),
                    os.path.join(REP, '02__Src__AppModules', '42__System__FloorPlanViews', 'Na__FloorPlan__ProjectJson__Data__.js'))
    shutil.copyfile(os.path.join(VV, '80__Testing__PrototypeEnvironment', 'Na__Verify__Exports__.mjs'),
                    os.path.join(REP, '80__Testing__PrototypeEnvironment', 'Na__Verify__Exports__.mjs'))
    with open(os.path.join(REP, '02__Src__AppModules', '99__Probe', 'Na__Probe__StoreyApi__.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(probe(names))
    result = subprocess.run(['node', '80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs', '99__Probe'], cwd=REP, capture_output=True, text=True)
    lines = [l for l in result.stdout.splitlines() if l.strip()]
    print('%-40s exit %d' % (label, result.returncode))
    for l in lines[-6:]:
        print('    ' + l)
    return result.returncode


good = run(NAMES, 'the five storey names')
bad  = run(NAMES[:-1] + [ 'Na__FpData__STOREY_CHANGE_EVENT' ], 'one misspelt (planted)')
shutil.rmtree(REP)
print('\nG2 probe: %s' % ('PASS (the five resolve; the misspelt one fails)' if good == 0 and bad == 1 else 'UNEXPECTED'))
sys.exit(0 if good == 0 and bad == 1 else 1)
