# W1-17 - read TrueVision's devlog at the pin (bytes) into scratch/W1-17/tv/ for the Source version research.
import os
import subprocess

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
REL = "na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "tv", "TrueVision__DEVLOG__.md")

data = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + REL], check=True, capture_output=True).stdout
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "wb") as fh:
    fh.write(data)
print(len(data), "bytes ->", OUT)
