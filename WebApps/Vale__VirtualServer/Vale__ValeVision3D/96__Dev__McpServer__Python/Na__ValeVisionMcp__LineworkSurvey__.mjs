// =============================================================================
// VALEVISION 3D MCP - WHAT THE LINEWORK DENSITY TEST WOULD CALL ORNAMENT, IN NODE
// =============================================================================
//
// FILE       : Na__ValeVisionMcp__LineworkSurvey__.mjs
// PURPOSE    : Read projects' linework GLBs straight from the library and say which lines the
//              linework density test would draw lightly, where they are and what holds them
// CREATED    : 10-Nov-2026
//
// DESCRIPTION:
// - NO COPY OF THE SUMS. It imports the app's own 05__RenderPipeline/Na__RenderEffect__
//   OrnamentFade__Core__.js, which touches neither three.js nor a page, so what "named" says
//   is what the app draws lightly, segment for segment.
// - NO BROWSER, NO SERVER. One project takes well under a second, the whole library a minute
//   or two, so a threshold can be judged on every model Vale has, not on the one in front of you.
// - WHAT IT ANSWERS: is the cresting found? What else is? How near does the rest of the
//   building come to being called ornament (the runner-up)? Is the ornament a node of its own
//   in the GLB, or flattened into the building's one unnamed node?
// - TWO WAYS OF CHOOSING, both reported. "named": a node whose name says ornament (--seeds),
//   what stands beside it with a companion's name (--companions), and the busy pieces within
//   reach of them. "busy": every busy patch, whatever it is called. A node whose name says
//   never (--exempt, lettered notes) counts in neither.
//
// USAGE:
//   node Na__ValeVisionMcp__LineworkSurvey__.mjs --library <library root> [--filter text] [--json]
//   node Na__ValeVisionMcp__LineworkSurvey__.mjs --project <project folder> [--json]
//   Options: --tone 0.06 (busy)  --named-tone 0.03  --clusters 6  --seeds "Cresting"  --companions "Finial|Spire|Urn"  --exempt "Note__"
//   The two thresholds are the test's own: beside a named part, less mush is asked of a piece.
//
// FRAMES: GLB files are metres, Y up, as three.js holds them. Boxes are printed in millimetres
//         in those axes (X, Y up, Z), the frame the ValeVision MCP's camera tools take.
//
// =============================================================================

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here    = dirname(fileURLToPath(import.meta.url));
const coreUrl = pathToFileURL(join(here, '..', '02__Src__AppModules', '05__RenderPipeline', 'Na__RenderEffect__OrnamentFade__Core__.js')).href;
const Core    = await import(coreUrl);


// -----------------------------------------------------------------------------
// REGION | Arguments
// -----------------------------------------------------------------------------

function argument(name, fallback) {
    const at = process.argv.indexOf('--' + name);
    if (at === -1) return fallback;
    const value = process.argv[at + 1];
    return (value === undefined || value.startsWith('--')) ? true : value;
}

const tone      = Number(argument('tone', 0.06));
const namedTone = Number(argument('named-tone', 0.03));
const maxShown = Number(argument('clusters', 6));
const asJson   = argument('json', false) === true;
const filter   = String(argument('filter', '')).toLowerCase();
const seeds    = new RegExp(String(argument('seeds', 'Cresting')), 'i');
const beside   = new RegExp(String(argument('companions', 'Finial|Spire|Urn')), 'i');
const exempt   = new RegExp(String(argument('exempt', 'Note__')), 'i');

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reading a Linework GLB
// -----------------------------------------------------------------------------

function readGlb(path) {
    const file = readFileSync(path);
    if (file.readUInt32LE(0) !== 0x46546C67) throw new Error('not a GLB: ' + path);
    let offset = 12, json = null, bin = null;
    while (offset < file.length) {
        const length = file.readUInt32LE(offset), type = file.readUInt32LE(offset + 4);
        const chunk = file.subarray(offset + 8, offset + 8 + length);
        if (type === 0x4E4F534A) json = JSON.parse(chunk.toString('utf8'));
        else if (type === 0x004E4942) bin = chunk;
        offset += 8 + length;
    }
    return { json, bin };
}

function multiply(a, b) {                                                      // <-- Column-major, as glTF writes them
    const out = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return out;
}

function localMatrix(node) {
    if (node.matrix) return node.matrix;
    const t = node.translation || [0, 0, 0], q = node.rotation || [0, 0, 0, 1], s = node.scale || [1, 1, 1];
    const [x, y, z, w] = q;
    return [
        (1 - 2 * (y * y + z * z)) * s[0], (2 * (x * y + z * w)) * s[0], (2 * (x * z - y * w)) * s[0], 0,
        (2 * (x * y - z * w)) * s[1], (1 - 2 * (x * x + z * z)) * s[1], (2 * (y * z + x * w)) * s[1], 0,
        (2 * (x * z + y * w)) * s[2], (2 * (y * z - x * w)) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0,
        t[0], t[1], t[2], 1
    ];
}

function readAccessor(gltf, index) {
    const accessor = gltf.json.accessors[index], view = gltf.json.bufferViews[accessor.bufferView];
    const width = { SCALAR : 1, VEC2 : 2, VEC3 : 3, VEC4 : 4 }[accessor.type];
    const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
    const read = { 5126 : (o) => gltf.bin.readFloatLE(o), 5125 : (o) => gltf.bin.readUInt32LE(o), 5123 : (o) => gltf.bin.readUInt16LE(o), 5121 : (o) => gltf.bin.readUInt8(o) }[accessor.componentType];
    const bytes = { 5126 : 4, 5125 : 4, 5123 : 2, 5121 : 1 }[accessor.componentType];
    const stride = view.byteStride || bytes * width;
    const out = new Float64Array(accessor.count * width);
    for (let i = 0; i < accessor.count; i++) for (let c = 0; c < width; c++) out[i * width + c] = read(start + i * stride + c * bytes);
    return out;
}

// Every LINES primitive as world-space segments, one part per node that draws one
function readLineParts(path) {
    const gltf = readGlb(path);
    const parts = [];
    const visit = (nodeIndex, parentMatrix) => {
        const node = gltf.json.nodes[nodeIndex];
        const matrix = multiply(parentMatrix, localMatrix(node));
        if (node.mesh !== undefined) {
            gltf.json.meshes[node.mesh].primitives.forEach((primitive) => {
                if (primitive.mode !== 1 || primitive.attributes.POSITION === undefined) return;
                const position = readAccessor(gltf, primitive.attributes.POSITION);
                const order = primitive.indices !== undefined ? readAccessor(gltf, primitive.indices) : null;
                const corners = order ? order.length : position.length / 3;
                const points = new Float32Array(Math.floor(corners / 2) * 6);
                for (let n = 0; n + 1 < corners; n += 2) {
                    for (let e = 0; e < 2; e++) {
                        const v = (order ? order[n + e] : n + e) * 3;
                        const x = position[v], y = position[v + 1], z = position[v + 2];
                        points[n * 3 + e * 3]     = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
                        points[n * 3 + e * 3 + 1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
                        points[n * 3 + e * 3 + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
                    }
                }
                parts.push({ name : node.name || '', points });
            });
        }
        (node.children || []).forEach((child) => visit(child, matrix));
    };
    const scene = gltf.json.scenes[gltf.json.scene || 0];
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    scene.nodes.forEach((root) => visit(root, identity));
    return parts;
}

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | One File, One Project
// -----------------------------------------------------------------------------

function cleanName(name) {
    return name === '' ? '(the unnamed node: flattened geometry)' : name.replace(/_ID\d+(_\d+)?$/, '').replace(/__\d+$/, '').replace(/_+$/, '');
}

function surveyWay(parts, seedsOnly) {
    parts.forEach((part) => { part.seed = seeds.test(part.name); part.promoted = false; });   // <-- A fresh start: the field marks the companions it promotes
    const field = Core.Na__OrnamentFade__BuildField(parts, { Field__SeedsOnly : seedsOnly });
    const limit = seedsOnly ? namedTone : tone;
    let ornament = 0, ornamentMetres = 0, runnerUp = 0, peak = 0;
    const byName = new Map(), cells = new Map();
    parts.forEach((part) => {
        const cover = Core.Na__OrnamentFade__CoverOfSegments(field, part.points, part);
        const name = cleanName(part.name);
        for (let i = 0; i < part.sizes.length; i++) {
            const o = i * 6;
            const value = Core.Na__OrnamentFade__OrnamentOf(cover, i);
            if (value > peak) peak = value;
            if (value < limit) { if (value > runnerUp) runnerUp = value; continue; }
            if (part.sizes[i] >= 0.8) continue;                               // <-- A long curve in a busy patch is building: the test never touches it
            const length = Math.hypot(part.points[o + 3] - part.points[o], part.points[o + 4] - part.points[o + 1], part.points[o + 5] - part.points[o + 2]);
            ornament++; ornamentMetres += length;
            byName.set(name, (byName.get(name) || 0) + 1);
            const mx = (part.points[o] + part.points[o + 3]) * 0.5, my = (part.points[o + 1] + part.points[o + 4]) * 0.5, mz = (part.points[o + 2] + part.points[o + 5]) * 0.5;
            const key = Math.floor(mx * 2) + ',' + Math.floor(my * 2) + ',' + Math.floor(mz * 2);   // <-- Half metre cells
            const cell = cells.get(key) || { segments : 0, peak : 0, box : [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], names : new Set() };
            cell.segments++; cell.peak = Math.max(cell.peak, value); cell.names.add(name);
            [mx, my, mz].forEach((v, c) => { cell.box[c] = Math.min(cell.box[c], v); cell.box[3 + c] = Math.max(cell.box[3 + c], v); });
            cells.set(key, cell);
        }
    });

    // Cells that touch are one object
    const clusters = [];
    const seen = new Set();
    cells.forEach((_cell, key) => {
        if (seen.has(key)) return;
        const cluster = { segments : 0, peak : 0, box : [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], names : new Set() };
        const queue = [key];
        seen.add(key);
        while (queue.length) {
            const at = queue.pop(), cell = cells.get(at);
            cluster.segments += cell.segments; cluster.peak = Math.max(cluster.peak, cell.peak);
            cell.names.forEach((name) => cluster.names.add(name));
            for (let c = 0; c < 3; c++) { cluster.box[c] = Math.min(cluster.box[c], cell.box[c]); cluster.box[3 + c] = Math.max(cluster.box[3 + c], cell.box[3 + c]); }
            const [x, y, z] = at.split(',').map(Number);
            for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const next = (x + dx) + ',' + (y + dy) + ',' + (z + dz);
                if (cells.has(next) && !seen.has(next)) { seen.add(next); queue.push(next); }
            }
        }
        clusters.push({
            segments : cluster.segments,
            peak     : Math.round(cluster.peak * 100) / 100,
            centreMm : [0, 1, 2].map((c) => Math.round((cluster.box[c] + cluster.box[3 + c]) * 500)),
            sizeMm   : [0, 1, 2].map((c) => Math.round((cluster.box[3 + c] - cluster.box[c]) * 1000)),
            heldBy   : Array.from(cluster.names)
        });
    });
    clusters.sort((a, b) => b.segments - a.segments);
    return {
        ornament, ornamentMetres : Math.round(ornamentMetres * 10) / 10,
        peak     : Math.round(peak * 100) / 100,
        runnerUp : Math.round(runnerUp * 100) / 100,
        heldBy   : Array.from(byName.entries()).sort((a, b) => b[1] - a[1]).map(([name, segments]) => ({ name, segments })),
        clusters
    };
}

function surveyFile(path) {
    const parts = readLineParts(path);
    let segments = 0;
    parts.forEach((part) => {
        part.sizes  = Core.Na__OrnamentFade__MeasureCurves(part.points, Core.Na__OrnamentFade__FieldDefaults.Field__ChainAngleDeg).sizes;
        part.seed      = seeds.test(part.name);
        part.companion = beside.test(part.name);
        part.exempt    = exempt.test(part.name);
        segments += part.sizes.length;
    });
    return {
        file     : basename(path),
        segments,
        seedNodes   : parts.filter((part) => part.seed).length,
        exemptNodes : parts.filter((part) => part.exempt).length,
        named    : surveyWay(parts, true),
        busy     : surveyWay(parts, false)
    };
}

function surveyProject(folder) {
    const glbDir = join(folder, 'ValeVision3D', 'Content__3dModel__GlbFiles');
    if (!existsSync(glbDir)) return null;
    const files = readdirSync(glbDir).filter((name) => /LineworkModel__\.glb$/i.test(name) && !/Linetype__/i.test(name));
    if (files.length === 0) return null;
    const started = Date.now();
    const rows = [];
    files.forEach((name) => {
        try { rows.push(surveyFile(join(glbDir, name))); }
        catch (error) { rows.push({ file : name, error : String(error.message || error) }); }
    });
    return { project : basename(folder), ms : Date.now() - started, files : rows };
}

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Run
// -----------------------------------------------------------------------------

const folders = [];
if (argument('project', false)) {
    folders.push(String(argument('project')));
} else if (argument('library', false)) {
    const library = String(argument('library'));
    readdirSync(library).filter((name) => /^ValeProjects__\d{4}$/.test(name)).forEach((year) => {
        readdirSync(join(library, year)).forEach((id) => {
            const folder = join(library, year, id);
            if (statSync(folder).isDirectory() && (!filter || id.toLowerCase().includes(filter))) folders.push(folder);
        });
    });
} else {
    process.stderr.write('Give --library <library root> or --project <project folder>.\n');
    process.exit(2);
}

const results = folders.map(surveyProject).filter(Boolean);

if (asJson) {
    process.stdout.write(JSON.stringify({ tone, namedTone, seeds : seeds.source, companions : beside.source, exempt : exempt.source, results }));
} else {
    const say = (label, way, limit) => {
        process.stdout.write('    ' + label + ': ' + way.ornament + ' ornament segments (' + way.ornamentMetres + ' m), peak ' + way.peak + ', the rest reaches ' + way.runnerUp + ' of ' + limit + '\n');
        way.clusters.slice(0, maxShown).forEach((cluster) => {
            process.stdout.write('        ' + cluster.segments + ' at ' + JSON.stringify(cluster.centreMm) + ' mm, ' + cluster.sizeMm.join(' x ') + ' mm, peak ' + cluster.peak + ': ' + cluster.heldBy.join(', ') + '\n');
        });
        if (way.clusters.length > maxShown) process.stdout.write('        and ' + (way.clusters.length - maxShown) + ' smaller\n');
    };
    results.forEach((result) => {
        process.stdout.write('\n' + result.project + '  (' + result.ms + ' ms)\n');
        result.files.forEach((row) => {
            if (row.error) { process.stdout.write('  ' + row.file + ': ' + row.error + '\n'); return; }
            const short = row.file.replace(/^.*?__(TrueVision|ValeVision|NaModel)__/, '').replace(/__LineworkModel__\.glb$/, '');
            if (row.busy.ornament === 0 && row.named.ornament === 0) { process.stdout.write('  ' + short + ': ' + row.segments + ' segments, nothing busy\n'); return; }
            process.stdout.write('  ' + short + ': ' + row.segments + ' segments, ' + row.seedNodes + ' nodes named as ornament, ' + row.exemptNodes + ' exempt\n');
            say('named', row.named, namedTone);
            say('busy ', row.busy, tone);
        });
    });
}

// endregion -------------------------------------------------------------------
