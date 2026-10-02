# W2-40 scratch: facts for the Port Record (blob ids, sizes, sha256, line counts, changed lines vs TV)
import subprocess, hashlib, os, difflib

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TVREL = "na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/47__System__DrawingPlanes/"
VVDIR = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\47__System__DrawingPlanes"
OUT   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "diffs")
os.makedirs(OUT, exist_ok=True)
for name in ["Na__DrawingPlanes__AppConfig__.json", "Na__DrawingPlanes__ConfigState__.js", "Na__DrawingPlanes__Maths__.js",
             "Na__DrawingPlanes__Bounds__.js", "Na__DrawingPlanes__PlaneMesh__.js"]:
    blob = subprocess.run(["git", "-C", NAWEB, "rev-parse", "b2aa9151:" + TVREL + name], capture_output=True, text=True, check=True).stdout.strip()
    tv = subprocess.run(["git", "-C", NAWEB, "show", "b2aa9151:" + TVREL + name], capture_output=True, check=True).stdout
    with open(os.path.join(VVDIR, name), "rb") as f:
        vv = f.read()
    tvl = tv.decode("utf-8").split("\n"); vvl = vv.decode("utf-8").split("\n")
    diff = list(difflib.unified_diff(tvl, vvl, "TV b2aa9151/" + name, "VV/" + name, n=0, lineterm=""))
    with open(os.path.join(OUT, name + ".diff"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(diff) + "\n")
    hunks = [l for l in diff if l.startswith("@@")]
    minus = sum(1 for l in diff if l.startswith("-") and not l.startswith("---"))
    plus  = sum(1 for l in diff if l.startswith("+") and not l.startswith("+++"))
    print("%-38s blob %s  TV %6d B %4d lines -> VV %6d B %4d lines  sha256 %s  hunks %d (-%d +%d) %s"
          % (name, blob[:8], len(tv), tv.count(b"\n"), len(vv), vv.count(b"\n"), hashlib.sha256(vv).hexdigest()[:8],
             len(hunks), minus, plus, " ".join(hunks)))
