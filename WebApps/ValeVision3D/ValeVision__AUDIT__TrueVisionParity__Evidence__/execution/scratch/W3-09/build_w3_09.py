# W3-09 build: Sheet Images switched on.
# Usage: python build_w3_09.py dry|apply
# Bytes in, bytes out; each file keeps its own line endings. Aborts (writes nothing) on an
# unexpected starting hash or a replacement anchor that is not found exactly once.
import hashlib, os, shutil, sys

MODE = sys.argv[1] if len(sys.argv) > 1 else 'dry'
VV   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
LE   = os.path.join(VV, '02__Src__AppModules', '51__System__LayoutEditor')
HERE = os.path.dirname(os.path.abspath(__file__))

MC     = os.path.join(LE, '05__Core__ModeController', 'Na__LayoutEditor__ModeController__.js')
LOADER = os.path.join(LE, '01__Core__Loader', 'Na__LayoutEditor__Loader__.js')
CFG    = os.path.join(LE, '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json')
INSERT = os.path.join(LE, '54__Feature__SheetImages', 'Na__LayoutEditor__SheetImages__Insert__.js')
CSS    = os.path.join(LE, '54__Feature__SheetImages', 'Na__LayoutEditor__Styles__SheetImages__.css')
CSS_HELD = os.path.join(HERE, '..', 'W3-18', 'held', '02__Src__AppModules', '51__System__LayoutEditor',
                        '54__Feature__SheetImages', 'Na__LayoutEditor__Styles__SheetImages__.css')

EXPECT = {
    MC     : 'eb4d48b797ca8e2f6cb55cdd4c8ccc8633c48306',
    LOADER : '37bb1028b4822c5ee19f3e3ffa2db918b37003e0',
    CFG    : 'f538cef1c39262054ee808fe81c13338245ad60d',
    INSERT : '23fc62e5e0859013e87a705ba898470bd7d839bc',
}
CSS_SHA256 = '43fa6b0a82e5f6d5ef2b961aca1a72d742ce2d68ed8ca5540ae20b81bf55c233'


def sha1(b): return hashlib.sha1(b).hexdigest()


def load(path):
    raw = open(path, 'rb').read()
    if sha1(raw) != EXPECT[path]:
        sys.exit('ABORT: ' + path + ' changed under me (sha1 ' + sha1(raw) + ')')
    crlf = raw.count(b'\r\n')
    lf   = raw.count(b'\n')
    if crlf not in (0, lf):
        sys.exit('ABORT: mixed line endings in ' + path)
    eol  = '\r\n' if crlf else '\n'
    return raw, raw.decode('utf-8').replace('\r\n', '\n'), eol


def sub(text, old, new, label):
    n = text.count(old)
    if n != 1:
        sys.exit('ABORT: anchor "' + label + '" found ' + str(n) + ' times')
    return text.replace(old, new)


results = {}

# -----------------------------------------------------------------------------
# MODE CONTROLLER
# -----------------------------------------------------------------------------
raw, t, eol = load(MC)

t = sub(t, '1.18.10 and 1.18.11 entries name.', '1.18.10, 1.18.11 and 1.18.12 entries name.', 'source-version list')
t = sub(t,
    '//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-07}} (the vector tools)\n',
    '//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-07}} (the vector tools);\n'
    '//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-09}} (sheet images)\n',
    'ported-on')
t = sub(t,
    '//   - Not yet taken, each arriving with its feature: the register and statements pages,\n'
    '//     sheet images, floor areas, note regions, the published viewer\'s guards,\n'
    '//     and SectionForKind\'s floor area and picture rules.\n',
    '//   - Not yet taken, each arriving with its feature: the register and statements pages,\n'
    '//     floor areas, note regions, the published viewer\'s guards,\n'
    '//     and SectionForKind\'s floor area rule (its picture rule is TrueVision\'s, without\n'
    '//     the floor area half and that half\'s paragraph of the comment over it).\n',
    'not-yet-taken divergence')

LOG = (
    '// DEVELOPMENT LOG:\n'
    '// 02-Oct-2026 - Version 1.18.12 (sheet images, {{VVREL:W3-09}})\n'
    '// - SHEET IMAGES ARE SWITCHED ON (54__Feature__SheetImages): pictures placed\n'
    '//   on a sheet. Na__LeImg__Ready joins the ready Promise.all straight after\n'
    '//   the documents\' keyboard, TrueVision\'s place, and Na__LeImg__Initialize\n'
    '//   runs after the viewport names: the picture source for everyone, and in\n'
    '//   the editor the save step that files pictures under their drawing\'s\n'
    '//   document id in the project folder, the corner grips and the file drop.\n'
    '//   AttachSheetInput / DetachSheetInput take the drop with the rest of the\n'
    '//   sheet\'s input (leaving a sheet keeps a crop in progress). The Images\n'
    '//   panel registers straight after Vector Tools, SectionForKind opens it\n'
    '//   for a selection of pictures, and a shape change refreshes it; "images"\n'
    '//   joins LayoutEditor__Panels__AccordionSections after "shapes", and the\n'
    '//   feature\'s stylesheet joins the loader\'s list before WebViewer. From\n'
    '//   TrueVision3D 1.26.0 (v2.116.0): TrueVision\'s import lines, calls and\n'
    '//   comments at this app\'s sites, without the floor area halves of the\n'
    '//   shape rule. No sign-off by Adam is recorded in TrueVision for v2.116.0,\n'
    '//   v2.121.0 or v2.142.0. The drop\'s automatic Move (DR-40 item 7) stays\n'
    '//   held: Insert asks HitResolution\'s guard before it picks Move up.\n'
    '//\n'
    '// 02-Oct-2026 - Version 1.18.11 (the vector tools, {{VVREL:W3-07}})\n'
)
t = sub(t, '// DEVELOPMENT LOG:\n// 02-Oct-2026 - Version 1.18.11 (the vector tools, {{VVREL:W3-07}})\n', LOG, 'devlog head')

# Imports: the core before the hatches (TrueVision's place), GetShapeById after GetSelectionItems, the panel after Vector Tools.
t = sub(t,
    "    import { Na__LeHatch__Ready } from '../36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js';\n",
    "    import { Na__LeImg__Ready, Na__LeImg__Initialize, Na__LeImg__Is, Na__LeImg__AttachInput, Na__LeImg__DetachInput } from '../54__Feature__SheetImages/Na__LayoutEditor__SheetImages__.js';\n"
    "    import { Na__LeHatch__Ready } from '../36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js';\n",
    'core import')
t = sub(t,
    '        Na__LeModel__GetSelectionItems,\n        Na__LeModel__GetViewportById,\n',
    '        Na__LeModel__GetSelectionItems,\n        Na__LeModel__GetShapeById,\n        Na__LeModel__GetViewportById,\n',
    'model import')
t = sub(t,
    "    import { Na__LeVec__Initialize } from '../37__System__VectorTools/Na__LayoutEditor__VectorTools__.js';\n",
    "    import { Na__LeVec__Initialize } from '../37__System__VectorTools/Na__LayoutEditor__VectorTools__.js';\n"
    "    import { Na__LePanelImages__Register } from '../54__Feature__SheetImages/Na__LayoutEditor__Panel__SheetImages__.js';\n",
    'panel import')

# The Images panel, straight after Vector Tools.
VEC_LINE = ('        Na__LePanelVec__Register();                                            // <-- Vector Tools: straight under Vectors, '
            'where Adam drew it - Line, Rectangle, Circle, Arc, Trim, Extend, Join, Split, Offset, Fillet, Chamfer and the settings of whichever is up\n')
t = sub(t, VEC_LINE,
    VEC_LINE +
    '        Na__LePanelImages__Register();                                         // <-- Images: the selected picture\'s file, folder, print resolution, width and frame\n',
    'panel register')

# The drop, with the sheet's input.
t = sub(t,
    '        Na__LeMarginGrip__Attach({ editable : Na__LeMode__IsEditable() });\n    }\n',
    '        Na__LeMarginGrip__Attach({ editable : Na__LeMode__IsEditable() });\n'
    '        Na__LeImg__AttachInput();                                              // <-- Picture files dropped on the stage land on the sheet\n'
    '    }\n',
    'attach input')
t = sub(t,
    '        if (Na__LeVw__IsViewerMode()) return;\n        Na__LeMarginGrip__Detach();\n',
    '        if (Na__LeVw__IsViewerMode()) return;\n'
    '        Na__LeImg__DetachInput();                                              // <-- A crop in progress is kept, and drops stop\n'
    '        Na__LeMarginGrip__Detach();\n',
    'detach input')

# SectionForKind's picture rule, and its helper after OneSitePlan.
t = sub(t,
    "        if (kind === 'shape')      return 'shapes';\n",
    "        // A PICTURE IS A VECTOR TOO, and its panel is Images: its file, the\n"
    "        // folder its drawing's number files it in, and its print resolution\n"
    "        // are what is wanted the moment one is selected.\n"
    "        if (kind === 'shape')      return Na__LeMode__AllImages(items) ? 'images' : 'shapes';\n",
    'section for kind')
t = sub(t,
    '        return !!viewport && Na__LeModel__IsSitePlanViewport(viewport);\n    }\n',
    '        return !!viewport && Na__LeModel__IsSitePlanViewport(viewport);\n    }\n'
    '    function Na__LeMode__AllImages(items) {\n'
    '        const sheet  = Na__LeModel__GetActiveSheet();\n'
    "        const shapes = (Array.isArray(items) ? items : []).filter((item) => item && item.kind === 'shape');\n"
    '        if (!sheet || !shapes.length) return false;\n'
    '        return shapes.every((item) => Na__LeImg__Is(Na__LeModel__GetShapeById(sheet, item.id)));\n'
    '    }\n',
    'all images')

# A shape change refreshes the Images panel.
MARGIN_LINE = ("        if (reason === 'leader' || reason === 'leaders') Na__LePanels__Refresh('margin');   "
               "// <-- A link made or lost changes what the notes margin lists\n")
t = sub(t, MARGIN_LINE,
    MARGIN_LINE +
    "        if (reason === 'shape' || reason === 'shapes') Na__LePanels__Refresh('images');     // <-- A picture is a shape: its width, frame and resolution follow it\n",
    'images refresh')

# The ready chain and the start-up pass.
t = sub(t,
    'Na__LeSpComp__Ready(), Na__LeDocKeys__Ready(), Na__DrawCfg__Load() ]).then(() => {   // <-- None of the nine rejects, so a missing file cannot hold the editor back\n',
    'Na__LeSpComp__Ready(), Na__LeDocKeys__Ready(), Na__LeImg__Ready(), Na__DrawCfg__Load() ]).then(() => {   // <-- None of the ten rejects, so a missing file cannot hold the editor back\n',
    'ready chain')
VIEWID_LINE = ('            Na__LeViewId__Initialize();                                      '
               "// <-- Unnamed elevation viewports are named from their model and the project's north\n")
t = sub(t, VIEWID_LINE,
    VIEWID_LINE +
    "            Na__LeImg__Initialize({ editable : Na__LeMode__IsEditable(), showToast : context.showToast || null });   // <-- Pictures: the source for everyone; the save step, grips and drop for the editor\n",
    'initialize')

results[MC] = (raw, t, eol)

# -----------------------------------------------------------------------------
# LOADER
# -----------------------------------------------------------------------------
raw, t, eol = load(LOADER)
READ_LINE = "        new URL('../50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Read__.css', import.meta.url).href,\n"
t = sub(t, READ_LINE,
    READ_LINE +
    "        new URL('../54__Feature__SheetImages/Na__LayoutEditor__Styles__SheetImages__.css', import.meta.url).href,   // <-- Sheet Images: the drop look, a picture's corner grips, the crop overlay and the Images panel\n",
    'stylesheet line')
t = sub(t,
    '// DEVELOPMENT LOG:\n// 02-Oct-2026 - Version 1.1.7 (v2.71.4)\n',
    '// DEVELOPMENT LOG:\n'
    '// 02-Oct-2026 - Version 1.1.8 ({{VVREL:W3-09}})\n'
    '// - SHEET IMAGES\' STYLESHEET LOADS WITH THE EDITOR.\n'
    '//   54__Feature__SheetImages/Na__LayoutEditor__Styles__SheetImages__.css (the\n'
    '//   drop look, a picture\'s corner grips, the crop overlay and the Images\n'
    '//   panel) joins Na__LeLoad__STYLESHEETS straight after\n'
    '//   Styles__Specification__Read and before WebViewer, its place in\n'
    '//   TrueVision\'s CSS index (rule 5 above). It lands in the same change that\n'
    '//   switches Sheet Images on in the mode controller.\n'
    '//\n'
    '// 02-Oct-2026 - Version 1.1.7 (v2.71.4)\n',
    'loader devlog')
results[LOADER] = (raw, t, eol)

# -----------------------------------------------------------------------------
# APP CONFIG
# -----------------------------------------------------------------------------
raw, t, eol = load(CFG)
t = sub(t,
    '"LayoutEditor__Panels__AccordionSections": [ "text", "dimensions", "shapes", "leaders", "patterns" ],',
    '"LayoutEditor__Panels__AccordionSections": [ "text", "dimensions", "shapes", "images", "leaders", "patterns" ],',
    'accordion')
results[CFG] = (raw, t, eol)

# -----------------------------------------------------------------------------
# INSERT: the DR-40 item 7 guard (W3-02 / W3-03 follow-up)
# -----------------------------------------------------------------------------
raw, t, eol = load(INSERT)
t = sub(t,
    '//                   ValeVision until Adam confirms it); nothing reaches it until W3-09 switches Sheet Images\n'
    '//                   on, and its guard is a recorded follow-up for W3-03 / W3-09)\n'
    '// - Divergences   :\n'
    '//   - Banner and console prefixes read ValeVision3D.\n',
    '//                   ValeVision until Adam confirms it); nothing reached it until W3-09 switched Sheet Images\n'
    '//                   on, and W3-09 put its guard in (Divergences)\n'
    '//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-09}}: switched on (the mode controller\'s wiring), with\n'
    '//                   the DR-40 item 7 guard below\n'
    '// - Divergences   :\n'
    '//   - Banner and console prefixes read ValeVision3D.\n'
    '//   - VV GUARD (DR-40 item 7, held): the drop\'s Na__LeTools__PickUpMove - TrueVision\'s automatic\n'
    '//     Move (v2.78.0) - runs only while HitResolution\'s Na__LeTools__VV_HOLD_AUTO_MOVE is false, so a\n'
    '//     picture dropped or picked is selected under Select and M moves it, as every other item in\n'
    '//     ValeVision. Two lines are marked VV GUARD (the import and the condition); W3-04 deletes both\n'
    '//     when Adam confirms item 7, and the call is TrueVision\'s line again.\n',
    'insert port note')
t = sub(t,
    '// - Parity        : verbatim (the code is TrueVision 1.2.0\'s; the banner, the three console prefixes\n'
    '//                   and this note are the only differences.',
    '// - Parity        : adapted (one guard; the code is otherwise TrueVision 1.2.0\'s: the banner, the three\n'
    '//                   console prefixes, this note and the guard are the only differences.',
    'insert parity')
t = sub(t,
    "    import { Na__LeTools__SetTool, Na__LeTools__PickUpMove } from '../30__System__SheetTools/Na__LayoutEditor__SheetTools__ToolState__.js';\n",
    "    import { Na__LeTools__SetTool, Na__LeTools__PickUpMove } from '../30__System__SheetTools/Na__LayoutEditor__SheetTools__ToolState__.js';\n"
    "    import { Na__LeTools__VV_HOLD_AUTO_MOVE } from '../30__System__SheetTools/Na__LayoutEditor__SheetTools__HitResolution__.js';   // <-- VV GUARD (DR-40 item 7, held): the automatic Move's switch\n",
    'insert guard import')
t = sub(t,
    '            Na__LeTools__PickUpMove();                                           // <-- As a vector or a note does: the next drag puts it where it belongs\n',
    '            if (!Na__LeTools__VV_HOLD_AUTO_MOVE)                                 // <-- VV GUARD (DR-40 item 7, held): selected under Select; M moves it\n'
    '            Na__LeTools__PickUpMove();                                           // <-- As a vector or a note does: the next drag puts it where it belongs\n',
    'insert guard call')
results[INSERT] = (raw, t, eol)

# -----------------------------------------------------------------------------
# THE HELD STYLESHEET (W3-18), byte for byte
# -----------------------------------------------------------------------------
css = open(CSS_HELD, 'rb').read()
if hashlib.sha256(css).hexdigest() != CSS_SHA256:
    sys.exit('ABORT: the held stylesheet is not W3-18\'s')
if os.path.exists(CSS):
    sys.exit('ABORT: the stylesheet already exists in the live tree')

for path, (raw, text, eol) in results.items():
    out = text.replace('\n', eol).encode('utf-8')
    print(('apply ' if MODE == 'apply' else 'dry   ') + os.path.basename(path) + '  ' + sha1(raw)[:8] + ' -> ' + sha1(out)[:8]
          + '  lines ' + str(raw.count(b'\n')) + ' -> ' + str(out.count(b'\n')) + ('  CRLF' if eol == '\r\n' else '  LF'))
    if MODE == 'apply':
        open(path, 'wb').write(out)
print(('apply ' if MODE == 'apply' else 'dry   ') + 'Na__LayoutEditor__Styles__SheetImages__.css  new  sha256 ' + CSS_SHA256[:12])
if MODE == 'apply':
    open(CSS, 'wb').write(css)
