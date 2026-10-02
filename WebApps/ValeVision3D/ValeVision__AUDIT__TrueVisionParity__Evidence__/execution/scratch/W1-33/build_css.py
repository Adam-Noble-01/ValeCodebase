"""W1-33 - the three stylesheets (CRLF kept):
- Styles__Main: the 3D-furniture hiding block (VV :30-50) leaves, with a pointer comment and a header line.
- Styles__Boot: receives that block verbatim, comment included, ahead of the Tab Strip region, with the
  VV-only .na-vs-tl selector (S10-V03, F.8 C22); the loading screen region gains the boot veil
  (.na-le-veil.na-le-veil--boot) and loses the retired status-line rule; header lines.
- LoadingOverlays: VV region "Layout Editor Return-to-Model Veil" (VV :268-344) replaced by TrueVision's
  "Layout Editor Loading Veils" region (TV :255-339) verbatim; the VV-only regions untouched.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w133_common import HERE, PRE, sha1, split_eol, join_eol, replace_once, preimage_sha1, tv_text  # noqa: E402

HIDING_COMMENT = (
    "/* While the editor is on screen the 3D overlays stand aside. The canvas\n"
    "   itself stays in the DOM (visibility only) so snapshots can render.\n"
    "   The two dropdown menus (Tools & Settings and the localhost Dev Tools\n"
    "   container) belong to the 3D Model tab only: they sit above the host at\n"
    "   z-index 1001 and would otherwise cover the sheet panels, so a drawing\n"
    "   tab hides them outright rather than letting them float over the paper.\n"
    "   The breadcrumb trail goes with them: it is fixed to the top left, which\n"
    "   on a drawing tab is the sheet panel column, and it navigates away from\n"
    "   the model rather than around the drawing, so it has nothing to say while\n"
    "   a sheet is open. It returns with the 3D Model tab, folded or unfolded\n"
    "   exactly as it was left. */\n"
)
HIDING_SELECTORS = (
    "body.na-layout-editor--active .na-dropdown-menu,\n"
    "body.na-layout-editor--active #naBreadcrumbNav,\n"
    "body.na-layout-editor--active #naPresentationCarousel,\n"
    "body.na-layout-editor--active #naNavToolbar,\n"
    "body.na-layout-editor--active #naNavHelpPanel,\n"
    "body.na-layout-editor--active .na-export-overlay,\n"
    "body.na-layout-editor--active .na-projected-linework,\n"
)
HIDING_LAST_TV = "body.na-layout-editor--active .controls-instructions-panel {\n"
HIDING_BODY = (
    "    display                            : none !important;\n"
    "}\n"
)
HIDING_BLOCK_TV = HIDING_COMMENT + HIDING_SELECTORS + HIDING_LAST_TV + HIDING_BODY


def build_main():
    data = open(os.path.join(PRE, "Na__LayoutEditor__Styles__Main__.css"), "rb").read()
    if sha1(data) != preimage_sha1("main"):
        raise SystemExit("Styles__Main pre-image moved")
    text, eol = split_eol(data)

    # The block this package moves must be TrueVision's, byte for byte (TV Styles__Main :31-51)
    tv_main = tv_text("Na__LayoutEditor__Styles__Main__.css")
    if tv_main.count(HIDING_BLOCK_TV) != 1:
        raise SystemExit("the hiding block is not TrueVision's verbatim at the pin")

    text = replace_once(text,
        " * - Split       : 15-Sep-2026 (v2.47.0) the paper, frames, selection, snapping, context menu and grips rules moved verbatim to\n"
        " *                 Na__LayoutEditor__Styles__Main__Paper__.css, which the loader links straight after this sheet.\n"
        " */\n",
        " * - Split       : 15-Sep-2026 (v2.47.0) the paper, frames, selection, snapping, context menu and grips rules moved verbatim to\n"
        " *                 Na__LayoutEditor__Styles__Main__Paper__.css, which the loader links straight after this sheet.\n"
        " * - Moved       : 02-Oct-2026 ({{VVREL:W1-33}}) the 3D-furniture hiding block moved verbatim to Na__LayoutEditor__Styles__Boot__.css,\n"
        " *                 which loads with the page: the loader now puts the editor's body class on at the press, before this sheet is\n"
        " *                 linked (TrueVision keeps the block here, and loads this sheet with the page).\n"
        " */\n",
        "main header")
    text = replace_once(text,
        HIDING_BLOCK_TV + "\n",
        "/* The 3D overlays that stand aside while the editor is on screen are hidden\n"
        "   from Na__LayoutEditor__Styles__Boot__.css, which loads with the page: the\n"
        "   loader puts the editor's body class on at the press, before this sheet\n"
        "   is linked. */\n"
        "\n",
        "main hiding block")
    if "body.na-layout-editor--active" in text:
        raise SystemExit("a body-class rule is left in Styles__Main")
    return join_eol(text, eol)


def build_boot():
    data = open(os.path.join(PRE, "Na__LayoutEditor__Styles__Boot__.css"), "rb").read()
    if sha1(data) != preimage_sha1("boot"):
        raise SystemExit("Styles__Boot pre-image moved")
    text, eol = split_eol(data)

    # HEADER
    text = replace_once(text,
        " * - Parity      : adapted (TrueVision keeps these rules in its Styles__Main, which it loads with the page)\n"
        " */\n"
        "\n"
        "/* THE ONLY LAYOUT EDITOR STYLESHEET THE PAGE LOADS. It holds what can be on\n"
        "   screen before the editor exists: the published tab strip height, the tab\n"
        "   strip, the Dev section's sheet list and the loading screen. Main, Panels\n"
        "   and Specification are linked by Na__LayoutEditor__Loader__.js when the\n"
        "   editor loads, so nothing drawn before that may depend on them. */\n",
        " * - Parity      : adapted (TrueVision keeps these rules in its Styles__Main, which it loads with the page)\n"
        " * - Moved       : 02-Oct-2026 for ValeVision3D {{VVREL:W1-33}} - the 3D-furniture hiding block, verbatim from Styles__Main, where\n"
        " *                 TrueVision keeps it and loads it with the page: the loader now puts the editor's body class on at the press,\n"
        " *                 before Styles__Main is linked. And the loading screen's boot veil (.na-le-veil--boot).\n"
        " * - Divergences : the hiding block carries one selector of this app's own, the Video Studio timeline (.na-vs-tl, fixed at\n"
        " *                 z-index 1000, which would otherwise float over a drawing tab); the boot veil is this app's, because its\n"
        " *                 editor loads on first use (DR-24 (a)).\n"
        " */\n"
        "\n"
        "/* THE ONLY LAYOUT EDITOR STYLESHEET THE PAGE LOADS. It holds what can be on\n"
        "   screen before the editor exists: the published tab strip height, the 3D\n"
        "   furniture's hiding block, the tab strip, the Dev section's sheet list and\n"
        "   the loading screen. Main, Panels and Specification are linked by\n"
        "   Na__LayoutEditor__Loader__.js when the editor loads, so nothing drawn\n"
        "   before that may depend on them. */\n",
        "boot header")

    # THE HIDING BLOCK, ahead of the Tab Strip region
    text = replace_once(text,
        "/* endregion ------------------------------------------------------- */\n"
        "\n"
        "\n"
        "/* ----------------------------------------------------------------- */\n"
        "/* REGION  |  Tab Strip                                              */\n",
        "/* endregion ------------------------------------------------------- */\n"
        "\n"
        "\n"
        "/* ----------------------------------------------------------------- */\n"
        "/* REGION  |  Shell Hiding                                           */\n"
        "/* ----------------------------------------------------------------- */\n"
        "\n"
        + HIDING_COMMENT + HIDING_SELECTORS +
        "body.na-layout-editor--active .controls-instructions-panel,\n"
        "body.na-layout-editor--active .na-vs-tl {                          /* <-- This app only: the Video Studio timeline (fixed, z-index 1000) */\n"
        + HIDING_BODY +
        "\n"
        "/* endregion ------------------------------------------------------- */\n"
        "\n"
        "\n"
        "/* ----------------------------------------------------------------- */\n"
        "/* REGION  |  Tab Strip                                              */\n",
        "boot hiding block")

    # THE LOADING SCREEN REGION: the boot veil; the retired status rule out; the error state kept
    text = replace_once(text,
        "/* The element carries the start-up screen's own classes (.loading-overlay,\n"
        "   .loading-spinner, .loading-text, .loading-overlay--error and\n"
        "   .loading-error-*), so it looks and fades exactly as that screen does.\n"
        "   Only what the start-up screen has no use for is added here: the status\n"
        "   line, the reason a load failed, and a second button beside Reload. */\n"
        "\n"
        ".na-le-loading__status {\n"
        "    min-height                         : 20px;                        /* <-- An empty line keeps the title from jumping when a step is named */\n"
        "    margin                             : 6px 0 0;\n"
        "    font-family                        : 'Open Sans', sans-serif;\n"
        "    font-size                          : 13px;\n"
        "    color                              : #5f6f7a;\n"
        "    letter-spacing                     : 0.3px;\n"
        "    text-align                         : center;\n"
        "}\n"
        "\n",
        "/* WHILE LOADING it wears TrueVision's veil - .na-le-veil, with the app's\n"
        "   spinner, the headline and the status line (Na__UiFeature__Styles__\n"
        "   LoadingOverlays__.css) - and this modifier, which puts it where the\n"
        "   editor host will be: fixed below the tab strip, at the host's z-index,\n"
        "   so under the strip (999) and the header (1001), and the bar's hold and\n"
        "   fold are watched over it. Opaque and without the veil's blur, because\n"
        "   the 3D view is still drawn underneath until the editor hides it. Its top\n"
        "   follows the fold as the host's does (AppHeader, \"Contextual Fold\"): the\n"
        "   moment the body class lands it takes its folded place and the bars\n"
        "   slide up over it. The host, appended after it, paints above it at the\n"
        "   same z-index, and the editor's own first-open veil takes over there, in\n"
        "   the same frame, over the same rectangle. */\n"
        "\n"
        ".na-le-veil.na-le-veil--boot {\n"
        "    position                           : fixed;\n"
        "    top                                : calc(var(--Vale_HeaderHeight) + var(--Vale_LayoutTabStripHeight));\n"
        "    left                               : 0;\n"
        "    right                              : 0;\n"
        "    bottom                             : 0;\n"
        "    z-index                            : 600;                         /* <-- The editor host's */\n"
        "    background-color                   : #ffffff;                     /* <-- Opaque: no 3D model shows through */\n"
        "    backdrop-filter                    : none;\n"
        "}\n"
        "\n"
        "body.na-layout-editor--active .na-le-veil--boot {\n"
        "    top                                : var(--Vale_LayoutTabStripHeight);   /* <-- Folded at once, as the host is; the bars slide over it */\n"
        "}\n"
        "\n"
        "/* THE ERROR STATE keeps the start-up screen's own classes (.loading-overlay,\n"
        "   .loading-spinner, .loading-overlay--error and .loading-error-*), so it\n"
        "   looks and fades exactly as that screen does. Only what the start-up\n"
        "   screen has no use for is added here: the reason a load failed, and a\n"
        "   second button beside Reload. */\n"
        "\n",
        "boot loading screen")
    return join_eol(text, eol)


def build_overlays():
    data = open(os.path.join(PRE, "Na__UiFeature__Styles__LoadingOverlays__.css"), "rb").read()
    if sha1(data) != preimage_sha1("overlays"):
        raise SystemExit("LoadingOverlays pre-image moved")
    text, eol = split_eol(data)
    lines = text.split("\n")

    vv_start = lines.index(" * REGION | Layout Editor Return-to-Model Veil") - 1
    if not lines[vv_start].startswith("/* ----") or vv_start != 267:
        raise SystemExit("VV veil region not where it was read (expected line 268)")
    vv_end = next(i for i in range(vv_start, len(lines)) if lines[i].startswith("/* endregion"))
    if vv_end != 343 or lines[vv_end + 1:] != [""]:
        raise SystemExit("VV veil region is not the file's last region (expected to end at line 344)")

    tv_lines = tv_text("Na__UiFeature__Styles__LoadingOverlays__.css").split("\n")
    tv_start = tv_lines.index(" * REGION | Layout Editor Loading Veils") - 1
    tv_end = next(i for i in range(tv_start, len(tv_lines)) if tv_lines[i].startswith("/* endregion"))
    if (tv_start, tv_end) != (254, 338):
        raise SystemExit("TV veil region not at :255-339")

    new_lines = lines[:vv_start] + tv_lines[tv_start:tv_end + 1] + lines[vv_end + 1:]
    text = "\n".join(new_lines)
    for kept in (".loading-overlay--error .loading-spinner", ".na-layout-loading-overlay--opaque",
                 ".na-layout-loading-overlay__status--error", "REGION | Load Error State"):
        if kept not in text:
            raise SystemExit("a VV-only rule was lost: " + kept)
    return join_eol(text, eol)


if __name__ == "__main__":
    out = os.path.join(HERE, "built")
    os.makedirs(out, exist_ok=True)
    for name, fn in (("Na__LayoutEditor__Styles__Main__.css", build_main),
                     ("Na__LayoutEditor__Styles__Boot__.css", build_boot),
                     ("Na__UiFeature__Styles__LoadingOverlays__.css", build_overlays)):
        data = fn()
        open(os.path.join(out, name), "wb").write(data)
        crlf = data.count(b"\r\n")
        print("built", name, len(data), "bytes, CRLF", crlf, "bare LF", data.count(b"\n") - crlf)
