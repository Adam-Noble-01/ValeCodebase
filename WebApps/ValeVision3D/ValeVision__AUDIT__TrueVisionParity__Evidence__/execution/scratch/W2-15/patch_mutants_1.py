import sys

p = sys.argv[1]
t = open(p, encoding="utf-8").read()
start = t.index('    ("outline width put back after the release (the old order)",')
end = t.index('    ("doors never put back",')
t = t[:start] + '''    ("outline width read after the live tool is suspended (the old read: the drawing's width, not the author's)",
     [ ("const sectionWas  = wantSection ? Na__DrawView__SectionAdapter__GetOutlineWidthPx() : null;", "let   sectionWas  = null;"),
       ("Na__DrawView__SectionAdapter__SuspendLiveTool();\\r\\n                // THE DOORS", "Na__DrawView__SectionAdapter__SuspendLiveTool();\\r\\n                if (wantSection) sectionWas = Na__DrawView__SectionAdapter__GetOutlineWidthPx();\\r\\n                // THE DOORS") ], None, 1),
''' + t[end:]
old = """for i, (label, old, new, n) in enumerate(MUTANTS, 1):
    assert src.count(old) == n, (label, src.count(old))
    path = os.path.join(OUT, "mutant_%02d.js" % i)
    with open(path, "wb") as f:
        f.write(src.replace(old, new).encode("utf-8"))"""
new = """for i, (label, old, new, n) in enumerate(MUTANTS, 1):
    pairs = old if isinstance(old, list) else [ (old, new) ]
    text = src
    for a, b in pairs:
        assert text.count(a) == n, (label, text.count(a))
        text = text.replace(a, b)
    path = os.path.join(OUT, "mutant_%02d.js" % i)
    with open(path, "wb") as f:
        f.write(text.encode("utf-8"))"""
assert t.count(old) == 1
t = t.replace(old, new)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
