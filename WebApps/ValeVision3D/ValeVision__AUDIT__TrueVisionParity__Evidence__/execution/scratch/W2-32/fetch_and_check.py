import subprocess, re, os, sys

TV_GIT = r"D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb"
PIN = "b2aa9151"
TV_APP = "na-apps/30__TrueVision__CoreAppCode/"
VV = r"D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/"
OUT = os.path.join(os.path.dirname(__file__), "tv")

SPEC = "02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/"
FILES = [
    SPEC + "Na__LayoutEditor__SpecMargin__Column__.js",
    SPEC + "Na__LayoutEditor__NoteRegions__.js",
    SPEC + "Na__LayoutEditor__SpecMargin__.js",
    SPEC + "Na__LayoutEditor__Panel__MarginNotes__Leaderless__.js",
    SPEC + "Na__LayoutEditor__MarginGrip__.js",
    SPEC + "Na__LayoutEditor__Styles__Specification__Notes__.css",
    "80__Testing__PrototypeEnvironment/Na__Test__NoteRegions__.test.mjs",
    "80__Testing__PrototypeEnvironment/Na__Test__LeaderlessNotes__.test.mjs",
]

def show(rel):
    return subprocess.run(["git", "-C", TV_GIT, "show", f"{PIN}:{TV_APP}{rel}"], capture_output=True, check=True).stdout

os.makedirs(OUT, exist_ok=True)
imp_re = re.compile(rb"import\s*(?:\{([^}]*)\}|\*\s+as\s+\w+|\w+)?\s*(?:from\s*)?['\"]([^'\"]+)['\"]", re.S)
for rel in FILES:
    data = show(rel)
    with open(os.path.join(OUT, os.path.basename(rel)), "wb") as f:
        f.write(data)
    print("===", rel, len(data), "bytes", "CRLF" if b"\r\n" in data else "LF")
    if not rel.endswith((".js", ".mjs")):
        continue
    base = os.path.dirname(VV + rel)
    for m in imp_re.finditer(data):
        names, path = m.group(1), m.group(2).decode()
        if not path.startswith("."):
            continue
        target = os.path.normpath(os.path.join(base, path))
        if not os.path.exists(target):
            print("   MISSING FILE", path)
            continue
        txt = open(target, "rb").read().decode("utf-8", "replace")
        if names:
            for n in names.decode().split(","):
                n = n.strip().split(" as ")[0].strip()
                if not n:
                    continue
                if not re.search(r"export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+" + re.escape(n) + r"\b", txt) and not re.search(r"export\s*\{[^}]*\b" + re.escape(n) + r"\b", txt):
                    print("   MISSING EXPORT", n, "in", path)
        print("   ok", path)
