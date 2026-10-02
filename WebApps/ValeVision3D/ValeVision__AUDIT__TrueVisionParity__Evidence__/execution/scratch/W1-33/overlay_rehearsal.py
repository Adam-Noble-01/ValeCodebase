"""W1-33 - copy the built files over a rehearsal copy of the app (never the live tree)."""
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w133_common import HERE, FILES  # noqa: E402

root = sys.argv[1]
if os.path.abspath(root).lower().startswith(r"d:\10_corelib__valecodebase"):
    raise SystemExit("refusing: that is the live tree")
built = os.path.join(HERE, "built")
for key, rel in FILES.items():
    src = os.path.join(built, os.path.basename(rel))
    dst = os.path.join(root, rel)
    shutil.copyfile(src, dst)
    print("overlaid", rel)
