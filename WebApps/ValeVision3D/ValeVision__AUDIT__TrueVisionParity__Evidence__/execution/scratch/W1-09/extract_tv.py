# W1-09 scratch: extract the TV source files at pin b2aa9151 into scratch/W1-09/tv/ (bytes, exactly as git show returns them)
import os
import subprocess
import hashlib

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
APP = "na-apps/30__TrueVision__CoreAppCode/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tv")

FILES = [
    "02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__AppConfig__.json",
    "02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__ConfigState__.js",
    "02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__Maths__.js",
    "02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__RecordData__.js",
    "02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__Shader__.js",
    "02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__RenderLayer__.js",
    "02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__DevMenu__Row__.js",
    "02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__Styles__DevMenu__.css",
    "80__Testing__PrototypeEnvironment/Na__Test__ElevationDepthFog__.test.mjs",
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
