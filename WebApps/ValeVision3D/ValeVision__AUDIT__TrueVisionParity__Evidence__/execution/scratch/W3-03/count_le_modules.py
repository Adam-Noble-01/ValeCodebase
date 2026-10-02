"""Instrumented copy of Na__Verify__ModuleGraph__ (scratch only): prints how many Layout Editor modules the app walk
reaches and whether every LE .js on disk (outside tests) is among them. The copy is placed beside the original's
folder level so its relative app-root resolution is unchanged, then deleted."""
import os
import subprocess

VV = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/'
SRC = VV + '80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs'
TMP = VV + '80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__W3_03_count__.tmp.mjs'

text = open(SRC, encoding='utf-8').read()
hook = "    console.log(`  [1] app graph      : ${appWalk.visited.size} modules"
assert text.count(hook) == 1
inject = ("    { const le = [...appWalk.visited].filter((f) => /51__System__LayoutEditor/.test(f));"
          " console.log('LE_COUNT ' + le.length); le.forEach((f) => console.log('LE_FILE ' + f)); }\n")
text = text.replace(hook, inject + hook)
open(TMP, 'w', encoding='utf-8').write(text)
try:
    out = subprocess.run(['node', TMP], capture_output=True, text=True, cwd=VV).stdout
finally:
    os.remove(TMP)
walked = set(os.path.normcase(os.path.normpath(l[len('LE_FILE '):].strip())) for l in out.splitlines() if l.startswith('LE_FILE '))
print([l for l in out.splitlines() if l.startswith('LE_COUNT')][0])
le_root = os.path.join(VV, '02__Src__AppModules', '51__System__LayoutEditor')
missing = []
total = 0
for root, dirs, files in os.walk(le_root):
    for f in files:
        if f.endswith('.js'):
            total += 1
            p = os.path.normcase(os.path.normpath(os.path.join(root, f)))
            if p not in walked:
                missing.append(os.path.relpath(p, os.path.normcase(os.path.normpath(le_root))))
print('LE .js on disk', total, 'not reached', len(missing))
for m in sorted(missing):
    print('  not reached:', m)
