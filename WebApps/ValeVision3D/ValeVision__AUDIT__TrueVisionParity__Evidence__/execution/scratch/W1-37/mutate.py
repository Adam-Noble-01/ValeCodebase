"""Plant one fault at a time in a temporary copy of the candidates and prove w1_37_check.mjs fails on each.
The copies live in the OS temp folder and are removed afterwards. Nothing in the repository is touched.
"""
import os
import shutil
import subprocess
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, "candidates")
PAL  = os.path.join("02__Src__AppModules", "54__Feature__ColourPalette")
TOOL = os.path.join("02__Src__AppModules", "43__System__PlanAnnotations", "Na__PlanAnnotations__Toolbar__.js")

MUTATIONS = [
    ("toolbar no longer attaches its colour field", TOOL,
     "        Na__ColourPalette__Attach(input);", "        // (attach removed)"),
    ("a pick fires change before input", os.path.join(PAL, "Na__ColourPalette__Picker__.js"),
     "Na__ColourPicker__Deliver(input, colour.Colour__Hex, [ 'input', 'change' ]);", "Na__ColourPicker__Deliver(input, colour.Colour__Hex, [ 'change', 'input' ]);"),
    ("the field keeps the focus after a pick", os.path.join(PAL, "Na__ColourPalette__Picker__.js"),
     "if (document.activeElement === input && typeof input.blur === 'function') input.blur();", ";"),
    ("a disabled field opens the palette", os.path.join(PAL, "Na__ColourPalette__Picker__.js"),
     "if (!input || input.disabled || !Na__ColourPalette__IsAvailable()) return;", "if (!input || !Na__ColourPalette__IsAvailable()) return;"),
    ("the NA palette name left in the config", os.path.join(PAL, "Na__ColourPalette__Config__.json"),
     '"Vale Garden Houses Standard"', '"Noble Architecture Standard"'),
    ("a grey changed in the config", os.path.join(PAL, "Na__ColourPalette__Config__.json"),
     '"Colour__Hex"           : "#737373"', '"Colour__Hex"           : "#747474"'),
    ("the TrueVision console prefix left in the manager", os.path.join(PAL, "Na__ColourPalette__Manager__.js"),
     "console.log('[ValeVision3D ColourPalette] ' + Na__ColourPalette__ByName.size", "console.log('[TrueVision3D ColourPalette] ' + Na__ColourPalette__ByName.size"),
    ("the getter seam undone (GetTextSetup from Data again)", TOOL,
     "        Na__PlanDim__SetNewDefaults,\n        Na__PlanDim__Update,", "        Na__PlanDim__SetNewDefaults,\n        Na__PlanDim__GetTextSetup,\n        Na__PlanDim__Update,"),
]

caught = 0
for label, rel, old, new in MUTATIONS:
    tmp = tempfile.mkdtemp(prefix="w1_37_mut_")
    try:
        root = os.path.join(tmp, "root")
        shutil.copytree(CAND, root)
        path = os.path.join(root, rel)
        text = open(path, "r", encoding="utf-8", newline="").read()
        if text.count(old) != 1:
            print(f"SETUP FAULT  {label}: anchor found {text.count(old)} times")
            continue
        open(path, "w", encoding="utf-8", newline="").write(text.replace(old, new))
        p = subprocess.run(["node", os.path.join(HERE, "w1_37_check.mjs"), "--root", root], capture_output=True)
        out = p.stdout.decode("utf-8", errors="replace")
        failed = [l for l in out.splitlines() if l.startswith("FAIL")]
        ok = p.returncode != 0 and failed
        caught += 1 if ok else 0
        print(f"{'CAUGHT' if ok else 'MISSED'}  {label}  (exit {p.returncode}; {len(failed)} failing check(s): {failed[0][6:90] if failed else '-'})")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
print(f"\n{caught}/{len(MUTATIONS)} planted faults caught")
