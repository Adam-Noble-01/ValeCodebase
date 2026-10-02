// W2-37 scratch proof: ViewportLink 1.4.0's FactsPatch settles a viewport's facts through the type's own
// normalise before comparing. Replays its exact comparison against the LIVE drawing title module and config:
// a viewport named with two spaces round its dash must give an EMPTY patch once the element holds the
// single-spaced copy (no rebuild, no dirty sheet), where 1.0.0's raw compare gave a patch on every visit.
import { readFileSync, copyFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const LE = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor';
const F = '57__Feature__ScrapbookParametric', V = '20__System__Viewports';
const S = mkdtempSync(join(tmpdir(), 'w237-'));
writeFileSync(join(S, 'package.json'), '{ "type" : "module" }');
mkdirSync(join(S, F)); mkdirSync(join(S, V));
[[F, 'Na__LayoutEditor__ScrapbookParametric__DrawingTitle__.js'], [F, 'Na__LayoutEditor__ScrapbookParametric__ScaleBar__.js'], [V, 'Na__LayoutEditor__ViewportTitleText__.js']]
    .forEach(([d, f]) => copyFileSync(join(LE, d, f), join(S, d, f)));
const title = await import(pathToFileURL(join(S, F, 'Na__LayoutEditor__ScrapbookParametric__DrawingTitle__.js')).href);
const whole = JSON.parse(readFileSync(join(LE, F, 'Na__LayoutEditor__ScrapbookParametric__Config__.json'), 'utf8'));
const cfg = whole.LayoutEditor__ScrapbookParametric__DrawingTitle, bar = whole.LayoutEditor__ScrapbookParametric__ScaleBar;
const type = title.Na__LeParamTitle__CreateType(() => cfg, () => bar, () => ({}));

const wanted = { ViewKind : 'elevation', ViewPhase : '', ViewFacing : '', ViewLevel : '', ViewName : 'South East Elevation  -  House Front Fascade', ViewDrawing : 'Elevation 3' };
const held = type.normalise(Object.assign({ ScaleDenominator : 50, ShowScaleBar : true }, wanted));   // what a built element stores
const raw = {}; Object.keys(wanted).forEach((k) => { if (wanted[k] !== held[k]) raw[k] = wanted[k]; });          // 1.0.0's compare
const settled = type.normalise(Object.assign({}, held, wanted));
const patch = {}; Object.keys(wanted).forEach((k) => { if (settled[k] !== held[k]) patch[k] = wanted[k]; });  // 1.4.0's compare
console.log('stored ViewName   :', JSON.stringify(held.ViewName));
console.log('1.0.0 raw patch   :', JSON.stringify(raw));
console.log('1.4.0 settled patch:', JSON.stringify(patch));
const ok = Object.keys(raw).length === 1 && Object.keys(patch).length === 0;
console.log(ok ? 'PASS - the two-space name no longer patches (no rebuild, no dirty sheet)' : 'FAIL');
rmSync(S, { recursive : true, force : true });
process.exit(ok ? 0 : 1);
