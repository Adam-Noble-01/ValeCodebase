// =============================================================================
// W1-27 scratch harness page (not shipped) - served at the app root of the tree under test as
// __w127_page__.mjs by browser_w1_27.mjs. Runs in headless Chromium against the REAL module graph of
// either tree (this app's live tree, or TrueVision's at the pin) with nothing stubbed:
//   1. INERT     the five Floor Areas modules are imported only after their dependencies have loaded and
//                settled; while they load nothing may be fetched, listened for, dispatched, logged, timed
//                or added to the page.
//   2. EXPORTS   each module's export names.
//   3. RUN       one scripted session through the real sheet model, records, drawing scale, viewport
//                rotation, config, chrome and drawing tools: the layer, Make / Unmake, Measure (viewport,
//                hidden layer, turned frame, sheet scale, fixed scale, the L, the figure of eight), the
//                groups and the index, the label primitives, the right-click menu and the Area tool.
// Results go to window.__W127 (read by the driver).
// =============================================================================

const R = window.__W127 = { done : false, phase : 'setup', steps : [], errors : [], counters : null };
const ROOT = new URL('./', import.meta.url).href;
const SRC  = ROOT + '02__Src__AppModules/';
const LE   = SRC + '51__System__LayoutEditor/';
const FA   = LE + '59__Feature__FloorAreas/';

// -----------------------------------------------------------------------------
// INSTRUMENTATION - installed before any app module is imported
// -----------------------------------------------------------------------------
const C = R.counters = { fetch : [], listen : [], dispatch : [], timers : {}, console : [], dom : {}, fromFloorAreas : [] };
const bump = (map, key) => { map[key] = (map[key] || 0) + 1; };
// WHO CALLED: a call whose stack passes through the Floor Areas folder is the five modules' own doing,
// whatever phase it lands in; anything else (a dependency's render loop, the harness's own sleep) is not.
const fromFloorAreas = (what) => {
    const stack = String(new Error().stack || '');
    if (stack.indexOf('/59__Feature__FloorAreas/') === -1) return false;
    C.fromFloorAreas.push({ phase : R.phase, what });
    return true;
};
const realFetch = window.fetch.bind(window);
window.fetch = function (input, init) {
    const url = String((input && (input.href || input.url)) || input);
    C.fetch.push({ phase : R.phase, url, mine : fromFloorAreas('fetch ' + url) });
    return realFetch(input, init);
};
const realAdd = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, fn, opts) {
    const target = this === window ? 'window' : (this === document ? 'document' : ((this && this.constructor && this.constructor.name) || '?'));
    C.listen.push({ phase : R.phase, type : String(type), target, mine : fromFloorAreas('listen ' + type) });
    return realAdd.call(this, type, fn, opts);
};
const realDispatch = EventTarget.prototype.dispatchEvent;
EventTarget.prototype.dispatchEvent = function (event) {
    if (this === window || this === document) {
        const d = event.detail || {};
        C.dispatch.push({ phase : R.phase, type : event.type, reason : d.reason === undefined ? null : d.reason, sheetId : d.sheetId || null, shapeId : d.shapeId || null,
                          mine : R.phase.startsWith('mine') ? fromFloorAreas('dispatch ' + event.type) : false });
    }
    return realDispatch.call(this, event);
};
for (const name of [ 'setTimeout', 'setInterval', 'requestAnimationFrame', 'queueMicrotask' ]) {
    const real = window[name].bind(window);
    window[name] = function (...args) { bump(C.timers, R.phase + ':' + name); if (R.phase.startsWith('mine')) fromFloorAreas(name); return real(...args); };
}
for (const level of [ 'log', 'info', 'warn', 'error' ]) {
    const real = console[level].bind(console);
    console[level] = function (...args) { C.console.push({ phase : R.phase, level, text : args.map((a) => (a && a.message) ? a.message : String(a)).join(' ').slice(0, 300) }); return real(...args); };
}
new MutationObserver((records) => { records.forEach((r) => { if (r.addedNodes && r.addedNodes.length) bump(C.dom, R.phase); }); })
    .observe(document.documentElement, { childList : true, subtree : true });

const tick  = () => new Promise((r) => setTimeout(r, 0));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v));
const round = (v, p) => (typeof v === 'number' && Number.isFinite(v)) ? Number(v.toFixed(p === undefined ? 6 : p)) : v;
const step = async (name, fn) => {
    R.phase = 'run:' + name;
    const before = C.dispatch.length;
    try { R[name] = J(await fn()); R.steps.push(name); }
    catch (e) { R[name] = { threw : String(e && e.message || e) }; R.errors.push(name + ': ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
    R[name + '__events'] = C.dispatch.slice(before).map((d) => d.type + (d.reason ? ':' + d.reason : ''));
};

(async () => {
    try {
        // ---------------------------------------------------------------------
        // 1. THE DEPENDENCIES FIRST, then let them settle
        // ---------------------------------------------------------------------
        R.phase = 'deps';
        // The sheet model first, as the app (and W1-26's harness) enters it: SheetRecords and the model's State
        // unit import each other, and entering the cycle at SheetRecords reads State's constants too early.
        const MODEL  = await import(LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__.js');
        const CFG    = await import(LE + '03__Core__Config/Na__LayoutEditor__ConfigState__.js');
        const REC    = await import(LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js');
        const SCALE  = await import(LE + '07__Core__SheetData/Na__LayoutEditor__DrawingScale__.js');
        const ROT    = await import(LE + '20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js');
        await import(LE + '35__System__DrawingTools/Na__LayoutEditor__ShapeTool__.js');
        await import(LE + '35__System__DrawingTools/Na__LayoutEditor__RectangleTool__.js');
        const CHROME = await import(LE + '10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js');
        const FONTS  = await import(LE + '60__Feature__PdfExport/Na__LayoutEditor__PdfFonts__.js');
        R.phase = 'deps-settle';
        await sleep(1500);

        // ---------------------------------------------------------------------
        // 2. THE FIVE MODULES, watched
        // ---------------------------------------------------------------------
        R.phase = 'mine';
        const GEO   = await import(FA + 'Na__LayoutEditor__FloorAreas__Geometry__.js');
        const AREA  = await import(FA + 'Na__LayoutEditor__FloorAreas__.js');
        const TOOL  = await import(FA + 'Na__LayoutEditor__FloorAreas__Tool__.js');
        const MENU  = await import(FA + 'Na__LayoutEditor__FloorAreas__Menu__.js');
        const PAINT = await import(FA + 'Na__LayoutEditor__FloorAreas__Paint__.js');
        R.phase = 'mine-settle';
        await sleep(1500);
        R.phase = 'after-import';
        const configUrl = FA + 'Na__LayoutEditor__FloorAreas__Config__.json';
        const configRequestedBeforeReady = performance.getEntriesByType('resource').some((e) => e.name.split('?')[0] === configUrl);
        R.inert = {
            fetch    : C.fetch.filter((e) => e.phase.startsWith('mine')),
            listen   : C.listen.filter((e) => e.phase.startsWith('mine')),
            dispatch : C.dispatch.filter((e) => e.phase.startsWith('mine')),
            timers   : Object.keys(C.timers).filter((k) => k.startsWith('mine')).reduce((o, k) => { o[k] = C.timers[k]; return o; }, {}),
            console  : C.console.filter((e) => e.phase.startsWith('mine')),
            dom      : (C.dom['mine'] || 0) + (C.dom['mine-settle'] || 0),
            configRequestedBeforeReady,
            fromFloorAreas : C.fromFloorAreas.slice(),                            // <-- every call so far whose stack passed through the five modules
            timersByPhase  : Object.assign({}, C.timers)                         // <-- the dependencies' own loops run in every phase alike
        };
        R.depsActivity = { fetch : C.fetch.filter((e) => e.phase.startsWith('deps')).length, listen : C.listen.filter((e) => e.phase.startsWith('deps')).length,
                           dispatch : C.dispatch.filter((e) => e.phase.startsWith('deps')).length, console : C.console.filter((e) => e.phase.startsWith('deps')) };
        R.exports = { geometry : Object.keys(GEO).sort(), areas : Object.keys(AREA).sort(), tool : Object.keys(TOOL).sort(), menu : Object.keys(MENU).sort(), paint : Object.keys(PAINT).sort() };

        // ---------------------------------------------------------------------
        // 3. THE SESSION
        // ---------------------------------------------------------------------
        await step('ready', async () => {
            await CFG.Na__LeCfg__Ready();
            let fonts = null;
            try { fonts = await FONTS.Na__LePdfFonts__EnsureLoaded(); } catch (e) { fonts = 'threw: ' + e.message; }
            const before = AREA.Na__LeArea__Value('Defaults', 'Defaults__FillOpacity', 0.5);
            const config = await AREA.Na__LeArea__Ready();
            const configFetches = C.fetch.filter((e) => e.url.split('?')[0] === configUrl).map((e) => e.phase);
            return { fontsLoaded : fonts, opacityBeforeReady : before, configLoaded : !!config,
                     layerName : AREA.Na__LeArea__Value('Layer', 'Layer__Name', '?'), opacity : AREA.Na__LeArea__Value('Defaults', 'Defaults__FillOpacity', 0.5),
                     suggestions : AREA.Na__LeArea__Value('Groups', 'Groups__Suggestions', []), units : AREA.Na__LeArea__Units(), configFetches,
                     scaleSetup : CFG.Na__LeCfg__GetScaleSetup() };
        });

        const layer = (id, name, type, order, visible) => ({ Layer__Id : id, Layer__Name : name, Layer__Type : type, Layer__Visible : visible !== false, Layer__Locked : false, Layer__Order : order });
        const shape = (id, points, extra) => Object.assign({ Shape__Id : id, Shape__Points : points, Shape__Closed : true, Shape__LayerId : 'Layer_004',
                                                             Shape__Stroked : true, Shape__StrokeColour : '#000000', Shape__StrokePt : 0.35 }, extra || {});
        const sheet = REC.Na__LeRec__NormaliseSheet({
            Sheet__Id : 'Sheet_901', Sheet__Name : 'Floor Areas Harness', Sheet__Order : 1, Sheet__PaperSize : 'A3', Sheet__Orientation : 'landscape', Sheet__Fields : {},
            Sheet__LayerStack : 2,
            Sheet__Layers : [ layer('Layer_002', 'Text', 'annotation', 1), layer('Layer_003', 'Dimensions', 'dimension', 2), layer('Layer_004', 'Vectors', 'vector', 3), layer('Layer_001', 'Viewports', 'viewport', 4) ],
            Sheet__Viewports : [
                { Viewport__Id : 'Viewport_001', Viewport__Kind : '2d', Viewport__Name : 'GROUND FLOOR PLAN', Viewport__ScaleDenominator : 50,
                  Viewport__FrameMm : { X : 20, Y : 20, WidthMm : 250, HeightMm : 200 }, Viewport__LayerId : 'Layer_001' },
                { Viewport__Id : 'Viewport_002', Viewport__Kind : '2d', Viewport__Name : 'SITE PLAN', Viewport__ScaleDenominator : 100,
                  Viewport__FrameMm : { X : 280, Y : 20, WidthMm : 120, HeightMm : 120 }, Viewport__LayerId : 'Layer_001' }
            ],
            Sheet__Shapes : [
                shape('Shape_001', [ [ 40, 40 ], [ 140, 40 ], [ 140, 100 ], [ 40, 100 ] ]),                                  // 100 x 60 mm: 15 m2 at 1:50
                shape('Shape_002', [ [ 150, 40 ], [ 190, 40 ], [ 190, 100 ], [ 250, 100 ], [ 250, 140 ], [ 150, 140 ] ]),    // an L: 6400 mm2, 16 m2 at 1:50
                shape('Shape_003', [ [ 40, 120 ], [ 100, 120 ], [ 40, 180 ], [ 100, 180 ] ]),                                // a figure of eight
                shape('Shape_004', [ [ 160, 150 ], [ 240, 150 ], [ 240, 210 ], [ 160, 210 ], [ 180, 165 ], [ 220, 165 ], [ 220, 195 ], [ 180, 195 ] ], { Shape__Holes : [ 4 ] }),
                shape('Shape_005', [ [ 300, 170 ], [ 350, 170 ] ], { Shape__Closed : false }),                                 // an open line
                shape('Shape_006', [ [ 290, 30 ], [ 390, 30 ], [ 390, 90 ], [ 290, 90 ] ]),                                   // 100 x 60 mm on the 1:100 site plan: 60 m2
                shape('Shape_007', [ [ 300, 200 ], [ 340, 200 ], [ 340, 240 ], [ 300, 240 ] ]),                               // off every drawing: the sheet's scale
                shape('Shape_008', [ [ 21, 21 ], [ 27, 21 ], [ 27, 27 ], [ 21, 27 ] ])                                        // the frame's corner: out of it once turned
            ]
        });
        const S = (id) => MODEL.Na__LeModel__GetShapeById(sheet, id);
        const layers = () => MODEL.Na__LeModel__GetLayers(sheet).map((l) => [ l.Layer__Name, l.Layer__Type, l.Layer__Visible ]);
        const measured = (id) => {
            const m = AREA.Na__LeArea__Measure(sheet, S(id));
            return { encloses : m.encloses, crossing : m.crossing, m2 : round(m.m2), perimeterM : round(m.perimeterM), denominator : m.denominator, source : m.source,
                     viewport : m.viewport ? m.viewport.Viewport__Id : null, home : { x : round(m.home.x, 4), y : round(m.home.y, 4), placement : m.home.placement },
                     labelAt : { x : round(m.labelAt.x, 4), y : round(m.labelAt.y, 4) }, centre : { x : round(m.centre.x, 3), y : round(m.centre.y, 3) } };
        };
        const shapeView = (id) => { const s = S(id); return s ? { area : s.Shape__Area || null, layer : (MODEL.Na__LeModel__GetLayerById(sheet, s.Shape__LayerId) || {}).Layer__Name || s.Shape__LayerId,
                                                                    closed : s.Shape__Closed, fill : s.Shape__FillColour === undefined ? null : s.Shape__FillColour,
                                                                    fillOpacity : s.Shape__FillOpacity === undefined ? null : s.Shape__FillOpacity, stroked : s.Shape__Stroked } : null; };
        const menu = (id) => MENU.Na__LeAreaMenu__ItemsFor(sheet, S(id), null).map((i) => i.separator ? '---' : (i.label + (i.checked ? ' [x]' : '') + (i.disabled ? ' (disabled)' : '')));

        await step('layer', () => {
            const before = { layerOf : AREA.Na__LeArea__LayerOf(sheet), shown : AREA.Na__LeArea__IsShown(sheet), locked : AREA.Na__LeArea__IsLocked(sheet), aboveDrawings : MODEL.Na__LeModel__LayerIndexAboveDrawings(sheet) };
            const made = AREA.Na__LeArea__EnsureLayer(sheet, { show : true });
            const again = AREA.Na__LeArea__EnsureLayer(sheet, { show : true });
            const fresh = REC.Na__LeRec__NormaliseSheet({ Sheet__Id : 'Sheet_902', Sheet__Name : 'Seeded', Sheet__Order : 2, Sheet__PaperSize : 'A3', Sheet__Orientation : 'landscape', Sheet__Fields : {} });
            const seeded = AREA.Na__LeArea__EnsureLayer(fresh, { show : true });
            return { before, made : made && { name : made.Layer__Name, type : made.Layer__Type }, sameAgain : !!made && !!again && made.Layer__Id === again.Layer__Id,
                     layers : layers(), seededSheet : seeded && { id : seeded.Layer__Id, name : seeded.Layer__Name }, seededLayers : MODEL.Na__LeModel__GetLayers(fresh).map((l) => l.Layer__Name) };
        });
        await step('make', () => ({
            names : [ 'Shape_001', 'Shape_002', 'Shape_003', 'Shape_006', 'Shape_007', 'Shape_008' ].map((id) => AREA.Na__LeArea__Make(sheet, id)),
            holed : AREA.Na__LeArea__Make(sheet, 'Shape_004'), open : AREA.Na__LeArea__Make(sheet, 'Shape_005'), twice : AREA.Na__LeArea__Make(sheet, 'Shape_001'),
            room : shapeView('Shape_001'), list : AREA.Na__LeArea__List(sheet).map((s) => s.Shape__Id), next : AREA.Na__LeArea__NextName(sheet)
        }));
        await step('measure', () => ({ room : measured('Shape_001'), ell : measured('Shape_002'), eight : measured('Shape_003'), site : measured('Shape_006'), off : measured('Shape_007'),
                                       sheetDenominator : SCALE.Na__LeDrawScale__SheetDenominator(sheet), label50 : SCALE.Na__LeDrawScale__Label(50) }));
        await step('hiddenViewports', () => {
            MODEL.Na__LeModel__UpdateLayer(sheet, 'Layer_001', { visible : false });
            const hidden = { room : measured('Shape_001'), site : measured('Shape_006'), drawScaleSays : (SCALE.Na__LeDrawScale__ViewportAt ? (SCALE.Na__LeDrawScale__ViewportAt(sheet, { x : 90, y : 70 }) || {}).Viewport__Id || null : 'n/a') };
            MODEL.Na__LeModel__UpdateLayer(sheet, 'Layer_001', { visible : true });
            return hidden;
        });
        await step('turnedFrame', () => {
            const vp = sheet.Sheet__Viewports[0];
            const level = { corner : (AREA.Na__LeArea__HostViewport(sheet, { x : 24, y : 24 }) || {}).Viewport__Id || null, room : measured('Shape_001').viewport, cornerRoom : measured('Shape_008').source };
            vp[ROT.Na__LeVpRot__FIELD || 'Viewport__RotationDeg'] = 30;
            const turned = { field : ROT.Na__LeVpRot__FIELD || null, corner : (AREA.Na__LeArea__HostViewport(sheet, { x : 24, y : 24 }) || {}).Viewport__Id || null,
                             room : measured('Shape_001'), cornerRoom : measured('Shape_008'), containsSays : ROT.Na__LeVpRot__Contains(vp, { x : 24, y : 24 }, 0) };
            delete vp[ROT.Na__LeVpRot__FIELD || 'Viewport__RotationDeg'];
            return { level, turned };
        });
        await step('fixedScale', () => {
            const set = AREA.Na__LeArea__Patch(sheet, 'Shape_001', { Area__ScaleDenominator : 20 });
            const fixed = measured('Shape_001');
            const cleared = AREA.Na__LeArea__Patch(sheet, 'Shape_001', { Area__ScaleDenominator : null });
            return { set, fixed, cleared, after : measured('Shape_001'), block : S('Shape_001').Shape__Area };
        });
        await step('groups', () => {
            const a = AREA.Na__LeArea__SetGroup(sheet, [ 'Shape_001' ], 'Ground Floor');
            const b = AREA.Na__LeArea__SetGroup(sheet, [ 'Shape_006' ], 'Outbuilding');
            const index = AREA.Na__LeArea__Index(sheet);
            return { a, b, groups : MODEL.Na__LeModel__GetAreaGroups(sheet), room : shapeView('Shape_001'), site : shapeView('Shape_006'),
                     index : { count : index.count, totalM2 : round(index.totalM2), crossings : index.crossings,
                               groups : index.groups.map((g) => [ g.name, g.colour, g.listed, round(g.m2), g.count ]),
                               ungrouped : [ round(index.ungrouped.m2), index.ungrouped.count ], rows : index.areas.map((r) => [ r.name, r.group, round(r.m2), r.source, r.denominator ]) } };
        });
        await step('paint', () => {
            const texts = (id) => { const list = []; const pushed = PAINT.Na__LeAreaPaint__Push(list, sheet, S(id));
                                    return { pushed, prims : list.map((p) => ({ kind : p.Kind, text : p.Text, x : round(p.X, 4), y : round(p.BaselineY, 4), fontMm : round(p.FontMm, 4), weight : p.Weight, colour : p.Colour, align : p.Align })) }; };
            const box = PAINT.Na__LeAreaPaint__LabelBox(sheet, S('Shape_001'));
            return { room : texts('Shape_001'), ell : texts('Shape_002'), eight : texts('Shape_003'), plain : texts('Shape_004'),
                     box : box && { X : round(box.X, 4), Y : round(box.Y, 4), W : round(box.WidthMm, 4), H : round(box.HeightMm, 4) },
                     measureProbe : round(CHROME.Na__LeChrome__MeasureTextMm('Area 1', 2.4, 600), 5) };
        });
        await step('menu', () => ({ room : menu('Shape_001'), ell : menu('Shape_002'), holed : menu('Shape_004'), open : menu('Shape_005'),
                                   plainClosed : (() => { const item = MODEL.Na__LeModel__CreateShape(sheet, [ [ 200, 230 ], [ 230, 230 ], [ 230, 250 ], [ 200, 250 ] ], { closed : true }); return item ? menu(item.Shape__Id) : 'no shape'; })() }));
        await step('unmake', () => ({ done : AREA.Na__LeArea__Unmake(sheet, 'Shape_003'), shape : shapeView('Shape_003'), list : AREA.Na__LeArea__List(sheet).map((s) => s.Shape__Id) }));
        await step('toolDefaults', () => {
            const d = TOOL.Na__LeAreaTool__Defaults(sheet, { strokeColour : '#000000', strokePt : 0.35, filled : false, fillColour : '#ffffff', dashOn : false });
            return Object.assign({}, d, { layerId : (MODEL.Na__LeModel__GetLayerById(sheet, d.layerId) || {}).Layer__Name || d.layerId });
        });
        await step('toolRectangle', async () => {
            const placed = [];
            const hear = (e) => placed.push(e.detail);
            window.addEventListener(TOOL.Na__LeAreaTool__PLACED_EVENT, hear);
            const before = sheet.Sheet__Shapes.length;
            TOOL.Na__LeAreaTool__SetRectangle(true);
            const pressed = TOOL.Na__LeAreaTool__Press(sheet, { x : 60, y : 230 }, false, { strokeColour : '#000000', strokePt : 0.35 }, 7);
            const drawing = TOOL.Na__LeAreaTool__IsDrawing();
            const typed = TOOL.Na__LeAreaTool__TypeSize(sheet, 30, 20);
            window.removeEventListener(TOOL.Na__LeAreaTool__PLACED_EVENT, hear);
            const landed = sheet.Sheet__Shapes.slice(before).map((s) => shapeView(s.Shape__Id));
            return { pressed, drawing, typed, landed, placed : placed.length, isRectangle : TOOL.Na__LeAreaTool__IsRectangle() };
        });
        await step('toolPoints', async () => {
            const placed = [];
            const hear = (e) => placed.push(e.detail);
            window.addEventListener(TOOL.Na__LeAreaTool__PLACED_EVENT, hear);
            const before = sheet.Sheet__Shapes.length;
            TOOL.Na__LeAreaTool__SetRectangle(false);
            const d = { strokeColour : '#000000', strokePt : 0.35 };
            const presses = [ [ 300, 250 ], [ 340, 250 ], [ 340, 280 ] ].map(([ x, y ]) => TOOL.Na__LeAreaTool__Press(sheet, { x, y }, false, d, 8));
            const finished = TOOL.Na__LeAreaTool__Finish(sheet);
            window.removeEventListener(TOOL.Na__LeAreaTool__PLACED_EVENT, hear);
            const landed = sheet.Sheet__Shapes.slice(before).map((s) => shapeView(s.Shape__Id));
            return { presses : presses.map((p) => !!p), finished, landed, placed : placed.length, drawingAfter : TOOL.Na__LeAreaTool__IsDrawing() };
        });
        await step('index', () => {
            const index = AREA.Na__LeArea__Index(sheet);
            return { count : index.count, totalM2 : round(index.totalM2), crossings : index.crossings, names : index.areas.map((r) => r.name) };
        });
    } catch (e) {
        R.errors.push('harness: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | '));
    }
    R.phase = 'done';
    R.sessionFromFloorAreas = C.fromFloorAreas.filter((e) => e.phase.startsWith('run:')).map((e) => e.phase + ' ' + e.what);
    R.counters = null;
    R.done = true;
})();
