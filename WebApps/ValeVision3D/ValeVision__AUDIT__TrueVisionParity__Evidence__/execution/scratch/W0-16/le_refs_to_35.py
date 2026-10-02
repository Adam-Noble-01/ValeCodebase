"""W0-16 scratch: every mention of 35__System__PageLayoutSystem inside the Layout Editor
(02__Src__AppModules/51__System__LayoutEditor, modules and config), classified as a runtime reference
(a path the code or config loads) or a PORT NOTE provenance line (history: K2 section 13; G4 exempts the
whole PORT NOTE block). Usage: python le_refs_to_35.py
"""
import os, re, sys, json

LE = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor'
rows = []
for root, _, names in os.walk(LE):
    for n in names:
        if not n.lower().endswith(('.js', '.mjs', '.json', '.css', '.html')):
            continue
        path = os.path.join(root, n)
        lines = open(path, 'rb').read().decode('utf-8', 'replace').splitlines()
        in_port_note = False
        for i, line in enumerate(lines, 1):
            if re.match(r'\s*//\s*PORT NOTE:', line):
                in_port_note = True
            elif in_port_note and re.match(r'\s*//\s*-{20,}', line):
                in_port_note = False
            if '35__System__PageLayoutSystem' in line:
                rows.append({'file': os.path.relpath(path, LE), 'line': i, 'kind': 'port-note provenance' if in_port_note else 'RUNTIME',
                             'text': line.strip()})
runtime = [r for r in rows if r['kind'] == 'RUNTIME']
for r in rows:
    print('%-22s %s:%d  %s' % (r['kind'], r['file'], r['line'], r['text'][:150]))
print('\n%d mentions: %d runtime, %d PORT NOTE provenance' % (len(rows), len(runtime), len(rows) - len(runtime)))
json.dump(rows, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'le_refs_to_35.json'), 'w'), indent=2)
sys.exit(1 if runtime else 0)
