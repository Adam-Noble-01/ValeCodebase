# =============================================================================
# W1-26 scratch: build, verify, land and (if ever needed) restore the package's files.
# =============================================================================
#   python -B port_w1_26.py --build      candidates into candidate/ (nothing in the tree is touched)
#   python -B port_w1_26.py --verify     each whole-file port against TrueVision at the pin, line by line
#                                        (only the declared seam lines may differ); each edit against the live file
#   python -B port_w1_26.py --write      pre-images into preimage/ (hash-checked against PRE below), then one
#                                        whole write per file; refuses if any live file is not as recorded
#   python -B port_w1_26.py --restore    puts the pre-images back (removes the two new files); refuses a file
#                                        changed since this script wrote it
# TrueVision is read only at b2aa9151 with git show (bytes). Whole-file ports are written as git show returns
# them (LF); edited files keep their own line endings. Every replacement must match exactly the number of
# times it is declared to, or the build stops.
# =============================================================================
import difflib
import hashlib
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
TVAPP = "na-apps/30__TrueVision__CoreAppCode/"
CAND = os.path.join(HERE, "candidate")
PREIMG = os.path.join(HERE, "preimage")
WRITTEN = os.path.join(HERE, "written__sha256.json")
LE = "02__Src__AppModules/51__System__LayoutEditor/"

# Live bytes this package found (sha1 prefix) - None = the file does not exist yet.
PRE = {
    LE + "10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js": "a62b6377",
    LE + "10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Modern__.js": "68dfd77f",
    LE + "10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__QrCell__.js": None,
    LE + "15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js": "c5d4058e",
    LE + "15__Core__Markup/Na__LayoutEditor__DimensionGeometry__.js": "65519215",
    LE + "15__Core__Markup/Na__LayoutEditor__LeaderGeometry__.js": "8e4dd278",
    "80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.test.mjs": "96bb8209",
    "80__Testing__PrototypeEnvironment/Na__Test__TitleBlockScaleCell__.html": None,
    LE + "03__Core__Config/Na__LayoutEditor__AppConfig__.json": "82efca9a",
    LE + "03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js": "293867e9",
    "80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs": "58014790",
}


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def tv(rel):
    return subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + TVAPP + rel], capture_output=True, check=True).stdout


def live(rel):
    path = os.path.join(VV, rel.replace("/", os.sep))
    return open(path, "rb").read() if os.path.exists(path) else None


def rep(text, old, new, count, label):
    found = text.count(old)
    if found != count:
        raise SystemExit("STOP %s: expected %d match(es) of %r, found %d" % (label, count, old[:90], found))
    return text.replace(old, new)


# -----------------------------------------------------------------------------
# PORT NOTE blocks (this app's), each replacing TrueVision's own block
# -----------------------------------------------------------------------------
PN = {}

PN["SheetChrome"] = (
    "// PORT NOTE:\n"
    "// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__SheetChrome__.js\n"
    "// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   : Console prefix, header and folder numbers only.\n"
    "// - Back-port     : n/a (this IS the back-port)\n",
    "// PORT NOTE:\n"
    "// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, from Lantern Designer's\n"
    "//                   30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetChrome__.js); TrueVision3D\n"
    "//                   took it whole on 10-Sep-2026 (its v2.21.0) and grew it to 1.14.0; since ported back\n"
    "//                   whole from TrueVision3D 1.14.0 (HEAD b2aa9151)\n"
    "// - Source version: 1.14.0 (TrueVision3D v2.150.0, 22-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-26}} - whole. This app's copy was its 1.5.0\n"
    "//                   (15-Sep-2026): TrueVision's 1.6.0 code with 1.8.0's FitCaptionFont (ValeVision3D\n"
    "//                   v2.54.1), measuring and printing every run in jsPDF's Helvetica. Text is now measured\n"
    "//                   and printed in the Open Sans cuts the PDF embeds (Na__LayoutEditor__PdfFonts__).\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   :\n"
    "//   - Banner and console prefix read ValeVision3D.\n"
    "// - Back-port     : none.\n",
)

PN["ShapeGeometry"] = (
    "// PORT NOTE:\n"
    "// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__ShapeGeometry__.js\n"
    "// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   : Console prefix, header and folder numbers; holed shapes (Shape__Holes), TrueVision first on 22-Sep-2026.\n"
    "// - Back-port     : n/a (this IS the back-port)\n",
    "// PORT NOTE:\n"
    "// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.8, port Phase 5); TrueVision3D took it\n"
    "//                   whole the same day (its v2.21.0 re-alignment) and grew it to 1.9.0; since ported back\n"
    "//                   whole from TrueVision3D 1.9.0 (HEAD b2aa9151)\n"
    "// - Source version: 1.9.0 (TrueVision3D v2.150.0, 22-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-26}} - whole. This app's copy was its 1.5.0\n"
    "//                   (14-Sep-2026), TrueVision's 1.5.0. A box carrying Shape__Qr paints the project's code\n"
    "//                   only while the Project QR Code system is switched on, which it is not here (DR-12).\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "// - Back-port     : none.\n",
)

PN["DimensionGeometry"] = (
    "// PORT NOTE:\n"
    "// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__DimensionGeometry__.js\n"
    "// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n"
    "// - Parity        : verbatim to 1.0.0\n"
    "// - Divergences   : Console prefix, header and folder numbers only.\n"
    "// - Back-port     : n/a (this IS the back-port)\n"
    "// - Ahead         : 1.1.0 (ortho orientations) and 1.2.0 (fixed length\n"
    "//                   extension lines) were authored here first; the ValeVision\n"
    "//                   back-port of extension lines waits. 1.3.0 to 1.5.1 (text\n"
    "//                   leader, justified side, outward hook, softer bow) were\n"
    "//                   authored here and ported to ValeVision3D v2.37.0.\n",
    "// PORT NOTE:\n"
    "// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, from this app's own\n"
    "//                   44__System__PlanDimensions/Na__PlanDimensions__Overlay__.js: the skeleton, terminators and\n"
    "//                   text placement); TrueVision3D took it whole on 10-Sep-2026 (its v2.21.0) and authored\n"
    "//                   1.1.0 to 1.6.0 there; since ported back whole from TrueVision3D 1.6.0 (HEAD b2aa9151)\n"
    "// - Source version: 1.6.0 (TrueVision3D v2.152.0, 23-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-26}} - whole. This app's copy was its 1.2.0\n"
    "//                   (14-Sep-2026): TrueVision's 1.1.0 (ortho, v2.31.0) and 1.3.0 to 1.5.1 (the text leader,\n"
    "//                   ValeVision3D v2.37.0) without 1.2.0's fixed-length extension lines, which come across\n"
    "//                   now with 1.6.0's dashed rules.\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "// - Back-port     : none.\n",
)

PN["LeaderGeometry"] = (
    "// PORT NOTE:\n"
    "// - Authored in   : TrueVision3D first (14-Sep-2026)\n"
    "// - ValeVision    : 1.0.0 ported 14-Sep-2026 as ValeVision v2.32.0, verbatim\n"
    "//                   below the header. Nothing here is app-specific; the record\n"
    "//                   fields are shared. Later versions wait for their own sign-off.\n",
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__LeaderGeometry__.js\n"
    "// - Source version: 1.3.0 (TrueVision3D v2.144.0, 22-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-26}} - whole. This app's copy was its 1.0.0\n"
    "//                   (14-Sep-2026, ValeVision3D v2.32.0) with 1.1.0's code resolver. 1.2.0 (the broken-link\n"
    "//                   halo) and 1.3.0 (the note resolver), which TrueVision's note held for their own\n"
    "//                   sign-off, come across in dependency order (DR-01 (c)): both answer nothing until the\n"
    "//                   specification registers their resolvers, and the halo is drawn only for a caller that\n"
    "//                   asks for it, never for a PDF.\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "// - Back-port     : none.\n",
)

PN["QrCell"] = (
    "// PORT NOTE:\n"
    "// - Authored in   : TrueVision3D first (19-Sep-2026), after Lantern Designer's\n"
    "//                   VghLantern__SheetChrome__SolveTermsCell / BuildTermsCell.\n"
    "// - Divergences   : The square carries a true quiet zone (Lantern's was\n"
    "//                   declared in config and read by nothing); the text block is\n"
    "//                   centred as a whole; the body is justified as a whole or\n"
    "//                   not at all; and there is a compact form for narrow paper.\n"
    "// - ValeVision    : not yet ported.\n",
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__QrCell__.js\n"
    "// - Source version: 1.0.0 (TrueVision3D v2.81.0, 20-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-26}} - new here, and SWITCHED OFF: TitleBlock\n"
    "//                   QrCellEnabled is false and so is the Project QR Code system's ProjectQr__Enabled\n"
    "//                   (DR-12), so Solve answers null and the fields keep the whole strip, as they always have.\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "// - Lineage       : authored in TrueVision3D (19-Sep-2026) after Lantern Designer's\n"
    "//                   VghLantern__SheetChrome__SolveTermsCell / BuildTermsCell, with a true quiet zone (Lantern's\n"
    "//                   was declared in config and read by nothing), the text block centred as a whole, the body\n"
    "//                   justified as a whole or not at all, and a compact form for narrow paper.\n"
    "// - Back-port     : none.\n",
)

PN["Modern"] = (
    "// PORT NOTE:\n"
    "// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__TitleBlock__Modern__.js\n"
    "// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n"
    "// - Parity        : verbatim until v1.2.0\n"
    "// - Divergences   : Console prefix, header and folder numbers; from v1.2.0 the\n"
    "//                   cell widths (paper millimetres solved against the text,\n"
    "//                   TrueVision first on 19-Sep-2026) and the logo fallback text.\n"
    "// - Back-port     : n/a (this IS the back-port)\n",
    "// PORT NOTE:\n"
    "// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, from the title block region\n"
    "//                   of Lantern Designer's 30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetChrome__.js);\n"
    "//                   TrueVision3D took it whole on 10-Sep-2026 (its v2.21.0) and authored 1.2.0 to 1.5.0 there;\n"
    "//                   since ported back whole from TrueVision3D 1.5.0 (HEAD b2aa9151)\n"
    "// - Source version: 1.5.0 (TrueVision3D v2.109.0, 21-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-26}} - whole. This app's copy was its 1.2.0\n"
    "//                   (20-Sep-2026, ValeVision3D v2.66.0): TrueVision's 1.2.0 with 1.4.0's floor and this app's\n"
    "//                   own logo text. New here: the Rev cell's \"Revision\" prefix, a fifth more for the fixed\n"
    "//                   cells on A2 and A1, and the QR cell - solved first, but switched off (DR-12).\n"
    "// - Parity        : adapted\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "//   - The logo's stand-in text, drawn while the logo loads and printed if it never arrives, is config:\n"
    "//     setup.logoFallbackText (TitleBlock LogoFallbackText, \"VALE GARDEN HOUSES\", a key only this app\n"
    "//     has - DR-43). TrueVision keeps its own office's name in the constant LOGO_FALLBACK_TEXT, which is\n"
    "//     not carried here.\n"
    "// - Back-port     : TrueVision could read the same key (DR-42 (9)); this file would then be its own below\n"
    "//                   the header.\n",
)


def whole(rel_tv, label, extra=None):
    text = tv(rel_tv).decode("utf-8")
    if "\r" in text:
        raise SystemExit("STOP %s: TrueVision text has a CR" % label)
    banner_old = "// TRUEVISION3D - "
    text = rep(text, banner_old, "// VALEVISION3D - ", 1, label + " banner")
    old, new = PN[label]
    text = rep(text, old, new, 1, label + " PORT NOTE")
    if extra:
        text = extra(text)
    return text


def chrome_extra(text):
    return rep(text, "[TrueVision3D LayoutEditor]", "[ValeVision3D LayoutEditor]", 2, "SheetChrome console prefix")


def modern_extra(text):
    text = rep(text,
               "    // MODULE CONSTANTS | The Logo's Stand-In and the Fit Tolerance\n"
               "    // ------------------------------------------------------------\n"
               "    const Na__LeTitleModern__LOGO_FALLBACK_TEXT = 'NOBLE ARCHITECTURE';          // <-- Drawn while the logo loads, and printed if it never arrives\n"
               "    const Na__LeTitleModern__FIT_TOLERANCE_MM   = 0.001;",
               "    // MODULE CONSTANTS | The Fit Tolerance (the Logo's Stand-In Text Is Config: TitleBlock LogoFallbackText)\n"
               "    // ------------------------------------------------------------\n"
               "    const Na__LeTitleModern__FIT_TOLERANCE_MM   = 0.001;",
               1, "Modern constants")
    text = rep(text,
               "                Text : Na__LeTitleModern__LOGO_FALLBACK_TEXT, FontMm : setup.fontSizeValueMm,",
               "                Text : setup.logoFallbackText, FontMm : setup.fontSizeValueMm,",
               1, "Modern logo text")
    return text


# -----------------------------------------------------------------------------
# The test page: TrueVision's, with this app's identity
# -----------------------------------------------------------------------------
def scalecell_page():
    label = "ScaleCell page"
    text = tv("80__Testing__PrototypeEnvironment/Na__Test__TitleBlockScaleCell__.html").decode("utf-8")
    text = rep(text, "     TRUEVISION3D - TEST - TITLE BLOCK SCALE CELL\n", "     VALEVISION3D - TEST - TITLE BLOCK SCALE CELL\n", 1, label + " banner")
    text = rep(text, "     for sheet shapes that match PS01's four sheets, so the Scale cell can be\n",
                     "     for sheet shapes that match a real pack's four sheets, so the Scale cell can be\n", 1, label + " description")
    text = rep(text,
               "     USAGE: serve the repo root and open\n"
               "       /na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__TitleBlockScaleCell__.html\n"
               "     ============================================================================= -->\n",
               "     USAGE: serve the ValeCodebase root and open\n"
               "       /WebApps/ValeVision3D/80__Testing__PrototypeEnvironment/Na__Test__TitleBlockScaleCell__.html\n"
               "     (or, on the local Flask server, /ValeVision3D/80__Testing__PrototypeEnvironment/ and this file's name)\n"
               "\n"
               "     PORT NOTE:\n"
               "     - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__TitleBlockScaleCell__.html\n"
               "     - Source version: none of its own - the page as TrueVision3D v2.155.0 left it (23-Sep-2026; v2.61.0\n"
               "                       made it and v2.61.1 added the captions, 17-Sep-2026; read at b2aa9151)\n"
               "     - Legacy        : a test page carries no module version, so the Source version names the releases\n"
               "                       that wrote it.\n"
               "     - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-26}}, with SheetChrome 1.14.0\n"
               "     - Parity        : adapted\n"
               "     - Divergences   :\n"
               "       - Banner, heading and USAGE path are this app's.\n"
               "       - The four sheets carry this app's Vale fixture values: TrueVision's named its own job (its\n"
               "         project code in the case titles, a client and street in the fields).\n"
               "     - Back-port     : none.\n"
               "     ============================================================================= -->\n",
               1, label + " usage and PORT NOTE")
    text = rep(text, "<h1>TrueVision3D - title block Scale cell</h1>", "<h1>ValeVision3D - title block Scale cell</h1>", 1, label + " heading")
    text = rep(text,
               "        Sheet__Fields      : { Sheet__Fields__Client : 'Musters Road Ltd',\n"
               "                               Sheet__Fields__SiteAddress : '42 Musters Road, West Bridgford, NG2' },\n",
               "        Sheet__Fields      : { Sheet__Fields__Client : 'Mordaunt',\n"
               "                               Sheet__Fields__SiteAddress : 'The Old Rectory, Church Lane, Melton Mowbray, LE13 1AE' },\n",
               1, label + " fields")
    text = rep(text,
               "    [ 'PS01 D01 - Floor Plans',  sheet('D01 - Floor Plans', 1, 'A2', 'landscape', [ 50, 50 ]) ],\n"
               "    [ 'PS01 D03 - 3D Images',    sheet('D03 - 3D Images',   3, 'A3', 'landscape', [ null, null, null ]) ],\n"
               "    [ 'PS01 D10 - Site Plan',    sheet('D10 - Site Plan',   4, 'A2', 'landscape', [ 500, 1250 ], 'siteplan') ],\n",
               "    [ 'D01 - Floor Plans',       sheet('D01 - Floor Plans', 1, 'A2', 'landscape', [ 50, 50 ]) ],\n"
               "    [ 'D03 - 3D Images',         sheet('D03 - 3D Images',   3, 'A3', 'landscape', [ null, null, null ]) ],\n"
               "    [ 'D10 - Site Plan',         sheet('D10 - Site Plan',   4, 'A2', 'landscape', [ 500, 1250 ], 'siteplan') ],\n",
               1, label + " cases")
    for bad in ("PS01", "Musters", "/na-apps/", "TRUEVISION3D", "TrueVision3D - title"):
        body = text.split("PORT NOTE:")[0] + text.split("- Back-port     : none.")[1]
        if bad in body:
            raise SystemExit("STOP %s: %r left outside the PORT NOTE" % (label, bad))
    return text


# -----------------------------------------------------------------------------
# Edits to live files (each keeps its own line ending)
# -----------------------------------------------------------------------------
def edit_live(rel, edits, label):
    raw = live(rel)
    if raw is None:
        raise SystemExit("STOP %s: missing" % label)
    crlf = b"\r\n" in raw
    text = raw.decode("utf-8")
    if crlf:
        text = text.replace("\r\n", "\n")
    for old, new, count, what in edits:
        text = rep(text, old, new, count, label + " " + what)
    if crlf:
        text = text.replace("\n", "\r\n")
    return text


def cells_test():
    rel = "80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.test.mjs"
    E = [
        ("// - THE FIXTURE IS A VALE SHEET. NEEDS below is what each cell of a typical\n"
         "//   ValeVision title block asks for - the wider of its label and its value,\n"
         "//   with the 1.4 mm padding either side - measured with the vendored jsPDF in\n"
         "//   its built-in Helvetica at 2.2 mm, the face this app prints its title\n"
         "//   block in until the PDF embeds Open Sans. Written out rather than measured\n"
         "//   here, so the test needs no font and does not change when a drawing does.\n",
         "// - THE FIXTURE IS A VALE SHEET. NEEDS below is what each cell of a typical\n"
         "//   ValeVision title block asks for - the wider of its label and its value,\n"
         "//   with the 1.4 mm padding either side - measured on 02-Oct-2026 with the\n"
         "//   vendored jsPDF and the real Open Sans Regular cut at 2.2 mm, the face the\n"
         "//   chrome measures and the PDF prints the title block in. Written out rather\n"
         "//   than measured here, so the test needs no font and does not change when a\n"
         "//   drawing does.\n", 1, "description"),
        ("//                   and the Document ID row. This app's copy was its 1.0.0 of 20-Sep-2026 (ValeVision3D\n"
         "//                   v2.66.0): the same checks against a Drawing No. cell, without Widen.\n",
         "//                   and the Document ID row. This app's copy was its 1.0.0 of 20-Sep-2026 (ValeVision3D\n"
         "//                   v2.66.0): the same checks against a Drawing No. cell, without Widen. The fixture was\n"
         "//                   re-measured in Open Sans on 02-Oct-2026 for ValeVision3D {{VVREL:W1-26}}, when\n"
         "//                   SheetChrome 1.14.0 moved the chrome's measuring onto the embedded cuts.\n", 1, "ported on"),
        ("//   - The fixture is a Vale sheet measured in jsPDF's Helvetica (the Open Sans re-measure comes with\n"
         "//     SheetChrome 1.14.0), beside a 34 mm logo cell, so every strip is 6 mm wider than TrueVision's;\n"
         "//     its Document ID is composed {project}_{drawing} (57079_D12), the format this app ships until\n"
         "//     Vale's own stages are supplied. A few checks name this app's own history (the old shares cut\n"
         "//     an 88 mm title at 71 mm; the number cell had 49 mm).\n",
         "//   - The fixture is a Vale sheet, measured in Open Sans as TrueVision's is, beside a 34 mm logo cell,\n"
         "//     so every strip is 6 mm wider than TrueVision's; its Document ID is composed {project}_{drawing}\n"
         "//     (57079_D12), the format this app ships until Vale's own stages are supplied. A few checks name\n"
         "//     this app's own history (the old shares cut a 92 mm title at 71 mm; the number cell had 49 mm).\n", 1, "divergence"),
        ("    // Text width + 2.8 mm of padding, Helvetica at 2.2 mm (labels at 1.6 mm tracked 0.05).\n"
         "    const NEEDS = {\n"
         "        Client      : 12.02,     // Mordaunt\n"
         "        SiteAddress : 60.35,     // The Old Rectory, Church Lane, Melton Mowbray, LE13 1AE\n"
         "        Title       : 87.72,     // Permitted Development Compliance - Existing Conditions & Design Proposal Elevations\n"
         "        DocumentId  : 14.61,     // 57079_D12 - the label DOCUMENT ID is wider than the value\n"
         "        Revision    : 6.21,      // B - the label REV is wider than the value. \"Revision B\" (13.25) once the strip prints the Rev cell's prefix, on paper with room; on a strip too narrow for every value (A4) the builder drops the word and asks for this again\n"
         "        Scale       : 17.56,     // 1:50 @ ISO A2\n"
         "        Date        : 15.16,     // 19 Sep 2026\n"
         "        DrawnBy     : 23.08,     // Vale Garden Houses\n"
         "        Status      : 19.26      // FOR PLANNING\n"
         "    };\n"
         "\n"
         "    // The label alone + 2.8 mm of padding: the least a Flex cell may be cut to.\n"
         "    const FLOORS = { Client : 8.76, SiteAddress : 15.06, Title : 15.95, DocumentId : 14.61, Revision : 6.21, Scale : 8.25, Date : 7.05, DrawnBy : 11.78, Status : 8.99 };\n",
         "    // Text width + 2.8 mm of padding, Open Sans Regular at 2.2 mm (labels at 1.6 mm tracked 0.05).\n"
         "    const NEEDS = {\n"
         "        Client      : 13.05,     // Mordaunt\n"
         "        SiteAddress : 62.15,     // The Old Rectory, Church Lane, Melton Mowbray, LE13 1AE\n"
         "        Title       : 91.61,     // Permitted Development Compliance - Existing Conditions & Design Proposal Elevations\n"
         "        DocumentId  : 14.37,     // 57079_D12 - the label DOCUMENT ID is wider than the value\n"
         "        Revision    : 5.78,      // B - the label REV is wider than the value. \"Revision B\" (13.32) since the strip prints the Rev cell's prefix, on paper with room; on a strip too narrow for every value (A4) the builder drops the word and asks for this again\n"
         "        Scale       : 17.02,     // 1:50 @ ISO A2\n"
         "        Date        : 15.28,     // 19 Sep 2026\n"
         "        DrawnBy     : 23.55,     // Vale Garden Houses\n"
         "        Status      : 18.62      // FOR PLANNING\n"
         "    };\n"
         "\n"
         "    // The label alone + 2.8 mm of padding: the least a Flex cell may be cut to.\n"
         "    const FLOORS = { Client : 8.36, SiteAddress : 13.88, Title : 15.25, DocumentId : 14.37, Revision : 5.78, Scale : 7.67, Date : 6.94, DrawnBy : 11.39, Status : 8.80 };\n", 1, "fixture"),
        ("    // Measured 20-Sep-2026, Helvetica at 2.2 mm plus 2.8 mm of padding. A status added to the config since is not in this table and is not judged.\n"
         "    const STATUS_NEEDS = { 'PRELIMINARY' : 17.63, 'FOR INFORMATION' : 23.17, 'FOR COMMENT' : 19.39, 'FOR COORDINATION' : 24.89, 'FOR APPROVAL' : 19.65, 'FOR PLANNING' : 19.26,\n"
         "                           'FOR BUILDING CONTROL' : 29.77, 'FOR PRICING' : 17.21, 'FOR TENDER' : 17.06, 'FOR CONSTRUCTION' : 25.75, 'AS BUILT' : 12.28, 'SUPERSEDED' : 17.85 };\n",
         "    // Measured 19-Sep-2026, Open Sans Regular at 2.2 mm plus 2.8 mm of padding. A status added to the config since is not in this table and is not judged.\n"
         "    const STATUS_NEEDS = { 'PRELIMINARY' : 16.70, 'FOR INFORMATION' : 22.62, 'FOR COMMENT' : 18.72, 'FOR COORDINATION' : 24.19, 'FOR APPROVAL' : 18.53, 'FOR PLANNING' : 18.62,\n"
         "                           'FOR BUILDING CONTROL' : 28.58, 'FOR PRICING' : 16.13, 'FOR TENDER' : 15.84, 'FOR CONSTRUCTION' : 24.29, 'AS BUILT' : 11.97, 'SUPERSEDED' : 16.36 };\n", 1, "statuses"),
        ("    check('an 88 mm title, cut at 71 mm under the old shares, now fits',",
         "    check('a 92 mm title, cut at 71 mm under the old shares, now fits',", 1, "A3 check"),
        ("    check('the Site Address, with 9.6 mm to spare, gave less than the Rev cell with 21.8',",
         "    check('the Site Address, with 7.85 mm to spare, gave less than the Rev cell with 22.2',", 1, "grow check"),
        ("    const threeScales = solve(STRIP.A2, { Scale : 32.63 });\n"
         "    check('a three-scale label is never cut: the Scale cell grows to hold it', near(threeScales.byKey.Scale, 32.63), threeScales.byKey.Scale.toFixed(2));\n",
         "    const threeScales = solve(STRIP.A2, { Scale : 32.47 });\n"
         "    check('a three-scale label is never cut: the Scale cell grows to hold it', near(threeScales.byKey.Scale, 32.47), threeScales.byKey.Scale.toFixed(2));\n", 1, "three scales"),
    ]
    text = edit_live(rel, E, "TitleBlockCells test")
    if "Helvetica" in text:
        raise SystemExit("STOP TitleBlockCells test: a Helvetica mention is left")
    return text


def appconfig():
    rel = LE + "03__Core__Config/Na__LayoutEditor__AppConfig__.json"
    E = [
        ('        "LayoutEditor__TitleBlock__LogoAssetPath": "../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png",\n',
         '        "LayoutEditor__TitleBlock__LogoAssetPath": "../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png",\n'
         '        "LayoutEditor__TitleBlock__LogoFallbackText": "VALE GARDEN HOUSES",\n', 1, "LogoFallbackText"),
        ("so the widest, 99999_D100, measures 15.4 - 15.3 in the Helvetica this app prints in until the PDF embeds Open Sans - about the width of the cell's own label, DOCUMENT ID (14.4).",
         "so the widest, 99999_D100, measures 15.4, about the width of the cell's own label, DOCUMENT ID (14.4).", 1, "DocumentIdNote"),
        ("belongs to the Project QR Code system: 02__Src__AppModules/53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json.",
         "belongs to the Project QR Code system: 02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json.", 1, "QrCellNote"),
    ]
    text = edit_live(rel, E, "AppConfig")
    json.loads(text)
    return text


def sheetsetup():
    rel = LE + "03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js"
    E = [
        ("// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1; the title block rows (the Document ID row\n"
         "//                   and the Rev cell's prefix) and the 1:200 scale came level with TrueVision on\n"
         "//                   02-Oct-2026 for ValeVision3D {{VVREL:W1-22}}\n",
         "// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1; the title block rows (the Document ID row\n"
         "//                   and the Rev cell's prefix) and the 1:200 scale came level with TrueVision on\n"
         "//                   02-Oct-2026 for ValeVision3D {{VVREL:W1-22}}; the style font fallback came level\n"
         "//                   (Open Sans first, the chrome measuring and printing in the embedded cuts) and the\n"
         "//                   logo's stand-in text reader was added on 02-Oct-2026 for ValeVision3D {{VVREL:W1-26}}\n", 1, "ported on"),
        ("//   - As the shipped config does until it is switched on: the style font keeps Helvetica first until\n"
         "//     the PDF embeds Open Sans.\n",
         "//   - One title block reader TrueVision does not have: logoFallbackText (TitleBlock LogoFallbackText,\n"
         "//     \"VALE GARDEN HOUSES\"), the text TitleBlock__Modern__ draws in the logo cell while the logo loads;\n"
         "//     TrueVision keeps its own office's name in a constant there (DR-43).\n", 1, "divergence"),
        ("// - Back-port     : none.\n"
         "//\n"
         "// -----------------------------------------------------------------------------\n"
         "//\n"
         "// DEVELOPMENT LOG:\n",
         "// - Back-port     : TrueVision could read the logo's stand-in text from its config the same way\n"
         "//                   (DR-42 (9)).\n"
         "//\n"
         "// -----------------------------------------------------------------------------\n"
         "//\n"
         "// DEVELOPMENT LOG:\n", 1, "back-port"),
        ("            fontFamily        : Na__LeCfg__Val('Style', 'FontFamily', \"Helvetica, Arial, 'Open Sans', sans-serif\"),\n",
         "            fontFamily        : Na__LeCfg__Val('Style', 'FontFamily', \"'Open Sans', Helvetica, Arial, sans-serif\"),\n", 1, "font fallback"),
        ("            logoAssetPath       : Na__LeCfg__Val('TitleBlock', 'LogoAssetPath', '../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png'),\n",
         "            logoAssetPath       : Na__LeCfg__Val('TitleBlock', 'LogoAssetPath', '../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png'),\n"
         "            logoFallbackText    : Na__LeCfg__Val('TitleBlock', 'LogoFallbackText', 'VALE GARDEN HOUSES'),   // <-- ValeVision: drawn in the logo cell while the logo loads, and printed if it never arrives\n", 1, "reader"),
    ]
    return edit_live(rel, E, "SheetSetup")


def parity_test():
    rel = "80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs"
    E = [
        ("// DEVELOPMENT LOG:\n"
         "// 02-Oct-2026 - Version 1.0.2 (v2.71.2)\n",
         "// DEVELOPMENT LOG:\n"
         "// 02-Oct-2026 - Version 1.0.3 ({{VVREL:W1-26}})\n"
         "// - Two entries added with the Modern title block 1.5.0 and its QR cell\n"
         "//   (W1-26): the Vale logo's stand-in text, TitleBlock LogoFallbackText,\n"
         "//   a key only this app has (brand, read by TitleBlock__Modern__ in place\n"
         "//   of TrueVision's constant); and the QR cell note's path to the Project\n"
         "//   QR Code config, corrected here where TrueVision's still names the\n"
         "//   folder before its v2.155.0 move (tv-defect, for WT-08).\n"
         "//\n"
         "// 02-Oct-2026 - Version 1.0.2 (v2.71.2)\n", 1, "log"),
        ("        [ 'value',   'TitleBlock/QrCellEnabled',               'decision',  'W5-05', 'Project QR cell switched off (DR-12) until a Vale resolver exists' ],\n",
         "        [ 'value',   'TitleBlock/QrCellEnabled',               'decision',  'W5-05', 'Project QR cell switched off (DR-12) until a Vale resolver exists' ],\n"
         "        [ 'value',   'TitleBlock/QrCellNote',                  'tv-defect', 'WT-08', \"names the Project QR Code config where it stood before TrueVision v2.155.0 moved the folder under the Layout Editor\" ],\n"
         "        [ 'vv-only', 'TitleBlock/LogoFallbackText',            'brand',     'permanent', \"the Vale logo's stand-in text, read by TitleBlock__Modern__ (TrueVision keeps its own as a constant; offered under DR-42 (9))\" ],\n", 1, "allow-list"),
    ]
    return edit_live(rel, E, "AppConfigParity test")


# -----------------------------------------------------------------------------
# The set
# -----------------------------------------------------------------------------
def build_all():
    out = {}
    out[LE + "10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js"] = whole(LE + "10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js", "SheetChrome", chrome_extra)
    out[LE + "15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js"] = whole(LE + "15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js", "ShapeGeometry")
    out[LE + "15__Core__Markup/Na__LayoutEditor__DimensionGeometry__.js"] = whole(LE + "15__Core__Markup/Na__LayoutEditor__DimensionGeometry__.js", "DimensionGeometry")
    out[LE + "15__Core__Markup/Na__LayoutEditor__LeaderGeometry__.js"] = whole(LE + "15__Core__Markup/Na__LayoutEditor__LeaderGeometry__.js", "LeaderGeometry")
    out[LE + "10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__QrCell__.js"] = whole(LE + "10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__QrCell__.js", "QrCell")
    out[LE + "10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Modern__.js"] = whole(LE + "10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Modern__.js", "Modern", modern_extra)
    out["80__Testing__PrototypeEnvironment/Na__Test__TitleBlockScaleCell__.html"] = scalecell_page()
    out["80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.test.mjs"] = cells_test()
    out[LE + "03__Core__Config/Na__LayoutEditor__AppConfig__.json"] = appconfig()
    out[LE + "03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js"] = sheetsetup()
    out["80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs"] = parity_test()
    # identity sweep on every candidate's code (outside the PORT NOTE block)
    for rel, text in out.items():
        for bad in ("TRUEVISION3D", "[TrueVision3D", "TrueVision__", "NaProjectPortal", "/na-apps/", "noble-architecture.com/q/", "NOBLE ARCHITECTURE"):
            lines = [l for l in text.split("\n") if bad in l]
            edited = rel.endswith(("AppConfigParity__.test.mjs", "SheetSetup__.js", "AppConfig__.json", "TitleBlockCells__.test.mjs"))   # <-- pre-existing history lines; G4 judges those files
            if lines and not edited:
                raise SystemExit("STOP identity: %r in %s: %s" % (bad, rel, lines[0][:120]))
    return out


def cmd_build():
    out = build_all()
    for rel, text in out.items():
        dst = os.path.join(CAND, rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, "wb") as fh:
            fh.write(text.encode("utf-8"))
        data = text.encode("utf-8")
        print("built  %s  %7d B  crlf=%d  %s" % (sha1(data)[:8], len(data), data.count(b"\r\n"), rel))


def cmd_verify():
    out = build_all()
    for rel, text in out.items():
        if rel.startswith("80__") and rel.endswith(".test.mjs") or rel.endswith(".json") or "SheetSetup" in rel:
            base = live(rel).decode("utf-8").replace("\r\n", "\n")
            what = "live"
        else:
            base = tv(rel).decode("utf-8")
            what = "TrueVision @ " + PIN
        a = base.split("\n")
        b = text.replace("\r\n", "\n").split("\n")
        diff = [l for l in difflib.unified_diff(a, b, lineterm="", n=0) if not l.startswith(("---", "+++"))]
        removed = sum(1 for l in diff if l.startswith("-"))
        added = sum(1 for l in diff if l.startswith("+"))
        print("\n=== %s  vs %s:  -%d +%d" % (rel, what, removed, added))
        for l in diff:
            print("    " + l[:200])


def cmd_write():
    out = build_all()
    problems = []
    for rel, want in PRE.items():
        data = live(rel)
        got = sha1(data)[:8] if data is not None else None
        if got != want:
            problems.append("%s: live %s, recorded %s" % (rel, got, want))
    if problems:
        raise SystemExit("STOP --write: a file is not as this package found it:\n  " + "\n  ".join(problems))
    os.makedirs(PREIMG, exist_ok=True)
    manifest = {}
    for rel in PRE:
        data = live(rel)
        if data is not None:
            dst = os.path.join(PREIMG, rel.replace("/", os.sep))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, "wb") as fh:
                fh.write(data)
        manifest[rel] = sha1(data) if data is not None else None
    with open(os.path.join(PREIMG, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=1)
    written = {}
    for rel, text in out.items():
        data = text.encode("utf-8")
        dst = os.path.join(VV, rel.replace("/", os.sep))
        with open(dst, "wb") as fh:
            fh.write(data)
        written[rel] = hashlib.sha256(data).hexdigest()
        print("wrote  %s  %7d B  %s" % (sha1(data)[:8], len(data), rel))
    with open(WRITTEN, "w", encoding="utf-8") as fh:
        json.dump(written, fh, indent=1)


def cmd_restore():
    manifest = json.load(open(os.path.join(PREIMG, "manifest.json"), encoding="utf-8"))
    written = json.load(open(WRITTEN, encoding="utf-8"))
    for rel, digest in written.items():
        data = live(rel)
        if data is None or hashlib.sha256(data).hexdigest() != digest:
            raise SystemExit("STOP --restore: %s changed since this package wrote it" % rel)
    for rel, pre in manifest.items():
        dst = os.path.join(VV, rel.replace("/", os.sep))
        if pre is None:
            os.remove(dst)
            print("removed  " + rel)
        else:
            data = open(os.path.join(PREIMG, rel.replace("/", os.sep)), "rb").read()
            with open(dst, "wb") as fh:
                fh.write(data)
            print("restored " + rel)


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "--build"
    {"--build": cmd_build, "--verify": cmd_verify, "--write": cmd_write, "--restore": cmd_restore}[arg]()
