"""Read the four TrueVision sources of W0-14 at the pin (bytes, via git show) into scratch/W0-14/tv/.

Also snapshots the current VV files (pre-images) into scratch/W0-14/preimage/ with their SHA-256,
so the package can prove nothing changed under it and can restore its own edits.
"""
import hashlib
import json
import os
import subprocess
import sys

PIN = "b2aa9151"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TV_APP = "na-apps/30__TrueVision__CoreAppCode"
VV_ROOT = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE = os.path.dirname(os.path.abspath(__file__))

FILES = [
    "02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__Assets__.js",
    "02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js",
    "02__Src__AppModules/03__AppUtils/Na__AppUtils__R2AssetUpload__.js",
    "02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js",
]


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def main():
    write_pre = "--no-preimage" not in sys.argv
    tv_dir = os.path.join(HERE, "tv")
    pre_dir = os.path.join(HERE, "preimage")
    os.makedirs(tv_dir, exist_ok=True)
    os.makedirs(pre_dir, exist_ok=True)
    manifest = {"pin": PIN, "tv": {}, "vv": {}}
    for rel in FILES:
        name = os.path.basename(rel)
        out = subprocess.run(
            ["git", "-C", NAWEB, "show", PIN + ":" + TV_APP + "/" + rel],
            capture_output=True,
            check=True,
        ).stdout
        with open(os.path.join(tv_dir, name), "wb") as fh:
            fh.write(out)
        manifest["tv"][rel] = {
            "bytes": len(out),
            "sha256": sha256(out),
            "crlf": out.count(b"\r\n"),
            "lf": out.count(b"\n"),
        }
        vv_path = os.path.join(VV_ROOT, rel.replace("/", os.sep))
        with open(vv_path, "rb") as fh:
            vv = fh.read()
        if write_pre:
            with open(os.path.join(pre_dir, name), "wb") as fh:
                fh.write(vv)
        manifest["vv"][rel] = {
            "bytes": len(vv),
            "sha256": sha256(vv),
            "crlf": vv.count(b"\r\n"),
            "lf": vv.count(b"\n"),
            "bom": vv.startswith(b"\xef\xbb\xbf"),
        }
    if write_pre:
        with open(os.path.join(HERE, "preimage_manifest.json"), "w", encoding="utf-8") as fh:
            json.dump(manifest, fh, indent=1)
    print(json.dumps(manifest, indent=1))


if __name__ == "__main__":
    main()
