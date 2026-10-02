# W0-06: a dated Records note at the top of VV/ValeVision__DEVLOG__.md (CRLF file). Not a release; nothing below it
# changes. Proof: removing the inserted block gives back the pre-image bytes. Run: python patch_devlog.py [--write]
import hashlib, json, os, sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCR = os.path.dirname(os.path.abspath(__file__))
REL = "ValeVision__DEVLOG__.md"
MAN = json.load(open(os.path.join(SCR, "preimage_manifest.json"), encoding="utf-8"))["existing"][REL]
p = os.path.join(VV, REL)
b = open(p, "rb").read()
assert hashlib.sha1(b).hexdigest() == MAN["sha1"], "DEVLOG changed under me - re-read its top first"
assert b.count(b"\r\n") == b.count(b"\n")
head = b"# ValeVision3D Development Log\r\n\r\n# ---------------------------------------------------------\r\n## ValeVision3D v2.71.0 - 28-Sep-2026"
assert b.startswith(head), "devlog top is not v2.71.0 any more - stop and re-read"

NOTE = """# ---------------------------------------------------------
## Records note - 01-Oct-2026 (not a release)

**Why this note.** The TrueVision parity audit of 01-Oct-2026 (`ValeVision__AUDIT__TrueVisionParity__DrawingSystems__.md`
at this root; its slice S11, section B7) found three places where this log's own record is incomplete or wrong. Shipped
entries are not renumbered or rewritten, so this note records them instead. The parity ledger
(`ValeVision__PARITY__TrueVisionLedger__.md`, restructured today) carries the same facts in its Release Watermark.

- **The Project Specification port has no entry.** TrueVision3D v2.36.0 (14-Sep-2026: the Project Specification and
  margin notes - SpecData, SpecLinks, SpecEditor, SpecMargin 1.0.0, MarginGrip, Panel__MarginNotes, R2DrawingNotes) came
  into this tree in checkpoint commit `66937440`, with no release number and no entry here; the v2.44.0 entry's notes
  say so ("has no entry of its own"). It stays unnumbered. The ledger's Release Watermark row for TrueVision v2.36.0
  points at the commit.
- **Two entries are numbered v2.54.0**, both 17-Sep-2026: "The Title Block Says What Paper It Is, and Names Every Scale"
  and, below it, "The Progressive Renderer Stall, and the Scale Cell's Paper Size". Both shipped under that number and
  neither is renumbered; read the second as the second entry of v2.54.0.
- **v2.58.0 said "ValeVision has no service worker, so there is nothing to bump."** That was wrong, and so were the
  ledger rows that repeated it. In production ValeVision runs under Whitecardopedia's shared service worker
  (`WebApps/Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/`, registered from this app's
  `index.html`), whose one token, `PWA_SW_VERSION_TOKEN` (`'2026-09-18-1'` on 01-Oct-2026), names the shell, thumbnails,
  data and models caches together. The token's own log shows its last ValeVision bump at v2.48.1; v2.61.0, v2.62.0 and
  v2.65.0 to v2.71.0 added cross-module exports without one. Bumping it is Adam's call at deploy (decision D47 in
  `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`); the shared service-worker package prepared on 01-Oct-2026
  is staged for him and not deployed.

Releases of the parity programme continue from v2.71.1 in patch steps, one per wave, each written by that wave's
Parity Scribe (D85).

"""
note_b = NOTE.replace("\n", "\r\n").encode("ascii")
cut = len(b"# ValeVision3D Development Log\r\n\r\n")
nb = b[:cut] + note_b + b[cut:]
assert nb.replace(note_b, b"", 1) == b, "undo proof failed"
assert nb.count(b"\r\n") == nb.count(b"\n")
print("bytes", len(b), "->", len(nb), "(undo proof OK)")
if "--write" in sys.argv:
    open(p, "wb").write(nb)
    print("WRITTEN")
