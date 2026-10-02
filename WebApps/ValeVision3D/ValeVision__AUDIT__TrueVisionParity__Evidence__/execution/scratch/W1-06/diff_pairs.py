# W1-06 scratch: unified diffs between TrueVision's files at the pin and ValeVision's live files (read-only).
# Line endings are normalised for the comparison only; the report says which ending each VV file uses.
import difflib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(HERE, 'tv')
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'

PAIRS = [
    '03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css',
    '03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css',
    '02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RowAccordion__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js',
]

def read(path):
    with open(path, 'rb') as fh:
        data = fh.read()
    crlf = data.count(b'\r\n')
    lf = data.count(b'\n') - crlf
    text = data.decode('utf-8').replace('\r\n', '\n')
    return text, crlf, lf

def main():
    only = sys.argv[1:] or None
    for rel in PAIRS:
        if only and not any(o in rel for o in only):
            continue
        tv_text, _, _ = read(os.path.join(TV, rel.replace('/', os.sep)))
        vv_path = os.path.join(VV, rel.replace('/', os.sep))
        vv_text, crlf, lf = read(vv_path)
        print('=' * 100)
        print(rel, ' VV eol: crlf=%d lf=%d' % (crlf, lf))
        diff = difflib.unified_diff(tv_text.split('\n'), vv_text.split('\n'), 'TV@b2aa9151', 'VV live', lineterm='', n=1)
        for line in diff:
            print(line)

if __name__ == '__main__':
    main()
