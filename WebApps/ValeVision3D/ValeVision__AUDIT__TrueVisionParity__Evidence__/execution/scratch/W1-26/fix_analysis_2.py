# W1-26 scratch: the hidden-frame check - Build still lays the modern sheet border (one rect) whatever the frames do.
P = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-26\analyse_w1_26.py"
t = open(P, encoding="utf-8").read()
old = '''check("Viewport__ShowFrame false: neither frame nor caption on screen nor in the PDF", sf["hidden"]["prims"] == 0 and not sf["hidden"]["svgHasCaption"] and sf["hidden"]["svgRects"] == 0
      and "PROPOSED" not in pdf_text(sf["hidden"]["pdf"]) and sf["hidden"]["normalisedShowFrame"] is False, "viewport frame alone: %s" % sf["hidden"]["viewportFrame"])'''
new = '''check("Viewport__ShowFrame false: neither frame nor caption on screen nor in the PDF (only the sheet's own border is left)",
      sf["hidden"]["kinds"] == ["rect"] and sf["shown"]["kinds"] == ["rect", "rect", "rect", "text"] and sf["hidden"]["viewportFrame"] == 0 and sf["shown"]["viewportFrame"] == 3
      and not sf["hidden"]["svgHasCaption"] and sf["hidden"]["svgRects"] == 1 and "PROPOSED" not in pdf_text(sf["hidden"]["pdf"]) and sf["hidden"]["normalisedShowFrame"] is False,
      "hidden %s, shown %s; one viewport's frame alone: hidden %s, shown %s" % (sf["hidden"]["kinds"], sf["shown"]["kinds"], sf["hidden"]["viewportFrame"], sf["shown"]["viewportFrame"]))'''
assert t.count(old) == 1
t = t.replace(old, new)
open(P, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
