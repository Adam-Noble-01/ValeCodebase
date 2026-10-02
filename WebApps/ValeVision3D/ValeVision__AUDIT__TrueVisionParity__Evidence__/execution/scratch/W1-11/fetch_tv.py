# W1-11 - read TrueVision files at the pin (b2aa9151) as bytes, never from the working tree.
import hashlib
import os
import subprocess
import sys

PIN = 'b2aa9151'
TV_GIT = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv')

FILES = [
    '02__Src__AppModules/46__System__NorthDirection/Na__North__CompassGizmo__.js',
    '02__Src__AppModules/46__System__NorthDirection/Na__North__DevMenu__Editor__.js',
    '02__Src__AppModules/46__System__NorthDirection/Na__North__AppConfig__.json',
    '02__Src__AppModules/46__System__NorthDirection/Na__North__Compass__.js',
    '02__Src__AppModules/46__System__NorthDirection/Na__North__ConfigState__.js',
    '02__Src__AppModules/46__System__NorthDirection/Na__North__PickTool__.js',
    '02__Src__AppModules/46__System__NorthDirection/Na__North__ProjectJson__Data__.js',
    '02__Src__AppModules/46__System__NorthDirection/Na__North__Styles__DevMenu__.css',
    '80__Testing__PrototypeEnvironment/Na__Test__NorthCompass__.test.mjs',
    'Index.html',
]


def main():
    os.makedirs(OUT, exist_ok=True)
    for rel in FILES:
        spec = '%s:%s/%s' % (PIN, TV_APP, rel)
        res = subprocess.run(['git', '-C', TV_GIT, 'show', spec], capture_output=True)
        if res.returncode != 0:
            print('MISSING', rel, res.stderr.decode('utf-8', 'replace').strip())
            continue
        data = res.stdout
        dest = os.path.join(OUT, os.path.basename(rel))
        with open(dest, 'wb') as fh:
            fh.write(data)
        crlf = data.count(b'\r\n')
        print('%-60s %7d bytes  sha1 %s  lines %d  crlf %d' % (
            os.path.basename(rel), len(data), hashlib.sha1(data).hexdigest()[:8], data.count(b'\n'), crlf))


if __name__ == '__main__':
    sys.exit(main())
