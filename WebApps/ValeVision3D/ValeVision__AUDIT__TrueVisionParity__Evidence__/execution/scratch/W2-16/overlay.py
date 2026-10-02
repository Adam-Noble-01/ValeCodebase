"""Make scratch/W2-16/overlay: a copy of the VV app (code, styles, tests, index.html, vendors) with the W2-16
candidates dropped in. Nothing live is written.  python -B overlay.py [--fresh]"""
import os, sys, shutil, json

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
O = os.path.join(HERE, 'overlay')
SKIP = {'node_modules', '.git', '.claude', '__pycache__', '.wrangler', 'dist'}
DIRS = ['02__Src__AppModules', '03__Style__AppStylesheets', '80__Testing__PrototypeEnvironment', '04__Lib__ThirdParty__Three',
        '04__Lib__ThirdParty__VersionLocked', '52__LayoutEditor__HatchPatternLibrary', '50__ValeVision__UserConfig',
        '51__LayoutEditor__UserScrapbookContent']
FILES = ['index.html', 'ValeVision__NOTES__FolderNumberRegistry__.md']


def ignore(d, names):
    return [n for n in names if n in SKIP or n.endswith('.zip')]


if '--fresh' in sys.argv and os.path.isdir(O):
    shutil.rmtree(O)
if not os.path.isdir(O):
    os.makedirs(O)
    for d in DIRS:
        if os.path.isdir(os.path.join(VV, d)):
            shutil.copytree(os.path.join(VV, d), os.path.join(O, d), ignore=ignore)
    for f in FILES:
        shutil.copyfile(os.path.join(VV, f), os.path.join(O, f))
cm = json.load(open(os.path.join(HERE, 'candidate', 'manifest.json')))
for rel in cm:
    dst = os.path.join(O, rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(os.path.join(HERE, 'candidate', rel.replace('/', os.sep)), dst)
print('overlay ready with', len(cm), 'candidates')
