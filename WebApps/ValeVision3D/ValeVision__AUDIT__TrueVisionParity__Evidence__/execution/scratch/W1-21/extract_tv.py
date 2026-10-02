#!/usr/bin/env python3
# =============================================================================
# W1-21 scratch - extract TrueVision files at the pin (b2aa9151) as bytes.
# Read-only on both repos: `git show <pin>:<path>` only. Copies go to the
# session scratchpad (outside both repositories) because they carry NA text.
# Usage: python -B extract_tv.py [--out <dir>]
# =============================================================================
import hashlib, os, subprocess, sys

PIN = 'b2aa9151'
TV_GIT = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
DEFAULT_OUT = r'C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f105155\scratchpad\W1-21\tv'

LE = '02__Src__AppModules/51__System__LayoutEditor/'
FILES = [
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__Sheets__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__History__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__AutoSave__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__State__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__Common__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__AreaGroups__.js',
    LE + '05__Core__ModeController/Na__LayoutEditor__ModeController__.js',
    LE + '51__Feature__DrawingRegister/Na__LayoutEditor__Register__Numbering__.js',
    '02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js',
    '80__Testing__PrototypeEnvironment/Na__Test__SheetsNormaliseOnce__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__NoteRegions__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__LeaderlessNotes__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__DraftRestore__.test.mjs',
    'TrueVision__DEVLOG__.md',
]

def main():
    out = DEFAULT_OUT
    if '--out' in sys.argv:
        out = sys.argv[sys.argv.index('--out') + 1]
    os.makedirs(out, exist_ok=True)
    for rel in FILES:
        blob = subprocess.run(['git', '-C', TV_GIT, 'show', f'{PIN}:{APP}{rel}'],
                              capture_output=True, check=True).stdout
        dst = os.path.join(out, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, 'wb') as fh:
            fh.write(blob)
        crlf = blob.count(b'\r\n')
        print(f'{hashlib.sha256(blob).hexdigest()[:16]}  {len(blob):>8} B  lines {blob.count(b"\n"):>5}  crlf {crlf:>4}  {rel}')

if __name__ == '__main__':
    main()
