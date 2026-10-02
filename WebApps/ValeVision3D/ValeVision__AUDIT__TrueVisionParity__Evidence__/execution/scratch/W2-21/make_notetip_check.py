"""Scratch: TrueVision's Na__Test__BubbleNoteTooltip__ (pin b2aa9151) up to THE MENU section, run against this app's
LIVE LeaderGeometry, SpecLinks and the ported NoteTooltip. The menu part needs the W3-03 hub and is cut off."""
import os, re, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
src = subprocess.run(['git', '-C', r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb', 'show',
                      'b2aa9151:na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__BubbleNoteTooltip__.test.mjs'],
                     capture_output=True, check=True).stdout.decode('utf-8')
m = re.search(r"^const LE\s*=.*$", src, re.M)
assert m, 'LE line not found'
src = src[:m.start()] + "const LE = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor';" + src[m.end():]
cut = src.index("console.log('\\n  The menu (the shipped SheetTools ContextMenu)');")
tail = "\nconsole.log(failures === 0 ? '  PASS (to THE MENU)' : '  FAIL ' + failures);\nprocess.exit(failures === 0 ? 0 : 1);\n"
out = os.path.join(HERE, 'W2-21__notetip__check.mjs')
open(out, 'w', encoding='utf-8', newline='\n').write(src[:cut] + tail)
print('wrote', out)
