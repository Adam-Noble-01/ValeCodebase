# =============================================================================
# W1-12 SCRATCH - LAND (or restore) THE THREE FILES
# =============================================================================
#
#   python -B apply_w1_12.py            land: every live file must still be what was read
#                                       (sha1), the test page must not exist yet; each file
#                                       is written in one whole write, candidate bytes as built
#   python -B apply_w1_12.py --restore  put the two hot files back from preimage/ and remove the
#                                       new test page - only if all three are still exactly what
#                                       this script landed
#
# =============================================================================

import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP  = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'

TARGETS = [
    {   # the drawings data module (LF, as W1-05 wrote it)
        'live'      : os.path.join(APP, r'02__Src__AppModules\40__System__DrawingViewCore\Na__DrawView__ProjectData__.js'),
        'candidate' : os.path.join(HERE, 'candidate__Na__DrawView__ProjectData__.js'),
        'preimage'  : os.path.join(HERE, 'preimage', 'Na__DrawView__ProjectData__.js'),
        'before'    : '5b35803a6d1e6d044f9cd7a16172a03bdda2eb9a',
    },
    {   # the project record (CRLF, its own line ending)
        'live'      : os.path.join(APP, r'02__Src__AppModules\51__System__LayoutEditor\07__Core__SheetData\Na__LayoutEditor__ProjectRecord__.js'),
        'candidate' : os.path.join(HERE, 'candidate__Na__LayoutEditor__ProjectRecord__.js'),
        'preimage'  : os.path.join(HERE, 'preimage', 'Na__LayoutEditor__ProjectRecord__.js'),
        'before'    : 'd0b847edcae6166d035e29bc836cad817ba66b09',
    },
    {   # the ported test page (new, LF)
        'live'      : os.path.join(APP, r'80__Testing__PrototypeEnvironment\Na__Test__ProjectRecordAddress__.html'),
        'candidate' : os.path.join(HERE, 'candidate__Na__Test__ProjectRecordAddress__.html'),
        'preimage'  : None,
        'before'    : None,                                          # <-- must not exist
    },
]


def sha1_of(path):
    return hashlib.sha1(open(path, 'rb').read()).hexdigest() if os.path.exists(path) else None


def land():
    for t in TARGETS:                                               # <-- every precondition first, nothing written until all hold
        now = sha1_of(t['live'])
        if now != t['before']:
            sys.exit('STOP: %s is %s, expected %s - nothing written' % (t['live'], now, t['before']))
        if t['preimage'] and sha1_of(t['preimage']) != t['before']:
            sys.exit('STOP: preimage missing or wrong for %s - nothing written' % t['live'])
    for t in TARGETS:
        data = open(t['candidate'], 'rb').read()
        open(t['live'], 'wb').write(data)                           # <-- one whole write
        print('landed  %-60s sha1 %s  (%d bytes)' % (os.path.basename(t['live']), hashlib.sha1(data).hexdigest(), len(data)))


def restore():
    for t in TARGETS:
        if sha1_of(t['live']) != sha1_of(t['candidate']):
            sys.exit('STOP: %s is no longer what W1-12 landed - restore by hand - nothing written' % t['live'])
    for t in TARGETS:
        if t['preimage']:
            open(t['live'], 'wb').write(open(t['preimage'], 'rb').read())
            print('restored %s' % t['live'])
        else:
            os.remove(t['live'])
            print('removed  %s' % t['live'])


if __name__ == '__main__':
    restore() if '--restore' in sys.argv else land()
