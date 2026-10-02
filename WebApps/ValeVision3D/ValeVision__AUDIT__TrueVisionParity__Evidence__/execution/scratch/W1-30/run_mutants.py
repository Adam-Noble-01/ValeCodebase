# Builds mutant copies of the three files the W1-30 test sections load (KeyScope,
# DocumentKeys, the key map) under scratch/W1-30/mutants/<name>/02__Src__AppModules,
# breaks one thing in each, and runs the scratch test against each copy. Every
# mutant must FAIL (exit 1) on the checks named for it. The live tree is only read.

import os, shutil, subprocess, sys, re

HERE    = os.path.dirname(os.path.abspath(__file__))
VV_SRC  = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '02__Src__AppModules'))
TEST    = os.path.join(HERE, 'Na__Test__DocumentKeys__.W1-30-sections.test.mjs')
OUTROOT = os.path.join(HERE, 'mutants')

DOCKEYS  = '51__System__LayoutEditor/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js'
KEYMAP   = '51__System__LayoutEditor/31__System__DocumentKeys/Na__Hotkeys__DocumentTabs__.json'
KEYSCOPE = '03__AppUtils/Na__AppUtils__KeyScope__.js'


def read(rel):
    with open(os.path.join(VV_SRC, *rel.split('/')), 'rb') as f:
        return f.read()


def sub_once(data, old, new):
    if data.count(old) < 1:
        raise SystemExit('mutation anchor missing: ' + old.decode('utf-8', 'replace'))
    return data.replace(old, new)


MUTANTS = {
    'M1_tv_console_prefix': {
        DOCKEYS: lambda b: sub_once(b, b"'[ValeVision3D LayoutEditor] ", b"'[TrueVision3D LayoutEditor] "),
    },
    'M2_held_key_acts_every_beat': {
        DOCKEYS: lambda b: sub_once(b, b'if (!event.repeat) {', b'if (true) {'),
    },
    'M3_typing_rule_removed': {
        DOCKEYS: lambda b: sub_once(b, b"if (Na__LeDocKeys__TypesCharacter(key, held) && Na__KeyScope__IsTypingTarget(event.target)) return;", b";"),
    },
    'M4_key_map_missing': {
        KEYMAP: None,
    },
    'M5_command_not_ctrl': {
        KEYMAP: lambda b: sub_once(b, b'"Setup__MetaIsCtrl"     : true', b'"Setup__MetaIsCtrl"     : false'),
    },
}

if os.path.isdir(OUTROOT):
    shutil.rmtree(OUTROOT)

summary = []
for name, edits in MUTANTS.items():
    src = os.path.join(OUTROOT, name, '02__Src__AppModules')
    for rel in (KEYSCOPE, DOCKEYS, KEYMAP):
        data = read(rel)
        if rel in edits:
            fn = edits[rel]
            if fn is None:
                continue
            data = fn(data)
        path = os.path.join(src, *rel.split('/'))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as f:
            f.write(data)
    env = dict(os.environ, W1_30_SRC=src)
    run = subprocess.run(['node', TEST], capture_output=True, text=True, env=env)
    fails = [line.strip()[6:] for line in run.stdout.splitlines() if line.strip().startswith('FAIL')]
    summary.append((name, run.returncode, fails))
    with open(os.path.join(OUTROOT, name + '.txt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(run.stdout + run.stderr)

for name, code, fails in summary:
    print(name, 'exit', code, '-', len(fails), 'FAIL')
    for fail in fails:
        print('    ', fail)

ok = all(code == 1 and fails for _, code, fails in summary)
print('ALL MUTANTS CAUGHT' if ok else 'A MUTANT SURVIVED')
sys.exit(0 if ok else 1)
