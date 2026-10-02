"""W1-99 Parity Scribe - the Wave 1 entry at the top of ValeVision__DEVLOG__.md (ValeVision3D v2.71.2).

The entry text is scratch/W1-99/devlog_entry_w1.txt. It goes above the v2.71.1 entry (the newest), after the title line
and its blank line, exactly as W0-99 placed v2.71.1. Checks before any write:
  - the devlog is at W0-99's recorded SHA-1 and its first version heading is still v2.71.1 (the fresh-read rule; a parallel
    session releasing meanwhile stops this script);
  - the new version is the next patch step after the top one;
  - the entry is ASCII, has no tab, no release placeholder, no line over 125 characters outside the two headings;
  - the file stays pure CRLF, and removing the inserted block gives back the old file byte for byte.
Compare and swap at the write; the pre-image is kept in scratch/W1-99/preimage_records/.

Usage: python -B write_devlog_w1.py --build | --apply | --restore
"""
import hashlib, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
DEVLOG = os.path.join(VV, 'ValeVision__DEVLOG__.md')
ENTRY = os.path.join(HERE, 'devlog_entry_w1.txt')
CAND = os.path.join(HERE, 'devlog__candidate.md')
PRE = os.path.join(HERE, 'preimage_records', 'ValeVision__DEVLOG__.md')
EXPECT = '3b03fc289201be073c2f949345950a05ae5b3676'      # W0-99's final SHA-1 (its Port Record)
NEW_VER = (2, 71, 2)
HEAD_RE = re.compile(r'^## ValeVision3D v(\d+)\.(\d+)\.(\d+) - ')


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def entry_lines():
    raw = open(ENTRY, 'rb').read().decode('ascii')       # refuses anything but ASCII
    raw = raw.replace('\r\n', '\n')
    lines = raw.rstrip('\n').split('\n')
    assert lines[0] == '# ---------------------------------------------------------', lines[0]
    m = HEAD_RE.match(lines[1])
    assert m and tuple(int(x) for x in m.groups()) == NEW_VER, lines[1]
    assert lines[2].startswith('### Ported from TrueVision3D'), lines[2]
    assert lines[-1] == '**Not yet confirmed by Adam.**', lines[-1]
    for n, ln in enumerate(lines, 1):
        assert '\t' not in ln, 'tab at entry line %d' % n
        assert '{{VVREL' not in ln and 'VVREL:' not in ln, 'placeholder at entry line %d' % n
        assert ln == ln.rstrip(), 'trailing space at entry line %d' % n
        if n > 3 and len(ln) > 125 and not ln.startswith('**'):
            raise SystemExit('entry line %d is %d characters' % (n, len(ln)))
    return lines + ['', '']


def build(old):
    text = old.decode('utf-8')                            # older entries hold a few non-ASCII bytes; kept as they are
    assert text.encode('utf-8') == old
    assert '\r\n' in text and text.count('\n') == text.count('\r\n'), 'expected pure CRLF'
    lines = text.split('\r\n')
    assert lines[0] == '# ValeVision3D Development Log' and lines[1] == ''
    assert lines[2] == '# ---------------------------------------------------------'
    m = HEAD_RE.match(lines[3])
    top = tuple(int(x) for x in m.groups()) if m else None
    if top != (2, 71, 1):
        raise SystemExit('STOPPED: the devlog top is %r, not v2.71.1 - a parallel session may have released' % lines[3][:90])
    if not (NEW_VER[:2] == top[:2] and NEW_VER[2] == top[2] + 1):
        raise SystemExit('version %r is not the next patch step after %r' % (NEW_VER, top))
    block = entry_lines()
    new_lines = lines[:2] + block + lines[2:]
    new = '\r\n'.join(new_lines)
    # checks: the block is ASCII; the file stays pure CRLF; removing the block gives back the old bytes exactly
    '\r\n'.join(block).encode('ascii')
    assert new.count('\n') == new.count('\r\n')
    back = '\r\n'.join(new_lines[:2] + new_lines[2 + len(block):])
    assert back.encode('utf-8') == old, 'undo proof failed'
    heads = [ln for ln in new_lines if HEAD_RE.match(ln)]
    assert heads[0].startswith('## ValeVision3D v2.71.2 - ') and heads[1].startswith('## ValeVision3D v2.71.1 - ')
    return new.encode('utf-8'), len(block)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--build'
    if mode == '--restore':
        cur = open(DEVLOG, 'rb').read()
        if sha1(cur) != sha1(open(CAND, 'rb').read()):
            raise SystemExit('REFUSED: the devlog is not this pass\'s output (%s)' % sha1(cur)[:8])
        open(DEVLOG, 'wb').write(open(PRE, 'rb').read())
        print('restored the devlog to', sha1(open(DEVLOG, 'rb').read())[:8])
        return
    cur = open(DEVLOG, 'rb').read()
    if sha1(cur) != EXPECT:
        raise SystemExit('REFUSED: the devlog is at %s, expected W0-99\'s %s' % (sha1(cur)[:8], EXPECT[:8]))
    out, n = build(cur)
    open(CAND, 'wb').write(out)
    print('checks: top was v2.71.1, entry v2.71.2 (next patch step), ASCII, pure CRLF, undo proof exact')
    print('candidate: %d inserted lines; %d -> %d bytes; %d -> %d lines; sha1 %s' % (
        n, len(cur), len(out), cur.count(b'\n') + 1, out.count(b'\n') + 1, sha1(out)[:8]))
    if mode == '--apply':
        os.makedirs(os.path.dirname(PRE), exist_ok=True)
        open(PRE, 'wb').write(cur)
        tmp = DEVLOG + '.w1-99.tmp'
        open(tmp, 'wb').write(out)
        if sha1(open(DEVLOG, 'rb').read()) != EXPECT:
            os.remove(tmp)
            raise SystemExit('STOPPED: the devlog changed while the candidate was built')
        os.replace(tmp, DEVLOG)
        print('written; live sha1', sha1(open(DEVLOG, 'rb').read())[:8])


if __name__ == '__main__':
    main()
