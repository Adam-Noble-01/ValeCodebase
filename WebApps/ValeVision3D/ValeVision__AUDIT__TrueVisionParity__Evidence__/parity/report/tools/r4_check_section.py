# R4 helper: validate R4__D_BroaderUiParity.md - table column counts, ASCII only, and that every
# canonical wp id (W0-xx..W6-xx, WT-xx), DR id and finding id it cites exists in the canonical data.
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.join(HERE, '..', 'R4__D_BroaderUiParity.md')
DATA = os.path.join(HERE, '..', '..', 'data')

text = open(REPORT, encoding='utf-8').read()
lines = text.split('\n')

# 1. tables
problems = 0
table = None
for i, line in enumerate(lines, 1):
    s = line.strip()
    if s.startswith('|'):
        n = s.replace('\\' + '|', '').count('|')
        if table is None:
            table = (i, n)
        elif n != table[1]:
            print(f'TABLE line {i}: {n} pipes vs {table[1]} (table starts {table[0]})')
            problems += 1
    else:
        table = None

# 2. ascii
non_ascii = [(i, ch) for i, l in enumerate(lines, 1) for ch in l if ord(ch) > 127]

# 3. ids
wps = {p['wp_id'] for p in json.load(open(os.path.join(DATA, 'wp_canonical.json'), encoding='utf-8'))['packages']}
drs = {d['dr_id'] for d in json.load(open(os.path.join(DATA, 'decision_register.json'), encoding='utf-8'))}
finds = {f['id'] for f in json.load(open(os.path.join(DATA, 'findings_verified.json'), encoding='utf-8'))}

cited_wp = set(re.findall(r'\b(W[0-6]-\d{2}|WT-\d{2})\b', text))
cited_dr = set(re.findall(r'\bDR-\d{2}\b', text))
cited_f = set(re.findall(r'\b(S\d{2}[ab]?-[FV]\d{2})\b', text))

missing_wp = sorted(cited_wp - wps)
missing_dr = sorted(cited_dr - drs)
missing_f = sorted(cited_f - finds)

print('lines', len(lines), '| table problems', problems, '| non-ascii', len(non_ascii))
print('wp cited', len(cited_wp), 'missing', missing_wp)
print('DR cited', len(cited_dr), 'missing', missing_dr)
print('findings cited', len(cited_f), 'missing', missing_f)
