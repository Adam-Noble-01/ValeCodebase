"""Fetch TV files at the pin (bytes) into scratch/W2-16/tv/, and copy VV pre-images into preimage/."""
import subprocess, os, sys, shutil, hashlib, json

PIN = 'b2aa9151'
TVREPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
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
    LE + '05__Core__ModeController/Na__LayoutEditor__ModeController__.js',
    '80__Testing__PrototypeEnvironment/Na__Test__SitePlanFaces__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__HideSwings__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__StoreyBand__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__ElevationDepthFog__.test.mjs',
]

def show(rel):
    r = subprocess.run(['git', '-C', TVREPO, 'show', PIN + ':' + TVAPP + rel], capture_output=True)
    if r.returncode != 0:
        return None
    return r.stdout

def sha(b):
    return hashlib.sha1(b).hexdigest()[:8]

def main():
    extra = sys.argv[1:]
    man = {}
    for rel in FILES + extra:
        b = show(rel)
        out = os.path.join(HERE, 'tv', rel.replace('/', os.sep))
        if b is None:
            print('TV MISSING', rel); continue
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'wb').write(b)
        vvp = os.path.join(VV, rel.replace('/', os.sep))
        vvinfo = 'absent'
        if os.path.exists(vvp):
            vb = open(vvp, 'rb').read()
            pre = os.path.join(HERE, 'preimage', rel.replace('/', os.sep))
            if not os.path.exists(pre):
                os.makedirs(os.path.dirname(pre), exist_ok=True)
                open(pre, 'wb').write(vb)
            vvinfo = '%s %d lines crlf=%s' % (sha(vb), vb.count(b'\n'), b'\r\n' in vb)
            man[rel] = sha(vb)
        else:
            man[rel] = None
        print('%-110s TV %s %5d | VV %s' % (rel[-80:], sha(b), b.count(b'\n'), vvinfo))
    mp = os.path.join(HERE, 'preimage', 'manifest.json')
    if not os.path.exists(mp):
        os.makedirs(os.path.dirname(mp), exist_ok=True)
        json.dump(man, open(mp, 'w'), indent=1)

if __name__ == '__main__':
    main()
