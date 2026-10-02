// W1-18 scratch probe: why did the harness see different PDF bytes for identical jsPDF calls? Replays one failing case
// (a triangle, the default gradient) and prints where the outputs differ. Writes only to the OS temp folder.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import zlib from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const VV = resolve(HERE, '..', '..', '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'W1-18-probe-'));
writeFileSync(join(TMP, 'package.json'), '{ "type" : "module" }');
const require = createRequire(import.meta.url);
const { jsPDF } = require(join(VV, '04__Lib__ThirdParty__VersionLocked', '05__Vendor__JsPdf__v4.1.0', 'jspdf.umd.js'));

function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const body = Buffer.concat([ Buffer.from(type, 'ascii'), data ]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0, 0); return Buffer.concat([ len, body, crc ]); }
class Canvas { constructor() { this.width = 300; this.height = 150; this.image = null; }
    getContext() { const c = this; return { createImageData : (w, h) => ({ width : w, height : h, data : new Uint8ClampedArray(w * h * 4) }), putImageData : (img) => { c.image = img; } }; }
    toDataURL() { const w = this.width, h = this.height, d = this.image.data; const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) Buffer.from(d.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
        return 'data:image/png;base64,' + Buffer.concat([ Buffer.from([ 137, 80, 78, 71, 13, 10, 26, 10 ]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)) ]).toString('base64'); } }
globalThis.document = { activeElement : null, createElement : () => new Canvas() };

async function loadGrad(path, tag) {
    let src = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
    src = src.replace(/^[ \t]*import\s+\{[\s\S]*?\}\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm, '');
    const rings = 'function Na__LeRings__Spans(count, holes) { const starts = [0].concat(holes); return starts.map((s, i) => [s, i + 1 < starts.length ? starts[i + 1] : count]); }\n';
    const stub = 'const Na__LePanels__OnControl = () => {}; const Na__LePanels__Row = () => {}; const Na__LePanels__Input = () => {};\n';
    const tmp = join(TMP, tag + '.mjs');
    writeFileSync(tmp, stub + (src.indexOf('Na__LeRings__Spans(') !== -1 ? rings : '') + src);
    return import(pathToFileURL(tmp).href);
}
const OG = await loadGrad(join(HERE, 'vv_before', 'Na__LayoutEditor__GradientTool__.js'), 'old');
const NG = await loadGrad(join(HERE, 'rehearsal', 'Na__LayoutEditor__GradientTool__.js'), 'new');
const fresh = () => { const d = new jsPDF({ unit : 'mm', format : 'a3', orientation : 'landscape', compress : false }); d.setCreationDate(new Date(Date.UTC(2026, 9, 2))); d.setFileId('0123456789ABCDEF0123456789ABCDEF'); return d; };
const pts = [ [ 20, 20 ], [ 120, 30 ], [ 60, 110 ] ];
const g = {};
const show = (label, a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; console.log(label + ': identical=' + (a === b) + (a === b ? '' : '  first difference at ' + i + '\n     A: ' + JSON.stringify(a.slice(Math.max(0, i - 80), i + 80)) + '\n     B: ' + JSON.stringify(b.slice(Math.max(0, i - 80), i + 80)))); };
const d1 = fresh(); OG.Na__LeGrad__DrawPdf(d1, pts, g); const o1 = d1.output();
const d2 = fresh(); NG.Na__LeGrad__DrawPdf(d2, pts, g); const n1 = d2.output();
const d3 = fresh(); NG.Na__LeGrad__DrawPdf(d3, pts, g, undefined); const n2 = d3.output();
const d4 = fresh(); OG.Na__LeGrad__DrawPdf(d4, pts, g); const o2 = d4.output();
show('old vs new (holes left out)', o1, n1);
show('old vs new (holes undefined)', o1, n2);
show('old vs old (second run)', o1, o2);
show('new vs new (second run)', n1, n2);
show('old doc: output() again', o1, d1.output());
const o3 = d1.output(); show('old doc: output() a third time', o1, o3);
rmSync(TMP, { recursive : true, force : true });
