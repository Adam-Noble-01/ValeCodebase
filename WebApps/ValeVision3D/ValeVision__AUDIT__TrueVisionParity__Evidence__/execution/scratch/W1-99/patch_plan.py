"""W1-99 Parity Scribe - three dated notes in ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md (the audit's WP-S03a-10,
ValeVision half: "the VV plan's D22 text and its JSON comment 'the live site ignores it' predate VV v2.45.0").

Nothing is rewritten: each note is appended beside the words it corrects (D22's row, the drawings-block JSON comment and
the settled open item in section 13), as W0-06 did for D05. LF and UTF-8 kept; every anchor must match exactly once;
the file must be at W0-06's recorded SHA-1 (7a8771f7) before the write (compare and swap). Removing the three insertions
gives back the old file byte for byte (checked before the write).

Usage: python -B patch_plan.py --build | --apply | --restore
"""
import hashlib, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
PLAN = os.path.join(VV, 'ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md')
CAND = os.path.join(HERE, 'plan__candidate.md')
PRE = os.path.join(HERE, 'preimage_records', 'ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md')
EXPECT = '7a8771f70422ebf304adbb7c953fa864d3e4f405'     # W0-06's final SHA-1 (its Port Record)

D22_OLD = ("on localhost only while the project's Enable Layout Mode switch is on. |")
D22_ADD = (" Revised 02-Oct-2026 (records only, W1-99; the parity audit's WP-S03a-10): since v2.45.0 (15-Sep-2026) one rule"
           " holds on localhost and on the live site alike - drawing tabs show only while the project's Layout Mode switch"
           " is on and it has at least one sheet (the Layout Editor loader's availability rule); D65 (DR-25 (a)) keeps the"
           " switch as a recorded divergence until the publishing port, and since v2.71.2 the strip is TrueVision's"
           " TabStrip 2.0.0 - 3D Model, Drawings (a menu of every drawing) and Specification - reached through the loader"
           " (D78, W1-34). The refinement above is kept as it was decided.")
JSON_OLD = ("// v2.21.20: localhost Dev switch for the tab strip; the live site ignores it")
JSON_ADD = (" (02-Oct-2026 note, W1-99: stale since v2.45.0, which applies the switch on localhost and on the live site"
            " alike - see D22)")
OPEN_OLD = ("stored as `LayoutEditor__DrawingsData__LayoutModeEnabled`, off by default) is on, sheets or not.")
OPEN_ADD = (" 02-Oct-2026 note (W1-99): superseded by v2.45.0 (15-Sep-2026) - one rule on localhost and on the live site"
            " alike, the switch on and at least one sheet (see D22).")


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def build(text):
    out = text
    for old, add in ((D22_OLD, D22_ADD), (JSON_OLD, JSON_ADD), (OPEN_OLD, OPEN_ADD)):
        n = out.count(old)
        if n != 1:
            raise SystemExit('anchor found %d times: %r' % (n, old[:70]))
        if old.endswith(' |'):
            out = out.replace(old, old[:-2] + add + ' |')
        else:
            out = out.replace(old, old + add)
    return out


def checks(old, new):
    # the three additions are ASCII, and removing them gives back the old text exactly
    for add in (D22_ADD, JSON_ADD, OPEN_ADD):
        add.encode('ascii')
        assert new.count(add) == 1
    back = new.replace(D22_ADD, '').replace(JSON_ADD, '').replace(OPEN_ADD, '')
    assert back == old, 'undo proof failed'
    assert '\r' not in new
    assert new.count('\n') == old.count('\n'), 'line count changed'
    print('checks: 3 notes appended beside their words, ASCII, LF, line count unchanged (%d), undo proof exact'
          % new.count('\n'))


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
        raise SystemExit('REFUSED: the PLAN is at %s, expected W0-06\'s %s' % (sha1(cur)[:8], EXPECT[:8]))
    old = cur.decode('utf-8')
    new = build(old)
    checks(old, new)
    out = new.encode('utf-8')
    open(CAND, 'wb').write(out)
    print('candidate: %d -> %d bytes, sha1 %s' % (len(cur), len(out), sha1(out)[:8]))
    if mode == '--apply':
        os.makedirs(os.path.dirname(PRE), exist_ok=True)
        open(PRE, 'wb').write(cur)
        tmp = PLAN + '.w1-99.tmp'
        open(tmp, 'wb').write(out)
        if sha1(open(PLAN, 'rb').read()) != EXPECT:
            os.remove(tmp)
            raise SystemExit('STOPPED: the PLAN changed while the candidate was built')
        os.replace(tmp, PLAN)
        print('written; live sha1', sha1(open(PLAN, 'rb').read())[:8])


if __name__ == '__main__':
    main()
