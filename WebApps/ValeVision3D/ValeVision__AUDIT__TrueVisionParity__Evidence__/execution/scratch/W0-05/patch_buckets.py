"""Scratch tool: route every severity append through bucket(severity) and refine two verdicts."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(HERE, "port_order_map.py")
s = open(TARGET, encoding="utf-8").read()

old = '(defects if severity == "defect" else advisories)'
n = s.count(old)
assert n == 7, n
s = s.replace(old, "bucket(severity)")

# bucket() helper + hunk_defects list, right after the lists are created
anchor = "    defects, advisories, prereq_rows = [], [], []\n"
assert s.count(anchor) == 1
s = s.replace(anchor, anchor +
              "    hunk_defects = []\n\n"
              "    def bucket(sev):\n"
              "        return defects if sev == \"defect\" else (hunk_defects if sev == \"hunk-defect\" else advisories)\n\n")

# reset severity per take (the hunk branch overrides it per import)
old_sev = '        severity = "defect" if t["mode"] in whole_modes else "advisory"\n'
assert s.count(old_sev) == 1
s = s.replace(old_sev, '        base_severity = "defect" if t["mode"] in whole_modes else "advisory"\n')
old_row = '            if st_ in ("present", "vendor_ok"):\n                continue\n            if t["mode"] == "hunks":\n'
assert s.count(old_row) == 1
s = s.replace(old_row, '            severity = base_severity\n' + old_row)

# whole take whose names come from an earlier hunk package that declares them -> ok (declared)
old_hunk_ok = '''                elif hunk_ok:
                    mentioned = {}
                    for x in hunk_ok:
                        txt = text_of(pks[x["wp"]])
                        mentioned[x["wp"]] = [n for n in rec["lacking"] if n in txt or n.split("__")[-1] in txt]
                    row["hunk_landers_mentioning_names"] = mentioned
                    row["verdict"] = "advisory: only hunk edits land earlier (%s) - they must add %s" % (
                        ", ".join(x["wp"] for x in hunk_ok), ", ".join(rec["lacking"]))
                    advisories.append(dict(row))'''
assert s.count(old_hunk_ok) == 1
new_hunk_ok = '''                elif hunk_ok:
                    mentioned = {}
                    for x in hunk_ok:
                        txt = text_of(pks[x["wp"]])
                        mentioned[x["wp"]] = [n for n in rec["lacking"] if name_mentioned(txt, n)]
                    row["hunk_landers_mentioning_names"] = mentioned
                    covered = set()
                    for v in mentioned.values():
                        covered |= set(v)
                    declarers = [w for w, v in mentioned.items() if v]
                    if covered >= set(rec["lacking"]):
                        row["verdict"] = "ok (declared): %s adds %s by hunks earlier" % (
                            ", ".join(declarers), ", ".join(rec["lacking"]))
                    else:
                        row["verdict"] = "advisory: only hunk edits land earlier (%s) - they must add %s (named in their text: %s)" % (
                            ", ".join(x["wp"] for x in hunk_ok), ", ".join(rec["lacking"]),
                            ", ".join(sorted(covered)) or "none")
                        advisories.append(dict(row))'''
s = s.replace(old_hunk_ok, new_hunk_ok)

# a whole take whose package declares facade-only imports (W1-34 TabStrip, R3 C.4 S5): the loader carries the names
old_seamq = '''                    if hits:
                        row["verdict"] = ("seam? names %s not in VV and no earlier package adds them; the package text mentions %s"
                                          % (", ".join(rec["lacking"]), ", ".join(hits)))'''
assert s.count(old_seamq) == 1
new_seamq = '''                    if "facade-only imports" in hits and rec["target"].startswith(LE):
                        row["verdict"] = ("ok (declared seam): '%s' takes TV's file with facade-only imports - the names "
                                          "%s come through the lazy-loader facade (R3 C.4 S5; W1-31 adds the loader entry points)"
                                          % (wp, ", ".join(rec["lacking"])))
                    elif hits:
                        row["verdict"] = ("seam? names %s not in VV and no earlier package adds them; the package text mentions %s"
                                          % (", ".join(rec["lacking"]), ", ".join(hits)))'''
s = s.replace(old_seamq, new_seamq)
open(TARGET, "w", encoding="utf-8", newline="\n").write(s)
print("patched")
