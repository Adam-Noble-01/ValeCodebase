# W1-26 scratch: copy W1-25's browser harness (read-only source) into this folder, writing its outputs under
# names of its own, so W1-25's own end-to-end check ("the live PDFs embed Open Sans once W1-26 lands SheetChrome
# 1.14.0") can be re-run on the landed tree through the REAL PdfExporter and SpecPdf. Nothing in W1-25's
# folder is written.
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "W1-25", "w1_25_browser.mjs")
DST = os.path.join(HERE, "w1_25_browser__rerun.mjs")
t = open(SRC, encoding="utf-8").read()
pairs = [
    ("'pdf', 'browser__' + scenario + '__specpage.pdf'", "'pdf', 'w125rerun__' + scenario + '__specpage.pdf'"),
    ("'(written to pdf/browser__' + scenario + '__specpage.pdf)'", "'(written to pdf/w125rerun__' + scenario + '__specpage.pdf)'"),
    ("'pdf', 'browser__' + scenario + '__spec.pdf'", "'pdf', 'w125rerun__' + scenario + '__spec.pdf'"),
    ("'(pdf/browser__' + scenario + '__spec.pdf)'", "'(pdf/w125rerun__' + scenario + '__spec.pdf)'"),
    ("'pdf', 'browser__' + scenario + '__sheet.pdf'", "'pdf', 'w125rerun__' + scenario + '__sheet.pdf'"),
    ("'(pdf/browser__' + scenario + '__sheet.pdf)'", "'(pdf/w125rerun__' + scenario + '__sheet.pdf)'"),
    ("'logs', 'browser__' + scenario + '.json'", "'logs', 'w125rerun__' + scenario + '.json'"),
]
for old, new in pairs:
    assert t.count(old) == 1, old
    t = t.replace(old, new)
open(DST, "w", encoding="utf-8", newline="\n").write(t)
print("copied to " + DST)
