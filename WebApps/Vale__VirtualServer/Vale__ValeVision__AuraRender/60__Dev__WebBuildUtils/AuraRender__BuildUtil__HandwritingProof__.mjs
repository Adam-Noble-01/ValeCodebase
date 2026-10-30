// =============================================================================
// VALEVISION AURA - BUILD UTIL | HANDWRITING PROOF SHEET
// =============================================================================
//
// FILE       : AuraRender__BuildUtil__HandwritingProof__.mjs
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Write a sheet of notes with the browser's handwriting engine, run
//              here in Node, and save it as an SVG and a PNG to look at: the
//              studio's proof sheet, for the WebAssembly engine
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE SAME CODE AS THE BROWSER: the engine's worker modules (Layout, Neural,
//   TechStrokes) and its SIMD WebAssembly, with the model from
//   Server__Api/Api__ValeVision__AuraRender/Content__AuraHandwritingModel.
// - THE NOTES are the Vale Handwriting Studio's demonstration and quality
//   phrases (build_demo.py and quality_samples.py), with their seeds, asked
//   for as AURA's client asks (a style, widths relative to the nib), drawn with
//   the STAEDTLER Mars matic 700 M018 (0.18 mm) unless a note names another
//   pen, one with the variable pen and a quick hand, and one with its leader
//   (the sheet's own leader module).
// - THE PNG is drawn from the SVG paths themselves (each cubic flattened, the
//   pen's width stamped along it) at 12 px a millimetre, so it checks the
//   stored ink and the true pen widths, not a copy.
// - WRITES 21__Generated__HandwritingParity/HandwritingProof__Sheet__.svg and
//   .png (git-ignored), and prints each note's time, pen widths and ink size.
//
// USAGE:
//   node AuraRender__BuildUtil__HandwritingProof__.mjs
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.1.0
// - The real pens (AURA 0.3.2): notes at 0.18 mm and 0.35 mm, the variable
//   pen, a leader; requests carry a style and ask for nib-relative widths.
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build (AURA 0.2.1).
//
// =============================================================================

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import zlib from 'node:zlib';


// -----------------------------------------------------------------------------
// REGION | Constants
// -----------------------------------------------------------------------------

const NA__PROOF__HERE      = path.dirname(fileURLToPath(import.meta.url));
const NA__PROOF__ENGINE    = path.resolve(NA__PROOF__HERE, '..', '02__Src__AppModules', '31__System__Handwriting', '02__Engine__Wasm');
const NA__PROOF__MODEL     = path.resolve(NA__PROOF__HERE, '..', '..', 'Server__Api', 'Api__ValeVision__AuraRender', 'Content__AuraHandwritingModel');
const NA__PROOF__OUT       = path.join(NA__PROOF__HERE, '21__Generated__HandwritingParity');
const NA__PROOF__PX_PER_MM = 12;                                                  // <-- 0.18 mm is 2.2 px: enough to judge a pen
const NA__PROOF__SHEET_W   = 300;                                                // <-- mm
const NA__PROOF__INK       = '#263b37';                                          // <-- The studio's Forest ink
const NA__PROOF__NOTES     = [                                                    // <-- The studio's demo and quality phrases; pen in mm (the Mars matic nibs), style as a note's own
    { text: 'Slender roof lantern\nwith traditional detailing', seed: 42, leader: [150, 6] },
    { text: 'Painted timber frames\nin a soft garden green', seed: 67, width: 150 },
    { text: 'Open the doors\nto the garden', seed: 18, width: 118 },
    { text: 'Garden room', seed: 42 },
    { text: 'Please confirm all dimensions on site', seed: 42 },
    { text: '2400 mm x 1200 mm', seed: 42 },
    { text: 'Oak framed orangery (0.35 mm pen)', seed: 42, pen: 0.35 },
    { text: 'Variable pen, quick hand', seed: 42, style: { PenMode: 'Variable', Neatness: 0.75, Variation: 0.55 } },
    { text: 'Handmade clay plain tiles, 1.2 m overhang', seed: 7, width: 120, size: 3.5, style: { Neatness: 1.6, Variation: 0.15 } }
];
const NA__PROOF__PEN_MM    = 0.18;                                                // <-- STAEDTLER Mars matic 700 M018: AURA's default lettering pen
const NA__PROOF_ENGINE_PARENT = () => path.resolve(NA__PROOF__ENGINE, '..');      // <-- 31__System__Handwriting: the leaders module

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | A Small Rasteriser and PNG Writer
// -----------------------------------------------------------------------------

function Na__Proof__Flatten(d) {
    const tokens = d.match(/[MCcQ]|-?(?:\d+\.?\d*|\.\d+)/g);                      // <-- The note's M and relative c; the leaders' absolute C and Q
    const lines = [];
    let i = 0, x = 0, y = 0, command = '';
    while (i < tokens.length) {
        if (/^[MCcQ]$/.test(tokens[i])) command = tokens[i++];
        if (command === 'M') { x = +tokens[i++]; y = +tokens[i++]; lines.push([[x, y]]); command = 'c'; continue; }
        const line = lines[lines.length - 1];
        if (command === 'Q') {
            const [x1, y1, x2, y2] = tokens.slice(i, i + 4).map(Number);
            i += 4;
            for (let s = 1; s <= 8; s++) {
                const t = s / 8, u = 1 - t;
                line.push([u * u * x + 2 * u * t * x1 + t * t * x2, u * u * y + 2 * u * t * y1 + t * t * y2]);
            }
            x = x2; y = y2;
            continue;
        }
        const [x1, y1, x2, y2, x3, y3] = tokens.slice(i, i + 6).map(Number).map((v, k) => command === 'c' ? v + (k % 2 ? y : x) : v);
        i += 6;
        for (let s = 1; s <= 8; s++) {
            const t = s / 8, u = 1 - t;
            line.push([u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
                       u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]);
        }
        x = x3; y = y3;
    }
    return lines;
}

function Na__Proof__Stamp(image, w, h, cx, cy, radius) {
    const r = Math.max(0.6, radius);
    for (let py = Math.floor(cy - r - 1); py <= Math.ceil(cy + r + 1); py++) {
        if (py < 0 || py >= h) continue;
        for (let px = Math.floor(cx - r - 1); px <= Math.ceil(cx + r + 1); px++) {
            if (px < 0 || px >= w) continue;
            const cover = Math.max(0, Math.min(1, r + 0.5 - Math.hypot(px + 0.5 - cx, py + 0.5 - cy)));
            const k = py * w + px;
            image[k] = Math.max(image[k], cover);
        }
    }
}

function Na__Proof__Png(image, w, h) {
    const ink = [0x26, 0x3b, 0x37], paper = [0xfb, 0xf8, 0xf0];
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) {
        raw[y * (w * 3 + 1)] = 0;
        for (let x = 0; x < w; x++) {
            const a = image[y * w + x], o = y * (w * 3 + 1) + 1 + x * 3;
            for (let c = 0; c < 3; c++) raw[o + c] = Math.round(paper[c] + (ink[c] - paper[c]) * a);
        }
    }
    const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = (buf) => { let c = 0xFFFFFFFF; for (const b of buf) c = table[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
    const chunk = (type, data) => {
        const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'ascii');
        const tail = Buffer.alloc(4); tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), data])), 0);
        return Buffer.concat([head, data, tail]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Sheet
// -----------------------------------------------------------------------------

async function Na__Proof__Main() {
    const engine = (name) => import(pathToFileURL(path.join(NA__PROOF__ENGINE, name)).href);
    const { Na__Neural__Create } = await engine('Na__HandwritingEngine__Neural__.js');
    const { Na__Layout__Validate, Na__Layout__Render } = await engine('Na__HandwritingEngine__Layout__.js');

    const manifest = JSON.parse(await readFile(path.join(NA__PROOF__MODEL, 'AuraRender__HandwritingModel__Epoch46__Manifest__.json'), 'utf8'));
    const weights = await readFile(path.join(NA__PROOF__MODEL, manifest.HandwritingModel__File));
    const bytes = await readFile(path.join(NA__PROOF__ENGINE, 'Na__HandwritingEngine__Network__Simd__.wasm'));
    const { instance } = await WebAssembly.instantiate(bytes, { env: { abort() { throw new Error('abort'); } } });
    const network = instance.exports;
    new Uint8Array(network.memory.buffer, network.Na__Network__WeightsPointer(), weights.length).set(weights);
    const pen = Na__Neural__Create(network, manifest);

    const { Na__PenLeaders__Strokes, Na__PenLeaders__Start } = await import(pathToFileURL(path.resolve(NA__PROOF_ENGINE_PARENT(), 'Na__Handwriting__PenLeaders__.js')).href);
    const placed = [];                                                           // <-- { paths: [{ d, w (mm) }], x, y }: offsets in sheet mm
    let top = 10;
    for (const note of NA__PROOF__NOTES) {
        const nib = note.pen || NA__PROOF__PEN_MM;
        const request = { text: note.text, size: note.size || 4.5, width: note.width || 135, seed: note.seed, style: note.style || {}, widths: 'nib' };   // <-- As AURA's client asks
        const ink = Na__Layout__Render(Na__Layout__Validate(request, pen.Charset), pen);
        const studioBytes = ink.paths.reduce((n, p) => n + p.d.split('c').length * 50 + 24, 0);   // <-- About what the studio's .3f absolute paths would take
        const bytesNow = JSON.stringify(ink.paths).length;
        const widths = ink.paths.map((p) => p.w * nib);
        console.log(`${JSON.stringify(note.text).padEnd(48)} ${ink.seconds.toFixed(2)} s  ${ink.paths.length} strokes  ${ink.lines} lines  ` +
                    `pen ${Math.min(...widths).toFixed(3)}-${Math.max(...widths).toFixed(3)} mm  ${(bytesNow / 1024).toFixed(1)} KB (studio ~${(studioBytes / 1024).toFixed(1)} KB)`);
        placed.push({ paths: ink.paths.map((p) => ({ d: p.d, w: p.w * nib })), x: 10, y: top });
        if (note.leader) {                                                       // <-- The note's leader, with the same pen, as the sheet draws it
            const tip = [10 + note.leader[0], top + note.leader[1]];
            const from = Na__PenLeaders__Start({ X: 10, Y: top, W: ink.inkWidth, H: ink.height }, tip);
            const strokes = Na__PenLeaders__Strokes({ from, to: tip, seed: note.seed, pen: nib, variation: 0.3, technical: !(note.style && note.style.PenMode === 'Variable') });
            placed.push({ paths: strokes.map((s) => ({ d: s.d, w: s.width })), x: 0, y: 0 });
        }
        top += ink.height + 6;
    }

    const H = Math.ceil(top + 4), W = NA__PROOF__SHEET_W, k = NA__PROOF__PX_PER_MM;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fbf8f0"/>` +
        placed.map(({ paths, x, y }) => `<g transform="translate(${x} ${y})" fill="none" stroke="${NA__PROOF__INK}" stroke-linecap="round" stroke-linejoin="round">` +
            paths.map((p) => `<path d="${p.d}" stroke-width="${p.w.toFixed(3)}"/>`).join('') + '</g>').join('') + '</svg>';
    const image = new Float32Array(W * k * H * k);
    for (const { paths, x, y } of placed) {
        for (const p of paths) {
            for (const line of Na__Proof__Flatten(p.d)) {
                for (let i = 0; i < line.length; i++) {
                    const a = line[Math.max(0, i - 1)], b = line[i];
                    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * k * 2));
                    for (let s = 0; s <= steps; s++) {
                        const t = s / steps;
                        Na__Proof__Stamp(image, W * k, H * k, (x + a[0] + (b[0] - a[0]) * t) * k, (y + a[1] + (b[1] - a[1]) * t) * k, p.w * k / 2);
                    }
                }
            }
        }
    }
    await mkdir(NA__PROOF__OUT, { recursive: true });
    await writeFile(path.join(NA__PROOF__OUT, 'HandwritingProof__Sheet__.svg'), svg, 'utf8');
    await writeFile(path.join(NA__PROOF__OUT, 'HandwritingProof__Sheet__.png'), Na__Proof__Png(image, W * k, H * k));
    console.log(`wrote ${path.join(NA__PROOF__OUT, 'HandwritingProof__Sheet__.png')} (${W * k} x ${H * k})`);
}

Na__Proof__Main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exit(1);
});

// endregion -------------------------------------------------------------------
