import re, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OSNAP = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\28__System__ObjectSnap"

def strip(t):
    t = re.sub(r"/\*.*?\*/", "", t, flags=re.S)
    return re.sub(r"//[^\n]*", "", t)

def exports_of(path):
    t = strip(open(path, encoding="utf-8").read())
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
for f in sys.argv[1:]:
    print('==', os.path.basename(f))
    src = strip(open(f, encoding="utf-8").read())
    for m in re.finditer(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", src, flags=re.S):
        names = [n.strip().split(" as ")[0].strip() for n in m.group(1).split(",") if n.strip()]
        path = os.path.normpath(os.path.join(OSNAP, m.group(2)))
        if not os.path.exists(path):
            print("  MISSING FILE", m.group(2)); ok = False; continue
        ex = exports_of(path)
        miss = [n for n in names if n not in ex]
        if miss:
            ok = False
            print("  MISSING EXPORT", miss, "in", m.group(2))
        else:
            print("  ok", len(names), m.group(2))
    for m in re.finditer(r"new URL\('([^']+)'", src):
        p = os.path.normpath(os.path.join(OSNAP, m.group(1)))
        print("  URL", m.group(1), "exists" if os.path.exists(p) else "(created by this package)")
print("ALL OK" if ok else "PROBLEMS")
