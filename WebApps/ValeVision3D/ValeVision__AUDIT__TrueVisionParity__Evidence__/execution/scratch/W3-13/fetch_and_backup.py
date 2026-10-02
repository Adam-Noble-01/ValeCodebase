"""W3-13: fetch the two TV sources at the pin into tv/, and back up the live VV files into backup/ (once)."""
import os
import shutil
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
TV_REPO = r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb'
PIN = 'b2aa9151'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/'
LE = '02__Src__AppModules/51__System__LayoutEditor/'

FILES = [
    LE + '40__Ui__Panels/Na__LayoutEditor__Panel__Layers__.js',
    LE + '57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ViewportLink__.js',
]

os.makedirs(os.path.join(HERE, 'tv'), exist_ok=True)
os.makedirs(os.path.join(HERE, 'backup'), exist_ok=True)
for rel in FILES:
    data = subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':' + TV_APP + rel],
                          check=True, capture_output=True).stdout
    name = os.path.basename(rel)
    with open(os.path.join(HERE, 'tv', name), 'wb') as f:
        f.write(data)
    print('tv', len(data), b'\r' in data, name)
    dst = os.path.join(HERE, 'backup', name)
    if not os.path.exists(dst):
        shutil.copyfile(os.path.join(VV, rel), dst)
        print('backed up', os.path.getsize(dst), name)
    else:
        print('backup exists', name)
