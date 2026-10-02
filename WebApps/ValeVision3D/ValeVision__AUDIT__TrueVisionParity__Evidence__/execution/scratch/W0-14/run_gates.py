"""Run W0-14's gates from the ValeVision app root and save each output under scratch/W0-14/<label>_*.txt.

Usage: python run_gates.py <label>     (e.g. baseline, final)

G1 Na__Verify__ModuleGraph__, G2 Na__Verify__Exports__, node --check on the four package files, the VV node
test suite (regression), the path gate through W0-02's records-exempt wrapper, and the W0-14 acceptance test.
Read-only on the repository: every command only reads the tree (the node tests write to the OS temp folder).
"""
import glob
import os
import subprocess
import sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE = os.path.dirname(os.path.abspath(__file__))
EVID = os.path.join(VV, "ValeVision__AUDIT__TrueVisionParity__Evidence__")
LABEL = sys.argv[1] if len(sys.argv) > 1 else "run"

FILES = [
    "02__Src__AppModules/03__AppUtils/Na__AppUtils__R2AssetUpload__.js",
    "02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js",
    "02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js",
    "02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__Assets__.js",
]


def run(name, cmd, cwd=VV, timeout=900):
    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)
    out = (proc.stdout or "") + ("\n[stderr]\n" + proc.stderr if proc.stderr else "")
    path = os.path.join(HERE, f"{LABEL}_{name}.txt")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(f"$ {' '.join(cmd)}\n(exit {proc.returncode})\n\n{out}")
    tail = [l for l in out.strip().splitlines() if l.strip()][-3:]
    print(f"{name:<44} exit {proc.returncode}   " + " | ".join(t.strip()[:110] for t in tail))
    return proc.returncode


results = {}
results["G1_modulegraph"] = run("G1_modulegraph", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs"])
results["G2_exports"] = run("G2_exports", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs"])
for rel in FILES:
    short = os.path.basename(rel).replace(".js", "")
    results["check_" + short] = run("nodecheck_" + short, ["node", "--check", rel])

for test in sorted(glob.glob(os.path.join(VV, "80__Testing__PrototypeEnvironment", "Na__Test__*.test.mjs"))):
    name = os.path.basename(test)
    results["G5_" + name] = run("G5_" + name, ["node", os.path.relpath(test, VV)])

wrapper = os.path.join(EVID, "execution", "scratch", "W0-02", "path_gate_records_exempt.py")
if os.path.exists(wrapper):
    results["G3_pathgate"] = run("G3_pathgate_records_exempt", [sys.executable, wrapper, "--root", VV])

acceptance = os.path.join(HERE, "Na__Test__AssetUploadContract__.test.mjs")
if os.path.exists(acceptance):
    results["W0-14_acceptance"] = run("W0-14_acceptance", ["node", acceptance])

failed = [k for k, v in results.items() if v != 0]
print("\nFAILED:", failed if failed else "none")
