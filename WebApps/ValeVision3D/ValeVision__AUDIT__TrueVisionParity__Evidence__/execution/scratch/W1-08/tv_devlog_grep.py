# W1-08 scratch: read TrueVision's devlog at the pin and print the v2.87.0 entry (and any later
# entry that names the storey files), so the Port Record can name the release and its sign-off state.
import re
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'

text = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + APP + 'TrueVision__DEVLOG__.md'],
                      capture_output=True, check=True).stdout.decode('utf-8', 'replace')
lines = text.split('\n')

mode = sys.argv[1] if len(sys.argv) > 1 else 'entry'

if mode == 'entry':
    want = sys.argv[2] if len(sys.argv) > 2 else 'v2.87.0'
    start = None
    for i, line in enumerate(lines):
        if line.startswith('## ') and want in line:
            start = i
            break
    if start is None:
        print('not found', want)
        sys.exit(1)
    end = len(lines)
    for j in range(start + 1, len(lines)):
        if lines[j].startswith('## ') and re.search(r'v2\.\d+\.\d+', lines[j]):
            end = j
            break
    for k in range(start, end):
        print('%6d: %s' % (k + 1, lines[k]))
elif mode == 'grep':
    pat = re.compile(sys.argv[2])
    for i, line in enumerate(lines):
        if pat.search(line):
            print('%6d: %s' % (i + 1, line[:220]))
