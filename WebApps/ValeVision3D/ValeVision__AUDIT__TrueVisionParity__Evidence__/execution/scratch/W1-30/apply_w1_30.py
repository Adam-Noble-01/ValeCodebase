# =============================================================================
# W1-30 - Document keyboard (LE/31__System__DocumentKeys) - apply script
# =============================================================================
#
# Builds the two ValeVision files from TrueVision's bytes at the pin (git show,
# LF as returned) and lands them as NEW files, each in one whole write:
#   - Na__Hotkeys__DocumentTabs__.json      TV bytes verbatim
#   - Na__LayoutEditor__DocumentKeys__.js   TV bytes with the K2 seams only:
#       banner token (H1), TV's PORT NOTE block replaced by the K2 H5 block,
#       the two console prefixes (C1). Asserted: every anchor exactly once,
#       and below the header the code equals TV's apart from the two prefixes.
#
# Modes:
#   --dry-run     build candidates into scratch/W1-30/candidate/ and print diffs
#   --apply       write the live files (refuses if either already exists)
#   --check-live  compare the live files with fresh candidates (SAME / DIFF)
#   --restore     delete the live files only if they are exactly what was
#                 written (sha1), then the folder if it is empty
#
# Run: python -B apply_w1_30.py --dry-run | --apply | --check-live | --restore
# =============================================================================

import subprocess, os, sys, hashlib, difflib, json

PIN      = 'b2aa9151'
TV_REPO  = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP   = 'na-apps/30__TrueVision__CoreAppCode/'
VV_ROOT  = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
REL_DIR  = '02__Src__AppModules/51__System__LayoutEditor/31__System__DocumentKeys'
JS_NAME  = 'Na__LayoutEditor__DocumentKeys__.js'
JSON_NAME = 'Na__Hotkeys__DocumentTabs__.json'
HERE     = os.path.dirname(os.path.abspath(__file__))
CAND_DIR = os.path.join(HERE, 'candidate')
MANIFEST = os.path.join(HERE, 'written_manifest.json')

LIVE_DIR  = os.path.join(VV_ROOT, *REL_DIR.split('/'))
LIVE_JS   = os.path.join(LIVE_DIR, JS_NAME)
LIVE_JSON = os.path.join(LIVE_DIR, JSON_NAME)


def tv_bytes(rel):
    return subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':' + TV_APP + rel],
                          capture_output=True, check=True).stdout


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit('ANCHOR "' + label + '" found ' + str(count) + ' times (want exactly 1)')
    return text.replace(old, new)


# -----------------------------------------------------------------------------
# The seams
# -----------------------------------------------------------------------------

TV_BANNER = '// TRUEVISION3D - LAYOUT EDITOR - DOCUMENT KEYS\n'
VV_BANNER = '// VALEVISION3D - LAYOUT EDITOR - DOCUMENT KEYS\n'

TV_PORT_NOTE = (
    '// PORT NOTE:\n'
    '// - Authored in   : TrueVision3D first (21-Sep-2026, v2.110.0)\n'
    '// - ValeVision    : not yet ported - it has no Statements tab yet, but the key\n'
    '//                   scope and this keyboard fit its Layout Editor as they are.\n'
)

VV_PORT_NOTE = (
    '// PORT NOTE:\n'
    '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js\n'
    '// - Source version: 1.1.0 (TrueVision3D v2.115.0, 21-Sep-2026; read at b2aa9151)\n'
    '// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-30}}, with its key map\n'
    '//                   (Na__Hotkeys__DocumentTabs__.json, verbatim), ahead of its wiring\n'
    '//                   in the mode controller and of the document tabs that register\n'
    '//                   with it (the Drawing Register and the Statements)\n'
    '// - Parity        : verbatim\n'
    '// - Divergences   :\n'
    '//   - Banner reads ValeVision3D, and both console messages open\n'
    '//     [ValeVision3D LayoutEditor].\n'
    '// - Back-port     : none.\n'
)

TV_PREFIX = "'[TrueVision3D LayoutEditor] "
VV_PREFIX = "'[ValeVision3D LayoutEditor] "


def build():
    tv_js   = tv_bytes(REL_DIR + '/' + JS_NAME)
    tv_json = tv_bytes(REL_DIR + '/' + JSON_NAME)
    if b'\r' in tv_js or b'\r' in tv_json:
        raise SystemExit('TV bytes carry CR: expected LF from git show')
    if tv_js.startswith(b'\xef\xbb\xbf') or tv_json.startswith(b'\xef\xbb\xbf'):
        raise SystemExit('TV bytes carry a BOM: not expected')

    text = tv_js.decode('utf-8')
    text = replace_once(text, TV_BANNER, VV_BANNER, 'banner')
    text = replace_once(text, TV_PORT_NOTE, VV_PORT_NOTE, 'TV PORT NOTE block')
    if text.count(TV_PREFIX) != 2:
        raise SystemExit('console prefix found ' + str(text.count(TV_PREFIX)) + ' times (want exactly 2)')
    text = text.replace(TV_PREFIX, VV_PREFIX)

    # Nothing of TrueVision's token may remain outside the PORT NOTE block.
    head, sep, rest = text.partition('// PORT NOTE:\n')
    note, sep2, tail = rest.partition('// -----------------------------------------------------------------------------\n')
    for chunk, label in ((head, 'above the PORT NOTE'), (tail, 'below the PORT NOTE')):
        for token in ('TRUEVISION3D', '[TrueVision3D', 'TrueVision__', 'window.TrueVision'):
            if token in chunk:
                raise SystemExit('TV token ' + token + ' left ' + label)

    # Below the header the code must be TV's, apart from the two prefixes.
    tv_text = tv_js.decode('utf-8')
    marker = '// endregion -------------------------------------------------------------------\n'
    # The header ends at the closing '// =====' rule; compare everything after it.
    rule = '// =============================================================================\n'
    tv_code = tv_text.split(rule)[-1]
    vv_code = text.split(rule)[-1]
    if vv_code.replace(VV_PREFIX, TV_PREFIX) != tv_code:
        raise SystemExit('code below the header differs from TV beyond the console prefixes')
    if marker not in vv_code:
        raise SystemExit('unexpected file shape')

    # The DEVELOPMENT LOG is TV's verbatim.
    tv_log = tv_text.split('// DEVELOPMENT LOG:\n', 1)[1].split(rule, 1)[0]
    vv_log = text.split('// DEVELOPMENT LOG:\n', 1)[1].split(rule, 1)[0]
    if tv_log != vv_log:
        raise SystemExit('DEVELOPMENT LOG differs from TV')

    # The DESCRIPTION and INTEGRATION are TV's verbatim.
    tv_desc = tv_text.split('// DESCRIPTION:\n', 1)[1].split('// PORT NOTE:\n', 1)[0]
    vv_desc = text.split('// DESCRIPTION:\n', 1)[1].split('// PORT NOTE:\n', 1)[0]
    if tv_desc != vv_desc:
        raise SystemExit('DESCRIPTION / INTEGRATION differ from TV')

    vv_js = text.encode('utf-8')
    if b'\r' in vv_js:
        raise SystemExit('candidate carries CR')
    json.loads(tv_json.decode('utf-8'))   # parses
    return tv_js, tv_json, vv_js, tv_json


def show_diff(a, b, name_a, name_b):
    lines = list(difflib.unified_diff(a.decode('utf-8').splitlines(True), b.decode('utf-8').splitlines(True), name_a, name_b))
    return ''.join(lines)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--dry-run'
    tv_js, tv_json, vv_js, vv_json = build()

    if mode == '--dry-run':
        os.makedirs(CAND_DIR, exist_ok=True)
        with open(os.path.join(CAND_DIR, JS_NAME), 'wb') as f:
            f.write(vv_js)
        with open(os.path.join(CAND_DIR, JSON_NAME), 'wb') as f:
            f.write(vv_json)
        diff = show_diff(tv_js, vv_js, 'TV@' + PIN + '/' + JS_NAME, 'VV-candidate/' + JS_NAME)
        with open(os.path.join(CAND_DIR, 'diff_DocumentKeys_vs_TV_at_pin.diff'), 'w', encoding='utf-8', newline='\n') as f:
            f.write(diff)
        print(diff)
        print('JSON identical to TV at pin:', vv_json == tv_json)
        print('candidate js  :', len(vv_js), 'bytes', vv_js.count(b'\n'), 'LF lines, sha1', sha1(vv_js))
        print('candidate json:', len(vv_json), 'bytes', vv_json.count(b'\n'), 'LF lines, sha1', sha1(vv_json))
        print('live folder exists:', os.path.isdir(LIVE_DIR), '| live js exists:', os.path.exists(LIVE_JS), '| live json exists:', os.path.exists(LIVE_JSON))
        return

    if mode == '--apply':
        if os.path.exists(LIVE_JS) or os.path.exists(LIVE_JSON):
            raise SystemExit('REFUSED: a target already exists (it changed under this package)')
        os.makedirs(LIVE_DIR, exist_ok=True)
        # The key map first, so the module's new URL(...) never points at a missing file.
        with open(LIVE_JSON, 'xb') as f:
            f.write(vv_json)
        with open(LIVE_JS, 'xb') as f:
            f.write(vv_js)
        manifest = {
            'written': {
                REL_DIR + '/' + JSON_NAME: {'bytes': len(vv_json), 'sha1': sha1(vv_json)},
                REL_DIR + '/' + JS_NAME: {'bytes': len(vv_js), 'sha1': sha1(vv_js)},
            },
            'preimage': 'both files and the folder absent before this package',
            'tv_pin': PIN,
            'tv_sha1': {JSON_NAME: sha1(tv_json), JS_NAME: sha1(tv_js)},
        }
        with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(manifest, f, indent=2)
        print('WRITTEN', LIVE_JSON, sha1(vv_json))
        print('WRITTEN', LIVE_JS, sha1(vv_js))
        return

    if mode == '--check-live':
        for path, want in ((LIVE_JSON, vv_json), (LIVE_JS, vv_js)):
            if not os.path.exists(path):
                print('MISSING', path)
                continue
            with open(path, 'rb') as f:
                have = f.read()
            print('SAME' if have == want else 'DIFF', path, sha1(have))
        return

    if mode == '--restore':
        with open(MANIFEST, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        for rel, info in manifest['written'].items():
            path = os.path.join(VV_ROOT, *rel.split('/'))
            if not os.path.exists(path):
                print('ABSENT', path)
                continue
            with open(path, 'rb') as f:
                have = f.read()
            if sha1(have) != info['sha1']:
                print('KEPT (changed since written, not mine to delete)', path)
                continue
            os.remove(path)
            print('REMOVED', path)
        if os.path.isdir(LIVE_DIR) and not os.listdir(LIVE_DIR):
            os.rmdir(LIVE_DIR)
            print('REMOVED empty folder', LIVE_DIR)
        return

    raise SystemExit('unknown mode ' + mode)


if __name__ == '__main__':
    main()
