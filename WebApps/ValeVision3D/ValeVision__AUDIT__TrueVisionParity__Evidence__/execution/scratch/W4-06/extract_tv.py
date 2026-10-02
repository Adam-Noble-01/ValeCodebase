"""W4-06: read the four TrueVision sources at the pin with git show (bytes), save under tv/."""
import hashlib
import os
import subprocess

PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
FEATURE = '02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/'
FILES = [
    '01__Core__Data/Na__LayoutEditor__Statement__Data__.js',
    '01__Core__Data/Na__LayoutEditor__Statement__Data__Transport__.js',
    '05__Ui__Reader/Na__LayoutEditor__Statement__Reader__.js',
    '03__Ui__Page/Na__LayoutEditor__Statement__Manager__.js',
]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'tv')
os.makedirs(OUT, exist_ok=True)

for rel in FILES:
    data = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + FEATURE + rel],
                          check=True, capture_output=True).stdout
    name = os.path.basename(rel)
    with open(os.path.join(OUT, name), 'wb') as handle:
        handle.write(data)
    print(f'{name}: {len(data)} bytes, {data.count(b"\n")} lines, CR={data.count(b"\r")}, sha1 {hashlib.sha1(data).hexdigest()[:8]}')
