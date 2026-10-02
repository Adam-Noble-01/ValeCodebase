// W1-18 scratch probe: does jsPDF 4.1.0 write the same bytes when output() is called twice on one document that
// holds a PNG with an alpha channel? (Explains a harness artefact; writes nothing to disk.)
const path = require('node:path');
const zlib = require('node:zlib');
const { jsPDF } = require(path.resolve(__dirname, '..', '..', '..', '..', '04__Lib__ThirdParty__VersionLocked', '05__Vendor__JsPdf__v4.1.0', 'jspdf.umd.js'));

function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([ Buffer.from(type, 'ascii'), data ]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0, 0);
    return Buffer.concat([ len, body, crc ]);
}
function png(w, h, alpha) {
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = y * (w * 4 + 1) + 1 + x * 4; raw[k] = x; raw[k + 1] = 100; raw[k + 2] = 200; raw[k + 3] = alpha ? x : 255; }
    return 'data:image/png;base64,' + Buffer.concat([ Buffer.from([ 137, 80, 78, 71, 13, 10, 26, 10 ]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)) ]).toString('base64');
}
for (const [ alpha, compress ] of [ [ false, false ], [ true, false ], [ false, true ], [ true, true ] ]) {
    const doc = new jsPDF({ unit : 'mm', format : 'a4', compress : compress });
    doc.setCreationDate(new Date(Date.UTC(2026, 9, 2)));
    doc.setFileId('0123456789ABCDEF0123456789ABCDEF');
    doc.addImage(png(64, 2, alpha), 'PNG', 10, 10, 50, 5, undefined, undefined, 30);
    const a = doc.output(), b = doc.output();
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    console.log('alpha=' + alpha + ' compress=' + compress + ': second output() identical to the first: ' + (a === b) + (a === b ? '' : ' (first difference at byte ' + i + ': ' + JSON.stringify(a.slice(Math.max(0, i - 60), i + 60)) + ' vs ' + JSON.stringify(b.slice(Math.max(0, i - 60), i + 60)) + ')'));
}
