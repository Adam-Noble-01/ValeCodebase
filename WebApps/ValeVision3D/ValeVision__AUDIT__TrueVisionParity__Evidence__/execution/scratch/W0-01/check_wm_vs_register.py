"""Compare the working memory's section-2 DR table with decision_register.json defaults."""
import json, io, re, sys

ROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
reg = json.load(open(ROOT + r'\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\decision_register.json', encoding='utf-8'))
wm = io.open(ROOT + r'\ValeVision__WORKING_MEMORY__TrueVisionParity__.md', encoding='utf-8').read()

rows = {}
for line in wm.split('\n'):
    m = re.match(r'^\| (DR-\d\d) \| (.*?) \| (.*) \|$', line)
    if m:
        rows[m.group(1)] = (m.group(2).strip(), m.group(3).strip())

bad = 0
for r in reg:
    wm_title, wm_default = rows.get(r['dr_id'], (None, None))
    if wm_default != r['default_if_unanswered'].strip():
        bad += 1
        print('DEFAULT DIFFERS', r['dr_id'])
        print('  WM :', wm_default)
        print('  REG:', r['default_if_unanswered'])
    if wm_title != r['title'].strip():
        print('TITLE DIFFERS', r['dr_id'])
print('checked', len(reg), 'DRs; WM rows', len(rows), '; default mismatches', bad)
