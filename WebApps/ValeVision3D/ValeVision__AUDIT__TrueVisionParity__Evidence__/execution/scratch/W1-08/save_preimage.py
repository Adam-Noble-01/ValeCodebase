# W1-08 scratch: keep the four live files this package rewrites exactly as they were before any write
# (sha1-checked against the baseline), so the old module can be compared with the new one and
# apply_w1_08.py --restore can put them back.
import hashlib
import json
import os
import shutil

VV   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
FP   = os.path.join(VV, '02__Src__AppModules', '42__System__FloorPlanViews')
HERE = os.path.dirname(os.path.abspath(__file__))
PRE  = os.path.join(HERE, 'preimage')

BASE = {
    'Na__FloorPlan__AppConfig__.json'       : 'd9ace0c3',
    'Na__FloorPlan__ConfigState__.js'       : 'afc76ef8',
    'Na__FloorPlan__ProjectJson__Data__.js' : '3d3e538b',
    'Na__FloorPlan__Styles__DevMenu__.css'  : '5fd866fa',
}

os.makedirs(PRE, exist_ok=True)
record = {}
for name, prefix in BASE.items():
    data = open(os.path.join(FP, name), 'rb').read()
    digest = hashlib.sha1(data).hexdigest()
    assert digest.startswith(prefix), name + ' changed since the baseline'
    target = os.path.join(PRE, name)
    if os.path.exists(target):
        assert hashlib.sha1(open(target, 'rb').read()).hexdigest() == digest, 'preimage differs: ' + name
    else:
        shutil.copyfile(os.path.join(FP, name), target)
    record[name] = digest
    print(name, digest)
with open(os.path.join(PRE, 'preimage.json'), 'w', encoding='utf-8') as f:
    json.dump(record, f, indent=2)
