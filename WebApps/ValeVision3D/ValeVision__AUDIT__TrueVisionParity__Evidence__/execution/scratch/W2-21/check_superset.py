import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_imports import exports_of
VV = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools'
here = os.path.dirname(os.path.abspath(__file__))
for f in ['Na__LayoutEditor__EditScope__.js','Na__LayoutEditor__ItemClipboard__.js','Na__LayoutEditor__SelectionSet__.js',
          'Na__LayoutEditor__SelectionBox__.js','Na__LayoutEditor__Eyedropper__.js']:
    vv = exports_of(os.path.join(VV, f))
    tv = exports_of(os.path.join(here, 'tv', f))
    print(f, 'VV', len(vv), 'TV', len(tv), 'VV-only:', sorted(vv - tv), 'TV-new:', sorted(tv - vv))
