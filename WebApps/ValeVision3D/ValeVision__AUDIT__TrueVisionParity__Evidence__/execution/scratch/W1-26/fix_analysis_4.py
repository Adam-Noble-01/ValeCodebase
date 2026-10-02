# W1-26 scratch: judge the A4 portrait prefix rule by the cell widths (drawn = solved bare; the prefix would
# have cut the date further), and ignore the logo cell's stand-in text when comparing strip texts.
P = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-26\analyse_w1_26.py"
t = open(P, encoding="utf-8").read()


def rep(old, new):
    global t
    assert t.count(old) == 1, old[:90]
    t = t.replace(old, new)


rep('''a4p = pn["A4 portrait"]
check("A4 portrait: the prefix is dropped (the Rev cell reads B) rather than cut the date or the scale",
      "B" in a4p["texts"] and "Revision B" not in a4p["texts"] and a4p["fields"]["Date"] in a4p["texts"] and a4p["fields"]["Scale"] in a4p["texts"], {"texts": a4p["texts"], "cut": a4p["cut"]})''',
    '''a4p = pn["A4 portrait"]
rule = a4p.get("prefixRule") or {}
keys = rule.get("keys", [])
drawn = a4p["widths"]
bare_ok = bool(rule) and all(abs(a - b) < 1e-3 for a, b in zip(drawn, rule["bare"]))
date_i = keys.index("Date") if "Date" in keys else None
cut_more = bool(rule) and date_i is not None and rule["prefixed"][date_i] < rule["bare"][date_i] - 1e-6
print("   A4 portrait prefix rule: drawn %s\\n                            bare  %s\\n                            with prefix %s" % (drawn, rule.get("bare"), rule.get("prefixed")))
check("A4 portrait: the prefix is dropped (the Rev cell reads B) - the strip drawn is the strip solved with bare values, where Revision B would have cut the date further",
      "B" in a4p["texts"] and "Revision B" not in a4p["texts"] and bare_ok and cut_more,
      {"date bare": rule.get("bare", [None] * 9)[date_i] if date_i is not None else None, "date with prefix": rule.get("prefixed", [None] * 9)[date_i] if date_i is not None else None})
for k in ("A3 portrait", "A4 landscape"):
    r = pn[k].get("prefixRule") or {}
    check(k + ": everything fits whole, so the prefix stays (Revision B) and the strip is the prefixed solution",
          "Revision B" in pn[k]["texts"] and not pn[k]["cut"] and r and all(abs(a - b) < 1e-3 for a, b in zip(pn[k]["widths"], r["prefixed"])), pn[k]["widths"])''')

rep('''    ot = [t[0] for t in o["bandTexts"]]
    nt = [t[0] for t in n["bandTexts"]]''',
    '''    ot = [t[0] for t in o["bandTexts"] if t[0] != "VALE GARDEN HOUSES"]                   # the logo's stand-in, only while the picture loads
    nt = [t[0] for t in n["bandTexts"] if t[0] != "VALE GARDEN HOUSES"]''')
open(P, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
