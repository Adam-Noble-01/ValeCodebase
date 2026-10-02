"""W1 integrator gate - the one small fix, byte-preserving.

FIX-1  VV 80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs (W0-15's test; not in any W1 edits list)
       Seven allow-list entries are STALE: their values came level with TrueVision's in this wave, so the test warns
       "STALE: take them off the list" and fails with --strict.
         W1-34 (tab strip 2.0.0) took TrueVision's Labels NoSheets, TabsPreviousTitle, TabsNextTitle, SpecificationTab;
         W1-35 (toolbar 1.17.0 / 1.19.0) took TrueVision's MarginNotes Description and deleted this app's two
         MarginToggle labels with the Notes button (vv-only keys, now in neither app).
       Both packages' Port Records ask the W1 gate to take the rows off (W1-34 follow-up 2, W1-35 follow-up 2), as the W0
       gate did for Pdf/JsPdfScriptPath. The seven rows go; the MARGIN NOTES group, which held only its one row, goes
       with its comment. DEVELOPMENT LOG 1.0.2 added, newest first, with a W1-35 release placeholder (the change
       completes W1-35's follow-up, which names all seven rows; every W1 placeholder resolves to the same wave release).
       Nothing else in the file changes: the Panels/FocusNote row still differs from TrueVision and stays as it is.

Usage: python apply_gate_fixes.py [--dry-run | --candidate | --restore]
The file must be at its recorded SHA-1, LF, and every anchor must match exactly once, or nothing is written.
Pre-image saved to scratch/W1-GATE/preimage/ before the write; --restore writes it back (only if the live file is
still exactly what this script wrote).
"""
import difflib, hashlib, os, sys

VVR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, 'preimage')
TST = os.path.join(VVR, r'80__Testing__PrototypeEnvironment\Na__Test__AppConfigParity__.test.mjs')
EXPECT = {TST: 'e5e7d03ea94d551fe5b108606dc74e287350451c'}

OPEN = '{' + '{'
CLOSE = '}' + '}'
TOKEN_W135 = OPEN + 'VVREL:W1-35' + CLOSE

EDITS = {
    TST: [
        # W1-35: the MARGIN NOTES group held only this row - the comment, the row and the blank line after it go
        ("        // MARGIN NOTES\n"
         "        [ 'value',   'MarginNotes/Description',                'withheld',  'W1-35', \"reworded when the toolbar's Notes button goes\" ],\n"
         "\n",
         '', 1),
        # W1-34: the four tab-strip labels
        ("        [ 'value',   'Labels/NoSheets',                        'withheld',  'W1-34', 'tab strip 2.0.0' ],\n", '', 1),
        ("        [ 'value',   'Labels/TabsPreviousTitle',               'withheld',  'W1-34', 'tab strip 2.0.0' ],\n", '', 1),
        ("        [ 'value',   'Labels/TabsNextTitle',                   'withheld',  'W1-34', 'tab strip 2.0.0' ],\n", '', 1),
        ("        [ 'value',   'Labels/SpecificationTab',                'withheld',  'W1-34', 'tab strip 2.0.0' ],\n", '', 1),
        # W1-35: the Notes button's two labels, deleted from the config with the button
        ("        [ 'vv-only', 'Labels/MarginToggle',                    'vv-only',   'W1-35', \"the toolbar's Notes button, removed by W1-35\" ],\n", '', 1),
        ("        [ 'vv-only', 'Labels/MarginToggleTitle',               'vv-only',   'W1-35', \"the toolbar's Notes button, removed by W1-35\" ],\n", '', 1),
        # DEVELOPMENT LOG 1.0.2, newest first
        ('// DEVELOPMENT LOG:\n// 01-Oct-2026 - Version 1.0.1 (v2.71.1)\n',
         '// DEVELOPMENT LOG:\n'
         '// 02-Oct-2026 - Version 1.0.2 (' + TOKEN_W135 + ')\n'
         '// - Seven entries taken off the allow-list, each now level with\n'
         '//   TrueVision (they were reported STALE): the tab strip 2.0.0 (W1-34)\n'
         '//   took TrueVision\'s NoSheets, TabsPreviousTitle, TabsNextTitle and\n'
         '//   SpecificationTab labels, and the toolbar\'s subtractive phase\n'
         '//   (W1-35) took its MarginNotes description and removed the Notes\n'
         '//   button\'s two labels with the button. Made by the W1 integrator\n'
         '//   gate, completing W1-34\'s and W1-35\'s follow-ups.\n'
         '//\n'
         '// 01-Oct-2026 - Version 1.0.1 (v2.71.1)\n', 1),
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
