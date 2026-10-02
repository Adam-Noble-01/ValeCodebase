"""W3-17 port: AreaSchedule element + its test, from TrueVision at pin b2aa9151.

Reads TV's bytes via git show (LF), re-applies only the K2 seams (banner H1,
PORT NOTE H5, test console line C1-style), and writes the two NEW VV files.
Refuses to overwrite a file that already exists.
"""
import os
import subprocess
import sys

PIN = 'b2aa9151'
TV_GIT = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'

MOD_REL = '02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__AreaSchedule__.js'
TEST_REL = '80__Testing__PrototypeEnvironment/Na__Test__AreaSchedule__.test.mjs'


def tv_bytes(rel):
    return subprocess.run(['git', '-C', TV_GIT, 'show', PIN + ':' + TV_APP + rel],
                          check=True, capture_output=True).stdout


def replace_once(data, old, new, label):
    n = data.count(old)
    if n != 1:
        sys.exit('ABORT: %s found %d times' % (label, n))
    return data.replace(old, new)


# ---------------------------------------------------------------- module
mod = tv_bytes(MOD_REL)
assert b'\r' not in mod
mod = replace_once(mod,
    b'// TRUEVISION3D - LAYOUT EDITOR - PARAMETRIC SCRAPBOOK - AREA SCHEDULE\n',
    b'// VALEVISION3D - LAYOUT EDITOR - PARAMETRIC SCRAPBOOK - AREA SCHEDULE\n',
    'module banner')

OLD_PN = (b'// PORT NOTE:\n'
          b'// - Authored in   : TrueVision3D first (21-Sep-2026)\n'
          b'// - ValeVision    : not yet ported - it goes with the rest of Floor Areas.\n')
NEW_PN = (
    '// PORT NOTE:\n'
    '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__AreaSchedule__.js\n'
    '// - Source version: 1.1.0 (TrueVision3D v2.148.0, 22-Sep-2026; 1.0.0 came with v2.104.0, 21-Sep-2026;\n'
    '//                   read at b2aa9151)\n'
    '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-17}} - new in this app, the whole file.\n'
    '//                   Neither TrueVision release is recorded as tried by Adam in TrueVision: ported\n'
    '//                   under DR-01 (c) and named in the Port Record. Floor Areas is DR-14 (A).\n'
    '// - Parity        : verbatim, and inert: nothing imports it until the parametric panel registers\n'
    '//                   it with the config\'s AreaSchedule block and its three tiles (W3-14).\n'
    '//                   Na__Test__AreaSchedule__ proves it in Node.\n'
    '// - Divergences   :\n'
    '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
    '// - Back-port     : none.\n'
).encode('utf-8')
mod = replace_once(mod, OLD_PN, NEW_PN, 'module PORT NOTE')

# ---------------------------------------------------------------- test
test = tv_bytes(TEST_REL)
assert b'\r' not in test
test = replace_once(test,
    b'// TRUEVISION3D - TEST - PARAMETRIC SCRAPBOOK - AREA SCHEDULE\n',
    b'// VALEVISION3D - TEST - PARAMETRIC SCRAPBOOK - AREA SCHEDULE\n',
    'test banner')
test = replace_once(test,
    b"console.log('TrueVision3D - parametric scrapbook area schedule');",
    b"console.log('ValeVision3D - parametric scrapbook area schedule');",
    'test console title')

OLD_DL = (b'//   Exit 0 = every check passed. Exit 1 = at least one did not.\n'
          b'//\n'
          b'// -----------------------------------------------------------------------------\n'
          b'//\n'
          b'// DEVELOPMENT LOG:\n')
NEW_DL = (
    '//   Exit 0 = every check passed. Exit 1 = at least one did not.\n'
    '//\n'
    '// -----------------------------------------------------------------------------\n'
    '//\n'
    '// PORT NOTE:\n'
    '// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__AreaSchedule__.test.mjs\n'
    '// - Source version: 1.0.0 (written with TrueVision3D v2.104.0, 21-Sep-2026; the project form and\n'
    '//                   title floor checks of v2.148.0, 22-Sep-2026, came in under the same 1.0.0 -\n'
    '//                   git a2e0a836; read at b2aa9151)\n'
    '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-17}}, with the Area Schedule module\n'
    '// - Parity        : verbatim - every check is TrueVision\'s, run against this app\'s own copy of\n'
    '//                   the Area Schedule module, the parametric scrapbook config and the Floor Areas\n'
    '//                   Geometry module. The config checks read the AreaSchedule block and its three\n'
    '//                   tiles, which arrive with the parametric panel and config (W3-14).\n'
    '// - Divergences   :\n'
    '//   - Banner and the console title read ValeVision3D.\n'
    '// - Back-port     : none.\n'
    '//\n'
    '// -----------------------------------------------------------------------------\n'
    '//\n'
    '// DEVELOPMENT LOG:\n'
).encode('utf-8')
test = replace_once(test, OLD_DL, NEW_DL, 'test PORT NOTE insertion')

# ---------------------------------------------------------------- write
for rel, data in ((MOD_REL, mod), (TEST_REL, test)):
    path = os.path.join(VV, rel.replace('/', os.sep))
    if os.path.exists(path):
        sys.exit('ABORT: target already exists: ' + path)
for rel, data in ((MOD_REL, mod), (TEST_REL, test)):
    path = os.path.join(VV, rel.replace('/', os.sep))
    with open(path, 'wb') as fh:
        fh.write(data)
    print('wrote', path, len(data), 'bytes')
