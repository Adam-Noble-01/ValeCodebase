p = 'w2_16_harness.mjs'
t = open(p, encoding='utf-8').read()


def rep(old, new):
    global t
    assert t.count(old) == 1, old[:80]
    t = t.replace(old, new)


# The record shape is Viewport__ProjectedEdges.Edges__Categories[key] (EdgeStyles :105).
rep("ES.Na__LeEdge__Effective({ Viewport__ProjectedEdges : { ValeVision__MainBuildingModel__ProposedWalls : { Category__LineTypeScale : 0.5 } } }, 'ValeVision__MainBuildingModel__ProposedWalls')",
    "ES.Na__LeEdge__Effective({ Viewport__ProjectedEdges : { Edges__Categories : { ValeVision__MainBuildingModel__ProposedWalls : { Category__LineTypeScale : 0.5 } } } }, 'ValeVision__MainBuildingModel__ProposedWalls')")

# A realistic class: a dashed wall, a solid window and a nested detail tag.
rep("""const classes = { visible : [ 0, 0, 1, 0,  0, 1, 1, 1,  2, 2, 3, 3 ], __tags : { Owners : { visible : [ 0, 1, 1 ] }, OwnerKeys : [ 'ValeVision__MainBuildingModel__ProposedWalls', 'ValeVision__LineworkModifier__FineDetail' ] } };""",
    """const classes = { visible : [ 0, 0, 1, 0,  0, 1, 1, 1,  2, 2, 3, 3,  4, 4, 5, 5 ], __tags : { Owners : { visible : [ 0, 1, 1, 2 ] },
    OwnerKeys : [ 'ValeVision__MainBuildingModel__ProposedWalls', 'ValeVision__LineworkModifier__FineDetail', 'ValeVision__MainBuildingModel__ProposedWindows' ] } };""")
rep("""const segs = (bands) => bands.reduce((n, b) => n + (b.indices ? b.indices.length : 3), 0);
check('with the row on, all three segments draw', segs(bandsOn), 3);
check('with the Fine Detail row off, only the wall\\'s one segment draws', [ segs(bandsOff), bandsOff.length, bandsOff[0] && bandsOff[0].indices ], [ 1, 1, [ 0 ] ]);""",
    """const drawn = (bands) => bands.flatMap((b) => b.indices ? Array.from(b.indices) : [ 0, 1, 2, 3 ]).sort();
check('with the row on, all four segments draw', drawn(bandsOn), [ 0, 1, 2, 3 ]);
check('with the Fine Detail row off, its two segments leave the vectors; the wall and the window stay', drawn(bandsOff), [ 0, 3 ]);
// TrueVision's own edge case, ported as it is (DR-37 (3)): when every segment LEFT in a class shares one
// style, StyleBands paints the class whole (indices null), switched-off segments included. Recorded, not failed.
const lone = { visible : [ 0, 0, 1, 0,  0, 1, 1, 1 ], __tags : { Owners : { visible : [ 0, 1 ] }, OwnerKeys : classes.__tags.OwnerKeys } };
const loneOff = LW.Na__LeVp2d__StyleBands({ Viewport__ProjectedEdges : {}, Viewport__ModelLayers : { ValeVision__LineworkModifier__FineDetail : false } }, 0.3, lone, false);
console.log('  NOTE  TrueVision edge case: one style left in a class -> indices ' + JSON.stringify(loneOff.map((b) => b.indices)) + ' (null = the whole class, the switched-off segment included)');""")
open(p, 'w', encoding='utf-8', newline='\n').write(t)
print('patched')
