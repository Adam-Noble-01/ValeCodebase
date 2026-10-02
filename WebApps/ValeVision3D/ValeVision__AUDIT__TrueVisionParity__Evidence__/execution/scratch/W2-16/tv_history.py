"""For each TV source: top DEVELOPMENT LOG entry, and git log (at the pin) with commit subjects."""
import subprocess, os, re, sys
PIN = 'b2aa9151'
TVREPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
HERE = os.path.dirname(os.path.abspath(__file__))
LE = '02__Src__AppModules/51__System__LayoutEditor/'
FILES = [
    LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__.js',
    LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js',
    LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__Linework__.js',
    LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__Window__.js',
    LE + '20__System__Viewports/Na__LayoutEditor__Viewport3d__.js',
    LE + '20__System__Viewports/Na__LayoutEditor__ViewportIdentity__.js',
    LE + '25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js',
    LE + '25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__Config__.json',
    LE + '25__System__RenderStyles/Na__LayoutEditor__ModelLayers__.js',
    LE + '40__Ui__Panels/Na__LayoutEditor__Panel__ModelLayers__.js',
    LE + '20__System__Viewports/Na__LayoutEditor__ModelSource__.js',
    LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__SitePlan__.js',
    '80__Testing__PrototypeEnvironment/Na__Test__SitePlanFaces__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__HideSwings__.test.mjs',
]
for rel in FILES:
    t = open(os.path.join(HERE, 'tv', rel.replace('/', os.sep)), encoding='utf-8').read()
    m = re.findall(r'^// (\d\d-\w\w\w-\d{4}) - Version ([\d.]+)(.*)$', t, re.M)
    print('====', rel.split('/')[-1], 'log top:', m[:3])
    r = subprocess.run(['git', '-C', TVREPO, 'log', '--format=%h %ad %s', '--date=short', '-n', '8', PIN, '--', TVAPP + rel], capture_output=True, text=True, encoding='utf-8')
    print(r.stdout.rstrip())
