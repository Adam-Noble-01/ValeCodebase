# W1-26 scratch: which TrueVision releases (devlog read at the pin, into the session scratchpad)
# mention a term. Prints the release heading, its first ### line, the matching lines, and every
# confirmation-style line in that entry (tried / sign-off / confirmed / NOT ...).
#   python -B devlog_find.py <term> [<term> ...]
import os
import re
import subprocess
import sys

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"


def devlog_lines():
    data = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md"],
                          capture_output=True, check=True).stdout
    return data.decode("utf-8").replace("\r\n", "\n").split("\n")


def main(terms):
    lines = devlog_lines()
    heads = [i for i, l in enumerate(lines) if re.match(r"^## TrueVision3D v", l)]
    shown = set()
    for i, line in enumerate(lines):
        if not any(t in line for t in terms):
            continue
        start = max([h for h in heads if h <= i], default=None)
        if start is None:
            continue
        if start not in shown:
            shown.add(start)
            after = [h for h in heads if h > start]
            end = after[0] if after else len(lines)
            sub = next((lines[k] for k in range(start + 1, min(end, start + 6)) if lines[k].startswith("### ")), "")
            print("\n%d: %s   %s" % (start + 1, lines[start].strip()[:200], sub.strip()[:160]))
            for k in range(start, end):
                low = lines[k].lower()
                if any(w in low for w in ("tried", "sign-off", "signed off", "confirmed", "not verified", "not yet", "not in valevision")):
                    print("   conf %d: %s" % (k + 1, lines[k].strip()[:230]))
        print("   %d: %s" % (i + 1, line.strip()[:230]))


if __name__ == "__main__":
    main(sys.argv[1:])
