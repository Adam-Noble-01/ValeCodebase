"""W2-06 scratch: code-only diff (comments stripped, identity normalised) between two folders of folder-50 files.

usage: python normdiff.py <dirA> <dirB> [name ...]
"""
import difflib, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def strip_comments(src):
    out, i, n = [], 0, len(src)
    state = None
    while i < n:
        c = src[i]
        two = src[i:i + 2]
        if state is None:
            if two == '//':
                j = src.find('\n', i)
                i = n if j < 0 else j
                continue
            if two == '/*':
                j = src.find('*/', i + 2)
                i = n if j < 0 else j + 2
                continue
            if c in '\'"`':
                state = c
            out.append(c)
            i += 1
            continue
        out.append(c)
        if c == '\\':
            out.append(src[i + 1:i + 2])
            i += 2
            continue
        if c == state:
            state = None
        i += 1
    return ''.join(out)


def norm(text, is_js):
    text = text.replace('\r\n', '\n')
    if is_js:
        text = strip_comments(text)
    text = text.replace('TrueVision3D', 'APP3D').replace('ValeVision3D', 'APP3D')
    text = text.replace('TrueVision', 'APP').replace('ValeVision', 'APP')
    rows = [re.sub(r'\s+', ' ', r).strip() for r in text.split('\n')]
    return [r for r in rows if r]


def main():
    a, b = sys.argv[1], sys.argv[2]
    names = sys.argv[3:] or sorted(set(os.listdir(a)) & set(os.listdir(b)))
    for name in names:
        pa, pb = os.path.join(a, name), os.path.join(b, name)
        if not (os.path.exists(pa) and os.path.exists(pb)):
            continue
        is_js = name.endswith('.js') or name.endswith('.mjs')
        ra = norm(open(pa, encoding='utf-8').read(), is_js)
        rb = norm(open(pb, encoding='utf-8').read(), is_js)
        d = list(difflib.unified_diff(ra, rb, a + '/' + name, b + '/' + name, n=0, lineterm=''))
        plus = sum(1 for r in d if r.startswith('+') and not r.startswith('+++'))
        minus = sum(1 for r in d if r.startswith('-') and not r.startswith('---'))
        print('=== %s  -%d +%d' % (name, minus, plus))
        if '-v' in os.environ.get('NORMDIFF', ''):
            print('\n'.join(d))


if __name__ == '__main__':
    main()
