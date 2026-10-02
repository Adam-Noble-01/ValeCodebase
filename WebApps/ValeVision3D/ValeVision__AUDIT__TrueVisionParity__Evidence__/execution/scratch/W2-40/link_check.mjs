// W2-40 scratch (read-only on the app): link and run the five landed files in Node, through
// ValeVision's own import map (register.mjs), as an extra proof beyond G1/G2:
//   [1] all four modules link and evaluate; 'three' and 'three/addons/lines/*' resolve through the map;
//       ConfigState resolves 04__MathUtils/Na__Math__Units.js
//   [2] each module exports exactly TrueVision's names
//   [3] ConfigState: the shipped AppConfig loads, and every getter gives after the load exactly what it
//       gave before it (the fallbacks mirror the JSON - the bounds tokens included)
//   [4] Bounds on a synthetic model named the way ValeVision's loader names groups (current export and
//       older single-bucket export)
//   [5] PlaneMesh: create, dress, move, dispose (a stub canvas stands in for the DOM)
// Run: node --import ./register.mjs link_check.mjs
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const VV  = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const DIR = join(VV, '02__Src__AppModules/47__System__DrawingPlanes');
const url = (f) => pathToFileURL(join(DIR, f)).href;
let checks = 0;
const ok = (label) => { checks++; console.log('  PASS', label); };

// [1] LINK AND EVALUATE ------------------------------------------------------------------
console.log('[1] link and evaluate through the import map');
const THREE     = await import('three');
const maths     = await import(url('Na__DrawingPlanes__Maths__.js'));
const cfg       = await import(url('Na__DrawingPlanes__ConfigState__.js'));
const bounds    = await import(url('Na__DrawingPlanes__Bounds__.js'));
const planeMesh = await import(url('Na__DrawingPlanes__PlaneMesh__.js'));
const lines     = await import('three/addons/lines/LineSegments2.js');
ok('four modules linked and evaluated; three r' + THREE.REVISION + ' and three/addons/lines resolved (' + typeof lines.LineSegments2 + ')');

// [2] EXPORT NAMES -------------------------------------------------------------------------
console.log('[2] exports equal TrueVision\'s');
const exportBlock = (file) => {
    const text = readFileSync(join(DIR, file), 'utf8');
    const m = text.match(/export\s*\{([\s\S]*?)\};/);
    return m[1].split(',').map((s) => s.trim()).filter(Boolean).sort();
};
for (const [file, mod] of [['Na__DrawingPlanes__Maths__.js', maths], ['Na__DrawingPlanes__ConfigState__.js', cfg],
                           ['Na__DrawingPlanes__Bounds__.js', bounds], ['Na__DrawingPlanes__PlaneMesh__.js', planeMesh]]) {
    assert.deepEqual(Object.keys(mod).sort(), exportBlock(file));
    ok(file + ': ' + Object.keys(mod).length + ' exports, as its export block');
}

// [3] CONFIG: SHIPPED JSON == FALLBACKS ----------------------------------------------------
console.log('[3] ConfigState: the shipped AppConfig and the fallbacks agree');
const snapshot = () => ({
    enabled : cfg.Na__PlaneCfg__IsEnabled(),
    snap    : cfg.Na__PlaneCfg__GetSnapSetup(),
    bounds  : cfg.Na__PlaneCfg__GetBoundsSetup(),
    look    : cfg.Na__PlaneCfg__GetAppearanceSetup(),
    grip    : cfg.Na__PlaneCfg__GetGripSetup()
});
const before = snapshot();
let fetched = null;
globalThis.fetch = async (u) => {                                                       // <-- Node's fetch has no file: scheme
    fetched = String(u);
    const text = readFileSync(fileURLToPath(u), 'utf8');
    return { ok : true, status : 200, json : async () => JSON.parse(text) };
};
const loaded = await cfg.Na__PlaneCfg__Load();
assert.equal(loaded, true);
assert.ok(fetched && fetched.endsWith('/47__System__DrawingPlanes/Na__DrawingPlanes__AppConfig__.json'), 'fetched beside the module: ' + fetched);
const after = snapshot();
assert.deepEqual(after, before);
ok('Load() fetched ' + fetched.split('/').slice(-2).join('/') + ' and every getter (snap, bounds, appearance, grip) is unchanged by it');
assert.deepEqual(after.bounds.buildingTokens, ['MainBuildingModel', 'Storey__']);
assert.deepEqual(after.bounds.groundTokens, ['LandscapeEnvironment']);
assert.deepEqual(after.bounds.ignoreTokens, ['OrbitHelperCube']);
assert.equal(after.bounds.groundLiftUnits, 0.1);
assert.equal(after.bounds.overshootUnits, 1.5);
ok('bounds tokens as shipped; lift 100 mm = 0.1 units, overshoot 1500 mm = 1.5 units (Na__Math__Units, 1000 mm per unit)');
assert.equal(cfg.Na__PlaneCfg__FormatLabel('SnapOnHint', 'x', { increment : 50 }).includes('50 mm grid'), true);
ok('labels read through: "' + cfg.Na__PlaneCfg__GetLabel('BarTitle', '') + '"');

// [4] BOUNDS ON SYNTHETIC VALEVISION-NAMED MODELS -----------------------------------------
console.log('[4] Bounds on models named as ValeVision\'s loader names them');
const box = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial()); m.position.set(x, y, z); return m; };
const group = (name, ...children) => { const g = new THREE.Group(); g.name = name; children.forEach((c) => g.add(c)); return g; };

// Current export (Doous-style): an 11 x 7 x 9 m house standing on a slab whose top is +0.05, inside an
// 80 m x 5 m landscape slab, plus a site-boundaries group 30 m away (measured only for the fallback).
const slabTop = 0.05;
const current = new THREE.Group();
current.add(group('ValeVision__MainBuildingModel__ProposedWalls', box(11, 7, 9, 15, slabTop + 3.5, -15.4)));
current.add(group('ValeVision__MainBuildingModel__ProposedRoofs', box(11, 1, 9, 15, slabTop + 7.5, -15.4)));
current.add(group('ValeVision__LandscapeEnvironment', box(80, 5, 80, 15, slabTop - 2.5, -15.4)));
current.add(group('ValeVision__SiteBoundaries', box(1, 1, 1, 45, 0.5, -15.4)));
const measured = bounds.Na__PlaneBounds__Measure(current);
assert.equal(measured.usedFallback, false);
assert.ok(Math.abs(measured.box.max.x - measured.box.min.x - 11) < 1e-9, 'building width 11 m');
assert.ok(measured.groundTriangles > 0, 'ground triangles kept');
ok('current export: building measured from the two MainBuildingModel groups only (11 m wide, not the 80 m site), '
   + measured.groundTriangles + ' flat ground triangles kept');
const south = { normalX : 0, normalZ : 1, rightX : 1, rightZ : 0 };                  // <-- A south elevation's axes
const fv = bounds.Na__PlaneBounds__FrameVertical(current, south, -10.9);
const overshoot = Math.max(1.5, 11 * 0.08);
assert.ok(Math.abs(fv.width - (11 + 2 * overshoot)) < 1e-9, 'width = building + overshoot each side');
assert.ok(Math.abs(fv.groundUnits - slabTop) < 1e-6, 'ground cut at the slab top');
assert.ok(Math.abs(fv.origin.y - (slabTop + 0.1)) < 1e-6, 'bottom edge 100 mm above the ground cut');
assert.equal(fv.measured, true);
ok('vertical frame: ' + fv.width.toFixed(3) + ' m wide (11 + 2 x ' + overshoot + '), ground cut ' + fv.groundUnits.toFixed(3)
   + ', bottom edge ' + fv.origin.y.toFixed(3) + ' (100 mm above it)');
const fh = bounds.Na__PlaneBounds__FrameHorizontal(current, 1.6);
assert.ok(Math.abs(fh.width - (11 + 2 * overshoot)) < 1e-9 && Math.abs(fh.height - (9 + 2 * overshoot)) < 1e-9);
ok('horizontal frame: ' + fh.width.toFixed(3) + ' x ' + fh.height.toFixed(3) + ' m at the 1.6 m cut');

// Older export: one ValeVision__LegacyModel bucket holding house and landscape together.
bounds.Na__PlaneBounds__Invalidate();
const legacy = new THREE.Group();
legacy.add(group('ValeVision__LegacyModel', box(11, 7, 9, 15, slabTop + 3.5, -15.4), box(80, 5, 80, 15, slabTop - 2.5, -15.4)));
const lm = bounds.Na__PlaneBounds__Measure(legacy);
assert.equal(lm.usedFallback, true);
assert.equal(lm.groundTriangles, 0);
const lv = bounds.Na__PlaneBounds__FrameVertical(legacy, south, -10.9);
assert.equal(lv.groundUnits, null);
assert.ok(Math.abs(lv.origin.y - (slabTop - 5 + 0.1)) < 1e-6, 'stands on the bucket foot + lift');
ok('older export: usedFallback, sized from the whole bucket (' + (lm.box.max.x - lm.box.min.x).toFixed(1)
   + ' m), no ground cut, bottom edge at the bucket foot + 0.1 (' + lv.origin.y.toFixed(3) + ') - the documented degrade');

// [5] PLANE MESH --------------------------------------------------------------------------
console.log('[5] PlaneMesh: create, dress, move, dispose');
globalThis.document = {
    createElement : () => {
        const ctx = { font : '', fillStyle : '', textAlign : '', textBaseline : '', measureText : (t) => ({ width : String(t).length * 36 }), fillText : () => {} };
        return { width : 300, height : 150, getContext : () => ctx };
    }
};
bounds.Na__PlaneBounds__Invalidate();
const handle = planeMesh.Na__PlaneMesh__Create();
assert.equal(handle.group.children.length, 6);
const spec = { frame : fv, colour : '#1f6fd1', name : 'South Elevation', isSection : false, selected : false, hoverRegion : null };
planeMesh.Na__PlaneMesh__Update(handle, spec);
const regions = planeMesh.Na__PlaneMesh__GetRegions(handle);
assert.deepEqual(regions.map((r) => r.name), [planeMesh.Na__PlaneMesh__REGION_LABEL, planeMesh.Na__PlaneMesh__REGION_GRIP_TR,
                                               planeMesh.Na__PlaneMesh__REGION_GRIP_BL, planeMesh.Na__PlaneMesh__REGION_GRIP_BR]);
assert.ok(handle.group.children.every((o) => o.layers.mask === 2 && o.userData.naSectionCutHelper === true), 'helper marks');
const shapeKey = handle.shapeKey;
const moved = Object.assign({}, fv, { origin : fv.origin.clone().add(new THREE.Vector3(0, 0, -0.05)) });
planeMesh.Na__PlaneMesh__Update(handle, Object.assign({}, spec, { frame : moved, selected : true, hoverRegion : 'grip-tr' }));
assert.equal(handle.shapeKey, shapeKey, 'a move does not rebuild the shape');
assert.ok(Math.abs(handle.group.matrix.elements[14] - moved.origin.z) < 1e-9, 'the group matrix carries the frame');
assert.equal(planeMesh.Na__PlaneMesh__Dispose(handle), true);
ok('6 objects on layer 1 marked naSectionCutHelper; 4 regions; a move is one matrix write (shape kept); disposed');

console.log('\nRESULT: PASS (' + checks + ' checks)');
