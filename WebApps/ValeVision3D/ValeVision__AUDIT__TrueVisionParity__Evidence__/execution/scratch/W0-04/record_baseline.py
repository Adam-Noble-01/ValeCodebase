# W0-04: record the G4 baseline allow-list from the tree as it stands.
# Runs both verifiers' --print-baseline (they write nothing), merges the two parts, and writes
# 80__Testing__PrototypeEnvironment/Na__Verify__ParityBaseline__.json once (LF, ASCII, 1-space indent).
# --check prints the merged document's counts without writing.
import json, os, subprocess, sys, datetime

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
TEST = os.path.join(VV, "80__Testing__PrototypeEnvironment")
TARGET = os.path.join(TEST, "Na__Verify__ParityBaseline__.json")
HERE = os.path.dirname(os.path.abspath(__file__))


def run(script):
    r = subprocess.run(["node", os.path.join(TEST, script), "--print-baseline"], capture_output=True, cwd=VV)
    if r.returncode != 0:
        print("STOP:", script, r.stderr.decode(errors="replace"))
        sys.exit(3)
    return json.loads(r.stdout.decode("utf-8"))


def main():
    a = run("Na__Verify__PortNotes__.mjs")
    b = run("Na__Verify__ParityNaming__.mjs")
    stamp = datetime.datetime.now().strftime("%d-%b-%Y %H:%M")
    doc = {
        "about": a["about"],
        "recordedOn": stamp + " (local time), by package W0-04, on the working tree after W0-02, W0-03 and W0-06 and while other Wave 0 packages were landing",
        "parityNaming": b["parityNaming"],
        "portNotes": a["portNotes"],
    }
    text = json.dumps(doc, indent=1, ensure_ascii=True) + "\n"
    pn = doc["parityNaming"]["files"]
    po = doc["portNotes"]["files"]
    print("parityNaming:", len(pn), "file(s):", ", ".join(f["file"] + " " + "/".join(x["code"] for x in f["findings"]) for f in pn))
    print("portNotes   :", len(po), "file(s)")
    if "--check" in sys.argv:
        return
    with open(TARGET, "w", encoding="ascii", newline="\n") as f:
        f.write(text)
    with open(os.path.join(HERE, "baseline_recorded_copy.json"), "w", encoding="ascii", newline="\n") as f:
        f.write(text)
    print("written", TARGET, len(text), "bytes")


main()
