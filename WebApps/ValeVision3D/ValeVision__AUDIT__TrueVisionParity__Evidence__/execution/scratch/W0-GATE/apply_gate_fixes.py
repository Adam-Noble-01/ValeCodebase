"""W0 integrator gate - the two small fixes, byte-preserving.

FIX-1  VV 02__Src__AppModules/51__System__LayoutEditor/80__Feature__WebViewer/Na__LayoutEditor__Styles__WebViewer__.css
       Banner line 2: 'TrueVision3D' -> 'ValeVision3D' (K2 H1; W0-04 issue 1 / follow-up 1: the one ParityNaming baseline
       hit, which the W0 exit condition (R6 F.5.2) wants gone). Same length, so the banner's closing '*/' stays aligned.
       Comment only; the file has no DEVELOPMENT LOG, and its PORT NOTE stays true (a banner token is a standard seam).

FIX-2  VV 80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs (W0-15's test)
       The allow-list entry for Pdf/JsPdfScriptPath is STALE since W0-16 vendored jsPDF 4.1.0 (the value now equals
       TrueVision's; the test itself says "STALE: take it off the list", and --strict fails on it). Taken off. The four
       TitleBlock/ClassicScanAssets entries still differ, but only by this app's asset root (01__AppAssets__ValeVision for
       01__AppAssets__TrueVision, Vale's own scan): owner 'W0-16' -> 'permanent' and the A3 reason restated (W0-16 Port
       Record follow-up 3). DEVELOPMENT LOG 1.0.1 added, newest first, with a W0-16 release placeholder (the change
       completes W0-16's follow-up; every W0 placeholder resolves to the same wave release).

Usage: python apply_gate_fixes.py [--dry-run | --restore]
Every anchor must match exactly once and each file must be at its recorded SHA-1, or nothing is written.
"""
import difflib, hashlib, os, sys

VVR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, 'preimage')

CSS = os.path.join(VVR, r'02__Src__AppModules\51__System__LayoutEditor\80__Feature__WebViewer\Na__LayoutEditor__Styles__WebViewer__.css')
TST = os.path.join(VVR, r'80__Testing__PrototypeEnvironment\Na__Test__AppConfigParity__.test.mjs')

EXPECT = {
    CSS: 'e992701a9f1601c46bd3c59964e8dad85464a9de',
    TST: 'cc89a50a118c3e9163b0a86e894f7768cc4d40a3',
}

OPEN = '{' + '{'
CLOSE = '}' + '}'
TOKEN_W016 = OPEN + 'VVREL:W0-16' + CLOSE
TOKEN_W015 = OPEN + 'VVREL:W0-15' + CLOSE

EDITS = {
    CSS: [
        ('/* REGION  |  TrueVision3D - Layout Editor Web Viewer Styles         */\n',
         '/* REGION  |  ValeVision3D - Layout Editor Web Viewer Styles         */\n', 1),
    ],
    TST: [
        # the stale entry, whole line
        ("        [ 'value',   'Pdf/JsPdfScriptPath',                    'na-path',   'W0-16', 'the 35 copy until W0-16 vendors 05__Vendor__JsPdf__v4.1.0 (then equal to TrueVision)' ],\n",
         '', 1),
        # the four scan entries: owner and the A3 reason
        ("        [ 'value',   'TitleBlock/ClassicScanAssets/A3',        'brand',     'W0-16', \"Vale's own scan; on the 35 copy until W0-16 copies it under 01__AppAssets__ValeVision\" ],\n",
         "        [ 'value',   'TitleBlock/ClassicScanAssets/A3',        'brand',     'permanent', \"Vale's own scan under this app's asset root, 01__AppAssets__ValeVision (K2 N8)\" ],\n", 1),
        ("        [ 'value',   'TitleBlock/ClassicScanAssets/A4',        'brand',     'W0-16', \"Vale's own scan, as A3\" ],\n",
         "        [ 'value',   'TitleBlock/ClassicScanAssets/A4',        'brand',     'permanent', \"Vale's own scan, as A3\" ],\n", 1),
        ("        [ 'value',   'TitleBlock/ClassicScanAssets/A2',        'brand',     'W0-16', \"Vale's own scan, as A3\" ],\n",
         "        [ 'value',   'TitleBlock/ClassicScanAssets/A2',        'brand',     'permanent', \"Vale's own scan, as A3\" ],\n", 1),
        ("        [ 'value',   'TitleBlock/ClassicScanAssets/A1',        'brand',     'W0-16', \"Vale's own scan, as A3\" ],\n",
         "        [ 'value',   'TitleBlock/ClassicScanAssets/A1',        'brand',     'permanent', \"Vale's own scan, as A3\" ],\n", 1),
        # DEVELOPMENT LOG 1.0.1, newest first
        ('// DEVELOPMENT LOG:\n// 01-Oct-2026 - Version 1.0.0 (' + TOKEN_W015 + ')\n',
         '// DEVELOPMENT LOG:\n'
         '// 01-Oct-2026 - Version 1.0.1 (' + TOKEN_W016 + ')\n'
         '// - Pdf/JsPdfScriptPath taken off the allow-list: W0-16 vendored jsPDF\n'
         '//   4.1.0, so the value now equals TrueVision\'s (it was reported STALE).\n'
         '//   The four TitleBlock/ClassicScanAssets entries are permanent: Vale\'s\n'
         '//   own scan, differing only by this app\'s asset root. Made by the W0\n'
         '//   integrator gate, completing W0-16\'s follow-up.\n'
         '//\n'
         '// 01-Oct-2026 - Version 1.0.0 (' + TOKEN_W015 + ')\n', 1),
    ],
}


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--apply'
    os.makedirs(PRE, exist_ok=True)
    if mode == '--restore':
        for path in EDITS:
            pre = os.path.join(PRE, os.path.basename(path))
            data = open(pre, 'rb').read()
            if sha1(data) != EXPECT[path]:
                sys.exit('pre-image of %s is not at the recorded sha1; refusing' % path)
            open(path, 'wb').write(data)
            print('restored', path, sha1(data))
        return
    out = {}
    for path, edits in EDITS.items():
        raw = open(path, 'rb').read()
        if sha1(raw) != EXPECT[path]:
            sys.exit('DRIFT: %s is at sha1 %s, expected %s - nothing written' % (path, sha1(raw), EXPECT[path]))
        if b'\r\n' in raw:
            sys.exit('%s has CRLF; this script expects LF - nothing written' % path)
        text = raw.decode('utf-8')
        for old, new, count in edits:
            n = text.count(old)
            if n != count:
                sys.exit('ANCHOR %d time(s), expected %d, in %s:\n%s - nothing written' % (n, count, path, old[:120]))
            text = text.replace(old, new)
        out[path] = (raw, text.encode('utf-8'))
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
    for path, (raw, new) in out.items():
        open(os.path.join(PRE, os.path.basename(path)), 'wb').write(raw)
    for path, (raw, new) in out.items():
        open(path, 'wb').write(new)
        back = open(path, 'rb').read()
        assert back == new and b'\r\n' not in back
        print('WRITTEN', path, sha1(back))


if __name__ == '__main__':
    main()
