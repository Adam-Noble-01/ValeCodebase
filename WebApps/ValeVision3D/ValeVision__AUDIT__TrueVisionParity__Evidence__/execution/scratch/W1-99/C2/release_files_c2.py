"""W1-99 (continuation): for each TrueVision release the continuation's Port Records name, the files its devlog entry names
(the audit's release_rows_final.json), and for each file whether ValeVision has it now, which part-1 package touched it
(scratch/W1-99/w1_files.json) and which continuation package touched it (the W1 gate's crosscheck_c2.json); plus the
watermark row's current class and VV release cell from the ledger. Read-only.

Usage: python -B release_files_c2.py [v2.38.0 ...]
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'W0-99'))
import ledger_lib as L                                  # noqa: E402

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
R = os.path.join(VV, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\report\tools\r5work\release_rows_final.json')
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
CONT = ['v2.32.0', 'v2.36.0', 'v2.38.0', 'v2.39.0', 'v2.40.0', 'v2.41.0', 'v2.42.0', 'v2.48.0', 'v2.49.0', 'v2.52.0',
        'v2.53.0', 'v2.54.0', 'v2.58.2', 'v2.61.0', 'v2.61.1', 'v2.63.0', 'v2.69.0', 'v2.70.0', 'v2.71.0', 'v2.72.0',
        'v2.75.0', 'v2.79.0', 'v2.81.0', 'v2.89.0', 'v2.90.0', 'v2.91.0', 'v2.93.0', 'v2.94.0', 'v2.95.0', 'v2.100.0',
        'v2.104.0', 'v2.106.0', 'v2.109.0', 'v2.111.0', 'v2.112.0', 'v2.114.0', 'v2.115.0', 'v2.116.0', 'v2.120.0',
        'v2.121.0', 'v2.123.0', 'v2.124.0', 'v2.125.0', 'v2.126.0', 'v2.127.0', 'v2.130.0', 'v2.133.0', 'v2.135.0',
        'v2.136.0', 'v2.137.0', 'v2.138.0', 'v2.139.0', 'v2.140.0', 'v2.141.0', 'v2.142.0', 'v2.143.0', 'v2.144.0',
        'v2.145.0', 'v2.146.0', 'v2.147.0', 'v2.148.0', 'v2.150.0', 'v2.152.0', 'v2.154.0', 'v2.155.0']


def wm_rows():
    lines = L.read_lines()
    i4 = lines.index('## 4. Release Watermark')
    i5 = lines.index('## 5. Decisions')
    out = {}
    for n in range(i4, i5):
        ln = lines[n]
        if ln.startswith('| v2.'):
            c = L.split_row(ln)
            out[c[0].split()[0]] = c
    return out


def main():
    rows = {r['ver']: r for r in json.load(open(R, encoding='utf-8'))}
    w1 = json.load(open(os.path.join(HERE, '..', 'w1_files.json'), encoding='utf-8'))
    t1 = {o['path'][len('WebApps/ValeVision3D/'):]: '/'.join(o['owners']) for o in w1}
    cc = json.load(open(os.path.join(L.EXEC, 'scratch', 'W1-GATE', 'C2', 'crosscheck_c2.json'), encoding='utf-8'))
    t2 = {o['path'][len('WebApps/ValeVision3D/'):]: '/'.join(o.get('strict_cont') or []) for o in cc
          if o.get('touched_in_cont')}
    wm = wm_rows()
    want = sys.argv[1:] or CONT
    for v in want:
        r = rows.get(v)
        c = wm.get(v)
        head = ('class %s | VV %s | pk %s' % (c[4], c[5][:160], c[6])) if c else 'no watermark row'
        if not r:
            print('=== %s: no release row | %s' % (v, head))
            continue
        print('=== %s %s | %s | %s' % (v, r['date'], head, r.get('title', '')[:90]))
        for f in r['files']:
            exists = os.path.exists(os.path.join(VV, *f.split('/')))
            print('    %-3s %-14s %-14s %s' % ('VV' if exists else '-', t1.get(f, ''), t2.get(f, ''), f.replace('02__Src__AppModules/', '')))


if __name__ == '__main__':
    main()
