p = 'w2_16_harness.mjs'
t = open(p, encoding='utf-8').read()


def rep(old, new):
    global t
    assert t.count(old) == 1, old[:90]
    t = t.replace(old, new)


rep("""check('its fill override and Line scale are kept under this app\\'s category prefix', once.Viewport__ProjectedEdges, tvRecord('ValeVision__SitePlan__').Viewport__ProjectedEdges);""",
    """const red = (r, prefix) => { const e = r.Viewport__ProjectedEdges.Edges__Categories[prefix + 'RedLine']; return { fill : e.Category__FillHex, scale : e.Category__LineTypeScale }; };
check('its fill override and Line scale are kept under this app\\'s category prefix', red(once, 'ValeVision__SitePlan__'), { fill : '#FFCC00', scale : 0.5 });""")
rep("""      tvPrefix.Viewport__ProjectedEdges, { Edges__Categories : { TrueVision__SitePlan__RedLine : { Category__LineTypeScale : 0.5 } } });""",
    """      red(tvPrefix, 'TrueVision__SitePlan__'), { scale : 0.5 });""")
open(p, 'w', encoding='utf-8', newline='\n').write(t)
print('patched')
