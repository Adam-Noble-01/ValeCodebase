# =============================================================================
# W1-26 scratch: read the browser harness results (logs/browser__<scenario>.json) and the PDFs it wrote,
# and judge the acceptance items. PyMuPDF reads the PDFs (fonts, text spans, rendered pixels).
#   python -B analyse_w1_26.py [--label <name>]     writes logs/analysis__<label>.json and prints PASS / FAIL lines
# =============================================================================
import json
import os
import re
import sys

import fitz  # PyMuPDF

HERE = os.path.dirname(os.path.abspath(__file__))
LABEL = sys.argv[sys.argv.index("--label") + 1] if "--label" in sys.argv else "run"
R = {s: json.load(open(os.path.join(HERE, "logs", "browser__%s.json" % s), encoding="utf-8")) for s in ("old", "new", "qron")
     if os.path.exists(os.path.join(HERE, "logs", "browser__%s.json" % s))}
OUT = {"checks": [], "detail": {}}
FAILS = 0


def check(name, ok, detail=""):
    global FAILS
    if not ok:
        FAILS += 1
    OUT["checks"].append({"name": name, "ok": bool(ok), "detail": detail})
    print(("  PASS  " if ok else "  FAIL  ") + name + (("   " + str(detail)) if detail else ""))


def pdf_fonts(path):
    doc = fitz.open(path)
    names = sorted({f[3] for page in doc for f in page.get_fonts(full=True)})
    embedded = sorted({f[3] for page in doc for f in page.get_fonts(full=True) if f[1] in ("ttf", "cff", "otf", "n/a") and "OpenSans" in f[3]})
    kinds = sorted({(f[3], f[1], f[2]) for page in doc for f in page.get_fonts(full=True)})
    doc.close()
    return names, kinds


def pdf_spans(path):
    doc = fitz.open(path)
    spans = []
    for page in doc:
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                level = abs(line.get("dir", (1, 0))[1]) < 1e-6
                for sp in line.get("spans", []):
                    spans.append({"text": sp["text"], "font": sp["font"], "size_pt": sp["size"], "level": level, "width_mm": (sp["bbox"][2] - sp["bbox"][0]) * 25.4 / 72})
    doc.close()
    return spans


def pdf_pixels(path, points_mm, dpi=200):
    doc = fitz.open(path)
    page = doc[0]
    pix = page.get_pixmap(dpi=dpi)
    scale = dpi / 25.4
    out = []
    for x, y in points_mm:
        out.append(list(pix.pixel(int(round(x * scale)), int(round(y * scale)))))
    doc.close()
    return out


def pdf_text(path):
    doc = fitz.open(path)
    t = "".join(page.get_text() for page in doc)
    doc.close()
    return t


def pdf_raw(path):
    return open(path, "rb").read()


print("W1-26 acceptance analysis (" + LABEL + ")")

# -----------------------------------------------------------------------------
# 0. Which face the chrome measures in
# -----------------------------------------------------------------------------
print("\nTHE MEASURING FACE")
for s in ("old", "new"):
    f = R[s]["fonts"]
    face = "Open Sans" if abs(f["chromeMm"] - f["openSansMm"]) < 1e-9 else ("Helvetica" if abs(f["chromeMm"] - f["helveticaMm"]) < 1e-9 else "other")
    OUT["detail"]["face_" + s] = f
    print("   %s: chrome %.3f mm, jsPDF Helvetica %.3f, jsPDF OpenSans %.3f -> %s; PDF cuts loaded %s; screen Open Sans %s; style font %s"
          % (s, f["chromeMm"], f["helveticaMm"], f["openSansMm"], face, f["pdfLoaded"], f["screen400"], f["styleFont"]))
check("before: the chrome measured in jsPDF's Helvetica", abs(R["old"]["fonts"]["chromeMm"] - R["old"]["fonts"]["helveticaMm"]) < 1e-9)
check("after: the chrome measures in the embedded Open Sans cut (the PDF's own metrics)", abs(R["new"]["fonts"]["chromeMm"] - R["new"]["fonts"]["openSansMm"]) < 1e-9)

# -----------------------------------------------------------------------------
# 1. The local sheets: what changed, the PDF fonts, screen vs PDF widths
# -----------------------------------------------------------------------------
print("\nTHE FOUR LOCAL SHEETS")
old_sheets = {(s["folder"], s["sheet"]): s for s in R["old"]["sheets"]}
new_sheets = {(s["folder"], s["sheet"]): s for s in R["new"]["sheets"]}
check("the same four sheets built before and after", sorted(old_sheets) == sorted(new_sheets) and len(new_sheets) == 4, sorted(new_sheets))
for key in sorted(new_sheets):
    o, n = old_sheets[key], new_sheets[key]
    tag = "%s %s (%s %s)" % (key[0].split("/")[1], key[1], n["paper"], n["orientation"])
    print("\n  " + tag)
    ot = [t[0] for t in o["bandTexts"] if t[0] != "VALE GARDEN HOUSES"]                   # the logo's stand-in, only while the picture loads
    nt = [t[0] for t in n["bandTexts"] if t[0] != "VALE GARDEN HOUSES"]
    changed = [(a, b) for a, b in zip(ot, nt) if a != b]
    print("     strip texts before: " + " | ".join(ot))
    print("     strip texts after : " + " | ".join(nt))
    print("     dividers before: " + ", ".join("%.2f" % x for x in o["dividers"]))
    print("     dividers after : " + ", ".join("%.2f" % x for x in n["dividers"]))
    OUT["detail"][tag] = {"textsBefore": ot, "textsAfter": nt, "dividersBefore": o["dividers"], "dividersAfter": n["dividers"],
                          "chromeCount": [o["chromeCount"], n["chromeCount"]], "markupCount": [o["markupCount"], n["markupCount"]]}
    check(tag + ": the same strip texts apart from the Rev cell's prefix", len(ot) == len(nt) and all(b == ("Revision " + a) or a == b for a, b in zip(ot, nt)), changed)
    check(tag + ": the same number of chrome and markup primitives", o["chromeCount"] == n["chromeCount"] and o["markupCount"] == n["markupCount"],
          "chrome %d -> %d, markup %d -> %d" % (o["chromeCount"], n["chromeCount"], o["markupCount"], n["markupCount"]))
    # widths: the screen's rendered width against the chrome's measured width, per run
    for s, sheet in (("before", o), ("after", n)):
        rows = [w for w in sheet["widths"] if w["chromeMm"] > 0.5]
        worst = max(rows, key=lambda w: abs(w["screenMm"] - w["chromeMm"]) / w["chromeMm"]) if rows else None
        ratio = abs(worst["screenMm"] - worst["chromeMm"]) / worst["chromeMm"] if worst else 0
        OUT["detail"][tag]["worstScreenVsMeasure_" + s] = {"ratio": ratio, "run": worst}
        print("     %s: screen width vs the chrome's measure, worst %.2f %% (%s: screen %.3f mm, measured %.3f mm)"
              % (s, ratio * 100, worst["text"][:40] if worst else "-", worst["screenMm"] if worst else 0, worst["chromeMm"] if worst else 0))
    ok_after = OUT["detail"][tag]["worstScreenVsMeasure_after"]["ratio"]
    check(tag + ": on screen every run sets within 1 % of the width the chrome measured it at (truncation decided in the face it is drawn in)", ok_after < 0.01, "%.2f %%" % (ok_after * 100))
    # PDF
    nb, kinds_b = pdf_fonts(o["pdf"])
    na, kinds_a = pdf_fonts(n["pdf"])
    print("     PDF fonts before: %s" % kinds_b)
    print("     PDF fonts after : %s" % kinds_a)
    OUT["detail"][tag]["pdfFonts"] = {"before": kinds_b, "after": kinds_a}
    check(tag + ": the PDF set its text in Helvetica before and embeds Open Sans after, nothing else", all("Helvetica" in x for x in nb) and na and all("OpenSans" in x for x in na), "%s -> %s" % (nb, na))
    spans = pdf_spans(n["pdf"])
    meas = {}
    for w in n["widths"]:
        meas.setdefault(w["text"], w)
    diffs = []
    for sp in spans:
        w = meas.get(sp["text"])
        if w and not w["trackingMm"] and sp["level"]:
            diffs.append(abs(sp["width_mm"] - w["chromeMm"]) / w["chromeMm"])
    worst_pdf = max(diffs) if diffs else None
    OUT["detail"][tag]["pdfSpanVsMeasureWorstRatio"] = worst_pdf
    check(tag + ": the PDF's own glyph widths match the chrome's measure (level, untracked runs, within 0.2 %)", worst_pdf is not None and worst_pdf < 0.002, "%d runs, worst %.3f %%" % (len(diffs), (worst_pdf or 0) * 100))
    old_text, new_text = pdf_text(o["pdf"]), pdf_text(n["pdf"])
    check(tag + ": the PDF prints the same strip texts as the screen", all(t in new_text.replace("\n", " ") or t.replace(" ", "") in new_text.replace("\n", "").replace(" ", "") for t in nt), "")

# the A2 sheet: fixed cells a fifth wider; the A3 sheets: dividers where they were
a2 = [k for k in new_sheets if new_sheets[k]["paper"] == "A2"]
for k in a2:
    o, n = old_sheets[k], new_sheets[k]
    ow = [round(b - a, 3) for a, b in zip(o["dividers"], o["dividers"][1:])]
    nw = [round(b - a, 3) for a, b in zip(n["dividers"], n["dividers"][1:])]
    OUT["detail"]["A2 cells"] = {"before": ow, "after": nw}
    print("\n  A2 cell widths between dividers before: %s\n                                  after : %s" % (ow, nw))
a3 = [k for k in new_sheets if new_sheets[k]["paper"] == "A3"]
for k in a3:
    o, n = old_sheets[k], new_sheets[k]
    moved = [(a, b) for a, b in zip(o["dividers"], n["dividers"]) if abs(a - b) > 1e-6]
    check("%s %s (A3): every divider where it was" % k, not moved and len(o["dividers"]) == len(n["dividers"]), moved)

# THE STRIP ON SCREEN, PIXEL BY PIXEL (inline SVG in the page's Open Sans, 4 px to the mm, logo image left out)
print("\n  THE STRIP AS THE SCREEN DRAWS IT, BEFORE AND AFTER")
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
print("\nEVERY PAPER, A VALE SHEET'S VALUES (Client Mordaunt, a 55-character address, Rev B, 1:50)")
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
rule = a4p.get("prefixRule") or {}
keys = rule.get("keys", [])
drawn = a4p["widths"]
bare_ok = bool(rule) and all(abs(a - b) < 2.5e-3 for a, b in zip(drawn, rule["bare"]))   # drawn widths: differences of rules rounded to 0.001 mm
date_i = keys.index("Date") if "Date" in keys else None
cut_more = bool(rule) and date_i is not None and rule["prefixed"][date_i] < rule["bare"][date_i] - 1e-6
print("   A4 portrait prefix rule: drawn %s\n                            bare  %s\n                            with prefix %s" % (drawn, rule.get("bare"), rule.get("prefixed")))
check("A4 portrait: the prefix is dropped (the Rev cell reads B) - the strip drawn is the strip solved with bare values, where Revision B would have cut the date further",
      "B" in a4p["texts"] and "Revision B" not in a4p["texts"] and bare_ok and cut_more,
      {"date bare": rule.get("bare", [None] * 9)[date_i] if date_i is not None else None, "date with prefix": rule.get("prefixed", [None] * 9)[date_i] if date_i is not None else None})
for k in ("A3 portrait", "A4 landscape"):
    r = pn[k].get("prefixRule") or {}
    check(k + ": everything fits whole, so the prefix stays (Revision B) and the strip is the prefixed solution",
          "Revision B" in pn[k]["texts"] and not pn[k]["cut"] and r and all(abs(a - b) < 2.5e-3 for a, b in zip(pn[k]["widths"], r["prefixed"])), pn[k]["widths"])

# -----------------------------------------------------------------------------
# 2. A hidden frame
# -----------------------------------------------------------------------------
print("\nVIEWPORT__SHOWFRAME FALSE")
for s in ("old", "new"):
    sf = R[s]["showFrame"]
    print("   %s: shown -> %d prims %s caption on screen %s; hidden (normalised %s) -> %d prims, caption on screen %s"
          % (s, sf["shown"]["prims"], sf["shown"]["kinds"], sf["shown"]["svgHasCaption"], sf["hidden"]["normalisedShowFrame"], sf["hidden"]["prims"], sf["hidden"]["svgHasCaption"]))
sf = R["new"]["showFrame"]
check("a shown frame: frame and caption on screen and in the PDF", sf["shown"]["prims"] >= 3 and sf["shown"]["svgHasCaption"] and "PROPOSED FRONT ELEVATION" in pdf_text(sf["shown"]["pdf"]))
check("Viewport__ShowFrame false: neither frame nor caption on screen nor in the PDF (only the sheet's own border is left)",
      sf["hidden"]["kinds"] == ["rect"] and sf["shown"]["kinds"] == ["rect", "rect", "rect", "text"] and sf["hidden"]["viewportFrame"] == 0 and sf["shown"]["viewportFrame"] == 3
      and not sf["hidden"]["svgHasCaption"] and sf["hidden"]["svgRects"] == 1 and "PROPOSED" not in pdf_text(sf["hidden"]["pdf"]) and sf["hidden"]["normalisedShowFrame"] is False,
      "hidden %s, shown %s; one viewport's frame alone: hidden %s, shown %s" % (sf["hidden"]["kinds"], sf["shown"]["kinds"], sf["hidden"]["viewportFrame"], sf["shown"]["viewportFrame"]))
check("control: before, a hidden frame still drew both", R["old"]["showFrame"]["hidden"]["prims"] > 0 and R["old"]["showFrame"]["hidden"]["svgHasCaption"])

# -----------------------------------------------------------------------------
# 3. A holed vector
# -----------------------------------------------------------------------------
print("\nA HOLED VECTOR (outline 20-80, hole 40-60, fill #2f6fd0)")
for s in ("old", "new"):
    h = R[s]["holes"]
    px = pdf_pixels(h["pdf"], [(50, 50), (30, 50), (10, 10)])
    h["pdfPixels"] = px
    print("   %s: normalised holes %s; even-odd %s, %d subpaths; Contains hole %s ring %s; screen pixels hole/ring/outside %s; PDF %s"
          % (s, h.get("normalisedHoles"), h["svgEvenOdd"], h["subpaths"], h["containsHole"], h["containsRing"], h["screenPixels"], px))
    OUT["detail"]["holes_" + s] = {k: h[k] for k in ("normalisedHoles", "svgEvenOdd", "subpaths", "containsHole", "containsRing", "screenPixels", "pdfPixels") if k in h}
h = R["new"]["holes"]
white = lambda p: p is not None and min(p[:3]) >= 245
blue = lambda p: p is not None and p[2] > 150 and p[0] < 120
check("on screen: the hole is bare paper and the ring is filled (even-odd)", h["svgEvenOdd"] and white(h["screenPixels"][0]) and blue(h["screenPixels"][1]), h["screenPixels"][:2])
check("in the PDF: the hole is bare paper and the ring is filled", white(h["pdfPixels"][0]) and blue(h["pdfPixels"][1]), h["pdfPixels"][:2])
check("in the PDF's content stream: the even-odd fill operator (B* or f*)", re.search(rb"(^|\s)(B\*|f\*)(\s|$)", pdf_raw(h["pdf"])) is not None)
check("a click in the hole is not inside the shape; one on the ring is", h["containsHole"] is False and h["containsRing"] is True)
ho = R["old"]["holes"]
check("control: before, the hole was painted over (one run, no even-odd)", not ho["svgEvenOdd"] and not white(ho["pdfPixels"][0]), ho["pdfPixels"][0])

# -----------------------------------------------------------------------------
# 4/5. QR: the primitive, and the shipped config vs a test config
# -----------------------------------------------------------------------------
print("\nTHE QR CODE")
q = R["new"]["qrPrimitive"]
qpx = pdf_pixels(q["pdf"], [(10.5, 10.5), (25, 25), (45, 45)]) if q.get("pdf") else None
print("   new 'qr' primitive: %s, symbol %s modules, %s SVG paths, screen %s, PDF %s" % (q.get("kind"), q.get("size"), q.get("svgPaths"), q.get("screenPixels"), qpx))
check("a 'qr' primitive paints the symbol on screen and in the PDF (dark finder corner, light paper outside)",
      q.get("kind") == "qr" and q["screenPixels"][1][0] < 60 and white(q["screenPixels"][2]) and qpx and qpx[0][0] < 60 and qpx[1][0] < 60 and white(qpx[2]), {"screen": q.get("screenPixels"), "pdf": qpx})
for s in ("old", "new", "qron"):
    c = R[s]["qrConfig"]
    print("   %s: 53 enabled %s, QrCellEnabled %s, url %r, symbol %s, Shape__Qr box -> %s, logo stand-in %r" % (s, c["enabled"], c["qrCellEnabled"], c["url"], c["symbolSize"], c["boxKinds"], c["logoFallbackText"]))
    for k, cell in c["cells"].items():
        print("        %-13s qr prims %d  size %s  end cell %s mm  note: %s" % (k, cell["qrPrims"], cell["qrSizeMm"], cell["endCellMm"], " | ".join(t for t in cell["texts"][-3:])))
cn, cq = R["new"]["qrConfig"], R["qron"]["qrConfig"]
check("shipped config: no code anywhere - 53 off, the end cell off, no symbol, a Shape__Qr box draws only its box, no strip has a cell",
      cn["enabled"] is False and cn["qrCellEnabled"] is False and cn["url"] == "" and cn["symbolSize"] is None and "qr" not in cn["boxKinds"] and all(c["qrPrims"] == 0 for c in cn["cells"].values()))
check("test config: the code paints - a Shape__Qr box carries it", cq["enabled"] is True and cq["url"] == "https://qr.example.test/q/?test-key-3047" and "qr" in cq["boxKinds"], cq["url"])
whole_ok = all(abs((cq["cells"][k]["endCellMm"] or 0) - 56) < 0.01 for k in ("A1 landscape", "A2 landscape", "A3 landscape"))
compact_ok = all(cq["cells"][k]["qrPrims"] == 1 and (cq["cells"][k]["endCellMm"] or 99) < 20 for k in ("A4 landscape", "A4 portrait"))
check("test config: a 56 mm end cell on A1, A2 and A3; compact on A4 (landscape and portrait)", whole_ok and compact_ok,
      {k: c["endCellMm"] for k, c in cq["cells"].items()})
check("the logo's stand-in text comes from config: VALE GARDEN HOUSES", cn["logoFallbackText"] == "VALE GARDEN HOUSES", cn["logoFallbackText"])
for k, cell in cq["cells"].items():
    if cell.get("pdf"):
        raw = pdf_raw(cell["pdf"])
        OUT["detail"]["qron_pdf_" + k] = len(raw)

# -----------------------------------------------------------------------------
# 6. The broken-link halo
# -----------------------------------------------------------------------------
print("\nTHE BROKEN-LINK HALO")
hl = R["new"]["halo"]
print("   new: red on screen %s (svg %s), red for a PDF %s (svg %s)" % (hl.get("redOnScreen"), hl.get("svgOnHasRed"), hl.get("redForPdf"), hl.get("svgOffHasRed")))
raw = pdf_raw(hl["pdf"]) if hl.get("pdf") else b""
red_in_pdf = b"0.851 0.176 0.125 RG" in raw or b"0.85 0.18 0.13 RG" in raw
check("a bubble whose note is gone: a red halo on screen when the editor asks, none in a PDF (which never asks)",
      hl.get("redOnScreen", 0) >= 1 and hl.get("svgOnHasRed") and hl.get("redForPdf") == 0 and not hl.get("svgOffHasRed") and not red_in_pdf)

# -----------------------------------------------------------------------------
# 7. Dimension geometry
# -----------------------------------------------------------------------------
print("\nDIMENSION GEOMETRY")
for s in ("old", "new"):
    print("   %s: %s" % (s, R[s]["dimension"]))
d = R["new"]["dimension"]
check("a plain dimension's skeleton is unchanged; the ghost points are new; a length cuts the extension line short",
      d["plainX1"] == R["old"]["dimension"]["plainX1"] and d["plainHasGhost"] and d["cutX1"] != d["plainX1"] and d["cutG1"] == d["plainX1"])

# -----------------------------------------------------------------------------
print("\nconsole errors: " + "; ".join("%s %s" % (s, [l for l in R[s].get("console", []) if l.startswith(("error", "pageerror"))]) for s in R))
print("aborted requests: " + "; ".join("%s %d" % (s, len(R[s].get("aborted", []))) for s in R))
print("\n" + ("EVERY CHECK PASSED" if FAILS == 0 else "%d CHECK(S) FAILED" % FAILS))
json.dump(OUT, open(os.path.join(HERE, "logs", "analysis__%s.json" % LABEL), "w", encoding="utf-8"), indent=1)
sys.exit(1 if FAILS else 0)
