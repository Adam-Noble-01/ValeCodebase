# W0-06: dated notes in VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md (LF file).
# Nothing is rewritten: four dated notes are added (header status, D05 revision, 4.1 folder names, 4.3 ledger shape).
# Proof: removing the inserted text gives back the pre-image bytes exactly. Run: python patch_plan.py [--write]
import hashlib, json, os, sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCR = os.path.dirname(os.path.abspath(__file__))
REL = "ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md"
MAN = json.load(open(os.path.join(SCR, "preimage_manifest.json"), encoding="utf-8"))["existing"][REL]
p = os.path.join(VV, REL)
b = open(p, "rb").read()
assert hashlib.sha1(b).hexdigest() == MAN["sha1"], "PLAN changed under me"
assert b.count(b"\r\n") == 0
t = b.decode("ascii")
orig = t
inserts = []


def insert_after(anchor, text, label):
    global t
    c = t.count(anchor)
    assert c == 1, (label, c)
    i = t.index(anchor) + len(anchor)
    t = t[:i] + text + t[i:]
    inserts.append(text)


# 1. header status (S11 B11: "Plan for review. Nothing has been built yet." / parity target v2.19.0)
insert_after("Parity target: TrueVision 3D `v2.19.0` (07-Sep-2026)\n",
             "\n**Status, 01-Oct-2026 (dated note; the lines above are kept as written).** Built: Phases 0 to 5 shipped as ValeVision3D v2.16.0 to v2.21.x on 09 to 11-Sep-2026, and the return trips that followed (v2.22.0 to v2.70.0) tracked TrueVision up to its v2.85.0. The parity target is now TrueVision 3D v2.172.0 (commit `b2aa9151`): the alignment Adam asked for on 01-Oct-2026, recorded in section 2A (D41 to D91) and worked through `ValeVision__PLAN__TrueVisionRealign__DrawingSystems__.md` and the parity ledger.\n",
             "header")
# 2. D05 revision note (W0-06 acceptance)
d05_tail = "45 PlanDimensions, 46 ElevationViews, 50 ProjectedLinework, 51 LayoutEditor."
insert_after(d05_tail,
             " Revised 01-Oct-2026 (D42: DR-02 default (a), applied in the working tree by W0-02): the drawing folders now carry TrueVision's numbers - 42 -> `40__System__DrawingViewCore`, 43 -> `42__System__FloorPlanViews`, 44 -> `43__System__PlanAnnotations`, 45 -> `44__System__PlanDimensions`, 46 -> `45__System__ElevationViews`, 47 -> `46__System__NorthDirection` - so TrueVision's 47, 48 and 49 land at their own numbers; the legacy `40__System__2dElevationsView` moved to `91__System__2dElevationsView` and its 2D profile-lines file to `05__RenderPipeline/` (D43); `41__System__CrossSectionView` keeps its number and name (DIV-2, D66); 50 and 51 are unchanged. The slot list above is kept as it was decided; the old -> new map is the parity ledger's \"Folder renumbering (01-Oct-2026)\" section, and every number is in `ValeVision__NOTES__FolderNumberRegistry__.md`.",
             "D05")
# 3. 4.1 folder names
insert_after("Scene groups live in the existing `21__System__PresentationMode`.\n",
             "- Revised 01-Oct-2026 (D42, see D05): these folders are now `40__System__DrawingViewCore`, `42__System__FloorPlanViews`, `43__System__PlanAnnotations`, `44__System__PlanDimensions` and `45__System__ElevationViews`, with North at `46__System__NorthDirection`; TrueVision is the numbering authority (registry: `ValeVision__NOTES__FolderNumberRegistry__.md`).\n",
             "4.1")
# 4. 4.3 ledger shape
insert_after("Fixes made in ValeVision that TrueVision needs are logged in a \"Pending back-port\" table at the foot of the ledger.\n",
             "\nRevised 01-Oct-2026 (D75: DR-35 default (b), done by W0-06): the ledger is restructured in place - a header (roots, divergences, the shared service worker), the folder map with the renumbering, a Module Register of one row per module in scope, a Release Watermark of every TrueVision release v2.24.0 to v2.172.0, a Decisions section that marks D01 to D40 current, superseded or permanent, the back-ports to TrueVision with their checked statuses, and an Archive holding every earlier section unchanged under a dated note. Only each wave's Parity Scribe writes it from now on.\n",
             "4.3")
# proof of non-rewrite
undo = t
for s in inserts:
    assert undo.count(s) == 1
    undo = undo.replace(s, "", 1)
assert undo == orig, "removing the notes does not give back the original"
assert all(ord(c) < 128 for c in t)
print("notes", len(inserts), "bytes", len(orig), "->", len(t), "(undo proof OK)")
if "--write" in sys.argv:
    open(p, "wb").write(t.encode("ascii"))
    print("WRITTEN")
