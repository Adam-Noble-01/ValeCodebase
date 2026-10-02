# W1-16 | Grep TrueVision's devlog AT THE PIN for the eight files' names and namespaces (read only).
# Prints each hit with the release heading it sits under.
import re
import subprocess
import sys

PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PATH = 'na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'

PATTERN = re.compile(r'SheetImages__(Setup|Geometry|Painter|Paint|Source|Pdf|Encode|Config)\b|Na__LeImg(Cfg|Geo|Paint|Draw|Src|Pdf|Enc)__')

data = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + PATH], capture_output=True, check=True).stdout.decode('utf-8')
sys.stdout.reconfigure(encoding='utf-8')
heading = None
for number, line in enumerate(data.split('\n'), 1):
    if line.startswith('## TrueVision3D v'):
        heading = line.strip()
    if PATTERN.search(line):
        print(str(number).rjust(6), '|', heading, '|', line.strip()[:200])
