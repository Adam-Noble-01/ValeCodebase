# W2-03 scratch: extract the TV source files at pin b2aa9151 into scratch/W2-03/tv/ (bytes, exactly as git show returns them)
import os
import subprocess
import hashlib

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
APP = "na-apps/30__TrueVision__CoreAppCode/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tv")

FILES = [
    "02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__RenderLayer__.js",
    "02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__DevMenu__Row__.js",
    "02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__Styles__DevMenu__.css",
    "02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ModeController__.js",
    "02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js",
    "02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js",
    "02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js",
    "02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js",
    "02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js",
    "03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css",
    "Index.html",
    "TrueVision__PLAN__ElevationDepthFog__.md",
]

for rel in FILES:
    data = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + APP + rel], capture_output=True, check=True).stdout
    dst = os.path.join(OUT, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(data)
    crlf = data.count(b"\r\n")
    lf = data.count(b"\n")
    print("%-90s %7d bytes  lines %5d  crlf %d  sha1 %s" % (rel, len(data), lf, crlf, hashlib.sha1(data).hexdigest()[:12]))
