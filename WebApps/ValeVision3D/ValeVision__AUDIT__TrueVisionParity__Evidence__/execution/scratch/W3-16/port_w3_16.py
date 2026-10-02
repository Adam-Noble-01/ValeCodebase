# W3-16 - PdfExporter whole-file port from TrueVision 1.12.0 (pin b2aa9151) with the VV seams re-applied.
# Reads TV's bytes (LF, as git show returns them), applies each seam exactly once, writes the VV target.
import hashlib, subprocess, sys

PIN    = 'b2aa9151'
TVREL  = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js'
TARGET = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\60__Feature__PdfExport\Na__LayoutEditor__PdfExporter__.js'
SNAP   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W3-16\vv_before.js'

tv = subprocess.run(['git', '-C', r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb', 'show', PIN + ':' + TVREL],
                    capture_output=True, check=True).stdout
assert b'\r\n' not in tv

# The file must still be the one snapshotted at the start of the package
live = open(TARGET, 'rb').read()
if live != open(SNAP, 'rb').read():
    sys.exit('STOP: the target changed since the snapshot')

text = tv.decode('utf-8')

def sub(old, new, count=1):
    global text
    n = text.count(old)
    if n != count:
        sys.exit('STOP: expected %d of %r, found %d' % (count, old[:80], n))
    text = text.replace(old, new)

# 1. Banner (K2 H1)
sub('// TRUEVISION3D - LAYOUT EDITOR - PDF EXPORTER\n', '// VALEVISION3D - LAYOUT EDITOR - PDF EXPORTER\n')

# 2. PORT NOTE (K2 H5) - replaces TrueVision's own block
OLD_NOTE = (
"// PORT NOTE:\n"
"// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__PdfExporter__.js\n"
"// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n"
"// - Parity        : verbatim\n"
"// - Divergences   : Console prefix, header and folder numbers only.\n"
"// - Back-port     : n/a (this IS the back-port)\n"
)
NEW_NOTE = (
"// PORT NOTE:\n"
"// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0 port Phase 5, from\n"
"//                   35__System__PageLayoutSystem/Na__PageLayoutSystem__PdfExport__A3__.js and Lantern\n"
"//                   Designer's SheetChrome DrawToPdf); since ported back whole from TrueVision3D 1.12.0\n"
"//                   (HEAD b2aa9151)\n"
"// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js\n"
"// - Source version: 1.12.0 (TrueVision3D v2.160.0, 23-Sep-2026; 1.11.0 v2.155.0, 1.10.0 v2.143.0,\n"
"//                   1.9.0 v2.138.0, 1.8.0 v2.116.0, 1.7.0 v2.106.0, 1.6.0 v2.94.0, 1.3.0 v2.50.0,\n"
"//                   1.2.0 v2.49.0, 1.0.3 v2.32.0; the file name's DocumentId line v2.75.0, logged\n"
"//                   nowhere in TrueVision; read at b2aa9151)\n"
"// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-16}} - whole (package W3-16): site plan\n"
"//                   fills, hatches and holes (1.2.0, 1.12.0), depth fog (1.6.0), Sheet Images (1.8.0),\n"
"//                   turned viewports (1.9.0), the note-region toast (1.10.0) and the file named on the\n"
"//                   whole Document ID (v2.75.0). Site plans stay dormant here (no site plan sheets,\n"
"//                   DR-08 (B)) and Model Source is always the live model (one design phase, DR-09 (a)),\n"
"//                   exactly as TrueVision's code reads them. This app's copy was 1.2.4 (v2.71.3): its\n"
"//                   own sequence 1.0.0-1.2.0 (1.2.0 = TrueVision 1.3.0, v2.50.0), then the linework\n"
"//                   call (1.2.1), FAST packing and options (1.2.2, TrueVision 1.11.0), Open Sans\n"
"//                   (1.2.3, TrueVision 1.4.0) and paint order (1.2.4, TrueVision 1.7.0), all\n"
"//                   v2.71.2-v2.71.3. TrueVision's v2.32.0, v2.49.0, v2.75.0, v2.94.0, v2.106.0,\n"
"//                   v2.116.0, v2.138.0, v2.143.0 and v2.160.0 are NOT confirmed by Adam for this\n"
"//                   path; ported under DR-01 (c).\n"
"// - Parity        : adapted - TrueVision's file; the banner, this note, the 1.12.1 log entry and\n"
"//                   the seams below are the only differences.\n"
"// - Divergences   :\n"
"//   - Banner, console prefix ([ValeVision3D LayoutEditor]) and the PDF's subject (\"ValeVision3D\n"
"//     sheet ...\") read ValeVision3D.\n"
"//   - The file name's project code is Na__DrawData__GetDocumentCode() - the loaded project's own\n"
"//     code (3047) - where TrueVision hands over Na__DrawData__GetProjectCode(), which in this app\n"
"//     answers the ?project= token (2026/3047__Doous) every save is addressed by (DR-11, OC-13).\n"
"// - Back-port     : none.\n"
)
sub(OLD_NOTE, NEW_NOTE)

# 3. Module log: one ValeVision entry over TrueVision's verbatim log (OC-13's log entry)
sub("// DEVELOPMENT LOG:\n// 23-Sep-2026 - Version 1.12.0 (TrueVision)\n",
    "// DEVELOPMENT LOG:\n"
    "// 02-Oct-2026 - Version 1.12.1 (the document code, {{VVREL:W3-16}})\n"
    "// - A downloaded sheet is named after its whole Document ID - 3047_D01,\n"
    "//   not the D01 the register writes - as TrueVision's has been since its\n"
    "//   v2.75.0, whose batch commit carried the one line and logged nothing:\n"
    "//   Na__LePdf__Filename hands fields.DocumentId to the name builder as the\n"
    "//   drawing code. The project code it hands over beside it is the\n"
    "//   project's own (Na__DrawData__GetDocumentCode, DR-11), never the\n"
    "//   ?project= token this app is opened with (2026/3047__Doous).\n"
    "//\n"
    "// 23-Sep-2026 - Version 1.12.0 (TrueVision)\n")

# 4. The document-code seam (DR-11, OC-13)
sub("    import { Na__DrawData__GetProjectCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';\n",
    "    import { Na__DrawData__GetDocumentCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';   // <-- ValeVision: the document code, not the ?project= token (DR-11)\n")
sub("            projectCode : Na__DrawData__GetProjectCode()\n",
    "            projectCode : Na__DrawData__GetDocumentCode()                         // <-- ValeVision: the project's own code (3047), never the folder token (DR-11)\n")

# 5. Console prefix (K2 C1) and the PDF subject
sub("[TrueVision3D LayoutEditor]", "[ValeVision3D LayoutEditor]", 2)
sub("subject : 'TrueVision3D sheet '", "subject : 'ValeVision3D sheet '")

assert 'TrueVision3D sheet' not in text and '[TrueVision3D' not in text and 'TRUEVISION3D' not in text
assert 'GetProjectCode' not in text.split('// =============================================================================\n\n\n', 1)[1]

out = text.encode('utf-8')
open(TARGET, 'wb').write(out)
print('written', len(out), 'bytes, sha1', hashlib.sha1(out).hexdigest())
