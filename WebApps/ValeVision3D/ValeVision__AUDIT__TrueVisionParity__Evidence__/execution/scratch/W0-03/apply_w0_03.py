"""W0-03 - hotkey file names (name only) and identity hygiene. Byte-level, all-or-nothing.

  python apply_w0_03.py --dry-run   compute every change in memory, report, write nothing
  python apply_w0_03.py             apply (refuses if any owned file drifted from the pre-image manifest)
  python apply_w0_03.py --restore   put every pre-image back and remove the two new-name files
  python apply_w0_03.py --check-live  recompute from the pre-images and prove the live tree equals the result

(The first run applied the log entries with an uneven wrap; reflow_logs.py re-wrapped three of them, wording
unchanged, and the texts below were brought into line with it, so this script alone reproduces the final state.)

Rules kept: every replacement must match its expected count exactly or nothing is written; each file keeps its
own line ending (inserted blocks are built with the file's EOL); the two key files are renamed with os.replace
semantics (no git index change) and their bytes are not touched.
"""
import hashlib, json, os, sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(HERE, 'preimage_manifest.json')
PRE = os.path.join(HERE, 'preimage')

KM_OLD = '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__KeyMappings__.json'
KM_NEW = '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json'
HK_OLD = '02__Src__AppModules/02__AppData/Na__ValeVision__HotkeysDictionary__.json'
HK_NEW = '02__Src__AppModules/02__AppData/Na__Hotkeys__3dModelTab__.json'
RENAMES = [(KM_OLD, KM_NEW), (HK_OLD, HK_NEW)]

D_OLD = 'Na__LayoutEditor__KeyMappings__.json'
D_NEW = 'Na__Hotkeys__DrawingTabs__.json'
M_OLD = 'Na__ValeVision__HotkeysDictionary__.json'
M_NEW = 'Na__Hotkeys__3dModelTab__.json'

# -----------------------------------------------------------------------------------------------------------
# Edits: file -> list of (old, new, expected_count). Strings use '\n'; they are converted to the file's EOL.
# -----------------------------------------------------------------------------------------------------------
EDITS = {}

# 03__AppUtils - the 3D hotkey handler (VV-only module): fetch constant, two comments, a log entry.
EDITS['02__Src__AppModules/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js'] = [
    ('// - Loads hotkey bindings from %s via fetch.\n' % M_OLD,
     '// - Loads hotkey bindings from %s via fetch.\n' % M_NEW, 1),
    ('// DEVELOPMENT LOG:\n'
     '// 25-Jun-2026 - Version 1.0.0\n',
     '// DEVELOPMENT LOG:\n'
     '// 01-Oct-2026 - Version 1.0.1 (hotkey file names, {{VVREL:W0-03}})\n'
     '// - The dictionary takes TrueVision\'s per-tab file name,\n'
     '//   02__AppData/%s, so only the fetch\n'
     '//   path changes. Its content is untouched: the root key stays\n'
     '//   Na__ValeVision__HotkeysDictionary and every action keeps its\n'
     '//   ValeVision__ name.\n'
     '//\n'
     '// 25-Jun-2026 - Version 1.0.0\n' % M_NEW, 1),
    ('// - Dictionary: 02__AppData/%s\n' % M_OLD,
     '// - Dictionary: 02__AppData/%s\n' % M_NEW, 1),
    ("        const dictionaryPath = '02__Src__AppModules/02__AppData/%s'; // <-- Path to hotkey dictionary\n" % M_OLD,
     "        const dictionaryPath = '02__Src__AppModules/02__AppData/%s'; // <-- Path to hotkey dictionary\n" % M_NEW, 1),
]

# 10__NavigationAndCameras - the navigation help panel (VV-only module): fetch constant, a comment, a log entry.
EDITS['02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationHelpPanel__Controls.js'] = [
    ('//   %s so the panel stays in sync\n' % M_OLD,
     '//   %s so the panel stays in sync\n' % M_NEW, 1),
    ('// DEVELOPMENT LOG:\n'
     '// 30-Jul-2026 - Version 1.4.0\n',
     '// DEVELOPMENT LOG:\n'
     '// 01-Oct-2026 - Version 1.4.1 (hotkey file names, {{VVREL:W0-03}})\n'
     '// - Reads the Keyboard Shortcuts rows from the 3D tab\'s hotkey file under\n'
     '//   TrueVision\'s per-tab name, 02__AppData/%s.\n'
     '//   The dictionary\'s content, root key and rows are unchanged.\n'
     '//\n'
     '// 30-Jul-2026 - Version 1.4.0\n' % M_NEW, 1),
    ("    const Na__NavHelp__HotkeyDictPath = '02__Src__AppModules/02__AppData/%s'; // <-- Source JSON for keyboard shortcut rows\n" % M_OLD,
     "    const Na__NavHelp__HotkeyDictPath = '02__Src__AppModules/02__AppData/%s'; // <-- Source JSON for keyboard shortcut rows\n" % M_NEW, 1),
]

# index.html - two comments name the 3D dictionary file.
EDITS['index.html'] = [
    ('<!-- UI SECTION | Keyboard Shortcuts (populated from %s) -->' % M_OLD,
     '<!-- UI SECTION | Keyboard Shortcuts (populated from %s) -->' % M_NEW, 1),
    ('    // @delegate: ./02__Src__AppModules/02__AppData/%s\n' % M_OLD,
     '    // @delegate: ./02__Src__AppModules/02__AppData/%s\n' % M_NEW, 1),
]

# LE/03 Config - the key map unit: fetch constant (TrueVision's line), two comments (TrueVision's text), a log entry.
EDITS['02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js'] = [
    ('// - Fetches %s and holds the parsed key map\n' % D_OLD,
     '// - Fetches %s and holds the parsed key map\n' % D_NEW, 1),
    ('// DEVELOPMENT LOG:\n'
     '// 15-Sep-2026 - Version 1.0.0\n',
     '// DEVELOPMENT LOG:\n'
     '// 01-Oct-2026 - Version 1.0.1 (hotkey file names, {{VVREL:W0-03}})\n'
     '// - The key file takes TrueVision\'s per-tab name,\n'
     '//   %s, so only the fetch URL changes. Its\n'
     '//   content and its LayoutEditor__KeyMappings__* keys are untouched;\n'
     '//   TrueVision\'s drawing-tab key content comes only with this unit at\n'
     '//   TrueVision\'s 1.11.0, whose When matcher keeps T on the Text tool.\n'
     '//\n'
     '// 15-Sep-2026 - Version 1.0.0\n' % D_NEW, 1),
    ("    const Na__LeCfg__KeyMapUrl  = new URL('./%s', import.meta.url);\n" % D_OLD,
     "    const Na__LeCfg__KeyMapUrl  = new URL('./%s', import.meta.url);\n" % D_NEW, 1),
    ('// %s and nothing else. A user personalisation\n' % D_OLD,
     '// %s and nothing else. A user personalisation\n' % D_NEW, 1),
]

# LE/03 Config - the ConfigState hub: one log line names the key file (TrueVision's text since its rename).
EDITS['02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js'] = [
    ('// - Owns %s as well, and answers what a\n' % D_OLD,
     '// - Owns %s as well, and answers what a\n' % D_NEW, 1),
]

# LE/03 Config - two description strings name the key file (only the file name changes; W0-15 brings TV's text).
EDITS['02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json'] = [
    ('the modifiers in %s."' % D_OLD, 'the modifiers in %s."' % D_NEW, 1),
    ('The keys it reads are in %s under MeasurementsBox.' % D_OLD,
     'The keys it reads are in %s under MeasurementsBox.' % D_NEW, 1),
]

# LE/10 and LE/30 - comments name the key file (TrueVision's text since its rename).
EDITS['02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js'] = [
    ('//   in %s through the config state, so a\n' % D_OLD,
     '//   in %s through the config state, so a\n' % D_NEW, 1),
]
EDITS['02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__TouchScreen__.js'] = [
    ('//   value is read from %s through the config\n' % D_OLD,
     '//   value is read from %s through the config\n' % D_NEW, 1),
]
EDITS['02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Measurements__.js'] = [
    ('// - The keys come from %s (MeasurementsBox)\n' % D_OLD,
     '// - The keys come from %s (MeasurementsBox)\n' % D_NEW, 1),
]

# LE/50 SpecPdf - the console prefix (K2 C1 known leak) and a log entry.
EDITS['02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js'] = [
    ("            console.warn('[TrueVision3D LayoutEditor] The specification could not be downloaded.', error);\n",
     "            console.warn('[ValeVision3D LayoutEditor] The specification could not be downloaded.', error);\n", 1),
    ('// DEVELOPMENT LOG:\n'
     '// 17-Sep-2026 - Version 1.0.0\n',
     '// DEVELOPMENT LOG:\n'
     '// 01-Oct-2026 - Version 1.0.1 (identity hygiene, {{VVREL:W0-03}})\n'
     '// - The warning logged when a download fails carries ValeVision\'s console\n'
     '//   prefix, [ValeVision3D LayoutEditor]; it carried TrueVision\'s.\n'
     '//\n'
     '// 17-Sep-2026 - Version 1.0.0\n', 1),
]

# 44 PlanDimensions styles - the TRUEVISION3D banner (K2 H1 known leak); the PORT NOTE moves after the banner, in
# the K2 H5 field order, between the description rule and TrueVision's DEVELOPMENT LOG (left verbatim, K2 H6).
EDITS['02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Styles__.css'] = [
    ('/*\n'
     ' * PORT NOTE:\n'
     ' * - Ported from : TrueVision3D 02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Styles__.css\n'
     ' * - Ported on   : 09-Sep-2026 for ValeVision3D v2.18.0 (port Phase 2)\n'
     ' * - Parity      : verbatim (app-name tokens only)\n'
     ' */\n'
     '/* =============================================================================\n'
     ' * TRUEVISION3D - PLAN DIMENSIONS - STYLES\n'
     ' * =============================================================================\n',
     '/* =============================================================================\n'
     ' * VALEVISION3D - PLAN DIMENSIONS - STYLES\n'
     ' * =============================================================================\n', 1),
    (' *   with zoom. This file styles only what does NOT vary per dimension.\n'
     ' *\n'
     ' * -----------------------------------------------------------------------------\n'
     ' *\n'
     ' * DEVELOPMENT LOG:\n',
     ' *   with zoom. This file styles only what does NOT vary per dimension.\n'
     ' *\n'
     ' * -----------------------------------------------------------------------------\n'
     ' *\n'
     ' * PORT NOTE:\n'
     ' * - Ported from   : TrueVision3D 02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Styles__.css\n'
     ' * - Source version: 1.0.0 (TrueVision3D v2.15.0, 31-Aug-2026; the file read at b2aa9151 also carries the\n'
     ' *                   same day\'s v2.16.2 fixes and v2.17.0 client-measuring rules under that version)\n'
     ' * - Ported on     : 09-Sep-2026 for ValeVision3D v2.18.0 (port Phase 2); banner token corrected in\n'
     ' *                   ValeVision3D {{VVREL:W0-03}}\n'
     ' * - Parity        : verbatim (app-name tokens only)\n'
     ' * - Divergences   :\n'
     ' *   - Banner reads ValeVision3D. (No console output in a stylesheet.)\n'
     ' * - Back-port     : none.\n'
     ' *\n'
     ' * -----------------------------------------------------------------------------\n'
     ' *\n'
     ' * DEVELOPMENT LOG:\n', 1),
]

# 05 RenderPipeline - SectionClipping__State header (F.8 C12, R2 B.3.1): TrueVision's NAMESPACE and MODULE lines
# and their divergence note; nothing else changes (no log entry: acceptance 5 allows only these lines).
EDITS['02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js'] = [
    ('// NAMESPACE  : Na__RenderEffect\n'
     '// MODULE     : Section Clipping State\n',
     '// NAMESPACE  : Na__SectionClipping\n'
     '// MODULE     : Render Pipeline - Section Clipping State\n', 1),
    ('//   and assign the result to material.clippingPlanes (null when no cuts).\n'
     '//\n'
     '// -----------------------------------------------------------------------------\n'
     '//\n'
     '// DEVELOPMENT LOG:\n',
     '//   and assign the result to material.clippingPlanes (null when no cuts).\n'
     '//\n'
     '// -----------------------------------------------------------------------------\n'
     '//\n'
     '// PORT NOTE:\n'
     '// - Authored in   : ValeVision3D first (1.0.0, 14-Jul-2026, with the cross section tool of ValeVision3D\n'
     '//                   v2.10.0); TrueVision3D took it to the same path, unchanged apart from the header\n'
     '// - Source version: 1.0.0 (TrueVision3D v2.12.0, 31-Aug-2026; read at b2aa9151)\n'
     '// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W0-03}} (TrueVision\'s NAMESPACE and MODULE lines only)\n'
     '// - Parity        : adapted (identical code; the header keeps the ValeVision text listed below)\n'
     '// - Divergences   :\n'
     '//   - DESCRIPTION and INTEGRATION are ValeVision\'s: both render engines (PureEngine and MaxEngine) and the\n'
     '//     2D elevation profile pass read the planes, and 41__System__CrossSectionView owns them (TrueVision\n'
     '//     runs one engine, and its 41__System__SectionCutEngine owns them).\n'
     '//   - PURPOSE and CREATED are ValeVision\'s: "cross-section" and the authoring date (TrueVision\'s port\n'
     '//     reads "section-cut" and 31-Aug-2026).\n'
     '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
     '// - Back-port     : none.\n'
     '//\n'
     '// -----------------------------------------------------------------------------\n'
     '//\n'
     '// DEVELOPMENT LOG:\n', 1),
]


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def eol_of(b):
    crlf = b.count(b'\r\n')
    lf = b.count(b'\n') - crlf
    if crlf and lf:
        return None  # mixed: refuse
    return b'\r\n' if crlf else b'\n'


def conv(s, eol):
    return s.encode('utf-8').replace(b'\n', eol)


def load_manifest():
    return json.load(open(MANIFEST, encoding='utf-8'))


def restore():
    man = load_manifest()
    for rel, rec in man['files'].items():
        src = os.path.join(PRE, rel)
        b = open(src, 'rb').read()
        assert sha1(b) == rec['sha1'], 'pre-image corrupt: ' + rel
        dst = os.path.join(VV, rel)
        with open(dst, 'wb') as fh:
            fh.write(b)
        print('restored', rel)
    for old, new in RENAMES:
        p = os.path.join(VV, new)
        if os.path.exists(p):
            b = open(p, 'rb').read()
            if sha1(b) != man['files'][old]['sha1']:
                print('REFUSING to delete changed new-name file', new)
                continue
            os.remove(p)
            print('removed', new)
    print('restore complete')


def check_live():
    """Recompute every change from the pre-images in memory and compare with the live tree (reproducibility)."""
    man = load_manifest()
    bad = 0
    for rel, edits in EDITS.items():
        b = open(os.path.join(PRE, rel), 'rb').read()
        eol = eol_of(b)
        nb = b
        for old, new, want in edits:
            ob, nwb = conv(old, eol), conv(new, eol)
            assert nb.count(ob) == want, 'pre-image no longer matches an edit: ' + rel
            nb = nb.replace(ob, nwb)
        live = open(os.path.join(VV, rel), 'rb').read()
        ok = live == nb
        bad += 0 if ok else 1
        print('%s  %s' % ('SAME' if ok else 'DIFF', rel))
    for old, new in RENAMES:
        p = os.path.join(VV, new)
        ok = os.path.exists(p) and sha1(open(p, 'rb').read()) == man['files'][old]['sha1'] and not os.path.exists(os.path.join(VV, old))
        bad += 0 if ok else 1
        print('%s  %s (renamed from %s, bytes unchanged, old name gone)' % ('SAME' if ok else 'DIFF', new, old.rsplit('/', 1)[1]))
    print('check-live:', 'the live tree equals this script applied to the pre-images' if not bad else '%d difference(s)' % bad)
    sys.exit(1 if bad else 0)


def main():
    if '--restore' in sys.argv:
        restore()
        return
    if '--check-live' in sys.argv:
        check_live()
        return
    dry = '--dry-run' in sys.argv
    man = load_manifest()
    # 1. drift check on every owned file
    drift = []
    for rel, rec in man['files'].items():
        p = os.path.join(VV, rel)
        if not os.path.exists(p):
            drift.append('missing ' + rel)
            continue
        if sha1(open(p, 'rb').read()) != rec['sha1']:
            drift.append('changed ' + rel)
    for _, new in RENAMES:
        if os.path.exists(os.path.join(VV, new)):
            drift.append('new name already exists ' + new)
    if drift:
        print('STOP - drift since the pre-images:')
        for d in drift:
            print('  ' + d)
        sys.exit(2)
    # 2. compute every new content in memory
    out = {}
    for rel, edits in EDITS.items():
        b = open(os.path.join(VV, rel), 'rb').read()
        eol = eol_of(b)
        if eol is None:
            print('STOP - mixed line endings in', rel)
            sys.exit(2)
        nb = b
        for old, new, want in edits:
            ob, nwb = conv(old, eol), conv(new, eol)
            got = nb.count(ob)
            if got != want:
                print('STOP - %s: expected %d match(es), found %d for:\n%s' % (rel, want, got, old[:200]))
                sys.exit(2)
            nb = nb.replace(ob, nwb)
        if eol_of(nb) != eol:
            print('STOP - line endings would change in', rel)
            sys.exit(2)
        out[rel] = (b, nb)
        d_lines = len(nb.split(eol)) - len(b.split(eol))
        print('%-5s %+3d lines  %s' % ('CRLF' if eol == b'\r\n' else 'LF', d_lines, rel))
    if dry:
        print('dry run: %d files would change, %d renames; nothing written' % (len(out), len(RENAMES)))
        return
    # 3. renames (bytes untouched), then one whole write per file
    for old, new in RENAMES:
        os.rename(os.path.join(VV, old), os.path.join(VV, new))
        nb = open(os.path.join(VV, new), 'rb').read()
        assert sha1(nb) == man['files'][old]['sha1'], 'rename changed bytes?! ' + new
        print('renamed  %s -> %s (sha1 %s unchanged)' % (old, new.rsplit('/', 1)[1], sha1(nb)[:12]))
    for rel, (b, nb) in out.items():
        with open(os.path.join(VV, rel), 'wb') as fh:
            fh.write(nb)
        print('written  %s  %s -> %s' % (rel, sha1(b)[:12], sha1(nb)[:12]))
    print('applied: %d files edited, %d renamed' % (len(out), len(RENAMES)))


if __name__ == '__main__':
    main()
