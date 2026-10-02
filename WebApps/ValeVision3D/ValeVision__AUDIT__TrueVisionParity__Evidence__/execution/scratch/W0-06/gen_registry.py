# W0-06: generate VV/ValeVision__NOTES__FolderNumberRegistry__.md
# The number table is computed from the live folder lists (TV at the pin via git ls-tree, VV working tree, WCP
# working tree) plus the K2 N3 bands, R1 A.2.7 and the front matter's Q-REG / Q-63 defaults. It validates:
#   - every number 01-99 has exactly one row and one class;
#   - every top-level module folder of TV (pin), VV (now) and WCP (now) appears in its number's row;
#   - no VV folder sits on a TV-only, TV-growth or burnt number (62 is the one recorded nominal collision).
# Writes LF, ASCII only. Run: python gen_registry.py [--write]
import io, os, re, subprocess, sys

VV_ROOT = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
WCP_ROOT = r"D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
OUT = os.path.join(VV_ROOT, "ValeVision__NOTES__FolderNumberRegistry__.md")


def tv_ls(sub):
    r = subprocess.run(["git", "-C", NAWEB, "ls-tree", "--name-only", PIN,
                        "na-apps/30__TrueVision__CoreAppCode/" + sub + "/"], capture_output=True, text=True, check=True)
    return sorted(x.rsplit("/", 1)[-1] for x in r.stdout.splitlines())


def ls_dirs(p):
    return sorted(d for d in os.listdir(p) if os.path.isdir(os.path.join(p, d)))


def by_num(names):
    m = {}
    for n in names:
        mm = re.match(r"^(\d\d)__", n)
        if mm:
            m.setdefault(mm.group(1), []).append(n)
    return m


TV_TOP = by_num(tv_ls("02__Src__AppModules"))
VV_TOP = by_num(ls_dirs(os.path.join(VV_ROOT, "02__Src__AppModules")))
WCP_TOP = by_num(ls_dirs(os.path.join(WCP_ROOT, "02__Src__AppModules")))
TV_LE = by_num(tv_ls("02__Src__AppModules/51__System__LayoutEditor"))
VV_LE = by_num(ls_dirs(os.path.join(VV_ROOT, "02__Src__AppModules", "51__System__LayoutEditor")))

# ---------------------------------------------------------------- top-level classes
# class tokens (exact): shared | TV-only | VV-reserved | legacy | burnt
SHARED_NOW = ["01", "02", "03", "04", "05", "06", "07", "10", "11", "15", "20", "21", "25", "26", "30",
              "40", "41", "42", "43", "44", "45", "46", "50", "51", "70"]
SHARED_LANDING = {   # TV folder, VV gains it at TV's number with its port (K2 TF-T38..T45, TF-T49)
    "27": "VV gains TV's folder with its port - partial content by design: the menu renderer only (W4-11; DR-44; R1 A.4 #12)",
    "47": "VV gains TV's folder with its port (W2-01, Drawing Planes; DR-02)",
    "48": "VV gains TV's placeholder byte for byte with the Elevations Dev-menu rebuild (W2-05; DR-26) - not VV 41's twin, see 41",
    "49": "VV gains TV's folder with its port (W1-09 leaves, W2-03 core; DR-15)",
    "52": "VV gains TV's folder with the publishing wave (W4-09, W4-17; DR-22). TV used 52 for SitePlanData until v2.155.0 (TV devlog :1284)",
    "53": "VV gains TV's folder with the publishing wave (W4-01; DR-22). TV used 53 for ProjectQrCode until v2.155.0 (TV devlog :1284)",
    "54": "VV gains TV's folder (W1-37, Colour Palette; DR-20)",
    "55": "VV gains TV's folder (W2-34, Spell Check; DR-20)",
    "80": "VV gains TV's path with a VV body: the transport facade `Na__CloudflareIntegration__ApiClient__.js` (W0-12; DR-27, DIV-4). TV's worker folder at the app root is never copied (K2 N9)",
}
TV_ONLY = {
    "62": None,   # handled as the recorded nominal collision row (VV-reserved)
    "75": "TV-only, never in VV: `75__System__UserInstructionsSystem` is a 3D-tab extra outside drawing parity (DR-44)",
    "76": "TV-only, never in VV: `76__System__FullscreenMode`; VV keeps its own full-screen feature at 60 (DR-44)",
}
TV_GROWTH_K2 = [str(n).zfill(2) for n in list(range(22, 25)) + list(range(32, 35)) + list(range(36, 40)) +
                list(range(56, 60)) + list(range(65, 69)) + list(range(72, 75)) + list(range(77, 80)) +
                list(range(81, 90))]
TV_GROWTH_QREG = ["08", "09", "12", "13", "14", "16", "17", "18", "19"]
VV_RESERVED = {
    "28": "VV-only `28__System__GridLineSystem` (3D grid lines); reserved for VV (DR-03 registry (i))",
    "29": "VV-only `29__System__FogPlaneSystem` (3D-view fog plane - not TV's 49 depth fog, which lands beside it); reserved for VV",
    "31": "VV-only `31__System__VideoStudio`; reserved for VV",
    "60": "VV-only `60__Feature__FullScreenMode` (twin of TV `76__System__FullscreenMode`, DR-44 keeps VV's); reserved for VV",
    "61": "VV-only `61__Feature__ShareProjectLink` (Vale client project links; not TV's document sharing LE/66, DR-43); reserved for VV",
    "62": "VV `62__Feature__EmailWorkers` keeps 62 - a NOMINAL COLLISION, recorded: TV's and WCP's 62 is `62__Feature__AppInstallability`, which VV never ports (VV runs under WCP's PWA; K2 TF-T46). Moves to 92 only if Adam asks, after its tracked node_modules are removed (FR-22, W6-03; DR-03 default \"62 unchanged\")",
    "63": "VV-only `63__Feature__AppNotificationEmail`; reserved for VV. Q-63 (D86): TV's UNMERGED branch `claude/westfarm-intro-notes-37b804` (commit `4db73420`, 22-Sep-2026; not in `b2aa9151` and not in TV HEAD on 01-Oct-2026) adds `63__System__LocalFileParity`. Nothing moves while it is unmerged. If it merges as 63 first, VV's folder moves to 93 with W6-03 (Q-63 (b)) and this row records it; recommended to Adam instead: rename the branch folder to a TV-growth number such as 65 before it merges (Q-63 (a))",
    "64": "VV-only `64__Feature__BreadcrumbNav`; reserved for VV",
    "69": "VV-only `69__System__SketchUpToValeVision__Utilities`; reserved for VV",
    "71": "VV-only `71__System__ExportRenderLayers`; reserved for VV",
    "92": "VV band, reserved (empty): earmarked for `92__Feature__EmailWorkers` if Adam asks for the 62 move (FR-22, W6-03). Never used by TV (K2 section 8 proof)",
    "93": "VV band, free: the lowest free number for the next VV-only top-level folder (K2 N3). Earmarked for `93__Feature__AppNotificationEmail` only if Q-63 (b) applies (see 63)",
    "94": "VV band, free (future VV-only folders take the lowest free number in 93-99)",
    "95": "VV band, free (future VV-only folders). Not to be confused with the app-root `95__SketchUpSisterTools__ToolsAndUtils/` (outside 02__Src__AppModules)",
    "96": "VV band, free (future VV-only folders)",
    "97": "VV band, free (future VV-only folders)",
    "98": "VV band, free (future VV-only folders)",
    "99": "VV band, free (future VV-only folders)",
}
LEGACY = {
    "35": "VV legacy `35__System__PageLayoutSystem` (the old Create Drawing / Layout View). Kept and reserved until W6-03 retires it (held until Adam confirms the removals, DR-03; D43), after W0-16 has copied jsPDF and Vale's Classic scan out of it; then BURNT, never reused (K2 TF-T19, FR-21). TV's copy of the same system lived at 90",
    "91": "VV legacy `91__System__2dElevationsView` (the Tools-menu Elevation View), moved here from 40 by W0-02 on 01-Oct-2026 (FR-01; DR-03 (a)) so TV's 40 DrawingViewCore could take 40. Retires with W6-03 (FR-25), then BURNT. 91 was never used by TV (K2 section 8 proof)",
}
BURNT = {
    "90": "Burnt: TV's retired `90__System__PageLayoutSystem` (TrueVision3D v2.155.0, TV devlog :1287 at `b2aa9151`). Never reused by either app",
}
SHARED_NOTES = {
    "03": "Shared. VV keeps VV-only utilities here (`R2SaveProjectJson`, `R2DrawingNotes` until W2-33, `ValeVision__HotkeyHandler`, `LoadingOverlay`, `ResilientLoad`); TV's `LocalProjectMirror__` lands with a VV body (W0-12, DIV-4)",
    "05": "Shared. VV keeps its dual render engine subfolders `01__Engine__PureEngine/` and `02__Engine__MaxEngine/` (DIV-1); since W0-02 `Na__RenderEffect__2dProfileLines__.js` and `Na__RenderEffect__DistanceCulling__.js` sit here at TV's level (FR-08, FR-11)",
    "40": "Shared since W0-02 (01-Oct-2026): VV's DrawingViewCore moved here from 42 (FR-02); VV's legacy 2dElevationsView left 40 for 91 (FR-01)",
    "41": "SAME NUMBER, DIFFERENT ENGINE (DIV-2), kept on purpose: VV `41__System__CrossSectionView` (the live Cross Sections tool) against TV `41__System__SectionCutEngine`; no file in common, so neither renames (K2 N6, DR-26 / D66); TV's 41 is never ported (DR-41 / D81). See `02__Src__AppModules/41__System__CrossSectionView/README__CrossSectionView__.md`",
    "42": "Shared since W0-02: VV's FloorPlanViews moved here from 43 (FR-03)",
    "43": "Shared since W0-02: VV's PlanAnnotations moved here from 44 (FR-04)",
    "44": "Shared since W0-02: VV's PlanDimensions moved here from 45 (FR-05)",
    "45": "Shared since W0-02: VV's ElevationViews moved here from 46 (FR-06)",
    "46": "Shared since W0-02: VV's NorthDirection moved here from 47 (FR-07), freeing 47 for TV's DrawingPlanes",
    "51": "Shared. LE subfolder numbers are TV's (section 3); VV's one extra, `LE/01__Core__Loader`, is VV-reserved",
}


def row_for(n):
    tv = ", ".join("`%s`" % x for x in TV_TOP.get(n, [])) or "-"
    vv = ", ".join("`%s`" % x for x in VV_TOP.get(n, [])) or "-"
    wcp = ", ".join("`%s`" % x for x in WCP_TOP.get(n, [])) or "-"
    if n in SHARED_NOW:
        cls = "shared"
        note = SHARED_NOTES.get(n, "Shared: same system, same name and number in both apps")
    elif n in SHARED_LANDING:
        cls = "shared"
        note = "TV folder; " + SHARED_LANDING[n]
    elif n in LEGACY:
        cls = "legacy"
        note = LEGACY[n]
    elif n in BURNT:
        cls = "burnt"
        note = BURNT[n]
    elif n in VV_RESERVED:
        cls = "VV-reserved"
        note = VV_RESERVED[n]
    elif n in ("75", "76"):
        cls = "TV-only"
        note = TV_ONLY[n]
    elif n in TV_GROWTH_QREG:
        cls = "TV-only"
        note = "TV growth: unowned in K2, assigned to TrueVision by Q-REG (a) (D88; R1 A.2.7); VV never takes it"
    elif n in TV_GROWTH_K2:
        cls = "TV-only"
        note = "TV growth (K2 N3): free for TrueVision's next folders; VV never takes it"
    else:
        raise SystemExit("no class for " + n)
    if n == "62":
        note += ". WCP's 62 is the PWA ValeVision runs under (section 2.3)"
    elif wcp != "-":
        note += ". WCP's " + wcp.replace("`", "") + " is Whitecardopedia's own namespace (see section 2.3)"
    return n, tv, vv, wcp, cls, note


rows = [row_for(str(i).zfill(2)) for i in range(1, 100)]

# ---------------------------------------------------------------- validation
errs = []
classes = {r[0]: r[4] for r in rows}
for n, names in VV_TOP.items():
    c = classes.get(n)
    if c not in ("shared", "VV-reserved", "legacy"):
        errs.append("VV folder on a %s number: %s" % (c, names))
    if c == "shared" and n not in ("41",) and n in TV_TOP and sorted(names) != sorted(TV_TOP[n]):
        errs.append("VV name differs from TV on shared %s: %s vs %s" % (n, names, TV_TOP[n]))
for n, names in TV_TOP.items():
    c = classes.get(n)
    if c not in ("shared", "TV-only") and n != "62":
        errs.append("TV folder on a %s number: %s" % (c, names))
for src in (TV_TOP, VV_TOP, WCP_TOP):
    for n in src:
        if n not in classes:
            errs.append("unlisted number " + n)
for n in ("08", "09", "12", "13", "14", "16", "17", "18", "19"):
    if classes[n] != "TV-only":
        errs.append("Q-REG number not TV growth: " + n)
if "00" in TV_TOP or "00" in VV_TOP:
    errs.append("a 00 module folder exists")
if errs:
    print("VALIDATION FAILED:\n" + "\n".join(errs))
    sys.exit(1)

# ---------------------------------------------------------------- LE subfolders
LE_PKG = {
    "21": "dormant site-plan client (W2-14; DR-08 (B))", "26": "Draft mode (W2-18)", "27": "Drawing Grid (W2-18, W3-05)",
    "28": "Object Snap (W2-42, W2-19); replaces VV's `30/Na__LayoutEditor__Snapping__.js` (FR-14, FR-15)",
    "31": "Document keys (W1-30)", "32": "Ortho mode (W2-18)", "33": "Drawing Axes (W2-18)",
    "36": "Hatch pattern tools (W1-17, W2-29)", "37": "Vector tools (W2-27, W2-28, W2-41, W3-07)",
    "51": "Drawing Register (W4-18, W4-10)", "52": "Statement Writer, switched off (W4-04..W4-16; DR-10)",
    "53": "Project QR, switched off (W1-15; DR-12)", "54": "Sheet Images (W1-16, W3-02, W3-18, W3-09)",
    "58": "Specification Scrapbook (W2-35)", "59": "Floor Areas (W1-27, W3-10)",
    "65": "Document publishing (W4-03, W4-07)", "66": "Document sharing (W4-07, W4-08)",
}
le_rows = []
for i in range(1, 100):
    n = str(i).zfill(2)
    tv = TV_LE.get(n, [])
    vv = VV_LE.get(n, [])
    if not tv and not vv:
        continue
    if n == "01":
        cls, note = "VV-reserved", "VV's lazy loader (Loader, LoadingScreen, Styles__Boot): a permanent VV divergence (DR-24 (a), D64). TV's own devlog reserves LE/01 for a loader (TV devlog :11718 at `b2aa9151`)"
    elif tv and vv:
        if tv != vv:
            errs.append("LE name differs at %s: %s vs %s" % (n, tv, vv))
        cls, note = "shared", "Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0)"
    elif tv and not vv:
        cls, note = "shared", "TV subfolder; VV gains it at TV's number: " + LE_PKG.get(n, "(see the Module Register)")
    else:
        errs.append("VV-only LE subfolder other than 01: %s" % vv)
        continue
    le_rows.append(("LE/" + n, ", ".join("`%s`" % x for x in tv) or "-", ", ".join("`%s`" % x for x in vv) or "-", cls, note))
if errs:
    print("VALIDATION FAILED:\n" + "\n".join(errs))
    sys.exit(1)

# ---------------------------------------------------------------- document
L = []
A = L.append
A("# ValeVision 3D - Folder Number Registry")
A("")
A("**Kept by:** the TrueVision parity programme's records package W0-06, then each wave's Parity Scribe (W0-99 to W6-04)")
A("**Created:** 01-Oct-2026")
A("**Decisions:** DR-03 registry (i) (VV plan D43), Q-REG (a) (D88), Q-63 default (D86), DR-02 (D42), DR-26 (D66) - all on their")
A("defaults, unanswered by Adam on 01-Oct-2026 (`ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`, section 2A)")
A("")
A("Every two-digit folder number at the top of `02__Src__AppModules/`, and the numbers inside the Layout Editor, the vendor")
A("folder and the app root, with who may use each one. TrueVision is the numbering authority: a ValeVision folder that holds")
A("the same system as a TrueVision folder takes TrueVision's exact `NN__Category__Name`, and a ValeVision-only folder never")
A("takes a number TrueVision uses now or has used (K2 rulebook N1-N3). This file is how a new folder - in either app - picks")
A("its number without colliding, and it is what the parity naming lint reads (`80__Testing__PrototypeEnvironment/")
A("Na__Verify__ParityNaming__.mjs`, written by W0-04): a top-level module folder whose number is not registered here for")
A("the app that uses it fails the lint.")
A("")
A("Sources, read on 01-Oct-2026: TrueVision at commit `%s` (TrueVision3D v2.172.0, `git ls-tree`); ValeVision's working" % PIN)
A("tree after the drawing-folder renumber W0-02 (staged by `git mv`, not yet committed); Whitecardopedia's working tree.")
A("The rules are the audit's K2 rulebook (N1-N9) and its section 8 table, with R1 A.2.7's additions")
A("(`ValeVision__AUDIT__TrueVisionParity__Evidence__/parity/report/`).")
A("")
A("---")
A("")
A("## 1. How to read it, and the rules")
A("")
A("**Class** (exact words, one per number):")
A("")
A("| Class | Meaning | May ValeVision use it? | May TrueVision use it? |")
A("| --- | --- | --- | --- |")
A("| `shared` | TrueVision names the folder and ValeVision mirrors it at the same number and name - now, or when the port that brings the folder lands. One shared number carries two engines on purpose (41, DIV-2). | Yes, with TrueVision's name | Yes (it owns the name) |")
A("| `TV-only` | TrueVision's: a TrueVision folder ValeVision never ports (62 aside, see its row; 75, 76), or a number left free for TrueVision's growth. | No | Yes |")
A("| `VV-reserved` | ValeVision's own systems (28, 29, 31, 60-64, 69, 71) and the ValeVision band 92-99. | Yes | No - a new TrueVision folder skips these |")
A("| `legacy` | A ValeVision legacy tool due to retire (35, 91). Burnt once retired. | Only the folder already there | No |")
A("| `burnt` | Used once and retired. Never reused by either app. | No | No |")
A("")
A("**Rules** (K2 rulebook section 1, unchanged):")
A("")
A("1. TrueVision is the numbering authority. A ValeVision folder holding a TrueVision system takes TrueVision's exact")
A("   `NN__Category__Name`, at the top level, in Layout Editor subfolders and in nested subfolders (N1).")
A("2. A ValeVision-only folder never takes a number TrueVision uses now or has used, TrueVision's devlog history included (N2).")
A("3. A new ValeVision-only top-level folder takes the lowest free number in 93-99. A new TrueVision folder skips every")
A("   `VV-reserved` and `legacy` number (N3). Legacy ValeVision tools live in the 9x band.")
A("4. A folder's number never changes silently: a change is a dated row here, made by the package that moves the folder,")
A("   and old paths stay as written in history documents (K2 section 13).")
A("5. TrueVision holds the twin of this table as `TrueVision__NOTES__FolderNumberRegistry__.md` once the TrueVision-lane")
A("   package WT-08 lands (held until Adam approves it, DR-36). Until then the rule binds ValeVision only; TrueVision itself")
A("   reassigned its own 52 and 53 in v2.155.0 (TV devlog :1284).")
A("")
A("**Machine reading.** Section 2.1 has exactly one row per number 01-99, each row starting `| NN |`, with these columns")
A("in this order: number, TrueVision folder at `%s`, ValeVision folder now, Whitecardopedia folder now, class, rule." % PIN)
A("Folder cells hold back-quoted folder names or `-`. Section 3 has one row per Layout Editor number in use, starting")
A("`| LE/NN |`, with the same column meaning (no Whitecardopedia column). 00 is not a module-folder number in either app")
A("(both app roots use 00 for archives: TrueVision `00__ArchivedVersions`, ValeVision `00__Archive`), so it has no row and a")
A("`00__` folder under `02__Src__AppModules` is unregistered.")
A("")
A("---")
A("")
A("## 2. Top level: `02__Src__AppModules/`")
A("")
A("### 2.1 Every number, 01-99")
A("")
A("| No. | TrueVision (`%s`) | ValeVision (now) | Whitecardopedia (now) | Class | Rule and note |" % PIN)
A("| --- | --- | --- | --- | --- | --- |")
for n, tv, vv, wcp, cls, note in rows:
    A("| %s | %s | %s | %s | %s | %s |" % (n, tv, vv, wcp, cls, note))
A("")
counts = {}
for r in rows:
    counts[r[4]] = counts.get(r[4], 0) + 1
A("Totals: %s (99 numbers). TrueVision has %d top-level folders at the pin, ValeVision %d now, Whitecardopedia %d." % (
    ", ".join("%s %d" % (k, counts[k]) for k in ("shared", "TV-only", "VV-reserved", "legacy", "burnt")),
    sum(len(v) for v in TV_TOP.values()), sum(len(v) for v in VV_TOP.values()), sum(len(v) for v in WCP_TOP.values())))
A("")
A("### 2.2 The bands at a glance")
A("")
A("| Band | Numbers |")
A("| --- | --- |")
A("| Shared now (same system, same name and number) | 01-07, 10, 11, 15, 20, 21, 25, 26, 30, 40, 42-46, 50, 51, 70; and 41 with two engines (DIV-2) |")
A("| Shared, landing with its port | 27 (menu renderer only, W4-11), 47, 48, 49, 52, 53, 54, 55, 80 (VV facade body) |")
A("| TrueVision folders ValeVision never ports | 75, 76; 62 (TrueVision's and Whitecardopedia's AppInstallability - see 62) |")
A("| TrueVision growth | 08, 09, 12-14, 16-19 (Q-REG (a)), 22-24, 32-34, 36-39, 56-59, 65-68, 72-74, 77-79, 81-89 |")
A("| ValeVision-reserved | 28, 29, 31, 60, 61, 62 (nominal collision kept), 63, 64, 69, 71; the band 92-99 (92 earmarked, 93-99 free) |")
A("| ValeVision legacy, burnt once retired | 35, 91 |")
A("| Burnt | 90 |")
A("")
A("### 2.3 Whitecardopedia's numbers")
A("")
A("Whitecardopedia (`WebApps/Whitecardopedia/02__Src__AppModules/`) is a separate Vale app with its own numbering: no")
A("module ports between it and ValeVision or TrueVision, so its numbers do not bind either app and are listed in section")
A("2.1 for the whole picture only. Two touch ValeVision:")
A("")
A("- **62 `62__Feature__AppInstallability`** is the PWA ValeVision runs under: ValeVision's `index.html` loads its manifest,")
A("  installability scripts and service-worker registrar from that folder, and the shared worker's one token is Adam's to")
A("  bump (DR-07, D47). TrueVision's 62 has the same name and role for TrueVision. ValeVision's own 62 (EmailWorkers) is")
A("  the recorded nominal collision.")
A("- **61 `61__Feature__PwaAppHelpers`** shares a number, not a system, with ValeVision's 61 ShareProjectLink.")
A("")
A("Whitecardopedia's 12, 13 and 14 (ProjectEditor, TimeAnalysis, Authentication) sit on numbers this registry gives to")
A("TrueVision's growth. That is not a collision - the apps' module trees are separate - but a module that ever moved")
A("between Whitecardopedia and ValeVision would have to take a number registered for ValeVision here.")
A("")
A("---")
A("")
A("## 3. Layout Editor subfolders: `02__Src__AppModules/51__System__LayoutEditor/`")
A("")
A("TrueVision names every Layout Editor subfolder (K2 N4). The two apps aligned their subfolders on 15-Sep-2026 (ValeVision")
A("v2.47.0, TrueVision v2.55.0); no Layout Editor folder is renumbered by this programme. ValeVision's only extra is")
A("`LE/01__Core__Loader`. A future ValeVision-only Layout Editor subfolder would take a number in LE/91-99 (R1 A.2.7's")
A("proposal); none exists. Numbers with no row are free for TrueVision.")
A("")
A("| No. | TrueVision (`%s`) | ValeVision (now) | Class | Rule and note |" % PIN)
A("| --- | --- | --- | --- | --- |")
for n, tv, vv, cls, note in le_rows:
    A("| %s | %s | %s | %s | %s |" % (n, tv, vv, cls, note))
A("")
A("TrueVision has %d Layout Editor subfolders at the pin; ValeVision has %d now (17 shared, 1 VV-reserved), and gains the" % (
    sum(len(v) for v in TV_LE.values()), sum(len(v) for v in VV_LE.values())))
A("17 TrueVision-only ones at TrueVision's numbers as their ports land.")
A("")
A("---")
A("")
A("## 4. Other numbered folders")
A("")
A("| Where | Shared (TrueVision numbers, ValeVision mirrors) | TrueVision-only | ValeVision-only | Note |")
A("| --- | --- | --- | --- | --- |")
A("| Vendors `04__Lib__ThirdParty__VersionLocked/NN__Vendor__*` | 01 ThreeJs v0.184.0, 02 ThreeMeshBvh v0.9.9, 03 Clipper2Js v0.9.0, 04 ThreeEdgeProjection v0.0.10 (byte-identical in both apps, DIV-5 closed); 05 JsPdf v4.1.0 and 06 Html2Canvas v1.4.1 land in ValeVision with W0-16 (K2 TF-R05, TF-R06) | - | 07 PdfJs v3.11.174 (VV-first, W0-16; offering it to TrueVision is one of DR-42's back-ports, none of which happens on the default) | Index files keep each app's prefix: `Vale__Dependencies__*` / `TrueVision__Dependencies__*` (K2 N8) |")
A("| Asset subfolders `01__AppAssets__<App>/NN__AppAssets__*` | 05 SkyDomes; 06 TitleBlocks (ValeVision gains it with W0-16, holding Vale's own Classic scan, never TrueVision's) | - | the unnumbered `MeasureToolIcons` | Each app's asset root carries its own token (K2 N7, N8) |")
A("| App root | 01 (token swapped), 02, 03, 04, 50 (token swapped: `50__ValeVision__UserConfig/`, W0-18), 51 `51__LayoutEditor__UserScrapbookContent/`, 52 `52__LayoutEditor__HatchPatternLibrary/` (W1-17), 60 `60__DistributionEmails/`, 79 `79__Testing__GenerateObjects/`, 80 `80__Testing__PrototypeEnvironment/` | the second 80, `80__CloudflareIntegration/` (TrueVision's worker; ValeVision's worker stays in `WebApps/Whitecardopedia/CloudflareWorker`, K2 N9); 90 `90__rubyScript__SketchUpSisterTools__ToolsAndUtils/` | `04__Lib__ThirdParty__Three/` (legacy, retires with W6-03, FR-23); 95 `95__SketchUpSisterTools__ToolsAndUtils/` | Archives at 00 in both: `00__ArchivedVersions/` (TrueVision), `00__Archive/` (ValeVision) |")
A("| Project content beside `project.json` (R2 `VaApps/Projects/<folderId>/`, locally `WebApps/Whitecardopedia/Projects/<yyyy>/<folder>/`) | `05__Layout__DrawingDocs__Images/`, `06__Layout__PublishedDocuments/`, `10__StatementDocs/` - TrueVision's relative names verbatim (K2 R3; DR-29 (A), D69) | - | the existing object names stay: `project.json`, `ValeVision__DrawingNotes__.json`, `LayoutEditor/Linework/`, `LayoutEditor/Snapshots/`, `PresentationMode/Thumbnails/` (K2 R2) | Nothing is written into the new folders on R2 until Adam has applied the W0-07 sync fix and deployed worker 1.6.0 (swarm rule R8) |")
A("")
A("---")
A("")
A("## 5. Changes")
A("")
A("| Date | Change | By | Decision |")
A("| --- | --- | --- | --- |")
A("| 01-Oct-2026 | Registry created. Drawing folders renumbered to TrueVision's numbers in the working tree: 42 -> 40 DrawingViewCore, 43 -> 42 FloorPlanViews, 44 -> 43 PlanAnnotations, 45 -> 44 PlanDimensions, 46 -> 45 ElevationViews, 47 -> 46 NorthDirection, and the legacy 40 2dElevationsView -> 91. Numbers 08, 09, 12-14 and 16-19 registered as TrueVision growth. 63 kept VV-reserved while TrueVision's branch is unmerged | W0-02 (moves), W0-06 (registry) | DR-02 / D42, DR-03 / D43, Q-REG / D88, Q-63 / D86 |")
A("")
doc = "\n".join(L) + "\n"
bad = [c for c in doc if ord(c) > 127]
if bad:
    print("NON-ASCII:", set(bad))
    sys.exit(1)
print("rows", len(rows), "le_rows", len(le_rows), "counts", counts)
print("TV top", sum(len(v) for v in TV_TOP.values()), "VV top", sum(len(v) for v in VV_TOP.values()), "WCP top", sum(len(v) for v in WCP_TOP.values()))
if "--write" in sys.argv:
    with open(OUT, "wb") as f:
        f.write(doc.encode("ascii"))
    print("written", OUT, len(doc))
