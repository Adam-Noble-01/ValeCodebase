// W2-29 acceptance harness. Run from anywhere: node acceptance_check.mjs
// Needs scratch/W2-29/tv/ (TrueVision's panel, stylesheet, mode controller and LE AppConfig at b2aa9151).
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TVDIR = path.join(HERE, '..', 'tv');
const VV = process.env.W229_VV_ROOT || 'D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D';
const LE = path.join(VV, '02__Src__AppModules', '51__System__LayoutEditor');
const VV_PANEL = path.join(LE, '36__System__HatchPatternTools', 'Na__LayoutEditor__Panel__Patterns__.js');
const VV_CSS = path.join(LE, '36__System__HatchPatternTools', 'Na__LayoutEditor__Styles__Patterns__.css');
const VV_HATCH = path.join(LE, '36__System__HatchPatternTools', 'Na__LayoutEditor__HatchPatterns__.js');
const VV_MODE = path.join(LE, '05__Core__ModeController', 'Na__LayoutEditor__ModeController__.js');
const VV_CFG = path.join(LE, '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json');
const VV_LOADER = path.join(LE, '01__Core__Loader', 'Na__LayoutEditor__Loader__.js');

let pass = 0, fail = 0;
const ok = (cond, label, detail) => { if (cond) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label + (detail ? '\n        ' + detail : '')); } };

function probe(panelPath, mode) {
    const r = spawnSync(process.execPath, [ '--no-warnings', '--import', pathToFileURL(path.join(HERE, 'register.mjs')).href, path.join(HERE, 'panel_probe.mjs') ], {
        env : { ...process.env, W229_PANEL : pathToFileURL(panelPath).href, W229_MODE : mode, W229_VV_HATCH : pathToFileURL(VV_HATCH).href },
        encoding : 'utf8'
    });
    if (r.status !== 0) throw new Error('probe failed: ' + r.stderr);
    return JSON.parse(r.stdout);
}
const strip = (o) => { const c = JSON.parse(JSON.stringify(o)); c.links = c.links.map((l) => ({ rel : l.rel, file : l.href.split('/').pop() })); return c; };

console.log('W2-29 acceptance - Patterns panel and the hatch ready chain');

// ---------------------------------------------------------------- 1. the panel, live library
const vv = probe(VV_PANEL, 'library');
const tv = probe(path.join(TVDIR, 'Na__LayoutEditor__Panel__Patterns__.js'), 'library');
ok(vv.thrown === null, 'VV panel imports and registers without throwing', vv.thrown);
ok(JSON.stringify(vv.exports) === JSON.stringify([ 'Na__LePanelPatterns__ID', 'Na__LePanelPatterns__Register' ]), 'exports are TrueVision\'s two', JSON.stringify(vv.exports));
ok(vv.logAtRegister[0] === 'register|right|patterns||Patterns', 'registered in the right column, id patterns, no spec.tab (lands on the first tab, Properties)', vv.logAtRegister[0]);
ok(vv.logAtRegister.includes('visible|patterns|false') && vv.visibleAtRegister === false, 'hidden at registration, before the library loads', JSON.stringify(vv.logAtRegister));
ok(vv.visibleAfterReady === true && vv.logAfterReady.indexOf('visible|patterns|true') > vv.logAfterReady.indexOf('visible|patterns|false'), 'shown once Na__LeHatch__Ready resolves, then refreshed', JSON.stringify(vv.logAfterReady));
ok(vv.links.length === 1 && vv.links[0].rel === 'stylesheet' && vv.links[0].href === pathToFileURL(VV_CSS).href, 'links its own stylesheet from its own folder', JSON.stringify(vv.links));
ok(existsSync(VV_CSS), 'the linked stylesheet exists (OC-07)');
ok(vv.packs.length === 2 && vv.packs[0].title === 'Construction Materials' && vv.packs[0].tiles.length === 14, 'library: Construction Materials first with 14 tiles, then a second pack', JSON.stringify(vv.packs.map((p) => [ p.title, p.tiles.length ])));
ok(vv.packs[0] && vv.packs[0].tiles[0].key === 'ConstructionHatch__Brickwork', 'first tile is Brickwork (the default a ticked Hatch picks)', vv.packs[0] && vv.packs[0].tiles[0].key);
const constructionInks = vv.packs[0] ? Array.from(new Set(vv.packs[0].tiles.flatMap((t) => t.inks))) : [];
ok(constructionInks.length === 1 && constructionInks[0] === '#333333', 'every Construction tile is drawn in #333333 (Pack__SwatchInk), none in the woodland green', JSON.stringify(constructionInks));
ok(vv.packs[1] && vv.packs[1].title === 'Site Plan Hatches' && vv.packs[1].tiles.length === 5, 'Site Plan pack second, 5 tiles (DR-08 (B) / DR-19 default: both packs)', vv.packs[1] && JSON.stringify([ vv.packs[1].title, vv.packs[1].tiles.length ]));
ok(vv.hiddenBlocks.slice(0, 8).every(([ , h ]) => h === true), 'no site plan viewport: every layer row hidden (site plans dormant)', JSON.stringify(vv.hiddenBlocks));
ok(vv.status && vv.status.hidden === false && /Select a site plan viewport/.test(vv.status.text), 'status line is TrueVision\'s no-viewport note', JSON.stringify(vv.status));
ok(vv.console.error.length === 0 && vv.rejections.length === 0, 'no console error, no unhandled rejection', JSON.stringify([ vv.console.error, vv.rejections ]));
ok(vv.requests.length === 22 && vv.requests.every((r) => r.cache === 'no-store'), 'the library loads in 22 no-store requests (index, 2 pack indexes, 19 patterns)', String(vv.requests.length));
ok(JSON.stringify(strip(vv)) === JSON.stringify(strip(tv)), 'PARITY: TrueVision\'s panel at b2aa9151 behaves identically (registration, visibility, controls, DOM, tiles, requests, console)',
   'differences in: ' + Object.keys(strip(vv)).filter((k) => JSON.stringify(strip(vv)[k]) !== JSON.stringify(strip(tv)[k])).join(', '));

// ---------------------------------------------------------------- 2. the panel, missing library
const vm = probe(VV_PANEL, 'missing');
const tm = probe(path.join(TVDIR, 'Na__LayoutEditor__Panel__Patterns__.js'), 'missing');
ok(vm.thrown === null && vm.console.error.length === 0 && vm.rejections.length === 0, 'missing library: no throw, no console error, no rejection', JSON.stringify([ vm.thrown, vm.console.error, vm.rejections ]));
ok(vm.packs.length === 0 && /The pattern library is empty\./.test(vm.libraryHtml || ''), 'missing library: no tiles; the section says "The pattern library is empty."', vm.libraryHtml);
ok(vm.console.warn.some((w) => /^\[ValeVision3D\] Hatch pattern library not found/.test(w)), 'missing library: one [ValeVision3D] warning from the hatch module', JSON.stringify(vm.console.warn));
ok(vm.visibleAtRegister === false, 'missing library: hidden while the library is being looked for', String(vm.visibleAtRegister));
ok(JSON.stringify(strip(vm)) === JSON.stringify(strip(tm)), 'PARITY (missing library): TrueVision\'s panel behaves identically');
console.log('        note: once Ready settles, both apps SHOW the section with the empty-library note (visibleAfterReady = ' + vm.visibleAfterReady + ').');

// ---------------------------------------------------------------- 3. the files: seams only
const tvPanel = readFileSync(path.join(TVDIR, 'Na__LayoutEditor__Panel__Patterns__.js'), 'utf8');
const vvPanel = readFileSync(VV_PANEL, 'utf8');
const unnote = (t) => t.replace('VALEVISION3D - ', 'TRUEVISION3D - ').replace(/\/\/ PORT NOTE:\n[\s\S]*?\/\/ -{77}\n\/\/\n/, '');
ok(unnote(vvPanel) === tvPanel, 'panel = TrueVision\'s bytes except the banner and the PORT NOTE block');
ok(!/\r/.test(vvPanel), 'panel is LF, as git show returns it');
const tvCss = readFileSync(path.join(TVDIR, 'Na__LayoutEditor__Styles__Patterns__.css'), 'utf8');
const vvCss = readFileSync(VV_CSS, 'utf8');
ok(vvCss.replace('VALEVISION3D - ', 'TRUEVISION3D - ').replace(/\n   PORT NOTE:\n[\s\S]*?   - Back-port     : none\.\n/, '') === tvCss, 'stylesheet = TrueVision\'s bytes except the banner and the PORT NOTE');

// ---------------------------------------------------------------- 4. the mode controller hunks
const mode = readFileSync(VV_MODE, 'utf8').replace(/\r\n/g, '\n');
const tvMode = readFileSync(path.join(TVDIR, 'ModeController_TV.js'), 'utf8');
const imp = (src, name) => (src.match(new RegExp('^    import \\{ ' + name + ' \\} from \'([^\']+)\';', 'm')) || [])[1];
ok(imp(mode, 'Na__LeHatch__Ready') === imp(tvMode, 'Na__LeHatch__Ready'), 'Na__LeHatch__Ready imported from TrueVision\'s path', imp(mode, 'Na__LeHatch__Ready'));
ok(imp(mode, 'Na__LePanelPatterns__Register') === imp(tvMode, 'Na__LePanelPatterns__Register'), 'Na__LePanelPatterns__Register imported from TrueVision\'s path');
const chain = (src) => (src.match(/Na__LeMode__ReadyOnce = Promise\.all\(\[([^\]]+)\]\)/) || [])[1].split(',').map((s) => s.trim().replace(/\(\)$/, ''));
const vvChain = chain(mode), tvChain = chain(tvMode);
ok(JSON.stringify(vvChain) === JSON.stringify(tvChain.filter((n) => vvChain.includes(n))), 'ready chain is TrueVision\'s order over the names this app has', JSON.stringify([ vvChain, tvChain ]));
ok(vvChain.indexOf('Na__LeHatch__Ready') === vvChain.indexOf('Na__LeDash__Ready') + 1, 'Na__LeHatch__Ready sits straight after Na__LeDash__Ready', JSON.stringify(vvChain));
ok(/None of the eight rejects/.test(mode), 'the ready chain\'s own count comment says eight');
const regs = (src) => Array.from(src.matchAll(/^        (Na__LePanel[A-Za-z]+__Register[A-Za-z]*)\(\);/gm)).map((m) => m[1]);
const vvRegs = regs(mode), tvRegs = regs(tvMode);
const scrapIdx = vvRegs.indexOf('Na__LePanelScrapCustom__Register');
ok(vvRegs[scrapIdx + 1] === 'Na__LePanelPatterns__Register' && vvRegs.indexOf('Na__LePanelScrap__Register') < scrapIdx && vvRegs.indexOf('Na__LePanelParam__RegisterLibrary') < scrapIdx, 'Patterns registered straight after the three scrapbook libraries', JSON.stringify(vvRegs));
ok(JSON.stringify(vvRegs) === JSON.stringify(tvRegs.filter((n) => vvRegs.includes(n))), 'right column registration order is TrueVision\'s over the panels this app has', JSON.stringify([ vvRegs, tvRegs ]));
ok(/^        Na__LePanelPatterns__Register\(\); {39}\/\/ <-- Patterns: the hatch library and each site plan layer's hatch$/m.test(mode), 'registration line and comment are TrueVision\'s');
const loader = readFileSync(VV_LOADER, 'utf8');
ok(/await editor\.mode\.Na__LeMode__Initialize\(/.test(loader) && /return Na__LeMode__ReadyOnce;/.test(mode), 'the loader awaits Initialize, which returns the ready chain, before any sheet is entered (first paint waits on the hatch library)');
ok(/Version 1\.18\.6 \(the Patterns panel and the hatch ready chain, \{\{VVREL:W2-29\}\}\)/.test(mode), 'mode controller log entry 1.18.6 carries {{VVREL:W2-29}}');
ok(!/floor areas, patterns, site plans/.test(mode), 'PORT NOTE no longer lists patterns as not yet taken');

// ---------------------------------------------------------------- 5. the config
const cfg = JSON.parse(readFileSync(VV_CFG, 'utf8'));
const tvCfg = JSON.parse(readFileSync(path.join(TVDIR, 'AppConfig_TV.json'), 'utf8'));
const find = (o, key) => { for (const [ k, v ] of Object.entries(o)) { if (k === key) return v; if (v && typeof v === 'object' && !Array.isArray(v)) { const f = find(v, key); if (f !== undefined) return f; } } return undefined; };
const acc = find(cfg, 'LayoutEditor__Panels__AccordionSections'), tvAcc = find(tvCfg, 'LayoutEditor__Panels__AccordionSections');
ok(Array.isArray(acc) && acc.includes('patterns'), '"patterns" is in LayoutEditor__Panels__AccordionSections', JSON.stringify(acc));
ok(JSON.stringify(acc) === JSON.stringify(tvAcc.filter((n) => acc.includes(n))), 'AccordionSections keeps TrueVision\'s relative order', JSON.stringify([ acc, tvAcc ]));
ok(find(cfg, 'LayoutEditor__Sheet__SitePlanDrawingsEnabled') === false, 'site plan drawings stay switched off (DR-08 (B))');

console.log(`\nRESULT: ${fail ? 'FAIL' : 'PASS'} (${pass} pass, ${fail} fail)`);
process.exit(fail ? 1 : 0);
