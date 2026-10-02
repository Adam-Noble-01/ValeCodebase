# -*- coding: utf-8 -*-
# W1-20 scratch: read TrueVision files at the pin (b2aa9151) as BYTES with git show,
# into the session scratchpad (outside both repos), never from TV's working tree.
#
# Usage: python -B extract_tv.py <out_dir> [app-relative path ...]
# With no paths it extracts the default set this package reads.

import hashlib
import os
import subprocess
import sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
SD = '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/'

DEFAULT = [SD + n for n in [
    'Na__LayoutEditor__SheetModel__State__.js',
    'Na__LayoutEditor__SheetModel__Layers__.js',
    'Na__LayoutEditor__SheetModel__Shapes__.js',
    'Na__LayoutEditor__SheetModel__Viewports__.js',
    'Na__LayoutEditor__SheetModel__TextAndDimensions__.js',
    'Na__LayoutEditor__SheetModel__Leaders__.js',
    'Na__LayoutEditor__SheetModel__Groups__.js',
    'Na__LayoutEditor__SheetModel__AreaGroups__.js',
    'Na__LayoutEditor__SheetModel__DrawOrder__.js',
    'Na__LayoutEditor__SheetModel__Common__.js',
    # read only (owned by W1-21 / W1-19):
    'Na__LayoutEditor__SheetModel__.js',
    'Na__LayoutEditor__SheetModel__Sheets__.js',
    'Na__LayoutEditor__SheetRecords__.js',
    'Na__LayoutEditor__History__.js',
]] + [
    '80__Testing__PrototypeEnvironment/Na__Test__LayerMenu__.test.mjs',
    'TrueVision__DEVLOG__.md',
]


def show(rel):
    out = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + APP + rel],
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if out.returncode != 0:
        raise SystemExit('git show failed for ' + rel + ': ' + out.stderr.decode('utf-8', 'replace'))
    return out.stdout


def main():
    if len(sys.argv) < 2:
        raise SystemExit('usage: extract_tv.py <out_dir> [paths...]')
    out_dir = sys.argv[1]
    paths = sys.argv[2:] or DEFAULT
    for rel in paths:
        data = show(rel)
        dest = os.path.join(out_dir, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'wb') as fh:
            fh.write(data)
        print('%8d bytes  CR=%-5d sha256 %s  %s' % (len(data), data.count(b'\r'), hashlib.sha256(data).hexdigest()[:16], rel))


if __name__ == '__main__':
    main()
