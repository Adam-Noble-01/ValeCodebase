"""W1-99 (continuation) - read-only: the PORT NOTE fields (Source version, Parity, Divergences first line, Ported on) and the
newest DEVELOPMENT LOG heading of every file the continuation touched under 02__Src__AppModules and
03__Style__AppStylesheets, as each file now stands. Writes portnote_fields_c2.txt.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'W0-99'))
import ledger_lib as L                                  # noqa: E402

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

CROSS = os.path.join(L.EXEC, 'scratch', 'W1-GATE', 'C2', 'crosscheck_c2.json')
FIELD = re.compile(r'^\s*(?://|\*|)\s*-\s*(Source version|Parity|Ported on|Authored in|Ported from|Legacy|Divergences|Back-port)\s*:\s*(.*)$')
CONT = re.compile(r'^\s*(?://|\*|)\s{3,}(\S.*)$')
LOGHEAD = re.compile(r'^\s*(?://|\*|)\s*(\d\d-[A-Z][a-z]{2}-\d{4}) - Version (\S+)(.*)$')


def fields(text):
    lines = text.splitlines()
    out, cur = {}, None
    for i, ln in enumerate(lines[:260]):
        m = FIELD.match(ln)
        if m:
            cur = m.group(1)
            out.setdefault(cur, m.group(2).strip())
            continue
        if cur and cur in ('Source version', 'Parity', 'Ported on') and CONT.match(ln) and len(out[cur]) < 400:
            out[cur] += ' ' + CONT.match(ln).group(1).strip()
            continue
        cur = None
    for ln in lines:
        m = LOGHEAD.match(ln)
        if m:
            out['log'] = '%s %s%s' % (m.group(1), m.group(2), m.group(3)[:60])
            break
    return out


def main():
    d = json.load(open(CROSS, encoding='utf-8'))
    rows = []
    for r in d:
        if not r.get('touched_in_cont'):
            continue
        p = r['path']
        if not (p.startswith('WebApps/ValeVision3D/02__Src__AppModules/') or p.startswith('WebApps/ValeVision3D/03__Style')):
            continue
        full = os.path.join(L.VCB, *p.split('/'))
        try:
            t = open(full, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        f = fields(t)
        rows.append('== ' + p[len('WebApps/ValeVision3D/'):])
        for k in ('Authored in', 'Ported from', 'Source version', 'Legacy', 'Parity', 'Ported on', 'log'):
            if k in f:
                rows.append('   %-14s %s' % (k, f[k][:420]))
    open(os.path.join(HERE, 'portnote_fields_c2.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(rows) + '\n')
    print('files:', sum(1 for x in rows if x.startswith('== ')))


if __name__ == '__main__':
    main()
