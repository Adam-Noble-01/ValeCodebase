// W0-15 scratch: prove the six config modules link as real ES modules (the
// browser's link step: every named import must exist) and the barrel exports
// what TrueVision's does. Usage: node link_check.mjs <folder with the six .js and the two .json>
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = resolve(process.argv[2]);
const barrel = await import(pathToFileURL(resolve(dir, 'Na__LayoutEditor__ConfigState__.js')).href);
const names = Object.keys(barrel).sort();
console.log('barrel linked: ' + names.length + ' exports');
const tvSrc = readFileSync(resolve(process.argv[3]), 'utf8');
const block = tvSrc.slice(tvSrc.lastIndexOf('export {'));
const tvNames = block.slice(block.indexOf('{') + 1, block.indexOf('}')).split(',').map((s) => s.trim()).filter(Boolean).sort();
const missing = tvNames.filter((n) => names.indexOf(n) === -1), extra = names.filter((n) => tvNames.indexOf(n) === -1);
console.log('TrueVision barrel exports ' + tvNames.length + '; missing here: ' + JSON.stringify(missing) + '; extra here: ' + JSON.stringify(extra));
for (const f of readdirSync(dir).filter((n) => /^Na__LayoutEditor__ConfigState__.+__\.js$/.test(n))) {
    const m = await import(pathToFileURL(resolve(dir, f)).href);
    console.log('linked ' + f + ' (' + Object.keys(m).length + ' exports)');
}
process.exit(missing.length || extra.length ? 1 : 0);
