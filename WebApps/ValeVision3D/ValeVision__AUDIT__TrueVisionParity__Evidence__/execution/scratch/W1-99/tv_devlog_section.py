"""W1-99: print one release section of TrueVision's devlog read at the pin (git show b2aa9151:...). Read-only.
The text is printed to stdout only (TrueVision / NA content stays out of the repository).

Usage: python -B tv_devlog_section.py v2.38.1 [max_lines]
"""
import re, subprocess, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
ver = sys.argv[1]
maxl = int(sys.argv[2]) if len(sys.argv) > 2 else 80
raw = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'],
                     capture_output=True).stdout.decode('utf-8', 'replace')
lines = raw.splitlines()
start = None
for i, ln in enumerate(lines):
    if re.match(r'^##\s+TrueVision3D\s+' + re.escape(ver) + r'\b', ln) or re.match(r'^##\s+.*\b' + re.escape(ver) + r'\b', ln):
        start = i
        break
if start is None:
    raise SystemExit('no heading for ' + ver)
end = len(lines)
for j in range(start + 1, len(lines)):
    if lines[j].startswith('## ') and not lines[j].startswith('### '):
        end = j
        break
print('TV devlog :%d-%d' % (start + 1, end))
for ln in lines[start:min(end, start + maxl)]:
    print(ln)
