"""Run W1-38's gates from the VV app root and save each output as <label>_<gate>.txt in this folder.

Usage: python -B run_gates.py <label> [--tests] [--quick] [--block]
  --tests  also run every 80__Testing__PrototypeEnvironment/*.test.mjs (the regression sweep)
  --quick  G1, G2, G4 (own files) only
  --block  run UiParity with --block all (the W1 continuation's exit condition) as well as in report mode
"""
import glob
import os
import subprocess
import sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
TV = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode"
PIN = "b2aa9151"
HERE = os.path.dirname(os.path.abspath(__file__))
GATE3 = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\tools\path_gate_records_exempt.py"

MINE = [
    "02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js",
    "02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css",
    "80__Testing__PrototypeEnvironment/Na__Test__ColourPalette__.test.mjs",
]


def run(label, name, cmd):
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    proc = subprocess.run(cmd, cwd=VV, capture_output=True, env=env)
    out = proc.stdout.decode("utf-8", errors="replace") + proc.stderr.decode("utf-8", errors="replace")
    path = os.path.join(HERE, f"{label}_{name}.txt")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(f"$ {' '.join(cmd)}\n(exit {proc.returncode})\n\n{out}")
    tail = [l for l in out.strip().splitlines() if l.strip()][-1:] or ["(no output)"]
    print(f"{name:<34} exit {proc.returncode}   {tail[0][:150]}")
    return proc.returncode


def main():
    label = sys.argv[1]
    quick = "--quick" in sys.argv
    tests = "--tests" in sys.argv
    block = "--block" in sys.argv
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
    if block:
        run(label, "uiparity_block_all", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__UiParity__.mjs", TV, "--pin", PIN, "--block", "all"])
    for p in existing:
        if p.endswith(".js") or p.endswith(".mjs"):
            run(label, "check_" + os.path.basename(p).split(".")[0], ["node", "--check", p])
    if tests:
        for t in sorted(glob.glob(os.path.join(VV, "80__Testing__PrototypeEnvironment", "*.test.mjs"))):
            rel = os.path.relpath(t, VV).replace(os.sep, "/")
            run(label, "test_" + os.path.basename(t).replace(".test.mjs", ""), ["node", rel])


if __name__ == "__main__":
    main()
