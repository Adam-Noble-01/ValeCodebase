// Exercises the real SweepGeometry module and checks that the winding contract
// the Ruby importer relies on actually produces outward-facing solids.
const fs = require('fs');
const vm = require('vm');

const ROOT = 'D:/10_CoreLib__ValeCodebase/WebApps/Vale__LanternDesigner/02__Src__AppModules/80__System__SketchUpExport/';
const exportConfig = JSON.parse(fs.readFileSync(ROOT + 'Na__SketchUpExport__Config.json', 'utf8'));

const sandbox = { console };
sandbox.window = sandbox;
sandbox.VghLantern__AppCore__StateManager = {
    VghLantern__StateManager__GetAppConfig: () => exportConfig
};
sandbox.VghLantern__AppCore__ConfigLoader = {
    VghLantern__ConfigLoader__RequireNumber: (section, key) => {
        const v = section ? section[key] : undefined;
        if (typeof v !== 'number') throw new Error('missing config number: ' + key);
        return v;
    }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(ROOT + 'VghLantern__SketchUpExport__SweepGeometry__.js', 'utf8'), sandbox);

const Sweep = sandbox.VghLantern__SketchUpExport__SweepGeometry;

// -- helpers replicating what the Ruby PrismBuilder does ---------------------
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cross = (a, b) => ({ x: a.y*b.z - a.z*b.y, y: a.z*b.x - a.x*b.z, z: a.x*b.y - a.y*b.x });
const dot = (a, b) => a.x*b.x + a.y*b.y + a.z*b.z;

// Signed volume over the shell, exactly the test the importer runs.
function signedVolume(prism) {
    const tris = [];
    const { Rings, PointsA, PointsB } = prism;

    // Walls: quad (a0, a1, b1, b0) -> two triangles
    Rings.forEach(ring => {
        for (let k = 0; k < ring.Count; k++) {
            const i0 = ring.Start + k;
            const i1 = ring.Start + ((k + 1) % ring.Count);
            tris.push([PointsA[i0], PointsA[i1], PointsB[i1]]);
            tris.push([PointsA[i0], PointsB[i1], PointsB[i0]]);
        }
    });

    // Caps: outer ring only (holes would subtract; the test cases here have none)
    const outer = Rings[0];
    const capB = [], capA = [];
    for (let k = 0; k < outer.Count; k++) {
        capB.push(PointsB[outer.Start + k]);
        capA.push(PointsA[outer.Start + k]);
    }
    capA.reverse();
    for (let t = 1; t < capB.length - 1; t++) tris.push([capB[0], capB[t], capB[t + 1]]);
    for (let t = 1; t < capA.length - 1; t++) tris.push([capA[0], capA[t], capA[t + 1]]);

    let total = 0;
    tris.forEach(([p1, p2, p3]) => {
        total += p1.x * (p2.y*p3.z - p3.y*p2.z)
               - p1.y * (p2.x*p3.z - p3.x*p2.z)
               + p1.z * (p2.x*p3.y - p3.x*p2.y);
    });
    return total / 6;
}

// Wall normals must point away from the member centreline.
function wallNormalsOutward(prism, axisStart, axisEnd) {
    const { Rings, PointsA, PointsB } = prism;
    let bad = 0, checked = 0;
    Rings.forEach(ring => {
        for (let k = 0; k < ring.Count; k++) {
            const i0 = ring.Start + k;
            const i1 = ring.Start + ((k + 1) % ring.Count);
            const a0 = PointsA[i0], a1 = PointsA[i1], b1 = PointsB[i1];
            const n = cross(sub(a1, a0), sub(b1, a1));
            // vector from the axis to the quad centre
            const mid = { x: (a0.x+a1.x)/2, y: (a0.y+a1.y)/2, z: (a0.z+a1.z)/2 };
            const axis = sub(axisEnd, axisStart);
            const w = sub(mid, axisStart);
            const t = dot(w, axis) / dot(axis, axis);
            const foot = { x: axisStart.x + axis.x*t, y: axisStart.y + axis.y*t, z: axisStart.z + axis.z*t };
            const outward = sub(mid, foot);
            if (dot(outward, outward) < 1e-9) continue;
            checked++;
            if (dot(n, outward) <= 0) bad++;
        }
    });
    return { bad, checked };
}

function report(label, prism, start, end) {
    if (!prism) { console.log(`FAIL  ${label}: no prism returned`); return; }
    const vol = signedVolume(prism);
    const walls = wallNormalsOutward(prism, start, end);
    const volOk = vol > 0;
    const wallOk = walls.bad === 0;
    console.log(`${volOk && wallOk ? 'PASS ' : 'FAIL '} ${label}`);
    console.log(`        signed volume = ${vol.toFixed(1)} mm3 ${volOk ? '(positive: faces point out)' : '(NEGATIVE: shell is inside in)'}`);
    console.log(`        wall normals  = ${walls.checked - walls.bad}/${walls.checked} outward`);
}

// -- CASE 1 | Plain rectangular bar swept horizontally ----------------------
const section = Sweep.VghLantern__SketchUpExport__SweepGeometry__FaceFromOutline([
    { x: -20, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 50 }, { x: -20, y: 50 }
]);
let s = { x: 0, y: 0, z: 0 }, e = { x: 1000, y: 0, z: 0 };
report('horizontal bar, CCW section', Sweep.VghLantern__SketchUpExport__SweepGeometry__PrismAlongMember(section, s, e, {}), s, e);

// -- CASE 2 | Same section on a 25 degree sloping rafter --------------------
s = { x: 0, y: -1500, z: 100 }; e = { x: 0, y: 0, z: 100 + 1500 * Math.tan(25 * Math.PI / 180) };
report('25 deg sloping rafter', Sweep.VghLantern__SketchUpExport__SweepGeometry__PrismAlongMember(section, s, e, {}), s, e);

// -- CASE 3 | Hip running diagonally in plan and up in Z --------------------
s = { x: -2750, y: -1500, z: 100 }; e = { x: -1250, y: 0, z: 800 };
report('diagonal hip', Sweep.VghLantern__SketchUpExport__SweepGeometry__PrismAlongMember(section, s, e, {}), s, e);

// -- CASE 4 | Hollow upstand: outer CCW plan ring with a reveal hole --------
const outerRing = [{ x: -2750, y: -1500 }, { x: 2750, y: -1500 }, { x: 2750, y: 1500 }, { x: -2750, y: 1500 }];
const holeRing = [{ x: -2640, y: -1390 }, { x: 2640, y: -1390 }, { x: 2640, y: 1390 }, { x: -2640, y: 1390 }].reverse();
const upstand = Sweep.VghLantern__SketchUpExport__SweepGeometry__PrismFromPlanRings([outerRing, holeRing], 0, 150);
{
    // Volume with the hole subtracted must equal outer minus reveal.
    const wallsOnly = signedVolume({ Rings: [upstand.Rings[0]], PointsA: upstand.PointsA, PointsB: upstand.PointsB });
    const expectedOuter = 5500 * 3000 * 150;
    const holePrism = { Rings: [{ Start: 0, Count: 4 }], PointsA: upstand.PointsA.slice(4), PointsB: upstand.PointsB.slice(4) };
    const holeVol = signedVolume(holePrism);
    const expectedHole = 5280 * 2780 * 150;
    const ok = Math.abs(wallsOnly - expectedOuter) < 1 && Math.abs(holeVol + expectedHole) < 1;
    console.log(`${ok ? 'PASS ' : 'FAIL '} hollow upstand rings`);
    console.log(`        outer shell   = ${wallsOnly.toFixed(0)} mm3 (expected +${expectedOuter})`);
    console.log(`        reveal ring   = ${holeVol.toFixed(0)} mm3 (expected -${expectedHole}: wound the other way, so it subtracts)`);
}

// -- CASE 5 | Mitred datum ring side ---------------------------------------
const sides = [];
const corners = [{ x: -2687.5, y: -1437.5 }, { x: 2687.5, y: -1437.5 }, { x: 2687.5, y: 1437.5 }, { x: -2687.5, y: 1437.5 }];
for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    sides.push({ Start: a, End: b, Direction: { x: dx/len, y: dy/len }, Outward: { x: dy/len, y: -dx/len }, LengthMm: len });
}
const planes = [0, 1, 2, 3].map(c => Sweep.VghLantern__SketchUpExport__SweepGeometry__MitrePlaneAt(sides, c));
// Counter clockwise in the section frame, matching what SectionLoopBuilder
// normalises every real asset section to. Wound the other way this same test
// reports a negative volume, which is the failure the importer's orient pass
// exists to catch.
const beamSection = Sweep.VghLantern__SketchUpExport__SweepGeometry__FaceFromOutline([
    { x: 0, y: -100 }, { x: 0, y: -4 }, { x: -125, y: -4 }, { x: -125, y: -100 }
]);
const mitred = Sweep.VghLantern__SketchUpExport__SweepGeometry__PrismAlongRingSide(beamSection, sides[0], planes[0], planes[1], 100);
{
    const vol = signedVolume(mitred);
    // Head beam ring: 125 wide x 96 tall, mitred. One side of a 5500x3000 outer
    // ring: trapezoid length = outer 5500 minus 2 x 0 ... check sign and rough size.
    const ok = vol > 0;
    console.log(`${ok ? 'PASS ' : 'FAIL '} mitred head beam side`);
    console.log(`        signed volume = ${vol.toFixed(0)} mm3 ${ok ? '(positive)' : '(NEGATIVE)'}`);
    // Vertex 0 sits on the datum (section x = 0); vertex 3 is the outboard
    // face (section x = -125). The mitre must open the outboard edge by one
    // beam width at each end - 250 mm over the side.
    const innerLen = Math.hypot(mitred.PointsB[0].x - mitred.PointsA[0].x, mitred.PointsB[0].y - mitred.PointsA[0].y);
    const outerLen = Math.hypot(mitred.PointsB[3].x - mitred.PointsA[3].x, mitred.PointsB[3].y - mitred.PointsA[3].y);
    const mitreOk = Math.abs((outerLen - innerLen) - 250) < 0.01;
    console.log(`${mitreOk ? 'PASS ' : 'FAIL '} 45 degree plan mitre`);
    console.log(`        inner edge    = ${innerLen.toFixed(1)} mm, outboard edge = ${outerLen.toFixed(1)} mm (difference ${(outerLen - innerLen).toFixed(1)}, expected 250)`);
}

// -- CASE 6 | Glazing slab off a sloping face ------------------------------
const facePoints = [
    { x: -2750, y: -1500, z: 100 },
    { x: 2750, y: -1500, z: 100 },
    { x: 1250, y: 0, z: 100 + 1500 * Math.tan(25 * Math.PI / 180) },
    { x: -1250, y: 0, z: 100 + 1500 * Math.tan(25 * Math.PI / 180) }
];
const slab = Sweep.VghLantern__SketchUpExport__SweepGeometry__PrismFromPolygon(facePoints, 8, 28);
{
    const vol = signedVolume(slab);
    console.log(`${slab.Normal.z > 0 ? 'PASS ' : 'FAIL '} glazing slab normal points up and out (z=${slab.Normal.z.toFixed(3)})`);
    console.log(`        signed volume = ${vol.toFixed(0)} mm3 ${vol > 0 ? '(positive)' : '(NEGATIVE: winding would import inside in)'}`);
}
