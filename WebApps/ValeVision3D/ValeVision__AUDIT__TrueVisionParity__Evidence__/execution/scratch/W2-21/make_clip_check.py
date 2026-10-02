"""Scratch clipboard check: TrueVision's Na__Test__CrossSheetClipboard__ (pin b2aa9151) run against this app's LIVE
ItemClipboard, TextAndDimensions and Groups, plus W2-21's own acceptance checks appended (same-sheet paste in place for
text, a group and a vector; Scrapbook, Custom and Parametric drops through InsertSet)."""
import os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
src = subprocess.run(['git', '-C', r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb', 'show',
                      'b2aa9151:na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__CrossSheetClipboard__.test.cjs'],
                     capture_output=True, check=True).stdout.decode('utf-8')
old = "const root = path.resolve(__dirname, '../02__Src__AppModules/51__System__LayoutEditor');"
assert src.count(old) == 1
src = src.replace(old, "const root = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor';")
extra = open(os.path.join(HERE, 'clip_check_extra.cjs'), encoding='utf-8').read()
out = os.path.join(HERE, 'W2-21__clipboard__check.test.cjs')
open(out, 'w', encoding='utf-8', newline='\n').write(src + '\n' + extra)
print('wrote', out)
