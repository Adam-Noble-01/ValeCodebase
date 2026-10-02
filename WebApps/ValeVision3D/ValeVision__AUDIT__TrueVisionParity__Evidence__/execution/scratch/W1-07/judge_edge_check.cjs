// W1-07 scratch check: the one JudgeDraft edge TrueVision's DraftGuard test does not reach - a draft that does not
// say what it grew from, judged while the base is still unknown (undefined), must be asked about, never put back.
// The module is loaded exactly as Na__Test__DraftGuard__ loads it (imports stripped, run in a vm with stubs).
//   node judge_edge_check.cjs <AutoSave file>
const fs = require('node:fs');
const vm = require('node:vm');
const strip = (text) => text.replace(/^[ \t]*import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?[ \t]*(\/\/[^\n]*)?$/gm, '').replace(/^[ \t]*export\s*\{[^}]*\};?/gm, '');
const source = strip(fs.readFileSync(process.argv[2], 'utf8'));
const ctx = { window : { addEventListener() {}, setTimeout, clearTimeout, localStorage : null }, document : { addEventListener() {} }, console, setTimeout, clearTimeout, JSON, Object, Array, Number, String, Date, Promise };
vm.createContext(ctx);
vm.runInContext(source + '\nthis.__judge = Na__LeAuto__JudgeDraft;', ctx);
const judge = ctx.__judge;
const cases = [
    [ 'no base on the draft, base unknown (undefined): ask', judge({ savedAt : 1, sheets : [] }, undefined), 'ask' ],
    [ 'no base on the draft, base null: ask', judge({ savedAt : 1, sheets : [] }, null), 'ask' ],
    [ 'base undefined written explicitly, base unknown: restore (it said so)', judge({ savedAt : 1, base : undefined, sheets : [] }, undefined), 'restore' ]
];
let failed = 0;
for (const [ name, got, want ] of cases) { const ok = got === want; if (!ok) failed++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (ok ? '' : ' (got ' + got + ')')); }
process.exit(failed ? 1 : 0);
