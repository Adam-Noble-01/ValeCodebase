"""W1-38 scratch: grep TV's devlog at the pin; print each hit with the release heading it sits under.

usage: python -B tv_devlog_grep.py <regex> [<regex> ...] [--context N]
"""
import re
import subprocess
import sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
PATH = 'na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'

args = sys.argv[1:]
ctx = 0
if '--context' in args:
    i = args.index('--context')
    ctx = int(args[i + 1])
    del args[i:i + 2]
pats = [re.compile(a, re.I) for a in args]
text = subprocess.run(['git', '-C', NAWEB, 'show', f'{PIN}:{PATH}'], capture_output=True, check=True).stdout.decode('utf-8').replace('\r\n', '\n')
lines = text.split('\n')
heading = None
heading_line = 0
for n, line in enumerate(lines, 1):
    if line.startswith('## ') and 'TrueVision3D v' in line:
        heading = line.strip()
        heading_line = n
    if any(p.search(line) for p in pats):
        print(f':{n}  [{heading_line}: {heading[:120] if heading else None}]')
        lo, hi = max(0, n - 1 - ctx), min(len(lines), n + ctx)
        for k in range(lo, hi):
            print(f'    {k + 1}: {lines[k][:220]}')
