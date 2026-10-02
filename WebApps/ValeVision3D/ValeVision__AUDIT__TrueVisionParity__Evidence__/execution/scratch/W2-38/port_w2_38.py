# =============================================================================
# W2-38 PORT SCRIPT - Cabinet Infill and the Project QR (Portal) element, inert
# =============================================================================
#
#   python port_w2_38.py --stage    build the four VV files from TV's bytes at the pin into staged/
#   python port_w2_38.py --apply    write staged files into the live VV tree (refuses if a target exists
#                                   and differs from what this script built)
#   python port_w2_38.py --check    rebuild from TV and compare the landed bytes
#   python port_w2_38.py --restore  remove the four files this script wrote (only if unchanged since)
#
# Every substitution is asserted (exact count) so a moved pin fails loudly.
# =============================================================================

import hashlib, json, os, subprocess, sys

PIN     = 'b2aa9151'
TVREPO  = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP   = 'na-apps/30__TrueVision__CoreAppCode/'
VVROOT  = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE    = os.path.dirname(os.path.abspath(__file__))
STAGED  = os.path.join(HERE, 'staged')
WRITTEN = os.path.join(HERE, 'written__sha256.json')
PORTED  = '02-Oct-2026'

FEAT = '02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/'
TEST = '80__Testing__PrototypeEnvironment/'

INFILL = FEAT + 'Na__LayoutEditor__ScrapbookParametric__CabinetInfill__.js'
QR     = FEAT + 'Na__LayoutEditor__ScrapbookParametric__ProjectQr__.js'
TINF   = TEST + 'Na__Test__ScrapbookCabinetInfill__.test.mjs'
TQR    = TEST + 'Na__Test__ScrapbookProjectQr__.test.mjs'


def tv(rel):
    return subprocess.check_output(['git', '-C', TVREPO, 'show', PIN + ':' + TVAPP + rel])


def sub(text, old, new, count=1):
    n = text.count(old)
    if n != count:
        raise SystemExit('ASSERT: expected %d x %r, found %d' % (count, old[:80], n))
    return text.replace(old, new)


def swap_block(text, start_marker, end_marker, new_block):
    """Replace from start_marker (inclusive) up to end_marker (exclusive), both unique."""
    a = text.index(start_marker)
    if text.count(start_marker) != 1:
        raise SystemExit('ASSERT: start marker not unique: %r' % start_marker)
    b = text.index(end_marker, a)
    return text[:a] + new_block + text[b:]


SEP = '// -----------------------------------------------------------------------------\n'


# -----------------------------------------------------------------------------
# The two element modules
# -----------------------------------------------------------------------------

PORT_NOTE_INFILL = """// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__CabinetInfill__.js
// - Source version: 1.2.0 (TrueVision3D v2.151.0, 22-Sep-2026 - the fill's own rule, commit
//                   a2e0a836, unlogged in the devlog; read at b2aa9151)
// - Ported on     : {ported} for ValeVision3D {{{{VVREL:W2-38}}}}, the whole file, new in this app.
//                   TrueVision's v2.128.0 (1.0.0) and v2.134.0 (1.1.0) entries say "NOT tried by
//                   Adam"; 1.2.0 has no release entry of its own: ported under DR-01 (c) and named.
//                   Lands inert - it imports nothing and nothing imports it until the parametric
//                   panel registers it with the config's CabinetInfill block.
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//
""".format(ported=PORTED)

PORT_NOTE_QR = """// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ProjectQr__.js
// - Source version: 1.3.0 (TrueVision3D v2.109.0, 21-Sep-2026, with v2.155.0's @delegate path to
//                   51__System__LayoutEditor/53__Feature__ProjectQrCode; read at b2aa9151)
// - Ported on     : {ported} for ValeVision3D {{{{VVREL:W2-38}}}}, the whole file, new in this app.
//                   TrueVision's v2.100.0, v2.108.0 and v2.109.0 entries say it was not tried by
//                   Adam: ported under DR-01 (c) and named. Lands inert and switched off with
//                   the Project QR Code system (DR-12 (A)): it imports nothing, nothing imports
//                   it until the parametric panel registers it, and the code it boxes is painted
//                   only once that system is switched on with a Vale resolver. Its FALLBACK
//                   wording is TrueVision's; Vale wording for the block waits for Adam (DR-43)
//                   and arrives as config values, not code.
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//
""".format(ported=PORTED)


def build_module(rel, port_note, tv_note_first_line):
    text = tv(rel).decode('utf-8')
    if '\r\n' in text:
        raise SystemExit('ASSERT: TV file is not LF: ' + rel)
    text = sub(text, '// TRUEVISION3D - LAYOUT EDITOR - PARAMETRIC SCRAPBOOK - ', '// VALEVISION3D - LAYOUT EDITOR - PARAMETRIC SCRAPBOOK - ')
    # TV's own PORT NOTE (its "not yet ported" lines) is replaced by VV's (K2 H5)
    a = text.index('// PORT NOTE:\n')
    if not text[a:].startswith('// PORT NOTE:\n' + tv_note_first_line):
        raise SystemExit('ASSERT: unexpected TV PORT NOTE in ' + rel)
    b = text.index(SEP, a)
    text = text[:a] + port_note + text[b:]
    return text


# -----------------------------------------------------------------------------
# The two tests
# -----------------------------------------------------------------------------

def test_port_note(src_version, ported_extra, parity, divergences):
    lines = [
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/' + src_version[0],
        '// - Source version: ' + src_version[1],
        '// - Ported on     : ' + PORTED + ' for ValeVision3D {{VVREL:W2-38}}, new in this app, with the',
    ] + ['//                   ' + l for l in ported_extra] + [
        '// - Parity        : ' + parity[0],
    ] + ['//                   ' + l for l in parity[1:]] + [
        '// - Divergences   :',
    ] + ['//   ' + l for l in divergences] + [
        '// - Back-port     : none.',
        '//',
    ]
    return '\n'.join(lines) + '\n'


PN_TINF = test_port_note(
    ('Na__Test__ScrapbookCabinetInfill__.test.mjs',
     '1.2.0 (TrueVision3D v2.151.0, 22-Sep-2026 - commit a2e0a836, unlogged in the devlog;\n//                   read at b2aa9151)'),
    ['cabinet infill 1.2.0. It reads this app\'s parametric config: the CabinetInfill',
     'block, its tile, its type name and its panel words arrive with the parametric',
     'panel and config; until they do it is run on a staged copy carrying them.'],
    ['verbatim - every check is TrueVision\'s, run against this app\'s own module and',
     'config. The fixtures are Noble Architecture sheets (NP03 D07 Rev C): they are',
     'what the house infill was measured from.'],
    ['- Banner and the printed title read ValeVision3D.'])

PN_TQR = test_port_note(
    ('Na__Test__ScrapbookProjectQr__.test.mjs',
     '1.1.0 (TrueVision3D v2.120.0, 21-Sep-2026, with v2.155.0\'s 53__Feature__ProjectQrCode',
     ),
    ['Project Portal element 1.3.0. It reads this app\'s parametric config: the',
     'ProjectQr block, its two tiles and its type name arrive with the parametric',
     'panel and config; until they do it is run on a staged copy carrying them.'],
    ['adapted - every check is TrueVision\'s, run against this app\'s own module, its',
     'Project QR Code system (switched off: the checks paint a symbol they encode',
     'themselves) and its shape painter. The project name fixture is TrueVision\'s.'],
    ['- Banner and the printed title read ValeVision3D.',
     '- The address encoded for the colour checks is a reserved .test address of the',
     '  same 42 bytes (a version 3 symbol), not TrueVision\'s own resolver address.'])
# the source-version line continues onto a second line
PN_TQR = sub(PN_TQR, "53__Feature__ProjectQrCode\n",
             "53__Feature__ProjectQrCode\n//                   path; read at b2aa9151)\n")

VALE_REF_ADDRESS = 'https://valevision.example.test/?qr=test-1'
assert len(VALE_REF_ADDRESS.encode('utf-8')) == 42, len(VALE_REF_ADDRESS)


def build_test(rel, banner_tail, title_tv, title_vv, port_note, extra=None):
    text = tv(rel).decode('utf-8')
    if '\r\n' in text:
        raise SystemExit('ASSERT: TV file is not LF: ' + rel)
    text = sub(text, '// TRUEVISION3D - TEST - PARAMETRIC SCRAPBOOK - ' + banner_tail, '// VALEVISION3D - TEST - PARAMETRIC SCRAPBOOK - ' + banner_tail)
    text = sub(text, "console.log('" + title_tv + "');", "console.log('" + title_vv + "');")
    if '// PORT NOTE:' in text:
        raise SystemExit('ASSERT: TV test unexpectedly has a PORT NOTE: ' + rel)
    # Insert the PORT NOTE between the USAGE block's closing separator and DEVELOPMENT LOG
    anchor = SEP + '//\n// DEVELOPMENT LOG:\n'
    text = sub(text, anchor, SEP + '//\n' + port_note + anchor)
    if extra:
        text = extra(text)
    return text


def qr_test_extra(text):
    return sub(text, "encoder.Na__QrEnc__Encode('https://www.noble-architecture.com/q/?PS01')",
               "encoder.Na__QrEnc__Encode('" + VALE_REF_ADDRESS + "')")


def build_all():
    return {
        INFILL: build_module(INFILL, PORT_NOTE_INFILL, '// - Authored in   : TrueVision3D first (21-Sep-2026)\n// - ValeVision    : not yet ported. It needs the engine\'s adopt hook'),
        QR:     build_module(QR, PORT_NOTE_QR, '// - Authored in   : TrueVision3D first (21-Sep-2026)\n// - ValeVision    : not yet ported. It needs Shape__Qr'),
        TINF:   build_test(TINF, 'CABINET INFILL', 'TrueVision3D - parametric scrapbook cabinet infill', 'ValeVision3D - parametric scrapbook cabinet infill', PN_TINF),
        TQR:    build_test(TQR, 'PROJECT PORTAL BLOCK', 'TrueVision3D - parametric scrapbook project portal block', 'ValeVision3D - parametric scrapbook project portal block', PN_TQR, qr_test_extra),
    }


def lint(files):
    bad = []
    for rel, text in files.items():
        head_end = text.find('// DEVELOPMENT LOG:')
        for marker in ('TRUEVISION3D', '[TrueVision3D', 'TrueVision__', 'window.TrueVision', '/api/truevision', 'NaProjectPortal',
                       'noble-architecture.com/q/', 'noble-architecture.com/s/', '30__TrueVision__AppContent', '/na-apps/'):
            i = text.find(marker)
            while i != -1:
                pn_a = text.find('// PORT NOTE:')
                pn_b = text.find(SEP, pn_a)
                if not (pn_a != -1 and pn_a <= i <= pn_b):
                    bad.append((rel, marker, text.count('\n', 0, i) + 1))
                i = text.find(marker, i + 1)
        if '\r' in text:
            bad.append((rel, 'CR', 0))
    return bad


def sha(b):
    return hashlib.sha256(b).hexdigest()


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--stage'
    files = build_all()
    problems = lint(files)
    if problems:
        raise SystemExit('LINT: ' + repr(problems))
    if mode == '--stage':
        for rel, text in files.items():
            p = os.path.join(STAGED, rel.replace('/', os.sep))
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(text.encode('utf-8'))
            print('staged', rel, len(text.encode('utf-8')), 'bytes', text.count('\n'), 'lines')
    elif mode == '--apply':
        for rel, text in files.items():
            p = os.path.join(VVROOT, rel.replace('/', os.sep))
            if os.path.exists(p) and open(p, 'rb').read() != text.encode('utf-8'):
                raise SystemExit('REFUSED: target exists and differs: ' + rel)
        record = {}
        for rel, text in files.items():
            p = os.path.join(VVROOT, rel.replace('/', os.sep))
            data = text.encode('utf-8')
            open(p, 'wb').write(data)
            record[rel] = sha(data)
            print('wrote', rel, len(data), 'bytes sha256', record[rel][:16])
        json.dump(record, open(WRITTEN, 'w'), indent=1)
    elif mode == '--check':
        ok = True
        for rel, text in files.items():
            p = os.path.join(VVROOT, rel.replace('/', os.sep))
            same = os.path.exists(p) and open(p, 'rb').read() == text.encode('utf-8')
            ok = ok and same
            print('OK  ' if same else 'DIFF', rel)
        print('CHECK PASS' if ok else 'CHECK FAIL')
        sys.exit(0 if ok else 1)
    elif mode == '--restore':
        record = json.load(open(WRITTEN))
        for rel, h in record.items():
            p = os.path.join(VVROOT, rel.replace('/', os.sep))
            if os.path.exists(p):
                if sha(open(p, 'rb').read()) != h:
                    raise SystemExit('REFUSED: changed since written: ' + rel)
                os.remove(p)
                print('removed', rel)
    else:
        raise SystemExit('unknown mode')


if __name__ == '__main__':
    main()
