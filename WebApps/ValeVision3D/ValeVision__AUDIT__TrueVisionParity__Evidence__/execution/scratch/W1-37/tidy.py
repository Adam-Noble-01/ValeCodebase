"""W1-37 scratch hygiene: compile every scratch .py into the OS temp folder (no __pycache__ here), delete the
TrueVision text copies fetch_tv.py made (NA markers; fetch_tv.py regenerates them), and remove the three temporary
modules TrueVision's own test leaves in the OS temp folder when run (tv_test_against_vv.py).
"""
import glob
import os
import py_compile
import shutil
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
tmp = tempfile.mkdtemp(prefix="w1_37_pyc_")
ok = 0
for path in sorted(glob.glob(os.path.join(HERE, "*.py"))):
    py_compile.compile(path, cfile=os.path.join(tmp, os.path.basename(path) + "c"), doraise=True)
    ok += 1
shutil.rmtree(tmp, ignore_errors=True)
print(f"py_compile: {ok} scratch script(s) compile")

tv = os.path.join(HERE, "tv")
if os.path.isdir(tv):
    shutil.rmtree(tv)
    print("removed scratch/W1-37/tv/ (TrueVision text copies)")

for name in ("Na__Test__PaletteManager__.mjs", "Na__Test__PaletteManagerTwo__.mjs", "Na__Test__PalettePicker__.mjs"):
    path = os.path.join(tempfile.gettempdir(), name)
    if os.path.exists(path):
        os.remove(path)
        print("removed OS temp " + name)
