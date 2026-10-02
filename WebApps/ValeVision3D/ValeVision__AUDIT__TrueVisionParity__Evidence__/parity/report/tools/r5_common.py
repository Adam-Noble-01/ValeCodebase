# R5 (Section E) common loaders. Read-only on both apps; writes only under parity/report.
import io, json, re, os, sys, collections

PAR = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity"
TVROOT = r"D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb/na-apps/30__TrueVision__CoreAppCode"
VVROOT = r"D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D"
TVDEV = TVROOT + "/TrueVision__DEVLOG__.md"
WORK = PAR + "/report/tools/r5work"
os.makedirs(WORK, exist_ok=True)


def jload(p):
    return json.load(io.open(p, encoding="utf-8"))


def vkey(v):
    m = re.findall(r"\d+", v or "")
    return tuple(int(x) for x in m) if m else (0,)


# ---------------------------------------------------------------- trees
def load_tree(name):
    rows = []
    with io.open(PAR + "/ref/" + name, encoding="utf-8") as f:
        next(f)
        for l in f:
            p = l.rstrip("\n").split("\t")
            rel = p[0]
            lines = int(p[1]) if len(p) > 1 and p[1].strip().isdigit() else 0
            rows.append((rel, lines))
    return rows


TREE_TV = load_tree("tree_tv.tsv")
TREE_VV = load_tree("tree_vv.tsv")
TV_LINES = dict(TREE_TV)
VV_LINES = dict(TREE_VV)


def load_drift():
    out = []
    with io.open(PAR + "/ref/drift_all.tsv", encoding="utf-8") as f:
        hdr = next(f).rstrip("\n").split("\t")
        for l in f:
            p = l.rstrip("\n").split("\t")
            p += [""] * (len(hdr) - len(p))
            out.append(dict(zip(hdr, p)))
    return out


DRIFT = load_drift()

# ---------------------------------------------------------------- canonical packages
K3 = jload(PAR + "/data/wp_canonical.json")
PKGS = {p["wp_id"]: p for p in K3["packages"]}
TOPO = {w: i for i, w in enumerate(K3["topological_order"])}
TEST_OWN = K3["test_ownership"]["by_test"]


def norm_src(s):
    """canonical package path -> path relative to its app root (TV) or a tagged path."""
    s = s.split(" (")[0].strip()
    if s.startswith("TVM/"):
        return "02__Src__AppModules/" + s[4:]
    if s.startswith("TV/"):
        return s[3:]
    return s  # NAAPPS/, NAWEB/ kept tagged


def norm_vv(s):
    s = s.split(" (")[0].strip()
    if s.startswith("VVM/"):
        return "02__Src__AppModules/" + s[4:]
    if s.startswith("VV/"):
        return s[3:]
    return s


TVSRC2WP = collections.defaultdict(list)
VVTGT2WP = collections.defaultdict(list)
for p in K3["packages"]:
    for s in p["tv_sources"]:
        TVSRC2WP[norm_src(s)].append(p["wp_id"])
    for s in p["vv_targets"] + p.get("hot_files", []) + p.get("edits", []):
        n = norm_vv(s)
        if p["wp_id"] not in VVTGT2WP[n]:
            VVTGT2WP[n].append(p["wp_id"])


def wp_sort(ws):
    return sorted(set(ws), key=lambda w: TOPO.get(w, 9999))


# ---------------------------------------------------------------- decisions
DR = {r["dr_id"]: r for r in jload(PAR + "/data/decision_register.json")}

# ---------------------------------------------------------------- folder maps (VV current -> TV)
TOP_MAP_VV2TV = {
    "42__System__DrawingViewCore": "40__System__DrawingViewCore",
    "43__System__FloorPlanViews": "42__System__FloorPlanViews",
    "44__System__PlanAnnotations": "43__System__PlanAnnotations",
    "45__System__PlanDimensions": "44__System__PlanDimensions",
    "46__System__ElevationViews": "45__System__ElevationViews",
    "47__System__NorthDirection": "46__System__NorthDirection",
}
TOP_MAP_TV2VV = {v: k for k, v in TOP_MAP_VV2TV.items()}


def tv_to_vv_target(tvrel):
    """TV relpath -> VV target relpath after the W0-02 renumber (same path for 40-46 post-renumber)."""
    return tvrel


# ---------------------------------------------------------------- TV devlog entries
def load_tv_entries():
    lines = io.open(TVDEV, encoding="utf-8", errors="replace").read().split("\n")
    starts = []
    for i, l in enumerate(lines, 1):
        m = re.match(r"^## TrueVision3D (v[\d.]+[a-z]?)\s+-\s+(\S+)", l)
        if m:
            starts.append((i, m.group(1), m.group(2)))
    ent = {}
    for k, (ln, ver, date) in enumerate(starts):
        end = starts[k + 1][0] - 1 if k + 1 < len(starts) else len(lines)
        body = lines[ln:end]
        title = ""
        for b in body:
            if b.startswith("### "):
                title = b[4:].strip()
                break
        ent[ln] = dict(line=ln, ver=ver, date=date, title=title, body="\n".join(body), end=end)
    return ent


# ---------------------------------------------------------------- file references in text
TV_BASENAMES = collections.defaultdict(list)
for rel, _ in TREE_TV:
    if rel.startswith("00__ArchivedVersions") or "/node_modules/" in rel or rel.startswith(".claude"):
        continue
    TV_BASENAMES[rel.split("/")[-1]].append(rel)
TV_STEMS = collections.defaultdict(list)
for b, rels in TV_BASENAMES.items():
    stem = re.sub(r"\.(test\.)?(js|json|css|mjs|cjs|py|html|md|bat)$", "", b)
    for r in rels:
        TV_STEMS[stem].append(r)

FILE_RE = re.compile(r"((?:Na|TrueVision|ProjectVision|TestEnv|README)__[A-Za-z0-9_]+?(?:\.test)?\.(?:js|json|css|mjs|cjs|py|html|md))")
STEM_RE = re.compile(r"`((?:Na|TrueVision)__[A-Za-z0-9_]+__)`")
ABBR_RE = re.compile(r"\.\.\.(_[A-Za-z0-9_]+?__)")
TICK_RE = re.compile(r"`([^`\n]{3,120})`")
FOLDER_RE = re.compile(r"\b(\d\d__(?:System|Feature|Core|Ui|Data|DevTools)__[A-Za-z0-9_]+)\b")
BROAD_FOLDERS = {"51__System__LayoutEditor", "80__Testing__PrototypeEnvironment"}

try:
    TV_EXPORTS = jload(WORK + "/tv_exports.json")
    VV_EXPORTS = jload(WORK + "/vv_exports.json")
except Exception:
    TV_EXPORTS, VV_EXPORTS = {}, {}

_SUFFIX_CACHE = {}


def _suffix_match(tok):
    """'SheetTools__PointerPress__' / '__HitResolution__' / 'SelectionBox__' -> unique TV file."""
    core = tok.strip("_").strip()
    if not core or "__" not in tok and not tok.endswith("__"):
        return []
    if core in _SUFFIX_CACHE:
        return _SUFFIX_CACHE[core]
    cands = []
    for st, rs in TV_STEMS.items():
        if st.endswith("__" + core + "__") or st == core + "__":
            cands.extend(rs)
    cands = [c for c in cands if c.startswith("02__Src__AppModules/") or c.startswith("80__Testing")]
    if len(cands) > 1:
        le = [c for c in cands if "/51__System__LayoutEditor/" in c]
        cands = le if len(le) == 1 else cands
    res = cands if len(cands) == 1 else []
    _SUFFIX_CACHE[core] = res
    return res


def files_in_text(text, folder_expand=False):
    found = set()
    for m in FILE_RE.findall(text):
        for r in TV_BASENAMES.get(m, []):
            found.add(r)
    for m in STEM_RE.findall(text):
        for r in TV_STEMS.get(m, []):
            found.add(r)
    for suf in ABBR_RE.findall(text):
        cands = [r for st, rs in TV_STEMS.items() if st.endswith(suf) for r in rs]
        if len(cands) == 1:
            found.add(cands[0])
    for tok in TICK_RE.findall(text):
        tok = tok.strip()
        last = tok.split("/")[-1].strip()
        last = re.sub(r"\(.*$", "", last).strip()
        # exported function / constant names -> the file that exports them
        for nm in re.findall(r"(Na__[A-Za-z0-9_]+)", tok):
            for r in TV_EXPORTS.get(nm, []):
                found.add(r)
        # short stems: SheetTools__PointerPress__, Panel__Dimensions__, __HitResolution__
        if re.fullmatch(r"[A-Za-z0-9_]+__", last) and not last.startswith("Na__LayoutEditor__") or re.fullmatch(r"__[A-Za-z0-9_]+__", last):
            for r in _suffix_match(last):
                found.add(r)
        if re.fullmatch(r"(Na|TrueVision)__[A-Za-z0-9_]+__", last):
            for r in TV_STEMS.get(last, []):
                found.add(r)
    if folder_expand:
        for fo in set(FOLDER_RE.findall(text)) - BROAD_FOLDERS:
            for rel, _ in TREE_TV:
                if ("/" + fo + "/") in ("/" + rel) and not rel.startswith("00__"):
                    found.add(rel)
    return found
