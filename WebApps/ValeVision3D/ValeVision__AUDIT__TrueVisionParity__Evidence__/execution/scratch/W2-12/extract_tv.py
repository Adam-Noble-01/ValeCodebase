"""W2-12: read the TrueVision files this package needs at the pin b2aa9151 (read-only) into scratch/W2-12/tv/."""
import os, subprocess, sys

PIN = "b2aa9151"
REPO = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
APP = "na-apps/30__TrueVision__CoreAppCode/"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "tv")

FILES = [
    "02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__DepthFog__.js",
    "02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__Config__.json",
    "02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js",
    "02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js",
    "02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js",
    "02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__.js",
]

os.makedirs(OUT, exist_ok=True)
for rel in FILES:
    data = subprocess.run(["git", "-C", REPO, "show", f"{PIN}:{APP}{rel}"], capture_output=True, check=True).stdout
    dst = os.path.join(OUT, os.path.basename(rel))
    with open(dst, "wb") as fh:
        fh.write(data)
    crlf = data.count(b"\r\n")
    print(f"{len(data):>8} B  crlf={crlf:<5} {rel}")
