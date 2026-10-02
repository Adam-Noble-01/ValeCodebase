"""W2-24: Grips 1.12.0 whole + its Paper CSS rules + Na__Test__PaintedOnThePoint__.

Usage: python port_w2_24.py --stage    (build everything in memory, write to scratch/W2-24/staged/, print checks)
       python port_w2_24.py --apply    (back up live files to scratch/W2-24/before/, then write the three targets)
       python port_w2_24.py --restore  (put the backed-up bytes back; delete the new test)
       python port_w2_24.py --check    (rebuild in memory and compare with the landed bytes)
"""
import os, sys, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TV = os.path.join(HERE, 'tv')
LE = os.path.join('02__Src__AppModules', '51__System__LayoutEditor')
GRIPS = os.path.join(LE, '30__System__SheetTools', 'Na__LayoutEditor__Grips__.js')
PAPER = os.path.join(LE, '10__Core__SheetSurface', 'Na__LayoutEditor__Styles__Main__Paper__.css')
TEST = os.path.join('80__Testing__PrototypeEnvironment', 'Na__Test__PaintedOnThePoint__.test.mjs')


def rd(base, rel):
    with open(os.path.join(base, rel), 'rb') as fh:
        return fh.read()


def once(text, old, new, what):
    n = text.count(old)
    assert n == 1, '%s: expected 1 match, found %d' % (what, n)
    return text.replace(old, new)


# -----------------------------------------------------------------------------
# Grips: TV's file whole (LF, as git show returns it); banner, PORT NOTE, two console prefixes
# -----------------------------------------------------------------------------
TV_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__Grips__.js\n"
    "// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   : Console prefix, header and folder numbers only.\n"
    "// - Back-port     : n/a (this IS the back-port)\n"
)
VV_NOTE = (
    "// PORT NOTE:\n"
    "// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.8, port Phase 5); TrueVision3D took it\n"
    "//                   for its v2.21.0 re-alignment and grew it to 1.12.0, while this app's copy stayed at\n"
    "//                   1.8.0 (20-Sep-2026, = TrueVision's 1.8.0; its log carried two 1.7.0 entries, 15-Sep\n"
    "//                   and 17-Sep); since ported back whole from TrueVision3D 1.12.0 (HEAD b2aa9151)\n"
    "// - Source version: 1.12.0 (TrueVision3D v2.151.0, 22-Sep-2026, commit a2e0a836 - named in no TrueVision\n"
    "//                   devlog entry; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-24}}, with the band, box, grip-state and\n"
    "//                   insert-diamond rules of Na__LayoutEditor__Styles__Main__Paper__.css in the same change\n"
    "//                   (the diamond is turned here, inline; the sheet no longer rotates it).\n"
    "// - Parity        : verbatim - TrueVision's file; the banner, the two console prefixes and this note are\n"
    "//                   the only differences. 1.9.0 (v2.116.0), 1.10.0 (v2.129.0) and 1.11.0 (v2.137.0) are\n"
    "//                   \"NOT tried by Adam\" in TrueVision, and 1.12.0 has no devlog entry: ported under\n"
    "//                   DR-01 (c), each named for the Parity Scribe.\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D; console prefix [ValeVision3D LayoutEditor] (two lines).\n"
    "// - Back-port     : none.\n"
)


def build_grips():
    t = rd(TV, GRIPS).decode('utf-8')
    assert '\r' not in t
    t = once(t, '// TRUEVISION3D - LAYOUT EDITOR - GRIPS\n', '// VALEVISION3D - LAYOUT EDITOR - GRIPS\n', 'grips banner')
    t = once(t, TV_NOTE, VV_NOTE, 'grips PORT NOTE')
    t = once(t, "console.warn('[TrueVision3D LayoutEditor] A shape grip provider failed.'",
             "console.warn('[ValeVision3D LayoutEditor] A shape grip provider failed.'", 'console 1')
    t = once(t, "console.warn('[TrueVision3D LayoutEditor] A group grip provider failed.'",
             "console.warn('[ValeVision3D LayoutEditor] A group grip provider failed.'", 'console 2')
    for bad in ('TRUEVISION3D', '[TrueVision3D', 'window.TrueVision__', 'NaProjectPortal', 'na-truevision-api', '/r2/'):
        assert bad not in t, 'grips leaks ' + bad
    return t.encode('utf-8')


# -----------------------------------------------------------------------------
# Paper CSS: three spans taken from TV's sheet by anchors present in both; header PORT NOTE line
# -----------------------------------------------------------------------------
def span(text, start_anchor, end_anchor, what):
    assert text.count(start_anchor) == 1, what + ' start x' + str(text.count(start_anchor))
    s = text.index(start_anchor)
    e = text.index(end_anchor, s)
    assert text.count(end_anchor) == 1, what + ' end x' + str(text.count(end_anchor))
    return s, e + len(end_anchor)


BAND_START = '.na-le-rubber-band {\n'
BOX_END_RULE = '.na-le-rubber-box {\n'
STEM_RULE = ('.na-le-grip--stem {\n'
             '    height                             : 0;\n')
INSERT_RULE = '.na-le-grip--insert {\n'

OLD_REGIONS_TAIL = (" *                 rule (the viewports box, the chrome and the markup at once) went with them. The grip\n"
                    " *                 rules stay this app's until W2-24 takes TrueVision's.\n")
NEW_REGIONS_TAIL = (" *                 rule (the viewports box, the chrome and the markup at once) went with them.\n")
OSNAP_LAST = (" *                 Progress and the Hover Tooltip\", its title and note verbatim (read at b2aa9151).\n")
GRIPS_LINE = (" * - Grips       : 02-Oct-2026 for ValeVision3D {{VVREL:W2-24}}: the rubber band and the rubber box (2 px,\n"
              " *                 the box laid out by Grips PlaceBox), the point grips' states (.na-le-grip--free, --bound,\n"
              " *                 --online, and picked with its shadow and, on the drawing, its green edge) and the insert\n"
              " *                 diamond with no rotate (Grips Place turns it inline) are TrueVision3D's, verbatim, landed\n"
              " *                 with Grips 1.12.0 in the same change (read at b2aa9151: v2.129.0, v2.137.0, a2e0a836).\n")


def rule_end(text, rule_start):
    s = text.index(rule_start)
    return text.index('}\n', s) + 2


def build_paper():
    raw = rd(VV, PAPER)
    crlf = b'\r\n' in raw
    if crlf:
        assert raw.count(b'\r\n') == raw.count(b'\n'), 'mixed line endings in Paper CSS'
    v = raw.decode('utf-8').replace('\r\n', '\n')
    t = rd(TV, PAPER).decode('utf-8')
    assert '\r' not in t

    # 1. band .. box: from ".na-le-rubber-band {" to the end of the ".na-le-rubber-box {" rule
    def band_box(text):
        s = text.index(BAND_START)
        assert text.count(BAND_START) == 1
        return s, rule_end(text, BOX_END_RULE)
    vs, ve = band_box(v)
    ts, te = band_box(t)
    v = v[:vs] + t[ts:te] + v[ve:]

    # 2. after the stem rule .. end of the insert rule
    def grips(text):
        assert text.count(STEM_RULE) == 1 and text.count(INSERT_RULE) == 1
        return rule_end(text, STEM_RULE), rule_end(text, INSERT_RULE)
    vs, ve = grips(v)
    ts, te = grips(t)
    assert v[vs - 300:vs] == t[ts - 300:ts], 'text before the grip span differs'
    v = v[:vs] + t[ts:te] + v[ve:]

    # 3. header PORT NOTE
    v = once(v, OLD_REGIONS_TAIL, NEW_REGIONS_TAIL, 'regions tail')
    v = once(v, OSNAP_LAST, OSNAP_LAST + GRIPS_LINE, 'osnap last line')

    # self-checks on the result
    for sel, n in (('.na-le-rubber-band {', 1), ('.na-le-rubber-box {', 1), ('.na-le-grip--free,', 1), ('.na-le-grip--bound {', 1),
                   ('.na-le-grip--online {', 2), ('.na-le-grip--picked {', 1), ('.na-le-grip--picked.na-le-grip--bound,', 1),
                   ('.na-le-grip--insert {', 1)):
        assert v.count('\n' + sel + '\n') == n, sel
    ins = v[v.index(INSERT_RULE):rule_end(v, INSERT_RULE)]
    assert 'rotate' not in ins
    assert 'border-top                         : 2px dashed #336699;' in v
    assert 'border                             : 2px dashed #336699;' in v
    assert 'W2-24 takes' not in v
    out = v.replace('\n', '\r\n') if crlf else v
    return out.encode('utf-8'), crlf


# -----------------------------------------------------------------------------
# The test: TV's file whole; banner, title line, PORT NOTE before the DEVELOPMENT LOG
# -----------------------------------------------------------------------------
TEST_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__PaintedOnThePoint__.test.mjs\n"
    "// - Source version: 1.0.0 (TrueVision3D v2.137.0, 21-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-24}}, with Grips 1.12.0. It runs\n"
    "//                   this app's shipped Marker (with State and Glyphs, through\n"
    "//                   Na__TestEnv__ObjectSnapBundle__), the grips' Place, PlaceBand and\n"
    "//                   ShowBand cut from the shipped Grips file, and reads the shipped sheet\n"
    "//                   surface and both stylesheets, as TrueVision's does.\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   :\n"
    "//   - Banner and the title line read ValeVision3D.\n"
    "// - Back-port     : none.\n"
    "//\n"
    "// -----------------------------------------------------------------------------\n"
    "//\n"
)


def build_test():
    t = rd(TV, TEST).decode('utf-8')
    assert '\r' not in t
    t = once(t, '// TRUEVISION3D - TEST - PAINTED ON THE POINT', '// VALEVISION3D - TEST - PAINTED ON THE POINT', 'test banner')
    t = once(t, "console.log('TrueVision3D - painted on the point');", "console.log('ValeVision3D - painted on the point');", 'test title')
    t = once(t, "// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n",
             "// -----------------------------------------------------------------------------\n//\n" + TEST_NOTE + "// DEVELOPMENT LOG:\n", 'test note')
    assert 'PORT NOTE' in t and t.count('PORT NOTE:') == 1
    for bad in ('TRUEVISION3D', '[TrueVision3D', "'TrueVision3D -", 'NaProjectPortal'):
        assert bad not in t, 'test leaks ' + bad
    return t.encode('utf-8')


def build_all():
    paper, crlf = build_paper()
    return {GRIPS: build_grips(), PAPER: paper, TEST: build_test()}, crlf


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--stage'
    before = os.path.join(HERE, 'before')
    if mode == '--restore':
        for rel in (GRIPS, PAPER):
            shutil.copyfile(os.path.join(before, rel), os.path.join(VV, rel))
            print('restored', rel)
        p = os.path.join(VV, TEST)
        if os.path.exists(p):
            os.remove(p)
            print('removed', TEST)
        return
    built, crlf = build_all()
    print('Paper CSS CRLF kept:', crlf)
    if mode == '--stage':
        for rel, data in built.items():
            dst = os.path.join(HERE, 'staged', rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            open(dst, 'wb').write(data)
            print('staged', len(data), rel)
    elif mode == '--apply':
        assert not os.path.exists(os.path.join(VV, TEST)), 'test already exists'
        for rel in (GRIPS, PAPER):
            dst = os.path.join(before, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if not os.path.exists(dst):
                shutil.copyfile(os.path.join(VV, rel), dst)
        for rel, data in built.items():
            mode_ = 'xb' if rel == TEST else 'wb'
            with open(os.path.join(VV, rel), mode_) as fh:
                fh.write(data)
            print('wrote', len(data), rel)
    elif mode == '--check':
        ok = True
        for rel, data in built.items():
            live = rd(VV, rel)
            # after --apply the Paper input is already ported, so --check compares against the staged copy
            ref = open(os.path.join(HERE, 'staged', rel), 'rb').read()
            same = live == ref
            ok &= same
            print('SAME' if same else 'DIFF', rel)
        print('CHECK PASS' if ok else 'CHECK FAIL')


if __name__ == '__main__':
    main()
