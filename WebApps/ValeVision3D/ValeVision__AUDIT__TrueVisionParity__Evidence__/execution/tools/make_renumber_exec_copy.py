"""Make the execution copy of k2_renumber_apply.py that exempts the parity audit / working-memory records.

The original walks every root-level text file of the app and would rewrite the old folder names inside
ValeVision__AUDIT__TrueVisionParity__DrawingSystems__.md and the working memory, corrupting their old->new tables;
its git preflight would also refuse because those records are untracked files under the app root.
"""
import os

SRC = r"C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f105155\scratchpad\parity\report\tools\k2_renumber_apply.py"
DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "k2_renumber_apply__exec.py")

t = open(SRC, encoding="utf-8").read()

old_h = "HISTORY = re.compile(r'(DEVLOG|PARITY__TrueVisionLedger|__PLAN__|^Research__|^TASK__)')"
new_h = ("HISTORY = re.compile(r'(DEVLOG|PARITY__TrueVisionLedger|__PLAN__|^Research__|^TASK__"
         "|__AUDIT__TrueVisionParity__|__WORKING_MEMORY__TrueVisionParity__)')"
         "  # EXEC COPY 01-Oct-2026: parity audit + working memory are records, never rewritten")
assert t.count(old_h) == 1, "HISTORY line not found"
t = t.replace(old_h, new_h)

old_p = "        if st.stdout.strip():\n            problems.append('git working tree not clean"
new_p = ("        st.stdout = chr(10).join(l for l in st.stdout.splitlines()"
         " if '__AUDIT__TrueVisionParity__' not in l and '__WORKING_MEMORY__TrueVisionParity__' not in l)"
         "  # EXEC COPY: records ignored\n"
         "        if st.stdout.strip():\n            problems.append('git working tree not clean")
assert t.count(old_p) == 1, "preflight block not found"
t = t.replace(old_p, new_p)

t = t.replace('"""K2 - the drawing-system renumber',
              '"""EXECUTION COPY (01-Oct-2026): identical to parity/report/tools/k2_renumber_apply.py except that the\n'
              'parity audit and working-memory records at the app root are exempt from rewriting and from the git\n'
              'clean-tree preflight (made by execution/tools/make_renumber_exec_copy.py).\n\n'
              'K2 - the drawing-system renumber', 1)
open(DST, "w", encoding="utf-8", newline="\n").write(t)
print("wrote", DST)
