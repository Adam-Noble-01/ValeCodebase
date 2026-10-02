# W0-13 - read TrueVision files at the pin (b2aa9151) as bytes, into the session scratchpad
# (outside the ValeVision tree: the TV copies carry NA markers and are deleted after use).
# Usage: python -B fetch_tv.py <app-relative path> [...]
import os
import subprocess
import sys

sys.dont_write_bytecode = True

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = os.environ.get('W013_TV_OUT') or r'C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f105155\scratchpad\W0-13_tv'


def show(rel):
    r = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + APP + rel], capture_output=True)
    if r.returncode != 0:
        raise SystemExit('git show failed for ' + rel + ': ' + r.stderr.decode('utf-8', 'replace'))
    return r.stdout


def main(paths):
    os.makedirs(OUT, exist_ok=True)
    for rel in paths:
        data = show(rel)
        name = rel.replace('/', '__')
        with open(os.path.join(OUT, name), 'wb') as fh:
            fh.write(data)
        print(len(data), 'CRLF' if b'\r\n' in data else 'LF', rel)


if __name__ == '__main__':
    main(sys.argv[1:])
