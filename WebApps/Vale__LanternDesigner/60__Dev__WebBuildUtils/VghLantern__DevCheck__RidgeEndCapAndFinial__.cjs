// Proves the ridge end cap lands where the capping stops, and that the ball
// finial lands on top of it.
//
// Three things had to agree for the ridge end to close up, and all three are
// numbers somebody could change independently:
//
//   the cap's socket face      95mm along its own local +Y, in the asset file
//   the capping's cut back     CappingInsetMm, in the ridge system index
//   the finial's seating       its base Z, against the cap's top face
//
// Runs the REAL geometry brain and the REAL ridge system loader (fetch backed by
// the filesystem) rather than stubbing them into agreement. No browser.
const fs   = require('fs');
const vm   = require('vm');
const path = require('path');

const APP = path.join(__dirname, '..');
const MOD = path.join(APP, '02__Src__AppModules');
const LIB = path.join(APP, '05__Data__LanternComponentLibrary');
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));

const appConfig = Object.assign({},
    readJson(path.join(MOD, '02__AppData/VghLantern__AppConfig__Main__.json')),
    readJson(path.join(MOD, '02__AppData/Na__PbrMaterials__Config.json')));

const sandbox = { console, Math, JSON, Date, isNaN, isFinite, parseInt, parseFloat, Number, String, Array, Object, Set, Promise, setTimeout };
sandbox.window = sandbox;
sandbox.VghLantern__AppCore__StateManager = { VghLantern__StateManager__GetAppConfig: () => appConfig };

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
    '02__AppData/VghLantern__AppData__RidgeHipDepthTable__.js',
    '02__AppData/VghLantern__AppData__RidgeSystemLoader__.js',
    '05__Env2d__SvgRenderPipeline/VghLantern__Env2d__ComponentPathRenderer__.js'
].forEach(load);

const Geometry     = sandbox.VghLantern__Geometry__RidgeAssembly;
const RidgeLoader  = sandbox.VghLantern__AppData__RidgeSystemLoader;
const PathRenderer = sandbox.VghLantern__Env2d__ComponentPathRenderer;

let failures = 0;
const check = (label, ok, detail) => {
    console.log(`${ok ? 'PASS ' : 'FAIL '} ${label}${detail ? '  ' + detail : ''}`);
    if (!ok) failures++;
};
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol);

const DEG = Math.PI / 180;

// The two ways a lantern can be proportioned. The solver runs the ridge along
// whichever axis is longer, so both bearings have to work.
const ridgeSkeleton = (axis, half, level) => ({
    Members : [{
        Id    : 'ridge_0',
        Role  : 'ridge',
        Start : axis === 'x' ? { x: -half, y: 0, z: level } : { x: 0, y: -half, z: level },
        End   : axis === 'x' ? { x:  half, y: 0, z: level } : { x: 0, y:  half, z: level }
    }],
    FinialAnchors : []
});

(async () => {
    await RidgeLoader.VghLantern__RidgeSystemLoader__LoadIndex();

    const capped = { 'Lantern__RidgeAndHips__Config': { 'Lantern__RidgeAndHips__Config__RidgeTypeKey': 'aluminiumCapped' } };
    const leaded = { 'Lantern__RidgeAndHips__Config': { 'Lantern__RidgeAndHips__Config__RidgeTypeKey': 'leadedOnly' } };

    const relationship = RidgeLoader.VghLantern__RidgeSystemLoader__EndCapRelationship();
    const insetMm      = Number(relationship.CappingInsetMm);

    console.log(`\nEnd cap inset declared as ${insetMm} mm, seating band ${relationship.SeatBaseZMm} to ${relationship.SeatTopZMm}\n`);

    // -- 1 | THE CAP IS TURNED TO FACE BACK DOWN THE RIDGE --------------------
    for (const axis of ['x', 'y']) {
        const skeleton   = ridgeSkeleton(axis, 900, 2000);
        const member     = skeleton.Members[0];
        const placements = Geometry.VghLantern__RidgeAssembly__EndCapPlacements(skeleton);

        check(`a cap is placed at both ends of a ${axis} ridge`, placements.length === 2);

        const facing = placements.every(p => {
            const t      = p.PlanRotationDegrees * DEG;
            const localY = { x: -Math.sin(t), y: Math.cos(t) };            // <-- asset local +Y in model plan
            const far    = p.Id.indexOf('start') !== -1 ? member.End : member.Start;
            const len    = Math.hypot(far.x - p.Point.x, far.y - p.Point.y) || 1;
            return near(((localY.x * (far.x - p.Point.x)) + (localY.y * (far.y - p.Point.y))) / len, 1, 1e-9);
        });
        check(`both caps point local +Y down the ${axis} ridge`, facing,
            `(${placements.map(p => p.PlanRotationDegrees + ' deg').join(' and ')})`);

        check(`the two caps on an ${axis} ridge are a half turn apart`,
            near(Math.abs(placements[0].PlanRotationDegrees - placements[1].PlanRotationDegrees) % 360, 180));

        check(`a cap origin sits on the ridge end point (${axis})`,
            near(placements[0].Point.x, member.Start.x) && near(placements[0].Point.y, member.Start.y)
            && near(placements[0].Point.z, member.Start.z));
    }

    // -- 2 | THE CAPPING IS CUT BACK TO THE SOCKET ---------------------------
    for (const axis of ['x', 'y']) {
        const skeleton = ridgeSkeleton(axis, 900, 2000);
        const member   = skeleton.Members[0];

        const capping = Geometry.VghLantern__RidgeAssembly__EndPlanesForPart('capping', skeleton);
        const beam    = Geometry.VghLantern__RidgeAssembly__EndPlanesForPart('beam',    skeleton);

        check(`the capping is cut ${insetMm}mm in at both ends of an ${axis} ridge`,
            near(Math.hypot(capping.Start.Point.x - member.Start.x, capping.Start.Point.y - member.Start.y), insetMm)
            && near(Math.hypot(capping.End.Point.x - member.End.x, capping.End.Point.y - member.End.y), insetMm));

        const before = Math.hypot(member.End.x - member.Start.x, member.End.y - member.Start.y);
        const after  = Math.hypot(capping.End.Point.x - capping.Start.Point.x,
                                  capping.End.Point.y - capping.Start.Point.y);
        check(`the cut shortens the capping rather than moving it (${axis})`,
            near(before - after, insetMm * 2) && after < before,
            `(${before}mm run becomes ${after}mm)`);

        check(`the beam still dies into the block facet, not the cap (${axis})`,
            near(Math.hypot(beam.Start.Point.x - member.Start.x, beam.Start.Point.y - member.Start.y), 67.5));

        check(`the spine and the concealed layers still run full length (${axis})`,
            ['core', 'blocking', 'flashing', 'cappingBlock']
                .every(k => Geometry.VghLantern__RidgeAssembly__EndPlanesForPart(k, skeleton) === null));
    }

    // -- 3 | THE APEX TAKES THE OTHER VARIANT --------------------------------
    const pyramid = {
        Members       : [{ Id: 'hip_0', Role: 'hip', Start: { x: -900, y: -900, z: 0 }, End: { x: 0, y: 0, z: 2000 } }],
        FinialAnchors : [{ Id: 'finial_apex', Role: 'apex', Position: { x: 0, y: 0, z: 2000 } }]
    };
    const apex = Geometry.VghLantern__RidgeAssembly__EndCapPlacements(pyramid);

    check('a pyramid takes exactly one cap, at the apex', apex.length === 1 && apex[0].Role === 'apex');
    check('there is no capping to cut on a pyramid',
        Geometry.VghLantern__RidgeAssembly__EndPlanesForPart('capping', pyramid) === null);

    const ridgeVariant = RidgeLoader.VghLantern__RidgeSystemLoader__EndCapVariant('ridgeEnd');
    const apexVariant  = RidgeLoader.VghLantern__RidgeSystemLoader__EndCapVariant('apex');
    check('the two anchor roles resolve to different assets',
        ridgeVariant.AssetId !== apexVariant.AssetId,
        `(${ridgeVariant.AssetId} and ${apexVariant.AssetId})`);

    const apexAsset = await RidgeLoader.VghLantern__RidgeSystemLoader__LoadEndCapAsset('apex');
    check('the pyramid variant loads through the real loader', !!(apexAsset && apexAsset['Na__Asset__Mesh3D']));

    // -- 4 | THE RIDGE TYPE VETO ---------------------------------------------
    check('a capped ridge carries end caps',
        RidgeLoader.VghLantern__RidgeSystemLoader__AllowsEndCaps(capped) === true);
    check('a leaded only ridge does not',
        RidgeLoader.VghLantern__RidgeSystemLoader__AllowsEndCaps(leaded) === false);

    // -- 5 | THE THREE PARTS AGREE IN MILLIMETRES ----------------------------
    const cap    = await RidgeLoader.VghLantern__RidgeSystemLoader__LoadEndCapAsset('ridgeEnd');
    const capBox = cap['Na__Asset__Mesh3D']['Na__Geometry__BoundingBox'];
    const socket = cap['Na__Asset__Mesh3D']['Na__Geometry__Vertices']
        .filter(v => near(v.PosY_mm, insetMm, 1e-6));

    check('the cap asset has a flat face at the declared inset',
        near(capBox['Na__Geometry__MaxY_mm'], insetMm) && socket.length > 0,
        `(${socket.length} vertices on it)`);

    const cappingPart = RidgeLoader.VghLantern__RidgeSystemLoader__GetPart('capping');
    const socketMaxX  = Math.max(...socket.map(v => v.PosX_mm));
    const socketMinZ  = Math.min(...socket.map(v => v.PosZ_mm));
    const socketMaxZ  = Math.max(...socket.map(v => v.PosZ_mm));

    // 0.01mm rather than exact: the cap is modelled a couple of microns proud of
    // the section so the extrusion enters the socket rather than fouling it.
    check('the socket face is the capping section',
        near(socketMaxX, cappingPart.SectionMaxXMm, 0.01)
        && near(socketMinZ, cappingPart.SectionMinYMm, 0.01)
        && near(socketMaxZ, cappingPart.SectionMaxYMm, 0.01),
        `(socket X ${socketMaxX} Z ${socketMinZ}..${socketMaxZ} against section X ${cappingPart.SectionMaxXMm} Y ${cappingPart.SectionMinYMm}..${cappingPart.SectionMaxYMm})`);

    check('the cap fills the capping band and no more',
        near(capBox['Na__Geometry__MinZ_mm'], Number(relationship.SeatBaseZMm))
        && near(capBox['Na__Geometry__MaxZ_mm'], Number(relationship.SeatTopZMm)));

    const finial = readJson(path.join(LIB, '50_1000__Roof__Finials/50_1001__Finial__Ball__SmallVariantBallFinial__.json'));
    const finialBox = finial['Na__Asset__Mesh3D']['Na__Geometry__BoundingBox'];

    check('the finial base sits exactly on the cap top face',
        near(finialBox['Na__Geometry__MinZ_mm'], capBox['Na__Geometry__MaxZ_mm']),
        `(finial from ${finialBox['Na__Geometry__MinZ_mm']}mm, cap top ${capBox['Na__Geometry__MaxZ_mm']}mm)`);

    const apexBox = apexAsset['Na__Asset__Mesh3D']['Na__Geometry__BoundingBox'];
    check('the pyramid variant shares the seating band',
        near(apexBox['Na__Geometry__MinZ_mm'], capBox['Na__Geometry__MinZ_mm'])
        && near(apexBox['Na__Geometry__MaxZ_mm'], capBox['Na__Geometry__MaxZ_mm']));
    check('the pyramid variant has no ridge return',
        near(apexBox['Na__Geometry__MaxY_mm'], Math.abs(apexBox['Na__Geometry__MinY_mm']), 0.01)
        && apexBox['Na__Geometry__MaxY_mm'] < insetMm,
        `(reaches ${apexBox['Na__Geometry__MaxY_mm']}mm, against ${insetMm}mm on the ridge end variant)`);

    // -- 6 | THE 2D VIEWS DRAW THE TURNED CAP WHERE THE MODEL PUTS IT ---------
    // An elevation of a turned component cannot come from rotating its elevation,
    // so OrientedView picks a different exported block and mirrors it. This checks
    // that answer against a direct projection of the real turned point.
    const PROJECT = {
        plan           : p => ({ x:  p.x, y: -p.y }),
        frontElevation : p => ({ x:  p.x, y: -p.z }),
        sideElevation  : p => ({ x:  p.y, y: -p.z })
    };
    const LOCAL = {
        plan  : a => ({ X: a.X, Y: a.Y }),
        right : a => ({ X: a.Y, Y: a.Z }),
        front : a => ({ X: a.X, Y: a.Z })
    };

    const A      = { X: 37.5, Y: -92.333, Z: 71.25 };                      // <-- deliberately asymmetric in all three
    const anchor = { x: 1250, y: -430, z: 2000 };
    let mismatches = 0;

    for (const viewKey of Object.keys(PROJECT)) {
        for (const theta of [0, 90, 180, 270, -90]) {
            const c = Math.round(Math.cos(theta * DEG));
            const s = Math.round(Math.sin(theta * DEG));

            const want = PROJECT[viewKey]({
                x : anchor.x + (A.X * c) - (A.Y * s),
                y : anchor.y + (A.X * s) + (A.Y * c),
                z : anchor.z + A.Z
            });

            const at       = PROJECT[viewKey](anchor);
            const oriented = PathRenderer.VghLantern__ComponentPathRenderer__OrientedView(viewKey, theta);
            const local    = LOCAL[oriented.AssetViewKey](A);
            const m        = oriented.Orientation;

            const got = {
                x : at.x + (m.M00 * local.X) + (m.M01 * local.Y),
                y : at.y - ((m.M10 * local.X) + (m.M11 * local.Y))
            };

            if (!near(got.x, want.x, 1e-9) || !near(got.y, want.y, 1e-9)) {
                mismatches++;
                console.log(`       ${viewKey} @ ${theta} via ${oriented.AssetViewKey}: got ${got.x},${got.y} want ${want.x},${want.y}`);
            }
        }
    }
    check('every view and quarter turn draws the cap where the model puts it', mismatches === 0,
        `(${Object.keys(PROJECT).length * 5} combinations)`);

    console.log('');
    console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
    process.exitCode = failures === 0 ? 0 : 1;
})();
