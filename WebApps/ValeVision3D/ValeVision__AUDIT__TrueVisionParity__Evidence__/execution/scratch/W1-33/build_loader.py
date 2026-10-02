"""W1-33 - Loader 1.1.1 -> 1.1.2 (CRLF kept): the early body class for a press that will open the editor,
taken off on every path that opens nothing; no drawing wait (the screen is dropped straight after the
action, the first-open veil has taken over); Title Case pre-load lines; the two CheckNames rows W1-31 F1
left for the first Loader holder after W1-32; header lines (WP-S10-08R).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w133_common import HERE, PRE, sha1, split_eol, join_eol, replace_once, preimage_sha1  # noqa: E402


def build():
    data = open(os.path.join(PRE, "Na__LayoutEditor__Loader__.js"), "rb").read()
    if sha1(data) != preimage_sha1("loader"):
        raise SystemExit("Loader pre-image moved")
    text, eol = split_eol(data)
    if eol != "\r\n":
        raise SystemExit("Loader was CRLF")

    # DESCRIPTION: the LOADED bullet, and the first open
    text = replace_once(text,
        "// - LOADED the first time something needs the editor itself: a sheet tab, the\n"
        "//   plus tab, a tab rename or drag, or a Dev section action. The full-screen\n"
        "//   loading screen covers the wait while the modules, the editor's\n"
        "//   stylesheets and its configs arrive; then the mode controller is initialised\n"
        "//   with the render context index.html used to hand it directly.\n",
        "// - LOADED the first time something needs the editor itself: a sheet tab, the\n"
        "//   plus tab, a tab rename or drag, or a Dev section action. The loading\n"
        "//   screen covers the wait while the modules, the editor's stylesheets and\n"
        "//   its configs arrive; then the mode controller is initialised with the\n"
        "//   render context index.html used to hand it directly.\n"
        "// - THE FIRST DRAWING OPENS AS TRUEVISION'S DOES. A press that will open the\n"
        "//   editor puts the editor's body class on at the click, before anything is\n"
        "//   fetched, so the 3D furniture goes at once and the header holds and folds\n"
        "//   over the loading screen, which sits where the editor will. When the press\n"
        "//   has run, the editor's own first-open veil is already up over the same\n"
        "//   rectangle, whole, and the screen is dropped behind it: that veil waits on\n"
        "//   the drawing. A load that fails, an editor its config switches off and a\n"
        "//   press that opens nothing take the class off again.\n",
        "description loaded")

    # REGISTRATION PATTERN rule 2: a press that opens the editor says so
    text = replace_once(text,
        "//      from the raw drawings block, or refuses, and fetches nothing; an\n"
        "//      action loads the editor through Na__LeLoad__WithEditor and then calls\n"
        "//      the real function. The editor's modules are reached only through the\n",
        "//      from the raw drawings block, or refuses, and fetches nothing; an\n"
        "//      action loads the editor through Na__LeLoad__WithEditor and then calls\n"
        "//      the real function (an action that opens the editor - a drawing or a\n"
        "//      document tab - passes enters, so its body class goes on at the\n"
        "//      press). The editor's modules are reached only through the\n",
        "pattern rule 2")

    # INTEGRATION: the mirrored names
    text = replace_once(text,
        "// - The names it mirrors are TrueVision's (PORT NOTE): the mode controller's\n"
        "//   view names, OpenRegister, OpenStatements and Ready, the sheet records'\n"
        "//   site plan rule, and the first-open veil's drawing label.\n",
        "// - The names it mirrors are TrueVision's (PORT NOTE): the mode controller's\n"
        "//   view names, OpenRegister, OpenStatements and Ready, and the sheet\n"
        "//   records' site plan rule. The body class it puts on at a press is the\n"
        "//   mode controller's (na-layout-editor--active), which the header's fold,\n"
        "//   the 3D furniture's hiding block and the loading screen all key on.\n",
        "integration")

    # PORT NOTE: Mirrors, Ported on, Divergences
    text = replace_once(text,
        "//                   rule (Na__LeRec__IsSitePlanSheet, 'siteplan', TrueVision3D v2.48.0); the first-open\n"
        "//                   veil's drawing label (VeilDrawingViews, LoadingVeil 1.1.0, TrueVision3D v2.83.0)\n"
        "// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-31}} (the entry points above; the\n"
        "//                   loader itself is this app's)\n",
        "//                   rule (Na__LeRec__IsSitePlanSheet, 'siteplan', TrueVision3D v2.48.0); and the first\n"
        "//                   open of TrueVision3D v2.83.0 (LoadingVeil 1.1.0, the mode controller's Enter): the\n"
        "//                   body class lands at the press and the first-open veil covers the drawing\n"
        "// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-31}} (the entry points above; the\n"
        "//                   loader itself is this app's); 02-Oct-2026 for ValeVision3D {{VVREL:W1-33}} (the\n"
        "//                   first open: the body class at the press, the hand-over to the first-open veil)\n",
        "port note mirrors")
    text = replace_once(text,
        "//   - TrueVision always has its Document Register and Statements views. Here\n"
        "//     Na__LeLoad__HasFeature says whether this build has them, and their entry points refuse,\n"
        "//     loading nothing, until they land.\n",
        "//   - TrueVision always has its Document Register and Statements views. Here\n"
        "//     Na__LeLoad__HasFeature says whether this build has them, and their entry points refuse,\n"
        "//     loading nothing, until they land.\n"
        "//   - The first drawing tab of a session opens under the loading screen while the editor is\n"
        "//     fetched. Its body class goes on at the press (TrueVision's Enter adds it in the click\n"
        "//     task; here Enter runs after the import) and comes off again when the editor does not\n"
        "//     open; the screen hands over to the first-open veil, which the mode controller puts up\n"
        "//     whole while the screen is still up (immediate, R6 F.8 C22).\n",
        "port note divergences")

    # DEVELOPMENT LOG: 1.1.2, newest first
    text = replace_once(text,
        "// DEVELOPMENT LOG:\n"
        "// 01-Oct-2026 - Version 1.1.1 (TrueVision's editor entry points, {{VVREL:W1-31}})\n",
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.1.2 (the first open as TrueVision's, {{VVREL:W1-33}})\n"
        "// - THE BAR FOLDS AT THE CLICK. A press that will open the editor - a\n"
        "//   drawing tab, the Dev section's Open, the Project Specification - puts\n"
        "//   the editor's body class (na-layout-editor--active) on before anything\n"
        "//   is fetched, so the 3D furniture goes at once and the header holds and\n"
        "//   folds over the loading screen as TrueVision's does over its editor.\n"
        "//   The class comes off again when the load fails, when the editor's\n"
        "//   config has it off, and when the press opens nothing (Enter said no:\n"
        "//   Layout Mode switched off meanwhile), so the bar comes back down.\n"
        "// - NO DRAWING WAIT HERE ANY MORE. The screen is dropped as soon as the\n"
        "//   press has run: by then the editor's own first-open veil is up over the\n"
        "//   same rectangle at full opacity, and it waits on the drawing, the\n"
        "//   specification and the fonts as TrueVision's does. AwaitFirstDrawing\n"
        "//   and the screen's drawing-count line are retired; the 20-Sep-2026 change\n"
        "//   that added them (ValeVision3D v2.70.0) was never logged here.\n"
        "// - The screen's two pre-load lines are in Title Case: \"Fetching the\n"
        "//   Drawing Tools\", \"Reading the Drawing Settings\".\n"
        "// - CheckNames checks the register and statement view names, now that the\n"
        "//   mode controller declares them.\n"
        "//\n"
        "// 01-Oct-2026 - Version 1.1.1 (TrueVision's editor entry points, {{VVREL:W1-31}})\n",
        "log")

    # CONSTANTS: the body class
    text = replace_once(text,
        "    const Na__LeLoad__STATE_EVENT      = 'na-layouteditor-loader-changed';    // <-- This module: a project loaded or saved, Layout Mode switched, the editor loaded\n"
        "    // ------------------------------------------------------------\n",
        "    const Na__LeLoad__STATE_EVENT      = 'na-layouteditor-loader-changed';    // <-- This module: a project loaded or saved, Layout Mode switched, the editor loaded\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "    // MODULE CONSTANTS | The Editor's Body Class, Put On at the Press\n"
        "    // ------------------------------------------------------------\n"
        "    // The mode controller's own class (Na__LeMode__BODY_CLASS, which neither\n"
        "    // app exports, so CheckNames has nothing to read it from). The header's\n"
        "    // fold, the 3D furniture's hiding block and the loading screen's place\n"
        "    // all key on it, so a press that will open the editor sets it before the\n"
        "    // import, as TrueVision's Enter does in the click task.\n"
        "    // ------------------------------------------------------------\n"
        "    const Na__LeLoad__BODY_CLASS       = 'na-layout-editor--active';\n"
        "    // ------------------------------------------------------------\n",
        "body class constant")

    # CONSTANTS: Title Case pre-load lines; the drawing line retired
    text = replace_once(text,
        "    const Na__LeLoad__STATUS_FILES     = 'Fetching the drawing tools';\n"
        "    const Na__LeLoad__STATUS_SETTINGS  = 'Reading the drawing settings';\n"
        "    const Na__LeLoad__STATUS_DRAWING   = 'Drawing the Views';                    // <-- A real count is appended: \"Drawing the Views  -  1 of 2\". The fallback of the label below\n"
        "    const Na__LeLoad__LABEL_DRAWING    = 'VeilDrawingViews';                     // <-- The editor's veil label for that line: TrueVision's first-open veil reads the same key\n",
        "    const Na__LeLoad__STATUS_FILES     = 'Fetching the Drawing Tools';           // <-- The screen's two pre-load lines, in Title Case; the drawing's own lines are the first-open veil's\n"
        "    const Na__LeLoad__STATUS_SETTINGS  = 'Reading the Drawing Settings';\n",
        "status constants")

    # CHECKNAMES: the two view rows (W1-31 F1)
    text = replace_once(text,
        "    // One row per copy the editor declares. A copy whose constant the editor\n"
        "    // does not declare yet - the register and statement views until the mode\n"
        "    // controller takes TrueVision's VIEW_REGISTER and VIEW_STATEMENT, the site\n"
        "    // plan type until the sheet model takes DRAWING_SITEPLAN - gets its row in\n"
        "    // the change that declares it: a row reading a name the editor does not\n"
        "    // export fails the export harness, which is what that harness is for.\n",
        "    // One row per copy the editor declares. A copy whose constant the editor\n"
        "    // does not declare yet - the site plan type until the sheet model takes\n"
        "    // DRAWING_SITEPLAN - gets its row in the change that declares it: a row\n"
        "    // reading a name the editor does not export fails the export harness,\n"
        "    // which is what that harness is for.\n",
        "checknames comment")
    text = replace_once(text,
        "            [ Na__LeLoad__VIEW_SPEC,    editor.mode.Na__LeMode__VIEW_SPEC,       'the specification view name'    ]\n"
        "        ].forEach(([copy, real, what]) => {\n",
        "            [ Na__LeLoad__VIEW_SPEC,    editor.mode.Na__LeMode__VIEW_SPEC,       'the specification view name'    ],\n"
        "            [ Na__LeLoad__VIEW_REGISTER,  editor.mode.Na__LeMode__VIEW_REGISTER,  'the register view name'   ],\n"
        "            [ Na__LeLoad__VIEW_STATEMENT, editor.mode.Na__LeMode__VIEW_STATEMENT, 'the statements view name' ]\n"
        "        ].forEach(([copy, real, what]) => {\n",
        "checknames rows")

    # WITH EDITOR: the early class, no drawing wait; AwaitFirstDrawing retired
    text = replace_once(text,
        "    // HELPER FUNCTION | Run an Action on the Editor, Loading It First if Needed\n"
        "    // ------------------------------------------------------------\n"
        "    // Loaded: the action runs at once, with no screen. Not loaded: the loading\n"
        "    // screen shows (unless quiet), the editor loads, the action runs, and the\n"
        "    // screen hides once the result has painted. A long action (a bake) hands\n"
        "    // back its promise and the screen hides as it starts; its progress\n"
        "    // belongs to the Dev section. Resolves to the action's result, or null\n"
        "    // when the editor could not be had.\n"
        "    // ------------------------------------------------------------\n"
        "    // HELPER FUNCTION | Hold the Screen Until the First Sheet Is Drawn\n"
        "    // ------------------------------------------------------------\n"
        "    // Reached through the facade rather than imported, because importing the\n"
        "    // editor's own modules up here would load eagerly the very bundle this\n"
        "    // file exists to defer. An older editor without the call is simply not\n"
        "    // waited for.\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__LeLoad__AwaitFirstDrawing(editor) {\n"
        "        const wait = editor && editor.mode && editor.mode.Na__LeMode__WaitForFirstDrawing;\n"
        "        if (typeof wait !== 'function') return Promise.resolve(true);\n"
        "        const label = Na__LeLoad__GetLabel(Na__LeLoad__LABEL_DRAWING, Na__LeLoad__STATUS_DRAWING);   // <-- The editor has loaded by now, so its own veil wording applies\n"
        "        const onProgress = (drawn, total) => {\n"
        "            Na__LeLoadScreen__SetStatus(total > 1 ? label + '  -  ' + drawn + ' of ' + total : label);\n"
        "        };\n"
        "        try { return Promise.resolve(wait(onProgress)).catch(() => true); }\n"
        "        catch (error) { return Promise.resolve(true); }                          // <-- A wait that throws must never keep the screen up\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "\n"
        "    async function Na__LeLoad__WithEditor(action, quiet) {\n"
        "        if (Na__LeLoad__Editor) return action(Na__LeLoad__Editor);\n"
        "        if (!quiet) Na__LeLoadScreen__Show();\n"
        "\n"
        "        let editor = null;\n"
        "        try {\n"
        "            editor = await Na__LeLoad__Load();\n"
        "        } catch (error) {\n"
        "            console.error('[ValeVision3D] Layout Editor failed to load:', error);\n"
        "            if (!quiet) Na__LeLoadScreen__ShowError(String((error && error.message) || error));\n"
        "            return null;\n"
        "        }\n"
        "\n"
        "        if (!editor) {                                                           // <-- The editor's own config has it off\n"
        "            if (!quiet) Na__LeLoadScreen__Hide(true);\n"
        "            Na__LeLoad__Toast(Na__LeLoad__MSG_SWITCHED_OFF, true);\n"
        "            return null;\n"
        "        }\n"
        "\n"
        "        try {\n"
        "            return action(editor);\n"
        "        } finally {\n"
        "            // THE SCREEN USED TO GO TWO FRAMES AFTER THE SHEET OPENED, which is\n"
        "            // long before the sheet is drawn: the viewports are rendered from\n"
        "            // the model one at a time, and the reader was handed a blank page\n"
        "            // that filled in underneath them. Now it waits for the pictures to\n"
        "            // actually be on the paper, counted against what the model says the\n"
        "            // sheet has, and says how far along it is while it waits. A Dev\n"
        "            // action with no sheet open answers at once, as before.\n"
        "            if (!quiet) {\n"
        "                await Na__LeLoad__AwaitFirstDrawing(editor);\n"
        "                Na__LeLoadScreen__Hide();                                        // <-- Waits for the first paint, then fades\n"
        "            }\n"
        "        }\n"
        "    }\n",
        "    // HELPER FUNCTION | The Editor's Body Class, On at the Press and Off When Nothing Opens\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__LeLoad__SetEditorClass(on) {\n"
        "        document.body.classList.toggle(Na__LeLoad__BODY_CLASS, on === true);\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "\n"
        "    // HELPER FUNCTION | Run an Action on the Editor, Loading It First if Needed\n"
        "    // ------------------------------------------------------------\n"
        "    // Loaded: the action runs at once, with no screen. Not loaded: the loading\n"
        "    // screen shows (unless quiet), the editor loads, the action runs, and the\n"
        "    // screen is dropped as soon as it has run. A long action (a bake) hands\n"
        "    // back its promise and the screen hides as it starts; its progress\n"
        "    // belongs to the Dev section. Resolves to the action's result, or null\n"
        "    // when the editor could not be had.\n"
        "    //\n"
        "    // enters: the action opens the editor (a drawing tab, the specification).\n"
        "    // Its body class goes on at the press, before the import, so the 3D\n"
        "    // furniture goes at once and the header holds and folds over the loading\n"
        "    // screen as TrueVision's does over its editor, whose Enter runs in the\n"
        "    // click task. Every way the editor can fail to open takes it off again,\n"
        "    // and the bar comes back down.\n"
        "    // ------------------------------------------------------------\n"
        "    async function Na__LeLoad__WithEditor(action, quiet, enters) {\n"
        "        if (Na__LeLoad__Editor) return action(Na__LeLoad__Editor);\n"
        "        const early = !quiet && enters === true && Na__LeLoad__IsAvailable();   // <-- Only a press that will open the editor: never a quiet load or a Dev action\n"
        "        if (early) Na__LeLoad__SetEditorClass(true);\n"
        "        if (!quiet) Na__LeLoadScreen__Show();\n"
        "\n"
        "        let editor = null;\n"
        "        try {\n"
        "            editor = await Na__LeLoad__Load();\n"
        "        } catch (error) {\n"
        "            if (early) Na__LeLoad__SetEditorClass(false);                         // <-- Nothing opened: the bar comes back down behind the error state, so Back to 3D Model finds it down\n"
        "            console.error('[ValeVision3D] Layout Editor failed to load:', error);\n"
        "            if (!quiet) Na__LeLoadScreen__ShowError(String((error && error.message) || error));\n"
        "            return null;\n"
        "        }\n"
        "\n"
        "        if (!editor) {                                                           // <-- The editor's own config has it off\n"
        "            if (early) Na__LeLoad__SetEditorClass(false);\n"
        "            if (!quiet) Na__LeLoadScreen__Hide(true);\n"
        "            Na__LeLoad__Toast(Na__LeLoad__MSG_SWITCHED_OFF, true);\n"
        "            return null;\n"
        "        }\n"
        "\n"
        "        try {\n"
        "            return action(editor);\n"
        "        } finally {\n"
        "            // THE HAND-OVER. The screen used to wait here for the sheet's\n"
        "            // pictures; it no longer needs to. Enter has put the editor's own\n"
        "            // first-open veil up over the same rectangle, whole, because it\n"
        "            // asked Na__LeLoadScreen__IsShown while this screen was still up\n"
        "            // (R6 F.8 C22), and that veil waits on the drawing, the\n"
        "            // specification and the fonts. So the screen is dropped once the\n"
        "            // action has run, never before it, and the veil painted above it is\n"
        "            // what the reader sees go.\n"
        "            if (early && !editor.mode.Na__LeMode__IsActive()) Na__LeLoad__SetEditorClass(false);   // <-- The press opened nothing (Enter said no: Layout Mode switched off meanwhile)\n"
        "            if (!quiet) Na__LeLoadScreen__Hide();                                // <-- Two frames, then the veil's fade\n"
        "        }\n"
        "    }\n",
        "with editor")

    # ENTER and OPEN SPECIFICATION open the editor
    text = replace_once(text,
        "        return Na__LeLoad__WithEditor((editor) => editor.mode.Na__LeMode__Enter(sheetId), false).then((entered) => entered === true);\n",
        "        return Na__LeLoad__WithEditor((editor) => editor.mode.Na__LeMode__Enter(sheetId), false, true).then((entered) => entered === true);\n",
        "enter")
    text = replace_once(text,
        "        return Na__LeLoad__WithEditor((editor) => editor.mode.Na__LeMode__OpenSpecification(noteId), false);\n",
        "        return Na__LeLoad__WithEditor((editor) => editor.mode.Na__LeMode__OpenSpecification(noteId), false, true);\n",
        "open specification")

    for gone in ("AwaitFirstDrawing(", "STATUS_DRAWING", "LABEL_DRAWING", "WaitForFirstDrawing"):
        code = "\n".join(line for line in text.split("\n") if not line.lstrip().startswith("//"))
        if gone in code:
            raise SystemExit("retired name still in code: " + gone)
    return join_eol(text, eol)


if __name__ == "__main__":
    data = build()
    out = os.path.join(HERE, "built")
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, "Na__LayoutEditor__Loader__.js"), "wb").write(data)
    crlf = data.count(b"\r\n")
    print("built Loader:", len(data), "bytes, CRLF", crlf, "bare LF", data.count(b"\n") - crlf)
