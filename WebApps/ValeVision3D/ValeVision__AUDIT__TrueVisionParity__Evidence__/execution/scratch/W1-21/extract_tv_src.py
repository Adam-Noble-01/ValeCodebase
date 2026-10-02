# -*- coding: utf-8 -*-
# W1-21 scratch: put the TrueVision modules the lifted margin tests load (and the AppConfig JSON they read)
# into a 02__Src__AppModules-shaped folder, read at the pin with git show, so the same lifted checks can run
# on TrueVision's own files. Writes only to --out (the session scratchpad).
#
# Usage: python -B extract_tv_src.py --out <dir>   (the dir becomes <dir>/02__Src__AppModules/...)

import os
import subprocess
import sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
LE = '02__Src__AppModules/51__System__LayoutEditor/'
FILES = [
    LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    LE + '03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__NoteRegions__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__Sheets__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__State__.js',
]


def main(argv):
    out = argv[argv.index('--out') + 1]
    for rel in FILES:
        data = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + APP + rel], capture_output=True, check=True).stdout
        dst = os.path.join(out, *rel.split('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, 'wb') as fh:
            fh.write(data)
        print('%8d B  %s' % (len(data), rel))


if __name__ == '__main__':
    main(sys.argv[1:])
