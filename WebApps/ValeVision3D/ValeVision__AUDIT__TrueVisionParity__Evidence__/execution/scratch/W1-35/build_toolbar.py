"""W1-35 - build the Toolbar: TrueVision's 1.17.0 and 1.19.0 hunks replayed on this app's file.

Reads the pre-image (CRLF) and TrueVision's file at the pin b2aa9151, applies anchored
replace-once edits on the LF text, joins with the file's own CRLF and writes built/.
The code hunks are TrueVision's 1.17.0 (the Notes toggle) and 1.19.0 (Undo, Redo, Fit,
100%) exactly as TrueVision made them (scratch/W1-35/tv_history: d76d7638, 7ab70638,
ancestors of the pin); PURPOSE and DESCRIPTION are taken from the pin's bytes.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w135_common import pre_bytes, tv_text, split_eol, join_eol, replace_once, write_built  # noqa: E402


def block(text, start, end, label):
    """The text from start (inclusive) to end (exclusive), each found once."""
    a = text.find(start)
    if a < 0 or text.count(start) != 1:
        raise SystemExit("block start '" + label + "' not found once")
    b = text.find(end, a)
    if b < 0:
        raise SystemExit("block end '" + label + "' not found")
    return text[a:b]


def line_starting(text, prefix, label):
    lines = [l for l in text.split("\n") if l.startswith(prefix)]
    if len(lines) != 1:
        raise SystemExit("line '" + label + "' found " + str(len(lines)) + " times")
    return lines[0]


def main():
    vv, eol = split_eol(pre_bytes("toolbar"))
    if eol != "\r\n":
        raise SystemExit("the Toolbar was expected CRLF")
    tv = tv_text("toolbar")

    # ------------------------------------------------------------------
    # HEADER | PURPOSE and DESCRIPTION are TrueVision's (K2 H2, H4); INTEGRATION already is
    # ------------------------------------------------------------------
    vv = replace_once(vv, line_starting(vv, "// PURPOSE    :", "VV PURPOSE") + "\n",
                      line_starting(tv, "// PURPOSE    :", "TV PURPOSE") + "\n", "PURPOSE")
    vv_desc = block(vv, "// DESCRIPTION:\n", "//\n// INTEGRATION:\n", "VV DESCRIPTION")
    tv_desc = block(tv, "// DESCRIPTION:\n", "//\n// INTEGRATION:\n", "TV DESCRIPTION")
    vv = replace_once(vv, vv_desc, tv_desc, "DESCRIPTION")
    vv_int = block(vv, "// INTEGRATION:\n", "// ------", "VV INTEGRATION")
    tv_int = block(tv, "// INTEGRATION:\n", "// ------", "TV INTEGRATION")
    if vv_int != tv_int:
        raise SystemExit("INTEGRATION differs from TrueVision's")

    # ------------------------------------------------------------------
    # HEADER | PORT NOTE: Source version, Ported on, Divergences (K2 H5)
    # ------------------------------------------------------------------
    vv = replace_once(vv,
        "// - Source version: hunks up to TrueVision's Toolbar 1.12.0 (TrueVision3D v2.70.0, 19-Sep-2026);\n"
        "//                   TrueVision's file is 1.24.0 (read at b2aa9151)\n"
        "// - Ported on     : hunk by hunk, 13-Sep-2026 to 19-Sep-2026 (see the log below)\n",
        "// - Source version: hunks up to TrueVision's Toolbar 1.12.0 (TrueVision3D v2.70.0, 19-Sep-2026),\n"
        "//                   then its 1.17.0 (the Notes toggle; 21-Sep-2026, named in no TrueVision3D\n"
        "//                   release entry) and 1.19.0 (Undo, Redo, Fit and the zoom readout; TrueVision3D\n"
        "//                   v2.124.0, 21-Sep-2026); TrueVision's file is 1.24.0 (read at b2aa9151)\n"
        "// - Ported on     : hunk by hunk, 13-Sep-2026 to 19-Sep-2026, then 02-Oct-2026 for\n"
        "//                   ValeVision3D {{VVREL:W1-35}} (see the log below)\n",
        "Source version / Ported on")
    vv = replace_once(vv,
        "// - Divergences   :\n"
        "//   - Undo, Redo, Fit and the 100% zoom button are still on the strip. TrueVision\n"
        "//     removed them in its 1.19.0 and kept their keys and the right-click Zoom to\n"
        "//     fit (W1-35 takes that change here).\n"
        "//   - The Notes toggle is still on the strip. TrueVision removed it in its 1.17.0,\n"
        "//     leaving the Margin Notes panel's own switch (W1-35).\n",
        "// - Divergences   :\n",
        "Divergences: the two bullets that stop being true")
    vv = replace_once(vv,
        "//     button with a snap modes menu over 28__System__ObjectSnap (its 1.20.0; W2-19).\n"
        "//   - Not here yet, each waiting for its feature:",
        "//     button with a snap modes menu over 28__System__ObjectSnap (its 1.20.0; W2-19).\n"
        "//   - The Select and Move hover texts keep this app's words, in the code and in the\n"
        "//     config: TrueVision's describe its automatic Move (TrueVision3D v2.78.0), which\n"
        "//     this app does not have until Adam confirms it (DR-40 item 7; W3-04, then W5-01).\n"
        "//   - Not here yet, each waiting for its feature:",
        "Divergences: the Select and Move hover texts")

    # ------------------------------------------------------------------
    # HEADER | DEVELOPMENT LOG: this app's own sequence, a patch step (1.9.3 -> 1.9.4)
    # ------------------------------------------------------------------
    vv = replace_once(vv,
        "// DEVELOPMENT LOG:\n"
        "// 01-Oct-2026 - Version 1.9.3 (records hygiene, v2.71.1)\n",
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.9.4 (the strip slimmed as TrueVision's, {{VVREL:W1-35}})\n"
        "// - THE NOTES TOGGLE IS GONE, as in TrueVision's 1.17.0: Show notes margin in\n"
        "//   the Margin Notes panel is the one switch for a sheet's notes margin, so\n"
        "//   the strip no longer spends a button on a setting that already had a\n"
        "//   home. Its sync went with it, and the SheetModel UpdateMarginNotes and\n"
        "//   SheetRecords MarginNotes imports; the config lost the button's two\n"
        "//   labels, and its Margin Notes description is TrueVision's.\n"
        "// - UNDO, REDO, FIT AND THE 100% BUTTON ARE GONE, as in TrueVision's 1.19.0\n"
        "//   (TrueVision3D v2.124.0), with the two separators that fenced them: the\n"
        "//   tools close with one separator and Raster with another, so neither\n"
        "//   strip shows two side by side. The keys stay - Ctrl+Z, Ctrl+Y and\n"
        "//   Ctrl+Shift+Z, and the key map's Nav__ZoomFit and Nav__ZoomActualSize -\n"
        "//   and Zoom to fit, Undo and Redo stay on the right-click menu. Nothing\n"
        "//   left reads the undo depth or the zoom, so the toolbar no longer listens\n"
        "//   for Na__LeHist__CHANGED_EVENT or Na__LeSurface__ZOOM_EVENT and the\n"
        "//   History, Navigation and SheetSurface imports are gone; an undo still\n"
        "//   re-syncs it through the model change it announces\n"
        "//   (Na__LeModel__AnnounceRestore). PURPOSE and DESCRIPTION are TrueVision's.\n"
        "// - TrueVision's 1.14.0 (a zoom step updating the readout alone) leaves\n"
        "//   nothing to take: its 1.19.0 removed the readout.\n"
        "// - The Select and Move hover texts stay this app's (PORT NOTE).\n"
        "//\n"
        "// 01-Oct-2026 - Version 1.9.3 (records hygiene, v2.71.1)\n",
        "log entry 1.9.4")

    # ------------------------------------------------------------------
    # CODE | TrueVision's 1.17.0 and 1.19.0 hunks
    # ------------------------------------------------------------------
    # E1 (1.19.0) the imports' heading
    vv = replace_once(vv,
        "    // MODULE IMPORTS | Config, Model, Tools, Navigation, Surface, PDF\n",
        "    // MODULE IMPORTS | Config, Model, Tools, PDF\n", "E1 imports heading")
    # E2 (1.17.0) UpdateMarginNotes and the SheetRecords import
    vv = replace_once(vv,
        "    import { Na__LeModel__CHANGED_EVENT, Na__LeModel__GetActiveSheet, Na__LeModel__GetTabLabel, Na__LeModel__IsDirty, Na__LeModel__Save, Na__LeModel__UpdateMarginNotes } from '../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';\n"
        "    import { Na__LeRec__MarginNotes } from '../07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js';\n",
        "    import { Na__LeModel__CHANGED_EVENT, Na__LeModel__GetActiveSheet, Na__LeModel__GetTabLabel, Na__LeModel__IsDirty, Na__LeModel__Save } from '../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';\n",
        "E2 SheetModel / SheetRecords imports")
    # E3 (1.19.0) the Navigation import
    vv = replace_once(vv,
        "    import { Na__LeNav__Fit, Na__LeNav__ZoomTo } from '../10__Core__SheetSurface/Na__LayoutEditor__Navigation__.js';\n",
        "", "E3 Navigation import")
    # E4 (1.19.0) the History and SheetSurface imports
    vv = replace_once(vv,
        "    import { Na__LeHist__CHANGED_EVENT, Na__LeHist__CanUndo, Na__LeHist__CanRedo, Na__LeHist__Undo, Na__LeHist__Redo } from '../07__Core__SheetData/Na__LayoutEditor__History__.js';\n"
        "    import { Na__LeSurface__ZOOM_EVENT, Na__LeSurface__GetZoom } from '../10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js';\n",
        "", "E4 History / SheetSurface imports")
    # E5 (1.19.0) the Sync heading
    vv = replace_once(vv,
        "    // HELPER FUNCTION | Reflect Tool, Zoom, Sheet Name and Dirty State\n",
        "    // HELPER FUNCTION | Reflect Tool, Sheet Name and Dirty State\n", "E5 Sync heading")
    # E6 (1.19.0) Undo and Redo in Sync
    vv = replace_once(vv,
        "        const undo = Na__LeToolbar__Root.querySelector('[data-na-toolbar=\"undo\"]');\n"
        "        if (undo) undo.disabled = !Na__LeHist__CanUndo();\n"
        "        const redo = Na__LeToolbar__Root.querySelector('[data-na-toolbar=\"redo\"]');\n"
        "        if (redo) redo.disabled = !Na__LeHist__CanRedo();\n",
        "", "E6 Sync undo / redo")
    # E7 (1.19.0) the zoom readout in Sync (this app never took 1.14.0's SyncZoom)
    vv = replace_once(vv,
        "        const zoom = Na__LeToolbar__Root.querySelector('[data-na-toolbar=\"zoom\"]');\n"
        "        if (zoom) zoom.textContent = Math.round(Na__LeSurface__GetZoom() * 100) + '%';\n",
        "", "E7 Sync zoom readout")
    # E8 (1.17.0) the margin sync
    vv = replace_once(vv,
        "        const margin = Na__LeToolbar__Root.querySelector('[data-na-toolbar=\"margin\"]');\n"
        "        if (margin) {\n"
        "            const on = !!sheet && Na__LeRec__MarginNotes(sheet).Enabled === true;\n"
        "            margin.classList.toggle('na-le-toolbar__btn--active', on);\n"
        "            margin.setAttribute('aria-pressed', String(on));\n"
        "            margin.disabled = !sheet;\n"
        "        }\n",
        "", "E8 Sync margin")
    # E9 (1.17.0) the Notes button
    vv = replace_once(vv,
        "            root.appendChild(Na__LeToolbar__Button(Na__LeCfg__GetLabel('MarginToggle', 'Notes'), 'margin', Na__LeCfg__GetLabel('MarginToggleTitle', 'Show the notes margin on this sheet: the specification notes its bubbles link to, with the general notes last. Drag its left edge to resize it.'), () => {\n"
        "                const sheet = Na__LeModel__GetActiveSheet();\n"
        "                if (sheet) Na__LeModel__UpdateMarginNotes(sheet, { enabled : Na__LeRec__MarginNotes(sheet).Enabled !== true });\n"
        "            }));\n",
        "", "E9 Notes button")
    # E10 (1.19.0) Undo, Redo, Fit, 100% and the separators that fenced them - TrueVision's placement
    vv = replace_once(vv,
        "            root.appendChild(scopeHint);\n"
        "\n"
        "            root.appendChild(Na__LeToolbar__Gap());\n"
        "            root.appendChild(Na__LeToolbar__Button(Na__LeCfg__GetLabel('Undo', 'Undo'), 'undo', 'Undo the last change to this sheet (Ctrl+Z)', () => Na__LeHist__Undo()));\n"
        "            root.appendChild(Na__LeToolbar__Button(Na__LeCfg__GetLabel('Redo', 'Redo'), 'redo', 'Redo the change just undone (Ctrl+Y)', () => Na__LeHist__Redo()));\n"
        "            root.appendChild(Na__LeToolbar__Gap());\n"
        "        }\n"
        "\n"
        "        root.appendChild(Na__LeToolbar__Button(Na__LeCfg__GetLabel('ZoomFit', 'Fit'), 'fit', 'Zoom to fit the sheet', () => Na__LeNav__Fit()));\n"
        "        root.appendChild(Na__LeToolbar__Button('100%', 'zoom', 'Zoom to 100 percent (one paper millimetre per screen unit)', () => Na__LeNav__ZoomTo(1)));\n"
        "        root.appendChild(Na__LeToolbar__Gap());\n"
        "\n"
        "        // RASTER",
        "            root.appendChild(scopeHint);\n"
        "            root.appendChild(Na__LeToolbar__Gap());\n"
        "        }\n"
        "\n"
        "        // RASTER",
        "E10 Undo / Redo / Fit / 100% and their separators")
    # E11, E12 (1.19.0) the listeners: no history or zoom event, in Mount and in Unmount
    old_list = ("[ Na__LeTools__CHANGED_EVENT, Na__LeSurface__ZOOM_EVENT, Na__LeModel__CHANGED_EVENT, Na__LeOsnap__CHANGED_EVENT, "
                "Na__LeHist__CHANGED_EVENT, Na__LeRaster__CHANGED_EVENT, Na__LeDrop__CHANGED_EVENT, Na__LeScope__CHANGED_EVENT, "
                "Na__LeSpec__CHANGED_EVENT ]")
    new_list = ("[ Na__LeTools__CHANGED_EVENT, Na__LeModel__CHANGED_EVENT, Na__LeOsnap__CHANGED_EVENT, Na__LeRaster__CHANGED_EVENT, "
                "Na__LeDrop__CHANGED_EVENT, Na__LeScope__CHANGED_EVENT, Na__LeSpec__CHANGED_EVENT ]")
    vv = replace_once(vv, "        " + old_list + ".forEach((name) => window.addEventListener(name, Na__LeToolbar__Listeners));",
                      "        " + new_list + ".forEach((name) => window.addEventListener(name, Na__LeToolbar__Listeners));", "E11 Mount listeners")
    vv = replace_once(vv, "            " + old_list + ".forEach((name) => window.removeEventListener(name, Na__LeToolbar__Listeners));",
                      "            " + new_list + ".forEach((name) => window.removeEventListener(name, Na__LeToolbar__Listeners));", "E12 Unmount listeners")

    # ------------------------------------------------------------------
    # SELF-CHECKS | nothing of the five buttons is left in the code
    # ------------------------------------------------------------------
    code = vv.split("// REGION | Module Imports", 1)[1]
    for gone in ("Na__LeHist__", "Na__LeNav__", "Na__LeSurface__", "Na__LeRec__", "UpdateMarginNotes", "MarginToggle",
                 "'undo'", "'redo'", "'fit'", "'zoom'", "'margin'"):
        if gone in code:
            raise SystemExit("left in the code: " + gone)
    if "MarginToggle" in vv:                                                   # acceptance: a grep of VVM finds nothing, comments included
        raise SystemExit("MarginToggle left in the file")
    write_built("toolbar", join_eol(vv, eol))


if __name__ == "__main__":
    main()
