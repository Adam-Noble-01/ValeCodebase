# W1-26: resolve every import of the TV files (read at the pin) against the LIVE VV tree.
# Prints, per file, each import specifier, whether the target exists in VV and which named
# imports VV's target does not export. Read-only.
import os, re, sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
TVOUT = os.path.join(
    r"C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f105155\scratchpad",
    "W1-26_tv")

FILES = [
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js",
    "02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js",
    "02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__DimensionGeometry__.js",
    "02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__LeaderGeometry__.js",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__QrCell__.js",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Modern__.js",
]

IMPORT_RE = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", re.S)
EXPORT_RE = re.compile(r"export\s*\{([^}]*)\}", re.S)


def strip_comments(s):
    return re.sub(r"//[^\n]*", "", s)


def exports_of(path):
    t = open(path, encoding="utf-8").read()
    names = set()
    for blk in EXPORT_RE.findall(t):
        for n in strip_comments(blk).split(","):
            n = n.strip()
            if n:
                names.add(n.split(" as ")[-1].strip())
    return names


def main():
    bad = 0
    for rel in FILES:
        tvp = os.path.join(TVOUT, rel.replace("/", os.sep))
        src = open(tvp, encoding="utf-8").read()
        print("=== " + rel.split("/")[-1])
        vv_dir = os.path.dirname(os.path.join(VV, rel.replace("/", os.sep)))
        for names, spec in IMPORT_RE.findall(src):
            target = os.path.normpath(os.path.join(vv_dir, spec.replace("/", os.sep)))
            wanted = [n.strip().split(" as ")[0].strip() for n in strip_comments(names).split(",") if n.strip()]
            if not os.path.exists(target):
                print(f"  MISSING FILE  {spec}")
                bad += 1
                continue
            have = exports_of(target)
            missing = [w for w in wanted if w not in have]
            flag = "OK " if not missing else "BAD"
            if missing:
                bad += 1
            print(f"  {flag} {spec}  ({len(wanted)} names){'  missing: ' + ', '.join(missing) if missing else ''}")
    print("problems:", bad)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
