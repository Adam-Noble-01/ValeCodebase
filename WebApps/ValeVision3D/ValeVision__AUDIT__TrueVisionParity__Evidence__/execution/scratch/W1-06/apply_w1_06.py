# =============================================================================
# W1-06 apply: land the candidates built by build_w1_06.py into the live ValeVision tree
# =============================================================================
#
#   python -B apply_w1_06.py            land: every existing target must still hash as in baseline_sha1.txt and
#                                       every new target must be absent; pre-images go to scratch/W1-06/preimage/;
#                                       then each candidate's bytes are written whole and read back.
#   python -B apply_w1_06.py --restore  put the pre-images back and remove the new files - refused if any target
#                                       has changed since this package landed it.
#
# Line endings: the candidate bytes are written exactly (LF for the whole-file ports, as git show returns
# TrueVision's text; CRLF kept for the two hunk replays).
# =============================================================================

import hashlib
import os
import shutil
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, 'candidates')
PRE = os.path.join(HERE, 'preimage')
BASELINE = os.path.join(HERE, 'baseline_sha1.txt')


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def read(path):
    with open(path, 'rb') as fh:
        return fh.read()


def load_baseline():
    rows = []
    with open(BASELINE, 'r', encoding='utf-8') as fh:
        for line in fh:
            parts = line.split()
            if len(parts) < 3:
                continue
            if parts[0] == 'ABSENT':
                rows.append((parts[-1], None))
            else:
                rows.append((parts[-1], parts[0]))
    return rows


def live_path(rel):
    return os.path.join(VV, rel.replace('/', os.sep))


def land():
    rows = load_baseline()
    problems = []
    for rel, expected in rows:
        path = live_path(rel)
        if not os.path.exists(os.path.join(CAND, rel.replace('/', os.sep))):
            problems.append('no candidate for ' + rel)
        if expected is None:
            if os.path.exists(path):
                problems.append('expected absent but present: ' + rel)
        else:
            if not os.path.exists(path):
                problems.append('expected present but absent: ' + rel)
            elif sha1(read(path)) != expected:
                problems.append('changed since the baseline: ' + rel + ' (' + sha1(read(path)) + ')')
    if problems:
        print('REFUSED - nothing written:')
        for p in problems:
            print('  ' + p)
        return 1

    for rel, expected in rows:
        if expected is None:
            continue
        dest = os.path.join(PRE, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copyfile(live_path(rel), dest)
        if sha1(read(dest)) != expected:
            print('pre-image copy mismatch: ' + rel)
            return 1

    for rel, expected in rows:
        data = read(os.path.join(CAND, rel.replace('/', os.sep)))
        path = live_path(rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as fh:
            fh.write(data)
        back = read(path)
        status = 'NEW ' if expected is None else 'SWAP'
        if sha1(back) != sha1(data):
            print('WRITE MISMATCH ' + rel)
            return 1
        print('%s %s  %s -> %s' % (status, rel, (expected or '-')[:8], sha1(back)[:8]))
    print('LANDED %d files' % len(rows))
    return 0


def restore():
    rows = load_baseline()
    problems = []
    for rel, expected in rows:
        cand = read(os.path.join(CAND, rel.replace('/', os.sep)))
        path = live_path(rel)
        if not os.path.exists(path) or sha1(read(path)) != sha1(cand):
            problems.append('not as this package landed it: ' + rel)
    if problems:
        print('RESTORE REFUSED - nothing changed:')
        for p in problems:
            print('  ' + p)
        return 1
    for rel, expected in rows:
        path = live_path(rel)
        if expected is None:
            os.remove(path)
            print('REMOVED ' + rel)
        else:
            shutil.copyfile(os.path.join(PRE, rel.replace('/', os.sep)), path)
            print('RESTORED %s  %s' % (rel, sha1(read(path))[:8]))
    return 0


if __name__ == '__main__':
    sys.exit(restore() if '--restore' in sys.argv else land())
