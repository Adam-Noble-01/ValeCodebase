# R5 step 0: index every exported Na__* name in both apps' 02__Src__AppModules (read-only), so a TV devlog entry
# that names a function (Na__LeImgEnc__Prepare) can be mapped to the file that exports it.
# Writes r5work/tv_exports.json and r5work/vv_exports.json.
import re, io, os, json, collections, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r5_common import TVROOT, VVROOT, WORK

sys.stdout.reconfigure(encoding="utf-8")


def index(root):
    idx = collections.defaultdict(set)
    base = root + "/02__Src__AppModules"
    n = 0
    for dp, dn, fn in os.walk(base):
        dn[:] = [d for d in dn if d not in ("node_modules", ".git", ".claude")]
        for f in fn:
            if not f.endswith((".js", ".mjs")):
                continue
            p = os.path.join(dp, f).replace("\\", "/")
            rel = p[len(root) + 1:]
            try:
                t = io.open(p, encoding="utf-8", errors="replace").read()
            except Exception:
                continue
            n += 1
            for m in re.finditer(r"export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+(Na__[A-Za-z0-9_]+)", t):
                idx[m.group(1)].add(rel)
            for m in re.finditer(r"export\s*\{([^}]*)\}", t):
                for nm in re.findall(r"(Na__[A-Za-z0-9_]+)", m.group(1)):
                    idx[nm].add(rel)
    return idx, n


if __name__ == "__main__":
    tvi, n1 = index(TVROOT)
    vvi, n2 = index(VVROOT)
    json.dump({k: sorted(v) for k, v in tvi.items()}, io.open(WORK + "/tv_exports.json", "w", encoding="utf-8"), indent=0)
    json.dump({k: sorted(v) for k, v in vvi.items()}, io.open(WORK + "/vv_exports.json", "w", encoding="utf-8"), indent=0)
    print("TV files", n1, "exports", len(tvi), "| VV files", n2, "exports", len(vvi))
