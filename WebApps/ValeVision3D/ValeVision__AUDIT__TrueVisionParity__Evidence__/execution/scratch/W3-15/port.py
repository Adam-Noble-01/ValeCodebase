"""W3-15 port: TV Panel__ViewportSettings 1.10.0 whole (pin b2aa9151), VV seams re-applied.

Seams: banner token (K2 H1), PORT NOTE (K2 H5), VV 1.4.1 Add Viewport list rebuild (vv_adaptations).
Writes TV's text as git show returns it (LF). Refuses if the live VV file moved since hand-over.
"""
import hashlib, os, subprocess, sys

ROOT   = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
REL    = "02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__ViewportSettings__.js"
TARGET = os.path.join(ROOT, REL.replace("/", os.sep))
SCRATCH = os.path.dirname(os.path.abspath(__file__))
HANDOVER_SHA1 = "814aedb1b162df4be380c22c334fd51b7bca42bc"
DRY = "--dry" in sys.argv

tv = subprocess.run(
    ["git", "-C", r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb", "show",
     "b2aa9151:na-apps/30__TrueVision__CoreAppCode/" + REL],
    capture_output=True, check=True).stdout
text = tv.decode("utf-8")
assert "\r\n" not in text

def swap(old, new, count=1):
    global text
    n = text.count(old)
    if n != count:
        raise SystemExit("anchor count %d != %d for: %r" % (n, count, old[:80]))
    text = text.replace(old, new)

# 1. Banner (K2 H1)
swap("// TRUEVISION3D - LAYOUT EDITOR - PANEL: VIEWPORT SETTINGS\n",
     "// VALEVISION3D - LAYOUT EDITOR - PANEL: VIEWPORT SETTINGS\n")

# 2. PORT NOTE (K2 H5) replaces TV's own block
OLD_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__Panel__ViewportSettings__.js\n"
    "// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   : Console prefix, header and folder numbers; site plan drawings (site plan viewports), TrueVision first on 14-Sep-2026.\n"
    "// - Back-port     : n/a (this IS the back-port)\n"
)
NEW_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__ViewportSettings__.js\n"
    "// - Source version: 1.10.0 (TrueVision3D v2.142.0, 22-Sep-2026; 1.9.0 v2.140.0, 1.8.0 v2.138.0,\n"
    "//                   1.6.0 v2.49.0, 1.5.0 v2.42.0, 1.4.0 v2.38.0, 1.3.0 v2.32.0; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-15}} - whole (package W3-15): Frame,\n"
    "//                   Rotation deg, Doors and Hide swings rows, and a viewport added inside an open\n"
    "//                   group joins it. Model Source and the site plan rows are TrueVision's code and\n"
    "//                   stay hidden here exactly as TrueVision hides them: one design phase (DR-09 (a))\n"
    "//                   and no site plan sheets (DR-08 (B), dormant). This app's copy was 1.4.1\n"
    "//                   (ValeVision3D v2.45.1; 1.4.0 = TrueVision 1.7.0, v2.50.0), first written\n"
    "//                   09-Sep-2026 for v2.21.0. TrueVision's v2.32.0, v2.38.0, v2.42.0, v2.49.0,\n"
    "//                   v2.138.0, v2.140.0 and v2.142.0 are NOT confirmed by Adam; ported under DR-01 (c).\n"
    "// - Parity        : adapted - TrueVision's file; the banner, this note and the Add Viewport list\n"
    "//                   rebuild below are the only differences.\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "//   - The Add Viewport scene list is rebuilt on every refresh, keeping the choice in progress and\n"
    "//     leaving a focused list alone (this app's 1.4.1, v2.45.1). TrueVision fills it once, while it\n"
    "//     holds a single option, so a plan or scene added after the sheet opened never reached it.\n"
    "// - Back-port     : the Add Viewport list rebuild (this app's 1.4.1) - offered to TrueVision (WT-04).\n"
)
swap(OLD_NOTE, NEW_NOTE)

# 3. VV 1.4.1 seam: the Add Viewport list rebuilt on every refresh (replaces TV's one-time fill)
OLD_FILL = (
    "        const addSelect = addBlock.querySelector('[data-na-control=\"vp-add-scene\"]');\n"
    "        if (addSelect && addSelect.options.length <= 1) Na__LePanels__FillSelect(addSelect, Na__LePanelViewport__SceneOptions(), '');\n"
)
NEW_FILL = (
    "        // ADD LIST | Rebuilt on every refresh. It used to be filled only while it\n"
    "        // held a single option, so once a project's first scenes were in it, a\n"
    "        // plan, an elevation or a scene added later never reached it until the\n"
    "        // page reloaded. The choice in progress survives the rebuild, and a list\n"
    "        // that has focus (open, or just chosen from) is left alone.\n"
    "        const addSelect = addBlock.querySelector('[data-na-control=\"vp-add-scene\"]');\n"
    "        if (addSelect && document.activeElement !== addSelect) {\n"
    "            const addOptions = Na__LePanelViewport__SceneOptions();\n"
    "            const keep       = addOptions.some((option) => option.value === addSelect.value) ? addSelect.value : '';\n"
    "            Na__LePanels__FillSelect(addSelect, addOptions, keep);\n"
    "        }\n"
)
swap(OLD_FILL, NEW_FILL)

out = text.encode("utf-8")
open(os.path.join(SCRATCH, "ported.js"), "wb").write(out)
if DRY:
    print("dry run: wrote scratch ported.js", len(out), "bytes")
    sys.exit(0)

live = open(TARGET, "rb").read()
if hashlib.sha1(live).hexdigest() != HANDOVER_SHA1:
    raise SystemExit("STOP: live file changed since hand-over (sha1 %s)" % hashlib.sha1(live).hexdigest())
open(os.path.join(SCRATCH, "before.js"), "wb").write(live)
open(TARGET, "wb").write(out)
print("written", TARGET, len(out), "bytes, sha1", hashlib.sha1(out).hexdigest())
