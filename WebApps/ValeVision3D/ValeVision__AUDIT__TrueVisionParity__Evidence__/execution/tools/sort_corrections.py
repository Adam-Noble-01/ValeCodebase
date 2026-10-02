"""Keep the orchestrator corrections table in numeric order (OC-01, OC-02, ...). LF file; rows moved, never edited."""
import re
p = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\orchestrator_corrections.md"
lines = open(p, encoding="utf-8").read().split("\n")
idx = [i for i, l in enumerate(lines) if re.match(r"^\| OC-\d+ \|", l)]
rows = sorted((lines[i] for i in idx), key=lambda l: int(re.match(r"^\| OC-(\d+)", l).group(1)))
for i, r in zip(idx, rows):
    lines[i] = r
open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
print("sorted", len(rows), "rows")
