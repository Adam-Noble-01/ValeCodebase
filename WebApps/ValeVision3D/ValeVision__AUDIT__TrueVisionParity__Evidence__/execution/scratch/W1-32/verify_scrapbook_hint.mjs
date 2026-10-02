// W1-32 scratch (not shipped): Panel__Scrapbook 1.2.1's tab hover text, with its imports stubbed.
// usage: node verify_scrapbook_hint.mjs <Panel__Scrapbook__.js>
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const FILE = resolve(process.argv[2]);
let src = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const names = [];
src = src.replace(/^[ \t]*import\s*\{([\s\S]*?)\}\s*from\s*'[^']+';[^\n]*$/gm, (whole, list) => { list.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => names.push(n)); return ''; });
const stubs = names.map((n) => /__[A-Z][A-Z0-9_]*$/.test(n) ? 'const ' + n + ' = ' + JSON.stringify(n === 'Na__LeScrap__TAB_ID' ? 'scrapbook' : n) + ';' : 'const ' + n + ' = (...a) => globalThis.__S.call(' + JSON.stringify(n) + ', a);');
const file = join(mkdtempSync(join(tmpdir(), 'w1-32-scrap-')), 'Panel.mjs');
writeFileSync(file, stubs.join('\n') + '\n' + src, 'utf8');

const specs = [];
let release;
const ready = new Promise((done) => { release = done; });
globalThis.window = { addEventListener() {} };
globalThis.__S = { call(name, args) {
    if (name === 'Na__LePanels__RegisterTab') { specs.push(args[1]); return { button : { textContent : args[1].title, title : '' } }; }
    if (name === 'Na__LeScrap__Ready') return ready;
    if (name === 'Na__LeScrap__Label') return args[1];
    return undefined;
} };
const panel = await import(pathToFileURL(file).href);
const tab = panel.Na__LePanelScrap__RegisterTab();
const before = tab.button.title;
release(true); await ready; await new Promise((done) => setTimeout(done, 0));
const results = [
    [ 'the Scrapbook tab is registered on the right with its hint in the spec', specs.length === 1 && specs[0].hint === 'Ready-made, dynamic and saved items to drag onto the sheet.' ],
    [ 'once the scrapbook config is read, the tab button carries the hover text itself', before === '' && tab.button.title === 'Ready-made, dynamic and saved items to drag onto the sheet.' ]
];
let failed = 0;
results.forEach(([ name, ok ]) => { if (!ok) failed++; console.log((ok ? '  PASS  ' : '  FAIL  ') + name); });
process.exit(failed ? 1 : 0);
