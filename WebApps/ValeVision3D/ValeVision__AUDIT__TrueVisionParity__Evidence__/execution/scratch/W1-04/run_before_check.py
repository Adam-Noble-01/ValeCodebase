"""W1-04 evidence: run TV's walk-exit Transitions checks against the PRE-PORT ValeVision file.

Builds the transitions-only scratch copy (make_test_copies.py), points its Transitions load at
backup__Na__DrawView__Transitions__.js.before (VV 1.0.0, which calls Na__NavToolbar__SetOrbitMode),
runs it, saves the output to test__walkexit_transitions__before.log, and deletes the generated
copies (they carry TrueVision's text). Nothing under the ValeVision app root is written.
"""
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
subprocess.run(["python", os.path.join(HERE, "make_test_copies.py")], check=True)

src_path = os.path.join(HERE, "walkexit__transitions.test.mjs")
text = open(src_path, "r", encoding="utf-8").read()
old = "await load('40__System__DrawingViewCore/Na__DrawView__Transitions__.js',"
assert text.count(old) == 1, "Transitions load line not found exactly once"
backup = os.path.join(HERE, "backup__Na__DrawView__Transitions__.js.before").replace("\\", "/")
text = text.replace(old, "await load('" + backup + "',")
before_path = os.path.join(HERE, "walkexit__transitions__before.test.mjs")
open(before_path, "w", encoding="utf-8", newline="\n").write(text)

proc = subprocess.run(["node", before_path], capture_output=True, text=True)
log = proc.stdout + proc.stderr
open(os.path.join(HERE, "test__walkexit_transitions__before.log"), "w", encoding="utf-8", newline="\n").write(
    "(TV Na__Test__SheetPagingWalkExit__ @b2aa9151, Transitions section, against VV's pre-port 1.0.0 file)\n"
    + "exit code: " + str(proc.returncode) + "\n\n" + log)
print("exit", proc.returncode)
print(log[-900:])

for name in ("walkexit__full.test.mjs", "walkexit__transitions.test.mjs", "walkexit__transitions__before.test.mjs"):
    p = os.path.join(HERE, name)
    if os.path.exists(p):
        os.remove(p)
