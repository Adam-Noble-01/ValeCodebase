import subprocess, os, hashlib

SCR = os.path.dirname(os.path.abspath(__file__))
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
VCB = r"D:\10_CoreLib__ValeCodebase"
PIN = "b2aa9151"
TVAPP = "na-apps/30__TrueVision__CoreAppCode/"
FOLDER = "02__Src__AppModules/25__System__3dObject__InteractionSystem/"
FILES = [
    "3dObjectIInteraction__Animation__ClickToOpenDoors__.js",
    "3dObjectIInteraction__Animation__ClickToOpenDoors__README__.md",
    "Na__DoorAnimation__FindDoorGroups.js",
    "3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js",
]

def show(repo, spec):
    return subprocess.run(["git", "-C", repo, "show", spec], capture_output=True, check=True).stdout

os.makedirs(os.path.join(SCR, "tv"), exist_ok=True)
os.makedirs(os.path.join(SCR, "vv_head"), exist_ok=True)
for f in FILES:
    b = show(NAWEB, PIN + ":" + TVAPP + FOLDER + f)
    open(os.path.join(SCR, "tv", f), "wb").write(b)
    print("TV", f, len(b), hashlib.sha1(b).hexdigest()[:10], "CRLF" if b"\r\n" in b else "LF")
    try:
        v = show(VCB, "HEAD:WebApps/ValeVision3D/" + FOLDER + f)
        open(os.path.join(SCR, "vv_head", f), "wb").write(v)
        print("VV", f, len(v), hashlib.sha1(v).hexdigest()[:10], "CRLF" if b"\r\n" in v else "LF")
    except subprocess.CalledProcessError:
        print("VV", f, "absent at HEAD")
