"""W1-36 scratch: run the three tests on an overlay of the live files the tests read plus this package's built files.

Nothing in the live tree is written. Usage: python overlay_run.py [--tv-tests]
  default      the VV-seamed tests built into out/ (SRC repointed at the overlay)
  --tv-tests   TrueVision's tests verbatim (SRC repointed at the overlay)
"""
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SRC_LIVE = os.path.join(VV, "02__Src__AppModules")
OVER = os.path.join(HERE, "overlay")
OVER_SRC = os.path.join(OVER, "02__Src__AppModules")
OUT_SRC = os.path.join(HERE, "out", "02__Src__AppModules")

READ_BY_TESTS = [
    "51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json",
    "51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__Readers__.js",
    "51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js",
    "51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js",
    "51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json",
    "03__AppUtils/Na__AppUtils__KeyScope__.js",
    "51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Navigation__.js",
    "51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js",
    "51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__State__.js",
    "51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js",
    "40__System__DrawingViewCore/Na__DrawView__Transitions__.js",
    "10__NavigationAndCameras/Na__UiFeature__WalkModeControls.js",
    "10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js",
]
TESTS = [
    "Na__Test__AuthoringZoomMax__.test.mjs",
    "Na__Test__SheetPagingWalkExit__.test.mjs",
    "Na__Test__DrawingTabKeys__.test.mjs",
]
OLD = b"const SRC        = resolve(SCRIPT_DIR, '..', '02__Src__AppModules');"


def main():
    tv_tests = "--tv-tests" in sys.argv
    if os.path.exists(OVER):
        shutil.rmtree(OVER)
    for rel in READ_BY_TESTS:
        built = os.path.join(OUT_SRC, rel.replace("/", os.sep))
        src = built if os.path.exists(built) else os.path.join(SRC_LIVE, rel.replace("/", os.sep))
        dst = os.path.join(OVER_SRC, rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(src, dst)
        print(("built " if src == built else "live  ") + rel)
    tdir = os.path.join(OVER, "tests")
    os.makedirs(tdir, exist_ok=True)
    failed = 0
    for name in TESTS:
        src = os.path.join(HERE, "tv", name) if tv_tests else os.path.join(HERE, "out", "80__Testing__PrototypeEnvironment", name)
        b = open(src, "rb").read()
        if b.count(OLD) != 1:
            print("SRC line not found once in", name)
            return 2
        b = b.replace(OLD, ("const SRC        = " + repr(OVER_SRC.replace("\\", "/")) + ";").encode("utf-8"))
        p = os.path.join(tdir, name)
        open(p, "wb").write(b)
        r = subprocess.run(["node", p], capture_output=True, text=True, encoding="utf-8", errors="replace")
        tag = ("tv" if tv_tests else "vv")
        log = os.path.join(HERE, "overlay__%s__%s.log" % (tag, name))
        open(log, "w", encoding="utf-8").write(r.stdout + r.stderr)
        passes = r.stdout.count("  PASS  ")
        fails = r.stdout.count("  FAIL  ")
        print("%-45s exit=%d pass=%d fail=%d  (%s)" % (name, r.returncode, passes, fails, os.path.basename(log)))
        if r.returncode != 0:
            failed += 1
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
