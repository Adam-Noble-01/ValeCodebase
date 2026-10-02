# W1-26 scratch: the strip screenshots were wider than the viewport (only the visible part painted) - draw
# them at 4 px to the millimetre in a 2600 px wide viewport (an A2 strip is about 590 mm: 2360 px).
P = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-26\browser_w1_26.mjs"
t = open(P, encoding="utf-8").read()


def rep(old, new):
    global t
    assert t.count(old) == 1, old[:90]
    t = t.replace(old, new)


rep("svg.style.width = (w * 10) + 'px';", "svg.style.width = (w * 4) + 'px';")
rep("const context = await browser.newContext({ viewport : { width : 1700, height : 1200 } });",
    "const context = await browser.newContext({ viewport : { width : 2600, height : 1200 } });")
rep("// page's own Open Sans), 10 px to the millimetre, saved as PNG for a pixel comparison before / after.",
    "// page's own Open Sans), 4 px to the millimetre, saved as PNG for a pixel comparison before / after.")
open(P, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
