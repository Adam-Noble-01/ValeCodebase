# W1-26 scratch: run the two node tests this package changes against the CANDIDATES before anything lands.
# Makes a throwaway app-shaped folder in the OS temp dir holding only what each test reads (the candidate
# test, the candidate AppConfig, the live Cells module), runs the tests there, then deletes it.
#   python -B stage_tests.py
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
CAND = os.path.join(HERE, "candidate")
LE = os.path.join("02__Src__AppModules", "51__System__LayoutEditor")
T80 = "80__Testing__PrototypeEnvironment"


def copy(src, root, rel):
    dst = os.path.join(root, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(src, dst)


def main():
    root = tempfile.mkdtemp(prefix="w1-26-stage-")
    try:
        copy(os.path.join(CAND, T80, "Na__Test__TitleBlockCells__.test.mjs"), root, os.path.join(T80, "Na__Test__TitleBlockCells__.test.mjs"))
        copy(os.path.join(CAND, LE, "03__Core__Config", "Na__LayoutEditor__AppConfig__.json"), root, os.path.join(LE, "03__Core__Config", "Na__LayoutEditor__AppConfig__.json"))
        copy(os.path.join(VV, LE, "10__Core__SheetSurface", "Na__LayoutEditor__TitleBlock__Cells__.js"), root, os.path.join(LE, "10__Core__SheetSurface", "Na__LayoutEditor__TitleBlock__Cells__.js"))
        rc = 0
        for args in ([os.path.join(root, T80, "Na__Test__TitleBlockCells__.test.mjs")],
                     [os.path.join(CAND, T80, "Na__Test__AppConfigParity__.test.mjs"), "--vv-file", os.path.join(CAND, LE, "03__Core__Config", "Na__LayoutEditor__AppConfig__.json")],
                     [os.path.join(VV, T80, "Na__Test__AppConfigParity__.test.mjs"), "--vv-file", os.path.join(CAND, LE, "03__Core__Config", "Na__LayoutEditor__AppConfig__.json")]):
            res = subprocess.run(["node"] + args, cwd=root, capture_output=True, text=True, encoding="utf-8", errors="replace")
            control = args[0].startswith(os.path.join(VV, T80))
            name = os.path.basename(args[0]) + ("  (the LIVE test, candidate config: the CONTROL - must fail)" if control else "  (candidate)")
            print("=== %s  exit %d" % (name, res.returncode))
            print("\n".join("    " + l for l in (res.stdout + res.stderr).rstrip().splitlines()))
            rc |= (0 if res.returncode else 1) if control else res.returncode
        return rc
    finally:
        shutil.rmtree(root, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
