# W2-30 land / restore.
#   --snapshot : copy every target as it stands to preimage/ and record its sha1 (absent = new file)
#   --apply    : refuse unless every target is still as snapshotted, then write the candidates
#   --restore  : refuse unless every target is still as landed, then put the preimage back (new files removed)
import hashlib
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
CAND = os.path.join(HERE, 'candidate')
PRE = os.path.join(HERE, 'preimage')
SNAP = os.path.join(HERE, 'snapshot.json')
LANDED = os.path.join(HERE, 'landed.json')

LE = '02__Src__AppModules/51__System__LayoutEditor/'
SPEC = LE + '50__Feature__Specification/'
TARGETS = [
    LE + '52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Lockstep__.js',
    SPEC + 'Na__LayoutEditor__SpecData__State__.js',
    SPEC + 'Na__LayoutEditor__SpecData__Document__.js',
    SPEC + 'Na__LayoutEditor__SpecData__Draft__.js',
    SPEC + 'Na__LayoutEditor__SpecData__Editing__.js',
    SPEC + 'Na__LayoutEditor__SpecData__Lockstep__.js',
    SPEC + 'Na__LayoutEditor__SpecData__Transport__.js',
    SPEC + 'Na__LayoutEditor__SpecData__.js',
    SPEC + 'Na__LayoutEditor__SpecLinks__.js',
    '80__Testing__PrototypeEnvironment/Na__Test__SpecLockstep__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__StatementLockstep__.test.mjs',
]


def sha(path):
    if not os.path.exists(path):
        return None
    return hashlib.sha1(open(path, 'rb').read()).hexdigest()


def live(rel):
    return os.path.join(APP, rel.replace('/', os.sep))


def snapshot():
    os.makedirs(PRE, exist_ok=True)
    snap = {}
    for rel in TARGETS:
        snap[rel] = sha(live(rel))
        if snap[rel]:
            dst = os.path.join(PRE, rel.replace('/', os.sep))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copyfile(live(rel), dst)
    json.dump(snap, open(SNAP, 'w'), indent=1)
    print(json.dumps(snap, indent=1))


def apply():
    snap = json.load(open(SNAP))
    moved = [rel for rel in TARGETS if sha(live(rel)) != snap[rel]]
    if moved:
        sys.exit('REFUSED - changed since the snapshot: ' + ', '.join(moved))
    landed = {}
    for rel in TARGETS:
        src = os.path.join(CAND, rel.replace('/', os.sep))
        data = open(src, 'rb').read()
        os.makedirs(os.path.dirname(live(rel)), exist_ok=True)
        with open(live(rel), 'wb') as f:
            f.write(data)
        landed[rel] = sha(live(rel))
        assert landed[rel] == hashlib.sha1(data).hexdigest()
    json.dump(landed, open(LANDED, 'w'), indent=1)
    print('LANDED', len(landed), 'files')


def restore():
    snap = json.load(open(SNAP))
    landed = json.load(open(LANDED))
    moved = [rel for rel in TARGETS if sha(live(rel)) != landed[rel]]
    if moved:
        sys.exit('REFUSED - changed since landing: ' + ', '.join(moved))
    for rel in TARGETS:
        if snap[rel] is None:
            os.remove(live(rel))
        else:
            shutil.copyfile(os.path.join(PRE, rel.replace('/', os.sep)), live(rel))
    d = live(LE + '52__Feature__StatementWriter/01__Core__Data')
    for p in (d, os.path.dirname(d)):
        if os.path.isdir(p) and not os.listdir(p):
            os.rmdir(p)
    print('RESTORED')


if __name__ == '__main__':
    {'--snapshot': snapshot, '--apply': apply, '--restore': restore}[sys.argv[1]]()
