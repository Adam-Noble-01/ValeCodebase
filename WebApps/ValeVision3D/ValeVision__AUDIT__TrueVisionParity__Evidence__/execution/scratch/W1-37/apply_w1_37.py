"""Land W1-37's candidates in the live ValeVision tree, or take them out again.

  python -B apply_w1_37.py            land: refuse unless the two existing targets still hash as read on 02-Oct-2026
                                      and none of the six new files exists; pre-images to scratch/W1-37/preimage/;
                                      the palette's files first, then the toolbar that imports them, then the CSS
                                      index that imports the stylesheet; every write read back and compared.
  python -B apply_w1_37.py --restore  restore: refuse unless every landed file is still exactly as landed; put the
                                      two pre-images back and delete the six new files (and the folder if empty).
"""
import hashlib
import os
import sys

VV   = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, "candidates")
PRE  = os.path.join(HERE, "preimage")

PALDIR = "02__Src__AppModules/54__Feature__ColourPalette"
NEW = [
    PALDIR + "/Na__ColourPalette__Config__.json",
    PALDIR + "/Na__ColourPalette__Manager__.js",
    PALDIR + "/Na__ColourPalette__Picker__.js",
    PALDIR + "/Na__ColourPalette__.js",
    PALDIR + "/Na__ColourPalette__Styles__.css",
    PALDIR + "/README__ColourPalette__.md",
]
SWAP = {
    "02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js": "9f57bbbfe2154c61afbfa6cde791502be262c5d9",
    "03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css": "5d519dbaa2fd4f21e0ef54a621899fddf877513a",
}
ORDER = NEW + list(SWAP.keys())


def p(base, rel):
    return os.path.join(base, rel.replace("/", os.sep))


def sha1(path):
    with open(path, "rb") as f:
        return hashlib.sha1(f.read()).hexdigest()


def land():
    problems = []
    for rel, want in SWAP.items():
        got = sha1(p(VV, rel)) if os.path.exists(p(VV, rel)) else "ABSENT"
        if got != want:
            problems.append(f"{rel} changed since it was read: {got[:8]} (expected {want[:8]})")
    for rel in NEW:
        if os.path.exists(p(VV, rel)):
            problems.append(f"{rel} already exists")
    for rel in ORDER:
        if not os.path.exists(p(CAND, rel)):
            problems.append(f"candidate missing: {rel}")
    if problems:
        print("REFUSED - nothing written:")
        for line in problems:
            print("  " + line)
        sys.exit(1)

    for rel in SWAP:
        os.makedirs(os.path.dirname(p(PRE, rel)), exist_ok=True)
        with open(p(VV, rel), "rb") as src, open(p(PRE, rel), "wb") as dst:
            dst.write(src.read())
        if sha1(p(PRE, rel)) != SWAP[rel]:
            print(f"REFUSED - pre-image of {rel} did not read back")
            sys.exit(1)

    os.makedirs(p(VV, PALDIR), exist_ok=True)
    for rel in ORDER:
        with open(p(CAND, rel), "rb") as f:
            data = f.read()
        with open(p(VV, rel), "wb") as f:
            f.write(data)
        ok = sha1(p(VV, rel)) == hashlib.sha1(data).hexdigest()
        print(f"  {'landed ' if ok else 'MISMATCH'} {hashlib.sha1(data).hexdigest()[:8]}  {rel}")
        if not ok:
            sys.exit(2)
    print("W1-37 landed: 6 new files, 2 replaced; pre-images in " + PRE)


def restore():
    problems = []
    for rel in ORDER:
        if not os.path.exists(p(VV, rel)):
            problems.append(f"{rel} is not in the tree")
        elif sha1(p(VV, rel)) != sha1(p(CAND, rel)):
            problems.append(f"{rel} changed since W1-37 landed it")
    for rel in SWAP:
        if not os.path.exists(p(PRE, rel)) or sha1(p(PRE, rel)) != SWAP[rel]:
            problems.append(f"pre-image missing or wrong: {rel}")
    if problems:
        print("REFUSED - nothing restored:")
        for line in problems:
            print("  " + line)
        sys.exit(1)
    for rel in reversed(ORDER):
        if rel in SWAP:
            with open(p(PRE, rel), "rb") as src, open(p(VV, rel), "wb") as dst:
                dst.write(src.read())
            print(f"  restored {rel}")
        else:
            os.remove(p(VV, rel))
            print(f"  removed  {rel}")
    try:
        os.rmdir(p(VV, PALDIR))
        print(f"  removed  {PALDIR}/")
    except OSError:
        print(f"  kept     {PALDIR}/ (not empty)")


if __name__ == "__main__":
    restore() if "--restore" in sys.argv else land()
