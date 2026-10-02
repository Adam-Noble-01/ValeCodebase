// W2-36 probe: loads ONE panel (W236_PANEL) with every neighbour stubbed, runs ONE scenario (W236_SCENARIO)
// and prints what the panel did as JSON. Labels come from the AppConfig named by W236_CONFIG (the live
// ValeVision config by default), read the way Na__LeCfg__GetLabel reads them.
import { readFileSync } from 'node:fs';
import { installDom, El } from './fake_dom.mjs';

const PANEL    = process.env.W236_PANEL;
const SCENARIO = process.env.W236_SCENARIO;
const CONFIG   = JSON.parse(readFileSync(process.env.W236_CONFIG, 'utf8'));
const LABELS   = CONFIG.LayoutEditor__Labels__Config || {};

installDom();

// -------------------------------------------------------------------------- the model the stubs serve
const state = {
    sheet : { Sheet__Annotations : [], Sheet__Shapes : [], Sheet__Layers : [], Sheet__Dimensions : [] },
    selection : null,            // { kind, id } for one; null for several
    items : [],                  // [{ kind, id }]
    shapeDefaults : { strokeColour : '#172b3a', strokePt : 0.35, stroked : true, filled : false, fillColour : '#cfe3f5', fillOpacity : 1, strokeOpacity : 1, gradientOn : false, gradient : null, dashOn : false, dash : null },
    textDefaults : { sizeMm : 2.5, fontWeight : 400, colour : '#172b3a', align : 'left', leader : false, rotationDeg : 0 },
    compositeRows : []
};
const log = [];
const handlers = {};
const sections = [];

const getLabel = (key, fallback) => { const v = LABELS['LayoutEditor__Labels__' + key]; return typeof v === 'string' ? v : fallback; };
const impl = {
    // Config
    Na__LeCfg__GetLabel : getLabel,
    Na__LeCfg__FormatLabel : (key, fallback, tokens) => { let t = getLabel(key, fallback); Object.keys(tokens || {}).forEach((k) => { t = t.split('{' + k + '}').join(String(tokens[k])); }); return t; },
    Na__LeCfg__GetTextSetup : () => ({ minSizeMm : 1, maxSizeMm : 50, sizeStepMm : 0.5, allowedWeights : [ 300, 400, 600 ] }),
    Na__LeCfg__GetLineweightSetup : () => ({ minPt : 0.05, maxPt : 5, stepPt : 0.05 }),
    Na__LeCfg__GetShapeSetup : () => ({}),
    // Model
    Na__LeModel__GetActiveSheet : () => state.sheet,
    Na__LeModel__GetSelection : () => state.selection,
    Na__LeModel__GetSelectionItems : () => state.items.slice(),
    Na__LeModel__GetLayers : (sheet) => sheet.Sheet__Layers.slice(),
    Na__LeModel__LAYER_TYPES : [ 'viewport', 'annotation', 'dimension', 'vector', 'area', 'image', 'mixed' ],
    Na__LeModel__KIND_2D : '2d',
    Na__LeModel__GetSelectedViewport : () => null,
    Na__LeModel__UpdateShape : (...a) => { log.push([ 'UpdateShape', a[1], a[2] ]); },
    Na__LeModel__UpdateAnnotation : (...a) => { log.push([ 'UpdateAnnotation', a[1], a[2] ]); },
    // Tools
    Na__LeTools__GetShapeDefaults : () => state.shapeDefaults,
    Na__LeTools__SetShapeDefaults : (p) => { log.push([ 'SetShapeDefaults', p ]); },
    Na__LeTools__GetTextDefaults : () => state.textDefaults,
    Na__LeTools__SetTextDefaults : (p) => { log.push([ 'SetTextDefaults', p ]); },
    Na__LeText__WrapDeg : (d) => d,
    Na__LeMarkup__AnnotationRotationDeg : (a) => a.Annotation__RotationDeg || 0,
    // Render composites / force render
    Na__LeComposite__Rows : () => state.compositeRows,
    Na__LeComposite__Ready : () => Promise.resolve(),
    Na__LeComposite__Weight : (row) => row.weight.value,
    Na__LeComposite__IsOverridden : () => false,
    Na__LeForce__CHANGED_EVENT : 'na-le-force-changed',
    Na__LeForce__IsRunning : () => false,
    // Panel host
    Na__LePanels__RegisterSection : (column, spec) => { sections.push({ column, spec }); return true; },
    Na__LePanels__OnControl : (type, control, fn) => { handlers[type + '|' + control] = fn; },
    Na__LePanels__IsEditable : () => true,
    Na__LePanels__IsAdvanced : () => true,
    Na__LePanels__Refresh : (id) => { log.push([ 'Refresh', id ]); },
    Na__LePanels__SelectedOfKind : (sheet, kind) => (!sheet || !kind || state.items.length < 2) ? [] : state.items.filter((i) => i.kind === kind),
    Na__LePanels__ApplyToSelection : (sheet, kind, patch) => {
        const items = (!sheet || state.items.length < 2) ? [] : state.items.filter((i) => i.kind === kind);
        if (!items.length) return 0;
        log.push([ 'ApplyToSelection', kind, items.map((i) => i.id), patch ]);
        return items.length;
    },
    Na__LePanels__Row : (label, control, cls) => {
        const row = new El('label'); row.className = 'na-le-row' + (cls ? ' ' + cls : '');
        const cap = new El('span'); cap.className = 'na-le-row__label'; cap.textContent = label;
        row.appendChild(cap); row.appendChild(control); return row;
    },
    Na__LePanels__Input : (type, control) => { const e = new El('input'); e.type = type; e.setAttribute('data-na-control', control); return e; },
    Na__LePanels__Select : (control, options, value) => {
        const e = new El('select'); e.setAttribute('data-na-control', control); e.options = options; e.value = value === undefined ? '' : value; return e;
    },
    Na__LePanels__FillSelect : (el, options, value) => { el.options = options; el.value = value; },
    Na__LePanels__Button : (label, control, cls, role) => {
        const e = new El('button'); e.className = 'na-le-btn' + (cls ? ' ' + cls : ''); e.textContent = label;
        e.setAttribute('data-na-control', control); if (role !== undefined) e.setAttribute('data-na-role', role); return e;
    },
    Na__LePanels__Note : (text) => { const e = new El('p'); e.className = 'na-le-note'; e.textContent = text; return e; },
    Na__LePanels__SliderRow : (label, control) => { const row = new El('div'); row.className = 'na-le-row'; const i = new El('input'); i.setAttribute('data-na-control', control); row.appendChild(i); return row; },
    Na__LePanels__ShowSlider : () => {},
    Na__LePanels__AdvancedToggle : () => {}
};
globalThis.__W236 = {
    get(name) {
        if (Object.prototype.hasOwnProperty.call(impl, name)) return impl[name];
        if (/__[A-Z0-9_]+$/.test(name)) return name;                          // <-- An unlisted constant: its own name
        return (...args) => { log.push([ 'call', name ]); return undefined; };
    }
};

// -------------------------------------------------------------------------- run
const out = { scenario : SCENARIO, thrown : null, log, sections : [] };
const capture = { warn : [], error : [] };
console.warn  = (...a) => capture.warn.push(a.join(' '));
console.error = (...a) => capture.error.push(a.join(' '));

function body() { const b = new El('div'); b.className = 'na-le-section__body'; return b; }
const ann = (id, size) => ({ Annotation__Id : id, Annotation__SizeMm : size, Annotation__FontWeight : 400, Annotation__Colour : '#172b3a', Annotation__Align : 'left', Annotation__PosXMm : 10, Annotation__PosYMm : 10 });

try {
    const mod = await import(PANEL);
    const register = Object.keys(mod).find((k) => /__Register$/.test(k));
    mod[register]();
    out.sections = sections.map((s) => s.column + '|' + s.spec.id);
    const spec = sections[0].spec;

    if (SCENARIO === 'text-many' || SCENARIO === 'text-noneofkind' || SCENARIO === 'text-one') {
        state.sheet.Sheet__Annotations = [ ann('a1', 3.5), ann('a2', 5), ann('a3', 7) ];
        state.sheet.Sheet__Shapes = [ { Shape__Id : 's1', Shape__Points : [ [0,0], [1,1] ] }, { Shape__Id : 's2', Shape__Points : [ [0,0], [1,1] ] } ];
        if (SCENARIO === 'text-many') { state.items = [ { kind : 'annotation', id : 'a1' }, { kind : 'annotation', id : 'a2' }, { kind : 'annotation', id : 'a3' } ]; state.selection = null; }
        if (SCENARIO === 'text-noneofkind') { state.items = [ { kind : 'shape', id : 's1' }, { kind : 'shape', id : 's2' } ]; state.selection = null; }
        if (SCENARIO === 'text-one') { state.items = [ { kind : 'annotation', id : 'a2' } ]; state.selection = { kind : 'annotation', id : 'a2' }; }
        const b = body();
        spec.build(b); spec.refresh(b);
        out.sizeBox = b.querySelector('[data-na-control="text-size"]').value;
        out.note    = b.querySelector('[data-na-block="note"]').textContent;
        log.length = 0;
        const size = b.querySelector('[data-na-control="text-size"]'); size.value = '6';
        handlers['change|text-size']({}, size);
        out.writes = log.slice();
    }

    if (SCENARIO === 'shapes-edges-off') {
        state.sheet.Sheet__Shapes = [
            { Shape__Id : 'room', Shape__Points : [ [0,0], [10,0], [10,10], [0,10] ], Shape__Closed : true, Shape__FillColour : '#e6c7a0', Shape__Stroked : true },
            { Shape__Id : 'line', Shape__Points : [ [0,0], [10,0] ], Shape__Stroked : true }
        ];
        state.items = [ { kind : 'shape', id : 'room' }, { kind : 'shape', id : 'line' } ]; state.selection = null;
        const b = body();
        spec.build(b); spec.refresh(b);
        out.note = b.querySelector('[data-na-block="note"]').textContent;
        log.length = 0;
        handlers['change|shape-stroked']({}, { checked : false });
        out.writes = log.slice();
        // ONE vector selected is unchanged: the room alone, Edges off, still turns its fill on (the either-or rule)
        state.items = [ { kind : 'shape', id : 'room' } ]; state.selection = { kind : 'shape', id : 'room' };
        log.length = 0;
        handlers['change|shape-stroked']({}, { checked : false });
        out.writesOne = log.slice();
    }

    if (SCENARIO === 'shapes-picture') {
        state.sheet.Sheet__Shapes = [
            { Shape__Id : 'pic', Shape__Points : [ [0,0], [10,0], [10,10], [0,10] ], Shape__Closed : true, Shape__Image : { Image__Key : 'x' } },
            { Shape__Id : 'v1', Shape__Points : [ [0,0], [10,0], [10,10] ], Shape__Closed : true, Shape__FillColour : '#aabbcc' },
            { Shape__Id : 'v2', Shape__Points : [ [0,0], [10,0] ] }
        ];
        state.items = [ { kind : 'shape', id : 'pic' }, { kind : 'shape', id : 'v1' }, { kind : 'shape', id : 'v2' } ]; state.selection = null;
        const b = body();
        spec.build(b); spec.refresh(b);
        out.noteMixed = b.querySelector('[data-na-block="note"]').textContent;
        state.items = [ { kind : 'shape', id : 'pic' } ]; state.selection = { kind : 'shape', id : 'pic' };
        spec.refresh(b);
        out.notePicture = b.querySelector('[data-na-block="note"]').textContent;
    }

    if (SCENARIO === 'layers') {
        state.sheet.Sheet__Layers = [
            { Layer__Id : 'L1', Layer__Name : 'Viewports', Layer__Type : 'viewport', Layer__Visible : true },
            { Layer__Id : 'L2', Layer__Name : 'Hidden',    Layer__Type : 'vector',   Layer__Visible : false },
            { Layer__Id : 'L3', Layer__Name : 'Locked',    Layer__Type : 'annotation', Layer__Visible : true, Layer__Locked : true },
            { Layer__Id : 'L4', Layer__Name : 'Rooms',     Layer__Type : 'area',     Layer__Visible : true },
            { Layer__Id : 'L5', Layer__Name : 'Pictures',  Layer__Type : 'image',    Layer__Visible : true }
        ];
        const b = body();
        spec.build(b); spec.refresh(b);
        out.rows = b.querySelectorAll('[data-na-control="layer-eye"]').map((eye) => {
            const row = eye.parentNode;
            const lock = row.querySelector('[data-na-control="layer-lock"]');
            const type = row.querySelector('[data-na-control="layer-type"]');
            return { id : eye.getAttribute('data-na-role'), eye : eye.textContent, eyeClass : eye.className, eyePressed : eye.getAttribute('aria-pressed'),
                     lock : lock.textContent, lockClass : lock.className, lockPressed : lock.getAttribute('aria-pressed'),
                     typeLabel : (type.options.find((o) => o.value === type.value) || {}).label,
                     buttons : row.children.filter((c) => c.tagName === 'BUTTON').map((c) => c.getAttribute('data-na-control')) };
        });
        out.filterLabels = b.querySelector('[data-na-control="layer-filter"]').options.map((o) => o.value + '=' + o.label);
    }

    if (SCENARIO === 'styles') {
        state.compositeRows = [
            { key : 'projectedLinework', label : 'Projected Linework', toggle : true, weight : { kind : 'factor', min : 0, max : 4, step : 0.05, value : 1 } },
            { key : 'profileLinework',   label : 'Profile Linework',   toggle : true, weight : { kind : 'pixels', min : 0, max : 8, step : 0.5, value : 2 } },
            { key : 'enhance',           label : 'Enhance Whitecard',  toggle : true, weight : { kind : 'percent', min : 0, max : 100, step : 5, value : 100 } },
            { key : 'sectionOutline',    label : 'Section Outline',    toggle : false, weight : { kind : 'pixels', min : 0, max : 8, step : 0.5, value : 2 } }
        ];
        const b = body();
        spec.build(b);
        await Promise.resolve();
        spec.refresh(b);
        out.weights = b.querySelectorAll('[data-na-control="style-weight"]').map((input) => {
            const unit = input.parentNode.querySelector('.na-le-adv-unit');
            return { key : input.getAttribute('data-na-role'), title : input.title, unit : unit && unit.textContent, unitClass : unit && unit.className, clusterClass : input.parentNode.className };
        });
    }
} catch (error) {
    out.thrown = String(error && error.stack || error);
}
out.console = capture;
process.stdout.write(JSON.stringify(out));
