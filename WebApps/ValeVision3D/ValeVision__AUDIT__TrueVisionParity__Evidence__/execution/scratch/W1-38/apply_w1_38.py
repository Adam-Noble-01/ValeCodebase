"""W1-38 scratch: land the three candidates on the live tree, or restore the pre-images.

  python -B apply_w1_38.py            land: refuses unless PanelHost and Styles__Panels still have the sha1 recorded in
                                       baseline_sha1.txt and the test does not exist yet; writes the candidates' bytes
                                       (LF, TrueVision's text as git show gives it) and reads every file back
  python -B apply_w1_38.py --restore  put the pre-images back and remove the new test; refuses if any of the three
                                       files has changed since this package landed it

Nothing is staged; no other file is touched.
"""
import hashlib
import os
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
TARGETS = {
    'Na__LayoutEditor__PanelHost__.js': r'02__Src__AppModules\51__System__LayoutEditor\40__Ui__Panels\Na__LayoutEditor__PanelHost__.js',
    'Na__LayoutEditor__Styles__Panels__.css': r'02__Src__AppModules\51__System__LayoutEditor\40__Ui__Panels\Na__LayoutEditor__Styles__Panels__.css',
    'Na__Test__ColourPalette__.test.mjs': r'80__Testing__PrototypeEnvironment\Na__Test__ColourPalette__.test.mjs',
}
NEW = {'Na__Test__ColourPalette__.test.mjs'}


def sha1(path):
    return hashlib.sha1(open(path, 'rb').read()).hexdigest()


def recorded():
    rows = {}
    for line in open(os.path.join(HERE, 'baseline_sha1.txt'), encoding='utf-8'):
        parts = line.rstrip('\n').split('\t')
        rows[os.path.basename(parts[0])] = parts[1]
    return rows


def land():
    base = recorded()
    for name, rel in TARGETS.items():
        live = os.path.join(VV, rel)
        if name in NEW:
            if os.path.exists(live):
                raise SystemExit(f'REFUSED: {rel} already exists')
            continue
        if base.get(name) in (None, 'ABSENT') or sha1(live) != base[name]:
            raise SystemExit(f'REFUSED: {rel} changed since the baseline ({sha1(live)[:8]} != {str(base.get(name))[:8]})')
        pre = os.path.join(HERE, 'preimage', name)
        if not os.path.exists(pre) or sha1(pre) != base[name]:
            raise SystemExit(f'REFUSED: no pre-image of {name} matching the baseline')
    landed = []
    for name, rel in TARGETS.items():
        data = open(os.path.join(HERE, 'candidates', name), 'rb').read()
        live = os.path.join(VV, rel)
        with open(live, 'wb') as fh:
            fh.write(data)
        back = open(live, 'rb').read()
        if back != data:
            raise SystemExit(f'READ-BACK MISMATCH on {rel}')
        landed.append(f'{rel}\t{hashlib.sha1(data).hexdigest()}')
        print(f'landed {rel}  sha1 {hashlib.sha1(data).hexdigest()[:8]}  {len(data)} bytes  {data.count(b"\n")} lines  CR {data.count(b"\r")}')
    with open(os.path.join(HERE, 'landed_sha1.txt'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('\n'.join(landed) + '\n')


def restore():
    rows = {}
    for line in open(os.path.join(HERE, 'landed_sha1.txt'), encoding='utf-8'):
        parts = line.rstrip('\n').split('\t')
        rows[os.path.basename(parts[0])] = parts[1]
    for name, rel in TARGETS.items():
        live = os.path.join(VV, rel)
        if not os.path.exists(live) or sha1(live) != rows.get(name):
            raise SystemExit(f'REFUSED: {rel} is not as this package landed it')
    for name, rel in TARGETS.items():
        live = os.path.join(VV, rel)
        if name in NEW:
            os.remove(live)
            print(f'removed {rel}')
        else:
            data = open(os.path.join(HERE, 'preimage', name), 'rb').read()
            with open(live, 'wb') as fh:
                fh.write(data)
            print(f'restored {rel}  sha1 {hashlib.sha1(data).hexdigest()[:8]}')


if __name__ == '__main__':
    restore() if '--restore' in sys.argv else land()
