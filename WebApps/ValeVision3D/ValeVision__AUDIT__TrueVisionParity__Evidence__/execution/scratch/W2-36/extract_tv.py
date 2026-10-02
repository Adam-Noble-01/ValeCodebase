"""Extract the TrueVision files W2-36 reads, at pin b2aa9151, as bytes, into scratch/W2-36/tv/."""
import os
import subprocess

PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
LE = '02__Src__AppModules/51__System__LayoutEditor/'
FILES = [
    LE + '40__Ui__Panels/Na__LayoutEditor__Panel__Text__.js',
    LE + '40__Ui__Panels/Na__LayoutEditor__Panel__Styles__.js',
    LE + '40__Ui__Panels/Na__LayoutEditor__Panel__Shapes__.js',
    LE + '40__Ui__Panels/Na__LayoutEditor__Panel__Leaders__.js',
    LE + '40__Ui__Panels/Na__LayoutEditor__Panel__Layers__.js',
    LE + '40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css',
    LE + '56__Feature__ScrapbookCustom/Na__LayoutEditor__ScrapbookCustom__.js',
    LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json',
]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv')

for rel in FILES:
    data = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + rel],
                          capture_output=True, check=True).stdout
    dst = os.path.join(OUT, rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, 'wb') as fh:
        fh.write(data)
    print(len(data), rel)
