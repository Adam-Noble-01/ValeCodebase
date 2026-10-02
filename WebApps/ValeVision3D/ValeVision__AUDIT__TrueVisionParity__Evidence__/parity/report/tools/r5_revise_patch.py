# R5 reviser patch (01-Oct-2026): applies the critic's fixes to the R5 generators, keeping each file's line endings.
#  1. README__SpellCheck__.md is W2-34's (a new VV target there); README__PublishedDocuments__.md had no K3 owner and is
#     assigned to W4-17 here (r5_inventory.py, r5_assemble.py, R5_template.md, r5_analysis.py 52 row).
#  2. E.2.2 48 row: VV renames FIVE VV-only ids, three of which collide with TV 48 (r5_analysis.py; E.4 41 row in the template).
#  3. E.4 Snapping__ row: 10 importing files, not 11 (R5_template.md).
# Each replacement must match exactly once. Run once; re-running fails on the first assertion (already patched).
import io, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def patch(name, pairs):
    path = os.path.join(HERE, name)
    raw = open(path, "rb").read()
    crlf = b"\r\n" in raw
    txt = raw.decode("utf-8").replace("\r\n", "\n")
    for old, new in pairs:
        n = txt.count(old)
        assert n == 1, "%s: expected 1 match, found %d for: %r" % (name, n, old[:90])
        txt = txt.replace(old, new)
    if crlf:
        txt = txt.replace("\n", "\r\n")
    open(path, "wb").write(txt.encode("utf-8"))
    print("patched", name, len(pairs), "replacement(s)", "CRLF" if crlf else "LF")


# ----------------------------------------------------------------------------- r5_inventory.py
patch("r5_inventory.py", [
    ("""for rel in ("02__Src__AppModules/52__System__Layout__PublishedDocuments/README__PublishedDocuments__.md",
            "02__Src__AppModules/55__Feature__SpellCheck/README__SpellCheck__.md"):
    EXCLUDE[rel] = ("no owner", "-", "README with no K3 owner (W1-37 ports ColourPalette's README): add to the folder's package")
""",
     """# READMEs of TV-only folders travel with a package of their folder (W1-15, W1-37, W2-34, W4-01 and W4-08 list theirs).
# K3 names README__SpellCheck__.md only as a new W2-34 VV target (not in its tv_sources), so the owner lookup falls back to
# the package that creates the same path in VV. K3 gives README__PublishedDocuments__.md no package at all: this section
# assigns it to W4-17, the first package to create files in 52 (a K3 correction for Section F's list, F.8).
PROPOSED_OWNER = {
    "02__Src__AppModules/52__System__Layout__PublishedDocuments/README__PublishedDocuments__.md":
        "W4-17 (assigned here; not in wp_canonical.json)",
}
README_NOTE = {
    "02__Src__AppModules/55__Feature__SpellCheck/README__SpellCheck__.md":
        "README rewritten for VV (a new W2-34 target): the Vale dictionary file and route of W0-18; TV's 'NOT in ValeVision' "
        "line goes",
    "02__Src__AppModules/52__System__Layout__PublishedDocuments/README__PublishedDocuments__.md":
        "README adapted for VV: Vale identity, SCHEMA REF at the VV example folder W4-01 seeds, the Urls line as W4-17's VV "
        "Urls; no K3 package lists it, so the delegator adds it to W4-17's targets",
}
"""),
    ("""    wp = ", ".join(wp_sort(TVSRC2WP.get(p, [])))
""",
     """    wp = ", ".join(wp_sort(TVSRC2WP.get(p, [])))
    if not wp:
        wp = ", ".join(wp_sort(VVTGT2WP.get(p, [])))  # created at the same path in VV, not listed as a TV source
    if not wp and p in PROPOSED_OWNER:
        wp = PROPOSED_OWNER[p]
"""),
    ("""    action = base if not g else "gated, " + base + " - " + gtxt
""",
     """    action = base if not g else "gated, " + base + " - " + gtxt
    if p in README_NOTE:
        action += "; " + README_NOTE[p]
"""),
])

# ----------------------------------------------------------------------------- r5_assemble.py
patch("r5_assemble.py", [
    ("""    else:
        act["path/body/rename/no owner"] += 1
""",
     """    elif a.startswith("no owner"):
        act["no owner"] += 1
    else:
        act["path/body/rename"] += 1

# K3 coverage check: TV-only files whose basename is in no package's tv_sources, vv_targets, edits or hot_files
k3_names = set()
for p in K3["packages"]:
    for s in p["tv_sources"] + p["vv_targets"] + p.get("edits", []) + p.get("hot_files", []):
        k3_names.add(s.split(" (")[0].strip().split("/")[-1])
outside = [x for x in INV if x["path"].split("/")[-1] not in k3_names]
outside_excl = [x for x in outside if x["action"].startswith("excluded")]
outside_gap = [x["path"].split("/")[-1] for x in outside if not x["action"].startswith("excluded")]
print("outside K3:", len(outside), "excluded:", len(outside_excl), "gaps:", outside_gap)
assert outside_gap == ["README__PublishedDocuments__.md"], "E.3 coverage sentence names the gap by hand: re-check it"
"""),
    ("""    "E3_ACT": ", ".join("%s %d" % (k, v) for k, v in act.most_common()),
""",
     """    "E3_ACT": ", ".join("%s %d" % (k, v) for k, v in act.most_common()),
    "N_E3_OUTSIDE": str(len(outside)), "N_E3_OUTSIDE_EXCL": str(len(outside_excl)),
"""),
])

# ----------------------------------------------------------------------------- r5_analysis.py
patch("r5_analysis.py", [
    ("""     "keep_vv_divergence (DR-26, DR-41). W2-02 completes VV's adapter; TD06 schema fix is TV-side (WT-02)."),
""",
     """     "keep_vv_divergence (DR-26, DR-41). W2-02 completes VV's adapter; W2-05 renames VV's five Cross Section Tool gate ids "
     "(48 row); TD06 schema fix is TV-side (WT-02)."),
"""),
    ("""     "Placeholder Dev panel 0.1.0 (v2.86.0) whose DOM ids collide with VV-only ids (DR-26).",
     "Add with W2-05 after renaming VV's two VV-only ids (DR-26)."),
""",
     """     "Placeholder Dev panel 0.1.0 (v2.86.0), one 198-line file, whose three DOM ids `naCrossSectionDev{Item,Toggle,Panel}` "
     "(TV 48 :79-81, TV Index.html:600-605) are already VV's Cross Section Tool gate ids (S02a-F46, DR-26).",
     "Add with W2-05 after VV renames the five VV-only ids of that gate, `naCrossSectionDev{Item,Toggle,Panel,EnableCheck,Save}` "
     "(VV index.html:855-866, 41 DevControls :79-83; no CSS uses them), to `naCrossSectionToolDev*`, so TV's file ports byte "
     "for byte (DR-26, K2 S4)."),
"""),
    ("""     "Add: W4-17 (leaves inert), W4-02 (reader closure), W4-09 (viewer wiring). Gates DR-22, DR-25."),
""",
     """     "Add: W4-17 (leaves inert, and the folder README this section assigns to it, E.3), W4-02 (reader closure), W4-09 "
     "(viewer wiring). Gates DR-22, DR-25."),
"""),
])

# ----------------------------------------------------------------------------- R5_template.md
patch("R5_template.md", [
    ("""LocalProjectMirror). Actions: {{E3_ACT}}.
""",
     """LocalProjectMirror). Actions: {{E3_ACT}}.

**Ownership check.** Every file below has a K3 package or a recorded reason not to port. A basename check of all
{{N_E3}} files against every package's `tv_sources`, `vv_targets`, `edits` and `hot_files` leaves {{N_E3_OUTSIDE}} files
outside K3: {{N_E3_OUTSIDE_EXCL}} are the exclusions marked below (TV's ProfileLines, five 41 engine files, seven 27 menu
files, the 80 note) and one is a gap closed here. K3 gives `README__PublishedDocuments__.md` (52) no package, so this
section assigns it to W4-17, the first package to create files in that folder (W1-15, W1-37, W2-34, W4-01 and W4-08
each carry their folder's README); the delegator adds it to W4-17's targets, a K3 correction for Section F's list (F.8).
`README__SpellCheck__.md` is W2-34's: a new VV target there, though not one of its `tv_sources`.
"""),
    ("""| `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` | 1 (455), 1.2.0 | retire: re-export shim over `LE/28__System__ObjectSnap` (FR-14), deleted when its 11 importers move (FR-15) | W2-19, W3-08 | DR-05; S04b-F63 TONE trap |
""",
     """| `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` | 1 (455), 1.2.0 | retire: re-export shim over `LE/28__System__ObjectSnap` (FR-14), deleted when its 10 importing files move (FR-15; S01's 11 counted the comment at `LE/30/Na__LayoutEditor__SheetTools__.js:336`, K2 TargetMaps section 11) | W2-19, W3-08 | DR-05; S04b-F63 TONE trap |
"""),
    ("""| `41__System__CrossSectionView/` | 7 (3,697) | keep (DIV-2; TD06 keeps VV's `CrossSection__SceneData` schema); adapter completed | W2-02; TV side WT-02 | DR-26, DR-41; TF-T21 |
""",
     """| `41__System__CrossSectionView/` | 7 (3,697) | keep (DIV-2; TD06 keeps VV's `CrossSection__SceneData` schema); adapter completed (W2-02); the five Dev-gate ids `naCrossSectionDev*` (`index.html:855-866`, DevControls `:79-83`) become `naCrossSectionToolDev*` (W2-05); a new `README__CrossSectionView__.md` names the twins (K2 N6; no K3 package creates it, Sections A and B propose W0-06) | W2-02, W2-05, W0-06 (proposed); TV side WT-02 | DR-26, DR-41; TF-T21 |
"""),
])
print("done")
