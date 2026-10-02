"""W1 gate: for every W1-touched path (crosscheck.json), is its LIVE hash (sha1 or sha256, first 8 hex) stated in some W1
Port Record or in a W1 package's scratch hash list (written.json, sha256__written.txt, *sha*.txt/json)? A live hash
that a record states means the file is exactly as its (last) writer recorded it. Read-only."""
import hashlib, json, os, re, sys

VCB = r'D:\10_CoreLib__ValeCodebase'
EXEC = os.path.join(VCB, r'WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution')
OUT = os.path.join(EXEC, 'scratch', 'W1-GATE')
PR = os.path.join(EXEC, 'port_records')
SCR = os.path.join(EXEC, 'scratch')
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

rows = json.load(open(os.path.join(OUT, 'crosscheck.json'), encoding='utf-8'))
recs = {fn[:-3]: open(os.path.join(PR, fn), encoding='utf-8', errors='replace').read().lower() for fn in os.listdir(PR) if fn.startswith('W1-') and fn.endswith('.md')}
# scratch hash lists of W1 packages (small text / json files whose name says sha / hash / written)
lists = {}
for d in os.listdir(SCR):
    if not d.startswith('W1-') or d == 'W1-GATE':
        continue
    for root, _, files in os.walk(os.path.join(SCR, d)):
        for fn in files:
            low = fn.lower()
            if (('sha' in low or 'hash' in low or 'written' in low or 'manifest' in low) and low.endswith(('.txt', '.json', '.log'))):
                fp = os.path.join(root, fn)
                if os.path.getsize(fp) < 3_000_000:
                    lists.setdefault(d, []).append(open(fp, encoding='utf-8', errors='replace').read().lower())

res = {'record': [], 'scratch': [], 'none': []}
for r in rows:
    if not r['touched_in_w1']:
        continue
    fp = os.path.join(VCB, *r['path'].split('/'))
    if not os.path.isfile(fp):
        res['none'].append((r['path'], 'MISSING', ''))
        continue
    b = open(fp, 'rb').read()
    s1, s256 = hashlib.sha1(b).hexdigest(), hashlib.sha256(b).hexdigest()
    who = [rid for rid, t in recs.items() if s1[:8] in t or s256[:8] in t]
    if who:
        res['record'].append((r['path'], ','.join(who), s1[:8]))
        continue
    who = [d for d, ts in lists.items() if any(s1[:12] in t or s256[:12] in t for t in ts)]
    if who:
        res['scratch'].append((r['path'], ','.join(who), s1[:8]))
    else:
        res['none'].append((r['path'], ','.join(r['w1_strict']) or '-', s1[:8] + ' / ' + s256[:8]))

print('W1-touched paths: live hash stated in a W1 Port Record %d; in a W1 scratch hash list %d; nowhere %d' % (len(res['record']), len(res['scratch']), len(res['none'])))
print('\n== live hash in a scratch hash list only ==')
for p, w, h in res['scratch']:
    print('  %s  <- %s  (%s)' % (p, w, h))
print('\n== live hash stated nowhere (owner by name) ==')
for p, w, h in res['none']:
    print('  %s  <- %s  (%s)' % (p, w, h))
json.dump(res, open(os.path.join(OUT, 'hash_attest.json'), 'w', encoding='utf-8', newline='\n'), indent=1)
