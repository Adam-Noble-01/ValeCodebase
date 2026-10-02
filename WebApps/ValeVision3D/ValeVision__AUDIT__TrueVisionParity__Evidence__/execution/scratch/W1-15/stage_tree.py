"""Stage a minimal ValeVision tree (outside the repository) holding the W1-15 files as the
port script built them (<OS temp>/W1-15__port_out, from port_projectqr.py --dry-run), so
the ported tests can run BEFORE anything lands in the live tree.

    python -B stage_tree.py <stage root>

Layout made under <stage root>:
    WebApps/ValeVision3D/02__Src__AppModules/03__AppUtils/      (ValeVision's ProjectLoader + ResilientLoad, copied)
    WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json
    WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/   (out/)
    WebApps/ValeVision3D/80__Testing__PrototypeEnvironment/      (the two tests, out/)
    WebApps/Whitecardopedia/02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json (read-only copy)
Reads the live tree; writes only under <stage root>.
"""
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(tempfile.gettempdir(), 'W1-15__port_out')   # <-- Where port_projectqr.py builds (outside the repository)
VV   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
WCP  = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia'

QR_FILES = ['Na__ProjectQr__Encoder__.js', 'Na__ProjectQr__Painter__.js', 'Na__ProjectQr__Symbol__.js',
            'Na__ProjectQr__ProjectLink__.js', 'Na__ProjectQr__Config__.json', 'README__ProjectQrCode__.md']
TESTS    = ['Na__Test__ProjectQr__.test.mjs', 'Na__Test__ProjectQr__Decode__.py']


def copy(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(src, dst)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    root = os.path.abspath(sys.argv[1])
    app  = os.path.join(root, 'WebApps', 'ValeVision3D')
    if os.path.exists(root):
        shutil.rmtree(root)
    for name in ('Na__AppUtils__ProjectLoader.js', 'Na__AppUtils__ResilientLoad__.js'):
        copy(os.path.join(VV, '02__Src__AppModules', '03__AppUtils', name), os.path.join(app, '02__Src__AppModules', '03__AppUtils', name))
    rel = os.path.join('02__Src__AppModules', '51__System__LayoutEditor', '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json')
    copy(os.path.join(VV, rel), os.path.join(app, rel))
    for name in QR_FILES:
        copy(os.path.join(OUT, name), os.path.join(app, '02__Src__AppModules', '51__System__LayoutEditor', '53__Feature__ProjectQrCode', name))
    for name in TESTS:
        copy(os.path.join(OUT, name), os.path.join(app, '80__Testing__PrototypeEnvironment', name))
    rel = os.path.join('02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json')
    copy(os.path.join(WCP, rel), os.path.join(root, 'WebApps', 'Whitecardopedia', rel))
    print('staged under ' + root)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
