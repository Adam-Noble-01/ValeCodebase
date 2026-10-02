"""W3-17 staged harness: run VV's Na__Test__AreaSchedule__ against VV's module and
VV's Floor Areas Geometry, with a parametric config that carries what W3-14 will
bring (TV's AreaSchedule block + its three tiles + TypeName, read at b2aa9151).

Mode 'merged': VV's live config + TV's AreaSchedule pieces only.
Mode 'tv'    : TV's whole config at the pin.
Nothing in the live tree is written.
"""
import json
import os
import shutil
import subprocess
import sys

PIN = 'b2aa9151'
TV_GIT = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))

P57 = '02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/'
P59 = '02__Src__AppModules/51__System__LayoutEditor/59__Feature__FloorAreas/'
MOD = P57 + 'Na__LayoutEditor__ScrapbookParametric__AreaSchedule__.js'
CFG = P57 + 'Na__LayoutEditor__ScrapbookParametric__Config__.json'
GEO = P59 + 'Na__LayoutEditor__FloorAreas__Geometry__.js'
TEST = '80__Testing__PrototypeEnvironment/Na__Test__AreaSchedule__.test.mjs'


def tv(rel):
    return subprocess.run(['git', '-C', TV_GIT, 'show', PIN + ':' + TV_APP + rel],
                          check=True, capture_output=True).stdout


def place(root, rel, data):
    path = os.path.join(root, rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as fh:
        fh.write(data)


def vv(rel):
    with open(os.path.join(VV, rel.replace('/', os.sep)), 'rb') as fh:
        return fh.read()


def build(mode):
    root = os.path.join(HERE, 'harness_' + mode)
    shutil.rmtree(root, ignore_errors=True)
    for rel in (MOD, GEO, TEST):
        place(root, rel, vv(rel))
    tv_cfg = json.loads(tv(CFG).decode('utf-8'))
    if mode == 'tv':
        cfg = tv_cfg
    else:
        cfg = json.loads(vv(CFG).decode('utf-8'))
        cfg['LayoutEditor__ScrapbookParametric__AreaSchedule'] = tv_cfg['LayoutEditor__ScrapbookParametric__AreaSchedule']
        el = cfg['LayoutEditor__ScrapbookParametric__Elements']
        el['Elements__TypeNames']['AreaSchedule'] = tv_cfg['LayoutEditor__ScrapbookParametric__Elements']['Elements__TypeNames']['AreaSchedule']
        el['Elements__List'] = [e for e in el['Elements__List'] if e.get('Element__Type') != 'AreaSchedule'] + \
            [e for e in tv_cfg['LayoutEditor__ScrapbookParametric__Elements']['Elements__List'] if e.get('Element__Type') == 'AreaSchedule']
    place(root, CFG, json.dumps(cfg, indent=4, ensure_ascii=False).encode('utf-8'))
    r = subprocess.run(['node', os.path.join(root, TEST.replace('/', os.sep))], capture_output=True, text=True, encoding='utf-8')
    out = r.stdout + r.stderr
    passes = out.count('  PASS  ')
    fails = out.count('  FAIL  ')
    print('[%s] exit=%d pass=%d fail=%d' % (mode, r.returncode, passes, fails))
    for line in out.splitlines():
        if 'FAIL' in line or 'Error' in line:
            print('   ', line)
    print('   ', out.strip().splitlines()[-1] if out.strip() else '(no output)')
    shutil.rmtree(root, ignore_errors=True)
    return r.returncode


# Geometry drift check: VV's Geometry vs TV's at the pin (the formatter check depends on it)
tv_geo = tv(GEO).replace(b'\r\n', b'\n')
vv_geo = vv(GEO).replace(b'\r\n', b'\n')
body = lambda b: b[b.find(b'// endregion'):] if b.find(b'// endregion') >= 0 else b
print('Geometry body identical to TV after the header:', body(tv_geo) == body(vv_geo))

codes = [build('merged'), build('tv')]
sys.exit(0 if all(c == 0 for c in codes) else 1)
