"""W0-99 incident: compare `git status --porcelain=v1 --untracked-files=all` computed with a given index file (default:
the rebuilt one) against the last pre-incident snapshot (status_after_prep.txt). The only differences allowed are this
package's own scratch files (scratch/W0-99/). Read-only on the repository (a status run may refresh the given index's
stat data, which is all it writes)."""
import os, subprocess, sys

VCB = r'D:\10_CoreLib__ValeCodebase'
HERE = os.path.dirname(os.path.abspath(__file__))
index_file = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'index_incident', 'index__rebuilt')
env = dict(os.environ)
if index_file != 'LIVE':
    env['GIT_INDEX_FILE'] = index_file
out = subprocess.run(['git', '-C', VCB, 'status', '--porcelain=v1', '--untracked-files=all'], capture_output=True,
                     env=env).stdout.decode('utf-8').splitlines()
before = [ln.rstrip('\n') for ln in open(os.path.join(HERE, 'status_after_prep.txt'), encoding='utf-8') if ln.strip()]
MINE = 'WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/scratch/W0-99/'
added = [ln for ln in out if ln not in set(before)]
gone = [ln for ln in before if ln not in set(out)]
foreign_added = [ln for ln in added if MINE not in ln]
foreign_gone = [ln for ln in gone if MINE not in ln]
print('status lines now %d, before %d; new %d (outside scratch/W0-99: %d), gone %d (outside scratch/W0-99: %d)' % (
    len(out), len(before), len(added), len(foreign_added), len(gone), len(foreign_gone)))
for ln in foreign_added[:20]:
    print('  + ' + ln)
for ln in foreign_gone[:20]:
    print('  - ' + ln)
staged = [ln for ln in out if ln[0] not in (' ', '?', '!')]
print('staged entries: %d (%s)' % (len(staged), sorted({ln[:2] for ln in staged})))
sys.exit(0 if not foreign_added and not foreign_gone else 1)
