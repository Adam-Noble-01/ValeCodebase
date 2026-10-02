"""Import closure of given entry modules (app-relative), with an overlay dir taking precedence.
Prints the closure size, and for each target module, who imports it and which names."""
import os
import re
import sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
IMPORT_RE = re.compile(r"import\s*(?:\{([^}]*)\}\s*from\s*)?['\"]([^'\"]+)['\"]", re.S)
DYN_RE = re.compile(r"import\(\s*['\"]([^'\"]+)['\"]\s*\)")


def strip(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"(^|[^:])//.*", r"\1", text)


def read(rel, overlay):
    if overlay:
        p = os.path.join(overlay, rel.replace("/", os.sep))
        if os.path.exists(p):
            return open(p, encoding="utf-8").read()
    return open(os.path.join(VV, rel.replace("/", os.sep)), encoding="utf-8").read()


def main():
    overlay = None
    args = sys.argv[1:]
    if args and args[0].startswith("--overlay="):
        overlay = args[0].split("=", 1)[1]
        args = args[1:]
    targets = [a[len("--target="):] for a in args if a.startswith("--target=")]
    entries = [a for a in args if not a.startswith("--")]
    seen, stack = set(), list(entries)
    importers = {}
    while stack:
        rel = stack.pop()
        if rel in seen:
            continue
        seen.add(rel)
        try:
            text = strip(read(rel, overlay))
        except FileNotFoundError:
            print("MISSING", rel)
            continue
        base = os.path.dirname(rel)
        for m in IMPORT_RE.finditer(text):
            spec = m.group(2)
            if not spec.startswith("."):
                continue
            dep = os.path.normpath(os.path.join(base, spec)).replace("\\", "/")
            names = [n.strip().split(" as ")[0].strip() for n in (m.group(1) or "").split(",") if n.strip()]
            importers.setdefault(dep, []).append((rel, names))
            stack.append(dep)
    print("closure:", len(seen), "modules")
    for t in targets:
        print("==", t)
        for rel, names in importers.get(t, []):
            print("   ", rel, names)


if __name__ == "__main__":
    main()
