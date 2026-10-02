# W1-13 scratch: remove the TrueVision copies this package read at the pin (tv/ and the record checks lifted from
# TrueVision's tests). Only paths inside this scratch folder are touched. To re-run the harnesses later:
#   python -B extract_tv.py; python -B extract_tv_harness_deps.py; python -B make_record_checks.py
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
targets = [os.path.join(HERE, 'tv'), os.path.join(HERE, 'record_checks__generated.mjs')]
for path in targets:
    real = os.path.realpath(path)
    if not real.startswith(os.path.realpath(HERE) + os.sep):
        raise SystemExit('refusing a path outside the scratch folder: ' + real)
    if os.path.isdir(real):
        shutil.rmtree(real)
        print('removed folder ' + real)
    elif os.path.isfile(real):
        os.remove(real)
        print('removed file ' + real)
