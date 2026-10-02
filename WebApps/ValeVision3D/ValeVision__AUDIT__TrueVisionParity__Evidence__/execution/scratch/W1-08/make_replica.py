# W1-08 scratch: a replica app root holding the live 42__System__FloorPlanViews folder with the
# candidates laid over it, the ported test, and the folder registry - so the test and the G4 verifiers
# (--root) can run on exactly what would land, before anything lands.
import os
import shutil

VV   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, 'candidates')
REP  = os.path.join(HERE, 'replica')

if os.path.exists(REP):
    shutil.rmtree(REP)
fp_live = os.path.join(VV, '02__Src__AppModules', '42__System__FloorPlanViews')
fp_rep  = os.path.join(REP, '02__Src__AppModules', '42__System__FloorPlanViews')
shutil.copytree(fp_live, fp_rep)
tests = os.path.join(REP, '80__Testing__PrototypeEnvironment')
os.makedirs(tests)
for name in os.listdir(CAND):
    if name == 'manifest.json':
        continue
    target = tests if name.startswith('Na__Test__') else fp_rep
    shutil.copyfile(os.path.join(CAND, name), os.path.join(target, name))
registry = os.path.join(VV, 'ValeVision__NOTES__FolderNumberRegistry__.md')
if os.path.exists(registry):
    shutil.copyfile(registry, os.path.join(REP, 'ValeVision__NOTES__FolderNumberRegistry__.md'))
for root, dirs, files in os.walk(REP):
    for f in files:
        print(os.path.relpath(os.path.join(root, f), REP))
