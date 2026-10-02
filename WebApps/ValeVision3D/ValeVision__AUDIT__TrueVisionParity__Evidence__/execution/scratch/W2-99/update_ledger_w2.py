"""W2-99 Parity Scribe (Wave 2) - the wave's pass over ValeVision__PARITY__TrueVisionLedger__.md (ValeVision3D v2.71.4).

Appends within the structure W0-06 established (and W0-99 and W1-99 filled); never touches the Archive (section 9) or
rewrites a history row - a correction is a dated note beside it, an old cell is kept as "[was: ...]":
  1.4  the wave's service-worker bullet          1.5  the version-number convention (WP-S02b-09)
  2.1  a dated note (47, 48, 49, 55)             2.3  a dated note (LE/21, 28, 33, 52, 58)
  3    a dated note on the refreshed "Blocked by"; the 196 rows of Wave-2-touched modules rewritten (ledger_w2_reg);
       "Blocked by" refreshed for every row from the end-of-Wave-2 port-order map; new 3.10 with the records items
  4    an intro bullet and a count line; class flips and dated notes (ledger_w2_wm)
  5.1  a dated note       5.2  a dated note on D16
  6    dated notes on six rows; the Lantern Designer row moved to its own list below the table (WP-S02b-09); the
       back-port memo (WP-S02a-13); the wave's offers
  7    dated notes on two rows; the wave's TrueVision-side items for WT-08
  8.1  a dated note
Pure CRLF and ASCII, as the file is. The Archive and the preamble are proven byte-identical.

Usage: python -B update_ledger_w2.py --build | --apply | --restore
"""
import collections, hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'W0-99'))
sys.path.insert(0, HERE)
import ledger_lib as L                                   # noqa: E402  (W0-99's read-only helpers)
import blocked_by_w2 as BB                               # noqa: E402
import importers as IMP                                  # noqa: E402
import ledger_w2_reg as G                                # noqa: E402
import ledger_w2_wm as WMD                               # noqa: E402
import ledger_w2_text as T                               # noqa: E402

CAND = os.path.join(HERE, 'ledger__candidate.md')
PRE = os.path.join(HERE, 'preimage_records', 'ValeVision__PARITY__TrueVisionLedger__.md')
EXPECT = '14eb54a3b70e4a12c848b040f06a3608c2afb369'     # W1-99 part 2's final SHA-1 (its Port Record)
ARCHIVE_HEAD = '## 9. Archive - the ledger as it stood before 01-Oct-2026'
W2 = ['W2-%02d' % i for i in range(1, 44)]


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def find_one(lines, pred, what, stop=None):
    k = [n for n, ln in enumerate(lines[:stop] if stop else lines) if pred(ln)]
    if len(k) != 1:
        raise SystemExit('%s: found %d times' % (what, len(k)))
    return k[0]


def para_end(lines, k):
    e = k
    while lines[e] != '':
        e += 1
    return e


def bullet_end(lines, k):
    e = k + 1
    while lines[e].startswith('  '):
        e += 1
    return e


def build(text_lines):
    lines = list(text_lines)
    reg = L.register_rows(lines)
    mods = BB.load_map()
    old_bb = {r['i']: r['cells'][11] for r in reg}

    # ---- Module Register rows of Wave-2-touched modules -------------------------------------
    todo = json.load(open(os.path.join(HERE, 'rows_w2.json'), encoding='utf-8'))
    by_i = {r['i']: r for r in reg}
    rewritten, landed = [], 0
    for x in todo:
        r = by_i[x['i']]
        if r['cells'] != x['cells']:
            raise SystemExit('row moved or changed since rows_w2.json: %s' % x['rel'])
        lb = IMP.loaded_by(x['rel']) if not x.get('deleted') else '-'
        spec = G.spec_for(x, lb)
        cells = list(r['cells'])
        for col, fn in spec.items():
            cells[col] = G.clean(fn(cells[col])) if col not in (0, 1) else fn(cells[col])
        if x['landed']:
            landed += 1
        r['cells'] = cells
        rewritten.append(x['rel'])

    # ---- Blocked by: the end-of-Wave-2 map ---------------------------------------------------
    bb = BB.compute(reg, mods)
    kept_none = []
    for r in reg:
        new = bb[r['i']]
        if new == '-' and old_bb[r['i']] == 'none':
            new = 'none'                                   # left the map's closure in Wave 1: nothing blocks it
            kept_none.append(r['cells'][0])
        r['cells'][11] = new
        lines[r['i']] = L.join_row(r['cells'])
    if len(kept_none) != 3:
        raise SystemExit('expected 3 rows to keep none, got %d: %s' % (len(kept_none), kept_none))
    kinds0 = collections.Counter('none' if v == 'none' else '-' if v == '-' else 'list' for v in old_bb.values())
    kinds1 = collections.Counter('none' if r['cells'][11] == 'none' else '-' if r['cells'][11] == '-' else 'list'
                                 for r in reg)
    s3 = [x.format(cleared=kinds1['none'] - kinds0['none'], none0=kinds0['none'], none1=kinds1['none'],
                   list0=kinds0['list'], list1=kinds1['list'], landed=landed) for x in T.S3_NOTE]

    # ---- Release Watermark ------------------------------------------------------------------
    i4 = lines.index('## 4. Release Watermark')
    i5 = lines.index('## 5. Decisions')
    done, flips = set(), collections.Counter()
    pkg_rows = collections.defaultdict(list)
    more, notes_only = 0, 0
    for n in range(i4, i5):
        ln = lines[n]
        if not ln.startswith('| v2.'):
            continue
        c = L.split_row(ln)
        ver = c[0].split()[0]
        if ver not in WMD.WM:
            continue
        spec = WMD.WM[ver]
        old_cls = c[4].strip('*')
        if 'cls' in spec:
            new_cls = spec['cls']
            if old_cls == new_cls:
                raise SystemExit('%s: class already %s' % (ver, new_cls))
            flips[(old_cls, new_cls)] += 1
            c[4] = '**%s**' % new_cls if new_cls != 'PORTED' else new_cls
        elif old_cls == 'PARTIAL':
            more += 1
        else:
            notes_only += 1
        if 'vv' in spec:
            if c[5] != '-':
                raise SystemExit('%s: VV release cell not empty: %r' % (ver, c[5][:60]))
            c[5] = spec['vv']
        if 'vv_app' in spec:
            c[5] = G.app(c[5], spec['vv_app'])
        if spec.get('pk'):
            c[6] = G.pk_add(c[6], spec['pk'])
        c[10] = T.note(spec['note']) if c[10].strip() in ('', '-') else c[10].rstrip() + ' ' + T.note(spec['note'])
        lines[n] = L.join_row(c)
        done.add(ver)
        blob = spec['note'] + ' ' + spec.get('vv', '') + ' ' + spec.get('vv_app', '')
        for p in W2:
            if re.search(re.escape(p) + r'\b', blob):
                pkg_rows[p].append(ver)
    if set(WMD.WM) != done:
        raise SystemExit('watermark rows not found: %s' % sorted(set(WMD.WM) - done))
    if dict(flips) != WMD.EXPECT_FLIP_COUNTS:
        raise SystemExit('class flips %r, expected %r' % (dict(flips), WMD.EXPECT_FLIP_COUNTS))
    counts = collections.Counter()
    for n in range(i4, i5):
        if lines[n].startswith('| v2.') or lines[n].startswith('| (unnumbered'):
            counts[L.split_row(lines[n])[4].strip('*')] += 1
    if sum(counts.values()) != 177:
        raise SystemExit('watermark rows counted: %d, expected 177' % sum(counts.values()))
    open_n = counts['PARTIAL'] + counts['PENDING-SIGNOFF'] + counts['NOT-CONSIDERED'] + counts['REOPENED']
    n_flips = sum(flips.values())
    wm_counts = ['After Wave 2 (v2.71.4): PORTED %d, PARTIAL %d, PENDING-SIGNOFF %d, NOT-CONSIDERED %d, REOPENED %d'
                 % (counts['PORTED'], counts['PARTIAL'], counts['PENDING-SIGNOFF'], counts['NOT-CONSIDERED'],
                    counts['REOPENED']),
                 '(the %d rows the bullet above names moved); every other class unchanged; open **%d**.' % (n_flips, open_n)]
    words = {n: w for n, w in [(30, 'Thirty'), (31, 'Thirty-one'), (32, 'Thirty-two'), (33, 'Thirty-three'),
                               (34, 'Thirty-four'), (35, 'Thirty-five'), (36, 'Thirty-six'), (37, 'Thirty-seven'),
                               (38, 'Thirty-eight'), (39, 'Thirty-nine'), (40, 'Forty'), (29, 'Twenty-nine'),
                               (28, 'Twenty-eight'), (27, 'Twenty-seven'), (26, 'Twenty-six'), (25, 'Twenty-five')]}
    nums = {n: w for n, w in [(8, 'eight'), (9, 'nine'), (10, 'ten'), (11, 'eleven'), (12, 'twelve'), (13, 'thirteen'),
                              (14, 'fourteen'), (7, 'seven'), (6, 'six'), (5, 'five')]}
    intro = [x.format(more=words.get(more, str(more)), notes=nums.get(notes_only, str(notes_only))) for x in T.WM_INTRO]
    k = find_one(lines, lambda ln: ln.startswith('- **After the Wave 1 continuation (ValeVision3D v2.71.3, 02-Oct-2026; '
                                                 'W1-99).**'), 'WM continuation bullet')
    e = bullet_end(lines, k)
    assert lines[e] == '' and lines[e - 1].startswith('  devlog entry (DR-01 (c)).'), lines[e - 1]
    lines[e:e] = intro
    k = find_one(lines, lambda ln: ln.startswith('After the Wave 1 continuation (v2.71.3): PORTED 61, PARTIAL 64'),
                 'WM continuation count line')
    assert lines[k + 1].startswith('REOPENED 1 (the 22 rows the bullet above names moved)') and lines[k + 2] == ''
    lines[k + 2:k + 2] = [''] + wm_counts

    # ---- 3.10 before the '---' that closes section 3 ------------------------------------------
    def rows4(p):
        vs = sorted(set(pkg_rows.get(p, [])), key=lambda v: tuple(int(x) for x in v[1:].split('.')))
        if not vs:
            return None
        if len(vs) <= 6:
            return '4 (%s)' % ', '.join(vs)
        return '4 (%d rows)' % len(vs)
    i4 = lines.index('## 4. Release Watermark')
    j = i4 - 1
    while lines[j] != '---':
        j -= 1
    assert lines[j - 1] == '' and lines[j - 2].startswith("  fields, TD04) stay queued in section 7 (part 1's rows)")
    lines[j - 1:j - 1] = [''] + T.S310(rows4)

    # ---- section 3: the dated note after the continuation's "Refreshed" note -----------------------
    k = find_one(lines, lambda ln: ln.startswith('**Refreshed 02-Oct-2026 by W1-99 for the Wave 1 continuation '
                                                 '(ValeVision3D v2.71.3).**'), '3 refreshed note')
    e = para_end(lines, k)
    assert lines[e - 1].startswith('the app name their importer and say so; section 3.9 lists the changes by package.')
    lines[e:e] = [''] + s3

    # ---- 1.4, 1.5, 2.1, 2.3 -----------------------------------------------------------------
    k = find_one(lines, lambda ln: ln.startswith('- **Wave 1 continuation (ValeVision3D v2.71.3, 02-Oct-2026; W1-99).**'),
                 '1.4 continuation bullet')
    e = bullet_end(lines, k)
    assert lines[e] == '' and lines[e + 1] == '### 1.5 How this file is kept'
    lines[e:e] = T.S14_BULLET
    k = find_one(lines, lambda ln: ln.startswith('- **Each scribe pass:** flip the Module Register rows'), '1.5 bullet')
    e = bullet_end(lines, k)
    assert lines[e] == '' and lines[e + 1] == '---'
    lines[e:e] = T.S15_BULLET
    k = find_one(lines, lambda ln: ln.startswith('**02-Oct-2026 note (W1-99, ValeVision3D v2.71.3).** 54 now holds'),
                 '2.1 note')
    e = para_end(lines, k)
    assert lines[e + 1] == '### 2.2 Folder renumbering (01-Oct-2026)'
    lines[e:e] = [''] + T.S21_NOTE
    k = find_one(lines, lambda ln: ln.startswith('**02-Oct-2026 note (W1-99, ValeVision3D v2.71.3).** The Wave 1 '
                                                 'continuation created LE/59'), '2.3 note')
    e = para_end(lines, k)
    assert lines[e + 1] == '---'
    lines[e:e] = [''] + T.S23_NOTE

    # ---- 5.1 and 5.2 ------------------------------------------------------------------------
    k = lines.index('### 5.2 D01 to D40, as they stand on 01-Oct-2026')
    assert lines[k - 1] == '' and lines[k - 2].startswith('  draft.')
    lines[k - 1:k - 1] = T.S51_NOTE
    k = find_one(lines, lambda ln: ln.startswith('| D16 | Elevation = azimuth + plane origin + mode'), 'D16 row')
    c = L.split_row(lines[k])
    c[3] = c[3] + T.D16_NOTE
    lines[k] = L.join_row(c)

    # ---- 6: row notes; the Lantern Designer row moved; the memo; the offers ------------------------
    arch = lines.index(ARCHIVE_HEAD)
    for start, (col, text) in T.S6_ROW_NOTES.items():
        k = find_one(lines, lambda ln: ln.startswith(start), start, stop=arch)
        c = L.split_row(lines[k])
        c[col] = c[col] + ' ' + text
        lines[k] = L.join_row(c)
    k = find_one(lines, lambda ln: ln.startswith(T.LD_ROW_START), 'Lantern Designer row', stop=arch)
    ld_row = lines.pop(k)
    i6 = lines.index('## 6. Back-ports, ValeVision to TrueVision')
    k = find_one(lines, lambda ln: ln.startswith('| Toast offset 96 px; the 3D canvas and export safe frame'),
                 'last row of 6', stop=lines.index(ARCHIVE_HEAD))
    assert lines[k + 1] == '' and lines[k + 2].startswith('**Offers raised by Wave 0')
    lines[k + 1:k + 1] = [''] + T.S6_MOVED + [ld_row, ''] + T.S6_MEMO
    k = lines.index('## 7. TrueVision-side records waiting for the TrueVision lane')
    j = k - 1
    while lines[j] != '---':
        j -= 1
    assert lines[j - 1] == '' and lines[j - 2].startswith('| A draft-guard case judging a base-less draft')
    lines[j - 1:j - 1] = [''] + T.S6_OFFERS

    # ---- 7: row notes, then the wave's rows -----------------------------------------------------
    arch = lines.index(ARCHIVE_HEAD)
    for start, (col, text) in T.S7_ROW_NOTES.items():
        k = find_one(lines, lambda ln: ln.startswith(start), start, stop=arch)
        c = L.split_row(lines[k])
        c[col] = c[col] + ' ' + text
        lines[k] = L.join_row(c)
    k = lines.index('## 8. Transport (DIV-4)')
    j = k - 1
    while lines[j] != '---':
        j -= 1
    assert lines[j - 1] == '' and lines[j - 2].startswith('| TrueVision\'s devlog (the records note above) |')
    lines[j - 1:j - 1] = [''] + T.S7_ROWS

    # ---- 8.1 note after the continuation's note ---------------------------------------------------
    k = find_one(lines, lambda ln: ln.startswith('**02-Oct-2026 note (W1-99, ValeVision3D v2.71.3).** The Wave 1 '
                                                 'continuation added one caller'), '8.1 note')
    e = para_end(lines, k)
    assert lines[e - 1].startswith('local server, nor the worker, nor the editor-owned key list, and deployed nothing.')
    lines[e:e] = [''] + T.S81_NOTE
    return lines, rewritten, landed, dict(flips), counts, open_n, kinds0, kinds1, more, notes_only, pkg_rows, ld_row


def checks(old_lines, new_lines, ld_row):
    old_t = '\r\n'.join(old_lines)
    new_t = '\r\n'.join(new_lines)
    new_t.encode('ascii')
    for ln in new_lines:
        assert '\r' not in ln and '\n' not in ln
        assert '{{VVREL' not in ln
    a_old = old_t[old_t.index('## 9. Archive'):]
    a_new = new_t[new_t.index('## 9. Archive'):]
    assert a_old == a_new, 'Archive changed'
    assert old_t[:old_t.index('## 1. Header')] == new_t[:new_t.index('## 1. Header')], 'preamble changed'
    stop = new_lines.index(ARCHIVE_HEAD)
    cur, bad = None, []
    for n, ln in enumerate(new_lines[:stop]):
        if ln.startswith('| ') and n + 1 < len(new_lines) and new_lines[n + 1].startswith('|---'):
            cur = len(L.split_row(ln))
            continue
        if ln.startswith('|---'):
            continue
        if ln.startswith('| '):
            if cur is None or len(L.split_row(ln)) != cur:
                bad.append((n + 1, len(L.split_row(ln)), cur))
        elif not ln.startswith('|'):
            cur = None
    assert not bad, 'table rows with the wrong column count: %r' % bad[:5]
    cur, bad = None, []
    for n, ln in enumerate(new_lines[:stop]):
        if ln.startswith('| ') and n + 1 < len(new_lines) and new_lines[n + 1].startswith('|---'):
            cur = ln.count('|')
            continue
        if ln.startswith('| ') and ln.count('|') != cur:
            bad.append((n + 1, ln.count('|'), cur))
    assert not bad, 'table rows with a bare pipe in a cell: %r' % bad[:5]
    reg = L.register_rows(new_lines)
    assert len(reg) == 610, len(reg)
    assert all(r['cells'][11] for r in reg), 'an empty Blocked by cell'
    old_stop = old_lines.index(ARCHIVE_HEAD)
    in_tables = lambda ln: ln.startswith('| ') and not ln.startswith('|---')
    keep = [ln for ln in old_lines[:old_stop] if not in_tables(ln)]
    it = iter(new_lines[:stop])
    for ln in keep:
        for cand in it:
            if cand == ln:
                break
        else:
            raise AssertionError('old line lost or out of order: %r' % ln[:100])
    assert new_lines.count(ld_row) == 1, 'the moved row is not there exactly once'
    new_set = set(new_lines[:stop])
    changed = [ln for ln in old_lines[:old_stop] if in_tables(ln) and ln not in new_set]
    return changed


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--build'
    raw = open(L.LEDGER, 'rb').read()
    if mode == '--restore':
        pre = open(PRE, 'rb').read()
        cand = open(CAND, 'rb').read()
        if sha1(raw) != sha1(cand):
            raise SystemExit('REFUSED: the ledger is not this pass\'s candidate (%s)' % sha1(raw)[:8])
        with open(L.LEDGER, 'wb') as fh:
            fh.write(pre)
        print('restored the pre-image', sha1(pre)[:8])
        return
    if sha1(raw) != EXPECT:
        raise SystemExit('STOPPED: the ledger is not at W1-99\'s final SHA-1 (%s != %s)' % (sha1(raw)[:8], EXPECT[:8]))
    old_lines = L.read_lines()
    (new_lines, rewritten, landed, flips, counts, open_n, kinds0, kinds1, more, notes_only, pkg_rows,
     ld_row) = build(old_lines)
    changed = checks(old_lines, new_lines, ld_row)
    out = '\r\n'.join(new_lines).encode('ascii')
    with open(CAND, 'wb') as fh:
        fh.write(out)
    print('register rows rewritten: %d (landed from 3.5: %d); Blocked by none %d -> %d, list %d -> %d, - %d -> %d'
          % (len(rewritten), landed, kinds0['none'], kinds1['none'], kinds0['list'], kinds1['list'], kinds0['-'],
             kinds1['-']))
    print('watermark flips:', flips, '; PARTIAL rows gaining more:', more, '; notes only:', notes_only)
    print('classes after:', dict(counts), '; open', open_n)
    print('watermark rows per package:', {p: len(set(v)) for p, v in sorted(pkg_rows.items())})
    print('old table rows rewritten or moved: %d' % len(changed))
    print('candidate: %d -> %d bytes, sha1 %s' % (len(raw), len(out), sha1(out)[:8]))
    if mode == '--build':
        return
    if mode == '--apply':
        os.makedirs(os.path.dirname(PRE), exist_ok=True)
        if not os.path.exists(PRE):
            with open(PRE, 'wb') as fh:
                fh.write(raw)
        assert sha1(open(PRE, 'rb').read()) == EXPECT
        cur = open(L.LEDGER, 'rb').read()
        if sha1(cur) != EXPECT:
            raise SystemExit('STOPPED: the ledger changed while the candidate was built')
        tmp = L.LEDGER + '.w2-99.tmp'
        with open(tmp, 'wb') as fh:
            fh.write(out)
        os.replace(tmp, L.LEDGER)
        assert sha1(open(L.LEDGER, 'rb').read()) == sha1(out)
        print('written', L.LEDGER)
        return
    raise SystemExit(__doc__)


if __name__ == '__main__':
    main()
