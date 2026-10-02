# =============================================================================
# W1-08 scratch - land the seven candidates in the live tree, or put the tree back
# =============================================================================
#
#   python -B apply_w1_08.py            land: every live file this package rewrites must still be byte-for-byte
#                                       the pre-image (sha1), and every new path must be absent (or already the
#                                       candidate); then each candidate is written whole, as bytes (LF)
#   python -B apply_w1_08.py --restore  refuse unless every landed file is still exactly what was landed; then
#                                       put the four pre-images back and delete the three new files
# =============================================================================

import hashlib
import json
import os
import sys

VV   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
FP   = os.path.join(VV, '02__Src__AppModules', '42__System__FloorPlanViews')
TEST = os.path.join(VV, '80__Testing__PrototypeEnvironment')
HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, 'candidates')
PRE  = os.path.join(HERE, 'preimage')

TARGETS = {
    'Na__FloorPlan__StoreyLevel__.js'           : (FP, True),
    'Na__FloorPlan__DevMenu__StoreyRow__.js'    : (FP, True),
    'Na__FloorPlan__ConfigState__.js'           : (FP, False),
    'Na__FloorPlan__ProjectJson__Data__.js'     : (FP, False),
    'Na__FloorPlan__AppConfig__.json'           : (FP, False),
    'Na__FloorPlan__Styles__DevMenu__.css'      : (FP, False),
    'Na__Test__FloorPlanStoreyLevel__.test.mjs' : (TEST, True),
}


def sha1_of(path):
    return hashlib.sha1(open(path, 'rb').read()).hexdigest()


manifest = json.load(open(os.path.join(CAND, 'manifest.json'), encoding='utf-8'))
pre      = json.load(open(os.path.join(PRE, 'preimage.json'), encoding='utf-8'))

if '--restore' in sys.argv:
    for name, (folder, is_new) in TARGETS.items():
        live = os.path.join(folder, name)
        assert os.path.exists(live) and sha1_of(live) == manifest[name]['sha1'], 'REFUSED: ' + name + ' changed since this package landed it'
    for name, (folder, is_new) in TARGETS.items():
        live = os.path.join(folder, name)
        if is_new:
            os.remove(live)
            print('removed  ', name)
        else:
            data = open(os.path.join(PRE, name), 'rb').read()
            assert hashlib.sha1(data).hexdigest() == pre[name]
            with open(live, 'wb') as f:
                f.write(data)
            print('restored ', name, pre[name][:8])
    sys.exit(0)

# Preconditions, all checked before any write
for name, (folder, is_new) in TARGETS.items():
    live = os.path.join(folder, name)
    cand = os.path.join(CAND, name)
    assert sha1_of(cand) == manifest[name]['sha1'], 'candidate changed since the build: ' + name
    if is_new:
        assert not os.path.exists(live) or sha1_of(live) == manifest[name]['sha1'], 'REFUSED: a file already exists at ' + live
    else:
        assert sha1_of(live) == pre[name], 'REFUSED: ' + name + ' changed since it was read (sha1 ' + sha1_of(live)[:8] + ')'

for name, (folder, is_new) in TARGETS.items():
    live = os.path.join(folder, name)
    data = open(os.path.join(CAND, name), 'rb').read()
    with open(live, 'wb') as f:
        f.write(data)
    assert sha1_of(live) == manifest[name]['sha1']
    print('landed   %-45s sha1 %s%s' % (name, manifest[name]['sha1'][:8], '  (new)' if is_new else '  (was ' + pre[name][:8] + ')'))
