"""W1-36 scratch: read TV's devlog at the pin and print the release entries this package covers."""
import re
import subprocess
import sys
import os

PIN = "b2aa9151"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
REL = "na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md"
HERE = os.path.dirname(os.path.abspath(__file__))

WANT = sys.argv[1:] or ["2.111.0", "2.112.0", "2.115.0", "2.135.0"]


def main():
    r = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + REL], capture_output=True)
    if r.returncode != 0:
        print("cannot read devlog", r.stderr.decode("utf-8", "replace"))
        return 1
    text = r.stdout.decode("utf-8", "replace").replace("\r\n", "\n")
    with open(os.path.join(HERE, "tv", "TrueVision__DEVLOG__.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    lines = text.split("\n")
    heads = [i for i, l in enumerate(lines) if re.match(r"^##\s+TrueVision3D\s+v\d+\.\d+\.\d+", l) or re.match(r"^##\s+.*v2\.\d+\.\d+", l)]
    for want in WANT:
        for idx, i in enumerate(heads):
            if ("v" + want) in lines[i]:
                end = heads[idx + 1] if idx + 1 < len(heads) else len(lines)
                print("=" * 100)
                print("LINE %d" % (i + 1))
                print("\n".join(lines[i:end]))
                break
        else:
            print("NOT FOUND", want)
    return 0


if __name__ == "__main__":
    sys.exit(main())
