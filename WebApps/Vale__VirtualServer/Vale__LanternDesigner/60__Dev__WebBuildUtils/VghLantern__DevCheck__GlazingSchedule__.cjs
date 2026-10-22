// Proves the glazing schedule (v0.10.0): the coded plan and the panel table with
// a cut drawing per panel type, on the Specification tab and as the pack's own
// Glazing Schedule page per lantern.
//
// Adam, 20-Oct-2026: "Ensure these arent generated until that tab is entered
// though as to not waste compute so only compute the glass panel drawings diagram
// and table when the specf section opens and as a failsafe when the end pack is
// compiled". So the first thing checked is that nothing builds a schedule early,
// counted by the schedule module's own BuildCount.
//
// THE APP'S OWN MODULES RUN. The geometry, the system loaders (reading their
// indexes from disk), the specification document model, the section manager, the
// renderer, Preview and Send's page plan, issue handler, preview renderer and PDF
// painter all load into one sandbox with the real config files. Config is read
// through strict Require readers that record every key they cannot find, so a
// missing config value fails the check rather than quietly reading as zero.
//
// SIX THINGS ARE ASSERTED
//
//   NOTHING BUILDS EARLY       loading, the document model, the static describe
//                              the issue check uses and a pack with the switch off
//                              build no schedule; the tab builds one per lantern,
//                              once, and an edit rebuilds only the lantern it moved
//   THE TABLE IS THE LAYOUT    one row per panel type in code order, quantities
//                              that add up, sizes rounded DOWN to the millimetre
//   THE PLAN CODES EVERY PANE  one bubble per panel, inside its own panel
//   THE DRAWINGS ARE SOUND     inside their cell, every cut edge labelled outside
//                              the glass, every corner that is not square marked
//   THE BUILD-UPS READ RIGHT   thickness and cavity from the provisional table,
//                              TBC and a warning for a spec with none
//   PREVIEW AND PDF AGREE      the same pages, the same rows on each, the header
//                              on every page, nothing below the footer reserve
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const APP = path.join(__dirname, '..');
const MOD = path.join(APP, '02__Src__AppModules');
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));

const mainConfig  = readJson(path.join(MOD, '02__AppData/VghLantern__AppConfig__Main__.json'));
const specConfig  = readJson(path.join(MOD, '35__System__SpecificationMode/Na__Specification__Config.json')).VghLantern__Specification__Config;
const docConfig   = readJson(path.join(MOD, '40__System__DocumentPreviewMode/Na__DocPreview__Config.json')).VghLantern__DocPreview__Config;
const appConfig   = Object.assign({}, mainConfig,
    readJson(path.join(MOD, '02__AppData/Na__PbrMaterials__Config.json')),
    readJson(path.join(MOD, '06__Env3d__ThreeRenderPipeline/Na__Env3d__Config.json')));
const glazingCfg  = specConfig.VghLantern__Specification__Config__GlazingSchedule;

const FILES = [
    '02__AppData/VghLantern__AppData__AssetRegistry__.js',
    '02__AppData/VghLantern__AppData__RidgeHipDepthTable__.js',
    '02__AppData/VghLantern__AppData__GlazeBarSystemLoader__.js',
    '02__AppData/VghLantern__AppData__BaseFrameSystemLoader__.js',
    '02__AppData/VghLantern__AppData__RidgeSystemLoader__.js',
    '02__AppData/VghLantern__AppData__HipSystemLoader__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__RoofPitchCalculator__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__BaseFrameAssembly__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__SkeletonSolver__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__GlazeBarLayout__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__GlazeBarAssembly__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__SectionLoopBuilder__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__StretchTools__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__RidgeAssembly__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__HipAssembly__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__QuantityTakeoff__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__GlazingPanelLayout__.js',
    '35__System__SpecificationMode/VghLantern__Specification__DocumentModel__.js',
    '35__System__SpecificationMode/VghLantern__Specification__TakeoffTableRenderer__.js',
    '35__System__SpecificationMode/VghLantern__Specification__ScheduleRenderer__.js',
    '35__System__SpecificationMode/VghLantern__Specification__GlazingSchedule__.js',
    '35__System__SpecificationMode/VghLantern__Specification__GlazingScheduleRenderer__.js',
    '35__System__SpecificationMode/VghLantern__Specification__JobNotes__.js',
    '35__System__SpecificationMode/VghLantern__Specification__SectionManager__.js',
    '40__System__DocumentPreviewMode/VghLantern__DocPreview__DocumentState__.js',
    '40__System__DocumentPreviewMode/VghLantern__DocPreview__DocIssueHandler__.js',
    '40__System__DocumentPreviewMode/VghLantern__DocPreview__PrintDocumentRenderer__.js',
    '40__System__DocumentPreviewMode/VghLantern__DocPreview__SpecificationPdfPainter__.js'
];

// -- Strict config, a project, and the sandbox -------------------------------
const missingKeys = new Set();
const strict = (type, empty) => (block, key, label) => {
    const value = block ? block[key] : undefined;
    const ok = type === 'array' ? Array.isArray(value) : typeof value === type;
    if (!ok) { missingKeys.add(`${label || '?'} -> ${key}`); return empty; }
    return value;
};
const SECTIONS = {
    Specification  : specConfig,
    DocPreview     : docConfig,
    GlazingOptions : mainConfig.VghLantern__Glazing__Options__Config
};

function lanternOf(o) {
    return {
        Lantern__Identity__Config: { Lantern__Identity__Config__Title: o.title, Lantern__Identity__Config__Reference: o.ref || '' },
        Lantern__Form__Config: { Lantern__Form__Config__RoofForm: o.form || 'Hipped Ridge' },
        Lantern__Dimensions__Config: { Lantern__Dimensions__Config__WidthMm: o.w, Lantern__Dimensions__Config__DepthMm: o.d },
        Lantern__RoofPitch__Config: { Lantern__RoofPitch__Config__PitchDegrees: o.p },
        Lantern__BuildersUpstandAndBase__Config: { Lantern__BuildersUpstandAndBase__Config__UpstandHeightMm: 150,
                                                   Lantern__BuildersUpstandAndBase__Config__UpstandThicknessMm: 110 },
        Lantern__GlazingBars__Config: { Lantern__GlazingBars__Config__SetOutMode: o.mode || 'Mode01',
                                        Lantern__GlazingBars__Config__TargetSpacingMm: o.s || 390,
                                        Lantern__GlazingBars__Config__HorizontalTransomEnabled: !!o.transom },
        Lantern__FinishAndGlazing__Config: { Lantern__FinishAndGlazing__Config__GlazingSpec: o.spec || 'Double Glazed Toughened',
                                             Lantern__FinishAndGlazing__Config__GlazingTint: o.tint || 'Clear' }
    };
}

const project = {
    VghLantern__ProjectFile__Metadata: {
        VghLantern__ProjectFile__Metadata__ProjectCode: 'VGH-CHECK',
        VghLantern__ProjectFile__Metadata__ProjectName: 'Glazing schedule check',
        VghLantern__ProjectFile__Metadata__ClientName : 'Dev check'
    },
    VghLantern__ProjectFile__GlobalSettings: {},
    VghLantern__ProjectFile__Lanterns: [
        lanternOf({ title: 'Kitchen', w: 6000, d: 2500, p: 25 }),
        lanternOf({ title: 'Orangery', w: 12000, d: 6000, p: 22.5, s: 300, spec: 'Triple Glazed Toughened' }),
        lanternOf({ title: 'Pyramid', w: 3000, d: 3000, p: 30, form: 'Pyramid', mode: 'Mode02', spec: 'No Such Glass' })
    ]
};

function makeSandbox() {
    const sandbox = { console: { log() {}, warn() {}, error: console.error }, Math, JSON, Date, isNaN, isFinite,
                      parseInt, parseFloat, Number, String, Array, Object, Infinity, NaN, Error, Promise, Set, setTimeout,
                      clearTimeout, CustomEvent: function() {} };
    sandbox.window = sandbox;
    sandbox.addEventListener = () => {};
    sandbox.dispatchEvent = () => {};
    sandbox.document = { getElementById: () => null };
    sandbox.VghLantern__AppCore__StateManager = {
        VghLantern__StateManager__GetAppConfig      : () => appConfig,
        VghLantern__StateManager__GetCurrentProject : () => project,
        VghLantern__StateManager__GetSolvedSkeleton : () => ({}),
        VghLantern__StateManager__GetState          : () => ({ currentMode: 'Specification' }),
        VghLantern__StateManager__On                : () => {}
    };
    sandbox.VghLantern__AppCore__ConfigLoader = {
        VghLantern__ConfigLoader__GetSection      : name => SECTIONS[name] || null,
        VghLantern__ConfigLoader__GetMergedConfig : () => appConfig,
        VghLantern__ConfigLoader__RequireNumber   : strict('number', 0),
        VghLantern__ConfigLoader__RequireString   : strict('string', ''),
        VghLantern__ConfigLoader__RequireBoolean  : strict('boolean', false),
        VghLantern__ConfigLoader__RequireArray    : strict('array', [])
    };
    sandbox.fetch = (url) => {
        const target = path.join(APP, String(url).split('?')[0]);
        if (!fs.existsSync(target)) return Promise.resolve({ ok: false, status: 404 });
        const text = fs.readFileSync(target, 'utf8');
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(text)) });
    };
    vm.createContext(sandbox);
    FILES.forEach(rel => vm.runInContext(fs.readFileSync(path.join(MOD, rel), 'utf8'), sandbox, { filename: rel }));
    return sandbox;
}

let failures = 0;
const check = (label, ok, detail) => {
    console.log(`${ok ? 'PASS ' : 'FAIL '} ${label}${detail ? '  ' + detail : ''}`);
    if (!ok) failures++;
};

// -- Planar helpers (paper millimetres, y down) -------------------------------
const insetOf = (ring, x, y) => {
    let area = 0;
    ring.forEach((a, i) => { const b = ring[(i + 1) % ring.length]; area += a[0] * b[1] - b[0] * a[1]; });
    const sign = area >= 0 ? 1 : -1;
    let best = Infinity;
    ring.forEach((a, i) => {
        const b = ring[(i + 1) % ring.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len > 0) best = Math.min(best, sign * ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0])) / len);
    });
    return best;
};

// A text primitive's box on paper, from the same average advance the schedule
// places labels with (0.56 of the type size, already wider than Helvetica's digits
// at 0.556 and its degree sign at 0.4), and whether a segment crosses a box.
const textBox = t => {
    const w = t.Text.length * t.FontMm * 0.56, h = t.FontMm * 0.717;
    const x0 = t.Align === 'right' ? t.X - w : (t.Align === 'center' ? t.X - w / 2 : t.X);
    return { x0, x1: x0 + w, y0: t.BaselineY - h, y1: t.BaselineY };
};
const crosses = (a, b, box) => {
    let t0 = 0, t1 = 1;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const p = [-dx, dx, -dy, dy], q = [a[0] - box.x0, box.x1 - a[0], a[1] - box.y0, box.y1 - a[1]];
    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) { if (q[i] < 0) return false; continue; }
        const r = q[i] / p[i];
        if (p[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
        else          { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return true;
};

// -- A jsPDF stand-in that records what is drawn where ------------------------
function fakeDoc(pageHeightMm) {
    const log = { page: 1, lines: 0, circles: 0, texts: [], rects: 0, bad: [], maxY: {} };
    let fontPt = 10;
    const note = (name, nums) => nums.forEach(n => { if (typeof n !== 'number' || !isFinite(n)) log.bad.push(name); });
    const reach = y => { log.maxY[log.page] = Math.max(log.maxY[log.page] || 0, y); };
    const doc = {
        setFillColor() {}, setDrawColor() {}, setTextColor() {}, setFont() {},
        setLineWidth(w) { note('setLineWidth', [w]); },
        setLineDashPattern(d) { if (!Array.isArray(d)) log.bad.push('dash'); },
        setFontSize(s) { note('setFontSize', [s]); fontPt = s; },
        lines(legs, x, y) {
            log.lines++; note('lines', [x, y]);
            let cx = x, cy = y; reach(cy);
            legs.forEach(l => { note('leg', l); cx += l[0]; cy += l[1]; reach(cy); });
        },
        circle(x, y, r) { log.circles++; note('circle', [x, y, r]); reach(y + r); },
        rect(x, y, w, h) { log.rects++; note('rect', [x, y, w, h]); reach(y + h); },
        line(x1, y1, x2, y2) { note('line', [x1, y1, x2, y2]); reach(Math.max(y1, y2)); },
        text(t, x, y) { note('text', [x, y]); log.texts.push({ t: String(t), x, y, page: log.page }); reach(y); },
        splitTextToSize(t, w) {
            const per = Math.max(1, Math.floor(w / (fontPt * 0.352778 * 0.5)));
            const out = []; let line = '';
            String(t).split(' ').forEach(word => {
                const next = line ? line + ' ' + word : word;
                if (next.length > per && line) { out.push(line); line = word; } else { line = next; }
            });
            if (line || !out.length) out.push(line);
            return out;
        },
        addPage() { log.page++; }
    };
    return { doc, log };
}

(async () => {
    const sb = makeSandbox();
    await Promise.all([
        sb.VghLantern__AppData__GlazeBarSystemLoader.VghLantern__GlazeBarSystemLoader__LoadIndex(),
        sb.VghLantern__AppData__BaseFrameSystemLoader.VghLantern__BaseFrameSystemLoader__LoadIndex(),
        sb.VghLantern__AppData__RidgeSystemLoader.VghLantern__RidgeSystemLoader__LoadIndex(),
        sb.VghLantern__AppData__HipSystemLoader.VghLantern__HipSystemLoader__LoadIndex()
    ]);

    const Schedule  = sb.VghLantern__Specification__GlazingSchedule;
    const Renderer  = sb.VghLantern__Specification__GlazingScheduleRenderer;
    const DocModel  = sb.VghLantern__Specification__DocumentModel;
    const Sections  = sb.VghLantern__Specification__SectionManager;
    const DocState  = sb.VghLantern__DocPreview__DocumentState;
    const Issues    = sb.VghLantern__DocPreview__DocIssueHandler;
    const Print     = sb.VghLantern__DocPreview__PrintDocumentRenderer;
    const Painter   = sb.VghLantern__DocPreview__SpecificationPdfPainter;
    const Solver    = sb.VghLantern__Geometry__SkeletonSolver;
    const Bars      = sb.VghLantern__Geometry__GlazeBarLayout;
    const Layout    = sb.VghLantern__Geometry__GlazingPanelLayout;
    const builds    = () => Schedule.VghLantern__Specification__GlazingSchedule__BuildCount();
    const lanterns  = project.VghLantern__ProjectFile__Lanterns;

    // -- NOTHING BUILDS EARLY --------------------------------------------------
    check('loading every module builds no schedule', builds() === 0, `(${builds()} built)`);

    const model = DocModel.VghLantern__Specification__DocumentModel__BuildFromState();
    check('the specification document model builds no schedule', builds() === 0 && !!model && model.Lanterns.length === 3,
        `(${builds()} built, ${model ? model.Lanterns.length : 0} lanterns in the model)`);

    const described = Sections.VghLantern__Specification__SectionManager__DescribeDocument();
    const glazingStatic = /data-vghlantern-spec-section="glazingPanels"[^>]*>[\s\S]*?<div class="VghLantern__Spec__SectionBody"><\/div>/.test(described.SectionsHtml);
    check('the static describe the issue check reads builds no schedule', builds() === 0 && glazingStatic,
        `(${builds()} built; glazing section body ${glazingStatic ? 'empty' : 'NOT empty'})`);

    DocState.VghLantern__DocPreview__DocumentState__SetViewStatePartial({ ShowGlazingSchedule: false });
    const planOff = DocState.VghLantern__DocPreview__DocumentState__BuildPagePlan();
    Issues.VghLantern__DocPreview__DocIssueHandler__Collect();
    check('a pack with the Glazing Schedule switch off builds none and plans no glazing page',
        builds() === 0 && !planOff.some(e => e.Kind === 'lanternGlazingSchedule'), `(${builds()} built)`);

    const sectionHtml = Renderer.VghLantern__Specification__GlazingScheduleRenderer__BuildSectionHtml(model);
    check('the Specification tab builds one schedule per lantern', builds() === 3, `(${builds()} built)`);
    Renderer.VghLantern__Specification__GlazingScheduleRenderer__BuildSectionHtml(model);
    check('opening the tab again reuses them', builds() === 3, `(${builds()} built)`);

    lanterns[0].Lantern__Identity__Config.Lantern__Identity__Config__Title = 'Kitchen (renamed)';
    Schedule.VghLantern__Specification__GlazingSchedule__ForLanternIndex(0);
    check('renaming a lantern does not rebuild its schedule', builds() === 3, `(${builds()} built)`);
    lanterns[0].Lantern__RoofPitch__Config.Lantern__RoofPitch__Config__PitchDegrees = 27.5;
    Schedule.VghLantern__Specification__GlazingSchedule__ForLanternIndex(0);
    Schedule.VghLantern__Specification__GlazingSchedule__ForLanternIndex(1);
    check('a pitch change rebuilds that lantern only', builds() === 4, `(${builds()} built)`);

    const plansShown  = (sectionHtml.match(/class="VghLantern__Spec__GlazingPlan"/g) || []).length;
    const tablesShown = (sectionHtml.match(/VghLantern__Spec__GlazingTable"/g) || []).length;
    const headsShown  = (sectionHtml.match(/<h4 /g) || []).length;
    check('the tab section has a heading, a plan and a table per lantern', plansShown === 3 && tablesShown === 3 && headsShown === 3,
        `(${headsShown} headings, ${plansShown} plans, ${tablesShown} tables; a spec with no build-up still cuts)`);
    const totalsShown = (sectionHtml.match(/VghLantern__Spec__TableTotalsRow/g) || []).length;
    check('each lantern\'s table on the tab closes with its total glass', totalsShown === 3, `(${totalsShown} total rows)`);

    // Adam, 20-Oct-2026: "remove this ... call the section "Roof Glazing Panel Units"".
    const sections = DocModel.VghLantern__Specification__DocumentModel__ListSections();
    const unitsSection = sections.find(s => s.Renderer === 'glazingPanels');
    check('the per-slope Glazing Areas section is gone and the units section is named Roof Glazing Panel Units',
        !sections.some(s => s.Renderer === 'areas') && !!unitsSection && unitsSection.Label === 'Roof Glazing Panel Units',
        `(${sections.map(s => s.Label).join(', ')})`);

    // -- PER LANTERN: TABLE, PLAN, DRAWINGS, SVG ---------------------------------
    const draw = glazingCfg.Drawing, planCfg = glazingCfg.Plan;
    lanterns.forEach((lantern, index) => {
        const title    = lantern.Lantern__Identity__Config.Lantern__Identity__Config__Title;
        const schedule = Schedule.VghLantern__Specification__GlazingSchedule__ForLanternIndex(index);
        const skeleton = Solver.VghLantern__SkeletonSolver__Solve(lantern);
        const panels   = Layout.VghLantern__GlazingPanelLayout__Layout(skeleton, Bars.VghLantern__GlazeBarLayout__Layout(skeleton, lantern), lantern);

        check(`${title}: valid, one row per panel type`, schedule.IsValid && schedule.Rows.length === panels.Types.length && schedule.Rows.length > 0,
            `(${schedule.Rows.length} types, ${schedule.PanelCount} panels)`);
        check(`${title}: codes run RU01 down in order and quantities add up`,
            schedule.Rows.every((r, i) => r.Code === 'RU' + String(i + 1).padStart(2, '0')) &&
            schedule.Rows.reduce((n, r) => n + r.Quantity, 0) === panels.Panels.length);

        const floored = schedule.Rows.every((row, i) => {
            const t = panels.Types[i];
            const f = v => String(Math.floor(v + 1e-6));
            return row.LengthText === f(t.LengthMm) && row.WidthText === f(t.WidthMm) &&
                   row.UnitLengthText === (f(t.UnitLengthMm) !== f(t.LengthMm) ? 'unit ' + f(t.UnitLengthMm) : '') &&
                   row.UnitWidthText  === (f(t.UnitWidthMm)  !== f(t.WidthMm)  ? 'unit ' + f(t.UnitWidthMm)  : '');
        });
        check(`${title}: sizes are rounded down to the whole millimetre`, floored,
            `(RU01 ${schedule.Rows[0].LengthText} x ${schedule.Rows[0].WidthText}, layout ${panels.Types[0].LengthMm.toFixed(2)} x ${panels.Types[0].WidthMm.toFixed(2)})`);

        // THE GLASS AREA | each unit's m2 to 0.01, and the total of every unit.
        const sqm = v => (v / 1e6).toFixed(glazingCfg.AreaDecimalPlaces);
        const areas = schedule.Rows.every((row, i) => row.AreaText === sqm(panels.Types[i].AreaSqMm) &&
            row.UnitAreaText === (sqm(panels.Types[i].UnitAreaSqMm) !== sqm(panels.Types[i].AreaSqMm) ? 'unit ' + sqm(panels.Types[i].UnitAreaSqMm) : ''));
        // Each type's area times its count, which is every panel's own area to within
        // the half millimetre two panels of one type may differ by.
        const exactTotal = panels.Types.reduce((sum, t) => sum + t.AreaSqMm * t.Quantity, 0);
        const panelTotal = panels.Panels.reduce((sum, p) => sum + p.AreaSqMm, 0);
        check(`${title}: each unit's area and the total glass of every unit`, areas &&
            schedule.TotalAreaText === sqm(exactTotal) + glazingCfg.AreaUnitSuffix && Math.abs(schedule.TotalAreaSqM - exactTotal / 1e6) < 1e-9 &&
            Math.abs(exactTotal - panelTotal) / 1e6 < 0.001 && schedule.TotalLabel.indexOf(String(panels.Panels.length)) !== -1,
            `(RU01 ${schedule.Rows[0].AreaText} m2 each; ${schedule.TotalLabel}: ${schedule.TotalAreaText}; panels summed one by one ${(panelTotal / 1e6).toFixed(4)})`);

        // THE PLAN | one bubble per panel, inside its own panel.
        const plan     = schedule.Plan;
        const polys    = {}; plan.Primitives.filter(p => p.Kind === 'Polygon' && p.Ref !== 'upstand').forEach(p => { polys[p.Ref] = p.Points; });
        const bubbles  = plan.Primitives.filter(p => p.Kind === 'Circle');
        const inside   = bubbles.every(c => {
            const ring = polys[c.Ref]; if (!ring) return false;
            const d = insetOf(ring, c.Cx, c.Cy);
            return c.R <= planCfg.BubbleMinRadiusMm + 1e-9 ? d > 0 : d >= c.R - 1e-6;
        });
        check(`${title}: one bubble per panel, each inside its panel`, bubbles.length === panels.Panels.length && inside,
            `(${bubbles.length} bubbles, radius ${bubbles.length ? bubbles[0].R.toFixed(2) : '-'} mm)`);
        check(`${title}: the plan fits its box`, plan.WidthMm <= planCfg.MaxWidthMm + 1e-6 && plan.HeightMm <= planCfg.MaxHeightMm + 1e-6,
            `(${plan.WidthMm.toFixed(1)} x ${plan.HeightMm.toFixed(1)} mm)`);

        // THE DRAWINGS | inside the cell; edge labels outside the glass unless they
        // are an upright edge's, kept off a dimension line; angle labels clear of the
        // outline; every corner that is not square marked.
        let outOfCell = 0, strayLabels = 0, labelsOnDims = 0, anglesOnOutline = 0, angleMarks = 0, angleCorners = 0;
        let broken = 0, thinBroken = 0;
        schedule.Rows.forEach((row, i) => {
            const prims  = row.Drawing.Primitives;
            const pieces = prims.filter(p => p.Kind === 'Polygon').map(p => p.Points);
            const edges  = [].concat(...pieces.map(ring => ring.map((a, k) => [a, ring[(k + 1) % ring.length]])));
            const insideGlass = (x, y) => Math.max(...pieces.map(ring => insetOf(ring, x, y)));
            if (row.Drawing.IsBroken) {
                broken++;
                const xs = [].concat(...pieces.map(ring => ring.map(q => q[0])));
                if (Math.max(...xs) - Math.min(...xs) < draw.MinDrawnWidthMm - 0.01) thinBroken++;
            }
            const dims  = prims.filter(p => p.Kind === 'Polyline' && p.Stroke === glazingCfg.DimensionColour && p.Points.length === 2 &&
                                            Math.hypot(p.Points[1][0] - p.Points[0][0], p.Points[1][1] - p.Points[0][1]) > 2);
            prims.forEach(p => {
                const pts = p.Points || (p.Kind === 'Circle' ? [[p.Cx, p.Cy]] : [[p.X, p.BaselineY]]);
                pts.forEach(q => { if (q[0] < -0.01 || q[0] > draw.CellWidthMm + 0.01 || q[1] < -0.01 || q[1] > draw.CellHeightMm + 0.01) outOfCell++; });
                if (p.Kind !== 'Text') return;
                const box = textBox(p);
                if (p.FontMm === draw.EdgeFontMm && p.Colour === glazingCfg.InkColour) {
                    const cy = (box.y0 + box.y1) / 2, cx = (box.x0 + box.x1) / 2;
                    const besideUpright = edges.some(e => Math.abs(e[0][0] - e[1][0]) < 1e-6 &&
                        cy >= Math.min(e[0][1], e[1][1]) && cy <= Math.max(e[0][1], e[1][1]) &&
                        Math.abs(cx - e[0][0]) < (box.x1 - box.x0) / 2 + draw.EdgeGapMm + 0.5);
                    if (insideGlass(cx, cy) > 0.3 && !besideUpright) strayLabels++;
                    if (dims.some(d => crosses(d.Points[0], d.Points[1], box))) labelsOnDims++;
                }
                if (p.Text.indexOf('\u00B0') !== -1) {
                    angleMarks++;
                    if (edges.some(e => crosses(e[0], e[1], box))) anglesOnOutline++;
                }
            });
            angleCorners += panels.Types[i].CornerAnglesDegrees.filter(a => Math.abs(a - 90) > glazingCfg.SquareCornerToleranceDegrees).length;
        });
        check(`${title}: every cut drawing stays inside its ${draw.CellWidthMm} x ${draw.CellHeightMm} mm cell`, outOfCell === 0, `(${outOfCell} points outside)`);
        check(`${title}: cut edges are labelled outside the glass, or beside their upright edge`, strayLabels === 0, `(${strayLabels} stray)`);
        check(`${title}: no edge label prints across a dimension line`, labelsOnDims === 0, `(${labelsOnDims} across)`);
        check(`${title}: no angle prints across the panel outline`, anglesOnOutline === 0, `(${anglesOnOutline} across)`);
        check(`${title}: every corner that is not square carries its angle`, angleMarks === angleCorners, `(${angleMarks} marked, ${angleCorners} expected)`);
        check(`${title}: a broken drawing is at least ${draw.MinDrawnWidthMm} mm wide`, thinBroken === 0,
            `(${broken} of ${schedule.Rows.length} drawn broken)`);

        // THE PLAN | every bubble of a slope's row sits on one line along its eaves.
        // Measured up the slope on paper, where the plan's y runs down the page.
        const levels = {};
        panels.Panels.forEach(panel => {
            const c = bubbles.find(b => b.Ref === panel.Id);
            const u = panel.Frame.AxisY, len = Math.hypot(u.x, u.y);
            const key = panel.FaceId + '|' + panel.RowIndex;
            (levels[key] = levels[key] || []).push((c.Cx * u.x / len) - (c.Cy * u.y / len));
        });
        const ragged = Object.keys(levels).filter(k => Math.max(...levels[k]) - Math.min(...levels[k]) > 0.05);
        check(`${title}: every slope's bubbles sit on one line along its eaves`, ragged.length === 0,
            ragged.length ? `(off line: ${ragged.join(', ')})` : `(${Object.keys(levels).length} slope rows)`);

        // SVG | renders without a NaN, every element closed.
        const svg = Renderer.VghLantern__Specification__GlazingScheduleRenderer__ToSvg(plan, 'plan') +
                    schedule.Rows.map(r => Renderer.VghLantern__Specification__GlazingScheduleRenderer__ToSvg(r.Drawing, r.Code)).join('');
        check(`${title}: the SVG is clean`, !/NaN|undefined|Infinity/.test(svg) &&
            (svg.match(/<svg /g) || []).length === (svg.match(/<\/svg>/g) || []).length &&
            (svg.match(/<text /g) || []).length === (svg.match(/<\/text>/g) || []).length);

        // PDF | the same primitives, natively.
        const fake = fakeDoc(297);
        Renderer.VghLantern__Specification__GlazingScheduleRenderer__DrawToPdf(fake.doc, plan, 12, 30);
        const counts = { Polygon: 0, Polyline: 0, Circle: 0, Text: 0 };
        plan.Primitives.forEach(p => { counts[p.Kind]++; });
        check(`${title}: the plan draws natively into the PDF, primitive for primitive`,
            fake.log.bad.length === 0 && fake.log.lines === counts.Polygon + counts.Polyline &&
            fake.log.circles === counts.Circle && fake.log.texts.length === counts.Text,
            fake.log.bad.length ? `(bad: ${fake.log.bad.slice(0, 3).join(', ')})` : '');
    });

    // -- BUILD-UPS ---------------------------------------------------------------
    const describe = spec => Schedule.VghLantern__Specification__GlazingSchedule__DescribeBuildUp(spec);
    const dgt = describe('Double Glazed Toughened'), tgt = describe('Triple Glazed Toughened'), lam = describe('Double Glazed Laminate Over');
    check('a double unit reads 28 mm, 16 mm argon filled, provisional',
        dgt.HasBuildUp && dgt.IsProvisional && dgt.ThicknessText === '28 mm' && dgt.CavityText === '16 mm argon filled',
        `(${dgt.ThicknessText}, ${dgt.CavityText})`);
    check('a triple unit reads 28 mm, 2 x 8 mm argon filled', tgt.ThicknessText === '28 mm' && tgt.CavityText === '2 x 8 mm argon filled',
        `(${tgt.ThicknessText}, ${tgt.CavityText})`);
    check('a laminate unit keeps its decimal', lam.ThicknessText === '28.4 mm', `(${lam.ThicknessText}; panes ${lam.Panes})`);
    const pyramid = Schedule.VghLantern__Specification__GlazingSchedule__ForLanternIndex(2);
    check('a spec with no build-up prints TBC and warns', !describe('No Such Glass').HasBuildUp &&
        pyramid.ThicknessText === glazingCfg.NoBuildUpText && pyramid.CavityText === glazingCfg.NoBuildUpText &&
        pyramid.Warnings.some(w => /no glass build-up/.test(w)) && !pyramid.IsProvisional);
    const kitchen = Schedule.VghLantern__Specification__GlazingSchedule__ForLanternIndex(0);
    check('a provisional build-up is marked in the table', kitchen.ThicknessText === '28 mm*' && kitchen.CavityText === '16 mm argon filled*',
        `(${kitchen.ThicknessText}, ${kitchen.CavityText})`);

    // -- THE PACK --------------------------------------------------------------
    DocState.VghLantern__DocPreview__DocumentState__SetViewStatePartial({ ShowGlazingSchedule: true });
    const plan = DocState.VghLantern__DocPreview__DocumentState__BuildPagePlan();
    const runs = plan.filter(e => e.LanternIndex !== null);
    const order = [0, 1, 2].every(i => {
        const kinds = runs.filter(e => e.LanternIndex === i).map(e => e.Kind);
        return kinds[kinds.length - 1] === 'lanternGlazingSchedule' && kinds.indexOf('lanternCuttingList') === kinds.length - 2;
    });
    check('the switch on closes every lantern\'s set with its glazing schedule, after the cutting list', order);

    const issues = Issues.VghLantern__DocPreview__DocIssueHandler__Collect();
    const provisionalIssue = issues.find(i => /provisional typical glass build-ups/.test(i.Message));
    check('the pack warns which lanterns print provisional build-ups', !!provisionalIssue &&
        /Kitchen \(renamed\), Orangery/.test(provisionalIssue.Message) && !/Pyramid/.test(provisionalIssue.Message),
        provisionalIssue ? `("${provisionalIssue.Message}")` : '(no warning)');

    const metrics = Renderer.VghLantern__Specification__GlazingScheduleRenderer__PageMetrics();
    ['A4', 'A3'].forEach(size => {
        DocState.VghLantern__DocPreview__DocumentState__SetPaperSize(size);
        const page = DocState.VghLantern__DocPreview__DocumentState__DescribePage();
        lanterns.forEach((lantern, index) => {
            const title    = lantern.Lantern__Identity__Config.Lantern__Identity__Config__Title;
            const schedule = Schedule.VghLantern__Specification__GlazingSchedule__ForLanternIndex(index);
            const entry    = model.Lanterns.find(e => e.LanternIndex === index);
            const frame    = Painter.VghLantern__DocPreview__SpecificationPdfPainter__GlazingPageFrame(page, model, entry, schedule);
            const layout   = Renderer.VghLantern__Specification__GlazingScheduleRenderer__LayoutPages(schedule, frame);

            // THE LAYOUT | every row once, in order; every page fits; headers lead.
            const rows = [].concat(...layout.map(p => p.Blocks.filter(b => b.Kind === 'table').map(b => b.RowIndices)).flat());
            const fits = layout.every(p => p.Blocks.every((b, i) => b.TopMm + b.HeightMm <= frame.UsableHeightMm + 1e-6 &&
                (i === 0 || p.Blocks[i - 1].TopMm + p.Blocks[i - 1].HeightMm <= b.TopMm + 1e-6)));
            const headed = layout.every(p => p.Blocks.filter(b => b.Kind === 'table').every(b =>
                Math.abs(b.HeightMm - (metrics.HeaderHeightMm + b.RowIndices.length * metrics.RowHeightMm +
                    (b.HasTotal ? metrics.TotalRowHeightMm : 0))) < 1e-6 && (b.RowIndices.length > 0 || b.HasTotal)));
            const totals = [].concat(...layout.map((p, pi) => p.Blocks.filter(b => b.HasTotal).map(() => pi)));
            check(`${size} ${title}: the total glass closes the table once, on its last page`,
                totals.length === 1 && totals[0] === layout.length - 1, `(total on page ${totals.map(t => t + 1).join(', ')} of ${layout.length})`);
            check(`${size} ${title}: ${layout.length} page(s), every row once in order, nothing past the footer reserve, a heading on every table`,
                rows.length === schedule.Rows.length && rows.every((r, i) => r === i) && fits && headed &&
                layout[0].Blocks[0].Kind === 'masthead');

            // PREVIEW AND PDF | the same page count; the PDF draws inside the page.
            const bodies = Print.VghLantern__DocPreview__PrintDocumentRenderer__BuildLanternGlazingSchedulePages({}, index, page);
            const fake   = fakeDoc(page.HeightMm);
            let overflow = 0;
            const ctx    = { AddOverflowPage() { overflow++; fake.doc.addPage(); return overflow + 1; } };
            const painted = Painter.VghLantern__DocPreview__SpecificationPdfPainter__PaintLanternGlazingSchedule(fake.doc, ctx, page, model, index);
            const limit  = page.HeightMm - page.MarginMm - docConfig.VghLantern__DocPreview__Config__Pdf.FooterReserveMm + 0.5;
            const deepest = Math.max(...Object.values(fake.log.maxY));
            const previewRows = bodies.map(b => (b.match(/<tr style="height:/g) || []).length - (b.match(/<thead>/g) || []).length);
            const layoutRows  = layout.map(p => p.Blocks.filter(b => b.Kind === 'table').reduce((n, b) => n + b.RowIndices.length, 0));
            check(`${size} ${title}: preview and PDF are the same ${bodies.length} page(s), the same rows on each`,
                painted && bodies.length === layout.length && overflow + 1 === layout.length &&
                previewRows.every((n, i) => n === layoutRows[i]) && fake.log.bad.length === 0 &&
                !bodies.some(b => /NaN|undefined/.test(b)),
                `(preview ${bodies.length}, PDF ${overflow + 1}, rows ${layoutRows.join('/')})`);
            const previewTotals = bodies.join('').split('VghLantern__Spec__TableTotalsRow').length - 1;
            const pdfTotals     = fake.log.texts.filter(t => t.t === schedule.TotalAreaText).length;
            check(`${size} ${title}: preview and PDF each print the total glass once`, previewTotals === 1 && pdfTotals === 1,
                `(preview ${previewTotals}, PDF ${pdfTotals}: ${schedule.TotalAreaText})`);
            const textColumns = glazingCfg.TableColumns.filter(c => c.Key !== 'Drawing').length;
            const cellLabels  = bodies.join('').split('VghLantern__Spec__GlazingCellLabel').length - 1;
            const pdfLabels   = fake.log.texts.filter(t => t.t === 'Qty').length;
            check(`${size} ${title}: every text cell carries its faint column name, on screen and in the PDF`,
                cellLabels === schedule.Rows.length * textColumns && pdfLabels === schedule.Rows.length + layoutRows.filter(n => n > 0).length,
                `(${cellLabels} labelled cells; 'Qty' printed ${pdfLabels} times in the PDF)`);
            check(`${size} ${title}: the PDF draws nothing below the footer reserve`, deepest <= limit,
                `(deepest ${deepest.toFixed(1)} mm, limit ${limit.toFixed(1)} mm)`);
            if (size === 'A4' && index === 1) {
                const headings = fake.log.texts.filter(t => t.t === 'Code').map(t => t.page);
                check('the heading repeats on every page the table runs onto', layout.length > 1 &&
                    new Set(headings).size === layout.filter(p => p.Blocks.some(b => b.Kind === 'table')).length,
                    `(heading on pages ${[...new Set(headings)].join(', ')})`);
            }
        });
    });

    check('no config key the schedule reads is missing', missingKeys.size === 0, missingKeys.size ? `(${[...missingKeys].join('; ')})` : '');

    console.log(`\n${failures ? failures + ' FAILED' : 'All passed'}`);
    process.exit(failures ? 1 : 0);
})().catch(error => { console.error(error); process.exit(1); });
