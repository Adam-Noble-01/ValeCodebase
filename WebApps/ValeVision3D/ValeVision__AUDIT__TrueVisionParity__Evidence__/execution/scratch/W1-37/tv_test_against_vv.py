"""Run TrueVision's own Na__Test__ColourPalette__.test.mjs (at the pin, unchanged but for where it looks) against
this app's live tree. The test is W1-38's to port; this run only proves W1-37's files against TrueVision's checks.
Its one check W1-37 cannot pass is the panel host's attach line, which W1-38 lands.

Usage: python -B tv_test_against_vv.py
"""
import os
import subprocess

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN   = "b2aa9151"
REL   = "na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__ColourPalette__.test.mjs"
VVTEST = r"D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/80__Testing__PrototypeEnvironment"
HERE  = os.path.dirname(os.path.abspath(__file__))

src = subprocess.run(["git", "-C", NAWEB, "show", f"{PIN}:{REL}"], capture_output=True, check=True).stdout.decode("utf-8")
old = "const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\\/([A-Za-z]:)/, '$1'))\n"
if src.count(old) != 1:
    raise SystemExit("anchor not found in TrueVision's test")
src = src.replace(old, f"const HERE = '{VVTEST}'   // <-- W1-37 scratch run: ValeVision's test folder, so SRC and the CSS index are this app's\n")
out = os.path.join(HERE, "tv_test_against_vv.mjs")
with open(out, "w", encoding="utf-8", newline="\n") as f:
    f.write(src)
p = subprocess.run(["node", out], capture_output=True)
text = p.stdout.decode("utf-8", errors="replace") + p.stderr.decode("utf-8", errors="replace")
print(text)
print(f"(exit {p.returncode})")
os.remove(out)                                                                     # <-- TrueVision's text is not kept in scratch
