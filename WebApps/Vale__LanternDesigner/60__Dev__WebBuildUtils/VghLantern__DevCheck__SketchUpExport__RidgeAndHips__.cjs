// Proves the exported ridge and hip are the assemblies the 3D viewport builds,
// and that every prism in them imports the right way out.
//
// Runs the REAL geometry brain, the REAL system loaders (fetch backed by the
// filesystem) and the REAL encoder against a project lantern. No browser.
const fs   = require('fs');
const vm   = require('vm');
const path = require('path');

const APP = path.join(__dirname, '..');
const MOD = path.join(APP, '02__Src__AppModules');
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));

const appConfig = Object.assign({},
    readJson(path.join(MOD, '02__AppData/VghLantern__AppConfig__Main__.json')),
    readJson(path.join(MOD, '02__AppData/Na__PbrMaterials__Config.json')),
    readJson(path.join(MOD, '06__Env3d__ThreeRenderPipeline/Na__Env3d__Config.json')),
    readJson(path.join(MOD, '80__System__SketchUpExport/Na__SketchUpExport__Config.json')));

const sandbox = { console, Math, JSON, Date, isNaN, parseInt, parseFloat, Number, String, Array, Object, Promise, setTimeout };
sandbox.window = sandbox;
sandbox.VghLantern__AppCore__StateManager = { VghLantern__StateManager__GetAppConfig: () => appConfig };
sandbox.VghLantern__AppCore__ConfigLoader = {
    VghLantern__ConfigLoader__RequireNumber: (s, k) => (s && typeof s[k] === 'number') ? s[k] : 0,
    VghLantern__ConfigLoader__RequireString: (s, k) => (s && typeof s[k] === 'string') ? s[k] : '',
    VghLantern__ConfigLoader__RequireArray:  (s, k) => (s && Array.isArray(s[k])) ? s[k] : []
};

// The system loaders fetch their indexes and assets. Backing fetch with the
// filesystem runs their real path - index, asset, stitch, cache - rather than
// stubbing them into agreement with the thing under test.
sandbox.fetch = (url) => {
    const target = path.join(APP, String(url).split('?')[0]);
    if (!fs.existsSync(target)) return Promise.resolve({ ok: false, status: 404 });
    const text = fs.readFileSync(target, 'utf8');
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(text)) });
};

vm.createContext(sandbox);
const load = rel => vm.runInContext(fs.readFileSync(path.join(MOD, rel), 'utf8'), sandbox, { filename: rel });

[
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__RoofPitchCalculator__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__BaseFrameAssembly__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__SkeletonSolver__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__SectionLoopBuilder__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__StretchTools__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__RidgeAssembly__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__HipAssembly__.js',
    '02__AppData/VghLantern__AppData__AssetRegistry__.js',
    '02__AppData/VghLantern__AppData__RidgeHipDepthTable__.js',
    '02__AppData/VghLantern__AppData__RidgeSystemLoader__.js',
    '02__AppData/VghLantern__AppData__HipSystemLoader__.js',
    '80__System__SketchUpExport/VghLantern__SketchUpExport__SweepGeometry__.js',
    '80__System__SketchUpExport/VghLantern__SketchUpExport__PartFactory__.js',
    '80__System__SketchUpExport/VghLantern__SketchUpExport__Encoders__JoineryAndComponents__.js',
    '80__System__SketchUpExport/VghLantern__SketchUpExport__Encoders__RidgeAndHips__.js'
].forEach(load);

const project  = readJson(path.join(APP, '07__LocalProjectData/VghLantern__ProjectFile__3010__Walkers_Palace__.json'));
const lantern  = project['VghLantern__ProjectFile__Lanterns'][0];
const skeleton = sandbox.VghLantern__Geometry__SkeletonSolver.VghLantern__SkeletonSolver__Solve(lantern);

let failures = 0;
const check = (label, ok, detail) => {
    console.log(`${ok ? 'PASS ' : 'FAIL '} ${label}${detail ? '  ' + detail : ''}`);
    if (!ok) failures++;
};

// The signed volume of a prism's own triangulation. Positive means the shell is
// wound outward and imports solid; negative means it comes in inside-in. The
// importer reverses a negative one, but a payload that needs reversing is a
// payload with a winding fault in it.
function signedVolume(part) {
    let total = 0;
    const A = part.PointsA, B = part.PointsB;
    const tet = (p, q, r) =>
        (p[0] * (q[1] * r[2] - q[2] * r[1])
       - p[1] * (q[0] * r[2] - q[2] * r[0])
       + p[2] * (q[0] * r[1] - q[1] * r[0])) / 6;

    part.Rings.forEach(ring => {
        for (let k = 0; k < ring.Count; k++) {
            const i = ring.Start + k;
            const j = ring.Start + ((k + 1) % ring.Count);
            total += tet(A[i], A[j], B[j]);
            total += tet(A[i], B[j], B[i]);
        }
    });
    return total;
}

(async () => {
    const warnings = [];
    const result   = await sandbox.VghLantern__SketchUpExport__Encoders__RidgeAndHips
        .VghLantern__SketchUpExport__Encoders__RidgeAndHips(skeleton, lantern, warnings);

    const parts = result.Parts;
    const role  = p => p.Attributes.PartRole;
    const meta  = skeleton.Meta;

    console.log(`\nLantern  ${meta.WidthMm} x ${meta.DepthMm} mm at ${meta.PitchDegrees} deg`);
    console.log(`Exported ${parts.length} ridge and hip parts, ${result.Definitions.length} definition(s)\n`);

    // -- COVERAGE ------------------------------------------------------------
    const ridgeRoles = ['ridgeCore', 'ridgeBeam', 'ridgeBlocking', 'ridgeFlashing', 'ridgeCappingBlock', 'ridgeCapping'];
    const hipRoles   = ['hipCore', 'hipBeam', 'hipBlocking', 'hipFlashing'];
    const hipCount   = skeleton.Members.filter(m => m.Role === 'hip').length;

    check('every ridge part was exported once',
        ridgeRoles.every(r => parts.filter(p => role(p) === r).length === 1),
        `(${ridgeRoles.map(r => r.replace('ridge', '') + ':' + parts.filter(p => role(p) === r).length).join(' ')})`);

    check('every hip part was exported on every hip',
        hipRoles.every(r => parts.filter(p => role(p) === r).length === hipCount),
        `(${hipCount} hips, ${hipRoles.map(r => r.replace('hip', '') + ':' + parts.filter(p => role(p) === r).length).join(' ')})`);

    const definitionFor = key => result.Definitions.find(d => d.Key === key);

    const blocks = parts.filter(p => role(p) === 'ridgeBlock');
    check('a block was placed at every ridge end', blocks.length === 2, `(${blocks.length} placed)`);
    check('the block travels with exactly one definition',
        blocks.length > 0
        && new Set(blocks.map(b => b.DefinitionKey)).size === 1
        && definitionFor(blocks[0].DefinitionKey) !== undefined,
        blocks.length ? `(${definitionFor(blocks[0].DefinitionKey).VertexCount} vertices, ${definitionFor(blocks[0].DefinitionKey).FaceCount} faces)` : '');

    // -- THE END CAP ---------------------------------------------------------
    // One at each ridge end, sharing a definition the way the block does, and
    // sprayed with the capping rather than painted with the joinery.
    const caps = parts.filter(p => role(p) === 'ridgeEndCap');
    check('an end cap was placed at every ridge end', caps.length === 2, `(${caps.length} placed)`);
    check('the end cap travels with exactly one definition',
        caps.length > 0
        && new Set(caps.map(c => c.DefinitionKey)).size === 1
        && definitionFor(caps[0].DefinitionKey) !== undefined,
        caps.length ? `(${definitionFor(caps[0].DefinitionKey).VertexCount} vertices, ${definitionFor(caps[0].DefinitionKey).FaceCount} faces)` : '');
    check('the end cap is the ridge end variant, not the pyramid one',
        caps.every(c => c.Attributes.PartCode === '47_1011'),
        `(${caps.map(c => c.Attributes.PartCode).join(' ')})`);
    check('the end cap follows the capping finish',
        caps.every(c => c.MaterialKey === 'ridgeCappingFinish'));
    // The cap's socket must face back down the ridge. Its local +Y is the
    // transform's Y axis, so the test is that axis pointing at the OTHER end -
    // which also proves the two caps are the half turn apart that stands in for
    // the mirrored instance.
    const ridgeMember = skeleton.Members.find(m => m.Role === 'ridge');
    const inwardOk = caps.every(c => {
        const o     = c.Transform.Origin;
        const far   = Math.hypot(ridgeMember.Start.x - o[0], ridgeMember.Start.y - o[1]) > 1
                    ? ridgeMember.Start : ridgeMember.End;
        const dx    = far.x - o[0], dy = far.y - o[1];
        const len   = Math.hypot(dx, dy) || 1;
        return (((c.Transform.YAxis[0] * dx) + (c.Transform.YAxis[1] * dy)) / len) > 0.999;
    });
    check('every cap points its socket back down the ridge', caps.length === 2 && inwardOk,
        `(${caps.map(c => '[' + c.Transform.YAxis.join(',') + ']').join(' ')})`);

    check('the block and the cap do not share a definition',
        blocks.length > 0 && caps.length > 0 && blocks[0].DefinitionKey !== caps[0].DefinitionKey);

    // -- TAGS AND MATERIALS --------------------------------------------------
    const Factory   = sandbox.VghLantern__SketchUpExport__PartFactory;
    const tagKeys   = Factory.VghLantern__SketchUpExport__PartFactory__TagTable().map(t => t.Key);
    const matKeys   = Factory.VghLantern__SketchUpExport__PartFactory__MaterialTable().map(m => m.Key)
                        .concat(['frameFinish', 'joineryFinish', 'ridgeCappingFinish']);

    const badTag = parts.filter(p => tagKeys.indexOf(p.TagKey) === -1);
    check('every part names a declared tag', badTag.length === 0,
        badTag.length ? `(${[...new Set(badTag.map(p => p.TagKey))].join(', ')})` : `(${parts.length} parts)`);

    const badMat = parts.filter(p => matKeys.indexOf(p.MaterialKey) === -1);
    check('every part names a declared material', badMat.length === 0,
        badMat.length ? `(${[...new Set(badMat.map(p => p.MaterialKey))].join(', ')})` : '');

    // -- GEOMETRY ------------------------------------------------------------
    const prisms = parts.filter(p => p.Kind === 'prism');
    const coords = prisms.flatMap(p => p.PointsA.concat(p.PointsB)).flat();
    check('no coordinate is NaN', coords.every(v => typeof v === 'number' && isFinite(v)),
        `(${coords.length} numbers)`);

    const inverted = prisms.filter(p => signedVolume(p) <= 0);
    check('every prism is wound outward', inverted.length === 0,
        inverted.length ? `(${inverted.map(p => p.Name).join(', ')})` : `(${prisms.length} prisms, all positive)`);

    const ringsOk = prisms.every(p => p.PointsA.length === p.PointsB.length
        && p.Rings.reduce((n, r) => n + r.Count, 0) === p.PointsA.length);
    check('both rings of every prism address the same section', ringsOk);

    // -- THE DEPTH PAIRING ---------------------------------------------------
    // The one number that says the ridge and hip were resolved together.
    const ridgeBeam = parts.find(p => role(p) === 'ridgeBeam');
    const hipBeam   = parts.find(p => role(p) === 'hipBeam');
    check('both beams report the same standards row',
        ridgeBeam.Attributes.DepthStandardPitchDeg === hipBeam.Attributes.DepthStandardPitchDeg,
        `(built to the ${ridgeBeam.Attributes.DepthStandardPitchDeg} deg standard: ridge ${ridgeBeam.Attributes.BeamDepthMm} mm, hip ${hipBeam.Attributes.BeamDepthMm} mm)`);

    // -- THE LEADED ONLY RIDGE ----------------------------------------------
    // A type change must drop two parts and nothing else.
    const leaded = JSON.parse(JSON.stringify(lantern));
    leaded['Lantern__RidgeAndHips__Config']['Lantern__RidgeAndHips__Config__RidgeTypeKey'] = 'leadedOnly';
    const leadedResult = await sandbox.VghLantern__SketchUpExport__Encoders__RidgeAndHips
        .VghLantern__SketchUpExport__Encoders__RidgeAndHips(skeleton, leaded, []);
    const leadedRoles = leadedResult.Parts.map(role);

    check('a leaded only ridge drops the capping, its block and the end cap',
        leadedRoles.indexOf('ridgeCapping') === -1
        && leadedRoles.indexOf('ridgeCappingBlock') === -1
        && leadedRoles.indexOf('ridgeEndCap') === -1,
        `(${leadedResult.Parts.length} parts against ${parts.length})`);
    check('a leaded only ridge keeps everything else',
        ['ridgeCore', 'ridgeBeam', 'ridgeBlocking', 'ridgeFlashing'].every(r => leadedRoles.indexOf(r) !== -1));

    if (warnings.length) {
        console.log('\nWarnings carried into the payload:');
        warnings.forEach(w => console.log('  ' + w));
    }

    console.log('');
    console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
    process.exitCode = failures === 0 ? 0 : 1;
})();
