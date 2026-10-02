# =============================================================================
# W1-16 | Port the Sheet Images render leaves (LE/54) from TrueVision at the pin
# =============================================================================
#
# Reads each TrueVision file with `git show b2aa9151:<path>` (bytes, LF as git
# returns them), applies ONLY the seams the package lists - banner token,
# console prefix, PORT NOTE block, Setup's Pages-base fallback, and the
# config's Meta__Folders / Sources__PagesBaseUrl values plus its
# Meta__PortedFrom record - each with an exact-count assertion, proves that
# nothing else differs from TrueVision, and writes the eight new files into
# ValeVision's live tree with LF line endings.
#
# Safety:
# - A target that already exists is overwritten only when its bytes are the
#   bytes this script wrote last time (written__sha256.json) or the bytes it
#   is about to write; anything else stops the run with nothing written.
# - Every check runs on every file BEFORE the first write (all or nothing).
#
# Usage: python port_sheetimages.py [--dry-run]
# =============================================================================
import hashlib
import json
import os
import re
import subprocess
import sys

PIN = 'b2aa9151'
TV_REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV_APP = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
FOLDER = '02__Src__AppModules/51__System__LayoutEditor/54__Feature__SheetImages/'
HERE = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(HERE, 'written__sha256.json')

RULE = '// ' + '-' * 77
PORTED_ON = '01-Oct-2026'
PLACEHOLDER = '{{VVREL:W1-16}}'
VV_PAGES = 'https://adam-noble-01.github.io/ValeCodebase/WebApps'
TV_PAGES = 'https://www.noble-architecture.com'


# -----------------------------------------------------------------------------
# PORT NOTE blocks (K2 H5, R6 F.1 P10)
# -----------------------------------------------------------------------------

def note(file_name, source_version, parity, divergences, back_port='none.'):
    lines = [
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D ' + FOLDER + file_name,
        '// - Source version: ' + source_version,
        '// - Ported on     : ' + PORTED_ON + ' for ValeVision3D ' + PLACEHOLDER,
    ]
    lines += ['// - Parity        : ' + parity[0]] + ['//                   ' + more for more in parity[1:]]
    lines += ['// - Divergences   :']
    for bullet in divergences:
        lines += ['//   - ' + bullet[0]] + ['//     ' + more for more in bullet[1:]]
    lines += ['// - Back-port     : ' + back_port]
    return '\n'.join(lines) + '\n'


V116 = '1.0.0 (TrueVision3D v2.116.0, 21-Sep-2026; read at HEAD ' + PIN + ')'
V121 = '1.1.0 (TrueVision3D v2.121.0, 21-Sep-2026; read at HEAD ' + PIN + ')'

NOTES = {
    'Na__LayoutEditor__SheetImages__Setup__.js': note(
        'Na__LayoutEditor__SheetImages__Setup__.js', V121,
        ['adapted (TrueVision 1.1.0\'s code with one fallback value changed: the GitHub Pages base)'],
        [
            ['Banner and console prefix read ValeVision3D.'],
            ['Sources: the PagesBaseUrl fallback is this app\'s GitHub Pages base,',
             VV_PAGES + ' - the shipped config\'s',
             'value, so every fallback still equals the shipped config. TrueVision\'s',
             'fallback is its own website, so a page whose config could not be read',
             'would have looked for pictures there (S07a-V02); here no Noble',
             'Architecture address is ever built, config or no config. The facade\'s',
             'location names the path under WebApps/ (Whitecardopedia/Projects/',
             '<folderId>/...), so base + \'/\' + relative is the repository copy',
             'GitHub Pages serves.'],
            ['The frame fallbacks stay TrueVision\'s - the #555041 rule and its soft',
             'shadow - as DR-13 (a) keeps the frame while Adam has not answered.'],
        ]),
    'Na__LayoutEditor__SheetImages__Geometry__.js': note(
        'Na__LayoutEditor__SheetImages__Geometry__.js', V121,
        ['verbatim (the code is TrueVision 1.1.0\'s; the banner and this note are the only differences.',
         'FolderFor\'s comment keeps TrueVision\'s example id, RB05_T01_D01; a ValeVision document id',
         'reads {project}_{drawing}, e.g. 3047_D01 (DR-11), and is made safe the same way)'],
        [
            ['Banner reads ValeVision3D. (No console output in this file.)'],
        ]),
    'Na__LayoutEditor__SheetImages__Painter__.js': note(
        'Na__LayoutEditor__SheetImages__Painter__.js', V116,
        ['verbatim (the code is TrueVision 1.0.0\'s; the banner, the console prefix and this note are',
         'the only differences)'],
        [
            ['Banner and console prefix read ValeVision3D.'],
        ]),
    'Na__LayoutEditor__SheetImages__Paint__.js': note(
        'Na__LayoutEditor__SheetImages__Paint__.js', V116,
        ['verbatim (the code is TrueVision 1.0.0\'s; the banner and this note are the only differences)'],
        [
            ['Banner reads ValeVision3D. (No console output in this file.)'],
        ]),
    'Na__LayoutEditor__SheetImages__Source__.js': note(
        'Na__LayoutEditor__SheetImages__Source__.js', V116,
        ['verbatim (the code is TrueVision 1.0.0\'s; the banner, the two console prefixes and this note',
         'are the only differences)'],
        [
            ['Banner and console prefixes read ValeVision3D.'],
            ['Both transport imports resolve to ValeVision\'s own modules at TrueVision\'s',
             'paths (K2 R6, DIV-4): Na__AppUtils__IsRunningOnLocalhost (ProjectLoader;',
             'also true on port 8000, the Flask server) and Na__CfApi__SheetImageLocation,',
             'the transport facade\'s ValeVision body (W0-12). So a picture is read from',
             'VaApps/Projects/<folderId>/05__Layout__DrawingDocs__Images/<document id>/',
             'on the CDN, from the copy under WebApps/Whitecardopedia/Projects/<folderId>/',
             'that the Flask server serves on localhost, and on the live site from',
             'GitHub Pages last (the config\'s PagesBaseUrl). The folder is the',
             'master-index entry ?project= names, never project.json\'s folderId; with',
             'none, no picture has an address and it shows as missing.'],
            ['ValeVision commits no picture until Adam answers DR-29 (the .gitignore',
             'keeps the images folders out), so GitHub Pages holds none and the',
             'repository copy exists only on the machine that saved it: on the live',
             'site R2 is the one source.'],
        ]),
    'Na__LayoutEditor__SheetImages__Pdf__.js': note(
        'Na__LayoutEditor__SheetImages__Pdf__.js', V116,
        ['verbatim (the code is TrueVision 1.0.0\'s; the banner, the two console prefixes and this note',
         'are the only differences)'],
        [
            ['Banner and console prefixes read ValeVision3D.'],
        ]),
    'Na__LayoutEditor__SheetImages__Encode__.js': note(
        'Na__LayoutEditor__SheetImages__Encode__.js', V121,
        ['verbatim (the code is TrueVision 1.1.0\'s; the banner and this note are the only differences.',
         'DESCRIPTION keeps TrueVision\'s example file name)'],
        [
            ['Banner reads ValeVision3D. (No console output in this file.)'],
        ]),
}


# -----------------------------------------------------------------------------
# Edits per JavaScript file: (old, new, expected count)
# -----------------------------------------------------------------------------

PREFIX_OLD = "'[" + 'True' + 'Vision3D LayoutEditor]'
PREFIX_NEW = "'[ValeVision3D LayoutEditor]"
BANNER_OLD = '\n// ' + 'TRUE' + 'VISION3D - '
BANNER_NEW = '\n// VALEVISION3D - '

CONSOLE_COUNTS = {
    'Na__LayoutEditor__SheetImages__Setup__.js': 1,
    'Na__LayoutEditor__SheetImages__Geometry__.js': 0,
    'Na__LayoutEditor__SheetImages__Painter__.js': 1,
    'Na__LayoutEditor__SheetImages__Paint__.js': 0,
    'Na__LayoutEditor__SheetImages__Source__.js': 2,
    'Na__LayoutEditor__SheetImages__Pdf__.js': 2,
    'Na__LayoutEditor__SheetImages__Encode__.js': 0,
}

EXTRA_EDITS = {
    'Na__LayoutEditor__SheetImages__Setup__.js': [
        ("Na__LeImgCfg__Value('Sources', 'PagesBaseUrl', '" + TV_PAGES + "')",
         "Na__LeImgCfg__Value('Sources', 'PagesBaseUrl', '" + VV_PAGES + "')", 1),
    ],
}


# -----------------------------------------------------------------------------
# The config JSON: (old line, new line) and one inserted line
# -----------------------------------------------------------------------------

CONFIG = 'Na__LayoutEditor__SheetImages__Config__.json'
FOLDERS_OLD_START = '        "Meta__Folders"     : "Every stored picture lives in <project>/30__'
FOLDERS_NEW = ('        "Meta__Folders"     : "Every stored picture lives in <project folder>/05__Layout__DrawingDocs__Images/'
               '<document id>/ - VaApps/Projects/<folderId>/ on R2, WebApps/Whitecardopedia/Projects/<folderId>/ on this '
               'machine - the document id being the one the title block prints (3047_D01). Nothing is written when a '
               'picture is dropped: the images folder is made by the first save after a picture is placed on any sheet '
               'of the project, never by the Whitecardopedia sync, and a document\'s own folder the first time a picture '
               'is saved on that document. A renumber, a phase change or a typed document id moves the pictures with the '
               'drawing: the next save - and every register edit IS a save - files each picture under the new id, pushes '
               'it to R2, and only then writes the drawings that point at it. No picture is committed to the repository '
               'until Adam answers DR-29, so the copy on this machine is its record, not a GitHub Pages fallback.",')
PAGES_OLD = '        "Sources__PagesBaseUrl" : "' + TV_PAGES + '",'
PAGES_NEW = '        "Sources__PagesBaseUrl" : "' + VV_PAGES + '",'
AUTHOR_LINE = '        "Meta__Author"      : "Adam Noble - Noble Architecture",'
PORTED_FROM = ('        "Meta__PortedFrom"  : "TrueVision3D ' + FOLDER + CONFIG + ', Meta 1.1.0 (TrueVision3D v2.121.0, '
               '21-Sep-2026; read at HEAD ' + PIN + '), ported ' + PORTED_ON + ' (parity package W1-16). Every key and every '
               'number is TrueVision\'s. This app\'s own values: Sources__PagesBaseUrl, its GitHub Pages base (the root the '
               'transport facade\'s relative paths start from), and Meta__Folders, which names its R2 prefix, its project '
               'folders, its document ids and its sync. The frame keeps TrueVision\'s #555041 rule (DR-13 (a)). The notes '
               'that cite NP03, EB03 and RB05 are TrueVision\'s measurements, kept as the record of how each number was '
               'chosen.",')


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def tv_bytes(name):
    return subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':' + TV_APP + FOLDER + name],
                          capture_output=True, check=True).stdout


def replace_counted(text, old, new, want, what):
    got = text.count(old)
    if got != want:
        raise SystemExit('STOP: %s - expected %d occurrence(s) of %r, found %d' % (what, want, old[:80], got))
    return text.replace(old, new) if want else text


def sha(data):
    return hashlib.sha256(data).hexdigest()


def port_js(name, source):
    text = source
    if '\r' in text:
        raise SystemExit('STOP: %s - TrueVision text holds a CR; expected LF only' % name)
    text = replace_counted(text, BANNER_OLD, BANNER_NEW, 1, name + ' banner')
    text = replace_counted(text, PREFIX_OLD, PREFIX_NEW, CONSOLE_COUNTS[name], name + ' console prefix')
    for old, new, want in EXTRA_EDITS.get(name, []):
        text = replace_counted(text, old, new, want, name + ' extra edit')
    anchor = '\n' + RULE + '\n//\n// DEVELOPMENT LOG:\n'
    inserted = '\n' + RULE + '\n//\n' + NOTES[name] + '//\n' + RULE + '\n//\n// DEVELOPMENT LOG:\n'
    text = replace_counted(text, anchor, inserted, 1, name + ' PORT NOTE anchor')
    return text


def check_js(name, tv_text, vv_text):
    """Every line that differs from TrueVision must be a listed seam."""
    tv_lines = tv_text.split('\n')
    vv_lines = vv_text.split('\n')
    note_lines = NOTES[name].rstrip('\n').split('\n')
    # Remove the inserted block (rule, //, note, //) to align the rest with TrueVision.
    start = vv_lines.index('// PORT NOTE:')
    end = start + len(note_lines)
    if vv_lines[start:end] != note_lines:
        raise SystemExit('STOP: %s - PORT NOTE block not found intact' % name)
    if vv_lines[end] != '//' or vv_lines[end + 1] != RULE or vv_lines[end + 2] != '//':
        raise SystemExit('STOP: %s - PORT NOTE block is not closed by //, the rule and //' % name)
    aligned = vv_lines[:start] + vv_lines[end + 3:]
    if len(aligned) != len(tv_lines):
        raise SystemExit('STOP: %s - line count differs from TrueVision after removing the note (%d vs %d)'
                         % (name, len(aligned), len(tv_lines)))
    changed = []
    for index, (a, b) in enumerate(zip(tv_lines, aligned), 1):
        if a == b:
            continue
        allowed = (
            (a.startswith('// ' + 'TRUE' + 'VISION3D - ') and b == '// VALEVISION3D - ' + a[len('// ' + 'TRUE' + 'VISION3D - '):]) or
            (a.replace(PREFIX_OLD, PREFIX_NEW) == b and PREFIX_OLD in a) or
            any(a.replace(old, new) == b and old in a for old, new, _ in EXTRA_EDITS.get(name, []))
        )
        if not allowed:
            raise SystemExit('STOP: %s line %d differs from TrueVision outside a listed seam:\n  TV: %s\n  VV: %s'
                             % (name, index, a, b))
        changed.append(index)
    markers = [m for m in ('True' + 'Vision__', 'True' + 'Vision3D__', '[' + 'True' + 'Vision3D', 'TRUE' + 'VISION3D',
                           'noble-architecture.com', 'Na' + 'ProjectPortal', '30__' + 'True' + 'Vision__AppContent',
                           '/api/' + 'truevision', 'na-' + 'truevision-api', 'na-' + 'projectvision-local-dev')
               if m in '\n'.join(aligned)]
    if markers:
        raise SystemExit('STOP: %s - identity marker(s) left outside the PORT NOTE: %s' % (name, markers))
    return changed


def port_config(source):
    text = source
    if '\r' in text:
        raise SystemExit('STOP: config - TrueVision text holds a CR; expected LF only')
    lines = text.split('\n')
    folder_rows = [i for i, line in enumerate(lines) if line.startswith(FOLDERS_OLD_START)]
    if len(folder_rows) != 1:
        raise SystemExit('STOP: config - Meta__Folders line not found exactly once (%d)' % len(folder_rows))
    lines[folder_rows[0]] = FOLDERS_NEW
    text = '\n'.join(lines)
    text = replace_counted(text, '\n' + PAGES_OLD + '\n', '\n' + PAGES_NEW + '\n', 1, 'config PagesBaseUrl')
    text = replace_counted(text, '\n' + AUTHOR_LINE + '\n', '\n' + AUTHOR_LINE + '\n' + PORTED_FROM + '\n', 1, 'config Meta__PortedFrom')
    return text


def check_config(tv_text, vv_text):
    tv = json.loads(tv_text)
    vv = json.loads(vv_text)
    # Duplicate keys would be kept silently by json.loads: refuse them.
    def no_dupes(pairs):
        keys = [k for k, _ in pairs]
        if len(keys) != len(set(keys)):
            raise SystemExit('STOP: config - duplicate key(s): %s' % keys)
        return dict(pairs)
    json.loads(vv_text, object_pairs_hook=no_dupes)
    differences = []
    for block in sorted(set(tv) | set(vv)):
        if block not in tv or block not in vv:
            differences.append(('block', block))
            continue
        for key in sorted(set(tv[block]) | set(vv[block])):
            if tv[block].get(key, '<absent>') != vv[block].get(key, '<absent>'):
                differences.append((block, key))
    allowed = {
        ('LayoutEditor__SheetImages__Meta', 'Meta__Folders'),
        ('LayoutEditor__SheetImages__Meta', 'Meta__PortedFrom'),
        ('LayoutEditor__SheetImages__Sources', 'Sources__PagesBaseUrl'),
    }
    if set(differences) != allowed:
        raise SystemExit('STOP: config - differences from TrueVision are not exactly the listed seams: %s' % differences)
    for marker in ('True' + 'Vision__', 'True' + 'Vision3D__', 'noble-architecture.com', 'Na' + 'ProjectPortal',
                   '/na-' + 'apps/', 'Noble Architecture ' + 'Ltd', '_T0'):
        if marker in vv_text:
            raise SystemExit('STOP: config - marker %r left in the ValeVision config' % marker)
    if list(vv['LayoutEditor__SheetImages__Meta'].keys())[:6] != ['Meta__FileName', 'Meta__Description', 'Meta__Version',
                                                                  'Meta__Created', 'Meta__Author', 'Meta__PortedFrom']:
        raise SystemExit('STOP: config - Meta key order unexpected')
    return differences


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

def main():
    dry = '--dry-run' in sys.argv
    target_dir = os.path.join(VV_APP, FOLDER.replace('/', os.sep))
    previous = json.load(open(MANIFEST, encoding='utf-8')) if os.path.exists(MANIFEST) else {}
    plan = []
    for name in list(NOTES.keys()) + [CONFIG]:
        raw = tv_bytes(name)
        tv_text = raw.decode('utf-8')
        if name == CONFIG:
            vv_text = port_config(tv_text)
            changed = check_config(tv_text, vv_text)
        else:
            vv_text = port_js(name, tv_text)
            changed = check_js(name, tv_text, vv_text)
        out = vv_text.encode('utf-8')
        target = os.path.join(target_dir, name)
        if os.path.exists(target):
            have = sha(open(target, 'rb').read())
            if have != sha(out) and have != previous.get(name):
                raise SystemExit('STOP: %s exists with bytes this script did not write (sha256 %s) - nothing written'
                                 % (target, have))
        plan.append((name, target, raw, out, changed))
        print('%-48s TV %6d bytes sha256 %s... -> VV %6d bytes sha256 %s...  differing TV lines %s'
              % (name, len(raw), sha(raw)[:12], len(out), sha(out)[:12], changed))
    if dry:
        print('DRY RUN - nothing written')
        return
    os.makedirs(target_dir, exist_ok=True)
    record = {}
    for name, target, raw, out, _ in plan:
        with open(target, 'wb') as fh:
            fh.write(out)
        record[name] = sha(out)
    record['_tv_pin'] = PIN
    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(record, fh, indent=2)
        fh.write('\n')
    print('WROTE %d files into %s' % (len(plan), target_dir))


if __name__ == '__main__':
    main()
