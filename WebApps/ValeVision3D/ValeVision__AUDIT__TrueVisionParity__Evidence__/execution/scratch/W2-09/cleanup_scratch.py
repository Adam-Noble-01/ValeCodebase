# W2-09 scratch: remove the re-creatable copies of app code from this package's scratch folder
# (tv/, rehearsal/, before/, planted/), keeping vv_before/ (the restore snapshot), the scripts, logs and diffs.
# Re-create them with: fetch_tv.py (tv/), port_w2_09.py --dry-run (rehearsal/), make_trees.py (before/),
# make_planted.py (planted/).
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
for name in ('tv', 'rehearsal', 'before', 'planted'):
    path = os.path.join(HERE, name)
    if os.path.commonpath([HERE, os.path.abspath(path)]) != HERE:
        raise SystemExit('refusing a path outside the scratch folder: ' + path)
    if os.path.isdir(path):
        shutil.rmtree(path)
        print('removed', path)
