"""W1-38 scratch: for named TV releases, print the heading, its line range in TV's devlog at the pin, and every line
that speaks of Adam trying / signing off / ValeVision.

usage: python -B tv_release_signoff.py 2.41.0 2.91.0 ...
"""
import re
import subprocess
import sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
PATH = 'na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'
WANT = sys.argv[1:]
text = subprocess.run(['git', '-C', NAWEB, 'show', f'{PIN}:{PATH}'], capture_output=True, check=True).stdout.decode('utf-8').replace('\r\n', '\n')
lines = text.split('\n')
heads = [(n, l) for n, l in enumerate(lines, 1) if l.startswith('## ') and 'TrueVision3D v' in l]
pat = re.compile(r"tried by Adam|Adam tried|sign-off|signed off|ValeVision|confirmed|Adam's (?:words|test)|NOT tried", re.I)
for want in WANT:
    for i, (n, l) in enumerate(heads):
        m = re.search(r'TrueVision3D v(\d+\.\d+\.\d+)', l)
        if m and m.group(1) == want:
            end = heads[i - 1][0] - 1 if i > 0 else len(lines)    # devlog is newest first: the previous heading is ABOVE
            # the section runs from n to the next heading below
            nxt = heads[i + 1][0] - 1 if i + 1 < len(heads) else len(lines)
            print(f'=== v{want}  :{n}-{nxt}  {l[:150]}')
            if n < len(lines):
                print('    ' + lines[n][:200])
            for k in range(n, nxt):
                if pat.search(lines[k]):
                    print(f'    :{k + 1} {lines[k][:230]}')
            break
    else:
        print(f'=== v{want}: no heading found')
