# W1-26 scratch: drawn cell widths are differences of rules rounded to 0.001 mm - compare within 2.5e-3.
P = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-26\analyse_w1_26.py"
t = open(P, encoding="utf-8").read()
old1 = 'bare_ok = bool(rule) and all(abs(a - b) < 1e-3 for a, b in zip(drawn, rule["bare"]))'
old2 = 'all(abs(a - b) < 1e-3 for a, b in zip(pn[k]["widths"], r["prefixed"]))'
assert t.count(old1) == 1 and t.count(old2) == 1
t = t.replace(old1, 'bare_ok = bool(rule) and all(abs(a - b) < 2.5e-3 for a, b in zip(drawn, rule["bare"]))   # drawn widths: differences of rules rounded to 0.001 mm')
t = t.replace(old2, 'all(abs(a - b) < 2.5e-3 for a, b in zip(pn[k]["widths"], r["prefixed"]))')
open(P, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
