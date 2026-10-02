"""W1 gate: ignored files (git status --ignored) under WebApps/ValeVision3D and WebApps/Whitecardopedia modified after the
W0 checkpoint (01-Oct-2026 22:25:19) - by-products the crosscheck cannot see (node_modules, .claude, .wrangler skipped).
Also: the Whitecardopedia Projects folder of the reference project - anything written there during W1. Read-only."""
import datetime, os, subprocess, sys

VCB = r'D:\10_CoreLib__ValeCodebase'
CP = datetime.datetime(2026, 10, 1, 22, 25, 19).timestamp()
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
out = subprocess.run(['git', '-C', VCB, 'status', '--porcelain=v1', '--ignored', '--untracked-files=all', '--',
                      'WebApps/ValeVision3D', 'WebApps/Whitecardopedia'], capture_output=True, text=True, encoding='utf-8').stdout.splitlines()
ign = [l[3:].strip('"') for l in out if l.startswith('!! ')]
skip = ('/node_modules/', '/.claude/', '/.wrangler/')
hits = []
for p in ign:
    if any(s in '/' + p for s in skip):
        continue
    full = os.path.join(VCB, *p.rstrip('/').split('/'))
    if os.path.isdir(full):
        for root, dirs, files in os.walk(full):
            if any(s.strip('/') in root.replace('\\', '/').split('/') for s in skip):
                continue
            for fn in files:
                fp = os.path.join(root, fn)
                if os.path.getmtime(fp) > CP:
                    hits.append(fp)
    elif os.path.isfile(full) and os.path.getmtime(full) > CP:
        hits.append(full)
print('ignored entries: %d; ignored files modified after the W0 checkpoint: %d' % (len(ign), len(hits)))
for h in hits[:50]:
    print('  ' + h + '  ' + datetime.datetime.fromtimestamp(os.path.getmtime(h)).strftime('%d-%b %H:%M:%S'))
proj = os.path.join(VCB, r'WebApps\Whitecardopedia\Projects\2026\3047__Doous')
recent = []
for root, dirs, files in os.walk(proj):
    for fn in files:
        fp = os.path.join(root, fn)
        if os.path.getmtime(fp) > CP:
            recent.append(fp)
print('files under Projects/2026/3047__Doous modified after the W0 checkpoint: %d' % len(recent))
for r in recent[:20]:
    print('  ' + r + '  ' + datetime.datetime.fromtimestamp(os.path.getmtime(r)).strftime('%d-%b %H:%M:%S'))
