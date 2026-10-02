"""W1-33 - LoadingVeil: TrueVision 1.1.0 taken whole (LF, as git show returns it), then the listed seams.

Seams (and nothing else): banner token, PORT NOTE, console prefix, the immediate option of FirstOpen
(R6 F.8 C22), the Na__LeVeil__DrawingSettled export (this app only).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w133_common import HERE, tv_text, replace_once  # noqa: E402


def build():
    text = tv_text("Na__LayoutEditor__LoadingVeil__.js")

    # 1. BANNER (K2 H1)
    text = replace_once(text,
        "// TRUEVISION3D - LAYOUT EDITOR - LOADING VEILS\n",
        "// VALEVISION3D - LAYOUT EDITOR - LOADING VEILS\n",
        "banner")

    # 2. PORT NOTE (K2 H5) - TrueVision's own block is not copied
    text = replace_once(text,
        "// PORT NOTE:\n"
        "// - Ported from   : n/a - authored in TrueVision3D\n"
        "// - Back-port     : PENDING to ValeVision3D.\n",
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js\n"
        "// - Source version: 1.1.0 (TrueVision3D v2.83.0, 20-Sep-2026; read at b2aa9151)\n"
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-33}} - whole, with both veils. This app's\n"
        "//                   own 1.0.0 (20-Sep-2026, ValeVision3D v2.70.0) took only the coming-out veil and the\n"
        "//                   drawing wait, and left the way in to the loader's full-screen loading screen.\n"
        "// - Parity        : adapted\n"
        "// - Divergences   :\n"
        "//   - Banner and console prefix read ValeVision3D.\n"
        "//   - Na__LeVeil__DrawingSettled is exported, for the mode controller's WaitForFirstDrawing (an\n"
        "//     export of this app's own).\n"
        "//   - FirstOpen takes an immediate option (R6 F.8 C22). This app loads its editor on first use,\n"
        "//     so the first drawing tab of a session is pressed under the loader's boot cover\n"
        "//     (Na__LeLoadScreen: this veil's look, fixed over the same rectangle). With immediate true\n"
        "//     the veil goes up whole before FirstOpen returns - both classes in one frame, so the fade\n"
        "//     in is skipped - instead of after SHOW_AFTER_MS, and the loader drops its cover behind it.\n"
        "//     The mode controller passes immediate : Na__LeLoadScreen__IsShown(). The warm path, the Dev\n"
        "//     actions and the document tabs never see the boot cover, so they keep the 550ms rule or no\n"
        "//     veil; the fade out is TrueVision's.\n"
        "// - Back-port     : none - both divergences answer this app's lazy loader (DR-24 (a)).\n",
        "port note")

    # 3. THE IMMEDIATE OPTION (R6 F.8 C22): no 550ms timer, the veil up whole before FirstOpen returns
    text = replace_once(text,
        "        let finished = false;\n"
        "        const showTimer = setTimeout(() => { if (!finished) { Na__LeVeil__Show(veil); Na__LeVeil__Advance(veil); } }, Na__LeVeil__SHOW_AFTER_MS);\n"
        "        const capTimer  = setTimeout(() => { if (!finished) { finished = true; Na__LeVeil__Hide(veil); } }, Na__LeVeil__CAP_IN_MS);\n",
        "        let finished = false;\n"
        "        const showTimer = options.immediate === true ? 0 : setTimeout(() => { if (!finished) { Na__LeVeil__Show(veil); Na__LeVeil__Advance(veil); } }, Na__LeVeil__SHOW_AFTER_MS);\n"
        "        const capTimer  = setTimeout(() => { if (!finished) { finished = true; Na__LeVeil__Hide(veil); } }, Na__LeVeil__CAP_IN_MS);\n"
        "\n"
        "        // THE LOADER'S COVER IS ALREADY UP (this app only; PORT NOTE). The\n"
        "        // first drawing tab of a session was pressed while the editor was\n"
        "        // still being fetched, under Na__LeLoadScreen's boot cover - this\n"
        "        // veil's look, over the same rectangle - which the loader drops as\n"
        "        // soon as Enter has run. Waiting SHOW_AFTER_MS would leave bare stage\n"
        "        // between the two, so the veil goes up now and whole: both classes\n"
        "        // together, with no layout read between them, so display and opacity\n"
        "        // change in the same frame and the fade in is skipped.\n"
        "        if (options.immediate === true) {\n"
        "            veil.root.classList.add(Na__LeVeil__VISIBLE, Na__LeVeil__SHOWN);\n"
        "            veil.shownAt = Date.now();\n"
        "            Na__LeVeil__Advance(veil);\n"
        "        }\n",
        "immediate")

    # 4. CONSOLE PREFIX (K2 C1)
    text = replace_once(text,
        "console.warn('[TrueVision3D LayoutEditor] Could not return to the first scene:', error);",
        "console.warn('[ValeVision3D LayoutEditor] Could not return to the first scene:', error);",
        "console prefix")

    # 5. THE EXPORT THIS APP ADDS (K2 X2)
    text = replace_once(text,
        "    export {\n"
        "        Na__LeVeil__FirstOpen,\n"
        "        Na__LeVeil__ReturnTo3d,\n"
        "        Na__LeVeil__Dismiss3d\n"
        "    };\n",
        "    export {\n"
        "        Na__LeVeil__FirstOpen,\n"
        "        Na__LeVeil__ReturnTo3d,\n"
        "        Na__LeVeil__Dismiss3d,\n"
        "        Na__LeVeil__DrawingSettled                                               // <-- This app only: the mode controller's WaitForFirstDrawing waits on it (PORT NOTE)\n"
        "    };\n",
        "exports")

    for leak in ("TRUEVISION3D", "[TrueVision3D", "TrueVision__", "window.TrueVision"):
        if leak in text:
            raise SystemExit("identity leak left: " + leak)
    return text.encode("utf-8")


if __name__ == "__main__":
    data = build()
    out = os.path.join(HERE, "built")
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, "Na__LayoutEditor__LoadingVeil__.js"), "wb").write(data)
    print("built LoadingVeil:", len(data), "bytes,", data.count(b"\n"), "lines, CR", data.count(b"\r"))
