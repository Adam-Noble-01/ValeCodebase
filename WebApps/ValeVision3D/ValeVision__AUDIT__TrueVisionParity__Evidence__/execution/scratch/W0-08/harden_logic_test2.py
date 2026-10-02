# W0-08 scratch: second hardening pass on the logic test - every response-body read goes through BodyOf(),
# so a passed-through request (res null) on an older worker fails its check instead of crashing the run.
import os
import re

P = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'prepared', 'W0-08',
                                  '00__Tests__W0-08', 'Na__Test__PwaServiceWorkerLogic__.test.mjs'))
s = open(P, encoding='utf-8').read()

anchor = "    const RESULTS = [];"
assert s.count(anchor) == 1
s = s.replace(anchor, "    const BodyOf  = (x) => (x && x.res ? x.res.body : undefined);    // <-- null-safe: a passed-through request has no response\n" + anchor)

before = len(re.findall(r'\b(\w+)\.res\.body\b', s))
s = re.sub(r'\b(\w+)\.res\.body\b', r'BodyOf(\1)', s)
after = len(re.findall(r'\b(\w+)\.res\.body\b', s))
open(P, 'w', encoding='utf-8', newline='\n').write(s)
print(f'replaced {before} body reads ({after} left)')
