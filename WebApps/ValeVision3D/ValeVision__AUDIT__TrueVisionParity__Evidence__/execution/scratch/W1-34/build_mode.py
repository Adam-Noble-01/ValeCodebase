"""W1-34 - ModeController hunk (CRLF kept): OpenSpecification through EnterUnder, at TrueVision's place
with TrueVision's comment (TV 1.30.0, v2.158.0); its register and statements hides stay with W4-10 / W4-13.
Records: Source version and Ported on lines, log 1.18.3 with the release placeholder.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w134_common import pre_bytes, split_eol, join_eol, replace_once, tv_text, write_built  # noqa: E402

TV_COMMENT = (
    "    // FUNCTION | Show the Project Specification Tab\n"
    "    // ------------------------------------------------------------\n"
    "    // Over the sheet, which stays laid out underneath: its tools, keys and\n"
    "    // margin grip stand down, a text field still open on the paper is\n"
    "    // committed first. noteId brings that note into view. A request while no\n"
    "    // drawing tab is open opens the first sheet underneath it first.\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__LeMode__OpenSpecification(noteId) {\n"
)
TV_ENTER_UNDER = "        if (!Na__LeMode__EnterUnder()) return false;                              // <-- From the 3D view: the first sheet opens underneath, quietly\n"
TV_HIDES = (
    "        Na__LeRegEd__Hide();\n"
    "        Na__LeStmtPage__Hide();\n"
)


def build():
    text, eol = split_eol(pre_bytes("mode"))
    tv = tv_text("mode")
    # TrueVision's function opening, comment, the two feature hides (not taken) and the EnterUnder line
    if tv.count(TV_COMMENT + TV_HIDES + TV_ENTER_UNDER + "        void Na__LeSpec__EnsureLoaded();\n") != 1:
        raise SystemExit("TrueVision's OpenSpecification opening is not as expected at the pin")

    text = replace_once(text,
        "    // FUNCTION | Show the Project Specification Tab\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__LeMode__OpenSpecification(noteId) {\n"
        "        if (!Na__LeMode__Active && !Na__LeMode__Enter(null)) return false;\n"
        "        void Na__LeSpec__EnsureLoaded();\n",
        TV_COMMENT + TV_ENTER_UNDER +
        "        void Na__LeSpec__EnsureLoaded();\n",
        "OpenSpecification")

    text = replace_once(text,
        "// - Source version: 1.32.0 (TrueVision3D v2.166.0, 29-Sep-2026; read at b2aa9151) - the hunks the 1.18.1\n"
        "//                   and 1.18.2 entries name. Every other difference from that file is a seam listed here\n"
        "//                   or a hunk that arrives with its own feature.\n",
        "// - Source version: 1.32.0 (TrueVision3D v2.166.0, 29-Sep-2026; read at b2aa9151) - the hunks the 1.18.1,\n"
        "//                   1.18.2 and 1.18.3 entries name. Every other difference from that file is a seam listed\n"
        "//                   here or a hunk that arrives with its own feature.\n",
        "Source version")

    text = replace_once(text,
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-32}}; 02-Oct-2026 for ValeVision3D\n"
        "//                   {{VVREL:W1-33}} (the first-open veil)\n",
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-32}}; 02-Oct-2026 for ValeVision3D\n"
        "//                   {{VVREL:W1-33}} (the first-open veil); 02-Oct-2026 for ValeVision3D {{VVREL:W1-34}}\n"
        "//                   (the specification under its own tab)\n",
        "Ported on")

    text = replace_once(text,
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.18.2 (TrueVision's first-open veil, {{VVREL:W1-33}})\n",
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.18.3 (the specification under its own tab, {{VVREL:W1-34}})\n"
        "// - THE SPECIFICATION OPENS FROM THE 3D VIEW WITH NO DRAWING VEIL OVER IT.\n"
        "//   The tab strip now offers it there, so OpenSpecification opens the\n"
        "//   first sheet underneath through EnterUnder, quietly: the first-open\n"
        "//   veil keeps its once-a-session turn for the first drawing tab, where\n"
        "//   it belongs. From TrueVision3D 1.30.0 (v2.158.0), with TrueVision's\n"
        "//   comment over the function; its register and statements hides come\n"
        "//   with those pages.\n"
        "//\n"
        "// 02-Oct-2026 - Version 1.18.2 (TrueVision's first-open veil, {{VVREL:W1-33}})\n",
        "log 1.18.3")

    write_built("mode", join_eol(text, eol))


if __name__ == "__main__":
    build()
