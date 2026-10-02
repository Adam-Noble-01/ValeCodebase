"""W0-99 - read-only: the Release Watermark rows for every TV release a Wave 0 Port Record names."""
import re, sys
import ledger_lib as L

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

W0_RELEASES = ['v2.24.0', 'v2.30.2', 'v2.32.1', 'v2.36.0', 'v2.39.0', 'v2.54.0', 'v2.63.0', 'v2.67.0', 'v2.71.0',
               'v2.74.0', 'v2.75.0', 'v2.77.0', 'v2.78.0', 'v2.79.0', 'v2.81.0', 'v2.88.0', 'v2.94.0', 'v2.95.0',
               'v2.104.0', 'v2.106.0', 'v2.107.0', 'v2.109.0', 'v2.111.0', 'v2.112.0', 'v2.113.0', 'v2.114.0',
               'v2.115.0', 'v2.116.0', 'v2.117.0', 'v2.118.0', 'v2.119.0', 'v2.122.0', 'v2.123.0', 'v2.127.0',
               'v2.130.0', 'v2.131.0', 'v2.135.0', 'v2.136.0', 'v2.138.0', 'v2.139.0', 'v2.139.1', 'v2.140.0',
               'v2.141.0', 'v2.142.0', 'v2.143.0', 'v2.144.0', 'v2.146.0', 'v2.147.0', 'v2.149.0', 'v2.151.0',
               'v2.155.0', 'v2.157.0', 'v2.158.0', 'v2.163.0']


def watermark_rows(lines):
    out, in4 = [], False
    for i, ln in enumerate(lines):
        if ln.startswith('## 4. Release Watermark'):
            in4 = True
            continue
        if in4 and ln.startswith('## 5. '):
            break
        if in4 and ln.startswith('| v2.'):
            cells = L.split_row(ln)
            if len(cells) != 12:
                raise SystemExit('watermark row with %d cells at %d' % (len(cells), i + 1))
            out.append({'i': i, 'cells': cells, 'ver': cells[0].split()[0]})
    return out


if __name__ == '__main__':
    lines = L.read_lines()
    rows = watermark_rows(lines)
    print('watermark rows:', len(rows))
    by = {}
    for r in rows:
        by.setdefault(r['ver'], []).append(r)
    for v in W0_RELEASES:
        for r in by.get(v, []):
            c = r['cells']
            print('%-10s L%-5d %-22s | VV %-24s | pk %s' % (v, r['i'] + 1, c[4], c[5][:24], c[6][:70]))
            print('           title: %s' % c[2][:110])
            print('           notes: %s' % c[10][:260])
        if v not in by:
            print('%-10s (no row)' % v)
