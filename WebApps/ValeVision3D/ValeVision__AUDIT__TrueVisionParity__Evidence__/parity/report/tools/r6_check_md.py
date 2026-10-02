#!/usr/bin/env python3
"""R6 - structural checks on the Section F markdown (read-only).

1. Every table row has the same number of cells as its header (GFM: an unescaped '|'
   splits a cell even inside a code span).
2. Code fences balance (``` and ````), and no table row sits inside a fence by accident.
3. Every package id named in the catalogue exists in wp_canonical.json and every
   package appears exactly once as a catalogue row.
4. Every DR id cited exists in decision_register.json.
5. No emoji or non-ASCII arrows.
"""
import json
import os
import re
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.dirname(TOOLS)
PARITY = os.path.dirname(REPORT)
MD = os.path.join(REPORT, 'R6__F_SwarmDelegationPlan.md')

text = open(MD, encoding='utf-8').read()
lines = text.split('\n')
errors = []


def cells(row):
    # split on unescaped pipes
    parts = re.split(r'(?<!\\)\|', row)
    return len(parts) - 2  # leading and trailing empties


fence = None
table_cols = None
for i, ln in enumerate(lines, 1):
    m = re.match(r'^(`{3,})', ln)
    if m:
        tick = m.group(1)
        if fence is None:
            fence = tick
        elif tick == fence:
            fence = None
        continue
    if fence:
        continue
    if ln.startswith('|'):
        n = cells(ln)
        if table_cols is None:
            table_cols = n
        elif re.match(r'^\|(\s*:?-+:?\s*\|)+\s*$', ln):
            if n != table_cols:
                errors.append('line %d: separator has %d cells, header %d' % (i, n, table_cols))
        elif n != table_cols:
            errors.append('line %d: %d cells, header %d: %s' % (i, n, table_cols, ln[:120]))
    else:
        table_cols = None
if fence:
    errors.append('unclosed code fence ' + fence)

canon = json.load(open(os.path.join(PARITY, 'data', 'wp_canonical.json'), encoding='utf-8'))
ids = {p['wp_id'] for p in canon['packages']}
rows = re.findall(r'(?m)^\| (W[0-6T]-\d\d) \| ', text)
cat_start = text.index('### F.3 Work-package catalogue')
cat_end = text.index('### F.4 Hot-file ownership')
cat_rows = re.findall(r'(?m)^\| (W[0-6T]-\d\d) \| ', text[cat_start:cat_end])
missing = ids - set(cat_rows)
dupes = {x for x in cat_rows if cat_rows.count(x) > 1}
if missing:
    errors.append('catalogue missing: %s' % sorted(missing))
if dupes:
    errors.append('catalogue duplicates: %s' % sorted(dupes))
named = set(re.findall(r'\b(W[0-6T]-\d\d)\b', text))
# The package F.8 proposed (r6_corrections.PROPOSED_ID, W5-07) is in wp_canonical.json since H2 (01-Oct-2026).
sys.path.insert(0, TOOLS)
import r6_corrections  # noqa: E402
proposed = set() if getattr(r6_corrections, 'PROPOSED_APPLIED', None) else {r6_corrections.PROPOSED_ID}
unknown = named - ids - proposed
if unknown:
    errors.append('unknown package ids cited: %s' % sorted(unknown))
if proposed & ids:
    errors.append('proposed id %s now exists in wp_canonical.json: set r6_corrections.PROPOSED_APPLIED' % sorted(proposed & ids))
if not proposed and r6_corrections.PROPOSED_ID not in ids:
    errors.append('r6_corrections.PROPOSED_APPLIED is set but %s is not in wp_canonical.json' % r6_corrections.PROPOSED_ID)
print('proposed package ids cited (not yet in wp_canonical.json):', sorted(proposed & named))

drs = {d['dr_id'] for d in json.load(open(os.path.join(PARITY, 'data', 'decision_register.json'), encoding='utf-8'))}
cited = set(re.findall(r'\bDR-\d\d\b', text))
bad = cited - drs
if bad:
    errors.append('unknown DR ids: %s' % sorted(bad))

nonascii = sorted({ch for ch in text if ord(ch) > 127})
if nonascii:
    errors.append('non-ASCII characters: %s' % ''.join(nonascii))

print('catalogue rows:', len(cat_rows), 'of', len(ids))
print('DR ids cited:', len(cited))
if errors:
    print('FAIL')
    for e in errors[:60]:
        print(' ', e)
    sys.exit(1)
print('PASS')
