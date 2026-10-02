# R5: for every TV-only file in the E.3 inventory, find the TV commit that first added it (git log --follow
# --diff-filter=A, read-only) and the TV releases whose devlog headings that commit added. Writes r5work/git_intro.json.
import sys, io, json, re, subprocess, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r5_common import *

sys.stdout.reconfigure(encoding="utf-8")
GITROOT = r"D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb"
PREFIX = "na-apps/30__TrueVision__CoreAppCode/"
inv = jload(WORK + "/tv_only_inventory.json")


def git(*args):
    r = subprocess.run(["git", "-C", GITROOT] + list(args), capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.stdout


commit_rel = {}


def releases_in_commit(h):
    if h in commit_rel:
        return commit_rel[h]
    d = git("show", h, "--format=", "--unified=0", "--", PREFIX + "TrueVision__DEVLOG__.md")
    vs = re.findall(r"^\+## TrueVision3D (v\d+\.\d+\.\d+)", d, re.M)
    commit_rel[h] = sorted(set(vs), key=vkey)
    return commit_rel[h]


out = {}
for x in inv:
    p = PREFIX + x["path"]
    log = git("log", "--follow", "--diff-filter=A", "--format=%h|%ad|%s", "--date=short", "--", p).strip().splitlines()
    if not log:
        out[x["path"]] = dict(commit="", date="", rels=[], subject="")
        continue
    h, date, subj = log[-1].split("|", 2)
    rels = releases_in_commit(h)
    out[x["path"]] = dict(commit=h, date=date, rels=rels, subject=subj[:90])
json.dump(out, io.open(WORK + "/git_intro.json", "w", encoding="utf-8"), indent=1)
miss = [k for k, v in out.items() if not v["commit"]]
print(len(out), "files;", len(miss), "without an add commit;", len(commit_rel), "distinct commits")
for k in miss[:20]:
    print("  no commit:", k)
