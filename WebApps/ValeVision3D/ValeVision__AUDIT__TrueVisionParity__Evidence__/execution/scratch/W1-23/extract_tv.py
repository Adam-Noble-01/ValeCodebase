# W1-23 - read the TrueVision sources at the pin into scratch/W1-23/tv/ (bytes, as git show returns them)
import os
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'tv')

FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js',
    '02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__.js',
    '02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js',
    '02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Linework__.js',
    '02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Window__.js',
    '02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport3d__.js',
    '02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js',
    '02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ModelSource__.js',
]

os.makedirs(OUT, exist_ok=True)
for rel in FILES:
    blob = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + APP + rel], capture_output=True)
    if blob.returncode != 0:
        print('MISSING', rel, blob.stderr.decode('utf-8', 'replace').strip())
        continue
    data = blob.stdout
    dest = os.path.join(OUT, os.path.basename(rel))
    with open(dest, 'wb') as fh:
        fh.write(data)
    print('%-70s %7d bytes  CR=%d' % (os.path.basename(rel), len(data), data.count(b'\r')))
sys.exit(0)
