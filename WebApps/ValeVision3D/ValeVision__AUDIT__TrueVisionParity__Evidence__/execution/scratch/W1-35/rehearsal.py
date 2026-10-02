"""W1-35 - a rehearsal copy of the app outside the repository, with the built files laid over it.

python rehearsal.py <target folder>   (refuses anything inside the live repository)
Copies the app root's files and the folders the gates read (node_modules, .claude, .cursor, the audit
evidence and the archive left out), then overlays scratch/W1-35/built/*. Never touches the live tree.
"""
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w135_common import VV, FILES, built_path  # noqa: E402

SKIP_DIRS = {"node_modules", ".claude", ".cursor", "00__Archive", "ValeVision__AUDIT__TrueVisionParity__Evidence__", ".git", "__pycache__"}


def main():
    target = os.path.abspath(sys.argv[1])
    if target.lower().startswith(r"d:\10_corelib__valecodebase"):
        raise SystemExit("refusing: that is the live repository")
    if os.path.exists(target):
        shutil.rmtree(target)
    os.makedirs(target)
    for name in os.listdir(VV):
        src = os.path.join(VV, name)
        dst = os.path.join(target, name)
        if os.path.isdir(src):
            if name in SKIP_DIRS:
                continue
            shutil.copytree(src, dst, ignore=shutil.ignore_patterns(*SKIP_DIRS))
        else:
            shutil.copyfile(src, dst)
    for key, rel in FILES.items():
        shutil.copyfile(built_path(key), os.path.join(target, rel))
        print("overlaid", rel)
    print("rehearsal copy ready:", target)


if __name__ == "__main__":
    main()
