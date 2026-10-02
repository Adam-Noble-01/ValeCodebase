"""W1-99 (continuation) - read-only: TrueVision's devlog headings at the pin (git show b2aa9151:...), as version -> date,
written to tv_release_dates.json beside this script (versions and dates only; no TrueVision prose is kept).
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
raw = subprocess.run(['git', '-C', NAWEB, 'show', 'b2aa9151:na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'],
                     capture_output=True).stdout.decode('utf-8', 'replace')
out = {}
for ln in raw.splitlines():
    m = re.match(r'^##\s+TrueVision3D\s+(v\d+\.\d+\.\d+)\s*-\s*(\d\d-[A-Z][a-z]{2}-\d{4})', ln)
    if m and m.group(1) not in out:
        out[m.group(1)] = m.group(2)
json.dump(out, open(os.path.join(HERE, 'tv_release_dates.json'), 'w', encoding='utf-8'), indent=0, sort_keys=True)
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
print(len(out), 'headings;', ', '.join('%s %s' % (k, out[k]) for k in ('v2.21.0', 'v2.36.0', 'v2.40.0', 'v2.54.0', 'v2.55.0',
                                                                     'v2.63.0', 'v2.72.0', 'v2.74.0') if k in out))
