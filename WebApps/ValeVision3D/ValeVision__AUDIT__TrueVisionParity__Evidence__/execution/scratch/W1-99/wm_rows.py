"""W1-99: print the Release Watermark rows (section 4 of the ledger) for the given TrueVision versions. Read-only.

Usage: python -B wm_rows.py v2.24.0 v2.25.0 ...   (no argument: every version Wave 1 named)
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'W0-99'))
import ledger_lib as L                                  # noqa: E402

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

W1 = ['v2.24.0', 'v2.25.0', 'v2.32.0', 'v2.38.1', 'v2.39.0', 'v2.42.0', 'v2.48.0', 'v2.49.0', 'v2.50.0', 'v2.56.0',
      'v2.61.0', 'v2.64.0', 'v2.69.0', 'v2.71.0', 'v2.74.0', 'v2.80.0', 'v2.81.0', 'v2.82.0', 'v2.83.0', 'v2.84.0',
      'v2.86.0', 'v2.87.0', 'v2.88.0', 'v2.89.0', 'v2.90.0', 'v2.91.0', 'v2.94.0', 'v2.95.0', 'v2.100.0', 'v2.101.0',
      'v2.103.0', 'v2.106.0', 'v2.107.0', 'v2.110.0', 'v2.111.0', 'v2.112.0', 'v2.113.0', 'v2.114.0', 'v2.115.0',
      'v2.116.0', 'v2.119.0', 'v2.120.0', 'v2.121.0', 'v2.123.0', 'v2.124.0', 'v2.126.0', 'v2.129.0', 'v2.130.0',
      'v2.136.0', 'v2.138.0', 'v2.139.0', 'v2.140.0', 'v2.143.0', 'v2.145.0', 'v2.146.0', 'v2.147.0', 'v2.150.0',
      'v2.152.0', 'v2.155.0', 'v2.156.0', 'v2.158.0', 'v2.160.0', 'v2.164.0', 'v2.166.0']
want = sys.argv[1:] or W1
lines = L.read_lines()
i4 = lines.index('## 4. Release Watermark')
i5 = lines.index('## 5. Decisions')
found = {}
for n in range(i4, i5):
    ln = lines[n]
    if not ln.startswith('| v2.'):
        continue
    c = L.split_row(ln)
    ver = c[0].split()[0]
    if ver in want:
        found[ver] = (n + 1, c)
for v in want:
    if v not in found:
        print('=== %s: NO ROW' % v)
        continue
    n, c = found[v]
    print('=== %s (line %d) | %s | class %s | VV %s | pk %s | dec %s' % (v, n, c[2][:70], c[4], c[5][:150], c[6], c[7]))
    print('    notes: %s' % c[10][:1500])
