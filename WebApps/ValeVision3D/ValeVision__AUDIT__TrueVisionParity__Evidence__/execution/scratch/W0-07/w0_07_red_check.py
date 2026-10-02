#!/usr/bin/env python3
# W0-07 scratch tool: RED CHECK. Copies the pristine pre-images of the three LIVE (unfixed)
# Whitecardopedia scripts into scratch/W0-07/red_check/<repo-relative path>, puts the new
# stub-client test beside them and runs it there, to show the test detects the defects the
# staged fix removes. Nothing live is imported or written; the stub is in memory only.
import shutil
import subprocess
import sys
from pathlib import Path

SCRATCH  = Path(__file__).resolve().parent
PRE      = SCRATCH / "preimage" / "WebApps" / "Whitecardopedia" / "Tools__DevUtils"
RED_ROOT = SCRATCH / "red_check"
TOOLS    = RED_ROOT / "WebApps" / "Whitecardopedia" / "Tools__DevUtils"
TEST_SRC = SCRATCH / "src" / "Na__Test__SyncPipeline__EditorKeys__.test.py"

if RED_ROOT.exists():
    shutil.rmtree(RED_ROOT)
(TOOLS / "Tests").mkdir(parents=True)
for f in PRE.iterdir():
    shutil.copy2(f, TOOLS / f.name)
shutil.copy2(TEST_SRC, TOOLS / "Tests" / TEST_SRC.name)

proc = subprocess.run([sys.executable, "-B", str(TOOLS / "Tests" / TEST_SRC.name)],
                      capture_output=True, text=True, encoding="utf-8", errors="replace",
                      env={**__import__("os").environ, "PYTHONIOENCODING": "utf-8"})
out = proc.stdout + proc.stderr
(SCRATCH / "red_check__output.txt").write_text(out, encoding="utf-8")
lines = [l for l in out.splitlines() if l.strip().startswith(("PASS", "FAIL", "Na__Test__"))]
print("\n".join(lines))
print(f"exit={proc.returncode}")
