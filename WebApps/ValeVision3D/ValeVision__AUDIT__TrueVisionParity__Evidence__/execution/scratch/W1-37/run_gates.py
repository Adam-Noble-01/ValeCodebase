"""Run W1-37's gates from the VV app root and save each output as <label>_<gate>.txt in this folder.

Usage: python -B run_gates.py <label> [--tests] [--quick]
  --tests  also run every 80__Testing__PrototypeEnvironment/*.test.mjs (the regression sweep)
  --quick  G1, G2, G4 (own files) only
"""
import glob
import os
import subprocess
import sys

VV   = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
TV   = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode"
PIN  = "b2aa9151"
HERE = os.path.dirname(os.path.abspath(__file__))
GATE3 = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\tools\path_gate_records_exempt.py"

MINE = [
    "02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js",
    "03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__.js",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Manager__.js",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Picker__.js",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Config__.json",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Styles__.css",
]


def run(label, name, cmd):
    proc = subprocess.run(cmd, cwd=VV, capture_output=True)
    out = proc.stdout.decode("utf-8", errors="replace") + proc.stderr.decode("utf-8", errors="replace")
    path = os.path.join(HERE, f"{label}_{name}.txt")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(f"$ {' '.join(cmd)}\n(exit {proc.returncode})\n\n{out}")
    tail = [l for l in out.strip().splitlines() if l.strip()][-1:] or ["(no output)"]
    print(f"{name:<22} exit {proc.returncode}   {tail[0][:150]}")
    return proc.returncode


def main():
    label = sys.argv[1]
    quick = "--quick" in sys.argv
    tests = "--tests" in sys.argv
    existing = [p for p in MINE if os.path.exists(os.path.join(VV, p.replace("/", os.sep)))]
    run(label, "g1", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs"])
    run(label, "g2", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs"])
    run(label, "g4_naming_mine", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__ParityNaming__.mjs", "--files", *existing, "--tv", TV, "--pin", PIN])
    run(label, "g4_portnotes_mine", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__PortNotes__.mjs", "--files", *existing, "--tv", TV, "--pin", PIN, "--verbose"])
    if quick:
        return
    run(label, "g3", [sys.executable, "-B", GATE3, "--root", VV])
    run(label, "g4_naming_tree", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__ParityNaming__.mjs"])
    run(label, "g4_portnotes_tree", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__PortNotes__.mjs", "--fails-only"])
    run(label, "uiparity", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__UiParity__.mjs", TV, "--pin", PIN])
    js = [p for p in existing if p.endswith(".js")]
    for p in js:
        run(label, "check_" + os.path.basename(p).replace(".js", ""), ["node", "--check", p])
    if tests:
        for t in sorted(glob.glob(os.path.join(VV, "80__Testing__PrototypeEnvironment", "*.test.mjs"))):
            rel = os.path.relpath(t, VV).replace(os.sep, "/")
            run(label, "test_" + os.path.basename(t).replace(".test.mjs", ""), ["node", rel])


if __name__ == "__main__":
    main()
