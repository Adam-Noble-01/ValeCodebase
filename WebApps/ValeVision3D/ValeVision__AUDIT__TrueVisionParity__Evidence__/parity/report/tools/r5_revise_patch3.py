# R5 reviser patch 3 (01-Oct-2026): tightens the E.3 "Ownership check" wording (the README assigned here is not a K3
# package) and makes r5_assemble.py assert the hand-written breakdown of the exclusions outside K3. Keeps line endings.
import os

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


patch("R5_template.md", [
    ("""**Ownership check.** Every file below has a K3 package or a recorded reason not to port. A basename check of all
{{N_E3}} files against every package's `tv_sources`, `vv_targets`, `edits` and `hot_files` leaves {{N_E3_OUTSIDE}} files
outside K3: {{N_E3_OUTSIDE_EXCL}} are the exclusions marked below (TV's ProfileLines, five 41 engine files, seven 27 menu
files, the 80 note) and one is a gap closed here. K3 gives `README__PublishedDocuments__.md` (52) no package, so this
section assigns it to W4-17, the first package to create files in that folder (W1-15, W1-37, W2-34, W4-01 and W4-08
each carry their folder's README); the delegator adds it to W4-17's targets, a K3 correction for Section F's list (F.8).
`README__SpellCheck__.md` is W2-34's: a new VV target there, though not one of its `tv_sources`.
""",
     """**Ownership check.** Every file below has a package or a recorded reason not to port. A basename check of all
{{N_E3}} files against every K3 package's `tv_sources`, `vv_targets`, `edits` and `hot_files` leaves {{N_E3_OUTSIDE}}
files outside K3: {{N_E3_OUTSIDE_EXCL}} are the exclusions marked below (TV's ProfileLines, five 41 engine files, seven 27
menu files, the 80 note) and one is a K3 gap closed here. K3 gives `README__PublishedDocuments__.md` (52) no package, so
this section assigns it to W4-17, the first package to create files in that folder (W1-15, W1-37, W2-34, W4-01 and
W4-08 each carry their folder's README); the delegator adds it to W4-17's targets, a K3 correction for Section F's list
(F.8). `README__SpellCheck__.md` is W2-34's: a new VV target there (`vv_targets` and `edits`), though not one of its
`tv_sources`.
"""),
])

patch("r5_assemble.py", [
    ("""assert outside_gap == ["README__PublishedDocuments__.md"], "E.3 coverage sentence names the gap by hand: re-check it"
""",
     """assert outside_gap == ["README__PublishedDocuments__.md"], "E.3 coverage sentence names the gap by hand: re-check it"
excl_by_folder = collections.Counter(x["path"].split("/")[1] for x in outside_excl)
assert excl_by_folder == {"40__System__DrawingViewCore": 1, "41__System__SectionCutEngine": 5,
                          "27__System__ContextMenuSystem": 7, "80__CloudflareIntegration": 1}, \\
    "E.3 coverage sentence lists the exclusions by hand: re-check it (%s)" % dict(excl_by_folder)
"""),
])
print("done")
