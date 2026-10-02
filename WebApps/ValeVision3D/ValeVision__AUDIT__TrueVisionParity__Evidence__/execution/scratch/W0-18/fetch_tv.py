"""Copy the TV sources this package ports, read at the pin b2aa9151, into scratch/W0-18/tv_pin/ (bytes, as git show returns them)."""
import hashlib
import os
import subprocess

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv_pin')
FILES = [
    'na-apps/ProjectVision__TrueVisionSheetImages__Api__.py',
    'na-apps/ProjectVision__TrueVisionUserConfig__Api__.py',
    'na-apps/ProjectVision__LocalServer__Main__.py',
    'na-apps/30__TrueVision__CoreAppCode/50__TrueVision__UserConfig/TrueVision__UserSpellings__.json',
    'na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__SheetImagesApi__.test.py',
    'na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__UserSpellingsApi__.test.py',
]

os.makedirs(OUT, exist_ok=True)
for rel in FILES:
    data = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + rel], capture_output=True, check=True).stdout
    dest = os.path.join(OUT, os.path.basename(rel))
    with open(dest, 'wb') as fh:
        fh.write(data)
    crlf = data.count(b'\r\n')
    lf = data.count(b'\n')
    print('%-70s %7d bytes  %5d lines  crlf=%d  bom=%s  sha1=%s' % (
        os.path.basename(rel), len(data), lf, crlf, data[:3] == b'\xef\xbb\xbf', hashlib.sha1(data).hexdigest()[:10]))
