// Proves two things that used to be nobody's job.
//
//   THE REGISTRY  Every AssetId a system index names resolves to a file that is
//                 actually on disk, and no id is claimed twice. Before the
//                 registry, an index and a folder could disagree indefinitely -
//                 which is exactly what happened when the glaze bar folder was
//                 renamed and five urls were left aimed at deleted files.
//
//   THE BAR CAP   The decorative cap on the end of each glaze bar lands at the
//                 station the cap extrusion is cut at, on the seating plane, in a
//                 frame that is orthonormal and right handed - so it can never
//                 come out mirrored on one slope and right on the other three.
//
// Runs the REAL geometry brain, the REAL loaders and the REAL registry, with
// fetch backed by the filesystem. No browser.
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

const sandbox = { console, Math, JSON, Date, isNaN, isFinite, parseInt, parseFloat,
                  Number, String, Array, Object, Set, Map, Promise, setTimeout };
sandbox.window = sandbox;
sandbox.VghLantern__AppCore__StateManager = { VghLantern__StateManager__GetAppConfig: () => appConfig };
sandbox.VghLantern__AppCore__ConfigLoader = {
    VghLantern__ConfigLoader__RequireNumber: (s, k) => (s && typeof s[k] === 'number') ? s[k] : 0,
    VghLantern__ConfigLoader__RequireString: (s, k) => (s && typeof s[k] === 'string') ? s[k] : '',
    VghLantern__ConfigLoader__RequireArray:  (s, k) => (s && Array.isArray(s[k])) ? s[k] : []
};

// Filesystem backed fetch, so the loaders run their real path - registry, index,
// asset, stitch, cache - rather than being stubbed into agreement.
sandbox.fetch = (url) => {
    const clean  = String(url).split('?')[0];
    const target = clean.startsWith('/api/') ? null : path.join(APP, clean);
    if (!target || !fs.existsSync(target)) return Promise.resolve({ ok: false, status: 404 });
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
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__GlazeBarLayout__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__GlazeBarAssembly__.js',
    '02__AppData/VghLantern__AppData__AssetRegistry__.js',
    '02__AppData/VghLantern__AppData__GlazeBarSetOutModes__.js',
    '02__AppData/VghLantern__AppData__GlazeBarSystemLoader__.js',
    '02__AppData/VghLantern__AppData__BaseFrameSystemLoader__.js',
    '02__AppData/VghLantern__AppData__RidgeHipDepthTable__.js',
    '02__AppData/VghLantern__AppData__RidgeSystemLoader__.js',
    '02__AppData/VghLantern__AppData__HipSystemLoader__.js',
    '02__AppData/VghLantern__AppData__InteriorJoinerySystemLoader__.js'
].forEach(load);

const Registry   = sandbox.VghLantern__AppData__AssetRegistry;
const GlazeBars  = sandbox.VghLantern__AppData__GlazeBarSystemLoader;
const BarGeom    = sandbox.VghLantern__Geometry__GlazeBarAssembly;
const Layout     = sandbox.VghLantern__Geometry__GlazeBarLayout;
const Solver     = sandbox.VghLantern__Geometry__SkeletonSolver;

let failures = 0;
const check = (label, ok, detail) => {
    console.log(`${ok ? 'PASS ' : 'FAIL '} ${label}${detail ? '  ' + detail : ''}`);
    if (!ok) failures++;
};
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1e-6 : tol);
const dot  = (a, b) => (a.x * b.x) + (a.y * b.y) + (a.z * b.z);
const len  = v => Math.sqrt(dot(v, v));
const cross = (a, b) => ({
    x: (a.y * b.z) - (a.z * b.y),
    y: (a.z * b.x) - (a.x * b.z),
    z: (a.x * b.y) - (a.y * b.x)
});

(async () => {
    await Registry.VghLantern__AssetRegistry__Load();

    const meta = Registry.VghLantern__AssetRegistry__Meta();
    console.log(`\nRegistry generated ${meta.GeneratedDate} - ${meta.AssetCount} assets, ${meta.SystemIndexCount} system indexes\n`);

    // -- 1 | EVERY REGISTERED FILE IS ACTUALLY THERE -------------------------
    const assets  = Registry.VghLantern__AssetRegistry__List();
    const missing = assets.filter(a => !fs.existsSync(path.join(APP, a.Url)));
    check('every registered asset url exists on disk', missing.length === 0,
        missing.length ? '(' + missing.map(a => a.AssetId).join(' ') + ')' : `(${assets.length} checked)`);

    const ids  = assets.map(a => a.AssetId);
    const dupe = ids.filter((id, i) => ids.indexOf(id) !== i);
    check('no product code is claimed twice', dupe.length === 0, dupe.join(' '));

    check('the registry spans both libraries',
        Registry.VghLantern__AssetRegistry__List('component').length > 0
        && Registry.VghLantern__AssetRegistry__List('profile').length > 0,
        `(${Registry.VghLantern__AssetRegistry__List('component').length} component, ${Registry.VghLantern__AssetRegistry__List('profile').length} profile)`);

    // -- 2 | EVERY SYSTEM INDEX RESOLVES ITS OWN PARTS -----------------------
    // Walks each index looking for an AssetId anywhere in it, which catches a
    // part, a trim option and an end cap relationship without knowing the shape
    // any one system happens to use.
    const collectIds = (node, out) => {
        if (Array.isArray(node)) { node.forEach(n => collectIds(n, out)); return out; }
        if (node && typeof node === 'object') {
            Object.keys(node).forEach(key => {
                if ((key === 'AssetId' || key === 'BlockAssetId') && typeof node[key] === 'string') out.push(node[key]);
                else collectIds(node[key], out);
            });
        }
        return out;
    };

    let namedTotal = 0;
    const unresolved = [];
    for (const key of ['glazeBar', 'ridge', 'hip', 'baseFrame', 'interiorJoinery']) {
        const url = Registry.VghLantern__AssetRegistry__SystemIndexUrl(key);
        if (!url) { unresolved.push(key + ' (index itself)'); continue; }

        const named = collectIds(readJson(path.join(APP, url)), []);
        namedTotal += named.length;
        named.forEach(id => {
            if (!Registry.VghLantern__AssetRegistry__Url(id)) unresolved.push(key + ':' + id);
        });
    }
    check('every asset id named by a system index resolves', unresolved.length === 0,
        unresolved.length ? '(' + unresolved.join(' ') + ')' : `(${namedTotal} ids across 5 indexes)`);

    // -- 3 | NO PATH SURVIVES IN A SYSTEM INDEX ------------------------------
    // A url left in a data file that nothing reads is the trap this change
    // removed: it looks authoritative, is never exercised, and rots.
    const withUrls = [];
    for (const key of ['glazeBar', 'ridge', 'hip', 'baseFrame', 'interiorJoinery']) {
        const url = Registry.VghLantern__AssetRegistry__SystemIndexUrl(key);
        if (url && /"[A-Za-z]*JsonUrl"|"LibraryRoot"/.test(fs.readFileSync(path.join(APP, url), 'utf8'))) {
            withUrls.push(key);
        }
    }
    check('no system index still writes down a path', withUrls.length === 0, withUrls.join(' '));

    // -- 4 | THE GLAZE BAR RENUMBER IS COMPLETE ------------------------------
    await GlazeBars.VghLantern__GlazeBarSystemLoader__LoadIndex();

    const barParts = GlazeBars.VghLantern__GlazeBarSystemLoader__ListParts();
    const barIds   = collectIds(barParts, []);
    check('every glaze bar profile is in the 45_2xxx block',
        barIds.length > 0 && barIds.every(id => /^45_2\d{3}$/.test(id)), '(' + barIds.join(' ') + ')');

    check('the default trim option moved with them',
        GlazeBars.VghLantern__GlazeBarSystemLoader__DefaultTrimOptionId() === '45_2031',
        '(' + GlazeBars.VghLantern__GlazeBarSystemLoader__DefaultTrimOptionId() + ')');

    for (const id of barIds) {
        const record = Registry.VghLantern__AssetRegistry__Record(id);
        if (record && !record.FileName.startsWith(id)) {
            check('file name matches its product code: ' + id, false, record.FileName);
        }
    }
    check('every glaze bar file name carries its own product code',
        barIds.every(id => (Registry.VghLantern__AssetRegistry__Record(id) || {}).FileName.startsWith(id)));

    // -- 5 | THE END CAP LANDS WHERE THE EXTRUSION STOPS ---------------------
    const project  = readJson(path.join(APP, '07__LocalProjectData/VghLantern__ProjectFile__3010__Walkers_Palace__.json'));
    const lantern  = project['VghLantern__ProjectFile__Lanterns'][0];
    const skeleton = Solver.VghLantern__SkeletonSolver__Solve(lantern);
    const barSet   = Layout.VghLantern__GlazeBarLayout__Layout(skeleton, lantern);

    const eavesBars  = barSet.Bars.filter(b => b.EavesEnd === 'start' || b.EavesEnd === 'end');
    const placements   = BarGeom.VghLantern__GlazeBarAssembly__EndCapPlacements(barSet, lantern);
    const relationship = BarGeom.VghLantern__GlazeBarAssembly__EndCapGeometry();

    console.log(`\nLantern ${skeleton.Meta.WidthMm} x ${skeleton.Meta.DepthMm} at ${skeleton.Meta.PitchDegrees} deg`);
    console.log(`${barSet.Bars.length} bars, ${eavesBars.length} of them reaching an eaves\n`);

    check('one cap per bar that reaches an eaves, and none for the rest',
        placements.length === eavesBars.length,
        `(${placements.length} caps for ${eavesBars.length} eaves bars, out of ${barSet.Bars.length} bars)`);

    check('the cap asset is the one the index declares',
        relationship.AssetId === '45_1001' && !!Registry.VghLantern__AssetRegistry__Url(relationship.AssetId),
        '(' + relationship.AssetId + ')');

    const orthonormalRight = (x, y, z) => {
        const unit = near(len(x), 1, 1e-9) && near(len(y), 1, 1e-9) && near(len(z), 1, 1e-9);
        const orth = near(dot(x, y), 0, 1e-9) && near(dot(y, z), 0, 1e-9) && near(dot(x, z), 0, 1e-9);
        // Right handed: x cross y must BE z, not its negative. A left handed
        // triple mirrors the mesh and lights it from the inside.
        const right = near(dot(cross(x, y), z), 1, 1e-9);
        return unit && orth && right;
    };

    const badBar = placements.filter(p => !orthonormalRight(p.Along, p.Across, p.Up));
    check('every bar frame is orthonormal and right handed', badBar.length === 0,
        badBar.length ? '(' + badBar.map(p => p.BarId).join(' ') + ')' : `(${placements.length} frames)`);

    // The asset's own axes after the declared angles have been applied. Rotations
    // cannot mirror, so unlike an axis mapping this can never come out left
    // handed - which is the point of expressing it as angles. Asserted anyway,
    // because it is the cheapest possible guard on the rotation maths itself.
    const rot      = relationship.RotationDegrees;
    const badAsset = placements.filter(p => !orthonormalRight(p.AxisX, p.AxisY, p.AxisZ));
    check('the declared rotation resolves right handed on every bar', badAsset.length === 0,
        badAsset.length ? '(' + badAsset.map(p => p.BarId).join(' ') + ')'
                        : `(local X ${rot.LocalX}, Y ${rot.LocalY}, Z ${rot.LocalZ} degrees)`);

    // At all three angles zero the asset must sit exactly as authored: its own X
    // down the bar, Y across it, Z out through the roof. That is the datum every
    // other setting is a turn away from, so it is worth pinning.
    const sample = placements[0];
    if (rot.LocalX === 0 && rot.LocalY === 0 && rot.LocalZ === 0) {
        check('at zero degrees the asset sits square to the bar',
            near(dot(sample.AxisX, sample.Along), 1, 1e-9)
            && near(dot(sample.AxisY, sample.Across), 1, 1e-9)
            && near(dot(sample.AxisZ, sample.Up), 1, 1e-9));
    }

    // THE VIEWPORT AND THE EXPORTER MUST LAND THE PART IN THE SAME PLACE.
    //
    // They compose the placement differently and always will: the exporter writes
    // the basis in model millimetres and the importer applies it there, while the
    // viewport rotates a mesh whose vertices the MeshJson loader has ALREADY
    // swapped into world orientation, so it needs the basis conjugated.
    //
    // This reads the viewport's columns from the geometry module's own WorldBasis,
    // which is the function the Three builder calls, and compares the placement it
    // produces against the exporter's. Restating the conjugation here instead
    // would be an identity that holds for any basis and would pass whatever the
    // application did - so the check has to go through the real one.
    //
    // Getting this wrong is invisible to every other check in this file. Both
    // forms are proper rotations, both keep the frame orthonormal and right
    // handed, and both leave the cap facing down the roof and sitting the right
    // way up. The only thing that moves is the ROLL about the bar.
    const swap    = v => ({ x : v.x, y : v.z, z : -v.y });                 // <-- Model to world, as ConfigAccess and the vertex table both do it
    const combine = (o, x, y, z, v) => ({
        x : o.x + (x.x * v.x) + (y.x * v.y) + (z.x * v.z),
        y : o.y + (x.y * v.x) + (y.y * v.y) + (z.y * v.z),
        z : o.z + (x.z * v.x) + (y.z * v.y) + (z.z * v.z)
    });

    // Deliberately asymmetric, so no coincidence of the asset's own symmetry can
    // hide a disagreement, and spanning the cap's real extent in every axis.
    const probes  = [ { x : -25, y :  20.5, z : 39 }, { x : -25, y : -20.5, z : 0 },
                      { x :   0, y :  20.5, z :  0 }, { x :  -7, y :  13.0, z : 31 } ];

    const noBasis = placements.filter(p => !BarGeom.VghLantern__GlazeBarAssembly__WorldBasis(p));
    check('every placement resolves a world basis for the viewport', noBasis.length === 0,
        noBasis.length ? '(' + noBasis.map(p => p.BarId).join(' ') + ')' : `(${placements.length} placements)`);

    const drifted = placements.filter(p => {
        const w = BarGeom.VghLantern__GlazeBarAssembly__WorldBasis(p);
        if (!w) return true;
        return probes.some(v => {
            const exporter = swap(combine(p.Point, p.AxisX, p.AxisY, p.AxisZ, v));                // <-- Placed in model space, then viewed in world
            const viewport = combine(swap(p.Point), w.ColumnX, w.ColumnY, w.ColumnZ, swap(v));    // <-- The viewport's own columns on an already swapped vertex
            return !(near(exporter.x, viewport.x, 1e-9)
                  && near(exporter.y, viewport.y, 1e-9)
                  && near(exporter.z, viewport.z, 1e-9));
        });
    });

    check('the viewport and the exporter place the cap identically', drifted.length === 0,
        drifted.length ? '(' + drifted.map(p => p.BarId).join(' ') + ')'
                       : `(${placements.length} caps x ${probes.length} probe points)`);

    // A quarter turn must land exactly on an axis, not near one - so a placement
    // that should be square reads as square rather than as 89.9999 degrees.
    const spun = BarGeom.VghLantern__GlazeBarAssembly__ResolveRotation(
        { LocalX : 0, LocalY : 90, LocalZ : 0 },
        { Along : sample.Along, Across : sample.Across, Up : sample.Up });
    check('a quarter turn lands exactly on an axis',
        near(Math.abs(dot(spun.AxisX, sample.Up)), 1, 1e-12)
        && near(dot(spun.AxisY, sample.Across), 1, 1e-12));

    // Along must run DOWN the roof: a cap turned the other way would face up-slope.
    const upslope = placements.filter(p => p.Along.z >= 0);
    check('every cap faces down the roof towards the eaves', upslope.length === 0,
        upslope.length ? '(' + upslope.map(p => p.BarId).join(' ') + ')' : '');

    // Up must point OUT of the roof, never into it.
    const inward = placements.filter(p => p.Up.z <= 0);
    check('every cap sits the right way up', inward.length === 0,
        inward.length ? '(' + inward.map(p => p.BarId).join(' ') + ')' : '');

    // -- 6 | THE SEATING IS MEASURED ON THE SLOPE, NOT VERTICALLY ------------
    const iface     = sandbox.VghLantern__Geometry__BaseFrameAssembly.VghLantern__BaseFrameAssembly__EavesInterface(lantern);
    const extension = Number(iface.GlazeBarCapExtensionAlongPitchMm);
    const seat      = relationship.SeatSectionYMm;

    let seatOk = true, stationOk = true;
    for (const placement of placements) {
        const bar      = barSet.Bars.find(b => b.Id === placement.BarId);
        const extended = sandbox.VghLantern__Geometry__BaseFrameAssembly
            .VghLantern__BaseFrameAssembly__ExtendedEavesPoint(bar, undefined, extension + relationship.AlongBarOffsetMm);

        // The point must be the cap's own cut station, lifted along Up by the seat.
        const back = {
            x: placement.Point.x - (placement.Up.x * seat),
            y: placement.Point.y - (placement.Up.y * seat),
            z: placement.Point.z - (placement.Up.z * seat)
        };
        if (!(near(back.x, extended.Point.x, 1e-6) && near(back.y, extended.Point.y, 1e-6)
              && near(back.z, extended.Point.z, 1e-6))) stationOk = false;

        // Measured on the slope, so the rise is LESS than the seat on a pitched bar.
        const rise = placement.Point.z - extended.Point.z;
        if (!(rise > 0 && rise < seat)) seatOk = false;
    }

    check('every cap sits on the station the cap extrusion is cut at', stationOk,
        `(${extension}mm past the eaves datum along the pitch)`);
    check('the seat is measured along the slope normal, not vertically', seatOk,
        `(${seat}mm on the section, less than that in rise)`);

    // -- 7 | ONE MESH, HOWEVER MANY BARS -------------------------------------
    const capRecord = Registry.VghLantern__AssetRegistry__Record('45_1001');
    const capAsset  = readJson(path.join(APP, capRecord.Url));
    const box       = capAsset['Na__Asset__Mesh3D']['Na__Geometry__BoundingBox'];

    check('the cap sleeves the bar cap across its width',
        near(box['Na__Geometry__MaxY_mm'] - box['Na__Geometry__MinY_mm'], 41, 0.01),
        `(${box['Na__Geometry__MaxY_mm'] - box['Na__Geometry__MinY_mm']}mm across a 40.584mm cap)`);
    check('the cap sits entirely inboard of its own origin',
        near(box['Na__Geometry__MaxX_mm'], 0, 1e-6) && box['Na__Geometry__MinX_mm'] < 0,
        `(local X ${box['Na__Geometry__MinX_mm']} to ${box['Na__Geometry__MaxX_mm']})`);
    check('the cap is authored from its seating plane upwards',
        near(box['Na__Geometry__MinZ_mm'], 0, 1e-6),
        `(local Z ${box['Na__Geometry__MinZ_mm']} to ${box['Na__Geometry__MaxZ_mm']})`);

    const capSection = GlazeBars.VghLantern__GlazeBarSystemLoader__GetPart('cap');
    check('the seating plane is the base of the cap section',
        near(seat, capSection.SectionMinYMm, 1e-6),
        `(seat ${seat}, cap section from ${capSection.SectionMinYMm})`);
    check('the shield is taller than the section it covers',
        (box['Na__Geometry__MaxZ_mm'] - box['Na__Geometry__MinZ_mm'])
            > (capSection.SectionMaxYMm - capSection.SectionMinYMm),
        `(${box['Na__Geometry__MaxZ_mm']}mm tall over a ${(capSection.SectionMaxYMm - capSection.SectionMinYMm).toFixed(3)}mm section)`);

    console.log('');
    console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
    process.exitCode = failures === 0 ? 0 : 1;
})();
