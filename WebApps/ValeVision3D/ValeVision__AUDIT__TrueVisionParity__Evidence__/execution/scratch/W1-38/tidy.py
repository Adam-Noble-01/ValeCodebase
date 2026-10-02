"""W1-38 scratch: tidy after the package.

- every scratch .py compiles (bytecode written to the OS temp folder, never beside the scripts)
- the TrueVision text copies fetch_tv.py made are deleted (NA wording; fetch_tv.py regenerates them)
- the three temp modules TrueVision's colour palette test leaves in the OS temp folder are removed
- the three landed files are hash-checked against landed_sha1.txt

Usage: python -B tidy.py
"""
import glob
import hashlib
import os
import py_compile
import shutil
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'

ok = 0
for path in sorted(glob.glob(os.path.join(HERE, '*.py'))):
    target = os.path.join(tempfile.gettempdir(), 'w1_38_' + os.path.basename(path) + 'c')
    py_compile.compile(path, cfile=target, doraise=True)
    os.remove(target)
    ok += 1
print(f'compiled {ok} scratch .py file(s) (bytecode to the OS temp folder, removed)')

tv = os.path.join(HERE, 'tv')
if os.path.isdir(tv):
    shutil.rmtree(tv)
    print('removed the TrueVision text copies (scratch/W1-38/tv); fetch_tv.py regenerates them')

for name in ('Na__Test__PaletteManager__.mjs', 'Na__Test__PaletteManagerTwo__.mjs', 'Na__Test__PalettePicker__.mjs'):
    p = os.path.join(tempfile.gettempdir(), name)
    if os.path.exists(p):
        os.remove(p)
        print('removed temp module', p)

for line in open(os.path.join(HERE, 'landed_sha1.txt'), encoding='utf-8'):
    rel, digest = line.rstrip('\n').split('\t')
    now = hashlib.sha1(open(os.path.join(VV, rel), 'rb').read()).hexdigest()
    print(('UNCHANGED ' if now == digest else 'CHANGED   ') + rel + '  ' + now[:8])
