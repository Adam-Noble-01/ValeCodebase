# W2-09 scratch: print TrueVision devlog entries (read at the pin) that mention the given versions or words.
import re
import subprocess
import sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
text = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'],
                      capture_output=True, check=True).stdout.decode('utf-8', 'replace').replace('\r\n', '\n')
lines = text.split('\n')
heads = [i for i, l in enumerate(lines) if re.match(r'^##\s+TrueVision3D v2\.\d+\.\d+', l)]
wanted = sys.argv[1:]
for n, start in enumerate(heads):
    end = heads[n + 1] if n + 1 < len(heads) else len(lines)
    head = lines[start]
    if any(w in head for w in wanted):
        print('=' * 110)
        print('LINES %d-%d' % (start + 1, end))
        print('\n'.join(lines[start:end]))
