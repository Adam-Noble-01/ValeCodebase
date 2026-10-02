# W1-17 - prove acceptance_check.mjs bites: each mutated copy of the staged set must FAIL (exit 1),
# the unmutated control must PASS (exit 0). Works only inside scratch/W1-17; never touches the live tree.
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
STAGE = os.path.join(HERE, "stage")
WORK = os.path.join(HERE, "mutants")
HARNESS = os.path.join(HERE, "acceptance_check.mjs")
JS = os.path.join("02__Src__AppModules", "51__System__LayoutEditor", "36__System__HatchPatternTools", "Na__LayoutEditor__HatchPatterns__.js")
LIB = "52__LayoutEditor__HatchPatternLibrary"


def edit(root, rel, old, new):
    path = os.path.join(root, rel)
    with open(path, "rb") as fh:
        data = fh.read()
    if data.count(old) != 1:
        raise SystemExit("mutation anchor not unique in %s: %r" % (rel, old))
    with open(path, "wb") as fh:
        fh.write(data.replace(old, new))


def swap_packs(root):
    rel = os.path.join(LIB, "HatchLibrary__Index__.json")
    path = os.path.join(root, rel)
    with open(path, "rb") as fh:
        data = fh.read()
    a = b'{ "Pack__Key": "ConstructionMaterialHatches"'
    b = b'{ "Pack__Key": "SitePlanHatches"'
    lines = data.split(b"\n")
    ia = next(i for i, l in enumerate(lines) if a in l)
    ib = next(i for i, l in enumerate(lines) if b in l)
    la, lb = lines[ia].rstrip(b","), lines[ib].rstrip(b",")
    lines[ia], lines[ib] = lb + b",", la
    with open(path, "wb") as fh:
        fh.write(b"\n".join(lines))


MUTANTS = [
    ("control (unmutated)", None, 0),
    ("pack order swapped in the root index", swap_packs, 1),
    ("one Brickwork placement moved", lambda r: edit_first_number(r), 1),
    ("points-to-mm constant changed in the module", lambda r: edit(r, JS, b"const Na__LeHatch__PT_TO_MM      = 25.4 / 72;", b"const Na__LeHatch__PT_TO_MM      = 25.4 / 73;"), 1),
    ("Site Plan pack index missing", lambda r: os.remove(os.path.join(r, LIB, "05__SitePlanHatches", "HatchPack__Index__.json")), 1),
    ("console prefix left as another app's", lambda r: edit(r, JS, b"console.log(`[ValeVision3D] Hatch patterns:", b"console.log(`[OtherApp3D] Hatch patterns:"), 1),
]


def edit_first_number(root):
    rel = os.path.join(LIB, "02__ConstructionMaterialHatches", "Na__HatchPattern__Construction__Brickwork__.json")
    path = os.path.join(root, rel)
    with open(path, "rb") as fh:
        data = fh.read()
    key = b'"Place__XMm"'
    at = data.index(key)
    colon = data.index(b":", at)
    end = colon + 1
    while data[end:end + 1] in (b" ",):
        end += 1
    stop = end
    while data[stop:stop + 1] in b"-0123456789.":
        stop += 1
    value = float(data[end:stop])
    with open(path, "wb") as fh:
        fh.write(data[:end] + repr(value + 0.5).encode() + data[stop:])


def main():
    if os.path.exists(WORK):
        shutil.rmtree(WORK)
    os.makedirs(WORK)
    bad = 0
    for index, (name, mutate, expect) in enumerate(MUTANTS):
        root = os.path.join(WORK, "m%d" % index)
        shutil.copytree(STAGE, root)
        if mutate:
            mutate(root)
        run = subprocess.run(["node", HARNESS, root], capture_output=True, text=True)
        ok = run.returncode == expect
        bad += not ok
        fails = [l.strip() for l in run.stdout.splitlines() if l.strip().startswith("FAIL")]
        print("%-4s %-48s exit %d (expected %d)%s" % ("OK" if ok else "BAD", name, run.returncode, expect,
                                                     ("  first failing check: " + fails[0][6:80]) if fails else ""))
    shutil.rmtree(WORK)
    print("result:", "PASS" if not bad else "FAIL (%d)" % bad)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
