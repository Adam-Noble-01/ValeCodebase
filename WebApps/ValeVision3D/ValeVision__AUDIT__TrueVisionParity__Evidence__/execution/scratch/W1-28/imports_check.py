"""Resolve every import of the TV files (as they would sit at TV's path in VV) against VV's live tree.

For each import: does the target file exist in VV, and does it export every named binding?
"""
import os
import re
import sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCRATCH = os.path.dirname(os.path.abspath(__file__))

FILES = {
    "Na__LayoutEditor__MarkupBridge__.js": "02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup",
    "Na__LayoutEditor__Groups__.js": "02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup",
    "Na__LayoutEditor__SheetSurface__.js": "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface",
    "Na__LayoutEditor__PdfExporter__.js": "02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport",
    "Na__Test__LayerStack__.test.mjs": "80__Testing__PrototypeEnvironment",
    "Na__Test__VectorQuality__.test.mjs": "80__Testing__PrototypeEnvironment",
}

IMPORT_RE = re.compile(r"import\s*(?:\{([^}]*)\}\s*from\s*)?['\"]([^'\"]+)['\"]", re.S)
DYN_RE = re.compile(r"import\(\s*['\"]([^'\"]+)['\"]\s*\)")
EXPORT_BLOCK_RE = re.compile(r"export\s*\{([^}]*)\}", re.S)
EXPORT_DECL_RE = re.compile(r"export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)")


def exports_of(path):
    with open(path, encoding="utf-8", errors="replace") as fh:
        text = fh.read()
    names = set()
    for m in EXPORT_BLOCK_RE.finditer(text):
        for part in m.group(1).split(","):
            part = re.sub(r"//.*", "", part).strip()
            if not part:
                continue
            if " as " in part:
                part = part.split(" as ")[1].strip()
            names.add(part)
    for m in EXPORT_DECL_RE.finditer(text):
        names.add(m.group(1))
    return names


def strip_comments(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(^|[^:])//.*", r"\1", text)
    return text


def main():
    only = sys.argv[1:]
    bad = 0
    for name, folder in FILES.items():
        if only and name not in only:
            continue
        src = os.path.join(SCRATCH, "tv", name)
        if not os.path.exists(src):
            continue
        with open(src, encoding="utf-8") as fh:
            text = strip_comments(fh.read())
        base = os.path.join(VV, folder.replace("/", os.sep))
        print("=" * 100)
        print(name)
        for m in IMPORT_RE.finditer(text):
            names_raw, spec = m.group(1), m.group(2)
            if not spec.startswith("."):
                print("   (bare)", spec)
                continue
            target = os.path.normpath(os.path.join(base, spec.replace("/", os.sep)))
            rel = os.path.relpath(target, VV)
            if not os.path.exists(target):
                print("   MISSING FILE", rel)
                bad += 1
                continue
            if names_raw is None:
                print("   ok (side-effect)", rel)
                continue
            wanted = []
            for part in names_raw.split(","):
                part = part.strip()
                if not part:
                    continue
                wanted.append(part.split(" as ")[0].strip())
            have = exports_of(target)
            missing = [w for w in wanted if w not in have]
            if missing:
                bad += 1
                print("   MISSING NAMES in", rel, missing)
            else:
                print("   ok", rel, f"({len(wanted)} names)")
        for m in DYN_RE.finditer(text):
            spec = m.group(1)
            target = os.path.normpath(os.path.join(base, spec.replace("/", os.sep)))
            print("   dynamic", os.path.relpath(target, VV), "exists" if os.path.exists(target) else "MISSING")
    print("problems:", bad)


if __name__ == "__main__":
    main()
