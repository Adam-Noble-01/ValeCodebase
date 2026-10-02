# W1-26 scratch: list a PDF's text spans (PyMuPDF) beside the chrome's measured runs, to see how they pair.
import json
import os
import sys

import fitz

HERE = os.path.dirname(os.path.abspath(__file__))
scenario = sys.argv[1] if len(sys.argv) > 1 else "new"
R = json.load(open(os.path.join(HERE, "logs", "browser__%s.json" % scenario), encoding="utf-8"))
for s in R["sheets"]:
    print("\n==", s["folder"], s["sheet"], s["paper"])
    doc = fitz.open(s["pdf"])
    for page in doc:
        for block in page.get_text("rawdict")["blocks"]:
            for line in block.get("lines", []):
                for sp in line.get("spans", []):
                    chars = sp.get("chars", [])
                    text = "".join(c["c"] for c in chars)
                    adv = (chars[-1]["bbox"][2] - chars[0]["bbox"][0]) * 25.4 / 72 if chars else 0
                    bb = (sp["bbox"][2] - sp["bbox"][0]) * 25.4 / 72
                    m = [w for w in s["widths"] if w["text"] == text]
                    print("   %-46s size %5.2fpt  bbox %7.3f  chars %7.3f  measured %s" % (text[:46], sp["size"], bb, adv, ["%.3f@%.2f t%.2f" % (w["chromeMm"], w["fontMm"], w["trackingMm"]) for w in m][:3]))
    doc.close()
