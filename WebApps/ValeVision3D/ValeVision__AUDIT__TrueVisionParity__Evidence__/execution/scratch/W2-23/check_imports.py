import re, os, sys
LE = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\30__System__SheetTools"
src = open(sys.argv[1], encoding="utf-8").read()

def exports_of(path):
    t = open(path, encoding="utf-8").read()
    t = re.sub(r"/\*.*?\*/", "", t, flags=re.S)
    t = re.sub(r"//[^\n]*", "", t)
    names = set()
    for m in re.finditer(r"export\s*\{([^}]*)\}", t, flags=re.S):
        for part in m.group(1).split(","):
            part = part.strip()
            if not part:
                continue
            if " as " in part:
                part = part.split(" as ")[1].strip()
            names.add(part)
    for m in re.finditer(r"export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z0-9_$]+)", t):
        names.add(m.group(1))
    return names

ok = True
for m in re.finditer(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", src, flags=re.S):
    names = [n.strip().split(" as ")[0].strip() for n in m.group(1).split(",") if n.strip()]
    path = os.path.normpath(os.path.join(LE, m.group(2)))
    if not os.path.exists(path):
        print("MISSING FILE", m.group(2)); ok = False; continue
    ex = exports_of(path)
    for n in names:
        if n not in ex:
            print("MISSING EXPORT", n, "in", m.group(2)); ok = False
        else:
            print("ok", n)
print("ALL OK" if ok else "PROBLEMS")
