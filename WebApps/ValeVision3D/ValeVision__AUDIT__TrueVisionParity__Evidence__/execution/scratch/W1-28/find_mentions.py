import sys, re, os, glob

root = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\report"
pat = re.compile(sys.argv[1])
width = int(sys.argv[2]) if len(sys.argv) > 2 else 400
files = sys.argv[3:] if len(sys.argv) > 3 else sorted(glob.glob(os.path.join(root, "*.md")))
for f in files:
    with open(f, encoding="utf-8", errors="replace") as fh:
        for i, line in enumerate(fh, 1):
            for m in pat.finditer(line):
                s = max(0, m.start() - width)
                e = min(len(line), m.end() + width)
                print(f"{os.path.basename(f)}:{i}: ...{line[s:e].strip()}...")
                print()
