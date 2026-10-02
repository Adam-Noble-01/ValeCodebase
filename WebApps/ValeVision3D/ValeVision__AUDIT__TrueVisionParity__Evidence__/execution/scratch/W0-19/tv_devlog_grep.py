"""Print the TrueVision devlog entries of the releases W0-19 ports (v2.95.0, v2.155.0), read at the pin, with their
confirmation lines (Adam tried / NOT tried / sign-off / ValeVision)."""
import re
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
text = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'],
                      capture_output=True).stdout.decode('utf-8', 'replace')
lines = text.splitlines()
heads = [i for i, line in enumerate(lines) if line.startswith('## TrueVision3D v')]
wanted = sys.argv[1:] or ['v2.95.0', 'v2.155.0']
for version in wanted:
    for n, start in enumerate(heads):
        if (version + ' ') in lines[start] or lines[start].rstrip().endswith(version):
            end = heads[n + 1] if n + 1 < len(heads) else len(lines)
            print('=' * 100)
            print('%d-%d %s' % (start + 1, end, lines[start]))
            for i in range(start, end):
                low = lines[i].lower()
                if re.search(r'adam|sign-off|signed off|not tried|valevision|confirmed|not done|not seen|tried in the app', low):
                    print('  %5d: %s' % (i + 1, lines[i][:220]))
            break
    else:
        print('NOT FOUND', version)
