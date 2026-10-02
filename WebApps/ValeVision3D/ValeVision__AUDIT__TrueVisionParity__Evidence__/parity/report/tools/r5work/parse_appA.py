# Parse S11 Appendix A (verified) into JSON rows
import re, json, sys, io
sys.stdout.reconfigure(encoding='utf-8')
P = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity"
lines = io.open(P + "/slices/S11__Ledger_Release_Watermark.md", encoding="utf-8").read().split("\n")
start = None
for i, l in enumerate(lines):
    if l.startswith("## Appendix A"):
        start = i
    if start is not None and i > start and l.startswith("## Appendix B"):
        end = i
        break
rows = []
for i in range(start, end):
    l = lines[i]
    if not l.startswith("| v2.") and not l.startswith("| (") and not l.startswith("| -"):
        if not (l.startswith("| ") and re.match(r"^\| [^|]*v2\.", l)):
            continue
    cells = [c.strip() for c in l.strip().strip("|").split("|")]
    if len(cells) < 9:
        # some cells may contain pipes? join tail
        pass
    if cells[0].startswith("TV version"):
        continue
    if len(cells) > 9:
        cells = cells[:8] + [" | ".join(cells[8:])]
    ver_cell = cells[0]
    m = re.match(r"(v[\d.]+|\(no TV entry\)|[^(]+?)\s*(\(L(\d+)\))?\s*$", ver_cell)
    cls_raw = cells[4]
    m2 = re.search(r"\*\*([A-Z/-]+)\*\*", cls_raw)
    cls = m2.group(1) if m2 else cls_raw
    rows.append(dict(src_line=i + 1, ver_cell=ver_cell, ver=(re.search(r"v2\.\d+\.\d+", ver_cell).group(0) if re.search(r"v2\.\d+\.\d+", ver_cell) else ver_cell),
                     tvline=(m.group(3) if m and m.group(3) else ""), date=cells[1], title=cells[2], area=cells[3], cls=cls, cls_raw=cls_raw,
                     vv=cells[5], owner=cells[6], notes=cells[7], tests=cells[8] if len(cells) > 8 else ""))
json.dump(rows, io.open(P + "/report/tools/r5work/appA_rows.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
from collections import Counter
print(len(rows), Counter(r["cls"] for r in rows))
for r in rows:
    if not r["ver"].startswith("v2."):
        print("NONVER:", r["ver_cell"], r["cls"], r["vv"])
