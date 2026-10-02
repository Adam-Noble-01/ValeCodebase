"""W1-33 - ModeController 1.18.1 -> 1.18.2 (CRLF kept; hunk replay, VV sequence): TrueVision's FirstOpen
import and call at TrueVision's call site (TV :289, :715-737) with the immediate seam (R6 F.8 C22):
immediate : Na__LeLoadScreen__IsShown(); WaitForFirstDrawing answers at once off the sheet view
(WP-S03a-05); PORT NOTE and log (WP-S10-08R header lines).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w133_common import HERE, PRE, sha1, split_eol, join_eol, replace_once, preimage_sha1  # noqa: E402


def build():
    data = open(os.path.join(PRE, "Na__LayoutEditor__ModeController__.js"), "rb").read()
    if sha1(data) != preimage_sha1("mode"):
        raise SystemExit("ModeController pre-image moved")
    text, eol = split_eol(data)
    if eol != "\r\n":
        raise SystemExit("ModeController was CRLF")

    # PORT NOTE: source version, ported on
    text = replace_once(text,
        "// - Source version: 1.32.0 (TrueVision3D v2.166.0, 29-Sep-2026; read at b2aa9151) - the hunks the 1.18.1\n"
        "//                   entry names. Every other difference from that file is a seam listed here or a hunk\n"
        "//                   that arrives with its own feature.\n"
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-32}}\n",
        "// - Source version: 1.32.0 (TrueVision3D v2.166.0, 29-Sep-2026; read at b2aa9151) - the hunks the 1.18.1\n"
        "//                   and 1.18.2 entries name. Every other difference from that file is a seam listed here\n"
        "//                   or a hunk that arrives with its own feature.\n"
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-32}}; 02-Oct-2026 for ValeVision3D\n"
        "//                   {{VVREL:W1-33}} (the first-open veil)\n",
        "port note source")

    # PORT NOTE: divergences
    text = replace_once(text,
        "//   - WaitForFirstDrawing (exported) is the loader screen's wait; TrueVision's first-open veil is\n"
        "//     not called yet.\n",
        "//   - FirstOpen is passed immediate : Na__LeLoadScreen__IsShown(), read from the loader's\n"
        "//     LoadingScreen leaf (R6 F.8 C22): while the loader's boot cover is up, the first-open veil\n"
        "//     takes over from it whole, in the same frame. Enter keeps TrueVision's signature.\n"
        "//   - WaitForFirstDrawing (exported): the wait for the open sheet's pictures that the loader's\n"
        "//     screen used to hold on, answering at once off the sheet view. The loader no longer asks;\n"
        "//     the first-open veil covers the drawing.\n",
        "port note wait")
    text = replace_once(text,
        "//   - Not yet taken, each arriving with its feature: the register and statements pages, the\n"
        "//     first-open veil, the sheet keyboard's restart and Page Up / Page Down, the drawing grid and\n"
        "//     axes, vector tools, sheet images, floor areas, patterns, site plans and design phases, the\n"
        "//     specification lockstep, note regions, the left column's two tabs, the published viewer's\n"
        "//     guards, and SectionForKind's site plan, floor area and picture rules.\n"
        "//   - The import order, and three comments where TrueVision's words would misstate this app (the\n"
        "//     parametric library's elements, the ready chain's count, the markup route's history), stay\n"
        "//     this app's until the convergence pass.\n",
        "//   - Not yet taken, each arriving with its feature: the register and statements pages, the\n"
        "//     sheet keyboard's restart and Page Up / Page Down, the drawing grid and axes, vector tools,\n"
        "//     sheet images, floor areas, patterns, site plans and design phases, the specification\n"
        "//     lockstep, note regions, the left column's two tabs, the published viewer's guards, and\n"
        "//     SectionForKind's site plan, floor area and picture rules.\n"
        "//   - The import order, and four comments where TrueVision's words would misstate this app (the\n"
        "//     parametric library's elements, the ready chain's count, the markup route's history, and the\n"
        "//     first-open call's note on the web viewer's own loading screen, which this app's viewer only\n"
        "//     gains with the published viewer), stay this app's until the convergence pass.\n",
        "port note not yet taken")

    # DEVELOPMENT LOG: 1.18.2, newest first
    text = replace_once(text,
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.18.1 (TrueVision's feature-independent hunks, {{VVREL:W1-32}})\n",
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.18.2 (TrueVision's first-open veil, {{VVREL:W1-33}})\n"
        "// - THE FIRST DRAWING TAB IS COVERED AS IN TRUEVISION. Enter calls\n"
        "//   Na__LeVeil__FirstOpen at TrueVision's call site, with the\n"
        "//   specification and font promises it already holds and the sheet's\n"
        "//   viewport count from the model: once per session, after half a second\n"
        "//   and only if still drawing, never in the web viewer and never under a\n"
        "//   document tab (Quiet). From TrueVision3D v2.83.0 (LoadingVeil 1.1.0).\n"
        "// - THE HAND-OVER FROM THE LOADER (this app only, R6 F.8 C22). The first\n"
        "//   press of a session arrives under the loader's boot cover, so FirstOpen\n"
        "//   is told immediate : Na__LeLoadScreen__IsShown() and puts its veil up\n"
        "//   whole in the same frame; the loader drops its cover once Enter has\n"
        "//   run, with no frame of bare stage between the two.\n"
        "// - WaitForFirstDrawing answers at once off the sheet view: a document page\n"
        "//   lies over a sheet nobody asked to see. The loader no longer waits on it.\n"
        "// - Records: the 20-Sep-2026 veil wiring (ValeVision3D v2.70.0) - ReturnTo3d\n"
        "//   from Leave, Dismiss3d from Enter, and WaitForFirstDrawing for the\n"
        "//   loader's screen - was never logged here; it is recorded with this entry.\n"
        "//\n"
        "// 02-Oct-2026 - Version 1.18.1 (TrueVision's feature-independent hunks, {{VVREL:W1-32}})\n",
        "log")

    # IMPORTS: TrueVision's veil line (FirstOpen) plus this app's two seams
    text = replace_once(text,
        "    import { Na__LeVeil__DrawingSettled, Na__LeVeil__ReturnTo3d, Na__LeVeil__Dismiss3d } from './Na__LayoutEditor__LoadingVeil__.js';\n",
        "    import { Na__LeVeil__FirstOpen, Na__LeVeil__ReturnTo3d, Na__LeVeil__Dismiss3d, Na__LeVeil__DrawingSettled } from './Na__LayoutEditor__LoadingVeil__.js';\n"
        "    import { Na__LeLoadScreen__IsShown } from '../01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js';   // <-- This app only: is the loader's boot cover up? A leaf with no imports (FirstOpen's immediate option)\n",
        "imports")

    # ENTER: the first-open veil at TrueVision's call site
    text = replace_once(text,
        "        const specLoad    = Na__LeSpec__EnsureLoaded();                    // <-- The specification is read when the drawing editor first opens, never before\n"
        "        const metricsLoad = Na__LeMode__PreloadMetrics();\n"
        "        Na__LeModel__SetActiveSheetId(sheet.Sheet__Id);\n",
        "        const specLoad    = Na__LeSpec__EnsureLoaded();                    // <-- The specification is read when the drawing editor first opens, never before\n"
        "        const metricsLoad = Na__LeMode__PreloadMetrics();\n"
        "\n"
        "        // THE FIRST DRAWING TAB OF A SESSION IS THE EXPENSIVE ONE - the\n"
        "        // specification over the network, the PDF fonts, and every viewport\n"
        "        // rendered from the model for the first time. Na__LeFirst__Begin waits\n"
        "        // on exactly those three and puts a spinner up only if they are still\n"
        "        // going after about half a second, so a machine that opens instantly\n"
        "        // still opens instantly. It answers once per session and is a no-op\n"
        "        // afterwards, so this can sit on the ordinary path.\n"
        "        // The viewport count is read from the MODEL, here, before the surface\n"
        "        // has drawn anything. That is what lets the overlay tell \"nought of two\n"
        "        // drawn\" from \"finished\": the sheet's pictures are queued a good half\n"
        "        // second after the tab is pressed, so anything that only watched the\n"
        "        // render queue would call itself done before the first one started.\n"
        "        // THE WEB VIEWER IS LEFT OUT, as in TrueVision, where its published\n"
        "        // drawings have a loading screen of their own on every tab press.\n"
        "        // This app's viewer gains that screen with the published viewer;\n"
        "        // until then its first drawing fills in uncovered once the loader's\n"
        "        // screen has gone.\n"
        "        // AND NOT UNDER A DOCUMENT TAB (Na__LeMode__EnterUnder): the register a\n"
        "        // reader asked for must not sit under a veil for a sheet they did not.\n"
        "        // IMMEDIATE (this app only, PORT NOTE): the first press of a session\n"
        "        // comes in under the loader's boot cover, which looks like this veil\n"
        "        // and covers the same rectangle, so the veil takes over from it whole,\n"
        "        // in the same frame, rather than half a second later.\n"
        "        if (!Na__LeVw__IsViewerMode() && !Na__LeMode__Quiet) void Na__LeVeil__FirstOpen(Na__LeMode__Host, {\n"
        "            specification : specLoad,\n"
        "            textMetrics   : metricsLoad,\n"
        "            viewportCount : (Na__LeModel__GetViewports(sheet) || []).length,\n"
        "            immediate     : Na__LeLoadScreen__IsShown()\n"
        "        });\n"
        "        Na__LeModel__SetActiveSheetId(sheet.Sheet__Id);\n",
        "enter first open")

    # WAIT FOR FIRST DRAWING: off the sheet view, at once
    text = replace_once(text,
        "    // FUNCTION | Wait Until the Sheet Just Opened Has Actually Been Drawn\n"
        "    // ------------------------------------------------------------\n"
        "    // FOR THE LOADER, WHICH CANNOT REACH THE VEIL ITSELF. Na__LayoutEditor__\n"
        "    // Loader__ hides its loading screen in a finally, and importing anything\n"
        "    // from the editor bundle up there would defeat the lazy load, so the wait\n"
        "    // is offered through the editor facade instead.\n"
        "    //\n"
        "    // The expected count is read from the MODEL, not the page: the surface may\n"
        "    // not have drawn a frame yet when this is asked, and nought of two is only\n"
        "    // distinguishable from finished if the two is known in advance.\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__LeMode__WaitForFirstDrawing(onProgress) {\n"
        "        if (!Na__LeMode__Active) return Promise.resolve(true);                   // <-- A Dev action, not a sheet: nothing to wait for\n",
        "    // FUNCTION | Wait Until the Sheet Just Opened Has Actually Been Drawn\n"
        "    // ------------------------------------------------------------\n"
        "    // THE WAIT THE LOADER'S SCREEN USED TO HOLD ON (this app only). That\n"
        "    // screen now hands over to the first-open veil the moment Enter has run,\n"
        "    // and the veil does this waiting, so the loader no longer asks; the wait\n"
        "    // stays offered through the editor facade for a caller that must know\n"
        "    // when the open sheet is on the paper.\n"
        "    //\n"
        "    // NOTHING TO WAIT FOR OFF THE SHEET VIEW. A Dev action opens no sheet,\n"
        "    // and a document page (the specification, later the register or the\n"
        "    // statements) lies over a sheet nobody asked to see, so both answer at\n"
        "    // once - the rule TrueVision's Quiet entry gives its first-open veil.\n"
        "    //\n"
        "    // The expected count is read from the MODEL, not the page: the surface may\n"
        "    // not have drawn a frame yet when this is asked, and nought of two is only\n"
        "    // distinguishable from finished if the two is known in advance.\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__LeMode__WaitForFirstDrawing(onProgress) {\n"
        "        if (!Na__LeMode__Active || Na__LeMode__View !== Na__LeMode__VIEW_SHEET) return Promise.resolve(true);   // <-- A Dev action, or a document page over the sheet: nothing to wait for\n",
        "wait for first drawing")

    return join_eol(text, eol)


if __name__ == "__main__":
    data = build()
    out = os.path.join(HERE, "built")
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, "Na__LayoutEditor__ModeController__.js"), "wb").write(data)
    crlf = data.count(b"\r\n")
    print("built ModeController:", len(data), "bytes, CRLF", crlf, "bare LF", data.count(b"\n") - crlf)
