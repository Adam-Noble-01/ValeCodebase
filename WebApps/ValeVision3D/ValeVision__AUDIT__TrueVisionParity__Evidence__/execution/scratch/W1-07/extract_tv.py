# W1-07 scratch: extract TrueVision files at the pin (b2aa9151) as bytes into the session scratchpad.
# Read-only on TrueVision (git show only). Output folder is outside both repositories.
import hashlib
import os
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.environ.get('TEMP', '.'), 'w1_07_tv')

FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js',
    '80__Testing__PrototypeEnvironment/Na__Test__DraftGuard__.test.cjs',
    '80__Testing__PrototypeEnvironment/Na__Test__DraftRestore__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__DrawingDrafts__.test.mjs',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js',
    '02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js',
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js',
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Sheets__.js',
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__State__.js',
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__History__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    '02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js',
    '02__Src__AppModules/51__System__LayoutEditor/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Transactions__.js',
    'TrueVision__DEVLOG__.md',
]


def main():
    os.makedirs(OUT, exist_ok=True)
    for rel in FILES:
        spec = PIN + ':' + APP + rel
        try:
            data = subprocess.run(['git', '-C', NAWEB, 'show', spec], check=True, capture_output=True).stdout
        except subprocess.CalledProcessError as exc:
            print('MISSING', rel, exc.stderr.decode('utf-8', 'replace').strip())
            continue
        dest = os.path.join(OUT, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'wb') as fh:
            fh.write(data)
        crlf = data.count(b'\r\n')
        print('%-120s %8d B  lines %5d  crlf %d  sha1 %s' % (rel, len(data), data.count(b'\n'), crlf, hashlib.sha1(data).hexdigest()[:8]))


if __name__ == '__main__':
    main()
