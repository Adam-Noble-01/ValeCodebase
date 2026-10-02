"""Print report lines matching a regex, wrapped, with file:line - read-only helper for W0-14."""
import os
import re
import sys
import textwrap

ROOT = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity"

pattern = re.compile(sys.argv[1])
subdirs = sys.argv[2].split(",") if len(sys.argv) > 2 else ["report"]
maxlen = int(sys.argv[3]) if len(sys.argv) > 3 else 4000

for sub in subdirs:
    base = os.path.join(ROOT, sub)
    for name in sorted(os.listdir(base)):
        if not name.endswith(".md"):
            continue
        path = os.path.join(base, name)
        with open(path, encoding="utf-8", errors="replace") as fh:
            for no, line in enumerate(fh, 1):
                if pattern.search(line):
                    text = line.rstrip("\n")
                    if len(text) > maxlen:
                        text = text[:maxlen] + " ...[cut]"
                    print(f"== {sub}/{name}:{no}")
                    print(textwrap.fill(text, 160))
                    print()
