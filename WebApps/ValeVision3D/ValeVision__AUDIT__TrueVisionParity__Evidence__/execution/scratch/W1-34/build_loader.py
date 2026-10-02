"""W1-34 - Loader header (CRLF kept). No code changes: TrueVision's tab strip 2.0.0 finds every name it
needs on the facade W1-31 built. The DESCRIPTION's LOADED bullet still listed the strip that is gone (a
sheet tab, the plus tab, a tab rename); it now names what loads the editor from the 2.0.0 strip. Log 1.1.3
with the release placeholder, and the Ported on line.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w134_common import pre_bytes, split_eol, join_eol, replace_once, write_built  # noqa: E402


def build():
    text, eol = split_eol(pre_bytes("loader"))

    text = replace_once(text,
        "// - LOADED the first time something needs the editor itself: a sheet tab, the\n"
        "//   plus tab, a tab rename or drag, or a Dev section action. The loading\n"
        "//   screen covers the wait while the modules, the editor's stylesheets and\n"
        "//   its configs arrive; then the mode controller is initialised with the\n"
        "//   render context index.html used to hand it directly.\n",
        "// - LOADED the first time something needs the editor itself: a drawing\n"
        "//   opened from the tab strip (a row of its Drawings menu, an end arrow,\n"
        "//   New sheet), the Specification tab, a drawing row dragged to a new\n"
        "//   place, or a Dev section action. The loading screen covers the wait\n"
        "//   while the modules, the editor's stylesheets and its configs arrive;\n"
        "//   then the mode controller is initialised with the render context\n"
        "//   index.html used to hand it directly.\n",
        "LOADED bullet")

    text = replace_once(text,
        "// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-31}} (the entry points above; the\n"
        "//                   loader itself is this app's); 02-Oct-2026 for ValeVision3D {{VVREL:W1-33}} (the\n"
        "//                   first open: the body class at the press, the hand-over to the first-open veil)\n",
        "// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-31}} (the entry points above; the\n"
        "//                   loader itself is this app's); 02-Oct-2026 for ValeVision3D {{VVREL:W1-33}} (the\n"
        "//                   first open: the body class at the press, the hand-over to the first-open veil);\n"
        "//                   02-Oct-2026 for ValeVision3D {{VVREL:W1-34}} (TrueVision's tab strip 2.0.0 reads\n"
        "//                   the editor through this facade alone)\n",
        "Ported on")

    text = replace_once(text,
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.1.2 (the first open as TrueVision's, {{VVREL:W1-33}})\n",
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.1.3 (TrueVision's tab strip 2.0.0, {{VVREL:W1-34}})\n"
        "// - THE COMPACT STRIP NEEDS NOTHING NEW HERE. TrueVision's tab strip 2.0.0\n"
        "//   reads its config, sheet model, mode controller and specification\n"
        "//   through this facade alone: the document tabs ask HasFeature, the\n"
        "//   Drawings menu's rows IsSitePlanSheet, its New sheet row CreateSheet,\n"
        "//   and the drag this app keeps on those rows until the Document Register\n"
        "//   lands ReorderSheet. The code is unchanged; the header now says what\n"
        "//   loads the editor from that strip (a Drawings menu row, an end arrow,\n"
        "//   New sheet, the Specification tab, a dragged row), as it has no tab per\n"
        "//   sheet, no + tab and no rename any more.\n"
        "//\n"
        "// 02-Oct-2026 - Version 1.1.2 (the first open as TrueVision's, {{VVREL:W1-33}})\n",
        "log 1.1.3")

    write_built("loader", join_eol(text, eol))


if __name__ == "__main__":
    build()
