// W1-22 scratch: run TrueVision's Cells 1.2.0 (at the pin, scratch copy) on the planned Vale fixture and
// print every number the adapted test's checks rest on. Usage: node fixture_calc.mjs
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRATCH = mkdtempSync(join(tmpdir(), 'w1-22-calc-'));
copyFileSync(join(HERE, 'tv', '02__Src__AppModules', '51__System__LayoutEditor', '10__Core__SheetSurface', 'Na__LayoutEditor__TitleBlock__Cells__.js'), join(SCRATCH, 'Cells.mjs'));
const cells = await import(pathToFileURL(join(SCRATCH, 'Cells.mjs')).href);

const ROWS = [
    { Key : 'Client', Label : 'Client', WidthMm : 36 }, { Key : 'SiteAddress', Label : 'Site Address', WidthMm : 70 },
    { Key : 'Title', Label : 'Drawing Title', WidthMm : 60, Flex : 1 }, { Key : 'DocumentId', Label : 'Document ID', WidthMm : 24 },
    { Key : 'Revision', Label : 'Rev', WidthMm : 28, ValuePrefix : 'Revision' }, { Key : 'Scale', Label : 'Scale', WidthMm : 28 },
    { Key : 'Date', Label : 'Date', WidthMm : 28 }, { Key : 'DrawnBy', Label : 'Drawn By', WidthMm : 28 }, { Key : 'Status', Label : 'Status', WidthMm : 30 } ];
const NEEDS  = { Client : 12.02, SiteAddress : 60.35, Title : 87.72, DocumentId : 14.61, Revision : 6.21, Scale : 17.56, Date : 15.16, DrawnBy : 23.08, Status : 19.26 };
const FLOORS = { Client : 8.76, SiteAddress : 15.06, Title : 15.95, DocumentId : 14.61, Revision : 6.21, Scale : 8.25, Date : 7.05, DrawnBy : 11.78, Status : 8.99 };
const fixed = ROWS.filter((r) => !(r.Flex > 0));

function solve(strip, needs) {
    const asked = Object.assign({}, NEEDS, needs || {});
    const widths = cells.Na__LeTitleCells__Solve(strip, ROWS.map((r) => cells.Na__LeTitleCells__Cell(r, asked[r.Key], FLOORS[r.Key])));
    const byKey = {}; ROWS.forEach((r, i) => { byKey[r.Key] = widths[i]; });
    return { widths, byKey, asked, total : widths.reduce((a, b) => a + b, 0) };
}
function solveWide(strip, factor, needs) {
    const asked = Object.assign({}, NEEDS, needs || {});
    const given = ROWS.map((r) => cells.Na__LeTitleCells__Cell(r, asked[r.Key], FLOORS[r.Key]));
    const wider = cells.Na__LeTitleCells__Widen(strip, given, factor);
    const widths = cells.Na__LeTitleCells__Solve(strip, wider);
    const byKey = {}; ROWS.forEach((r, i) => { byKey[r.Key] = widths[i]; });
    return { widths, byKey, asked, total : widths.reduce((a, b) => a + b, 0) };
}
const cut = (res) => ROWS.filter((r) => res.byKey[r.Key] + 1e-6 < res.asked[r.Key]).map((r) => r.Key);
const show = (label, res) => console.log(label.padEnd(22) + ROWS.map((r) => r.Key + ' ' + res.byKey[r.Key].toFixed(2)).join('  ') + '  | total ' + res.total.toFixed(3) + ' | cut ' + cut(res).join());

const STRIP = { A1 : 797, A2 : 550, A3 : 376, A4 : 253, A4P : 166 };
show('A2', solve(STRIP.A2));
show('A3', solve(STRIP.A3));
const lt = solve(STRIP.A3, { Title : 125 });
show('A3 title 125', lt);
console.log('   site address gave', (70 - lt.byKey.SiteAddress).toFixed(3), ' rev gave', (28 - lt.byKey.Revision).toFixed(3), ' spare: site', (70 - NEEDS.SiteAddress).toFixed(2), 'rev', (28 - NEEDS.Revision).toFixed(2));
show('A2 address 108', solve(STRIP.A2, { SiteAddress : 108 }));
show('A2 3 scales', solve(STRIP.A2, { Scale : 32.63 }));
const a4 = solve(STRIP.A4); show('A4', a4);
console.log('   A4 no cell wider than configured (title aside):', ROWS.every((r) => a4.byKey[r.Key] <= r.WidthMm + 1e-6 || r.Key === 'Title'));
show('narrow 190', solve(190));
const a4p = solve(STRIP.A4P); show('A4P', a4p);
console.log('   A4P title/floor', (a4p.byKey.Title / FLOORS.Title).toFixed(6), ' date/need', (a4p.byKey.Date / NEEDS.Date).toFixed(6), ' lost', (100 * (1 - a4p.byKey.Date / NEEDS.Date)).toFixed(2) + '%');

console.log('\nWIDEN (QR cell off: whole strips)');
const W = { A1 : 797, A2 : 550, A2P : 376 };
const w2 = solveWide(W.A2, 1.2); show('A2 x1.2', w2);
console.log('   title', w2.byKey.Title.toFixed(3), ' = 550 - 326.4 =', (550 - 326.4).toFixed(3));
show('A2 x1.2 addr 84', solveWide(W.A2, 1.2, { SiteAddress : 84 }));
show('A1 x1.2', solveWide(W.A1, 1.2));
[ 200, 223.6, 230, 250 ].forEach((t) => { const r = solveWide(W.A2, 1.2, { Title : t }); show('A2 x1.2 title ' + t, r); console.log('   fraction', ((r.byKey.Client / 36) - 1).toFixed(4)); });
const p = solveWide(W.A2P, 1.2); show('A2P x1.2', p);
console.log('   A2P fraction', ((p.byKey.Client / 36) - 1).toFixed(4), ' title', p.byKey.Title.toFixed(3), ' need', NEEDS.Title);
const pp = solve(W.A2P); show('A2P plain', pp);
[ 100, 120 ].forEach((t) => { const a = solveWide(W.A2P, 1.2, { Title : t }); const b = solve(W.A2P, { Title : t }); console.log('A2P title ' + t + ' wide == plain:', a.widths.every((mm, i) => Math.abs(mm - b.widths[i]) < 1e-6), ' fraction', ((a.byKey.Client / 36) - 1).toFixed(4)); });
const f1 = solveWide(W.A2, 1); const f1p = solve(W.A2);
console.log('factor 1 == plain:', f1.widths.every((mm, i) => Math.abs(mm - f1p.widths[i]) < 1e-6));
rmSync(SCRATCH, { recursive : true, force : true });
