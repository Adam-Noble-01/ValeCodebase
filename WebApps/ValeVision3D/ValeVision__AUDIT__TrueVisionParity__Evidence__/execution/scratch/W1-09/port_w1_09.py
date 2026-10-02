# =============================================================================
# W1-09 - Elevation depth-fog pure modules (49 leaves, inert) - the port script
# =============================================================================
#
# Takes TrueVision's files at the pin b2aa9151 (bytes, exactly as git show
# returns them: LF), applies ONLY the package's listed seams, and writes the
# new ValeVision files. Every seam is an exact byte replacement that must match
# exactly once, so a TV file that is not the one read for this package stops
# the script before anything is written.
#
#   python port_w1_09.py --dry-run   compute everything, write nothing, print the plan
#   python port_w1_09.py             write the six files (refuses to overwrite a file it did not write)
#   python port_w1_09.py --verify    reverse the seams on the LIVE files and prove the result is TV's bytes,
#                                    and write per-file diffs (live against TV) to scratch/W1-09/diffs/
#
# Seams (package vv_adaptations + K2 H1/C1/H5 + S02b-F49 for the test):
#   - banner token TRUEVISION3D -> VALEVISION3D (H1)
#   - console prefix [TrueVision3D] -> [ValeVision3D] (C1; ConfigState only)
#   - TV's PORT NOTE replaced by ValeVision's (H5); the test gains a PORT NOTE block (TV's has none)
#   - Shader: the header logs v2.103.0 (one DEVELOPMENT LOG entry above TV's; module version unchanged)
#   - Test: the two fixture labels that name TV's project lose the name, numbers unchanged (S02b-F49)
#   - AppConfig JSON: none (byte for byte)
# =============================================================================

import difflib
import hashlib
import os
import subprocess
import sys

NAWEB    = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN      = "b2aa9151"
TV_APP   = "na-apps/30__TrueVision__CoreAppCode/"
VV_ROOT  = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCRATCH  = os.path.dirname(os.path.abspath(__file__))
FOG      = "02__Src__AppModules/49__System__ElevationDepthFog/"
RULE     = "// -----------------------------------------------------------------------------\n"

TV_PORT_NOTE = (
    "// PORT NOTE:\n"
    "// - Authored in   : TrueVision3D first (20-Sep-2026)\n"
    "// - ValeVision    : not yet ported.\n"
)

ON_LINES = (
    "// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-09}}, with the fog system's other pure leaves.\n"
    "//                   TrueVision's own note said \"not yet ported\" and its fog plan still awaits Adam's\n"
    "//                   test; it comes across under DR-01 (c), and v2.94.0 is named as not yet confirmed by\n"
    "//                   Adam in TrueVision.\n"
)


def note(file_name, parity_lines, divergence_lines, source_lines=None, on_lines=None, backport_lines=None):
    """A ValeVision PORT NOTE block in the K2 H5 field order."""
    text  = "// PORT NOTE:\n"
    text += "// - Ported from   : TrueVision3D " + FOG + file_name + "\n"
    text += source_lines or "// - Source version: 1.0.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151)\n"
    text += on_lines or ON_LINES
    text += parity_lines
    text += "// - Divergences   :\n"
    text += divergence_lines
    text += backport_lines or "// - Back-port     : none.\n"
    return text


CONFIGSTATE_NOTE = note(
    "Na__ElevationDepthFog__ConfigState__.js",
    "// - Parity        : verbatim, and inert: nothing outside this folder imports it until the elevation data\n"
    "//                   module (W1-10) and the render layer, Dev row and wiring (W2-03) arrive (DR-15).\n",
    "//   - Banner and console prefix read ValeVision3D.\n",
)

MATHS_NOTE = note(
    "Na__ElevationDepthFog__Maths__.js",
    "// - Parity        : verbatim, and inert: nothing outside this folder imports it until the elevation data\n"
    "//                   module (W1-10) and the render layer, Dev row and wiring (W2-03) arrive (DR-15).\n"
    "//                   80__Testing__PrototypeEnvironment/Na__Test__ElevationDepthFog__.test.mjs runs this\n"
    "//                   very file.\n",
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n",
)

RECORDDATA_NOTE = note(
    "Na__ElevationDepthFog__RecordData__.js",
    "// - Parity        : verbatim, and inert: nothing imports it until the elevation data module (W1-10)\n"
    "//                   takes it into its normaliser and creator (DR-15). The DESCRIPTION's \"all three\n"
    "//                   dev-owned key lists\" is TrueVision's arrangement: in ValeVision the drawings block\n"
    "//                   is on the one ProjectData__EditorOwnedKeys list (02__AppData/Na__AppConfig__Main.json).\n",
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n",
)

SHADER_NOTE = note(
    "Na__ElevationDepthFog__Shader__.js",
    "// - Parity        : verbatim, and inert: only the render layer imports it, and that arrives with W2-03\n"
    "//                   (DR-15).\n",
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "//   - The DEVELOPMENT LOG is TrueVision's, plus one entry above it recording v2.103.0's change to\n"
    "//     this file, which TrueVision's own log does not (S02b c.4); the module version stays\n"
    "//     TrueVision's 1.0.0 (DR-34).\n",
    source_lines=(
        "// - Source version: 1.0.0 (TrueVision3D v2.94.0, 20-Sep-2026, as changed by TrueVision3D v2.103.0,\n"
        "//                   21-Sep-2026, which its log does not record; read at b2aa9151)\n"
    ),
    on_lines=(
        "// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-09}}, with the fog system's other pure leaves.\n"
        "//                   TrueVision's own note said \"not yet ported\" and its fog plan still awaits Adam's\n"
        "//                   test; it comes across under DR-01 (c), and v2.94.0 and v2.103.0 are named as not\n"
        "//                   yet confirmed by Adam in TrueVision.\n"
    ),
    backport_lines=(
        "// - Back-port     : TrueVision's own log could record v2.103.0 the same way (S02b WP-S02b-10R item 3,\n"
        "//                   the TrueVision lane, DR-36).\n"
    ),
)

SHADER_LOG_OLD = (
    "// DEVELOPMENT LOG:\n"
    "// 20-Sep-2026 - Version 1.0.0\n"
)
SHADER_LOG_NEW = (
    "// DEVELOPMENT LOG:\n"
    "// 21-Sep-2026 - TrueVision3D v2.103.0 (no module version of its own; logged by ValeVision3D {{VVREL:W1-09}})\n"
    "// - A layer of its own writes its colour EXACTLY equal to its alpha when it\n"
    "//   draws straight to the canvas, and adds the 8-bit step (NA_STEP) only where\n"
    "//   a supersampled bake will sRGB-encode it (uEncodeFollows): premultiplied\n"
    "//   colour above its own alpha is undefined in WebGL, and 99.7% of the layer's\n"
    "//   pixels had been leaving here that way. The supersampler's present pass\n"
    "//   holds the encoded colour down to the alpha - the other half of the fix.\n"
    "// 20-Sep-2026 - Version 1.0.0\n"
)

TEST_NOTE_ANCHOR_OLD = (
    "//   Exit 0 = every check passed. Exit 1 = at least one did not.\n"
    "//\n"
    + RULE +
    "//\n"
    "// DEVELOPMENT LOG:\n"
)
TEST_NOTE_ANCHOR_NEW = (
    "//   Exit 0 = every check passed. Exit 1 = at least one did not.\n"
    "//\n"
    + RULE +
    "//\n"
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__ElevationDepthFog__.test.mjs\n"
    "// - Source version: 1.0.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-09}}, with the module it proves\n"
    "// - Parity        : verbatim - every check is TrueVision's, run against this app's own Maths module\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D.\n"
    "//   - The fixture keeps every number but no longer names the TrueVision project it was measured\n"
    "//     on (the DESCRIPTION and the BEHIND THE PLANE note; S02b-F49).\n"
    "// - Back-port     : none.\n"
    "//\n"
    + RULE +
    "//\n"
    "// DEVELOPMENT LOG:\n"
)


def banner(old_title):
    return ("// TRUEVISION3D - " + old_title + "\n", "// VALEVISION3D - " + old_title + "\n")


FILES = [
    {
        "tv": FOG + "Na__ElevationDepthFog__AppConfig__.json",
        "blob": "6799d8d9e06ac97b8bce2a13ef2a2a3a5950f7aa",
        "seams": [],
    },
    {
        "tv": FOG + "Na__ElevationDepthFog__ConfigState__.js",
        "blob": "d84e2b208e5409816389a53c87197d45b5e60282",
        "seams": [
            ("banner (H1)",) + banner("ELEVATION DEPTH FOG - CONFIG STATE"),
            ("PORT NOTE (H5)", TV_PORT_NOTE, CONFIGSTATE_NOTE),
            ("console prefix (C1) - fetch failed",
             "console.warn('[TrueVision3D] Elevation depth fog config fetch failed ('",
             "console.warn('[ValeVision3D] Elevation depth fog config fetch failed ('"),
            ("console prefix (C1) - unreadable",
             "console.warn('[TrueVision3D] Elevation depth fog config unreadable - using built-in defaults.', error);",
             "console.warn('[ValeVision3D] Elevation depth fog config unreadable - using built-in defaults.', error);"),
        ],
    },
    {
        "tv": FOG + "Na__ElevationDepthFog__Maths__.js",
        "blob": "4e3fe490fe10720ad4c9fb4f43d193d93a3edb90",
        "seams": [
            ("banner (H1)",) + banner("ELEVATION DEPTH FOG - MATHS"),
            ("PORT NOTE (H5)", TV_PORT_NOTE, MATHS_NOTE),
        ],
    },
    {
        "tv": FOG + "Na__ElevationDepthFog__RecordData__.js",
        "blob": "55ad6a6f705ba1b8158eaf04f3e5592352c76f04",
        "seams": [
            ("banner (H1)",) + banner("ELEVATION DEPTH FOG - RECORD DATA"),
            ("PORT NOTE (H5)", TV_PORT_NOTE, RECORDDATA_NOTE),
        ],
    },
    {
        "tv": FOG + "Na__ElevationDepthFog__Shader__.js",
        "blob": "66636211a292c1e3d9bfeb12e0835ca48ba2fa70",
        "seams": [
            ("banner (H1)",) + banner("ELEVATION DEPTH FOG - SHADER"),
            ("PORT NOTE (H5)", TV_PORT_NOTE, SHADER_NOTE),
            ("DEVELOPMENT LOG logs v2.103.0 (package vv_adaptations)", SHADER_LOG_OLD, SHADER_LOG_NEW),
        ],
    },
    {
        "tv": "80__Testing__PrototypeEnvironment/Na__Test__ElevationDepthFog__.test.mjs",
        "blob": "c136ccc4d1479195e9c26a7f76fb07000394e313",
        "seams": [
            ("banner (H1)",) + banner("TEST - ELEVATION DEPTH FOG - MATHS"),
            ("PORT NOTE block added (H5)", TEST_NOTE_ANCHOR_OLD, TEST_NOTE_ANCHOR_NEW),
            ("fixture label :16 (S02b-F49)",
             "// - THE FIXTURE IS RB05'S SOUTH WEST ELEVATION: azimuth 270, plane through\n",
             "// - THE FIXTURE IS A MEASURED SOUTH WEST ELEVATION: azimuth 270, plane through\n"),
            ("fixture label :162 (S02b-F49)",
             "    // RB05 South West Elevation. Azimuth 270: the viewer stands to the WEST\n",
             "    // The measured South West Elevation. Azimuth 270: the viewer stands to the WEST\n"),
        ],
    },
]


def git_blob_sha1(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


def tv_bytes(rel):
    return subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + TV_APP + rel], capture_output=True, check=True).stdout


def apply_seams(data, seams, reverse=False):
    problems = []
    for seam in seams:
        name, old, new = seam[0], seam[1].encode("utf-8"), seam[2].encode("utf-8")
        a, b = (new, old) if reverse else (old, new)
        count = data.count(a)
        if count != 1:
            problems.append("%s: expected exactly 1 match, found %d" % (name, count))
            continue
        data = data.replace(a, b, 1)
    return data, problems


def vv_path(rel):
    return os.path.join(VV_ROOT, rel.replace("/", os.sep))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--write"
    if mode not in ("--write", "--dry-run", "--verify"):
        print("usage: port_w1_09.py [--dry-run | --verify]")
        return 2

    plan, problems = [], []
    for spec in FILES:
        src = tv_bytes(spec["tv"])
        blob = git_blob_sha1(src)
        if blob != spec["blob"]:
            problems.append("%s: TV blob %s is not the one read for this package (%s)" % (spec["tv"], blob, spec["blob"]))
            continue
        if b"\r\n" in src:
            problems.append("%s: TV text has CRLF - expected LF from git show" % spec["tv"])
        out, seam_problems = apply_seams(src, spec["seams"])
        problems.extend(spec["tv"] + ": " + p for p in seam_problems)
        plan.append((spec, src, out))

    if mode == "--verify":
        diff_dir = os.path.join(SCRATCH, "diffs")
        os.makedirs(diff_dir, exist_ok=True)
        verify_problems = list(problems)
        for spec, src, out in plan:
            path = vv_path(spec["tv"])
            if not os.path.exists(path):
                verify_problems.append(spec["tv"] + ": not in ValeVision")
                continue
            live = open(path, "rb").read()
            back, seam_problems = apply_seams(live, spec["seams"], reverse=True)
            verify_problems.extend(spec["tv"] + ": reverse " + p for p in seam_problems)
            same_tv = (back == src)
            same_plan = (live == out)
            if not same_tv:
                verify_problems.append(spec["tv"] + ": live file with its seams reversed is NOT TV's bytes")
            if not same_plan:
                verify_problems.append(spec["tv"] + ": live file differs from what this script writes")
            diff = list(difflib.unified_diff(src.decode("utf-8").splitlines(True), live.decode("utf-8").splitlines(True),
                                             "TV@" + PIN + "/" + spec["tv"], "VV/" + spec["tv"], n=0))
            with open(os.path.join(diff_dir, os.path.basename(spec["tv"]) + ".diff"), "w", encoding="utf-8", newline="\n") as f:
                f.writelines(diff)
            changed = sum(1 for l in diff if (l.startswith("+") or l.startswith("-")) and not l.startswith(("+++", "---")))
            print("%-80s reverse==TV %-5s live==plan %-5s crlf %-5s changed-lines %3d sha256 %s" % (
                spec["tv"], same_tv, same_plan, b"\r\n" in live, changed, hashlib.sha256(live).hexdigest()[:16]))
        print("verify: %d problem(s)" % len(verify_problems))
        for p in verify_problems:
            print("  - " + p)
        return 1 if verify_problems else 0

    if problems:
        print("STOP - nothing written:")
        for p in problems:
            print("  - " + p)
        return 1

    # Refuse to overwrite anything this script did not write (identical bytes = a re-run, allowed)
    for spec, src, out in plan:
        path = vv_path(spec["tv"])
        if os.path.exists(path) and open(path, "rb").read() != out:
            print("STOP - nothing written: %s exists and is not this package's output" % path)
            return 1

    for spec, src, out in plan:
        path = vv_path(spec["tv"])
        print("%-9s %-80s %6d -> %6d bytes  seams %d  sha256 %s" % (
            "dry-run" if mode == "--dry-run" else "write", spec["tv"], len(src), len(out), len(spec["seams"]),
            hashlib.sha256(out).hexdigest()[:16]))
        if mode == "--write":
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "wb") as f:
                f.write(out)
    if mode == "--write":
        with open(os.path.join(SCRATCH, "sha256__written.txt"), "w", encoding="utf-8", newline="\n") as f:
            for spec, src, out in plan:
                f.write("%s  %s\n" % (hashlib.sha256(out).hexdigest(), spec["tv"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
