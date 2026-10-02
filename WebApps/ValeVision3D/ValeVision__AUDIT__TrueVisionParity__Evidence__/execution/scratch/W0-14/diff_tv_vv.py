"""Unified diff TV (at the pin) -> a VV file, EOL-normalised, for review. Read only.

Usage: python diff_tv_vv.py <file name> [vv path]   (default vv path: scratch/W0-14/preimage/<file name>)
"""
import difflib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
name = sys.argv[1]
vv_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "preimage", name)

tv = open(os.path.join(HERE, "tv", name), "rb").read().decode("utf-8").replace("\r\n", "\n").split("\n")
vv = open(vv_path, "rb").read().decode("utf-8").replace("\r\n", "\n").split("\n")

for line in difflib.unified_diff(tv, vv, "TV@b2aa9151/" + name, "VV/" + os.path.basename(vv_path), n=1, lineterm=""):
    print(line)
