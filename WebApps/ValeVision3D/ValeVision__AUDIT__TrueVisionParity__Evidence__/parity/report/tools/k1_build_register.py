# -*- coding: utf-8 -*-
"""K1 - build and validate the canonical decision register.

Reads  : parity/data/decisions.json, parity/data/findings_verified.json, parity/data/work_packages.json
         parity/report/tools/k1_register_content.py (hand-authored DR content + RAW_MAP)
Writes : parity/data/decision_register.json   (array of canonical decisions)
         parity/data/decision_raw_map.json    (raw id -> DR id, dropped ids with reasons, coverage proof)
         parity/report/K1__DecisionRegister.md (readable tables)
Exit code 1 if any coverage or shape check fails.
"""
import json, os, re, sys, importlib.util
from collections import OrderedDict, Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
PARITY = os.path.abspath(os.path.join(HERE, "..", ".."))
DATA = os.path.join(PARITY, "data")
REPORT = os.path.join(PARITY, "report")

spec = importlib.util.spec_from_file_location("k1c", os.path.join(HERE, "k1_register_content.py"))
C = importlib.util.module_from_spec(spec); spec.loader.exec_module(C)

dec = json.load(open(os.path.join(DATA, "decisions.json"), encoding="utf-8"))
fnd = json.load(open(os.path.join(DATA, "findings_verified.json"), encoding="utf-8"))
wps = json.load(open(os.path.join(DATA, "work_packages.json"), encoding="utf-8"))

dec_by_id = {d["id"]: d for d in dec}
fnd_by_id = {f["id"]: f for f in fnd}
wp_ids = {w["id"] for w in wps}

errors, warnings = [], []

# ------------------------------------------------------------------ universe
universe_dec = [d["id"] for d in dec]
universe_fnd = [f["id"] for f in fnd if f.get("category") == "decision" or f.get("action") == "needs_decision"]
universe = universe_dec + universe_fnd
if len(set(universe)) != len(universe):
    errors.append("duplicate ids inside the universe")

missing = [i for i in universe if i not in C.RAW_MAP]
extra = [i for i in C.RAW_MAP if i not in set(universe)]
if missing: errors.append(f"raw ids not mapped: {missing}")
if extra: errors.append(f"RAW_MAP ids outside the universe: {extra}")

order = C.ORDER
if len(order) != len(set(order)): errors.append("ORDER has duplicates")
if set(order) != set(C.DRS): errors.append(f"ORDER/DRS mismatch: {set(order) ^ set(C.DRS)}")
key2dr = {k: f"DR-{i+1:02d}" for i, k in enumerate(order)}

for rid, k in C.RAW_MAP.items():
    if k != "DROP" and k not in key2dr:
        errors.append(f"{rid} maps to unknown key {k}")
for rid in C.DROPPED:
    if C.RAW_MAP.get(rid) != "DROP": errors.append(f"DROPPED {rid} is not mapped to DROP")
for rid, k in C.RAW_MAP.items():
    if k == "DROP" and rid not in C.DROPPED: errors.append(f"{rid} mapped to DROP without a reason")

# ------------------------------------------------------------------ placeholder resolution
PH = re.compile(r"\[\[([A-Z0-9]+)\]\]")
def resolve(v):
    if isinstance(v, str):
        def rep(m):
            k = m.group(1)
            if k not in key2dr:
                errors.append(f"unknown placeholder [[{k}]]"); return m.group(0)
            return key2dr[k]
        return PH.sub(rep, v)
    if isinstance(v, list): return [resolve(x) for x in v]
    if isinstance(v, dict): return {kk: resolve(vv) for kk, vv in v.items()}
    return v

# ------------------------------------------------------------------ WP normalisation
replaces = {}
for w in wps:
    for m in re.findall(r"replaces (WP-S[0-9]{2}[ab]?-[0-9A-Za-z]+)", w.get("title", "")):
        replaces.setdefault(m, []).append(w["id"])
# Superseded packages named in raw decisions, mapped to their live replacements per the slice verifiers:
# S07b report (WP-06 folded into 05C; WP-07 split into 05A and 05C), S02b verification (05->S04a-07, 06->S04a-06,
# 07->S04a-08), S12 report (09 replaced by V09R), S05a verification (02 = S03a-09, 05 = S03a-02), S06b verification
# (11 = S06a-03, 12 = S08-03 + S08-11), S02a verification (14 refuted, duplicate of S02b-04), S05b report (old 04 ->
# S03b WP-06 + V1; old 06 -> V2; old 08 -> V3 + V4).
SUPERSEDED_WP = {
    "WP-S07b-06": ["WP-S07b-05C"], "WP-S07b-07": ["WP-S07b-05A", "WP-S07b-05C"],
    "WP-S02b-05": ["WP-S04a-07R"], "WP-S02b-06": ["WP-S04a-06"], "WP-S02b-07": ["WP-S04a-08R"],
    "WP-S12-09": ["WP-S12-V09R"], "WP-S05a-02": ["WP-S03a-09"], "WP-S05a-05": ["WP-S03a-02"],
    "WP-S06b-11": ["WP-S06a-03v"], "WP-S06b-12": ["WP-S08-03", "WP-S08-11"], "WP-S02a-14": ["WP-S02b-04R"],
    "WP-S05b-04": ["WP-S03b-06R", "WP-S05b-V1"], "WP-S05b-06": ["WP-S05b-V2"], "WP-S05b-08": ["WP-S05b-V3", "WP-S05b-V4"],
}
superseded_log = defaultdict(set)
def norm_wp(ref):
    ref = ref.split(" ")[0]
    if ref in wp_ids: return [ref], None
    if ref in SUPERSEDED_WP:
        new = [x for x in SUPERSEDED_WP[ref] if x in wp_ids]
        superseded_log[ref].update(new)
        return new, None
    if ref in replaces: return replaces[ref], None
    cands = [ref + s for s in ("R", "v", "a", "b", "Ra", "Rb", "A", "B", "C")]
    hits = [c for c in cands if c in wp_ids]
    if hits: return hits, None
    return [], ref

dep_index = defaultdict(set)
for w in wps:
    for x in w.get("depends_on") or []:
        for m in re.findall(r"D-S[0-9]{2}[ab]?-[0-9A-Z]+R?", x):
            dep_index[m].add(w["id"])

# ------------------------------------------------------------------ assemble DRs
def slice_of(rid):
    m = re.match(r"(?:D-)?(S[0-9]{2}[ab]?)-", rid)
    return m.group(1) if m else "?"

URG_OK = {"before Wave 0", "before the wave that needs it", "can wait"}
TIER = {"before Wave 0": 0, "before the wave that needs it": 1, "can wait": 2}
register = []
by_dr = OrderedDict()
for k in order:
    d = C.DRS[k]
    drid = key2dr[k]
    src = [rid for rid in universe if C.RAW_MAP.get(rid) == k]
    src_dec = [r for r in src if r.startswith("D-")]
    src_fnd = [r for r in src if not r.startswith("D-")]
    if not src: errors.append(f"{drid} ({k}) has no source ids")
    # work packages gated
    wp_set, superseded = set(), set()
    for r in src_dec:
        for b in dec_by_id[r].get("blocks") or []:
            if b.startswith("WP-"):
                base = b.split(" ")[0]
                got, miss = norm_wp(b)
                wp_set.update(got)
                if miss: superseded.add(miss); errors.append(f"{drid}: unresolved work package ref {b}")
                elif base not in wp_ids:
                    superseded.add(f"{base} -> {', '.join(got)}")
        wp_set.update(dep_index.get(r, ()))
    for b in C.EXTRA_WPS.get(k, []):
        got, miss = norm_wp(b)
        wp_set.update(got)
        if miss: errors.append(f"{drid}: EXTRA_WPS id {b} not found")
    # related findings: manual list + non-universe finding ids named in source decisions' blocks
    rel = list(C.RELATED.get(k, []))
    for r in src_dec:
        for b in dec_by_id[r].get("blocks") or []:
            if re.match(r"S[0-9]{2}[ab]?-[FV][0-9]+$", b) and b in fnd_by_id and b not in set(universe) and b not in rel:
                rel.append(b)
    for r in rel:
        if r not in fnd_by_id: warnings.append(f"{drid}: related id {r} not in findings_verified.json")
    rel = [r for r in rel if r in fnd_by_id]
    blocks = OrderedDict()
    blocks["systems"] = resolve(d["blocks"]["systems"])
    blocks["work_packages"] = sorted(wp_set)
    blocks["waves"] = resolve(d["blocks"]["waves"])
    if superseded:
        blocks["superseded_wp_refs"] = sorted(superseded)
    rec = OrderedDict()
    rec["dr_id"] = drid
    rec["key"] = k
    rec["theme"] = d["theme"]
    rec["title"] = resolve(d["title"])
    rec["question"] = resolve(d["question"])
    rec["options"] = resolve(d["options"])
    rec["recommendation"] = resolve(d["recommendation"])
    rec["default_if_unanswered"] = resolve(d["default_if_unanswered"])
    rec["blocks"] = blocks
    rec["urgency"] = d["urgency"]
    rec["source_ids"] = src_dec + src_fnd
    rec["source_counts"] = {"raw_decisions": len(src_dec), "decision_findings": len(src_fnd),
                            "slices": sorted({slice_of(r) for r in src})}
    rec["conflicts_resolved"] = resolve(d.get("conflicts_resolved", []))
    rec["verified_evidence"] = resolve(d.get("verified_evidence", []))
    rec["related_ids"] = rel
    # shape checks
    if d["theme"] not in C.THEMES: errors.append(f"{drid}: bad theme {d['theme']}")
    if d["urgency"] not in URG_OK: errors.append(f"{drid}: bad urgency {d['urgency']}")
    for f in ("title", "question", "recommendation", "default_if_unanswered"):
        if not str(rec[f]).strip(): errors.append(f"{drid}: empty {f}")
    if not rec["options"]: errors.append(f"{drid}: no options")
    for c in rec["conflicts_resolved"]:
        for f in ("topic", "positions", "evidence", "resolution"):
            if not c.get(f): errors.append(f"{drid}: conflict missing {f}")
    register.append(rec)
    by_dr[drid] = rec["source_ids"]

# urgency must be non-decreasing in DR order
tiers = [TIER[r["urgency"]] for r in register]
if tiers != sorted(tiers): errors.append(f"DR order is not sorted by urgency: {tiers}")

# every source id cited by a DR's text must exist
id_pat = re.compile(r"(?<!WP-)\b(?:D-)?S[0-9]{2}[ab]?-(?:F|V)?[0-9A-Z]+R?\b")
for r in register:
    blob = json.dumps({k: r[k] for k in ("recommendation", "conflicts_resolved", "default_if_unanswered", "question", "options")}, ensure_ascii=False)
    for m in set(id_pat.findall(blob)):
        if m.startswith("D-"):
            if m not in dec_by_id: warnings.append(f"{r['dr_id']} cites unknown decision {m}")
        elif re.match(r"S[0-9]{2}[ab]?-[FV][0-9]+$", m):
            if m not in fnd_by_id: warnings.append(f"{r['dr_id']} cites unknown finding {m}")
    for wpm in set(re.findall(r"WP-S[0-9]{2}[ab]?-[0-9A-Za-z]+", blob)):
        if wpm not in wp_ids:
            got, miss = norm_wp(wpm)
            if miss: warnings.append(f"{r['dr_id']} cites work package {wpm} not in work_packages.json")

# ------------------------------------------------------------------ coverage proof
raw_map = OrderedDict()
for rid in universe:
    k = C.RAW_MAP[rid]
    raw_map[rid] = "DROPPED" if k == "DROP" else key2dr[k]
count_map = Counter()
for r in register:
    for s in r["source_ids"]: count_map[s] += 1
dups = [s for s, c in count_map.items() if c > 1]
if dups: errors.append(f"ids in more than one DR: {dups}")
not_covered = [rid for rid in universe if raw_map[rid] != "DROPPED" and count_map[rid] != 1]
if not_covered: errors.append(f"ids not covered exactly once: {not_covered}")
dropped_ids = [rid for rid in universe if raw_map[rid] == "DROPPED"]
if any(count_map[d] for d in dropped_ids): errors.append("a dropped id also appears in a DR")
# inverse check: union of DR source ids + dropped == universe
if set(count_map) | set(dropped_ids) != set(universe): errors.append("union of DR sources and dropped ids != universe")

proof = OrderedDict([
    ("universe_raw_decisions", len(universe_dec)),
    ("universe_decision_findings", len(universe_fnd)),
    ("universe_total", len(universe)),
    ("mapped_to_a_DR", sum(1 for v in raw_map.values() if v != "DROPPED")),
    ("dropped", len(dropped_ids)),
    ("ids_in_more_than_one_DR", len(dups)),
    ("canonical_decisions", len(register)),
    ("by_urgency", dict(Counter(r["urgency"] for r in register))),
    ("by_theme", dict(Counter(r["theme"] for r in register))),
    ("errors", errors),
    ("warnings", warnings),
])

# ------------------------------------------------------------------ write JSON
reg_path = os.path.join(DATA, "decision_register.json")
map_path = os.path.join(DATA, "decision_raw_map.json")
with open(reg_path, "w", encoding="utf-8") as fh:
    json.dump(register, fh, indent=1, ensure_ascii=False)
mapdoc = OrderedDict([
    ("description", "K1 decision register: every raw decision id (decisions.json) and every decision-type finding "
                    "(findings_verified.json, category 'decision' or action 'needs_decision') mapped to exactly one canonical "
                    "decision (decision_register.json), or DROPPED with a reason."),
    ("generated", "01-Oct-2026"),
    ("wave_0", resolve(C.WAVE_0)),
    ("default_policy", resolve(C.DEFAULT_POLICY)),
    ("coverage", proof),
    ("raw_id_map", raw_map),
    ("dropped", OrderedDict((k, resolve(v)) for k, v in C.DROPPED.items())),
    ("by_dr", by_dr),
    ("dr_titles", OrderedDict((r["dr_id"], r["title"]) for r in register)),
])
with open(map_path, "w", encoding="utf-8") as fh:
    json.dump(mapdoc, fh, indent=1, ensure_ascii=False)

# re-load to validate JSON
json.load(open(reg_path, encoding="utf-8")); json.load(open(map_path, encoding="utf-8"))

# ------------------------------------------------------------------ markdown
SHORT = {
    "GATE": ("(c) Port everything in dependency order; flag unconfirmed TV releases in each VV devlog entry; one acceptance checklist; hold the four gesture changes.",
             "(c), gesture changes held."),
    "RENUM": ("(a) Renumber VV 42-47 to TV 40-46 first, alone, one agent (WP-S01-01R); read 'own file structure' as storage layout.",
              "(a) as Wave 0's first package."),
    "LEGACY": ("Legacy 40 -> 91, 2dProfileLines -> 05__RenderPipeline, 35 stays; retire both later; reserve VV-only numbers in a registry; 62 stays.",
               "Same."),
    "RENAMES": ("All three in VV inside WP-S01-01R: ComposerPreset -> RenderPreset (body kept), DistanceCulling -> 05/, SnapshotHistory -> TV's name.",
                "Same; no TV or WCP edit."),
    "RULES": ("(a) Whole-file owners win, one owner per file, hubs atomic and last, leaves first, no throwaway stubs or VV-only intermediates.",
              "(a)."),
    "SYNC": ("(a) Top-level-only paginated purge + one editor-owned key list, approved and run by Adam before any new R2 content.",
             "Fix prepared and dry-run only; no new pictures to R2 subfolders until applied."),
    "SW": ("(a) Split models/thumbs token, registrar holds reload on unsaved work (neutral flag), then one shell bump per deploy wave; no package bumps.",
           "No package edits or bumps the worker; Adam bumps at deploy."),
    "SITE": ("(B) Port the client code dormant and verbatim; Drawing Type row hidden by config; (A) when Vale wants location/block plans.",
             "(B)."),
    "PHASE": ("(a) Dormant verbatim PhaseLibrary/ModelSource, TV signatures now with null slots; no Design Phase UI, no modelGroups.",
              "(a)."),
    "STMT": ("In scope as an identical port with Vale words and VV transport, behind LayoutEditor__Statement__Enabled, scheduled last.",
             "Built last with the switch OFF; Lockstep leaf now."),
    "REG": ("A: register + Document ID; {project} = numeric projectCode via a VV accessor; Vale phases from Adam, fixed before the first publish.",
            "A's code with format {project}_{drawing} until Vale phases arrive."),
    "QR": ("(A) Port switched off; later a GitHub Pages q/ resolver keyed by a permanent qrKey that survives renames.",
           "(A)."),
    "IMG": ("(a) Port with VV storage and transport; TV's bronze frame; lands with the SheetTools hub.", "(a)."),
    "AREAS": ("(A) Port: core inert before the hub, UI after; TV's group list.", "(A)."),
    "FOG": ("Port to 49 with DIV-1/DIV-2 seams; sheets via the renderFrame route; exports (b) if they must match sheets, else (a).",
            "Port; sheets (a); exports (a)."),
    "DOORS": ("(a) All of it, plus door module 1.8.0.", "(a) + 1.8.0."),
    "REFS": ("Port reference layers; add 1:200.", "Both yes."),
    "VECT": ("(a) Port with TV's 13 key rows, after the drawing-tool leaves.", "(a)."),
    "HATCH": ("Follow DR-08: verbatim Patterns panel and both packs under dormant site plans.", "Verbatim panel, both packs."),
    "SPELL": ("Spell check with VV/50__ValeVision__UserConfig dictionary; palette swatches identical, named for Vale.", "Same."),
    "FONTS": ("(a) Port PdfFonts, Open Sans embedded; (i) Vale-owned font copy.", "(a) pointing at the AD04 TTFs VV already loads."),
    "PUB": ("(a) Adopt TV's publishing and published-only viewer; TV's local-first write order; register bar entry.",
            "(a) after prerequisites; VV live viewer meanwhile."),
    "SHARE": ("App URL ?project={folderId}&open={key}; no resolver host; omit statements/register until they land.", "Same, after publishing."),
    "LOADER": ("(a) Keep VV's loader as a permanent seam (TV offer optional); fix the ledger contradiction.", "(a)."),
    "LMODE": ("(a) Keep now; retire at the publishing port.", "(a)."),
    "XSEC": ("Keep 41 name; port TV 48 placeholder after renaming VV's own gate ids; keep D28 filing until TV 48 > 0.1.0.", "Same."),
    "TRANS": ("(A) One same-name facade at TV's paths, owned by S12; spec lockstep may go first on R2Notes.", "(A)."),
    "API": ("One guarded project-files worker family, raw uploads, no manifest bump for editor files, quarantine deletes, /api/health.",
            "Same; only Adam deploys."),
    "STORE": ("(A) TV's relative folder names inside VV's prefix; commit JSON; Adam decides rasters/PDFs.", "(A); JSON only."),
    "GUARD": ("Guard (B) flag-gated, overlay (B), notes route (b).", "Same, R2 judging flag off."),
    "LINEWORK": ("Port the 3D-matching rules now; keep the localhost bake gate; adopt modifiers; new BuildToken + Adam's re-bake.",
                 "Same; re-bake on Adam's checklist."),
    "CORE": ("Keep VV's mode controllers and VV-only menu seams (offer 3 to TV); take North 1.1.0; hide overlays in VS preview.", "Same."),
    "KEYS": ("Rename all three key files (VV 3D schema kept); scope 3D keys with KeyScope; DocumentKeys now.", "Same."),
    "VERS": ("(a) Adopt TV's module version + Source version PORT NOTE line on whole-file ports.", "(a)."),
    "LEDGER": ("(b) Restructure the ledger in place; record each DR answer as a VV D-number.", "(b)."),
    "TVPERM": ("(b) Yes, per-package approval; (a) until then.", "(a) VV-only."),
    "TVDEF": ("Fix in TV first: CRLF tokeniser, yellow/amber, hatch-on-new-shapes (after intent check), event/key-list faults.",
              "VV-side seams for CRLF and amber; hatch as TV until confirmed."),
    "TABS": ("Strip 2.0.0 now with 3 tabs; keep drag-reorder on the Drawings menu until the Register lands.", "Same."),
    "LOADING": ("TV wording, TV in-host veil with the fold visible, veil for the first drawing after a document tab.", "Same."),
    "BEHAV": ("(a) Accept TV behaviour for all ten items.", "Items 1-6 adopted; 7-10 held."),
    "TD06": ("(A) Fix TV to VV's section schema; VV unchanged.", "VV unchanged; never port TV 41 Serialize/SceneData."),
    "TVBACK": ("Offer all eleven back-ports to TV; Statement Writer prep first.", "None; VV carries seams."),
    "BRAND": ("Never copy NA content; NA-only features off until Vale content exists; Hub excluded; Vale's own Classic scan.", "Same."),
    "CHROME": ("Mostly TV back-ports (safe frame, toast 96 px, confirm dialog); keep phone titles and VV full screen; skip 27/75.", "VV unchanged."),
}
missing_short = [k for k in order if k not in SHORT]
if missing_short: errors.append(f"SHORT missing for {missing_short}")

def cell(s):
    s = "" if s is None else str(s)
    return s.replace("|", "/").replace("\n", " ").strip()
def cell_list(lst):
    return "<br>".join(cell(x) for x in lst)

L = []
L.append("# K1 - Decision Register: ValeVision 3D Drawing System alignment with TrueVision 3D")
L.append("")
L.append("Synthesis stage, agent K1, 01-Oct-2026. Source of truth for the planner: `parity/data/decision_register.json` "
         "(the canonical decisions) and `parity/data/decision_raw_map.json` (every raw id mapped). Built and validated by "
         "`parity/report/tools/k1_build_register.py` from `parity/report/tools/k1_register_content.py`.")
L.append("")
L.append(f"**Inputs merged:** {len(universe_dec)} raw decisions from 18 slices (`decisions.json`) and {len(universe_fnd)} decision-type "
         f"findings (category `decision` or action `needs_decision`), {len(universe)} ids in all, merged into **{len(register)} canonical decisions**; "
         f"{len(dropped_ids)} id dropped with a reason. Every id maps to exactly one DR (proof at the end).")
L.append("")
L.append("**How to read it**")
L.append("")
L.append("- DR ids are ordered by urgency: `before Wave 0` (DR-01 to DR-07), then `before the wave that needs it` (scope, then seams, "
         "then versioning, ledger and TrueVision permission, then UI details), then `can wait`.")
L.append("- " + resolve(C.WAVE_0))
L.append("- " + resolve(C.DEFAULT_POLICY))
L.append("- Paths: TV/ and VV/ are the app roots; TVM/ and VVM/ are their `02__Src__AppModules`; LE = `51__System__LayoutEditor`; "
         "WCP = `D:\\10_CoreLib__ValeCodebase\\WebApps\\Whitecardopedia`; NAAPPS = `D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb\\na-apps`. "
         "Every path:line in 'What the code shows' was opened on 01-Oct-2026 unless it is attributed to a slice.")
L.append("")
HEADLINE = [
    ("When to renumber the drawing folders (S02a and S09 renumber first; S02b kept VV 44/45 and translated paths)", "RENUM",
     "Renumber first and alone in Wave 0; S02b runs after it with no folder seams."),
    ("SnapshotHistory file name (S02b: TV renames; S09 WP-S09-10 and S02b-12R: VV renames; S11 flipped to VV)", "RENAMES",
     "VV renames to TV's Na__AppUtils__SnapshotHistory.js inside the renumber package; no TV edit."),
    ("Legacy 40 target (S01: 91; S02a: 39) and 2dProfileLines (S01: 05; S02a: DrawingViewCore)", "LEGACY",
     "91 and 05: Na__RenderEffect__* files live in 05 in both apps; TV 40 holds only Na__DrawView__*."),
    ("Port gate (S04a: only what Adam tested; S11, S05a, S06a, S06b, S03b: everything)", "GATE",
     "Port everything in dependency order with unconfirmed releases flagged; hold four gesture changes."),
    ("Site plans (S04a: dormant port; S06a: never for now; S05b: assumed none)", "SITE",
     "Dormant verbatim client port; the user-facing feature and the pipeline stay out."),
    ("Design phases (S03a: divergence; S09: shim; S04a: dormant port)", "PHASE",
     "Dormant verbatim: TV's PhaseLibrary imports only names VV exports and answers 'live' when uninitialised."),
    ("Statement Writer on or off while unanswered (S07b: on; S01: Adam's call)", "STMT",
     "Recommend on; default off until Adam answers; scheduled last."),
    ("Loader (S03a/S09: keep and offer to TV; S11: permanent seam; ledger says both)", "LOADER",
     "Keep in VV; TV offer optional; fix ledger rows 1122, 1230, 1244 and the Loader PORT NOTE."),
    ("Layout Mode switch (S03a: permanent; S10: retire with publishing)", "LMODE",
     "Keep now; the publishing port is the trigger to retire it."),
    ("Fonts host (S03a: never the NA CDN; S08: AD04 TTFs acceptable; S10: Vale-owned copy)", "FONTS",
     "Vale-owned copy is the target; the AD04 TTFs VV already loads are the interim default."),
    ("Version numbers on whole-file ports (six slices)", "VERS", "Adopt TV's module version with a 'Source version' PORT NOTE line."),
    ("Service worker token (per wave, per release, with publishing, VV bucket, split caches first, bump inside the renumber)", "SW",
     "Split the models/thumbs token and fix the registrar first; then one shell bump per deploy wave; no package bumps."),
    ("Hot-file ownership (S04b interim hunks vs S05a/S05b/S06b whole-file owners)", "RULES",
     "Whole-file owners win; interim hunks only inside the owner's lock; hub atomic and last."),
    ("Transport shape (S07b and S08 per-document clients vs S01/S07a/S09/S12 facade; S06b interim)", "TRANS",
     "Same-name facade at TV's paths owned by S12; the spec lockstep may go first on R2Notes and re-base later."),
    ("Sheet-image folder (S07a: LayoutEditor/SheetImages; S08/S12: 05__Layout__DrawingDocs__Images)", "STORE",
     "TV's name: it is hard-coded in the publisher, reader, schema, SW pattern and CfApi."),
    ("Linework bake gate (S02b survey: DevGate; S02b verifier: localhost)", "LINEWORK",
     "Localhost: VV's DevGate leaves data-path writes on the hostname test by design."),
    ("Share links (S09: off until a Vale host; S08: no host needed)", "SHARE",
     "No host needed: VV's app URL with ?project={folderId}&open={key}."),
    ("TV 48 placeholder ids (S02a: rename 48's ids; S02a verifier: rename VV's gate ids; S09: do not port)", "XSEC",
     "Rename VV's own gate ids (two files) and port 48 verbatim."),
    ("Section positionMm sign (TV's Serialize comment vs S02a re-derivation)", "TD06",
     "VV's convention (TD06); fix TV when allowed; VV never ports TV 41 Serialize."),
    ("Floor Areas timing (S03b: with the schema; S06b: last)", "AREAS",
     "Core inert before the hub, UI after; 'last' is impossible because the hub imports Floor Areas."),
    ("Hotkey renames (S03a: three files; S05a: two LE files)", "KEYS",
     "Rename all three (the 3D rename is two constants); no 3D schema or handler port."),
]
L.append("## Headline conflicts and where they are resolved")
L.append("")
L.append("| Conflict | DR | Resolution |")
L.append("|---|---|---|")
for t, k, res in HEADLINE:
    L.append(f"| {cell(t)} | {key2dr[k]} | {cell(res)} |")
L.append("")
L.append("## 1. Answer sheet (all decisions, in urgency order)")
L.append("")
L.append("| DR | Theme | Decision | Recommended answer | Default if unanswered | Urgency |")
L.append("|---|---|---|---|---|---|")
for r in register:
    s = SHORT[r["key"]]
    L.append(f"| {r['dr_id']} | {r['theme']} | {cell(r['title'])} | {cell(resolve(s[0]))} | {cell(resolve(s[1]))} | {r['urgency']} |")
L.append("")
L.append("## 2. The register, one table per theme")
L.append("")
for th in C.THEMES:
    rows = [r for r in register if r["theme"] == th]
    if not rows: continue
    L.append(f"### {th[0].upper() + th[1:]}")
    L.append("")
    L.append("| DR | Question | Options | Recommendation (reasoning, evidence) | Default if unanswered | Urgency | Gates (systems; work packages; waves) | Merged source ids |")
    L.append("|---|---|---|---|---|---|---|---|")
    for r in rows:
        b = r["blocks"]
        gates = "Systems: " + "; ".join(b["systems"]) + "<br>WPs: " + (", ".join(b["work_packages"]) or "-") + "<br>Waves: " + b["waves"]
        if b.get("superseded_wp_refs"):
            gates += "<br>Superseded refs: " + ", ".join(b["superseded_wp_refs"])
        L.append(f"| **{r['dr_id']}** {cell(r['title'])} | {cell(r['question'])} | {cell_list(r['options'])} | {cell(r['recommendation'])} | "
                 f"{cell(r['default_if_unanswered'])} | {r['urgency']} | {cell(gates)} | {', '.join(r['source_ids'])} |")
    L.append("")
    conf = [(r, c) for r in rows for c in r["conflicts_resolved"]]
    if conf:
        L.append(f"**Conflicts resolved - {th}**")
        L.append("")
        L.append("| DR | Topic | Who said what | What the code / record shows | Resolution |")
        L.append("|---|---|---|---|---|")
        for r, c in conf:
            L.append(f"| {r['dr_id']} | {cell(c['topic'])} | {cell(c['positions'])} | {cell(c['evidence'])} | {cell(c['resolution'])} |")
        L.append("")
    ev = [(r, e) for r in rows for e in r["verified_evidence"]]
    if ev:
        L.append(f"**Opened and checked on 01-Oct-2026 - {th}**")
        L.append("")
        L.append("| DR | Evidence |")
        L.append("|---|---|")
        for r, e in ev:
            L.append(f"| {r['dr_id']} | {cell(e)} |")
        L.append("")
L.append("## 3. Dropped ids")
L.append("")
L.append("| Raw id | Reason |")
L.append("|---|---|")
for k, v in C.DROPPED.items():
    L.append(f"| {k} | {cell(resolve(v))} |")
L.append("")
L.append("## 4. Raw-id map")
L.append("")
L.append("| Raw id | Slice | Kind | Maps to | Raw text (truncated) |")
L.append("|---|---|---|---|---|")
for rid in universe:
    if rid.startswith("D-"):
        kind, txt = "decision", dec_by_id[rid]["question"]
    else:
        f = fnd_by_id[rid]; kind = f"finding ({f.get('category')}/{f.get('action')})"; txt = f.get("title", "")
    txt = txt if len(txt) <= 140 else txt[:137] + "..."
    L.append(f"| {rid} | {slice_of(rid)} | {kind} | {raw_map[rid]} | {cell(txt)} |")
L.append("")
L.append("## 5. Coverage proof")
L.append("")
L.append(f"- Universe: {len(universe_dec)} raw decisions + {len(universe_fnd)} decision-type findings = {len(universe)} ids.")
L.append(f"- Mapped to a DR: {proof['mapped_to_a_DR']}; dropped with a reason: {proof['dropped']}; ids appearing in more than one DR: {proof['ids_in_more_than_one_DR']}.")
L.append(f"- Union of every DR's `source_ids` plus the dropped ids equals the universe exactly; every DR has at least one source id.")
L.append(f"- Canonical decisions: {len(register)}; by urgency: {dict(Counter(r['urgency'] for r in register))}.")
L.append(f"- Builder: `python parity/report/tools/k1_build_register.py` exits 0 only when all of the above hold "
         f"(errors: {len(errors)}, warnings: {len(warnings)}).")
import subprocess
chk = subprocess.run([sys.executable, os.path.join(HERE, "k1_check_register.py")], capture_output=True, text=True)
L.append("- Independent re-check of the written JSON files (`python parity/report/tools/k1_check_register.py`: exactly-once "
         "coverage, raw_id_map agreement, consecutive DR ids sorted by urgency, field shape, every named work package exists, every "
         "id exists) printed:")
L.append("")
L.append("```")
L.extend(chk.stdout.strip().splitlines())
L.append("```")
if chk.returncode != 0:
    errors.append("independent checker failed")
if warnings:
    L.append("")
    L.append("Warnings (non-fatal):")
    for w in warnings: L.append(f"- {w}")
L.append("")
md_path = os.path.join(REPORT, "K1__DecisionRegister.md")
with open(md_path, "w", encoding="utf-8") as fh:
    fh.write("\n".join(L))

print(json.dumps(proof, indent=1))
print("wrote", reg_path); print("wrote", map_path); print("wrote", md_path)
sys.exit(1 if errors else 0)
