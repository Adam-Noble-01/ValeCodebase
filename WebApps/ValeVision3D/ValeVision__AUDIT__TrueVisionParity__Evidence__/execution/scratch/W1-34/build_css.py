"""W1-34 - the two stylesheets (CRLF kept).
- Styles__Boot: the Tab Strip region becomes TrueVision's Styles__Main "Tab Strip" region (tab strip 2.0.0,
  TrueVision3D v2.158.0) byte for byte: TrueVision's ten Drawings-menu rules in (menu-open, caret x2, menu,
  menu[hidden], menu-row, row hover/focus-visible, row--open, row--add, divider), this app's six + tab and
  rename rules out; the region's shared rules were already identical. Header line, and the intro comment
  names the menu.
- Styles__Specification: the dead .na-le-tabs__tab--spec margin rule goes (2.0.0 names the tab
  --specification); TrueVision still carries it, its deletion is offered there (WT-08). Header line.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w134_common import pre_bytes, split_eol, join_eol, replace_once, tv_text, write_built  # noqa: E402

REGION_OPEN = (
    "/* ----------------------------------------------------------------- */\n"
    "/* REGION  |  Tab Strip                                              */\n"
    "/* ----------------------------------------------------------------- */\n"
)
REGION_CLOSE = "/* endregion ------------------------------------------------------- */\n"


def region(text):
    """The Tab Strip region: from its opening rule to its endregion line, inclusive."""
    if text.count(REGION_OPEN) != 1:
        raise SystemExit("Tab Strip region opening found " + str(text.count(REGION_OPEN)) + " times")
    start = text.index(REGION_OPEN)
    end = text.index(REGION_CLOSE, start) + len(REGION_CLOSE)
    return start, end


def build_boot():
    text, eol = split_eol(pre_bytes("boot"))
    tv_main = tv_text("main")

    tv_start, tv_end = region(tv_main)
    tv_region = tv_main[tv_start:tv_end]
    if ".na-le-tabs__menu-divider" not in tv_region or ".na-le-tabs__tab--add" in tv_region:
        raise SystemExit("TrueVision's Tab Strip region is not the 2.0.0 one")

    start, end = region(text)
    here = text[start:end]
    # Everything up to and including .na-le-tabs__tab--model must already be TrueVision's
    shared_end = ".na-le-tabs__tab--model {\n    margin-right                       : 8px;\n}\n\n"
    if here.count(shared_end) != 1 or tv_region.count(shared_end) != 1:
        raise SystemExit("the --model rule is not where it was expected")
    here_shared = here[:here.index(shared_end) + len(shared_end)]
    tv_shared = tv_region[:tv_region.index(shared_end) + len(shared_end)]
    if here_shared != tv_shared:
        raise SystemExit("the strip rules both apps share are no longer byte-identical")
    gone = here[len(here_shared):]
    for selector in (".na-le-tabs__tab--add {", ".na-le-tabs__renaming {", ".na-le-tabs__renaming-code {",
                     ".na-le-tabs__renaming-code[hidden] {", ".na-le-tabs__renaming .na-le-tabs__rename {",
                     ".na-le-tabs__rename {"):
        if ("\n" + gone).count("\n" + selector + "\n") != 1:
            raise SystemExit("the rule leaving is not there once: " + selector)
    text = text[:start] + tv_region + text[end:]

    text = replace_once(text,
        " * - Divergences : the hiding block carries one selector of this app's own, the Video Studio timeline (.na-vs-tl, fixed at\n",
        " * - Tab strip   : 02-Oct-2026 for ValeVision3D {{VVREL:W1-34}} - the Tab Strip region is TrueVision's Styles__Main \"Tab Strip\"\n"
        " *                 region (tab strip 2.0.0, TrueVision3D v2.158.0; read at b2aa9151) byte for byte: the Drawings tab's caret and\n"
        " *                 its menu in, the + tab and rename-field rules out.\n"
        " * - Divergences : the hiding block carries one selector of this app's own, the Video Studio timeline (.na-vs-tl, fixed at\n",
        "boot header")

    text = replace_once(text,
        "   screen before the editor exists: the published tab strip height, the 3D\n"
        "   furniture's hiding block, the tab strip, the Dev section's sheet list and\n"
        "   the loading screen. Main, Panels and Specification are linked by\n"
        "   Na__LayoutEditor__Loader__.js when the editor loads, so nothing drawn\n"
        "   before that may depend on them. */\n",
        "   screen before the editor exists: the published tab strip height, the 3D\n"
        "   furniture's hiding block, the tab strip and its Drawings menu, the Dev\n"
        "   section's sheet list and the loading screen. Main, Panels and\n"
        "   Specification are linked by Na__LayoutEditor__Loader__.js when the editor\n"
        "   loads, so nothing drawn before that may depend on them. */\n",
        "boot intro")

    after = text[region(text)[0]:region(text)[1]]
    if after != tv_region:
        raise SystemExit("the Tab Strip region is not TrueVision's after the change")
    write_built("boot", join_eol(text, eol))


def build_spec():
    text, eol = split_eol(pre_bytes("spec"))
    tv_spec = tv_text("spec")
    dead = (
        ".na-le-tabs__tab--spec {\n"
        "    margin-left                        : 8px;\n"
        "}\n"
        "\n"
    )
    if tv_spec.count(dead) != 1:
        raise SystemExit("TrueVision's sheet does not carry the dead rule as expected")
    text = replace_once(text,
        "/* REGION  |  The Tab                                                */\n"
        "/* ----------------------------------------------------------------- */\n"
        "\n" + dead,
        "/* REGION  |  The Tab                                                */\n"
        "/* ----------------------------------------------------------------- */\n"
        "\n",
        "dead --spec rule")
    text = replace_once(text,
        " * - Split       : 15-Sep-2026 (v2.47.0) the notes, panels and notes margin rules moved verbatim to Styles__Specification__Notes,\n"
        " *                 and the read document and print rules to Styles__Specification__Read; the loader links them after this sheet.\n"
        " */\n",
        " * - Split       : 15-Sep-2026 (v2.47.0) the notes, panels and notes margin rules moved verbatim to Styles__Specification__Notes,\n"
        " *                 and the read document and print rules to Styles__Specification__Read; the loader links them after this sheet.\n"
        " * - Removed     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-34}} - the .na-le-tabs__tab--spec margin rule: the tab strip 2.0.0\n"
        " *                 (TrueVision3D v2.158.0) names its tab --specification, so the rule matched nothing. TrueVision still carries\n"
        " *                 it; its deletion there is offered with the TrueVision lane (WT-08).\n"
        " */\n",
        "spec header")
    import re
    code = re.sub(r"/\*[\s\S]*?\*/", " ", text)
    if re.search(r"\.na-le-tabs__tab--spec(?![A-Za-z0-9_-])", code):
        raise SystemExit("the dead rule is still there")
    write_built("spec", join_eol(text, eol))


if __name__ == "__main__":
    build_boot()
    build_spec()
