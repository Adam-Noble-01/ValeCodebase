// W3-12 scratch check: run the SHIPPED Dimensions and Vectors panels (imports stripped, as
// TrueVision's own tests load modules) against the REAL PanelHost row builders, the REAL
// DrawingScale, the REAL MarkupBridge value / format / sheet-pt functions, the REAL
// DimensionRounding and the REAL hatch module and library, with a small fake DOM. Proves the
// package's acceptance items that a browser would otherwise be needed for.
//
//   node w3_12_panels_check.test.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const VV   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D'
const SRC  = path.join(VV, '02__Src__AppModules')
const LE   = path.join(SRC, '51__System__LayoutEditor')
const LIB  = path.join(VV, '52__LayoutEditor__HatchPatternLibrary')
const CFG  = JSON.parse(fs.readFileSync(path.join(LE, '03__Core__Config/Na__LayoutEditor__AppConfig__.json'), 'utf8'))
const flat = {}; Object.values(CFG).forEach((block) => { if (block && typeof block === 'object') Object.assign(flat, block) })

let pass = 0, fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) console.log(`        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`)
}

function load (file, stubs, tag) {
  let src = fs.readFileSync(file, 'utf8')
  src = src.replace(/^[ \t]*import\s+(?:\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm, '')
  if (/^\s*import\s/m.test(src)) throw new Error('an import survived in ' + file)
  const tmp = path.join(os.tmpdir(), 'Na__W3_12__' + tag + '__.mjs')
  fs.writeFileSync(tmp, stubs + '\n' + src, 'utf8')
  return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2))
}

// -----------------------------------------------------------------------------
// A small DOM: enough for the PanelHost builders and the panels' selectors
// -----------------------------------------------------------------------------
class El {
  constructor (tag) { this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null; this.attrs = {}; this._cls = new Set(); this.style = {}; this.hidden = false; this.textContent = ''; this.title = ''; this._value = ''; this.checked = false; this.disabled = false; this.type = '' }
  get className () { return [...this._cls].join(' ') }
  set className (v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)) }
  get classList () { const s = this._cls; return { add : (...c) => c.forEach((x) => s.add(x)), remove : (...c) => c.forEach((x) => s.delete(x)), contains : (c) => s.has(c), toggle : (c, on) => { const want = on === undefined ? !s.has(c) : !!on; want ? s.add(c) : s.delete(c); return want } } }
  set innerHTML (v) { this.children = []; this._html = v }
  get value () { if (this.tagName === 'SELECT') return this._value; return this._value }
  set value (v) { this._value = String(v) }
  setAttribute (k, v) { this.attrs[k] = String(v) }
  getAttribute (k) { return k in this.attrs ? this.attrs[k] : null }
  appendChild (c) { c.parentNode = this; this.children.push(c); return c }
  addEventListener () {}
  select () {}
  blur () {}
  matches (sel) {
    const parts = sel.match(/\.[\w-]+|\[[^\]]+\]/g) || []
    return parts.every((p) => {
      if (p[0] === '.') return this._cls.has(p.slice(1))
      const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(p)
      if (!m) throw new Error('selector ' + sel)
      return m[2] === undefined ? m[1] in this.attrs : this.attrs[m[1]] === m[2]
    })
  }
  querySelectorAll (sel) { const out = []; const walk = (n) => n.children.forEach((c) => { if (c.matches(sel)) out.push(c); walk(c) }); walk(this); return out }
  querySelector (sel) { return this.querySelectorAll(sel)[0] || null }
  closest (sel) { let n = this; while (n) { if (n.matches && n.matches(sel)) return n; n = n.parentNode } return null }
}
globalThis.document = { createElement : (t) => new El(t), activeElement : null }
globalThis.window = { addEventListener () {}, dispatchEvent () {}, localStorage : null }

// -----------------------------------------------------------------------------
// The real PanelHost (its builders), DrawingScale, DimensionRounding and hatch module
// -----------------------------------------------------------------------------
const PH = await load(path.join(LE, '40__Ui__Panels/Na__LayoutEditor__PanelHost__.js'), `
  const Na__LeCfg__GetPanelSetup = () => ({ accordion : [], collapseOthers : false });
  const Na__LeModel__GetSelectionItems = () => [];
  const Na__LeGroup__Expand = (s, i) => i;
  const Na__LeDrop__ApplyMany = () => ({ written : 0 });
  const Na__ColourPalette__Attach = () => {};
`, 'PanelHost')
globalThis.__PH = PH

const SCALE = { defaultDenominator : flat.LayoutEditor__Scales__DefaultScaleDenominator, labelPrefix : '1:' }
const DS = await load(path.join(LE, '07__Core__SheetData/Na__LayoutEditor__DrawingScale__.js'), `
  const Na__LeCfg__GetScaleSetup = () => (${JSON.stringify(SCALE)});
  const Na__LeModel__KIND_2D = '2d';
  const Na__LeModel__GetViewportById = (sheet, id) => (sheet.Sheet__Viewports || []).find((v) => v.Viewport__Id === id) || null;
  const Na__LeHandles__Contains = () => false;
  const Na__LeHandles__FrontToBack = (sheet) => sheet.Sheet__Viewports || [];
`, 'DrawScale')
globalThis.__DS = DS
const RND = await import(pathToFileURL(path.join(LE, '15__Core__Markup/Na__LayoutEditor__DimensionRounding__.js')).href).catch(async () => load(path.join(LE, '15__Core__Markup/Na__LayoutEditor__DimensionRounding__.js'), '', 'Round'))
globalThis.__RND = RND

globalThis.fetch = async (url) => {
  const rel = decodeURIComponent(String(url)).split('52__LayoutEditor__HatchPatternLibrary/')[1]
  if (!rel) return { ok : false, status : 404 }
  const file = path.join(LIB, ...rel.split('/'))
  if (!fs.existsSync(file)) return { ok : false, status : 404 }
  return { ok : true, status : 200, json : async () => JSON.parse(fs.readFileSync(file, 'utf8')) }
}
const logWas = console.log; console.log = () => {}
const H = await load(path.join(LE, '36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js'), '', 'Hatch')
await H.Na__LeHatch__Ready()
console.log = logWas
globalThis.__H = H

// The MarkupBridge's own value, format and sheet-pt functions, run from their shipped text
const MB = fs.readFileSync(path.join(LE, '15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js'), 'utf8')
const fnText = (name) => { const at = MB.indexOf('function ' + name + '('); let d = 0; for (let i = MB.indexOf('{', at); i < MB.length; i++) { if (MB[i] === '{') d++; else if (MB[i] === '}') { d--; if (d === 0) return MB.slice(at, i + 1) } } throw new Error(name) }
const DIM_SETUP = { minTextSizeMm : 1, maxTextSizeMm : 20, minTickLengthMm : 0.5, maxTickLengthMm : 10, terminators : ['tick', 'arrow', 'dot'],
  roundUpStepMm : flat.LayoutEditor__Dimensions__RoundUpStepMm, roundUpMarker : flat.LayoutEditor__Dimensions__RoundUpMarker, thousandsSep : flat.LayoutEditor__Dimensions__ThousandsSeparator, tickLengthMm : 2 }
globalThis.__DIM_SETUP = DIM_SETUP
const MBFN = new Function(`
  const Na__LeCfg__GetDimensionSetup = () => globalThis.__DIM_SETUP;
  const Na__LeDimRound__Up = (...a) => globalThis.__RND.Na__LeDimRound__Up(...a);
  const Na__LeDrawScale__DimensionDenominator = (...a) => globalThis.__DS.Na__LeDrawScale__DimensionDenominator(...a);
  const Na__LeDimGeo__SpanMm = (a, b, o) => o === 'horizontal' ? Math.abs(b.x - a.x) : (o === 'vertical' ? Math.abs(b.y - a.y) : Math.hypot(b.x - a.x, b.y - a.y));
  ${fnText('Na__LeMarkup__DimensionValueMm')}
  ${fnText('Na__LeMarkup__FormatDimension')}
  ${fnText('Na__LeMarkup__SheetDimensionPt')}
  return { Na__LeMarkup__DimensionValueMm, Na__LeMarkup__FormatDimension, Na__LeMarkup__SheetDimensionPt };
`)()
globalThis.__MB = MBFN

// -----------------------------------------------------------------------------
// The editor state the panels read: one sheet, a selection, the tool defaults
// -----------------------------------------------------------------------------
const state = {
  sheet : null, selection : null, items : [],
  dimDefaults : { textSizeMm : 2.5, colour : '#172b3a', terminator : 'tick', tickLengthMm : 2, offsetMm : 8, precision : 0, unitsSuffix : '', atScale : true, roundUp : false, linePt : null, dashOn : false, dash : { kind : 'dashed' }, startExtensionMm : null, endExtensionMm : null, extensionsLinked : true },
  shapeDefaults : { strokeColour : '#172b3a', strokePt : 0.35, stroked : true, filled : false, fillColour : '#e4e8ec', atScale : true, hatchOn : false, hatch : { Hatch__PatternKey : '', Hatch__Scale : 1, Hatch__RotationDeg : 0 } },
  handlers : new Map(), sections : new Map(), updates : []
}
globalThis.__S = state
const DIM_KEYS = { textSizeMm : 'Dimension__TextSizeMm', colour : 'Dimension__Colour', atScale : 'Dimension__AtScale', roundUp : 'Dimension__RoundUp', linePt : 'Dimension__LinePt', dash : 'Dimension__LineStyle', startExtensionMm : 'Dimension__StartExtensionMm', endExtensionMm : 'Dimension__EndExtensionMm', extensionsLinked : 'Dimension__ExtensionsLinked', overrideText : 'Dimension__OverrideText' }
globalThis.__UPDDIM = (sheet, id, patch) => { state.updates.push(patch); const d = sheet.Sheet__Dimensions.find((x) => x.Dimension__Id === id); Object.keys(patch).forEach((k) => { if (DIM_KEYS[k]) d[DIM_KEYS[k]] = patch[k] }) }
globalThis.__UPDSHAPE = (sheet, id, patch) => { state.updates.push(patch); const s = sheet.Sheet__Shapes.find((x) => x.Shape__Id === id); if ('hatch' in patch) s.Shape__Hatch = patch.hatch ? Object.assign({}, s.Shape__Hatch, patch.hatch) : null }

const COMMON = `
  const Na__LeCfg__GetLabel = (k, f) => f;
  const Na__LeCfg__FormatLabel = (k, f, v) => String(f).replace(/\\{(\\w+)\\}/g, (m, n) => (v && n in v) ? v[n] : m);
  const Na__LeCfg__GetDimensionSetup = () => globalThis.__DIM_SETUP;
  const Na__LeCfg__GetLineweightSetup = () => ({ minPt : ${flat.LayoutEditor__Lineweights__MinPt}, maxPt : 5, stepPt : 0.05, dimensionPt : ${flat.LayoutEditor__Lineweights__DimensionPt} });
  const Na__LeCfg__GetShapeSetup = () => ({ transparentEdgeOpacity : 0.5 });
  const Na__LeModel__GetActiveSheet = () => globalThis.__S.sheet;
  const Na__LeModel__GetSelection = () => globalThis.__S.selection;
  const Na__LeModel__GetSelectionItems = () => globalThis.__S.items;
  const Na__LeModel__UpdateDimension = (...a) => globalThis.__UPDDIM(...a);
  const Na__LeModel__UpdateShape = (...a) => globalThis.__UPDSHAPE(...a);
  const Na__LeMarkup__DimensionValueMm = (...a) => globalThis.__MB.Na__LeMarkup__DimensionValueMm(...a);
  const Na__LeMarkup__FormatDimension = (...a) => globalThis.__MB.Na__LeMarkup__FormatDimension(...a);
  const Na__LeMarkup__SheetDimensionPt = (...a) => globalThis.__MB.Na__LeMarkup__SheetDimensionPt(...a);
  const Na__LeMarkup__DimensionTickMm = (d) => d.Dimension__TickLengthMm || 2;
  const Na__LeDash__BuildRows = () => {}; const Na__LeDash__RefreshRows = () => {}; const Na__LeDash__RegisterControls = () => {};
  const Na__LeGrad__BuildRows = () => {}; const Na__LeGrad__RefreshRows = () => {}; const Na__LeGrad__RegisterControls = () => {};
  const Na__LeSurface__Refresh = () => {};
  const Na__LeTools__GetDimensionDefaults = () => globalThis.__S.dimDefaults;
  const Na__LeTools__SetDimensionDefaults = (p) => Object.assign(globalThis.__S.dimDefaults, p);
  const Na__LeTools__GetShapeDefaults = () => globalThis.__S.shapeDefaults;
  const Na__LeTools__SetShapeDefaults = (p) => Object.assign(globalThis.__S.shapeDefaults, p);
  const Na__LeDrawScale__SheetDenominator = (...a) => globalThis.__DS.Na__LeDrawScale__SheetDenominator(...a);
  const Na__LeDrawScale__DimensionHost = (...a) => globalThis.__DS.Na__LeDrawScale__DimensionHost(...a);
  const Na__LeDrawScale__DimensionAtScale = (...a) => globalThis.__DS.Na__LeDrawScale__DimensionAtScale(...a);
  const Na__LeDrawScale__Label = (...a) => globalThis.__DS.Na__LeDrawScale__Label(...a);
  const Na__LeMeasure__Refresh = () => {};
  const Na__LeHatch__Get = (...a) => globalThis.__H.Na__LeHatch__Get(...a);
  const Na__LeHatch__GetPacks = (...a) => globalThis.__H.Na__LeHatch__GetPacks(...a);
  const Na__LeHatch__ClampScale = (...a) => globalThis.__H.Na__LeHatch__ClampScale(...a);
  const Na__LeHatch__ClampRotation = (...a) => globalThis.__H.Na__LeHatch__ClampRotation(...a);
  const Na__LeHatch__ClampStrokePt = (...a) => globalThis.__H.Na__LeHatch__ClampStrokePt(...a);
  const Na__LeHatch__CleanColour = (...a) => globalThis.__H.Na__LeHatch__CleanColour(...a);
  const Na__LeHatch__StandardStrokePt = (...a) => globalThis.__H.Na__LeHatch__StandardStrokePt(...a);
  const Na__LeHatch__StandardColour = (...a) => globalThis.__H.Na__LeHatch__StandardColour(...a);
  const Na__LePanels__RegisterSection = (side, spec) => { globalThis.__S.sections.set(spec.id, spec); return spec; };
  const Na__LePanels__OnControl = (t, n, h) => globalThis.__S.handlers.set(t + ':' + n, h);
  const Na__LePanels__Refresh = (id) => globalThis.__REFRESH(id);
  const Na__LePanels__SelectedOfKind = () => [];
  const Na__LePanels__ApplyToSelection = () => 0;
  const Na__LePanels__Row = (...a) => globalThis.__PH.Na__LePanels__Row(...a);
  const Na__LePanels__Input = (...a) => globalThis.__PH.Na__LePanels__Input(...a);
  const Na__LePanels__Select = (...a) => globalThis.__PH.Na__LePanels__Select(...a);
  const Na__LePanels__FillSelect = (...a) => globalThis.__PH.Na__LePanels__FillSelect(...a);
  const Na__LePanels__Button = (...a) => globalThis.__PH.Na__LePanels__Button(...a);
  const Na__LePanels__Note = (...a) => globalThis.__PH.Na__LePanels__Note(...a);
  const Na__LePanels__SliderRow = (...a) => globalThis.__PH.Na__LePanels__SliderRow(...a);
  const Na__LePanels__ShowSlider = (...a) => globalThis.__PH.Na__LePanels__ShowSlider(...a);
  const Na__LePanels__LinkedPairRow = (...a) => globalThis.__PH.Na__LePanels__LinkedPairRow(...a);
  const Na__LePanels__ShowLink = (...a) => globalThis.__PH.Na__LePanels__ShowLink(...a);
`
const DIMS   = await load(path.join(LE, '40__Ui__Panels/Na__LayoutEditor__Panel__Dimensions__.js'), COMMON, 'Dims')
const SHAPES = await load(path.join(LE, '40__Ui__Panels/Na__LayoutEditor__Panel__Shapes__.js'), COMMON, 'Shapes')
DIMS.Na__LePanelDims__Register(); SHAPES.Na__LePanelShapes__Register()
const bodies = {}
for (const [id, spec] of state.sections) { bodies[id] = new El('div'); spec.build(bodies[id]) }
globalThis.__REFRESH = (id) => { for (const [sid, spec] of state.sections) if (!id || id === sid) spec.refresh(bodies[sid]) }
const fire = (type, name, el) => state.handlers.get(type + ':' + name)({ key : '' }, el)
const ctl  = (body, name) => body.querySelector('[data-na-control="' + name + '"]')

// -----------------------------------------------------------------------------
// Dimensions
// -----------------------------------------------------------------------------
const D = bodies.dimensions
// A 1,201 mm dimension off every viewport on a 1:50 sheet: 24.02 mm of paper
state.sheet = { Sheet__Id : 'sh1', Sheet__Viewports : [], Sheet__Dimensions : [
  { Dimension__Id : 'd1', Dimension__StartXMm : 10, Dimension__StartYMm : 10, Dimension__EndXMm : 34.02, Dimension__EndYMm : 10, Dimension__Precision : 0, Dimension__UnitsSuffix : '', Dimension__AtScale : true } ],
  Sheet__Shapes : [], Sheet__Lineweights : { DimensionPt : 0.35 } }
state.selection = { kind : 'dimension', id : 'd1' }; state.items = [{ kind : 'dimension', id : 'd1' }]
globalThis.__REFRESH('dimensions')
const valueLine = () => D.querySelector('[data-na-block="value"]').textContent
check('Measure at scale is the first control and quotes the sheet scale', [D.children[1].querySelector('[data-na-control]').getAttribute('data-na-control'), D.children[1].querySelector('.na-le-row__label').textContent], ['dim-at-scale', 'Measure at scale (1:50)'])
check('at scale, a 24.02 mm paper span off every viewport measures 1,201 at the sheet\'s 1:50, and says so', valueLine(), "Measures 1,201 (at the sheet's scale, 1:50)")
ctl(D, 'dim-at-scale').checked = false; fire('change', 'dim-at-scale', ctl(D, 'dim-at-scale'))
check('Measure at scale unticked: the record takes Dimension__AtScale false', state.sheet.Sheet__Dimensions[0].Dimension__AtScale, false)
check('and the Measures line reads paper millimetres and says so', valueLine(), 'Measures 24 (paper, not attached to a viewport)')
state.sheet.Sheet__Viewports = [{ Viewport__Id : 'v1', Viewport__Kind : '2d', Viewport__ScaleDenominator : 50, Viewport__FrameMm : { XMm : 0, YMm : 0, WidthMm : 100, HeightMm : 100 } }]
state.sheet.Sheet__Dimensions[0].Dimension__ViewportId = 'v1'
globalThis.__REFRESH('dimensions')
check('on a viewport, unticked, it says (paper millimetres)', valueLine(), 'Measures 24 (paper millimetres)')
ctl(D, 'dim-at-scale').checked = true; fire('change', 'dim-at-scale', ctl(D, 'dim-at-scale'))
check('ticked again on its viewport it reads the drawing, with nothing added', valueLine(), 'Measures 1,201')
// Round up
ctl(D, 'dim-round-up').checked = true; fire('change', 'dim-round-up', ctl(D, 'dim-round-up'))
check('Round up: the record takes Dimension__RoundUp', state.sheet.Sheet__Dimensions[0].Dimension__RoundUp, true)
check('a 1,201 mm dimension shows 1,205* (the sheet text) and the Measures line keeps the exact figure',
  [MBFN.Na__LeMarkup__FormatDimension(state.sheet.Sheet__Dimensions[0], MBFN.Na__LeMarkup__DimensionValueMm(state.sheet, state.sheet.Sheet__Dimensions[0])), valueLine()],
  ['1,205*', 'Measures 1,201 - shown rounded up as 1,205*'])
// Line pt
check('Line pt with none of its own shows the sheet\'s Dimension pt', ctl(D, 'dim-line-pt').value, '0.35')
ctl(D, 'dim-line-pt').value = '0.5'; fire('change', 'dim-line-pt', ctl(D, 'dim-line-pt'))
check('a typed weight is the dimension\'s own', [state.sheet.Sheet__Dimensions[0].Dimension__LinePt, ctl(D, 'dim-line-pt').value], [0.5, '0.5'])
ctl(D, 'dim-line-pt').value = ''; fire('change', 'dim-line-pt', ctl(D, 'dim-line-pt'))
check('an emptied Line pt field means the sheet\'s Dimension pt again (null stored, the sheet pt shown)', [state.sheet.Sheet__Dimensions[0].Dimension__LinePt, ctl(D, 'dim-line-pt').value], [null, '0.35'])
state.sheet.Sheet__Lineweights.DimensionPt = 0.25; globalThis.__REFRESH('dimensions')
check('and follows the sheet when the sheet changes', ctl(D, 'dim-line-pt').value, '0.25')
// Ext. lines padlock
const link = ctl(D, 'dim-ext-link')
check('Ext. lines start shut (linked)', link.classList.contains('is-linked'), true)
ctl(D, 'dim-ext-start').value = '3'; fire('change', 'dim-ext-start', ctl(D, 'dim-ext-start'))
check('shut, typing Start sets both', [state.sheet.Sheet__Dimensions[0].Dimension__StartExtensionMm, state.sheet.Sheet__Dimensions[0].Dimension__EndExtensionMm, ctl(D, 'dim-ext-end').value], [3, 3, '3'])
fire('click', 'dim-ext-link', link)
check('the padlock opens', [state.sheet.Sheet__Dimensions[0].Dimension__ExtensionsLinked, link.classList.contains('is-linked')], [false, false])
ctl(D, 'dim-ext-end').value = '6'; fire('change', 'dim-ext-end', ctl(D, 'dim-ext-end'))
check('open, each keeps its own length', [state.sheet.Sheet__Dimensions[0].Dimension__StartExtensionMm, state.sheet.Sheet__Dimensions[0].Dimension__EndExtensionMm], [3, 6])
fire('click', 'dim-ext-link', link)
check('shutting it again gives End the Start length', [state.sheet.Sheet__Dimensions[0].Dimension__ExtensionsLinked, state.sheet.Sheet__Dimensions[0].Dimension__EndExtensionMm, link.classList.contains('is-linked')], [true, 3, true])
// Nothing selected: the settings for new dimensions
state.selection = null; state.items = []
globalThis.__REFRESH('dimensions')
ctl(D, 'dim-at-scale').checked = false; fire('change', 'dim-at-scale', ctl(D, 'dim-at-scale'))
check('nothing selected, Measure at scale sets the new-dimension default', state.dimDefaults.atScale, false)

// -----------------------------------------------------------------------------
// Vectors: the hatch
// -----------------------------------------------------------------------------
const S = bodies.shapes
state.sheet.Sheet__Shapes = [{ Shape__Id : 's1', Shape__Points : [[0, 0], [40, 0], [40, 30], [0, 30]], Shape__Closed : true, Shape__Stroked : true, Shape__StrokeColour : '#2F6B33', Shape__StrokePt : 0.35, Shape__FillColour : null, Shape__Hatch : null }]
state.selection = { kind : 'shape', id : 's1' }; state.items = [{ kind : 'shape', id : 's1' }]
globalThis.__REFRESH('shapes')
check('Draw at scale is the first control and quotes the sheet\'s scale', [S.children[1].querySelector('[data-na-control]').getAttribute('data-na-control'), S.children[1].querySelector('.na-le-row__label').textContent], ['shape-at-scale', 'Draw at scale (1:50)'])
check('a closed vector offers the Hatch toggle, off, with its rows hidden', [ctl(S, 'shape-hatch-on').parentNode.hidden, ctl(S, 'shape-hatch-on').checked, S.querySelector('[data-na-block="shape-hatch-pattern-row"]').hidden], [false, false, true])
ctl(S, 'shape-hatch-on').checked = true; fire('change', 'shape-hatch-on', ctl(S, 'shape-hatch-on'))
check('ticking Hatch on a closed vector picks Brickwork first', state.sheet.Sheet__Shapes[0].Shape__Hatch && state.sheet.Sheet__Shapes[0].Shape__Hatch.Hatch__PatternKey, 'ConstructionHatch__Brickwork')
globalThis.__REFRESH('shapes')
check('the pattern list shows it chosen, Construction Materials first', [ctl(S, 'shape-hatch-pattern').value, /^Brickwork .*\(Construction Materials\)$/.test(ctl(S, 'shape-hatch-pattern').children[1].textContent)], ['ConstructionHatch__Brickwork', true])
check('Pattern line pt and colour show the standard, and Standard is hidden until one is set',
  [ctl(S, 'shape-hatch-pt').value, ctl(S, 'shape-hatch-colour').value, S.querySelector('[data-na-block="shape-hatch-standard-row"]').hidden], ['0.25', '#2F6B33', true])
ctl(S, 'shape-hatch-pt').value = '0.5'; fire('change', 'shape-hatch-pt', ctl(S, 'shape-hatch-pt')); globalThis.__REFRESH('shapes')
check('a typed Pattern line pt is stored and brings Standard up', [state.sheet.Sheet__Shapes[0].Shape__Hatch.Hatch__StrokePt, S.querySelector('[data-na-block="shape-hatch-standard-row"]').hidden], [0.5, false])
fire('click', 'shape-hatch-standard', null); globalThis.__REFRESH('shapes')
check('Standard puts both back', [state.sheet.Sheet__Shapes[0].Shape__Hatch.Hatch__StrokePt, state.sheet.Sheet__Shapes[0].Shape__Hatch.Hatch__Colour], [null, null])
state.sheet.Sheet__Shapes.push({ Shape__Id : 's2', Shape__Points : [[0, 0], [40, 0]], Shape__Closed : false, Shape__Stroked : true, Shape__StrokeColour : '#172b3a', Shape__StrokePt : 0.35 })
state.selection = { kind : 'shape', id : 's2' }; globalThis.__REFRESH('shapes')
check('a two-point line has no Hatch row', ctl(S, 'shape-hatch-on').parentNode.hidden, true)
ctl(S, 'shape-at-scale').checked = false; fire('change', 'shape-at-scale', ctl(S, 'shape-at-scale'))
check('Draw at scale goes to the drawing tools\' setting, never the shape', [state.shapeDefaults.atScale, 'Shape__AtScale' in state.sheet.Sheet__Shapes[1]], [false, false])

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
