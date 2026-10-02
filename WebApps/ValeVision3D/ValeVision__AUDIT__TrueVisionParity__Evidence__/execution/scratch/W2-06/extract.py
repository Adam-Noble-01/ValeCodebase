"""W2-06 scratch: copy TV folder-50 files (at the pin) and the VV live copies into scratch for analysis."""
import os, subprocess, shutil, hashlib

TV_REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode'
VV_ROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
F50 = '02__Src__AppModules/50__System__ProjectedLinework/'
NAMES = ['AppConfig__.json', 'AuthoredEdges__.js', 'ClipKernel__.js', 'ConfigAccess__.js', 'CpuBackend__.js',
         'DevMenu__Controls__.js', 'DoorPose__.js', 'EdgeExtractor__.js', 'ModelStage__.js', 'Pipeline__.js',
         'Projector__.js', 'StageSampler__.js', 'ViewDefinition__.js', 'WebGpuBackend__.js',
         'Persistence__.js', 'FlushJoins__.js', 'Storeys__.js']
EXTRA_TV = ['80__Testing__PrototypeEnvironment/Na__Test__StoreyBand__.test.mjs',
            '80__Testing__PrototypeEnvironment/Na__Test__FlushJoins__.test.mjs',
            '80__Testing__PrototypeEnvironment/Na__Test__HideSwings__.test.mjs']


def tv_bytes(rel):
    return subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':' + TV_APP + '/' + rel],
                          check=True, stdout=subprocess.PIPE).stdout


def main():
    for side in ('tv', 'vv', 'vv_pre'):
        os.makedirs(os.path.join(HERE, side), exist_ok=True)
    for n in NAMES:
        rel = F50 + 'Na__ProjectedLinework__' + n
        raw = tv_bytes(rel)
        open(os.path.join(HERE, 'tv', os.path.basename(rel)), 'wb').write(raw)
        vvp = os.path.join(VV_ROOT, rel.replace('/', os.sep))
        if os.path.exists(vvp):
            data = open(vvp, 'rb').read()
            open(os.path.join(HERE, 'vv', os.path.basename(rel)), 'wb').write(data)
            pre = os.path.join(HERE, 'vv_pre', os.path.basename(rel))
            if not os.path.exists(pre):
                open(pre, 'wb').write(data)
            print('%-52s TV %6d  VV %6d CRLF=%s sha1 %s' % (n, len(raw), len(data), b'\r\n' in data,
                                                         hashlib.sha1(data).hexdigest()[:12]))
        else:
            print('%-52s TV %6d  VV absent' % (n, len(raw)))
    for rel in EXTRA_TV:
        open(os.path.join(HERE, 'tv', os.path.basename(rel)), 'wb').write(tv_bytes(rel))


if __name__ == '__main__':
    main()
