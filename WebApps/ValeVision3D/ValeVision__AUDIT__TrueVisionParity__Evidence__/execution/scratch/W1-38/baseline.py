"""W1-38 scratch: record sha1 / size / line endings of the files this package writes, and keep pre-images.

Usage: python -B baseline.py <label>       writes <label>_sha1.txt (and, for label 'baseline', preimage/ copies)
"""
import hashlib
import os
import shutil
import sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE = os.path.dirname(os.path.abspath(__file__))
FILES = [
    r"02__Src__AppModules\51__System__LayoutEditor\40__Ui__Panels\Na__LayoutEditor__PanelHost__.js",
    r"02__Src__AppModules\51__System__LayoutEditor\40__Ui__Panels\Na__LayoutEditor__Styles__Panels__.css",
    r"80__Testing__PrototypeEnvironment\Na__Test__ColourPalette__.test.mjs",
]
label = sys.argv[1]
rows = []
for rel in FILES:
    path = os.path.join(VV, rel)
    if not os.path.exists(path):
        rows.append(f"{rel}\tABSENT")
        continue
    data = open(path, "rb").read()
    crlf = data.count(b"\r\n")
    lf = data.count(b"\n")
    eol = "CRLF" if crlf and crlf == lf else ("LF" if crlf == 0 else f"MIXED({crlf}/{lf})")
    rows.append(f"{rel}\t{hashlib.sha1(data).hexdigest()}\t{len(data)} bytes\t{lf} lines\t{eol}")
    if label == "baseline":
        dst = os.path.join(HERE, "preimage", os.path.basename(rel))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if not os.path.exists(dst):
            shutil.copyfile(path, dst)
out = os.path.join(HERE, f"{label}_sha1.txt")
with open(out, "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(rows) + "\n")
print("\n".join(rows))
