"""Fetch TV sources at the pin and snapshot the current VV targets (W1-28 scratch)."""
import hashlib
import os
import shutil
import subprocess

PIN = "b2aa9151"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TVAPP = "na-apps/30__TrueVision__CoreAppCode/"
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCRATCH = os.path.dirname(os.path.abspath(__file__))

TV_FILES = [
    "02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js",
    "02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__Groups__.js",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css",
    "02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js",
    "02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__VectorQuality__.js",
    "02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__PaintOrder__.js",
    "80__Testing__PrototypeEnvironment/Na__Test__LayerStack__.test.mjs",
    "80__Testing__PrototypeEnvironment/Na__Test__VectorQuality__.test.mjs",
]

VV_FILES = [
    "02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js",
    "02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__Groups__.js",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css",
    "02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js",
]


def git_show(rel):
    return subprocess.run(
        ["git", "-C", NAWEB, "show", f"{PIN}:{TVAPP}{rel}"],
        check=True, capture_output=True,
    ).stdout


def main():
    tv_dir = os.path.join(SCRATCH, "tv")
    before_dir = os.path.join(SCRATCH, "vv_before")
    os.makedirs(tv_dir, exist_ok=True)
    os.makedirs(before_dir, exist_ok=True)
    for rel in TV_FILES:
        data = git_show(rel)
        out = os.path.join(tv_dir, os.path.basename(rel))
        with open(out, "wb") as fh:
            fh.write(data)
        print("TV ", os.path.basename(rel), len(data), "bytes", data.count(b"\r\n"), "CRLF",
              hashlib.sha256(data).hexdigest()[:16])
    for rel in VV_FILES:
        src = os.path.join(VV, rel.replace("/", os.sep))
        if not os.path.exists(src):
            print("VV  (missing)", rel)
            continue
        out = os.path.join(before_dir, os.path.basename(rel))
        if not os.path.exists(out):
            shutil.copyfile(src, out)
        with open(src, "rb") as fh:
            data = fh.read()
        print("VV ", os.path.basename(rel), len(data), "bytes", data.count(b"\r\n"), "CRLF",
              data.count(b"\n") - data.count(b"\r\n"), "bare LF", hashlib.sha256(data).hexdigest()[:16])


if __name__ == "__main__":
    main()
