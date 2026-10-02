import difflib, os, sys
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
REL = os.path.join('02__Src__AppModules', '51__System__LayoutEditor', '10__Core__SheetSurface', 'Na__LayoutEditor__Styles__Main__Paper__.css')
if len(sys.argv) > 1 and sys.argv[1] == 'grips':
    REL = os.path.join('02__Src__AppModules', '51__System__LayoutEditor', '30__System__SheetTools', 'Na__LayoutEditor__Grips__.js')
tv = open(os.path.join(HERE, 'tv', REL), encoding='utf-8').read().splitlines()
vv = open(os.path.join(VV, REL), encoding='utf-8').read().splitlines()
print('TV lines', len(tv), 'VV lines', len(vv))
for l in difflib.unified_diff(vv, tv, 'VV', 'TV', lineterm='', n=2):
    print(l)
