// W2-40 scratch (read-only): the distinct category group names across every project, with how the
// Drawing Planes bounds tokens classify each - to see that nothing a Vale author would call
// "the building" lands outside the building list, and nothing else lands inside it.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const VV     = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const WCP    = 'D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia';
const src    = readFileSync(join(VV, '02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js'), 'utf8');
const CONFIG = process.argv[2] || join(VV, '02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__AppConfig__.json');
const rx = (name) => { const m = src.match(new RegExp('const\\s+' + name + '\\s*=\\s*(\\/.+?\\/[gimsuy]*)\\s*;')); const l = m[1]; const i = l.lastIndexOf('/'); return new RegExp(l.slice(1, i), l.slice(i + 1)); };
const P = rx('Na__ModelUrl__ParseRegex'), S = rx('Na__ModelUrl__StoreyParseRegex'), L = rx('Na__ModelUrl__LegacyParseRegex'), O = rx('Na__ModelUrl__OrbitCubeRegex');
const LK = src.match(/const\s+Na__ModelUrl__LegacyCategoryKey\s*=\s*"([^"]+)"/)[1];
const cat = (f) => { let m = P.exec(f); if (m) return 'ValeVision__' + m[2]; m = S.exec(f); if (m) return 'Storey__' + m[1] + '__' + m[2]; return L.exec(f) ? LK : null; };
const has = (n, t) => t.some((x) => String(n).toLowerCase().indexOf(String(x).toLowerCase()) !== -1);
const B = JSON.parse(readFileSync(CONFIG, 'utf8')).DrawingPlanes__Bounds__Config;
const counts = new Map();
const root = join(WCP, 'Projects');
for (const y of readdirSync(root)) {
    if (!statSync(join(root, y)).isDirectory()) continue;
    for (const p of readdirSync(join(root, y))) {
        const f = join(root, y, p, 'project.json');
        if (!existsSync(f)) continue;
        let d; try { d = JSON.parse(readFileSync(f, 'utf8').replace(/^\uFEFF/, '')); } catch { continue; }
        const urls = Array.isArray(d.valeVision_ModelUrls) ? d.valeVision_ModelUrls.filter((u) => typeof u === 'string') : [];
        const seen = new Set();
        for (const u of urls) {
            const fn = u.split('/').pop().split('?')[0];
            if (O.test(fn)) continue;
            const c = cat(fn); if (c) seen.add(c);
        }
        seen.forEach((c) => counts.set(c, (counts.get(c) || 0) + 1));
    }
}
const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => {
    const k = has(c, B.DrawingPlanes__Bounds__IgnoreNameTokens) ? 'IGNORE' : has(c, B.DrawingPlanes__Bounds__GroundCategoryTokens) ? 'GROUND' : has(c, B.DrawingPlanes__Bounds__BuildingCategoryTokens) ? 'BUILDING' : 'other (fallback box only)';
    return { c, n, k };
});
rows.forEach((r) => console.log(String(r.n).padStart(3), r.k.padEnd(26), r.c));
