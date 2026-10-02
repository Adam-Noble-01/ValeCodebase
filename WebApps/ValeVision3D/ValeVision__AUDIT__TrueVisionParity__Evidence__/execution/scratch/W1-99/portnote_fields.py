"""W1-99: the PORT NOTE fields (Source version, Parity, Ported on, Legacy) and the newest DEVELOPMENT LOG heading of every
W1-touched file under 02__Src__AppModules (from w1_files.json). Read-only. Continuation lines of a field are joined.

Usage: python -B portnote_fields.py > portnote_fields.txt
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
FIELD = re.compile(r'^\s*(?://+|#+|\*|/\*+|<!--)?\s*-\s+([A-Z][A-Za-z][A-Za-z -]*?)\s*:\s?(.*)$')
CONT = re.compile(r'^\s*(?://+|#+|\*|/\*+|<!--)?\s{3,}(\S.*)$')
ENTRY = re.compile(r'^\s*(?://+|#+|\*|/\*+|<!--)?\s*(\d{1,2}-[A-Za-z]{3}-\d{4})\b\s*(.*)$')
w1 = json.load(open(os.path.join(HERE, 'w1_files.json'), encoding='utf-8'))
for o in w1:
    p = o['path']
    if not p.startswith('WebApps/ValeVision3D/02__Src__AppModules/') or p.endswith('.json'):
        continue
    full = os.path.join(r'D:\10_CoreLib__ValeCodebase', *p.split('/'))
    try:
        lines = open(full, encoding='utf-8', errors='replace').read().splitlines()
    except Exception:
        continue
    out, cur, in_pn, in_log, first_entry = {}, None, False, False, None
    for ln in lines[:400]:
        if re.search(r'PORT NOTE', ln) and ':' in ln and not in_pn:
            in_pn = True
            continue
        if re.search(r'DEVELOPMENT LOG', ln):
            in_log, in_pn, cur = True, False, None
            continue
        if in_pn:
            m = FIELD.match(ln)
            if m:
                cur = m.group(1).strip()
                out.setdefault(cur, m.group(2).strip())
                continue
            m = CONT.match(ln)
            if m and cur:
                out[cur] += ' ' + m.group(1).strip()
                continue
            if re.match(r'^\s*(?://+|\*|#)\s*[-=]{4,}', ln):
                in_pn, cur = False, None
        if in_log and first_entry is None:
            m = ENTRY.match(ln)
            if m:
                first_entry = (m.group(1) + ' ' + m.group(2)).strip()
    print('=' * 80)
    print(o['rel'] or p)
    for k in ('Source version', 'Parity', 'Ported on', 'Legacy', 'Twin', 'Authored in', 'Mirrors'):
        if k in out:
            print('  %-15s %s' % (k + ':', out[k][:400]))
    print('  %-15s %s' % ('Newest log:', first_entry))
