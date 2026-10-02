"""W2-99 Parity Scribe - two dated notes in ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md (the audit's WP-S02a-13,
ValeVision half: D16's face pick and gizmo grip are superseded by TrueVision's Drawing Planes, which Wave 2 ported).

Nothing is rewritten: each note is appended beside the words it corrects (D16's row and the first paragraph of section
9.2), as W1-99 did for D22. LF and UTF-8 kept; every anchor must match exactly once; the file must be at W1-99's recorded
SHA-1 (e9531a8c) before the write (compare and swap). Removing the two insertions gives back the old file byte for byte
(checked before the write). Adapted from W1-99's patch_plan.py.

Usage: python -B patch_plan_w2.py --build | --apply | --restore
"""
import hashlib, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
PLAN = os.path.join(VV, 'ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md')
CAND = os.path.join(HERE, 'plan__candidate.md')
PRE = os.path.join(HERE, 'preimage_records', 'ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md')
EXPECT = 'e9531a8c112828ede7e4be116b646e81faae79b3'     # W1-99's final SHA-1 (its Port Record)

D16_OLD = ("Face-pick seeds a new elevation and a draggable gizmo edits it loosely; the sliders fine-tune. |")
D16_ADD = (" Revised 02-Oct-2026 (records only, W2-99; the parity audit's WP-S02a-13): the definition stands, but since"
           " v2.71.4 TrueVision's Drawing Planes (47__System__DrawingPlanes, W2-40 and W2-01) and its 2.1.0 Elevations"
           " editor (W2-05) do the face pick's and the grip's jobs - Aim at face, Move to face and dragging the plane -"
           " so Pick Face, Re-pick and the gizmo drag are gone; FacePick, GizmoGrip and PlaneGizmo are unused in both"
           " apps and retire in lockstep (D89 retired the azimuth setter). The decision above is kept as it was made.")
S92_OLD = ("The TrueVision gizmo is a readout. Here it also carries a grip: ")
S92_ADD = ("(02-Oct-2026 note, W2-99: superseded in v2.71.4 by TrueVision's Drawing Planes and 2.1.0 Elevations editor -"
           " see D16; the paragraph is kept as it was built.) ")


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def build(text):
    out = text
    n = out.count(D16_OLD)
    if n != 1:
        raise SystemExit('D16 anchor found %d times' % n)
    out = out.replace(D16_OLD, D16_OLD[:-2] + D16_ADD + ' |')
    n = out.count(S92_OLD)
    if n != 1:
        raise SystemExit('9.2 anchor found %d times' % n)
    out = out.replace(S92_OLD, S92_ADD + S92_OLD)
    return out


def checks(old, new):
    for add in (D16_ADD, S92_ADD):
        add.encode('ascii')
        assert new.count(add) == 1
    back = new.replace(D16_ADD, '').replace(S92_ADD, '')
    assert back == old, 'undo proof failed'
    assert '\r' not in new
    assert new.count('\n') == old.count('\n'), 'line count changed'
    assert '{{VVREL' not in D16_ADD + S92_ADD
    print('checks: 2 notes beside their words, ASCII, LF, line count unchanged (%d), undo proof exact' % new.count('\n'))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--build'
    if mode == '--restore':
        cur = open(PLAN, 'rb').read()
        if sha1(cur) != sha1(open(CAND, 'rb').read()):
            raise SystemExit('REFUSED: the PLAN is not this pass\'s output (%s)' % sha1(cur)[:8])
        open(PLAN, 'wb').write(open(PRE, 'rb').read())
        print('restored the PLAN to', sha1(open(PLAN, 'rb').read())[:8])
        return
    cur = open(PLAN, 'rb').read()
    if sha1(cur) != EXPECT:
        raise SystemExit('REFUSED: the PLAN is at %s, expected W1-99\'s %s' % (sha1(cur)[:8], EXPECT[:8]))
    old = cur.decode('utf-8')
    new = build(old)
    checks(old, new)
    out = new.encode('utf-8')
    open(CAND, 'wb').write(out)
    print('candidate: %d -> %d bytes, sha1 %s' % (len(cur), len(out), sha1(out)[:8]))
    if mode == '--apply':
        os.makedirs(os.path.dirname(PRE), exist_ok=True)
        open(PRE, 'wb').write(cur)
        tmp = PLAN + '.w2-99.tmp'
        open(tmp, 'wb').write(out)
        if sha1(open(PLAN, 'rb').read()) != EXPECT:
            os.remove(tmp)
            raise SystemExit('STOPPED: the PLAN changed while the candidate was built')
        os.replace(tmp, PLAN)
        print('written; live sha1', sha1(open(PLAN, 'rb').read())[:8])


if __name__ == '__main__':
    main()
