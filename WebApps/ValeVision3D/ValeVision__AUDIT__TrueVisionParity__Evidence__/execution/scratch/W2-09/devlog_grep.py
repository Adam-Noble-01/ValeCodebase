# W2-09 scratch: grep TrueVision's devlog (read at the pin) for words, printing the release each hit sits under.
import re
import subprocess
import sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
text = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'],
                      capture_output=True, check=True).stdout.decode('utf-8', 'replace').replace('\r\n', '\n')
lines = text.split('\n')
current = '(top)'
pattern = re.compile(sys.argv[1], re.I)
for i, line in enumerate(lines):
    m = re.match(r'^##\s+(TrueVision3D v2\.\d+\.\d+[^\n]*)', line)
    if m:
        current = m.group(1)[:60]
    if pattern.search(line):
        print('%6d  [%s]  %s' % (i + 1, current, line.strip()[:220]))
