# =============================================================================
# W1-29 scratch - apply the package: KeyScope 1.1.0 whole from TrueVision, and the 3D hotkey guard in VV's handler
# =============================================================================
#
# Usage (from anywhere):
#   python -B apply_w1_29.py --dry-run      build both files in memory, write candidates + diffs to candidate/
#   python -B apply_w1_29.py --apply        the same, then write the live files (pre-image hashes checked first)
#   python -B apply_w1_29.py --check-live   prove the live tree equals this script applied to the pre-images
#   python -B apply_w1_29.py --restore      put the handler's pre-image back and delete the new KeyScope module
#                                           (only if it is still exactly what this script wrote)
#
# Rules kept (execution policy 6-7, F.1 P1/P3/P18):
# - TrueVision is read ONLY at the pin, with git show, as bytes. A whole-file port writes TV's text as git show
#   returns it (LF), with only the named seams re-applied.
# - The existing VV handler is read as bytes and written back with its own line ending (CRLF): every anchor
#   must match exactly once, and the file must be wholly CRLF before and after.
# =============================================================================
import difflib
import hashlib
import json
import os
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, 'candidate')

KS_REL = '02__Src__AppModules/03__AppUtils/Na__AppUtils__KeyScope__.js'
HK_REL = '02__Src__AppModules/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js'
TV_KS_SHA1 = '7d076a21d8e8'          # first 12 of the blob content sha1 read in fetch_tv_at_pin.py
HK_PRE_SHA1 = 'c3dc374ce356f82db76502f7aecfcb705736e3a7'


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def live_path(rel):
    return os.path.join(VV, *rel.split('/'))


def replace_once(text, old, new, what):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'ANCHOR FAILED ({what}): expected exactly 1 match, found {count}')
    return text.replace(old, new)


# -----------------------------------------------------------------------------
# KeyScope 1.1.0 - TrueVision's file whole, seams only
# -----------------------------------------------------------------------------
def build_keyscope():
    data = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TV_APP + KS_REL], capture_output=True, check=True).stdout
    if not sha1(data).startswith(TV_KS_SHA1):
        raise SystemExit('TV KeyScope at the pin is not the blob this script was written against')
    if b'\r' in data:
        raise SystemExit('TV KeyScope from git show carries CR bytes; expected LF')
    text = data.decode('utf-8')

    # SEAM 1 - banner token (K2 H1)
    text = replace_once(text,
        '// TRUEVISION3D - APP UTILS - KEY SCOPE\n',
        '// VALEVISION3D - APP UTILS - KEY SCOPE\n',
        'banner')

    # SEAM 2 - the header names VV's 3D key handler (package vv_adaptations; DR-33)
    text = replace_once(text,
        '//               scenes (Na__Hotkeys__Manager, Na__Hotkeys__3dModelTab__.json).\n',
        '//               scenes (Na__AppUtils__ValeVision__HotkeyHandler__,\n'
        '//               Na__Hotkeys__3dModelTab__.json).\n',
        'description: model scope handler')
    text = replace_once(text,
        '//   10__NavigationAndCameras and never import the Layout Editor, and the Layout\n',
        '//   03__AppUtils and never import the Layout Editor, and the Layout\n',
        'description: where the 3D hotkeys live')
    text = replace_once(text,
        '// - Na__Hotkeys__Manager acts only in the model scope, and\n',
        '// - Na__AppUtils__ValeVision__HotkeyHandler__ acts only in the model scope, and\n',
        'integration: model scope handler')

    # SEAM 3 - VV's PORT NOTE replaces TV's own block (K2 H5)
    text = replace_once(text,
        '// PORT NOTE:\n'
        '// - Authored in   : TrueVision3D first (21-Sep-2026, v2.110.0)\n'
        '// - ValeVision    : not yet ported. ValeVision\'s own hotkey handler and its\n'
        '//                   Layout Editor have the same shape, so the same leaf fits.\n',
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/03__AppUtils/Na__AppUtils__KeyScope__.js\n'
        '// - Source version: 1.1.0 (TrueVision3D v2.115.0, 21-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-29}}\n'
        '// - Parity        : verbatim\n'
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '//   - The DESCRIPTION and INTEGRATION name ValeVision\'s 3D key handler,\n'
        '//     Na__AppUtils__ValeVision__HotkeyHandler__ in 03__AppUtils, where TrueVision\n'
        '//     names its Na__Hotkeys__Manager in 10__NavigationAndCameras: ValeVision keeps\n'
        '//     its own handler, the Na__ValeVision__HotkeysDictionary root key and the\n'
        '//     ValeVision__ actions (DR-33). The code is TrueVision\'s byte for byte.\n'
        '// - Back-port     : none.\n',
        'port note')

    # Proof that only the header moved: the code below the header is TV's byte for byte.
    tv_text = data.decode('utf-8')
    split = '// =============================================================================\n\n\n'
    tv_body = tv_text[tv_text.index(split, 10):]
    vv_body = text[text.index(split, 10):]
    if tv_body != vv_body:
        raise SystemExit('KeyScope body differs from TrueVision\'s below the header')
    return text.encode('utf-8'), data


# -----------------------------------------------------------------------------
# VV's 3D hotkey handler - the key-scope guard (TV Na__Hotkeys__Manager 2.1.0 hunks) and the no-callback skip
# -----------------------------------------------------------------------------
def build_handler(pre_bytes):
    if sha1(pre_bytes) != HK_PRE_SHA1:
        raise SystemExit('Handler pre-image hash is not the one this script was written against: ' + sha1(pre_bytes))
    crlf = pre_bytes.count(b'\r\n')
    lf = pre_bytes.count(b'\n')
    if crlf != lf or b'\r' in pre_bytes.replace(b'\r\n', b''):
        raise SystemExit('Handler pre-image is not wholly CRLF')
    text = pre_bytes.decode('utf-8').replace('\r\n', '\n')

    # HEADER - DESCRIPTION follows what the handler now does (VV's own text)
    text = replace_once(text,
        '// - Registers a single window keydown listener to handle all shortcuts.\n'
        '// - Skips dispatch when focus is on input, textarea, or select elements.\n'
        '// - Matches key, altKey, shiftKey, and ctrlKey against each binding.\n'
        '// - Dispatches matched action string to the registered callback map.\n',
        '// - Registers a single window keydown listener to handle all shortcuts.\n'
        '// - Acts only while the 3D Model tab has the keyboard: the model key scope\n'
        '//   of Na__AppUtils__KeyScope__, which follows the Layout Editor\'s mode\n'
        '//   controller. A drawing tab and a document tab each have a keyboard of\n'
        '//   their own, so their keys never reach the hidden 3D view.\n'
        '// - Skips dispatch when focus is on input, textarea, or select elements,\n'
        '//   or anything contenteditable (Na__KeyScope__IsTypingTarget).\n'
        '// - Matches key, altKey, shiftKey, and ctrlKey against each binding.\n'
        '// - Dispatches matched action string to the registered callback map. A\n'
        '//   binding whose action has no callback - the dictionary\'s drawing-markup\n'
        '//   rows, which document keys for the help panel - is passed over, and the\n'
        '//   key is left to the page.\n',
        'description')

    # HEADER - PORT NOTE (K2 H5, VV-authored twin) and the module log entry (VV's own sequence, newest first)
    text = replace_once(text,
        '// - Called from index.html after scene initialisation is complete.\n'
        '//\n'
        '// -----------------------------------------------------------------------------\n'
        '//\n'
        '// DEVELOPMENT LOG:\n'
        '// 01-Oct-2026 - Version 1.0.1 (hotkey file names, v2.71.1)\n',
        '// - Called from index.html after scene initialisation is complete.\n'
        '//\n'
        '// -----------------------------------------------------------------------------\n'
        '//\n'
        '// PORT NOTE:\n'
        '// - Authored in   : ValeVision3D first (1.0.0, 25-Jun-2026)\n'
        '// - Twin          : TrueVision3D 02__Src__AppModules/10__NavigationAndCameras/Na__Hotkeys__Manager.js,\n'
        '//                   whose array-driven dispatch (2.0.0, 16-Sep-2026) was taken from this file.\n'
        '//                   Its 2.1.0 key-scope guard and contenteditable typing test are replayed here\n'
        '//                   as hunks, over Na__AppUtils__KeyScope__ (ported whole beside this file)\n'
        '// - Source version: 2.1.0 (TrueVision3D v2.110.0, 21-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-29}}\n'
        '// - Parity        : diverged (ValeVision keeps its own handler, DR-33; only TrueVision\'s\n'
        '//                   guard is replayed)\n'
        '// - Divergences   :\n'
        '//   - ValeVision\'s own module: its file name, namespace and Initialize / Destroy API, the\n'
        '//     dictionary it fetches itself (TrueVision\'s Manager is handed its config), the root\n'
        '//     key Na__ValeVision__HotkeysDictionary and the ValeVision__ actions. TrueVision\'s\n'
        '//     key-label propagation (ApplyUiLabels, GetKeyLabel) is not taken: ValeVision\'s help\n'
        '//     panel builds its rows from the same file.\n'
        '//   - A binding whose action has no callback is passed over before the key is taken: the\n'
        '//     dictionary carries ten ValeVision__DrawingMarkup__Contextual rows that document\n'
        '//     drawing-markup keys for the help panel. TrueVision keeps its reference rows outside\n'
        '//     the dispatch array.\n'
        '//   - Console prefix [ValeVision3D].\n'
        '// - Back-port     : none.\n'
        '//\n'
        '// -----------------------------------------------------------------------------\n'
        '//\n'
        '// DEVELOPMENT LOG:\n'
        '// 01-Oct-2026 - Version 1.0.2 (key scope, {{VVREL:W1-29}})\n'
        '// - THE 3D MODEL TAB\'S KEYS ARE THE 3D MODEL TAB\'S. The listener sat on the\n'
        '//   window for the whole session and never asked which tab was up, so R, B,\n'
        '//   T, Y, V, 1-9 and Page Up / Page Down went on answering under the Layout\n'
        '//   Editor: T on a drawing picked the Text tool AND put the hidden model into\n'
        '//   Walk mode, R reset a camera nobody could see as it picked the Rectangle,\n'
        '//   and V toggled the scene carousel behind the sheet. It now acts only in the\n'
        '//   model key scope (Na__AppUtils__KeyScope__, ported whole from\n'
        '//   TrueVision3D), as TrueVision3D\'s Na__Hotkeys__Manager 2.1.0 does. The\n'
        '//   scope follows the Layout Editor\'s mode controller once the controller\n'
        '//   hands its reader over; until then it is the 3D model\'s, so the 3D Model\n'
        '//   tab\'s keys work exactly as before.\n'
        '// - The typing guard missed contenteditable, so a key was taken from any\n'
        '//   editable region - a plan annotation label being edited on the 3D Model\n'
        '//   tab among them. It now uses Na__KeyScope__IsTypingTarget, the same test\n'
        '//   with that case added.\n'
        '// - A binding with no callback is passed over before the key is taken. The\n'
        '//   dictionary\'s ten ValeVision__DrawingMarkup__Contextual rows document the\n'
        '//   drawing-markup keys for the help panel, and D, O, Delete and Escape were\n'
        '//   swallowed on every press with a "No callback" warning.\n'
        '//\n'
        '// 01-Oct-2026 - Version 1.0.1 (hotkey file names, v2.71.1)\n',
        'port note + log')

    # IMPORTS - TrueVision's import region, at TrueVision's position (after the header, before state)
    text = replace_once(text,
        '// =============================================================================\n'
        '\n'
        '\n'
        '// -----------------------------------------------------------------------------\n'
        '// REGION | Hotkey Handler - State\n',
        '// =============================================================================\n'
        '\n'
        '\n'
        '// -----------------------------------------------------------------------------\n'
        '// REGION | Module Imports\n'
        '// -----------------------------------------------------------------------------\n'
        '\n'
        '    // MODULE IMPORTS | Which Keyboard Is Live, and Whether the Focus Takes Typing\n'
        '    // ------------------------------------------------------------\n'
        '    // @delegate: ./Na__AppUtils__KeyScope__.js\n'
        '    // ------------------------------------------------------------\n'
        '    import { Na__KeyScope__MODEL, Na__KeyScope__Is, Na__KeyScope__IsTypingTarget } from \'./Na__AppUtils__KeyScope__.js\';\n'
        '    // ------------------------------------------------------------\n'
        '\n'
        '// endregion -------------------------------------------------------------------\n'
        '\n'
        '\n'
        '// -----------------------------------------------------------------------------\n'
        '// REGION | Hotkey Handler - State\n',
        'imports region')

    # TYPING TEST - TrueVision 2.1.0's hunk (contenteditable counted), VV's function name
    text = replace_once(text,
        '    // HELPER FUNCTION | Check if Focus is on an Interactive Input Element\n'
        '    // ------------------------------------------------------------\n'
        '    function Na__HotkeyHandler__IsInputFocused() {\n'
        '        const tag = document.activeElement && document.activeElement.tagName.toLowerCase(); // <-- Get focused element tag\n'
        '        return tag === \'input\' || tag === \'textarea\' || tag === \'select\';                   // <-- True if typing context is active\n'
        '    }\n',
        '    // HELPER FUNCTION | Check if Focus is on an Interactive Input Element\n'
        '    // ------------------------------------------------------------\n'
        '    // A text box, a text area, a list - or anything contenteditable, which the\n'
        '    // old tag test missed, so a key was taken from any editable region.\n'
        '    // ------------------------------------------------------------\n'
        '    function Na__HotkeyHandler__IsInputFocused() {\n'
        '        return Na__KeyScope__IsTypingTarget(document.activeElement);          // <-- True if typing context is active\n'
        '    }\n',
        'typing test')

    # SCOPE GUARD - TrueVision 2.1.0's first line; then VV's skip for a binding with no callback (S03a-V04)
    text = replace_once(text,
        '    function Na__HotkeyHandler__HandleKeyDown(event) {\n'
        '        if (Na__HotkeyHandler__IsInputFocused()) return;                     // <-- Skip when typing in input fields\n'
        '\n'
        '        for (const binding of Na__HotkeyHandler__Bindings) {\n'
        '            if (Na__HotkeyHandler__MatchesBinding(event, binding)) {\n'
        '                event.preventDefault();                                      // <-- Prevent default browser behaviour\n',
        '    function Na__HotkeyHandler__HandleKeyDown(event) {\n'
        '        if (!Na__KeyScope__Is(Na__KeyScope__MODEL)) return;                  // <-- A drawing or a document tab has the keyboard: its keys are its own\n'
        '        if (Na__HotkeyHandler__IsInputFocused()) return;                     // <-- Skip when typing in input fields\n'
        '\n'
        '        for (const binding of Na__HotkeyHandler__Bindings) {\n'
        '            if (Na__HotkeyHandler__MatchesBinding(event, binding)) {\n'
        '                if (typeof Na__HotkeyHandler__ActionCallbacks[binding.Na__Hotkey__Action] !== \'function\') continue; // <-- A documentation row (no callback): not a shortcut, the key stays the page\'s\n'
        '                event.preventDefault();                                      // <-- Prevent default browser behaviour\n',
        'scope guard + no-callback skip')

    out = text.replace('\n', '\r\n').encode('utf-8')
    if out.count(b'\r\n') != out.count(b'\n'):
        raise SystemExit('Handler candidate is not wholly CRLF')
    return out


def unified(a_bytes, b_bytes, a_name, b_name):
    a = a_bytes.decode('utf-8').replace('\r\n', '\n').splitlines(keepends=True)
    b = b_bytes.decode('utf-8').replace('\r\n', '\n').splitlines(keepends=True)
    return ''.join(difflib.unified_diff(a, b, a_name, b_name, n=3))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--dry-run'
    manifest = json.load(open(os.path.join(HERE, 'preimage_manifest.json'), encoding='utf-8'))
    hk_pre = open(os.path.join(HERE, 'preimage', os.path.basename(HK_REL)), 'rb').read()
    if sha1(hk_pre) != manifest[HK_REL]['sha1']:
        raise SystemExit('saved pre-image does not match its manifest')

    if mode == '--restore':
        ks_live = live_path(KS_REL)
        if os.path.exists(ks_live):
            ks_now = open(ks_live, 'rb').read()
            ks_mine, _ = build_keyscope()
            if ks_now != ks_mine:
                raise SystemExit('REFUSED: the live KeyScope is not the file this script wrote; not deleting it')
            os.remove(ks_live)
            print('deleted', KS_REL)
        open(live_path(HK_REL), 'wb').write(hk_pre)
        print('restored', HK_REL, sha1(hk_pre))
        return

    ks_new, tv_ks = build_keyscope()
    hk_new = build_handler(hk_pre)

    if mode == '--check-live':
        ok = True
        for rel, want in ((KS_REL, ks_new), (HK_REL, hk_new)):
            got = open(live_path(rel), 'rb').read() if os.path.exists(live_path(rel)) else None
            same = got == want
            ok = ok and same
            print(('SAME     ' if same else 'DIFFERENT'), rel, sha1(got) if got is not None else '(missing)')
        sys.exit(0 if ok else 1)

    os.makedirs(CAND, exist_ok=True)
    open(os.path.join(CAND, 'Na__AppUtils__KeyScope__.js'), 'wb').write(ks_new)
    open(os.path.join(CAND, 'Na__AppUtils__ValeVision__HotkeyHandler__.js'), 'wb').write(hk_new)
    open(os.path.join(CAND, 'diff_KeyScope_vs_TV_at_pin.diff'), 'w', encoding='utf-8', newline='\n').write(
        unified(tv_ks, ks_new, 'TV b2aa9151:' + KS_REL, 'VV ' + KS_REL))
    open(os.path.join(CAND, 'diff_HotkeyHandler_vs_preimage.diff'), 'w', encoding='utf-8', newline='\n').write(
        unified(hk_pre, hk_new, 'VV pre-image ' + HK_REL, 'VV ' + HK_REL))
    print('KeyScope candidate :', len(ks_new), 'bytes, LF, sha1', sha1(ks_new))
    print('Handler candidate  :', len(hk_new), 'bytes, CRLF, sha1', sha1(hk_new))

    if mode == '--dry-run':
        print('dry run: nothing written to the live tree')
        return
    if mode != '--apply':
        raise SystemExit('unknown mode ' + mode)

    # Write-time checks: nothing changed under us since the pre-image was taken.
    hk_live = open(live_path(HK_REL), 'rb').read()
    if sha1(hk_live) != HK_PRE_SHA1:
        raise SystemExit('REFUSED: the live handler changed since the pre-image (' + sha1(hk_live) + ')')
    if os.path.exists(live_path(KS_REL)):
        raise SystemExit('REFUSED: ' + KS_REL + ' already exists in the live tree')
    open(live_path(KS_REL), 'wb').write(ks_new)
    open(live_path(HK_REL), 'wb').write(hk_new)
    print('applied: wrote', KS_REL, 'and', HK_REL)


if __name__ == '__main__':
    main()
