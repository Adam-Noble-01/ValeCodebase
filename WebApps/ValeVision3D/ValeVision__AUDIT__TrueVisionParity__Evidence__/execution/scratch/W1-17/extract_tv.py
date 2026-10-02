# W1-17 - read every TrueVision source of this package at the pin, as bytes, into scratch/W1-17/tv/.
# Never reads TrueVision's working tree. Run with: python -B extract_tv.py
import hashlib
import os
import subprocess
import sys

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
APP = "na-apps/30__TrueVision__CoreAppCode/"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "tv")

PATHS = [
    "02__Src__AppModules/51__System__LayoutEditor/36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js",
    "02__Src__AppModules/51__System__LayoutEditor/36__System__HatchPatternTools/Na__LayoutEditor__Styles__Patterns__.css",
]


def ls_tree(prefix):
    out = subprocess.run(
        ["git", "-C", NAWEB, "ls-tree", "-r", "--name-only", PIN, "--", APP + prefix],
        check=True, capture_output=True,
    ).stdout.decode("utf-8")
    return [p[len(APP):] for p in out.splitlines() if p.strip()]


def show(rel):
    return subprocess.run(
        ["git", "-C", NAWEB, "show", PIN + ":" + APP + rel],
        check=True, capture_output=True,
    ).stdout


def main():
    paths = list(PATHS) + ls_tree("52__LayoutEditor__HatchPatternLibrary")
    for rel in paths:
        data = show(rel)
        dst = os.path.join(OUT, rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, "wb") as fh:
            fh.write(data)
        crlf = data.count(b"\r\n")
        print("%-120s %9d bytes  crlf=%d  sha256=%s" % (rel, len(data), crlf, hashlib.sha256(data).hexdigest()[:16]))
    print("files:", len(paths))


if __name__ == "__main__":
    sys.exit(main())
