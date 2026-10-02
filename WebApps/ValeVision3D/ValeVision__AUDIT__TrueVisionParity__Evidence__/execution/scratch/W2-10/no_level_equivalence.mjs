// W2-10 scratch: with no storey level, ViewportTitleText 1.1.0 writes every title exactly as 1.0.0 did.
// Usage: node no_level_equivalence.mjs <old.js> <new.js>
// Compares Compose's text / resolved / missing (1.1.0 adds `source`, ignored) and NormaliseFacts' old
// fields over a matrix of facts (no level), options and word sets. Exit 0 = identical everywhere.
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const [ oldPath, newPath ] = process.argv.slice(2).map((p) => resolve(p));
const dir = mkdtempSync(join(tmpdir(), 'w210-'));
copyFileSync(oldPath, join(dir, 'old.mjs'));
copyFileSync(newPath, join(dir, 'new.mjs'));
const A = await import(pathToFileURL(join(dir, 'old.mjs')).href);
const B = await import(pathToFileURL(join(dir, 'new.mjs')).href);
rmSync(dir, { recursive : true, force : true });

const kinds    = [ undefined, '', 'elevation', 'section', 'plan', 'siteplan', '3d', 'spaceship' ];
const phases   = [ undefined, '', 'existing', 'proposed', 7 ];
const facings  = [ undefined, '', 'East', '  North   East ' ];
const names    = [ undefined, '', 'Front Elevation', 'Existing Floor Plan', 'Proposed Floor Plan', 'Floor Plan', 'Floor Plan 2',
                   'Coach House Floor Plan', 'Proposed', 'existing rear', 'Street Scene {{Direction}}', '  Roof\n Plan ' ];
const drawings = [ undefined, '', 'Floor Plan 1', 'Roof Plan', 'Section A-A', 'Site Plan', 'Proposed Section B-B' ];
const options  = [ undefined, {}, { uppercase : true }, { phaseMode : 'none' }, { phaseMode : 'existing', uppercase : true },
                   { phaseMode : 'proposed' }, { phaseMode : 'auto' }, { override : 'Street Scene' }, { override : '  ' } ];
const wordSets = [ undefined, null, {}, { Existing : 'As Existing', Proposed : 'As Proposed', Elevation : 'Elev.' },
                   { PlaceholderDirection : 'Dir', PlaceholderDrawing : 'Dwg', GenericPlan : 'Layout Drawing' } ];

let cases = 0;
let diffs = 0;
const pick = (r) => JSON.stringify({ text : r.text, resolved : r.resolved, missing : r.missing });
for (const kind of kinds) for (const phase of phases) for (const facing of facings) for (const name of names) for (const drawing of drawings) {
    const facts = { kind, phase, facing, name, drawing };
    const na = A.Na__LeViewText__NormaliseFacts(facts);
    const nb = B.Na__LeViewText__NormaliseFacts(facts);
    const { level, ...nbOld } = nb;
    if (JSON.stringify(na) !== JSON.stringify(nbOld) || level !== '') { diffs++; if (diffs < 10) console.log('NORMALISE DIFF', facts, na, nb); }
    for (const opt of options) for (const words of wordSets) {
        cases++;
        const a = pick(A.Na__LeViewText__Compose(facts, opt, words));
        const b = pick(B.Na__LeViewText__Compose(facts, opt, words));
        if (a !== b) { diffs++; if (diffs < 10) console.log('COMPOSE DIFF', facts, opt, words, a, b); }
    }
}
// The 1.0.0 export set must survive (additive change only).
const lost = Object.keys(A).filter((k) => !(k in B));
const words = Object.keys(A.Na__LeViewText__WORDS).filter((k) => B.Na__LeViewText__WORDS[k] !== A.Na__LeViewText__WORDS[k]);
console.log('compose cases ' + cases + ', differences ' + diffs + ', exports lost ' + lost.length + (lost.length ? ' ' + lost.join() : '') + ', 1.0.0 words changed ' + words.length);
console.log('exports added: ' + Object.keys(B).filter((k) => !(k in A)).join(', '));
process.exit((diffs === 0 && lost.length === 0 && words.length === 0) ? 0 : 1);
