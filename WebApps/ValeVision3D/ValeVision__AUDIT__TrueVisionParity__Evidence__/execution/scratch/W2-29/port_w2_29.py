"""W2-29 port script: Patterns panel, its stylesheet (OC-07), the ModeController hatch hunks and AccordionSections.

Modes:
  --stage <dir>   build every output into <dir> (mirrors the VV app-relative paths); touches nothing live
  --write         hash-guarded write of the live files (new files must not exist; edited files must match the
                  hashes recorded before the change)
  --check         rebuild from TrueVision at the pin + the recorded pre-change bytes and compare with the live files
  --restore       put back the pre-change bytes of the edited files (saved by --write) and delete the new files

TrueVision is read only at the pin with `git show` (bytes). Existing VV files are patched as bytes with their own
line endings preserved. New files are TrueVision's LF text plus the seams.
"""
import hashlib
import os
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
BACKUP = os.path.join(HERE, 'backup')

LE = '02__Src__AppModules/51__System__LayoutEditor/'
PANEL = LE + '36__System__HatchPatternTools/Na__LayoutEditor__Panel__Patterns__.js'
CSS = LE + '36__System__HatchPatternTools/Na__LayoutEditor__Styles__Patterns__.css'
MODE = LE + '05__Core__ModeController/Na__LayoutEditor__ModeController__.js'
CFG = LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json'

PRE_HASH = {
    MODE: '37cebce474b6b4f3db4895bb6911d3497f5e5e5e3952a93ecdea6091b897c72f',
    CFG: '44aa6f1fd66e464c777aa9095ffc6b355ebbb49a54cdf4bbe4107ec989c09097',
}


def tv(rel):
    return subprocess.run(['git', '-C', NAWEB, 'show', f'{PIN}:{TV_APP}{rel}'], check=True, capture_output=True).stdout


def sha(b):
    return hashlib.sha256(b).hexdigest()


def replace_once(text, old, new, what):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f'ANCHOR FAIL ({what}): expected 1 match, found {n}')
    return text.replace(old, new)


# -----------------------------------------------------------------------------
# The panel: TrueVision's file, banner swapped, a PORT NOTE before its DEVELOPMENT LOG
# -----------------------------------------------------------------------------
PANEL_NOTE = """// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/36__System__HatchPatternTools/Na__LayoutEditor__Panel__Patterns__.js
// - Source version: 1.1.0 (TrueVision3D v2.126.0, 21-Sep-2026; read at b2aa9151) - with the site plan store's
//                   import path TrueVision3D v2.155.0 gave it (23-Sep-2026, 21__System__SitePlanData)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-29}}
// - Parity        : verbatim, with its site plan half dormant (DR-08 (B), DR-19): no Vale author can make a
//                   site plan viewport while LayoutEditor__Sheet__SitePlanDrawingsEnabled is false, so the
//                   layer rows never show and the section is the hatch library with its intro note - what
//                   TrueVision shows with no site plan viewport selected. Taken whole on purpose, overriding
//                   TrueVision's composites plan section 3.5 ('a surgical merge of the non-site-plan parts
//                   only'), so it is never shipped adapted and re-ported verbatim later.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
"""


def build_panel():
    src = tv('02__Src__AppModules/51__System__LayoutEditor/36__System__HatchPatternTools/Na__LayoutEditor__Panel__Patterns__.js')
    if b'\r\n' in src:
        raise SystemExit('TV panel is not LF as git show returns it')
    text = src.decode('utf-8')
    text = replace_once(text, '// TRUEVISION3D - LAYOUT EDITOR - PANEL: PATTERNS\n',
                        '// VALEVISION3D - LAYOUT EDITOR - PANEL: PATTERNS\n', 'panel banner')
    text = replace_once(text, '// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n',
                        '// -----------------------------------------------------------------------------\n//\n' + PANEL_NOTE + '// DEVELOPMENT LOG:\n',
                        'panel PORT NOTE anchor')
    return text.encode('utf-8')


# -----------------------------------------------------------------------------
# The stylesheet (OC-07): TrueVision's sheet, banner swapped, a PORT NOTE inside its one header block
# -----------------------------------------------------------------------------
CSS_NOTE = """
   PORT NOTE:
   - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/36__System__HatchPatternTools/Na__LayoutEditor__Styles__Patterns__.css
   - Source version: none of its own - the sheet carries no version or log; taken as
                     TrueVision3D created it with the Patterns panel (20-Sep-2026, commit
                     62dade1c, the site plan composites work TrueVision's devlog first names in
                     v2.89.0) and left it to the pin (read at b2aa9151, no later change)
   - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-29}}, linked only by
                     Na__LayoutEditor__Panel__Patterns__'s own <link>, as in TrueVision (nothing
                     to register in the loader list or the CSS index). Named as not yet
                     confirmed by Adam in TrueVision (DR-01 (c)).
   - Parity        : verbatim (every rule and comment is TrueVision's; the banner and this note
                     are the only differences)
   - Divergences   :
     - Banner reads ValeVision3D.
   - Legacy        : the sheet has no module version and no DEVELOPMENT LOG in TrueVision, so
                     the Source version line names the change that created it (R6 OC-07).
   - Back-port     : none.
"""


def build_css():
    src = tv('02__Src__AppModules/51__System__LayoutEditor/36__System__HatchPatternTools/Na__LayoutEditor__Styles__Patterns__.css')
    if b'\r\n' in src:
        raise SystemExit('TV stylesheet is not LF as git show returns it')
    text = src.decode('utf-8')
    text = replace_once(text, '   TRUEVISION3D - LAYOUT EDITOR - PATTERNS PANEL\n',
                        '   VALEVISION3D - LAYOUT EDITOR - PATTERNS PANEL\n', 'css banner')
    text = replace_once(text, '   Scrapbook panel loads its stylesheet.\n   ============================================================================= */\n',
                        '   Scrapbook panel loads its stylesheet.\n' + CSS_NOTE + '   ============================================================================= */\n',
                        'css PORT NOTE anchor')
    return text.encode('utf-8')


# -----------------------------------------------------------------------------
# The mode controller: four hunks and its own records, patched as bytes in the file's own line ending
# -----------------------------------------------------------------------------
MODE_LOG = [
    "// 02-Oct-2026 - Version 1.18.6 (the Patterns panel and the hatch ready chain, {{VVREL:W2-29}})",
    "// - THE HATCH LIBRARY LOADS WITH THE EDITOR'S OWN CONFIGS. Na__LeHatch__Ready",
    "//   joins the ready Promise.all straight after the dash styles, TrueVision's",
    "//   place, so the shell and the first sheet wait for the pattern library as",
    "//   they do for the edge styles. It never rejects: a missing library leaves",
    "//   the Patterns panel empty and holds nothing back.",
    "// - THE PATTERNS PANEL is registered after the three scrapbook libraries,",
    "//   TrueVision's line and comment. It names no tab, so it lands on",
    "//   Properties, hidden until the library has loaded; 'patterns' joins",
    "//   LayoutEditor__Panels__AccordionSections in the config. Its site plan",
    "//   rows stay dormant (DR-08 (B)). From TrueVision3D 1.32.0 at b2aa9151:",
    "//   the hunks TrueVision landed with the site plan composites work",
    "//   (20-Sep-2026, git 62dade1c) and its 1.21.0 accordion entry (v2.106.0).",
    "//",
]


def build_mode(pre):
    eol = b'\r\n' if b'\r\n' in pre else b'\n'
    if eol == b'\r\n' and pre.count(b'\r\n') != pre.count(b'\n'):
        raise SystemExit('ModeController has mixed line endings; refusing')
    text = pre.decode('utf-8').replace('\r\n', '\n')

    # 1. The ready-chain import, beside the other Ready imports
    text = replace_once(text,
        "    import { Na__LeComposite__Ready } from '../25__System__RenderStyles/Na__LayoutEditor__RenderComposites__.js';\n",
        "    import { Na__LeComposite__Ready } from '../25__System__RenderStyles/Na__LayoutEditor__RenderComposites__.js';\n"
        "    import { Na__LeHatch__Ready } from '../36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js';\n",
        'hatch import')
    # 2. The panel import, beside the other panels' (TrueVision's line)
    text = replace_once(text,
        "    import { Na__LePanelParam__RegisterLibrary, Na__LePanelParam__RegisterProperties } from '../57__Feature__ScrapbookParametric/Na__LayoutEditor__Panel__ScrapbookParametric__.js';\n",
        "    import { Na__LePanelParam__RegisterLibrary, Na__LePanelParam__RegisterProperties } from '../57__Feature__ScrapbookParametric/Na__LayoutEditor__Panel__ScrapbookParametric__.js';\n"
        "    import { Na__LePanelPatterns__Register } from '../36__System__HatchPatternTools/Na__LayoutEditor__Panel__Patterns__.js';\n",
        'panel import')
    # 3. The registration after the scrapbook libraries (TrueVision :552, its comment verbatim)
    text = replace_once(text,
        "        Na__LePanelScrapCustom__Register();                                    // <-- Custom: items saved from a selection, one JSON file each in the user content folder\n",
        "        Na__LePanelScrapCustom__Register();                                    // <-- Custom: items saved from a selection, one JSON file each in the user content folder\n"
        "        Na__LePanelPatterns__Register();                                       // <-- Patterns: the hatch library and each site plan layer's hatch\n",
        'registration')
    # 4. The ready Promise.all, Hatch after Dash (TrueVision :1193 order)
    text = replace_once(text,
        "Na__LeDash__Ready(), Na__LeDocKeys__Ready(), Na__DrawCfg__Load() ]).then(() => {   // <-- None of the seven rejects, so a missing file cannot hold the editor back\n",
        "Na__LeDash__Ready(), Na__LeHatch__Ready(), Na__LeDocKeys__Ready(), Na__DrawCfg__Load() ]).then(() => {   // <-- None of the eight rejects, so a missing file cannot hold the editor back\n",
        'ready chain')
    # 5. Records: the PORT NOTE's hunk list and its not-yet-taken list, and the DEVELOPMENT LOG entry
    text = replace_once(text,
        "//                   1.18.2, 1.18.3 and 1.18.4 entries name. Every other difference from that file is a seam\n"
        "//                   listed here or a hunk that arrives with its own feature.\n",
        "//                   1.18.2, 1.18.3, 1.18.4, 1.18.5 and 1.18.6 entries name. Every other difference from that\n"
        "//                   file is a seam listed here or a hunk that arrives with its own feature.\n",
        'source version hunk list')
    text = replace_once(text,
        "//     drawing grid and axes, vector tools, sheet images, floor areas, patterns, site plans and\n",
        "//     drawing grid and axes, vector tools, sheet images, floor areas, site plans and\n",
        'not-yet-taken list')
    text = replace_once(text,
        "// DEVELOPMENT LOG:\n// 02-Oct-2026 - Version 1.18.5 (",
        "// DEVELOPMENT LOG:\n" + '\n'.join(MODE_LOG) + "\n// 02-Oct-2026 - Version 1.18.5 (",
        'log entry')
    return text.replace('\n', eol.decode()).encode('utf-8')


def build_cfg(pre):
    if b'\r\n' in pre:
        raise SystemExit('AppConfig unexpectedly has CRLF; re-check before patching')
    text = pre.decode('utf-8')
    text = replace_once(text,
        '"LayoutEditor__Panels__AccordionSections": [ "text", "dimensions", "shapes", "leaders" ],',
        '"LayoutEditor__Panels__AccordionSections": [ "text", "dimensions", "shapes", "leaders", "patterns" ],',
        'accordion')
    return text.encode('utf-8')


def outputs(pre_mode, pre_cfg):
    return {PANEL: build_panel(), CSS: build_css(), MODE: build_mode(pre_mode), CFG: build_cfg(pre_cfg)}


def live(rel):
    return os.path.join(VV, rel.replace('/', os.sep))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--stage'
    if mode == '--stage':
        out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'stage')
        pre_mode = open(live(MODE), 'rb').read()
        pre_cfg = open(live(CFG), 'rb').read()
        for rel, data in outputs(pre_mode, pre_cfg).items():
            p = os.path.join(out, rel.replace('/', os.sep))
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(data)
            print('staged', rel, len(data), sha(data)[:16])
        # the pre-change copies too, for diffs
        for rel, data in ((MODE, pre_mode), (CFG, pre_cfg)):
            p = os.path.join(out, 'pre', rel.replace('/', os.sep))
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(data)
    elif mode == '--write':
        pre_mode = open(live(MODE), 'rb').read()
        pre_cfg = open(live(CFG), 'rb').read()
        for rel, data in ((MODE, pre_mode), (CFG, pre_cfg)):
            if sha(data) != PRE_HASH[rel]:
                raise SystemExit(f'REFUSED: {rel} changed under me ({sha(data)[:16]} != {PRE_HASH[rel][:16]})')
        for rel in (PANEL, CSS):
            if os.path.exists(live(rel)):
                raise SystemExit(f'REFUSED: {rel} already exists')
        outs = outputs(pre_mode, pre_cfg)          # build everything before writing anything
        os.makedirs(BACKUP, exist_ok=True)
        for rel, data in ((MODE, pre_mode), (CFG, pre_cfg)):
            open(os.path.join(BACKUP, os.path.basename(rel)), 'wb').write(data)
        for rel in (PANEL, CSS):
            with open(live(rel), 'xb') as f:
                f.write(outs[rel])
        for rel in (MODE, CFG):
            with open(live(rel), 'wb') as f:
                f.write(outs[rel])
        lines = [f'{sha(outs[r])}  {r}' for r in (PANEL, CSS, MODE, CFG)]
        open(os.path.join(HERE, 'sha256__written.txt'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
        print('\n'.join(lines))
        print('WRITE DONE')
    elif mode == '--check':
        pre_mode = open(os.path.join(BACKUP, os.path.basename(MODE)), 'rb').read()
        pre_cfg = open(os.path.join(BACKUP, os.path.basename(CFG)), 'rb').read()
        if sha(pre_mode) != PRE_HASH[MODE] or sha(pre_cfg) != PRE_HASH[CFG]:
            raise SystemExit('backup hashes wrong')
        ok = True
        for rel, data in outputs(pre_mode, pre_cfg).items():
            cur = open(live(rel), 'rb').read() if os.path.exists(live(rel)) else None
            same = cur == data
            ok &= same
            print(('SAME ' if same else 'DIFF ') + rel)
        print('CHECK PASS' if ok else 'CHECK FAIL')
        sys.exit(0 if ok else 1)
    elif mode == '--restore':
        for rel in (MODE, CFG):
            data = open(os.path.join(BACKUP, os.path.basename(rel)), 'rb').read()
            if sha(data) != PRE_HASH[rel]:
                raise SystemExit('backup hash wrong for ' + rel)
            open(live(rel), 'wb').write(data)
        for rel in (PANEL, CSS):
            if os.path.exists(live(rel)):
                os.remove(live(rel))
        print('RESTORED')
    else:
        raise SystemExit(__doc__)


if __name__ == '__main__':
    main()
