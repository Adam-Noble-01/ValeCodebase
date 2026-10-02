"""
W0-18 scratch: teeth check. Each mutant is the candidate blueprint with one rule broken; the matching test must
fail. Runs every mutant in its own process through run_on_candidates.py with the candidate server.
"""
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TESTS = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment'
SHEET = 'Server__ValeVisionSheetImages__Api__.py'
USER = 'Server__ValeVisionUserConfig__Api__.py'

MUTANTS = [
    ('sheet: TrueVision content folder kept', SHEET, "root = os.path.join(project_dir, IMAGES_DIR)",
     "root = os.path.join(project_dir, '30__TrueVision__AppContent', IMAGES_DIR)", 'Na__Test__SheetImagesApi__.test.py'),
    ('sheet: archive accepted as a home', SHEET, "and folder != ARCHIVE_DIR and '..' not in folder",
     "and '..' not in folder", 'Na__Test__SheetImagesApi__.test.py'),
    ('sheet: archive deletes instead of moving', SHEET, "                    _replace_with_retry(full, destination)",
     "                    os.remove(full)", 'Na__Test__SheetImagesApi__.test.py'),
    ('sheet: folder-id ignored', SHEET, "project_dir = vv_shared.resolve_project_dir(project_folder, year_code, folder_id)",
     "project_dir = vv_shared.resolve_project_dir(project_folder, year_code)", 'Na__Test__SheetImagesApi__.test.py'),
    ('user: TrueVision key prefix', USER, "KEY_PREFIX              = 'ValeVision__UserSpellings__'",
     "KEY_PREFIX              = 'TrueVision__UserSpellings__'", 'Na__Test__UserSpellingsApi__.test.py'),
    ('user: TrueVision app group title', USER, "APP_GROUP_TITLE         = 'Added in ValeVision'",
     "APP_GROUP_TITLE         = 'Added in TrueVision'", 'Na__Test__UserSpellingsApi__.test.py'),
    ('user: a word in another group added again', USER, "    if _find(document, word):\n        return False\n",
     "    if _find(document, word) and False:\n        return False\n", 'Na__Test__UserSpellingsApi__.test.py'),
]

env = dict(os.environ, PYTHONIOENCODING='utf-8')
all_bite = True
for label, file_name, old, new, test in MUTANTS:
    mutant_dir = os.path.join(HERE, 'mutant')
    shutil.rmtree(mutant_dir, ignore_errors=True)
    shutil.copytree(os.path.join(HERE, 'candidate'), mutant_dir)
    path = os.path.join(mutant_dir, file_name)
    text = open(path, encoding='utf-8').read()
    assert text.count(old) == 1, (label, text.count(old))
    open(path, 'w', encoding='utf-8', newline='\n').write(text.replace(old, new))
    result = subprocess.run([sys.executable, os.path.join(HERE, 'run_on_candidates.py'), os.path.join(TESTS, test),
                             '--candidate-dir', mutant_dir], capture_output=True, env=env)
    out = result.stdout.decode('utf-8', 'replace')
    fails = [line.strip() for line in out.splitlines() if line.strip().startswith('FAIL ') or line.strip().startswith('FAIL  ')]
    bites = result.returncode != 0
    all_bite = all_bite and bites
    print('%-45s exit=%d  %d failing checks %s' % (label, result.returncode, len(fails), '' if bites else '<-- DID NOT BITE'))
    for line in fails[:4]:
        print('      ' + line[:150])
shutil.rmtree(os.path.join(HERE, 'mutant'), ignore_errors=True)
print('ALL MUTANTS CAUGHT' if all_bite else 'SOME MUTANT SURVIVED')
