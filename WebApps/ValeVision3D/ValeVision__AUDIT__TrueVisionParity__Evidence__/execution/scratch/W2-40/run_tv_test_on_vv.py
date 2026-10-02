# W2-40 scratch: run TrueVision's own Na__Test__DrawingPlanes__ (read at the pin) against the
# Maths file landed in ValeVision. The test locates the module from its own folder
# (SCRIPT_DIR/../02__Src__AppModules/47__System__DrawingPlanes); the scratch copy points that one
# line at ValeVision's folder instead. The test itself is NOT ported here - W2-01 owns it.
import subprocess, os, sys

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
SRC = subprocess.run(["git", "-C", NAWEB, "show",
                      "b2aa9151:na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__DrawingPlanes__.test.mjs"],
                     capture_output=True, check=True).stdout.decode("utf-8")
OLD = "const SYSTEM     = resolve(SCRIPT_DIR, '..', '02__Src__AppModules', '47__System__DrawingPlanes');"
NEW = "const SYSTEM     = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/47__System__DrawingPlanes';"
assert SRC.count(OLD) == 1, "the test's module path line moved"
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "Na__Test__DrawingPlanes__OnVv__.test.mjs")
with open(out, "w", encoding="utf-8", newline="\n") as f:
    f.write(SRC.replace(OLD, NEW))
r = subprocess.run(["node", out], capture_output=True, text=True)
print(r.stdout[-4000:])
print(r.stderr[-2000:])
print("EXIT", r.returncode)
sys.exit(r.returncode)
