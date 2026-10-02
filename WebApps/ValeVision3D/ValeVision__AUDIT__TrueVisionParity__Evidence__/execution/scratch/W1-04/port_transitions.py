"""W1-04: whole-file port of TrueVision's Na__DrawView__Transitions__.js 1.1.0 into ValeVision.

Source of truth: TrueVision at pin b2aa9151, read with `git show` (LF bytes).
Seams re-applied (and nothing else):
  - banner token  TRUEVISION3D -> VALEVISION3D           (K2 H1)
  - console prefix [TrueVision3D] -> [ValeVision3D]       (K2 C1)
  - TrueVision's PORT NOTE block replaced by ValeVision's (K2 H5)
The file is written with TrueVision's LF line endings (the whole-file port rule).

Safety: refuses to write if the live VV file no longer matches the snapshot taken
before the package started (a file changed under us), and writes a backup of the
live bytes into this scratch folder first.
"""
import hashlib
import subprocess
import sys

PIN = "b2aa9151"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TV_REL = "na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__Transitions__.js"
VV_PATH = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\40__System__DrawingViewCore\Na__DrawView__Transitions__.js"
SCRATCH = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-04"
BEFORE_SHA = "39621dba8926ed873bdd5d7fb04c1d24dd343d87e20b6f015904ee35ab26f67e"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        sys.exit("ABORT: " + label + " found " + str(count) + " times (expected 1)")
    return text.replace(old, new)


tv_bytes = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + TV_REL], capture_output=True, check=True).stdout
if b"\r" in tv_bytes:
    sys.exit("ABORT: TrueVision bytes carry CR; expected LF from git show")
text = tv_bytes.decode("utf-8")

live = open(VV_PATH, "rb").read()
live_sha = hashlib.sha256(live).hexdigest()
if live_sha != BEFORE_SHA and "--again" not in sys.argv:
    sys.exit("ABORT: the live ValeVision file changed since the package snapshot (" + live_sha + ")")

# 1. Banner (K2 H1)
text = replace_once(text,
    "// TRUEVISION3D - DRAWING VIEW CORE - TRANSITIONS\n",
    "// VALEVISION3D - DRAWING VIEW CORE - TRANSITIONS\n",
    "banner")

# 2. Console prefix (K2 C1)
text = replace_once(text,
    "console.warn('[TrueVision3D] Drawing transitions init skipped - missing camera.');",
    "console.warn('[ValeVision3D] Drawing transitions init skipped - missing camera.');",
    "console prefix")

# 3. PORT NOTE (K2 H5): TrueVision's block out, ValeVision's in
tv_note_start = "// PORT NOTE:\n// - Ported from   : ValeVision3D 42__System__DrawingViewCore/Na__DrawView__Transitions__.js 1.0.0\n"
tv_note_end = "// - Back-port     : check ValeVision's SetOrbitMode really leaves Walk before assuming parity.\n"
a = text.index(tv_note_start)
b = text.index(tv_note_end) + len(tv_note_end)
if text.count(tv_note_start) != 1 or text.count(tv_note_end) != 1:
    sys.exit("ABORT: TrueVision PORT NOTE bounds not unique")

vv_note = (
    "// PORT NOTE:\n"
    "// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.18.0, port Phase 2: split out of TrueVision3D's\n"
    "//                   42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js 1.1.0 - its \"Suspending the\n"
    "//                   3D Systems\" region and flight calls); TrueVision3D took it whole as its 1.0.0 (v2.21.0,\n"
    "//                   10-Sep-2026); since ported back whole from TrueVision3D 1.1.0 (HEAD b2aa9151)\n"
    "// - Source version: 1.1.0 (TrueVision3D v2.112.0, 21-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-04}}\n"
    "// - Parity        : verbatim (the code is TrueVision 1.1.0's; the banner, the console prefix and this note\n"
    "//                   are the only differences)\n"
    "// - Divergences   :\n"
    "//   - Banner and console prefix read ValeVision3D.\n"
    "//   - Initialize is called in ValeVision. index.html hands it the live camera and orbit controls, so the\n"
    "//     controls are disabled while a drawing holds the view and FlyTo flies - ValeVision's own floor plan\n"
    "//     and elevation mode controllers (kept, DR-32) fly through it. TrueVision leaves it uninitialised, as\n"
    "//     its 1.1.0 log entry below records.\n"
    "//   - Those two controllers pass { returnToOrbit : true } when they take the viewport, as the Layout\n"
    "//     Editor does; TrueVision's controllers do not use this module. The snapshot renderer stays bare in\n"
    "//     both apps.\n"
    "// - Back-port     : none. TrueVision's earlier question - does ValeVision's Na__NavToolbar__SetOrbitMode\n"
    "//                   really leave Walk - is answered: it does, by running the walk and fly toggles through\n"
    "//                   index.html's 'return-to-orbit' wrappers, and ReturnToOrbit now makes those same calls\n"
    "//                   itself, exactly as in TrueVision.\n"
)
text = text[:a] + vv_note + text[b:]

if "TRUEVISION3D" in text or "[TrueVision3D" in text:
    sys.exit("ABORT: a TrueVision identity token survived")

out = text.encode("utf-8")
open(SCRATCH + r"\backup__Na__DrawView__Transitions__.js.before", "wb").write(live)
open(VV_PATH, "wb").write(out)
print("written", VV_PATH, len(out), "bytes; sha256", hashlib.sha256(out).hexdigest())
