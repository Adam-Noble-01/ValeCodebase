import sys

p = sys.argv[1]
t = open(p, encoding="utf-8").read()
old = '''    ("outline width read after the live tool is suspended (the old read: the drawing's width, not the author's)",
     [ ("const sectionWas  = wantSection ? Na__DrawView__SectionAdapter__GetOutlineWidthPx() : null;", "let   sectionWas  = null;"),
'''
new = '''    ("the old outline-width order: read after the live tool is suspended AND put back after the release (either alone is harmless: the release hands the parked width back)",
     [ ("const sectionWas  = wantSection ? Na__DrawView__SectionAdapter__GetOutlineWidthPx() : null;", "let   sectionWas  = null;"),
       ("if (sectionWas !== null) Na__DrawView__SectionAdapter__SetOutlineWidthPx(sectionWas);   // <-- Before the release, so the author's sections come back at their own width\\r\\n                Na__DrawView__SectionAdapter__Release();",
        "Na__DrawView__SectionAdapter__Release();\\r\\n                if (sectionWas !== null) Na__DrawView__SectionAdapter__SetOutlineWidthPx(sectionWas);"),
'''
assert t.count(old) == 1
t = t.replace(old, new)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
