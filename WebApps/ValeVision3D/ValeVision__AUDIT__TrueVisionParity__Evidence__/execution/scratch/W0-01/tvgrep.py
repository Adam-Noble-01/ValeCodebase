"""git grep inside TrueVision's tree AT THE PIN (never the working tree).

Usage: python tvgrep.py <regex> [<app-relative path> ...]
Paths default to 02__Src__AppModules.
"""
import subprocess, sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
APP = 'na-apps/30__TrueVision__CoreAppCode/'

pattern = sys.argv[1]
paths = sys.argv[2:] or ['02__Src__AppModules']
cmd = ['git', '-C', NAWEB, 'grep', '-n', '-E', pattern, PIN, '--'] + [APP + p for p in paths]
r = subprocess.run(cmd, capture_output=True)
out = r.stdout.decode('utf-8', 'replace')
lines = out.splitlines()
for ln in lines[:200]:
    s = ln.replace(PIN + ':' + APP, '')
    sys.stdout.buffer.write((s[:400] + '\n').encode('utf-8'))
if len(lines) > 200:
    print('... %d more' % (len(lines) - 200))
if r.returncode not in (0, 1):
    sys.stdout.buffer.write(r.stderr)
