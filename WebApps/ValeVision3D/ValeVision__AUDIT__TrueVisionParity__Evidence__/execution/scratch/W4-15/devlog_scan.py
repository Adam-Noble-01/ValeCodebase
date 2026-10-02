import subprocess, re, os
REPO = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
txt = subprocess.run(["git", "-C", REPO, "show", PIN + ":na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md"],
                     capture_output=True, check=True).stdout.decode("utf-8", "replace")
lines = txt.split("\n")
cur = None
hits = {}
for i, l in enumerate(lines, 1):
    m = re.match(r"^##\s+TrueVision3D\s+(v[\d.]+)\s+-\s+(.*)$", l)
    if m:
        cur = (m.group(1), i, m.group(2)[:110])
        continue
    if "Styles__Statement" in l:
        hits.setdefault(cur, []).append((i, l.strip()[:200]))
for k, v in hits.items():
    print("==", k)
    for i, l in v:
        print("   ", i, l)
# Also: lines near 'tried by Adam' or 'NOT tried' for those versions
