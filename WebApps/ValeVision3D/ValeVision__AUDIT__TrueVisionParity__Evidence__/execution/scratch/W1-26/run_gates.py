# W1-26 scratch: run the package gates from the VV app root and keep each output.
#   python -B run_gates.py <label> [--files]      label: pre | post | ... ; --files adds the per-file G4 runs
# G1 ModuleGraph, G2 Exports, G3 path gate (OC-04 wrapper), G4 ParityNaming + PortNotes (whole tree,
# and --files on this package's files), the PortNotes watermark at the pin for the files' folders.
# Writes logs/<label>__<gate>.txt; prints one summary line per gate. Read-only on the tree.
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
EXEC = os.path.abspath(os.path.join(HERE, "..", ".."))
LOGS = os.path.join(HERE, "logs")
LE = "02__Src__AppModules/51__System__LayoutEditor/"
MINE = [
    LE + "10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js",
    LE + "10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Modern__.js",
    LE + "10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__QrCell__.js",
    LE + "15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js",
    LE + "15__Core__Markup/Na__LayoutEditor__DimensionGeometry__.js",
    LE + "15__Core__Markup/Na__LayoutEditor__LeaderGeometry__.js",
    "80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.test.mjs",
    "80__Testing__PrototypeEnvironment/Na__Test__TitleBlockScaleCell__.html",
]


def run(name, cmd, label):
    res = subprocess.run(cmd, cwd=VV, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=900)
    out = (res.stdout or "") + (res.stderr or "")
    os.makedirs(LOGS, exist_ok=True)
    with open(os.path.join(LOGS, "%s__%s.txt" % (label, name)), "w", encoding="utf-8") as fh:
        fh.write("$ " + " ".join(cmd) + "\n" + out)
    tail = [l for l in out.strip().splitlines() if l.strip()][-2:]
    print("%-22s exit %d  | %s" % (name, res.returncode, " / ".join(t.strip() for t in tail)[:260]))
    return res.returncode


def main(argv):
    label = argv[0] if argv else "run"
    files = "--files" in argv
    mine = [f for f in MINE if os.path.exists(os.path.join(VV, f.replace("/", os.sep)))]
    codes = {}
    codes["G1_ModuleGraph"] = run("G1_ModuleGraph", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs"], label)
    codes["G2_Exports"] = run("G2_Exports", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs"], label)
    codes["G3_PathGate"] = run("G3_PathGate", ["python", "-B", os.path.join(EXEC, "tools", "path_gate_records_exempt.py"), "--root", VV], label)
    codes["G4_Naming_tree"] = run("G4_Naming_tree", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__ParityNaming__.mjs"], label)
    codes["G4_PortNotes_tree"] = run("G4_PortNotes_tree", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__PortNotes__.mjs"], label)
    if files and mine:
        codes["G4_Naming_files"] = run("G4_Naming_files", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__ParityNaming__.mjs", "--files"] + mine, label)
        codes["G4_PortNotes_files"] = run("G4_PortNotes_files", ["node", "80__Testing__PrototypeEnvironment/Na__Verify__PortNotes__.mjs", "--verbose", "--files"] + mine, label)
        for under in [LE + "10__Core__SheetSurface", LE + "15__Core__Markup"]:
            tag = "G4_Watermark_" + under.split("/")[-1].split("__")[0]
            codes[tag] = run(tag, ["node", "80__Testing__PrototypeEnvironment/Na__Verify__PortNotes__.mjs",
                                   "--tv", r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode",
                                   "--pin", "b2aa9151", "--under", under], label)
    bad = [k for k, v in codes.items() if v != 0]
    print("GATES %s: %s" % (label, "all exit 0" if not bad else "non-zero: " + ", ".join(bad)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
