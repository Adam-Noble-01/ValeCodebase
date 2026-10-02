"""W0-99 incident restore: put D:/10_CoreLib__ValeCodebase/.git/index back to exactly what it held before an accidental
`git add -A` (a shell command substitution in one of this package's commands) staged the whole working tree.

Before the incident the index held HEAD's tree plus W0-02's 81 `git mv` renames and nothing else (every status snapshot
of the gate and of this package agrees: 81 staged entries, all R100). `git mv` stages the new path with the blob the old
path had in the index, which was HEAD's blob (the renames are R100). So the exact pre-incident index is:
    HEAD's tree, then for each rename: remove <old>, add <new> with HEAD's mode and blob of <old>.

Steps (working tree never touched):
  --plan   back up the live index (index__after_add_A), build the rebuilt index in a temporary index file with
           GIT_INDEX_FILE (read-tree HEAD; update-index --index-info; update-index -q --refresh for stat data), and
           prove `git diff --cached -M HEAD` on it lists exactly the 81 renames, all R100.
  --apply  the same proof again, then an atomic swap of .git/index (refused if index.lock exists or the live index
           changed since the backup), then the status check against the last pre-incident snapshot.
  --undo   put the backed-up post-incident index back (only if the live index is still the rebuilt one).
"""
import hashlib, json, os, shutil, subprocess, sys

VCB = r'D:\10_CoreLib__ValeCodebase'
GIT_DIR = os.path.join(VCB, '.git')
INDEX = os.path.join(GIT_DIR, 'index')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'index_incident')
BACKUP = os.path.join(OUT, 'index__after_add_A')
REBUILT = os.path.join(OUT, 'index__rebuilt')
RENAMES = json.load(open(os.path.join(HERE, 'index_incident__renames_before.json'), encoding='utf-8'))


def sha1(p):
    return hashlib.sha1(open(p, 'rb').read()).hexdigest()


def git(args, index_file=None, input_bytes=None, check=True):
    env = dict(os.environ)
    if index_file:
        env['GIT_INDEX_FILE'] = index_file
    p = subprocess.run(['git', '-C', VCB] + args, input=input_bytes, capture_output=True, env=env)
    if check and p.returncode != 0:
        raise SystemExit('git %s failed: %s' % (' '.join(args), p.stderr.decode('utf-8', 'replace')))
    return p


def build():
    if os.path.exists(REBUILT):
        os.remove(REBUILT)
    git(['read-tree', 'HEAD'], index_file=REBUILT)
    lines = []
    for code, old, new in RENAMES:
        out = git(['ls-tree', 'HEAD', '--', old]).stdout.decode('utf-8').strip()
        if not out:
            raise SystemExit('HEAD has no entry for %s' % old)
        meta, path = out.split('\t', 1)
        mode, typ, sha = meta.split()
        assert typ == 'blob' and path == old, out
        lines.append('0 %s\t%s' % ('0' * 40, old))
        lines.append('%s %s\t%s' % (mode, sha, new))
    git(['update-index', '--index-info'], index_file=REBUILT, input_bytes=('\n'.join(lines) + '\n').encode('utf-8'))
    git(['update-index', '-q', '--refresh'], index_file=REBUILT, check=False)   # stat data only; exit 1 = some files differ


def prove(index_file):
    out = git(['diff', '--cached', '-M', '--name-status', 'HEAD'], index_file=index_file).stdout.decode('utf-8')
    rows = [ln.split('\t') for ln in out.splitlines() if ln.strip()]
    want = {(old, new) for _, old, new in RENAMES}
    got = {(r[1], r[2]) for r in rows if r[0].startswith('R') and len(r) == 3}
    codes = sorted({r[0] for r in rows})
    ok = len(rows) == len(RENAMES) == 81 and got == want and codes == ['R100']
    print('  %s: %d staged entries, codes %s, renames match the pre-incident set: %s' % (
        os.path.basename(index_file), len(rows), codes, got == want))
    return ok


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--plan'
    os.makedirs(OUT, exist_ok=True)
    if mode == '--undo':
        if sha1(INDEX) != sha1(REBUILT):
            raise SystemExit('REFUSED: the live index is not the rebuilt one')
        shutil.copyfile(BACKUP, INDEX + '.w0-99.tmp')
        os.replace(INDEX + '.w0-99.tmp', INDEX)
        print('the post-incident index is back')
        return
    if mode == '--plan':
        shutil.copyfile(INDEX, BACKUP)
        print('backup of the live (post-incident) index: %s (sha1 %s)' % (BACKUP, sha1(BACKUP)[:8]))
    build()
    if not prove(REBUILT):
        raise SystemExit('the rebuilt index does not match the pre-incident index; nothing swapped')
    if mode == '--apply':
        if os.path.exists(INDEX + '.lock'):
            raise SystemExit('REFUSED: .git/index.lock exists (another git process)')
        if sha1(INDEX) != sha1(BACKUP):
            raise SystemExit('REFUSED: the live index changed since the backup was taken')
        shutil.copyfile(REBUILT, INDEX + '.w0-99.tmp')
        os.replace(INDEX + '.w0-99.tmp', INDEX)
        print('swapped; live index sha1 %s' % sha1(INDEX)[:8])
        if not prove(INDEX):
            raise SystemExit('the live index does not prove out - run --undo and report')


if __name__ == '__main__':
    main()
