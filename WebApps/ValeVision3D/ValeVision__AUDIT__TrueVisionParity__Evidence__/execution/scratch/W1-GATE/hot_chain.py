"""W1 gate: for every file written by more than one package in W1 (per hot_file_ownership.json, plus the multi-owner
paths the crosscheck found), list the W1 editors in their serial order, which of them actually ran (DONE) and the live
SHA-1 / size / line ending, and print each W1 Port Record line that names the file with a sha (to compare with the
last editor's recorded final state). Read-only."""
import hashlib, json, os, re, sys

VCB = r'D:\10_CoreLib__ValeCodebase'
VVR = os.path.join(VCB, r'WebApps\ValeVision3D')
EXEC = os.path.join(VVR, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\execution')
DATA = os.path.join(VVR, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data')
PR = os.path.join(EXEC, 'port_records')
OUT = os.path.join(EXEC, 'scratch', 'W1-GATE')
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

DONE = set('W1-01 W1-02 W1-03 W1-04 W1-05 W1-08 W1-09 W1-10 W1-11 W1-12 W1-13 W1-14 W1-15 W1-16 W1-18 W1-23 W1-24 W1-29 W1-30 W1-31 W1-32 W1-33 W1-34 W1-35'.split())
PARTIAL = {'W1-06', 'W1-17'}


def norm(p):
    p = p.strip().split(' ')[0].replace('\\', '/')
    for a, b in (('VVM/', 'WebApps/ValeVision3D/02__Src__AppModules/'), ('LE/', 'WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/'),
                 ('VV/', 'WebApps/ValeVision3D/'), ('WCP/', 'WebApps/Whitecardopedia/'), ('VCB/', '')):
        if p.startswith(a):
            return b + p[len(a):]
    return p


hot = json.load(open(os.path.join(DATA, 'hot_file_ownership.json'), encoding='utf-8'))['files']
cross = json.load(open(os.path.join(OUT, 'crosscheck.json'), encoding='utf-8'))
recs = {fn[:-3]: open(os.path.join(PR, fn), encoding='utf-8', errors='replace').read().replace('\\', '/') for fn in os.listdir(PR) if fn.startswith('W1-') and fn.endswith('.md')}

targets = {}
for h in hot:
    if 'W1' in h['waves']:
        order = []
        for so in h['same_wave_serial_orders']:
            if so['wave'] == 'W1':
                order = so['serial_order']
        if not order:
            order = [e for e in h['editors'] if e.startswith('W1-')]
        targets[norm(h['file'])] = {'order': order, 'rule': h['rule'], 'editors': h['editors']}
for r in cross:
    if r['touched_in_w1'] and len(r['w1_strict']) > 1 and r['path'] not in targets:
        targets[r['path']] = {'order': r['w1_strict'], 'rule': '(crosscheck: several W1 records name it)', 'editors': r['w1_strict']}

for path in sorted(targets):
    t = targets[path]
    full = os.path.join(VCB, *path.split('/'))
    print('=' * 110)
    print(path)
    print('   rule  :', t['rule'])
    print('   W1 serial order:', ' -> '.join('%s(%s)' % (e, 'done' if e in DONE else 'PARTIAL' if e in PARTIAL else 'not run') for e in t['order']))
    if os.path.isfile(full):
        b = open(full, 'rb').read()
        crlf = b.count(b'\r\n')
        lf = b.count(b'\n') - crlf
        print('   live  : sha1 %s  sha256 %s  %d bytes  CRLF %d / LF %d  mtime %s' % (hashlib.sha1(b).hexdigest()[:12], hashlib.sha256(b).hexdigest()[:16], len(b), crlf, lf,
              __import__('datetime').datetime.fromtimestamp(os.path.getmtime(full)).strftime('%d-%b %H:%M:%S')))
    else:
        print('   live  : MISSING')
        continue
    base = path.rsplit('/', 1)[-1]
    for rid in sorted(recs):
        hits = []
        for i, ln in enumerate(recs[rid].split('\n'), 1):
            if base in ln or (hits and i == hits[-1][0] + 1):
                if re.search(r'sha|->|bytes', ln, re.I):
                    hits.append((i, ln.strip()))
        for i, ln in hits[:6]:
            print('   %s:%d  %s' % (rid, i, ln[:230]))
