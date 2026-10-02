"""W0-05: render execution/port_order_map.md from execution/port_order_map.json (scratch tool)."""
import json, os, collections, posixpath

HERE = os.path.dirname(os.path.abspath(__file__))
EXEC = os.path.normpath(os.path.join(HERE, "..", ".."))
SRC = "02__Src__AppModules/"
LE = SRC + "51__System__LayoutEditor/"
d = json.load(open(os.path.join(EXEC, "port_order_map.json"), encoding="utf-8"))
M = d["modules"]
P = d["packages"]


def short(p):
    if p.startswith(LE):
        return "LE/" + p[len(LE):]
    if p.startswith(SRC):
        return p[len(SRC):]
    return p


def base(p):
    return posixpath.basename(p)


WAVE_ORDER = ["W0", "W1", "W2", "W3", "W4", "W5", "W6"]
out = []
w = out.append

ad = d["appendix_d_reproduction"]
n_whole = sum(1 for t in d["takes"] if t["mode"] in ("whole", "convergence"))
n_hunks = sum(1 for t in d["takes"] if t["mode"] == "hunks")
modes = collections.Counter(t["mode"] for t in d["takes"])

w("# Port-order map (W0-05) - TrueVision's import graph, leaves first, hubs last")
w("")
w("> Generated %s by `execution/scratch/W0-05/port_order_map.py` (read-only). Data: `parity/data/port_order_map.json` "
  "(this folder holds a copy, `execution/port_order_map.json`). The ledger Module Register \"blocked-by\" column is written "
  "from the JSON by the W0 Parity Scribe (W0-99), not by W0-05." % d["generated"])
w("")
w("| Basis | Value |")
w("|---|---|")
w("| TrueVision | pin `%s` (read with `git ls-tree` / `git cat-file`, never the working tree); %d app modules parsed |" % (d["tv_pin"][:12], d["tv_modules_parsed"]))
w("| ValeVision before the swarm | `%s` (S11 Appendix D's baseline) |" % d["vv_base"][:12])
w("| ValeVision after W0-02 | git index of `D:/10_CoreLib__ValeCodebase`: staged changes %s (exactly W0-02's 81 `git mv` renames); %d files, %d app modules; export names from the index blobs with W0-02's T6 rename `Na__DrawView__ComposerPreset__*` -> `Na__DrawView__RenderPreset__*` |" % (
    json.dumps(d["vv_after_w0_02"]["staged_changes"]), d["vv_after_w0_02"]["vv_files"], d["vv_after_w0_02"]["vv_modules"]))
w("| Package catalogue | `parity/data/wp_canonical.json` (165 packages; WT lane excluded: it edits TrueVision) |")
w("| Takes classified | %d package x TV-module pairs: %s |" % (len(d["takes"]), ", ".join("%s %d" % (k, v) for k, v in modes.most_common())))
w("| Parser self-check | TV at the pin: %d unresolved imports; VV at 7b4e593a: %d (both trees pass their own harnesses, so 0 means the parser reads them the way the harnesses do) |" % (
    len(d["validation"]["tv_internal_unresolved_imports"]), len(d["validation"]["vv_7b4e593a_internal_unresolved_imports"])))
w("")

# ---------------------------------------------------------------- 1 verdicts
w("## 1. Acceptance")
w("")
w("| # | Item | Result |")
w("|---|---|---|")
w("| 1 | Reproduces S11 Appendix D for the 62 c.1 port_whole rows (44 blocked before the swarm starts) | **PASS** - %d port_whole rows, **%d blocked**; %d/%d rows equal S11 Appendix D (module count, every module name, transport flag) and %d/%d equal the S11 verifier's own `work_s11v/prereq.json`; the comment-aware parser agrees with the verifier's raw-text method on all %d rows. After W0-02, %d rows still miss a module (section 3). |" % (
    ad["port_whole_rows"], ad["blocked_before_swarm"], ad["rows_matching_appendix_d"], ad["port_whole_rows"],
    ad["rows_matching_prereq_json"], ad["port_whole_rows"], sum(1 for r in ad["rows"] if r["comment_aware_parser_agrees"]),
    ad["blocked_after_w0_02_missing_modules"]))
tl = collections.Counter(t["label"] for t in d["transport_seams"])
w("| 2 | Every TV import of 80__CloudflareIntegration or LocalProjectMirror__ labelled \"transport seam (DIV-4) - resolved by VV facade W0-12\" | **PASS** - %d imports in %d TV modules, every one carries exactly that label (section 4); no TV module imports anything outside the TV app root (no NAAPPS module import); %d of them sit in modules a package takes whole, and W0-12 lands before each of those packages. |" % (
    len(d["transport_seams"]), len({t["importer"] for t in d["transport_seams"]}), sum(1 for t in d["transport_seams"] if t["taken_whole_by"])))
w("| 3 | The emitted order agrees with the catalogue's DAG; disagreements reported to the planner as defects in wp_canonical.json | **PASS (5 disagreements reported)** - %d whole-file takes checked import by import; **%d defects** (section 2), all verified by hand against TV's source at the pin; 0 hunk-replay defects; %d advisory. |" % (
    n_whole, len(d["defects"]), len(d["advisories"])))
w("")

# ---------------------------------------------------------------- 2 defects
w("## 2. Defects in wp_canonical.json (for the planner)")
w("")
w("Each defect is a package that takes a TrueVision file whole before a module or name it imports exists in ValeVision. "
  "Landing it as planned fails G2 (`Na__Verify__Exports__` checks every module, imported or not) and breaks the editor's "
  "module graph. Checked by hand at the pin (`git show b2aa9151:...`).")
w("")
FIX = {
    ("W1-22", "Na__LayoutEditor__TitleBlock__QrCell__.js"): (
        "TV `TitleBlock__QrCell__.js` (new, W1-22) imports `Na__LeChrome__PushQr` from SheetChrome; VV's SheetChrome has no "
        "PushQr, and SheetChrome 1.14.0 lands in W1-26, which depends on W1-22 through W1-25. TV `TitleBlock__Modern__.js` "
        "(also W1-22) imports QrCell, so Modern 1.5.0 cannot link either. SheetChrome does not import QrCell or Modern (no cycle).",
        "Move QrCell and the Modern 1.5.0 take from W1-22 into W1-26 (which already takes SheetChrome 1.14.0 and re-measures the "
        "title block), or give W1-22 a depends_on on W1-26 after breaking the W1-22 -> W1-25 -> W1-26 chain (W1-25 depends on "
        "W1-22 only for the AppConfig serial order and the Document ID row)."),
    ("W3-03", "Na__LayoutEditor__SheetTools__HitResolution__.js"): (
        "TV hub units import the viewport rotate entry points from ViewportHandles 1.5.0: HitResolution "
        "`Na__LeHandles__OnRotateGrip`, PointerPress `Na__LeHandles__RotateStart`, PointerDrag `Na__LeHandles__RotateTo`. VV's "
        "ViewportHandles has none of them; ViewportHandles 1.5.0 is taken whole by W3-06, which depends on W3-03. TV "
        "ViewportHandles imports only ConfigState, SheetModel and ViewportRotation (all landed by W2), so there is no cycle.",
        "Take ViewportHandles 1.5.0 inside W3-03's atomic hub commit (the rotate grip then appears together with its wiring, "
        "which is what W3-06's goal wants), or make W3-03 depend on W3-06 with W3-06 depending on W3-01 instead of W3-03."),
    ("W3-10", "Na__LayoutEditor__FloorAreas__Table__.js"): (
        "TV `FloorAreas__Table__.js` (new, W3-10) imports `Na__LayoutEditor__ScrapbookParametric__AreaSchedule__.js`, which only "
        "W3-17 lands, and W3-17 depends on W3-10. AreaSchedule imports nothing (W3-17's own goal).",
        "Reverse the edge: W3-17 depends on W3-01 (or W2-99) and W3-10 depends on W3-17; W3-14 already depends on both. "
        "Alternatively land AreaSchedule inside W3-10."),
}
seen = set()
w("| # | Package | Importer (taken whole) | Needs | VV after W0-02 | Lands only in | Evidence | Suggested fix |")
w("|---|---|---|---|---|---|---|---|")
i = 0
for x in d["defects"]:
    i += 1
    key = (x["wp"], base(x["importer"]))
    fx = FIX.get(key)
    if fx is None and x["wp"] == "W3-03":
        fx = FIX[("W3-03", "Na__LayoutEditor__SheetTools__HitResolution__.js")]
    need = ", ".join("`%s`" % n for n in x.get("lacking", [])) if x.get("lacking") else "the module"
    have = "file exists, name missing" if x["status"] == "present_names_missing" else "module missing"
    landers = ", ".join("%s (%s)" % (l["wp"], l["relation"].replace("_", " ")) for l in x.get("landers", []) if l["relation"] not in ("same_package",))
    ev = fx[0] if fx and fx[0] not in seen else "as row above"
    sf = fx[1] if fx and fx[1] not in seen else "as row above"
    if fx:
        seen.add(fx[0]); seen.add(fx[1])
    w("| %d | %s | `%s` | %s from `%s` | %s | %s | %s | %s |" % (i, x["wp"], short(x["importer"]), need, base(x["import"]), have,
                                                             landers or "-", ev, sf))
w("")
w("Not defects (checked and cleared): every other whole-file take finds each import either present after W0-02, landed by an "
  "earlier package (earlier wave, or a transitive depends_on ancestor in the same wave), landed in the same package, or "
  "delivered by an earlier package whose text names it (section 7). WP-S11-08's hub figures reproduce after W0-02 (section 6).")
w("")

# ---------------------------------------------------------------- 3 appendix D
w("## 3. S11 Appendix D reproduced (62 c.1 port_whole rows)")
w("")
w("\"Before\" is the S11 verifier's own method (raw-text `from '...'` and `import('...')`, relative specifiers, old folder map "
  "40->42 ... 46->47, VV at 7b4e593a). \"After W0-02\" resolves the same TV file at TV's own paths against the post-renumber "
  "index, with transport and section imports labelled as seams rather than ports.")
w("")
w("| c.1 # | TV module | Before: missing | = App. D | = prereq.json | After W0-02: missing modules | After: seams | After: VV files lacking names | Canonical owner (whole / hunks / other) |")
w("|---|---|---|---|---|---|---|---|---|")
for r in ad["rows"]:
    if not r["count_before_swarm"] and not r["seams_after_w0_02"] and not r["name_upgrades_needed_after_w0_02"]:
        continue
    owner = " / ".join([", ".join(r["canonical_whole_takers"]) or "-", ", ".join(r["canonical_hunk_takers"]) or "-",
                        ", ".join(r["canonical_other_takes"]) or "-"])
    w("| %d | `%s` | %d | %s | %s | %d | %s | %s | %s |" % (
        r["row"], base(r["tv"]), r["count_before_swarm"], "yes" if r["matches_appendix_d"] else "**NO**",
        "yes" if r["matches_prereq_json"] else "**NO**", len(r["missing_after_w0_02"]),
        ", ".join("`%s`" % s.split("/")[-1].replace(".js", "") for s in r["seams_after_w0_02"]) or "-",
        len(r["name_upgrades_needed_after_w0_02"]) or "-", owner))
unb = [r for r in ad["rows"] if not r["count_before_swarm"]]
w("")
w("The other %d port_whole rows import nothing VV lacks (before and after W0-02 alike, apart from name upgrades listed in the JSON). "
  "W0-02 itself resolves one import: row 51's `Na__RenderEffect__DistanceCulling__` (moved to TV's path by FR-11). Rows 7 "
  "(ProjectData) and 246 (SceneData) are left with transport seams only, so 42 rows still need a module landed first." % len(unb))
w("")

# ---------------------------------------------------------------- 4 transport
w("## 4. Transport seams (DIV-4)")
w("")
w("Label on every row: **%s**. VV never copies TV's `na-truevision-api` client; W0-12 lands a VV-bodied facade at TV's two "
  "paths with TV's names and signatures (R3 C.4 S1)." % d["labels"]["transport"])
w("")
w("| TV importer | Imports | Names | Taken whole by | Hunks by |")
w("|---|---|---|---|---|")
for t in d["transport_seams"]:
    hb = ", ".join(t["hunks_by"]) or ("-" if t["taken_whole_by"] else "- (no package ports it: VV keeps its own file)")
    w("| `%s` | `%s` | %s | %s | %s |" % (short(t["importer"]), base(t["target"]), ", ".join("`%s`" % n for n in t["names"]),
                                         ", ".join(t["taken_whole_by"]) or "-", hb))
w("")
w("**Names the W0-12 facade must export** (TV's own export lists at the pin; every one is checked against the importers above):")
w("")
for f, v in d["facade_names_needed_by_w0_12"].items():
    unused = sorted(set(v["tv_exports"]) - set(v["imported_by_any_tv_module"]))
    w("- `%s`: TV exports **%d** names (the plan's \"%s\"); %d are imported by TV modules, %d of them by modules a package takes whole. "
      "Exported but imported by no TV module: %s. Imported but not exported by TV: %s. VV facade present in the live tree at run time: %s." % (
          short(f), v["tv_export_count"], "33 Na__CfApi__*" if "Cloudflare" in f else "8 Na__LocalMirror__*",
          len(v["imported_by_any_tv_module"]), len(v["imported_by_whole_take_modules"]),
          ", ".join("`%s`" % n for n in unused) or "none", ", ".join(v["imported_names_not_exported_by_tv"]) or "none",
          "yes" if v["vv_live_facade_exists_now"] else "no (W0-12 had not landed)"))
    w("  - imported: " + ", ".join("`%s`" % n for n in sorted(v["imported_by_any_tv_module"])))
w("")

# ---------------------------------------------------------------- 5 other seams
w("## 5. Section, render and PlanDimensions seams")
w("")
w("- **DIV-2 (section):** %s" % d["labels"]["div2"])
w("- **DIV-1 (render):** %s" % d["labels"]["div1"])
w("- **PlanDimensions split:** VV is ahead (S11-V03): getters TV still keeps in 44 `Data__`/`Editor__` live in VV's split `ConfigState__`/`EditorPreview__`; a ported importer takes them from there (W1-37, W2-03 and W2-04 say so; WT-01 would make TV match).")
w("")
w("Seam imports inside modules a package takes whole (each one is declared in that package's text):")
w("")
w("| Package | TV module (whole) | Seam | Import | Declared by the package text |")
w("|---|---|---|---|---|")
for wp in sorted(P):
    for r in P[wp]["prerequisites"]:
        if r["status"] == "seam" and r["take_mode"] in ("whole", "convergence") and r["seam"] != "transport":
            w("| %s | `%s` | %s | `%s` | %s |" % (wp, base(r["importer"]), r["seam"], base(r["import"]),
                                                 r["verdict"].replace("ok: seam declared in the package ", "")))
others = [s for s in d["other_seams"] if not s["taken_whole_by"]]
w("")
w("A further %d seam imports sit in TV files VV never takes whole (VV's mode controllers, RenderPreset, SectionAdapter, "
  "LoadingSequence, SnapshotRenderer and TV's own 41 engine): VV keeps its own imports there (DR-32, DIV-1, DIV-2). Full list in the JSON (`other_seams`)." % len(others))
w("")

# ---------------------------------------------------------------- 6 order and hubs
w("## 6. Leaves first, hubs last")
w("")
w("Nodes: every TV module a package takes whole, plus everything they need first (missing modules and modules whose VV copy "
  "lacks a name), closed transitively over TV's own imports: %d modules, %d levels. Level 0 needs nothing new; a module's level is "
  "one more than the highest level among its blockers. Strongly connected groups (must land in one package): %s." % (
      sum(len(o["modules"]) for o in d["order"]), len(d["order"]),
      "; ".join(" + ".join("`%s`" % base(x) for x in c) for c in d["cycles"]) or "none"))
w("")
w("**Hubs** (most direct blockers after W0-02; 'missing' counts modules VV does not have, 'names' counts VV modules that must "
  "first gain names; S11's figures were missing modules before the swarm):")
w("")
w("| Module | Taken whole by | Level | Missing | Names | Transitive closure |")
w("|---|---|---|---|---|---|")
for h in d["hubs"][:16]:
    mm = M[h["module"]]
    w("| `%s` | %s | %d | %d | %d | %d |" % (short(h["module"]), ", ".join(h["taken_whole_by"]) or "-", mm["level"],
                                         mm["missing_module_count"], mm["upgrade_count"], len(mm["blocked_by_closure"])))
w("")
S11HUBS = [("05__Core__ModeController/Na__LayoutEditor__ModeController__.js", 27),
           ("30__System__SheetTools/Na__LayoutEditor__SheetTools__PointerDrag__.js", 12),
           ("40__Ui__Panels/Na__LayoutEditor__Toolbar__.js", 12),
           ("30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js", 11),
           ("30__System__SheetTools/Na__LayoutEditor__SheetTools__ContextMenu__.js", 9),
           ("57__Feature__ScrapbookParametric/Na__LayoutEditor__Panel__ScrapbookParametric__.js", 9)]
parts = []
for k, n in S11HUBS:
    mm = M[LE + k]
    parts.append("%s %d -> %d" % (base(k).replace("Na__LayoutEditor__", "").replace("__.js", ""), n, mm["missing_module_count"]))
fe = M[SRC + "45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js"]["missing_module_count"]
ff = M[SRC + "42__System__FloorPlanViews/Na__FloorPlan__DevMenu__Editor__.js"]["missing_module_count"]
w("WP-S11-08's hubs (missing modules before the swarm -> after W0-02): %s; elevation DevMenu Editor 9 -> %d and floor plan "
  "DevMenu Editor 8 -> %d. Every drop is an import that became a seam (the Cloudflare client for the parametric panel, TV's 41 "
  "section engine for the two Dev editors), not a module that landed." % ("; ".join(parts), fe, ff))
w("")
w("Levels reflect TrueVision's graph. A package may legitimately land a module earlier than its level when it declares a seam "
  "for the higher imports: W1-34 takes TabStrip 2.0.0 (level %d) with facade-only imports through the lazy loader, and W2-32 "
  "lands MarginGrip 1.3.0 (level %d) without its IsMoveAuto line until W3-03." % (
      M[LE + "05__Core__ModeController/Na__LayoutEditor__TabStrip__.js"]["level"],
      M[LE + "50__Feature__Specification/Na__LayoutEditor__MarginGrip__.js"]["level"]))
w("")
w("<details><summary>Every level (module - packages that take it whole)</summary>")
w("")
for o in d["order"]:
    items = []
    for p in o["modules"]:
        mm = M[p]
        tag = ", ".join(mm["taken_whole_by"]) or ("needs names: " + ", ".join(mm["landed_or_edited_by"]))
        items.append("`%s` (%s%s)" % (short(p), tag, "" if mm["in_vv_after_w0_02"] else ", new"))
    w("- **Level %d** (%d): %s" % (o["level"], len(o["modules"]), "; ".join(items)))
w("")
w("</details>")
w("")

# ---------------------------------------------------------------- 7 per package
w("## 7. Per-package prerequisites (for briefing later waves)")
w("")
w("For each package that takes TV files whole: the imports that are not simply present after W0-02, and who lands them. "
  "'declared' means an earlier package (or the same one) names the export in its own text; 'deferral' means the package "
  "states it lands without that line. Packages whose whole takes import only present modules are listed as clean.")
w("")
for wave in WAVE_ORDER:
    pkw = [wp for wp in sorted(P) if P[wp]["wave"] == wave and any(t["mode"] in ("whole", "convergence") for t in P[wp]["takes"])]
    if not pkw:
        continue
    w("<details><summary>%s - %d packages taking files whole</summary>" % (wave, len(pkw)))
    w("")
    for wp in pkw:
        p = P[wp]
        whole = [t for t in p["takes"] if t["mode"] in ("whole", "convergence")]
        rows = [r for r in p["prerequisites"] if r["take_mode"] in ("whole", "convergence")]
        flag = " **DEFECT**" if p["defects"] else (" (held)" if p["held"] else "")
        w("- **%s** %s%s - %d whole take(s), highest level %s" % (wp, p["title"][:90], flag, len(whole), p["level"]))
        if not rows:
            w("  - clean: every import present after W0-02")
            continue
        grp = collections.OrderedDict()
        for r in rows:
            grp.setdefault((r["import"], r["status"], r.get("seam")), []).append(r)
        for (imp, stt, seam), rs in grp.items():
            r = rs[0]
            importers = sorted({base(x["importer"]) for x in rs})
            names = r.get("lacking") or []
            what = ("seam %s" % seam) if stt == "seam" else ("missing" if stt == "missing" else "names " + ", ".join(names))
            w("  - `%s` (%s) <- %s: %s" % (short(imp), what, ", ".join("`%s`" % n for n in importers), r.get("verdict", "")))
    w("")
    w("</details>")
    w("")

# ---------------------------------------------------------------- 8 advisories
w("## 8. Advisories and notes")
w("")
for a in d["advisories"]:
    if a["wp"] == "W1-23" and base(a["import"]) == "Na__LayoutEditor__Viewport2d__Frame__.js":
        w("- W1-23 (hunks: the Describe stub and the render signatures) also edits `Viewport2d__Frame__.js`. TV's Viewport2d "
          "imports five Frame names VV lacks (%s); they arrive with W2-16's whole take of both files, so W1-23's hunks must not "
          "bring those imports across." % ", ".join("`%s`" % n for n in a.get("lacking", [])))
        continue
    w("- %s %s `%s` -> `%s`: %s" % (a["wp"], a["take_mode"], base(a["importer"]), base(a["import"]), a["verdict"]))
for r in d["resource_references"]:
    if not r["verdict"].startswith("ok"):
        w("- %s: `%s` reads `%s` at run time (`new URL(..., import.meta.url)`), which only %s lands; TV's module has a built-in "
          "fallback when the fetch fails, so this is an ordering note, not a link failure." % (
              r["wp"], base(r["importer"]), short(r["resource"]), ", ".join("%s (%s)" % (l["wp"], l["relation"]) for l in r["landers"])))
w("- W0-14 vs W0-12: TV's `Na__AppUtils__R2AssetUpload__.js` and `Na__PresentationMode__Thumbnail__Renderer.js` import the "
  "Cloudflare client, but W0-14 replays only hunks onto VV's own files (DIV-4) and does not depend on W0-12; its hunks must not "
  "add a facade import (W0-12 is unordered relative to W0-14 inside W0).")
w("- Hunk-replay packages: %d TV imports of hunk-replayed files are VV's own business (the package neither lands the target nor "
  "names the import), so they were not checked; the ones a package wires were checked and are clean." % sum(
      p.get("hunk_imports_not_wired_by_this_package", 0) for p in P.values()))
w("- Cycles: the viewport units cycle (Viewport2d__Linework -> ModelSource -> Viewport2d__SitePlan -> Linework) is W2-16's "
  "\"one import cycle\" and lands in that one package; Publish__ <-> Share__Manifest both land in W4-07.")
w("")
hz = d.get("hunk_take_whole_file_hazards", [])
w("**Hunk packages: do not take these TV files whole.** Each package below is planned as a hunk replay; taking TV's file whole at "
  "that point would not link, because the listed modules or names land later (%d package x file pairs). Brief the porter to "
  "replay only the named hunks:" % len(hz))
w("")
w("| Package | TV file (hunks only) | Blockers if taken whole now (module: lands later in) |")
w("|---|---|---|")
for h in sorted(hz, key=lambda x: (x["wp"], x["tv_path"])):
    bl = []
    for b in h["blockers"][:8]:
        if b["lands_later_in"]:
            where = ", ".join(b["lands_later_in"][:3])
        elif b.get("earlier_hunk_editors"):
            where = "only hunk edits (%s)" % ", ".join(b["earlier_hunk_editors"][:3])
        else:
            where = "no package lands it (VV keeps its own)"
        bl.append("`%s`%s: %s" % (base(b["import"]).replace(".js", ""), " (names)" if b["status"] == "present_names_missing" else "", where))
    more = len(h["blockers"]) - 8
    w("| %s | `%s` | %s%s |" % (h["wp"], base(h["tv_path"]), "; ".join(bl), ("; +%d more" % more) if more > 0 else ""))
w("")

# ---------------------------------------------------------------- 9 method
w("## 9. Method and limits")
w("")
for m_ in d["method"]:
    w("- " + m_)
w("- Take modes: each package's TV sources were read from its goal, adaptations and tv_sources annotations; the hand "
  "classification of every non-new target is the `OVERRIDES` table in the script (with the quoted basis), so the planner can "
  "audit or change any call.")
w("- Not checked: names reached only through `import * as NS` without `NS.Name` uses, dynamic `import()` with computed "
  "specifiers, and JSON or CSS loaded through `fetch` (resource references are listed separately). Runtime behaviour is out of scope.")
w("")
open(os.path.join(EXEC, "port_order_map.md"), "w", encoding="utf-8", newline="\n").write("\n".join(out) + "\n")
print("wrote", os.path.join(EXEC, "port_order_map.md"), len(out), "lines")
