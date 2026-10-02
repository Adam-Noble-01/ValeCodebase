# W1-32 scratch: a mirror tree just big enough for Na__Test__DocumentKeys__, with a chosen mode controller.
# usage: python make_test_mirror.py <mirror folder> <mode controller file> <test file>
import os
import shutil
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
FILES = [
    '02__Src__AppModules/03__AppUtils/Na__AppUtils__KeyScope__.js',
    '02__Src__AppModules/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js',
    '02__Src__AppModules/02__AppData/Na__Hotkeys__3dModelTab__.json',
    '02__Src__AppModules/51__System__LayoutEditor/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js',
    '02__Src__AppModules/51__System__LayoutEditor/31__System__DocumentKeys/Na__Hotkeys__DocumentTabs__.json',
]
MODE = '02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js'
TEST = '80__Testing__PrototypeEnvironment/Na__Test__DocumentKeys__.test.mjs'

mirror, mode_src, test_src = sys.argv[1], sys.argv[2], sys.argv[3]
if os.path.exists(mirror):
    shutil.rmtree(mirror)
for rel in FILES:
    dst = os.path.join(mirror, rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(os.path.join(VV, rel.replace('/', os.sep)), dst)
for rel, src in ((MODE, mode_src), (TEST, test_src)):
    dst = os.path.join(mirror, rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(src, dst)
print('mirror ready (no package.json, as the live tree has none): ' + mirror)
