# W1-27 - read TrueVision files at the pin (b2aa9151) as bytes, into the session scratchpad.
# TrueVision is read-only: this only runs `git show <pin>:<path>`; nothing in either repository is written.
import hashlib
import os
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = os.environ.get('W127_TV_OUT') or r'C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f105155\scratchpad\W1-27_tv'

FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__Geometry__.js',
    '02__Src__AppModules/51__System__LayoutEditor/59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__.js',
    '02__Src__AppModules/51__System__LayoutEditor/59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__Tool__.js',
    '02__Src__AppModules/51__System__LayoutEditor/59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__Menu__.js',
    '02__Src__AppModules/51__System__LayoutEditor/59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__Paint__.js',
    '02__Src__AppModules/51__System__LayoutEditor/59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__Config__.json',
    '80__Testing__PrototypeEnvironment/Na__Test__FloorAreas__.test.mjs',
]
EXTRA = sys.argv[1:]


def show(rel):
    return subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + APP + rel],
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout


def main():
    os.makedirs(OUT, exist_ok=True)
    for rel in FILES + EXTRA:
        data = show(rel)
        dst = os.path.join(OUT, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, 'wb') as fh:
            fh.write(data)
        crlf = data.count(b'\r\n')
        print('%-110s %7d B  lines %5d  crlf %d  sha256 %s' % (rel, len(data), data.count(b'\n'), crlf,
                                                              hashlib.sha256(data).hexdigest()[:16]))


if __name__ == '__main__':
    main()
