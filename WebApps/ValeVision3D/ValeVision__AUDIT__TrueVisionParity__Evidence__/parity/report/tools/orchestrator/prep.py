"""Shared reference files for the parity workflow agents.

Writes into scratchpad/parity/ref/:
  tv_devlog_index.txt   line-numbered index of every TrueVision devlog version heading + its title line
  vv_devlog_index.txt   same for ValeVision
  tree_tv.tsv           every file under TV 02__Src__AppModules (+ root css/html/docs) with line counts
  tree_vv.tsv           same for VV
  ledger_index.txt      line-numbered headings of the parity ledger
"""
import os, re

SCR = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(SCR, "parity", "ref")
os.makedirs(REF, exist_ok=True)

TV_ROOT = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode"
VV_ROOT = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"

def devlog_index(path, out, pat):
    lines = open(path, encoding="utf-8", errors="replace").read().splitlines()
    rx = re.compile(pat)
    with open(out, "w", encoding="utf-8") as fh:
        for i, l in enumerate(lines):
            if rx.match(l):
                title = ""
                for j in range(i + 1, min(i + 6, len(lines))):
                    if lines[j].strip():
                        title = lines[j].strip()
                        break
                fh.write(f"{i+1}\t{l.strip()}\t{title[:220]}\n")

devlog_index(os.path.join(TV_ROOT, "TrueVision__DEVLOG__.md"), os.path.join(REF, "tv_devlog_index.txt"), r"^## TrueVision3D v")
devlog_index(os.path.join(VV_ROOT, "ValeVision__DEVLOG__.md"), os.path.join(REF, "vv_devlog_index.txt"), r"^## ValeVision3D v")

def ledger_index(path, out):
    lines = open(path, encoding="utf-8", errors="replace").read().splitlines()
    with open(out, "w", encoding="utf-8") as fh:
        for i, l in enumerate(lines):
            if l.startswith("#"):
                fh.write(f"{i+1}\t{l.strip()}\n")

ledger_index(os.path.join(VV_ROOT, "ValeVision__PARITY__TrueVisionLedger__.md"), os.path.join(REF, "ledger_index.txt"))

SKIP = {"node_modules", ".wrangler", ".claude", ".git", "__pycache__"}
TEXT = {".js", ".mjs", ".css", ".json", ".html", ".md", ".py", ".txt", ".webmanifest", ".note", ".toml", ".jsonc"}

def tree(root, out):
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("relpath\tlines\tbytes\n")
        for dp, dns, fns in os.walk(root):
            dns[:] = sorted(d for d in dns if d not in SKIP and not d.startswith("04__Lib__ThirdParty"))
            for fn in sorted(fns):
                p = os.path.join(dp, fn)
                rel = os.path.relpath(p, root).replace("\\", "/")
                size = os.path.getsize(p)
                n = ""
                if os.path.splitext(fn)[1].lower() in TEXT and size < 8_000_000:
                    try:
                        n = sum(1 for _ in open(p, encoding="utf-8", errors="replace"))
                    except Exception:
                        n = "?"
                fh.write(f"{rel}\t{n}\t{size}\n")

tree(TV_ROOT, os.path.join(REF, "tree_tv.tsv"))
tree(VV_ROOT, os.path.join(REF, "tree_vv.tsv"))

for f in sorted(os.listdir(REF)):
    p = os.path.join(REF, f)
    print(f, sum(1 for _ in open(p, encoding="utf-8")))
