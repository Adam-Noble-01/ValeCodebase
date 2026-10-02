"""W2-99 - read-only: the PORT NOTE fields (Authored in, Ported from, Source version, Legacy, Parity, Divergences, Ported on)
and the newest DEVELOPMENT LOG heading of every file Wave 2 touched under 02__Src__AppModules and 03__Style__AppStylesheets,
as each file now stands, with the package(s) the gate attributes it to. Adapted from W1-99 C2's portnote_fields_c2.py.
Writes portnote_fields_w2.json and portnote_fields_w2.txt. Run after the placeholder pass (versions read v2.71.4).
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'W0-99'))
import ledger_lib as L                                  # noqa: E402

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

CROSS = os.path.join(L.EXEC, 'scratch', 'W2-GATE', 'crosscheck_w2.json')
FIELD = re.compile(r'^\s*(?://|\*|)\s*-\s*(Source version|Parity|Ported on|Authored in|Ported from|Legacy|Divergences|Back-port|Twin|Mirrors)\s*:\s*(.*)$')
CONT = re.compile(r'^\s*(?://|\*|)\s{3,}(\S.*)$')
LOGHEAD = re.compile(r'^\s*(?://|\*|)\s*(\d\d-[A-Z][a-z]{2}-\d{4}) - Version (\S+)(.*)$')
MODLINE = re.compile(r'^\s*(?://|\*|)\s*MODULE\s*:?\s*(.*)$')


def fields(text):
    lines = text.splitlines()
    out, cur = {}, None
    for ln in lines[:300]:
        m = FIELD.match(ln)
        if m:
            cur = m.group(1)
            if cur in out:
                cur = None
                continue
            out[cur] = m.group(2).strip()
            continue
        if cur and CONT.match(ln) and len(out[cur]) < 900:
            out[cur] += ' ' + CONT.match(ln).group(1).strip()
            continue
        cur = None
    for ln in lines:
        m = LOGHEAD.match(ln)
        if m:
            out['log'] = '%s %s%s' % (m.group(1), m.group(2), m.group(3)[:80])
            break
    return out


def main():
    d = json.load(open(CROSS, encoding='utf-8'))
    res, txt = [], []
    for r in d:
        if not r.get('touched_in_cont'):
            continue
        p = r['path']
        if not (p.startswith('WebApps/ValeVision3D/02__Src__AppModules/') or p.startswith('WebApps/ValeVision3D/03__Style')):
            continue
        full = os.path.join(L.VCB, *p.split('/'))
        rel = p[len('WebApps/ValeVision3D/'):]
        pk = r.get('declared_by') or r.get('strict_cont') or []
        if not os.path.exists(full):
            res.append({'rel': rel, 'deleted': True, 'pk': pk, 'code': r['code']})
            txt.append('== %s  [DELETED] %s' % (rel, pk))
            continue
        t = open(full, encoding='utf-8', errors='replace').read()
        f = fields(t)
        res.append({'rel': rel, 'pk': pk, 'code': r['code'], 'f': f})
        txt.append('== %s  %s %s' % (rel, r['code'], pk))
        for k in ('Authored in', 'Ported from', 'Twin', 'Mirrors', 'Source version', 'Legacy', 'Parity', 'Divergences',
                  'Ported on', 'log'):
            if k in f:
                txt.append('   %-14s %s' % (k, f[k][:500]))
    json.dump(res, open(os.path.join(HERE, 'portnote_fields_w2.json'), 'w', encoding='utf-8'), indent=1)
    open(os.path.join(HERE, 'portnote_fields_w2.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(txt) + '\n')
    print('files:', len(res))


if __name__ == '__main__':
    main()
