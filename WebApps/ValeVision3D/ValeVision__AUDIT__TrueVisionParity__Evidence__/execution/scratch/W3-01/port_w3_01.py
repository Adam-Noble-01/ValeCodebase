"""W3-01 port: SheetTools__State__ 1.8.0 and SheetTools__ToolState__ 1.7.0 (+v2.152.0, v2.90.0) whole from TV at b2aa9151.

Usage:
  python port_w3_01.py --stage    write staged copies to scratch/W3-01/staged/ and print diffs vs TV
  python port_w3_01.py --apply    write the staged text over the live VV files (backups already in backup/)
  python port_w3_01.py --restore  put the backups back
Seams: banner line 2 and the PORT NOTE block only. Everything else is TV's text as git show returns it (LF).
"""
import difflib
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TV_REPO = r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb'
PIN = 'b2aa9151'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
REL = '02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/'
VV_ROOT = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/'

STATE_NOTE = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 15-Sep-2026, v2.47.0: split out of
//                   Na__LayoutEditor__SheetTools__.js); TrueVision3D took the split back and grew it
//                   to 1.8.0, while this app's copy stayed at its 1.1.0 (TrueVision's 1.2.0); since
//                   ported back whole from TrueVision3D 1.8.0 (HEAD b2aa9151)
// - Source version: 1.8.0 (TrueVision3D v2.143.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-01}} - whole, as the hub's sub-wave A
//                   (S05a-V01): LastPress and PressTravelled (1.3.0, v2.78.0), the F6-F8 and F9
//                   chords (1.4.0, v2.113.0; 1.7.0, v2.131.0), MoveRetype (1.5.0, v2.118.0), the
//                   vector tools' names in TOOLS (1.6.0, v2.130.0), TOOL_REGION (1.8.0, v2.143.0),
//                   and two changes TrueVision never logged in this file: TOOL_AREA (v2.104.0) and
//                   Edit__Cut in SHEET_CHORDS (v2.75.0). TrueVision's entries for those releases say
//                   "NOT tried by Adam" or record no confirmation; ported under DR-01 (c) and named
//                   in the Port Record.
// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.
//                   The exports are a superset of this app's 1.1.0, so every existing importer reads
//                   as before.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//
"""

TOOLSTATE_NOTE = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 15-Sep-2026, v2.47.0: split out of
//                   Na__LayoutEditor__SheetTools__.js); TrueVision3D took the split back and grew it
//                   to 1.7.0, while this app's copy stayed at 1.1.0; since ported back whole from
//                   TrueVision3D 1.7.0 (HEAD b2aa9151)
// - Source version: 1.7.0 (TrueVision3D v2.149.0, 22-Sep-2026; read at b2aa9151), with two changes
//                   TrueVision never logged in this file: the new-shape hatch defaults (v2.90.0) and
//                   the new-dimension linePt, dashOn and dash defaults (v2.152.0)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-01}} - whole, as the hub's sub-wave A
//                   (S05a-V01): PickUpMove, PutDownMove, IsMoveAuto and ApplyTool (1.2.0, v2.78.0),
//                   the move retype cleared (1.3.0, v2.118.0), the vector tools (1.4.0, v2.130.0),
//                   roundUp (1.5.0, v2.139.0), placing into an open group (1.6.0, v2.142.0) and the
//                   move anchor dropped (1.7.0, v2.149.0). This app's "atScale : true" hard-coding
//                   is gone: atScale now reads the config's DefaultAtScale (true for both, so new
//                   dimensions and vectors measure as before). TrueVision's entries for those
//                   releases say "NOT tried by Adam" or record no confirmation; ported under
//                   DR-01 (c) and named in the Port Record. PickUpMove, PutDownMove and IsMoveAuto
//                   (DR-40 item 7, held) have no caller until W3-03's hub, behind its guards.
// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.
//                   TrueVision's ViewportSnapMove divergence no longer applies: this app has
//                   Na__LayoutEditor__ViewportSnapMove__ (28__System__ObjectSnap) too.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//
"""

FILES = [
    ('Na__LayoutEditor__SheetTools__State__.js', 'STATE', STATE_NOTE),
    ('Na__LayoutEditor__SheetTools__ToolState__.js', 'TOOL STATE', TOOLSTATE_NOTE),
]


def tv_bytes(name):
    return subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':' + TV_APP + REL + name],
                          check=True, capture_output=True).stdout


def build(name, banner_tail, note):
    src = tv_bytes(name).decode('utf-8')
    assert '\r' not in src, 'TV text has CR'
    old_banner = '// TRUEVISION3D - LAYOUT EDITOR - SHEET TOOLS - ' + banner_tail + '\n'
    new_banner = '// VALEVISION3D - LAYOUT EDITOR - SHEET TOOLS - ' + banner_tail + '\n'
    assert src.count(old_banner) == 1, name + ': banner not matched once'
    out = src.replace(old_banner, new_banner)
    start = out.index('// PORT NOTE:\n')
    assert out.count('// PORT NOTE:\n') == 1
    end = out.index('// -----------------------------------------------------------------------------\n', start)
    out = out[:start] + note + out[end:]
    assert 'TRUEVISION3D' not in out
    return src, out


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--stage'
    staged_dir = os.path.join(HERE, 'staged')
    os.makedirs(staged_dir, exist_ok=True)
    for name, tail, note in FILES:
        live = os.path.join(VV_ROOT, REL, name)
        backup = os.path.join(HERE, 'backup', name)
        if mode == '--restore':
            with open(backup, 'rb') as f:
                data = f.read()
            with open(live, 'wb') as f:
                f.write(data)
            print('restored', name)
            continue
        src, out = build(name, tail, note)
        if mode == '--stage':
            with open(os.path.join(staged_dir, name), 'wb') as f:
                f.write(out.encode('utf-8'))
            diff = difflib.unified_diff(src.splitlines(), out.splitlines(), 'tv/' + name, 'vv/' + name, lineterm='', n=0)
            print('\n'.join(diff))
        elif mode == '--apply':
            with open(backup, 'rb') as f:
                before = f.read()
            with open(live, 'rb') as f:
                now = f.read()
            assert before == now, name + ' changed since the backup was taken - stop'
            with open(live, 'wb') as f:
                f.write(out.encode('utf-8'))
            print('applied', name, len(out.encode('utf-8')), 'bytes')


if __name__ == '__main__':
    main()
