// Proves every mesh component in the library triangulates correctly - across
// EVERY asset, not just the one that went wrong.
//
// THIS RUNS IN THREE'S FRAME, NOT SKETCHUP'S, AND THAT IS THE POINT.
//
// The loader swaps positions into Three's Y-up frame as it reads them, and the
// authored face normal is NOT swapped with them. An earlier version of this check
// worked consistently in SketchUp space, so it passed while the loader - which
// mixed the two - picked its projection axis in the wrong frame, collapsed the
// end faces of the glaze bar end cap to a line, and produced NO TRIANGLES for
// them. The ends rendered as nothing and read on screen as see-through.
//
// So this check mirrors the loader step for step: swap the corners, swap the
// normal, pick the axis, clip, wind. A check that takes a shortcut the code does
// not take is a check that agrees with itself instead of with the code.
//
// THREE THINGS ARE ASSERTED
//
//   NOTHING IS DROPPED   Every face yields at least one triangle. A face that
//                        yields none is a hole in the model, and a hole looks
//                        like a material fault rather than a geometry one.
//
//   NOTHING IS FILLED    Each face's triangles total the area the exporter
//                        recorded for it. A fan across a CONCAVE loop spans the
//                        hollow the loop turns back around: the glaze bar end cap
//                        is a 3mm shell whose ends enclose 199mm2 of metal, and
//                        fanned they produced 1171mm2 - the C filled in to a D,
//                        which is why the part rendered as a solid block.
//
//   NOTHING FACES IN     Every triangle winds to agree with its authored normal,
//                        so no component needs a two sided material to hide a
//                        backwards face.
import * as THREE from 'three';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const APP      = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const registry = readJson(path.join(APP, 'VghLantern__AssetRegistry__.json'));

let failures = 0;
const check = (label, ok, detail) => {
    console.log(`${ok ? 'PASS ' : 'FAIL '} ${label}${detail ? '  ' + detail : ''}`);
    if (!ok) failures++;
};

// THE LOADER'S OWN SWAPS, restated. Positions take the millimetre scale in the
// loader and not here, because every test below is a ratio or a sign.
const swapPoint  = v => ({ Px : v.PosX_mm,  Py : v.PosZ_mm,  Pz : -v.PosY_mm,
                           Nx : v.Normal_X, Ny : v.Normal_Z, Nz : -v.Normal_Y });
const swapNormal = n => (Array.isArray(n) ? { x : n[0], y : n[2], z : -n[1] } : { x : 0, y : 0, z : 1 });

const cross = (a, b) => ({ x : a.y * b.z - a.z * b.y, y : a.z * b.x - a.x * b.z, z : a.x * b.y - a.y * b.x });
const sub   = (a, b) => ({ x : a.Px - b.Px, y : a.Py - b.Py, z : a.Pz - b.Pz });
const dot   = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

const triNormal = (a, b, c) => cross(sub(b, a), sub(c, a));
const triArea   = (a, b, c) => { const n = triNormal(a, b, c); return Math.sqrt(dot(n, n)) / 2; };

const isConcave = (corners) => {
    if (corners.length < 4) return false;
    let pos = false, neg = false;
    for (let i = 0; i < corners.length; i++) {
        const a = corners[i], b = corners[(i + 1) % corners.length], c = corners[(i + 2) % corners.length];
        const s = dot(cross(sub(b, a), sub(c, b)), { x : a.Nx, y : a.Ny, z : a.Nz });
        if (s >  1e-6) pos = true;
        if (s < -1e-6) neg = true;
        if (pos && neg) return true;
    }
    return false;
};

const triangulate = (corners, face) => {
    if (!isConcave(corners)) {
        const fan = [];
        for (let t = 1; t < corners.length - 1; t++) fan.push([0, t, t + 1]);
        return { Tris : fan, Clipped : false };
    }

    const n  = swapNormal(face.Normal);
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    const flat = corners.map(c =>
        (ax >= ay && ax >= az) ? new THREE.Vector2(c.Py, c.Pz)
      : (ay >= ax && ay >= az) ? new THREE.Vector2(c.Pz, c.Px)
      :                          new THREE.Vector2(c.Px, c.Py));

    let tris;
    try { tris = THREE.ShapeUtils.triangulateShape(flat, []); } catch { tris = []; }

    const wound = (tris || []).map(t =>
        dot(triNormal(corners[t[0]], corners[t[1]], corners[t[2]]), n) < 0 ? [t[0], t[2], t[1]] : t);

    return { Tris : wound, Clipped : true };
};

console.log('');

let assetsChecked = 0, facesChecked = 0, totalClipped = 0;
const dropped = [], filled = [], backwards = [];

for (const record of registry['VghLantern__AssetRegistry__Assets']) {
    const asset = readJson(path.join(APP, record.Url));
    const mesh  = asset['Na__Asset__Mesh3D'];
    if (!mesh || !Array.isArray(mesh['Na__Geometry__Faces'])) continue;

    const V = new Map(mesh['Na__Geometry__Vertices'].map(v => [v.VertexId, swapPoint(v)]));
    let clipped = 0, bad = 0, gone = 0, flipped = 0, worst = 0;

    for (const face of mesh['Na__Geometry__Faces']) {
        const corners = face['OuterLoop_VertexIds'].map(id => V.get(id));
        if (corners.some(c => !c) || corners.length < 3) continue;
        if (Array.isArray(face.InnerLoops) && face.InnerLoops.length > 0) continue;  // a declared, separate gap

        const result = triangulate(corners, face);
        if (result.Clipped) clipped++;
        facesChecked++;

        if (result.Tris.length === 0) { gone++; continue; }

        const want = face['Area_mm2'];
        const got  = result.Tris.reduce((s, t) => s + triArea(corners[t[0]], corners[t[1]], corners[t[2]]), 0);

        // TWO PERCENT, generous on purpose. Vertices export to three decimals
        // against an Area_mm2 measured off the unrounded model, which is up to
        // 1.2% of honest drift across this library. The fault being hunted was
        // 588%. Nothing this test needs to separate sits in between.
        if (Math.abs(got - want) > Math.max(0.5, want * 0.02)) { bad++; worst = Math.max(worst, got / (want || 1)); }

        const authored = swapNormal(face.Normal);
        for (const t of result.Tris) {
            if (dot(triNormal(corners[t[0]], corners[t[1]], corners[t[2]]), authored) < 0) { flipped++; break; }
        }
    }

    assetsChecked++;
    totalClipped += clipped;
    if (gone    > 0) dropped.push(`${record.AssetId} (${gone})`);
    if (bad     > 0) filled.push(`${record.AssetId} (${bad} face(s), worst ${worst.toFixed(1)}x)`);
    if (flipped > 0) backwards.push(`${record.AssetId} (${flipped})`);

    console.log(`   ${record.AssetId.padEnd(14)} ${String(mesh['Na__Geometry__Faces'].length).padStart(5)} faces`
        + `  ${String(clipped).padStart(4)} ear clipped`
        + `  ${(gone || bad || flipped) ? 'FAULT' : 'ok'}`);
}

console.log('');
check('every mesh asset in the registry was triangulated', assetsChecked > 0, `(${assetsChecked} assets, ${facesChecked} faces)`);
check('no face is dropped for want of triangles', dropped.length === 0, dropped.join('; '));
check('no face covers more than its own authored area', filled.length === 0, filled.join('; '));
check('every triangle winds to face outwards', backwards.length === 0, backwards.join('; '));
check('only genuinely concave loops are ear clipped', totalClipped > 0 && totalClipped < facesChecked * 0.05,
    `(${totalClipped} of ${facesChecked} faces - the rest fan, which is exact and free)`);

console.log('');
console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
