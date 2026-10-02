"""W1-05 - land (or restore) the three files, hash-checked.

  python -B apply_w1_05.py           land the candidates (each live file must still be as read at the start)
  python -B apply_w1_05.py --restore put the pre-images back (each live file must be exactly what this script landed)

Pre-images are kept in scratch/W1-05/preimage/ byte for byte (line endings included).
"""
import hashlib
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules')
PRE = HERE / 'preimage'
FILES = [
    # live path, candidate, sha1 of the live file as read at the start of W1-05
    (APP / '40__System__DrawingViewCore' / 'Na__DrawView__ProjectData__.js', HERE / 'candidate__Na__DrawView__ProjectData__.js', '437d0083bab1375603abbf33cf4c99645b039215'),
    (APP / '41__System__CrossSectionView' / 'Na__CrossSectionView__SceneData.js', HERE / 'candidate__Na__CrossSectionView__SceneData.js', 'e163813afa5032567e414e29112cef393c655349'),
    (APP / '46__System__NorthDirection' / 'Na__North__ProjectJson__Data__.js', HERE / 'candidate__Na__North__ProjectJson__Data__.js', '47514a3ddb86570047f591ddb2ceba529c7a646f'),
]


def sha1(path):
    return hashlib.sha1(path.read_bytes()).hexdigest()


def land():
    for live, candidate, start in FILES:
        if sha1(live) != start:
            sys.exit(f'REFUSED: {live.name} changed since W1-05 read it ({sha1(live)} != {start}); nothing landed')
    PRE.mkdir(exist_ok=True)
    for live, candidate, start in FILES:
        shutil.copyfile(live, PRE / (live.name + '.bak'))
    for live, candidate, start in FILES:
        live.write_bytes(candidate.read_bytes())
        if sha1(live) != sha1(candidate):
            sys.exit(f'write check failed for {live}')
        print('landed', live, 'sha1', sha1(live))


def restore():
    for live, candidate, start in FILES:
        if sha1(live) != sha1(candidate):
            sys.exit(f'REFUSED: {live.name} is not what W1-05 landed; restore by hand from {PRE}')
    for live, candidate, start in FILES:
        live.write_bytes((PRE / (live.name + '.bak')).read_bytes())
        if sha1(live) != start:
            sys.exit(f'restore check failed for {live}')
        print('restored', live, 'sha1', sha1(live))


if __name__ == '__main__':
    restore() if '--restore' in sys.argv else land()
