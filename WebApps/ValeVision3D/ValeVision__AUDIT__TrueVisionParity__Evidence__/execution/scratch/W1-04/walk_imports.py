"""Walk the static import graph from given VV modules and report what they reach.

Scratch helper for W1-04: proves whether importing the walk / fly controls from
40__System__DrawingViewCore/Na__DrawView__Transitions__.js can close a cycle
(i.e. whether anything they reach imports Transitions back).
"""
import os
import re
import sys

SRC = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules"
IMPORT_RE = re.compile(r"""(?:^|\n)\s*import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]""")
DYN_RE = re.compile(r"""import\(\s*['"]([^'"]+)['"]\s*\)""")


def deps(path):
    try:
        text = open(path, "r", encoding="utf-8", errors="replace").read()
    except OSError:
        return []
    out = []
    for m in IMPORT_RE.finditer(text):
        out.append(m.group(1))
    return out


def walk(start_rel):
    start = os.path.normpath(os.path.join(SRC, start_rel))
    seen = {}
    stack = [start]
    while stack:
        cur = stack.pop()
        if cur in seen:
            continue
        seen[cur] = True
        for spec in deps(cur):
            if not spec.startswith("."):
                continue
            nxt = os.path.normpath(os.path.join(os.path.dirname(cur), spec))
            if nxt not in seen:
                stack.append(nxt)
    return [os.path.relpath(p, SRC).replace("\\", "/") for p in seen]


if __name__ == "__main__":
    for rel in sys.argv[1:]:
        reached = walk(rel)
        print("==", rel, "reaches", len(reached), "modules")
        hits = [r for r in reached if re.match(r"(4\d|5\d)__", r)]
        for r in sorted(reached):
            print("   ", r)
        print("   drawing-system modules reached (40-59):", hits if hits else "none")
