"""W1-99: who loads each module now - static imports, import() literals, new URL(...) and CSS @import lines in
02__Src__AppModules, 03__Style__AppStylesheets and index.html (the ledger's "Loaded by" column). Read-only.

Usage: python -B importers.py <path relative to 02__Src__AppModules> ...
       (as a module: loaded_by(rel) -> '`First.js` (+n)' or '-')
"""
import os, re, sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SKIP = {'node_modules', '.git', '.claude', '__pycache__', '00__Archive', '00__ArchivedVersions'}
SPEC = re.compile(r"""(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|new\s+URL\s*\(\s*|@import\s+(?:url\(\s*)?)['"]([^'"]+)['"]""")
_INDEX = None


def _files():
    for d in ('02__Src__AppModules', '03__Style__AppStylesheets'):
        for dp, dn, fn in os.walk(os.path.join(VV, d)):
            dn[:] = [x for x in dn if x not in SKIP]
            for f in fn:
                if f.endswith(('.js', '.mjs', '.css')):
                    yield os.path.join(dp, f)
    yield os.path.join(VV, 'index.html')


def index():
    """target absolute path (normalised) -> set of importer absolute paths."""
    global _INDEX
    if _INDEX is not None:
        return _INDEX
    res = {}
    for f in _files():
        try:
            t = open(f, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        # drop line comments and block comments (prose is never an import)
        t2 = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
        t2 = re.sub(r'(?m)^\s*//.*$', '', t2)
        base = os.path.dirname(f)
        for m in SPEC.finditer(t2):
            s = m.group(1)
            if s.startswith(('http:', 'https:', 'data:')) or not ('/' in s or s.startswith('.')):
                continue
            if s.startswith('/ValeVision3D/'):
                tgt = os.path.join(VV, *s[len('/ValeVision3D/'):].split('/'))
            elif s.startswith('./') or s.startswith('../'):
                tgt = os.path.normpath(os.path.join(base, *s.split('/')))
            else:
                tgt = os.path.normpath(os.path.join(VV, *s.split('/'))) if f.endswith('index.html') else None
            if tgt:
                res.setdefault(os.path.normcase(os.path.normpath(tgt)), set()).add(f)
    _INDEX = res
    return res


def loaded_by(rel):
    tgt = os.path.normcase(os.path.normpath(os.path.join(VV, '02__Src__AppModules', *rel.split('/'))))
    imps = sorted(index().get(tgt, set()), key=lambda p: os.path.basename(p).lower())
    if not imps:
        return '-'
    names = []
    for p in imps:
        if p.endswith('index.html'):
            names.insert(0, 'index.html')
        elif p.endswith('Na__CoreUi__Styles__Index__.css'):
            names.insert(0, 'CSS index')
        elif p.endswith('Na__LayoutEditor__Loader__.js'):
            names.insert(0, 'LE loader')
        else:
            names.append('`%s`' % os.path.basename(p))
    first = names[0]
    return first if len(names) == 1 else '%s (+%d)' % (first, len(names) - 1)


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    for r in sys.argv[1:]:
        tgt = os.path.normcase(os.path.normpath(os.path.join(VV, '02__Src__AppModules', *r.split('/'))))
        imps = sorted(os.path.relpath(p, VV) for p in index().get(tgt, set()))
        print('%s -> %s' % (r, loaded_by(r)))
        for p in imps:
            print('     ' + p)
