"""Run the two G4 verifiers on the W1-01 candidates through a temporary app root that holds only the five files."""
import os, shutil, subprocess, sys, tempfile
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SCR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-01'
TV = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode'
FILES = [
    '02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js',
    '02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js',
    '02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__Invalidation.js',
    '02__Src__AppModules/26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js',
    '02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js',
]
root = tempfile.mkdtemp(prefix='na-w101-g4-')
try:
    for rel in FILES:
        dst = os.path.join(root, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(os.path.join(SCR, 'candidate', os.path.basename(rel)), dst)
    for name, args in (('PortNotes', ['--verbose', '--pin', 'b2aa9151', '--tv', TV]), ('ParityNaming', [])):
        cmd = ['node', os.path.join(VV, '80__Testing__PrototypeEnvironment', 'Na__Verify__%s__.mjs' % name), '--root', root] + args + ['--files'] + FILES
        r = subprocess.run(cmd, cwd=VV, capture_output=True)
        out = r.stdout.decode('utf-8', 'replace') + r.stderr.decode('utf-8', 'replace')
        print('=' * 30, name, 'exit', r.returncode)
        print(out)
finally:
    shutil.rmtree(root, ignore_errors=True)
