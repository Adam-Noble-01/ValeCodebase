"""Extract the TrueVision files W1-15 reads, at the pin b2aa9151, as raw bytes.

Writes into the SESSION scratchpad (outside the repository: these copies carry
TrueVision / Noble Architecture text), mirroring TrueVision's app layout, so
TrueVision's own test can be run there as a baseline.
Read-only on TrueVision (git show at the pin).

    python extract_tv.py <out_dir>
"""
import os
import subprocess
import sys

PIN = "b2aa9151"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
APP = "na-apps/30__TrueVision__CoreAppCode/"

FILES = [
    "02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Encoder__.js",
    "02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Painter__.js",
    "02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Symbol__.js",
    "02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__ProjectLink__.js",
    "02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json",
    "02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/README__ProjectQrCode__.md",
    "02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json",
    "02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js",
    "80__Testing__PrototypeEnvironment/Na__Test__ProjectQr__.test.mjs",
    "80__Testing__PrototypeEnvironment/Na__Test__ProjectQr__Decode__.py",
    "TrueVision__DEVLOG__.md",
]


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    out = sys.argv[1]
    for rel in FILES:
        spec = PIN + ":" + APP + rel
        res = subprocess.run(["git", "-C", NAWEB, "show", spec], capture_output=True)
        if res.returncode != 0:
            print("FAIL", rel, res.stderr.decode("utf-8", "replace"))
            return 1
        dest = os.path.join(out, rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as fh:
            fh.write(res.stdout)
        print("OK", len(res.stdout), "bytes", "crlf=" + str(res.stdout.count(b"\r\n")), rel)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
