"""W1-37 candidates: TrueVision's bytes at the pin (git show, LF) with only the listed ValeVision seams,
plus one hunk replay into ValeVision's own CRLF CSS index. Every seam is an exact replacement asserted to
match the count it expects. Writes scratch/W1-37/candidates/<app-relative path>; never touches the live tree.

Usage: python -B build_w1_37.py
"""
import hashlib
import os
import re
import subprocess

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN   = "b2aa9151"
APP   = "na-apps/30__TrueVision__CoreAppCode/"
VV    = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE  = os.path.dirname(os.path.abspath(__file__))
OUT   = os.path.join(HERE, "candidates")

PAL   = "02__Src__AppModules/54__Feature__ColourPalette/"
TOOL  = "02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js"
INDEX = "03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css"
TOKEN = "{" + "{VVREL:W1-37}" + "}"
PORTED_ON = "02-Oct-2026"


def tv(rel):
    return subprocess.run(["git", "-C", NAWEB, "show", f"{PIN}:{APP}{rel}"], capture_output=True, check=True).stdout.decode("utf-8")


def vv(rel):
    with open(os.path.join(VV, rel.replace("/", os.sep)), "rb") as f:
        return f.read()


def sub(text, old, new, count=1, label=""):
    found = text.count(old)
    if found != count:
        raise SystemExit(f"SEAM MISMATCH [{label}]: expected {count} x {old[:80]!r}, found {found}")
    return text.replace(old, new)


def write(rel, data):
    path = os.path.join(OUT, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if isinstance(data, str):
        data = data.encode("utf-8")
    with open(path, "wb") as f:
        f.write(data)
    crlf = data.count(b"\r\n")
    print(f"  {hashlib.sha1(data).hexdigest()[:8]}  {len(data):6d} B  {data.count(b'\n'):4d} lines  {'CRLF' if crlf else 'LF  '}  {rel}")


# -----------------------------------------------------------------------------
# 1. Na__ColourPalette__.js - the one door (TV 1.0.0)
# -----------------------------------------------------------------------------
def build_door():
    rel = PAL + "Na__ColourPalette__.js"
    t = tv(rel)
    t = sub(t, "// TRUEVISION3D - COLOUR PALETTE\n", "// VALEVISION3D - COLOUR PALETTE\n", 1, "door banner")
    t = sub(t, "//   anything in TrueVision that lets a colour be chosen can use it: the\n",
               "//   anything in ValeVision that lets a colour be chosen can use it: the\n", 1, "door DESCRIPTION app name")
    t = sub(t,
        "// PORT NOTE:\n"
        "// - Authored in   : TrueVision3D first (21-Sep-2026)\n"
        "// - ValeVision    : not yet ported - it waits for Adam's sign-off.\n",
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__.js\n"
        "// - Source version: 1.0.0 (TrueVision3D v2.126.0, 21-Sep-2026; read at b2aa9151)\n"
        f"// - Ported on     : {PORTED_ON} for ValeVision3D {TOKEN}\n"
        "// - Parity        : verbatim\n"
        "// - Divergences   :\n"
        "//   - Banner reads ValeVision3D, and DESCRIPTION names this app where TrueVision's names\n"
        "//     itself. (No console output in this file.)\n"
        "// - Back-port     : none.\n", 1, "door PORT NOTE")
    write(rel, t)


# -----------------------------------------------------------------------------
# 2. Na__ColourPalette__Manager__.js (TV 1.1.0)
# -----------------------------------------------------------------------------
def build_manager():
    rel = PAL + "Na__ColourPalette__Manager__.js"
    t = tv(rel)
    t = sub(t, "// TRUEVISION3D - COLOUR PALETTE - MANAGER\n", "// VALEVISION3D - COLOUR PALETTE - MANAGER\n", 1, "manager banner")
    t = sub(t, "'[TrueVision3D ColourPalette] ", "'[ValeVision3D ColourPalette] ", 8, "manager console prefix")
    t = sub(t,
        "// PORT NOTE:\n"
        "// - Authored in   : TrueVision3D first (21-Sep-2026)\n"
        "// - ValeVision    : not yet ported - it waits for Adam's sign-off.\n",
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Manager__.js\n"
        "// - Source version: 1.1.0 (TrueVision3D v2.133.0, 21-Sep-2026; read at b2aa9151)\n"
        f"// - Ported on     : {PORTED_ON} for ValeVision3D {TOKEN}\n"
        "// - Parity        : verbatim\n"
        "// - Divergences   :\n"
        "//   - Banner and console prefix read ValeVision3D ([ValeVision3D ColourPalette]).\n"
        "// - Back-port     : none.\n", 1, "manager PORT NOTE")
    write(rel, t)


# -----------------------------------------------------------------------------
# 3. Na__ColourPalette__Picker__.js (TV 1.1.0)
# -----------------------------------------------------------------------------
def build_picker():
    rel = PAL + "Na__ColourPalette__Picker__.js"
    t = tv(rel)
    t = sub(t, "// TRUEVISION3D - COLOUR PALETTE - PICKER\n", "// VALEVISION3D - COLOUR PALETTE - PICKER\n", 1, "picker banner")
    t = sub(t,
        "// PORT NOTE:\n"
        "// - Authored in   : TrueVision3D first (21-Sep-2026)\n"
        "// - ValeVision    : not yet ported - it waits for Adam's sign-off.\n",
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Picker__.js\n"
        "// - Source version: 1.1.0 (TrueVision3D v2.133.0, 21-Sep-2026; read at b2aa9151)\n"
        f"// - Ported on     : {PORTED_ON} for ValeVision3D {TOKEN}\n"
        "// - Parity        : verbatim\n"
        "// - Divergences   :\n"
        "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
        "//   - The Mixer helper's comment that TrueVision runs inside ProjectVision's frame is\n"
        "//     TrueVision's account, kept verbatim: the code reads the top window's widths wherever\n"
        "//     the page is hosted, so the same read serves this app, framed or not.\n"
        "// - Back-port     : none.\n", 1, "picker PORT NOTE")
    write(rel, t)


# -----------------------------------------------------------------------------
# 4. Na__ColourPalette__Config__.json (TV 1.1.0): the palette's Vale name (DR-20), Meta wording
# -----------------------------------------------------------------------------
def build_config():
    rel = PAL + "Na__ColourPalette__Config__.json"
    t = tv(rel)
    t = sub(t, "The Colour Palette Manager's standard colours. Every colour field in TrueVision - a vector's",
               "The Colour Palette Manager's standard colours. Every colour field in ValeVision - a vector's", 1, "config Meta__Description")
    t = sub(t, '"Palette__MenuName"      : "Noble Architecture Standard",',
               '"Palette__MenuName"      : "Vale Garden Houses Standard",', 1, "config palette name (DR-20)")
    t = sub(t,
        '        "Meta__Author"            : "Adam Noble - Noble Architecture",\n',
        '        "Meta__Author"            : "Adam Noble - Noble Architecture",\n'
        '        "Meta__PortedFrom"        : "TrueVision3D 02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Config__.json 1.1.0, as TrueVision3D v2.133.0 shipped it '
        '(21-Sep-2026; read at HEAD b2aa9151), ported 02-Oct-2026 (parity package W1-37). Every key, group and colour is TrueVision\'s, so a line coloured here '
        'is the same colour in both apps. ValeVision\'s values: the palette\'s menu name, Vale Garden Houses Standard (DR-20: the name is the palette\'s on-screen '
        'title; a Vale group of its own would be one more block in Palette__Groups), and this app\'s name in Meta__Description.",\n',
        1, "config Meta__PortedFrom")
    write(rel, t)


# -----------------------------------------------------------------------------
# 5. Na__ColourPalette__Styles__.css (TV, unversioned): banner and PORT NOTE
# -----------------------------------------------------------------------------
def build_styles():
    rel = PAL + "Na__ColourPalette__Styles__.css"
    t = tv(rel)
    t = sub(t, "/* REGION  |  TrueVision3D - Colour Palette Styles                    */\n",
               "/* REGION  |  ValeVision3D - Colour Palette Styles                    */\n", 1, "styles banner")
    t = sub(t,
        "     clicked, and an animation that reduced-motion removes is one nobody sees.\n"
        "*/\n",
        "     clicked, and an animation that reduced-motion removes is one nobody sees.\n"
        "*/\n"
        "/*\n"
        "   PORT NOTE:\n"
        "   - Ported from   : TrueVision3D 02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Styles__.css\n"
        "   - Source version: none of its own - the sheet as TrueVision3D v2.133.0 left it (21-Sep-2026, commit\n"
        "                     7ab70638; read at b2aa9151)\n"
        f"   - Ported on     : {PORTED_ON} for ValeVision3D {TOKEN}\n"
        "   - Parity        : verbatim (the rules are TrueVision's; the banner and this note are the only differences)\n"
        "   - Divergences   :\n"
        "     - Banner reads ValeVision3D.\n"
        "   - Legacy        : TrueVision's copy of this sheet has no module version, so the Source version names\n"
        "                     the release and the commit instead.\n"
        "   - Back-port     : none.\n"
        "*/\n", 1, "styles PORT NOTE")
    write(rel, t)


# -----------------------------------------------------------------------------
# 6. README__ColourPalette__.md (TV): wording for this app, and where it came from
# -----------------------------------------------------------------------------
def build_readme():
    rel = PAL + "README__ColourPalette__.md"
    t = tv(rel)
    t = sub(t, "The standard colours, one click away from every colour field in TrueVision.\n",
               "The standard colours, one click away from every colour field in ValeVision.\n", 1, "readme app name")
    t = sub(t,
        "- The Model Layers panel's edge colour is a **list of named SSOT colours**, not a colour field, so it has no palette -\n"
        "  it already is one.\n"
        "- Not in ValeVision.\n",
        "- The Model Layers panel's edge colour is a **list of named SSOT colours**, not a colour field, so it has no palette -\n"
        "  it already is one.\n"
        "\n"
        "---\n"
        "\n"
        "Ported from TrueVision3D's `README__ColourPalette__.md` (as of TrueVision3D v2.133.0, read at HEAD b2aa9151) by parity\n"
        "package W1-37 on 02-Oct-2026. Three changes for ValeVision: this app's name in the opening line; the palette's own\n"
        "name, **Vale Garden Houses Standard** in `Palette__MenuName` (decision DR-20 - the swatches are TrueVision's, colour for\n"
        "colour, so a line coloured here is the same colour in both apps, and a Vale group of its own would be one more block in\n"
        "the config); and TrueVision's closing \"Not in ValeVision\" gone. The list of colour fields is TrueVision's: in\n"
        "ValeVision each field has the palette from the release that brings it, the Layout Editor's panel fields through the\n"
        "panel host.\n", 1, "readme Not done + provenance")
    write(rel, t)


# -----------------------------------------------------------------------------
# 7. Na__PlanAnnotations__Toolbar__.js (TV 1.1.0 whole): banner, PORT NOTE, the ConfigState getter seam (F.8 C24)
# -----------------------------------------------------------------------------
def build_toolbar():
    t = tv(TOOL)
    t = sub(t, "// TRUEVISION3D - PLAN ANNOTATIONS - EDITING TOOLBAR\n", "// VALEVISION3D - PLAN ANNOTATIONS - EDITING TOOLBAR\n", 1, "toolbar banner")
    t = sub(t,
        "//   holds no annotation state of its own.\n"
        "//\n"
        "// -----------------------------------------------------------------------------\n"
        "//\n"
        "// DEVELOPMENT LOG:\n",
        "//   holds no annotation state of its own.\n"
        "//\n"
        "// -----------------------------------------------------------------------------\n"
        "//\n"
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js\n"
        "// - Source version: 1.1.0 (TrueVision3D v2.126.0, 21-Sep-2026; read at b2aa9151)\n"
        f"// - Ported on     : {PORTED_ON} for ValeVision3D {TOKEN}, whole; first ported 09-Sep-2026 for\n"
        "//                   ValeVision3D v2.18.0 (port Phase 2) as 1.0.0, logic unchanged, imports repointed\n"
        "// - Parity        : adapted\n"
        "// - Divergences   :\n"
        "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
        "//   - Na__PlanDim__GetTextSetup is imported from 44__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js,\n"
        "//     where this app keeps the plan dimension config getters; TrueVision imports it from\n"
        "//     Na__PlanDimensions__Data__.js until WT-01 gives TrueVision the same split (R6 F.8 C24).\n"
        "// - Back-port     : the ConfigState split, offered as WT-01 (held: DR-36, TrueVision is not edited by this\n"
        "//                   programme).\n"
        "//\n"
        "// -----------------------------------------------------------------------------\n"
        "//\n"
        "// DEVELOPMENT LOG:\n", 1, "toolbar PORT NOTE")
    t = sub(t,
        "    import {\n"
        "        Na__PlanDim__GetNewDefaults,\n"
        "        Na__PlanDim__SetNewDefaults,\n"
        "        Na__PlanDim__GetTextSetup,\n"
        "        Na__PlanDim__Update,\n"
        "        Na__PlanDim__F_SIZE,\n"
        "        Na__PlanDim__F_COLOR\n"
        "    } from '../44__System__PlanDimensions/Na__PlanDimensions__Data__.js';\n",
        "    import {\n"
        "        Na__PlanDim__GetTextSetup\n"
        "    } from '../44__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js';\n"
        "    import {\n"
        "        Na__PlanDim__GetNewDefaults,\n"
        "        Na__PlanDim__SetNewDefaults,\n"
        "        Na__PlanDim__Update,\n"
        "        Na__PlanDim__F_SIZE,\n"
        "        Na__PlanDim__F_COLOR\n"
        "    } from '../44__System__PlanDimensions/Na__PlanDimensions__Data__.js';\n", 1, "toolbar ConfigState getter seam (C24)")
    write(TOOL, t)


# -----------------------------------------------------------------------------
# 8. Na__CoreUi__Styles__Index__.css (this app's file, CRLF): TrueVision's Colour Palette region, after the
#    Dev Tools Menu region (TrueVision imports the palette after its Dev Tools Menu sheet and its Layout Editor
#    sheets; this app's index ends with the Dev Tools Menu region and links the editor sheets lazily)
# -----------------------------------------------------------------------------
def build_index():
    b = vv(INDEX)
    if b.count(b"\r\n") != b.count(b"\n"):
        raise SystemExit("CSS index is not pure CRLF; refusing to replay a hunk into it")
    t = b.decode("utf-8")
    tail = ("/* REGION  |  Dev Tools Menu Shell (header trigger + flyout panel)    */\r\n"
            "/* ----------------------------------------------------------------- */\r\n"
            "@import url('Na__UiFeature__Styles__DevToolsMenu__.css');\r\n"
            "/* endregion -------------------------------------------------------- */\r\n")
    if not t.endswith(tail):
        raise SystemExit("CSS index does not end with the Dev Tools Menu region as read on 02-Oct-2026")
    tv_index = tv(INDEX)
    region = ("/* ----------------------------------------------------------------- */\n"
              "/* REGION  |  Colour Palette - the Standard Colours Above a Colour Field */\n"
              "/* ----------------------------------------------------------------- */\n"
              "/* Its own feature, used by the Layout Editor's panels and the 3D tab's */\n"
              "/* Plan Annotations toolbar alike, so it belongs to neither's region.   */\n"
              "@import url('../02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Styles__.css');\n"
              "/* endregion -------------------------------------------------------- */\n")
    if tv_index.count(region) != 1:
        raise SystemExit("TrueVision's CSS index does not hold the Colour Palette region verbatim")
    t = t + "\r\n" + region.replace("\n", "\r\n")
    write(INDEX, t)


if __name__ == "__main__":
    print("W1-37 candidates (TV " + PIN + "):")
    build_door()
    build_manager()
    build_picker()
    build_config()
    build_styles()
    build_readme()
    build_toolbar()
    build_index()

    # IDENTITY SCAN | nothing of TrueVision's identity left outside PORT NOTE text, and no NA marker
    bad = re.compile(r"TRUEVISION3D|\[TrueVision3D|TrueVision__|TrueVision3D__|window\.TrueVision|/api/truevision|X-TrueVision-|"
                     r"na-truevision-api|NaProjectPortal|30__TrueVision__AppContent|/na-apps/|Noble Architecture Ltd|"
                     r"TrueVision 3D Project Hub|Noble Architecture Standard|not yet ported", re.I)
    problems = 0
    for root, _, files in os.walk(OUT):
        for name in files:
            path = os.path.join(root, name)
            text = open(path, "rb").read().decode("utf-8")
            for no, line in enumerate(text.splitlines(), 1):
                if bad.search(line):
                    problems += 1
                    print(f"  IDENTITY? {os.path.relpath(path, OUT)}:{no}: {line.strip()[:140]}")
    print("identity scan: " + ("clean" if not problems else f"{problems} line(s) to read"))
