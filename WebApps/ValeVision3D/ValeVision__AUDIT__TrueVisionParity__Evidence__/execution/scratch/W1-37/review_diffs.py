"""Print every difference between each W1-37 candidate and (a) TrueVision at the pin, (b) this app's live file
where one exists. Line endings are compared separately and normalised for the text diff.

Usage: python -B review_diffs.py [--live]   (--live: compare the LIVE tree's files instead of the candidates)
"""
import difflib
import os
import subprocess
import sys

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN   = "b2aa9151"
APP   = "na-apps/30__TrueVision__CoreAppCode/"
VV    = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE  = os.path.dirname(os.path.abspath(__file__))
CAND  = os.path.join(HERE, "candidates")
PRE   = os.path.join(HERE, "preimage")

FILES = [
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__.js",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Manager__.js",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Picker__.js",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Config__.json",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Styles__.css",
    "02__Src__AppModules/54__Feature__ColourPalette/README__ColourPalette__.md",
    "02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js",
    "03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css",
]


def tv(rel):
    p = subprocess.run(["git", "-C", NAWEB, "show", f"{PIN}:{APP}{rel}"], capture_output=True)
    return p.stdout if p.returncode == 0 else None


def read(path):
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        return f.read()


def show(a, b, name_a, name_b):
    ta = a.decode("utf-8").replace("\r\n", "\n").splitlines()
    tb = b.decode("utf-8").replace("\r\n", "\n").splitlines()
    diff = list(difflib.unified_diff(ta, tb, name_a, name_b, n=1, lineterm=""))
    if not diff:
        print("    (text identical)")
    for line in diff:
        print("    " + line)


live = "--live" in sys.argv
for rel in FILES:
    mine = read(os.path.join(VV if live else CAND, rel.replace("/", os.sep)))
    print("=" * 110)
    print(f"{rel}   [{'LIVE' if live else 'candidate'}: {'CRLF' if mine and b'\r\n' in mine else 'LF'}]")
    base = tv(rel)
    print(f"  -- against TrueVision {PIN}:")
    show(base, mine, "TV", "VV")
    vv_old = read(os.path.join(PRE if live else VV, rel.replace("/", os.sep)))
    if vv_old is not None and not (live and rel.startswith("02__Src__AppModules/54")):
        print(f"  -- against this app's {'pre-image' if live else 'live file'} ({'CRLF' if b'\r\n' in vv_old else 'LF'}):")
        show(vv_old, mine, "VV-before", "VV-after")
