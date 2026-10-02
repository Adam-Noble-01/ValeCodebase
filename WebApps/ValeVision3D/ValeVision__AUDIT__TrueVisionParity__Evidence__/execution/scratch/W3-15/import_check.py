import re, os, sys
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\40__Ui__Panels"
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "tv.js")
text = open(SRC, encoding="utf-8").read()
ok = True
for m in re.finditer(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", text):
    names = [n.strip() for n in m.group(1).split(",") if n.strip()]
    path = os.path.normpath(os.path.join(VV, m.group(2)))
    if not os.path.exists(path):
        print("MISSING FILE", m.group(2)); ok = False; continue
    body = open(path, encoding="utf-8", errors="replace").read()
    exp = set()
    for em in re.finditer(r"export\s*\{([^}]*)\}", body):
        for n in em.group(1).split(","):
            n = n.strip().split(" as ")[-1].strip()
            if n: exp.add(n)
    for em in re.finditer(r"export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z0-9_$]+)", body):
        exp.add(em.group(1))
    miss = [n for n in names if n not in exp]
    print(("OK  " if not miss else "MISS"), m.group(2), miss if miss else "")
    if miss: ok = False
print("ALL OK" if ok else "SOME MISSING")
