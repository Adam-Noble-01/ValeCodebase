"""Land W2-14: back up the two live files it edits, rebuild their staged copies from the live bytes, then write all files."""
import os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
BAK = os.path.join(HERE, 'backup')
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
LE = os.path.join(VV, r'02__Src__AppModules\51__System__LayoutEditor')
T = os.path.join(VV, '80__Testing__PrototypeEnvironment')

NEW = {
    'Na__SitePlan__GlbParse__.js': os.path.join(LE, r'21__System__SitePlanData\Na__SitePlan__GlbParse__.js'),
    'Na__SitePlan__Store__.js': os.path.join(LE, r'21__System__SitePlanData\Na__SitePlan__Store__.js'),
    'Na__LayoutEditor__Panel__SitePlanComposites__.js': os.path.join(LE, r'40__Ui__Panels\Na__LayoutEditor__Panel__SitePlanComposites__.js'),
    'Na__Test__SitePlanStore__.test.mjs': os.path.join(T, 'Na__Test__SitePlanStore__.test.mjs'),
    'Na__Test__SitePlanComposites__.test.mjs': os.path.join(T, 'Na__Test__SitePlanComposites__.test.mjs'),
    'Na__Test__SitePlanComposites__Output__.html': os.path.join(T, 'Na__Test__SitePlanComposites__Output__.html'),
}
EDIT = {
    'Na__LayoutEditor__AppConfig__.json': os.path.join(LE, r'03__Core__Config\Na__LayoutEditor__AppConfig__.json'),
    'Na__Test__AppConfigParity__.test.mjs': os.path.join(T, 'Na__Test__AppConfigParity__.test.mjs'),
}

if len(sys.argv) > 1 and sys.argv[1] == '--restore':
    for name, dest in NEW.items():
        if os.path.exists(dest): os.remove(dest); print('removed', dest)
    d = os.path.join(LE, '21__System__SitePlanData')
    if os.path.isdir(d) and not os.listdir(d): os.rmdir(d)
    for name, dest in EDIT.items():
        shutil.copyfile(os.path.join(BAK, name), dest); print('restored', dest)
    sys.exit(0)

for name, dest in NEW.items():
    assert not os.path.exists(dest), 'exists already: ' + dest
os.makedirs(BAK, exist_ok=True)
for name, dest in EDIT.items():
    shutil.copyfile(dest, os.path.join(BAK, name))
subprocess.run([sys.executable, os.path.join(HERE, 'build_tests.py')], check=True)   # <-- staged copies from the bytes backed up just now
for name, dest in EDIT.items():
    assert open(dest, 'rb').read() == open(os.path.join(BAK, name), 'rb').read(), 'changed under me: ' + dest
os.makedirs(os.path.join(LE, '21__System__SitePlanData'), exist_ok=True)
for name, dest in NEW.items():
    shutil.copyfile(os.path.join(OUT, name), dest); print('new  ', dest)
for name, dest in EDIT.items():
    shutil.copyfile(os.path.join(OUT, 'live', name), dest); print('edit ', dest)
