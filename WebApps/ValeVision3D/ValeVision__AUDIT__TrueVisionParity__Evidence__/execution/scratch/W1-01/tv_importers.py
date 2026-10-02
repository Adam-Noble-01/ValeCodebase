"""List every TV module (at the pin) that imports from the four W1-01 modules, and the names it imports."""
import subprocess, re, sys
PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
TARGETS = {
    'Invalidation': 'Na__RenderLoop__Invalidation.js',
    'InteractiveOverlays': 'Na__RenderLoop__InteractiveOverlays__.js',
    'ModelToggle': 'Na__UiFeature__ModelToggle__Controls.js',
    'PhaseLibrary': 'Na__ModelGroup__PhaseLibrary__.js',
}

def git(*args):
    r = subprocess.run(['git', '-C', REPO] + list(args), capture_output=True)
    return r.stdout.decode('utf-8', 'replace')

files = git('ls-tree', '-r', '--name-only', PIN, APP + '02__Src__AppModules/').splitlines()
files += [f for f in git('ls-tree', '-r', '--name-only', PIN, APP + '80__Testing__PrototypeEnvironment/').splitlines()]
js = [f for f in files if f.endswith(('.js', '.mjs', '.cjs'))]

imp_re = re.compile(r'import\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"]', re.S)
dyn_re = re.compile(r'import\(\s*[\'"]([^\'"]+)[\'"]\s*\)')
results = {k: [] for k in TARGETS}
for f in js:
    text = git('show', PIN + ':' + f)
    for m in imp_re.finditer(text):
        names, spec = m.group(1), m.group(2)
        for key, base in TARGETS.items():
            if spec.endswith('/' + base) or spec == './' + base or spec.endswith(base):
                clean = []
                for n in names.split(','):
                    n = re.sub(r'//.*', '', n).strip()
                    if n:
                        clean.append(n)
                results[key].append((f[len(APP):], clean))
    for m in dyn_re.finditer(text):
        spec = m.group(1)
        for key, base in TARGETS.items():
            if spec.endswith(base):
                results[key].append((f[len(APP):], ['<dynamic import>']))

for key, rows in results.items():
    print('=' * 80)
    print(key, TARGETS[key], len(rows), 'importers')
    allnames = set()
    for f, names in rows:
        print('  ', f)
        print('      ', ', '.join(names))
        for n in names:
            allnames.add(n.split(' as ')[0].strip())
    print('  ALL NAMES:', sorted(allnames))
