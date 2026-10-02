// W1-13 scratch harness: acceptance 3 - existing 1:20 / 1:50 / 1:100 viewports are unchanged with ScaleManager 1.2.1,
// and the site plan list is inert. ValeVision's OLD ScaleManager (the pre-port backup) and the NEW one (the live file,
// TrueVision 1.2.1) are each loaded against ValeVision's REAL scale setup (its ConfigState__SheetSetup unit over its
// AppConfig JSON, which W0-15 gave the site plan keys) and asked every question ValeVision's consumers ask:
//   SheetRecords:376 Coerce(stored), SheetRecords:784 SheetLabel(2D scales, paper label), SheetModel__Viewports:274
//   Coerce(patch), SheetChrome:379 FormatLabel(viewport scale), Panel__ViewportSettings:234 ListDenominators() +
//   FormatLabel(each), PdfExporter:274 SheetLabel(2D scales).
// Then every local project's sheets (Whitecardopedia/Projects/*/*/project.json, read only) go through those calls.
// Exit 0 = nothing a ValeVision consumer can see has changed.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const HERE     = dirname(fileURLToPath(import.meta.url));
const VV_ROOT  = resolve(HERE, '..', '..', '..', '..');
const SRC      = join(VV_ROOT, '02__Src__AppModules');
const LE       = '51__System__LayoutEditor/';
const PROJECTS = resolve(VV_ROOT, '..', 'Whitecardopedia', 'Projects');

const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;
let loadCount = 0;
async function load(path, stubs) {
    let src = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
    const names = [];
    let m;
    IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(src)) !== null) {
        const list = m[1].trim();
        if (list.charAt(0) !== '{') continue;
        list.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => names.push(s.split(/\s+as\s+/).pop()));
    }
    src = src.replace(IMPORT, '');
    if (/^\s*import\s/m.test(src)) throw new Error('an import survived in ' + path);
    const key = '__W113ScaleStubs' + (++loadCount);
    globalThis[key] = stubs || {};
    const head = names.map((n) => 'const ' + n + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + n + '") ? globalThis.' + key + '["' + n + '"] : function () { return undefined; };').join('\n');
    const tmp = join(tmpdir(), 'W1-13__scale_parity__' + loadCount + '__.mjs');
    writeFileSync(tmp, head + '\n' + src, 'utf8');
    return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
}

const CONFIG = JSON.parse(readFileSync(join(SRC, LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json'), 'utf8'));
const Val = (block, key, fallback) => { const b = CONFIG['LayoutEditor__' + block + '__Config']; const v = b ? b['LayoutEditor__' + block + '__' + key] : undefined; return (v === undefined || v === null) ? fallback : v; };
const Num = (block, key, fallback) => { const v = Val(block, key, undefined); return (typeof v === 'number' && Number.isFinite(v)) ? v : fallback; };
const SheetSetup = await load(join(SRC, LE + '03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js'), { Na__LeCfg__Val : Val, Na__LeCfg__Num : Num });
const cfg = { Na__LeCfg__GetScaleSetup : SheetSetup.Na__LeCfg__GetScaleSetup };
const OLD = await load(join(HERE, 'backup__Na__LayoutEditor__ScaleManager__.js.before'), cfg);
const NEW = await load(join(SRC, LE + '07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js'), cfg);

const setup = SheetSetup.Na__LeCfg__GetScaleSetup();
const ARCH  = setup.denominators;
const SITE  = setup.sitePlanDenominators;
console.log('ValeVision3D scale setup (its real config): architectural ' + JSON.stringify(ARCH) + ' default 1:' + setup.defaultDenominator
          + '; site plan ' + JSON.stringify(SITE) + ' default 1:' + setup.sitePlanDefaultDenominator);

let failures = 0, compared = 0;
const expectedDiffs = [];
const show = (v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : JSON.stringify(v));
function same(label, a, b, allowed) {
    compared++;
    if (JSON.stringify(a) === JSON.stringify(b) && !(Number.isNaN(a) !== Number.isNaN(b))) return;
    if (allowed) { expectedDiffs.push(label + ': old ' + show(a) + ' -> new ' + show(b)); return; }
    failures++;
    console.log('  FAIL  ' + label + ': old ' + show(a) + ' new ' + show(b));
}

const CORPUS = [ 20, 50, 100, '20', '50', '100', 50.0, '50.0', 200, 500, 1250, 2500, 5000, '500', 1, 10, 75, 0, -50, NaN, null, undefined, '', 'abc', '1:50', Infinity ];
const onSiteOnly = (d) => { const p = parseFloat(d); return Number.isFinite(p) && SITE.indexOf(p) !== -1 && ARCH.indexOf(p) === -1; };

// EVERY FUNCTION, EVERY INPUT -------------------------------------------------------------------------------------------
same('ListDenominators()', OLD.Na__LeScale__ListDenominators(), NEW.Na__LeScale__ListDenominators());
for (const d of CORPUS) {
    const tag = '(' + show(d) + ')';
    same('Coerce' + tag,                    OLD.Na__LeScale__Coerce(d),               NEW.Na__LeScale__Coerce(d));
    same('Next' + tag,                      OLD.Na__LeScale__Next(d),                 NEW.Na__LeScale__Next(d));
    same('PaperToModelMm(123.4, d)' + tag,  OLD.Na__LeScale__PaperToModelMm(123.4, d), NEW.Na__LeScale__PaperToModelMm(123.4, d));
    same('ModelToPaperMm(5000, d)' + tag,   OLD.Na__LeScale__ModelToPaperMm(5000, d),  NEW.Na__LeScale__ModelToPaperMm(5000, d));
    same('IsListed' + tag,                  OLD.Na__LeScale__IsListed(d),             NEW.Na__LeScale__IsListed(d), onSiteOnly(d));
    same('FormatLabel' + tag,               OLD.Na__LeScale__FormatLabel(d),          NEW.Na__LeScale__FormatLabel(d), onSiteOnly(d));
    same('FormatLabel(Coerce(d)) - the caption of a normalised viewport' + tag,
         OLD.Na__LeScale__FormatLabel(OLD.Na__LeScale__Coerce(d)), NEW.Na__LeScale__FormatLabel(NEW.Na__LeScale__Coerce(d)));
}
const PAPERS = [ undefined, null, '', 'A4', 'A3', 'A2', 'A1', 'ISO A2' ];
const SETS = [ [], [ 20 ], [ 50 ], [ 100 ], [ 50, 50 ], [ 100, 20 ], [ 20, 50, 100 ], [ 20, 50, 100, 50 ], [ '50', 50 ] ];
for (const list of SETS) for (const paper of PAPERS) {
    same('SheetLabel(' + JSON.stringify(list) + ', ' + show(paper) + ')', OLD.Na__LeScale__SheetLabel(list, paper), NEW.Na__LeScale__SheetLabel(list, paper));
}
for (const d of CORPUS) {
    const list = [ d, 50 ];
    const coerced = list.map((x) => NEW.Na__LeScale__Coerce(x));
    same('SheetLabel of normalised scales ' + JSON.stringify(list.map(show)), OLD.Na__LeScale__SheetLabel(list.map((x) => OLD.Na__LeScale__Coerce(x)), 'A3'), NEW.Na__LeScale__SheetLabel(coerced, 'A3'));
}
for (const d of NEW.Na__LeScale__ListDenominators()) same('Viewport panel button label 1:' + d, OLD.Na__LeScale__FormatLabel(d), NEW.Na__LeScale__FormatLabel(d));
same('site plan list (sitePlan = true) is TrueVision\'s and only asked for with the flag',
     NEW.Na__LeScale__ListDenominators(true), SITE);
same('Coerce(1250, true) keeps a site plan scale; Coerce(1250) still lands on the architectural default',
     [ NEW.Na__LeScale__Coerce(1250, true), NEW.Na__LeScale__Coerce(1250) ], [ 1250, setup.defaultDenominator ]);

// THE LOCAL PROJECTS (read only) --------------------------------------------------------------------------------------
let sheetsSeen = 0, viewportsSeen = 0;
const denominatorsSeen = {};
if (existsSync(PROJECTS)) {
    for (const year of readdirSync(PROJECTS)) {
        const yearDir = join(PROJECTS, year);
        let folders = [];
        try { folders = readdirSync(yearDir); } catch (error) { continue; }
        for (const folder of folders) {
            const file = join(yearDir, folder, 'project.json');
            if (!existsSync(file)) continue;
            let data;
            try { data = JSON.parse(readFileSync(file, 'utf8')); } catch (error) { continue; }
            const block = data && data.LayoutEditor__DrawingsData;
            const sheets = (block && Array.isArray(block.LayoutEditor__DrawingsData__Sheets)) ? block.LayoutEditor__DrawingsData__Sheets : [];
            for (const sheet of sheets) {
                sheetsSeen++;
                const vps = Array.isArray(sheet.Sheet__Viewports) ? sheet.Sheet__Viewports : [];
                const sizes = CONFIG.LayoutEditor__Sheet__Config.LayoutEditor__Sheet__PaperSizes;
                const paperLabel = (sizes[sheet.Sheet__PaperSize] || sizes[CONFIG.LayoutEditor__Sheet__Config.LayoutEditor__Sheet__DefaultPaperSize]).Label;
                for (const vp of vps) {
                    viewportsSeen++;
                    const d = vp.Viewport__ScaleDenominator;
                    denominatorsSeen[d] = (denominatorsSeen[d] || 0) + 1;
                    const where = year + '/' + folder + ' ' + sheet.Sheet__Id + ' ' + vp.Viewport__Id;
                    same(where + ' Coerce (SheetRecords:376)', OLD.Na__LeScale__Coerce(d), NEW.Na__LeScale__Coerce(d));
                    same(where + ' caption FormatLabel (SheetChrome:379)', OLD.Na__LeScale__FormatLabel(OLD.Na__LeScale__Coerce(d)), NEW.Na__LeScale__FormatLabel(NEW.Na__LeScale__Coerce(d)));
                }
                const scales2d = vps.filter((v) => v.Viewport__Kind === '2d').map((v) => v.Viewport__ScaleDenominator);
                const where = year + '/' + folder + ' ' + sheet.Sheet__Id;
                same(where + ' title block Scale (SheetRecords:784) ' + JSON.stringify(scales2d) + ' @ ' + paperLabel, OLD.Na__LeScale__SheetLabel(scales2d, paperLabel), NEW.Na__LeScale__SheetLabel(scales2d, paperLabel));
                same(where + ' PDF subject scale (PdfExporter:274)', OLD.Na__LeScale__SheetLabel(scales2d), NEW.Na__LeScale__SheetLabel(scales2d));
                console.log('  local ' + where + ': title block "' + NEW.Na__LeScale__SheetLabel(scales2d, paperLabel) + '", PDF "' + NEW.Na__LeScale__SheetLabel(scales2d) + '"');
            }
        }
    }
}
console.log('  local data: ' + sheetsSeen + ' sheet(s), ' + viewportsSeen + ' viewport(s), stored denominators ' + JSON.stringify(denominatorsSeen));

console.log('\nExpected differences (a raw value on the site plan list only - never reaches a ValeVision consumer, which coerces first):');
expectedDiffs.forEach((line) => console.log('  ' + line));
console.log('\nSUMMARY: ' + (compared - failures - expectedDiffs.length) + '/' + compared + ' identical, ' + expectedDiffs.length + ' expected (raw site-plan-only values), ' + failures + ' unexpected');
process.exit(failures ? 1 : 0);
