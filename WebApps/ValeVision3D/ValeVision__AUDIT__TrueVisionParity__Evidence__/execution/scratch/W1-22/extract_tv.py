# W1-22 scratch: extract TrueVision files at the pin (bytes, as git show returns them: LF).
import os
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv')

FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Cells__.js',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Modern__.js',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__QrCell__.js',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Classic__.js',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js',
    '02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js',
    '02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js',
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__DrawingScale__.js',
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js',
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js',
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js',
    '80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html',
    'TrueVision__DEVLOG__.md',
]


def main():
    os.makedirs(OUT, exist_ok=True)
    for rel in FILES:
        spec = PIN + ':' + APP + rel
        res = subprocess.run(['git', '-C', NAWEB, 'show', spec], capture_output=True)
        if res.returncode != 0:
            print('MISSING', rel, res.stderr.decode('utf-8', 'replace').strip())
            continue
        dest = os.path.join(OUT, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'wb') as fh:
            fh.write(res.stdout)
        crlf = res.stdout.count(b'\r\n')
        print('OK', len(res.stdout), 'B', 'crlf=%d' % crlf, rel)


if __name__ == '__main__':
    sys.exit(main())
