"""W0 integrator gate - step 2, strict: attribute each changed path to the Port Records whose FILES-CHANGED parts name it.

The parts read per record: the header block's "Files:" lines (up to "Not ported" / "Tests:"), and every markdown section
whose heading says "Files changed" / "files changed" / "Files" (up to the next heading of the same or a higher level).
Read-only. Prints the paths with no strict owner, and the paths with more than one strict owner.
"""
import json, os, re, sys

EXEC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution'
OUT = os.path.join(EXEC, 'scratch', 'W0-GATE')
PR = os.path.join(EXEC, 'port_records')
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

rows = json.load(open(os.path.join(OUT, 'crosscheck.json'), encoding='utf-8'))

def files_parts(text):
    text = text.replace('\\', '/')
    parts = []
    lines = text.split('\n')
    # header "Files:" block inside the first code fence
    in_files = False
    for ln in lines[:400]:
        if re.match(r'^\s*Files( changed)?\s*:', ln):
            in_files = True
            parts.append(ln)
            continue
        if in_files:
            if re.match(r'^\s*(Not ported|Tests|New or renamed|SHARED SERVICE WORKER|Transport touched|Hot files)', ln) or ln.startswith('```'):
                in_files = False
                continue
            parts.append(ln)
    # markdown sections about files
    i = 0
    while i < len(lines):
        m = re.match(r'^(#+)\s+(.*)$', lines[i])
        if m and re.search(r'\bfiles?\b', m.group(2), re.I) and re.search(r'chang|written|touched|landed|created|edited|new|^\d*\.?\s*files', m.group(2), re.I):
            level = len(m.group(1))
            j = i + 1
            while j < len(lines):
                m2 = re.match(r'^(#+)\s+', lines[j])
                if m2 and len(m2.group(1)) <= level:
                    break
                j += 1
            parts.extend(lines[i:j])
            i = j
            continue
        i += 1
    return '\n'.join(parts)

recs = {}
for fn in sorted(os.listdir(PR)):
    if fn.endswith('.md'):
        recs[fn[:-3]] = files_parts(open(os.path.join(PR, fn), encoding='utf-8', errors='replace').read())

out = []
for r in rows:
    path = r['path']
    app_rel = None
    for root in ('WebApps/ValeVision3D/', 'WebApps/Whitecardopedia/'):
        if path.startswith(root):
            app_rel = path[len(root):]
    tail2 = '/'.join(path.split('/')[-2:])
    base = path.rsplit('/', 1)[-1]
    owners = []
    for rid, txt in recs.items():
        if path in txt or (app_rel and app_rel in txt) or tail2 in txt or base in txt:
            owners.append(rid)
    r['strict'] = owners
    out.append(r)

json.dump(out, open(os.path.join(OUT, 'crosscheck_strict.json'), 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
none = [r for r in out if not r['strict']]
multi = [r for r in out if len(r['strict']) > 1]
print('records with a files part:', {k: len(v) for k, v in recs.items()})
print('changed paths: %d; strict owner found: %d; none: %d; more than one: %d' % (len(out), len(out) - len(none), len(none), len(multi)))
print('\n== NO STRICT OWNER ==')
for r in none:
    print(r['code'], r['path'], '(loose: ' + ','.join(sorted(set(r['full'] + r['app'] + r['base'] + r['old_base']))) + ')')
print('\n== MORE THAN ONE STRICT OWNER ==')
for r in multi:
    print(r['code'], r['path'], '<-', ','.join(r['strict']))
