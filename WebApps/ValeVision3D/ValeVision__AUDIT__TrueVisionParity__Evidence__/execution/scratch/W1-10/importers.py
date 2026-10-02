# Scratch (W1-10): which files under 02__Src__AppModules import the elevation data module, and which names. Read-only.
import os, re

SRC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules'
PATTERN = re.compile(r'''import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*Na__Elevation__ProjectJson__Data__\.js)['"]''')
files, names = [], set()
for dirpath, dirnames, filenames in os.walk(SRC):
    dirnames[:] = [d for d in dirnames if d not in ('node_modules', '.claude')]
    for name in filenames:
        if not name.endswith('.js'):
            continue
        path = os.path.join(dirpath, name)
        text = open(path, encoding='utf-8', errors='replace').read()
        found = PATTERN.findall(text)
        if found:
            files.append(os.path.relpath(path, SRC))
            for group, _ in found:
                for item in group.split(','):
                    item = item.strip().split(' as ')[0].strip()
                    if item:
                        names.add(item)
print(len(files), 'importer files;', len(names), 'names')
print('\n'.join(sorted(files)))
print(sorted(names))
