# W1-23 - find the TrueVision releases (at the pin) that name a module and version.
# Usage: python -B tv_devlog_grep.py <regex> [<regex> ...]
# Prints each matching devlog line with the nearest release heading above it.
import re
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PATH = 'na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'

blob = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + PATH], capture_output=True)
if blob.returncode != 0:
    print('cannot read devlog:', blob.stderr.decode('utf-8', 'replace'))
    sys.exit(2)
lines = blob.stdout.decode('utf-8', 'replace').split('\n')
heading = re.compile(r'^##\s+TrueVision3D\s+v(\d+\.\d+\.\d+)\b(.*)$')
current = None
patterns = [re.compile(p) for p in sys.argv[1:]]
for number, line in enumerate(lines, 1):
    m = heading.match(line)
    if m:
        current = (number, 'v' + m.group(1) + m.group(2)[:70])
        continue
    for p in patterns:
        if p.search(line):
            where = ('%s @%d' % (current[1], current[0])) if current else '(before any release)'
            print('%6d  [%s]  %s' % (number, where, line.strip()[:160]))
            break
