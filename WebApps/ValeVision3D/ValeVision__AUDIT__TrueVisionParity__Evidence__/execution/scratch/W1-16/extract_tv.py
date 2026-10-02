# W1-16 | Extract the TrueVision files this package reads, AT THE PIN, as bytes.
#
# The copies go into the session scratchpad OUTSIDE the repository (they carry
# TrueVision and Noble Architecture text) and are deleted when the package is
# done. Re-run this script to get them back: it only ever reads TrueVision
# through `git show <pin>:<path>`, never its working tree.
#
# Usage: python extract_tv.py <out dir>
import os
import subprocess
import sys

PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
FOLDER = '02__Src__AppModules/51__System__LayoutEditor/54__Feature__SheetImages/'

FILES = [FOLDER + name for name in (
    'Na__LayoutEditor__SheetImages__Setup__.js',
    'Na__LayoutEditor__SheetImages__Geometry__.js',
    'Na__LayoutEditor__SheetImages__Painter__.js',
    'Na__LayoutEditor__SheetImages__Paint__.js',
    'Na__LayoutEditor__SheetImages__Source__.js',
    'Na__LayoutEditor__SheetImages__Pdf__.js',
    'Na__LayoutEditor__SheetImages__Encode__.js',
    'Na__LayoutEditor__SheetImages__Config__.json',
)] + [
    '80__Testing__PrototypeEnvironment/Na__Test__SheetImages__.test.mjs',
]


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else None
    if not out:
        raise SystemExit('usage: python extract_tv.py <out dir>')
    os.makedirs(out, exist_ok=True)
    for rel in FILES:
        data = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + rel], capture_output=True, check=True).stdout
        target = os.path.join(out, os.path.basename(rel))
        with open(target, 'wb') as fh:
            fh.write(data)
        print(os.path.basename(rel), len(data), 'bytes', data.count(b'\n'), 'lines', 'CRLF' if b'\r\n' in data else 'LF')


if __name__ == '__main__':
    main()
