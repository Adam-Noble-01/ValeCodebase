# W1-26 scratch: print a TrueVision release's heading, title and its confirmation-style lines
# (devlog read at the pin). Usage: python -B devlog_release.py v2.90.0 v2.104.0 ...
import re
import subprocess
import sys

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"

data = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md"],
                      capture_output=True, check=True).stdout.decode("utf-8").replace("\r\n", "\n").split("\n")
heads = [i for i, l in enumerate(data) if re.match(r"^## TrueVision3D v", l)]
WORDS = ("tried", "sign-off", "signed off", "confirmed by adam", "confirmed", "not verified", "not yet", "not in valevision", "adam's")
for ver in sys.argv[1:]:
    hit = [h for h in heads if re.match(r"^## TrueVision3D " + re.escape(ver) + r"\b", data[h])]
    if not hit:
        print("\n" + ver + ": no heading")
        continue
    start = hit[0]
    after = [h for h in heads if h > start]
    end = after[0] if after else len(data)
    title = next((data[k] for k in range(start + 1, min(end, start + 6)) if data[k].startswith("### ")), "")
    print("\n%d: %s   %s" % (start + 1, data[start].strip(), title.strip()[:150]))
    for k in range(start, end):
        low = data[k].lower()
        if any(w in low for w in WORDS):
            print("   %d: %s" % (k + 1, data[k].strip()[:240]))
