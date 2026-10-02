# =============================================================================
# W2-01 - Drawing Planes: Overlay, Grip, Dev-menu controls, stylesheet and test
# =============================================================================
# Reads the five TV files with `git show b2aa9151:...` (bytes, LF as git returns
# them), re-applies ONLY the listed seams (banner token, PORT NOTE block, console
# prefix), writes the new files into VV, and proves the round trip: undoing the
# seams on the written bytes gives TV's bytes back.
#
# Refuses to overwrite: if any target already exists it stops before writing
# anything (another writer, or a re-run - use --check to re-verify instead).
#
#   python port_w2_01.py            # port (new files only)
#   python port_w2_01.py --check    # verify the landed files against TV, write nothing
# =============================================================================
import os, sys, subprocess, hashlib

NAWEB  = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN    = "b2aa9151"
TVAPP  = "na-apps/30__TrueVision__CoreAppCode/"
VVAPP  = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SYS    = "02__Src__AppModules/47__System__DrawingPlanes/"
TST    = "80__Testing__PrototypeEnvironment/"

TV_NOTE_STD = (
    b"// PORT NOTE:\n"
    b"// - Authored in   : TrueVision3D first (20-Sep-2026)\n"
    b"// - ValeVision    : not yet ported.\n"
)
TV_NOTE_GRIP = (
    b"// PORT NOTE:\n"
    b"// - Authored in   : TrueVision3D first (20-Sep-2026)\n"
    b"// - ValeVision    : not yet ported. Supersedes Na__Elevation__GizmoGrip__ and\n"
    b"//                   Na__Elevation__FacePick__ there when it is.\n"
)

UNCONFIRMED = (
    "//                   TrueVision's own note said \"not yet ported\"; Drawing Planes (v2.82.0, and\n"
    "//                   v2.84.0 for the kept shown set) is still \"not yet signed off\" / \"NOT yet\n"
    "//                   confirmed by Adam\" there. It comes across under DR-01 (c), named as such.\n"
)

def ported(name, ver, rel):
    return (
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 02__Src__AppModules/47__System__DrawingPlanes/" + name + "\n"
        "// - Source version: " + ver + " (TrueVision3D " + rel + ", 20-Sep-2026; read at b2aa9151)\n"
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-01}}, with the rest of the Drawing\n"
        "//                   Planes system (its core leaves came first, with W2-40).\n"
        + UNCONFIRMED
    )

INERT = (
    "//                   Started from index.html after the Layout Editor block, as TrueVision does. Until\n"
    "//                   the Floor Plans and Elevations Dev-menu editors register their sources (W2-04,\n"
    "//                   W2-05) no plane can go up, so nothing is added to the scene and no canvas\n"
    "//                   listener is attached.\n"
)

VV_NOTE = {
    "Na__DrawingPlanes__Overlay__.js": ported("Na__DrawingPlanes__Overlay__.js", "1.1.0", "v2.84.0") + (
        "// - Parity        : verbatim.\n"
        + INERT +
        "//                   The planes' root group goes into the scene, outside the model root, so\n"
        "//                   ValeVision's own section engine (41__System__CrossSectionView, DIV-2), which clips\n"
        "//                   only under the model root, never cuts a plane. Every plane is registered with\n"
        "//                   Na__RenderLoop__InteractiveOverlays__ (W1-01), so it is drawn only inside the\n"
        "//                   interactive 3D frame: never into a thumbnail, a drawing, a sheet viewport, an\n"
        "//                   image export, a Video Studio frame or an Export Render Layers pass.\n"
        "//                   The shown set and the snap are kept under TrueVision's localStorage keys\n"
        "//                   (Na__DrawingPlanes__Shown, per project code = ValeVision's ?project= folderId;\n"
        "//                   Na__DrawingPlanes__Snap): browser storage is per origin (K2 B1).\n"
        "// - Divergences   :\n"
        "//   - Banner and console prefix read ValeVision3D.\n"
        "// - Back-port     : none.\n"
    ),
    "Na__DrawingPlanes__Grip__.js": ported("Na__DrawingPlanes__Grip__.js", "1.0.0", "v2.82.0") + (
        "// - Parity        : verbatim.\n"
        + INERT +
        "//                   As in TrueVision it supersedes Na__Elevation__GizmoGrip__ and\n"
        "//                   Na__Elevation__FacePick__ once the 2.x elevation editor arrives (W2-05); until\n"
        "//                   then those two stay initialised and in use, and the three stay on disk after it,\n"
        "//                   exactly as TrueVision keeps them (S02a item 8). Its pointerdown listener is in\n"
        "//                   the capture phase on the canvas, so a plane under the pointer takes the press\n"
        "//                   ahead of orbit and of ValeVision's Cross Sections gizmo (a bubble-phase canvas\n"
        "//                   listener); Video Studio's keyframe dragger listens in the capture phase on the\n"
        "//                   window, so it still sees a press first, as it does today ahead of every\n"
        "//                   canvas tool.\n"
        "// - Divergences   :\n"
        "//   - Banner and console prefix read ValeVision3D.\n"
        "// - Back-port     : none.\n"
    ),
    "Na__DrawingPlanes__DevMenu__Controls__.js": ported("Na__DrawingPlanes__DevMenu__Controls__.js", "1.0.0", "v2.82.0") + (
        "// - Parity        : verbatim. Its BuildBar and BuildRowControls are called by the Floor Plans and\n"
        "//                   Elevations Dev-menu editors, which take TrueVision's 2.x editors with W2-04 and\n"
        "//                   W2-05; until then only its Initialize runs (index.html) and nothing is built.\n"
        "// - Divergences   :\n"
        "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
        "// - Back-port     : none.\n"
    ),
}

CSS_HEAD_END = (
    b" * equivalent there is defined here.\n"
    b" */\n"
    b"/* ================================================================= */\n"
)
CSS_NOTE = (
    "/*\n"
    "   PORT NOTE:\n"
    "   - Ported from   : TrueVision3D 02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__Styles__DevMenu__.css\n"
    "   - Source version: none of its own - the sheet as TrueVision3D v2.82.0 left it (20-Sep-2026, commit\n"
    "                     66cdd175; read at b2aa9151)\n"
    "   - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-01}}, with the Drawing Planes modules.\n"
    "                     v2.82.0 is still \"not yet signed off by Adam\" in TrueVision; it comes across\n"
    "                     under DR-01 (c), named as such.\n"
    "   - Parity        : verbatim (the rules are TrueVision's; the banner and this note are the only\n"
    "                     differences). Imported by 03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css\n"
    "                     after the floor plan, elevation and north Dev sheets, where TrueVision's index has it.\n"
    "   - Divergences   :\n"
    "     - Banner reads ValeVision3D.\n"
    "   - Legacy        : TrueVision's copy of this sheet has no module version, so the Source version names\n"
    "                     the release and the commit instead.\n"
    "   - Back-port     : none.\n"
    "*/\n"
)

TEST_LOG_ANCHOR = (
    b"// -----------------------------------------------------------------------------\n"
    b"//\n"
    b"// DEVELOPMENT LOG:\n"
)
TEST_NOTE = (
    "// -----------------------------------------------------------------------------\n"
    "//\n"
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__DrawingPlanes__.test.mjs\n"
    "// - Source version: 1.0.0 (TrueVision3D v2.82.0, 20-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-01}}, with the Drawing Planes modules\n"
    "// - Parity        : verbatim - every check is TrueVision's, run against this app's own\n"
    "//                   Na__DrawingPlanes__Maths__ (W2-40). The fixture keeps TrueVision's PS01 numbers:\n"
    "//                   it is what the maths was measured against, and nothing here reaches a page.\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D.\n"
    "// - Back-port     : none.\n"
    "//\n"
)

def seams_for(name):
    if name == "Na__DrawingPlanes__Styles__DevMenu__.css":
        return [
            (b"/* REGION  |  TrueVision3D - Drawing Planes Dev Menu Styles         */",
             b"/* REGION  |  ValeVision3D - Drawing Planes Dev Menu Styles         */", 1),
            (CSS_HEAD_END, CSS_HEAD_END + CSS_NOTE.encode("utf-8"), 1),
        ]
    if name == "Na__Test__DrawingPlanes__.test.mjs":
        return [
            (b"// TRUEVISION3D - TEST - DRAWING PLANES - MATHS", b"// VALEVISION3D - TEST - DRAWING PLANES - MATHS", 1),
            (TEST_LOG_ANCHOR, TEST_NOTE.encode("utf-8") + TEST_LOG_ANCHOR, 1),
        ]
    s = [(b"// TRUEVISION3D - DRAWING PLANES - ", b"// VALEVISION3D - DRAWING PLANES - ", 1)]
    tv_note = TV_NOTE_GRIP if name == "Na__DrawingPlanes__Grip__.js" else TV_NOTE_STD
    s.append((tv_note, VV_NOTE[name].encode("utf-8"), 1))
    if name == "Na__DrawingPlanes__Overlay__.js":
        s.append((b"console.warn('[TrueVision3D] Drawing planes overlay", b"console.warn('[ValeVision3D] Drawing planes overlay", 1))
    if name == "Na__DrawingPlanes__Grip__.js":
        s.append((b"console.warn('[TrueVision3D] Drawing planes grip", b"console.warn('[ValeVision3D] Drawing planes grip", 1))
    return s

FILES = [
    (SYS, "Na__DrawingPlanes__Overlay__.js"),
    (SYS, "Na__DrawingPlanes__Grip__.js"),
    (SYS, "Na__DrawingPlanes__DevMenu__Controls__.js"),
    (SYS, "Na__DrawingPlanes__Styles__DevMenu__.css"),
    (TST, "Na__Test__DrawingPlanes__.test.mjs"),
]

def tv_bytes(rel, name):
    return subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + TVAPP + rel + name],
                          capture_output=True, check=True).stdout

def build(name, src):
    out = src
    for old, new, n in seams_for(name):
        c = out.count(old)
        if c != n:
            raise SystemExit("STOP: seam count mismatch in %s: expected %d, found %d for %r" % (name, n, c, old[:60]))
        out = out.replace(old, new)
    return out

def unbuild(name, vv):
    out = vv
    for old, new, n in reversed(seams_for(name)):
        c = out.count(new)
        if c != n:
            raise SystemExit("ROUND TRIP FAIL: %s: expected %d of %r, found %d" % (name, n, new[:60], c))
        out = out.replace(new, old)
    return out

def main():
    check_only = "--check" in sys.argv
    plan = []
    for rel, name in FILES:
        src = tv_bytes(rel, name)
        if b"\r\n" in src:
            raise SystemExit("STOP: TV bytes for %s carry CRLF; expected LF from git show" % name)
        vv = build(name, src)
        if unbuild(name, vv) != src:
            raise SystemExit("STOP: round trip failed in memory for %s" % name)
        if any(b > 127 for b in vv):
            raise SystemExit("STOP: non-ASCII byte in %s" % name)
        plan.append((rel, name, src, vv))

    if check_only:
        ok = True
        for rel, name, src, vv in plan:
            path = os.path.join(VVAPP, (rel + name).replace("/", os.sep))
            if not os.path.exists(path):
                print("MISSING", path); ok = False; continue
            with open(path, "rb") as f:
                have = f.read()
            same = (have == vv)
            back = (unbuild(name, have) == src)
            print("%-44s landed==expected:%s  seams-undone==TV@%s:%s  %d bytes (TV %d)  LF-only:%s  sha1 %s"
                  % (name, same, PIN, back, len(have), len(src), b"\r\n" not in have, hashlib.sha1(have).hexdigest()[:12]))
            ok = ok and same and back
        print("CHECK", "PASS" if ok else "FAIL")
        sys.exit(0 if ok else 1)

    existing = [n for r, n, _, _ in plan if os.path.exists(os.path.join(VVAPP, (r + n).replace("/", os.sep)))]
    if existing:
        raise SystemExit("STOP: target already exists (another writer or a re-run): " + ", ".join(existing))
    for rel, name, src, vv in plan:
        path = os.path.join(VVAPP, (rel + name).replace("/", os.sep))
        with open(path, "xb") as f:                                   # x: never overwrite
            f.write(vv)
        print("wrote", path, len(vv), "bytes (TV", len(src), "bytes)")
    print("PORT DONE")

if __name__ == "__main__":
    main()
