import subprocess, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv')
os.makedirs(OUT, exist_ok=True)
P = 'na-apps/30__TrueVision__CoreAppCode/'
FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/21__System__SitePlanData/Na__SitePlan__GlbParse__.js',
    '02__Src__AppModules/51__System__LayoutEditor/21__System__SitePlanData/Na__SitePlan__Store__.js',
    '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__SitePlanComposites__.js',
    '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js',
    '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__Config__.json',
    '02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__SitePlan__.js',
    '80__Testing__PrototypeEnvironment/Na__Test__SitePlanComposites__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__SitePlanComposites__Output__.html',
    '80__Testing__PrototypeEnvironment/Na__Test__SitePlanStore__.test.mjs',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
]
for f in FILES:
    b = subprocess.run(['git', '-C', 'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb', 'show', 'b2aa9151:' + P + f], capture_output=True).stdout
    with open(os.path.join(OUT, os.path.basename(f)), 'wb') as fh:
        fh.write(b)
    print(len(b), b.count(b'\r\n'), f)
