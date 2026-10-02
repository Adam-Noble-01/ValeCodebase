import subprocess, re
REPO = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
WANT = {"v2.95.0", "v2.97.0", "v2.98.0", "v2.99.0", "v2.157.0", "v2.162.0", "v2.165.0", "v2.167.0", "v2.168.0",
        "v2.169.0", "v2.170.0", "v2.171.0", "v2.172.0"}
txt = subprocess.run(["git", "-C", REPO, "show", PIN + ":na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md"],
                     capture_output=True, check=True).stdout.decode("utf-8", "replace")
lines = txt.split("\n")
cur = None
for i, l in enumerate(lines, 1):
    m = re.match(r"^##\s+TrueVision3D\s+(v[\d.]+)\s+", l)
    if m:
        cur = m.group(1) if m.group(1) in WANT else None
        if cur:
            print("##", cur, i)
        continue
    if cur and re.search(r"NOT |[Cc]onfirmed|[Tt]ried|Not done|h4|29-Sep|Styles__Statement|document stylesheet|chrome stylesheet|editor stylesheet", l):
        print("    ", i, l.strip()[:200])
