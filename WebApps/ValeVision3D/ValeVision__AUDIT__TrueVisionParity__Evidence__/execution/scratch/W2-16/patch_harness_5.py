p = 'w2_16_harness.mjs'
t = open(p, encoding='utf-8').read()
b = "console.log(`\\n${pass} passed, ${fail} failed`);"
assert t.count(b) == 1
f = r"""// =============================================================================
// F. A TRUEVISION-WRITTEN SITE PLAN VIEWPORT RECORD ROUND-TRIPS (the shipped SheetRecords)
// =============================================================================
console.log('\nF. A TrueVision-written Viewport__SitePlan record through this app\'s record normaliser');
const APPCFG = JSON.parse(readFileSync(join(SRC, LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json'), 'utf8'));
const Val = (block, key, fallback) => { const bk = APPCFG['LayoutEditor__' + block + '__Config']; const v = bk ? bk['LayoutEditor__' + block + '__' + key] : undefined; return (v === undefined || v === null) ? fallback : v; };
const Num = (block, key, fallback) => { const v = Val(block, key, undefined); return (typeof v === 'number' && Number.isFinite(v)) ? v : fallback; };
const Setup = await load(join(SRC, LE + '03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js'), { Na__LeCfg__Val : Val, Na__LeCfg__Num : Num });
const Scale = await load(join(SRC, LE + '07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js'), { Na__LeCfg__GetScaleSetup : Setup.Na__LeCfg__GetScaleSetup });
const SpC   = await load(join(SRC, LE + '25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js'), { Na__LeScale__Coerce : Scale.Na__LeScale__Coerce });
const RC    = await load(join(SRC, LE + '25__System__RenderStyles/Na__LayoutEditor__RenderComposites__.js'), CFG);
const Rot   = await load(join(SRC, LE + '20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js'), {});
const Rec   = await load(join(SRC, LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js'), Object.assign({}, ES, RC, SpC, {
    Na__LeCfg__GetViewportSetup : Setup.Na__LeCfg__GetViewportSetup, Na__LeScale__Coerce : Scale.Na__LeScale__Coerce,
    Na__LeHatch__FIELD : 'Viewport__SitePlanHatches', Na__LeHatch__CAT_FIELD : 'Hatches__Categories',
    Na__LeVpRot__FIELD : Rot.Na__LeVpRot__FIELD, Na__LeVpRot__WrapDeg : Rot.Na__LeVpRot__WrapDeg
}));
const tvRecord = (prefix) => ({
    Viewport__Id : 'Viewport_010', Viewport__Kind : '2d', Viewport__Name : 'Block Plan', Viewport__LayerId : 'Layer_001', Viewport__ScaleDenominator : 500,
    Viewport__FrameMm : { X : 20, Y : 20, WidthMm : 240, HeightMm : 180 }, Viewport__PanMm : { X : 1200, Y : -800 },
    Viewport__SitePlan : { SitePlan__StoreId : 'existing', SitePlan__PlanType : 'location', SitePlan__Composites : { patterns : false } },
    Viewport__ProjectedEdges : { Edges__Categories : { [prefix + 'RedLine'] : { Category__FillHex : '#FFCC00', Category__LineTypeScale : 0.5 } } }
});
const once  = Rec.Na__LeRec__NormaliseViewport(tvRecord('ValeVision__SitePlan__'), 'Layer_001');
const twice = Rec.Na__LeRec__NormaliseViewport(JSON.parse(JSON.stringify(once)), 'Layer_001');
check('it is a site plan viewport here too', Rec.Na__LeRec__IsSitePlanViewport(once), true);
check('its Viewport__SitePlan block is kept exactly as TrueVision wrote it', once.Viewport__SitePlan, tvRecord('').Viewport__SitePlan);
check('its 1:500 survives (a site plan scale)', once.Viewport__ScaleDenominator, 500);
check('its fill override and Line scale are kept under this app\'s category prefix', once.Viewport__ProjectedEdges, tvRecord('ValeVision__SitePlan__').Viewport__ProjectedEdges);
check('a second load leaves it byte-identical', JSON.stringify(twice), JSON.stringify(once));
const tvPrefix = Rec.Na__LeRec__NormaliseViewport(tvRecord('TrueVision__SitePlan__'), 'Layer_001');
check('the one difference: under TrueVision\'s own prefix the site-plan-only fill override is not this app\'s, so it goes (the Line scale stays)',
      tvPrefix.Viewport__ProjectedEdges, { Edges__Categories : { TrueVision__SitePlan__RedLine : { Category__LineTypeScale : 0.5 } } });

"""
t = t.replace(b, f + b)
open(p, 'w', encoding='utf-8', newline='\n').write(t)
print('patched')
