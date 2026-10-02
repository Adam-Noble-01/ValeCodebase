# W3-11: land NoteRegions__Grips 1.0.0, Panel__MarginNotes__Regions 1.0.0 and Panel__MarginNotes 1.2.0 whole
# from TrueVision at the pin (tv/, read with git show b2aa9151), and replay the ModeController's region-grip
# hunks (TV 1.29.0, :366, :577, :583) at this app's sites.
#   python port_w3_11.py --dry      build candidates into candidate/ and report
#   python port_w3_11.py --apply    write the live files (aborts on an unexpected start hash)
#   python port_w3_11.py --verify   live == candidate, and reversing the seams gives TV's bytes
#   python port_w3_11.py --restore  put backup/ back and delete the two new files
import hashlib
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(HERE, 'tv')
BK = os.path.join(HERE, 'backup')
CAND = os.path.join(HERE, 'candidate')
LE = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor'
SPEC = os.path.join(LE, '50__Feature__Specification')
MC = os.path.join(LE, '05__Core__ModeController', 'Na__LayoutEditor__ModeController__.js')

START = {
    MC: '93c496490237a884f76dd95156d607908cca511e',
    os.path.join(SPEC, 'Na__LayoutEditor__Panel__MarginNotes__.js'): 'fa73b22aa01495438b2bf8ff552bd8b87961c30b',
}

TVPATH = 'TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/'

# ---------------------------------------------------------------------------------------------------------
# Whole-file ports: TV's text, banner H1 and the PORT NOTE H5 the only differences
# ---------------------------------------------------------------------------------------------------------
NOTES = {
    'Na__LayoutEditor__NoteRegions__Grips__.js': (
        '// PORT NOTE:\n'
        '// - Ported from   : ' + TVPATH + 'Na__LayoutEditor__NoteRegions__Grips__.js\n'
        '// - Source version: 1.0.0 (TrueVision3D v2.143.0, 22-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-11}}, the whole file, new to this\n'
        '//                   app. The mode controller attaches and detaches it with the sheet input,\n'
        '//                   beside the margin grip, and never for a viewer; the Margin Notes panel\'s\n'
        '//                   region folds light it (Highlight). It snaps through the object snap\n'
        '//                   search (28__System__ObjectSnap) as TrueVision\'s does, never through a shim.\n'
        '//                   TrueVision\'s v2.143.0 entry is NOT tried by Adam; it comes across under\n'
        '//                   DR-01 (c) and is named so. While DR-40 item 7 (the automatic Move) is held,\n'
        '//                   Na__LeTools__IsMoveAuto is always false, so the grips show under Select only.\n'
        '// - Parity        : verbatim (the code is TrueVision 1.0.0\'s; the banner and this note are the\n'
        '//                   only differences)\n'
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none.\n'
    ),
    'Na__LayoutEditor__Panel__MarginNotes__Regions__.js': (
        '// PORT NOTE:\n'
        '// - Ported from   : ' + TVPATH + 'Na__LayoutEditor__Panel__MarginNotes__Regions__.js\n'
        '// - Source version: 1.0.0 (TrueVision3D v2.143.0, 22-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-11}}, the whole file, new to this\n'
        '//                   app, with Na__LayoutEditor__Panel__MarginNotes__ 1.2.0, which builds,\n'
        '//                   refreshes and registers it. TrueVision\'s v2.143.0 entry is NOT tried by\n'
        '//                   Adam; it comes across under DR-01 (c) and is named so.\n'
        '// - Parity        : verbatim (the code is TrueVision 1.0.0\'s; the banner and this note are the\n'
        '//                   only differences)\n'
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none.\n'
    ),
    'Na__LayoutEditor__Panel__MarginNotes__.js': (
        '// PORT NOTE:\n'
        '// - Ported from   : ' + TVPATH + 'Na__LayoutEditor__Panel__MarginNotes__.js\n'
        '// - Source version: 1.2.0 (TrueVision3D v2.147.0, 22-Sep-2026; 1.1.0 v2.143.0; read at b2aa9151)\n'
        '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-11}}, the whole file over this app\'s\n'
        '//                   1.0.0 (ported 14-Sep-2026; it differed from TrueVision 1.0.0 in nothing but\n'
        '//                   the banner and its note). 1.1.0 adds Overspill Note Regions\n'
        '//                   (Na__LayoutEditor__Panel__MarginNotes__Regions__) and splits the settings;\n'
        '//                   1.2.0 adds Leaderless Notes (Na__LayoutEditor__Panel__MarginNotes__Leaderless__,\n'
        '//                   landed inert by W2-32) and its count in the status line. TrueVision\'s\n'
        '//                   v2.143.0 and v2.147.0 entries are NOT tried by Adam; they come across under\n'
        '//                   DR-01 (c) and are named so.\n'
        '// - Parity        : verbatim (the code is TrueVision 1.2.0\'s; the banner and this note are the\n'
        '//                   only differences)\n'
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none.\n'
    ),
}


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def tv_bytes(name):
    return open(os.path.join(TV, name), 'rb').read()


def port_note_span(text):
    start = text.index('// PORT NOTE:\n')
    end = text.index('//\n// -----', start)
    return start, end


def build_whole(name):
    text = tv_bytes(name).decode('utf-8')
    assert '\r' not in text, name + ': TV text is not LF'
    lines = text.split('\n')
    assert lines[1].startswith('// TRUEVISION3D - '), name
    lines[1] = '// VALEVISION3D - ' + lines[1][len('// TRUEVISION3D - '):]
    text = '\n'.join(lines)
    s, e = port_note_span(text)
    old = text[s:e]
    assert 'not yet ported' in old, name + ': unexpected TV PORT NOTE'
    text = text[:s] + NOTES[name] + text[e:]
    return text.encode('utf-8')


def unseam_whole(name, data):
    """Reverse the two seams: must give TV's bytes exactly."""
    text = data.decode('utf-8')
    lines = text.split('\n')
    lines[1] = '// TRUEVISION3D - ' + lines[1][len('// VALEVISION3D - '):]
    text = '\n'.join(lines)
    s, e = port_note_span(text)
    tv = tv_bytes(name).decode('utf-8')
    ts, te = port_note_span(tv)
    text = text[:s] + tv[ts:te] + text[e:]
    return text.encode('utf-8')


# ---------------------------------------------------------------------------------------------------------
# ModeController hunk replay (CRLF file; every edit anchored on an exact, unique line)
# ---------------------------------------------------------------------------------------------------------
TV_IMPORT = "    import { Na__LeRegionGrip__Attach, Na__LeRegionGrip__Detach } from '../50__Feature__Specification/Na__LayoutEditor__NoteRegions__Grips__.js';"
TV_ATTACH = "        Na__LeRegionGrip__Attach({ editable : Na__LeMode__IsEditable() });    // <-- Each overspill note region's sides, corners and tab, beside the margin's own grip"
TV_DETACH = "        Na__LeRegionGrip__Detach();"

MC_EDITS = [
    # (anchor, replacement) - text is LF here, converted to CRLF on build
    ("    import { Na__LeMarginGrip__Attach, Na__LeMarginGrip__Detach } from '../50__Feature__Specification/Na__LayoutEditor__MarginGrip__.js';\n",
     "    import { Na__LeMarginGrip__Attach, Na__LeMarginGrip__Detach } from '../50__Feature__Specification/Na__LayoutEditor__MarginGrip__.js';\n" + TV_IMPORT + "\n"),
    ("        Na__LeMarginGrip__Attach({ editable : Na__LeMode__IsEditable() });\n",
     "        Na__LeMarginGrip__Attach({ editable : Na__LeMode__IsEditable() });\n" + TV_ATTACH + "\n"),
    ("        Na__LeImg__DetachInput();                                              // <-- A crop in progress is kept, and drops stop\n        Na__LeMarginGrip__Detach();\n",
     "        Na__LeImg__DetachInput();                                              // <-- A crop in progress is kept, and drops stop\n" + TV_DETACH + "\n        Na__LeMarginGrip__Detach();\n"),
    # Header: source-version list
    ("1.18.11, 1.18.12 and 1.18.13 entries name.",
     "1.18.11, 1.18.12, 1.18.13 and 1.18.14 entries name."),
    # Header: ported on
    ("//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-10}} (floor areas)\n",
     "//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-10}} (floor areas);\n"
     "//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-11}} (the note region grips)\n"),
    # Header: the "not yet taken" bullet loses note regions
    ("//   - Not yet taken, each arriving with its feature: the register and statements pages,\n"
     "//     note regions and the published viewer's guards.\n",
     "//   - Not yet taken, each arriving with its feature: the register and statements pages and\n"
     "//     the published viewer's guards.\n"),
    # DEVELOPMENT LOG
    ("// DEVELOPMENT LOG:\n// 02-Oct-2026 - Version 1.18.13 (floor areas, {{VVREL:W3-10}})\n",
     "// DEVELOPMENT LOG:\n"
     "// 02-Oct-2026 - Version 1.18.14 (note region grips, {{VVREL:W3-11}})\n"
     "// - OVERSPILL NOTE REGIONS' GRIPS (Na__LayoutEditor__NoteRegions__Grips__)\n"
     "//   are attached and detached with the sheet input, beside the margin\n"
     "//   grip, and never for a viewer: AttachSheetInput attaches them straight\n"
     "//   after the margin grip, DetachSheetInput detaches them straight before\n"
     "//   it. A region is part of the notes margin record, so its changes are\n"
     "//   'margin' changes: the markup redraws and the Margin Notes panel (now\n"
     "//   TrueVision's 1.2.0, with its Regions and Leaderless parts) refreshes\n"
     "//   by the route the margin already had. From TrueVision3D 1.29.0\n"
     "//   (v2.143.0): TrueVision's import line, calls and comment at this app's\n"
     "//   sites. No sign-off by Adam is recorded in TrueVision for v2.143.0 or\n"
     "//   v2.147.0 (\"NOT tried by Adam\").\n"
     "//\n"
     "// 02-Oct-2026 - Version 1.18.13 (floor areas, {{VVREL:W3-10}})\n"),
]


def build_mc():
    raw = open(MC, 'rb').read()
    assert sha1(raw) == START[MC], 'ModeController changed under me: ' + sha1(raw)
    assert b'\r\n' in raw
    text = raw.decode('utf-8')
    lf = text.replace('\r\n', '\n')
    assert '\r' not in lf
    for anchor, repl in MC_EDITS:
        n = lf.count(anchor)
        assert n == 1, 'anchor count %d: %r' % (n, anchor[:90])
        lf = lf.replace(anchor, repl)
    return lf.replace('\n', '\r\n').encode('utf-8')


TARGETS = {
    os.path.join(SPEC, 'Na__LayoutEditor__NoteRegions__Grips__.js'): lambda: build_whole('Na__LayoutEditor__NoteRegions__Grips__.js'),
    os.path.join(SPEC, 'Na__LayoutEditor__Panel__MarginNotes__Regions__.js'): lambda: build_whole('Na__LayoutEditor__Panel__MarginNotes__Regions__.js'),
    os.path.join(SPEC, 'Na__LayoutEditor__Panel__MarginNotes__.js'): lambda: build_whole('Na__LayoutEditor__Panel__MarginNotes__.js'),
    MC: build_mc,
}
NEW = [p for p in TARGETS if p not in START]


def check_start():
    for p in NEW:
        assert not os.path.exists(p), 'new file already exists: ' + p
    for p, h in START.items():
        got = sha1(open(p, 'rb').read())
        assert got == h, 'changed under me: %s %s' % (p, got)


def main(mode):
    os.makedirs(CAND, exist_ok=True)
    if mode == '--restore':
        for p in START:
            shutil.copyfile(os.path.join(BK, os.path.basename(p)), p)
            print('restored', p, sha1(open(p, 'rb').read()))
        for p in NEW:
            if os.path.exists(p):
                os.remove(p)
                print('removed', p)
        return 0
    if mode == '--verify':
        bad = 0
        for p in TARGETS:
            live = open(p, 'rb').read()
            cand = open(os.path.join(CAND, os.path.basename(p)), 'rb').read()
            ok = live == cand
            bad += not ok
            print('%s live==candidate %s sha256 %s' % ('OK ' if ok else 'BAD', os.path.basename(p), hashlib.sha256(live).hexdigest()[:8]))
            name = os.path.basename(p)
            if name in NOTES:
                back = unseam_whole(name, live) == tv_bytes(name)
                bad += not back
                print('%s reversing the seams gives TV bytes: %s' % ('OK ' if back else 'BAD', name))
        print('problems', bad)
        return 1 if bad else 0
    check_start()
    out = {}
    for p, fn in TARGETS.items():
        data = fn()
        out[p] = data
        open(os.path.join(CAND, os.path.basename(p)), 'wb').write(data)
        print('candidate %s %d bytes %d lines %s' % (os.path.basename(p), len(data), data.count(b'\n'), 'CRLF' if b'\r\n' in data else 'LF'))
    if mode == '--apply':
        check_start()
        for p, data in out.items():
            open(p, 'wb').write(data)
            print('wrote', p, sha1(data))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else '--dry'))
