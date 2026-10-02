# -*- coding: utf-8 -*-
# W1-20 scratch: line endings, sizes and sha256 of the ten ValeVision files this package owns. Reads only.

import hashlib
import os
import sys

DATA = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\07__Core__SheetData'
NAMES = [
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
]


def main():
    for n in NAMES:
        p = os.path.join(DATA, n)
        if not os.path.isfile(p):
            print('%-55s  (absent)' % n)
            continue
        b = open(p, 'rb').read()
        crlf = b.count(b'\r\n')
        lf = b.count(b'\n') - crlf
        print('%-55s  %7d bytes  lines %4d  CRLF %4d  bareLF %4d  sha256 %s' % (n, len(b), b.count(b'\n'), crlf, lf, hashlib.sha256(b).hexdigest()))


if __name__ == '__main__':
    main()
