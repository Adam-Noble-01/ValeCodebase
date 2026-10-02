"""Dry run (scratch only): VV's Layout Editor with TV's three W2-16 files dropped in (TrueVision__SitePlan__ -> ValeVision__SitePlan__),
to see what the ported composites test gives once the viewport convergence lands. Nothing in the live tree is touched."""
import os, shutil, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
O = os.path.join(HERE, 'overlay')
if os.path.isdir(O):
    shutil.rmtree(O)
shutil.copytree(os.path.join(VV, r'02__Src__AppModules\51__System__LayoutEditor'), os.path.join(O, r'02__Src__AppModules\51__System__LayoutEditor'))
shutil.copytree(os.path.join(VV, '52__LayoutEditor__HatchPatternLibrary'), os.path.join(O, '52__LayoutEditor__HatchPatternLibrary'))
os.makedirs(os.path.join(O, '80__Testing__PrototypeEnvironment'))
shutil.copyfile(os.path.join(VV, r'80__Testing__PrototypeEnvironment\Na__Test__SitePlanComposites__.test.mjs'),
                os.path.join(O, r'80__Testing__PrototypeEnvironment\Na__Test__SitePlanComposites__.test.mjs'))
P = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/'
for rel in ('20__System__Viewports/Na__LayoutEditor__Viewport2d__Linework__.js',
            '20__System__Viewports/Na__LayoutEditor__Viewport2d__SitePlan__.js',
            '25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js',
            '25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__Config__.json'):
    b = subprocess.run(['git', '-C', r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb', 'show', 'b2aa9151:' + P + rel], capture_output=True, check=True).stdout
    b = b.replace(b'TrueVision__SitePlan__', b'ValeVision__SitePlan__')
    open(os.path.join(O, '02__Src__AppModules', '51__System__LayoutEditor', rel.replace('/', os.sep)), 'wb').write(b)
r = subprocess.run(['node', os.path.join(O, r'80__Testing__PrototypeEnvironment\Na__Test__SitePlanComposites__.test.mjs')], capture_output=True, text=True, encoding='utf-8', errors='replace')
lines = (r.stdout + r.stderr).splitlines()
print('\n'.join(l for l in lines if l.startswith('FAIL') or 'passed' in l or 'Error' in l or l.startswith('SKIP')))
print('exit', r.returncode)
