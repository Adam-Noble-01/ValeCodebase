"""W1-28 port script: paint order (the Layers list is the stack).

Builds every file of the package from TrueVision's bytes at the pin (git show) and ValeVision's current bytes,
hash-guarded both ways, with exact single-occurrence replacements only.

    python port_w1_28.py --stage     write the results to scratch/W1-28/staged/ (nothing live touched)
    python port_w1_28.py --apply     verify the live files are still as snapshotted, then write them live
    python port_w1_28.py --restore   put the snapshotted bytes back (vv_before/) for the files this script writes

Whole-file ports (MarkupBridge 1.20.0, Groups 1.4.0, SheetSurface 1.13.0, the two tests) are TrueVision's text
exactly as git show returns it (LF) with the house seams. Hunk replays into ValeVision's own files (Paper CSS
regions, PdfExporter 1.7.0, LinkNoodle 1.2.1) keep each file's own line endings (all three are pure CRLF).
"""
import hashlib
import os
import shutil
import subprocess
import sys

PIN = "b2aa9151"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TVAPP = "na-apps/30__TrueVision__CoreAppCode/"
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCRATCH = os.path.dirname(os.path.abspath(__file__))

LE = "02__Src__AppModules/51__System__LayoutEditor/"
P_MARKUP = LE + "15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js"
P_GROUPS = LE + "15__Core__Markup/Na__LayoutEditor__Groups__.js"
P_SURFACE = LE + "10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js"
P_PAPER = LE + "10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css"
P_PDF = LE + "60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js"
P_NOODLE = LE + "57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__LinkNoodle__.js"
P_T_STACK = "80__Testing__PrototypeEnvironment/Na__Test__LayerStack__.test.mjs"
P_T_VECTOR = "80__Testing__PrototypeEnvironment/Na__Test__VectorQuality__.test.mjs"

# TrueVision's bytes at the pin (sha256), as fetched at the start of the package
TV_SHA = {
    P_MARKUP: "8df90b7eeaa61fc001dd91d72586e7b8f558dc0487aefbd51debb4ab57c57b51",
    P_GROUPS: "a5f00dcd2255db723313949974ffde9a4634f1fa76faa5d6bbd18678b227c870",
    P_SURFACE: "56d54ac8994596eed775af1ae3d147caeaef82276c5815af44e7070b353eae06",
    P_PAPER: "e9593c46da527ee1197b04a3c5a750a2b407fbe7ee708a2376ada1f627a19839",
    P_PDF: "8131ce7ec0d077e702220629696d3bb14a26b311da83a65adbdbb681e30d6e94",
    P_T_STACK: "7001534c9a3a09462e860f6681633dcb9a3f44f54c3f130bafb2f850cfb6f03c",
    P_T_VECTOR: "02f9c7932c84cede9ad561d6d0ca52678af2f7caf9ab11da39898ccf9d995297",
}

# ValeVision's bytes as snapshotted before the package (sha256); None = a new file
VV_SHA = {
    P_MARKUP: "7c7a0a1b93e329928e4cd582bd1bdef5766e7034c062e0805a6b0f981af44822",
    P_GROUPS: "fd9aec31076c69efcd9f8b9b923cb8b6c830c08db98db02d54b0e7b26c86e3c9",
    P_SURFACE: "342da18b813a521935c039ed4c0c4805eb6e76bdf13e40245a39a64a7270134c",
    P_PAPER: "1e1945d83c1477d527d5f704088aca46820a4497cf6c5375e590fb45f939ae23",
    P_PDF: "e3ef49ca301e2e15a42cf59e776711b42c4ba1418439eea2ebfcfbf4d0f8baa1",
    P_NOODLE: "b6597f533f1f41117bfac96dc9181111787ce58b759719691ce6ea014fba8464",
    P_T_STACK: None,
    P_T_VECTOR: None,
}


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def sha(data):
    return hashlib.sha256(data).hexdigest()


def git_show(rel):
    data = subprocess.run(["git", "-C", NAWEB, "show", f"{PIN}:{TVAPP}{rel}"], check=True, capture_output=True).stdout
    want = TV_SHA.get(rel)
    if want and sha(data) != want:
        raise SystemExit(f"TV source changed at the pin?! {rel} {sha(data)} != {want}")
    return data


def vv_bytes(rel):
    path = os.path.join(VV, rel.replace("/", os.sep))
    with open(path, "rb") as fh:
        data = fh.read()
    want = VV_SHA.get(rel)
    if want and sha(data) != want:
        raise SystemExit(f"STOP: {rel} changed under this package ({sha(data)} != snapshot {want})")
    return data


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"replacement '{label}': expected exactly 1 occurrence, found {count}")
    return text.replace(old, new, 1)


def lf_from_crlf(data, rel):
    if data.startswith(b"\xef\xbb\xbf"):
        raise SystemExit(f"{rel} carries a BOM; not expected")
    text = data.decode("utf-8")
    crlf = text.count("\r\n")
    lf = text.count("\n")
    if crlf != lf:
        raise SystemExit(f"{rel} is not pure CRLF ({crlf} CRLF of {lf} LF)")
    return text.replace("\r\n", "\n")


def crlf_from_lf(text):
    if "\r" in text:
        raise SystemExit("stray CR in LF text")
    return text.replace("\n", "\r\n").encode("utf-8")


# -----------------------------------------------------------------------------
# MarkupBridge 1.20.0 - whole
# -----------------------------------------------------------------------------

MARKUP_OLD_NOTE = """// PORT NOTE:
// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__MarkupBridge__.js
// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)
// - Parity        : verbatim
// - Divergences   : Console prefix, header and folder numbers only.
// - Back-port     : n/a (this IS the back-port)
"""

MARKUP_NEW_NOTE = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, from this app's
//                   43__System__PlanAnnotations and 44__System__PlanDimensions record readers and drawing
//                   rules); TrueVision3D took it whole on 10-Sep-2026 (its v2.21.0) and grew it to 1.20.0;
//                   since ported back whole from TrueVision3D 1.20.0 (HEAD b2aa9151)
// - Source version: 1.20.0 (TrueVision3D v2.152.0, 23-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-28}} - whole. This app's copy was its 1.10.0
//                   (17-Sep-2026): TrueVision's 1.12.0 painting every kind across the whole sheet in one
//                   pass, all of it over every viewport, with its own dimension shape (no fixed-length
//                   extension lines). Markup is now painted and hit tested a layer at a time in the Layers
//                   list's order (Na__LayoutEditor__PaintOrder__), and TrueVision's 1.13.0-1.20.0 come with
//                   it: the leader options, the floor-area label, reference layers, the turned import, the
//                   rounded figure, DimensionBounds and a dimension's own line weight and line style.
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Legacy        : TrueVision's DEVELOPMENT LOG, taken verbatim (DR-34), names 1.12.0 twice (17-Sep-2026
//                   and 14-Sep-2026) - TrueVision's own numbering, kept as written.
// - Back-port     : none.
"""


def build_markup():
    text = git_show(P_MARKUP).decode("utf-8")
    text = once(text, "// TRUEVISION3D - LAYOUT EDITOR - MARKUP BRIDGE\n", "// VALEVISION3D - LAYOUT EDITOR - MARKUP BRIDGE\n", "markup banner")
    text = once(text, MARKUP_OLD_NOTE, MARKUP_NEW_NOTE, "markup port note")
    return text.encode("utf-8")


# -----------------------------------------------------------------------------
# Groups 1.4.0 - whole
# -----------------------------------------------------------------------------

GROUPS_OLD_NOTE = """// PORT NOTE:
// - Authored in   : TrueVision3D first (14-Sep-2026)
// - ValeVision    : ported 14-Sep-2026 as ValeVision3D v2.38.0 (verbatim, header only)
"""

GROUPS_NEW_NOTE = """// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__Groups__.js
// - Source version: 1.4.0 (TrueVision3D v2.142.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-28}} - whole. This app's copy was TrueVision's
//                   1.2.0 (1.0.0 ported 14-Sep-2026 as v2.38.0; 1.1.0's leader box 18-Sep-2026;
//                   RegisterLabeller 20-Sep-2026): vectors, text and nested groups. Leaders, dimensions
//                   and viewports now group as well (1.3.0, 1.4.0).
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
"""


def build_groups():
    text = git_show(P_GROUPS).decode("utf-8")
    text = once(text, "// TRUEVISION3D - LAYOUT EDITOR - GROUPS\n", "// VALEVISION3D - LAYOUT EDITOR - GROUPS\n", "groups banner")
    text = once(text, GROUPS_OLD_NOTE, GROUPS_NEW_NOTE, "groups port note")
    return text.encode("utf-8")


# -----------------------------------------------------------------------------
# SheetSurface 1.13.0 - whole
# -----------------------------------------------------------------------------

SURFACE_OLD_NOTE = """// PORT NOTE:
// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__SheetSurface__.js
// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)
// - Parity        : adapted
// - Divergences   : Console prefix, header and folder numbers; the viewport cache of
//                   1.6.0 is authored here first; ported 18-Sep-2026 as ValeVision3D v2.57.0.
// - Back-port     : n/a (this IS the back-port)
"""

SURFACE_NEW_NOTE = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, from Lantern Designer's
//                   30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetSurface__.js); TrueVision3D
//                   took it whole on 10-Sep-2026 (its v2.21.0) and grew it to 1.13.0; since ported back whole
//                   from TrueVision3D 1.13.0 (HEAD b2aa9151)
// - Source version: 1.13.0 (TrueVision3D v2.142.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-28}} - whole. This app's copy was its 1.6.0
//                   (18-Sep-2026, TrueVision's viewport cache, v2.57.0): every viewport frame in one box under
//                   one chrome SVG and one markup SVG. The sheet is now one stack in the Layers list's order;
//                   a zoom gesture settles once (NoteZoomGesture, which the navigation module calls from W1-36),
//                   frames are carried by a translate and turn with their viewport, the vector quality hold
//                   hears every redraw, an open group's viewports stay at full strength, and ShowPublished
//                   (TrueVision3D v2.155.0, named in no log entry) comes with the file, unused until the
//                   published-only web viewer (W4-09).
// - Parity        : verbatim (code); one comment reworded, below
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
//   - NoteZoomGesture's note names TrueVision3D's Draft Mode plan in words: its file name carries
//     TrueVision's app token (K2 K3).
// - Back-port     : none.
"""


def build_surface():
    text = git_show(P_SURFACE).decode("utf-8")
    text = once(text, "// TRUEVISION3D - LAYOUT EDITOR - SHEET SURFACE\n", "// VALEVISION3D - LAYOUT EDITOR - SHEET SURFACE\n", "surface banner")
    text = once(text, SURFACE_OLD_NOTE, SURFACE_NEW_NOTE, "surface port note")
    text = once(text,
                "    // 17-20 ms with it (" + "True" + "Vision__PLAN__DraftMode__.md, section 9).\n",
                "    // 17-20 ms with it (TrueVision3D's Draft Mode plan, section 9).\n",
                "surface plan reference")
    return text.encode("utf-8")


# -----------------------------------------------------------------------------
# Paper CSS - TrueVision's regions in ValeVision's sheet (CRLF kept)
# -----------------------------------------------------------------------------

PAPER_OLD_HEAD = """ * - Loads       : linked by Na__LayoutEditor__Loader__.js straight after Styles__Main, so the cascade order is unchanged
 */
"""

PAPER_NEW_HEAD = """ * - Loads       : linked by Na__LayoutEditor__Loader__.js straight after Styles__Main, so the cascade order is unchanged
 * - Regions     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-28}}: "Paper and Its Layers" (with "An Open Container Fades
 *                 the Rest of the Sheet") and "Viewport Frames" are TrueVision3D's, verbatim (its sheet carries no
 *                 version; read at b2aa9151, TrueVision3D v2.172.0) - the stack (v2.106.0), the zoom hold (v2.111.0),
 *                 the fade on each slot and frame (v2.142.0), clear frames carried by a translate (v2.106.0,
 *                 v2.137.0), the depth fog image (v2.94.0) and the vector hold (v2.136.0). This sheet's own fade
 *                 rule (the viewports box, the chrome and the markup at once) went with them. The snap marker
 *                 and grip rules stay this app's until W2-19 and W2-24 take TrueVision's.
 */
"""

DASH = "/* ----------------------------------------------------------------- */\n"
ENDREGION = "/* endregion ------------------------------------------------------- */\n"


def region_block(text, title, nested_endregions=1):
    """The text from the dashed line above '/* REGION  |  <title>' to the endregion that closes it (inclusive)."""
    head = DASH + "/* REGION  |  " + title
    start = text.find(head)
    if start < 0 or text.find(head, start + 1) >= 0:
        raise SystemExit(f"region '{title}': not found exactly once")
    at = start
    for _ in range(nested_endregions):
        at = text.find(ENDREGION, at)
        if at < 0:
            raise SystemExit(f"region '{title}': no endregion")
        at += len(ENDREGION)
    return text[start:at]


VV_FADE_OLD = """/* ----------------------------------------------------------------- */
/* REGION  |  An Open Container Fades the Rest of the Sheet           */
/* ----------------------------------------------------------------- */

/* SketchUp's rule, on paper. While a vector, a dimension or a group is open */
/* for editing the whole sheet drops back - the viewport pictures, the       */
/* border and title block, and all the markup - and the contents of the open */
/* container are drawn again at full strength in the focus layer above them. */
/* The drawing stays legible enough to work against; nothing outside the     */
/* container can be picked up while it is open, and the fade is what says so.*/
/*                                                                          */
/* The amount is set on the paper element from the EditScope block of        */
/* Na__LayoutEditor__AppConfig__.json; the value here is the fallback.       */

.na-le-paper--scoped .na-le-paper__viewports,
.na-le-paper--scoped .na-le-paper__chrome,
.na-le-paper--scoped .na-le-paper__markup {
    opacity                            : var(--na-le-scope-fade, 0.25);
    transition                         : opacity 120ms ease-out;
}

/* BLUE IS A POINT YOU COULD TAKE HOLD OF; RED IS ONE YOU HAVE. A picked  */"""

VV_FADE_NEW = """/* BLUE IS A POINT YOU COULD TAKE HOLD OF; RED IS ONE YOU HAVE. A picked  */"""

VV_FADE_END_OLD = """.na-le-grip--picked {
    background                         : #e01b24;
    border-color                       : #ffffff;
}

/* endregion ------------------------------------------------------- */

.na-le-grip--insert {"""

VV_FADE_END_NEW = """.na-le-grip--picked {
    background                         : #e01b24;
    border-color                       : #ffffff;
}

.na-le-grip--insert {"""


def build_paper():
    tv = git_show(P_PAPER).decode("utf-8")
    vv = lf_from_crlf(vv_bytes(P_PAPER), P_PAPER)
    vv = once(vv, PAPER_OLD_HEAD, PAPER_NEW_HEAD, "paper header")
    tv_paper = region_block(tv, "Paper and Its Layers", nested_endregions=2)    # <-- TV nests the fade region inside it
    tv_frames = region_block(tv, "Viewport Frames", nested_endregions=1)
    vv_paper = region_block(vv, "Paper and Its Layers", nested_endregions=1)
    vv_frames = region_block(vv, "Viewport Frames", nested_endregions=1)
    if "Fades the Rest" not in tv_paper or "na-le-paper__slot" not in tv_paper:
        raise SystemExit("TV paper region is not the one expected")
    if "na-le-vector-hold" not in tv_frames or "na-le-frame__fog" not in tv_frames:
        raise SystemExit("TV frames region is not the one expected")
    vv = once(vv, vv_paper, tv_paper, "paper region")
    vv = once(vv, vv_frames, tv_frames, "frames region")
    vv = once(vv, VV_FADE_OLD, VV_FADE_NEW, "old fade region (head and rule)")
    vv = once(vv, VV_FADE_END_OLD, VV_FADE_END_NEW, "old fade region (its endregion)")
    return crlf_from_lf(vv)


# -----------------------------------------------------------------------------
# PdfExporter - TrueVision's 1.7.0 paint-plan hunk into ValeVision's 1.2.3 (CRLF kept)
# -----------------------------------------------------------------------------

PDF_DESC_OLD = """// - jsPDF (the vendored UMD build, injected as a classic script on first
//   use) opens a page of the sheet's paper size. Bottom to top: the classic
//   title block scan when that style is on, each viewport clipped to its
//   frame (the composer underlay at RasterPixelsPerMm, the projected
//   linework as true vector lines at the paper widths with a dash for the
//   hidden class, the scene markup at scale), the sheet's own markup, and
//   the chrome (border, frames, captions, modern title block or the
//   classic field texts) drawn last so captions sit above content (D35).
"""

PDF_NOTE_OLD = """//                   Na__LayoutEditor__PdfFonts__) 02-Oct-2026 for ValeVision3D {{VVREL:W1-25}}
// - Parity        : adapted
"""

PDF_NOTE_NEW = """//                   Na__LayoutEditor__PdfFonts__) 02-Oct-2026 for ValeVision3D {{VVREL:W1-25}}; the
//                   Layers list's paint order (1.7.0) 02-Oct-2026 for ValeVision3D {{VVREL:W1-28}}
// - Parity        : adapted
"""

PDF_NOTYET_OLD = """//   - Not here yet: TrueVision3D's 1.2.0 and 1.12.0 (site plans, and their strict check), 1.6.0
//     (depth fog, and its picture's packing), 1.7.0 (the Layers list's paint order), 1.8.0 (Sheet
//     Images), 1.9.0 (turned viewports) and 1.10.0 (note regions).
"""

PDF_NOTYET_NEW = """//   - Not here yet: TrueVision3D's 1.2.0 and 1.12.0 (site plans, and their strict check), 1.6.0
//     (depth fog, and its picture's packing), 1.8.0 (Sheet Images), 1.9.0 (turned viewports) and
//     1.10.0 (note regions).
"""

PDF_LOG_OLD = """// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.2.3 (TrueVision3D's Open Sans embedding, {{VVREL:W1-25}})
"""

PDF_LOG_NEW = """// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.2.4 (TrueVision3D's paint order, {{VVREL:W1-28}})
// - The page is laid down in the Layers list's order. It used to print every
//   viewport, then all the sheet markup, then all the chrome - so a layer the
//   list put under the Viewports layer printed over the drawing, and every
//   caption printed over every note. BuildDocument now walks Na__LePaint__Plan:
//   a viewport and its own frame and caption, the notes margin with the border
//   and title block over the frontmost drawings, and each layer's markup where
//   the list puts it. A sheet whose viewports are at the bottom of the list
//   prints as it did, except that a note laid over the title block now prints
//   over it, as the screen has always shown it. Ported from TrueVision3D
//   (PdfExporter 1.7.0, v2.106.0).
//
// 02-Oct-2026 - Version 1.2.3 (TrueVision3D's Open Sans embedding, {{VVREL:W1-25}})
"""

PDF_IMPORTS = [
    ("    import { Na__LeModel__KIND_2D, Na__LeModel__GetLayers, Na__LeModel__GetFields, Na__LeModel__IsLayerVisible } from '../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';\n",
     "    import { Na__LeModel__KIND_2D, Na__LeModel__GetFields } from '../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';\n",
     "pdf model import"),
    ("    import { Na__LeChrome__Build, Na__LeChrome__DrawToPdf } from '../10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js';\n",
     "    import { Na__LeChrome__Build, Na__LeChrome__BuildViewportFrame, Na__LeChrome__DrawToPdf } from '../10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js';\n",
     "pdf chrome import"),
    ("    import { Na__LeMarkup__BuildScenePrimitives, Na__LeMarkup__BuildSheetPrimitives } from '../15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js';\n",
     "    import { Na__LeMarkup__BuildScenePrimitives, Na__LeMarkup__BuildLayerPrimitives } from '../15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js';\n"
     "    import { Na__LePaint__STEP_VIEWPORT, Na__LePaint__STEP_SHEET, Na__LePaint__Plan } from '../15__Core__Markup/Na__LayoutEditor__PaintOrder__.js';   // <-- The page is laid down in the Layers list's order, as the screen stacks it\n",
     "pdf markup import"),
    ("    import { Na__LeMargin__Report } from '../50__Feature__Specification/Na__LayoutEditor__SpecMargin__.js';\n",
     "    import { Na__LeMargin__Push, Na__LeMargin__Report } from '../50__Feature__Specification/Na__LayoutEditor__SpecMargin__.js';\n",
     "pdf margin import"),
]

PDF_BODY_OLD = """        // CHROME | Built once; the classic scan goes under everything, the rest on top
        const chrome = Na__LeChrome__Build(layout, sheet, { fields : Na__LeModel__GetFields(sheet) });
        const scans  = (layout.TitleBlockStyle === 'classic') ? chrome.filter((p) => p.Kind === 'image') : [];
        const rest   = (layout.TitleBlockStyle === 'classic') ? chrome.filter((p) => p.Kind !== 'image') : chrome;
        Na__LeChrome__DrawToPdf(doc, scans);

        // VIEWPORTS | Back to front (the top of the layer list draws last)
        const layers  = Na__LeModel__GetLayers(sheet).map((l) => l.Layer__Id);
        const ordered = sheet.Sheet__Viewports.map((v, i) => ({ v : v, rank : layers.indexOf(v.Viewport__LayerId), i : i }))
            .filter((e) => Na__LeModel__IsLayerVisible(sheet, e.v.Viewport__LayerId))
            .sort((a, b) => (b.rank - a.rank) || (a.i - b.i))
            .map((e) => e.v);
        for (let i = 0; i < ordered.length; i++) await Na__LePdf__DrawViewport(doc, sheet, ordered[i], options);   // <-- Pictures at the raster export level

        // SHEET MARKUP AND CHROME
        Na__LeChrome__DrawToPdf(doc, Na__LeMarkup__BuildSheetPrimitives(sheet, layout, null));
        Na__LeChrome__DrawToPdf(doc, rest);
        return { doc : doc, filename : Na__LePdf__Filename(sheet, layout) };
"""


def tv_slice(text, first, last):
    """TrueVision's text from the line starting with `first` to the line starting with `last` (inclusive)."""
    lines = text.split("\n")
    a = [i for i, l in enumerate(lines) if l.startswith(first)]
    b = [i for i, l in enumerate(lines) if l.startswith(last)]
    if len(a) != 1 or len(b) != 1 or b[0] < a[0]:
        raise SystemExit(f"TV slice {first!r}..{last!r}: {a} {b}")
    return "\n".join(lines[a[0]:b[0] + 1]) + "\n"


def build_pdf():
    tv = git_show(P_PDF).decode("utf-8")
    vv = lf_from_crlf(vv_bytes(P_PDF), P_PDF)
    tv_desc = tv_slice(tv, "// - jsPDF (the vendored UMD build", "//   frontmost drawings; and each layer's markup where the list puts it.")
    tv_body = tv_slice(tv, "        // CHROME | The sheet's own, built once", "        return { doc : doc, filename : Na__LePdf__Filename(sheet, layout) };")
    vv = once(vv, PDF_DESC_OLD, tv_desc, "pdf description")
    vv = once(vv, PDF_NOTE_OLD, PDF_NOTE_NEW, "pdf port note (ported on)")
    vv = once(vv, PDF_NOTYET_OLD, PDF_NOTYET_NEW, "pdf port note (not here yet)")
    vv = once(vv, PDF_LOG_OLD, PDF_LOG_NEW, "pdf log")
    for old, new, label in PDF_IMPORTS:
        vv = once(vv, old, new, label)
    vv = once(vv, PDF_BODY_OLD, tv_body, "pdf body")
    return crlf_from_lf(vv)


# -----------------------------------------------------------------------------
# LinkNoodle - TrueVision's 1.2.1 ScaleCell hunk (an importer the stack changes; CRLF kept)
# -----------------------------------------------------------------------------

NOODLE_NOTE_OLD = """// - Ported from   : TrueVision3D 57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__LinkNoodle__.js,
//                   its 1.2.0 (TrueVision v2.85.0)
// - Ported on     : 20-Sep-2026 for ValeVision3D v2.68.0
// - Parity        : verbatim - every code region is byte for byte TrueVision's
"""

NOODLE_NOTE_NEW = """// - Ported from   : TrueVision3D 57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__LinkNoodle__.js,
//                   its 1.2.0 (TrueVision v2.85.0)
// - Source version: 1.2.0 (TrueVision3D v2.85.0, 20-Sep-2026), with 1.2.1's ScaleCell (TrueVision3D v2.106.0,
//                   21-Sep-2026); read at b2aa9151
// - Ported on     : 20-Sep-2026 for ValeVision3D v2.68.0; 1.2.1's ScaleCell 02-Oct-2026 for ValeVision3D
//                   {{VVREL:W1-28}}, with the sheet surface's layer stack that made it necessary
// - Parity        : verbatim - every code region is TrueVision's 1.2.1; its 1.2.2 (a tie to a turned
//                   viewport, v2.138.0) comes with the whole-file take (W2-37)
"""

NOODLE_LOG_OLD = """// DEVELOPMENT LOG:
// 20-Sep-2026 - Version 1.0.0
"""

NOODLE_LOG_NEW = """// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.0.1 (TrueVision3D's 1.2.1, {{VVREL:W1-28}})
// - ScaleCell reads the title block's labels from EVERY .na-le-paper__chrome
//   SVG. The sheet surface now stacks the paper in the Layers list's order and
//   each viewport's frame and caption sit in a chrome slot of their own, so the
//   first chrome SVG on the paper is a caption and the Scale label was never
//   found in it - the noodle fell back to the middle of the band. Ported from
//   TrueVision3D (LinkNoodle 1.2.1, v2.106.0).
//
// 20-Sep-2026 - Version 1.0.0
"""

NOODLE_CODE = [
    ("        const chrome = paper ? paper.querySelector('.na-le-paper__chrome') : null;\n",
     None, "noodle chrome lookup"),
    ("        if (!chrome || !row) return whole;\n",
     None, "noodle guard"),
    ("        const inBand = Array.from(chrome.querySelectorAll('text')).map((el) => ({ x : parseFloat(el.getAttribute('x')), y : parseFloat(el.getAttribute('y')), text : (el.textContent || '').trim().toLowerCase() }))\n",
     None, "noodle in-band read"),
]


def build_noodle():
    tv = git_show(P_NOODLE).decode("utf-8")
    vv = lf_from_crlf(vv_bytes(P_NOODLE), P_NOODLE)
    # TrueVision's three lines, taken from its file at the pin
    tv_lines = tv.split("\n")
    pick = lambda start: [l for l in tv_lines if l.startswith(start)]
    new_lookup = pick("        const texts  = paper ? Array.from(paper.querySelectorAll('.na-le-paper__chrome text'))")
    new_guard = pick("        if (!texts.length || !row) return whole;")
    new_read = pick("        const inBand = texts.map((el) =>")
    if not (len(new_lookup) == len(new_guard) == len(new_read) == 1):
        raise SystemExit("TV LinkNoodle 1.2.1 lines not found exactly once")
    replacements = [new_lookup[0] + "\n", new_guard[0] + "\n", new_read[0] + "\n"]
    for (old, _, label), new in zip(NOODLE_CODE, replacements):
        vv = once(vv, old, new, label)
    vv = once(vv, NOODLE_NOTE_OLD, NOODLE_NOTE_NEW, "noodle port note")
    vv = once(vv, NOODLE_LOG_OLD, NOODLE_LOG_NEW, "noodle log")
    return crlf_from_lf(vv)


# -----------------------------------------------------------------------------
# Tests - whole
# -----------------------------------------------------------------------------

STACK_NOTE = """// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__LayerStack__.test.mjs
// - Source version: 1.0.0 (TrueVision3D v2.106.0, 21-Sep-2026, 23 checks; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-28}}, with the paint order it proves (its
//                   restack half has run against this app's SheetRecords since W1-19)
// - Parity        : verbatim - every check is TrueVision's, run against this app's own PaintOrder and
//                   SheetRecords
// - Divergences   :
//   - Banner and the printed title read ValeVision3D.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
"""

VECTOR_NOTE = """// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__VectorQuality__.test.mjs
// - Source version: 1.0.1 (TrueVision3D v2.136.0, 21-Sep-2026, 33 checks; 1.0.1's CRLF-safe read landed
//                   22-Sep-2026 in git b1e0220f, the commit of v2.145.0, with no entry of its own; read at
//                   b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-28}}, with the sheet surface that tells the
//                   module of every redraw and the paper stylesheet's hold rule
// - Parity        : verbatim - every check is TrueVision's, run against this app's own VectorQuality
//                   module and paper stylesheet
// - Divergences   :
//   - Banner and the printed title read ValeVision3D.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
"""

TEST_LOG_HEAD = """// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
"""


def build_stack_test():
    text = git_show(P_T_STACK).decode("utf-8")
    text = once(text, "// TRUEVISION3D - TEST - THE LAYER STACK\n", "// VALEVISION3D - TEST - THE LAYER STACK\n", "stack banner")
    text = once(text, TEST_LOG_HEAD, STACK_NOTE, "stack port note")
    text = once(text, "    console.log('TrueVision3D - the layer stack');\n", "    console.log('ValeVision3D - the layer stack');\n", "stack title")
    return text.encode("utf-8")


def build_vector_test():
    text = git_show(P_T_VECTOR).decode("utf-8")
    text = once(text, "// TRUEVISION3D - TEST - VECTOR QUALITY (THE TOOLBAR'S VECTOR CONTROL)\n",
                "// VALEVISION3D - TEST - VECTOR QUALITY (THE TOOLBAR'S VECTOR CONTROL)\n", "vector banner")
    text = once(text, TEST_LOG_HEAD, VECTOR_NOTE, "vector port note")
    text = once(text, "    console.log('TrueVision3D - vector quality');\n", "    console.log('ValeVision3D - vector quality');\n", "vector title")
    return text.encode("utf-8")


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

BUILDERS = [
    (P_MARKUP, build_markup),
    (P_GROUPS, build_groups),
    (P_SURFACE, build_surface),
    (P_PAPER, build_paper),
    (P_PDF, build_pdf),
    (P_NOODLE, build_noodle),
    (P_T_STACK, build_stack_test),
    (P_T_VECTOR, build_vector_test),
]


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--stage"
    if mode == "--restore":
        for rel, _ in BUILDERS:
            live = os.path.join(VV, rel.replace("/", os.sep))
            snap = os.path.join(SCRATCH, "vv_before", os.path.basename(rel))
            if VV_SHA.get(rel) is None:
                if os.path.exists(live):
                    os.remove(live)
                    print("removed new file", rel)
                continue
            shutil.copyfile(snap, live)
            print("restored", rel)
        return
    built = []
    for rel, fn in BUILDERS:
        data = fn()
        built.append((rel, data))
    out_root = os.path.join(SCRATCH, "staged") if mode == "--stage" else VV
    for rel, data in built:
        path = os.path.join(out_root, rel.replace("/", os.sep))
        if mode == "--apply":
            if VV_SHA.get(rel):
                vv_bytes(rel)                                                    # <-- re-check: unchanged under us
            elif os.path.exists(path):
                raise SystemExit(f"STOP: new file {rel} already exists")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(data)
        crlf = data.count(b"\r\n")
        lf = data.count(b"\n")
        print(f"{'wrote' if mode == '--apply' else 'staged'} {rel}  {len(data)} B  sha256 {sha(data)[:16]}  "
              f"{'CRLF' if crlf == lf and lf else ('LF' if crlf == 0 else 'MIXED')} ({lf} lines)")


if __name__ == "__main__":
    main()
