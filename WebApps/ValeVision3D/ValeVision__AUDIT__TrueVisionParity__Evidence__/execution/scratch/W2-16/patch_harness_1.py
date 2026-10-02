p = 'w2_16_harness.mjs'
t = open(p, encoding='utf-8').read()
a = "check('a Line scale of 0.5 halves every dash and gap length', eHalf.patternMm, eDash.patternMm.map((mm) => mm * 0.5));"
assert t.count(a) == 1
t = t.replace(a, "check('the dashed row has a dash pattern to scale', eDash.patternMm.length > 0, true);\n" + a)
b = "console.log(`\\n${pass} passed, ${fail} failed`);"
assert t.count(b) == 1, t.count(b)
e = r"""// =============================================================================
// E. THE VECTOR HALF OF A MODIFIER ROW (the real StyleBands)
// =============================================================================
console.log('\nE. Linework: a modifier row switched off leaves the vectors');
const LW = await load(cand(LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__Linework__.js'), Object.assign({}, CFG, N.Win, {
    Na__LeVp2d__CLASS_ORDER : N.Frm.Na__LeVp2d__CLASS_ORDER, Na__LeVp2d__Linework : new Map(), Na__LeVp2d__PathCache : new Map(), Na__LeVp2d__SizeLayer : () => {},
    Na__LeCfg__GetLineworkSetup : () => ({ visibleWidthMm : 0.35, hiddenWidthMm : 0.18, authoredWidthMm : 0.25, sectionWidthMm : 0.5, hiddenDashMm : 1 }),
    Na__LeCfg__PtToMm : (pt) => pt * 0.3528,
    Na__LeComposite__Factor : () => 1,
    Na__PlCfg__GetAppearance : () => ({ StrokeColour : '#000000' }),
    Na__LeEdge__Effective : ES.Na__LeEdge__Effective, Na__LeEdge__AppliesToClasses : () => [ 'visible', 'hidden', 'authored' ], Na__LeEdge__SolidMeansClassDefault : () => true,
    Na__LeModelLayers__IsOn : MLn.Na__LeModelLayers__IsOn,
    Na__PlOwners__Read : (classes) => classes.__tags,
    Na__PlOwners__KeyFor : (keys, id) => keys[id]
}));
const classes = { visible : [ 0, 0, 1, 0,  0, 1, 1, 1,  2, 2, 3, 3 ], __tags : { Owners : { visible : [ 0, 1, 1 ] }, OwnerKeys : [ 'ValeVision__MainBuildingModel__ProposedWalls', 'ValeVision__LineworkModifier__FineDetail' ] } };
const bandsOn  = LW.Na__LeVp2d__StyleBands({ Viewport__ProjectedEdges : {} }, 0.3, classes, false);
const bandsOff = LW.Na__LeVp2d__StyleBands({ Viewport__ProjectedEdges : {}, Viewport__ModelLayers : { ValeVision__LineworkModifier__FineDetail : false } }, 0.3, classes, false);
const segs = (bands) => bands.reduce((n, b) => n + (b.indices ? b.indices.length : 3), 0);
check('with the row on, all three segments draw', segs(bandsOn), 3);
check('with the Fine Detail row off, only the wall\'s one segment draws', [ segs(bandsOff), bandsOff.length, bandsOff[0] && bandsOff[0].indices ], [ 1, 1, [ 0 ] ]);

"""
t = t.replace(b, e + b)
open(p, 'w', encoding='utf-8', newline='\n').write(t)
print('patched')
