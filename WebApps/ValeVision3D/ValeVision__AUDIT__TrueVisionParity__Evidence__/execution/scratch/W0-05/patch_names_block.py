"""Scratch tool: rewrite the 'present but lacking names' decision block and tighten hunk relevance."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(HERE, "port_order_map.py")
s = open(TARGET, encoding="utf-8").read()

start = s.index("            else:   # present but lacking names\n")
end = s.index("            prereq_rows.append(row)\n", start)
NEW = '''            else:   # present but lacking names
                lacking = set(rec["lacking"])
                whole_ok = [x for x in ok if x["mode"] in whole_modes and x["wp"] != wp]
                hunk_ok = [x for x in ok if x["mode"] not in whole_modes and x["wp"] != wp]
                same = [x for x in lv if x["wp"] == wp]
                mentioned = {}
                for x in hunk_ok:
                    mentioned[x["wp"]] = [n for n in rec["lacking"] if name_mentioned(text_of(pks[x["wp"]]), n)]
                covered = set()
                for v in mentioned.values():
                    covered |= set(v)
                same_mentioned = set(n for n in rec["lacking"] if same and name_mentioned(text_of(pk), n))
                later = [x for x in lv if x["relation"] not in OK_REL]
                later_whole = [x for x in later if x["mode"] in whole_modes]
                if hunk_ok:
                    row["hunk_landers_mentioning_names"] = mentioned
                if whole_ok:
                    row["verdict"] = "ok: %s takes it whole earlier (%s)" % (whole_ok[0]["wp"], whole_ok[0]["relation"])
                elif same and any(x["mode"] in whole_modes for x in same):
                    row["verdict"] = "ok: the same package takes it whole (%s), so the names land together" % wp
                elif same and "facade-only imports" in text_of(pk) and rec["target"].startswith(LE):
                    row["verdict"] = ("ok (declared seam): %s takes TV's file with facade-only imports - %s come through the "
                                      "lazy-loader facade (R3 C.4 S5; W1-31 adds the loader entry points)" % (wp, ", ".join(rec["lacking"])))
                elif (covered | same_mentioned) >= lacking:
                    who = [w for w, v in mentioned.items() if v] + ([wp + " (same package)"] if same_mentioned else [])
                    row["verdict"] = "ok (declared): %s add(s) %s earlier or in the same change" % (", ".join(who), ", ".join(rec["lacking"]))
                elif "facade-only imports" in text_of(pk) and rec["target"].startswith(LE):
                    row["verdict"] = ("ok (declared seam): %s takes TV's file with facade-only imports - the names %s come through "
                                      "the lazy-loader facade (R3 C.4 S5; W1-31 adds the loader entry points)" % (wp, ", ".join(rec["lacking"])))
                elif later_whole and all(name_mentioned(text_of(pk), n) for n in rec["lacking"]):
                    row["verdict"] = ("ok (declared deferral): %s names %s and lands without it; %s takes %s whole later"
                                      % (wp, ", ".join(rec["lacking"]), later_whole[0]["wp"], posixpath.basename(rec["target"])))
                    row["declared_deferral"] = True
                elif same or hunk_ok:
                    row["verdict"] = ("advisory: only hunk edits land it first (%s) - they must add %s (named in their text: %s)" % (
                        ", ".join(sorted({x["wp"] for x in hunk_ok + same})), ", ".join(rec["lacking"]),
                        ", ".join(sorted(covered | same_mentioned)) or "none"))
                    advisories.append(dict(row))
                else:
                    hits = declared_seam(pk, rec["target"], rec["lacking"])
                    row["declared_by_text"] = hits
                    if hits:
                        row["verdict"] = ("seam? names %s not in VV and no earlier package adds them; the package text mentions %s"
                                          % (", ".join(rec["lacking"]), ", ".join(hits)))
                        if later:
                            row["verdict"] += "; later editors: " + ", ".join("%s (%s)" % (x["wp"], x["relation"]) for x in later)
                        advisories.append(dict(row))
                    else:
                        row["verdict"] = "NAMES: %s not exported by VV's file and no earlier package adds them" % ", ".join(rec["lacking"])
                        if later:
                            row["verdict"] += "; later editors: " + ", ".join("%s (%s, %s)" % (x["wp"], x["relation"], x["mode"]) for x in later)
                        bucket(severity).append(dict(row))
'''
s = s[:start] + NEW + s[end:]

old_rel = '''        txt = text_of(pk)
        stem = posixpath.basename(rec["target"])
        stem = stem[:-3] if stem.endswith(".js") else stem
        last = [t for t in stem.split("__") if t][-1:]
        if last and len(last[0]) >= 6 and re.search(r"(?<![A-Za-z0-9])" + re.escape(last[0]) + r"(?![a-z])", txt):
            return "the package names the module (%s)" % last[0]
        for n in rec.get("names", []):
            if n in txt:
                return "the package names %s" % n
        return None'''
assert s.count(old_rel) == 1
new_rel = '''        txt = text_of(pk)
        for n in rec.get("names", []):
            if n.startswith("Na__") and n in txt:
                return "the package names %s" % n
        return None'''
s = s.replace(old_rel, new_rel)
open(TARGET, "w", encoding="utf-8", newline="\\n" if False else "\n").write(s)
print("patched")
