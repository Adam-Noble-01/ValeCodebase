"""W2-20: whole-file ports of ContextMenu 1.1.0 and SheetTools__HoverTooltip 1.1.0 from TV at b2aa9151."""
import os, shutil, subprocess, sys

SCRATCH = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\30__System__SheetTools'
TVREPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVPATH = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/'


def tv(name):
    return subprocess.run(['git', '-C', TVREPO, 'show', 'b2aa9151:' + TVPATH + name], check=True, capture_output=True).stdout


def swap(text, old, new):
    if text.count(old) != 1:
        sys.exit('anchor count %d for %r' % (text.count(old), old[:80]))
    return text.replace(old, new)


# ---------------------------------------------------------------- ContextMenu
name = 'Na__LayoutEditor__ContextMenu__.js'
src = tv(name)
assert b'\r\n' not in src
t = src.decode('utf-8')
t = swap(t, '// TRUEVISION3D - LAYOUT EDITOR - CONTEXT MENU\n', '// VALEVISION3D - LAYOUT EDITOR - CONTEXT MENU\n')
old_note = t[t.index('// PORT NOTE:\n'):t.index('// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:')]
new_note = (
    '// PORT NOTE:\n'
    '// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.7, port Phase 5); TrueVision3D took it\n'
    '//                   for its v2.21.0 and grew it to 1.1.0, while this app\'s copy stayed at 1.0.0; since\n'
    '//                   ported back whole from TrueVision3D 1.1.0 (HEAD b2aa9151)\n'
    '// - Source version: 1.1.0 (TrueVision3D v2.123.0, 21-Sep-2026; read at b2aa9151)\n'
    '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-20}}\n'
    '// - Parity        : verbatim - TrueVision\'s file; the banner and this note are the only differences.\n'
    '//                   TrueVision\'s own note held 1.1.0 for Adam\'s sign-off (v2.123.0: "NOT tried by\n'
    '//                   Adam"), not given yet. Ported under DR-01 (c): the Port Record names every\n'
    '//                   TrueVision release it carries that Adam has not confirmed in TrueVision itself.\n'
    '//                   The exports are unchanged, so every existing caller reads as before; nothing\n'
    '//                   here passes a submenu or a hint until the Layer row lands (W2-21, W3-03).\n'
    '// - Divergences   :\n'
    '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
    '// - Back-port     : none.\n'
    '//\n'
)
t = t.replace(old_note, new_note)
assert 'TRUEVISION3D' not in t and '[TrueVision3D' not in t
out = os.path.join(VV, name)
bak = os.path.join(SCRATCH, 'VV_before__' + name)
if not os.path.exists(bak):
    shutil.copyfile(out, bak)
with open(out, 'wb') as f:
    f.write(t.encode('utf-8'))
print('wrote', out, len(t))

# ---------------------------------------------------------------- HoverTooltip
name = 'Na__LayoutEditor__SheetTools__HoverTooltip__.js'
src = tv(name)
assert b'\r\n' not in src
t = src.decode('utf-8')
t = swap(t, '// TRUEVISION3D - LAYOUT EDITOR - SHEET TOOLS - HOVER TOOLTIP\n', '// VALEVISION3D - LAYOUT EDITOR - SHEET TOOLS - HOVER TOOLTIP\n')
anchor = '// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n'
note = (
    '// -----------------------------------------------------------------------------\n'
    '//\n'
    '// PORT NOTE:\n'
    '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__HoverTooltip__.js\n'
    '// - Source version: 1.1.0 (TrueVision3D v2.144.0, 22-Sep-2026; read at b2aa9151)\n'
    '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-20}}\n'
    '// - Parity        : verbatim - TrueVision\'s file; the banner and this note are the only differences.\n'
    '//                   1.0.0 came in TrueVision commit 4f6bb9ef with v2.65.0 (18-Sep-2026) and is not\n'
    '//                   named in that devlog entry, which is why this app\'s port of v2.65.0 (v2.58.0)\n'
    '//                   missed it. TrueVision\'s v2.144.0 entry says "NOT tried by Adam"; ported under\n'
    '//                   DR-01 (c) and named in the Port Record. Inert until its callers land\n'
    '//                   (SheetTools__NoteTooltip__ with W2-21, the PointerDrag hover pass with W3-03).\n'
    '// - Divergences   :\n'
    '//   - Banner reads ValeVision3D; this PORT NOTE is added (TrueVision\'s file has none). (No console\n'
    '//     output in this file.)\n'
    '// - Back-port     : none.\n'
    '//\n'
)
t = swap(t, anchor, note + anchor)
assert 'TRUEVISION3D' not in t and '[TrueVision3D' not in t
out = os.path.join(VV, name)
assert not os.path.exists(out) or open(out, 'rb').read() == t.encode('utf-8'), 'HoverTooltip already exists in VV'
with open(out, 'wb') as f:
    f.write(t.encode('utf-8'))
print('wrote', out, len(t))
