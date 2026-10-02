"""W1-04: pass { returnToOrbit : true } from ValeVision's own floor plan and elevation entries.

ValeVision keeps its 42/45 mode controllers (DR-32); TrueVision's controllers do not use
Transitions, so this is a ValeVision-only hunk (S02a WP-S02a-11 verifier correction,
S03a-V03). Each file also gets:
  - its VV DEVELOPMENT LOG entry (newest first, with the release placeholder), and
  - its PORT NOTE Source version completed with the TrueVision3D app version (K2 H5):
    once the file is written the verifier's 01-Oct-2026 baseline no longer covers it.
    v2.18.0 is verified: TrueVision commit 9eba9c44 (07-Sep-2026) adds the devlog's
    v2.18.0 entry and sets FloorPlan ModeController 1.1.0 and Elevation ModeController 1.0.0;
    Elevation ModeController 1.1.0 is listed under v2.94.0 (TV devlog, pin b2aa9151).

Works on bytes and keeps each file's own line ending. Refuses to write if a file changed
since the package snapshot; backs up the live bytes into this scratch folder first.
"""
import hashlib
import sys

SRC = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules"
SCRATCH = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-04"

DELEGATED_OLD = "//   - Suspending 3D, the flight and the router registration delegated to Na__DrawView__Transitions__.\n"
DELEGATED_NEW = ("//   - Suspending 3D, the flight and the router registration delegated to Na__DrawView__Transitions__;\n"
                 "//     taking the viewport asks it for { returnToOrbit : true }, so Walk or Fly is left for Orbit first.\n")

CALL_OLD = "        Na__DrawView__Transitions__SuspendThreeD();                              // <-- Orbit must let go of the canvas first\n"
CALL_NEW = "        Na__DrawView__Transitions__SuspendThreeD({ returnToOrbit : true });      // <-- Walk or Fly left for Orbit first; orbit must let go of the canvas\n"

FILES = [
    {
        "rel": r"42__System__FloorPlanViews\Na__FloorPlan__ModeController__.js",
        "sha": "baf50aeef2ea9a2851000717ee731c820ba09150c5a3ee666c1392f33ff95957",
        "source_old": "// - Source version: 1.1.0 (07-Sep-2026)\n",
        "source_new": "// - Source version: 1.1.0 (TrueVision3D v2.18.0, 07-Sep-2026; still 1.1.0 at HEAD b2aa9151)\n",
        "log_anchor": "// DEVELOPMENT LOG:\n// 09-Sep-2026 - Version 1.2.2\n",
        "log_new": ("// DEVELOPMENT LOG:\n"
                    "// 01-Oct-2026 - Version 1.2.3 ({{VVREL:W1-04}})\n"
                    "// - Taking the viewport asks Na__DrawView__Transitions__SuspendThreeD for\n"
                    "//   { returnToOrbit : true }. Transitions 1.1.0 (TrueVision3D v2.112.0)\n"
                    "//   leaves Walk and Fly only when its caller asks, so a viewport picture\n"
                    "//   no longer drops a walker into Orbit; a plan takes the screen, so it\n"
                    "//   asks, and opening one while walking still leaves Walk and lights Orbit.\n"
                    "//\n"
                    "// 09-Sep-2026 - Version 1.2.2\n"),
    },
    {
        "rel": r"45__System__ElevationViews\Na__Elevation__ModeController__.js",
        "sha": "db01d419f91098db00463cc66e7300eba32801030e5c3c741cc372ccd54ebed0",
        "source_old": "// - Source version: 1.0.0 (07-Sep-2026)\n",
        "source_new": ("// - Source version: 1.0.0 (TrueVision3D v2.18.0, 07-Sep-2026); TrueVision's file is at 1.1.0 (v2.94.0,\n"
                       "//                   20-Sep-2026, the depth-fog source not yet taken; read at HEAD b2aa9151)\n"),
        "log_anchor": "// DEVELOPMENT LOG:\n// 09-Sep-2026 - Version 1.1.1\n",
        "log_new": ("// DEVELOPMENT LOG:\n"
                    "// 01-Oct-2026 - Version 1.1.2 ({{VVREL:W1-04}})\n"
                    "// - Taking the viewport asks Na__DrawView__Transitions__SuspendThreeD for\n"
                    "//   { returnToOrbit : true }. Transitions 1.1.0 (TrueVision3D v2.112.0)\n"
                    "//   leaves Walk and Fly only when its caller asks, so a viewport picture\n"
                    "//   no longer drops a walker into Orbit; an elevation takes the screen, so\n"
                    "//   it asks, and opening one while walking still leaves Walk and lights Orbit.\n"
                    "//\n"
                    "// 09-Sep-2026 - Version 1.1.1\n"),
    },
]


def replace_once(data, old, new, label, rel):
    count = data.count(old)
    if count != 1:
        sys.exit("ABORT (" + rel + "): " + label + " found " + str(count) + " times (expected 1)")
    return data.replace(old, new)


plans = []
for spec in FILES:
    path = SRC + "\\" + spec["rel"]
    raw = open(path, "rb").read()
    sha = hashlib.sha256(raw).hexdigest()
    if sha != spec["sha"] and "--again" not in sys.argv:
        sys.exit("ABORT (" + spec["rel"] + "): changed since the package snapshot (" + sha + ")")
    eol = b"\r\n" if b"\r\n" in raw else b"\n"
    if eol == b"\r\n" and raw.count(b"\n") != raw.count(b"\r\n"):
        sys.exit("ABORT (" + spec["rel"] + "): mixed line endings")
    text = raw.decode("utf-8").replace("\r\n", "\n")

    text = replace_once(text, spec["source_old"], spec["source_new"], "Source version line", spec["rel"])
    text = replace_once(text, DELEGATED_OLD, DELEGATED_NEW, "Transitions divergence bullet", spec["rel"])
    text = replace_once(text, spec["log_anchor"], spec["log_new"], "DEVELOPMENT LOG anchor", spec["rel"])
    text = replace_once(text, CALL_OLD, CALL_NEW, "SuspendThreeD call", spec["rel"])

    out = text.encode("utf-8")
    if eol == b"\r\n":
        out = out.replace(b"\n", b"\r\n")
    plans.append((path, raw, out, spec["rel"]))

for path, raw, out, rel in plans:
    name = rel.split("\\")[-1]
    open(SCRATCH + "\\backup__" + name + ".before", "wb").write(raw)
for path, raw, out, rel in plans:
    open(path, "wb").write(out)
    print("written", rel, len(out), "bytes; sha256", hashlib.sha256(out).hexdigest())
