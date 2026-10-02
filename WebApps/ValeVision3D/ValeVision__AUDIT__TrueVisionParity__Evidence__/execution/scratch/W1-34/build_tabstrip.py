"""W1-34 - TabStrip 2.0.0, TrueVision's file whole (git show at b2aa9151, LF) with this app's seams.

Pipeline (each step replace-once, refusing on a missing or repeated anchor):
  1. header seams on TrueVision's text: banner, INTEGRATION, PORT NOTE (DESCRIPTION and the
     DEVELOPMENT LOG stay TrueVision's verbatim, K2 H4/H6);
  2. the import block: TrueVision's four editor imports become one import from the loader facade;
  3. the body after the import region: TrueVision's editor names renamed to the facade's (a fixed
     one-to-one map, word bounded);
  4. body seams in the renamed text: the drag-to-reorder seam (DR-38), the feature-gated document
     tabs, the async + New sheet, and the loader's state event with the immediate render.
The same table is written to tabstrip_seams.json, so the harness can undo exactly these seams and
compare the result with TrueVision's bytes.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w134_common import HERE, tv_text, replace_once, write_built, sha1  # noqa: E402


HEADER_SEAMS = [
    (
        "// TRUEVISION3D - LAYOUT EDITOR - TAB STRIP\n",
        "// VALEVISION3D - LAYOUT EDITOR - TAB STRIP\n",
    ),
    (
        "// INTEGRATION:\n"
        "// - Initialized from index.html after the mode controller.\n",
        "// INTEGRATION:\n"
        "// - Imported and initialized by Na__LayoutEditor__Loader__ the first time the\n"
        "//   editor is offered for the project; never by index.html.\n",
    ),
    (
        "// PORT NOTE:\n"
        "// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__TabStrip__.js\n"
        "// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n"
        "// - Parity        : diverged (2.0.0 - the compact strip and the drawings menu are TrueVision's; ValeVision still shows a tab per sheet)\n"
        "// - Divergences   : Console prefix, header and folder numbers; site plan drawings (Sheet__DrawingType), TrueVision first on 14-Sep-2026; the compact strip, 23-Sep-2026.\n"
        "// - Back-port     : PENDING to ValeVision3D (offer after Adam's sign-off).\n",
        "// PORT NOTE:\n"
        "// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, after Lantern Designer\n"
        "//                   30__System__DrawingEditorMode's mode tabs); TrueVision3D took it for v2.21.0 (10-Sep-2026);\n"
        "//                   since ported back whole from TrueVision3D 2.0.0 (HEAD b2aa9151)\n"
        "// - Source version: 2.0.0 (TrueVision3D v2.158.0, 23-Sep-2026; read at b2aa9151)\n"
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-34}} - whole, with TrueVision's log. This app's\n"
        "//                   own 1.0.0-1.5.0 (09-Sep-2026 to 19-Sep-2026) kept a tab per sheet, a + tab, and rename\n"
        "//                   and reorder on the tabs; its 1.4.0 and 1.5.0 had taken TrueVision's scroller and arrows\n"
        "//                   (1.5.0) and short tab names (1.6.0).\n"
        "// - Parity        : adapted\n"
        "// - Divergences   :\n"
        "//   - Banner reads ValeVision3D, and INTEGRATION is this app's: the loader starts the strip.\n"
        "//   - Every read and action goes through Na__LayoutEditor__Loader__ (Na__LeLoad__ names in place of\n"
        "//     TrueVision's Na__LeCfg__, Na__LeModel__, Na__LeMode__ and Na__LeSpec__ ones), never a static\n"
        "//     import of the editor, which would put the whole editor back on every start-up (DR-24 (a)). The\n"
        "//     facade answers from the raw drawings block until the editor has loaded, and from the editor after.\n"
        "//   - Shown by Na__LeLoad__IsAvailable where TrueVision reads its config's enable flag: the project's\n"
        "//     Layout Mode switch must be on as well as a sheet existing (DR-25 (a)); the rebuild signature\n"
        "//     carries it too.\n"
        "//   - Drawn as soon as the loader starts it, and redrawn on the loader's state event (a project loaded\n"
        "//     or saved, Layout Mode switched, the editor loaded); TrueVision waits on Na__LeMode__Ready.\n"
        "//   - The Document Register and Design Statements tabs are added only while Na__LeLoad__HasFeature\n"
        "//     says this build has them (DR-38 (a)): until then the strip reads 3D Model | Drawings |\n"
        "//     Specification.\n"
        "//   - + New sheet waits for the sheet Na__LeLoad__CreateSheet promises (the editor may load first)\n"
        "//     before opening it.\n"
        "//   - A drawing row of the menu can be dragged to a new place in an editable session\n"
        "//     (Na__LeTabs__Draggable, Na__LeLoad__ReorderSheet): this build's only way to reorder drawings\n"
        "//     until the Document Register lands, whose port takes the drag away (DR-38, reorder (a)).\n"
        "// - Back-port     : none - every divergence answers this app's lazy loader, its Layout Mode switch or a\n"
        "//                   feature it does not have yet.\n",
    ),
]

IMPORT_START = "    // MODULE IMPORTS | Config, Model and Mode Controller\n"
IMPORT_END = "    import { Na__LeSpec__CHANGED_EVENT, Na__LeSpec__IsDirty } from '../50__Feature__Specification/Na__LayoutEditor__SpecData__.js';\n"

IMPORT_VV = (
    "    // MODULE IMPORTS | Config, Model and Mode Controller\n"
    "    // ------------------------------------------------------------\n"
    "    // THROUGH THE LOADER, AND NOTHING ELSE (this app only). The strip is drawn\n"
    "    // before the editor exists - the loader starts it the first time the\n"
    "    // editor is offered - so the config, sheet model, mode controller and\n"
    "    // specification names TrueVision imports are the loader's facade names\n"
    "    // here, in TrueVision's order: answered from the raw drawings block until\n"
    "    // the editor has loaded, and by the editor after. The last three are this\n"
    "    // app's own (PORT NOTE). A static import of any editor module would put\n"
    "    // the whole editor back on every start-up.\n"
    "    // ------------------------------------------------------------\n"
    "    import {\n"
    "        Na__LeLoad__GetLabel,\n"
    "        Na__LeLoad__FormatLabel,\n"
    "        Na__LeLoad__IsAvailable,\n"
    "        Na__LeLoad__SHEETS_EVENT,\n"
    "        Na__LeLoad__GetSheets,\n"
    "        Na__LeLoad__GetDrawingNumber,\n"
    "        Na__LeLoad__GetTabLabel,\n"
    "        Na__LeLoad__GetActiveSheet,\n"
    "        Na__LeLoad__CreateSheet,\n"
    "        Na__LeLoad__IsSitePlanSheet,\n"
    "        Na__LeLoad__MODE_EVENT,\n"
    "        Na__LeLoad__Enter,\n"
    "        Na__LeLoad__Leave,\n"
    "        Na__LeLoad__IsActive,\n"
    "        Na__LeLoad__IsEditable,\n"
    "        Na__LeLoad__VIEW_SHEET,\n"
    "        Na__LeLoad__VIEW_SPEC,\n"
    "        Na__LeLoad__VIEW_REGISTER,\n"
    "        Na__LeLoad__VIEW_STATEMENT,\n"
    "        Na__LeLoad__OpenRegister,\n"
    "        Na__LeLoad__GetView,\n"
    "        Na__LeLoad__OpenSpecification,\n"
    "        Na__LeLoad__OpenStatements,\n"
    "        Na__LeLoad__SPEC_EVENT,\n"
    "        Na__LeLoad__IsSpecDirty,\n"
    "        Na__LeLoad__STATE_EVENT,\n"
    "        Na__LeLoad__HasFeature,\n"
    "        Na__LeLoad__ReorderSheet\n"
    "    } from '../01__Core__Loader/Na__LayoutEditor__Loader__.js';\n"
)

# TrueVision's editor names -> the loader facade's (one to one)
RENAME = [
    ("Na__LeCfg__GetLabel", "Na__LeLoad__GetLabel"),
    ("Na__LeCfg__FormatLabel", "Na__LeLoad__FormatLabel"),
    ("Na__LeCfg__IsEnabled", "Na__LeLoad__IsAvailable"),
    ("Na__LeModel__CHANGED_EVENT", "Na__LeLoad__SHEETS_EVENT"),
    ("Na__LeModel__GetSheets", "Na__LeLoad__GetSheets"),
    ("Na__LeModel__GetDrawingNumber", "Na__LeLoad__GetDrawingNumber"),
    ("Na__LeModel__GetTabLabel", "Na__LeLoad__GetTabLabel"),
    ("Na__LeModel__GetActiveSheet", "Na__LeLoad__GetActiveSheet"),
    ("Na__LeModel__CreateSheet", "Na__LeLoad__CreateSheet"),
    ("Na__LeModel__IsSitePlanSheet", "Na__LeLoad__IsSitePlanSheet"),
    ("Na__LeMode__CHANGED_EVENT", "Na__LeLoad__MODE_EVENT"),
    ("Na__LeMode__Enter", "Na__LeLoad__Enter"),
    ("Na__LeMode__Leave", "Na__LeLoad__Leave"),
    ("Na__LeMode__IsActive", "Na__LeLoad__IsActive"),
    ("Na__LeMode__IsEditable", "Na__LeLoad__IsEditable"),
    ("Na__LeMode__VIEW_SHEET", "Na__LeLoad__VIEW_SHEET"),
    ("Na__LeMode__VIEW_SPEC", "Na__LeLoad__VIEW_SPEC"),
    ("Na__LeMode__VIEW_REGISTER", "Na__LeLoad__VIEW_REGISTER"),
    ("Na__LeMode__VIEW_STATEMENT", "Na__LeLoad__VIEW_STATEMENT"),
    ("Na__LeMode__OpenRegister", "Na__LeLoad__OpenRegister"),
    ("Na__LeMode__GetView", "Na__LeLoad__GetView"),
    ("Na__LeMode__OpenSpecification", "Na__LeLoad__OpenSpecification"),
    ("Na__LeMode__OpenStatements", "Na__LeLoad__OpenStatements"),
    ("Na__LeSpec__CHANGED_EVENT", "Na__LeLoad__SPEC_EVENT"),
    ("Na__LeSpec__IsDirty", "Na__LeLoad__IsSpecDirty"),
]

DRAGGABLE = (
    "    // HELPER FUNCTION | Drag a Drawing Row to a New Place (this app only)\n"
    "    // ------------------------------------------------------------\n"
    "    // UNTIL THE DOCUMENT REGISTER LANDS. TrueVision reorders drawings from\n"
    "    // its register; this build has none yet, and the tabs that used to be\n"
    "    // dragged are rows of this menu now, so a row carries the drag in an\n"
    "    // editable session (DR-38, reorder (a)). A drop puts the dragged drawing\n"
    "    // where the row it lands on stands; the rebuild that follows refreshes\n"
    "    // the open menu's rows in place. The register's port takes this away.\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__LeTabs__Draggable(row, sheet) {\n"
    "        row.draggable = true;\n"
    "        row.addEventListener('dragstart', (e) => { Na__LeTabs__DragId = sheet.Sheet__Id; e.dataTransfer.effectAllowed = 'move'; });\n"
    "        row.addEventListener('dragover', (e) => { if (Na__LeTabs__DragId && Na__LeTabs__DragId !== sheet.Sheet__Id) e.preventDefault(); });\n"
    "        row.addEventListener('drop', (e) => {\n"
    "            e.preventDefault();\n"
    "            if (!Na__LeTabs__DragId || Na__LeTabs__DragId === sheet.Sheet__Id) return;\n"
    "            const dragged = Na__LeTabs__DragId;\n"
    "            Na__LeTabs__DragId = null;\n"
    "            void Na__LeLoad__ReorderSheet(dragged, Na__LeLoad__GetSheets().findIndex((s) => s.Sheet__Id === sheet.Sheet__Id));\n"
    "        });\n"
    "        row.addEventListener('dragend', () => { Na__LeTabs__DragId = null; });\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "\n"
)

BODY_SEAMS = [
    (
        "    let Na__LeTabs__Visible    = null;   // <-- Last published state; the resize only fires on a change\n",
        "    let Na__LeTabs__Visible    = null;   // <-- Last published state; the resize only fires on a change\n"
        "    let Na__LeTabs__DragId     = null;   // <-- This app only: the drawing row being dragged to a new place (PORT NOTE)\n",
    ),
    (
        "        Na__LeTabs__Scroller.appendChild(register);\n",
        "        if (Na__LeLoad__HasFeature(Na__LeLoad__VIEW_REGISTER)) Na__LeTabs__Scroller.appendChild(register);     // <-- This app only: once this build has the Document Register (DR-38)\n",
    ),
    (
        "        Na__LeTabs__Scroller.appendChild(statements);\n",
        "        if (Na__LeLoad__HasFeature(Na__LeLoad__VIEW_STATEMENT)) Na__LeTabs__Scroller.appendChild(statements);   // <-- This app only: once this build has the Statement Writer (DR-38, DR-10)\n",
    ),
    (
        "    // HELPER FUNCTION | Fill the Menu: Every Drawing, Then New Sheet\n",
        DRAGGABLE + "    // HELPER FUNCTION | Fill the Menu: Every Drawing, Then New Sheet\n",
    ),
    (
        "            if (hover.length) row.title = hover.join('. ');                      // <-- The whole drawing number, and what kind of drawing it is\n"
        "            menu.appendChild(row);\n",
        "            if (hover.length) row.title = hover.join('. ');                      // <-- The whole drawing number, and what kind of drawing it is\n"
        "            if (Na__LeLoad__IsEditable()) Na__LeTabs__Draggable(row, sheet);     // <-- This app only: drag to reorder, until the Document Register (PORT NOTE)\n"
        "            menu.appendChild(row);\n",
    ),
    (
        "Na__LeLoad__GetLabel('AddSheetTitle', 'New sheet'), false, () => {\n"
        "                const sheet = Na__LeLoad__CreateSheet({});\n",
        "Na__LeLoad__GetLabel('AddSheetTitle', 'New sheet'), false, async () => {\n"
        "                const sheet = await Na__LeLoad__CreateSheet({});                  // <-- This app only: a promise, as the editor may load first\n",
    ),
    (
        "        Na__LeMode__Ready().then(() => Na__LeTabs__Render());\n",
        "        window.addEventListener(Na__LeLoad__STATE_EVENT, Na__LeTabs__OnModelChanged);   // <-- This app only: a project loaded or saved, Layout Mode switched, the editor loaded\n"
        "        Na__LeTabs__Render();                                                    // <-- This app only: started because the editor is offered, so drawn now (TrueVision waits on Na__LeMode__Ready)\n",
    ),
]

BODY_MARK = "// REGION | Rendering\n"     # renames apply from here on (the import region is already the facade's)


def rename(text):
    for old, new in RENAME:
        text = re.sub(r"(?<![A-Za-z0-9_])" + re.escape(old) + r"(?![A-Za-z0-9_])", new, text)
    return text


def strip_js_comments(text):
    text = re.sub(r"/\*[\s\S]*?\*/", " ", text)
    return re.sub(r"(^|[^:'\"\\])//[^\n]*", r"\1", text)


def build():
    tv = tv_text("tabs")
    text = tv
    for old, new in HEADER_SEAMS:
        text = replace_once(text, old, new, "header: " + old[:40])

    start = text.index(IMPORT_START)
    end = text.index(IMPORT_END) + len(IMPORT_END)
    if text.count(IMPORT_START) != 1 or text.count(IMPORT_END) != 1:
        raise SystemExit("import block anchors are not unique")
    import_tv = text[start:end]
    text = text[:start] + IMPORT_VV + text[end:]

    mark = text.index(BODY_MARK)
    head, body = text[:mark], text[mark:]
    text = head + rename(body)
    for old, new in BODY_SEAMS:
        text = replace_once(text, old, new, "body: " + old[:50])

    # Nothing of the editor is left in the code: every editor name is the facade's
    leftover = re.findall(r"Na__Le(?:Cfg|Model|Mode|Spec)__\w+", strip_js_comments(text.split("// REGION | Module Imports", 1)[1]))
    if leftover:
        raise SystemExit("editor names left in the code: " + ", ".join(sorted(set(leftover))))
    if "\r" in text:
        raise SystemExit("CR in the built text")

    data = text.encode("utf-8")
    write_built("tabs", data)

    table = {
        "tv_sha1": sha1(tv.encode("utf-8")),
        "built_sha1": sha1(data),
        "header_seams": [{"tv": a, "vv": b} for a, b in HEADER_SEAMS],
        "import_seam": {"tv": import_tv, "vv": IMPORT_VV},
        "rename": [{"tv": a, "vv": b} for a, b in RENAME],
        "body_seams": [{"tv": a, "vv": b} for a, b in BODY_SEAMS],
        "body_mark": BODY_MARK,
    }
    with open(os.path.join(HERE, "tabstrip_seams.json"), "w", encoding="utf-8") as handle:
        json.dump(table, handle, indent=1, ensure_ascii=False)
    print("seam table written: header", len(HEADER_SEAMS), "import 1 rename", len(RENAME), "body", len(BODY_SEAMS))


if __name__ == "__main__":
    build()
