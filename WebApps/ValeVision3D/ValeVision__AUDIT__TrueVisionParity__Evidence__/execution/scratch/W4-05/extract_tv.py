# W4-05: copy the five TV sources at the pin into scratch/W4-05/tv/ (bytes, as git show returns them).
import os, subprocess

PIN  = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP  = 'na-apps/30__TrueVision__CoreAppCode/'
BASE = '02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/'
FILES = [
    '01__Core__Data/Na__LayoutEditor__Statement__Data__Index__.js',
    '01__Core__Data/Na__LayoutEditor__Statement__Images__.js',
    '04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Move__.js',
    '04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Typing__.js',
    '07__Export__Publish/Na__LayoutEditor__Statement__Publish__Page__.js',
]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv')
for rel in FILES:
    data = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + BASE + rel], capture_output=True, check=True).stdout
    target = os.path.join(OUT, os.path.basename(rel))
    os.makedirs(OUT, exist_ok=True)
    with open(target, 'wb') as fh:
        fh.write(data)
    print(rel, len(data), data.count(b'\n'), 'CR' if b'\r' in data else 'LF')
