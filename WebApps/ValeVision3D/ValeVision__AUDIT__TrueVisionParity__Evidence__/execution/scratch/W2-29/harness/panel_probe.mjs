// Child process: load ONE Patterns panel (TrueVision's at the pin or ValeVision's live file) against the
// recording stubs and the real ValeVision hatch module, register it, let the library load, print JSON.
// env: W229_PANEL (file URL of the panel), W229_MODE ('library' | 'missing')
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { installDom } from './fake_dom.mjs';

const MODE = process.env.W229_MODE || 'library';
const { head } = installDom();

const requests = [];
globalThis.fetch = async (url, opts) => {
    requests.push({ url : String(url).replace(/^.*?52__LayoutEditor__HatchPatternLibrary/, '52__LayoutEditor__HatchPatternLibrary'), cache : opts && opts.cache });
    if (MODE === 'missing') return { ok : false, status : 404, json : async () => { throw new Error('404'); } };
    try {
        const text = await readFile(fileURLToPath(url), 'utf8');
        return { ok : true, status : 200, json : async () => JSON.parse(text) };
    } catch (e) { return { ok : false, status : 404, json : async () => { throw e; } }; }
};

const consoleSeen = { error : [], warn : [], log : [] };
for (const k of [ 'error', 'warn', 'log' ]) console[k] = (...a) => consoleSeen[k].push(a.join(' '));
const rejections = [];
process.on('unhandledRejection', (r) => rejections.push(String(r)));

const host = await import('./stub_panelhost.mjs');
let thrown = null;
let exportsSeen = [];
try {
    const panel = await import(process.env.W229_PANEL);
    exportsSeen = Object.keys(panel).sort();
    panel.Na__LePanelPatterns__Register();
} catch (e) { thrown = String(e && e.stack || e); }
const logAtRegister = host.LOG.map((r) => r.join('|'));
const visibleAtRegister = host.SECTIONS.has('patterns') ? host.SECTIONS.get('patterns').visible : null;

const hatch = await import(process.env.W229_VV_HATCH);
await hatch.Na__LeHatch__Ready();
await new Promise((r) => setTimeout(r, 20));

const s = host.SECTIONS.get('patterns');
const q = (block) => s ? s.body.querySelector(`[data-na-block="${block}"]`) : null;
const libraryHtml = q('patterns-library') ? q('patterns-library').innerHTML : null;
const packs = [];
if (libraryHtml) {
    const re = /<div class="na-le-hatch-pack">\s*<h4 class="na-le-hatch-pack__title">([^<]*)<\/h4>\s*<div class="na-le-hatch-pack__tiles">([\s\S]*?)<\/div>\s*<\/div>/g;
    let m;
    while ((m = re.exec(libraryHtml))) {
        const tiles = [];
        const tr = /data-na-role="([^"]+)"[\s\S]*?<span class="na-le-hatch-tile__art">([\s\S]*?)<\/span>\s*<span class="na-le-hatch-tile__name">([^<]*)<\/span>/g;
        let t;
        while ((t = tr.exec(m[2]))) {
            const inks = Array.from(new Set((t[2].match(/#[0-9a-fA-F]{6}\b/g) || []).map((x) => x.toUpperCase()))).sort();
            tiles.push({ key : t[1], name : t[3], inks, svgSha : t[2].length });
        }
        packs.push({ title : m[1], tiles });
    }
}
const hiddenBlocks = [ 'patterns-layer-row', 'patterns-pattern-row', 'patterns-filled-row', 'patterns-scale-row', 'patterns-rotation-row',
    'patterns-line-pt-row', 'patterns-line-colour-row', 'patterns-standard-row', 'patterns-status' ].map((b) => [ b, q(b) ? q(b).hidden : 'absent' ]);

const links = head.children.filter((c) => c.tagName === 'LINK').map((c) => ({ rel : c.rel, href : c.href }));
process.stdout.write(JSON.stringify({
    mode : MODE, thrown, exports : exportsSeen,
    logAtRegister, visibleAtRegister,
    logAfterReady : host.LOG.map((r) => r.join('|')),
    visibleAfterReady : s ? s.visible : null,
    controls : host.CONTROLS,
    links,
    status : q('patterns-status') ? { text : q('patterns-status').textContent, hidden : q('patterns-status').hidden } : null,
    intro : s && s.body.children[0] ? s.body.children[0].textContent : null,
    hiddenBlocks,
    libraryHtml,
    packs,
    requests,
    console : consoleSeen,
    rejections
}));
