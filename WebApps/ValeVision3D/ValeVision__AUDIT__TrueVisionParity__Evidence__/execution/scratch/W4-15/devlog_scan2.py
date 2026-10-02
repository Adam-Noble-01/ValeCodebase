import subprocess, re
REPO = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
txt = subprocess.run(["git", "-C", REPO, "show", PIN + ":na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md"],
                     capture_output=True, check=True).stdout.decode("utf-8", "replace")
lines = txt.split("\n")
cur = None
for i, l in enumerate(lines, 1):
    m = re.match(r"^##\s+TrueVision3D\s+v2\.(\d+)\.(\d+)\s+-\s+(.*)$", l)
    if m:
        minor = int(m.group(1))
        cur = minor if minor >= 158 else None
        if cur:
            print("##", "v2.%s.%s" % (m.group(1), m.group(2)), i, m.group(3)[:60], "|", (lines[i] if i < len(lines) else "")[:120])
        continue
    if cur and ((("Statement" in l) and (".css" in l or "stylesheet" in l.lower() or "08__Style" in l)) or "tried by Adam" in l or "NOT tried" in l):
        print("    ", i, l.strip()[:220])
