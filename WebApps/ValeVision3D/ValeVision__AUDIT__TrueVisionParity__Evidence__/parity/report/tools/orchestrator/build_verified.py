"""Rebuild the verified parity findings from the workflow journal into JSON files on disk.

Applies each verifier's deltas (refuted / corrections / added) to its slice's survey result, the same
way the workflow script's applyVerification() does, and writes:

  parity/data/slices.json            per-slice meta: id, title, report path, summary, coverage, verifier notes, counts
  parity/data/findings_verified.json every finding, with its slice id (and verifier_note / added_by_verifier)
  parity/data/work_packages.json     every work package, with its slice id
  parity/data/decisions.json         every decision, with its slice id
  parity/data/q.py                   a small query helper for the report writers
"""
import json, os, sys
from collections import Counter

SCR = os.path.dirname(os.path.abspath(__file__))
PAR = os.path.join(SCR, "parity")
DATA = os.path.join(PAR, "data")
os.makedirs(DATA, exist_ok=True)
JOURNAL = r"C:\Users\adamw\.claude\projects\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f105155\subagents\workflows\wf_417c9de4-599\journal.jsonl"

TITLES = {
    "S01": ("NamingTaxonomy", "Folder and module naming taxonomy across both trees"),
    "S02a": ("DrawingCore_Plans_Elevations_North_Planes_Sections", "Drawing core, floor plans, elevations, north, drawing planes, section engines"),
    "S02b": ("Annotations_Dimensions_DepthFog_ProjectedLinework", "Plan annotations, plan dimensions, elevation depth fog, projected linework"),
    "S03a": ("LE_Config_ModeController_TabStrip_Loader", "Layout Editor core: config, mode controller, tab strip, loading veil, loader, dev menu"),
    "S03b": ("LE_SheetData_SheetSurface_Markup", "Layout Editor core: sheet data and records, sheet surface and title blocks, markup geometry"),
    "S04a": ("LE_Viewports_RenderStyles_SitePlan", "Layout Editor viewports, render styles, site plans, model source"),
    "S04b": ("LE_DraftMode_Grid_ObjectSnap_Ortho_Axes", "Layout Editor drafting aids: draft mode, drawing grid, object snap, ortho mode, drawing axes"),
    "S05a": ("LE_SheetTools_DocumentKeys", "Layout Editor sheet tools (selection, pointer, keyboard, clipboard, measurements) and document keys"),
    "S05b": ("LE_DrawingTools_Hatch_VectorTools", "Layout Editor drawing tools, hatch patterns and vector tools"),
    "S06a": ("LE_Panels_Scrapbooks", "Layout Editor UI panels and the scrapbooks"),
    "S06b": ("LE_Specification_FloorAreas_SpellCheck_Palette", "Specification and margin notes, floor areas, spell check, colour palette"),
    "S07a": ("LE_Register_ProjectQr_SheetImages", "Drawing (document) register, project QR code, sheet images"),
    "S07b": ("LE_StatementWriter", "Statement Writer (Design Statements tab)"),
    "S08": ("Publishing_Sharing_WebViewer_Pdf", "PDF export, document publishing, sharing, web viewer, published documents and schema"),
    "S09": ("Wiring_Integration_Surfaces", "Wiring and integration surfaces: entry HTML, CSS index, loader, config, events, keys, service worker, test harnesses"),
    "S10": ("Broader_UI_Parity", "Broader UI parity: header fold animation, tab strip, veils, loading screens, toolbar, menus, styles"),
    "S11": ("Ledger_Release_Watermark", "Parity ledger and release watermark reconciliation (where the port was up to)"),
    "S12": ("DataModel_Persistence_Transport", "Data model, persistence and R2 transport parity (VV keeps its own worker and storage)"),
}

# Raw results live in parity/data/raw/{survey|verify}__<slice>.json (exported from the first-pass
# journal; the four verifiers cut off by the session break are added from their own re-run).
RAW = os.path.join(DATA, "raw")
latest = {}
for fn in os.listdir(RAW):
    if fn.endswith(".json") and "__" in fn:
        kind, sid = fn[:-5].split("__", 1)
        latest[f"{kind}:{sid}"] = json.load(open(os.path.join(RAW, fn), encoding="utf-8"))

def apply(survey, ver):
    findings = [dict(f) for f in survey.get("findings", [])]
    meta = {"verified": False, "refuted": [], "corrections": 0, "added": 0, "claims_checked": 0, "notes": ""}
    if ver:
        refuted = {x["id"]: x.get("reason", "") for x in ver.get("refuted", [])}
        findings = [f for f in findings if f["id"] not in refuted]
        by_id = {f["id"]: f for f in findings}
        for c in ver.get("corrections", []):
            f = by_id.get(c.get("id"))
            if not f:
                continue
            f[c["field"]] = c["new_value"]
            note = (c.get("reason") or "")[:400]
            f["verifier_note"] = (f["verifier_note"] + " | " + note) if f.get("verifier_note") else note
        for a in ver.get("added_findings", []):
            a = dict(a)
            a["added_by_verifier"] = True
            findings.append(a)
        meta = {
            "verified": True,
            "refuted": [{"id": k, "reason": v} for k, v in refuted.items()],
            "corrections": len(ver.get("corrections", [])),
            "added": len(ver.get("added_findings", [])),
            "claims_checked": ver.get("claims_checked", 0),
            "notes": ver.get("notes", ""),
            "coverage_gaps_closed": ver.get("coverage_gaps_closed", []),
        }
    wp_ref = {x["id"] for x in (ver or {}).get("refuted_work_packages", [])}
    wps = [w for w in survey.get("work_packages", []) if w.get("id") not in wp_ref] + list((ver or {}).get("added_work_packages", []))
    decisions = list(survey.get("decisions_needed", [])) + list((ver or {}).get("added_decisions", []))
    return findings, wps, decisions, meta

slices, F, W, D = [], [], [], []
for sid, (slug, title) in TITLES.items():
    survey = latest.get(f"survey:{sid}")
    ver = latest.get(f"verify:{sid}")
    if not survey:
        print(f"!! no survey result for {sid}")
        continue
    findings, wps, decisions, meta = apply(survey, ver)
    for f in findings:
        f["slice"] = sid
    for w in wps:
        w["slice"] = sid
    for d in decisions:
        d["slice"] = sid
    F += findings; W += wps; D += decisions
    slices.append({
        "id": sid, "title": title,
        "report_path": os.path.join(PAR, "slices", f"{sid}__{slug}.md"),
        "summary": survey.get("summary", ""), "coverage": survey.get("coverage", {}),
        "findings": len(findings), "work_packages": len(wps), "decisions": len(decisions),
        "verification": meta,
    })
    print(f"{sid:5} survey={'Y' if survey else '-'} verify={'Y' if ver else '-'} findings={len(findings):3} wps={len(wps):3} decisions={len(decisions):2} refuted={len(meta['refuted'])} corr={meta['corrections']} added={meta['added']}")

json.dump(slices, open(os.path.join(DATA, "slices.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
json.dump(F, open(os.path.join(DATA, "findings_verified.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
json.dump(W, open(os.path.join(DATA, "work_packages.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
json.dump(D, open(os.path.join(DATA, "decisions.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)

print()
print("TOTAL findings", len(F), "work packages", len(W), "decisions", len(D))
print("by category", dict(Counter(f.get("category") for f in F)))
print("by action", dict(Counter(f.get("action") for f in F)))
print("by severity", dict(Counter(f.get("severity") for f in F)))
for name in ("slices.json", "findings_verified.json", "work_packages.json", "decisions.json"):
    print(name, os.path.getsize(os.path.join(DATA, name)), "bytes")
