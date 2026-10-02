# -*- coding: utf-8 -*-
# W1-21 scratch: export sets before and after this package for the facade, the Sheets unit, History and the
# loader (pre-images in preimage/ against the live files), and the facade's names against TrueVision's file
# at the pin. Reads only.

import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
LE = os.path.join(VV, '02__Src__AppModules', '51__System__LayoutEditor')
FILES = {
    'facade':  os.path.join(LE, '07__Core__SheetData', 'Na__LayoutEditor__SheetModel__.js'),
    'sheets':  os.path.join(LE, '07__Core__SheetData', 'Na__LayoutEditor__SheetModel__Sheets__.js'),
    'history': os.path.join(LE, '07__Core__SheetData', 'Na__LayoutEditor__History__.js'),
    'loader':  os.path.join(LE, '01__Core__Loader', 'Na__LayoutEditor__Loader__.js'),
}
EXPORT_BLOCK = re.compile(r"export\s*\{([^}]*)\}", re.S)
COMMENT = re.compile(r"//[^\n]*|/\*.*?\*/", re.S)


def exports(text):
    text = COMMENT.sub('', text)
    names = set()
    for m in EXPORT_BLOCK.finditer(text):
        for part in m.group(1).split(','):
            part = part.strip()
            if part:
                names.add(re.split(r'\s+as\s+', part)[-1].strip())
    return names


for key, path in FILES.items():
    before = exports(open(os.path.join(HERE, 'preimage', key + '.before'), encoding='utf-8').read())
    after = exports(open(path, encoding='utf-8').read())
    print('%s: %d -> %d exports' % (key, len(before), len(after)))
    print('   added  : %s' % ', '.join(sorted(after - before)) if after - before else '   added  : none')
    print('   removed: %s' % ', '.join(sorted(before - after)) if before - after else '   removed: none')

tv = subprocess.run(['git', '-C', r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb', 'show',
                     'b2aa9151:na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js'],
                    capture_output=True, check=True).stdout.decode('utf-8')
print('facade = TrueVision\'s export set exactly: %s' % (exports(tv) == exports(open(FILES['facade'], encoding='utf-8').read())))
