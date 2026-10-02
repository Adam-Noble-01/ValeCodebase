# W1-17 - does G4 (Na__Verify__ParityNaming__.mjs) accept Styles__Patterns.css landing before its only home?
# Runs the LIVE verifier against a throwaway minimal app root in scratch (never the live tree):
#   A. the staged JS + staged CSS, nothing linking the CSS            (what W1-17 alone would land)
#   B. A plus a stand-in Panel__Patterns linking it exactly as TrueVision's Panel__Patterns:365 does
#      (what the tree looks like once W2-29 lands the panel)
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV_ROOT = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
VERIFY = os.path.join(VV_ROOT, "80__Testing__PrototypeEnvironment", "Na__Verify__ParityNaming__.mjs")
REG = "ValeVision__NOTES__FolderNumberRegistry__.md"
DIR = os.path.join("02__Src__AppModules", "51__System__LayoutEditor", "36__System__HatchPatternTools")
ROOT = os.path.join(HERE, "g4root")

STUB_PANEL = (
    "// =============================================================================\n"
    "// VALEVISION3D - LAYOUT EDITOR - PATTERNS PANEL (EXPERIMENT STAND-IN, SCRATCH ONLY)\n"
    "// =============================================================================\n"
    "//\n"
    "// FILE       : Na__LayoutEditor__Panel__Patterns__.js\n"
    "//\n"
    "// =============================================================================\n"
    "\n"
    "    function Na__LePanelPatterns__Register() {\n"
    "        const link = document.createElement('link');\n"
    "        link.rel  = 'stylesheet';\n"
    "        link.href = new URL('./Na__LayoutEditor__Styles__Patterns__.css', import.meta.url).href;\n"
    "        document.head.appendChild(link);\n"
    "    }\n"
    "\n"
    "    export { Na__LePanelPatterns__Register };\n"
)


def run(label):
    out = subprocess.run(["node", VERIFY, "--root", ROOT], capture_output=True, text=True)
    print("=== %s: exit %d" % (label, out.returncode))
    for line in out.stdout.splitlines():
        if line.strip().startswith(("FAIL", "WARN", "RESULT", "checked", ">")) or "stylesheet" in line:
            print("    " + line.strip())
    return out.returncode


def main():
    if os.path.exists(ROOT):
        shutil.rmtree(ROOT)
    os.makedirs(os.path.join(ROOT, DIR))
    shutil.copy2(os.path.join(VV_ROOT, REG), os.path.join(ROOT, REG))
    for name in ("Na__LayoutEditor__HatchPatterns__.js", "Na__LayoutEditor__Styles__Patterns__.css"):
        shutil.copy2(os.path.join(HERE, "stage", DIR, name), os.path.join(ROOT, DIR, name))
    a = run("A - JS + CSS, nothing links the CSS (W1-17 as planned)")
    with open(os.path.join(ROOT, DIR, "Na__LayoutEditor__Panel__Patterns__.js"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(STUB_PANEL)
    b = run("B - plus the panel's own link (the tree after W2-29)")
    shutil.rmtree(ROOT)
    print("conclusion:", "CSS without its panel FAILS G4; with the panel it PASSES" if (a == 1 and b == 0) else "unexpected (A=%d, B=%d)" % (a, b))
    return 0 if (a == 1 and b == 0) else 1


if __name__ == "__main__":
    sys.exit(main())
