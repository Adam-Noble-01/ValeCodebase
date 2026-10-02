"""Resolve every named import of the given files against ValeVision's modules (export blocks).

Usage: python check_imports.py <base-folder-under-VVM> <file> [<file> ...]
  base-folder: the VV folder the file will live in (relative imports resolve from there),
  e.g. 45__System__ElevationViews or 48__System__CrossSectionViews.
"""
import os, re, sys

VVM = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules"

imp_re = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", re.S)
exp_re = re.compile(r"export\s*\{([^}]*)\}", re.S)
exp_decl_re = re.compile(r"export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)")


def strip_comments(block):
    return "\n".join(line.split("//")[0] for line in block.split("\n"))


def exports_of(path):
    text = open(path, encoding="utf-8").read()
    names = set()
    for m in exp_re.finditer(text):
        for n in strip_comments(m.group(1)).split(","):
            n = n.strip()
            if " as " in n:
                n = n.split(" as ")[1].strip()
            if n:
                names.add(n)
    names.update(exp_decl_re.findall(text))
    return names


def main():
    base = os.path.join(VVM, sys.argv[1])
    bad = 0
    for f in sys.argv[2:]:
        text = open(f, encoding="utf-8").read()
        print("==", f)
        for m in imp_re.finditer(text):
            spec = m.group(2)
            names = [n.split(" as ")[0].strip() for n in strip_comments(m.group(1)).split(",") if n.strip()]
            target = os.path.normpath(os.path.join(base, spec))
            if not os.path.exists(target):
                print("  MISSING FILE", spec)
                bad += 1
                continue
            ex = exports_of(target)
            missing = [n for n in names if n not in ex]
            if missing:
                bad += 1
                print("  MISSING NAMES", spec, missing)
            else:
                print("  ok", spec, len(names))
    print("BAD", bad)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
