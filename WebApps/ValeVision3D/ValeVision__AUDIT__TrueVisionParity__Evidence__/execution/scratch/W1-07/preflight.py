# W1-07 scratch: G0 preflight. Records the pre-image and SHA-1 of every file this package will write,
# checks the TrueVision pin exists, and confirms none of the files is in the baseline-dirty list.
import hashlib
import json
import os
import shutil
import subprocess

VCB = r'D:\10_CoreLib__ValeCodebase'
VV = os.path.join(VCB, 'WebApps', 'ValeVision3D')
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, 'preimage')
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'

OWNED = [
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js',
]
NEW = [
    '80__Testing__PrototypeEnvironment/Na__Test__DraftGuard__.test.cjs',
    '80__Testing__PrototypeEnvironment/Na__Test__DraftRestore__.test.mjs',
]


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def main():
    os.makedirs(PRE, exist_ok=True)
    manifest = {'owned': {}, 'new': {}}
    for rel in OWNED:
        path = os.path.join(VV, rel.replace('/', os.sep))
        data = open(path, 'rb').read()
        manifest['owned'][rel] = {
            'sha1': sha1(data), 'bytes': len(data), 'lines': data.count(b'\n'),
            'crlf': data.count(b'\r\n'), 'lf_only': data.count(b'\n') - data.count(b'\r\n')
        }
        shutil.copyfile(path, os.path.join(PRE, os.path.basename(rel)))
    for rel in NEW:
        path = os.path.join(VV, rel.replace('/', os.sep))
        manifest['new'][rel] = {'exists': os.path.exists(path)}
    subprocess.run(['git', '-C', NAWEB, 'cat-file', '-e', PIN], check=True)
    manifest['pin_ok'] = True
    baseline = open(os.path.join(VV, 'ValeVision__AUDIT__TrueVisionParity__Evidence__', 'execution',
                                 'baseline_dirty__01-Oct-2026.txt'), encoding='utf-8', errors='replace').read()
    manifest['in_baseline_dirty'] = [r for r in OWNED + NEW if r.split('/')[-1] in baseline]
    status = subprocess.run(['git', '-C', VCB, 'status', '--short', '--'] +
                            ['WebApps/ValeVision3D/' + r for r in OWNED + NEW],
                            capture_output=True, text=True).stdout
    manifest['git_status'] = status.splitlines()
    with open(os.path.join(HERE, 'preimage_manifest.json'), 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, indent=2)
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()
