"""W2-23 - port TV Measurements 1.10.0 whole (LF, as git show returns it), re-applying only the
banner (K2 H1) and inserting the PORT NOTE block (K2 H5). Everything else is TV's bytes."""
import hashlib, os, sys

SCR = os.path.dirname(os.path.abspath(__file__))
TV  = os.path.join(SCR, 'tv.js')
VV  = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\30__System__SheetTools\Na__LayoutEditor__Measurements__.js"
BAK = os.path.join(SCR, 'vv_before.js')

tv = open(TV, 'rb').read()
assert b'\r\n' not in tv

# The live VV file must still be the one backed up at the start (no one changed it under us)
live = open(VV, 'rb').read()
if hashlib.sha256(live).hexdigest() != hashlib.sha256(open(BAK, 'rb').read()).hexdigest():
    sys.exit('STOP: the VV file changed since it was backed up')

old_banner = b'// TRUEVISION3D - LAYOUT EDITOR - MEASUREMENTS BOX\n'
new_banner = b'// VALEVISION3D - LAYOUT EDITOR - MEASUREMENTS BOX\n'
assert tv.count(old_banner) == 1
out = tv.replace(old_banner, new_banner, 1)

anchor = (b'//   and the setup and wording from Na__LayoutEditor__AppConfig__.json.\n'
          b'//\n'
          b'// -----------------------------------------------------------------------------\n'
          b'//\n'
          b'// DEVELOPMENT LOG:\n')
assert out.count(anchor) == 1

note_lines = [
    "// PORT NOTE:",
    "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Measurements__.js",
    "// - Source version: 1.10.0 (TrueVision3D v2.143.0, 22-Sep-2026; read at b2aa9151)",
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-23}} - whole, with TrueVision's log. This app's",
    "//                   copy was its 1.4.0 (17-Sep-2026), TrueVision 1.5.0's content: 1.0.0-1.2.0 came from",
    "//                   TrueVision3D v2.40-v2.47.0 (14-Sep-2026), and it carried TrueVision 1.3.0 and 1.4.0 (the",
    "//                   vertex retype, the dimension-end span) in code without logging them. It now takes",
    "//                   1.5.1 (placed when a zoom settles, v2.111.0), 1.6.0 (Say, v2.113.0), 1.7.0 (a move",
    "//                   reads live and stays retypable, v2.118.0), 1.8.0 (copy arrays, v2.119.0), 1.9.0",
    "//                   (vector tool readings, v2.130.0) and 1.10.0 (the Region and Area tools, v2.143.0).",
    "//                   It lands ahead of the SheetTools hub: every context call newer than 1.5.0 is",
    "//                   typeof-guarded, so this app's orchestrator, which does not hand them in yet, reads",
    "//                   and types as before. None of those six TrueVision releases is confirmed by Adam",
    "//                   in TrueVision; they come across under DR-01 (c) and are named so.",
    "// - Parity        : verbatim",
    "// - Divergences   :",
    "//   - Banner reads ValeVision3D. (No console output in this file.)",
    "// - Back-port     : none.",
    "//",
    "// -----------------------------------------------------------------------------",
    "//",
]
note = ('\n'.join(note_lines) + '\n').encode('utf-8')
insert_at = out.index(anchor) + len(anchor) - len(b'// DEVELOPMENT LOG:\n')
out = out[:insert_at] + note + out[insert_at:]

open(VV, 'wb').write(out)
print('written', len(out), 'bytes; CRLF:', out.count(b'\r\n'), 'LF:', out.count(b'\n'))
