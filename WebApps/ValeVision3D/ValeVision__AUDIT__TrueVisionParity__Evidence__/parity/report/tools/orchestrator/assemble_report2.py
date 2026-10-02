"""Save the TV -> VV parity plan into the ValeVision app root (new files only).

  <VV>/ValeVision__AUDIT__TrueVisionParity__DrawingSystems__.md        the report: R0..R6 + evidence index
  <VV>/ValeVision__AUDIT__TrueVisionParity__Evidence__/parity/         durable evidence, same relative layout as the
        slices/  data/  report/ (K1-K3, R0-R6, HARMONISATION_LOG, tools/)  ref/      working copy, so every
                                                                         'parity/...' path in the report resolves
Scratch folders (agent work dirs, pre-revision backups) are not copied. Absolute scratchpad paths are rewritten to
the evidence location: repo-relative in markdown, absolute in python tools (so the tools still run from the copy).
"""
import os, re, shutil, sys

SCR = os.path.dirname(os.path.abspath(__file__))
PAR = os.path.join(SCR, "parity")
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
REPORT_NAME = "ValeVision__AUDIT__TrueVisionParity__DrawingSystems__.md"
EVID_NAME = "ValeVision__AUDIT__TrueVisionParity__Evidence__"
EVID = os.path.join(VV, EVID_NAME)
EVID_PAR = os.path.join(EVID, "parity")
SECTIONS = [
    "R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md",
    "R1__A_FolderNaming_FolderDivergence.md",
    "R2__B_ModuleNaming_Divergence.md",
    "R3__C_WiringRequirements.md",
    "R4__D_BroaderUiParity.md",
    "R5__E_ParityMatrix_Watermark_Inventory.md",
    "R6__F_SwarmDelegationPlan.md",
]
DRY = "--dry" in sys.argv

def variants(p):
    a = p.replace("/", "\\")
    b = a.replace("\\", "/")
    c = "/" + b[0].lower() + b[2:] if re.match(r"^[A-Za-z]:", b) else b
    return sorted({a, b, c}, key=len, reverse=True)

def rewrite(text, dst):
    """Replace every spelling of the scratchpad parity root (and the scratchpad itself) with dst."""
    for src, d in ((PAR, dst), (SCR, dst)):
        for v in variants(src):
            pat = re.compile(re.escape(v) + r"((?:[\\/][^\s`'\"|)\]>,;]*)?)", re.IGNORECASE)
            if d.startswith(EVID_NAME):          # markdown: repo-relative forward slashes
                text = pat.sub(lambda m: d + m.group(1).replace("\\", "/"), text)
            else:                                 # python: absolute path, keep separators as written
                text = pat.sub(lambda m: d + m.group(1), text)
    return text

MD_DST = EVID_NAME + "/parity"
PY_DST = EVID_PAR

def copy_file(sp, tp):
    os.makedirs(os.path.dirname(tp), exist_ok=True)
    ext = os.path.splitext(sp)[1].lower()
    if ext in (".md", ".txt", ".mmd"):
        t = open(sp, encoding="utf-8", errors="replace").read()
        open(tp, "w", encoding="utf-8", newline="\n").write(rewrite(t, MD_DST))
    elif ext == ".py":
        t = open(sp, encoding="utf-8", errors="replace").read()
        open(tp, "w", encoding="utf-8", newline="\n").write(rewrite(t, PY_DST.replace("\\", "\\\\") if False else PY_DST))
    else:
        shutil.copy2(sp, tp)

def copy_tree(src, dst, skip=lambda rel: False):
    n = 0
    for dp, dns, fns in os.walk(src):
        rel_dir = os.path.relpath(dp, src)
        dns[:] = [d for d in dns if not skip(os.path.normpath(os.path.join(rel_dir, d)))]
        for fn in fns:
            rel = os.path.normpath(os.path.join(rel_dir, fn))
            if skip(rel):
                continue
            copy_file(os.path.join(dp, fn), os.path.join(dst, rel))
            n += 1
    return n

is_backup = lambda rel: ".pre_h1." in rel or ".pre_h2." in rel or "__pycache__" in rel

# ---------------------------------------------------------------- the report
parts = []
for s in SECTIONS:
    parts.append(open(os.path.join(PAR, "report", s), encoding="utf-8", errors="replace").read().strip())

preamble = (
    "> **Saved to the ValeVision root on 01-Oct-2026.** Every path written `parity/...` (or `PARITY/...`) in this "
    f"report is inside `{EVID_NAME}/` beside this file. The machine-readable plan is "
    f"`{EVID_NAME}/parity/data/wp_canonical.json` (165 packages, F.8 corrections applied) with "
    "`decision_register.json` (DR-01..DR-44) and `target_folder_map.json` / `file_rename_map.json`; query the "
    "verified findings with `python parity/data/q.py --help`. Execution progress is tracked in "
    "`ValeVision__WORKING_MEMORY__TrueVisionParity__.md` at this root.\n"
)

import json
slices = json.load(open(os.path.join(PAR, "data", "slices.json"), encoding="utf-8"))
app = ["## Appendix - Evidence Index", "",
       f"Everything below lives in `{EVID_NAME}/parity/` (paths relative to the ValeVision app root).", "",
       "### Slice reports (verified)", "",
       "| Slice | Scope | Findings | Verifier: checked / corrected / added / refuted | Report |",
       "|---|---|---|---|---|"]
for s in slices:
    v = s.get("verification", {})
    fn = os.path.basename(s["report_path"])
    app.append(f"| {s['id']} | {s['title']} | {s['findings']} | {v.get('claims_checked', 0)} / {v.get('corrections', 0)} / {v.get('added', 0)} / {len(v.get('refuted', []))} | `{MD_DST}/slices/{fn}` |")
app += ["", "### Canonical data", "", "| File | Holds |", "|---|---|",
        f"| `{MD_DST}/data/wp_canonical.json` | 165 canonical work packages (waves, deps, hot files, gates, acceptance, tests), F.8 corrections applied; `wp_corrections_applied.json` is the audit trail; `wp_raw_map.json` maps the 221 raw slice packages |",
        f"| `{MD_DST}/data/hot_file_ownership.json` | Every file edited by more than one package, with its serial order |",
        f"| `{MD_DST}/data/decision_register.json` | DR-01..DR-44 with options, recommendation, default if unanswered, blocks, urgency; `decision_raw_map.json` maps all raw decision ids |",
        f"| `{MD_DST}/data/target_folder_map.json`, `file_rename_map.json` | Target folder and file maps (K2) |",
        f"| `{MD_DST}/data/findings_verified.json` | 1,077 verified findings (category, action, severity, paths, versions, evidence, recommendation, VV adaptation) |",
        f"| `{MD_DST}/data/work_packages.json`, `decisions.json`, `slices.json`, `raw/` | Pre-consolidation packages and decisions, per-slice metadata, untouched agent returns |",
        f"| `{MD_DST}/data/q.py` | Query helper (`python q.py --help`) |",
        "", "### Consolidation notes, tools and reference data", "",
        f"- `{MD_DST}/report/` - K1 decision register, K2 naming rulebook and target maps, K3 work-package catalogue, the R0-R6 section sources and `HARMONISATION_LOG.md` (every cross-section reconciliation).",
        f"- `{MD_DST}/report/tools/` - generators and validators (k1_*, k2_* incl. `k2_renumber_apply.py`, k3_*, r5_*, r6_*, h1_*, h2_*).",
        f"- `{MD_DST}/ref/` - `drift_all.tsv`, `drift_summary.json`, file trees, devlog and ledger indices, PORT NOTE marker greps.",
        ""]
report = "\n\n".join([parts[0].split("\n", 1)[0], preamble, parts[0].split("\n", 1)[1]] + parts[1:]) + "\n\n" + "\n".join(app) + "\n"
report = rewrite(report, MD_DST)
left = sorted(set(re.findall(r"(?i)AppData[\\/]Local[\\/]Temp[\\/]claude[^\s`'\"|)]*", report)))
print("report chars:", len(report), "| leftover scratchpad refs:", len(left))
for x in left[:8]:
    print("   ", x)
if DRY:
    sys.exit(0)

os.makedirs(EVID_PAR, exist_ok=True)
open(os.path.join(VV, REPORT_NAME), "w", encoding="utf-8", newline="\n").write(report)
counts = {}
counts["slices"] = copy_tree(os.path.join(PAR, "slices"), os.path.join(EVID_PAR, "slices"), lambda r: not r.endswith(".md") and os.path.sep in r)
counts["data"] = copy_tree(os.path.join(PAR, "data"), os.path.join(EVID_PAR, "data"), is_backup)
counts["ref"] = copy_tree(os.path.join(PAR, "ref"), os.path.join(EVID_PAR, "ref"))
counts["report"] = copy_tree(os.path.join(PAR, "report"), os.path.join(EVID_PAR, "report"), is_backup)
for fn in ("drift.py", "prep.py", "build_verified.py", "assemble_report2.py"):
    copy_file(os.path.join(SCR, fn), os.path.join(EVID_PAR, "report", "tools", "orchestrator", fn))
open(os.path.join(EVID, "README__Evidence__.md"), "w", encoding="utf-8", newline="\n").write(
    "# TrueVision -> ValeVision Parity Audit - Evidence (01-Oct-2026)\n\n"
    f"Supporting material for `../{REPORT_NAME}`. Compared TrueVision3D v2.172.0 (NaWeb HEAD b2aa9151) with "
    "ValeVision3D v2.71.0 (ValeCodebase HEAD 7b4e593a). 18 survey agents, each checked by an adversarial verifier; "
    "then K1 (decisions), K2 (target maps), K3 (work packages); Sections A-F written, critiqued, revised and "
    "harmonised. `parity/` keeps the working layout, so every `parity/...` path in the report resolves here.\n\n"
    "- `parity/slices/` - the 18 verified slice reports (each ends with its verifier's `## Verification`).\n"
    "- `parity/data/` - canonical JSON; query with `python parity/data/q.py --help`.\n"
    "- `parity/report/` - K1-K3, the R0-R6 sources, HARMONISATION_LOG.md and `tools/`.\n"
    "- `parity/ref/` - per-file drift, file trees, devlog / ledger indices, PORT NOTE marker greps.\n")
print("wrote", os.path.join(VV, REPORT_NAME))
print("evidence files:", counts)
