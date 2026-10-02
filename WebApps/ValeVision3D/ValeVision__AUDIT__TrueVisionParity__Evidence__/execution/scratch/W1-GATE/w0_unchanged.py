"""W1 gate: the W0 paths that the crosscheck classed "untouched in W1" (mtime before the W0 checkpoint) - are they still
byte-for-byte the W0 checkpoint's state? Tracked files: today's `git diff HEAD --binary -M` section for the file equals
the W0 checkpoint patch's section (keyed by its 'diff --git' header). New (untracked) files: bytes equal the copy in the
W0 checkpoint zip. Also lists W1-touched W0 paths with what changed (for the record). Read-only (git diff only)."""
import json, os, re, subprocess, sys, zipfile

VCB = r'D:\10_CoreLib__ValeCodebase'
EXEC = os.path.join(VCB, r'WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution')
OUT = os.path.join(EXEC, 'scratch', 'W1-GATE')
CP = os.path.join(EXEC, 'checkpoints', 'W0__20261001-2225')
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

rows = json.load(open(os.path.join(OUT, 'crosscheck.json'), encoding='utf-8'))
w0_rows = [r for r in rows if r['in_w0_checkpoint']]


def sections(blob):
    out = {}
    parts = re.split(rb'(?m)^(?=diff --git )', blob)
    for p in parts:
        if p.startswith(b'diff --git '):
            head = p.split(b'\n', 1)[0]
            out[head] = p
    return out


w0_patch = open(CP + '.patch', 'rb').read()
w0_sec = sections(w0_patch)
# today's diff for exactly the W0 checkpoint's sides (as checkpoint.py builds them)
names = subprocess.run(['git', '-C', VCB, 'diff', 'HEAD', '--name-status', '-M'], capture_output=True, text=True, encoding='utf-8').stdout.splitlines()
w0_tracked = set(r['path'] for r in w0_rows if r['code'] != '??')
sides = set()
for n in names:
    parts = n.split('\t')
    if any(p in w0_tracked for p in parts[1:]):
        sides.update(parts[1:])
now_patch = subprocess.run(['git', '-C', VCB, 'diff', 'HEAD', '--binary', '-M', '--'] + sorted(sides), capture_output=True).stdout
now_sec = sections(now_patch)

zf = zipfile.ZipFile(CP + '__new.zip')
znames = set(zf.namelist())

same, changed, missing = [], [], []
for r in w0_rows:
    p = r['path']
    if r['code'] == '??':
        if p not in znames:
            missing.append((p, 'not in W0 zip'))
            continue
        live = open(os.path.join(VCB, *p.split('/')), 'rb').read()
        (same if live == zf.read(p) else changed).append((p, r['touched_in_w1']))
    else:
        keys = [k for k in now_sec if (b' b/' + p.encode('utf-8')) in k]
        if not keys:
            missing.append((p, 'no current diff section'))
            continue
        k = keys[0]
        if k not in w0_sec:
            missing.append((p, 'header not in W0 patch: ' + k.decode('utf-8', 'replace')[:120]))
            continue
        (same if now_sec[k] == w0_sec[k] else changed).append((p, r['touched_in_w1']))

untouched_changed = [p for p, t in changed if not t]
touched_same = [p for p, t in same if t]
print('W0 checkpoint paths still dirty: %d; equal to the W0 checkpoint: %d; changed since: %d; not comparable: %d' % (len(w0_rows), len(same), len(changed), len(missing)))
print('changed since W0 but mtime says untouched in W1 (would be a defect): %d %s' % (len(untouched_changed), untouched_changed))
print('mtime says touched in W1 but content equal to W0 (rewritten with the same bytes): %d %s' % (len(touched_same), touched_same))
print('\n== W0 paths changed in W1 ==')
for p, t in changed:
    print('  ' + p)
print('\n== not comparable ==')
for p, why in missing:
    print('  %s  (%s)' % (p, why))
