"""W1-36 scratch: dump the TV files at the pin and pre-images of the VV files this package edits."""
import hashlib
import os
import shutil
import subprocess
import sys

PIN = "b2aa9151"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TVAPP = "na-apps/30__TrueVision__CoreAppCode/"
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE = os.path.dirname(os.path.abspath(__file__))

TV_FILES = [
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Navigation__.js",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__TouchScreen__.js",
    "02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js",
    "02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js",
    "80__Testing__PrototypeEnvironment/Na__Test__AuthoringZoomMax__.test.mjs",
    "80__Testing__PrototypeEnvironment/Na__Test__SheetPagingWalkExit__.test.mjs",
    "80__Testing__PrototypeEnvironment/Na__Test__DrawingTabKeys__.test.mjs",
]

VV_FILES = [
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Navigation__.js",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__TouchScreen__.js",
    "02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js",
    "02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js",
]


def sha(b):
    return hashlib.sha256(b).hexdigest()


def main():
    out_tv = os.path.join(HERE, "tv")
    out_pre = os.path.join(HERE, "pre")
    for rel in TV_FILES:
        r = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + TVAPP + rel], capture_output=True)
        if r.returncode != 0:
            print("MISSING TV", rel, r.stderr.decode("utf-8", "replace").strip())
            continue
        name = os.path.basename(rel)
        with open(os.path.join(out_tv, name), "wb") as f:
            f.write(r.stdout)
        crlf = r.stdout.count(b"\r\n")
        print("TV  %-60s %7d B  crlf=%d sha=%s" % (name, len(r.stdout), crlf, sha(r.stdout)[:16]))
    for rel in VV_FILES:
        p = os.path.join(VV, rel.replace("/", os.sep))
        if not os.path.exists(p):
            print("MISSING VV", rel)
            continue
        b = open(p, "rb").read()
        name = os.path.basename(rel)
        dst = os.path.join(out_pre, name)
        if not os.path.exists(dst):
            shutil.copyfile(p, dst)
        crlf = b.count(b"\r\n")
        lf = b.count(b"\n") - crlf
        print("VV  %-60s %7d B  crlf=%d lf=%d sha=%s" % (name, len(b), crlf, lf, sha(b)[:16]))


if __name__ == "__main__":
    sys.exit(main())
