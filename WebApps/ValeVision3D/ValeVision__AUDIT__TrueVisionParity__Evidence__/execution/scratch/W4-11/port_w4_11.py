"""W4-11: port the context-menu renderer leaf and its stylesheet from TrueVision at the pin,
and @import the stylesheet from VV's CSS index at TrueVision's position."""
import os
import subprocess
import sys

PIN = 'b2aa9151'
TV_GIT = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
REL_DIR = '02__Src__AppModules/27__System__ContextMenuSystem/'
JS = 'Na__ContextMenuSystem__Ui__MenuRenderer__.js'
CSS = 'Na__ContextMenuSystem__Styles__.css'
INDEX = os.path.join(VV, '03__Style__AppStylesheets', 'Na__CoreUi__Styles__Index__.css')


def tv_show(rel):
    return subprocess.run(['git', '-C', TV_GIT, 'show', f'{PIN}:{TV_APP}{rel}'],
                          check=True, capture_output=True).stdout


def replace_once(data, old, new, what):
    n = data.count(old)
    if n != 1:
        sys.exit(f'FAIL {what}: expected 1 match, found {n}')
    return data.replace(old, new)


# --- Renderer -------------------------------------------------------------
js = tv_show(REL_DIR + JS)
assert b'\r\n' not in js
js = replace_once(js, b'// TRUEVISION3D - CONTEXT MENU SYSTEM - MENU RENDERER\n',
                  b'// VALEVISION3D - CONTEXT MENU SYSTEM - MENU RENDERER\n', 'js banner')

port_note = (
    b'// PORT NOTE:\n'
    b'// - Ported from   : TrueVision3D 02__Src__AppModules/27__System__ContextMenuSystem/Na__ContextMenuSystem__Ui__MenuRenderer__.js\n'
    b'// - Source version: 1.0.0 (TrueVision3D v2.10.0, 30-Aug-2026; read at b2aa9151)\n'
    b'// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-11}}\n'
    b'// - Parity        : verbatim\n'
    b'// - Divergences   :\n'
    b'//   - Banner reads ValeVision3D. (No console output in this file.)\n'
    b'//   - Renderer only (DR-44): the driver INTEGRATION names, Na__ContextMenuSystem__SystemLogic__.js,\n'
    b'//     and the rest of TrueVision\'s 3D right-click menu (RightClickGuard, HitResolver, the Sections,\n'
    b'//     the AppConfig) are not ported, so ValeVision has no 3D right-click menu. The Statement\n'
    b'//     Writer\'s Page and Figure are the callers here; nothing calls ApplyConfig, so the built-in\n'
    b'//     defaults hold.\n'
    b'// - Back-port     : none.\n'
    b'//\n'
    b'// -----------------------------------------------------------------------------\n'
    b'//\n'
)
js = replace_once(js, b'// DEVELOPMENT LOG:\n', port_note + b'// DEVELOPMENT LOG:\n', 'js port note')

# --- Stylesheet -----------------------------------------------------------
css = tv_show(REL_DIR + CSS)
assert b'\r\n' not in css
css_note = (
    b' * CREATED : 30-Aug-2026\n'
    b' *\n'
)
css_port = (
    b'/*\n'
    b'   PORT NOTE:\n'
    b'   - Ported from   : TrueVision3D 02__Src__AppModules/27__System__ContextMenuSystem/Na__ContextMenuSystem__Styles__.css\n'
    b'   - Source version: none of its own - the sheet as TrueVision3D v2.10.0 left it (30-Aug-2026, commit\n'
    b'                     f0c09ffd; read at b2aa9151)\n'
    b'   - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-11}}, @imported by\n'
    b'                     03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css at TrueVision\'s place\n'
    b'                     in its index (after the Presentation Mode sheets, before the drawing sheets)\n'
    b'   - Parity        : verbatim (the rules and TrueVision\'s header are unchanged; this note is the only\n'
    b'                     difference)\n'
    b'   - Divergences   :\n'
    b'     - None in the rules. TrueVision\'s banner carries no app token, so it is unchanged.\n'
    b'   - Legacy        : TrueVision\'s copy of this sheet has no module version, so the Source version names\n'
    b'                     the release and the commit instead.\n'
    b'   - Back-port     : none.\n'
    b'*/\n'
)
anchor = b'/* ================================================================= */\n\n\n/* Menu Container */\n'
css = replace_once(css, anchor,
                   b'/* ================================================================= */\n' + css_port
                   + b'\n\n/* Menu Container */\n', 'css port note')
assert css_note in css

# --- CSS index (CRLF file; keep its own endings) --------------------------
idx = open(INDEX, 'rb').read()
eol = b'\r\n' if b'\r\n' in idx else b'\n'
if b'ContextMenuSystem' in idx:
    sys.exit('FAIL index already names ContextMenuSystem')
anchor_idx = (b"@import url('../02__Src__AppModules/21__System__PresentationMode/"
              b"Na__PresentationMode__Styles__SceneGroupSelector__.css');" + eol)
block = (eol
         + b'/* Context Menu System - Floating Right-Click Menu (the renderer the Statement Writer uses; TrueVision\'s place: after Presentation Mode, before the drawing sheets) */' + eol
         + b'/* ----------------------------------------------------------------- */' + eol
         + b"@import url('../02__Src__AppModules/27__System__ContextMenuSystem/Na__ContextMenuSystem__Styles__.css');" + eol)
idx_new = replace_once(idx, anchor_idx, anchor_idx + block, 'index anchor')

# --- Write ----------------------------------------------------------------
out_dir = os.path.join(VV, REL_DIR.replace('/', os.sep))
if os.path.exists(os.path.join(out_dir, JS)) or os.path.exists(os.path.join(out_dir, CSS)):
    sys.exit('FAIL target exists already')
os.makedirs(out_dir, exist_ok=True)
open(os.path.join(out_dir, JS), 'wb').write(js)
open(os.path.join(out_dir, CSS), 'wb').write(css)
open(INDEX, 'wb').write(idx_new)
print('OK', len(js), len(css), len(idx), '->', len(idx_new))
