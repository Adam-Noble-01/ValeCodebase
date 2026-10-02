# W2-02 scratch: unified diffs of the two landed files against this package's pre-images (record only).
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
VVM = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules'
PAIRS = [
    ('Na__DrawView__SectionAdapter__.js', os.path.join(VVM, '40__System__DrawingViewCore', 'Na__DrawView__SectionAdapter__.js')),
    ('Na__CrossSectionView__SystemLogic.js', os.path.join(VVM, '41__System__CrossSectionView', 'Na__CrossSectionView__SystemLogic.js')),
]
os.makedirs(os.path.join(HERE, 'diffs'), exist_ok=True)
for name, live in PAIRS:
    result = subprocess.run(['git', 'diff', '--no-index', '--no-color', os.path.join(HERE, 'preimage', name), live],
                            capture_output=True)
    out = os.path.join(HERE, 'diffs', name + '.diff')
    with open(out, 'wb') as handle:
        handle.write(result.stdout)
    added = sum(1 for line in result.stdout.split(b'\n') if line.startswith(b'+') and not line.startswith(b'+++'))
    removed = sum(1 for line in result.stdout.split(b'\n') if line.startswith(b'-') and not line.startswith(b'---'))
    print(name, '+%d -%d' % (added, removed), '->', out)
