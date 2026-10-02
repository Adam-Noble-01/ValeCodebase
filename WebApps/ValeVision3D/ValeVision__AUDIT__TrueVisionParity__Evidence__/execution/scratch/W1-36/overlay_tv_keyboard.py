"""W1-36 scratch proof: the 7 DrawingTabKeys failures belong to the sheet keyboard units (W3-01 / W3-03), not to W1-36.

Builds a second overlay: the same files as overlay_run.py (live + this package's built files), except
SheetTools__State__ and SheetTools__Keyboard__, which are TrueVision's at the pin. Runs the VV-seamed
Na__Test__DrawingTabKeys__ on it. Nothing in the live tree is read for writing or written.
"""
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import overlay_run  # noqa: E402

PIN = "b2aa9151"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TVAPP = "na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/"
OVER = os.path.join(HERE, "overlay_tvkb")
OVER_SRC = os.path.join(OVER, "02__Src__AppModules")
FROM_TV = [
    "51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__State__.js",
    "51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js",
]


def main():
    if os.path.exists(OVER):
        shutil.rmtree(OVER)
    for rel in overlay_run.READ_BY_TESTS:
        dst = os.path.join(OVER_SRC, rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if rel in FROM_TV:
            r = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + TVAPP + rel], capture_output=True)
            if r.returncode != 0:
                print("cannot read TV", rel)
                return 2
            open(dst, "wb").write(r.stdout)
            print("TV@pin", rel)
            continue
        built = os.path.join(overlay_run.OUT_SRC, rel.replace("/", os.sep))
        src = built if os.path.exists(built) else os.path.join(overlay_run.SRC_LIVE, rel.replace("/", os.sep))
        shutil.copyfile(src, dst)
        print(("built " if src == built else "live  ") + rel)
    name = "Na__Test__DrawingTabKeys__.test.mjs"
    b = open(os.path.join(HERE, "out", "80__Testing__PrototypeEnvironment", name), "rb").read()
    b = b.replace(overlay_run.OLD, ("const SRC        = " + repr(OVER_SRC.replace("\\", "/")) + ";").encode("utf-8"))
    tdir = os.path.join(OVER, "tests")
    os.makedirs(tdir, exist_ok=True)
    p = os.path.join(tdir, name)
    open(p, "wb").write(b)
    r = subprocess.run(["node", p], capture_output=True, text=True, encoding="utf-8", errors="replace")
    log = os.path.join(HERE, "overlay_tvkb__" + name + ".log")
    open(log, "w", encoding="utf-8").write(r.stdout + r.stderr)
    print("%s exit=%d pass=%d fail=%d (%s)" % (name, r.returncode, r.stdout.count("  PASS  "), r.stdout.count("  FAIL  "), os.path.basename(log)))
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
