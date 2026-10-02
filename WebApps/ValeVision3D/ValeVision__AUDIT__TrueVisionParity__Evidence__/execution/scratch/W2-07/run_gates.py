"""Run the W2-07 gates from the VV app root and save each output as <prefix>_<gate>.txt in this scratch folder.

Usage: python -B run_gates.py <prefix> [--quick]
  G1 ModuleGraph, G2 Exports, G3 path gate (records-exempt wrapper, OC-04), G4 ParityNaming + PortNotes on the
  package's files (and the whole tree), node --check on the package's .js files, every node test in
  80__Testing__PrototypeEnvironment, and the package's own scratch harnesses on the live files.
"""
import subprocess, sys, os, glob, time
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
EXE = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution'
SCR = os.path.join(EXE, 'scratch', 'W2-07')
TV = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode'
FILES = [
    '02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js',
    '02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js',
]
prefix = sys.argv[1] if len(sys.argv) > 1 else 'run'
results = {}

def run(name, cmd, cwd=VV):
    t0 = time.time()
    r = subprocess.run(cmd, cwd=cwd, capture_output=True)
    out = r.stdout.decode('utf-8', 'replace') + r.stderr.decode('utf-8', 'replace')
    path = os.path.join(SCR, '%s_%s.txt' % (prefix, name))
    with open(path, 'w', encoding='utf-8') as f:
        f.write('$ ' + ' '.join(cmd) + '\n')
        f.write(out)
        f.write('\n[exit %d, %.1fs]\n' % (r.returncode, time.time() - t0))
    tail = [l for l in out.strip().splitlines() if l.strip()][-2:]
    print('%-34s exit %d   %s' % (name, r.returncode, ' | '.join(t.strip()[:140] for t in tail)))
    results[name] = r.returncode
    return r.returncode

run('g1_modulegraph', ['node', '80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs'])
run('g2_exports', ['node', '80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs'])
run('g3_pathgate', ['python', '-B', os.path.join(EXE, 'tools', 'path_gate_records_exempt.py'), '--root', VV])
run('g4_naming_files', ['node', '80__Testing__PrototypeEnvironment/Na__Verify__ParityNaming__.mjs', '--files'] + FILES)
run('g4_portnotes_files', ['node', '80__Testing__PrototypeEnvironment/Na__Verify__PortNotes__.mjs', '--verbose', '--pin', 'b2aa9151', '--tv', TV, '--files'] + FILES)
if '--quick' not in sys.argv:
    run('g4_naming_tree', ['node', '80__Testing__PrototypeEnvironment/Na__Verify__ParityNaming__.mjs'])
    run('g4_portnotes_tree', ['node', '80__Testing__PrototypeEnvironment/Na__Verify__PortNotes__.mjs'])
for f in FILES:
    run('check_' + os.path.basename(f).replace('.js', ''), ['node', '--check', f])
if '--quick' not in sys.argv:
    for t in sorted(glob.glob(os.path.join(VV, '80__Testing__PrototypeEnvironment', '*.test.mjs'))):
        run('test_' + os.path.basename(t).replace('.test.mjs', ''), ['node', os.path.relpath(t, VV)])
    run('harness_refine_unit_live', ['node', os.path.join(SCR, 'w2_07_refine_unit.mjs'), '--live'], cwd=SCR)
    run('harness_loop_live', ['node', os.path.join(SCR, 'w2_07_loop_harness.mjs'), '--target', 'live'], cwd=SCR)

bad = [k for k, v in results.items() if v != 0]
print('\nnon-zero exits: ' + (', '.join(bad) if bad else 'none'))
