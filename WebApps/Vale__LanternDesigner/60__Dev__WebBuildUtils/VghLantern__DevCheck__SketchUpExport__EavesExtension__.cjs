// Proves the exported hips and glazing run out to the SAME place the glaze bar
// caps do. The eaves cap end extension is the one thing that cannot be checked
// by looking at a single part: it is only correct relative to the caps beside it.
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

const sandbox = { console, Math, JSON, Date, isNaN, parseInt, parseFloat, Number, String, Array, Object };
sandbox.window = sandbox;
sandbox.VghLantern__AppCore__StateManager = { VghLantern__StateManager__GetAppConfig: () => appConfig };
sandbox.VghLantern__AppCore__ConfigLoader = {
    VghLantern__ConfigLoader__RequireNumber: (s, k) => (s && typeof s[k] === 'number') ? s[k] : 0,
    VghLantern__ConfigLoader__RequireString: (s, k) => (s && typeof s[k] === 'string') ? s[k] : '',
    VghLantern__ConfigLoader__RequireArray:  (s, k) => (s && Array.isArray(s[k])) ? s[k] : []
};
// The ridge and hip system loaders fetch their indexes and their section assets.
// Backing fetch with the filesystem lets them run their REAL code path here -
// index, asset, stitch and cache - rather than being stubbed into agreement with
// the thing under test. Everything else in this file already runs unmodified.
sandbox.fetch = (url) => {
    const target = path.join(APP, String(url).split('?')[0]);
    if (!fs.existsSync(target)) return Promise.resolve({ ok: false, status: 404 });
    const text = fs.readFileSync(target, 'utf8');
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(text)) });
};
sandbox.Promise = Promise;
sandbox.setTimeout = setTimeout;

vm.createContext(sandbox);
const load = rel => vm.runInContext(fs.readFileSync(path.join(MOD, rel), 'utf8'), sandbox, { filename: rel });

[
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__RoofPitchCalculator__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__BaseFrameAssembly__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__SkeletonSolver__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__GlazeBarLayout__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__SectionLoopBuilder__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__StretchTools__.js',
    '02__AppData/VghLantern__AppData__AssetRegistry__.js',
    '02__AppData/VghLantern__AppData__RidgeHipDepthTable__.js',
    '02__AppData/VghLantern__AppData__RidgeSystemLoader__.js',
    '02__AppData/VghLantern__AppData__HipSystemLoader__.js',
    '02__AppData/VghLantern__AppData__ComponentIndexLoader__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__RidgeAssembly__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__HipAssembly__.js',
    '80__System__SketchUpExport/VghLantern__SketchUpExport__SweepGeometry__.js',
    '80__System__SketchUpExport/VghLantern__SketchUpExport__PartFactory__.js',
    '80__System__SketchUpExport/VghLantern__SketchUpExport__Encoders__JoineryAndComponents__.js',
    '80__System__SketchUpExport/VghLantern__SketchUpExport__Encoders__RidgeAndHips__.js',
    '80__System__SketchUpExport/VghLantern__SketchUpExport__Encoders__BaseAndRoof__.js'
].forEach(load);

const project = readJson(path.join(APP, '07__LocalProjectData/VghLantern__ProjectFile__3010__Walkers_Palace__.json'));
const lantern = project['VghLantern__ProjectFile__Lanterns'][0];

const skeleton = sandbox.VghLantern__Geometry__SkeletonSolver.VghLantern__SkeletonSolver__Solve(lantern);
const barSet   = sandbox.VghLantern__Geometry__GlazeBarLayout.VghLantern__GlazeBarLayout__Layout(skeleton, lantern);
const Assembly = sandbox.VghLantern__Geometry__BaseFrameAssembly;
const iface    = Assembly.VghLantern__BaseFrameAssembly__EavesInterface();

const capExt   = Number(iface.GlazeBarCapExtensionAlongPitchMm);
const pitchDeg = skeleton.Meta.PitchDegrees;
const eavesMm  = skeleton.Meta.EavesLevelMm;
const capEndZ  = eavesMm - (capExt * Math.sin(pitchDeg * Math.PI / 180));

console.log(`Lantern     ${skeleton.Meta.WidthMm} x ${skeleton.Meta.DepthMm} mm at ${pitchDeg} deg`);
console.log(`Eaves datum ${eavesMm.toFixed(2)} mm`);
console.log(`Cap extension along pitch ${capExt} mm  ->  cap ends sit at z = ${capEndZ.toFixed(2)} mm\n`);

let failures = 0;
const check = (label, ok, detail) => {
    console.log(`${ok ? 'PASS ' : 'FAIL '} ${label}${detail ? '  ' + detail : ''}`);
    if (!ok) failures++;
};

// -- where the real cap feet actually are -----------------------------------
// Ask BaseFrameAssembly directly, the same way the glaze bar encoder does.
const capFeet = [];
barSet.Bars.forEach(bar => {
    if (bar.EavesEnd !== 'start' && bar.EavesEnd !== 'end') return;
    const ext = Assembly.VghLantern__BaseFrameAssembly__ExtendedEavesPoint(bar, undefined, capExt);
    if (ext) capFeet.push(ext.Point);
});
const capFootZ = capFeet.map(p => p.z);
const capZMin = Math.min(...capFootZ), capZMax = Math.max(...capFootZ);
console.log(`${capFeet.length} glaze bar cap feet, z from ${capZMin.toFixed(2)} to ${capZMax.toFixed(2)}\n`);

check('cap feet all sit at the computed cap end level',
    Math.abs(capZMin - capEndZ) < 0.01 && Math.abs(capZMax - capEndZ) < 0.01,
    `(spread ${(capZMax - capZMin).toFixed(4)} mm)`);

// -- HIPS --------------------------------------------------------------------
// A hip is four parts now, and they deliberately stop in four different places.
// Only the covering oversails to the glass edge, so that is what this asserts -
// and it asserts the other two do NOT, because a beam that reached the cap ends
// would mean the plumb cut had been lost.
const Encoders  = sandbox.VghLantern__SketchUpExport__Encoders__BaseAndRoof;
const RidgeHips = sandbox.VghLantern__SketchUpExport__Encoders__RidgeAndHips;
const roofParts = [];
(async () => {
    const roof = await RidgeHips.VghLantern__SketchUpExport__Encoders__RidgeAndHips(skeleton, lantern, []);
    roof.Parts.forEach(p => roofParts.push(p));

    const roleOf     = p => p.Attributes.PartRole;
    const covering   = roofParts.filter(p => roleOf(p) === 'hipBlocking' || roleOf(p) === 'hipFlashing');
    const beams      = roofParts.filter(p => roleOf(p) === 'hipBeam');
    const cores      = roofParts.filter(p => roleOf(p) === 'hipCore');
    const solvedHips = skeleton.Members.filter(m => m.Role === 'hip');
    const lowZ       = p => Math.min(...p.PointsA.concat(p.PointsB).map(t => t[2]));

    console.log('');
    check('every solved hip carries a blocking and a flashing',
        covering.length === solvedHips.length * 2,
        `(${covering.length} covering parts over ${solvedHips.length} hips)`);
    check('every solved hip carries a beam and a core',
        beams.length === solvedHips.length && cores.length === solvedHips.length,
        `(${beams.length} beams, ${cores.length} cores)`);

    // The covering's own datum foot is what must land on the cap end level. Its
    // section hangs below that line, so measure the run rather than the prism.
    const HipGeom  = sandbox.VghLantern__Geometry__HipAssembly;
    const feetZ    = solvedHips.map(h => HipGeom.VghLantern__HipAssembly__OversailFoot(h, pitchDeg).z);
    const worstFoot = Math.max(...feetZ.map(z => Math.abs(z - capEndZ)));
    check('the hip covering oversails to the cap end level', worstFoot < 0.05,
        `(worst ${worstFoot.toFixed(4)} mm off; feet at z ${feetZ.map(z => z.toFixed(1)).join(', ')})`);

    const solvedLowZ = Math.min(...solvedHips.map(m => Math.min(m.Start.z, m.End.z)));
    check('the oversail is real, not a no-op',
        Math.abs(solvedLowZ - capEndZ) > 1,
        `(solved hip stops at z ${solvedLowZ.toFixed(2)}, ${(solvedLowZ - capEndZ).toFixed(2)} mm above the caps)`);

    const beamDepth = beams[0].Attributes.BeamDepthMm;
    const stdDepth  = beams[0].Attributes.StandardDepthMm;
    console.log(`
Hip beam built at ${beamDepth} mm against the ${stdDepth} mm standard`
        + (beamDepth !== stdDepth ? '  <- this project carries a depth override' : ''));

    const oversailMm = covering[0].Attributes.OversailMm;
    check('the covering reports the oversail it was given',
        oversailMm > 100 && oversailMm < 400,
        `(${oversailMm.toFixed(1)} mm along the hip)`);

    // The beam stops SHORT, and the thing to measure is its DATUM foot rather
    // than its lowest vertex. A beam hangs a couple of hundred millimetres below
    // the datum into the room, so its lowest vertex is always well under the cap
    // ends out at the roof edge; comparing those two says nothing about the cut.
    //
    // What the plumb cut guarantees is that the beam's foot sits 18mm inboard of
    // the eaves corner - up-slope of it, and a long way up-slope of where the
    // covering oversails to.
    const ends      = HipGeom.VghLantern__HipAssembly__EndTreatments();
    const beamFeet  = solvedHips.map(h => HipGeom.VghLantern__HipAssembly__BeamEndPlanes(h).Start.Point);
    const insetOk   = beamFeet.every((pt, i) => {
        const h = solvedHips[i];
        const d = Math.hypot(pt.x - h.Start.x, pt.y - h.Start.y);
        return Math.abs(d - ends.EavesPlumbCutInsetMm) < 0.01;
    });
    check('the hip beam foot sits the plumb cut inset inboard of the eaves corner',
        insetOk, `(${ends.EavesPlumbCutInsetMm} mm on the corner bisector, all four hips)`);

    check('the beam stops short of where the covering runs out to',
        beamFeet.every((pt, i) => pt.z > feetZ[i]),
        `(beam feet at z ${beamFeet.map(p => p.z.toFixed(1)).join(', ')} against covering at ${feetZ[0].toFixed(1)})`);

    // The core is the third answer again: past the datum, but nothing like as far
    // as the covering, because it stops on the eaves extrusion it welds to.
    const coreFeet = solvedHips.map(h => HipGeom.VghLantern__HipAssembly__ExtendedCoreFoot(h));
    const coreRun  = Math.hypot(coreFeet[0].x - solvedHips[0].Start.x,
                                coreFeet[0].y - solvedHips[0].Start.y,
                                coreFeet[0].z - solvedHips[0].Start.z);
    check('the hip core runs the glaze bar core extension past the datum',
        Math.abs(coreRun - ends.CoreExtensionAlongPitchMm) < 0.01,
        `(${coreRun.toFixed(2)} mm against ${ends.CoreExtensionAlongPitchMm} expected)`);

    check('hips report their datum length unchanged',
        beams.every(p => Math.abs(p.Attributes.DatumLengthMm - solvedHips[0].LengthMm) < 1),
        `(datum ${beams[0].Attributes.DatumLengthMm.toFixed(1)} mm)`);

    // -- GLAZING -------------------------------------------------------------
    const panes = Encoders.VghLantern__SketchUpExport__Encoders__Glazing(skeleton);
    console.log('');
    check('every solved glazing face was exported',
        panes.length === skeleton.Faces.filter(f => f.Role === 'glazingFace').length,
        `(${panes.length} panes)`);

    // The pane's lowest ring vertices must reach the cap end level too. The
    // slab is offset off the datum plane along the face normal, so compare the
    // near ring only and allow the bedding offset's vertical component.
    const bedOffset = 8;
    const bedZ = bedOffset * Math.cos(pitchDeg * Math.PI / 180);
    const paneLowZ = panes.map(p => Math.min(...p.PointsA.map(t => t[2])));
    const worstPane = Math.max(...paneLowZ.map(z => Math.abs(z - (capEndZ + bedZ))));
    check('exported pane feet reach the cap end level', worstPane < 0.5,
        `(worst ${worstPane.toFixed(3)} mm off)`);

    const solvedFaceLowZ = Math.min(...skeleton.Faces
        .filter(f => f.Role === 'glazingFace')
        .flatMap(f => f.Points.map(p => p.z)));
    check('the pane extension is real, not a no-op',
        Math.abs(solvedFaceLowZ - capEndZ) > 1,
        `(solved face stops at z ${solvedFaceLowZ.toFixed(2)})`);

    // -- THE COINCIDENCE THAT KEEPS THE HIPS CLOSED --------------------------
    // Two panes meeting on a hip must extend along the SAME hip line by the
    // same amount, so their extended corners land on top of each other. If they
    // do not, a wedge opens at every hip.
    //
    // Checked on the extended DATUM points, not on the built slab. A slab is
    // offset along its own face normal, and two faces on a hip have different
    // normals, so their bedded rings are correctly NOT coincident. It is the
    // datum ring the hip line is shared on.
    const datumRings = skeleton.Faces
        .filter(f => f.Role === 'glazingFace')
        .map(f => Encoders.VghLantern__SketchUpExport__Encoders__ExtendFaceToCapEnds(f, skeleton));

    const key = p => [p.x, p.y, p.z].map(v => v.toFixed(3)).join(',');
    const counts = {};
    datumRings.forEach(ring => ring.forEach(p => { counts[key(p)] = (counts[key(p)] || 0) + 1; }));
    const shared = Object.values(counts).filter(n => n > 1).length;

    // Four hips, each shared by two panes, gives four coincident extended
    // corners on a hipped ridge lantern.
    check('adjacent panes share their extended hip corners exactly',
        shared >= 4,
        `(${shared} extended corners shared by two or more panes)`);

    // And the shared corners must be the ones that moved, not the ridge ends.
    const movedShared = Object.keys(counts)
        .filter(k => counts[k] > 1)
        .filter(k => Math.abs(parseFloat(k.split(',')[2]) - capEndZ) < 0.01);
    check('the shared corners are the extended eaves corners',
        movedShared.length >= 4,
        `(${movedShared.length} shared corners sitting at the cap end level)`);

    console.log('');
    console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
    process.exit(failures === 0 ? 0 : 1);
})();
