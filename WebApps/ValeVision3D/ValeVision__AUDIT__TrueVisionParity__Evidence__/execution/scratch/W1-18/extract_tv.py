# W1-18 scratch: read the two TrueVision files (and their configs) at the pin, save copies in tv/ for reading, and -
# ONCE, before the port - snapshot the live VV files this package replaces (vv_before/ and sha256__before.txt).
# Safe to re-run after the port: the snapshot is never overwritten (it is the restore source and the harness's OLD
# side); only the TrueVision copies in tv/ are written again.
import hashlib
import os
import subprocess

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
LE35 = '02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/'

NAMES = [
    'Na__LayoutEditor__GradientTool__.js',
    'Na__LayoutEditor__LineStyleTool__.js',
    'Na__LayoutEditor__GradientTool__Config__.json',
    'Na__LayoutEditor__LineStyleTool__Config__.json',
]


def git_show(rel):
    return subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TVAPP + rel],
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    snapshot = os.path.join(HERE, 'sha256__before.txt')
    take_snapshot = not os.path.exists(snapshot)
    os.makedirs(os.path.join(HERE, 'tv'), exist_ok=True)
    if take_snapshot:
        os.makedirs(os.path.join(HERE, 'vv_before'), exist_ok=True)
    lines = []
    for name in NAMES:
        rel = LE35 + name
        tv = git_show(rel)
        with open(os.path.join(HERE, 'tv', name), 'wb') as fh:
            fh.write(tv)
        with open(os.path.join(VV, rel.replace('/', os.sep)), 'rb') as fh:
            vv = fh.read()
        if take_snapshot:
            with open(os.path.join(HERE, 'vv_before', name), 'wb') as fh:
                fh.write(vv)
        vv_lf = vv.replace(b'\r\n', b'\n')
        print('%-48s TV %6d bytes CR=%s sha %s | VV %6d bytes CRLF=%d LFonly=%d sha %s | VV(LF)==TV: %s' % (
            name, len(tv), b'\r' in tv, sha(tv)[:12], len(vv), vv.count(b'\r\n'),
            vv.count(b'\n') - vv.count(b'\r\n'), sha(vv)[:12], vv_lf == tv))
        lines.append('%s  %s\n' % (sha(vv), rel))
    if take_snapshot:
        with open(snapshot, 'w', encoding='utf-8', newline='\n') as fh:
            fh.writelines(lines)
    else:
        print('(snapshot kept: sha256__before.txt and vv_before/ already exist and are never overwritten)')


if __name__ == '__main__':
    main()
