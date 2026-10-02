#!/usr/bin/env python3
"""H2 - classify every difference between Section F before H2 (R6__F_SwarmDelegationPlan.pre_h2.md) and now.

Read-only. Fails (exit 1) on any change it cannot explain:
  * F.3: a catalogue row may change only in the hot-file positions of files whose editors H2 changed
    (C20, C33), W0-03's size (C12: 16 files -> XL), W5-99's dependency count (C33) and W2-05's new hot
    file (C20); W5-07's row is new; every other cell must be byte-identical (the overlay text and the
    JSON text are the same words);
  * F.8: every row keeps its text and only gains its '<br>' status line; the intro paragraph is rewritten;
  * every other changed line is listed by section, with a per-section allow-list of expected sections.
"""
import collections
import difflib
import json
import os
import re
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.dirname(TOOLS)
DATA = os.path.join(os.path.dirname(REPORT), 'data')
OLD = os.path.join(REPORT, 'R6__F_SwarmDelegationPlan.pre_h2.md')
NEW = os.path.join(REPORT, 'R6__F_SwarmDelegationPlan.pre_h1.md')   # H2's own output, kept by H1 (which changed R6 after it)
PIPE = re.compile(r'(?<!\\)\|')
ROW = re.compile(r'^\| (W[0-6T]-\d\d) \| ')
CROW = re.compile(r'^\| (C\d+) \| ')

old_t = open(OLD, encoding='utf-8').read()
new_t = open(NEW, encoding='utf-8').read()
errors, notes = [], []

hot_pre = json.load(open(os.path.join(DATA, 'hot_file_ownership.pre_h2.json'), encoding='utf-8'))
hot_new = json.load(open(os.path.join(DATA, 'hot_file_ownership.json'), encoding='utf-8'))
HP = {h['file']: h for h in hot_pre['files']}
HN = {h['file']: h for h in hot_new['files']}
CHANGED_HOT = {f for f in HN if HP.get(f) != HN[f]}
CHANGED_BASE = {f.split('/')[-1] for f in CHANGED_HOT}
NEW_OP_MARKS = ('[F.8 C2]', '[F.8 C6]')      # row ops defined by H2; F.3 shows C6 (W0-01 acceptance item 3)


def block(t, start, end):
    s = t.index(start)
    e = t.index(end, s)
    return t[s:e]


def rows(text, rx):
    out = collections.OrderedDict()
    for line in text.split('\n'):
        m = rx.match(line)
        if m:
            out[m.group(1)] = PIPE.split(line)[1:-1]
    return out


# ------------------------------------------------------------------------------------------- F.3
COLS = ['ID', 'Title', 'Sources and targets', 'Hot files', 'Depends on', 'Gated by', 'Size', 'Acceptance', 'Tests']
A = rows(block(old_t, '### F.3 Work-package catalogue', '### F.4 Hot-file ownership'), ROW)
B = rows(block(new_t, '### F.3 Work-package catalogue', '### F.4 Hot-file ownership'), ROW)
f3 = collections.Counter()
if set(B) - set(A) != {'W5-07'} or set(A) - set(B):
    errors.append('F.3 rows added %s removed %s (expected only W5-07 added)' % (sorted(set(B) - set(A)), sorted(set(A) - set(B))))
for w in A:
    if w not in B:
        continue
    for i, (x, y) in enumerate(zip(A[w], B[w])):
        if x == y:
            continue
        col = COLS[i]
        xs = [s.strip() for s in x.split('<br>')]
        ys = [s.strip() for s in y.split('<br>')]
        gone = [s for s in xs if s not in ys]
        came = [s for s in ys if s not in xs]
        ok = False
        if col == 'Hot files':
            ok = all(any(b in s for b in CHANGED_BASE) for s in gone + came)
        elif col == 'Size' and w == 'W0-03':
            ok = x.strip() == 'S (60)' and y.strip() == 'XL (60)'
        elif col == 'Depends on' and w == 'W5-99':
            # six dependencies were listed by name; seven print as the summary form
            ok = x.strip() == 'W5-01, W5-02, W5-03, W5-04, W5-05, W5-06' and y.strip() == 'every package of W5 (7)'
        if not ok and came and all(any(m in s for m in NEW_OP_MARKS) for s in came) and len(gone) == len(came):
            ok = True                    # a row op H2 added (the old overlay never displayed it)
        if ok:
            f3[(col, w)] += 1
        else:
            errors.append('F.3 %s %s changed unexpectedly: - %s + %s' % (w, col, gone[:3], came[:3]))
notes.append('F.3: W5-07 row added; derived cell changes: %s' % ', '.join('%s %s' % (w, c) for (c, w) in sorted(f3)))

# ------------------------------------------------------------------------------------------- F.8
A8 = rows(old_t[old_t.index('### F.8 Corrections to K3'):], CROW)       # F.8 is the last section
B8 = rows(new_t[new_t.index('### F.8 Corrections to K3'):], CROW)
if list(A8) != list(B8) or len(B8) != 33:
    errors.append('F.8 rows differ: %s vs %s' % (list(A8), list(B8)))
for c in A8:
    a, b = A8[c], B8.get(c)
    if b is None:
        continue
    if a[:4] != b[:4]:
        errors.append('F.8 %s: id, item, finding or evidence changed' % c)
    head, sep, status = b[4].rpartition('<br>')
    if head.strip() != a[4].strip() or not sep:
        errors.append('F.8 %s: the applied cell changed beyond its status line' % c)
    if not (status.strip().startswith('Applied to `wp_canonical.json` on 01-Oct-2026')
            or status.strip().startswith('Nothing to apply to `wp_canonical.json` (checked 01-Oct-2026)')):
        errors.append('F.8 %s: no status line' % c)
notes.append('F.8: %d rows kept verbatim, each with a status line appended' % len(B8))

# ------------------------------------------------------------------------------- every other changed line
EXPECTED = {
    '## Section F - Swarm Delegation Plan': 'intro (165 packages; the JSON carries F.8) and the headline (W5-07 counted; sizing figure computed)',
    '#### F.2.1': 'programme flow: W5 8 packages / 2,590 lines; D4 edge names W5-07',
    '#### F.2.2': 'wave summary: W0 sizes (W0-03 XL), W5 row',
    '#### F.2.3': 'sizing table W5 and totals; reading sentence (two agents 57%)',
    '#### F.2.4': 'dispatch levels: W5-07 added to W5',
    '#### F.2.5': 'critical path: W5 path and totals',
    '#### F.2.6': 'DAG intro (W5-07 held) and the W5 diagram',
    '### F.3': 'convention bullet: the JSON carries the corrections',
    '#### W0 -': 'catalogue W0 (derived cells only, checked above)',
    '#### W1 -': 'catalogue W1 (derived cells only, checked above)',
    '#### W2 -': 'catalogue W2 (derived cells only, checked above)',
    '#### W3 -': 'catalogue W3 (derived cells only, checked above)',
    '#### W4 -': 'catalogue W4 (derived cells only, checked above)',
    '#### W5 -': 'catalogue W5: W5-07 row, derived cells, the proposed-package paragraph removed',
    '### F.4 Hot-file': 'hot-file intro counts (93)',
    '#### F.4.2': 'lock protocol step 6: six held packages, W5-07 named',
    '#### F.4.3': 'hubs: ModeController, LE AppConfig, Loader gain W5-07',
    '#### F.4.4': 'hot files: the elevation data module added; six files gain W5-07',
    '#### F.5.2': 'wave gates W4 and W5: W5-07 no longer "proposed"',
    '#### F.5.4': 'smoke W5 item 3: W5-07 no longer "proposed"',
    '## 2. Inputs': 'W1-33 brief section 2: the F.8 line now says the JSON carries C22',
    '## 3. Files you own': 'W1-33 brief turn cells: ModeController and Loader list W5-07 among later editors',
    '#### F.7.1': 'effort per wave: W0 and W5 rows and totals',
    '#### F.7.2': 'risks RK-08 (hub editor counts), RK-25 (W5-07), RK-27 (now mitigated)',
    '### F.8 Corrections': 'intro rewritten; status line on every row (checked above)',
}


def sections(lines):
    out, cur = [], '(top)'
    for line in lines:
        if line.startswith('#') and not line.startswith('# '):
            cur = line
        out.append(cur)
    return out


a_lines, b_lines = old_t.split('\n'), new_t.split('\n')
sa, sb = sections(a_lines), sections(b_lines)
per = collections.Counter()
sm = difflib.SequenceMatcher(a=a_lines, b=b_lines, autojunk=False)
for op, i1, i2, j1, j2 in sm.get_opcodes():
    if op == 'equal':
        continue
    for j in range(j1, j2):
        per[sb[j]] += 1
    for i in range(i1, i2):
        per[sa[i]] += 0          # counted on the new side; keep the key
unexpected = [s for s in per if not any(s.startswith(k) for k in EXPECTED)]
for s in unexpected:
    errors.append('changed lines in an unexpected section: %s' % s[:80])
removed = sum(i2 - i1 for op, i1, i2, j1, j2 in sm.get_opcodes() if op != 'equal')
added = sum(j2 - j1 for op, i1, i2, j1, j2 in sm.get_opcodes() if op != 'equal')

print('R6 before H2: %d lines; after: %d lines; %d lines replaced or removed, %d written' % (len(a_lines), len(b_lines), removed, added))
for s, n in per.items():
    key = next((k for k in EXPECTED if s.startswith(k)), None)
    print('  %3d  %-60s %s' % (n, s[:60], EXPECTED.get(key, '?')))
for n in notes:
    print('NOTE', n)
for e in errors:
    print('FAIL', e)
print('PASS' if not errors else 'FAIL (%d)' % len(errors))
sys.exit(1 if errors else 0)
