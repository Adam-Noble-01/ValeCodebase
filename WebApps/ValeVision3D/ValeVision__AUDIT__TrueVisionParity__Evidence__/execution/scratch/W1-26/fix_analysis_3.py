# W1-26 scratch: two more judgements in analyse_w1_26.py - the strip pixels before / after (A3: identical but
# for the Rev cell), and every paper with a Vale sheet's values (the fifth on A2/A1, the A4 portrait prefix drop).
P = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-26\analyse_w1_26.py"
t = open(P, encoding="utf-8").read()
anchor = '''# -----------------------------------------------------------------------------
# 2. A hidden frame
# -----------------------------------------------------------------------------'''
assert t.count(anchor) == 1
addition = '''# THE STRIP ON SCREEN, PIXEL BY PIXEL (inline SVG in the page's Open Sans, 4 px to the mm, logo image left out)
print("\\n  THE STRIP AS THE SCREEN DRAWS IT, BEFORE AND AFTER")
for key in sorted(new_sheets):
    o, n = old_sheets[key], new_sheets[key]
    if not (o.get("bandPng") and n.get("bandPng")):
        check("%s %s: strip screenshots exist" % key, False)
        continue
    po, pn = fitz.Pixmap(o["bandPng"]), fitz.Pixmap(n["bandPng"])
    same_size = (po.width, po.height) == (pn.width, pn.height)
    bx = n["band"][0]
    # the columns that differ, as paper mm along the strip
    cols = []
    if same_size:
        so, sn, stride, nch = po.samples, pn.samples, po.stride, po.n
        for x in range(po.width):
            for y in range(po.height):
                i = y * stride + x * nch
                if so[i:i + 3] != sn[i:i + 3]:
                    cols.append(x)
                    break
    span = (min(cols) / 4.0 + bx, max(cols) / 4.0 + bx) if cols else None
    OUT["detail"]["stripPixels %s %s" % key] = {"sameSize": same_size, "differingColumns": len(cols), "spanMm": span}
    if n["paper"] == "A3":
        rev = (n["dividers"][4], n["dividers"][5])                                   # the Rev cell, between the 5th and 6th rules
        inside = all(rev[0] - 0.25 <= (c / 4.0 + bx) <= rev[1] + 0.25 for c in cols)
        check("%s %s (A3): on screen the strip is pixel-identical but for the Rev cell (%.0f-%.0f mm)" % (key[0], key[1], rev[0], rev[1]),
              same_size and cols and inside, "%d differing pixel columns, spanning %s mm" % (len(cols), span))
    else:
        print("     %s %s (%s): %d differing pixel columns, spanning %s mm (the fifth moves the dividers)" % (key[0], key[1], n["paper"], len(cols), span))

# EVERY PAPER WITH A VALE SHEET'S VALUES
print("\\nEVERY PAPER, A VALE SHEET'S VALUES (Client Mordaunt, a 55-character address, Rev B, 1:50)")
BASE = [36, 70, None, 24, 28, 28, 28, 28, 30]
for s in ("old", "new"):
    for k, p in R[s]["papers"].items():
        print("   %s %-13s strip %7.2f  cells %s  rev %r  cut %s" % (s, k, p["strip"], p["widths"], [x for x in p["texts"] if x in ("B", "Revision B")], p["cut"]))
pn = R["new"]["papers"]
for k in ("A1 landscape", "A2 landscape"):
    w = pn[k]["widths"]
    fixed = [x for i, x in enumerate(w) if BASE[i] is not None]
    check(k + ": every fixed cell a fifth wider, the title's text uncut, the Rev cell reads Revision B",
          all(abs(x - b * 1.2) < 1e-6 for x, b in zip(fixed, [b for b in BASE if b is not None])) and not pn[k]["cut"] and "Revision B" in pn[k]["texts"], w)
check("A3 landscape: the fixed cells as configured, Revision B, nothing cut",
      all(abs(x - b) < 1e-6 for x, b in zip([x for i, x in enumerate(pn["A3 landscape"]["widths"]) if BASE[i] is not None], [b for b in BASE if b is not None]))
      and "Revision B" in pn["A3 landscape"]["texts"] and not pn["A3 landscape"]["cut"], pn["A3 landscape"]["widths"])
a4p = pn["A4 portrait"]
check("A4 portrait: the prefix is dropped (the Rev cell reads B) rather than cut the date or the scale",
      "B" in a4p["texts"] and "Revision B" not in a4p["texts"] and a4p["fields"]["Date"] in a4p["texts"] and a4p["fields"]["Scale"] in a4p["texts"], {"texts": a4p["texts"], "cut": a4p["cut"]})

'''
t = t.replace(anchor, addition + anchor)
open(P, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
