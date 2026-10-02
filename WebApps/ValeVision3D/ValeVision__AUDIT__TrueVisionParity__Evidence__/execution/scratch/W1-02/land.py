"""W1-02 landing: write the three built files into the live ValeVision tree.

Refuses unless (a) the two existing files are still exactly VV HEAD (content, line endings
aside) - nothing changed under this package - and (b) FindDoorGroups does not exist yet.
Keeps the pre-image bytes in scratch/W1-02/preimage/ so restore.py can put them back.
With --restore, puts the pre-images back and removes the new file (own partial edits only).
"""
import os, sys, subprocess, hashlib

SCR = os.path.dirname(os.path.abspath(__file__))
VCB = r"D:\10_CoreLib__ValeCodebase"
VV  = os.path.join(VCB, "WebApps", "ValeVision3D")
REL = "02__Src__AppModules/25__System__3dObject__InteractionSystem/"
EXISTING = ["3dObjectIInteraction__Animation__ClickToOpenDoors__.js",
            "3dObjectIInteraction__Animation__ClickToOpenDoors__README__.md"]
NEW_FILE = "Na__DoorAnimation__FindDoorGroups.js"
PRE = os.path.join(SCR, "preimage")


def live(name):
    return os.path.join(VV, (REL + name).replace("/", os.sep))


def sha(b):
    return hashlib.sha1(b).hexdigest()[:12]


if "--restore" in sys.argv:
    for name in EXISTING:
        data = open(os.path.join(PRE, name), "rb").read()
        open(live(name), "wb").write(data)
        print("restored", name, sha(data))
    if os.path.exists(live(NEW_FILE)):
        os.remove(live(NEW_FILE))
        print("removed", NEW_FILE)
    sys.exit(0)

os.makedirs(PRE, exist_ok=True)
for name in EXISTING:
    head = subprocess.run(["git", "-C", VCB, "show", "HEAD:WebApps/ValeVision3D/" + REL + name],
                          capture_output=True, check=True).stdout
    now = open(live(name), "rb").read()
    if now.replace(b"\r\n", b"\n") != head:
        sys.exit("REFUSED: %s changed since HEAD (someone else is editing it)" % name)
    if not os.path.exists(os.path.join(PRE, name)):
        open(os.path.join(PRE, name), "wb").write(now)
    print("pre-image ok", name, sha(now), "CRLF" if b"\r\n" in now else "LF")
if os.path.exists(live(NEW_FILE)):
    sys.exit("REFUSED: %s already exists" % NEW_FILE)

for name in EXISTING + [NEW_FILE]:
    data = open(os.path.join(SCR, "out", name), "rb").read()
    open(live(name), "wb").write(data)
    back = open(live(name), "rb").read()
    assert back == data
    print("landed", name, len(data), "bytes", sha(data), "LF")
