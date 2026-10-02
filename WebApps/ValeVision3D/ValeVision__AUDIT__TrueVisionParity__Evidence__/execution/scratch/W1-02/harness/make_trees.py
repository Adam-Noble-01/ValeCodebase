"""Build three isolated module trees for the W1-02 harness (scratch only).

trees/old : VV HEAD door module 1.7.1 (the file as it stood before this package)
trees/new : the door module and FindDoorGroups this package lands (scratch/W1-02/out, or the live
            files when --live is given, to test exactly what landed)
trees/tv  : TrueVision's door module 1.9.0 and FindDoorGroups at b2aa9151

Every tree gets the same leaves from VV HEAD: 04__MathUtils/Na__Math__Units.js,
05__RenderPipeline/Na__RenderLoop__Invalidation.js and the walk-mode proximity module, so a
concurrent package editing the live leaves cannot disturb the comparison.
"""
import os, sys, shutil, subprocess

HERE  = os.path.dirname(os.path.abspath(__file__))
SCR   = os.path.dirname(HERE)
VCB   = r"D:\10_CoreLib__ValeCodebase"
VV    = os.path.join(VCB, "WebApps", "ValeVision3D")
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN   = "b2aa9151"
SRC   = "02__Src__AppModules/"
D25   = "25__System__3dObject__InteractionSystem/"
DOOR  = "3dObjectIInteraction__Animation__ClickToOpenDoors__.js"
FIND  = "Na__DoorAnimation__FindDoorGroups.js"
WALK  = "3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js"
LEAVES = [SRC + "04__MathUtils/Na__Math__Units.js",
          SRC + "05__RenderPipeline/Na__RenderLoop__Invalidation.js",
          SRC + D25 + WALK]

live = "--live" in sys.argv


def show(repo, spec):
    return subprocess.run(["git", "-C", repo, "show", spec], capture_output=True, check=True).stdout


def put(tree, rel, data):
    path = os.path.join(HERE, "trees", tree, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "wb").write(data)


shutil.rmtree(os.path.join(HERE, "trees"), ignore_errors=True)
for tree in ("old", "new", "tv"):
    for rel in LEAVES:
        put(tree, rel, show(VCB, "HEAD:WebApps/ValeVision3D/" + rel))

put("old", SRC + D25 + DOOR, show(VCB, "HEAD:WebApps/ValeVision3D/" + SRC + D25 + DOOR))
if live:
    put("new", SRC + D25 + DOOR, open(os.path.join(VV, (SRC + D25 + DOOR).replace("/", os.sep)), "rb").read())
    put("new", SRC + D25 + FIND, open(os.path.join(VV, (SRC + D25 + FIND).replace("/", os.sep)), "rb").read())
else:
    put("new", SRC + D25 + DOOR, open(os.path.join(SCR, "out", DOOR), "rb").read())
    put("new", SRC + D25 + FIND, open(os.path.join(SCR, "out", FIND), "rb").read())
put("tv", SRC + D25 + DOOR, show(NAWEB, PIN + ":na-apps/30__TrueVision__CoreAppCode/" + SRC + D25 + DOOR))
put("tv", SRC + D25 + FIND, show(NAWEB, PIN + ":na-apps/30__TrueVision__CoreAppCode/" + SRC + D25 + FIND))

# The real door config block (VV main config at HEAD), for Initialize
put("new", "door_config.json", show(VCB, "HEAD:WebApps/ValeVision3D/" + SRC + "02__AppData/Na__AppConfig__Main.json"))
print("trees built (%s)" % ("live files" if live else "scratch out/"))
