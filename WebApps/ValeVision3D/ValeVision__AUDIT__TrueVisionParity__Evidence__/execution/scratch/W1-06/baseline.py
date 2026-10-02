# W1-06 scratch: record the live files this package will write (sha1, size, line endings) before any change.
# Writes scratch/W1-06/baseline_sha1.txt. Reads only the repository.
import hashlib
import os

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))

TARGETS = [
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DraftMaths__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DrawingUsage__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DraftGuard__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RowAccordion__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css',
    '02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js',
    '03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css',
    '03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css',
    '80__Testing__PrototypeEnvironment/Na__Test__DrawingDrafts__.test.mjs',
]

def main():
    lines = []
    for rel in TARGETS:
        path = os.path.join(VV, rel.replace('/', os.sep))
        if not os.path.exists(path):
            lines.append('%-40s %8s %s' % ('ABSENT', '-', rel))
            continue
        with open(path, 'rb') as fh:
            data = fh.read()
        crlf = data.count(b'\r\n')
        lf = data.count(b'\n') - crlf
        eol = 'CRLF' if crlf and not lf else ('LF' if lf and not crlf else ('MIXED' if crlf and lf else 'NONE'))
        lines.append('%-40s %8d %-5s %s' % (hashlib.sha1(data).hexdigest(), len(data), eol, rel))
    text = '\n'.join(lines) + '\n'
    with open(os.path.join(HERE, 'baseline_sha1.txt'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(text)
    print(text)

if __name__ == '__main__':
    main()
