// W1-26 scratch: run this app's LIVE Cells 1.2.0 (scratch copy as .mjs) against the live config rows and the
// Open Sans fixture measured by measure_opensans.mjs, and print every number the re-measured test's checks
// rest on. Read-only. Usage: node fixture_calc.mjs
import { copyFileSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const LE = 'D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D\\02__Src__AppModules\\51__System__LayoutEditor';
const SCRATCH = mkdtempSync(join(tmpdir(), 'w1-26-calc-'));
copyFileSync(join(LE, '10__Core__SheetSurface', 'Na__LayoutEditor__TitleBlock__Cells__.js'), join(SCRATCH, 'Cells.mjs'));
const cells = await import(pathToFileURL(join(SCRATCH, 'Cells.mjs')).href);
const config = JSON.parse(readFileSync(join(LE, '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json'), 'utf8'))['LayoutEditor__TitleBlock__Config'];
const ROWS = config['LayoutEditor__TitleBlock__Rows'];

const NEEDS  = { Client : 13.05, SiteAddress : 62.15, Title : 91.61, DocumentId : 14.37, Revision : 5.78, Scale : 17.02, Date : 15.28, DrawnBy : 23.55, Status : 18.62 };
const FLOORS = { Client : 8.36, SiteAddress : 13.88, Title : 15.25, DocumentId : 14.37, Revision : 5.78, Scale : 7.67, Date : 6.94, DrawnBy : 11.39, Status : 8.80 };
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

console.log('rows', ROWS.map((r) => r.Key + ':' + r.WidthMm + (r.Flex ? 'F' : '')).join(' '), ' fixed sum', fixed.reduce((a, r) => a + r.WidthMm, 0));
const STRIP = { A1 : 797, A2 : 550, A3 : 376, A4 : 253, A4P : 166 };
const a2 = solve(STRIP.A2); show('A2', a2);
[ 17.50, 24.52, 16 ].forEach((t) => { const s = solve(STRIP.A2, { Title : t }); console.log('   short title ' + t + ' identical:', a2.widths.every((mm, i) => Math.abs(mm - s.widths[i]) < 1e-6)); });
const a3 = solve(STRIP.A3); show('A3', a3);
console.log('   A3 title', a3.byKey.Title.toFixed(3), '>= need', NEEDS.Title, a3.byKey.Title >= NEEDS.Title);
[ 120, 125 ].forEach((t) => {
    const lt = solve(STRIP.A3, { Title : t }); show('A3 title ' + t, lt);
    console.log('   site address gave', (70 - lt.byKey.SiteAddress).toFixed(3), ' rev gave', (28 - lt.byKey.Revision).toFixed(3), ' spare: site', (70 - NEEDS.SiteAddress).toFixed(2), 'rev', (28 - NEEDS.Revision).toFixed(2));
});
show('A2 address 108', solve(STRIP.A2, { SiteAddress : 108 }));
show('A2 3 scales 32.47', solve(STRIP.A2, { Scale : 32.47 }));
const a4 = solve(STRIP.A4); show('A4', a4);
console.log('   A4 no cell wider than configured (title aside):', ROWS.every((r) => a4.byKey[r.Key] <= r.WidthMm + 1e-6 || r.Key === 'Title'));
[ 190, 192 ].forEach((w) => { const n = solve(w); show('narrow ' + w, n); console.log('   title < 60 and >= floor', n.byKey.Title < 60 && n.byKey.Title >= FLOORS.Title - 1e-6, n.byKey.Title.toFixed(3)); });
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
[ 100, 120 ].forEach((t) => { const a = solveWide(W.A2P, 1.2, { Title : t }); const b = solve(W.A2P, { Title : t }); console.log('A2P title ' + t + ' wide == plain:', a.widths.every((mm, i) => Math.abs(mm - b.widths[i]) < 1e-6), ' fraction', ((a.byKey.Client / 36) - 1).toFixed(4)); });
const f1 = solveWide(W.A2, 1); const f1p = solve(W.A2);
console.log('factor 1 == plain:', f1.widths.every((mm, i) => Math.abs(mm - f1p.widths[i]) < 1e-6));
const nf = cells.Na__LeTitleCells__Solve(190, ROWS.map((r) => cells.Na__LeTitleCells__Cell(r, NEEDS[r.Key])));
console.log('no floor 190: total', nf.reduce((a, b) => a + b, 0).toFixed(6), ' only title cut', ROWS.every((r, i) => r.Key === 'Title' || nf[i] + 1e-6 >= NEEDS[r.Key]));
rmSync(SCRATCH, { recursive : true, force : true });
