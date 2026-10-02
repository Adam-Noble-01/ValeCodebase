"""Show a line range of a TrueVision file AT THE PIN (git show, never the working tree).

Usage: python tvshow.py <app-relative path> <first> <last>
"""
import subprocess, sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
APP = 'na-apps/30__TrueVision__CoreAppCode/'

path, lo, hi = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
r = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + APP + path], capture_output=True)
if r.returncode != 0:
    sys.stdout.buffer.write(r.stderr)
    sys.exit(1)
lines = r.stdout.decode('utf-8', 'replace').split('\n')
for n in range(lo, min(hi, len(lines)) + 1):
    sys.stdout.buffer.write(('%5d  %s\n' % (n, lines[n - 1][:300])).encode('utf-8'))
