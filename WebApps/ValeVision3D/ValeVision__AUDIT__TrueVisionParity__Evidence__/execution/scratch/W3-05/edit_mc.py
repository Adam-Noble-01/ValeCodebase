"""W3-05: TrueVision ModeController 1.24.0 / 1.28.0 hunks (drawing grid panel + attach, drawing axes attach)
into VV's ModeController, preserving the file's CRLF line endings."""
import hashlib, sys

P = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\05__Core__ModeController\Na__LayoutEditor__ModeController__.js'

raw = open(P, 'rb').read()
print('before sha1', hashlib.sha1(raw).hexdigest(), len(raw))
assert b'\r\n' in raw
text = raw.decode('utf-8').replace('\r\n', '\n')
assert '\r' not in text

def rep(old, new, count=1):
    global text
    n = text.count(old)
    assert n == count, (n, old[:120])
    text = text.replace(old, new)

# 1. PORT NOTE: source-version entries, ported-on, and the "not yet taken" divergence
rep("// - Source version: 1.32.0 (TrueVision3D v2.166.0, 29-Sep-2026; read at b2aa9151) - the hunks the 1.18.1,\n"
    "//                   1.18.2, 1.18.3, 1.18.4, 1.18.5, 1.18.6, 1.18.7, 1.18.8 and 1.18.9 entries name. Every other difference from that\n",
    "// - Source version: 1.32.0 (TrueVision3D v2.166.0, 29-Sep-2026; read at b2aa9151) - the hunks the 1.18.1,\n"
    "//                   1.18.2, 1.18.3, 1.18.4, 1.18.5, 1.18.6, 1.18.7, 1.18.8, 1.18.9 and 1.18.10 entries name. Every other difference from that\n")
rep("//                   02-Oct-2026 for ValeVision3D v2.71.4 (Model Source and the site plan composites)\n",
    "//                   02-Oct-2026 for ValeVision3D v2.71.4 (Model Source and the site plan composites);\n"
    "//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-05}} (the drawing grid and the drawing axes)\n")
rep("//     Drawing Register and no Statement Writer; each feature's port puts TrueVision's body in.\n"
    "//   - Not yet taken, each arriving with its feature: the register and statements pages, the\n"
    "//     drawing grid and axes, vector tools, sheet images, floor areas, note regions, the\n"
    "//     published viewer's guards, and SectionForKind's floor area and picture rules.\n",
    "//     Drawing Register and no Statement Writer; each feature's port puts TrueVision's body in.\n"
    "//   - Not yet taken, each arriving with its feature: the register and statements pages,\n"
    "//     vector tools, sheet images, floor areas, note regions, the published viewer's guards,\n"
    "//     and SectionForKind's floor area and picture rules.\n")

# 2. DEVELOPMENT LOG entry
rep("// DEVELOPMENT LOG:\n// 02-Oct-2026 - Version 1.18.9 (Model Source and the site plan composites, v2.71.4)\n",
    "// DEVELOPMENT LOG:\n"
    "// 02-Oct-2026 - Version 1.18.10 (the drawing grid and the drawing axes, {{VVREL:W3-05}})\n"
    "// - THE DRAFTING AIDS ARE SWITCHED ON. The Drawing Grid section\n"
    "//   (27__System__DrawingGrid, SketchUp LayOut's Document Setup > Grid)\n"
    "//   registers straight after Sheet on the Document Preferences tab, and the\n"
    "//   grid and the Drawing Axes Overlay (33__System__DrawingAxes, F9) are\n"
    "//   attached and detached with the sheet tools, so they are drawn on a\n"
    "//   drawing tab and never for a viewer. Ortho (F8) and Draft (K) need no\n"
    "//   line here: the sheet keyboard (Keyboard 1.18.0) already switches them,\n"
    "//   and F6 / F7 now reach a grid that is attached. From TrueVision3D 1.24.0\n"
    "//   (v2.114.0) and 1.28.0 (v2.131.0), TrueVision's import lines, calls and\n"
    "//   comments at this app's sites. No try by Adam is recorded in TrueVision\n"
    "//   for v2.114.0; v2.131.0 is NOT tried by Adam. The toolbar's buttons come\n"
    "//   with the toolbar's own port.\n"
    "//\n"
    "// 02-Oct-2026 - Version 1.18.9 (Model Source and the site plan composites, v2.71.4)\n")

# 3. Imports (TrueVision's lines, straight after the Sheet panel's import)
rep("    import { Na__LePanelSheet__Register } from '../40__Ui__Panels/Na__LayoutEditor__Panel__Sheet__.js';\n",
    "    import { Na__LePanelSheet__Register } from '../40__Ui__Panels/Na__LayoutEditor__Panel__Sheet__.js';\n"
    "    import { Na__LePanelGrid__Register } from '../27__System__DrawingGrid/Na__LayoutEditor__Panel__DrawingGrid__.js';\n"
    "    import { Na__LeGrid__Attach, Na__LeGrid__Detach } from '../27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__.js';\n"
    "    import { Na__LeAxes__Attach, Na__LeAxes__Detach } from '../33__System__DrawingAxes/Na__LayoutEditor__DrawingAxes__.js';\n")

# 4. Panel registration straight after Sheet
rep("        Na__LePanelSheet__Register();\n        Na__LePanelMargin__Register();",
    "        Na__LePanelSheet__Register();\n"
    "        Na__LePanelGrid__Register();                                           // <-- Drawing Grid: under Sheet, LayOut's Document Setup > Grid (F6 shows it, F7 snaps to it)\n"
    "        Na__LePanelMargin__Register();")

# 5. Attach / Detach with the sheet tools
rep("        Na__LeTools__Attach({ editable : Na__LeMode__IsEditable() });\n"
    "        Na__LeMarginGrip__Attach({ editable : Na__LeMode__IsEditable() });\n",
    "        Na__LeTools__Attach({ editable : Na__LeMode__IsEditable() });\n"
    "        Na__LeGrid__Attach();                                                  // <-- The drawing grid is drawn with the tools, and never for a viewer\n"
    "        Na__LeAxes__Attach();                                                  // <-- The drawing axes (F9) follow the pointer with the tools, and never for a viewer\n"
    "        Na__LeMarginGrip__Attach({ editable : Na__LeMode__IsEditable() });\n")
rep("        Na__LeMarginGrip__Detach();\n        Na__LeTools__Detach();\n",
    "        Na__LeMarginGrip__Detach();\n"
    "        Na__LeGrid__Detach();\n"
    "        Na__LeAxes__Detach();\n"
    "        Na__LeTools__Detach();\n")

out = text.replace('\n', '\r\n').encode('utf-8')
if '--write' in sys.argv:
    open(P, 'wb').write(out)
    print('after sha1', hashlib.sha1(out).hexdigest(), len(out))
else:
    print('dry run ok', len(out))
