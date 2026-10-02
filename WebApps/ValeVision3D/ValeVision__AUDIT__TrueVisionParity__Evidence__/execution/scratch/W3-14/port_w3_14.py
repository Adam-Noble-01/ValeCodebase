# W3-14 port: Panel__ScrapbookParametric 1.8.0 and the parametric config, whole from TrueVision at b2aa9151,
# with the listed ValeVision seams. Usage:
#   python port_w3_14.py build    -> writes candidates into scratch/W3-14/cand/
#   python port_w3_14.py land     -> writes the candidates over the live files (LF, as git show gives TV's text)
#   python port_w3_14.py verify   -> live == candidate, and reversing every seam gives TV's bytes exactly
import os, re, sys, json, subprocess

HERE   = os.path.dirname(os.path.abspath(__file__))
VVROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
FEAT   = '02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric'
PANEL  = 'Na__LayoutEditor__Panel__ScrapbookParametric__.js'
CONFIG = 'Na__LayoutEditor__ScrapbookParametric__Config__.json'
TVGIT  = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN    = 'b2aa9151'
PRE    = os.path.join(HERE, 'pre')
CAND   = os.path.join(HERE, 'cand')


def tv(name):
    return subprocess.run(['git', '-C', TVGIT, 'show', f'{PIN}:na-apps/30__TrueVision__CoreAppCode/{FEAT}/{name}'],
                          capture_output=True, check=True).stdout


def once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f'SEAM {label}: expected 1 match, found {n}')
    return text.replace(old, new)


# -----------------------------------------------------------------------------
# The panel
# -----------------------------------------------------------------------------
PANEL_SEAMS = []   # (label, tv_text, vv_text) - applied in order, each exactly once

PANEL_SEAMS.append(('banner',
    '// TRUEVISION3D - LAYOUT EDITOR - PANEL: PARAMETRIC SCRAPBOOK\n',
    '// VALEVISION3D - LAYOUT EDITOR - PANEL: PARAMETRIC SCRAPBOOK\n'))

TV_PORT_NOTE = (
    '// PORT NOTE:\n'
    '// - Authored in   : TrueVision3D first (19-Sep-2026)\n'
    '// - ValeVision    : 1.2.0 ported 20-Sep-2026 as ValeVision3D v2.68.0, verbatim\n'
    '// - Ahead of it   : 1.3.0 (the storey hint), 1.4.0 (where a title\'s bar\n'
    '//                   sits), 1.5.0 (the refit once the text metrics land) and\n'
    '//                   1.6.0 (the cabinet infill) are TrueVision only. ValeVision holds 1.2.0, its floor\n'
    '//                   plans have no storey field and its bar is always below.\n')
VV_PORT_NOTE = (
    '// PORT NOTE:\n'
    '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__Panel__ScrapbookParametric__.js\n'
    '// - Source version: 1.8.0 (TrueVision3D v2.164.0, 29-Sep-2026; read at b2aa9151)\n'
    '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-14}}, the whole file. This app\'s copy\n'
    '//                   before it was 1.0.0 (TrueVision\'s 1.2.0, ValeVision3D v2.68.0, 20-Sep-2026).\n'
    '//                   1.3.0 to 1.8.0 (TrueVision3D v2.87.0 to v2.164.0), with the Project Portal\n'
    '//                   (v2.100.0) and Area Schedule (v2.104.0, v2.148.0) registrations, carry no\n'
    '//                   sign-off from Adam in TrueVision: ported under DR-01 (c) and named for the\n'
    '//                   Parity Scribe. Every type is registered, as in TrueVision; what the library\n'
    '//                   offers is the config\'s: the two Project Portal tiles are offered on no sheet\n'
    '//                   while the Project QR code is switched off (DR-12 (A)), and the Site Plan\n'
    '//                   Legend on site plan sheets only, of which this app has none (DR-08 (B)).\n'
    '// - Parity        : adapted - TrueVision 1.8.0\'s code with the one seam below\n'
    '// - Divergences   :\n'
    '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
    '//   - ProjectName takes the project\'s name from Na__CfApi__GetProjectDisplayName(), this\n'
    '//     app\'s facade (K2 K4), where TrueVision reads window.TrueVision__Pwa__ProjectContext;\n'
    '//     the project data\'s Project__Name after it and the code in front are TrueVision\'s.\n'
    '// - Back-port     : none (an app-neutral types file, DR-42 (5), is offered to TrueVision\n'
    '//                   under DR-36; until then this seam is carried here).\n')
PANEL_SEAMS.append(('port-note', TV_PORT_NOTE, VV_PORT_NOTE))

PANEL_SEAMS.append(('cfapi-import',
    "    import { Na__CfApi__GetLoadedProjectData } from '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';\n",
    "    import { Na__CfApi__GetLoadedProjectData, Na__CfApi__GetProjectDisplayName } from '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';   // <-- ValeVision seam (K2 K4): the project's name for a printed document\n"))

PANEL_SEAMS.append(('project-name',
    "        const context = window.TrueVision__Pwa__ProjectContext;\n"
    "        const active  = (context && typeof context.get === 'function') ? context.get() : null;\n"
    "        const loaded  = Na__CfApi__GetLoadedProjectData() || {};\n"
    "        const named   = String((active && (active.displayName || active.shortName)) || loaded.Project__Name || '').trim();\n",
    "        const loaded  = Na__CfApi__GetLoadedProjectData() || {};\n"
    "        const named   = String(Na__CfApi__GetProjectDisplayName() || loaded.Project__Name || '').trim();   // <-- ValeVision seam (K2 K4): the loaded project's own name, where TrueVision reads its PWA's project context\n"))


def build_panel():
    text = tv(PANEL).decode('utf-8')
    assert '\r' not in text
    for label, old, new in PANEL_SEAMS:
        text = once(text, old, new, 'panel/' + label)
    return text


# -----------------------------------------------------------------------------
# The config
# -----------------------------------------------------------------------------
def vv_line(pre_text, pattern, label):
    found = [l for l in pre_text.split('\n') if re.search(pattern, l)]
    if len(found) != 1:
        raise SystemExit(f'VV LINE {label}: expected 1, found {len(found)}')
    return found[0]


def tv_line(tv_text, pattern, label):
    found = [l for l in tv_text.split('\n') if re.search(pattern, l)]
    if len(found) != 1:
        raise SystemExit(f'TV LINE {label}: expected 1, found {len(found)}')
    return found[0]


PORTED_FROM = (
    "TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/"
    "Na__LayoutEditor__ScrapbookParametric__Config__.json, Meta 1.8.0 (TrueVision3D v2.164.0, 29-Sep-2026; read at HEAD b2aa9151), "
    "taken whole 02-Oct-2026 (parity package W3-14, with the panel 1.8.0; the scale bar, drawing title, viewport link, grips and "
    "noodle blocks came first with W2-37). Every key, number and colour is TrueVision's. This app's own values: "
    "DrawingTitle__PhaseModeNote, Labels__PropsPhaseAuto, Labels__PropsTitleNamed, the Drawing Title + Scale Bar tile's "
    "description and the three title tiles' previews without a phase (one model per project, so no phase is read); "
    "ScaleBar__MenuScaleNote (the four architectural scales since 1:200 landed, DR-17, with 1:500 and 1:1250 for a block or "
    "location plan drawn by hand, as site plans are dormant here, DR-08 (B)); the two Project Portal tiles carry an empty "
    "Element__DrawingTypes, so they are offered on no sheet while the Project QR code is switched off (DR-12 (A); package W5-05 "
    "deletes it with the Vale resolver), and their words are TrueVision's until Adam gives Vale's (DR-43); the Site Plan "
    "Legend's tile preview rows and SiteLegend__HiddenByDefault carry this app's ValeVision__SitePlan__ stems (K2 K3), and "
    "the tile is offered on site plan sheets only, of which this app has none (DR-08 (B)). The notes that cite PS01, PS02, "
    "RB05 and NP03 are TrueVision's measurements, kept as the record of how each number was chosen."
)

MENU_SCALE_NOTE = (
    "The scales the lookup grip's menu and the panel offer. The first four are the app's architectural scales (1:200 joined "
    "them in ValeVision3D v2.71.3; it was here first because a street elevation wants it), and 1:500 and 1:1250 are for a "
    "block or location plan drawn by hand. Any scale in ScaleBar__Standards can be added."
)

QR_OFF_NOTE = ("ValeVision: offered on no sheet while the Project QR code is switched off (DR-12 (A)). Package W5-05 deletes "
               "this key and the empty list when Vale has a resolver.")


def config_seams(tv_text, pre_text):
    seams = []
    # Meta__PortedFrom, after Meta__Author (where W2-37 put it)
    author = tv_line(tv_text, r'"Meta__Author"', 'author')
    seams.append(('ported-from', author + '\n',
                  author + '\n' + '        "Meta__PortedFrom"  : ' + json.dumps(PORTED_FROM, ensure_ascii=False) + ',\n'))
    # VV wording kept: phase
    for key in ('DrawingTitle__PhaseModeNote', 'Labels__PropsPhaseAuto', 'Labels__PropsTitleNamed'):
        seams.append((key, tv_line(tv_text, '"' + key + '"', key), vv_line(pre_text, '"' + key + '"', key)))
    # the Drawing Title + Scale Bar tile's description (first Element__Description under DrawingTitleWithBar)
    tv_desc = tv_line(tv_text, r'"Element__Description".*written by the drawing it is tied to: Existing or Proposed', 'title-desc')
    vv_desc = vv_line(pre_text, r'"Element__Description".*written by the drawing it is tied to: North', 'title-desc')
    seams.append(('title-desc', tv_desc, vv_desc))
    # the three title tiles' previews without ViewPhase
    for facing in ('East', 'South', 'North'):
        seams.append(('preview-' + facing,
                      tv_line(tv_text, r'"Element__PreviewParams".*"ViewFacing" : "' + facing + '"', facing),
                      vv_line(pre_text, r'"Element__PreviewParams".*"ViewFacing" : "' + facing + '"', facing)))
    # the scale note
    tv_note = tv_line(tv_text, r'"ScaleBar__MenuScaleNote"', 'scale-note')
    seams.append(('scale-note', tv_note,
                  tv_note.split(':', 1)[0] + ': ' + json.dumps(MENU_SCALE_NOTE, ensure_ascii=False) + ','))
    # the two Project Portal tiles: offered on no sheet while the QR code is off
    for form in ('compact', 'full'):
        params = tv_line(tv_text, r'"Element__Params"\s*: \{ "Form" : "' + form + r'" \}', 'qr-' + form)
        seams.append(('qr-' + form, params,
                      params + ',\n'
                      '                "Element__DrawingTypes" : [ ],\n'
                      '                "Element__DrawingTypesNote" : ' + json.dumps(QR_OFF_NOTE, ensure_ascii=False)))
    return seams


def build_config():
    tv_text  = tv(CONFIG).decode('utf-8')
    pre_text = open(os.path.join(PRE, CONFIG), 'rb').read().decode('utf-8').replace('\r\n', '\n')
    assert '\r' not in tv_text
    text = tv_text
    for label, old, new in config_seams(tv_text, pre_text):
        text = once(text, old, new, 'config/' + label)
    # the site plan stems (K2 K3): tile preview rows and HiddenByDefault - every one, counted
    n = text.count('TrueVision__SitePlan__')
    if n != 11:
        raise SystemExit(f'SEAM config/stems: expected 11, found {n}')
    text = text.replace('TrueVision__SitePlan__', 'ValeVision__SitePlan__')
    json.loads(text)
    return text


def reverse_config(live):
    tv_text  = tv(CONFIG).decode('utf-8')
    pre_text = open(os.path.join(PRE, CONFIG), 'rb').read().decode('utf-8').replace('\r\n', '\n')
    text = live
    for label, old, new in reversed(config_seams(tv_text, pre_text)):
        text = once(text, new, old, 'reverse config/' + label)
    return text.replace('ValeVision__SitePlan__', 'TrueVision__SitePlan__')


def reverse_panel(live):
    text = live
    for label, old, new in reversed(PANEL_SEAMS):
        text = once(text, new, old, 'reverse panel/' + label)
    return text


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'build'
    panel, config = build_panel(), build_config()
    os.makedirs(CAND, exist_ok=True)
    out = {PANEL: panel, CONFIG: config}
    for name, text in out.items():
        open(os.path.join(CAND, name), 'wb').write(text.encode('utf-8'))
    if mode == 'land':
        for name, text in out.items():
            open(os.path.join(VVROOT, FEAT, name), 'wb').write(text.encode('utf-8'))
        print('landed', list(out))
    if mode in ('land', 'verify'):
        ok = True
        for name, text in out.items():
            live = open(os.path.join(VVROOT, FEAT, name), 'rb').read().decode('utf-8')
            same = live == text
            back = (reverse_panel(live) if name == PANEL else reverse_config(live)) == tv(name).decode('utf-8')
            print(name, 'live==candidate', same, '| seams reversed == TV at pin', back, '| CR present', '\r' in live)
            ok = ok and same and back
        print('VERIFY', 'PASS' if ok else 'FAIL')
        if not ok:
            sys.exit(1)
    else:
        print('built', list(out))


if __name__ == '__main__':
    main()
