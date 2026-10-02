"""Grep TrueVision's devlog AT THE PIN (git show, bytes) for W0-14's modules - read only.

Prints each matching line with the nearest preceding release heading, so every Source version line
in a PORT NOTE can name the TrueVision release that carried it.
"""
import re
import subprocess
import sys

PIN = "b2aa9151"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PATH = "na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md"

raw = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + PATH], capture_output=True, check=True).stdout
text = raw.decode("utf-8", errors="replace").splitlines()

pattern = re.compile(sys.argv[1] if len(sys.argv) > 1 else r"R2AssetUpload|LayoutEditor__Assets__|ProjectedLinework__Persistence|Thumbnail__Renderer|CaptureAndUpload")
heading = re.compile(r"^#{1,3} .*v2\.\d+\.\d+")

current = None
current_no = None
for no, line in enumerate(text, 1):
    if heading.match(line):
        current = line.strip()
        current_no = no
    if pattern.search(line):
        print(f"{no}: [{current_no}: {current}]")
        print("    " + line.strip()[:400])
