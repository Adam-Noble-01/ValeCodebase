"""Extract the six TV Drawing Register sources at the pin b2aa9151 into scratch/W4-18/tv (bytes, as git show returns them)."""
import subprocess, os, hashlib, sys

PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'tv')
FOLDER = '02__Src__AppModules/51__System__LayoutEditor/51__Feature__DrawingRegister/'
NAMES = ['Data', 'DeleteDialog', 'Transactions', 'Notes', 'Preview', 'Pdf', 'Numbering', 'Editor', 'Export']
extra = sys.argv[1:]

os.makedirs(OUT, exist_ok=True)
paths = [FOLDER + 'Na__LayoutEditor__Register__%s__.js' % n for n in NAMES] + extra
for rel in paths:
    try:
        data = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + rel], capture_output=True, check=True).stdout
    except subprocess.CalledProcessError as exc:
        print('MISSING', rel, exc.stderr.decode('utf-8', 'replace').strip())
        continue
    dst = os.path.join(OUT, os.path.basename(rel))
    with open(dst, 'wb') as fh:
        fh.write(data)
    print('%-70s %7d bytes  lines %5d  crlf %s  sha %s' % (os.path.basename(rel), len(data), data.count(b'\n'), b'\r\n' in data, hashlib.sha256(data).hexdigest()[:12]))
