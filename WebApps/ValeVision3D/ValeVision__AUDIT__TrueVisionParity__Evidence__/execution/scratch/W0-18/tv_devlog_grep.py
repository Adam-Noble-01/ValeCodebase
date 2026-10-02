"""Find the TV devlog releases that mention the two APIs or the dictionary (read at the pin)."""
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
text = subprocess.run(['git', '-C', NAWEB, 'show', 'b2aa9151:na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'],
                      capture_output=True, check=True).stdout.decode('utf-8')
lines = text.split('\n')
pattern = re.compile(sys.argv[1] if len(sys.argv) > 1 else r'SheetImages__Api|UserConfig__Api|UserSpellings|sheet-images|user-config')
release = None
release_line = 0
for number, line in enumerate(lines, 1):
    if line.startswith('## '):
        release = line.strip()
        release_line = number
    if pattern.search(line):
        print(f'{number:6d} [{release_line}: {release}]')
        print('        ' + line.strip()[:260])
