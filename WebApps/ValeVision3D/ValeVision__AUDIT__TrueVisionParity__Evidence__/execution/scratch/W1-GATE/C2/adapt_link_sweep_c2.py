"""Scratch only: adapt the part-1 gate's link sweep (copied here as link_sweep_c2.mjs) for the continuation gate.
- module list: EVERY dirty .js module under 02__Src__AppModules (the whole programme's changed modules: W0, W1 part 1
  and the continuation), read from crosscheck_c2.json, with the loader and the editor hubs imported FIRST (the app's own
  entry order; W1-27 F6: entering the record/State import cycle at SheetRecords before the facade throws a TDZ error
  that the app never meets);
- each result says whether the module was touched in the continuation.
Exact-once replacements; LF kept."""
import os

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'link_sweep_c2.mjs')
b = open(P, 'rb').read()
assert b.count(b'\r\n') == 0
s = b.decode('utf-8')
pairs = [
    ("const cross = JSON.parse(readFileSync(join(SCRATCH, 'crosscheck.json'), 'utf8'));\n"
     "const w1 = cross.filter((r) => r.touched_in_w1 && /\\.js$/.test(r.path) && r.path.startsWith('WebApps/ValeVision3D/02__Src__AppModules/'))\n",
     "const cross = JSON.parse(readFileSync(join(SCRATCH, 'crosscheck_c2.json'), 'utf8'));\n"
     "const CONT = new Set(cross.filter((r) => r.touched_in_cont).map((r) => r.path.slice('WebApps/ValeVision3D/'.length)));\n"
     "const w1 = cross.filter((r) => r.code !== ' D' && /\\.js$/.test(r.path) && r.path.startsWith('WebApps/ValeVision3D/02__Src__AppModules/'))\n"),
    ("const hubs = [ '05__Core__ModeController/Na__LayoutEditor__ModeController__.js',",
     "const hubs = [ '01__Core__Loader/Na__LayoutEditor__Loader__.js', '05__Core__ModeController/Na__LayoutEditor__ModeController__.js',"),
    ("const modules = Array.from(new Set(w1.concat(hubs)));",
     "const modules = Array.from(new Set(hubs.concat(w1)));"),
    ("try { const ns = await import('./' + p); window.__SWEEP.results.push({ p, ok : true, exports : Object.keys(ns).length, ms : Math.round(performance.now() - t0) }); }",
     "try { const ns = await import('./' + p); window.__SWEEP.results.push({ p, ok : true, cont : CONT.has(p), exports : Object.keys(ns).length, ms : Math.round(performance.now() - t0) }); }"),
    ("        catch (e) { window.__SWEEP.results.push({ p, ok : false, error : String(e && e.message || e), ms : Math.round(performance.now() - t0) }); }",
     "        catch (e) { window.__SWEEP.results.push({ p, ok : false, cont : CONT.has(p), error : String(e && e.message || e), ms : Math.round(performance.now() - t0) }); }"),
    ("    const MODULES = ${JSON.stringify(modules)};\n",
     "    const MODULES = ${JSON.stringify(modules)};\n    const CONT = new Set(${JSON.stringify(Array.from(CONT))});\n"),
    ("writeFileSync(join(SCRATCH, 'link_sweep_results.json'), JSON.stringify(out, null, 2));",
     "writeFileSync(join(SCRATCH, 'link_sweep_c2_results.json'), JSON.stringify(out, null, 2));"),
    ("console.log('link sweep: ' + modules.length + ' module(s) asked, ' + ok.length + ' linked and evaluated, ' + bad.length + ' failed'",
     "console.log('link sweep: ' + modules.length + ' module(s) asked (' + ok.concat(bad).filter((r) => r.cont).length + ' touched in the continuation), ' + ok.length + ' linked and evaluated, ' + bad.length + ' failed'"),
    ("// Results: link_sweep_results.json beside this file.", "// Results: link_sweep_c2_results.json beside this file. (Continuation gate copy: see adapt_link_sweep_c2.py.)"),
]
for old, new in pairs:
    n = s.count(old)
    assert n == 1, (old[:80], n)
    s = s.replace(old, new)
open(P, 'wb').write(s.encode('utf-8'))
print('adapted', P)
