# W2-09 scratch: complete the rehearsal tree with the one live file the test reads but the package does
# not write (the Layout Editor AppConfig), and build a "before" tree: the same ported test run against
# this app's pre-port Enhance 1.0.0, Render Composites 1.1.0 and config Meta 1.2.0 (it must fail there).
import os
import shutil

HERE   = os.path.dirname(os.path.abspath(__file__))
VV_APP = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
LE     = os.path.join('02__Src__AppModules', '51__System__LayoutEditor')
CFG    = os.path.join(LE, '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json')
STYLES = os.path.join(LE, '25__System__RenderStyles')
TEST   = os.path.join('80__Testing__PrototypeEnvironment', 'Na__Test__EnhanceWhitecardStrength__.test.mjs')

for tree in ('rehearsal', 'before'):
    root = os.path.join(HERE, tree)
    os.makedirs(os.path.join(root, os.path.dirname(CFG)), exist_ok=True)
    shutil.copyfile(os.path.join(VV_APP, CFG), os.path.join(root, CFG))

before = os.path.join(HERE, 'before')
os.makedirs(os.path.join(before, STYLES), exist_ok=True)
os.makedirs(os.path.join(before, os.path.dirname(TEST)), exist_ok=True)
for name in ('Na__LayoutEditor__Enhance__.js', 'Na__LayoutEditor__RenderComposites__.js', 'Na__LayoutEditor__RenderComposites__Config__.json'):
    shutil.copyfile(os.path.join(HERE, 'vv_before', name), os.path.join(before, STYLES, name))
shutil.copyfile(os.path.join(HERE, 'rehearsal', TEST), os.path.join(before, TEST))
print('trees ready: rehearsal (ported files + live AppConfig), before (pre-port files + the ported test)')
