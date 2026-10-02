# -*- coding: utf-8 -*-
# W3-10 - Floor Areas switched on: the ModeController floor-area hunks (TV 1.32.0 at b2aa9151, lines 292-296, 553,
# 1003, 1028, 1047-1059, 1084-1089, 1193, 1208) and the AppConfig AccordionSections / FocusNote clause.
#
# Reads bytes, works on the file's own line ending (ModeController CRLF, AppConfig LF), aborts unless the start hash
# matches W3-09's recorded "after" and every anchor matches exactly once. Every TV line is taken from TV's file at
# the pin (scratch tv/ copy, git show output) and checked to be present verbatim.
#
# Usage: python -B build_w3_10.py --dry | --apply | --restore

import hashlib
import os
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
LE = os.path.join(VV, '02__Src__AppModules', '51__System__LayoutEditor')
MC = os.path.join(LE, '05__Core__ModeController', 'Na__LayoutEditor__ModeController__.js')
CFG = os.path.join(LE, '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json')
TV_MC = os.path.join(HERE, 'tv', 'Na__LayoutEditor__ModeController__.js')
TV_CFG = os.path.join(HERE, 'tv', 'Na__LayoutEditor__AppConfig__.json')
BACKUP = os.path.join(HERE, 'backup')

MC_START = '32f31692cac75442f02717a33e6a590ee6c589ff'      # W3-09's recorded "after"
CFG_START = '5edc560a565b2ddf30949367dd164c99ac03daea'     # W3-09's recorded "after"

TV = open(TV_MC, 'r', encoding='utf-8', newline='').read().split('\n')


def tvl(no):
    """TV line (1-based) at the pin."""
    return TV[no - 1]


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def once(text, old, new, what):
    n = text.count(old)
    if n != 1:
        raise SystemExit('ANCHOR FAILED (%s): expected 1, found %d' % (what, n))
    return text.replace(old, new)


# -----------------------------------------------------------------------------
# TrueVision's lines, by number, asserted against their expected content
# -----------------------------------------------------------------------------
TV_IMPORT_PANEL = tvl(292)
TV_IMPORT_AREA = tvl(293)
TV_IMPORT_TABLE = tvl(294)
TV_DELEGATE = tvl(296)
TV_REGISTER = tvl(553)
TV_REASON = tvl(1003)
TV_PANELFOR = tvl(1028)
TV_SECTION = TV[1050:1059]            # 1051-1059: the room paragraph, the picture paragraph and the shape rule
TV_ALLAREAS = TV[1083:1089]           # 1084-1089
TV_ATTACH = tvl(1208)
assert 'Na__LePanelArea__Register' in TV_IMPORT_PANEL
assert 'Na__LeArea__Ready, Na__LeArea__Is' in TV_IMPORT_AREA
assert 'Na__LeAreaTable__Attach' in TV_IMPORT_TABLE
assert TV_DELEGATE.strip() == '// @delegate: ../59__Feature__FloorAreas/'
assert TV_REGISTER.strip().startswith('Na__LePanelArea__Register();')
assert TV_REASON.strip().startswith("'areas',")
assert "return 'floor-areas';" in TV_PANELFOR and "'areas'" in TV_PANELFOR
assert TV_SECTION[0].strip() == '// A MEASURED ROOM IS A VECTOR, AND ITS PANEL IS NOT THE VECTORS ONE.'
assert TV_SECTION[-1].strip().startswith("if (kind === 'shape')      return Na__LeMode__AllAreas(items)")
assert TV_ALLAREAS[0].strip() == 'function Na__LeMode__AllAreas(items) {' and TV_ALLAREAS[-1] == '    }'
assert TV_ATTACH.strip().startswith('Na__LeAreaTable__Attach();')
assert 'Na__LeArea__Ready()' in tvl(1193)


def build_mc(text, nl):
    J = nl.join
    # 1. imports: the three Floor Areas imports straight before the Sheet Images core's (TV :292-294 precede :295),
    #    TV's @delegate line straight after it (TV :296), before the hatches.
    img = "    import { Na__LeImg__Ready, Na__LeImg__Initialize, Na__LeImg__Is, Na__LeImg__AttachInput, Na__LeImg__DetachInput } from '../54__Feature__SheetImages/Na__LayoutEditor__SheetImages__.js';"
    assert img == tvl(295)
    text = once(text, img + nl, J([TV_IMPORT_PANEL, TV_IMPORT_AREA, TV_IMPORT_TABLE, img, TV_DELEGATE]) + nl, 'imports')
    # 2. register: last in the right column, straight after Patterns (TV :552-553)
    pat = "        Na__LePanelPatterns__Register();                                       // <-- Patterns: the hatch library and each site plan layer's hatch"
    assert pat == tvl(552)
    text = once(text, pat + nl, pat + nl + TV_REGISTER + nl, 'register')
    # 3. markup reasons (TV :1002-1004)
    grp = "        'group',      'groups',"
    mrg = "        'margin'                                                                // <-- The notes margin is drawn with the markup"
    assert grp == tvl(1002) and mrg == tvl(1004)
    text = once(text, grp + nl + mrg + nl, J([grp, TV_REASON, mrg]) + nl, 'markup reasons')
    # 4. PanelFor (TV :1027-1028)
    pm = "        if (reason === 'margin')                                 return 'margin';"
    assert pm == tvl(1027)
    text = once(text, pm + nl, pm + nl + TV_PANELFOR + nl, 'PanelFor')
    # 5. SectionForKind: the room paragraph ahead of the picture paragraph, and TV's shape rule (TV :1050-1059)
    old_section = J([
        "        if (kind === 'dimension')  return 'dimensions';",
        "        // A PICTURE IS A VECTOR TOO, and its panel is Images: its file, the",
        "        // folder its drawing's number files it in, and its print resolution",
        "        // are what is wanted the moment one is selected.",
        "        if (kind === 'shape')      return Na__LeMode__AllImages(items) ? 'images' : 'shapes';",
    ]) + nl
    assert old_section.split(nl)[0] == tvl(1050)
    assert old_section.split(nl)[1:4] == TV[1055:1058]
    text = once(text, old_section, J([tvl(1050)] + TV_SECTION) + nl, 'SectionForKind')
    # 6. AllAreas after AllImages (TV :1078-1089)
    all_images_tail = J([
        "        return shapes.every((item) => Na__LeImg__Is(Na__LeModel__GetShapeById(sheet, item.id)));",
        "    }",
    ]) + nl
    assert all_images_tail.split(nl)[:2] == TV[1081:1083]
    text = once(text, all_images_tail, all_images_tail + J(TV_ALLAREAS) + nl, 'AllAreas')
    # 7. ready chain: Na__LeArea__Ready() after the site plan composites, as TV :1193; this app's count comment
    ready_old = "Na__LeSpComp__Ready(), Na__LeDocKeys__Ready(), Na__LeImg__Ready(), Na__DrawCfg__Load() ]).then(() => {   // <-- None of the ten rejects, so a missing file cannot hold the editor back"
    ready_new = "Na__LeSpComp__Ready(), Na__LeArea__Ready(), Na__LeDocKeys__Ready(), Na__LeImg__Ready(), Na__DrawCfg__Load() ]).then(() => {   // <-- None of the eleven rejects, so a missing file cannot hold the editor back"
    assert "Na__LeSpComp__Ready(), Na__LeArea__Ready(), Na__LeDocKeys__Ready(), Na__LeImg__Ready(), Na__DrawCfg__Load() ]).then(() => {" in tvl(1193)
    text = once(text, ready_old, ready_new, 'ready chain')
    # 8. the schedules attach after the viewport names (TV :1207-1208)
    vid = "            Na__LeViewId__Initialize();                                      // <-- Unnamed elevation viewports are named from their model and the project's north"
    assert vid == tvl(1207)
    text = once(text, vid + nl, vid + nl + TV_ATTACH + nl, 'table attach')
    # 9. header: PORT NOTE
    text = once(text, '1.18.11 and 1.18.12 entries name', '1.18.11, 1.18.12 and 1.18.13 entries name', 'source list')
    text = once(text, '//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-09}} (sheet images)' + nl,
                '//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-09}} (sheet images);' + nl +
                '//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-10}} (floor areas)' + nl, 'ported on')
    text = once(text, J([
        "//   - Not yet taken, each arriving with its feature: the register and statements pages,",
        "//     floor areas, note regions, the published viewer's guards,",
        "//     and SectionForKind's floor area rule (its picture rule is TrueVision's, without",
        "//     the floor area half and that half's paragraph of the comment over it).",
    ]) + nl, J([
        "//   - Not yet taken, each arriving with its feature: the register and statements pages,",
        "//     note regions and the published viewer's guards.",
    ]) + nl, 'not yet taken')
    # 10. DEVELOPMENT LOG
    log = [
        "// 02-Oct-2026 - Version 1.18.13 (floor areas, {{VVREL:W3-10}})",
        "// - FLOOR AREAS ARE SWITCHED ON (59__Feature__FloorAreas): measured rooms",
        "//   and the schedules that report them. Na__LeArea__Ready joins the ready",
        "//   Promise.all straight after the site plan composites, TrueVision's",
        "//   place, so the Floor Areas config is read before the editor opens, and",
        "//   Na__LeAreaTable__Attach runs after the viewport names: an area",
        "//   schedule follows the rooms it reports inside the same undo step. The",
        "//   Floor Areas panel registers straight after Patterns, last in the",
        "//   right column (its registration links its own stylesheet and attaches",
        "//   the label grip); an 'areas' change redraws the markup and refreshes",
        "//   that panel; SectionForKind opens Floor Areas for a selection of rooms,",
        "//   ahead of the picture rule. \"floor-areas\" joins",
        "//   LayoutEditor__Panels__AccordionSections after \"leaders\". From",
        "//   TrueVision3D 1.21.0 (v2.106.0, which records the v2.104.0 wiring):",
        "//   TrueVision's import lines, calls and comments at this app's sites. No",
        "//   sign-off by Adam is recorded in TrueVision for v2.104.0, v2.106.0,",
        "//   v2.125.0, v2.148.0 or v2.150.0, and TrueVision's floor area plan keeps",
        "//   its ValeVision phase open until he gives one. The toolbar's Floor Area",
        "//   button comes with the toolbar's own port; the A key already arms the",
        "//   tool.",
        "//",
    ]
    anchor = '// 02-Oct-2026 - Version 1.18.12 (sheet images, {{VVREL:W3-09}})'
    text = once(text, anchor + nl, J(log) + nl + anchor + nl, 'log')
    return text


def build_cfg(text):
    tvcfg = open(TV_CFG, 'r', encoding='utf-8').read()
    old_acc = '"LayoutEditor__Panels__AccordionSections": [ "text", "dimensions", "shapes", "images", "leaders", "patterns" ],'
    new_acc = '"LayoutEditor__Panels__AccordionSections": [ "text", "dimensions", "shapes", "images", "leaders", "floor-areas", "patterns" ],'
    assert new_acc in tvcfg
    text = once(text, old_acc, new_acc, 'AccordionSections')
    old_note = 'so what is on show is always what is being edited - a viewport folds the whole group, its own section not being in it.'
    new_note = 'so what is on show is always what is being edited - a room opens Floor Areas, and a viewport folds the whole group, its own section not being in it.'
    assert 'a room opens Floor Areas, a site plan viewport opens Patterns' in tvcfg
    text = once(text, old_note, new_note, 'FocusNote')
    return text


def main(argv):
    mode = argv[0] if argv else '--dry'
    if mode == '--restore':
        for name, path in (('Na__LayoutEditor__ModeController__.js', MC), ('Na__LayoutEditor__AppConfig__.json', CFG)):
            data = open(os.path.join(BACKUP, name), 'rb').read()
            open(path, 'wb').write(data)
            print('restored %s sha1 %s' % (name, sha1(data)[:8]))
        return 0
    mc_b = open(MC, 'rb').read()
    cfg_b = open(CFG, 'rb').read()
    if sha1(mc_b) != MC_START:
        raise SystemExit('ModeController changed under me: ' + sha1(mc_b))
    if sha1(cfg_b) != CFG_START:
        raise SystemExit('AppConfig changed under me: ' + sha1(cfg_b))
    mc = mc_b.decode('utf-8')
    nl = '\r\n' if '\r\n' in mc else '\n'
    assert mc.count('\r\n') == mc.count('\n'), 'mixed line endings in ModeController'
    mc_new = build_mc(mc, nl)
    assert mc_new.count('\r\n') == mc_new.count('\n')
    cfg = cfg_b.decode('utf-8')
    assert '\r' not in cfg
    cfg_new = build_cfg(cfg)
    import json
    json.loads(cfg_new)
    mc_out = mc_new.encode('utf-8')
    cfg_out = cfg_new.encode('utf-8')
    print('ModeController %s -> %s (%d -> %d lines, %s)' % (sha1(mc_b)[:8], sha1(mc_out)[:8], mc.count('\n'), mc_new.count('\n'), 'CRLF' if nl == '\r\n' else 'LF'))
    print('AppConfig      %s -> %s' % (sha1(cfg_b)[:8], sha1(cfg_out)[:8]))
    if mode == '--dry':
        open(os.path.join(HERE, 'candidate__ModeController.js'), 'wb').write(mc_out)
        open(os.path.join(HERE, 'candidate__AppConfig.json'), 'wb').write(cfg_out)
        return 0
    if mode == '--apply':
        open(MC, 'wb').write(mc_out)
        open(CFG, 'wb').write(cfg_out)
        print('applied')
        return 0
    raise SystemExit('unknown mode')


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
