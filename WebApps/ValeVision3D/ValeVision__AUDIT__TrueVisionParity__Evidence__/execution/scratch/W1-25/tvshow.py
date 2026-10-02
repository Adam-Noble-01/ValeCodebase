"""Write a TV file at the pin to the scratch folder as exact bytes.

usage: python tvshow.py <app-relative path> [<out name>]
"""
import os
import subprocess
import sys

PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv')


def tv_bytes(rel, prefix=APP):
    spec = PIN + ':' + prefix + rel.replace('\\', '/')
    return subprocess.run(['git', '-C', REPO, 'show', spec], check=True, capture_output=True).stdout


if __name__ == '__main__':
    rel = sys.argv[1]
    prefix = APP
    if len(sys.argv) > 3:
        prefix = sys.argv[3]
    data = tv_bytes(rel, prefix)
    os.makedirs(OUT, exist_ok=True)
    name = sys.argv[2] if len(sys.argv) > 2 else os.path.basename(rel)
    path = os.path.join(OUT, name)
    with open(path, 'wb') as fh:
        fh.write(data)
    print(path, len(data), 'bytes', 'CRLF' if b'\r\n' in data else 'LF')
