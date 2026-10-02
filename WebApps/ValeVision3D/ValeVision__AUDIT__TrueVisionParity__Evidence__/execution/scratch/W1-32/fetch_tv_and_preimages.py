# W1-32 - read TrueVision files at the pin (git show, bytes) and save pre-images of the VV targets.
# Read-only on both repos. Writes only under this scratch folder.
import hashlib
import json
import os
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
TVDIR = os.path.join(HERE, 'tv_at_pin')
PREDIR = os.path.join(HERE, 'preimage')

TV_FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js',
    '02__Src__AppModules/51__System__LayoutEditor/55__Feature__Scrapbook/Na__LayoutEditor__Panel__Scrapbook__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js',
    '80__Testing__PrototypeEnvironment/Na__Test__DocumentKeys__.test.mjs',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__Transitions__.js',
    '02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js',
]

VV_TARGETS = [
    '02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    '02__Src__AppModules/51__System__LayoutEditor/55__Feature__Scrapbook/Na__LayoutEditor__Panel__Scrapbook__.js',
]


def git_show(rel):
    spec = PIN + ':' + TVAPP + rel
    out = subprocess.run(['git', '-C', NAWEB, 'show', spec], capture_output=True)
    if out.returncode != 0:
        raise SystemExit('git show failed for ' + spec + ': ' + out.stderr.decode('utf-8', 'replace'))
    return out.stdout


def eol_stats(b):
    crlf = b.count(b'\r\n')
    lf = b.count(b'\n') - crlf
    return {'crlf': crlf, 'bare_lf': lf, 'bom': b.startswith(b'\xef\xbb\xbf')}


def main():
    os.makedirs(TVDIR, exist_ok=True)
    os.makedirs(PREDIR, exist_ok=True)
    manifest = {'pin': PIN, 'tv': {}, 'vv_preimage': {}}
    for rel in TV_FILES:
        b = git_show(rel)
        name = rel.replace('/', '__')
        with open(os.path.join(TVDIR, name), 'wb') as f:
            f.write(b)
        manifest['tv'][rel] = {'bytes': len(b), 'sha1': hashlib.sha1(b).hexdigest(), **eol_stats(b)}
    for rel in VV_TARGETS:
        p = os.path.join(VV, rel.replace('/', os.sep))
        with open(p, 'rb') as f:
            b = f.read()
        name = rel.split('/')[-1] + '.before'
        dst = os.path.join(PREDIR, name)
        if os.path.exists(dst):
            with open(dst, 'rb') as f:
                old = f.read()
            if old != b:
                print('WARNING: pre-image exists and differs from live: ' + rel)
                manifest['vv_preimage'][rel] = {'note': 'existing pre-image kept; live differs',
                                                'live_sha1': hashlib.sha1(b).hexdigest(),
                                                'pre_sha1': hashlib.sha1(old).hexdigest()}
                continue
        with open(dst, 'wb') as f:
            f.write(b)
        manifest['vv_preimage'][rel] = {'bytes': len(b), 'sha1': hashlib.sha1(b).hexdigest(), **eol_stats(b)}
    with open(os.path.join(HERE, 'preimage_manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()
