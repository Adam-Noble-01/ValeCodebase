"""W1 gate (continuation): every hot file (hot_file_ownership.json) whose W1 serial order names a continuation package,
plus every file several continuation records name. For each: the W1 serial order with each editor's state, the live
SHA-1 / SHA-256 / size / line ending / mtime, and which continuation Port Record states the live hash (that record's
package must be the last editor that ran). Read-only. Writes C2/hot_chain_c2.txt."""
import datetime, hashlib, json, os, re, sys

VCB = r'D:\10_CoreLib__ValeCodebase'
VVR = os.path.join(VCB, r'WebApps\ValeVision3D')
EXEC = os.path.join(VVR, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\execution')
DATA = os.path.join(VVR, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data')
PR = os.path.join(EXEC, 'port_records')
OUT = os.path.join(EXEC, 'scratch', 'W1-GATE', 'C2')
CONT = ['W1-07', 'W1-19', 'W1-20', 'W1-21', 'W1-22', 'W1-25', 'W1-26', 'W1-27', 'W1-28', 'W1-36', 'W1-37', 'W1-38']
PART1 = set('W1-01 W1-02 W1-03 W1-04 W1-05 W1-06 W1-08 W1-09 W1-10 W1-11 W1-12 W1-13 W1-14 W1-15 W1-16 W1-17 W1-18 W1-23 W1-24 W1-29 W1-30 W1-31 W1-32 W1-33 W1-34 W1-35'.split())
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


def norm(p):
    p = p.strip().split(' ')[0].replace('\\', '/')
    for a, b in (('VVM/', 'WebApps/ValeVision3D/02__Src__AppModules/'), ('LE/', 'WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/'),
                 ('VV/', 'WebApps/ValeVision3D/'), ('WCP/', 'WebApps/Whitecardopedia/'), ('VCB/', '')):
        if p.startswith(a):
            return b + p[len(a):]
    return p


def state(e):
    if e in CONT:
        return 'cont'
    if e in PART1:
        return 'W1a'
    return 'not run'


hot = json.load(open(os.path.join(DATA, 'hot_file_ownership.json'), encoding='utf-8'))['files']
cross = json.load(open(os.path.join(OUT, 'crosscheck_c2.json'), encoding='utf-8'))
recs = {rid: open(os.path.join(PR, rid + '.md'), encoding='utf-8', errors='replace').read().lower() for rid in CONT}
targets = {}
for h in hot:
    order = []
    for so in h.get('same_wave_serial_orders', []):
        if so['wave'] == 'W1':
            order = so['serial_order']
    if not order:
        order = [e for e in h['editors'] if e.startswith('W1-')]
    if any(e in CONT for e in order):
        targets[norm(h['file'])] = {'order': order, 'rule': h.get('rule', ''), 'editors': h['editors']}
for r in cross:
    if r['touched_in_cont'] and len(r['strict_cont']) > 1 and r['path'] not in targets:
        targets[r['path']] = {'order': r['strict_cont'], 'rule': '(several continuation records name it)', 'editors': r['strict_cont']}
L = []
for path in sorted(targets):
    t = targets[path]
    full = os.path.join(VCB, *path.split('/'))
    L.append(path)
    L.append('   W1 serial order: ' + ' -> '.join('%s(%s)' % (e, state(e)) for e in t['order']) + '   | all editors: ' + ', '.join(t['editors']))
    if not os.path.isfile(full):
        L.append('   live: ABSENT')
        continue
    b = open(full, 'rb').read()
    s1, s256 = hashlib.sha1(b).hexdigest(), hashlib.sha256(b).hexdigest()
    crlf = b.count(b'\r\n')
    lf = b.count(b'\n') - crlf
    who = [rid for rid, txt in recs.items() if s1[:8] in txt or s256[:8] in txt]
    L.append('   live: sha1 %s sha256 %s  %d B  CRLF %d / LF %d  mtime %s  | live hash stated by: %s' % (
        s1[:8], s256[:16], len(b), crlf, lf, datetime.datetime.fromtimestamp(os.path.getmtime(full)).strftime('%d-%b %H:%M:%S'), ','.join(who) or 'no continuation record'))
open(os.path.join(OUT, 'hot_chain_c2.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(L) + '\n')
print('\n'.join(L))
