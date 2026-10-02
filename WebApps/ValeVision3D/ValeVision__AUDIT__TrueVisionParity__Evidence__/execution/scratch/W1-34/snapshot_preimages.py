# W1-34 - take pre-images of the seven files this package owns and print their SHA-1s,
# line-ending counts and sizes. Writes only into scratch/W1-34/preimage/.
import hashlib
import json
import os
import shutil
import sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, "preimage")

FILES = [
    r"02__Src__AppModules\51__System__LayoutEditor\01__Core__Loader\Na__LayoutEditor__Loader__.js",
    r"02__Src__AppModules\51__System__LayoutEditor\01__Core__Loader\Na__LayoutEditor__Styles__Boot__.css",
    r"02__Src__AppModules\51__System__LayoutEditor\03__Core__Config\Na__LayoutEditor__AppConfig__.json",
    r"02__Src__AppModules\51__System__LayoutEditor\05__Core__ModeController\Na__LayoutEditor__ModeController__.js",
    r"02__Src__AppModules\51__System__LayoutEditor\05__Core__ModeController\Na__LayoutEditor__TabStrip__.js",
    r"02__Src__AppModules\51__System__LayoutEditor\50__Feature__Specification\Na__LayoutEditor__Styles__Specification__.css",
    r"02__Src__AppModules\51__System__LayoutEditor\70__DevTools__DevMenu\Na__LayoutEditor__DevMenu__Controls__.js",
]


def info(path):
    b = open(path, "rb").read()
    crlf = b.count(b"\r\n")
    lf = b.count(b"\n") - crlf
    return {
        "sha1": hashlib.sha1(b).hexdigest(),
        "bytes": len(b),
        "crlf": crlf,
        "bare_lf": lf,
        "bom": b.startswith(b"\xef\xbb\xbf"),
    }


def main():
    take = "--take" in sys.argv
    out = {}
    for rel in FILES:
        p = os.path.join(VV, rel)
        out[rel] = info(p)
        if take:
            dst = os.path.join(PRE, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if os.path.exists(dst):
                print("preimage exists, not overwritten:", rel)
            else:
                shutil.copyfile(p, dst)
    print(json.dumps(out, indent=1))
    if take:
        with open(os.path.join(HERE, "preimage_hashes.json"), "w", encoding="utf-8") as f:
            json.dump(out, f, indent=1)


if __name__ == "__main__":
    main()
