"""Compare two JS files function by function after stripping comments and whitespace.

Prints functions only in one side, and functions whose normalized bodies differ.
"""
import re, sys, os

SCR = os.path.dirname(os.path.abspath(__file__))

def strip_comments(src):
    out = []
    i, n = 0, len(src)
    in_str = None
    while i < n:
        c = src[i]
        if in_str:
            out.append(c)
            if c == '\\' and i + 1 < n:
                out.append(src[i + 1]); i += 2; continue
            if c == in_str:
                in_str = None
            i += 1; continue
        if c in ('"', "'", '`'):
            in_str = c; out.append(c); i += 1; continue
        if src.startswith('//', i):
            j = src.find('\n', i)
            i = n if j == -1 else j
            continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2)
            i = n if j == -1 else j + 2
            continue
        # regex literal heuristics: skip /.../flags after = or ( or ,
        if c == '/':
            prev = ''.join(out).rstrip()[-1:] if out else ''
            if prev in ('=', '(', ',', ':', '[', '!', '&', '|', '?', '{', '}', ';', ''):
                j = i + 1
                while j < n and src[j] != '/':
                    if src[j] == '\\': j += 1
                    j += 1
                j += 1
                while j < n and src[j].isalpha(): j += 1
                out.append(src[i:j]); i = j; continue
        out.append(c); i += 1
    return ''.join(out)

def norm(s):
    return re.sub(r'\s+', '', s)

def functions(src):
    code = strip_comments(src)
    res = {}
    for m in re.finditer(r'function\s+(\w+)\s*\(', code):
        name = m.group(1)
        # find body start
        k = code.find('{', m.end())
        depth, j = 0, k
        while j < len(code):
            if code[j] == '{': depth += 1
            elif code[j] == '}':
                depth -= 1
                if depth == 0: break
            j += 1
        res[name] = code[m.start():j + 1]
    return res, code

a_path, b_path = sys.argv[1], sys.argv[2]
a = open(a_path, encoding='utf-8').read().replace('\r\n', '\n')
b = open(b_path, encoding='utf-8').read().replace('\r\n', '\n')
fa, ca = functions(a)
fb, cb = functions(b)
print('only in A:', sorted(set(fa) - set(fb)))
print('only in B:', sorted(set(fb) - set(fa)))
for name in sorted(set(fa) & set(fb)):
    if norm(fa[name]) != norm(fb[name]):
        print('DIFFERS:', name)
        if len(sys.argv) > 3:
            print('  A:', fa[name])
            print('  B:', fb[name])
# top-level declarations
def decls(code):
    return sorted(set(re.findall(r'^\s*(?:const|let)\s+(\w+)\s*=\s*([^;]*);', code, re.M)))
da = dict(decls(ca)); db = dict(decls(cb))
for k in sorted(set(da) | set(db)):
    if k not in da or k not in db or norm(da[k]) != norm(db[k]):
        if k.startswith('Na__DoorAnim'):
            print('DECL', k, '| A:', da.get(k), '| B:', db.get(k))
ea = re.search(r'export\s*\{([^}]*)\}', ca); eb = re.search(r'export\s*\{([^}]*)\}', cb)
xa = set(x.strip() for x in ea.group(1).split(',') if x.strip()) if ea else set()
xb = set(x.strip() for x in eb.group(1).split(',') if x.strip()) if eb else set()
print('exports only in A:', sorted(xa - xb))
print('exports only in B:', sorted(xb - xa))
print('exports count A/B:', len(xa), len(xb))
