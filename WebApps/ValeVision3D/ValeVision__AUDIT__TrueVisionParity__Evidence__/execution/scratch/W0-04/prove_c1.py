# W0-04 proof: Na__Verify__PortNotes__ --tv reproduces the S11 c.1 column for LE/07__Core__SheetData.
# 1. Extract LE/07 as it stood at VV HEAD 7b4e593a (the tree S11 measured) into the session scratchpad (outside the repo).
# 2. Run the verifier with --root <that copy> --tv <TV root> --pin b2aa9151 --under LE/07, and on the live tree.
# 3. Compare each module's "after:" list with the c.1 column parsed from the S11 slice report.
# Writes only into the session scratchpad and this scratch folder.
import os, re, subprocess, sys, json

VCB = r"D:\10_CoreLib__ValeCodebase"
VV = os.path.join(VCB, "WebApps", "ValeVision3D")
TV = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode"
HEAD = "7b4e593a"
LE07 = "02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData"
SCRATCHPAD = r"C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f105155\scratchpad"
COPY = os.path.join(SCRATCHPAD, "w0_04_c1_head_copy")
S11 = os.path.join(VV, "ValeVision__AUDIT__TrueVisionParity__Evidence__", "parity", "slices", "S11__Ledger_Release_Watermark.md")
HERE = os.path.dirname(os.path.abspath(__file__))
VERIFIER = os.path.join(VV, "80__Testing__PrototypeEnvironment", "Na__Verify__PortNotes__.mjs")


def extract_head_copy():
    names = subprocess.run(["git", "-C", VCB, "ls-tree", "-r", "--name-only", HEAD, "--", "WebApps/ValeVision3D/" + LE07],
                           capture_output=True, check=True).stdout.decode().split("\n")
    names = [n for n in names if n.strip()]
    for n in names:
        blob = subprocess.run(["git", "-C", VCB, "show", f"{HEAD}:{n}"], capture_output=True, check=True).stdout
        rel = n[len("WebApps/ValeVision3D/"):]
        dst = os.path.join(COPY, rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, "wb") as f:
            f.write(blob)
    return len(names)


def c1_column():
    rows = {}
    for line in open(S11, encoding="utf-8"):
        if not line.startswith("| ") or LE07 not in line:
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 9 or not cells[0].isdigit():
            continue
        tv_path = cells[1].strip("`")
        after = cells[7]
        rows[tv_path] = "-" if after == "-" else after
    return rows


def run(root):
    out = subprocess.run(["node", VERIFIER, "--root", root, "--fails-only", "--tv", TV, "--pin", "b2aa9151", "--under", LE07],
                         capture_output=True).stdout.decode("utf-8", "replace")
    result = {}
    lines = out.splitlines()
    for i, line in enumerate(lines):
        m = re.match(r"^    (02__Src__AppModules/\S+)$", line)
        if m and i + 1 < len(lines):
            a = re.search(r"\| after: (.*)$", lines[i + 1])
            result[m.group(1)] = a.group(1).strip() if a else None
    return out, result


def main():
    n = extract_head_copy()
    c1 = c1_column()
    report = {"head_copy_files": n, "c1_rows": len(c1), "head": {}, "live": {}}
    for label, root in (("head", COPY), ("live", VV)):
        out, got = run(root)
        with open(os.path.join(HERE, f"prove_c1__{label}.txt"), "w", encoding="utf-8") as f:
            f.write(out)
        same = diff = 0
        for path, want in sorted(c1.items()):
            have = got.get(path)
            ok = have == want
            same += ok
            diff += (not ok)
            report[label][path.split("/")[-1]] = {"c1": want, "verifier": have, "equal": ok}
        report[label + "_summary"] = f"{same} equal, {diff} differ of {len(c1)} c.1 rows"
    with open(os.path.join(HERE, "prove_c1.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1)
    print("HEAD copy:", report["head_summary"])
    print("live    :", report["live_summary"])
    for label in ("head", "live"):
        for k, v in report[label].items():
            if not v["equal"]:
                print(f"  {label} DIFF {k}: c1={v['c1']!r} verifier={v['verifier']!r}")


main()
