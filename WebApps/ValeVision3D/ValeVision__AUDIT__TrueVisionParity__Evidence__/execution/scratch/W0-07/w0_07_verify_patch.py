#!/usr/bin/env python3
# W0-07 scratch tool: prove prepared/W0-07.patch, applied with `git apply` to byte copies of the
# LIVE files, reproduces the staged copies byte for byte. Runs in a throw-away git repo under
# the session temp folder (outside every project repo); the live files are only read.
import hashlib
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

REPO    = Path(r"D:/10_CoreLib__ValeCodebase")
EXEC    = REPO / "WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__Evidence__/execution"
PATCH   = EXEC / "prepared/W0-07.patch"
STAGE   = EXEC / "prepared/W0-07"
TOOLS   = "WebApps/Whitecardopedia/Tools__DevUtils"
FILES   = [f"{TOOLS}/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py",
           f"{TOOLS}/AutomationUtil__AuditAndBackfillR2__ProjectJsonAndImages__Main__.py",
           f"{TOOLS}/AutomationUtil__R2Common__Lib__.py"]
NEW     = [f"{TOOLS}/Tests/Na__Test__SyncPipeline__EditorKeys__.test.py"]

work = Path(os.environ.get("TEMP", tempfile.gettempdir())) / "na_w0_07_patch_check"
if work.exists():
    shutil.rmtree(work)
work.mkdir(parents=True)
env = {**os.environ, "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull}   # no autocrlf or hooks from outside

def git(*args):
    return subprocess.run(["git", "-C", str(work), *args], capture_output=True, text=True, env=env)

print(git("init", "-q").stderr.strip() or "git init ok")
for rel in FILES:
    dest = work / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes((REPO / rel).read_bytes())

check = git("apply", "--check", "--whitespace=nowarn", str(PATCH))
print("git apply --check:", "OK" if check.returncode == 0 else check.stderr)
apply = git("apply", "--whitespace=nowarn", str(PATCH))
print("git apply:", "OK" if apply.returncode == 0 else apply.stderr)

ok = apply.returncode == 0
for rel in FILES + NEW:
    got  = (work / rel).read_bytes() if (work / rel).exists() else b""
    want = (STAGE / rel).read_bytes()
    same = got == want
    ok   = ok and same
    print(("IDENTICAL " if same else "DIFFERENT ") + rel, hashlib.sha1(got).hexdigest())
shutil.rmtree(work, ignore_errors=True)
print("RESULT:", "PASS" if ok else "FAIL")
