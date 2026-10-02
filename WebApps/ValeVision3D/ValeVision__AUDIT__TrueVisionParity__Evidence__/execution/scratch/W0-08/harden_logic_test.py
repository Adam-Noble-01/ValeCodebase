# W0-08 scratch: make the logic test's "first fetch init" reads safe (no crash when a worker passed a request
# through and made no fetch), so a run against an older worker reports every failing check instead of stopping.
import os

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'prepared', 'W0-08', '00__Tests__W0-08',
                 'Na__Test__PwaServiceWorkerLogic__.test.mjs')
P = os.path.normpath(P)
s = open(P, encoding='utf-8').read()

helper_anchor = "            fetchesFor(url) { return fetchLog.filter(f => f.url === url); },"
helper_new = (helper_anchor + "\n"
              "            firstInit(url) { const f = fetchLog.find(x => x.url === url); return f ? (f.init === undefined ? 'PLAIN' : f.init) : 'NO-FETCH'; },")
assert s.count(helper_anchor) == 1
s = s.replace(helper_anchor, helper_new)

swaps = [
    ("W.fetchesFor(pic)[0].init === undefined, W.fetchesFor(pic)[0]);",
     "W.firstInit(pic) === 'PLAIN', W.firstInit(pic));"),
    ("W.fetchesFor(sheetUrl)[0].init && W.fetchesFor(sheetUrl)[0].init.cache === 'reload' && before === 1);",
     "W.firstInit(sheetUrl).cache === 'reload' && before === 1, W.firstInit(sheetUrl));"),
    ("W.fetchesFor(thumb)[0].init === undefined);",
     "W.firstInit(thumb) === 'PLAIN');"),
    ("W.fetchesFor(proj)[0].init.cache === 'no-store');",
     "W.firstInit(proj).cache === 'no-store');"),
    ("W.fetchesFor(glb)[0].init === undefined);",
     "W.firstInit(glb) === 'PLAIN');"),
    ("W.fetchesFor(html)[0].init.cache === 'no-store');",
     "W.firstInit(html).cache === 'no-store');"),
]
for old, new in swaps:
    assert s.count(old) == 1, old
    s = s.replace(old, new)
open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('hardened', P)
