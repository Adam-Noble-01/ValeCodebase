# W0-06: comment-only header edits in six VV modules (PORT NOTE fields, log order, renumbered duplicate log entries).
# Byte-level: each file keeps its own line ending; every anchor must match exactly once; the file must still equal its
# G0 pre-image (SHA-1 in preimage_manifest.json) before it is written. Run: python patch_modules.py [--write]
import hashlib, json, os, re, sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCR = os.path.dirname(os.path.abspath(__file__))
MAN = json.load(open(os.path.join(SCR, "preimage_manifest.json"), encoding="utf-8"))["existing"]
WRITE = "--write" in sys.argv


def load(rel):
    p = os.path.join(VV, rel)
    b = open(p, "rb").read()
    sha = hashlib.sha1(b).hexdigest()
    if sha != MAN[rel]["sha1"]:
        raise SystemExit("CHANGED UNDER ME: %s (%s != %s)" % (rel, sha, MAN[rel]["sha1"]))
    eol = "\r\n" if b.count(b"\r\n") == b.count(b"\n") and b.count(b"\n") > 0 else "\n"
    if eol == "\n" and b.count(b"\r\n"):
        raise SystemExit("MIXED EOL: " + rel)
    return p, b.decode("utf-8"), eol


def rep(text, old, new, eol, rel, label):
    o = old.replace("\n", eol)
    n = new.replace("\n", eol)
    c = text.count(o)
    if c != 1:
        raise SystemExit("ANCHOR %s matched %d times in %s" % (label, c, rel))
    return text.replace(o, n)


def save(p, rel, text, eol, original):
    b = text.encode("utf-8")
    if eol == "\r\n":
        assert b.count(b"\r\n") == b.count(b"\n"), rel
    else:
        assert b.count(b"\r\n") == 0, rel
    if WRITE:
        open(p, "wb").write(b)
    print("%-110s %s  %d -> %d bytes" % (rel, "WRITTEN" if WRITE else "dry-run", len(original.encode("utf-8")), len(b)))


VVREL = "{{VVREL:W0-06}}"

# ----------------------------------------------------------------------------- 1. Toolbar
rel = r"02__Src__AppModules\51__System__LayoutEditor\40__Ui__Panels\Na__LayoutEditor__Toolbar__.js"
p, t, eol = load(rel)
orig = t
t = rep(t, """// PORT NOTE:
// - Ported from   : Lantern Designer 30__System__DrawingEditorMode (sheet toolbar purpose)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : none.
""", """// PORT NOTE:
// - Authored in   : ValeVision3D first (v2.21.0, 09-Sep-2026, after the sheet toolbar of
//                   Lantern Designer's 30__System__DrawingEditorMode). TrueVision3D took it
//                   whole on 10-Sep-2026 for its re-alignment and has led it since; this file
//                   has taken TrueVision's changes as hunks, one log entry each.
// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js
// - Source version: hunks up to TrueVision's Toolbar 1.12.0 (TrueVision3D v2.70.0, 19-Sep-2026);
//                   TrueVision's file is 1.24.0 (read at b2aa9151)
// - Ported on     : hunk by hunk, 13-Sep-2026 to 19-Sep-2026 (see the log below)
// - Parity        : adapted
// - Divergences   :
//   - Undo, Redo, Fit and the 100% zoom button are still on the strip. TrueVision
//     removed them in its 1.19.0 and kept their keys and the right-click Zoom to
//     fit (W1-35 takes that change here).
//   - The Notes toggle is still on the strip. TrueVision removed it in its 1.17.0,
//     leaving the Margin Notes panel's own switch (W1-35).
//   - Snap is a plain toggle over this app's
//     30__System__SheetTools/Na__LayoutEditor__Snapping__.js. TrueVision's is a split
//     button with a snap modes menu over 28__System__ObjectSnap (its 1.20.0; W2-19).
//   - Not here yet, each waiting for its feature: Floor Area, Image, Circle, Arc,
//     Draft, Grid, Grid Snap, Ortho, Axes, the vector quality list, Share, and the
//     Save Sheets note for a specification held back by its lockstep (TrueVision
//     1.13.0 to 1.24.0). W5-01 takes TrueVision's file whole once they exist.
//   - Banner reads ValeVision3D.
// - Back-port     : none - TrueVision has the file and leads it.
""", eol, rel, "toolbar portnote")
t = rep(t, """// DEVELOPMENT LOG:
// 19-Sep-2026 - Version 1.9.0
""", """// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.9.3 (records hygiene, """ + VVREL + """)
// - Comments only. The PORT NOTE says where this file came from and what
//   TrueVision's has that it lacks, in the house fields; it had read
//   "Parity : new" since 09-Sep.
// - Two entries below carried numbers already used further down: 17-Sep's
//   1.8.0 (the Move button) is now 1.9.1 and 19-Sep's 1.9.0 (the tab's name) is
//   now 1.9.2, so the log reads newest first with no number twice. The parity
//   ledger and the devlog of those days name them by their old numbers.
//
// 19-Sep-2026 - Version 1.9.2 (written as 1.9.0; renumbered 01-Oct-2026)
""", eol, rel, "toolbar log top")
t = rep(t, """//
// 17-Sep-2026 - Version 1.8.0
""", """//
// 17-Sep-2026 - Version 1.9.1 (written as 1.8.0; renumbered 01-Oct-2026)
""", eol, rel, "toolbar 17-Sep")
t = rep(t, """//   invisible otherwise, and a faded sheet reads as a broken editor.
//
//
// 14-Sep-2026 - Version 1.9.0
""", """//   invisible otherwise, and a faded sheet reads as a broken editor.
//
// 14-Sep-2026 - Version 1.9.0
""", eol, rel, "toolbar double spacer")
save(p, rel, t, eol, orig)

# ----------------------------------------------------------------------------- 2. History
rel = r"02__Src__AppModules\51__System__LayoutEditor\07__Core__SheetData\Na__LayoutEditor__History__.js"
p, t, eol = load(rel)
orig = t
t = rep(t, """// DEVELOPMENT LOG:
// 20-Sep-2026 - Version 1.3.0
// - Common title block fields.""", """// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.4.2 (records hygiene, """ + VVREL + """)
// - Comments only. The 20-Sep Common title block fields entry below carried
//   1.3.0, a number this log had already given to the 14-Sep groups step. It
//   came after 1.4.0 - it landed with ValeVision v2.65.0, on top of the step
//   objects 1.4.0 brought in v2.64.0 - so it is renumbered 1.4.1 and the log
//   reads newest first with no number twice. TrueVision's own History log has
//   the same duplicate 1.3.0, which is where the number came from; the parity
//   ledger of 20-Sep-2026 names this entry by its old number.
//
// 20-Sep-2026 - Version 1.4.1 (written as 1.3.0; renumbered 01-Oct-2026)
// - Common title block fields.""", eol, rel, "history log top")
save(p, rel, t, eol, orig)

# ----------------------------------------------------------------------------- 3. R2AssetUpload
rel = r"02__Src__AppModules\03__AppUtils\Na__AppUtils__R2AssetUpload__.js"
p, t, eol = load(rel)
orig = t
t = rep(t, """// PORT NOTE:
// - Ported from   : none (ValeVision original)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.18.0 (port Phase 2)
// - Parity        : new
// - Divergences   : TrueVision uploads thumbnails through Na__CloudflareIntegration__ApiClient__.
// - Back-port     : candidate.
""", """// PORT NOTE:
// - Authored in   : ValeVision3D first (v2.18.0, 09-Sep-2026, port Phase 2)
// - Twin          : TrueVision3D 02__Src__AppModules/03__AppUtils/Na__AppUtils__R2AssetUpload__.js 1.0.1,
//                   ported FROM this file on 10-Sep-2026 for TrueVision3D v2.21.0: the same name
//                   and signature over TrueVision's own transport (read at b2aa9151)
// - Parity        : diverged (DIV-4: identical name and signature, different transport)
// - Divergences   :
//   - Two phases: the whitecardopedia-editor-api asset route, which must succeed,
//     then a best-effort Flask mirror to the local project folder. TrueVision's
//     twin is one call to Na__CfApi__WriteProjectAsset, with no local copy.
//   - On a failure this file throws; TrueVision's returns a result with
//     r2Success false (W0-14 adopts TrueVision's contract here).
// - Back-port     : none - TrueVision has its own twin ("Back-port : no" in its
//                   PORT NOTE). The old "candidate" was settled on 10-Sep-2026.
""", eol, rel, "r2asset portnote")
t = rep(t, """// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.0.0
""", """// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.1 (records hygiene, """ + VVREL + """)
// - Comments only. The PORT NOTE still offered this file to TrueVision as a
//   back-port candidate three weeks after TrueVision took its name and
//   signature over its own transport; it now names that twin and how the two
//   differ.
//
// 09-Sep-2026 - Version 1.0.0
""", eol, rel, "r2asset log")
save(p, rel, t, eol, orig)

# ----------------------------------------------------------------------------- 4. SceneReorder
rel = r"02__Src__AppModules\21__System__PresentationMode\Na__PresentationMode__DevMenu__SceneReorder__.js"
p, t, eol = load(rel)
orig = t
t = rep(t, """// - Back-port     : the split itself (TrueVision's editor is 1622 lines).
""", """// - Back-port     : none - TrueVision withdrew this split in its v2.68.2 (19-Sep-2026: its
//                   copies were never imported and were deleted, "do not re-port"). The
//                   split is a deliberate, permanent ValeVision divergence.
""", eol, rel, "reorder backport")
t = rep(t, """// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.0.0
""", """// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.1 (records hygiene, """ + VVREL + """)
// - Comments only. The PORT NOTE no longer asks TrueVision to take this
//   split: TrueVision withdrew it in v2.68.2, so it is ValeVision's alone.
//
// 09-Sep-2026 - Version 1.0.0
""", eol, rel, "reorder log")
save(p, rel, t, eol, orig)

# ----------------------------------------------------------------------------- 5. SceneRowBuilders
rel = r"02__Src__AppModules\21__System__PresentationMode\Na__PresentationMode__DevMenu__SceneRowBuilders__.js"
p, t, eol = load(rel)
orig = t
t = rep(t, """// - Back-port     : the split itself is worth carrying to TrueVision, whose editor is over budget.
""", """// - Back-port     : none - TrueVision withdrew this split in its v2.68.2 (19-Sep-2026: its
//                   copies were never imported and were deleted, "do not re-port"). The
//                   split is a deliberate, permanent ValeVision divergence.
""", eol, rel, "rowbuilders backport")
t = rep(t, """// DEVELOPMENT LOG:
// 28-Sep-2026 - Version 1.3.0 (per-scene lighting, v2.71.0)
""", """// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.3.1 (records hygiene, """ + VVREL + """)
// - Comments only. The PORT NOTE no longer offers this split to TrueVision,
//   which withdrew it in v2.68.2.
//
// 28-Sep-2026 - Version 1.3.0 (per-scene lighting, v2.71.0)
""", eol, rel, "rowbuilders log")
save(p, rel, t, eol, orig)

# ----------------------------------------------------------------------------- 6. SceneEditor
rel = r"02__Src__AppModules\21__System__PresentationMode\Na__PresentationMode__DevMenu__SceneEditor.js"
p, t, eol = load(rel)
orig = t
t = rep(t, """//   - Row builders, reorder helpers and persistence live in their own modules
//     (SceneRowBuilders__, SceneReorder__, ScenePersistence__) to keep this file in budget.
//   - Update Camera, Regen Thumb and Save Scene stay separate buttons (TrueVision folds them into Update Scene).
//   - Destructive prompts use Na__AppUtils__ConfirmDialog__Show rather than window.confirm.
//   - The "refuse Add Scene while a drawing is on screen" guard arrives with the drawing systems in Phase 2.
// - Back-port     : the row-builder split and the confirm dialog.
""", """//   - Row builders, reorder helpers and persistence live in their own modules
//     (SceneRowBuilders__, SceneReorder__, ScenePersistence__) to keep this file in budget.
//     TrueVision withdrew its copies of that split in v2.68.2, so it is ValeVision's alone.
//   - Destructive prompts use Na__AppUtils__ConfirmDialog__Show rather than window.confirm.
// - Back-port     : none for the split (withdrawn by TrueVision in v2.68.2). The confirm
//                   dialog is half there: TrueVision has the module but no markup or
//                   styles, so it still falls back to window.confirm; its markup and CSS
//                   are the TrueVision-lane package WT-05 (held, DR-36).
""", eol, rel, "sceneeditor portnote")
# log: new entry on top, then every entry newest first
m = re.search(r"(// DEVELOPMENT LOG:" + re.escape(eol) + r")(.*?)(// =+" + re.escape(eol) + ")", t, re.S)
assert m, "sceneeditor log block"
body = m.group(2)
lines_ = body.splitlines(keepends=True)
ents, cur = [], None
hdr = re.compile(r"^// \d{2}-[A-Za-z]{3}-20\d\d - Version (\d+)\.(\d+)\.(\d+)")
for ln in lines_:
    mm = hdr.match(ln)
    if mm:
        cur = [int(mm.group(1)), int(mm.group(2)), int(mm.group(3)), ln]
        ents.append(cur)
    else:
        assert cur is not None, "text before the first log entry"
        cur[3] += ln
ents = [tuple(e) for e in ents]
assert "".join(e for *_, e in ents) == body, "sceneeditor log parse is not lossless"
assert len(ents) == 7, len(ents)
fixed = []
for a, b, c, e in ents:
    if not e.endswith("//" + eol):
        e = e + "//" + eol
    fixed.append((a, b, c, e))
fixed.sort(key=lambda x: (x[0], x[1], x[2]), reverse=True)
new_entry = ("// 01-Oct-2026 - Version 1.4.1 (records hygiene, " + VVREL + ")\n"
             "// - Comments only. The PORT NOTE no longer asks TrueVision to take the\n"
             "//   row-builder split, which TrueVision withdrew in v2.68.2, and says the\n"
             "//   confirm dialog is half there. Two Divergences lines that had stopped\n"
             "//   being true are gone: the three buttons became one Update Scene in\n"
             "//   SceneRowBuilders 1.2.0 (19-Sep), and the Add Scene guard arrived in 1.3.1.\n"
             "//   This log now reads newest first.\n"
             "//\n").replace("\n", eol)
newbody = new_entry + "".join(e for *_, e in fixed)
t = t[:m.start(2)] + newbody + t[m.end(2):]
save(p, rel, t, eol, orig)
print("sceneeditor log order now:", [(a, b, c) for a, b, c, _ in fixed])
