# Scratch (W1-10): list the static import closure of a few VV modules, read-only.
import re, os, sys

APP = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SRC = os.path.join(APP, '02__Src__AppModules')
IMPORT_RE = re.compile(r'''^\s*import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]''', re.M)

def imports_of(path):
    text = open(path, encoding='utf-8').read()
    # strip block comments crudely: only consider lines not starting with //
    out = []
    for m in re.finditer(r'''(?ms)^\s*import\s+(?:[^;]*?)\s+from\s+['"]([^'"]+)['"]\s*;|^\s*import\s+['"]([^'"]+)['"]\s*;''', text):
        spec = m.group(1) or m.group(2)
        out.append(spec)
    return out

def closure(start_rel):
    seen, bare = {}, set()
    stack = [os.path.normpath(os.path.join(SRC, start_rel))]
    while stack:
        p = stack.pop()
        if p in seen: continue
        try:
            specs = imports_of(p)
        except FileNotFoundError:
            seen[p] = 'MISSING'; continue
        seen[p] = specs
        for s in specs:
            if s.startswith('.'):
                stack.append(os.path.normpath(os.path.join(os.path.dirname(p), s)))
            else:
                bare.add(s)
    return seen, bare

if __name__ == '__main__':
    for start in sys.argv[1:]:
        seen, bare = closure(start)
        print('==', start, len(seen), 'modules; bare:', sorted(bare))
        for p in sorted(seen):
            print('   ', os.path.relpath(p, SRC), '' if seen[p] != 'MISSING' else 'MISSING')
