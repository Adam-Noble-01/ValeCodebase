"""W1 integrator gate (continuation) - the one small fix, byte-preserving.

FIX-C1  VV 80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs (W0-15's test, last written by W1-26)
        Eight allow-list entries are STALE: their values came level with TrueVision's in the continuation, so the test
        warns "STALE: take them off the list" and fails with --strict (evidence: stale_rows_evidence_c2.txt).
          W1-22 (sheet identity) took TrueVision's TitleBlock Rows (the Document ID row, the Rev prefix), deleted this
          app's own A3 ClassicFieldAnchors DrawingNumber anchor (vv-only, now in neither app), and took the Scales
          Description and AvailableScaleDenominators with 1:200 (DR-17);
          W1-25 (embedded PDF fonts) took the Style Description, FontFamily (Open Sans first), TitleValueWeightNote and
          the Pdf Description.
        W1-22 F3 and W1-25 F3 ask the integrator to take them off; W1-26 F1 leaves all eight to the integrator. W1-22 F3
        also asks to relabel TitleBlock/RowsNote from "withheld, W1-22" (stale label: W1-22 has landed and kept Vale
        wording for good) to "identity, permanent" - TrueVision's note but for a client's name and postal address, left
        out, and this app's 34 mm logo cell (104 mm title on A3).
        The STYLE and SCALES groups held only stale rows: each goes with its comment and the blank line after it.
        DEVELOPMENT LOG 1.0.4 added, newest first, with a W1-26 release placeholder (W1-26 F1 names all eight rows and
        the file's newest entry, 1.0.3, already carries W1-26's placeholder; every continuation placeholder resolves to
        the same release). The entry names the rows in words, not by key (the precedent of 1.0.2). Nothing else changes:
        Panels/FocusNote and every other row stay as they are.

Usage: python -B apply_gate_fixes_c2.py [--dry-run | --candidate | --restore]
The file must be at its recorded SHA-1 (W1-26's landed bytes), LF and BOM-free, and every anchor must match exactly once,
or nothing is written. The pre-image is saved to C2/preimage/ before the write; --restore writes it back (only while the
live file is still exactly what this script wrote).
"""
import difflib, hashlib, os, sys

VVR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, 'preimage')
TST = os.path.join(VVR, r'80__Testing__PrototypeEnvironment\Na__Test__AppConfigParity__.test.mjs')
EXPECT = {TST: 'c369fe72019e7a98656c07b625e6624dd235623e'}

OPEN = '{' + '{'
CLOSE = '}' + '}'
TOKEN_W126 = OPEN + 'VVREL:W1-26' + CLOSE

EDITS = {
    TST: [
        # W1-25: the STYLE group held only these three rows - the comment, the rows and the blank line after them go
        ("        // STYLE | Open Sans first comes with the embedded PDF fonts\n"
         "        [ 'value',   'Style/Description',                      'withheld',  'W1-25', 'describes the Helvetica-first face kept until the PDF embeds Open Sans' ],\n"
         "        [ 'value',   'Style/FontFamily',                       'withheld',  'W1-25', 'Helvetica first until PdfFonts embeds Open Sans (DR-21)' ],\n"
         "        [ 'value',   'Style/TitleValueWeightNote',             'withheld',  'W1-25', 'describes the jsPDF Helvetica weights kept until then' ],\n"
         "\n",
         '', 1),
        # W1-22 F3: RowsNote relabelled (still differs: a client's name and postal address left out; the 34 mm logo cell)
        ("        [ 'value',   'TitleBlock/RowsNote',                    'withheld',  'W1-22', \"describes this app's Drawing No. row, measured in Helvetica\" ],\n",
         "        [ 'value',   'TitleBlock/RowsNote',                    'identity',  'permanent', \"a client's name and postal address left out; this app's 34 mm logo cell\" ],\n", 1),
        # W1-22: the title block rows
        ("        [ 'value',   'TitleBlock/Rows',                        'withheld',  'W1-22', 'DrawingNumber \"Drawing No.\" and no Revision prefix until the Document ID switch' ],\n",
         '', 1),
        # W1-22: the VV-only Classic anchor, deleted from the config
        ("        [ 'vv-only', 'TitleBlock/ClassicFieldAnchors/A3/DrawingNumber', 'withheld', 'W1-22', 'retired with the Document ID switch' ],\n",
         '', 1),
        # W1-22: the SCALES group held only these two rows
        ("        // SCALES | 1:200 (DR-17) with the sheet identity package\n"
         "        [ 'value',   'Scales/Description',                     'withheld',  'W1-22', 'describes the 1:20-1:100 list kept until 1:200 is added' ],\n"
         "        [ 'value',   'Scales/AvailableScaleDenominators',      'withheld',  'W1-22', '1:200 added with the SheetSetup fallback (DR-17)' ],\n"
         "\n",
         '', 1),
        # W1-25: the PDF description
        ("        [ 'value',   'Pdf/Description',                        'withheld',  'W1-25', 'describes the Helvetica PDF until Open Sans is embedded' ],\n",
         '', 1),
        # DEVELOPMENT LOG 1.0.4, newest first
        ('// DEVELOPMENT LOG:\n// 02-Oct-2026 - Version 1.0.3 (' + TOKEN_W126 + ')\n',
         '// DEVELOPMENT LOG:\n'
         '// 02-Oct-2026 - Version 1.0.4 (' + TOKEN_W126 + ')\n'
         '// - Eight entries taken off the allow-list, each now level with\n'
         '//   TrueVision (they were reported STALE): the sheet identity package\n'
         '//   (W1-22) took TrueVision\'s title block rows, retired this app\'s own\n'
         '//   Classic anchor for the drawing number and took the scales\n'
         '//   description and list with 1:200; the embedded PDF fonts (W1-25)\n'
         '//   took the style description, font family (Open Sans first), title\n'
         '//   value weight note and the PDF description. The title block rows\n'
         '//   note moves from withheld to identity, for good: it is TrueVision\'s\n'
         '//   but for a client\'s name and postal address, left out, and this\n'
         '//   app\'s 34 mm logo cell. Made by the W1 integrator gate, completing\n'
         '//   W1-22\'s, W1-25\'s and W1-26\'s follow-ups.\n'
         '//\n'
         '// 02-Oct-2026 - Version 1.0.3 (' + TOKEN_W126 + ')\n', 1),
    ],
}


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def build():
    out = {}
    for path, edits in EDITS.items():
        raw = open(path, 'rb').read()
        if sha1(raw) != EXPECT[path]:
            sys.exit('DRIFT: %s is at sha1 %s, expected %s - nothing written' % (path, sha1(raw), EXPECT[path]))
        if b'\r\n' in raw or raw.startswith(b'\xef\xbb\xbf'):
            sys.exit('%s has CRLF or a BOM; this script expects LF without BOM - nothing written' % path)
        text = raw.decode('utf-8')
        for old, new, count in edits:
            n = text.count(old)
            if n != count:
                sys.exit('ANCHOR %d time(s), expected %d, in %s:\n%s - nothing written' % (n, count, path, old[:160]))
            text = text.replace(old, new)
        new = text.encode('utf-8')
        if b'\r\n' in new:
            sys.exit('a CRLF crept in - nothing written')
        out[path] = (raw, new)
    return out


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--apply'
    if mode == '--restore':
        written = os.path.join(PRE, 'written.sha1')
        for path in EDITS:
            pre = open(os.path.join(PRE, os.path.basename(path)), 'rb').read()
            if sha1(pre) != EXPECT[path]:
                sys.exit('pre-image of %s is not at the recorded sha1; refusing' % path)
            live = open(path, 'rb').read()
            want = open(written, encoding='utf-8').read().split()[0]
            if sha1(live) != want:
                sys.exit('%s changed since this script wrote it (sha1 %s, wrote %s); refusing' % (path, sha1(live), want))
            open(path, 'wb').write(pre)
            print('restored', path, sha1(pre))
        return
    out = build()
    for path, (raw, new) in out.items():
        diff = difflib.unified_diff(raw.decode('utf-8').splitlines(True), new.decode('utf-8').splitlines(True),
                                    'a/' + os.path.basename(path), 'b/' + os.path.basename(path), n=1)
        sys.stdout.write(''.join(diff))
        print('  %s: %s -> %s (%d -> %d bytes)' % (os.path.basename(path), sha1(raw)[:12], sha1(new)[:12], len(raw), len(new)))
    if mode == '--dry-run':
        print('DRY RUN - nothing written')
        return
    if mode == '--candidate':
        cdir = os.path.join(HERE, 'candidate')
        os.makedirs(cdir, exist_ok=True)
        for path, (raw, new) in out.items():
            open(os.path.join(cdir, os.path.basename(path)), 'wb').write(new)
            print('CANDIDATE', os.path.join(cdir, os.path.basename(path)))
        return
    if mode != '--apply':
        sys.exit('unknown mode ' + mode)
    os.makedirs(PRE, exist_ok=True)
    for path, (raw, new) in out.items():
        open(os.path.join(PRE, os.path.basename(path)), 'wb').write(raw)
    for path, (raw, new) in out.items():
        open(path, 'wb').write(new)
        back = open(path, 'rb').read()
        assert back == new and b'\r\n' not in back
        open(os.path.join(PRE, 'written.sha1'), 'w', encoding='utf-8', newline='\n').write(sha1(back) + '  ' + path + '\n')
        print('WRITTEN', path, sha1(back), len(back), 'bytes')


if __name__ == '__main__':
    main()
