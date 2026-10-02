"""W0-99 - read-only helpers over the parity ledger (CRLF, ASCII) and the Wave 0 evidence."""
import json, os, re

VCB = r'D:\10_CoreLib__ValeCodebase'
VV = os.path.join(VCB, 'WebApps', 'ValeVision3D')
LEDGER = os.path.join(VV, 'ValeVision__PARITY__TrueVisionLedger__.md')
EXEC = os.path.join(VV, 'ValeVision__AUDIT__TrueVisionParity__Evidence__', 'execution')
SRC = '02__Src__AppModules/'


def read_lines(path=LEDGER):
    b = open(path, 'rb').read()
    assert b'\r\n' in b and b.count(b'\n') == b.count(b'\r\n'), 'expected pure CRLF'
    return b.decode('ascii').split('\r\n')


def split_row(line):
    """'| a | b | c |' -> ['a', 'b', 'c'] (cells stripped). Refuses a row whose pipe count is odd."""
    assert line.startswith('| ') and line.endswith(' |'), line[:80]
    inner = line[2:-2]
    return [c.strip() for c in inner.split(' | ')]


def join_row(cells):
    return '| ' + ' | '.join(cells) + ' |'


def register_rows(lines):
    """Rows of the Module Register (section 3): dicts with line index, subsection, cells."""
    out, sub, in3 = [], None, False
    for i, ln in enumerate(lines):
        if ln.startswith('## 3. Module Register'):
            in3 = True
            continue
        if in3 and ln.startswith('## 4. '):
            break
        if not in3:
            continue
        m = re.match(r'### (3\.\d) ', ln)
        if m:
            sub = m.group(1)
            continue
        if sub not in ('3.1', '3.2', '3.3', '3.4', '3.5', '3.6'):
            continue                                                     # 3.7 (Wave 0 by package) is not register rows
        if ln.startswith('| ') and sub and not ln.startswith('| VV path |') and not ln.startswith('|---'):
            cells = split_row(ln)
            if len(cells) != 12:
                raise SystemExit('row with %d cells at line %d' % (len(cells), i + 1))
            out.append({'i': i, 'sub': sub, 'cells': cells})
    return out


def strip_ticks(s):
    s = s.strip()
    return s[1:-1] if s.startswith('`') and s.endswith('`') else s


def row_paths(row):
    """(vv_rel or None, tv_rel or None), both relative to 02__Src__AppModules/."""
    vv, tv = row['cells'][0], row['cells'][1]
    vv_rel = None if vv.startswith('-') else strip_ticks(vv)
    if tv == 'same path':
        tv_rel = vv_rel
    elif tv.startswith('-'):
        tv_rel = None
    else:
        tv_rel = strip_ticks(tv)
    if vv_rel is None and tv_rel is not None and vv.startswith('- (lands at the TV path)'):
        pass
    return vv_rel, tv_rel


def w0_changed():
    """VV paths (relative to 02__Src__AppModules/) changed since HEAD 7b4e593a (git status: modified, renamed, new),
    each with the Port Records that mention it (the gate's crosscheck: full, app-relative or base name)."""
    import subprocess
    out = subprocess.run(['git', '-C', VCB, 'status', '--porcelain=v1', '--untracked-files=all', '--',
                          'WebApps/ValeVision3D/' + SRC], capture_output=True, text=True, encoding='utf-8').stdout
    d = json.load(open(os.path.join(EXEC, 'scratch', 'W0-GATE', 'crosscheck.json'), encoding='utf-8'))
    mentions = {r['path']: sorted(set((r.get('full') or []) + (r.get('app') or []) + (r.get('base') or []))) for r in d}
    res = {}
    pre = 'WebApps/ValeVision3D/' + SRC
    for line in out.splitlines():
        code, path = line[:2], line[3:]
        if ' -> ' in path:
            path = path.split(' -> ', 1)[1]
        path = path.strip('"')
        if path.startswith(pre) and code.strip() != 'D':
            res[path[len(pre):]] = mentions.get(path, [])
    return res
