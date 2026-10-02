"""W3-13 regression (copy of W1-36 runner): every node test (*.test.mjs, *.test.cjs) in VV/80__Testing__PrototypeEnvironment, run from the
VV app root. The python (Flask) tests are not run: this package touches no server file. Each test's full output goes
to scratch/W1-36/suite__<tag>__<name>.txt. Usage: python run_node_suite.py <tag>
"""
import os
import re
import subprocess
import sys
import time

VVR = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
TEST_DIR = os.path.join(VVR, "80__Testing__PrototypeEnvironment")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "suite")
tag = sys.argv[1] if len(sys.argv) > 1 else "run1"
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

rows = []
for fn in sorted(os.listdir(TEST_DIR)):
    if not (fn.endswith(".test.mjs") or fn.endswith(".test.cjs")):
        continue
    t0 = time.time()
    p = subprocess.run(["node", "80__Testing__PrototypeEnvironment/" + fn], cwd=VVR, capture_output=True, timeout=600)
    out = (p.stdout or b"").decode("utf-8", "replace") + (("\n--- stderr ---\n" + p.stderr.decode("utf-8", "replace")) if p.stderr else "")
    with open(os.path.join(OUT, "suite__%s__%s.txt" % (tag, fn)), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("$ node 80__Testing__PrototypeEnvironment/" + fn + "\nexit " + str(p.returncode) + "\n\n" + out)
    lines = [l for l in out.splitlines() if l.strip()]
    npass = len(re.findall(r"^\s*(?:\[?PASS\]?|ok\b|OK\b)", out, re.M))
    nfail = len(re.findall(r"^\s*(?:\[?FAIL\]?|not ok\b)", out, re.M))
    rows.append((fn, p.returncode))
    print("%-46s exit=%d %5.1fs pass~%-4d fail~%-3d %s" % (fn, p.returncode, time.time() - t0, npass, nfail, (lines[-1].strip() if lines else "")[:120]), flush=True)

bad = [r for r in rows if r[1] != 0]
print("\nnode suite %s: %d test(s), %d pass, %d fail" % (tag, len(rows), len(rows) - len(bad), len(bad)))
for r in bad:
    print("  FAILED: %s (exit %d)" % r)
sys.exit(1 if bad else 0)
