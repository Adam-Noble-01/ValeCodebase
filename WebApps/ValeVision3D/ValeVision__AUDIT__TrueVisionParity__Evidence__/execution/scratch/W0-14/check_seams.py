"""Prove the two whole-file ports differ from TrueVision (at the pin) ONLY in the declared seams (R6 F.1 P3).

Usage: python check_seams.py [dir]   (default: the live ValeVision files; 'out' = scratch/W0-14/out)

Every changed TrueVision line must be one of the declared seam lines, every added ValeVision line must sit in the
PORT NOTE block or be a declared seam line, and the files' line counts outside the PORT NOTE must match. Read only.
"""
import difflib
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV_SRC = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"

PORTS = {
    "51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__Assets__.js": {
        "removed": [
            r"^// TRUEVISION3D - LAYOUT EDITOR - ASSETS$",
            r"^    import \{ Na__DevGate__IsAuthoringEnabled \} from '\.\./\.\./03__AppUtils/Na__AppUtils__DevGate__\.js';$",
            r"^        return Na__DevGate__IsAuthoringEnabled\(\) && !!Na__DrawData__GetProjectCode\(\);$",
            r"^            console\.warn\('\[TrueVision3D LayoutEditor\] Snapshot upload failed:', uploadError\);$",
        ],
        "added": [
            r"^// VALEVISION3D - LAYOUT EDITOR - ASSETS$",
            r"^    import \{ Na__AppUtils__IsRunningOnLocalhost \} from '\.\./\.\./03__AppUtils/Na__AppUtils__ProjectLoader\.js';   // <-- ValeVision: .*$",
            r"^        return Na__AppUtils__IsRunningOnLocalhost\(\) && !!Na__DrawData__GetProjectCode\(\);$",
            r"^            console\.warn\('\[ValeVision3D LayoutEditor\] Snapshot upload failed:', uploadError\);$",
        ],
    },
    "50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js": {
        "removed": [
            r"^// TRUEVISION3D - PROJECTED LINEWORK - PERSISTENCE$",
            r"^    import \{ Na__DevGate__IsAuthoringEnabled \} from '\.\./03__AppUtils/Na__AppUtils__DevGate__\.js';$",
            r"^    const Na__PlStore__DB_NAME  = 'TrueVision3D__ProjectedLinework';$",
            r"^                Description        : 'Projected linework for one TrueVision drawing, .*$",
            r"^.*\[TrueVision3D ProjectedLinework\].*$",
            r"^        if \(!Na__DevGate__IsAuthoringEnabled\(\)\) return null;$",
        ],
        "added": [
            r"^// VALEVISION3D - PROJECTED LINEWORK - PERSISTENCE$",
            r"^    import \{ Na__AppUtils__IsRunningOnLocalhost \} from '\.\./03__AppUtils/Na__AppUtils__ProjectLoader\.js';   // <-- ValeVision: .*$",
            r"^    const Na__PlStore__DB_NAME  = 'ValeVision3D__ProjectedLinework';$",
            r"^                Description        : 'Projected linework for one ValeVision drawing, .*$",
            r"^.*\[ValeVision3D ProjectedLinework\].*$",
            r"^        if \(!Na__AppUtils__IsRunningOnLocalhost\(\)\) return null;$",
        ],
    },
}


def lines_of(data):
    return data.decode("utf-8").replace("\r\n", "\n").split("\n")


def port_note_span(lines):
    start = lines.index("// PORT NOTE:")
    end = start + 1
    while not (lines[end] == "//" and lines[end + 1].startswith("// ----")):
        end += 1
    return start, end


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else None
    ok = True
    for rel, seams in PORTS.items():
        tv = lines_of(subprocess.run(["git", "-C", NAWEB, "show", f"{PIN}:na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/{rel}"],
                                     capture_output=True, check=True).stdout)
        if target == "out":
            path = os.path.join(HERE, "out", os.path.basename(rel))
        elif target:
            path = os.path.join(target, os.path.basename(rel))
        else:
            path = os.path.join(VV_SRC, rel.replace("/", os.sep))
        vv = lines_of(open(path, "rb").read())
        tv_note = port_note_span(tv)
        vv_note = port_note_span(vv)
        bad = []
        sm = difflib.SequenceMatcher(a=tv, b=vv, autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == "equal":
                continue
            for i in range(i1, i2):
                in_note = tv_note[0] <= i <= tv_note[1]
                if not in_note and not any(re.match(p, tv[i]) for p in seams["removed"]):
                    bad.append(("TV line changed outside the seams", i + 1, tv[i]))
            for j in range(j1, j2):
                in_note = vv_note[0] <= j <= vv_note[1]
                if not in_note and not any(re.match(p, vv[j]) for p in seams["added"]):
                    bad.append(("VV line added outside the seams", j + 1, vv[j]))
        outside_tv = len(tv) - (tv_note[1] - tv_note[0] + 1)
        outside_vv = len(vv) - (vv_note[1] - vv_note[0] + 1)
        print(f"{os.path.basename(rel)}: TV {len(tv)} lines, VV {len(vv)} lines; outside the PORT NOTE {outside_tv} vs {outside_vv}; "
              f"{'PASS' if not bad and outside_tv == outside_vv else 'FAIL'}")
        for item in bad:
            print("   ", item)
        ok = ok and not bad and outside_tv == outside_vv
    print("RESULT:", "PASS - only the declared seams differ from TrueVision" if ok else "FAIL")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
