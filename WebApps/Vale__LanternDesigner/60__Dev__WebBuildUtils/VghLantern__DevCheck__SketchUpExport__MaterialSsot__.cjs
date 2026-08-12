// Proves the lantern's materials survive the trip out to ValeVision3D.
//
// Na__TrueVision__GlbBuilder enriches a SketchUp material only when its name
// matches /^MAT\d{3}__/ AND appears in Na__DataLib__CoreIndex__Materials__.json.
// A material failing either test reaches the GLB with no alphaMode, no opacity
// and no double-sided flag - which is how a roof full of glass ends up rendering
// as opaque white beside conservatory glazing that renders correctly.
//
// This reproduces both tests against the real SSOT and the real export config.
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, '..');
const MOD = path.join(APP, '02__Src__AppModules');
const DATALIB = 'C:/Users/adamw/AppData/Roaming/SketchUp/SketchUp 2026/SketchUp/Plugins/Na__Common__DataLib__CoreSuEntityStandards';
const GLB = 'C:/Users/adamw/AppData/Roaming/SketchUp/SketchUp 2026/SketchUp/Plugins/Na__TrueVision__GlbBuilderUtility__Modules__/Na__TrueVision__GlbBuilder__EngineCore__MaterialLookupSystem__.rb';

const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));

const exportCfg = readJson(path.join(MOD, '80__System__SketchUpExport/Na__SketchUpExport__Config.json'));
const rows = exportCfg['VghLantern__SketchUpExport__Config__Materials'];

let failures = 0;
const check = (label, ok, detail) => {
    console.log(`${ok ? 'PASS ' : 'FAIL '} ${label}${detail ? '  ' + detail : ''}`);
    if (!ok) failures++;
};

if (!fs.existsSync(DATALIB)) {
    console.log('SKIP  Na__DataLib is not installed on this machine.');
    process.exit(0);
}

// -- the GLB builder's own regex, read from its source rather than retyped ----
const glbSource = fs.existsSync(GLB) ? fs.readFileSync(GLB, 'utf8') : '';
const regexLine = glbSource.match(/INDEXED_MATERIAL_REGEX\s*=\s*\/([^/]+)\//);
const INDEXED = regexLine ? new RegExp(regexLine[1]) : /^MAT\d{3}__/;
console.log(`GLB builder indexed-material test: ${INDEXED}${regexLine ? '  (read from its source)' : '  (fallback)'}\n`);

// -- the materials index, flattened the way the GLB builder flattens it ------
const matSsot = readJson(path.join(DATALIB, 'Na__DataLib__CoreIndex__Materials__.json'));
const root = matSsot['Na__DataLib__CoreIndex__Materials'];
const byId = {}, indexedNames = new Set();
Object.values(root).forEach(series => {
    Object.entries(series).forEach(([id, entry]) => {
        if (!entry || typeof entry.SketchUpName !== 'string') return;
        byId[id] = entry;
        if (!entry.IsDefault) indexedNames.add(entry.SketchUpName);
    });
});
console.log(`Materials index: ${Object.keys(byId).length} entries, ${indexedNames.size} indexed by SketchUpName\n`);

// -- resolve each row the way the importer's MaterialManager does -------------
const resolved = rows.map(row => {
    const id = row.SsotMaterialId;
    const std = id ? byId[id] : null;
    return {
        Key: row.Key,
        VghName: row.Name,
        SsotId: id,
        FinalName: std ? std.SketchUpName : row.Name,
        Swapped: !!std,
        Opacity: std && typeof std.Opacity === 'number' ? std.Opacity : row.Alpha,
        MissingId: !!id && !std
    };
});

console.log('ROLE               FINAL SKETCHUP MATERIAL NAME             ENRICHED BY GLB BUILDER');
resolved.forEach(r => {
    const enriched = INDEXED.test(r.FinalName) && indexedNames.has(r.FinalName);
    console.log(`  ${r.Key.padEnd(16)} ${r.FinalName.padEnd(40)} ${enriched ? 'yes' : 'no'}`);
});
console.log('');

// -- assertions --------------------------------------------------------------
check('no SsotMaterialId points at a missing index entry',
    resolved.every(r => !r.MissingId),
    resolved.filter(r => r.MissingId).map(r => r.SsotId).join(', ') || '(all ids resolve)');

const glazing = resolved.find(r => r.Key === 'glazing');
check('GLAZING is swapped onto the shared SSOT glass swatch',
    glazing.Swapped, `(${glazing.VghName} -> ${glazing.FinalName})`);

check('GLAZING passes the GLB builder indexed-material test',
    INDEXED.test(glazing.FinalName), `(${glazing.FinalName})`);

check('GLAZING is present in the materials index',
    indexedNames.has(glazing.FinalName));

const glassEntry = byId[glazing.SsotId];
check('GLAZING will be enriched as transparent glass',
    glassEntry.Transparent === true && glassEntry.Opacity < 1.0 && glassEntry.IsDoubleSided === true,
    `(opacity ${glassEntry.Opacity}, transparent ${glassEntry.Transparent}, doubleSided ${glassEntry.IsDoubleSided})`);

// The whole point: it must be the SAME swatch Element Assembly Studio Pro uses.
const espSource = fs.readFileSync('C:/Users/adamw/AppData/Roaming/SketchUp/SketchUp 2026/SketchUp/Plugins/Na__ArchTools__ElementAssemblyStudioPro__Modules__/02__Src__AppModules/02__AppData/Na__AssemblyStudio__AppData__MaterialManager__.rb', 'utf8');
const espGlass = espSource.match(/NA_SAFETY_GLASS_NAME\s*=\s*"([^"]+)"/);
check('GLAZING matches the glass Element Assembly Studio Pro builds with',
    !!espGlass && espGlass[1] === glazing.FinalName,
    `(ESP uses ${espGlass ? espGlass[1] : 'unknown'})`);

// Every swapped row must survive both tests, not just the glass.
const swappedBad = resolved.filter(r => r.Swapped &&
    !(INDEXED.test(r.FinalName) && indexedNames.has(r.FinalName)));
check('every swapped material passes both GLB builder tests',
    swappedBad.length === 0,
    swappedBad.map(r => r.FinalName).join(', ') || `(${resolved.filter(r => r.Swapped).length} swapped)`);

// -- report, not assert: what has no equivalent and will not be enriched -----
const unmapped = resolved.filter(r => !r.Swapped);
if (unmapped.length) {
    console.log('');
    console.log('NOT ENRICHED - no honest equivalent in the materials index:');
    unmapped.forEach(r => console.log(`  ${r.Key.padEnd(16)} imports as ${r.FinalName}`));
    console.log('  These render unenriched in ValeVision3D. Add MAT entries and fill in');
    console.log('  SsotMaterialId in Na__SketchUpExport__Config.json if they need to match.');
}

console.log('');
console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
