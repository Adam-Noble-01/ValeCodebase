// W3-18 scratch check: the VV Publish save step with the project folder as the store of record.
// Harness copied from TrueVision's Na__Test__SheetImages__.test.mjs (pin b2aa9151) "The Save Step" region:
// the module is loaded with its imports stripped and replaced by in-memory stubs; scenarios adapted to disk.
// Usage: node test_publish_disk.mjs <VV app root>
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT    = process.argv[2];
const SRC     = resolve(ROOT, '02__Src__AppModules');
const FEATURE = '51__System__LayoutEditor/54__Feature__SheetImages/';
let failures = 0, passes = 0;
function check(label, got, want) {
    const a = JSON.stringify(got), b = JSON.stringify(want);
    if (a === b) { passes++; console.log('  ok   ' + label); }
    else { failures++; console.log('  FAIL ' + label + '\n       got  ' + a + '\n       want ' + b); }
}
function leafUrl(relative, tag) {
    const tmp = join(tmpdir(), 'Na__W318__' + tag + '__.mjs');
    writeFileSync(tmp, readFileSync(resolve(SRC, relative), 'utf8'), 'utf8');
    return pathToFileURL(tmp).href;
}
const GEO_URL = leafUrl(FEATURE + 'Na__LayoutEditor__SheetImages__Geometry__.js', 'Geometry');
async function load(relative, stubs, tag) {
    let src = readFileSync(resolve(SRC, relative), 'utf8');
    src = src.replace(/^[ \t]*import\s+(?:\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm, '');
    if (/^\s*import\s/m.test(src)) { console.error('FAIL: an import survived'); process.exit(1); }
    const tmp = join(tmpdir(), 'Na__W318__' + tag + '__.mjs');
    writeFileSync(tmp, stubs + '\n' + src, 'utf8');
    return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
}

const world = { disk : new Map(), archive : new Map(), sheets : [], failUpload : false, uploads : 0, reconciles : 0, fetches : 0 };
globalThis.__naTestWorld = world;
const Pub = await load(FEATURE + 'Na__LayoutEditor__SheetImages__Publish__.js', `
    import { Na__LeImgGeo__FolderFor, Na__LeImgGeo__IsManagedName, Na__LeImgGeo__Rect, Na__LeImgGeo__StoreSize, Na__LeImgGeo__NeedsRecut } from '${GEO_URL}';
    const W = globalThis.__naTestWorld;
    const Na__LeImgSrc__Adopt   = (file) => 'blob:' + file;
    const Na__LeImgCfg__Storage = () => ({ printDpi : 300, printHeadroom : 1, maxEdgePx : 4096 });
    const Na__LeImgEnc__Recut   = async () => null;
    const Na__DrawData__RegisterSaveStep = (step) => { globalThis.__naTestStep = step; return true; };
    const Na__DrawData__GetSheetsArray   = () => W.sheets;
    const Na__DrawData__SHEETS_KEY       = 'LayoutEditor__DrawingsData__Sheets';
    const Na__LeRec__DocumentId = (sheet) => '3047_' + sheet.Sheet__Fields.Sheet__Fields__DrawingNumber;
    const Na__CfApi__SHEET_IMAGES_ARCHIVE = '00__Archive';
    const Na__LeImgStore__IsLocal = () => true;
    const Na__LeImgStore__Upload = async (folder, file, blob) => { if (W.failUpload) return { ok : false, skipped : false, error : 'HTTP 500' }; W.uploads++; W.disk.set(folder + '/' + file, blob); return { ok : true }; };
    const Na__LeImgStore__Reconcile = async (keep, options) => {
        W.reconciles++;
        const results = [], wanted = new Set();
        keep.forEach((item) => {
            const key = item.folder + '/' + item.file;
            wanted.add(key);
            if (W.disk.has(key)) { results.push({ folder : item.folder, file : item.file, state : 'present' }); return; }
            const found = Array.from(W.disk.keys()).find((k) => k.split('/')[1] === item.file) || Array.from(W.archive.keys()).find((k) => k.split('/')[1] === item.file);
            if (!found) { results.push({ folder : item.folder, file : item.file, state : 'missing' }); return; }
            W.disk.set(key, W.disk.get(found) || W.archive.get(found));
            results.push({ folder : item.folder, file : item.file, state : 'copied', source : found.split('/')[0] });
        });
        const archived = [];
        if (options && options.archive) {
            Array.from(W.disk.keys()).forEach((key) => {
                if (wanted.has(key) || !Na__LeImgGeo__IsManagedName(key.split('/')[1])) return;
                W.archive.set(key, W.disk.get(key)); W.disk.delete(key); archived.push(key);
            });
        }
        return { ok : true, skipped : false, error : null, results, archived };
    };
    const Na__LeImgSrc__Blob  = async (folder, file) => { W.fetches++; return W.disk.get(folder + '/' + file) || null; };
    const Na__LeImgSrc__Retry = () => false;
    const Na__LeImgCfg__Label = (key, fallback, tokens) => { let t = fallback; Object.keys(tokens || {}).forEach((n) => { t = t.split('{' + n + '}').join(String(tokens[n])); }); return t; };
`, 'Publish');

check('exports are TrueVision\'s five', Object.keys(Pub).sort(), [ 'Na__LeImgPub__FolderOf', 'Na__LeImgPub__HasSource', 'Na__LeImgPub__Hold', 'Na__LeImgPub__Register', 'Na__LeImgPub__Reset' ]);
check('register', Pub.Na__LeImgPub__Register(), true);
const step = globalThis.__naTestStep;
const FILE_A = 'FrontCgi__aaaaaaaaaa.webp', FILE_B = 'RearCgi__bbbbbbbbbb.webp', FILE_C = 'Side__cccccccccc.webp';
const sheetOf = (id, number, images) => ({ Sheet__Id : id, Sheet__Fields : { Sheet__Fields__DrawingNumber : number },
    Sheet__Shapes : images.map((img, i) => ({ Shape__Id : 'Shape_00' + (i + 1), Shape__Image : { Image__File : img.file, Image__Folder : img.folder } })) });
async function save(writeOk) {
    const notes = [];
    const ctx = { report : null, state : {}, block : null, local : null, note : (m, e) => notes.push({ m, e : !!e }) };
    await step.before(ctx);
    ctx.block = { LayoutEditor__DrawingsData__Sheets : JSON.parse(JSON.stringify(world.sheets)) };
    await step.payload(ctx);
    const written = ctx.block.LayoutEditor__DrawingsData__Sheets.flatMap((s) => s.Sheet__Shapes.map((sh) => sh.Shape__Image.Image__Folder + '/' + sh.Shape__Image.Image__File));
    if (writeOk !== false) { ctx.local = { ok : true }; await step.after(ctx); }
    return { notes, written, ctx };
}
const live = () => world.sheets.flatMap((s) => s.Sheet__Shapes.map((sh) => sh.Shape__Image.Image__Folder + '/' + sh.Shape__Image.Image__File));
const keys = (map) => Array.from(map.keys()).sort();

// 1. A picture dropped this session on D01, held in memory only.
Pub.Na__LeImgPub__Hold(FILE_A, new Blob([ 'A' ]));
world.sheets = [ sheetOf('Sheet_005', 'D01', [ { file : FILE_A, folder : '3047_D01' } ]) ];
let out = await save();
check('first save: the held picture is uploaded into its drawing\'s folder', [ keys(world.disk), world.uploads ], [ [ '3047_D01/' + FILE_A ], 1 ]);
check('first save: it is confirmed and the drawings point at it', [ Array.from(out.ctx.state.sheetImages.confirmed), out.written ], [ [ '3047_D01/' + FILE_A ], [ '3047_D01/' + FILE_A ] ]);
check('first save: no error, no R2 wording in the toast', out.notes.filter((n) => n.e || /R2/.test(n.m)), []);

// 2. A renumber: D01 becomes D03.
world.sheets[0].Sheet__Fields.Sheet__Fields__DrawingNumber = 'D03';
out = await save();
check('renumber: the drawings written point at the new folder', out.written, [ '3047_D03/' + FILE_A ]);
check('renumber: the disk has it in the new folder, the old copy archived', [ keys(world.disk), keys(world.archive) ], [ [ '3047_D03/' + FILE_A ], [ '3047_D01/' + FILE_A ] ]);
check('renumber: the live record follows', live(), [ '3047_D03/' + FILE_A ]);
check('renumber: the toast says it was refiled', out.notes.map((n) => n.m), [ '1 picture(s) filed under their new document id.' ]);

// 3. An upload the project folder refuses: the pointer stays where the picture is, and the toast says so.
Pub.Na__LeImgPub__Hold(FILE_C, new Blob([ 'C' ]));
world.failUpload = true;
world.sheets.push(sheetOf('Sheet_006', 'D04', [ { file : FILE_C, folder : '' } ]));
out = await save();
check('a refused upload is not confirmed', out.ctx.state.sheetImages.confirmed.has('3047_D04/' + FILE_C), false);
check('and the toast names the project folder as an error', out.notes.filter((n) => n.e).map((n) => n.m), [ 'Pictures were not filed in the project folder (HTTP 500).' ]);
world.failUpload = false;
out = await save();
check('the next save finishes the job', [ world.disk.has('3047_D04/' + FILE_C), out.written.includes('3047_D04/' + FILE_C) ], [ true, true ]);

// 4. A picture found nowhere is named.
world.sheets.push(sheetOf('Sheet_007', 'D05', [ { file : FILE_B, folder : '3047_D99' } ]));
out = await save();
check('a picture found nowhere is named in the toast', out.notes.filter((n) => n.e).map((n) => n.m), [ '1 picture(s) could not be found anywhere: ' + FILE_B + '.' ]);
check('and its pointer is left as it was', out.written.includes('3047_D99/' + FILE_B), true);
world.sheets.pop();
await save();

// 5. A save whose drawings were never written changes no live record.
world.sheets[1].Sheet__Fields.Sheet__Fields__DrawingNumber = 'D11';
const before = live();
await save(false);
check('a failed drawings write leaves every live record as it was', live(), before);
await save();

// 6. Everything deleted: archived, never deleted; then a picture-less save asks nothing of anyone.
world.sheets.forEach((s) => { s.Sheet__Shapes = []; });
await save();
check('every picture deleted: the project folder holds none outside the archive', world.disk.size, 0);
check('and the archive holds them', world.archive.has('3047_D03/' + FILE_A) && world.archive.has('3047_D11/' + FILE_C), true);
const r0 = world.reconciles;
await save();
check('a project with no pictures anywhere: the before phase asks nothing, the after phase tidies once (as TrueVision)', [ world.reconciles - r0, world.disk.size ], [ 1, 0 ]);

// 7. An undo brings one back from the archive.
world.sheets[0].Sheet__Shapes.push({ Shape__Id : 'Shape_010', Shape__Image : { Image__File : FILE_A, Image__Folder : '3047_D03' } });
out = await save();
check('an undone delete comes back out of the archive', [ world.disk.has('3047_D03/' + FILE_A), out.written ], [ true, [ '3047_D03/' + FILE_A ] ]);

// 8. Reset forgets what is known: a fresh project's first picture-less save still tidies.
Pub.Na__LeImgPub__Reset();
world.sheets.forEach((s) => { s.Sheet__Shapes = []; });
const r1 = world.reconciles;
await save();
check('after Reset the first picture-less save still tidies the project folder', [ world.reconciles - r1, world.disk.size ], [ 1, 0 ]);

console.log('\n  ' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
