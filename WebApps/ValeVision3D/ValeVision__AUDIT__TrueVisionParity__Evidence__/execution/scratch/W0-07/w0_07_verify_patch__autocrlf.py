#!/usr/bin/env python3
# W0-07 scratch tool: same as w0_07_verify_patch.py, but the throw-away repo runs with
# core.autocrlf=true and '* text=auto' (the settings of D:/10_CoreLib__ValeCodebase), so the
# result shows what Adam's own `git apply` would produce on his CRLF working tree.
import hashlib
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

REPO  = Path(r"D:/10_CoreLib__ValeCodebase")
EXEC  = REPO / "WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__Evidence__/execution"
PATCH = EXEC / "prepared/W0-07.patch"
STAGE = EXEC / "prepared/W0-07"
TOOLS = "WebApps/Whitecardopedia/Tools__DevUtils"
FILES = [f"{TOOLS}/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py",
         f"{TOOLS}/AutomationUtil__AuditAndBackfillR2__ProjectJsonAndImages__Main__.py",
         f"{TOOLS}/AutomationUtil__R2Common__Lib__.py"]
NEW   = [f"{TOOLS}/Tests/Na__Test__SyncPipeline__EditorKeys__.test.py"]

work = Path(os.environ.get("TEMP", tempfile.gettempdir())) / "na_w0_07_patch_check_autocrlf"
if work.exists():
    shutil.rmtree(work)
work.mkdir(parents=True)
env = {**os.environ, "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull}


def git(*args):
    return subprocess.run(["git", "-C", str(work), *args], capture_output=True, text=True, env=env)


git("init", "-q")
git("config", "core.autocrlf", "true")
(work / ".gitattributes").write_bytes(b"* text=auto\n")
for rel in FILES:
    dest = work / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes((REPO / rel).read_bytes())

check = git("apply", "--check", "--whitespace=nowarn", str(PATCH))
print("autocrlf=true, text=auto | git apply --check:", "OK" if check.returncode == 0 else check.stderr)
apply = git("apply", "--whitespace=nowarn", str(PATCH))
print("autocrlf=true, text=auto | git apply:", "OK" if apply.returncode == 0 else apply.stderr)
ok = apply.returncode == 0
for rel in FILES + NEW:
    got  = (work / rel).read_bytes() if (work / rel).exists() else b""
    want = (STAGE / rel).read_bytes()
    same = got == want
    ok   = ok and same
    print(("IDENTICAL " if same else "DIFFERENT ") + rel, hashlib.sha1(got).hexdigest(),
          f"crlf={got.count(bytes([13, 10]))} lf={got.count(bytes([10]))}")
shutil.rmtree(work, ignore_errors=True)
print("RESULT:", "PASS" if ok else "FAIL")
