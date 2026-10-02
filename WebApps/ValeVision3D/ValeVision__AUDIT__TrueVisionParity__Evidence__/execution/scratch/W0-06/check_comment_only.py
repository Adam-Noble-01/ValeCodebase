# W0-06: prove every module edit is comment-only, relative to the G0 pre-image (this package's own change) and
# relative to HEAD with whitespace ignored (git diff -w; W0-02's renumber lines are listed separately as not ours).
# A changed line counts as comment-only when, stripped, it starts with '//' or is empty.
import difflib, json, os, subprocess, sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCR = os.path.dirname(os.path.abspath(__file__))
MAN = json.load(open(os.path.join(SCR, "preimage_manifest.json"), encoding="utf-8"))["existing"]
MODS = [k for k in MAN if k.endswith(".js")]
ok = True
report = {}
for rel in MODS:
    pre = open(os.path.join(SCR, "preimage", MAN[rel]["preimage"]), "rb").read()
    now = open(os.path.join(VV, rel), "rb").read()
    eol_pre = "CRLF" if pre.count(b"\r\n") == pre.count(b"\n") else "LF"
    eol_now = "CRLF" if now.count(b"\r\n") == now.count(b"\n") else "LF"
    if eol_now == "LF" and now.count(b"\r\n"):
        eol_now = "MIXED"
    a = [l.strip() for l in pre.decode("utf-8").splitlines()]
    b = [l.strip() for l in now.decode("utf-8").splitlines()]
    bad = []
    added = removed = 0
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if tag == "equal":
            continue
        for l in a[i1:i2]:
            removed += 1
            if l and not l.startswith("//"):
                bad.append("- " + l)
        for l in b[j1:j2]:
            added += 1
            if l and not l.startswith("//"):
                bad.append("+ " + l)
    # git diff -w vs HEAD: every changed line, either comment or (W0-02's) path line
    g = subprocess.run(["git", "-C", r"D:\10_CoreLib__ValeCodebase", "diff", "-w", "--unified=0", "HEAD", "--",
                        "WebApps/ValeVision3D/" + rel.replace("\\", "/")], capture_output=True, text=True, encoding="utf-8")
    code_vs_head = [l for l in g.stdout.splitlines() if l[:1] in "+-" and not l.startswith(("+++", "---"))
                    and l[1:].strip() and not l[1:].strip().startswith("//")]
    report[rel] = dict(eol_pre=eol_pre, eol_now=eol_now, lines_added=added, lines_removed=removed,
                       non_comment_changes_vs_preimage=bad, non_comment_lines_vs_HEAD=code_vs_head)
    if bad or eol_pre != eol_now:
        ok = False
json.dump(report, open(os.path.join(SCR, "check_comment_only.json"), "w", encoding="utf-8"), indent=1)
for rel, r in report.items():
    print("%-100s eol %s->%s +%d -%d  non-comment(own)=%d  non-comment-vs-HEAD=%d" % (
        rel, r["eol_pre"], r["eol_now"], r["lines_added"], r["lines_removed"],
        len(r["non_comment_changes_vs_preimage"]), len(r["non_comment_lines_vs_HEAD"])))
    for l in r["non_comment_lines_vs_HEAD"]:
        print("      vs HEAD (W0-02 renumber line, not this package's):", l[:150])
print("COMMENT-ONLY (own change):", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
