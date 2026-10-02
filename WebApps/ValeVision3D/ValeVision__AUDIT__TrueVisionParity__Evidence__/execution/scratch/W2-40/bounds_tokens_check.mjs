// W2-40 scratch (read-only): check the Drawing Planes bounds tokens against ValeVision's real model lists.
//
// For each project.json under Whitecardopedia/Projects/<year>/<project>/, take the model URL list,
// classify it EXACTLY as ValeVision's loader does (the regexes are read out of
// Na__ModelLoader__MultiModel.js, not retyped), which gives the names of the category groups the
// loader adds under the model root, then run TrueVision's Bounds token test
// (Na__PlaneBounds__HasToken: case-insensitive substring) with the tokens from the ported AppConfig.
// Writes nothing.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const VV     = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const WCP    = 'D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia';
const LOADER = join(VV, '02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js');
const CONFIG = process.argv[2] || join(VV, '02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__AppConfig__.json');

// THE LOADER'S OWN REGEXES, read from its source
const src = readFileSync(LOADER, 'utf8');
function readRegex(name) {
    const m = src.match(new RegExp('const\\s+' + name + '\\s*=\\s*(\\/.+?\\/[gimsuy]*)\\s*;'));
    if (!m) throw new Error('regex not found in loader: ' + name);
    const lit = m[1];
    const last = lit.lastIndexOf('/');
    return new RegExp(lit.slice(1, last), lit.slice(last + 1));
}
const ParseRegex   = readRegex('Na__ModelUrl__ParseRegex');
const StoreyRegex  = readRegex('Na__ModelUrl__StoreyParseRegex');
const LegacyRegex  = readRegex('Na__ModelUrl__LegacyParseRegex');
const OrbitRegex   = readRegex('Na__ModelUrl__OrbitCubeRegex');
const legacyKeyM   = src.match(/const\s+Na__ModelUrl__LegacyCategoryKey\s*=\s*"([^"]+)"/);
const LegacyKey    = legacyKeyM[1];

// Na__ModelLoader__ParseModelUrl, same order of tests (primary, storey, legacy)
function categoryOf(url) {
    const filename = url.split('/').pop().split('?')[0];
    const m = ParseRegex.exec(filename);
    if (m) return 'ValeVision__' + m[2];
    const s = StoreyRegex.exec(filename);
    if (s) return 'Storey__' + s[1] + '__' + s[2];
    const l = LegacyRegex.exec(filename);
    if (l) return LegacyKey;
    return null;
}

// Na__PlaneBounds__HasToken, verbatim logic
function hasToken(name, tokens) {
    const text = String(name || '').toLowerCase();
    for (let i = 0; i < tokens.length; i++) if (text.indexOf(String(tokens[i]).toLowerCase()) !== -1) return true;
    return false;
}

const cfg    = JSON.parse(readFileSync(CONFIG, 'utf8'));
const B      = cfg.DrawingPlanes__Bounds__Config;
const tokens = {
    building : B.DrawingPlanes__Bounds__BuildingCategoryTokens,
    ground   : B.DrawingPlanes__Bounds__GroundCategoryTokens,
    ignore   : B.DrawingPlanes__Bounds__IgnoreNameTokens
};
console.log('Config read  :', CONFIG);
console.log('Tokens       :', JSON.stringify(tokens));
console.log('Loader regexes read from', LOADER);
console.log('  primary', ParseRegex, '\n  storey ', StoreyRegex, '\n  legacy ', LegacyRegex, '\n  orbit  ', OrbitRegex, '\n  legacy key', LegacyKey);
console.log('');

function urlsOf(project) {
    const out = [];
    const walk = (n) => {
        if (Array.isArray(n)) n.forEach(walk);
        else if (n && typeof n === 'object') Object.values(n).forEach(walk);
        else if (typeof n === 'string' && /\.glb(\?|$)/i.test(n)) out.push(n);
    };
    walk(project.valeVision_ModelUrls || []);
    return out;
}

const rows = [];
const projectsRoot = join(WCP, 'Projects');
for (const year of readdirSync(projectsRoot)) {
    const yearDir = join(projectsRoot, year);
    if (!statSync(yearDir).isDirectory()) continue;
    for (const name of readdirSync(yearDir)) {
        const pj = join(yearDir, name, 'project.json');
        if (!existsSync(pj)) continue;
        let data;
        try { data = JSON.parse(readFileSync(pj, 'utf8').replace(/^\uFEFF/, '')); } catch (e) { rows.push({ id : year + '/' + name, error : 'unreadable' }); continue; }
        const urls   = urlsOf(data);
        const groups = new Set();
        let orbit = 0, unmatched = 0;
        for (const url of urls) {
            const filename = url.split('/').pop().split('?')[0];
            if (OrbitRegex.test(filename)) { orbit++; continue; }      // <-- Separated before classification; added to the scene, not the model root
            const c = categoryOf(url);
            if (c) groups.add(c); else unmatched++;
        }
        const g = [...groups];
        const ignore   = g.filter((n) => hasToken(n, tokens.ignore));
        const ground   = g.filter((n) => !hasToken(n, tokens.ignore) && hasToken(n, tokens.ground));
        const building = g.filter((n) => !hasToken(n, tokens.ignore) && !hasToken(n, tokens.ground) && hasToken(n, tokens.building));
        const other    = g.filter((n) => !ignore.includes(n) && !ground.includes(n) && !building.includes(n));
        const kind = g.some((n) => n === LegacyKey) ? (g.length === 1 ? 'legacy' : 'mixed+legacy')
                   : g.some((n) => n.startsWith('Storey__')) ? 'storey' : g.length ? 'current' : 'none';
        rows.push({ id : year + '/' + name, urls : urls.length, orbit, unmatched, kind, groups : g.length,
                    building, ground, ignore, other, usedFallback : building.length === 0 && g.length > 0 });
    }
}

const byKind = {};
rows.forEach((r) => { if (!r.error) byKind[r.kind] = (byKind[r.kind] || 0) + 1; });
console.log('Projects read:', rows.length, JSON.stringify(byKind));
console.log('');
const show = (r) => {
    if (r.error) { console.log(r.id, r.error); return; }
    console.log(r.id.padEnd(34), r.kind.padEnd(8), 'groups', String(r.groups).padStart(2),
                '| building', r.building.length, '| ground', r.ground.length, '| other', r.other.length,
                '| fallback', r.usedFallback ? 'YES' : 'no', r.unmatched ? '| unmatched ' + r.unmatched : '');
};
rows.forEach(show);

console.log('\nDETAIL - 2026/3047__Doous (D37):');
const d = rows.find((r) => r.id === '2026/3047__Doous');
if (d) console.log(JSON.stringify(d, null, 1));
const legacy = rows.filter((r) => r.kind === 'legacy');
if (legacy.length) { console.log('\nDETAIL - first legacy (older) export:', legacy[0].id); console.log(JSON.stringify(legacy[0], null, 1)); }
const storey = rows.filter((r) => r.kind === 'storey');
if (storey.length) { console.log('\nDETAIL - first storey export:', storey[0].id); console.log(JSON.stringify(storey[0], null, 1)); }
const fallbacks = rows.filter((r) => r.usedFallback);
console.log('\nProjects whose planes would size from the fallback (no building group):', fallbacks.length);
fallbacks.forEach((r) => console.log('  ', r.id, r.kind, 'groups:', [...r.other, ...r.ground].join(', ')));
const groundless = rows.filter((r) => !r.error && r.groups > 0 && r.ground.length === 0);
console.log('\nProjects with no ground group (vertical planes stand on the building foot + lift):', groundless.length);
