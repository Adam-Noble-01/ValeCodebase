# W1-11 - run the gates from the VV app root and save each output under scratch/W1-11/<label>_<gate>.txt.
# Usage: python -B run_gates.py <label>     (label: pre | final | ...)
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TV = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode'
EXEC = os.path.dirname(os.path.dirname(HERE))   # execution/
MINE = [
    '02__Src__AppModules/46__System__NorthDirection/Na__North__AppConfig__.json',
    '02__Src__AppModules/46__System__NorthDirection/Na__North__CompassGizmo__.js',
    '02__Src__AppModules/46__System__NorthDirection/Na__North__DevMenu__Editor__.js',
]

GATES = [
    ('g1_modulegraph', ['node', '80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs']),
    ('g2_exports', ['node', '80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs']),
    ('g3_pathgate', ['python', '-B', os.path.join(EXEC, 'tools', 'path_gate_records_exempt.py'), '--root', VV]),
    ('g4_naming_mine', ['node', '80__Testing__PrototypeEnvironment/Na__Verify__ParityNaming__.mjs', '--tv', TV, '--pin', 'b2aa9151', '--files'] + MINE),
    ('g4_naming_tree', ['node', '80__Testing__PrototypeEnvironment/Na__Verify__ParityNaming__.mjs']),
    ('g4_portnotes_mine', ['node', '80__Testing__PrototypeEnvironment/Na__Verify__PortNotes__.mjs', '--tv', TV, '--pin', 'b2aa9151', '--verbose', '--files'] + MINE),
    ('g4_portnotes_tree', ['node', '80__Testing__PrototypeEnvironment/Na__Verify__PortNotes__.mjs', '--fails-only']),
    ('t_northcompass', ['node', '80__Testing__PrototypeEnvironment/Na__Test__NorthCompass__.test.mjs']),
]


def main():
    label = sys.argv[1] if len(sys.argv) > 1 else 'run'
    only = set(sys.argv[2:])
    summary = []
    for name, cmd in GATES:
        if only and name not in only:
            continue
        res = subprocess.run(cmd, cwd=VV, capture_output=True)
        out = res.stdout.decode('utf-8', 'replace') + '\n--- stderr ---\n' + res.stderr.decode('utf-8', 'replace')
        path = os.path.join(HERE, '%s_%s.txt' % (label, name))
        with open(path, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write('$ ' + ' '.join(cmd) + '\n(exit %d)\n\n' % res.returncode + out)
        tail = [ln for ln in out.strip().splitlines() if ln.strip()][-3:]
        summary.append('%-20s exit %d   %s' % (name, res.returncode, ' | '.join(t.strip()[:110] for t in tail)))
    print('\n'.join(summary))


if __name__ == '__main__':
    main()
