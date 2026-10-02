import subprocess, difflib, os

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
VCB = r"D:\10_CoreLib__ValeCodebase"
TVP = "na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js"
VVP = "WebApps/ValeVision3D/02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js"

def show(repo, spec):
    return subprocess.run(["git", "-C", repo, "show", spec], capture_output=True, check=True).stdout.decode("utf-8").replace("\r\n", "\n")

import sys
mode = sys.argv[1] if len(sys.argv) > 1 else "v170"
if mode == "v170":
    a = show(NAWEB, "e7eae599:" + TVP)
    b = show(VCB, "b1317c44:" + VVP)
    an, bn = "TV@e7eae599(1.7.0)", "VV@b1317c44(1.7.0)"
elif mode == "vv170_vv171":
    a = show(VCB, "b1317c44:" + VVP)
    b = show(VCB, "HEAD:" + VVP)
    an, bn = "VV 1.7.0", "VV HEAD 1.7.1"
elif mode == "tv170_tv190":
    a = show(NAWEB, "e7eae599:" + TVP)
    b = show(NAWEB, "b2aa9151:" + TVP)
    an, bn = "TV 1.7.0", "TV 1.9.0"
elif mode == "vvhead_tv190":
    a = show(VCB, "HEAD:" + VVP)
    b = show(NAWEB, "b2aa9151:" + TVP)
    an, bn = "VV HEAD 1.7.1", "TV 1.9.0"
d = difflib.unified_diff(a.splitlines(), b.splitlines(), an, bn, lineterm="", n=1)
print("\n".join(d))
