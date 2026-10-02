# =============================================================================
# W2-01 - Wire Drawing Planes into index.html and the CSS index (CRLF preserved)
# =============================================================================
# Three hunks, each an exact byte replacement asserted to match once:
#   index.html  [1] the three 47 imports after the 45 imports, before the 46 imports (TV :913-915 order)
#               [2] TV's DRAWING PLANES init block (TV :1741-1749) after VV's Layout Editor loader block
#   CSS index   [3] the 47 Dev sheet after the north Dev sheet (TV index :118-123 position)
# Backups of the bytes read are written to scratch/W2-01/backup/ before anything is saved.
#   python wire_w2_01.py           # apply
#   python wire_w2_01.py --check   # report whether each hunk is present
#   python wire_w2_01.py --revert  # restore the backups
# =============================================================================
import os, sys, shutil

VV   = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE = os.path.dirname(os.path.abspath(__file__))
BK   = os.path.join(HERE, "backup")
IDX  = os.path.join(VV, "index.html")
CSS  = os.path.join(VV, "03__Style__AppStylesheets", "Na__CoreUi__Styles__Index__.css")

def crlf(s):
    return s.replace("\n", "\r\n").encode("utf-8")

IMP_OLD = (
    "    import { Na__Elevation__DevMenu__Initialize } from './02__Src__AppModules/45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js';\n"
    "    import { Na__North__DevMenu__Initialize } from './02__Src__AppModules/46__System__NorthDirection/Na__North__DevMenu__Editor__.js';\n"
)
IMP_NEW = (
    "    import { Na__Elevation__DevMenu__Initialize } from './02__Src__AppModules/45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js';\n"
    "    import { Na__PlaneOverlay__Initialize } from './02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__Overlay__.js';\n"
    "    import { Na__PlaneGrip__Initialize } from './02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__Grip__.js';\n"
    "    import { Na__PlaneUi__Initialize } from './02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__DevMenu__Controls__.js';\n"
    "    import { Na__North__DevMenu__Initialize } from './02__Src__AppModules/46__System__NorthDirection/Na__North__DevMenu__Editor__.js';\n"
)

INIT_OLD = (
    "        appConfig   : Na__AppConfig__Data,                                      // <-- LayoutEditor__Config (web read-only flag)\n"
    "        showToast   : Na__UiFeature__ShowToast\n"
    "    });\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "    // VIDEO STUDIO | Initialize path overlay, preview playback and dev controls\n"
)
INIT_NEW = (
    "        appConfig   : Na__AppConfig__Data,                                      // <-- LayoutEditor__Config (web read-only flag)\n"
    "        showToast   : Na__UiFeature__ShowToast\n"
    "    });\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "    // DRAWING PLANES | Every plan and elevation plane, shown, dragged and picked in the 3D view\n"
    "    // @delegate: ./02__Src__AppModules/47__System__DrawingPlanes/\n"
    "    // Nothing is added to the scene and no listener is attached until a plane is\n"
    "    // switched on from the Floor Plans or Elevations Dev panel, so the live app\n"
    "    // carries none of it. The planes are never drawn into a drawing, a sheet, a\n"
    "    // thumbnail or an export: see Na__RenderLoop__InteractiveOverlays__.\n"
    "    Na__PlaneOverlay__Initialize({ scene : Na__Scene__Main, modelRoot : Na__ModelGroup__Root });\n"
    "    Na__PlaneGrip__Initialize({ renderer : Na__Renderer__Main, camera : Na__Camera__Main, controls : Na__Controls__Orbit, modelRoot : Na__ModelGroup__Root, showToast : Na__UiFeature__ShowToast });\n"
    "    Na__PlaneUi__Initialize({ showToast : Na__UiFeature__ShowToast });\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "    // VIDEO STUDIO | Initialize path overlay, preview playback and dev controls\n"
)

CSS_OLD = (
    "/* Floor Plans, Elevations, North, Plan Annotations, Plan Dimensions, then the Drawing View Core Dev rows: TrueVision's order (port Phases 2 and 3) */\n"
    "/* ----------------------------------------------------------------- */\n"
    "@import url('../02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__Styles__DevMenu__.css');\n"
    "@import url('../02__Src__AppModules/45__System__ElevationViews/Na__Elevation__Styles__DevMenu__.css');\n"
    "@import url('../02__Src__AppModules/46__System__NorthDirection/Na__North__Styles__DevMenu__.css');\n"
    "@import url('../02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Styles__.css');\n"
)
CSS_NEW = (
    "/* Floor Plans, Elevations, North, Drawing Planes, Plan Annotations, Plan Dimensions, then the Drawing View Core Dev rows: TrueVision's order (port Phases 2 and 3) */\n"
    "/* ----------------------------------------------------------------- */\n"
    "@import url('../02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__Styles__DevMenu__.css');\n"
    "@import url('../02__Src__AppModules/45__System__ElevationViews/Na__Elevation__Styles__DevMenu__.css');\n"
    "@import url('../02__Src__AppModules/46__System__NorthDirection/Na__North__Styles__DevMenu__.css');\n"
    "@import url('../02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__Styles__DevMenu__.css');   /* <-- After the floor plan and elevation sheets: the bar and the row controls sit inside both panels and reuse their classes */\n"
    "@import url('../02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Styles__.css');\n"
)

HUNKS = [
    (IDX, "imports", IMP_OLD, IMP_NEW),
    (IDX, "inits",   INIT_OLD, INIT_NEW),
    (CSS, "css",     CSS_OLD, CSS_NEW),
]

def read(p):
    with open(p, "rb") as f:
        return f.read()

def main():
    if "--revert" in sys.argv:
        for p in (IDX, CSS):
            b = os.path.join(BK, os.path.basename(p))
            shutil.copyfile(b, p)
            print("restored", p)
        return
    data = {IDX : read(IDX), CSS : read(CSS)}
    for p, d in data.items():
        n_crlf = d.count(b"\r\n"); n_lf = d.count(b"\n")
        print(os.path.basename(p), "CRLF", n_crlf, "LF", n_lf)
        if n_crlf != n_lf:
            raise SystemExit("STOP: mixed line endings in " + p)
    if "--check" in sys.argv:
        for p, name, old, new in HUNKS:
            print(name, "applied" if data[p].count(crlf(new)) == 1 else ("absent" if data[p].count(crlf(old)) == 1 else "UNKNOWN"))
        return
    out = dict(data)
    for p, name, old, new in HUNKS:
        c = out[p].count(crlf(old))
        if c != 1:
            raise SystemExit("STOP: hunk %s anchor found %d times in %s" % (name, c, p))
        out[p] = out[p].replace(crlf(old), crlf(new))
    os.makedirs(BK, exist_ok=True)
    for p in (IDX, CSS):
        b = os.path.join(BK, os.path.basename(p))
        if not os.path.exists(b):
            with open(b, "wb") as f:
                f.write(data[p])
    for p in (IDX, CSS):
        if read(p) != data[p]:
            raise SystemExit("STOP: file changed under me: " + p)
        with open(p, "wb") as f:
            f.write(out[p])
        print("wrote", p, len(data[p]), "->", len(out[p]))
    print("WIRE DONE")

if __name__ == "__main__":
    main()
