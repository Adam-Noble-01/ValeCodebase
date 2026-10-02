"""W1-33 - read the TrueVision sources at the pin (git show, bytes) into scratch/W1-33/tv/.

TrueVision is read-only: only `git show <pin>:<path>` is used, never the working tree.
"""
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
    "02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js",
    "02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css",
    "03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css",
    "03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css",
]


def main():
    os.makedirs(OUT, exist_ok=True)
    for rel in FILES:
        data = subprocess.run(
            ["git", "-C", NAWEB, "show", f"{PIN}:{APP}{rel}"],
            check=True, capture_output=True).stdout
        name = os.path.basename(rel)
        open(os.path.join(OUT, name), "wb").write(data)
        crlf = data.count(b"\r\n")
        print(f"{hashlib.sha1(data).hexdigest()[:8]}  {len(data):>7} bytes  lines {data.count(b'\n'):>5}  CRLF {crlf}  {rel}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
