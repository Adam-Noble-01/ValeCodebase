# W2-02 scratch helper: extract TrueVision files at the pin (b2aa9151) as raw bytes.
# Usage: python tv_extract.py <app-relative path> [<app-relative path> ...]
import os
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv_at_pin')

os.makedirs(OUT, exist_ok=True)
for rel in sys.argv[1:]:
    rel = rel.replace('\\', '/')
    data = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + APP + rel],
                          capture_output=True, check=True).stdout
    dest = os.path.join(OUT, os.path.basename(rel))
    with open(dest, 'wb') as fh:
        fh.write(data)
    print(dest, len(data), 'bytes', 'CRLF' if b'\r\n' in data else 'LF')
