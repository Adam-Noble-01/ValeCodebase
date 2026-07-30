// Throwaway verification harness for the hip wrap rule. Delete after use.

const fs    =  require('fs');
const path  =  require('path');

const BASE  =  path.join(__dirname, '02__Src__AppModules');

global.window  =  global;

function load(rel, globalName) {
    const src  =  fs.readFileSync(path.join(BASE, rel), 'utf8');
    (new Function('window', src + '\n; window["' + globalName + '"] = ' + globalName + ';'))(global);
}

load('04__MathUtils__LanternGeometry/VghLantern__Geometry__RoofPitchCalculator__.js', 'VghLantern__Geometry__RoofPitchCalculator');
load('04__MathUtils__LanternGeometry/VghLantern__Geometry__SkeletonSolver__.js',      'VghLantern__Geometry__SkeletonSolver');
load('04__MathUtils__LanternGeometry/VghLantern__Geometry__GlazeBarLayout__.js',      'VghLantern__Geometry__GlazeBarLayout');

const Solver  =  window.VghLantern__Geometry__SkeletonSolver;
const Layout  =  window.VghLantern__Geometry__GlazeBarLayout;

function makeLantern(widthMm, depthMm, roofForm, barCount, transom) {
    return {
        'Lantern__Form__Config' : {
            'Lantern__Form__Config__RoofForm'        : roofForm,
            'Lantern__Form__Config__PlanRotationDeg' : 0
        },
        'Lantern__Dimensions__Config' : {
            'Lantern__Dimensions__Config__WidthMm'            : widthMm,
            'Lantern__Dimensions__Config__DepthMm'            : depthMm,
            'Lantern__Dimensions__Config__KerbHeightMm'       : 150,
            'Lantern__Dimensions__Config__EavesProjectionMm'  : 0
        },
        'Lantern__RoofPitch__Config' : {
            'Lantern__RoofPitch__Config__DriveMode'     : 'angle',
            'Lantern__RoofPitch__Config__PitchDegrees'  : 21,
            'Lantern__RoofPitch__Config__RidgeRiseMm'   : 1850
        },
        'Lantern__GlazingBars__Config' : {
            'Lantern__GlazingBars__Config__DivisionMode'              : 'count',
            'Lantern__GlazingBars__Config__BarCountLongSlope'         : barCount,
            'Lantern__GlazingBars__Config__TargetSpacingMm'           : 500,
            'Lantern__GlazingBars__Config__BarProfileId'              : '',
            'Lantern__GlazingBars__Config__HorizontalTransomEnabled'  : transom === true
        }
    };
}

function key(p) { return [p.x, p.y, p.z].map(function(v) { return Math.round(v * 100) / 100; }).join(','); }

function report(label, widthMm, depthMm, roofForm, barCount, transom) {
    const lantern   =  makeLantern(widthMm, depthMm, roofForm, barCount, transom);
    const skeleton  =  Solver.VghLantern__SkeletonSolver__Solve(lantern);
    const barSet    =  Layout.VghLantern__GlazeBarLayout__Layout(skeleton, lantern);

    console.log('\n=== ' + label + ' ===');
    console.log('form=' + roofForm + '  ' + widthMm + ' x ' + depthMm + '  bars=' + barCount);
    console.log('meta', JSON.stringify(barSet.Meta));
    console.log('warnings', JSON.stringify(barSet.Warnings));

    // Hip line membership test - every wrap corner must lie on a solved hip member.
    const hips  =  skeleton.Members.filter(function(m) { return m.Role === 'hip'; });

    function onSegment(p, a, b) {
        const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
        const apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z;
        const abLen2 = abx*abx + aby*aby + abz*abz;
        if (abLen2 === 0) return false;
        const t = (apx*abx + apy*aby + apz*abz) / abLen2;
        if (t < -1e-6 || t > 1 + 1e-6) return false;
        const cx = a.x + abx*t, cy = a.y + aby*t, cz = a.z + abz*t;
        return Math.hypot(p.x-cx, p.y-cy, p.z-cz) < 0.01;
    }

    function onAnyHip(p) {
        return hips.some(function(h) { return onSegment(p, h.Start, h.End); });
    }

    const ridge  =  skeleton.Members.filter(function(m) { return m.Role === 'ridge'; });
    function onRidge(p) {
        return ridge.some(function(r) { return onSegment(p, r.Start, r.End); });
    }

    const glazing  =  barSet.Bars.filter(function(b) { return b.Role === 'glazingBar'; });
    const longBars =  glazing.filter(function(b) { return b.SlopeKey.indexOf('short') === 0; });
    const hipBars  =  glazing.filter(function(b) { return b.SlopeKey.indexOf('long')  === 0; });

    console.log('long slope bars=' + longBars.length + '   hip end legs=' + hipBars.length);

    // 1. Every long slope bar must end on the ridge or on a hip. No overshoot.
    const badLongEnd  =  longBars.filter(function(b) { return !onRidge(b.End) && !onAnyHip(b.End); });
    console.log('long bars not terminating on ridge/hip : ' + badLongEnd.length);
    badLongEnd.slice(0, 3).forEach(function(b) { console.log('   ' + b.Id + ' end ' + key(b.End)); });

    // 2. Every hip leg must start on a hip and end on the short eaves.
    const halfLong  =  Math.max(skeleton.Meta.EavesHalfWidthMm, skeleton.Meta.EavesHalfDepthMm);
    const badHipStart  =  hipBars.filter(function(b) { return !onAnyHip(b.Start); });
    console.log('hip legs not starting on a hip        : ' + badHipStart.length);
    badHipStart.slice(0, 3).forEach(function(b) { console.log('   ' + b.Id + ' start ' + key(b.Start)); });

    const badHipEnd  =  hipBars.filter(function(b) { return Math.abs(b.End.z - skeleton.Meta.EavesLevelMm) > 0.01; });
    console.log('hip legs not landing on eaves level   : ' + badHipEnd.length);

    // 3. Each hip leg start must coincide EXACTLY with a long slope bar end.
    const longEnds  =  new Set(longBars.map(function(b) { return key(b.End); }));
    const orphaned  =  hipBars.filter(function(b) { return !longEnds.has(key(b.Start)); });
    console.log('hip legs whose corner has no partner  : ' + orphaned.length);
    orphaned.slice(0, 3).forEach(function(b) { console.log('   ' + b.Id + ' start ' + key(b.Start)); });

    // 4. No duplicate bars.
    const seen  =  new Set();
    let dupes   =  0;
    glazing.forEach(function(b) {
        const k  =  key(b.Start) + '|' + key(b.End);
        if (seen.has(k)) dupes++;
        seen.add(k);
    });
    console.log('duplicate glazing bars                : ' + dupes);

    // 5. Right angle check in plan between the two legs of one wrap.
    const wraps  =  hipBars.map(function(leg) {
        const partner  =  longBars.find(function(b) { return key(b.End) === key(leg.Start); });
        if (!partner) return null;
        const v1  =  { x: partner.End.x - partner.Start.x, y: partner.End.y - partner.Start.y };
        const v2  =  { x: leg.End.x - leg.Start.x,         y: leg.End.y - leg.Start.y };
        const dot =  (v1.x*v2.x + v1.y*v2.y) / (Math.hypot(v1.x,v1.y) * Math.hypot(v2.x,v2.y));
        return Math.abs(dot);
    }).filter(function(v) { return v !== null; });
    const worstDot  =  wraps.length ? Math.max.apply(null, wraps) : 0;
    console.log('worst |cos| between wrap legs in plan : ' + worstDot.toFixed(6) + '  (0 = perfect right angle)');

    // 6. Leg length gradation - innermost wrap should have the longest hip leg.
    const legs  =  hipBars
        .filter(function(b) { return b.SlopeKey === 'long-'; })
        .map(function(b) { return b.Id + '=' + Math.round(b.LengthMm); });
    console.log('hip leg lengths (long- end)           : ' + legs.join('  '));

    const transoms  =  barSet.Bars.filter(function(b) { return b.Role === 'transom'; });
    if (transoms.length) {
        const bad  =  transoms.filter(function(t) { return !onAnyHip(t.Start) || !onAnyHip(t.End); });
        console.log('transoms not ending on a hip          : ' + bad.length + ' of ' + transoms.length);
    }
}

report('Test project 2001 shape',        5900, 3300, 'Hipped Ridge', 3);
report('Even bar count',                 5900, 3300, 'Hipped Ridge', 8);
report('Square pyramid',                 3000, 3000, 'Pyramid',      5);
report('NON-SQUARE pyramid',             5900, 3300, 'Pyramid',      7);
report('Hipped ridge with transom',      5900, 3300, 'Hipped Ridge', 5, true);
report('Non-square pyramid with transom',5900, 3300, 'Pyramid',      5, true);
report('Zero bars',                      5900, 3300, 'Hipped Ridge', 0);
