"""W1-33 - capture pre-images (bytes) and SHA-1s of the seven owned files.

Run once before any edit. Writes scratch/W1-33/preimage/<name> and preimage/sha1.json.
Refuses to overwrite an existing capture (so a re-run never loses the true pre-image).
"""
import hashlib
import json
import os
import sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "preimage")

FILES = [
    r"02__Src__AppModules\51__System__LayoutEditor\01__Core__Loader\Na__LayoutEditor__Loader__.js",
    r"02__Src__AppModules\51__System__LayoutEditor\01__Core__Loader\Na__LayoutEditor__LoadingScreen__.js",
    r"02__Src__AppModules\51__System__LayoutEditor\01__Core__Loader\Na__LayoutEditor__Styles__Boot__.css",
    r"02__Src__AppModules\51__System__LayoutEditor\05__Core__ModeController\Na__LayoutEditor__LoadingVeil__.js",
    r"02__Src__AppModules\51__System__LayoutEditor\05__Core__ModeController\Na__LayoutEditor__ModeController__.js",
    r"02__Src__AppModules\51__System__LayoutEditor\10__Core__SheetSurface\Na__LayoutEditor__Styles__Main__.css",
    r"03__Style__AppStylesheets\Na__UiFeature__Styles__LoadingOverlays__.css",
]


def main():
    if os.path.exists(os.path.join(OUT, "sha1.json")) and "--force" not in sys.argv:
        print("pre-image already captured; refusing to overwrite (pass --force)")
        return 1
    os.makedirs(OUT, exist_ok=True)
    table = {}
    for rel in FILES:
        path = os.path.join(VV, rel)
        data = open(path, "rb").read()
        sha = hashlib.sha1(data).hexdigest()
        crlf = data.count(b"\r\n")
        lf = data.count(b"\n") - crlf
        name = os.path.basename(rel)
        open(os.path.join(OUT, name), "wb").write(data)
        table[rel] = {"sha1": sha, "bytes": len(data), "crlf": crlf, "bare_lf": lf}
        print(f"{sha[:8]}  {len(data):>7} bytes  CRLF {crlf:>5}  LF {lf:>5}  {rel}")
    json.dump(table, open(os.path.join(OUT, "sha1.json"), "w"), indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
