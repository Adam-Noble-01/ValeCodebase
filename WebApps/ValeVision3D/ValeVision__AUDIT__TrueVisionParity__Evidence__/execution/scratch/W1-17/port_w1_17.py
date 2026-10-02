# =============================================================================
# W1-17 PORT SCRIPT - Hatch patterns leaf and the app-root hatch library
# =============================================================================
#
# Reads every TrueVision source at the pin with `git show` (bytes, never the
# working tree), applies ONLY the listed seams and writes LF exactly as git
# returns it.
#
#   python -B port_w1_17.py --stage <dir>   build every output under <dir> (testing; CSS included)
#   python -B port_w1_17.py --write         write the landed set into the live ValeVision tree
#                                           (new files only; refuses an existing target whose
#                                           bytes differ; never writes the held-back stylesheet)
#   python -B port_w1_17.py --check         prove the live files equal what this script builds
#
# Seams (K2 H1, C1, H5; package vv_adaptations):
#   HatchPatterns.js  - banner token, 5 console prefixes, a ValeVision PORT NOTE
#                       inserted before TrueVision's DEVELOPMENT LOG (TV has none).
#   Styles__Patterns  - banner token only (STAGED, never written live by this
#                       package: its one home, Panel__Patterns' own link, lands
#                       with W2-29 - see the Port Record).
#   HatchLibrary__Index__.json - Meta__PortedFrom added after Meta__Author (the
#                       JSON form of the PORT NOTE, as W1-16's SheetImages config);
#                       every TrueVision key, pack and the pack order unchanged.
#   21 pack files     - verbatim bytes.
# =============================================================================
import argparse
import hashlib
import os
import subprocess
import sys

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
TV_APP = "na-apps/30__TrueVision__CoreAppCode/"
VV_ROOT = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE = os.path.dirname(os.path.abspath(__file__))

JS_REL = "02__Src__AppModules/51__System__LayoutEditor/36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js"
CSS_REL = "02__Src__AppModules/51__System__LayoutEditor/36__System__HatchPatternTools/Na__LayoutEditor__Styles__Patterns__.css"
LIB = "52__LayoutEditor__HatchPatternLibrary"
INDEX_REL = LIB + "/HatchLibrary__Index__.json"
PACK_DIRS = ["02__ConstructionMaterialHatches", "05__SitePlanHatches"]
NOT_PORTED = ["OS_Symbol__Examples__.png", "OS_Symbol__Examples__Woodland&Water__.png"]

RULE = b"// -----------------------------------------------------------------------------\n"


def git_show(rel):
    return subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + TV_APP + rel],
                          check=True, capture_output=True).stdout


def git_ls(prefix):
    out = subprocess.run(["git", "-C", NAWEB, "ls-tree", "-r", "--name-only", PIN, "--", TV_APP + prefix],
                         check=True, capture_output=True).stdout.decode("utf-8")
    return [p[len(TV_APP):] for p in out.splitlines() if p.strip()]


def replace_exact(data, old, new, count, what):
    found = data.count(old)
    if found != count:
        raise SystemExit("SEAM MISMATCH (%s): expected %d of %r, found %d" % (what, count, old, found))
    return data.replace(old, new)


# -----------------------------------------------------------------------------
# HatchPatterns.js
# -----------------------------------------------------------------------------
PORT_NOTE_JS = (
    b"// PORT NOTE:\n"
    b"// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js\n"
    b"// - Source version: 1.5.0 (TrueVision3D v2.164.0, 29-Sep-2026; read at HEAD b2aa9151)\n"
    b"// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-17}}\n"
    b"// - Parity        : verbatim (the code is TrueVision 1.5.0's; the banner, the five console prefixes and this note\n"
    b"//                   are the only differences)\n"
    b"// - Divergences   :\n"
    b"//   - Banner and console prefixes read ValeVision3D.\n"
    b"// - Back-port     : none.\n"
    b"//\n"
)


def build_js():
    tv = git_show(JS_REL)
    if b"\r" in tv:
        raise SystemExit("TV HatchPatterns has CR bytes; expected LF")
    out = replace_exact(tv, b"// TRUEVISION3D - LAYOUT EDITOR - HATCH PATTERNS\n",
                        b"// VALEVISION3D - LAYOUT EDITOR - HATCH PATTERNS\n", 1, "banner")
    out = replace_exact(out, b"[TrueVision3D LayoutEditor]", b"[ValeVision3D LayoutEditor]", 2, "console LayoutEditor")
    out = replace_exact(out, b"[TrueVision3D]", b"[ValeVision3D]", 3, "console bare")
    if b"PORT NOTE" in out:
        raise SystemExit("TV HatchPatterns already has a PORT NOTE; the insertion rule does not apply")
    anchor = RULE + b"//\n// DEVELOPMENT LOG:\n"
    out = replace_exact(out, anchor, RULE + b"//\n" + PORT_NOTE_JS + RULE + b"//\n// DEVELOPMENT LOG:\n", 1, "PORT NOTE anchor")
    # Nothing of TrueVision's identity may remain outside the PORT NOTE.
    start = out.index(b"// PORT NOTE:")
    end = out.index(b"// DEVELOPMENT LOG:")
    outside = out[:start] + out[end:]
    for token in (b"TrueVision", b"TRUEVISION", b"NaProjectPortal", b"na-apps"):
        if token in outside:
            raise SystemExit("identity token %r left outside the PORT NOTE" % token)
    return tv, out


# -----------------------------------------------------------------------------
# Styles__Patterns.css (staged only)
# -----------------------------------------------------------------------------
def build_css():
    tv = git_show(CSS_REL)
    out = replace_exact(tv, b"   TRUEVISION3D - LAYOUT EDITOR - PATTERNS PANEL\n",
                        b"   VALEVISION3D - LAYOUT EDITOR - PATTERNS PANEL\n", 1, "css banner")
    return tv, out


# -----------------------------------------------------------------------------
# HatchLibrary__Index__.json
# -----------------------------------------------------------------------------
PORTED_FROM_JSON = (
    b'        "Meta__PortedFrom"   : "TrueVision3D 52__LayoutEditor__HatchPatternLibrary/HatchLibrary__Index__.json, '
    b'Meta 1.1.0 (TrueVision3D v2.126.0, 21-Sep-2026; read at HEAD b2aa9151), ported 01-Oct-2026 (parity package W1-17). '
    b'Every key, both packs and their order are TrueVision\'s: Construction Materials first, so Brickwork stays the '
    b'pattern a vector\'s Hatch takes with nothing chosen, then the Site Plan pack, shipped because site plans port '
    b'dormant (DR-08 (B), DR-19). The pack folders beside this file are TrueVision\'s, verbatim. Not copied: the two '
    b'OS_Symbol__Examples reference sheets (nothing fetches them), and the empty folders Meta__EmptyPacks names, which '
    b'git does not keep in either app.",\n'
)


def build_index():
    tv = git_show(INDEX_REL)
    anchor = b'        "Meta__Author"       : "Adam Noble - Noble Architecture",\n'
    out = replace_exact(tv, anchor, anchor + PORTED_FROM_JSON, 1, "index Meta__Author anchor")
    return tv, out


# -----------------------------------------------------------------------------
# The set
# -----------------------------------------------------------------------------
def outputs(include_css):
    items = []
    tv_js, vv_js = build_js()
    items.append((JS_REL, vv_js, "seams"))
    if include_css:
        tv_css, vv_css = build_css()
        items.append((CSS_REL, vv_css, "seams (STAGED ONLY)"))
    tv_idx, vv_idx = build_index()
    items.append((INDEX_REL, vv_idx, "Meta__PortedFrom"))
    listed = git_ls(LIB)
    pack_files = [p for p in listed if any(p.startswith(LIB + "/" + d + "/") for d in PACK_DIRS)]
    others = [p for p in listed if p not in pack_files and p != INDEX_REL]
    if sorted(os.path.basename(p) for p in others) != sorted(NOT_PORTED):
        raise SystemExit("unexpected library files outside the packs: %r" % others)
    if len(pack_files) != 21:
        raise SystemExit("expected 21 pack files, found %d" % len(pack_files))
    for rel in sorted(pack_files):
        items.append((rel, git_show(rel), "verbatim"))
    for rel, data, _ in items:
        if b"\r" in data:
            raise SystemExit("CR bytes in output " + rel)
    return items


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_set(root, items, guard):
    written = []
    for rel, data, kind in items:
        dst = os.path.join(root, rel.replace("/", os.sep))
        if os.path.exists(dst):
            with open(dst, "rb") as fh:
                have = fh.read()
            if have == data:
                print("SAME     %s" % rel)
                written.append((rel, data))
                continue
            if guard:
                raise SystemExit("REFUSED: %s exists with other bytes (sha256 %s)" % (rel, sha(have)[:16]))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, "wb") as fh:
            fh.write(data)
        print("WROTE    %-110s %7d bytes  %s  sha256 %s" % (rel, len(data), kind, sha(data)[:16]))
        written.append((rel, data))
    return written


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage")
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    if args.stage:
        items = outputs(include_css=True)
        write_set(os.path.abspath(args.stage), items, guard=False)
        return 0

    items = outputs(include_css=False)
    if args.write:
        # Pre-check every target before writing any (land nothing partial).
        for rel, data, _ in items:
            dst = os.path.join(VV_ROOT, rel.replace("/", os.sep))
            if os.path.exists(dst):
                with open(dst, "rb") as fh:
                    if fh.read() != data:
                        raise SystemExit("REFUSED before any write: %s exists with other bytes" % rel)
        css_live = os.path.join(VV_ROOT, CSS_REL.replace("/", os.sep))
        if os.path.exists(css_live):
            raise SystemExit("REFUSED: the held-back stylesheet already exists live: " + CSS_REL)
        written = write_set(VV_ROOT, items, guard=True)
        with open(os.path.join(HERE, "sha256__written.txt"), "w", encoding="utf-8", newline="\n") as fh:
            for rel, data in written:
                fh.write("%s  %s\n" % (sha(data), rel))
        print("files:", len(written))
        return 0

    if args.check:
        bad = 0
        for rel, data, _ in items:
            dst = os.path.join(VV_ROOT, rel.replace("/", os.sep))
            if not os.path.exists(dst):
                print("MISSING  " + rel); bad += 1; continue
            with open(dst, "rb") as fh:
                have = fh.read()
            print(("OK       " if have == data else "DIFFERS  ") + rel)
            bad += have != data
        css_live = os.path.join(VV_ROOT, CSS_REL.replace("/", os.sep))
        print(("PRESENT  " if os.path.exists(css_live) else "ABSENT   ") + CSS_REL + " (held back; must be ABSENT)")
        bad += os.path.exists(css_live)
        print("result:", "PASS" if not bad else "FAIL (%d)" % bad)
        return 1 if bad else 0

    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
