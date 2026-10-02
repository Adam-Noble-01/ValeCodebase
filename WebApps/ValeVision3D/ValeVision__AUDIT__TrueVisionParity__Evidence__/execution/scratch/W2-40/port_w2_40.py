# =============================================================================
# W2-40 - Drawing Planes core leaves: whole-file port from TrueVision at the pin
# =============================================================================
# Reads the five TV files with `git show b2aa9151:...` (bytes, LF as git returns
# them), re-applies ONLY the listed seams (banner token, PORT NOTE block, console
# prefix), writes the new files into VV's 47__System__DrawingPlanes, and proves
# the round trip: undoing the seams on the written bytes gives TV's bytes back.
#
# Refuses to overwrite: if any target already exists it stops before writing
# anything (another writer, or a re-run - use --check to re-verify instead).
#
#   python port_w2_40.py            # port (new files only)
#   python port_w2_40.py --check    # verify the landed files against TV, write nothing
# =============================================================================
import os, sys, subprocess, hashlib

NAWEB  = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN    = "b2aa9151"
TVAPP  = "na-apps/30__TrueVision__CoreAppCode/"
VVAPP  = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
REL    = "02__Src__AppModules/47__System__DrawingPlanes/"

TV_PORT_NOTE_STD = (
    b"// PORT NOTE:\n"
    b"// - Authored in   : TrueVision3D first (20-Sep-2026)\n"
    b"// - ValeVision    : not yet ported.\n"
)
TV_PORT_NOTE_BOUNDS = (
    b"// PORT NOTE:\n"
    b"// - Authored in   : TrueVision3D first (20-Sep-2026)\n"
    b"// - ValeVision    : not yet ported. Its category keys are shorter (\"Landscape\",\n"
    b"//                   \"Walls\"), so the two token lists in the config are the part\n"
    b"//                   that changes.\n"
)

PORTED_ON = (
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-40}}, with the Drawing Planes system's\n"
    "//                   other core leaves. TrueVision's own note said \"not yet ported\" and v2.82.0 is\n"
    "//                   still \"not yet signed off by Adam\" there; it comes across under DR-01 (c), and\n"
    "//                   v2.82.0 is named as not yet confirmed by Adam in TrueVision.\n"
)

def head(name):
    return (
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 02__Src__AppModules/47__System__DrawingPlanes/" + name + "\n"
        "// - Source version: 1.0.0 (TrueVision3D v2.82.0, 20-Sep-2026; read at b2aa9151)\n"
        + PORTED_ON
    )

VV_PORT_NOTE = {
    "Na__DrawingPlanes__Maths__.js": head("Na__DrawingPlanes__Maths__.js") + (
        "// - Parity        : verbatim, and inert: nothing outside this folder imports it until the overlay,\n"
        "//                   the grip and the Dev-menu controls arrive with W2-01, which also brings its test,\n"
        "//                   80__Testing__PrototypeEnvironment/Na__Test__DrawingPlanes__.test.mjs (47 checks).\n"
        "// - Divergences   :\n"
        "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
        "// - Back-port     : none.\n"
    ),
    "Na__DrawingPlanes__ConfigState__.js": head("Na__DrawingPlanes__ConfigState__.js") + (
        "// - Parity        : verbatim, and inert: Na__PlaneOverlay__Initialize, which starts the load, and\n"
        "//                   every other reader arrive with W2-01. Na__DrawingPlanes__AppConfig__.json beside\n"
        "//                   it is TrueVision's file byte for byte, so the fallbacks still mirror the shipped\n"
        "//                   JSON exactly, the bounds tokens included (checked against ValeVision's models:\n"
        "//                   see the PORT NOTE of Na__DrawingPlanes__Bounds__).\n"
        "// - Divergences   :\n"
        "//   - Banner and console prefix read ValeVision3D.\n"
        "// - Back-port     : none.\n"
    ),
    "Na__DrawingPlanes__Bounds__.js": head("Na__DrawingPlanes__Bounds__.js") + (
        "// - Parity        : verbatim, and inert: only Na__DrawingPlanes__Overlay__ asks it for frames, and\n"
        "//                   that arrives with W2-01. The config's token lists are verbatim too (S02a-F43):\n"
        "//                   TrueVision's note that ValeVision's category keys are shorter (\"Landscape\",\n"
        "//                   \"Walls\") does not hold. ValeVision's loader names each group under the model\n"
        "//                   root by its category key (15__ModelLoader/Na__ModelLoader__MultiModel.js):\n"
        "//                   ValeVision__<Category> for a current export, Storey__<Storey>__<Element> for a\n"
        "//                   storey export, and one ValeVision__LegacyModel bucket for an older __Layer-XX__\n"
        "//                   export; the OrbitHelperCube goes into the scene, not the model root. Checked on\n"
        "//                   02-Oct-2026 against the 91 Whitecardopedia projects whose lists name models: the\n"
        "//                   reference project 2026/3047__Doous (D37) measures its five\n"
        "//                   ValeVision__MainBuildingModel__* groups and cuts ValeVision__LandscapeEnvironment;\n"
        "//                   the storey export 2026/62609__Bagot matches Storey__; every current export has a\n"
        "//                   building group and a ground group.\n"
        "//                   THE LEGACY FALLBACK. The one older export, 2026/60834__Clough, is a single\n"
        "//                   ValeVision__LegacyModel bucket holding no building token, so its planes take this\n"
        "//                   file's own usedFallback: sized from everything that is not ground (the landscape\n"
        "//                   included, as it sits inside the bucket) and standing on the bucket's foot plus\n"
        "//                   the lift - a degrade, not a failure.\n"
        "// - Divergences   :\n"
        "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
        "// - Back-port     : none in code. TrueVision's own PORT NOTE line about ValeVision's category keys\n"
        "//                   is stale (S02a-F43): a comment-only fix for the TrueVision lane (DR-36).\n"
    ),
    "Na__DrawingPlanes__PlaneMesh__.js": head("Na__DrawingPlanes__PlaneMesh__.js") + (
        "// - Parity        : verbatim, and inert: only Na__DrawingPlanes__Overlay__ owns plane handles, and\n"
        "//                   that arrives with W2-01. Its helper marks are the ones ValeVision's elevation\n"
        "//                   PlaneGizmo and North CompassGizmo already carry (layer 1, naSectionCutHelper, a\n"
        "//                   late render order). ValeVision's own section engine (41__System__CrossSectionView,\n"
        "//                   DIV-2) reads naCrossSectionHelper, not naSectionCutHelper, but clips only what\n"
        "//                   sits under the model root, and the overlay keeps every plane in the scene,\n"
        "//                   outside it - so no plane is cut there either.\n"
        "// - Divergences   :\n"
        "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
        "// - Back-port     : none.\n"
    ),
}

# Each seam: (TV bytes, VV bytes, expected count). Applied in order; reversed for the round trip.
def seams_for(name):
    s = [(b"// TRUEVISION3D - DRAWING PLANES - ", b"// VALEVISION3D - DRAWING PLANES - ", 1)]
    tv_note = TV_PORT_NOTE_BOUNDS if name == "Na__DrawingPlanes__Bounds__.js" else TV_PORT_NOTE_STD
    s.append((tv_note, VV_PORT_NOTE[name].encode("utf-8"), 1))
    if name == "Na__DrawingPlanes__ConfigState__.js":
        s.append((b"console.warn('[TrueVision3D] Drawing planes config", b"console.warn('[ValeVision3D] Drawing planes config", 2))
    return s

FILES = [
    "Na__DrawingPlanes__Maths__.js",
    "Na__DrawingPlanes__ConfigState__.js",
    "Na__DrawingPlanes__AppConfig__.json",     # verbatim, no seam (JSON carries no header)
    "Na__DrawingPlanes__Bounds__.js",
    "Na__DrawingPlanes__PlaneMesh__.js",
]

def tv_bytes(name):
    return subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + TVAPP + REL + name],
                          capture_output=True, check=True).stdout

def build(name, src):
    out = src
    if name.endswith(".json"):
        return out
    for old, new, n in seams_for(name):
        c = out.count(old)
        if c != n:
            raise SystemExit("STOP: seam count mismatch in %s: expected %d, found %d for %r" % (name, n, c, old[:60]))
        out = out.replace(old, new)
    return out

def unbuild(name, vv):
    out = vv
    if name.endswith(".json"):
        return out
    for old, new, n in reversed(seams_for(name)):
        c = out.count(new)
        if c != n:
            raise SystemExit("ROUND TRIP FAIL: %s: expected %d of %r, found %d" % (name, n, new[:60], c))
        out = out.replace(new, old)
    return out

def main():
    check_only = "--check" in sys.argv
    target_dir = os.path.join(VVAPP, REL.replace("/", os.sep))
    plan = []
    for name in FILES:
        src = tv_bytes(name)
        if b"\r\n" in src:
            raise SystemExit("STOP: TV bytes for %s carry CRLF; expected LF from git show" % name)
        vv = build(name, src)
        if unbuild(name, vv) != src:
            raise SystemExit("STOP: round trip failed in memory for %s" % name)
        plan.append((name, src, vv))

    if check_only:
        ok = True
        for name, src, vv in plan:
            path = os.path.join(target_dir, name)
            if not os.path.exists(path):
                print("MISSING", path); ok = False; continue
            with open(path, "rb") as f:
                have = f.read()
            same = (have == vv)
            back = (unbuild(name, have) == src)
            print("%-40s landed==expected:%s  seams-undone==TV@%s:%s  %d bytes  LF-only:%s  sha1 %s"
                  % (name, same, PIN, back, len(have), b"\r\n" not in have, hashlib.sha1(have).hexdigest()[:12]))
            ok = ok and same and back
        print("CHECK", "PASS" if ok else "FAIL")
        sys.exit(0 if ok else 1)

    existing = [n for n, _, _ in plan if os.path.exists(os.path.join(target_dir, n))]
    if existing:
        raise SystemExit("STOP: target already exists (another writer or a re-run): " + ", ".join(existing))
    os.makedirs(target_dir, exist_ok=True)
    for name, src, vv in plan:
        path = os.path.join(target_dir, name)
        with open(path, "xb") as f:                                   # x: never overwrite
            f.write(vv)
        print("wrote", path, len(vv), "bytes (TV", len(src), "bytes)")
    print("PORT DONE")

if __name__ == "__main__":
    main()
