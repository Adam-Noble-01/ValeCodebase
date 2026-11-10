// =============================================================================
// VALEVISION3D - RENDER EFFECT - ORNAMENT FADE - CORE
// =============================================================================
//
// FILE       : Na__RenderEffect__OrnamentFade__Core__.js
// NAMESPACE  : Na__OrnamentFade
// MODULE     : Na__RenderEffect__OrnamentFade__Core__
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Say, from a model's line segments, which of them are ornament: a ridge
//              cresting, its finials, and the pieces of it flattened into the building
// CREATED    : 10-Nov-2026
//
// DESCRIPTION:
// - THE SUMS BEHIND Na__RenderEffect__OrnamentFade__.js. Nothing here touches three.js
//   or the page: plain arrays in, plain arrays out, so the same file runs in the page and
//   in Node (96__Dev__McpServer__Python/Na__ValeVisionMcp__LineworkSurvey__.mjs, which
//   says for every project in the library what would be chosen).
// - ORNAMENT IS CHOSEN BY NAME FIRST. A GLB node whose name holds a seed (Cresting) is
//   ornament, every line of it. A companion (Finial, Spire, Urn) is ornament only beside
//   a seed: the finials on a cresting's corners, not the ridge end finial every Lantern
//   Designer lantern has. An exempt name (a lettered note) never counts.
// - THEN BY MEASURE, NEAR A NAME. The GLB Builder flattens much of a cresting into the
//   building's one unnamed linework node (a third of Thorpe's). A piece of that node is
//   carried in when it is within Field__CarryInMm of a named line AND its patch is "mush":
//   line whose curve is too small to read as a shape once a line is a given width in the
//   model. Mush tells a cresting from a Gothic glazing head or a cornice, which all the
//   ink in a patch cannot: bars, mouldings and arches are long curves, never mush.
// - TWO THINGS ARE WORKED OUT, ONCE, WHEN A MODEL LOADS:
//   1. HOW BIG THE SHAPE A SEGMENT BELONGS TO IS. Segments that meet end to end and
//      carry straight on are one curve: a rail, a post, an arch, a ring, a petal. Its
//      size is the diagonal of its box. A glazing bar is metres long however many
//      pieces it is drawn in; a ring on a cast iron cresting is 20 mm.
//   2. HOW MUCH OF EACH PATCH OF THE MODEL IS MUSH, at four line widths, counted square
//      on so lines lying over each other count once.
// - WITHOUT Field__SeedsOnly every busy patch counts, whatever it is called. The app
//   never asks for that: across the library it is also dentils, tiles, chandeliers,
//   lettered notes and 2D plants. The survey still reports it, for comparison.
//
// FRAMES:
// - Every point is three.js world space, METRES, Y up, as the loaded model holds it.
//   Sizes named _mm are millimetres and are converted once, here.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Nov-2026 - Version 1.0.0
// - Built from the linework density test, tested on 60227__Thorpe and surveyed across the
//   library's 99 projects. Pieces carried in from the unnamed node must now lie within
//   300 mm of a named line: on a house with a cresting along its ridges, "within reach of
//   the patch" had also taken tile joints and a gable pendant a metre below the finials.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Shape of the Field
    // ------------------------------------------------------------
    const NA__ORNAMENTFADE__LEVELS        = 4;          // <-- Box sizes, each twice the one before
    const NA__ORNAMENTFADE__KEY_OFFSET    = 4096;       // <-- Block indices are held in 13 bits an axis
    const NA__ORNAMENTFADE__KEY_SPAN      = 8192;
    const NA__ORNAMENTFADE__WELD_M        = 0.0002;     // <-- Ends within 0.2 mm are one point
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Defaults (the values the Thorpe tests settled on)
    // ------------------------------------------------------------
    const Na__OrnamentFade__FieldDefaults = {
        Field__Level0Mm       : 4,       // <-- The finest box: a line's width in the model at about 9 m on a desktop
        Field__BlockBoxes     : 32,      // <-- Boxes along a block. A patch is two blocks each way: 64 line widths square
        Field__MushWidths     : 6,       // <-- A curve smaller than this many line widths cannot be read as a shape
        Field__ChainAngleDeg  : 25,      // <-- Segments carry on as one curve within this turn
        Field__ReachStrides   : 1,       // <-- A segment is as busy as the busiest patch this many strides off, so an object fades as one
        Field__SeedsOnly      : true,    // <-- Only patches within reach of a part marked seed count. False: every busy patch counts
        Field__CarryInMm      : 300      // <-- An unnamed piece is ornament only this close to a named line. Thorpe's furthest is 171 mm, Lister's 227
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Curves: How Big Is the Shape a Segment Belongs To
// -----------------------------------------------------------------------------

    // FUNCTION | The Size, in Metres, of the Smooth Curve Each Segment Is Part Of
    // ------------------------------------------------------------
    // points: six numbers a segment (start x y z, end x y z), world metres.
    // At each shared end a segment carries on into the ONE neighbour that leaves
    // most nearly straight ahead, if that is within the angle. A corner ends a
    // curve; a T junction does not join the stem to the bar.
    // ------------------------------------------------------------
    function Na__OrnamentFade__MeasureCurves(points, angleDeg) {
        const count  = Math.floor(points.length / 6);
        const parent = new Int32Array(count);
        for (let i = 0; i < count; i++) parent[i] = i;
        const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
        const cosLimit = Math.cos(angleDeg * Math.PI / 180);

        const byPoint = new Map();                                            // <-- point key -> [segment * 2 + end]
        for (let i = 0; i < count; i++) {
            for (let e = 0; e < 2; e++) {
                const o = i * 6 + e * 3;
                const key = Math.round(points[o] / NA__ORNAMENTFADE__WELD_M) + ',' + Math.round(points[o + 1] / NA__ORNAMENTFADE__WELD_M) + ',' + Math.round(points[o + 2] / NA__ORNAMENTFADE__WELD_M);
                let list = byPoint.get(key);
                if (!list) { list = []; byPoint.set(key, list); }
                list.push(i * 2 + e);
            }
        }

        const away = new Float64Array(3), other = new Float64Array(3);
        const leave = (ref, out) => {                                         // <-- The direction of a segment AWAY from one of its ends
            const i = ref >> 1, e = ref & 1, from = i * 6 + e * 3, to = i * 6 + (1 - e) * 3;
            out[0] = points[to] - points[from]; out[1] = points[to + 1] - points[from + 1]; out[2] = points[to + 2] - points[from + 2];
            const length = Math.hypot(out[0], out[1], out[2]);
            if (length > 0) { out[0] /= length; out[1] /= length; out[2] /= length; }
            return length;
        };
        byPoint.forEach((list) => {
            if (list.length < 2 || list.length > 12) return;                  // <-- A hub of many lines is not a curve
            for (let m = 0; m < list.length; m++) {
                if (leave(list[m], away) === 0) continue;
                let best = -1, bestDot = -cosLimit;
                for (let n = 0; n < list.length; n++) {
                    if (n === m || (list[n] >> 1) === (list[m] >> 1)) continue;
                    if (leave(list[n], other) === 0) continue;
                    const dot = away[0] * other[0] + away[1] * other[1] + away[2] * other[2];   // <-- -1 is straight on
                    if (dot < bestDot) { bestDot = dot; best = n; }
                }
                if (best >= 0) {
                    const a = find(list[m] >> 1), b = find(list[best] >> 1);
                    if (a !== b) parent[a] = b;
                }
            }
        });

        const boxes = new Map();
        for (let i = 0; i < count; i++) {
            const root = find(i);
            let box = boxes.get(root);
            if (!box) { box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; boxes.set(root, box); }
            for (let e = 0; e < 2; e++) {
                for (let c = 0; c < 3; c++) {
                    const value = points[i * 6 + e * 3 + c];
                    if (value < box[c]) box[c] = value;
                    if (value > box[3 + c]) box[3 + c] = value;
                }
            }
        }
        const sizes = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            const box = boxes.get(find(i));
            sizes[i] = Math.hypot(box[3] - box[0], box[4] - box[1], box[5] - box[2]);
        }
        return { sizes, curves : boxes.size };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Mush Field: How Much of a Patch Is Small Shapes, Seen Square On
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | One Number for a Block or a Patch
    // ------------------------------------------------------------
    function Na__OrnamentFade__Key(ix, iy, iz) {
        return (ix + NA__ORNAMENTFADE__KEY_OFFSET) + (iy + NA__ORNAMENTFADE__KEY_OFFSET) * NA__ORNAMENTFADE__KEY_SPAN + (iz + NA__ORNAMENTFADE__KEY_OFFSET) * NA__ORNAMENTFADE__KEY_SPAN * NA__ORNAMENTFADE__KEY_SPAN;
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Lay the Mush Into Blocks of Boxes, at One Box Size
    // ------------------------------------------------------------
    function Na__OrnamentFade__LayIntoBoxes(parts, sizeLimit, box, span, seedsOnly) {
        const blocks = new Map();
        const bytes  = span * span * span / 8;
        for (let p = 0; p < parts.length; p++) {
            if (parts[p].exempt === true) continue;                           // <-- A lettered note is small shapes too, and must never count
            if (seedsOnly && parts[p].seed !== true) continue;
            const points = parts[p].points, sizes = parts[p].sizes;
            for (let s = 0; s < sizes.length; s++) {
                if (sizes[s] >= sizeLimit) continue;                          // <-- Big enough to read as a shape here: not mush
                const o = s * 6;
                const ax = points[o], ay = points[o + 1], az = points[o + 2];
                const dx = points[o + 3] - ax, dy = points[o + 4] - ay, dz = points[o + 5] - az;
                const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / (box * 0.5)));
                let lastKey = -1, lastIndex = -1, bits = null;
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const fx = Math.floor((ax + dx * t) / box), fy = Math.floor((ay + dy * t) / box), fz = Math.floor((az + dz * t) / box);
                    const bx = Math.floor(fx / span), by = Math.floor(fy / span), bz = Math.floor(fz / span);
                    const key = Na__OrnamentFade__Key(bx, by, bz);
                    const index = (fx - bx * span) + (fy - by * span) * span + (fz - bz * span) * span * span;
                    if (key === lastKey && index === lastIndex) continue;
                    if (key !== lastKey) {
                        bits = blocks.get(key);
                        if (!bits) { bits = new Uint8Array(bytes); blocks.set(key, bits); }
                        lastKey = key;
                    }
                    bits[index >> 3] |= 1 << (index & 7);
                    lastIndex = index;
                }
            }
        }
        return blocks;
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | For Every Patch of Two Blocks Each Way, the Share That Is Mush, Seen Square On
    // ------------------------------------------------------------
    // SQUARE ON is along the axis the patch's lines are thinnest in: a panel's
    // lines lie in its plane, so from in front they are spread out and from the
    // side they are one line. Where no axis is thinner than the others (a
    // corner, a finial) the busiest of them is taken.
    // ------------------------------------------------------------
    function Na__OrnamentFade__CountPatches(blocks, span) {
        const wide = span * 2, face = wide * wide;
        const patches = new Map();
        const stampX = new Uint32Array(face), stampY = new Uint32Array(face), stampZ = new Uint32Array(face);
        let stamp = 0;
        const done = new Set();
        blocks.forEach((_bits, blockKey) => {
            const bx = (blockKey % NA__ORNAMENTFADE__KEY_SPAN) - NA__ORNAMENTFADE__KEY_OFFSET;
            const by = (Math.floor(blockKey / NA__ORNAMENTFADE__KEY_SPAN) % NA__ORNAMENTFADE__KEY_SPAN) - NA__ORNAMENTFADE__KEY_OFFSET;
            const bz = Math.floor(blockKey / (NA__ORNAMENTFADE__KEY_SPAN * NA__ORNAMENTFADE__KEY_SPAN)) - NA__ORNAMENTFADE__KEY_OFFSET;
            for (let oz = -1; oz <= 0; oz++) for (let oy = -1; oy <= 0; oy++) for (let ox = -1; ox <= 0; ox++) {
                const px = bx + ox, py = by + oy, pz = bz + oz;
                const patchKey = Na__OrnamentFade__Key(px, py, pz);
                if (done.has(patchKey)) continue;
                done.add(patchKey);
                stamp++;
                let nx = 0, ny = 0, nz = 0;
                let x0 = wide, x1 = -1, y0 = wide, y1 = -1, z0 = wide, z1 = -1;
                for (let cz = 0; cz < 2; cz++) for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) {
                    const bits = blocks.get(Na__OrnamentFade__Key(px + cx, py + cy, pz + cz));
                    if (!bits) continue;
                    for (let byte = 0; byte < bits.length; byte++) {
                        const value = bits[byte];
                        if (value === 0) continue;
                        for (let bit = 0; bit < 8; bit++) {
                            if (!(value & (1 << bit))) continue;
                            const index = byte * 8 + bit;
                            const lx = (index % span) + cx * span, ly = (Math.floor(index / span) % span) + cy * span, lz = Math.floor(index / (span * span)) + cz * span;
                            if (lx < x0) x0 = lx; if (lx > x1) x1 = lx;
                            if (ly < y0) y0 = ly; if (ly > y1) y1 = ly;
                            if (lz < z0) z0 = lz; if (lz > z1) z1 = lz;
                            let cell = ly + lz * wide; if (stampX[cell] !== stamp) { stampX[cell] = stamp; nx++; }
                            cell = lx + lz * wide;     if (stampY[cell] !== stamp) { stampY[cell] = stamp; ny++; }
                            cell = lx + ly * wide;     if (stampZ[cell] !== stamp) { stampZ[cell] = stamp; nz++; }
                        }
                    }
                }
                if (x1 < 0) continue;
                const sx = x1 - x0, sy = y1 - y0, sz = z1 - z0;
                const thin = Math.min(sx, sy, sz) + 2;                        // <-- Within two boxes of the thinnest counts as thin too
                let cover = 0;
                if (sx <= thin) cover = Math.max(cover, nx / face);
                if (sy <= thin) cover = Math.max(cover, ny / face);
                if (sz <= thin) cover = Math.max(cover, nz / face);
                if (cover > 0) patches.set(patchKey, cover);
            }
        });
        return patches;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Is Any Patch of a Set Within Reach of a Point
    // ------------------------------------------------------------
    function Na__OrnamentFade__IsWithinReach(patches, pitch, x, y, z, reach) {
        const cx = Math.round(x / pitch - 1), cy = Math.round(y / pitch - 1), cz = Math.round(z / pitch - 1);
        for (let dz = -reach; dz <= reach; dz++) for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
            if (patches.has(Na__OrnamentFade__Key(cx + dx, cy + dy, cz + dz))) return true;
        }
        return false;
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Where the Named Lines Are, for "Is This Piece Close to One"
    // ------------------------------------------------------------
    // Every seed segment is sampled at its ends and every 50 mm along, into
    // cells a third of the carry-in distance across. A question then reads the
    // cells within reach and stops at the first sample close enough.
    // ------------------------------------------------------------
    function Na__OrnamentFade__BuildSeedReach(parts, reachM) {
        if (!(reachM > 0)) return null;
        const cell = reachM / 3, step = 0.05;
        const cells = new Map();
        for (let p = 0; p < parts.length; p++) {
            if (parts[p].seed !== true || parts[p].exempt === true) continue;
            const points = parts[p].points;
            for (let o = 0; o + 5 < points.length; o += 6) {
                const ax = points[o], ay = points[o + 1], az = points[o + 2];
                const dx = points[o + 3] - ax, dy = points[o + 4] - ay, dz = points[o + 5] - az;
                const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / step));
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps, x = ax + dx * t, y = ay + dy * t, z = az + dz * t;
                    const key = Na__OrnamentFade__Key(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell));
                    let list = cells.get(key);
                    if (!list) { list = []; cells.set(key, list); }
                    list.push(x, y, z);
                }
            }
        }
        return cells.size > 0 ? { cells, cell, reach : reachM } : null;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Is a Point Within the Carry-In Distance of a Named Line
    // ------------------------------------------------------------
    function Na__OrnamentFade__IsNearSeed(seedReach, x, y, z) {
        if (!seedReach) return false;
        const cell = seedReach.cell, limit = seedReach.reach * seedReach.reach;
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
        for (let dz = -3; dz <= 3; dz++) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
            const list = seedReach.cells.get(Na__OrnamentFade__Key(cx + dx, cy + dy, cz + dz));
            if (!list) continue;
            for (let i = 0; i < list.length; i += 3) {
                const ex = list[i] - x, ey = list[i + 1] - y, ez = list[i + 2] - z;
                if (ex * ex + ey * ey + ez * ez <= limit) return true;
            }
        }
        return false;
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | A Companion Beside a Seed Becomes a Seed
    // ------------------------------------------------------------
    // Judged at the third box size (16 mm from a 4 mm start), where reach is
    // about half a metre: beside, not merely on the same roof.
    // ------------------------------------------------------------
    function Na__OrnamentFade__PromoteCompanions(parts, level0, span, reach) {
        const box  = level0 * 4;
        const near = Na__OrnamentFade__CountPatches(Na__OrnamentFade__LayIntoBoxes(parts, Infinity, box, span, true), span);
        if (near.size === 0) return 0;
        let promoted = 0;
        parts.forEach((part) => {
            if (part.companion !== true || part.seed === true || part.exempt === true) return;
            const points = part.points;
            for (let o = 0; o + 5 < points.length; o += 6) {
                if (Na__OrnamentFade__IsWithinReach(near, box * span, (points[o] + points[o + 3]) * 0.5, (points[o + 1] + points[o + 4]) * 0.5, (points[o + 2] + points[o + 5]) * 0.5, reach)) {
                    part.seed = true;
                    part.promoted = true;
                    promoted++;
                    return;
                }
            }
        });
        return promoted;
    }
    // ------------------------------------------------------------

    // FUNCTION | Build the Field for One Group of Lines That Are Seen Together
    // ------------------------------------------------------------
    // parts: [{ points, sizes, seed, companion, exempt }], one per line object,
    // every point in world metres. A group is one category's lines: a cresting
    // and the roof it stands on belong together, furniture in another file
    // does not. A companion found beside a seed is marked seed here.
    // ------------------------------------------------------------
    function Na__OrnamentFade__BuildField(parts, settings) {
        const use    = Object.assign({}, Na__OrnamentFade__FieldDefaults, settings || {});
        const level0 = use.Field__Level0Mm / 1000;
        const levels = [];
        if (use.Field__SeedsOnly) Na__OrnamentFade__PromoteCompanions(parts, level0, use.Field__BlockBoxes, use.Field__ReachStrides);
        for (let k = 0; k < NA__ORNAMENTFADE__LEVELS; k++) {
            const box    = level0 * Math.pow(2, k);
            const blocks = Na__OrnamentFade__LayIntoBoxes(parts, use.Field__MushWidths * box, box, use.Field__BlockBoxes, false);
            const level  = { box, span : use.Field__BlockBoxes, patches : Na__OrnamentFade__CountPatches(blocks, use.Field__BlockBoxes), seeds : null };
            if (use.Field__SeedsOnly) {                                       // <-- Where a named piece of ornament is: every line of it, whatever its size
                level.seeds = Na__OrnamentFade__CountPatches(Na__OrnamentFade__LayIntoBoxes(parts, Infinity, box, use.Field__BlockBoxes, true), use.Field__BlockBoxes);
            }
            levels.push(level);
        }
        const seedReach = use.Field__SeedsOnly ? Na__OrnamentFade__BuildSeedReach(parts, use.Field__CarryInMm / 1000) : null;   // <-- After the companions are promoted: they are named lines too
        return { levels, reach : use.Field__ReachStrides, seedsOnly : use.Field__SeedsOnly === true, seedReach };
    }
    // ------------------------------------------------------------

    // FUNCTION | The Mush at a Point, at One Level: the Busiest Patch Within Reach
    // ------------------------------------------------------------
    function Na__OrnamentFade__SampleLevel(level, x, y, z, reach) {
        const pitch = level.box * level.span;
        const cx = Math.round(x / pitch - 1), cy = Math.round(y / pitch - 1), cz = Math.round(z / pitch - 1);   // <-- Patch i is centred on (i + 1) blocks
        let best = 0, seeded = level.seeds === null;
        for (let dz = -reach; dz <= reach; dz++) for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
            const key = Na__OrnamentFade__Key(cx + dx, cy + dy, cz + dz);
            const held = level.patches.get(key);
            if (held > best) best = held;
            if (!seeded && level.seeds.has(key)) seeded = true;
        }
        return seeded ? best : 0;
    }
    // ------------------------------------------------------------

    // FUNCTION | The Mush Round Every Segment, Four Numbers Each
    // ------------------------------------------------------------
    // A LONG LINE IS AS BUSY AS ITS QUIETEST PART: a hip that starts beside a
    // cresting and runs three metres down a roof is not ornament. And with
    // seeds, a busy segment counts only with both ends near a named line.
    // ------------------------------------------------------------
    function Na__OrnamentFade__CoverOfSegments(field, points, part) {
        const count = Math.floor(points.length / 6);
        const cover = new Float32Array(count * NA__ORNAMENTFADE__LEVELS);
        if (part && part.exempt === true) return cover;                       // <-- Never
        if (part && part.seed === true && field.seedsOnly) return cover.fill(1);   // <-- Ornament by name: every line of it
        for (let i = 0; i < count; i++) {
            const o = i * 6;
            const ax = points[o], ay = points[o + 1], az = points[o + 2], bx = points[o + 3], by = points[o + 4], bz = points[o + 5];
            const length = Math.hypot(bx - ax, by - ay, bz - az);
            for (let k = 0; k < NA__ORNAMENTFADE__LEVELS; k++) {
                const level = field.levels[k];
                let value = Na__OrnamentFade__SampleLevel(level, (ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5, field.reach);
                if (value > 0 && length > level.box * level.span) {
                    value = Math.min(value, Na__OrnamentFade__SampleLevel(level, ax, ay, az, field.reach), Na__OrnamentFade__SampleLevel(level, bx, by, bz, field.reach));
                }
                cover[i * NA__ORNAMENTFADE__LEVELS + k] = value;
            }
            if (field.seedsOnly && (cover[i * NA__ORNAMENTFADE__LEVELS + 1] > 0 || cover[i * NA__ORNAMENTFADE__LEVELS + 2] > 0)
                && !(Na__OrnamentFade__IsNearSeed(field.seedReach, ax, ay, az) && Na__OrnamentFade__IsNearSeed(field.seedReach, bx, by, bz))) {
                for (let k = 0; k < NA__ORNAMENTFADE__LEVELS; k++) cover[i * NA__ORNAMENTFADE__LEVELS + k] = 0;   // <-- Busy, but too far from any named line: building
            }
        }
        return cover;
    }
    // ------------------------------------------------------------

    // FUNCTION | The Mush at Every Corner of a Mesh, Four Numbers Each
    // ------------------------------------------------------------
    // positions: three numbers a corner, world metres. index: the triangles'
    // corners, or null when they simply come in threes.
    // A TRIANGLE IS AS BUSY AS ITS QUIETEST CORNER, and a corner as its quietest
    // triangle: a roof plane with one corner beside a cresting must not fade
    // across its whole face. A triangle with a building-sized edge is building,
    // and is never busy.
    // ------------------------------------------------------------
    function Na__OrnamentFade__CoverOfMesh(field, positions, index, keepAboveM, named) {
        const count = Math.floor(positions.length / 3);
        const raw   = new Float32Array(count * NA__ORNAMENTFADE__LEVELS);
        if (named === true && field.seedsOnly) raw.fill(1);                   // <-- Ornament by name: the mesh of a seed
        else for (let i = 0; i < count; i++) {
            let any = false;
            for (let k = 0; k < NA__ORNAMENTFADE__LEVELS; k++) {
                raw[i * NA__ORNAMENTFADE__LEVELS + k] = Na__OrnamentFade__SampleLevel(field.levels[k], positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2], field.reach);
                if (raw[i * NA__ORNAMENTFADE__LEVELS + k] > 0) any = true;
            }
            if (any && field.seedsOnly && !Na__OrnamentFade__IsNearSeed(field.seedReach, positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])) {
                for (let k = 0; k < NA__ORNAMENTFADE__LEVELS; k++) raw[i * NA__ORNAMENTFADE__LEVELS + k] = 0;   // <-- Too far from any named line
            }
        }
        const cover   = new Float32Array(count * NA__ORNAMENTFADE__LEVELS).fill(Infinity);
        const corners = index ? index.length : count;
        const edge = (a, b) => Math.hypot(positions[a * 3] - positions[b * 3], positions[a * 3 + 1] - positions[b * 3 + 1], positions[a * 3 + 2] - positions[b * 3 + 2]);
        for (let t = 0; t + 2 < corners; t += 3) {
            const a = index ? index[t] : t, b = index ? index[t + 1] : t + 1, c = index ? index[t + 2] : t + 2;
            const building = Math.max(edge(a, b), edge(b, c), edge(c, a)) >= keepAboveM;
            for (let k = 0; k < NA__ORNAMENTFADE__LEVELS; k++) {
                const least = building ? 0 : Math.min(raw[a * NA__ORNAMENTFADE__LEVELS + k], raw[b * NA__ORNAMENTFADE__LEVELS + k], raw[c * NA__ORNAMENTFADE__LEVELS + k]);
                if (least < cover[a * NA__ORNAMENTFADE__LEVELS + k]) cover[a * NA__ORNAMENTFADE__LEVELS + k] = least;
                if (least < cover[b * NA__ORNAMENTFADE__LEVELS + k]) cover[b * NA__ORNAMENTFADE__LEVELS + k] = least;
                if (least < cover[c * NA__ORNAMENTFADE__LEVELS + k]) cover[c * NA__ORNAMENTFADE__LEVELS + k] = least;
            }
        }
        for (let i = 0; i < cover.length; i++) if (cover[i] === Infinity) cover[i] = 0;
        return cover;
    }
    // ------------------------------------------------------------

    // FUNCTION | What a Patch Is, Whatever the Camera: Its Mush at 8 mm and 16 mm Lines
    // ------------------------------------------------------------
    // The second and third levels of a field built from 4 mm. On a desktop those
    // are the model from about 19 m and 37 m: the distances the whole building
    // is looked at from.
    // ------------------------------------------------------------
    function Na__OrnamentFade__OrnamentOf(cover, i) {
        return Math.max(cover[i * NA__ORNAMENTFADE__LEVELS + 1], cover[i * NA__ORNAMENTFADE__LEVELS + 2]);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        NA__ORNAMENTFADE__LEVELS,
        Na__OrnamentFade__FieldDefaults,
        Na__OrnamentFade__MeasureCurves,
        Na__OrnamentFade__BuildField,
        Na__OrnamentFade__SampleLevel,
        Na__OrnamentFade__IsNearSeed,
        Na__OrnamentFade__CoverOfSegments,
        Na__OrnamentFade__CoverOfMesh,
        Na__OrnamentFade__OrnamentOf
    };

// endregion -------------------------------------------------------------------
