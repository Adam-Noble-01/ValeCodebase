"""W1-36 scratch: copies of TV's three tests with SRC pointed at a chosen 02__Src__AppModules root.

Usage: python make_scratch_tests.py <src_root> <out_dir>
Writes <out_dir>/<test name> for each of the three tests; nothing else is changed.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TESTS = [
    "Na__Test__AuthoringZoomMax__.test.mjs",
    "Na__Test__SheetPagingWalkExit__.test.mjs",
    "Na__Test__DrawingTabKeys__.test.mjs",
]
OLD = b"const SRC        = resolve(SCRIPT_DIR, '..', '02__Src__AppModules');"


def main():
    src_root = os.path.abspath(sys.argv[1])
    out_dir = os.path.abspath(sys.argv[2])
    os.makedirs(out_dir, exist_ok=True)
    for name in TESTS:
        b = open(os.path.join(HERE, "tv", name), "rb").read()
        if b.count(OLD) != 1:
            print("SRC line not found once in", name)
            return 1
        new = ("const SRC        = " + repr(src_root.replace("\\", "/")) + ";").encode("utf-8")
        b = b.replace(OLD, new)
        with open(os.path.join(out_dir, name), "wb") as f:
            f.write(b)
        print("wrote", os.path.join(out_dir, name))
    return 0


if __name__ == "__main__":
    sys.exit(main())
