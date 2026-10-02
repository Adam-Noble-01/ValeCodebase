#!/usr/bin/env python3
"""R2 Section B - module naming extraction (READ-ONLY on both apps).

Walks TV and VV 02__Src__AppModules (and 03__Style__AppStylesheets), reads every
.js/.mjs/.cjs/.css/.json source file and extracts:
  - header facts: banner (line text after the app token), FILE, NAMESPACE, MODULE
  - exported names (comment- and string-aware: `export { ... }`, `export function|const|let|var|class`,
    `export default`, `export * from`)
  - import specifiers (for the TV drawing-system surface)
Then maps every VV path to its K2 target (folder renumbers FR-01..FR-07 and file
moves/renames FR-08..FR-13, i.e. K3 W0-02 + W0-03) and pairs VV and TV files by identical
target path.

Writes parity/report/tools/out/r2b_extract.json. No write ever goes near the app trees.
"""
import json
import os
import re
import sys
from collections import defaultdict

TV = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
PARITY = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)

SKIP_DIRS = {'node_modules', '.wrangler', '.claude', '.git', '__pycache__'}
SUBS = ('02__Src__AppModules', '03__Style__AppStylesheets')
EXTS = {'.js', '.mjs', '.cjs', '.css', '.json'}
M = '02__Src__AppModules/'

# ---------------------------------------------------------------------------
# K2 maps -> VV current path to VV target path (only the rows that rename/move
# a path that stays live: FR-01..FR-13). Folder rows first, then file rows.
# ---------------------------------------------------------------------------
FRM = json.load(open(os.path.join(PARITY, 'data', 'file_rename_map.json'), encoding='utf-8'))
FOLDER_MOVES = []   # (old_prefix, new_prefix)
FILE_MOVES = {}     # old_full_rel -> new_full_rel
for r in FRM:
    if r['id'] not in {'FR-%02d' % i for i in range(1, 14)}:
        continue
    if r['level'] == 'folder':
        FOLDER_MOVES.append((r['current_vv'], r['target_vv']))
    elif r['level'] == 'file':
        FILE_MOVES[r['current_vv']] = r['target_vv']


def vv_target(rel):
    if rel in FILE_MOVES:
        return FILE_MOVES[rel]
    for old, new in FOLDER_MOVES:
        if rel.startswith(old):
            return new + rel[len(old):]
    return rel


# ---------------------------------------------------------------------------
# Comment / string aware stripping for JS (keeps code, blanks comments and the
# CONTENT of string/template literals so `export {` inside text never matches).
# ---------------------------------------------------------------------------
REGEX_PREV = set('(,=:[!&|?{};+-*%<>~^')


def strip_js(src):
    out = []
    i, n = 0, len(src)
    last_sig = ''          # last significant (non-space) char emitted in code
    last_word = ''
    while i < n:
        c = src[i]
        nx = src[i + 1] if i + 1 < n else ''
        if c == '/' and nx == '/':
            j = src.find('\n', i)
            j = n if j < 0 else j
            out.append(' ' * (j - i))
            i = j
            continue
        if c == '/' and nx == '*':
            j = src.find('*/', i + 2)
            j = n if j < 0 else j + 2
            out.append(re.sub(r'[^\n]', ' ', src[i:j]))
            i = j
            continue
        if c in ('"', "'"):
            j = i + 1
            while j < n and src[j] != c and src[j] != '\n':
                j += 2 if src[j] == '\\' else 1
            j = min(j + 1, n)
            out.append(c + ' ' * max(0, j - i - 2) + (c if j - i >= 2 else ''))
            i = j
            last_sig = c
            continue
        if c == '`':
            j = i + 1
            depth = 0
            while j < n:
                if src[j] == '\\':
                    j += 2
                    continue
                if depth == 0 and src[j] == '`':
                    break
                if src[j] == '$' and j + 1 < n and src[j + 1] == '{':
                    depth += 1
                    j += 2
                    continue
                if depth and src[j] == '}':
                    depth -= 1
                j += 1
            j = min(j + 1, n)
            out.append(re.sub(r'[^\n]', ' ', src[i:j]))
            i = j
            last_sig = '`'
            continue
        if c == '/' and (last_sig in REGEX_PREV or last_sig == '' or last_word in ('return', 'typeof', 'case', 'in', 'of')):
            # regex literal
            j = i + 1
            in_cls = False
            while j < n and src[j] != '\n':
                if src[j] == '\\':
                    j += 2
                    continue
                if src[j] == '[':
                    in_cls = True
                elif src[j] == ']':
                    in_cls = False
                elif src[j] == '/' and not in_cls:
                    break
                j += 1
            j = min(j + 1, n)
            while j < n and src[j].isalpha():
                j += 1
            out.append(' ' * (j - i))
            i = j
            last_sig = '/'
            continue
        out.append(c)
        if not c.isspace():
            last_sig = c
            if c.isalnum() or c in '_$':
                k = i
                while k > 0 and (src[k - 1].isalnum() or src[k - 1] in '_$'):
                    k -= 1
                last_word = src[k:i + 1]
            else:
                last_word = ''
        i += 1
    return ''.join(out)


RX_EXP_BLOCK = re.compile(r'\bexport\s*\{([^}]*)\}\s*(from\s*[\'"][^\'"]*[\'"])?', re.S)
RX_EXP_DECL = re.compile(r'\bexport\s+(?:async\s+)?(?:function\s*\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)')
RX_EXP_DEFAULT = re.compile(r'\bexport\s+default\b')
RX_EXP_STAR = re.compile(r'\bexport\s*\*\s*(?:as\s+([A-Za-z_$][\w$]*)\s*)?from')
RX_IMPORT = re.compile(r'''(?:\bimport\s[^;]*?\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]''', re.S)
RX_HDR = {
    'FILE': re.compile(r'^\s*(?://|\*|#)?\s*FILE\s*:\s*(\S.*?)\s*$'),
    'NAMESPACE': re.compile(r'^\s*(?://|\*|#)?\s*NAMESPACE\s*:\s*(\S.*?)\s*$'),
    'MODULE': re.compile(r'^\s*(?://|\*|#)?\s*MODULE\s*:\s*(\S.*?)\s*$'),
}
RX_BANNER = re.compile(r'^\s*(?://|/\*|\*)?\s*(TRUEVISION3D|VALEVISION3D)\s*-\s*(.*?)\s*$')
RX_VER = re.compile(r'(\d{1,2}-[A-Z][a-z]{2}-\d{4})\s*-\s*Version\s+(\d+\.\d+\.\d+)')


def vkey(v):
    return tuple(int(x) for x in v.split('.'))


def analyse(full, ext):
    try:
        raw = open(full, 'r', encoding='utf-8', errors='replace').read()
    except Exception as e:  # pragma: no cover
        return {'error': str(e)}
    lines = raw.splitlines()
    rec = {'lines': len(lines)}
    head = lines[:80]
    for k, rx in RX_HDR.items():
        for ln in head:
            m = rx.match(ln)
            if m:
                rec[k] = m.group(1).strip()
                break
    for ln in head[:12]:
        m = RX_BANNER.match(ln)
        if m:
            rec['banner_app'] = m.group(1)
            rec['banner_text'] = m.group(2)
            break
    vers = RX_VER.findall('\n'.join(lines[:900]))
    if vers:
        rec['ver'] = max((v[1] for v in vers), key=vkey)
    if ext in ('.js', '.mjs', '.cjs'):
        code = strip_js(raw)
        exps, reexp = set(), set()
        for m in RX_EXP_BLOCK.finditer(code):
            body, frm = m.group(1), m.group(2)
            for item in body.split(','):
                item = item.strip()
                if not item:
                    continue
                mm = re.match(r'([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$', item)
                if mm:
                    name = mm.group(2) or mm.group(1)
                    (reexp if frm else exps).add(name)
        for m in RX_EXP_DECL.finditer(code):
            exps.add(m.group(1))
        if RX_EXP_DEFAULT.search(code):
            exps.add('default')
        for m in RX_EXP_STAR.finditer(code):
            reexp.add('*' + (m.group(1) or ''))
        rec['exports'] = sorted(exps | reexp)
        rec['reexports'] = sorted(reexp)
        rec['imports'] = sorted(set(RX_IMPORT.findall(code.replace("'", "'"))) | set(RX_IMPORT.findall(raw)))
    return rec


def walk(root):
    for sub in SUBS:
        base = os.path.join(root, sub)
        for dp, dns, fns in os.walk(base):
            dns[:] = [d for d in dns if d not in SKIP_DIRS and not d.startswith('04__Lib__')]
            for fn in fns:
                ext = os.path.splitext(fn)[1].lower()
                if ext not in EXTS:
                    continue
                full = os.path.join(dp, fn)
                rel = os.path.relpath(full, root).replace('\\', '/')
                yield rel, full, ext


def main():
    data = {'tv': {}, 'vv': {}}
    for app, root in (('tv', TV), ('vv', VV)):
        for rel, full, ext in walk(root):
            # skip vendored code inside module folders (clipper2, three-edge-projection, jspdf)
            if '/01__Dependencies__VersionLocked/' in rel or '/Vendor' in rel.split('/')[-2:-1][0] if '/' in rel else False:
                pass
            rec = analyse(full, ext)
            rec['ext'] = ext
            data[app][rel] = rec
        print(app, len(data[app]), file=sys.stderr)
    # targets
    vv_by_target = {}
    for rel in data['vv']:
        t = vv_target(rel)
        data['vv'][rel]['target'] = t
        vv_by_target[t] = rel
    pairs = []
    for t, vrel in sorted(vv_by_target.items()):
        if t in data['tv']:
            pairs.append({'target': t, 'vv_now': vrel})
    data['pairs'] = pairs
    data['vv_only'] = sorted(t for t in vv_by_target if t not in data['tv'])
    data['tv_only'] = sorted(t for t in data['tv'] if t not in vv_by_target)
    json.dump(data, open(os.path.join(OUT, 'r2b_extract.json'), 'w', encoding='utf-8'), indent=1)
    print('pairs', len(pairs), 'vv_only', len(data['vv_only']), 'tv_only', len(data['tv_only']), file=sys.stderr)


if __name__ == '__main__':
    main()
