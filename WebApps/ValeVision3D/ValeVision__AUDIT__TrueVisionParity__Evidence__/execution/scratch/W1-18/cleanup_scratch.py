# W1-18 scratch: remove this package's own re-creatable scratch copies - TrueVision's files read at the pin (tv/),
# the rehearsal and planted-defect copies, and the py_compile cache - and nothing else. vv_before/ (the restore
# source and the harness's OLD side), the scripts, the diffs and the logs stay.
#   tv/        -> python -B extract_tv.py (and devlog_releases.py for TrueVision's devlog)
#   rehearsal/ -> python -B port_w1_18.py --date 02-Oct-2026 --out rehearsal
#   planted/   -> python -B make_planted.py (after rehearsal/)
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
for name in ('tv', 'rehearsal', 'planted', '__pycache__'):
    path = os.path.join(HERE, name)
    if os.path.dirname(path) != HERE:
        raise SystemExit('refusing a path outside this scratch folder: ' + path)
    if os.path.isdir(path):
        count = sum(len(files) for _, _, files in os.walk(path))
        shutil.rmtree(path)
        print('removed %-12s (%d file(s))' % (name + '/', count))
