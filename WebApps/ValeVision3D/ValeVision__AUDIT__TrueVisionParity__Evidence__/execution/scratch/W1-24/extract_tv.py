# W1-24 scratch: extract the TrueVision files this package reads, at the pin, as bytes.
# Read-only on TrueVision (git show). Output: scratch/W1-24/tv/<app-relative path>.
import os
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'tv')

FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js',
    '02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfFonts__.js',
    '02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js',
    '02__Src__AppModules/51__System__LayoutEditor/65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__.js',
    'TrueVision__DEVLOG__.md',
]


def main():
    os.makedirs(OUT, exist_ok=True)
    for rel in FILES:
        spec = PIN + ':' + APP + '/' + rel
        res = subprocess.run(['git', '-C', NAWEB, 'show', spec], capture_output=True)
        if res.returncode != 0:
            print('MISSING', rel, res.stderr.decode('utf-8', 'replace').strip())
            continue
        dst = os.path.join(OUT, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, 'wb') as fh:
            fh.write(res.stdout)
        crlf = res.stdout.count(b'\r\n')
        lf = res.stdout.count(b'\n') - crlf
        print('OK', len(res.stdout), 'bytes', 'crlf', crlf, 'lf', lf, rel)


if __name__ == '__main__':
    sys.exit(main())
