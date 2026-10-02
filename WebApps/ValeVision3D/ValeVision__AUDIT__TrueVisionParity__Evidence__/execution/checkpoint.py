"""Save a wave checkpoint of the parity programme's changes (no commits, nothing staged by this script).

  python checkpoint.py W0
writes execution/checkpoints/<label>__<yyyymmdd-hhmm>.patch   cumulative binary diff vs HEAD (tracked files, staged + unstaged)
       execution/checkpoints/<label>__<yyyymmdd-hhmm>__new.zip new (untracked) files, repo-relative paths
       execution/checkpoints/<label>__<yyyymmdd-hhmm>__files.txt the file list with status
Everything already dirty at the baseline (execution/baseline_dirty__01-Oct-2026.txt) is excluded, as are the audit
evidence folder and the working-memory file (records, not code). Restore a checkpoint onto a clean HEAD with
  git -C D:/10_CoreLib__ValeCodebase apply --index <patch>   then unzip <new.zip> at D:/10_CoreLib__ValeCodebase
"""
import datetime, os, subprocess, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
VCB = r"D:\10_CoreLib__ValeCodebase"
OUTDIR = os.path.join(HERE, "checkpoints")
BASE = os.path.join(HERE, "baseline_dirty__01-Oct-2026.txt")
EXCLUDE_PREFIX = ("WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__", "WebApps/ValeVision3D/ValeVision__WORKING_MEMORY__TrueVisionParity__")

label = sys.argv[1] if len(sys.argv) > 1 else "manual"
stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")
os.makedirs(OUTDIR, exist_ok=True)

def git(*a, text=True):
    return subprocess.run(["git", "-C", VCB] + list(a), capture_output=True, text=text)

baseline = set(l.rstrip("\n") for l in open(BASE, encoding="utf-8") if l.strip())
st = git("status", "--porcelain=v1", "--untracked-files=all").stdout.splitlines()
changed, untracked = [], []
for line in st:
    if line in baseline:
        continue
    code, path = line[:2], line[3:]
    if " -> " in path:
        path = path.split(" -> ", 1)[1]
    path = path.strip('"')
    if path.startswith(EXCLUDE_PREFIX) or path.startswith("WebApps/Whitecardopedia/Projects/") or "/__pycache__/" in path or path.endswith(".pyc"):
        continue
    if code == "??":
        untracked.append(path)
    else:
        changed.append((code, path))

base = os.path.join(OUTDIR, f"{label}__{stamp}")
paths = sorted({p for _, p in changed})
patch = b""
if paths:
    # renames: include both sides so -M can pair them
    names = git("diff", "HEAD", "--name-status", "-M").stdout.splitlines()
    wanted = set(paths)
    sides = set()
    for n in names:
        parts = n.split("\t")
        if any(p in wanted for p in parts[1:]):
            sides.update(parts[1:])
    # Windows caps the command line, so ValeVision is one directory pathspec (records excluded) and only the
    # few paths outside it are named one by one.
    vv_dir = "WebApps/ValeVision3D/"
    outside = sorted(s for s in sides if not s.startswith(vv_dir))
    specs = [vv_dir, ":(exclude)WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__*",
             ":(exclude)WebApps/ValeVision3D/ValeVision__WORKING_MEMORY__TrueVisionParity__*"] + outside
    patch = git("diff", "HEAD", "--binary", "-M", "--", *specs, text=False).stdout
open(base + ".patch", "wb").write(patch)
with zipfile.ZipFile(base + "__new.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for p in untracked:
        fp = os.path.join(VCB, p)
        if os.path.isfile(fp):
            z.write(fp, p)
with open(base + "__files.txt", "w", encoding="utf-8", newline="\n") as fh:
    for c, p in changed:
        fh.write(f"{c} {p}\n")
    for p in untracked:
        fh.write(f"?? {p}\n")
print(f"checkpoint {label}: {len(changed)} tracked changes, {len(untracked)} new files")
print("  ", base + ".patch", len(patch), "bytes")
print("  ", base + "__new.zip", os.path.getsize(base + "__new.zip"), "bytes")
