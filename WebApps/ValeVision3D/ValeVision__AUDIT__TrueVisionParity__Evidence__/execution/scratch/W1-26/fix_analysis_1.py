# W1-26 scratch: three corrections to analyse_w1_26.py (asserted replacements).
P = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-26\analyse_w1_26.py"
t = open(P, encoding="utf-8").read()


def rep(old, new):
    global t
    assert t.count(old) == 1, old[:80]
    t = t.replace(old, new)


# 1. PDF spans: keep the line direction, compare horizontal untracked runs with a relative tolerance
rep('''        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                for sp in line.get("spans", []):
                    spans.append({"text": sp["text"], "font": sp["font"], "size_pt": sp["size"], "width_mm": (sp["bbox"][2] - sp["bbox"][0]) * 25.4 / 72})''',
    '''        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                level = abs(line.get("dir", (1, 0))[1]) < 1e-6
                for sp in line.get("spans", []):
                    spans.append({"text": sp["text"], "font": sp["font"], "size_pt": sp["size"], "level": level, "width_mm": (sp["bbox"][2] - sp["bbox"][0]) * 25.4 / 72})''')
rep('''    for sp in spans:
        w = meas.get(sp["text"])
        if w and not w["trackingMm"]:
            diffs.append(abs(sp["width_mm"] - w["chromeMm"]))
    worst_pdf = max(diffs) if diffs else None
    OUT["detail"][tag]["pdfSpanVsMeasureWorstMm"] = worst_pdf
    check(tag + ": the PDF's own glyph widths equal the chrome's measure (untracked runs)", worst_pdf is not None and worst_pdf < 0.02, "%d runs, worst %.4f mm" % (len(diffs), worst_pdf or 0))''',
    '''    for sp in spans:
        w = meas.get(sp["text"])
        if w and not w["trackingMm"] and sp["level"]:
            diffs.append(abs(sp["width_mm"] - w["chromeMm"]) / w["chromeMm"])
    worst_pdf = max(diffs) if diffs else None
    OUT["detail"][tag]["pdfSpanVsMeasureWorstRatio"] = worst_pdf
    check(tag + ": the PDF's own glyph widths match the chrome's measure (level, untracked runs, within 0.2 %)", worst_pdf is not None and worst_pdf < 0.002, "%d runs, worst %.3f %%" % (len(diffs), (worst_pdf or 0) * 100))''')

# 2. the even-odd operator stands on its own line in jsPDF's stream
rep('''check("in the PDF's content stream: the even-odd fill operator", b" B*" in pdf_raw(h["pdf"]) or b" f*" in pdf_raw(h["pdf"]))''',
    '''check("in the PDF's content stream: the even-odd fill operator (B* or f*)", re.search(rb"(^|\\s)(B\\*|f\\*)(\\s|$)", pdf_raw(h["pdf"])) is not None)''')
rep("import json\nimport os\nimport sys\n", "import json\nimport os\nimport re\nimport sys\n")

# 3. QR samples: the finder's outer ring (10.5, 10.5) is dark; (45, 45) is paper. The browser sampled
#    (11, 11), (25, 25), (45, 45) - (25, 25) is a dark module of this symbol.
rep('''qpx = pdf_pixels(q["pdf"], [(11, 11), (45, 45)]) if q.get("pdf") else None''',
    '''qpx = pdf_pixels(q["pdf"], [(10.5, 10.5), (25, 25), (45, 45)]) if q.get("pdf") else None''')
rep('''      q.get("kind") == "qr" and q["screenPixels"][0][0] < 60 and white(q["screenPixels"][2]) and qpx and qpx[0][0] < 60 and white(qpx[1]), {"screen": q.get("screenPixels"), "pdf": qpx})''',
    '''      q.get("kind") == "qr" and q["screenPixels"][1][0] < 60 and white(q["screenPixels"][2]) and qpx and qpx[0][0] < 60 and qpx[1][0] < 60 and white(qpx[2]), {"screen": q.get("screenPixels"), "pdf": qpx})''')
open(P, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
