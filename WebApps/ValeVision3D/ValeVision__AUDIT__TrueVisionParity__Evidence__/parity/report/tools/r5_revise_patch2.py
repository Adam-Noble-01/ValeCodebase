# R5 reviser patch 2 (01-Oct-2026): the E.3 group summary takes the bare package id from an annotated Package cell
# (e.g. "W4-17 (assigned here; ...)"), so W4-17 is not listed twice in group O. Keeps the file's line endings.
import os

HERE = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(HERE, "r5_inventory.py")
raw = open(path, "rb").read()
crlf = b"\r\n" in raw
txt = raw.decode("utf-8").replace("\r\n", "\n")
old = """        for w in re.split(r",\\s*", x["wp"]):
            if re.match(r"W[0-9T]-\\d\\d", w):
                wps.add(w)
"""
new = """        for w in re.split(r",\\s*", x["wp"]):
            m = re.match(r"W[0-9T]-\\d\\d", w)
            if m:
                wps.add(m.group(0))
"""
assert txt.count(old) == 1, "expected one match, found %d" % txt.count(old)
txt = txt.replace(old, new)
if crlf:
    txt = txt.replace("\n", "\r\n")
open(path, "wb").write(txt.encode("utf-8"))
print("patched r5_inventory.py (group summary package ids)", "CRLF" if crlf else "LF")
