# R5 step 1: map every S11 Appendix A release to the canonical K3 packages that carry its files.
# Method: read the release's own TV devlog entry, collect every TV file it names (full names,
# backticked stems, "..._Suffix__" abbreviations), map each file to the K3 package whose tv_sources
# contain it (K3 gives each TV file exactly one porter) and each named test to its K3 porter.
import sys, io, json, re, collections
sys.path.insert(0, __file__.rsplit("/", 1)[0] if "/" in __file__ else __file__.rsplit("\\", 1)[0])
from r5_common import *

sys.stdout.reconfigure(encoding="utf-8")
rows = jload(WORK + "/appA_rows.json")
ENT = load_tv_entries()

# hub files: touched by many releases; scored low so the feature package ranks first
HUB_PAT = re.compile(r"(AppConfig__\.json|ConfigState__|Na__Hotkeys__|KeyMap__|Na__CoreUi__Styles__Index__|Index\.html|Styles__Main__Paper__|Styles__Main__\.css|Na__LayoutEditor__ModeController__|Na__LayoutEditor__Toolbar__|Pwa__ServiceWorker|DevGate)")

out = []
for r in rows:
    m = re.search(r"\(L(\d+)\)", r["ver_cell"])
    ln = int(m.group(1)) if m else None
    e = ENT.get(ln) if ln else None
    files = files_in_text(e["body"]) if e else set()
    if e and not any(TVSRC2WP.get(f) for f in files):
        files |= files_in_text(e["body"], folder_expand=True)
    # S11's own notes name modules too (short forms like SheetTools__CopyDrag)
    for tok in re.findall(r"\b([A-Z][A-Za-z0-9]*(?:__[A-Za-z0-9]+)+)\b", r["notes"] + " " + r["title"]):
        for st, rs in TV_STEMS.items():
            if st.endswith("__" + tok + "__") or st.endswith("__" + tok):
                if len(rs) == 1:
                    files.add(rs[0])
    tests = sorted(f for f in files if f.startswith("80__Testing__PrototypeEnvironment/"))
    src = sorted(f for f in files if not f.startswith("80__Testing__PrototypeEnvironment/"))
    score = collections.Counter()
    hub = collections.Counter()
    mapped, unmapped = [], []
    for f in src:
        ws = TVSRC2WP.get(f, [])
        if ws:
            mapped.append(f)
            for w in ws:
                (hub if HUB_PAT.search(f) else score)[w] += 1
        else:
            unmapped.append(f)
    test_wps = collections.Counter()
    for t in tests:
        b = t.split("/")[-1]
        own = TEST_OWN.get(b)
        if own and own.get("porter"):
            test_wps[own["porter"]] += 1
    allw = set(score) | set(hub) | set(test_wps)
    ranked = sorted(allw, key=lambda w: (-(score[w] * 3 + test_wps[w] * 2 + hub[w]), TOPO.get(w, 9999)))
    last = max(allw, key=lambda w: TOPO.get(w, -1)) if allw else ""
    fnamed = sorted(set(FOLDER_RE.findall(e["body"])) - BROAD_FOLDERS) if e else []
    out.append(dict(folders_named=fnamed, ver_cell=r["ver_cell"], ver=r["ver"], line=ln, cls=r["cls"], vv=r["vv"], area=r["area"],
                    title=r["title"], owner=r["owner"], notes=r["notes"],
                    files_src=src, files_mapped=mapped, files_unmapped=unmapped, tests=tests,
                    score=dict(score), hub=dict(hub), test_wps=dict(test_wps), ranked=ranked, complete_after=last))

json.dump(out, io.open(WORK + "/release_map.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
for o in out:
    print(o["ver_cell"][:22].ljust(22), o["cls"][:14].ljust(14), "|", ",".join(o["ranked"][:6]), "| last", o["complete_after"],
          "| src", len(o["files_src"]), "mapped", len(o["files_mapped"]), "| unm:", ";".join(x.split("/")[-1] for x in o["files_unmapped"][:4]))
