"""Find TV devlog entries (at the pin) that mention the colour palette; print headers and the matching lines."""
import re
import subprocess
import sys

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
APP = "na-apps/30__TrueVision__CoreAppCode/"

blob = subprocess.run(
    ["git", "-C", NAWEB, "show", f"{PIN}:{APP}TrueVision__DEVLOG__.md"],
    capture_output=True, check=True,
).stdout.decode("utf-8", errors="replace")
lines = blob.split("\n")

pattern = re.compile(sys.argv[1] if len(sys.argv) > 1 else r"ColourPalette|Colour Palette|colour palette", re.I)
header_re = re.compile(r"^##\s+TrueVision3D\s+v(\d+\.\d+\.\d+)")

current = None
hits = {}
for i, line in enumerate(lines, 1):
    m = header_re.match(line)
    if m:
        current = (m.group(1), i, line.strip())
    if pattern.search(line) and current:
        hits.setdefault(current, []).append((i, line.strip()[:220]))

for (ver, at, head), rows in hits.items():
    print(f"== {head}  (line {at})")
    for i, text in rows[:12]:
        print(f"   {i}: {text}")
