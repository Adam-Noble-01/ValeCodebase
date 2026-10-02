"""W1-34 - print the unified diff of a built file against its pre-image (line endings folded)."""
import difflib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w134_common import FILES, pre_bytes, built_path  # noqa: E402

for key in sys.argv[1:]:
    before = pre_bytes(key).decode("utf-8").replace("\r\n", "\n").split("\n")
    after = open(built_path(key), "rb").read().decode("utf-8").replace("\r\n", "\n").split("\n")
    print("=" * 30, FILES[key])
    for line in difflib.unified_diff(before, after, "pre", "built", n=2, lineterm=""):
        print(line)
