"""W1-99: for each TrueVision release Wave 1 touched, the files its devlog entry names (the audit's release_rows_final.json)
and, for each, whether ValeVision has the file now and whether a W1 package touched it. Read-only.

Usage: python -B release_files.py [v2.38.1 ...]
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
R = os.path.join(VV, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\report\tools\r5work\release_rows_final.json')
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

rows = {r['ver']: r for r in json.load(open(R, encoding='utf-8'))}
w1 = json.load(open(os.path.join(HERE, 'w1_files.json'), encoding='utf-8'))
touched = {o['path'][len('WebApps/ValeVision3D/'):]: '/'.join(o['owners']) for o in w1}
want = sys.argv[1:] or W1
for v in want:
    r = rows.get(v)
    if not r:
        print('=== %s: no row' % v)
        continue
    print('=== %s %s | %s | wps %s' % (v, r['date'], r['cls'], ','.join(r['wps'])))
    for f in r['files']:
        exists = os.path.exists(os.path.join(VV, *f.split('/')))
        print('    %-4s %-8s %s' % ('VV' if exists else '-', touched.get(f, ''), f))
