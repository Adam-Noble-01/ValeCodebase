"""W1-99 (continuation): what the continuation's ledger pass changed in the Module Register (3.1-3.6) and the Release
Watermark (4), row by row, pre-image (C2/preimage_records) against the live file; plus the file-level checks (ASCII, pure
CRLF, the preamble and the Archive byte-identical). Read-only. Part 1's register_diff_stats.py, pointed at C2."""
import collections, os, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
NAME = 'ValeVision__PARITY__TrueVisionLedger__.md'


def cells(ln):
    return [c.strip() for c in ln.strip()[1:-1].split(' | ')]


def tables(text, start_head, stop_head):
    lines = text.split('\r\n')
    out, on, header = [], False, None
    for i, ln in enumerate(lines):
        if ln.startswith(start_head):
            on = True
        elif on and ln.startswith(stop_head):
            break
        if not on:
            continue
        if ln.startswith('| ') and i + 1 < len(lines) and lines[i + 1].startswith('|---'):
            header = cells(ln)
            continue
        if ln.startswith('|---'):
            continue
        if ln.startswith('| ') and header:
            out.append((tuple(header), ln))
        elif not ln.startswith('|'):
            header = header if ln.strip() == '' else None
    return out


preb = open(os.path.join(HERE, 'preimage_records', NAME), 'rb').read()
liveb = open(os.path.join(VV, NAME), 'rb').read()
pre, live = preb.decode('ascii'), liveb.decode('ascii')
print('ASCII: yes; pure CRLF: %s' % (liveb.count(b'\n') == liveb.count(b'\r\n')))
print('preamble identical: %s' % (pre[:pre.index('## 1. Header')] == live[:live.index('## 1. Header')]))
print('Archive identical: %s' % (pre[pre.index('## 9. Archive'):] == live[live.index('## 9. Archive'):]))
for label, a, b in (('register', '### 3.1 ', '### 3.7 '), ('watermark', '## 4. ', '## 5. ')):
    rp, rl = tables(pre, a, b), tables(live, a, b)
    print('%s: %d rows before, %d rows now' % (label, len(rp), len(rl)))
    if len(rp) != len(rl):
        print('  row counts differ - row-by-row comparison skipped')
        continue
    kinds = collections.Counter()
    for (hp, p), (hl, l) in zip(rp, rl):
        if p == l:
            continue
        cp, cl = cells(p), cells(l)
        diff = [hp[k] for k in range(min(len(cp), len(cl))) if cp[k] != cl[k]]
        kinds['only ' + diff[0] if len(diff) == 1 else 'several: ' + ', '.join(diff)] += 1
    print('  changed rows: %d' % sum(kinds.values()))
    for k, n in kinds.most_common():
        print('    %4d  %s' % (n, k))
