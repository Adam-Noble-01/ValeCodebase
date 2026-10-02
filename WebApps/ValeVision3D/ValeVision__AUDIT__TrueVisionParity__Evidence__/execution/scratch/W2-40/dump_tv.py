# W2-40 scratch: dump the five TV files at the pin (bytes, exactly as git show returns them)
import subprocess, os, hashlib

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
APP = "na-apps/30__TrueVision__CoreAppCode/"
FILES = [
    "02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__Maths__.js",
    "02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__ConfigState__.js",
    "02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__AppConfig__.json",
    "02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__Bounds__.js",
    "02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__PlaneMesh__.js",
]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tv")
os.makedirs(OUT, exist_ok=True)
for rel in FILES:
    data = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + APP + rel],
                          capture_output=True, check=True).stdout
    name = os.path.basename(rel)
    with open(os.path.join(OUT, name), "wb") as f:
        f.write(data)
    crlf = data.count(b"\r\n")
    lf = data.count(b"\n")
    print(f"{name}: {len(data)} bytes, {lf} LF, {crlf} CRLF, sha1 {hashlib.sha1(data).hexdigest()[:12]}")
