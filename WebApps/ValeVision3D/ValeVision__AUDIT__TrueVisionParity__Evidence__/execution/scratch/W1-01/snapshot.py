"""Hash and back up the W1-01 files (pre-image), or compare the live files against the recorded pre-image."""
import hashlib, os, sys, json, shutil
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SCR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-01'
FILES = [
    r'02__Src__AppModules\01__AppCore\Na__AppFlow__LoadingSequence.js',
    r'02__Src__AppModules\05__RenderPipeline\Na__RenderLoop__Invalidation.js',
    r'02__Src__AppModules\26__System__ToggleModelElements\Na__UiFeature__ModelToggle__Controls.js',
    r'02__Src__AppModules\05__RenderPipeline\Na__RenderLoop__InteractiveOverlays__.js',
    r'02__Src__AppModules\26__System__ToggleModelElements\Na__ModelGroup__PhaseLibrary__.js',
]
PRE = os.path.join(SCR, 'preimage')
MANIFEST = os.path.join(PRE, 'manifest.json')

def info(path):
    if not os.path.exists(path):
        return None
    data = open(path, 'rb').read()
    return {'sha1': hashlib.sha1(data).hexdigest(), 'bytes': len(data),
            'lines': data.count(b'\n'), 'crlf': data.count(b'\r\n')}

mode = sys.argv[1] if len(sys.argv) > 1 else 'show'
if mode == 'record':
    if os.path.exists(MANIFEST):
        print('pre-image already recorded; refusing to overwrite')
        sys.exit(1)
    os.makedirs(PRE, exist_ok=True)
    man = {}
    for rel in FILES:
        p = os.path.join(VV, rel)
        man[rel] = info(p)
        if man[rel]:
            shutil.copyfile(p, os.path.join(PRE, os.path.basename(rel) + '.bak'))
    json.dump(man, open(MANIFEST, 'w'), indent=1)
    print(json.dumps(man, indent=1))
elif mode == 'check':
    man = json.load(open(MANIFEST))
    for rel in FILES:
        now = info(os.path.join(VV, rel))
        was = man.get(rel)
        same = (now == was)
        print(('UNCHANGED ' if same else 'CHANGED   ') + rel, (now or {}).get('sha1'), 'pre', (was or {}).get('sha1'))
else:
    for rel in FILES:
        print(rel, info(os.path.join(VV, rel)))
