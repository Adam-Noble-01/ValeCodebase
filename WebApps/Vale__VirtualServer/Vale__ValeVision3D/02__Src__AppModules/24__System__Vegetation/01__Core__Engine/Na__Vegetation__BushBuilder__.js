// =============================================================================
// VALEVISION3D - VEGETATION - BUSH BUILDER
// =============================================================================
//
// FILE       : Na__Vegetation__BushBuilder__.js
// NAMESPACE  : Na__VegBuild
// MODULE     : System - Vegetation
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Turn one asset's rules, one seed and one size into a bush: a set of
//              3D balls and strap leaves in world metres, ready for the contour
//              drawer to outline from any camera
// CREATED    : 04-Nov-2026
//
// DESCRIPTION:
// - RULES FIRST, THEN RANDOMNESS (Adam, 04-Nov-2026: "there should be rules for
//   shape etc but then radnomisation to create convincing vegetation effect thats
//   not repetative"). The recipe fixes the habit of the plant; the seed only picks
//   within its ranges.
// - THREE SCALES OF BALL, because one scale reads as a sheep or a cloud:
//     MASSES  the big shape: which humps the outline has, and where it dips.
//     CLUMPS  scattered over the masses: these are the scallops of the outline.
//     NUBS    small balls on the clumps: the irregular little bumps between them.
// - EVERY CLUMP IS DRAWN BY DART THROWING, largest first, so big billows get first
//   choice of the surface and small ones fill the gaps. That gives the uneven
//   rhythm of a hand drawn edge, where an even scatter would give a beaded one.
// - THE PROXY IS THE RULE. Once built, the balls are pulled in to fit the size the
//   plop asked for, so what an artist places as a proxy is what gets drawn.
// - A BALL'S OUTLINE IS NOT A CIRCLE. Each carries a table of radius against the
//   angle round it on the page. A mass's table is a chain of arcs of random length
//   meeting at sharp inward cusps, which is how AutoCAD draws a revision cloud: it
//   means no part of the outline can ever be a long plain curve, from any view. A
//   clump's chain is shallow, so it reads as a cluster of leaves and not a marble.
// - RANDOM NUMBERS PER LOBE ARE KEPT, NOT SPENT. Sixteen numbers per lobe are
//   stored, and the Line Rules sliders compare against them at draw time, so a
//   slider never reshuffles the bush.
//
// - GENERATORS ARE NEVER EDITED (plan, D15). A saved seed must draw the same bush for
//   ever, so what follows is BallCluster version 1, and a new look is a new function
//   beside it, listed in the app's config. THE ORDER OF THE RANDOM DRAWS IS PART OF
//   THAT PROMISE: one rng call added, removed or moved changes every plant it has ever
//   made, with no error anywhere.
//
// FRAMES:
// - Everything here is three.js world: metres, +Y up. Recipes and plops are integer
//   mm, Y-up, converted once on the way in, as every ValeVision saved value is.
//
// INTEGRATION:
// - A recipe is one asset of 53__Vegetation__AssetLibrary, or a project's pinned copy.
// - Its product is read by Na__Vegetation__Contour__.js. Imports nothing from
//   three.js, so the whole build can move to a worker.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 04-Nov-2026 - Version 1.0.0 (ValeVision3D v2.83.0)
// - Moved in from the prototype 85__EarlyStage__VegetationLinework, where the look
//   was agreed. Every draw is unchanged. Added BuildPlant, which picks the generator an
//   asset names.
//
// 04-Nov-2026 - Version 0.1.0
// - Initial build for the isolated aesthetic demo.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Seeded Random
    // ------------------------------------------------------------
    import { Na__VegRand__Create } from './Na__Vegetation__Random__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Table Sizes and Tiers
    // ------------------------------------------------------------
    const Na__VegBuild__TAU         = Math.PI * 2;
    const Na__VegBuild__POLAR_MASS  = 720;                                     // <-- Half a degree: a mass's cusps stay sharp in a close up
    const Na__VegBuild__POLAR_CLUMP = 180;
    const Na__VegBuild__POLAR_NUB   = 48;
    const Na__VegBuild__STYLE_N     = 16;                                      // <-- Stored random numbers per lobe (see Contour's U_ indices)
    const Na__VegBuild__CUSP_U_N    = 4;                                       // <-- Stored random numbers per cusp
    const Na__VegBuild__TIER_MASS   = 0;
    const Na__VegBuild__TIER_CLUMP  = 1;
    const Na__VegBuild__TIER_NUB    = 2;
    const Na__VegBuild__MAX_LOBES   = 900;                                     // <-- A very long drift stops here rather than freezing the page
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Masses: the Big Shape
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Masses of a Rounded Mound (a crown, and shoulders round it)
    // ------------------------------------------------------------
    function Na__VegBuild__MassesMound(rng, a, b, h, rules) {
        const masses = [];
        const count  = rng.int(rules.Masses__CountMin, rules.Masses__CountMax);

        // THE CROWN SITS OFF CENTRE, or every mound has its peak in the middle
        const crownR = Math.min(h, a * 1.6) * rng.range(0.36, 0.44);
        masses.push({
            x : rng.range(-0.30, 0.30) * a,
            y : h - crownR * rng.range(0.98, 1.06),
            z : rng.range(-0.18, 0.18) * b,
            r : crownR
        });

        const start = rng.angle();
        for (let k = 1; k < count; k++) {
            const az     = start + (Na__VegBuild__TAU * (k - 1)) / (count - 1) + rng.range(-0.42, 0.42);
            const spread = rng.range(0.42, 0.72);
            const r      = Math.min(h, a * 1.6) * rng.range(0.26, 0.42);
            masses.push({
                x : Math.cos(az) * a * spread,
                y : r * rng.range(0.72, 1.45),                                 // <-- Shoulders at different heights make the humps and notches
                z : Math.sin(az) * b * spread,
                r
            });
        }
        return masses;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Masses of an Upright Shrub (a loose stack, and side shoots)
    // ------------------------------------------------------------
    function Na__VegBuild__MassesUpright(rng, a, b, h, rules) {
        const masses = [];
        const count  = rng.int(rules.Masses__CountMin, rules.Masses__CountMax);

        for (let k = 0; k < count; k++) {
            const t = (k + 0.5) / count;
            const w = Math.pow(Math.sin(Math.PI * (0.20 + 0.72 * t)), 0.8);    // <-- Fullest a little below the middle, narrowing to the top
            const r = a * rng.range(0.56, 0.78) * w;
            masses.push({
                x : rng.range(-0.34, 0.34) * a,
                y : h * (0.14 + 0.72 * t) + rng.range(-0.05, 0.05) * h,
                z : rng.range(-0.28, 0.28) * b,
                r : Math.max(r, a * 0.26)
            });
        }

        // SIDE SHOOTS | What breaks the outline: without them it is a smooth egg
        const shoots = rng.int(1, 2);
        for (let k = 0; k < shoots; k++) {
            const az = rng.angle();
            masses.push({
                x : Math.cos(az) * a * rng.range(0.55, 0.80),
                y : h * rng.range(0.42, 0.86),
                z : Math.sin(az) * b * rng.range(0.40, 0.70),
                r : a * rng.range(0.20, 0.32)
            });
        }
        return masses;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Masses of a Low Drift (the count follows the length)
    // ------------------------------------------------------------
    function Na__VegBuild__MassesRun(rng, a, b, h, rules) {
        const masses = [];
        const length = a * 2;
        const pitch  = h * rng.range(0.95, 1.25);
        const count  = Math.max(rules.Masses__CountMin, Math.round(length / pitch));

        for (let k = 0; k < count; k++) {
            const t = (k + 0.5) / count;
            const r = h * rng.range(0.42, 0.66);
            masses.push({
                x : (-a + length * t) * 0.84 + rng.range(-0.30, 0.30) * (length / count),
                y : r * rng.range(0.62, 0.98),
                z : rng.range(-0.34, 0.34) * b,
                r
            });
        }
        return masses;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Clumps and Nubs: the Scallops
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Uniformly Random Direction, Kept Off the Underside
    // ------------------------------------------------------------
    function Na__VegBuild__RandomDirection(rng, out) {
        const y  = rng.range(-0.30, 1.0);                                      // <-- Nothing grows on the underside of a mass
        const az = rng.angle();
        const s  = Math.sqrt(Math.max(0, 1 - y * y));
        out.x = Math.cos(az) * s;
        out.y = y;
        out.z = Math.sin(az) * s;
        return out;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Scatter Clumps Over the Masses, Largest First
    // ------------------------------------------------------------
    function Na__VegBuild__ScatterClumps(rng, masses, recipe, factors) {
        const rules   = recipe.Asset__Clumps;
        const scallop = factors.scallop;
        const minR    = (rules.Clumps__RadiusMinMm / 1000) * scallop;
        const maxR    = (rules.Clumps__RadiusMaxMm / 1000) * scallop;
        const clumps  = [];
        const dir     = { x : 0, y : 0, z : 0 };

        // HOW MANY | A saturated throw: try far more than will fit and stop on crowding
        let area = 0;
        masses.forEach((m) => { area += 4 * Math.PI * m.r * m.r; });
        const meanR  = (minR + maxR) * 0.5;
        const target = Math.min(Na__VegBuild__MAX_LOBES, Math.ceil(area / (Math.PI * meanR * meanR * 0.7)));

        const radii = [];
        for (let k = 0; k < target; k++) radii.push(rng.skew(minR, maxR, rules.Clumps__Skew));
        radii.sort((p, q) => q - p);                                           // <-- Biggest billows choose first

        for (let k = 0; k < radii.length; k++) {
            const rc = radii[k];
            for (let tries = 0; tries < 26; tries++) {
                const m = masses[Math.floor(rng.next() * masses.length)];
                Na__VegBuild__RandomDirection(rng, dir);
                const reach = m.r * rng.range(rules.Clumps__ReachMin, rules.Clumps__ReachMax);
                const cx = m.x + dir.x * reach;
                const cy = m.y + dir.y * reach;
                const cz = m.z + dir.z * reach;
                if (cy < rc * 0.10) continue;                                  // <-- Foot clumps sit on the ground, not under it

                // BURIED IN ANOTHER MASS | It could never be seen
                let buried = false;
                for (let j = 0; j < masses.length; j++) {
                    const o = masses[j];
                    if (o === m) continue;
                    const dx = cx - o.x, dy = cy - o.y, dz = cz - o.z;
                    if (dx * dx + dy * dy + dz * dz < (o.r * 0.84) * (o.r * 0.84)) { buried = true; break; }
                }
                if (buried) continue;

                // CROWDING | Overlapping is the point; sitting on top of another is not
                let crowded = false;
                for (let j = 0; j < clumps.length; j++) {
                    const o = clumps[j];
                    const gap = (rc + o.r) * rules.Clumps__Spacing;
                    const dx = cx - o.x, dy = cy - o.y, dz = cz - o.z;
                    if (dx * dx + dy * dy + dz * dz < gap * gap) { crowded = true; break; }
                }
                if (crowded) continue;

                clumps.push({ x : cx, y : cy, z : cz, r : rc, mx : m.x, my : m.y, mz : m.z });
                break;
            }
        }
        return clumps;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Set Nubs on the Clumps
    // ------------------------------------------------------------
    function Na__VegBuild__ScatterNubs(rng, clumps, recipe, factors) {
        const rules = recipe.Asset__Nubs;
        const nubs  = [];
        const count = Math.round(clumps.length * rules.Nubs__Share * factors.nubs);

        for (let k = 0; k < count && clumps.length > 0; k++) {
            const c  = clumps[Math.floor(rng.next() * clumps.length)];
            const rn = rng.range(rules.Nubs__RadiusMinMm, rules.Nubs__RadiusMaxMm) / 1000;

            // OUTWARD FROM THE MASS, with scatter, so nubs break the edge and do not pile in the middle
            let ox = c.x - c.mx, oy = c.y - c.my, oz = c.z - c.mz;
            const len = Math.hypot(ox, oy, oz) || 1;
            ox = ox / len + rng.range(-0.9, 0.9);
            oy = oy / len + rng.range(-0.9, 0.9);
            oz = oz / len + rng.range(-0.9, 0.9);
            const lenB  = Math.hypot(ox, oy, oz) || 1;
            const reach = c.r * rng.range(0.88, 1.04);

            const x = c.x + (ox / lenB) * reach;
            const y = c.y + (oy / lenB) * reach;
            const z = c.z + (oz / lenB) * reach;
            if (y < rn * 0.10) continue;
            nubs.push({ x, y, z, r : rn });
        }
        return nubs;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Strap Leaves
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Tufts of Strap Leaves Round the Foot
    // ------------------------------------------------------------
    // Each blade is a true 3D curve from the foot, so a tuft stands correctly from
    // above as well as from the side. Its width is only given at draw time, turned
    // square to the eye, so a blade never collapses to a sliver when seen edge on.
    // ------------------------------------------------------------
    function Na__VegBuild__BuildTufts(rng, recipe, a, b) {
        const rules  = recipe.Asset__Tufts;
        const blades = [];
        const count  = rng.int(rules.Tufts__CountMin, rules.Tufts__CountMax);

        for (let t = 0; t < count; t++) {
            const az    = rng.angle();
            const ring  = rng.range(0.74, 1.02);
            const baseX = Math.cos(az) * a * ring;
            const baseZ = Math.sin(az) * b * ring;
            const tall  = rng.range(rules.Tufts__HeightMinMm, rules.Tufts__HeightMaxMm) / 1000;
            const n     = rng.int(rules.Tufts__BladesMin, rules.Tufts__BladesMax);

            for (let k = 0; k < n; k++) {
                const bladeAz = rng.angle();
                const h       = tall * rng.range(0.58, 1.0);
                const lean    = h * rng.range(0.12, 0.52);                     // <-- More than this and a blade reads as a croquet hoop
                const dx      = Math.cos(bladeAz), dz = Math.sin(bladeAz);
                const ox      = baseX + dx * rng.range(0.0, 0.05);             // <-- The foot opens out, or the base of a tuft is a black knot
                const oz      = baseZ + dz * rng.range(0.0, 0.05);
                const droop   = rng.range(0.84, 1.0);
                blades.push({
                    p : [
                        ox, 0, oz,
                        ox + dx * lean * 0.15, h * 0.55, oz + dz * lean * 0.15,
                        ox + dx * lean * 0.68, h * 0.98, oz + dz * lean * 0.68,
                        ox + dx * lean * 1.25, h * droop, oz + dz * lean * 1.25
                    ],
                    w : (rules.Tufts__BladeWidthMm / 1000) * rng.range(0.75, 1.2)
                });
            }
        }
        return blades;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building a Bush
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fill One Ball's Radius Table with a Chain of Arcs
    // ------------------------------------------------------------
    // rules : { chordMinM, chordMaxM, depth, skew, tipShare, ellipse, wobble }
    // Each arc gets its own length, height and lean, so no two runs of the chain
    // repeat. A tipped arc comes to a soft point: a leaf rather than a billow.
    // ------------------------------------------------------------
    function Na__VegBuild__FillPolar(rng, table, base, N, radiusM, rules) {
        const TAU = Na__VegBuild__TAU;

        // THE ARC LENGTHS | Thrown until they go round, then scaled to close exactly
        const widths = [];
        let total = 0;
        while (total < TAU && widths.length < 128) {
            const chord = rng.skew(rules.chordMinM, rules.chordMaxM, rules.skew);
            const w = Math.max(chord / radiusM, 0.16);
            widths.push(w);
            total += w;
        }
        const closeUp = TAU / total;

        const arcs = [];
        let at = 0;
        let meanHeight = 0;
        for (let k = 0; k < widths.length; k++) {
            const w = widths[k] * closeUp;
            const height = w * rules.depth * rng.range(0.58, 1.32);
            arcs.push({
                start  : at,
                width  : w,
                height,
                lean   : rng.range(0.72, 1.36),                                // <-- The top of the arc sits off centre, as a pen stroke does
                tipped : rng.chance(rules.tipShare)
            });
            at += w;
            meanHeight += height * w;
        }
        meanHeight /= TAU;

        const offset  = rng.angle();                                           // <-- Where the chain starts round the ball
        const ellipse = rng.range(-rules.ellipse, rules.ellipse);
        const tilt    = rng.angle();
        const w3      = rules.wobble * rng.range(0.4, 1.0);
        const p3      = rng.angle();

        // SAMPLE THE CHAIN | Walking the arcs in step with the table
        let min = Infinity, max = -Infinity;
        for (let k = 0; k < N; k++) {
            const raw = (TAU * k) / N;
            let angle = raw - offset;
            angle -= Math.floor(angle / TAU) * TAU;

            let index = 0;
            while (index < arcs.length - 1 && angle >= arcs[index + 1].start) index++;

            const arc = arcs[index];
            const t   = Math.min(1, Math.max(0, (angle - arc.start) / arc.width));
            const x   = 2 * Math.pow(t, arc.lean) - 1;
            const bump = arc.tipped
                ? Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x), 1.25)), 1.12)
                : Math.sqrt(Math.max(0, 1 - x * x));

            const f = 1 - meanHeight * 0.5
                + arc.height * bump
                + ellipse * Math.cos(2 * (raw - tilt))
                + w3 * Math.cos(3 * raw + p3);
            table[base + k] = f;
            if (f < min) min = f;
            if (f > max) max = f;
        }
        // THE CUSPS | Where one arc meets the next: the hooks are drawn from these
        const cusps = [];
        for (let k = 0; k < arcs.length; k++) {
            cusps.push((arcs[k].start + offset) % TAU);
        }
        return { min, max, cusps };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build One Bush from Its Recipe and Its Plop
    // ------------------------------------------------------------
    // plop   : { seed, positionMm:[x,y,z], yawDeg, sizeMm:[w,d,h] | null }
    // factors: { scallop, nubs }, the panel's two structural sliders
    // ------------------------------------------------------------
    function Na__VegBuild__Bush(recipe, plop, factors) {
        const rng    = Na__VegRand__Create(plop.seed);
        const size   = recipe.Asset__Size;
        const jitter = 1 + rng.range(-size.Size__JitterShare, size.Size__JitterShare);
        const widthM = ((plop.sizeMm ? plop.sizeMm[0] : size.Size__WidthMm) / 1000) * (plop.sizeMm ? 1 : jitter);
        const depthM = ((plop.sizeMm ? plop.sizeMm[1] : size.Size__DepthMm) / 1000) * (plop.sizeMm ? 1 : jitter);
        const highM  = ((plop.sizeMm ? plop.sizeMm[2] : size.Size__HeightMm) / 1000) * (plop.sizeMm ? 1 : jitter);
        const a = widthM / 2, b = depthM / 2, h = highM;

        // THE BIG SHAPE
        const layout = recipe.Asset__Masses.Masses__Layout;
        let masses;
        if (layout === 'Upright')  masses = Na__VegBuild__MassesUpright(rng, a, b, h, recipe.Asset__Masses);
        else if (layout === 'Run') masses = Na__VegBuild__MassesRun(rng, a, b, h, recipe.Asset__Masses);
        else                       masses = Na__VegBuild__MassesMound(rng, a, b, h, recipe.Asset__Masses);

        // THE SCALLOPS
        const clumps = Na__VegBuild__ScatterClumps(rng, masses, recipe, factors);
        const nubs   = Na__VegBuild__ScatterNubs(rng, clumps, recipe, factors);
        const blades = Na__VegBuild__BuildTufts(rng, recipe, a, b);

        // FIT TO THE PROXY | Centres only: radii stay as the recipe says, so a stretched
        // proxy never stretches a scallop
        let maxX = 0.001, maxZ = 0.001, maxY = 0.001;
        const all = [];
        masses.forEach((m) => all.push({ tier : Na__VegBuild__TIER_MASS, x : m.x, y : m.y, z : m.z, r : m.r }));
        clumps.forEach((m) => all.push({ tier : Na__VegBuild__TIER_CLUMP, x : m.x, y : m.y, z : m.z, r : m.r }));
        nubs.forEach((m) => all.push({ tier : Na__VegBuild__TIER_NUB, x : m.x, y : m.y, z : m.z, r : m.r }));
        all.forEach((m) => {
            maxX = Math.max(maxX, Math.abs(m.x) + m.r);
            maxZ = Math.max(maxZ, Math.abs(m.z) + m.r);
            maxY = Math.max(maxY, m.y + m.r);
        });
        const fitX = a / maxX, fitZ = b / maxZ, fitY = h / maxY;

        // INTO THE WORLD | Yaw about +Y, then the plop's place. Mm to metres once, here.
        const yaw  = ((plop.yawDeg || 0) * Math.PI) / 180;
        const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
        const ox   = plop.positionMm[0] / 1000;
        const oy   = plop.positionMm[1] / 1000;
        const oz   = plop.positionMm[2] / 1000;

        const n     = all.length;
        const bush  = {
            count    : n,
            cx       : new Float32Array(n),
            cy       : new Float32Array(n),
            cz       : new Float32Array(n),
            r        : new Float32Array(n),
            rMax     : new Float32Array(n),
            rMin     : new Float32Array(n),
            tier     : new Uint8Array(n),
            polar    : null,
            polStart : new Int32Array(n),
            polN     : new Int32Array(n),
            cuspFrom : new Int32Array(n + 1),
            cuspA    : null,
            cuspU    : null,
            style    : new Float32Array(n * Na__VegBuild__STYLE_N),
            blades   : [],
            line     : recipe.Asset__Line,
            sizeM    : [widthM, depthM, highM],
            groundY  : oy,
            boundsCx : ox,
            boundsCy : oy + h * 0.5,
            boundsCz : oz,
            boundsR  : Math.hypot(a, h * 0.5, b) * 1.15
        };

        // THE RADIUS TABLES | One shared array, each ball taking what its size needs
        let tableSize = 0;
        for (let i = 0; i < n; i++) {
            const tier = all[i].tier;
            const size = tier === Na__VegBuild__TIER_MASS ? Na__VegBuild__POLAR_MASS
                : (tier === Na__VegBuild__TIER_CLUMP ? Na__VegBuild__POLAR_CLUMP : Na__VegBuild__POLAR_NUB);
            bush.polStart[i] = tableSize;
            bush.polN[i]     = size;
            tableSize += size;
        }
        bush.polar = new Float32Array(tableSize);

        const massRules = {
            chordMinM : (recipe.Asset__Masses.Masses__ScallopChordMinMm / 1000) * factors.scallop,
            chordMaxM : (recipe.Asset__Masses.Masses__ScallopChordMaxMm / 1000) * factors.scallop,
            depth     : recipe.Asset__Masses.Masses__ScallopDepth,
            skew      : recipe.Asset__Masses.Masses__ScallopSkew,
            tipShare  : recipe.Asset__Masses.Masses__TipShare,
            ellipse   : 0.03,
            wobble    : 0.015
        };
        const clumpDepth = recipe.Asset__Clumps.Clumps__ScallopDepth;
        const clumpTips  = recipe.Asset__Clumps.Clumps__TipShare;
        const clumpEll   = recipe.Asset__Clumps.Clumps__Ellipse;
        const clumpWob   = recipe.Asset__Clumps.Clumps__Wobble;
        const cuspList   = [];

        for (let i = 0; i < n; i++) {
            const m  = all[i];
            const lx = m.x * fitX, lz = m.z * fitZ;
            bush.cx[i]   = ox + lx * cosY + lz * sinY;
            bush.cy[i]   = oy + m.y * fitY;
            bush.cz[i]   = oz - lx * sinY + lz * cosY;
            bush.r[i]    = m.r;
            bush.tier[i] = m.tier;

            // A CLUMP'S CHAIN IS SHORT AND SHALLOW; A NUB IS PLAIN | Sizes are per ball, not per bush
            const rules = (m.tier === Na__VegBuild__TIER_MASS) ? massRules : (m.tier === Na__VegBuild__TIER_CLUMP
                ? { chordMinM : m.r * 0.85, chordMaxM : m.r * 1.9, depth : clumpDepth, skew : 1.0, tipShare : clumpTips, ellipse : clumpEll, wobble : clumpWob }
                : { chordMinM : m.r * 2.4, chordMaxM : m.r * 4.0, depth : 0.02, skew : 1.0, tipShare : 0, ellipse : clumpEll, wobble : clumpWob });
            const span = Na__VegBuild__FillPolar(rng, bush.polar, bush.polStart[i], bush.polN[i], m.r, rules);
            bush.rMax[i] = m.r * span.max;
            bush.rMin[i] = m.r * span.min;

            bush.cuspFrom[i] = cuspList.length;
            if (m.tier !== Na__VegBuild__TIER_NUB) {
                span.cusps.forEach((angle) => cuspList.push(angle));
            }

            for (let u = 0; u < Na__VegBuild__STYLE_N; u++) {
                bush.style[i * Na__VegBuild__STYLE_N + u] = rng.next();
            }
        }

        // A CUSP'S OWN NUMBERS | Kept like a lobe's, so a slider never reshuffles the hooks
        bush.cuspFrom[n] = cuspList.length;
        bush.cuspA = new Float32Array(cuspList);
        bush.cuspU = new Float32Array(cuspList.length * Na__VegBuild__CUSP_U_N);
        for (let k = 0; k < bush.cuspU.length; k++) bush.cuspU[k] = rng.next();

        blades.forEach((blade) => {
            const p = new Float32Array(12);
            for (let k = 0; k < 4; k++) {
                const lx = blade.p[k * 3], ly = blade.p[k * 3 + 1], lz = blade.p[k * 3 + 2];
                p[k * 3]     = ox + lx * cosY + lz * sinY;
                p[k * 3 + 1] = oy + ly;
                p[k * 3 + 2] = oz - lx * sinY + lz * cosY;
            }
            bush.blades.push({ p, w : blade.w });
        });

        return bush;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Which Generator
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Generators, by Name and Version
    // ------------------------------------------------------------
    // Kept in step with Vegetation__Generators__Config in Na__Vegetation__AppConfig__.json,
    // which is what the library's build util checks an asset against.
    // ------------------------------------------------------------
    const Na__VegBuild__GENERATORS = {
        BallCluster : { 1 : Na__VegBuild__Bush }
    };
    // ------------------------------------------------------------


    // FUNCTION | Build a Plant by the Generator Its Recipe Names
    // ------------------------------------------------------------
    // Returns null for a generator this version of the app does not have, and says
    // so: a plant saved by a newer page is left out rather than drawn wrongly.
    // ------------------------------------------------------------
    function Na__VegBuild__BuildPlant(recipe, plop, factors) {
        const named   = recipe.Asset__Generator;
        const family  = named ? Na__VegBuild__GENERATORS[named.Generator__Name] : null;
        const builder = family ? family[named.Generator__Version] : null;
        if (!builder) {
            console.warn('[ValeVision3D Vegetation] No generator for ' + recipe.Asset__Id + ': a plant was left out.');
            return null;
        }
        return builder(recipe, plop, factors);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Bush Builder API
    // ------------------------------------------------------------
    export {
        Na__VegBuild__STYLE_N,
        Na__VegBuild__CUSP_U_N,
        Na__VegBuild__TIER_MASS,
        Na__VegBuild__TIER_CLUMP,
        Na__VegBuild__TIER_NUB,
        Na__VegBuild__BuildPlant
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
