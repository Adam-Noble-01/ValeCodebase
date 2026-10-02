"""W2-20: add TV's context-menu and hover-tooltip rules to VV's Paper CSS, verbatim, preserving CRLF."""
import os, shutil, subprocess, sys

SCRATCH = os.path.dirname(os.path.abspath(__file__))
VVFILE = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\10__Core__SheetSurface\Na__LayoutEditor__Styles__Main__Paper__.css'
TVREPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVPATH = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css'

tv = subprocess.run(['git', '-C', TVREPO, 'show', 'b2aa9151:' + TVPATH], check=True, capture_output=True).stdout.decode('utf-8').replace('\r\n', '\n')


def cut(text, start, end):
    """TV text from the line starting `start` up to (not including) `end`."""
    if text.count(start) != 1 or text.count(end) < 1:
        sys.exit('TV anchor missing: %r' % start[:60])
    a = text.index(start)
    b = text.index(end, a)
    return text[a:b]


hovertip = cut(tv, '/* HOVER TOOLTIP | Fixed to the viewport', '/* endregion ------------------------------------------------------- */')
menu = cut(tv, '/* SOME OF THE SELECTION, NOT ALL OF IT', '/* endregion ------------------------------------------------------- */')
# Both blocks end with the blank line before the endregion marker.
assert hovertip.endswith('}\n\n') and menu.endswith('}\n\n')
assert '.na-le-hovertip__lead' in hovertip and '.na-le-menu--flyout' in menu and '.na-le-grip' not in menu

raw = open(VVFILE, 'rb').read()
assert raw.count(b'\r\n') == raw.count(b'\n'), 'expected a CRLF file'
bak = os.path.join(SCRATCH, 'VV_before__Na__LayoutEditor__Styles__Main__Paper__.css')
if not os.path.exists(bak):
    shutil.copyfile(VVFILE, bak)
t = raw.decode('utf-8').replace('\r\n', '\n')
if '.na-le-hovertip' in t or '.na-le-menu--flyout' in t:
    sys.exit('rules already present')


def insert_after(text, anchor, block):
    if text.count(anchor) != 1:
        sys.exit('VV anchor count %d: %r' % (text.count(anchor), anchor[:60]))
    return text.replace(anchor, anchor + block)


# 1. Hover tooltip: after the linework progress rules, at TV's position in the region.
t = insert_after(t, '.na-le-frame__progress[hidden] {\n    display                            : none;\n}\n\n', hovertip)
# 2. Menu: after the separator rule, at TV's position (end of the Selection States region).
t = insert_after(t, '.na-le-menu__separator {\n    height                             : 1px;\n    margin                             : 4px 0;\n    background                         : rgba(23, 43, 58, 0.14);\n}\n\n', menu)
# 3. Header note.
head_anchor = (' *                 rule (the viewports box, the chrome and the markup at once) went with them. The snap marker\n'
               ' *                 and grip rules stay this app\'s until W2-19 and W2-24 take TrueVision\'s.\n')
head_add = (' * - Context menu: 02-Oct-2026 for ValeVision3D {{VVREL:W2-20}}: the menu\'s mixed, hinted, hint, submenu, open\n'
            ' *                 and flyout rules and the hover tooltip (.na-le-hovertip, [hidden], __lead) are TrueVision3D\'s,\n'
            ' *                 verbatim, at TrueVision\'s positions (read at b2aa9151: ContextMenu 1.1.0, v2.123.0;\n'
            ' *                 SheetTools__HoverTooltip 1.1.0, v2.144.0).\n')
t = insert_after(t, head_anchor, head_add)

with open(VVFILE, 'wb') as f:
    f.write(t.replace('\n', '\r\n').encode('utf-8'))
print('ok', len(t))
