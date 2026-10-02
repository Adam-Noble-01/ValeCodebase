# W1-29 scratch: prove the hunks replayed into VV's handler are TrueVision Na__Hotkeys__Manager 2.1.0's own lines
# (read at the pin), with only the twin's function prefix and the import path's folder changed.
import os
import subprocess

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/10__NavigationAndCameras/Na__Hotkeys__Manager.js'],
                    capture_output=True, check=True).stdout.decode('utf-8').split('\n')
VV = open(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\03__AppUtils\Na__AppUtils__ValeVision__HotkeyHandler__.js',
          'rb').read().decode('utf-8').replace('\r\n', '\n').split('\n')

HUNK_MARKERS = [
    'MODULE IMPORTS | Which Keyboard Is Live, and Whether the Focus Takes Typing',
    'import { Na__KeyScope__MODEL, Na__KeyScope__Is, Na__KeyScope__IsTypingTarget }',
    "// A text box, a text area, a list - or anything contenteditable, which the",
    "// old tag test missed, so a key was taken from any editable region.",
    'return Na__KeyScope__IsTypingTarget(document.activeElement);',
    'if (!Na__KeyScope__Is(Na__KeyScope__MODEL)) return;',
]


def translate(line):
    return (line.replace('Na__Hotkeys__', 'Na__HotkeyHandler__')
                .replace("'../03__AppUtils/Na__AppUtils__KeyScope__.js'", "'./Na__AppUtils__KeyScope__.js'"))


ok = True
for marker in HUNK_MARKERS:
    tv_lines = [l for l in TV if marker in l]
    if len(tv_lines) != 1:
        print('TV marker not unique:', marker, len(tv_lines))
        ok = False
        continue
    want = translate(tv_lines[0])
    found = want in VV
    ok = ok and found
    print(('SAME  ' if found else 'DIFF  ') + want.strip()[:120])
print('every replayed line is TrueVision 2.1.0\'s (prefix/path translated):', ok)
raise SystemExit(0 if ok else 1)
