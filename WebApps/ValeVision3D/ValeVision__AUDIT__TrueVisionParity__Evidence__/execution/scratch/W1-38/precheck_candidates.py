"""W1-38 scratch: check the three candidates BEFORE they land.

1. node --check on the two JavaScript candidates.
2. The candidate test run against this app's live tree (its HERE pointed at the live test folder): every check but
   the panel host's attach line is expected to pass before landing (54/55).
3. The PanelHost candidate carries TrueVision's attach line, import and the 28 exports.
4. A scratch mirror (only the three candidates at their app paths) for the G4 file checks and UiParity check [4]:
   ParityNaming --files, PortNotes --files (the tree checks of a mirror are not meaningful and are not read),
   UiParity --root mirror (only check [4] is read).

Usage: python -B precheck_candidates.py
"""
import os
import re
import shutil
import subprocess

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TV = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode'
PIN = 'b2aa9151'
HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, 'candidates')
MIRROR = os.path.join(HERE, 'mirror')
REL = {
    'Na__LayoutEditor__PanelHost__.js': '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js',
    'Na__LayoutEditor__Styles__Panels__.css': '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css',
    'Na__Test__ColourPalette__.test.mjs': '80__Testing__PrototypeEnvironment/Na__Test__ColourPalette__.test.mjs',
}
results = []


def run(cmd, cwd=VV):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True)
    return p.returncode, p.stdout.decode('utf-8', 'replace') + p.stderr.decode('utf-8', 'replace')


def note(ok, label, detail=''):
    results.append((ok, label))
    print(('PASS  ' if ok else 'FAIL  ') + label + (('\n        ' + detail.strip().replace('\n', '\n        ')) if detail and not ok else ''))


# 1. node --check
for name in ('Na__LayoutEditor__PanelHost__.js', 'Na__Test__ColourPalette__.test.mjs'):
    code, out = run(['node', '--check', os.path.join(CAND, name)])
    note(code == 0, f'node --check {name}', out)

# 2. the candidate test against the live tree
src = open(os.path.join(CAND, 'Na__Test__ColourPalette__.test.mjs'), 'rb').read().decode('utf-8')
anchor = "const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\\/([A-Za-z]:)/, '$1'))\n"
assert src.count(anchor) == 1
probe = src.replace(anchor, "const HERE = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/80__Testing__PrototypeEnvironment'\n")
tmp = os.path.join(HERE, 'precheck_test_against_live.mjs')
open(tmp, 'wb').write(probe.encode('utf-8'))
code, out = run(['node', tmp])
os.remove(tmp)
open(os.path.join(HERE, 'precheck_test_against_live.txt'), 'w', encoding='utf-8', newline='\n').write(out)
fails = [l for l in out.splitlines() if l.startswith('FAIL')]
summary = [l for l in out.splitlines() if re.search(r'\d+ passed, \d+ failed', l)]
note(len(fails) == 1 and 'panel host attaches every colour input' in fails[0] and summary == ['54 passed, 1 failed'],
     'candidate test against the live tree before landing: 54/55, the one failure the panel host line ' + str(summary), out)

# 3. the PanelHost candidate's attach line, import and exports
host = open(os.path.join(CAND, 'Na__LayoutEditor__PanelHost__.js'), 'rb').read().decode('utf-8')
note(re.search(r"if \(type === 'color'\) Na__ColourPalette__Attach\(input\);", host) is not None, 'candidate PanelHost carries the test\'s attach line')
note("import { Na__ColourPalette__Attach } from '../../54__Feature__ColourPalette/Na__ColourPalette__.js';" in host, 'candidate PanelHost imports the palette door at TrueVision\'s path')
block = re.search(r'export\s*\{([^}]*)\}', host).group(1)
names = [n.strip() for n in block.split(',') if n.strip()]
note(len(names) == 28 and 'Na__LePanels__LinkedPairRow' in names and 'Na__LePanels__ShowLink' in names,
     f'candidate PanelHost exports 28 names, LinkedPairRow and ShowLink among them ({len(names)})')
door = os.path.join(VV, '02__Src__AppModules', '54__Feature__ColourPalette', 'Na__ColourPalette__.js')
note(os.path.exists(door) and re.search(r'Na__ColourPalette__Attach', open(door, encoding='utf-8').read()) is not None,
     'the palette door the import names exists in this app and exports Na__ColourPalette__Attach (W1-37)')

# 4. mirror
if os.path.exists(MIRROR):
    shutil.rmtree(MIRROR)
for name, rel in REL.items():
    dst = os.path.join(MIRROR, rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(os.path.join(CAND, name), dst)
files = list(REL.values())
code, out = run(['node', '80__Testing__PrototypeEnvironment/Na__Verify__ParityNaming__.mjs', '--root', MIRROR, '--files', *files])
open(os.path.join(HERE, 'precheck_g4_naming.txt'), 'w', encoding='utf-8', newline='\n').write(out)
mine = [l for l in out.splitlines() if any(os.path.basename(r) in l for r in files) or 'banner' in l or 'file-line' in l]
file_fails = [l for l in out.splitlines() if re.search(r'^\s+(FAIL|WARN)\s+:\d', l)]
print('      (ParityNaming on the mirror, file findings only):', len(file_fails))
for l in out.splitlines():
    if any(os.path.basename(r) in l for r in files):
        print('      ', l.strip()[:200])
code2, out2 = run(['node', '80__Testing__PrototypeEnvironment/Na__Verify__PortNotes__.mjs', '--root', MIRROR, '--files', *files, '--verbose'])
open(os.path.join(HERE, 'precheck_g4_portnotes.txt'), 'w', encoding='utf-8', newline='\n').write(out2)
note(code2 == 0 and 'RESULT: PASS (0 fail, 0 warn, 3 pending)' in out2, 'PortNotes on the three candidates: 0 fail, 0 warn, 3 pending', out2)
code3, out3 = run(['node', '80__Testing__PrototypeEnvironment/Na__Verify__UiParity__.mjs', TV, '--pin', PIN, '--root', MIRROR])
open(os.path.join(HERE, 'precheck_uiparity.txt'), 'w', encoding='utf-8', newline='\n').write(out3)
line4 = [l for l in out3.splitlines() if '[4]' in l]
note(bool(line4) and 'PASS' in line4[0], 'UiParity check [4] on the candidate sheet: ' + (line4[0].strip() if line4 else '(no line)'), out3)
shutil.rmtree(MIRROR)

print()
print(f"{sum(1 for ok, _ in results if ok)} passed, {sum(1 for ok, _ in results if not ok)} failed")
