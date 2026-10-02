# W4-16 build: port the six Statement Writer standard-section files from TrueVision at the pin,
# re-applying only the named VV seams. Reads TV bytes with git show (LF), writes the VV files whole.
# Usage: python build_w4_16.py [--dry]   (--dry writes into scratch/W4-16/out instead of the live tree)
import json
import subprocess
import sys
from pathlib import Path

PIN = 'b2aa9151'
TV_GIT = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
REL = '02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/09__Standard__Sections/'
VV_ROOT = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D')
SCRATCH = VV_ROOT / 'ValeVision__AUDIT__TrueVisionParity__Evidence__' / 'execution' / 'scratch' / 'W4-16'

VALE_LOGO = '../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png'
NA_LOGO = 'https://www.noble-architecture.com/assets/NA03_-_LIBR_-_NA-Site_-_Core-Brand-Image-Assets/NA03_01_-_PNG_-_NA_Company_Logo_-_w2048_x_h500px.png'


def tv_bytes(name):
    return subprocess.run(['git', '-C', TV_GIT, 'show', PIN + ':' + TV_APP + REL + name],
                          check=True, capture_output=True).stdout


def sub_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit('seam "%s": expected 1 hit, found %d' % (label, count))
    return text.replace(old, new)


TV_PORT_NOTE = (
    '// PORT NOTE:\n'
    '// - Authored in   : TrueVision3D first (29-Sep-2026).\n'
    '// - ValeVision    : not yet ported (ValeVision has no statement tab).\n'
)


def port_note(name, module_version, tv_release, parity, divergences, backport):
    lines = [
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D ' + REL + name,
        '// - Source version: %s (TrueVision3D %s, 29-Sep-2026; read at %s)' % (module_version, tv_release, PIN),
        '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-16}}, inert (the Statement Writer lands',
        '//                   switched off, K1 DR-10; nothing imports it until the Registry lands with W4-12)',
        '// - Parity        : ' + parity,
        '// - Divergences   :',
    ]
    lines += divergences
    lines += backport
    return '\n'.join(lines) + '\n'


BANNER_DIV = '//   - Banner reads ValeVision3D. (No console output in this file.)'


def js_common(text, name, module_version, tv_release, parity, divergences, backport):
    text = sub_once(text, '// TRUEVISION3D - LAYOUT EDITOR - STATEMENT STANDARD SECTION - ',
                    '// VALEVISION3D - LAYOUT EDITOR - STATEMENT STANDARD SECTION - ', 'banner')
    text = sub_once(text, TV_PORT_NOTE, port_note(name, module_version, tv_release, parity, divergences, backport),
                    'port note')
    return text


def build_contents(text):
    name = 'Na__LayoutEditor__Statement__Standard__Contents__.js'
    text = sub_once(text,
                    "by TrueVision\\'s Statement Writer; this line is all an editor without it can show.'",
                    "by ValeVision\\'s Statement Writer; this line is all an editor without it can show.'",
                    'contents fallback')
    return js_common(text, name, '1.0.0', 'v2.162.0', 'adapted', [
        BANNER_DIV,
        '//   - FallbackText names this app\'s Statement Writer (ValeVision\'s), the running app (K2 H4).',
    ], [
        '// - Back-port     : none (the words are also in the Standard config, which carries this app\'s value).',
    ]), name


def build_header(text):
    name = 'Na__LayoutEditor__Statement__Standard__Header__.js'
    text = sub_once(text, "        LogoUrl           : '" + NA_LOGO + "',",
                    "        LogoUrl           : '" + VALE_LOGO + "',", 'header logo')
    text = sub_once(text, "            'Prepared By: Mr Adam Noble of Noble Architecture',",
                    "            'Prepared By: Vale Garden Houses',", 'header prepared by')
    text = sub_once(text, "const Na__LeStmtHead__LOGO_LINE  = /^\\s*<img\\b[^>]*NA_Company_Logo[^>]*>\\s*$/i;",
                    "const Na__LeStmtHead__LOGO_LINE  = /^\\s*<img\\b[^>]*ValeLogo[^>]*>\\s*$/i;", 'header logo line')
    text = sub_once(text, '\'" alt="Noble Architecture">\'', '\'" alt="Vale Garden Houses">\'', 'header alt')
    return js_common(text, name, '1.0.0', 'v2.162.0', 'adapted', [
        BANNER_DIV,
        '//   - Vale defaults (DR-10, DR-43; people and company names only, the UK planning field',
        '//     names kept): LogoUrl is Vale\'s logo, the title block\'s own asset',
        '//     (' + VALE_LOGO + ',',
        '//     relative to the app page); NewFields\' Prepared By reads Vale Garden Houses; the logo\'s',
        '//     alt text reads Vale Garden Houses.',
        '//   - LOGO_LINE recognises the Vale logo\'s file name (ValeLogo) in place of TrueVision\'s',
        '//     company-logo file name, so a header Unwrap writes back is taken over again by Adopt.',
    ], [
        '// - Back-port     : the logo\'s alt text and the logo-line pattern as Standard config values,',
        '//                   so this file ports verbatim (S07b-F51, TrueVision preparation; WT lane, DR-36).',
    ]), name


def build_footer(text):
    name = 'Na__LayoutEditor__Statement__Standard__Footer__.js'
    text = sub_once(text, "            'Copyright: \u00a9 {Year} Noble Architecture'",
                    "            'Copyright: \u00a9 {Year} Vale Garden Houses'", 'footer copyright')
    return js_common(text, name, '1.0.0', 'v2.167.0', 'adapted', [
        BANNER_DIV,
        '//   - Vale default (DR-10, DR-43): NewFields\' copyright line names Vale Garden Houses.',
    ], [
        '// - Back-port     : none (the line is also in the Standard config, which carries this app\'s value).',
    ]), name


def build_verbatim(text, name, tv_release):
    return js_common(text, name, '1.0.0', tv_release, 'verbatim', [BANNER_DIV], [
        '// - Back-port     : none.',
    ]), name


def build_config(text):
    # Vale words. Notes and descriptions keep TrueVision's text except where it names the hub section,
    # TrueVision as the running app, Noble Architecture, or an NA document code with a phase (T01).
    text = sub_once(text,
                    'apart from the project they name (the TrueVision 3D Project Hub), the headings they are drawn from',
                    'apart from the headings they are drawn from', 'desc hub')
    text = sub_once(text,
                    '3. the table of contents, 4. the TrueVision section, 5. the introduction.',
                    '3. the table of contents, 4. the project hub section (not offered in ValeVision: see StatementStandard__EnabledSections), 5. the introduction.',
                    'order note hub')
    text = sub_once(text,
                    'under a divider of its own and none after it.",\n\n    "StatementStandard__DocumentHeader__Config": {',
                    'under a divider of its own and none after it.",\n\n'
                    '    "StatementStandard__EnabledSections": [ "DocumentHeader", "Contents", "FinishesComparison", "DrawingSchedule", "DocumentFooter" ],\n'
                    '    "StatementStandard__EnabledSectionsNote": "ValeVision only (K1 DR-43 default): the standard sections this app offers, by Id. A section not named here is never listed in the Standard Sections menu, placed or drawn. The project hub section is left out until Vale words, a Vale project link and a Vale QR resolver exist; its module stays at its own path so the registry links, and it has no config block here. Read by the registry\'s DEFINITIONS filter (W4-12; a back-port offer, S07b-F51).",\n\n'
                    '    "StatementStandard__DocumentHeader__Config": {',
                    'enabled sections')
    text = sub_once(text, '"DocumentHeader__LogoUrl": "' + NA_LOGO + '",',
                    '"DocumentHeader__LogoUrl": "' + VALE_LOGO + '",', 'config logo')
    text = sub_once(text, '"Prepared By: Mr Adam Noble of Noble Architecture",',
                    '"Prepared By: Vale Garden Houses",', 'config prepared by')
    text = sub_once(text,
                    'and any other standard section that names a line for itself (the TrueVision 3D Project Hub). Two columns',
                    'and any other standard section that names a line for itself. Two columns', 'contents desc hub')
    text = sub_once(text, "by TrueVision's Statement Writer; this line is all an editor without it can show.\"\n    },\n\n    \"StatementStandard__TrueVisionHub__Config\"",
                    "by ValeVision's Statement Writer; this line is all an editor without it can show.\"\n    },\n\n    \"StatementStandard__TrueVisionHub__Config\"",
                    'contents fallback')
    # The hub's config block: excluded (DR-43 default) - removed whole.
    start = text.index('    "StatementStandard__TrueVisionHub__Config": {')
    end = text.index('    "StatementStandard__DrawingSchedule__Config": {')
    text = text[:start] + text[end:]
    text = sub_once(text, 'code (the document code, RB05_T01_D01)', 'code (the document code, 3047_D01)', 'columns note code')
    text = sub_once(text, 'status, phase (T01) or drawingNo (D01)', 'status, phase (the design phase, where the project\'s codes carry one) or drawingNo (D01)', 'columns note phase')
    text = sub_once(text, 'its document number (RB05_SPEC, or whatever', 'its document number (3047_SPEC, or whatever', 'spec note')
    text = sub_once(text, '"Copyright: \u00a9 {Year} Noble Architecture"', '"Copyright: \u00a9 {Year} Vale Garden Houses"', 'config copyright')
    return text, 'Na__LayoutEditor__Statement__Standard__Config__.json'


def main():
    dry = '--dry' in sys.argv
    out_root = (SCRATCH / 'out') if dry else VV_ROOT
    out_dir = out_root / REL
    built = {}
    for name, fn in [
        ('Na__LayoutEditor__Statement__Standard__Contents__.js', build_contents),
        ('Na__LayoutEditor__Statement__Standard__Header__.js', build_header),
        ('Na__LayoutEditor__Statement__Standard__Footer__.js', build_footer),
        ('Na__LayoutEditor__Statement__Standard__DrawingSchedule__.js', lambda t: build_verbatim(t, 'Na__LayoutEditor__Statement__Standard__DrawingSchedule__.js', 'v2.167.0')),
        ('Na__LayoutEditor__Statement__Standard__Finishes__.js', lambda t: build_verbatim(t, 'Na__LayoutEditor__Statement__Standard__Finishes__.js', 'v2.168.0')),
        ('Na__LayoutEditor__Statement__Standard__Config__.json', build_config),
    ]:
        raw = tv_bytes(name)
        if b'\r' in raw:
            raise SystemExit(name + ': TV bytes carry CR - unexpected')
        text, out_name = fn(raw.decode('utf-8'))
        assert out_name == name
        built[name] = text
    json.loads(built['Na__LayoutEditor__Statement__Standard__Config__.json'])
    out_dir.mkdir(parents=True, exist_ok=not dry or True)
    for name, text in built.items():
        target = out_dir / name
        if not dry and target.exists() and '--replace' not in sys.argv:
            raise SystemExit('refusing to overwrite existing ' + str(target))
        target.write_bytes(text.encode('utf-8'))
        print('wrote', target, len(text.encode('utf-8')), 'bytes')


if __name__ == '__main__':
    main()
