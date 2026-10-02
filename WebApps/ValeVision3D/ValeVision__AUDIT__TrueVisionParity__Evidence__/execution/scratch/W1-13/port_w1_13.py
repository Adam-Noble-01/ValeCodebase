# W1-13 scratch: take ten TrueVision files and one test whole at the pin and re-apply only the listed VV seams
# (banner, console prefix, printed test title, PORT NOTE). Writes TrueVision's text exactly as git show returns it
# (LF). Hash-guarded: the two existing VV files must still match the snapshot in sha256__before.txt; a new file must
# not exist yet (or already hold exactly this output, so a re-run is a no-op).
#
#   python -B port_w1_13.py --dry-run     plan only, write nothing
#   python -B port_w1_13.py               write
#   python -B port_w1_13.py --verify      prove each VV file is TV's bytes plus the seams and nothing else
import difflib
import hashlib
import os
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
LE = '02__Src__AppModules/51__System__LayoutEditor/'
PH = '{{VVREL:W1-13}}'
RULE = '// -----------------------------------------------------------------------------\n'

BANNER = ('// TRUEVISION3D - ', '// VALEVISION3D - ', 1)
CONSOLE = ("'[TrueVision3D LayoutEditor]", "'[ValeVision3D LayoutEditor]")


def note(lines):
    return ''.join(line + '\n' for line in lines)


FILES = []

# 1. ShapeRings ---------------------------------------------------------------------------------------------------------
FILES.append({
    'rel': LE + '15__Core__Markup/Na__LayoutEditor__ShapeRings__.js',
    'new': True,
    'seams': [
        BANNER,
        (note([
            '// PORT NOTE:',
            '// - Authored in   : TrueVision3D first (22-Sep-2026)',
            "// - ValeVision    : not yet ported - it waits for Adam's sign-off. A reader",
            '//                   that does not know Shape__Holes paints a holed vector as one',
            '//                   run: the outline and its holes joined by a stray edge.',
        ]), note([
            '// PORT NOTE:',
            '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__ShapeRings__.js',
            '// - Source version: 1.1.0 (TrueVision3D v2.160.0, 23-Sep-2026; 1.0.0 shipped in v2.150.0, 22-Sep-2026; read at b2aa9151)',
            '// - Ported on     : 01-Oct-2026 for ValeVision3D ' + PH + ". TrueVision's own note held this port for",
            "//                   Adam's sign-off; it comes across under DR-01 (c), and v2.150.0 and v2.160.0 are named as",
            '//                   not yet confirmed by Adam in TrueVision.',
            '// - Parity        : verbatim',
            '// - Divergences   :',
            '//   - Banner reads ValeVision3D. (No console output in this file.)',
            '// - Back-port     : none.',
        ]), 1),
    ],
})

# 2. DimensionRounding --------------------------------------------------------------------------------------------------
FILES.append({
    'rel': LE + '15__Core__Markup/Na__LayoutEditor__DimensionRounding__.js',
    'new': True,
    'seams': [
        BANNER,
        (note([
            '// PORT NOTE:',
            '// - Authored in   : TrueVision3D first (21-Sep-2026).',
            "// - ValeVision    : not yet ported - it waits for Adam's sign-off.",
        ]), note([
            '// PORT NOTE:',
            '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__DimensionRounding__.js',
            '// - Source version: 1.0.0 (TrueVision3D v2.139.0, 21-Sep-2026; read at b2aa9151)',
            '// - Ported on     : 01-Oct-2026 for ValeVision3D ' + PH + ". TrueVision's own note held this port for",
            "//                   Adam's sign-off; it comes across under DR-01 (c), and v2.139.0 is named as not yet",
            '//                   confirmed by Adam in TrueVision.',
            '// - Parity        : verbatim',
            '// - Divergences   :',
            '//   - Banner reads ValeVision3D. (No console output in this file.)',
            '// - Back-port     : none.',
        ]), 1),
    ],
})

# 3. PaintOrder (TrueVision's file has no PORT NOTE block: one is added before the DEVELOPMENT LOG) ---------------------
FILES.append({
    'rel': LE + '15__Core__Markup/Na__LayoutEditor__PaintOrder__.js',
    'new': True,
    'seams': [
        BANNER,
        (note([
            '// - Reads the layers through Na__LayoutEditor__SheetModel__ only.',
            '//',
        ]) + RULE + note([
            '//',
            '// DEVELOPMENT LOG:',
        ]), note([
            '// - Reads the layers through Na__LayoutEditor__SheetModel__ only.',
            '//',
        ]) + RULE + note([
            '//',
            '// PORT NOTE:',
            '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__PaintOrder__.js',
            '// - Source version: 1.0.0 (TrueVision3D v2.106.0, 21-Sep-2026; read at b2aa9151)',
            '// - Ported on     : 01-Oct-2026 for ValeVision3D ' + PH,
            "// - Parity        : verbatim (TrueVision's file carries no PORT NOTE block; this one is the only addition)",
            '// - Divergences   :',
            '//   - Banner reads ValeVision3D. (No console output in this file.)',
            '// - Back-port     : none.',
            '//',
        ]) + RULE + note([
            '//',
            '// DEVELOPMENT LOG:',
        ]), 1),
    ],
})

# 4. MeasureParse 1.1.0 (whole file over VV's 1.0.0; TrueVision's file has no PORT NOTE block) -------------------------
FILES.append({
    'rel': LE + '15__Core__Markup/Na__LayoutEditor__MeasureParse__.js',
    'new': False,
    'seams': [
        BANNER,
        (note([
            '//   live readings with it.',
            '//',
        ]) + RULE + note([
            '//',
            '// DEVELOPMENT LOG:',
        ]), note([
            '//   live readings with it.',
            '//',
        ]) + RULE + note([
            '//',
            '// PORT NOTE:',
            '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__MeasureParse__.js',
            '// - Source version: 1.1.0 (TrueVision3D v2.119.0, 21-Sep-2026; read at b2aa9151)',
            '// - Ported on     : 01-Oct-2026 for ValeVision3D ' + PH + ", the whole file. This app's copy before it",
            '//                   was 1.0.0, ported from TrueVision3D v2.46.0 on 14-Sep-2026 (ValeVision3D v2.35.0).',
            '// - Parity        : verbatim',
            '// - Divergences   :',
            '//   - Banner reads ValeVision3D. (No console output in this file.)',
            '// - Back-port     : none.',
            '//',
        ]) + RULE + note([
            '//',
            '// DEVELOPMENT LOG:',
        ]), 1),
    ],
})

# 5 and 6. The two margin record leaves -------------------------------------------------------------------------------
LEAF_OLD = note([
    '// PORT NOTE:',
    '// - Authored in   : TrueVision3D first (22-Sep-2026)',
    '// - ValeVision    : not yet ported. Nothing here is app-specific.',
])


def leaf_note(name, version, release):
    return note([
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/' + name,
        '// - Source version: ' + version + ' (TrueVision3D ' + release + ', 22-Sep-2026; read at b2aa9151)',
        '// - Ported on     : 01-Oct-2026 for ValeVision3D ' + PH,
        "// - Parity        : verbatim - nothing here is app-specific, as TrueVision's own note said",
        '// - Divergences   :',
        '//   - Banner reads ValeVision3D. (No console output in this file.)',
        '// - Back-port     : none.',
    ])


FILES.append({
    'rel': LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__NoteRegions__.js',
    'new': True,
    'seams': [
        BANNER,
        (LEAF_OLD, leaf_note('Na__LayoutEditor__SheetRecords__NoteRegions__.js', '1.0.0', 'v2.143.0'), 1),
    ],
})
FILES.append({
    'rel': LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js',
    'new': True,
    'seams': [
        BANNER,
        (LEAF_OLD, leaf_note('Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js', '1.0.0', 'v2.147.0'), 1),
    ],
})

# 7. Register Numbering -------------------------------------------------------------------------------------------------
FILES.append({
    'rel': LE + '51__Feature__DrawingRegister/Na__LayoutEditor__Register__Numbering__.js',
    'new': True,
    'seams': [
        BANNER,
        (note([
            '// PORT NOTE:',
            '// - Ported from   : n/a (TrueVision3D first, 19-Sep-2026)',
            '// - Back-port     : offer to ValeVision3D with the register tab.',
        ]), note([
            '// PORT NOTE:',
            '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Numbering__.js',
            '// - Source version: 1.0.1 (TrueVision3D v2.69.0, 19-Sep-2026, the first release whose log names the Drawing',
            '//                   Register; the file is unchanged since it was first committed that day; read at b2aa9151)',
            '// - Ported on     : 01-Oct-2026 for ValeVision3D ' + PH + ', ahead of the rest of the Drawing Register:',
            "//                   the sheet model's renumber imports it",
            '// - Parity        : verbatim',
            '// - Divergences   :',
            '//   - Banner reads ValeVision3D. (No console output in this file.)',
            '// - Back-port     : none.',
        ]), 1),
    ],
})

# 8. ScaleManager 1.2.1 (whole file over VV's copy; VV authored it first) --------------------------------------------
FILES.append({
    'rel': LE + '07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js',
    'new': False,
    'seams': [
        BANNER,
        (note([
            '// PORT NOTE:',
            '// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__ScaleManager__.js',
            '// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)',
            '// - Parity        : verbatim',
            '// - Divergences   : Console prefix, header and folder numbers; the site plan scale list (TrueVision first, 14-Sep-2026).',
            '// - Back-port     : n/a (this IS the back-port)',
        ]), note([
            '// PORT NOTE:',
            "// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, from Lantern Designer's",
            '//                   30__System__DrawingEditorMode/VghLantern__DrawingEditor__ScaleManager__.js); TrueVision3D',
            '//                   took it whole on 10-Sep-2026 (its v2.21.0) and grew the site plan list and the sheet',
            "//                   label; this app's copy then had TrueVision's 1.2.0 code under a 1.0.0 header (ValeVision3D",
            '//                   v2.54.0, IsListed asking one list); since ported back whole from TrueVision3D 1.2.1',
            '//                   (HEAD b2aa9151)',
            '// - Source version: 1.2.1 (TrueVision3D v2.140.0, 22-Sep-2026; read at b2aa9151)',
            '// - Ported on     : 01-Oct-2026 for ValeVision3D ' + PH,
            '// - Parity        : verbatim. The site plan list is TrueVision\'s and inert here: no ValeVision viewport',
            '//                   is a site plan one (DR-08 (B)), so the records coerce every viewport onto the',
            '//                   architectural list as before.',
            '// - Divergences   :',
            '//   - Banner reads ValeVision3D. (No console output in this file.)',
            '// - Back-port     : none.',
        ]), 1),
    ],
})

# 9. SitePlanComposites (dormant, DR-08 (B)) --------------------------------------------------------------------------
FILES.append({
    'rel': LE + '25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js',
    'new': True,
    'seams': [
        BANNER,
        (CONSOLE[0], CONSOLE[1], 3),
        (note([
            '// PORT NOTE:',
            '// - Ported from   : none (TrueVision-only: site plan drawings)',
            '// - Parity        : n/a',
            '// - Divergences   : n/a',
            '// - Back-port     : goes to ValeVision3D with the site plan feature, if that is ever ported',
        ]), note([
            '// PORT NOTE:',
            '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js',
            '// - Source version: 1.0.0 (TrueVision3D v2.89.0, 20-Sep-2026; read at b2aa9151)',
            '// - Ported on     : 01-Oct-2026 for ValeVision3D ' + PH + ', with Na__LayoutEditor__SitePlanComposites__Config__.json',
            "//                   (TrueVision's file, byte for byte)",
            "// - Parity        : verbatim, and dormant: ValeVision has no site plan data (DR-08 (B)). Taken whole on",
            "//                   purpose, overriding TrueVision's composites plan section 3.5 ('a surgical merge of the",
            "//                   non-site-plan parts only'), so the record layer and the site plan painter can come",
            '//                   across byte for byte.',
            '// - Divergences   :',
            '//   - Banner and console prefix read ValeVision3D.',
            '// - Back-port     : none.',
        ]), 1),
    ],
})

# 10. SitePlanComposites config (JSON: no header, taken byte for byte) ------------------------------------------------
FILES.append({
    'rel': LE + '25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__Config__.json',
    'new': True,
    'seams': [],
})

# 11. The DimensionRoundUp test ---------------------------------------------------------------------------------------
FILES.append({
    'rel': '80__Testing__PrototypeEnvironment/Na__Test__DimensionRoundUp__.test.mjs',
    'new': True,
    'seams': [
        BANNER,
        ("    console.log('TrueVision3D - dimension round up to 5 mm');\n",
         "    console.log('ValeVision3D - dimension round up to 5 mm');\n", 1),
        (note([
            '//   Exit 0 = every check passed. Exit 1 = at least one did not.',
            '//',
        ]) + RULE + note([
            '//',
            '// DEVELOPMENT LOG:',
        ]), note([
            '//   Exit 0 = every check passed. Exit 1 = at least one did not.',
            '//',
        ]) + RULE + note([
            '//',
            '// PORT NOTE:',
            '// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__DimensionRoundUp__.test.mjs',
            '// - Source version: 1.0.0 (TrueVision3D v2.139.0, 21-Sep-2026; read at b2aa9151)',
            '// - Ported on     : 01-Oct-2026 for ValeVision3D ' + PH + ', with the module it proves',
            "// - Parity        : verbatim - every check is TrueVision's, run against this app's own module",
            '// - Divergences   :',
            '//   - Banner and the printed title read ValeVision3D.',
            '// - Back-port     : none.',
            '//',
        ]) + RULE + note([
            '//',
            '// DEVELOPMENT LOG:',
        ]), 1),
    ],
})


# -----------------------------------------------------------------------------------------------------------------------

def git_show(rel):
    return subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TVAPP + rel],
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


def before_hashes():
    out = {}
    with open(os.path.join(HERE, 'sha256__before.txt'), 'r', encoding='utf-8') as fh:
        for line in fh:
            parts = line.split()
            if len(parts) >= 2:
                out[parts[1]] = parts[0]
    return out


def build(entry):
    tv = git_show(entry['rel'])
    if b'\r' in tv:
        raise SystemExit('TV text has a CR: ' + entry['rel'])
    text = tv.decode('utf-8')
    for old, new, count in entry['seams']:
        found = text.count(old)
        if found != count:
            raise SystemExit('SEAM MISMATCH in %s: expected %d of %r, found %d' % (entry['rel'], count, old[:70], found))
        text = text.replace(old, new)
    out = text.encode('utf-8')
    return tv, out


def checks(entry, out):
    rel = entry['rel']
    text = out.decode('utf-8')
    problems = []
    if b'\r' in out:
        problems.append('CR in output')
    if not text.endswith('\n'):
        problems.append('no final newline')
    if rel.endswith(('.js', '.mjs')):
        head = text.split('\n')[:6]
        if not any(line.startswith('// VALEVISION3D - ') for line in head):
            problems.append('no VALEVISION3D banner')
        if 'TRUEVISION3D' in text:
            problems.append('TRUEVISION3D left')
        if '[TrueVision3D' in text:
            problems.append('[TrueVision3D console prefix left')
        fileline = [line for line in text.split('\n')[:40] if line.startswith('// FILE       : ')]
        if not fileline or fileline[0].split(': ', 1)[1].strip() != os.path.basename(rel):
            problems.append('FILE line does not name the file')
        if text.count(PH) != 1:
            problems.append('placeholder count %d' % text.count(PH))
    return problems


def main(argv):
    dry = '--dry-run' in argv
    verify = '--verify' in argv
    before = before_hashes()
    plans = []
    for entry in FILES:
        tv, out = build(entry)
        problems = checks(entry, out)
        if problems:
            raise SystemExit('CHECKS FAILED for %s: %s' % (entry['rel'], '; '.join(problems)))
        dest = os.path.join(VV, entry['rel'].replace('/', os.sep))
        plans.append((entry, tv, out, dest))

    if verify:
        bad = 0
        for entry, tv, out, dest in plans:
            with open(dest, 'rb') as fh:
                live = fh.read()
            ok_bytes = live == out
            text = live.decode('utf-8')
            for old, new, count in reversed(entry['seams']):
                text = text.replace(new, old)
            ok_tv = text.encode('utf-8') == tv
            print('%-4s %-4s %s  live=%s' % ('OK' if ok_bytes else 'DIFF', 'TV=' + ('yes' if ok_tv else 'NO'),
                                            entry['rel'], sha(live)[:16]))
            bad += 0 if (ok_bytes and ok_tv) else 1
        print('verify: %d problem(s)' % bad)
        return 1 if bad else 0

    # GUARDS | nothing is written unless every file passes
    for entry, tv, out, dest in plans:
        if entry['new']:
            if os.path.exists(dest):
                with open(dest, 'rb') as fh:
                    if fh.read() != out:
                        raise SystemExit('GUARD: new file already exists with other content: ' + dest)
        else:
            with open(dest, 'rb') as fh:
                live = fh.read()
            if live != out and sha(live) != before.get(entry['rel']):
                raise SystemExit('GUARD: %s changed since the snapshot (%s != %s)' % (dest, sha(live), before.get(entry['rel'])))

    os.makedirs(os.path.join(HERE, 'diffs'), exist_ok=True)
    for entry, tv, out, dest in plans:
        diff = difflib.unified_diff(tv.decode('utf-8').split('\n'), out.decode('utf-8').split('\n'),
                                    'TV@' + PIN + '/' + entry['rel'], 'VV/' + entry['rel'], n=0, lineterm='')
        diff_text = '\n'.join(diff) + '\n'
        with open(os.path.join(HERE, 'diffs', os.path.basename(entry['rel']) + '.diff'), 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(diff_text)
        state = 'new' if entry['new'] else 'whole-file over existing'
        print('%s  %s  TV %d bytes -> VV %d bytes  sha256 %s' % ('PLAN' if dry else 'WRITE', entry['rel'], len(tv), len(out), sha(out)[:16]))
        print('      (%s; %d seam(s); diff lines %d)' % (state, len(entry['seams']), diff_text.count('\n')))
        if not dry:
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, 'wb') as fh:
                fh.write(out)
    if not dry:
        with open(os.path.join(HERE, 'sha256__after.txt'), 'w', encoding='utf-8', newline='\n') as fh:
            for entry, tv, out, dest in plans:
                fh.write('%s  %s  %d bytes  (TV sha256 %s)\n' % (sha(out), entry['rel'], len(out), sha(tv)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
