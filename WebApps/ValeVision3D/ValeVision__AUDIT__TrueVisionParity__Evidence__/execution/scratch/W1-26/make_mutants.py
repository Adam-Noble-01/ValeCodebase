# W1-26 scratch: planted faults, each one line of a LANDED file changed in a copy under mutants/<name>/ (never in
# the tree), for the browser harness to load in place of the live file (--new mutants/<name>). Each must make
# the acceptance analysis fail the check it names.
import os

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
LE = "02__Src__AppModules/51__System__LayoutEditor/"
CHROME = LE + "10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js"
MODERN = LE + "10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Modern__.js"
LEADER = LE + "15__Core__Markup/Na__LayoutEditor__LeaderGeometry__.js"
SHAPE = LE + "15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js"

MUTANTS = {
    "m1-measure-helvetica": (CHROME,
        "        if (!Na__LePdfFonts__SetFont(doc, weight)) {\n            doc.setFont('helvetica', Na__LeChrome__PdfWeight(weight));\n        }",
        "        doc.setFont('helvetica', Na__LeChrome__PdfWeight(weight));   // (mutant) Helvetica always",
        "the chrome measures (and prints) in Open Sans; screen within 1 %; PDF embeds Open Sans"),
    "m2-no-holes": (CHROME,
        "        return Array.isArray(primitive.Holes) && primitive.Holes.length > 0;",
        "        return false;   // (mutant) holes ignored",
        "a holed vector's hole bare on screen and in the PDF"),
    "m3-frame-always": (CHROME,
        "        if (viewport.Viewport__ShowFrame === false) return;",
        "        // (mutant) the ShowFrame guard taken out",
        "Viewport__ShowFrame false hides frame and caption"),
    "m4-halo-always": (LEADER,
        "        if (bubble && options && options.showBrokenHalos && Na__LeLeadGeo__IsBroken(leader)) {",
        "        if (bubble && Na__LeLeadGeo__IsBroken(leader)) {   // (mutant) the halo drawn whatever the caller asked",
        "the halo on screen only, never in a PDF"),
    "m5-prefix-kept": (MODERN,
        "        if (solved.cutsText && setup.rows.some((row) => !!row.ValuePrefix)) solved = solve(true);",
        "        // (mutant) the prefix is never dropped",
        "A4 portrait drops the prefix"),
    "m6-qr-shape-ignores-switch": (SHAPE,
        "        const symbol = Na__ProjectQr__GetSymbol();\n        if (!symbol) return false;",
        "        const symbol = Na__ProjectQr__GetSymbol() || { Size : 21, Runs : [ [ 0, 0, 7 ] ] };   // (mutant) a code whatever the switch says",
        "shipped config: no code anywhere"),
}

for name, (rel, old, new, bites) in MUTANTS.items():
    text = open(os.path.join(VV, rel.replace("/", os.sep)), encoding="utf-8").read()
    assert text.count(old) == 1, (name, old[:60])
    dst = os.path.join(HERE, "mutants", name, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, "w", encoding="utf-8", newline="\n").write(text.replace(old, new))
    print("%-28s %s  (should fail: %s)" % (name, rel.split("/")[-1], bites))
