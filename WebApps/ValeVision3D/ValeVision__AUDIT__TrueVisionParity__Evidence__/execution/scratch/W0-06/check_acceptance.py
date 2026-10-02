# W0-06: mechanical checks of the package's six acceptance items against the files as written.
import hashlib, io, json, os, re, subprocess, sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCR = os.path.dirname(os.path.abspath(__file__))
res = []


def check(name, cond, detail=""):
    res.append((name, bool(cond), detail))


led = io.open(os.path.join(VV, "ValeVision__PARITY__TrueVisionLedger__.md"), encoding="ascii", newline="").read()
check("ledger CRLF only, ASCII", led.count("\r\n") == led.count("\n"))
led = led.replace("\r\n", "\n")
cut = led.index("\n## 9. Archive")
live, arch = led[:cut], led[cut:]

# ---- item 1: sections
for h in ["## 1. Header", "## 2. Folder map", "### 2.2 Folder renumbering (01-Oct-2026)", "## 3. Module Register",
          "## 4. Release Watermark", "## 5. Decisions", "## 6. Back-ports, ValeVision to TrueVision", "## 9. Archive"]:
    check("section present: " + h, h in led)
div = live[live.index("### 1.3"):live.index("### 1.4")]
rows = {m.group(1): m.group(0) for m in re.finditer(r"^\| (DIV-\d) \|.*$", div, re.M)}
check("DIV-1 permanent", "permanent" in rows["DIV-1"])
check("DIV-2 permanent", "permanent" in rows["DIV-2"])
check("DIV-4 permanent", "permanent" in rows["DIV-4"])
check("DIV-3 closed", "Closed" in rows["DIV-3"])
check("DIV-5 closed", "Closed" in rows["DIV-5"])
fm = live[live.index("### 2.2"):live.index("### 2.3")]
for k in ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "F1", "F2", "F3", "F4"]:
    check("renumber map row " + k, re.search(r"^\| %s \| (folder|file) \|" % k, fm, re.M))
check("renumber section dated", "**Dated note, 01-Oct-2026.**" in fm)
mr = live[live.index("## 3. Module Register"):live.index("## 4. Release Watermark")]
reg_rows = [l for l in mr.split("\n") if l.startswith("| `") or l.startswith("| - (lands")]
check("Module Register rows == 609", len(reg_rows) == 609, str(len(reg_rows)))
blocked_empty = all(l.rstrip().endswith("|  |") for l in reg_rows)
check("Module Register: Blocked by column present and left empty for W0-99", "Blocked by |" in mr and blocked_empty)
rw = live[live.index("## 4. Release Watermark"):live.index("## 5. Decisions")]
wrows = [l for l in rw.split("\n") if re.match(r"^\| (v2\.\d+\.\d+|\(unnumbered)", l)]
check("Release Watermark rows == 177", len(wrows) == 177, str(len(wrows)))
cls = Counter(re.sub(r"\*", "", [c.strip() for c in l.strip().strip("|").split("|")][4]) for l in wrows)
want = {"PORTED": 51, "PARTIAL": 11, "PENDING-SIGNOFF": 17, "NOT-CONSIDERED": 80, "REOPENED": 4, "DELIBERATE": 2,
        "NOT-DRAWING": 7, "VV-ORIGIN": 4, "N/A": 1}
check("Release Watermark class counts 51/11/17/80/4/2/7/4/1", dict(cls) == want, str(dict(cls)))
check("112 open", sum(cls[c] for c in ("PARTIAL", "PENDING-SIGNOFF", "NOT-CONSIDERED", "REOPENED")) == 112)
dec = live[live.index("## 5. Decisions"):live.index("## 6. Back-ports")]
check("Decisions: D01-D40 each marked", all(re.search(r"^\| D%02d \|" % i, dec, re.M) for i in range(1, 41)))
check("Decisions: points at D41-D91", "D41 to D84" in dec and "D85 to D91" in dec)
bp = live[live.index("## 6. Back-ports"):live.index("## 7.")]
for st in ["WITHDRAWN", "OPEN", "CLOSED", "SUPERSEDED", "half-landed"]:
    check("back-ports carry B5 status " + st, st in bp)
check("Archive has its dated note", "**Archived 01-Oct-2026 (W0-06; DR-35 (b), D75).**" in arch)

# ---- item 2: service worker, loader, rows 1219/1220/1225
bad_sw = re.findall(r"(?i)(has no (pwa |)service worker|no pwa worker|has no service worker|nothing to bump|no shell cache)", live)
check("no live row says ValeVision has no service worker", not bad_sw, str(bad_sw))
sw_marks = arch.count("ValeVision runs under Whitecardopedia's shared service worker in production")
check("archive: 19 + 1 service-worker rows corrected", sw_marks == 19 and "reopened: this tree DOES run under a service worker" in arch, str(sw_marks))
loader_live = [l for l in live.split("\n") if "oader" in l and "back-port" in l.lower()]
contra = [l for l in loader_live if re.search(r"(?i)back-port candidate", l) and not re.search(r"(?i)not a back-port candidate", l)]
check("loader: one status in the live sections (no live 'back-port candidate')", not contra, str(contra)[:300])
check("loader: archive rows 1122 and 1230 corrected", arch.count("permanent ValeVision divergence, not a back-port candidate (DR-24 (a), D64)") >= 1 and "not a back-port: the loader is a permanent ValeVision divergence" in arch)
for frag in ["still OPEN, both: the Ground Floor Plan quick action", "still OPEN, half-landed: TrueVision has the files, never wired",
             "still OPEN, half-landed: ConfigState is wired in TrueVision"]:
    check("archive back-port row stays OPEN: " + frag[:40], frag in arch)

# ---- archive integrity (undo proof re-run on the file as written)
man = json.load(open(os.path.join(SCR, "preimage_manifest.json"), encoding="utf-8"))["existing"]["ValeVision__PARITY__TrueVisionLedger__.md"]
pre = open(os.path.join(SCR, "preimage", man["preimage"]), "rb").read()
body = arch.split("\n---\n\n", 1)[1]
t = re.sub(r" \*\*\[01-Oct-2026 (?:correction|note) \(W0-06\): .*?\]\*\*", "", body)
t = "\n".join(s[2:] if re.match(r"^#{3,6} ", s) else s for s in t.split("\n"))
check("archive undo gives back the pre-image byte for byte", t.replace("\n", "\r\n").encode("ascii") == pre)
check("WE10 path only inside the Archive", "WE10_--_Public-Repo" not in live and "WE10_--_Public-Repo" in arch)

# ---- item 3: registry
regt = io.open(os.path.join(VV, "ValeVision__NOTES__FolderNumberRegistry__.md"), encoding="ascii").read()
nums = re.findall(r"^\| (\d\d) \| .*? \| (shared|TV-only|VV-reserved|legacy|burnt) \|", regt, re.M)
check("registry: one row per number 01-99", sorted(n for n, _ in nums) == ["%02d" % i for i in range(1, 100)])
tv_top = subprocess.run(["git", "-C", r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb", "ls-tree", "--name-only", "b2aa9151",
                         "na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/"], capture_output=True, text=True).stdout.split()
tv_top = [x.rsplit("/", 1)[-1] for x in tv_top]
vv_top = os.listdir(os.path.join(VV, "02__Src__AppModules"))
wcp_top = os.listdir(r"D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\02__Src__AppModules")
missing = [f for f in tv_top + vv_top + wcp_top if ("`%s`" % f) not in regt]
check("registry: every TV, VV and WCP top-level folder listed (37 + 37 + 14)", not missing and len(tv_top) == 37 and len(vv_top) == 37 and len(wcp_top) == 14, str(missing))
for n in ["08", "09", "12", "13", "14", "16", "17", "18", "19"]:
    check("Q-REG number %s is TV growth" % n, re.search(r"^\| %s \| .*\| TV-only \| TV growth: unowned in K2, assigned to TrueVision by Q-REG" % n, regt, re.M))
check("Q-63: 63 VV-reserved with the branch and the 93 fallback", re.search(r"^\| 63 \| .* VV-reserved \| .*claude/westfarm-intro-notes-37b804.*4db73420.*93", regt, re.M))
check("90 burnt; 35, 91 legacy", re.search(r"^\| 90 \|.*\| burnt \|", regt, re.M) and re.search(r"^\| 35 \|.*\| legacy \|", regt, re.M) and re.search(r"^\| 91 \|.*\| legacy \|", regt, re.M))

# ---- item 4: devlog records note
dv = io.open(os.path.join(VV, "ValeVision__DEVLOG__.md"), encoding="utf-8", newline="").read()
top = dv[:dv.index("## ValeVision3D v2.71.0")]
check("devlog: dated Records note at the top, not a version", "## Records note - 01-Oct-2026 (not a release)" in top and "## ValeVision3D v2.71.1" not in dv)
check("devlog note names commit 66937440 and TV v2.36.0", "66937440" in top and "v2.36.0" in top)
check("devlog note names both v2.54.0 entries", "The Title Block Says What Paper It Is" in top and "The Progressive Renderer Stall" in top)
check("devlog: first version heading still v2.71.0", re.search(r"^## ValeVision3D (v[\d.]+)", dv, re.M).group(1) == "v2.71.0")

# ---- item 5: comment-only modules + D05 note
cco = json.load(open(os.path.join(SCR, "check_comment_only.json"), encoding="utf-8"))
check("modules: own change is comment-only (6 files)", len(cco) == 6 and all(not r["non_comment_changes_vs_preimage"] for r in cco.values()))
plan = io.open(os.path.join(VV, "ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md"), encoding="ascii").read()
d05 = [l for l in plan.split("\n") if l.startswith("| D05 |")][0]
check("plan: D05 carries a dated revision note", "Revised 01-Oct-2026 (D42" in d05)

# ---- item 6: README
rd = io.open(os.path.join(VV, "02__Src__AppModules", "41__System__CrossSectionView", "README__CrossSectionView__.md"), encoding="ascii").read()
check("README: names the DIV-2 twins", "41__System__CrossSectionView" in rd and "41__System__SectionCutEngine" in rd and "DIV-2" in rd)
check("README: tells them apart from TV's 48 placeholder", "48__System__CrossSectionViews" in rd and "placeholder" in rd)
check("README: K2 N6, F6 and DR-26 cited", "N6" in rd and "F6" in rd and "DR-26" in rd)

ok = all(c for _, c, _ in res)
for n, c, d in res:
    print(("PASS " if c else "FAIL ") + n + ((" -- " + d) if (d and not c) else ""))
print("ALL PASS" if ok else "SOME FAILED", sum(1 for _, c, _ in res if c), "/", len(res))
sys.exit(0 if ok else 1)
