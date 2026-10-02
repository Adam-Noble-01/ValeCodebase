# W3-07 build: ShapeTool 1.10.0 whole, the two vector test suites, the ModeController vector-tools hunks.
# Reads TrueVision only at the pin via git show; writes bytes; preserves the ModeController's CRLF.
import subprocess, sys, hashlib, os

PIN  = 'b2aa9151'
TVG  = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVA  = 'na-apps/30__TrueVision__CoreAppCode/'
VV   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
LE   = '02__Src__AppModules/51__System__LayoutEditor/'

def tv(path):
    return subprocess.run(['git', '-C', TVG, 'show', PIN + ':' + TVA + path], check=True, capture_output=True).stdout

def vvp(rel):
    return os.path.join(VV, rel.replace('/', os.sep))

def sha(b):
    return hashlib.sha1(b).hexdigest()

def must_replace(text, old, new, label, count=1):
    n = text.count(old)
    if n != count:
        sys.exit('ABORT %s: expected %d occurrence(s), found %d' % (label, count, n))
    return text.replace(old, new)

EXPECT_MC_SHA    = '7eeb3f99611329af0739331371e5f4fe5ef90dfd'
EXPECT_SHAPE_SHA = '9a1d321ef2c8aee8885feb406b8d05a7ace21f0a'

mode = sys.argv[1] if len(sys.argv) > 1 else 'dry'

# -----------------------------------------------------------------------------
# 1. ShapeTool 1.10.0 whole
# -----------------------------------------------------------------------------
shape_rel = LE + '35__System__DrawingTools/Na__LayoutEditor__ShapeTool__.js'
cur = open(vvp(shape_rel), 'rb').read()
if sha(cur) != EXPECT_SHAPE_SHA and mode == 'apply':
    sys.exit('ABORT: ShapeTool changed under us (%s)' % sha(cur))
s = tv(shape_rel).decode('utf-8')
assert '\r' not in s
s = must_replace(s, '// TRUEVISION3D - LAYOUT EDITOR - SHAPE TOOL\n', '// VALEVISION3D - LAYOUT EDITOR - SHAPE TOOL\n', 'shape banner')
old_pn = ("// PORT NOTE:\n"
          "// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__ShapeTool__.js\n"
          "// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n"
          "// - Parity        : verbatim\n"
          "// - Divergences   : Console prefix, header and folder numbers only.\n"
          "// - Back-port     : n/a (this IS the back-port)\n")
new_pn = ("// PORT NOTE:\n"
          "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__ShapeTool__.js\n"
          "// - Source version: 1.10.0 (TrueVision3D v2.130.0, 21-Sep-2026; read at b2aa9151)\n"
          "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-07}}, whole, with the vector tools switched on.\n"
          "//                   This app's copy was 1.6.0 (TrueVision3D 1.0.0-1.6.0, last ported 14-Sep-2026 from\n"
          "//                   TrueVision3D v2.44.0 / v2.46.0); TrueVision's log below now stands for it.\n"
          "// - Parity        : verbatim\n"
          "// - Divergences   :\n"
          "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
          "// - Back-port     : none. A new shape still ignores the Vectors panel's Hatch default, as TrueVision's\n"
          "//                   does (DR-37 (3): ported as TrueVision has it until Adam confirms the intent).\n")
s = must_replace(s, old_pn, new_pn, 'shape port note')
if 'TRUEVISION3D' in s or '[TrueVision3D' in s:
    sys.exit('ABORT: TrueVision token left in ShapeTool')
shape_out = s.encode('utf-8')

# -----------------------------------------------------------------------------
# 2. The two test suites, verbatim but for banner and PORT NOTE
# -----------------------------------------------------------------------------
TESTS = {
    'Na__Test__VectorTools__.test.mjs': {
        'banner': 'THE VECTOR TOOLS: THE MATHS OF TRIM, EXTEND, SPLIT, JOIN, OFFSET, CORNERS AND CURVES, AND THE KEYS',
        'source': '1.0.0 (TrueVision3D v2.130.0, 21-Sep-2026; read at b2aa9151)',
    },
    'Na__Test__VectorBooleans__.test.mjs': {
        'banner': 'THE BOOLEAN TOOLS AND VECTORS WITH HOLES (ISLANDS)',
        'source': '1.0.0 (TrueVision3D v2.150.0, 22-Sep-2026; read at b2aa9151)',
    },
}
tests_out = {}
for name, meta in TESTS.items():
    t = tv('80__Testing__PrototypeEnvironment/' + name).decode('utf-8')
    assert '\r' not in t
    t = must_replace(t, '// TRUEVISION3D - TEST - ' + meta['banner'] + '\n', '// VALEVISION3D - TEST - ' + meta['banner'] + '\n', name + ' banner')
    pn = ("// PORT NOTE:\n"
          "// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/" + name + "\n"
          "// - Source version: " + meta['source'] + "\n"
          "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-07}}, with the vector tools and Booleans\n"
          "//                   switched on (ShapeTool 1.10.0 and the ModeController's Vector Tools wiring)\n"
          "// - Parity        : verbatim\n"
          "// - Divergences   :\n"
          "//   - Banner reads ValeVision3D.\n"
          "// - Back-port     : none.\n"
          "//\n"
          "// -----------------------------------------------------------------------------\n"
          "//\n"
          "// DEVELOPMENT LOG:\n")
    t = must_replace(t, '// DEVELOPMENT LOG:\n', pn, name + ' port note')
    if 'TRUEVISION3D' in t or '[TrueVision3D' in t:
        sys.exit('ABORT: TrueVision token left in ' + name)
    tests_out[name] = t.encode('utf-8')

# -----------------------------------------------------------------------------
# 3. ModeController hunks (CRLF preserved)
# -----------------------------------------------------------------------------
mc_rel = LE + '05__Core__ModeController/Na__LayoutEditor__ModeController__.js'
mcb = open(vvp(mc_rel), 'rb').read()
if sha(mcb) != EXPECT_MC_SHA:
    sys.exit('ABORT: ModeController changed under us (%s)' % sha(mcb))
assert b'\r\n' in mcb
m = mcb.decode('utf-8').replace('\r\n', '\n')
assert '\r' not in m

# 3a. imports, TrueVision's two lines straight after the Vectors panel's import
imp_shapes = "    import { Na__LePanelShapes__Register } from '../40__Ui__Panels/Na__LayoutEditor__Panel__Shapes__.js';\n"
imp_vec = ("    import { Na__LePanelVec__Register } from '../37__System__VectorTools/Na__LayoutEditor__Panel__VectorTools__.js';\n"
           "    import { Na__LeVec__Initialize } from '../37__System__VectorTools/Na__LayoutEditor__VectorTools__.js';\n")
m = must_replace(m, imp_shapes, imp_shapes + imp_vec, 'mc import')

# 3b. register, straight after Vectors
reg_shapes = "        Na__LePanelShapes__Register();\n"
reg_vec    = "        Na__LePanelVec__Register();                                            // <-- Vector Tools: straight under Vectors, where Adam drew it - Line, Rectangle, Circle, Arc, Trim, Extend, Join, Split, Offset, Fillet, Chamfer and the settings of whichever is up\n"
m = must_replace(m, reg_shapes, reg_shapes + reg_vec, 'mc register')

# 3c. initialise, straight after the history
init_hist = "            Na__LeHist__Initialize();                                        // <-- Undo and redo listen to the model from the start\n"
init_vec  = "            Na__LeVec__Initialize();                                         // <-- What is drawn inside a group that is open for editing joins that group, just before the change is announced, so the history's one step holds both\n"
m = must_replace(m, init_hist, init_hist + init_vec, 'mc initialise')

# 3d. PORT NOTE
m = must_replace(m,
    "//                   1.18.2, 1.18.3, 1.18.4, 1.18.5, 1.18.6, 1.18.7, 1.18.8, 1.18.9 and 1.18.10 entries name. Every other difference from that\n",
    "//                   1.18.2, 1.18.3, 1.18.4, 1.18.5, 1.18.6, 1.18.7, 1.18.8, 1.18.9, 1.18.10 and 1.18.11 entries name. Every other difference from that\n",
    'mc source version')
m = must_replace(m,
    "//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-05}} (the drawing grid and the drawing axes)\n",
    "//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-05}} (the drawing grid and the drawing axes);\n"
    "//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-07}} (the vector tools)\n",
    'mc ported on')
m = must_replace(m,
    "//     vector tools, sheet images, floor areas, note regions, the published viewer's guards,\n",
    "//     sheet images, floor areas, note regions, the published viewer's guards,\n",
    'mc not yet taken')

# 3e. DEVELOPMENT LOG entry
log_head = "// DEVELOPMENT LOG:\n// 02-Oct-2026 - Version 1.18.10 (the drawing grid and the drawing axes, {{VVREL:W3-05}})\n"
log_new = ("// DEVELOPMENT LOG:\n"
           "// 02-Oct-2026 - Version 1.18.11 (the vector tools, {{VVREL:W3-07}})\n"
           "// - THE VECTOR TOOLS AND BOOLEANS ARE SWITCHED ON. The Vector Tools section\n"
           "//   (37__System__VectorTools: Line, Rectangle, Circle, Arc, Trim, Extend,\n"
           "//   Join, Split, Offset, Fillet, Chamfer and the Boolean section) registers\n"
           "//   in the right column straight after Vectors, and Na__LeVec__Initialize\n"
           "//   runs once beside the history's, so what is drawn inside a group open\n"
           "//   for editing joins that group in the same undo step. The sheet tools\n"
           "//   already carry the dispatch, the keys and the holes-aware edits\n"
           "//   (SheetTools 1.39.0, Keyboard 1.18.0); the Draw tool takes TrueVision's\n"
           "//   ShapeTool 1.10.0 whole with this change. From TrueVision3D 1.27.0\n"
           "//   (v2.130.0): TrueVision's two import lines, two calls and comments at\n"
           "//   this app's sites. NOT tried by Adam in TrueVision (v2.130.0, v2.150.0,\n"
           "//   v2.151.0). Vector Tools is not one of the AccordionSections, as in\n"
           "//   TrueVision. The toolbar's Circle and Arc buttons come with the\n"
           "//   toolbar's own port.\n"
           "//\n"
           "// 02-Oct-2026 - Version 1.18.10 (the drawing grid and the drawing axes, {{VVREL:W3-05}})\n")
m = must_replace(m, log_head, log_new, 'mc log')
mc_out = m.replace('\n', '\r\n').encode('utf-8')

# -----------------------------------------------------------------------------
# Write
# -----------------------------------------------------------------------------
print('ShapeTool  before', sha(cur), 'after', sha(shape_out), len(shape_out))
print('ModeCtrl   before', sha(mcb), 'after', sha(mc_out), len(mc_out))
for n, b in tests_out.items():
    print(n, sha(b), len(b))

if mode == 'apply':
    open(vvp(shape_rel), 'wb').write(shape_out)
    open(vvp(mc_rel), 'wb').write(mc_out)
    for n, b in tests_out.items():
        p = vvp('80__Testing__PrototypeEnvironment/' + n)
        if os.path.exists(p):
            sys.exit('ABORT: test already exists ' + p)
        open(p, 'wb').write(b)
    print('APPLIED')
elif mode == 'restore':
    print('restore not implemented here: use the backups in the scratch folder')
else:
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dry')
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'ShapeTool.js'), 'wb').write(shape_out)
    open(os.path.join(out, 'ModeController.js'), 'wb').write(mc_out)
    for n, b in tests_out.items():
        open(os.path.join(out, n), 'wb').write(b)
    print('DRY written to', out)
