"""For each TV release named, print its title and every line that speaks of Adam's confirmation."""
import re
import subprocess
import sys

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
DEVLOG = "na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md"

WANT = sys.argv[1:]
text = subprocess.run(["git", "-C", NAWEB, "show", f"{PIN}:{DEVLOG}"], check=True, capture_output=True).stdout.decode("utf-8")
lines = text.split("\n")
head = re.compile(r"^## TrueVision3D (v2\.\d+\.\d+)\s+-\s+(\S+)")
sections = {}
current = None
for i, line in enumerate(lines, 1):
    m = head.match(line)
    if m:
        current = m.group(1)
        sections.setdefault(current, {"start": i, "date": m.group(2), "lines": []})
        continue
    if current:
        sections[current]["lines"].append((i, line))

pat = re.compile(r"(confirm|CONFIRM|tried|TRIED|sign-off|signed off|sign off|NOT in ValeVision|Not yet ported|ValeVision:|ValeVision :|not yet|NOT yet)", re.I)
for v in WANT:
    s = sections.get(v)
    if not s:
        print(v, "NOT FOUND")
        continue
    title = next((l for _, l in s["lines"] if l.startswith("### ")), "")
    print("=" * 100)
    print(f"{v}  {s['date']}  (line {s['start']})  {title}")
    for i, l in s["lines"]:
        if pat.search(l):
            print(f"   :{i}  {l.strip()[:220]}")
