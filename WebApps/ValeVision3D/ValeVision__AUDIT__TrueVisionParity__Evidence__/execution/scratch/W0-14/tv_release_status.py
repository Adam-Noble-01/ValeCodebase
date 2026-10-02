"""For each named TrueVision release, print its devlog entry's confirmation markers (read at the pin, read only).

Usage: python tv_release_status.py v2.18.0 v2.19.0 v2.21.0 v2.32.1 v2.54.0
"""
import re
import subprocess
import sys

PIN = "b2aa9151"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PATH = "na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md"

raw = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + PATH], capture_output=True, check=True).stdout
lines = raw.decode("utf-8", errors="replace").splitlines()

heading = re.compile(r"^#{1,3} +(#+ )?TrueVision3D (v2\.\d+\.\d+)")
markers = re.compile(r"(?i)NOT tried|not yet tried|awaiting|sign-?off|signed off|Adam tested|tested it|Adam confirmed|confirmed by Adam|untested|not tested|Adam: ")

entries = {}
order = []
current = None
for no, line in enumerate(lines, 1):
    m = heading.match(line)
    if m:
        current = m.group(2)
        if current not in entries:
            entries[current] = []
            order.append(current)
        entries[current].append((no, line))
        continue
    if current:
        entries[current].append((no, line))

for version in sys.argv[1:]:
    rows = entries.get(version)
    if not rows:
        print(f"== {version}: no entry")
        continue
    print(f"== {version}: lines {rows[0][0]}-{rows[-1][0]}  {rows[0][1].strip()[:150]}")
    hits = [(no, l) for no, l in rows if markers.search(l)]
    if not hits:
        print("   (no confirmation / sign-off marker in the entry)")
    for no, l in hits:
        print(f"   {no}: {l.strip()[:300]}")
