import subprocess, sys, os, hashlib

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
OUT = os.path.dirname(os.path.abspath(__file__))

paths = sys.argv[1:] or ['02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js']
for rel in paths:
    spec = f'{PIN}:na-apps/30__TrueVision__CoreAppCode/{rel}'
    data = subprocess.run(['git', '-C', NAWEB, 'show', spec], capture_output=True, check=True).stdout
    name = 'TV__' + rel.replace('/', '__')
    with open(os.path.join(OUT, name), 'wb') as f:
        f.write(data)
    print(rel, len(data), 'bytes', 'CRLF' if b'\r\n' in data else 'LF', hashlib.sha256(data).hexdigest()[:16], '->', name)
