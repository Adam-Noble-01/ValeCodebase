"""Mutation check for the W1-01 unit harness (ModelToggle): one planted fault per TEMP copy of the candidate."""
import os, subprocess, sys, tempfile, shutil
SCR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-01'
TOGL = os.path.join(SCR, 'candidate', 'Na__UiFeature__ModelToggle__Controls.js')
MUTANTS = [
    ('the exact-key setter dispatches the visibility event', [(
        "        if (state.group) state.group.visible = wanted;                   // <-- Set THREE.Group visibility\r\n",
        "        if (state.group) state.group.visible = wanted;\r\n        window.dispatchEvent(new CustomEvent('na-model-visibility-changed', { detail : { categoryKey : categoryKey, visible : wanted } }));\r\n")]),
    ('BuildButtons clears the map in place', [(
        "        Na__ModelToggle__StateMap = new Map();                           // <-- Drop categories from a previously loaded model\r\n",
        "        Na__ModelToggle__StateMap.clear();\r\n")]),
    ('RestoreRegistry ignores the generation', [(
        "        if (token.generation !== Na__ModelToggle__Generation) return false;\r\n", "")]),
    ('the toggle no longer dispatches na-model-visibility-changed', [(
        "        if (silent === true) return;                                     // <-- A render hiding something it will put back says nothing\r\n",
        "        return;\r\n")]),
    ('a borrow leaves the dev buttons attached', [(
        "                borrowed.set(categoryKey, { group : group, visible : group.visible !== false, button : null });\r\n",
        "                borrowed.set(categoryKey, { group : group, visible : group.visible !== false, button : (Na__ModelToggle__StateMap.get(categoryKey) || {}).button || null });\r\n"),
        ("        if (!Na__ModelToggle__Borrowed && state.button) {\r\n", "        if (state.button) {\r\n")]),
]
tmp = tempfile.mkdtemp(prefix='na-w101-umut-')
caught = 0
lines = []
try:
    for i, (label, edits) in enumerate(MUTANTS, 1):
        text = open(TOGL, 'rb').read().decode('utf-8')
        for old, new in edits:
            if text.count(old) != 1:
                raise SystemExit('mutant %d: anchor matched %d times' % (i, text.count(old)))
            text = text.replace(old, new, 1)
        path = os.path.join(tmp, '%02d__Na__UiFeature__ModelToggle__Controls.js' % i)
        open(path, 'wb').write(text.encode('utf-8'))
        env = dict(os.environ, W101_TOGL=path)
        r = subprocess.run(['node', os.path.join(SCR, 'w1_01_units_harness.mjs'), '--target', 'mutant'], cwd=SCR, env=env, capture_output=True)
        fails = [l.strip() for l in r.stdout.decode('utf-8', 'replace').splitlines() if l.strip().startswith('FAIL')]
        ok = r.returncode != 0 and fails
        caught += 1 if ok else 0
        lines.append('%s %d %-60s %d failing%s' % ('CAUGHT' if ok else 'MISSED', i, label, len(fails), ('  e.g. ' + fails[0][:150]) if fails else ''))
finally:
    shutil.rmtree(tmp, ignore_errors=True)
lines.append('%d/%d planted faults caught' % (caught, len(MUTANTS)))
text = '\n'.join(lines) + '\n'
open(os.path.join(SCR, 'units_mutants__report.txt'), 'w', encoding='utf-8').write(text)
print(text)
sys.exit(0 if caught == len(MUTANTS) else 1)
