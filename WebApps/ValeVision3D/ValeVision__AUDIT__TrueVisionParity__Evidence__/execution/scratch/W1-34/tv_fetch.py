# W1-34 - read TrueVision files at the pin (git show, bytes) into scratch/W1-34/tv/.
# TrueVision is never edited; its working tree is never read.
import hashlib
import os
import subprocess
import sys

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
APP = "na-apps/30__TrueVision__CoreAppCode/"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "tv")

FILES = [
    "02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js",
    "02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css",
    "02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json",
    "02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css",
    "02__Src__AppModules/51__System__LayoutEditor/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js",
    "TrueVision__DEVLOG__.md",
]


def fetch(rel):
    data = subprocess.run(
        ["git", "-C", NAWEB, "show", PIN + ":" + APP + rel],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    ).stdout
    dst = os.path.join(OUT, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(data)
    return data


def main():
    for rel in FILES:
        data = fetch(rel)
        print(hashlib.sha1(data).hexdigest()[:8], len(data), data.count(b"\r\n"), data.count(b"\n"), rel)


if __name__ == "__main__":
    main()
