// W1-25 scratch: how wide typical sheet text sets in Open Sans against the Helvetica the
// chrome measures with until SheetChrome 1.14.0 (W1-26). jsPDF 4.1.0's own metrics for
// both faces (Open Sans from the AD04 cuts at b2aa9151, as PdfFonts installs them).
// Read-only; prints a table. The interim this measures: from W1-25 the screen paints the
// sheet's text in Open Sans (LayoutEditor__Style__FontFamily) while the chrome still
// truncates and fits it with Helvetica's widths.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const VV   = resolve(HERE, '..', '..', '..', '..');
globalThis.window = globalThis;
const require = createRequire(import.meta.url);
const JsPdf = require(join(VV, '04__Lib__ThirdParty__VersionLocked', '05__Vendor__JsPdf__v4.1.0', 'jspdf.umd.js')).jsPDF;
const ttf = (f) => execFileSync('git', [ '-C', 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb', 'show', 'b2aa9151:assets/AD04_-_LIBR_-_Common_-_Front-Files/' + f ], { maxBuffer : 1 << 24 }).toString('base64');
const doc = new JsPdf({ unit : 'mm', format : [ 420, 297 ] });
doc.addFileToVFS('R.ttf', ttf('AD04_01_-_Standard-Font_-_Open-Sans-Regular.ttf')); doc.addFont('R.ttf', 'OpenSans', 'normal');
doc.addFileToVFS('B.ttf', ttf('AD04_02_-_Standard-Font_-_Open-Sans-SemiBold.ttf')); doc.addFont('B.ttf', 'OpenSans', 'bold');
const MM_PER_PT = 25.4 / 72;
const width = (face, style, text, fontMm, trackMm) => { doc.setFont(face, style); doc.setFontSize(fontMm / MM_PER_PT); return doc.getTextWidth(text) + (trackMm || 0) * text.length; };
const rows = [
    [ 'title label',   'normal', 1.6, 0.05, [ 'CLIENT', 'SITE ADDRESS', 'DRAWING TITLE', 'DOCUMENT ID', 'REV', 'SCALE', 'DATE', 'DRAWN BY', 'STATUS' ] ],
    [ 'title value',   'normal', 2.2, 0,    [ 'Mr & Mrs Featherstonehaugh', 'The Old Rectory, Church Lane, Melton Mowbray, LE13 1AE', 'Proposed Orangery - Elevations', '99999_D100', 'Revision B', '1:50 & 1:100 @ ISO A2', '02 Oct 2026', 'Vale Garden Houses', 'FOR BUILDING CONTROL' ] ],
    [ 'frame caption', 'bold',   2.4, 0.16, [ 'PROPOSED FRONT ELEVATION', 'PROPOSED GROUND FLOOR PLAN 1:50', 'SECTION A-A' ] ]
];
let wider = 0, total = 0, worst = { ratio : 0 };
console.log('kind           style   size  Helvetica mm  Open Sans mm  OS/H    text');
for (const [ kind, style, size, track, texts ] of rows) {
    for (const text of texts) {
        const h = width('helvetica', style, text, size, track), o = width('OpenSans', style, text, size, track);
        total++; if (o > h) wider++;
        if (o / h > worst.ratio) worst = { ratio : o / h, text, kind };
        console.log(kind.padEnd(14) + ' ' + style.padEnd(7) + ' ' + String(size).padEnd(5) + ' ' + h.toFixed(2).padStart(12) + ' ' + o.toFixed(2).padStart(13) + '  ' + (o / h).toFixed(3) + '  ' + text);
    }
}
console.log('');
console.log('Open Sans sets wider than Helvetica in ' + wider + ' of ' + total + ' runs; the widest ratio ' + worst.ratio.toFixed(3) + ' (' + worst.kind + ': ' + worst.text + ').');
