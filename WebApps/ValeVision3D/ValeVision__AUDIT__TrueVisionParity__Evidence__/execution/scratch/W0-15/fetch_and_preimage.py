"""W0-15 step 0: fetch TV sources at the pin (bytes, as git show returns them) and save
byte pre-images + SHA-1 manifest of every VV file this package edits.

Read-only on TV (git show only) and on VV (reads only). Writes only under scratch/W0-15/.
"""
import hashlib
import json
import os
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))

TV_FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__Readers__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__ToolSetup__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json',
    '80__Testing__PrototypeEnvironment/Na__Test__DrawingTabKeys__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__AuthoringZoomMax__.test.mjs',
]

VV_FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__Readers__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__ToolSetup__.js',
]


def eol_kind(b):
    crlf = b.count(b'\r\n')
    lf = b.count(b'\n') - crlf
    if crlf and lf:
        return 'mixed'
    if crlf:
        return 'CRLF'
    if lf:
        return 'LF'
    return 'none'


def main():
    tv_dir = os.path.join(HERE, 'tv_at_pin')
    pre_dir = os.path.join(HERE, 'preimage')
    os.makedirs(tv_dir, exist_ok=True)
    os.makedirs(pre_dir, exist_ok=True)
    manifest = {'pin': PIN, 'tv': {}, 'vv': {}}
    for rel in TV_FILES:
        spec = PIN + ':' + TV_APP + '/' + rel
        b = subprocess.run(['git', '-C', NAWEB, 'show', spec], capture_output=True, check=True).stdout
        out = os.path.join(tv_dir, os.path.basename(rel))
        with open(out, 'wb') as f:
            f.write(b)
        manifest['tv'][rel] = {'sha1': hashlib.sha1(b).hexdigest(), 'bytes': len(b), 'eol': eol_kind(b),
                               'bom': b.startswith(b'\xef\xbb\xbf')}
    for rel in VV_FILES:
        p = os.path.join(VV, rel.replace('/', os.sep))
        with open(p, 'rb') as f:
            b = f.read()
        out = os.path.join(pre_dir, os.path.basename(rel))
        if os.path.exists(out) and '--force' not in sys.argv:
            with open(out, 'rb') as f:
                old = f.read()
            if old != b:
                print('PREIMAGE EXISTS AND DIFFERS (not overwritten):', rel)
                continue
        with open(out, 'wb') as f:
            f.write(b)
        manifest['vv'][rel] = {'sha1': hashlib.sha1(b).hexdigest(), 'bytes': len(b), 'eol': eol_kind(b),
                               'bom': b.startswith(b'\xef\xbb\xbf')}
    with open(os.path.join(HERE, 'preimage_manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    for side in ('tv', 'vv'):
        for rel, m in manifest[side].items():
            print(side, m['sha1'][:10], m['bytes'], m['eol'], 'BOM' if m['bom'] else '', rel)


if __name__ == '__main__':
    main()
