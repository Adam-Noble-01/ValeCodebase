"""W2-99 - read-only: the Release Watermark rows Wave 2 carried, their class, VV release and packages, and which of their
packages are still to run (outside W0-W2). Writes wm_w2.txt."""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'W0-99'))
import ledger_lib as L                                  # noqa: E402

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

W2 = ['v2.24.0', 'v2.25.0', 'v2.27.0', 'v2.28.0', 'v2.30.2', 'v2.31.0', 'v2.32.0', 'v2.36.0', 'v2.37.0', 'v2.40.0',
      'v2.41.0', 'v2.42.0', 'v2.48.0', 'v2.48.1', 'v2.49.0', 'v2.55.0', 'v2.57.0', 'v2.58.2', 'v2.65.0', 'v2.70.0',
      'v2.75.0', 'v2.78.0', 'v2.80.0', 'v2.82.0', 'v2.84.0', 'v2.86.0', 'v2.87.0', 'v2.89.0', 'v2.90.0', 'v2.91.0',
      'v2.93.0', 'v2.94.0', 'v2.95.0', 'v2.96.0', 'v2.98.0', 'v2.100.0', 'v2.101.0', 'v2.102.0', 'v2.104.0',
      'v2.105.0', 'v2.106.0', 'v2.107.0', 'v2.108.0', 'v2.109.0', 'v2.111.0', 'v2.113.0', 'v2.114.0', 'v2.116.0',
      'v2.117.0', 'v2.118.0', 'v2.119.0', 'v2.120.0', 'v2.122.0', 'v2.123.0', 'v2.124.0', 'v2.126.0', 'v2.127.0',
      'v2.128.0', 'v2.129.0', 'v2.130.0', 'v2.131.0', 'v2.132.0', 'v2.134.0', 'v2.137.0', 'v2.138.0', 'v2.139.0',
      'v2.140.0', 'v2.141.0', 'v2.142.0', 'v2.143.0', 'v2.144.0', 'v2.147.0', 'v2.149.0', 'v2.150.0', 'v2.151.0',
      'v2.152.0', 'v2.153.0', 'v2.155.0', 'v2.157.0', 'v2.159.0', 'v2.160.0', 'v2.161.0', 'v2.162.0', 'v2.163.0',
      'v2.164.0']
DONE = re.compile(r'^W[012]-\d\d$')
SUPERSEDED = {'W0-07', 'W0-08', 'W0-10'}


def rows():
    lines = L.read_lines()
    i4 = lines.index('## 4. Release Watermark')
    i5 = lines.index('## 5. Decisions')
    out = {}
    for n in range(i4, i5):
        ln = lines[n]
        if not ln.startswith('| v2.') and not ln.startswith('| (unnumbered'):
            continue
        c = L.split_row(ln)
        out[c[0].split()[0]] = (n, c)
    return lines, out


def main():
    lines, wm = rows()
    txt = []
    for v in W2:
        if v not in wm:
            txt.append('=== %s NO ROW' % v)
            continue
        n, c = wm[v]
        pk = [p.strip() for p in c[6].split(',') if p.strip() and p.strip() != '-']
        left = [p for p in pk if not DONE.match(p) or p in SUPERSEDED]
        txt.append('=== %s L%d [%s] vv=%s | pk=%s | LEFT=%s' % (v, n + 1, c[4], c[5][:120], c[6], left))
        txt.append('    %s | %s' % (c[2][:110], c[10][:260]))
    open(os.path.join(HERE, 'wm_w2.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(txt) + '\n')
    print('\n'.join(txt))


if __name__ == '__main__':
    main()
