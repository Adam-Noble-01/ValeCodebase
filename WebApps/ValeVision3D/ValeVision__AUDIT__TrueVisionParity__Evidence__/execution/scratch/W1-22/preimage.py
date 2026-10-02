# W1-22 scratch: save pre-images of every file in the package's edits list (bytes) with sha1, or
# check that the live files still equal the recorded pre-images (--check), or restore them (--restore).
import hashlib
import json
import os
import shutil
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, 'preimage')
MANIFEST = os.path.join(PRE, 'manifest.json')

EDITS = [
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js',
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__DrawingScale__.js',
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Cells__.js',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Classic__.js',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Modern__.js',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__QrCell__.js',
    '02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js',
    '80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html',
    '80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.test.mjs',
]


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def live(rel):
    return os.path.join(VV, rel.replace('/', os.sep))


def save():
    if os.path.exists(MANIFEST):
        print('manifest exists - refusing to overwrite pre-images')
        return 1
    os.makedirs(PRE, exist_ok=True)
    man = {}
    for rel in EDITS:
        p = live(rel)
        if not os.path.exists(p):
            man[rel] = None
            print('ABSENT', rel)
            continue
        data = open(p, 'rb').read()
        dest = os.path.join(PRE, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        open(dest, 'wb').write(data)
        man[rel] = {'sha1': sha1(data), 'bytes': len(data), 'crlf': data.count(b'\r\n'), 'lf': data.count(b'\n')}
        print('SAVED', man[rel]['sha1'][:8], len(data), 'crlf=%d lf=%d' % (man[rel]['crlf'], man[rel]['lf']), rel)
    json.dump(man, open(MANIFEST, 'w', encoding='utf-8'), indent=1)
    return 0


def check():
    man = json.load(open(MANIFEST, encoding='utf-8'))
    bad = 0
    for rel, rec in man.items():
        p = live(rel)
        if rec is None:
            state = 'still absent' if not os.path.exists(p) else 'NOW PRESENT'
        else:
            if not os.path.exists(p):
                state = 'MISSING'
                bad += 1
            else:
                h = sha1(open(p, 'rb').read())
                state = 'unchanged' if h == rec['sha1'] else 'CHANGED ' + h[:8]
        print(state, rel)
    return 0


def restore():
    man = json.load(open(MANIFEST, encoding='utf-8'))
    for rel, rec in man.items():
        p = live(rel)
        if rec is None:
            if os.path.exists(p):
                os.remove(p)
                print('REMOVED (was absent)', rel)
            continue
        src = os.path.join(PRE, rel.replace('/', os.sep))
        shutil.copyfile(src, p)
        print('RESTORED', rel)
    return 0


if __name__ == '__main__':
    arg = sys.argv[1] if len(sys.argv) > 1 else '--save'
    sys.exit({'--save': save, '--check': check, '--restore': restore}[arg]())
