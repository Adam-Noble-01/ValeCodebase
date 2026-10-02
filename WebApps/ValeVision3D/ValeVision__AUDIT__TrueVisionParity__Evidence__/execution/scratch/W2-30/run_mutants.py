# Planted faults in the staged copies: the adapted test must catch every one. Restores each file after.
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
STAGE = os.path.join(HERE, 'stage')
SPEC = os.path.join(STAGE, '02__Src__AppModules', '51__System__LayoutEditor', '50__Feature__Specification')
TEST = os.path.join('80__Testing__PrototypeEnvironment', 'Na__Test__SpecLockstep__.test.mjs')

MUTANTS = [
    ('Sync writes the file without looking', 'Na__LayoutEditor__SpecData__Lockstep__.js',
     'if (opts.look && Na__LeSpec__LockstepOn()) {', 'if (false) {'),
    ('Reload Local marks the file as the cloud copy (the old fault)', 'Na__LayoutEditor__SpecData__Transport__.js',
     'Na__LeSpec__AdoptFile(local.data, local.modifiedIso);', "Na__LeSpec__Adopt({ status : Na__LeSpec__STATUS_READY, data : local.data, source : 'repository' });"),
    ('The lockstep runs off localhost', 'Na__LayoutEditor__SpecData__Document__.js',
     'return Na__LeSpec__Editable && Na__AppUtils__IsRunningOnLocalhost() && ', 'return Na__LeSpec__Editable && '),
    ('A draft is put back unasked over the file (the old fault)', 'Na__LayoutEditor__SpecData__Lockstep__.js',
     'if (!lockstep) { Na__LeSpec__RestoreDraft(); return false; }', 'if (true) { Na__LeSpec__RestoreDraft(); return false; }'),
    ('Sync writes R2 and disk through one two-phase call', 'Na__LayoutEditor__SpecData__Transport__.js',
     'const local = await Na__LeSpec__MirrorLocal(out, { look : true });', 'const local = await Na__LocalMirror__WriteSiblingFile(setup.fileName, out);'),
]

caught = 0
for name, file, old, new in MUTANTS:
    path = os.path.join(SPEC, file)
    original = open(path, 'rb').read()
    text = original.decode('utf-8')
    assert text.count(old) == 1, name
    if 'Na__LocalMirror__WriteSiblingFile(' in new:
        text = text.replace("    import { Na__AppUtils__ConfirmDialog__Show }", "    import { Na__LocalMirror__WriteSiblingFile } from '../../03__AppUtils/Na__AppUtils__LocalProjectMirror__.js';\n    import { Na__AppUtils__ConfirmDialog__Show }", 1)
    open(path, 'wb').write(text.replace(old, new).encode('utf-8'))
    try:
        run = subprocess.run(['node', TEST], cwd=STAGE, capture_output=True, text=True, timeout=120)
    finally:
        open(path, 'wb').write(original)
    failed = [l.strip() for l in run.stdout.splitlines() if l.strip().startswith('FAIL')]
    ok = run.returncode != 0
    caught += ok
    print(('CAUGHT  ' if ok else 'MISSED  ') + name + ('  -> ' + failed[0] if failed else ''))
print(f'{caught}/{len(MUTANTS)} caught')
