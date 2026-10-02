"""Check the staged/live Paper CSS: region balance, TV regions byte-identical, braces balanced, VV-kept rules present."""
import re
import sys

tv_path, vv_path = sys.argv[1], sys.argv[2]
tv = open(tv_path, encoding="utf-8").read().replace("\r\n", "\n")
vv = open(vv_path, encoding="utf-8").read().replace("\r\n", "\n")

opens = len(re.findall(r"^/\* REGION ", vv, re.M))
closes = len(re.findall(r"^/\* endregion", vv, re.M))
print("REGION opens (incl. banner):", opens, " endregion:", closes)

nocomment = re.sub(r"/\*.*?\*/", "", vv, flags=re.S)
print("braces { } :", nocomment.count("{"), nocomment.count("}"))

DASH = "/* ----------------------------------------------------------------- */\n"
END = "/* endregion ------------------------------------------------------- */\n"


def block(text, title, n):
    start = text.find(DASH + "/* REGION  |  " + title)
    at = start
    for _ in range(n):
        at = text.find(END, at) + len(END)
    return text[start:at]


for title, n in (("Paper and Its Layers", 2), ("Viewport Frames", 1)):
    print(f"region '{title}' identical to TrueVision's:", block(tv, title, n) == block(vv, title, n))

for needle in (".na-le-osnap {", ".na-le-osnap--infer", ".na-le-grip--picked", ".na-le-grip--insert", ".na-le-dropper--flash",
               "na-le-paper--scoped .na-le-paper__viewports", "na-le-paper--scoped .na-le-paper__slot",
               "body.na-le-vector-hold:not(.na-le-viewer--active) .na-le-frame--2d", ".na-le-frame__fog", ".na-le-paper--zooming"):
    print(f"  {needle!r:75s} x{vv.count(needle)}")

# selectors present in the old VV sheet but not in the new one
old = open(sys.argv[3], encoding="utf-8").read().replace("\r\n", "\n") if len(sys.argv) > 3 else None
if old:
    sel = lambda t: set(s.strip() for s in re.findall(r"([^{}]+)\{", re.sub(r"/\*.*?\*/", "", t, flags=re.S)))
    gone = sel(old) - sel(vv)
    new = sel(vv) - sel(old)
    print("selector groups gone:", sorted(gone))
    print("selector groups new :", sorted(new))
