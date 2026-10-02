"""git grep TrueVision at the pin (read-only), printing app-relative paths.

usage: python tvgrep.py <regex> [<pathspec> ...]
"""
import subprocess
import sys

PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'

pattern = sys.argv[1]
specs = sys.argv[2:] or ['02__Src__AppModules', '80__Testing__PrototypeEnvironment', '03__Style__AppStylesheets', 'Index.html']
cmd = ['git', '-C', REPO, 'grep', '-n', '-E', pattern, PIN, '--'] + [APP + s for s in specs]
out = subprocess.run(cmd, capture_output=True).stdout.decode('utf-8', 'replace')
for line in out.splitlines():
    line = line.replace(PIN + ':' + APP, '')
    print(line[:300])
