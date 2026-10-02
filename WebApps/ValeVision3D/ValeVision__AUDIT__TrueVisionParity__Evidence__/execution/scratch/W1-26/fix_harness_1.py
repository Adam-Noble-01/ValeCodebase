import io
P = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-26\browser_w1_26.mjs"
t = open(P, encoding="utf-8").read()
old1 = "    const leader = { Leader__Id : 'Leader_1', Leader__Type : 'bubble', Leader__TipMm : { x : 20, y : 60 }, Leader__AnchorMm : { x : 60, y : 30 }, Leader__Text : 'EX01', Leader__SpecNoteId : 'Note_gone' };\n"
new1 = "    const leader = REC.Na__LeRec__NormaliseLeader({ Leader__Id : 'Leader_1', Leader__Type : LEAD.Na__LeLeadGeo__TYPE_BUBBLE, Leader__TipXMm : 20, Leader__TipYMm : 60, Leader__AnchorXMm : 60, Leader__AnchorYMm : 30, Leader__Text : 'EX01', Leader__SpecNoteId : 'Note_gone' }, 'Layer_001');\n"
assert t.count(old1) == 1; t = t.replace(old1, new1)
old2 = "                    Shape__Holes : [ 4 ], Shape__Closed : true, Shape__Stroked : true, Shape__StrokeColour : '#000000', Shape__StrokePt : 0.5, Shape__FillColour : '#2f6fd0' };\n"
new2 = "                    Shape__Holes : [ 4 ], Shape__Closed : true, Shape__Stroked : true, Shape__StrokeColour : '#000000', Shape__StrokePt : 0.5, Shape__FillColour : '#2f6fd0' };\n    const normal = REC.Na__LeRec__NormaliseShape(J(shape), 'Layer_001');\n"
assert t.count(old2) == 1; t = t.replace(old2, new2)
old3 = "    return { primitive : J(list), svg, svgEvenOdd"
new3 = "    return { normalisedHoles : normal ? normal.Shape__Holes : null, primitive : J(list), svg, svgEvenOdd"
assert t.count(old3) == 1; t = t.replace(old3, new3)
open(P, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
