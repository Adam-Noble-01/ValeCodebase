"""Print a line range of TV's devlog at the pin (for reading release entries)."""
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
start, end = int(sys.argv[1]), int(sys.argv[2])
for i in range(start, min(end, len(lines)) + 1):
    print(f"{i}: {lines[i - 1]}")
