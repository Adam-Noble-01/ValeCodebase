# Teeth for W2-34's dictionary test: each mutant (a seam undone) must make the test fail.
# Runs on copies under scratch/W2-34/mut/ (a mini app root); never touches the live tree.
import os, shutil, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
VV   = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
MUT  = os.path.join(HERE, 'mut')
SC   = os.path.join('02__Src__AppModules', '55__Feature__SpellCheck')
TE   = '80__Testing__PrototypeEnvironment'
UC   = '50__ValeVision__UserConfig'

MUTANTS = [
    ('TV service name',         'Na__SpellCheck__Dictionary__.js', "'whitecardopedia-local-dev';  ", "'na-projectvision-local-dev'; "),
    ('TV route in defaults',    'Na__SpellCheck__Dictionary__.js', "apiPath          : '/api/valevision/user-config/spellings'", "apiPath          : '/api/truevision/user-config/spellings'"),
    ('TV groups key',           'Na__SpellCheck__Dictionary__.js', "'ValeVision__UserSpellings__Groups'", "'TrueVision__UserSpellings__Groups'"),
    ('TV restart fallback',     'Na__SpellCheck__Dictionary__.js', "'Restart the Whitecardopedia local server", "'Restart the ProjectVision local server"),
    ('TV word bar fallback',    'Na__SpellCheck__WordBar__.js',    "'Add {word} to the ValeVision spelling dictionary.'", "'Add {word} to the TrueVision spelling dictionary.'"),
    ('TV label in config',      'Na__SpellCheck__Config__.json',   '"Restart the Whitecardopedia local server', '"Restart the ProjectVision local server'),
    ('TV file in config',       'Na__SpellCheck__Config__.json',   '"Dictionary__File"             : "50__ValeVision__UserConfig/', '"Dictionary__File"             : "50__TrueVision__UserConfig/'),
]


def fresh():
    shutil.rmtree(MUT, ignore_errors=True)
    shutil.copytree(os.path.join(VV, SC), os.path.join(MUT, SC))
    shutil.copytree(os.path.join(VV, UC), os.path.join(MUT, UC))
    os.makedirs(os.path.join(MUT, TE))
    shutil.copy2(os.path.join(VV, TE, 'Na__Test__SpellCheckDictionary__.test.mjs'), os.path.join(MUT, TE))


def run():
    r = subprocess.run(['node', os.path.join(MUT, TE, 'Na__Test__SpellCheckDictionary__.test.mjs')], capture_output=True, text=True, encoding='utf-8', errors='replace')
    fails = [l.strip() for l in r.stdout.splitlines() if l.strip().startswith('FAIL')]
    return r.returncode, fails


fresh()
code, fails = run()
print('unmutated copy: exit', code, 'fails', len(fails))
assert code == 0
caught = 0
for name, file, old, new in MUTANTS:
    fresh()
    path = os.path.join(MUT, SC, file)
    text = open(path, encoding='utf-8').read()
    assert text.count(old) == 1, (name, text.count(old))
    open(path, 'w', encoding='utf-8', newline='\n').write(text.replace(old, new))
    code, fails = run()
    ok = code != 0
    caught += ok
    print(('CAUGHT ' if ok else 'MISSED ') + name + '  (' + str(len(fails)) + ' fail): ' + '; '.join(f[6:70] for f in fails[:3]))
shutil.rmtree(MUT, ignore_errors=True)
print(caught, 'of', len(MUTANTS), 'caught')
