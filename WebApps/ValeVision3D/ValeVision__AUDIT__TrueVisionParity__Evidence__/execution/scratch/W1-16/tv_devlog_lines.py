# W1-16 | Print a line range of TrueVision's devlog AT THE PIN (read only, nothing written).
# Usage: python tv_devlog_lines.py <first line> <last line>
import subprocess
import sys

PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PATH = 'na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'

first, last = int(sys.argv[1]), int(sys.argv[2])
data = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + PATH], capture_output=True, check=True).stdout.decode('utf-8')
lines = data.split('\n')
sys.stdout.reconfigure(encoding='utf-8')
for index in range(first - 1, min(last, len(lines))):
    print(str(index + 1).rjust(6) + '  ' + lines[index])
