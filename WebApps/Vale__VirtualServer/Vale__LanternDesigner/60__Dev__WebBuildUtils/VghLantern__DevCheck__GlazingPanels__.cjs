// Proves the glazing panels sit between the bars, hips and ridge with the 3mm
// Adam asked for ("| Rafter | 3mm | Glazing | 3mm | Rafter |", 20-Oct-2026),
// measured against the members AS MODELLED, at every shape the app makes.
//
// THE NUMBERS COME FROM THE ASSETS, SO THE FIRST THING CHECKED IS THE ASSETS.
// The web widths and the eaves glass stop the system indexes carry were measured
// once from the section assets. A re-exported core or extrusion would leave those
// numbers describing a part that no longer exists, and every panel would still
// look right on screen. So each is measured again here, from the asset, with the
// app's own SectionLoopBuilder, at three pitches, and compared.
//
// THE LOADERS RUN FOR REAL. fetch is backed by the filesystem, so the four
// system loaders read their indexes through their own code paths and the panel
// layout cuts with the index numbers, exactly as it does in the browser. The
// layout is then loaded a second time with no loaders at all, to prove its
// documented fallbacks still mirror the indexes.
//
// FIVE THINGS ARE ASSERTED
//
//   THE NUMBERS ARE THE ASSETS'  each core's web and the extrusion upstand,
//                                re-measured, agree with their index entries,
//                                and the top pane clears the upstand fins
//   EVERY PANEL IS CLEAR         convex, anticlockwise, every edge named, and no
//                                corner nearer a bar than its web plus 3mm
//   THE CLEARANCES ARE THE FORM  each hip and ridge edge sits exactly where the
//                                closed form backing angle puts it, an answer
//                                derived independently of the module's vectors
//   THE TYPES ARE HANDED PAIRS   codes run RU01 down by area, quantities add up,
//                                every type has its mirror with the same count,
//                                and a lantern turned through 90 degrees in plan
//                                cuts the same panels
//   THE EXPORT CARRIES THEM      one unit per panel and one top pane lip per
//                                oversail, lifted to the bedding face and the
//                                cap end level the layout cut them for
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const APP = path.join(__dirname, '..');
const MOD = path.join(APP, '02__Src__AppModules');
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));

const appConfig = Object.assign({},
    readJson(path.join(MOD, '02__AppData/VghLantern__AppConfig__Main__.json')),
    readJson(path.join(MOD, '02__AppData/Na__PbrMaterials__Config.json')),
    readJson(path.join(MOD, '06__Env3d__ThreeRenderPipeline/Na__Env3d__Config.json')),
    readJson(path.join(MOD, '80__System__SketchUpExport/Na__SketchUpExport__Config.json')));

const GEOMETRY = [
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__RoofPitchCalculator__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__BaseFrameAssembly__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__SkeletonSolver__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__GlazeBarLayout__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__GlazeBarAssembly__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__SectionLoopBuilder__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__StretchTools__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__GlazingPanelLayout__.js'
];
const LOADERS = [
    '02__AppData/VghLantern__AppData__AssetRegistry__.js',
    '02__AppData/VghLantern__AppData__RidgeHipDepthTable__.js',
    '02__AppData/VghLantern__AppData__GlazeBarSystemLoader__.js',
    '02__AppData/VghLantern__AppData__BaseFrameSystemLoader__.js',
    '02__AppData/VghLantern__AppData__RidgeSystemLoader__.js',
    '02__AppData/VghLantern__AppData__HipSystemLoader__.js'
];
const EXPORT = [
    '80__System__SketchUpExport/VghLantern__SketchUpExport__SweepGeometry__.js',
    '80__System__SketchUpExport/VghLantern__SketchUpExport__PartFactory__.js',
    '80__System__SketchUpExport/VghLantern__SketchUpExport__Encoders__BaseAndRoof__.js'
];

function sandboxWith(files) {
    const sandbox = { console: { log() {}, warn() {}, error: console.error }, Math, JSON, Date, isNaN, isFinite,
                      parseInt, parseFloat, Number, String, Array, Object, Infinity, NaN, Error, Promise, setTimeout };
    sandbox.window = sandbox;
    sandbox.VghLantern__AppCore__StateManager = { VghLantern__StateManager__GetAppConfig: () => appConfig };
    sandbox.VghLantern__AppCore__ConfigLoader = {
        VghLantern__ConfigLoader__RequireNumber: (s, k) => (s && typeof s[k] === 'number') ? s[k] : 0,
        VghLantern__ConfigLoader__RequireString: (s, k) => (s && typeof s[k] === 'string') ? s[k] : '',
        VghLantern__ConfigLoader__RequireArray:  (s, k) => (s && Array.isArray(s[k])) ? s[k] : []
    };
    sandbox.fetch = (url) => {
        const target = path.join(APP, String(url).split('?')[0]);
        if (!fs.existsSync(target)) return Promise.resolve({ ok: false, status: 404 });
        const text = fs.readFileSync(target, 'utf8');
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(text)) });
    };
    vm.createContext(sandbox);
    files.forEach(rel => vm.runInContext(fs.readFileSync(path.join(MOD, rel), 'utf8'), sandbox, { filename: rel }));
    return sandbox;
}

let failures = 0;
const check = (label, ok, detail) => {
    console.log(`${ok ? 'PASS ' : 'FAIL '} ${label}${detail ? '  ' + detail : ''}`);
    if (!ok) failures++;
};
const DEG = Math.PI / 180;

function lanternOf(o) {
    return {
        Lantern__Form__Config: { Lantern__Form__Config__RoofForm: o.form || 'Hipped Ridge' },
        Lantern__Dimensions__Config: { Lantern__Dimensions__Config__WidthMm: o.w, Lantern__Dimensions__Config__DepthMm: o.d },
        Lantern__RoofPitch__Config: { Lantern__RoofPitch__Config__PitchDegrees: o.p },
        Lantern__BuildersUpstandAndBase__Config: { Lantern__BuildersUpstandAndBase__Config__UpstandHeightMm: 150,
                                                   Lantern__BuildersUpstandAndBase__Config__UpstandThicknessMm: 110 },
        Lantern__GlazingBars__Config: { Lantern__GlazingBars__Config__SetOutMode: o.mode || 'Mode01',
                                        Lantern__GlazingBars__Config__TargetSpacingMm: o.s || 390,
                                        Lantern__GlazingBars__Config__HorizontalTransomEnabled: !!o.transom }
    };
}

(async () => {
    const sb = sandboxWith(GEOMETRY.concat(LOADERS, EXPORT));
    await Promise.all([
        sb.VghLantern__AppData__GlazeBarSystemLoader.VghLantern__GlazeBarSystemLoader__LoadIndex(),
        sb.VghLantern__AppData__BaseFrameSystemLoader.VghLantern__BaseFrameSystemLoader__LoadIndex(),
        sb.VghLantern__AppData__RidgeSystemLoader.VghLantern__RidgeSystemLoader__LoadIndex(),
        sb.VghLantern__AppData__HipSystemLoader.VghLantern__HipSystemLoader__LoadIndex()
    ]);

    const Layout  = sb.VghLantern__Geometry__GlazingPanelLayout;
    const Solver  = sb.VghLantern__Geometry__SkeletonSolver;
    const Bars    = sb.VghLantern__Geometry__GlazeBarLayout;
    const SLB     = sb.VghLantern__Geometry__SectionLoopBuilder;
    const numbers = Layout.VghLantern__GlazingPanelLayout__Interface();
    const b0 = numbers.BeddingOffsetMm, b1 = numbers.BeddingOffsetMm + numbers.UnitThicknessMm;

    console.log(`Glass band ${b0} to ${b1} mm above the datum; clearance ${numbers.EdgeClearanceMm} mm; webs bar `
        + `${numbers.BarWebHalfWidthMm}, hip ${numbers.HipWebHalfWidthMm}, ridge ${numbers.RidgeWebHalfWidthMm}; `
        + `glass stop ${numbers.GlassStopAlongPitchMm}; top pane ${numbers.OuterPaneThicknessMm} mm\n`);

    // -- THE NUMBERS ARE THE ASSETS' ----------------------------------------
    // Clip each section to the glass band as it crosses that member at a given
    // angle and find how far its material reaches along the glass. A plain
    // upright web of half width w predicts w / cos(theta) - b0 tan(theta).
    const registry = readJson(path.join(APP, 'VghLantern__AssetRegistry__.json')).VghLantern__AssetRegistry__Assets;
    const loopsOf = id => {
        const record = registry.find(a => a.AssetId === id);
        return SLB.VghLantern__SectionLoopBuilder__BuildFacesFromAsset(readJson(path.join(APP, record.Url))).Loops
            .filter(l => l.Depth % 2 === 0).map(l => l.Points);
    };
    const clip = (poly, nx, ny, c) => {
        const out = [];
        poly.forEach((a, i) => {
            const b = poly[(i + 1) % poly.length];
            const da = a.x * nx + a.y * ny - c, db = b.x * nx + b.y * ny - c;
            if (da >= 0) out.push(a);
            if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
        });
        return out;
    };
    const reachOf = (id, theta) => {
        const dx = Math.cos(theta), dy = -Math.sin(theta), nx = Math.sin(theta), ny = Math.cos(theta);
        let best = -Infinity;
        loopsOf(id).forEach(poly => {
            let p = clip(poly, nx, ny, b0); if (p.length < 3) return;
            p = clip(p, -nx, -ny, -b1);     if (p.length < 3) return;
            p.forEach(q => { best = Math.max(best, q.x * dx + q.y * dy); });
        });
        return best;
    };
    const predicted = (w, theta) => w / Math.cos(theta) - b0 * Math.tan(theta);
    const backing   = p => Math.atan(Math.tan(p * DEG) / Math.sqrt(2 + Math.pow(Math.tan(p * DEG), 2)));

    check('the glaze bar core web is the index number', Math.abs(reachOf('45_2011', 0) - numbers.BarWebHalfWidthMm) < 0.01,
        `(measured ${reachOf('45_2011', 0).toFixed(3)} mm)`);
    [10, 22.5, 45].forEach(p => {
        const ridge = reachOf('47_2001', p * DEG), hip = reachOf('48_2001', backing(p));
        check(`the ridge core web predicts its reach at ${p} deg`, Math.abs(ridge - predicted(numbers.RidgeWebHalfWidthMm, p * DEG)) < 0.01,
            `(measured ${ridge.toFixed(3)}, predicted ${predicted(numbers.RidgeWebHalfWidthMm, p * DEG).toFixed(3)})`);
        check(`the hip core web predicts its reach at ${p} deg`, Math.abs(hip - predicted(numbers.HipWebHalfWidthMm, backing(p))) < 0.01,
            `(measured ${hip.toFixed(3)}, predicted ${predicted(numbers.HipWebHalfWidthMm, backing(p)).toFixed(3)})`);
    });

    // The eaves extrusion is authored unrotated: x runs along the slope, y out of it.
    let stop = -Infinity, finTop = -Infinity;
    loopsOf('46_1002').forEach(poly => {
        let p = clip(poly, 0, 1, b0); if (p.length >= 3) { p = clip(p, 0, -1, -b1); if (p.length >= 3) p.forEach(q => { stop = Math.max(stop, q.x); }); }
        poly.forEach(q => { finTop = Math.max(finTop, q.y); });
    });
    check('the eaves glass stop is the extrusion upstand', Math.abs(-stop - numbers.GlassStopAlongPitchMm) < 0.01,
        `(upstand face ${(-stop).toFixed(3)} mm down the pitch)`);
    check('the oversailing top pane clears the upstand fins', b1 - numbers.OuterPaneThicknessMm > finTop,
        `(lip underside ${b1 - numbers.OuterPaneThicknessMm} mm, fins to ${finTop.toFixed(3)} mm)`);

    // The fallbacks, with no loader in the room at all.
    const bare = sandboxWith(GEOMETRY).VghLantern__Geometry__GlazingPanelLayout.VghLantern__GlazingPanelLayout__Interface();
    const drift = Object.keys(numbers).filter(k => numbers[k] !== bare[k]);
    check('the layout fallbacks mirror the indexes', drift.length === 0, drift.length ? `(differ: ${drift.join(', ')})` : '');

    // -- EVERY SHAPE ---------------------------------------------------------
    const CASES = [
        { w: 6000, d: 2500, p: 25 }, { w: 2500, d: 6000, p: 25 }, { w: 3000, d: 3000, p: 22.5 },
        { w: 6000, d: 2500, p: 25, mode: 'Mode02' }, { w: 6000, d: 2500, p: 25, transom: true },
        { w: 4000, d: 2500, p: 10 }, { w: 4000, d: 2500, p: 45 }, { w: 12000, d: 6000, p: 22.5, s: 300 },
        { w: 2400, d: 1600, p: 25, form: 'Pyramid' }, { w: 3000, d: 3000, p: 30, form: 'Pyramid', mode: 'Mode02' },
        { w: 900, d: 700, p: 30 }
    ];
    const solveOf = c => {
        const lantern = lanternOf(c);
        const skeleton = Solver.VghLantern__SkeletonSolver__Solve(lantern);
        const barSet = Bars.VghLantern__GlazeBarLayout__Layout(skeleton, lantern);
        return { lantern, skeleton, barSet, set: Layout.VghLantern__GlazingPanelLayout__Layout(skeleton, barSet, lantern) };
    };
    const to2d = (frame, p) => {
        const r = { x: p.x - frame.Origin.x, y: p.y - frame.Origin.y, z: p.z - frame.Origin.z };
        return { x: r.x * frame.AxisX.x + r.y * frame.AxisX.y + r.z * frame.AxisX.z,
                 y: r.x * frame.AxisY.x + r.y * frame.AxisY.y + r.z * frame.AxisY.z };
    };

    CASES.forEach(c => {
        const { skeleton, barSet, set } = solveOf(c);
        const label = `${c.w} x ${c.d} at ${c.p} deg${c.form ? ' ' + c.form : ''}${c.mode ? ' ' + c.mode : ''}${c.transom ? ' + transom' : ''}`;
        const problems = [];
        const isHipped = !c.form;

        set.Panels.forEach(panel => {
            const ring = panel.OuterOutline2d;
            ring.forEach((a, i) => {
                const b = ring[(i + 1) % ring.length], q = ring[(i + 2) % ring.length];
                if ((b.x - a.x) * (q.y - b.y) - (b.y - a.y) * (q.x - b.x) <= 0) problems.push(`${panel.Id} not convex anticlockwise`);
            });
            if (panel.Edges.some(e => !e.Kind)) problems.push(`${panel.Id} has an unnamed edge`);
            if (!/^RU\d\d+$/.test(panel.Code)) problems.push(`${panel.Id} has no code`);

            // Bars: every corner on one side, at least web + clearance off the centreline.
            barSet.Bars.filter(bar => bar.SlopeKey === panel.SlopeKey && bar.Role === 'glazingBar').forEach(bar => {
                const xb = to2d(panel.Frame, bar.Start).x;
                const xs = ring.map(q => q.x).concat(panel.Outline2d.map(q => q.x));
                const gap = Math.min(...xs.map(x => Math.abs(x - xb)));
                if (Math.min(...xs) < xb - 1e-6 && Math.max(...xs) > xb + 1e-6) problems.push(`${panel.Id} straddles ${bar.Id}`);
                else if (gap < numbers.BarWebHalfWidthMm + numbers.EdgeClearanceMm - 1e-6) problems.push(`${panel.Id} ${gap.toFixed(3)} mm off ${bar.Id}`);
            });

            // Eaves: the unit stops at the glass stop less the clearance, the top pane at the cap ends.
            const unitLow = Math.min(...panel.Outline2d.map(q => q.y)), outerLow = Math.min(...ring.map(q => q.y));
            if (panel.RowIndex === 0 && Math.abs(unitLow + (numbers.GlassStopAlongPitchMm - numbers.EdgeClearanceMm)) > 1e-6) problems.push(`${panel.Id} unit eaves at ${unitLow.toFixed(3)}`);
            if (panel.RowIndex === 0 && Math.abs(outerLow + numbers.CapExtensionAlongPitchMm) > 1e-6) problems.push(`${panel.Id} top pane eaves at ${outerLow.toFixed(3)}`);

            // Hips and ridge: on an equal pitch hipped roof the closed forms hold exactly.
            if (isHipped) {
                const face = skeleton.Faces.find(f => f.Id === panel.FaceId);
                const facePts = face.Points.map(p => to2d(panel.Frame, p));
                const hipClear = predicted(numbers.HipWebHalfWidthMm, backing(c.p)) + numbers.EdgeClearanceMm;
                const ridgeClear = predicted(numbers.RidgeWebHalfWidthMm, c.p * DEG) + numbers.EdgeClearanceMm;
                ring.forEach((a, i) => {
                    const kind = panel.Edges[i].Kind;
                    if (kind !== 'hip' && kind !== 'ridge') return;
                    const b = ring[(i + 1) % ring.length];
                    const want = kind === 'hip' ? hipClear : ridgeClear;
                    // The face edge this panel edge runs parallel to.
                    let best = Infinity;
                    facePts.forEach((f0, j) => {
                        const f1 = facePts[(j + 1) % facePts.length];
                        const len = Math.hypot(f1.x - f0.x, f1.y - f0.y); if (len < 1) return;
                        const nx = -(f1.y - f0.y) / len, ny = (f1.x - f0.x) / len;
                        const da = Math.abs((a.x - f0.x) * nx + (a.y - f0.y) * ny), db = Math.abs((b.x - f0.x) * nx + (b.y - f0.y) * ny);
                        if (Math.abs(da - db) < 1e-6) best = Math.min(best, da);
                    });
                    if (Math.abs(best - want) > 1e-6) problems.push(`${panel.Id} ${kind} edge ${best.toFixed(4)} mm off, want ${want.toFixed(4)}`);
                });
            }
        });

        // Types: codes, order, totals, mirror pairs.
        const types = set.Types;
        const sum = types.reduce((n, t) => n + t.Quantity, 0);
        if (sum !== set.Panels.length) problems.push(`type quantities total ${sum} against ${set.Panels.length} panels`);
        types.forEach((t, i) => {
            if (t.Code !== 'RU' + String(i + 1).padStart(2, '0')) problems.push(`type ${i} coded ${t.Code}`);
            if (i > 0 && t.AreaSqMm > types[i - 1].AreaSqMm + 1) problems.push(`${t.Code} larger than ${types[i - 1].Code}`);
        });
        const mirror = ring => { const xs = ring.map(q => -q.x); const minX = Math.min(...xs); return ring.map(q => ({ x: -q.x - minX, y: q.y })).reverse(); };
        const same = (a, b) => a.length === b.length && a.some((_, k) => a.every((p, i) => Math.abs(p.x - b[(i + k) % b.length].x) < 0.5 && Math.abs(p.y - b[(i + k) % b.length].y) < 0.5));
        types.forEach(t => {
            const m = mirror(t.OuterOutline2d);
            const partner = types.find(u => same(u.OuterOutline2d, m));
            if (!partner) problems.push(`${t.Code} has no mirror type`);
            else if (partner.Quantity !== t.Quantity) problems.push(`${t.Code} x${t.Quantity} but its mirror ${partner.Code} x${partner.Quantity}`);
        });

        check(`${label}: ${set.Panels.length} panels, ${types.length} types, all clear`, problems.length === 0 && set.Warnings.length === 0,
            problems.length ? `(${problems.length} problems: ${problems.slice(0, 3).join('; ')})` : '');
    });

    // A lantern turned through 90 degrees in plan cuts the same panels.
    const summary = s => s.Types.map(t => `${t.Quantity}:${t.WidthMm.toFixed(2)}x${t.LengthMm.toFixed(2)}:${t.UnitLengthMm.toFixed(2)}`).join(' ');
    check('a lantern deeper than wide cuts the same panels', summary(solveOf({ w: 6000, d: 2500, p: 25 }).set) === summary(solveOf({ w: 2500, d: 6000, p: 25 }).set));

    // -- THE EXPORT CARRIES THEM ---------------------------------------------
    const ref = solveOf({ w: 6000, d: 2500, p: 25 });
    const Encoders = sb.VghLantern__SketchUpExport__Encoders__BaseAndRoof;
    const parts = Encoders.VghLantern__SketchUpExport__Encoders__Glazing(ref.skeleton, ref.barSet, ref.lantern);
    const units = parts.filter(p => p.Attributes.PartRole === 'glazingUnit');
    const lips  = parts.filter(p => p.Attributes.PartRole === 'glazingTopPaneOversail');
    const withLips = ref.set.Panels.filter(p => p.LipOutline3d.length >= 3).length;
    console.log('');
    check('the export carries one unit per panel and one lip per oversail',
        units.length === ref.set.Panels.length && lips.length === withLips, `(${units.length} units, ${lips.length} lips)`);
    check('every exported part is named uniquely and carries its code',
        new Set(parts.map(p => p.Name)).size === parts.length && parts.every(p => /^RU\d\d$/.test(p.Attributes.PanelCode)),
        `(e.g. ${units[0].Name}, ${lips[0].Name})`);

    // Lifted where the layout cut them: the unit from the bedding face out, the
    // lip across the top pane only, and the lip's outer edge at the cap end level.
    const p0 = ref.set.Panels[0], n = p0.Normal, o = p0.Outline3d[0];
    const lift = pt => (pt[0] - o.x) * n.x + (pt[1] - o.y) * n.y + (pt[2] - o.z) * n.z;
    const u0 = units.find(u => u.Attributes.PanelId === p0.Id), l0 = lips.find(l => l.Attributes.PanelId === p0.Id);
    check('the unit spans the bedding face to the outer face',
        u0.PointsA.every(t => Math.abs(lift(t) - b0) < 0.01) && u0.PointsB.every(t => Math.abs(lift(t) - b1) < 0.01));
    check('the lip spans the top pane only',
        l0.PointsA.every(t => Math.abs(lift(t) - (b1 - numbers.OuterPaneThicknessMm)) < 0.01) && l0.PointsB.every(t => Math.abs(lift(t) - b1) < 0.01));
    const p = ref.skeleton.Meta.PitchDegrees * DEG;
    const capEndOuterZ = ref.skeleton.Meta.EavesLevelMm - numbers.CapExtensionAlongPitchMm * Math.sin(p) + b1 * Math.cos(p);
    const lipLow = Math.min(...lips.map(l => Math.min(...l.PointsB.map(t => t[2]))));
    check('the top pane reaches the cap end level', Math.abs(lipLow - capEndOuterZ) < 0.01,
        `(lip outer face foot z ${lipLow.toFixed(3)}, cap end level ${capEndOuterZ.toFixed(3)})`);

    const fallback = Encoders.VghLantern__SketchUpExport__Encoders__Glazing(ref.skeleton);
    check('without a bar set the export falls back to one slab per slope',
        fallback.length === ref.skeleton.Faces.filter(f => f.Role === 'glazingFace').length, `(${fallback.length} slabs)`);

    console.log('');
    console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
    process.exit(failures === 0 ? 0 : 1);
})();
