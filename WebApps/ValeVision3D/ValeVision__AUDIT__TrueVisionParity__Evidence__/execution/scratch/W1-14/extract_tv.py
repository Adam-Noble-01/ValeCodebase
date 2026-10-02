# W1-14 scratch: extract the TrueVision source files at the pin b2aa9151 (bytes, exactly as git show returns them).
import os
import subprocess
import hashlib

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
APP = "na-apps/30__TrueVision__CoreAppCode/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tv")

FILES = [
    "02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js",
    "02__Src__AppModules/51__System__LayoutEditor/37__System__VectorTools/Na__LayoutEditor__VectorTools__Curves__.js",
    "02__Src__AppModules/51__System__LayoutEditor/26__System__DraftMode/Na__LayoutEditor__DraftMode__State__.js",
    "02__Src__AppModules/51__System__LayoutEditor/27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__State__.js",
    "02__Src__AppModules/51__System__LayoutEditor/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js",
    "02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__VectorQuality__.js",
    "80__Testing__PrototypeEnvironment/Na__Test__ViewportRotation__.test.mjs",
]

for rel in FILES:
    data = subprocess.run(
        ["git", "-C", NAWEB, "show", PIN + ":" + APP + rel],
        capture_output=True, check=True
    ).stdout
    dest = os.path.join(OUT, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as fh:
        fh.write(data)
    crlf = data.count(b"\r\n")
    lf = data.count(b"\n")
    print("%-110s %6d bytes  lines %5d  crlf %d  sha1 %s" % (
        rel, len(data), lf, crlf, hashlib.sha1(data).hexdigest()[:12]))
