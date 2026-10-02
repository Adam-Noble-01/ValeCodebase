"""Run the two G4 verifiers on the W1-11 candidates through a temporary app root that holds only the three files."""
import os
import shutil
import subprocess
import tempfile

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SCR = os.path.dirname(os.path.abspath(__file__))
TV = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode'
FILES = [
    '02__Src__AppModules/46__System__NorthDirection/Na__North__AppConfig__.json',
    '02__Src__AppModules/46__System__NorthDirection/Na__North__CompassGizmo__.js',
    '02__Src__AppModules/46__System__NorthDirection/Na__North__DevMenu__Editor__.js',
]
root = tempfile.mkdtemp(prefix='na-w111-g4-')
try:
    for rel in FILES:
        dst = os.path.join(root, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(os.path.join(SCR, 'candidate', os.path.basename(rel)), dst)
    shutil.copyfile(os.path.join(VV, 'ValeVision__NOTES__FolderNumberRegistry__.md'),
                    os.path.join(root, 'ValeVision__NOTES__FolderNumberRegistry__.md'))   # <-- The lint's whole-tree registry check reads it
    for name, args in (('PortNotes', ['--verbose', '--pin', 'b2aa9151', '--tv', TV]), ('ParityNaming', ['--pin', 'b2aa9151', '--tv', TV])):
        cmd = ['node', os.path.join(VV, '80__Testing__PrototypeEnvironment', 'Na__Verify__%s__.mjs' % name), '--root', root] + args + ['--files'] + FILES
        r = subprocess.run(cmd, cwd=VV, capture_output=True)
        out = r.stdout.decode('utf-8', 'replace') + r.stderr.decode('utf-8', 'replace')
        print('=' * 30, name, 'exit', r.returncode)
        print(out)
finally:
    shutil.rmtree(root, ignore_errors=True)
