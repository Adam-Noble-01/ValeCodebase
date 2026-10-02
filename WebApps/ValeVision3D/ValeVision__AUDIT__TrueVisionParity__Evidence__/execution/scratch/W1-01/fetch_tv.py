import subprocess, os, sys
PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-01\tv'
paths = sys.argv[1:] or [
    '02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js',
    '02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__Invalidation.js',
    '02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js',
    '02__Src__AppModules/26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js',
    '02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js',
]
os.makedirs(OUT, exist_ok=True)
for p in paths:
    r = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + p], capture_output=True)
    if r.returncode != 0:
        print('FAIL', p, r.stderr.decode('utf-8', 'replace'))
        continue
    data = r.stdout
    name = p.replace('/', '__SLASH__')
    with open(os.path.join(OUT, name), 'wb') as f:
        f.write(data)
    crlf = data.count(b'\r\n')
    lf = data.count(b'\n')
    print('OK', p, len(data), 'bytes', lf, 'lines', crlf, 'crlf')
