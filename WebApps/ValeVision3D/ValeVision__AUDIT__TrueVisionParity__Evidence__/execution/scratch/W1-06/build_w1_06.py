# =============================================================================
# W1-06 scratch build: Draft core and the shared Dev-row shell
# =============================================================================
#
# Builds every file package W1-06 lands, as CANDIDATES under scratch/W1-06/candidates/<VV app-relative path>.
# Nothing in the repository is written here (apply_w1_06.py does that, with hash preconditions).
#
#   - Whole-file ports: TrueVision's bytes from `git show b2aa9151:<path>` (sha1-checked against the fetch),
#     LF as git returns them, then each ValeVision seam as an exact replacement asserted to match the stated
#     number of times.
#   - Hunk replays (the SceneCarousel stylesheet, the CSS index): ValeVision's live bytes (sha1-checked against
#     scratch/W1-06/baseline_sha1.txt), CRLF kept, TrueVision's own lines inserted at TrueVision's positions.
#   - Every candidate is then scanned: no TrueVision banner, console prefix, TrueVision__ literal or Noble
#     Architecture marker outside the PORT NOTE and DEVELOPMENT LOG; no retired pre-renumber folder name.
#
# Usage: python -B build_w1_06.py
# =============================================================================

import hashlib
import os
import re
import subprocess
import sys

PIN   = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
VV    = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE  = os.path.dirname(os.path.abspath(__file__))
OUT   = os.path.join(HERE, 'candidates')

RULE = '// -----------------------------------------------------------------------------'

# sha1 prefixes of the TrueVision blobs as fetched by fetch_tv.py (git show at the pin)
TV_SHA1 = {
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DraftMaths__.js'               : '0ecdff16',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DrawingUsage__.js'             : '8aa06305',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js'              : 'd0b1fd0a',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DraftGuard__.js'               : 'f6420074',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RowAccordion__.js'             : 'b6b07867',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js'            : '4fa919d5',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css'         : 'e9b73c42',
    '02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js'  : '8efec449',
    '03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css'                  : '2230b96c',
    '80__Testing__PrototypeEnvironment/Na__Test__DrawingDrafts__.test.mjs'                         : '0daeb1ce',
}

# ValeVision live files read by the hunk replays (sha1 from baseline_sha1.txt)
VV_SHA1 = {
    '03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css' : '370a28cf39b949287e07d5562c6bbbb5cf6a7acc',
    '03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css'                   : 'c074af21d992a27c005debcfe6115ff358d3a48a',
}


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def tv_text(rel):
    r = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TVAPP + rel], capture_output=True)
    if r.returncode != 0:
        raise SystemExit('git show failed for ' + rel + ': ' + r.stderr.decode('utf-8', 'replace'))
    data = r.stdout
    got = hashlib.sha1(data).hexdigest()
    if not got.startswith(TV_SHA1[rel]):
        raise SystemExit('TV blob changed for ' + rel + ': ' + got)
    if b'\r\n' in data:
        raise SystemExit('TV blob has CRLF (expected LF from git show): ' + rel)
    return data.decode('utf-8')


def vv_bytes(rel):
    path = os.path.join(VV, rel.replace('/', os.sep))
    with open(path, 'rb') as fh:
        data = fh.read()
    got = hashlib.sha1(data).hexdigest()
    if got != VV_SHA1[rel]:
        raise SystemExit('VV file changed since the baseline: ' + rel + ' (' + got + ')')
    return data


def replace(text, old, new, count=1, label=''):
    n = text.count(old)
    if n != count:
        raise SystemExit('seam "%s": expected %d match(es), found %d' % (label or old[:60], count, n))
    return text.replace(old, new)


def write_candidate(rel, data):
    path = os.path.join(OUT, rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as fh:
        fh.write(data)
    crlf = data.count(b'\r\n')
    lf = data.count(b'\n') - crlf
    print('%-100s %7d bytes  crlf=%-5d lf=%-5d sha1 %s' % (rel, len(data), crlf, lf, hashlib.sha1(data).hexdigest()[:8]))


def banner(text, old, new):
    return replace(text, old, new, 1, 'banner')


# -----------------------------------------------------------------------------
# PORT NOTE blocks (K2 H5)
# -----------------------------------------------------------------------------

def port_note_new_tv(rel_tv_path, source_version, parity, divergences, ported_on_extra=None):
    lines = [
        '// PORT NOTE:',
        '// - Ported from   : TrueVision3D ' + rel_tv_path,
        '// - Source version: ' + source_version,
    ]
    ported_on = ported_on_extra or []
    if ported_on:
        lines.append('// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-06}} ' + ported_on[0])
        lines += ['//                   ' + extra for extra in ported_on[1:]]
    else:
        lines.append('// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-06}}')
    lines += [
        '// - Parity        : ' + parity[0],
    ]
    lines += ['//                   ' + extra for extra in parity[1:]]
    lines.append('// - Divergences   :')
    lines += divergences
    lines.append('// - Back-port     : none.')
    return '\n'.join(lines) + '\n'


# -----------------------------------------------------------------------------
# 1-4. The four new drawing-core modules (TrueVision-only until now)
# -----------------------------------------------------------------------------

TV_AUTHORED_3 = ('// PORT NOTE:\n'
                 '// - Authored in   : TrueVision3D first (20-Sep-2026)\n'
                 '// - ValeVision    : not yet ported.\n')


def build_draftmaths():
    rel = '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DraftMaths__.js'
    t = tv_text(rel)
    t = banner(t, '// TRUEVISION3D - DRAWING VIEW CORE - DRAFT MATHS\n', '// VALEVISION3D - DRAWING VIEW CORE - DRAFT MATHS\n')
    t = replace(t, TV_AUTHORED_3, port_note_new_tv(
        rel, '1.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151)',
        ['verbatim'],
        ['//   - Banner reads ValeVision3D. (No console output in this file.)']), 1, 'DraftMaths PORT NOTE')
    return rel, t.encode('utf-8')


def build_drawingusage():
    rel = '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DrawingUsage__.js'
    t = tv_text(rel)
    t = banner(t, '// TRUEVISION3D - DRAWING VIEW CORE - DRAWING USAGE\n', '// VALEVISION3D - DRAWING VIEW CORE - DRAWING USAGE\n')
    t = replace(t, ('// PORT NOTE:\n'
                    '// - Authored in   : TrueVision3D first (20-Sep-2026)\n'
                    "// - ValeVision    : not yet ported. ValeVision's sheets carry the same keys.\n"),
                port_note_new_tv(
                    rel, '1.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151)',
                    ['verbatim'],
                    ['//   - Banner reads ValeVision3D. (No console output in this file.)']), 1, 'DrawingUsage PORT NOTE')
    return rel, t.encode('utf-8')


def build_devrowshell():
    rel = '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js'
    t = tv_text(rel)
    t = banner(t, '// TRUEVISION3D - DRAWING VIEW CORE - DEV MENU ROW SHELL\n', '// VALEVISION3D - DRAWING VIEW CORE - DEV MENU ROW SHELL\n')
    t = replace(t, TV_AUTHORED_3, port_note_new_tv(
        rel, '1.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151)',
        ['verbatim'],
        ['//   - Banner reads ValeVision3D. (No console output in this file.)']), 1, 'DevRowShell PORT NOTE')
    return rel, t.encode('utf-8')


def build_draftguard():
    rel = '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DraftGuard__.js'
    t = tv_text(rel)
    t = banner(t, '// TRUEVISION3D - DRAWING VIEW CORE - DRAFT GUARD\n', '// VALEVISION3D - DRAWING VIEW CORE - DRAFT GUARD\n')
    t = replace(t, ('// PORT NOTE:\n'
                    '// - Authored in   : TrueVision3D first (20-Sep-2026)\n'
                    "// - ValeVision    : not yet ported. ValeVision's rows fold already and save\n"
                    '//                   through Na__DrawData__Save, but still write live.\n'),
                port_note_new_tv(
                    rel, '1.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151)',
                    ['verbatim (the code is TrueVision 1.0.0\'s; the banner, the console prefix and this note are',
                     'the only differences)'],
                    ['//   - Banner and console prefix read ValeVision3D.',
                     '//   - DESCRIPTION\'s THE FAULT is TrueVision\'s account. In this app the panels\' own Save buttons did',
                     '//     write the drawing records (through Na__DrawData__Save); the rows\' live writes are the half',
                     '//     of it this app shared.']), 1, 'DraftGuard PORT NOTE')
    t = replace(t, "'[TrueVision3D] ", "'[ValeVision3D] ", 5, 'DraftGuard console prefix')
    return rel, t.encode('utf-8')


# -----------------------------------------------------------------------------
# 5. RowAccordion - this app's module, extended by TrueVision, taken back whole
# -----------------------------------------------------------------------------

def build_rowaccordion():
    rel = '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RowAccordion__.js'
    t = tv_text(rel)
    t = banner(t, '// TRUEVISION3D - DRAWING VIEW CORE - DEV MENU ROW ACCORDION\n', '// VALEVISION3D - DRAWING VIEW CORE - DEV MENU ROW ACCORDION\n')
    old_note = (
        '// PORT NOTE:\n'
        '// - Ported from   : ValeVision3D 42__System__DrawingViewCore/Na__DrawView__RowAccordion__.js 1.0.0\n'
        '// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment Phase B)\n'
        '// - Parity        : adapted (was verbatim until 20-Sep-2026)\n'
        '// - Divergences   : (1) Console prefix and header.\n'
        '//                   (2) THE OPEN ROW HOLDS A DRAFT (20-Sep-2026). A change guard is asked\n'
        '//                       before the slot moves, listeners hear when it has, and a header\n'
        '//                       click ASKS (RequestOpenId) where it used to set. Wrap takes a lead\n'
        '//                       and a trail element for the header and hands back the name element.\n'
        '//                       SetOpenId, IsOpen, GetOpenId and CloseIfOpen are unchanged, so\n'
        "//                       ValeVision's callers would run against this file as they are.\n"
        '// - Back-port     : (2) goes back with the Floor Plans and Elevations menu rebuild.\n')
    new_note = (
        '// PORT NOTE:\n'
        '// - Authored in   : ValeVision3D first (10-Sep-2026, v2.21.14; the module has never carried a version\n'
        '//                   number); TrueVision3D took it verbatim for its v2.21.0 re-alignment, then gave it the\n'
        '//                   change guard, the open listeners, RequestOpenId and the header\'s lead and trail for its\n'
        '//                   menu rebuild; since ported back whole from TrueVision3D v2.86.0 (HEAD b2aa9151)\n'
        '// - Source version: none of its own - the file as TrueVision3D v2.86.0 left it (20-Sep-2026; read at\n'
        '//                   b2aa9151)\n'
        '// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-06}}\n'
        "// - Parity        : verbatim (the code is TrueVision's; the banner, the console prefix and this note are the\n"
        '//                   only differences)\n'
        '// - Divergences   :\n'
        '//   - Banner and console prefix read ValeVision3D.\n'
        '//   - Two comments, in Module State and above Wrap, still say "TrueVision only": TrueVision\'s words for the\n'
        '//     change guard, the open listeners and the header\'s lead and trail while they were its alone. This\n'
        '//     app has them now. SetOpenId, IsOpen, GetOpenId and CloseIfOpen are unchanged, and with no change\n'
        '//     guard registered a header click moves the slot at once, as it always did here.\n'
        "// - Back-port     : none (TrueVision's extension of this app's module, taken back whole).\n")
    t = replace(t, old_note, new_note, 1, 'RowAccordion PORT NOTE')
    t = replace(t, "'[TrueVision3D] ", "'[ValeVision3D] ", 2, 'RowAccordion console prefix')
    return rel, t.encode('utf-8')


# -----------------------------------------------------------------------------
# 6. RenameDrawing - this app's module, TrueVision 1.1.0 (the Stage functions) taken back whole,
#    with the re-stamp on this app's Layout Editor loader route (C.4 S23) and its own 41
# -----------------------------------------------------------------------------

def build_renamedrawing():
    rel = '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js'
    t = tv_text(rel)
    t = banner(t, '// TRUEVISION3D - DRAWING VIEW CORE - RENAME DRAWING\n', '// VALEVISION3D - DRAWING VIEW CORE - RENAME DRAWING\n')

    # DESCRIPTION | this app's paragraph on the loader route (its seam), after THE SNAPSHOT IS NOT RE-RENDERED
    t = replace(t, (
        "//   of it intact. See Na__LeVp3d__RestampForScene.\n"
        "//\n"
        "// INTEGRATION:\n"),
        ("//   of it intact. See Na__LeVp3d__RestampForScene.\n"
         "//\n"
         "// - THE STAMPER LOADS ON DEMAND. The Layout Editor is off the start-up path,\n"
         "//   so the re-stamp is reached through its loader. Renaming a scene that a\n"
         "//   sheet viewport holds a baked snapshot of loads the editor quietly first,\n"
         "//   before anything is written; any other rename loads nothing.\n"
         "//\n"
         "// INTEGRATION:\n"), 1, 'RenameDrawing DESCRIPTION loader paragraph')

    # INTEGRATION | this app's card-name caller
    t = replace(t, (
        "// - Na__PresentationMode__DevMenu__SceneEditor routes a drawing card's name\n"
        "//   field here so the record follows the card. (It builds its own scene rows;\n"
        "//   the separate SceneRowBuilders__ module this note used to name was a stale\n"
        "//   ValeVision port, never imported, deleted in v2.68.2.)\n"),
        ("// - Na__PresentationMode__DevMenu__SceneRowBuilders__ routes a drawing\n"
         "//   card's name field here so the record follows the card.\n"), 1, 'RenameDrawing INTEGRATION')

    # PORT NOTE
    t = replace(t, (
        '// PORT NOTE:\n'
        '// - Ported from   : ValeVision3D 42__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js\n'
        '// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n'
        '// - Parity        : adapted (was verbatim until 20-Sep-2026)\n'
        '// - Divergences   : Console prefix, header and folder numbers; and StageFloorPlan /\n'
        '//                   StageElevation (20-Sep-2026), the same four holders brought into\n'
        "//                   step WITHOUT a save, for the Dev menu rows' one Update.\n"
        '// - Back-port     : n/a (this IS the back-port)\n'),
        ('// PORT NOTE:\n'
         '// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.5; the re-stamp moved onto the Layout\n'
         "//                   Editor's loader in v2.45.0, 15-Sep-2026 - that devlog entry calls it 1.1.0, the file's\n"
         '//                   own log stayed at 1.0.0); TrueVision3D took it as its 1.0.0 for its v2.21.0\n'
         '//                   re-alignment; since ported back whole from TrueVision3D 1.1.0 (HEAD b2aa9151)\n'
         '// - Source version: 1.1.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151)\n'
         '// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-06}}\n'
         '// - Parity        : adapted\n'
         '// - Divergences   :\n'
         '//   - Banner and console prefix read ValeVision3D.\n'
         "//   - THE RE-STAMP GOES THROUGH THE LAYOUT EDITOR'S LOADER (DR-24, C.4 S23). This app loads the editor\n"
         '//     on first use, so Na__LeLoad__PrepareRestamp loads the stamper - quietly, and only for a scene a\n'
         '//     sheet viewport holds a baked snapshot of - BEFORE anything is written, and\n'
         '//     Na__LeLoad__RestampForScene re-stamps (0 while the editor has not loaded). TrueVision, whose\n'
         '//     editor is always loaded, imports Viewport3d lazily part way through (its ResolveRestamp). Apply\n'
         '//     and StageHolders both take this route; DESCRIPTION\'s "THE STAMPER LOADS ON DEMAND" paragraph\n'
         "//     is this app's.\n"
         "//   - The section binding is re-keyed by this app's 41__System__CrossSectionView SceneData (DIV-2,\n"
         "//     DR-41), not TrueVision's 41__System__SectionCutEngine.\n"
         "//   - INTEGRATION names this app's card-name caller, Na__PresentationMode__DevMenu__SceneRowBuilders__\n"
         "//     (TrueVision's SceneEditor builds its own rows).\n"
         '// - Back-port     : none.\n'), 1, 'RenameDrawing PORT NOTE')

    # IMPORTS | this app's 41 and the loader route in place of the lazy Viewport3d import
    t = replace(t, (
        "    // MODULE IMPORTS | The Name-Keyed Section Binding and the Sheet Viewports\n"
        "    // ------------------------------------------------------------\n"
        "    // @delegate: ../41__System__SectionCutEngine/Na__SectionCut__SceneData__.js\n"
        "    // @delegate: ../51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport3d__.js\n"
        "    // ------------------------------------------------------------\n"
        "    import { Na__SectSceneData__RenameSceneKey } from '../41__System__SectionCutEngine/Na__SectionCut__SceneData__.js';\n"
        "\n"
        "    // The sheet viewports are reached LAZILY rather than imported. Renaming a\n"
        "    // drawing is a drawing-system concern and must not drag the whole Layout\n"
        "    // Editor onto a page that has no sheets - and this module is loaded by the\n"
        "    // dev panels, which exist long before any sheet does. A project with no\n"
        "    // Layout Editor simply has no snapshots to re-stamp, and the fourth holder\n"
        "    // of the name is a no-op rather than a missing module.\n"
        "    let Na__DrawRename__RestampForScene = null;                                  // <-- Resolved on first use\n"
        "    async function Na__DrawRename__ResolveRestamp() {\n"
        "        if (Na__DrawRename__RestampForScene !== null) return Na__DrawRename__RestampForScene;\n"
        "        try {\n"
        "            const mod = await import('../51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport3d__.js');\n"
        "            Na__DrawRename__RestampForScene = mod.Na__LeVp3d__RestampForScene || false;\n"
        "        } catch (error) {\n"
        "            Na__DrawRename__RestampForScene = false;                             // <-- No Layout Editor on this build\n"
        "        }\n"
        "        return Na__DrawRename__RestampForScene;\n"
        "    }\n"
        "    function Na__LeVp3d__RestampForScene(sceneId) {\n"
        "        const fn = Na__DrawRename__RestampForScene;\n"
        "        return (typeof fn === 'function') ? fn(sceneId) : false;\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"),
        ("    // MODULE IMPORTS | The Name-Keyed Section Binding and the Sheet Viewports\n"
         "    // ------------------------------------------------------------\n"
         "    // @delegate: ../41__System__CrossSectionView/Na__CrossSectionView__SceneData.js\n"
         "    // @delegate: ../51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js\n"
         "    // ------------------------------------------------------------\n"
         "    // The re-stamp comes through the Layout Editor's loader, never straight\n"
         "    // from Viewport3d: the editor loads on first use, and only its loader can\n"
         "    // say whether it is up, load it quietly when a baked snapshot needs the\n"
         "    // new name, and reach its stamper. Renaming loads nothing otherwise.\n"
         "    // ------------------------------------------------------------\n"
         "    import { Na__SectSceneData__RenameSceneKey } from '../41__System__CrossSectionView/Na__CrossSectionView__SceneData.js';\n"
         "    import { Na__LeLoad__PrepareRestamp, Na__LeLoad__RestampForScene } from '../51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js';\n"
         "    // ------------------------------------------------------------\n"), 1, 'RenameDrawing imports')

    # REVERT
    t = replace(t, "        if (state.restamped)    Na__LeVp3d__RestampForScene(state.sceneId);\n",
                   "        if (state.restamped)    Na__LeLoad__RestampForScene(state.sceneId);\n", 1, 'RenameDrawing Revert')

    # APPLY | the stamper is prepared BEFORE anything is written
    t = replace(t, (
        "        try {\n"
        "            state.record[state.nameKey] = nextName;\n"
        "            if (state.scene) state.scene[Na__DrawRename__SCENE_NAME] = nextName;\n"),
        ("        try {\n"
         "            // THE SHEET VIEWPORTS' STAMPER | The Layout Editor loads on first use,\n"
         "            // and only it can re-stamp a baked 3D snapshot. It is fetched BEFORE\n"
         "            // anything below is written, so the rename stays one uninterrupted\n"
         "            // step. A project with no baked snapshot of this scene loads nothing.\n"
         "            if (state.sceneId) await Na__LeLoad__PrepareRestamp(state.sceneId);\n"
         "\n"
         "            state.record[state.nameKey] = nextName;\n"
         "            if (state.scene) state.scene[Na__DrawRename__SCENE_NAME] = nextName;\n"), 1, 'RenameDrawing Apply prepare')
    t = replace(t, (
        "            if (state.scene)   state.movedBinding = Na__SectSceneData__RenameSceneKey(state.beforeSceneName, nextName, state.sceneId);\n"
        "            await Na__DrawRename__ResolveRestamp();                                   // <-- Warm the lazy sheet-viewport reference\n"
        "            if (state.sceneId) state.restamped    = Na__LeVp3d__RestampForScene(state.sceneId);\n"),
        ("            if (state.scene)   state.movedBinding = Na__SectSceneData__RenameSceneKey(state.beforeSceneName, nextName, state.sceneId);\n"
         "            if (state.sceneId) state.restamped    = Na__LeLoad__RestampForScene(state.sceneId);\n"), 1, 'RenameDrawing Apply restamp')

    t = replace(t, "            console.error('[TrueVision3D] Drawing rename error:', error);\n",
                   "            console.error('[ValeVision3D] Drawing rename error:', error);\n", 1, 'RenameDrawing console prefix')

    # STAGE HOLDERS | the same route: prepare before staging, re-stamp through the loader, undo through it
    t = replace(t, (
        "        const sceneId = scene[Na__DrawRename__SCENE_ID] || null;\n"
        "        scene[Na__DrawRename__SCENE_NAME] = nextName;\n"
        "        const movedBinding = Na__SectSceneData__RenameSceneKey(before, nextName, sceneId);   // <-- Filed under the name the scene HAD\n"
        "        await Na__DrawRename__ResolveRestamp();\n"
        "        const restamped = sceneId ? (Na__LeVp3d__RestampForScene(sceneId) || 0) : 0;          // <-- Fingerprinted from the name it has NOW\n"),
        ("        const sceneId = scene[Na__DrawRename__SCENE_ID] || null;\n"
         "        if (sceneId) await Na__LeLoad__PrepareRestamp(sceneId);                              // <-- The stamper first, before anything is staged\n"
         "        scene[Na__DrawRename__SCENE_NAME] = nextName;\n"
         "        const movedBinding = Na__SectSceneData__RenameSceneKey(before, nextName, sceneId);   // <-- Filed under the name the scene HAD\n"
         "        const restamped = sceneId ? (Na__LeLoad__RestampForScene(sceneId) || 0) : 0;          // <-- Fingerprinted from the name it has NOW\n"),
        1, 'RenameDrawing StageHolders')
    t = replace(t, "                if (restamped)    Na__LeVp3d__RestampForScene(sceneId);\n",
                   "                if (restamped)    Na__LeLoad__RestampForScene(sceneId);\n", 1, 'RenameDrawing StageHolders undo')

    for gone in ('Na__DrawRename__ResolveRestamp', 'Na__DrawRename__RestampForScene', "import('../51__System__LayoutEditor"):
        if gone in t:
            raise SystemExit('RenameDrawing: TrueVision route left behind: ' + gone)
    code = re.sub(r'//[^\n]*', '', t)
    if 'Na__LeVp3d__RestampForScene' in code:
        raise SystemExit('RenameDrawing: Na__LeVp3d__RestampForScene still called in code')
    return rel, t.encode('utf-8')


# -----------------------------------------------------------------------------
# 7. The Drawing View Core Dev menu stylesheet - TrueVision's whole, with its Drawing Panel Shell region
# -----------------------------------------------------------------------------

def build_drawview_css():
    rel = '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css'
    t = tv_text(rel)
    t = banner(t, '/* REGION  |  TrueVision3D - Drawing View Core Dev Menu Styles      */\n',
                  '/* REGION  |  ValeVision3D - Drawing View Core Dev Menu Styles      */\n')
    t = replace(t, (
        '/*\n'
        ' * PORT NOTE:\n'
        ' * - Ported from : TrueVision3D 02__Src__AppModules/45__System__ElevationViews/Na__Elevation__Styles__DevMenu__.css (scene row rules)\n'
        ' * - Ported on   : 09-Sep-2026 for TrueVision3D v2.18.0 (port Phase 2)\n'
        ' * - Parity      : verbatim (relocated to the drawing core so Phase 2 has them before the elevation sheet exists)\n'
        ' */\n'),
        ('/*\n'
         ' * PORT NOTE:\n'
         " * - Authored in   : ValeVision3D first (09-Sep-2026, v2.18.0, port Phase 2: TrueVision3D's elevation scene-row\n"
         ' *                   rules, relocated to the drawing core; the Folded Drawing Row region, v2.21.14,\n'
         ' *                   10-Sep-2026); TrueVision3D took the sheet whole; since ported back whole from\n'
         ' *                   TrueVision3D v2.86.0 (HEAD b2aa9151)\n'
         ' * - Source version: none of its own - the sheet as TrueVision3D v2.86.0 left it, with its Drawing Panel\n'
         ' *                   Shell region (20-Sep-2026; read at b2aa9151)\n'
         ' * - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-06}}\n'
         " * - Parity        : verbatim (the rules are TrueVision's; the banner, one folder number in a comment and\n"
         ' *                   this note are the only differences)\n'
         ' * - Divergences   :\n'
         ' *   - Banner reads ValeVision3D.\n'
         " *   - The Folded Drawing Row note names the accordion's folder as 40__System__DrawingViewCore, where it\n"
         " *     is; TrueVision's text still carries the drawing core's old ValeVision number, 42, a name retired\n"
         ' *     here by the renumber.\n'
         ' * - Back-port     : none.\n'
         ' */\n'), 1, 'DrawView CSS PORT NOTE')
    t = replace(t, ' * 42__System__DrawingViewCore/Na__DrawView__RowAccordion__.js for why.\n',
                   ' * 40__System__DrawingViewCore/Na__DrawView__RowAccordion__.js for why.\n', 1, 'DrawView CSS folder number')
    return rel, t.encode('utf-8')


# -----------------------------------------------------------------------------
# 8. The Presentation Scenes Dev menu modal - TrueVision 1.2.0 whole
# -----------------------------------------------------------------------------

def build_modal():
    rel = '02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js'
    t = tv_text(rel)
    t = banner(t, '// TRUEVISION3D - PRESENTATION MODE - DEV MENU MODAL\n', '// VALEVISION3D - PRESENTATION MODE - DEV MENU MODAL\n')
    note = port_note_new_tv(
        rel, '1.2.0 (TrueVision3D v2.146.0, 22-Sep-2026; read at b2aa9151)',
        ['verbatim'],
        ['//   - Banner reads ValeVision3D. (No console output in this file.)'],
        ['(its 1.0.0 first came across for',
         'ValeVision3D v2.63.0, 19-Sep-2026)'])
    t = replace(t, ('//\n' + RULE + '\n//\n// DEVELOPMENT LOG:\n'),
                   ('//\n' + RULE + '\n//\n' + note + '//\n' + RULE + '\n//\n// DEVELOPMENT LOG:\n'), 1, 'Modal PORT NOTE')
    return rel, t.encode('utf-8')


# -----------------------------------------------------------------------------
# 9. The modal's stylesheet rules - TrueVision's two hunks, at TrueVision's positions (CRLF kept)
# -----------------------------------------------------------------------------

def tv_slice(text, start_marker, end_marker):
    a = text.index(start_marker)
    if text.count(start_marker) != 1:
        raise SystemExit('TV slice start not unique: ' + start_marker)
    b = text.index(end_marker, a)
    return text[a:b]


def build_scenecarousel_css():
    rel = '03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css'
    tv = tv_text(rel)
    vv = vv_bytes(rel)
    if vv.count(b'\r\n') != vv.count(b'\n'):
        raise SystemExit('SceneCarousel: expected a CRLF-only file')
    text = vv.decode('utf-8').replace('\r\n', '\n')

    details = tv_slice(tv, '    /* WHAT EXACTLY IS ABOUT TO CHANGE |', '    .na-pm-modal__prompt {\n')
    commit  = tv_slice(tv, '    /* A confirm that KEEPS something (Update) rather than destroys it. */\n', '    .na-pm-modal__btn--danger {\n')
    for need in ('.na-pm-modal__details {', '.na-pm-modal__details li + li {', '.na-pm-modal__message--footnote {'):
        if need not in details:
            raise SystemExit('SceneCarousel: TV details slice lacks ' + need)
    if '.na-pm-modal__btn--commit {' not in commit or '.na-pm-modal__btn--commit:hover:not(:disabled) {' not in commit:
        raise SystemExit('SceneCarousel: TV commit slice incomplete')
    for gone in ('.na-pm-modal__details', '.na-pm-modal__message--footnote', '.na-pm-modal__btn--commit'):
        if gone in text:
            raise SystemExit('SceneCarousel: VV already has ' + gone)

    text = replace(text, ('        color                              : #555d66;\n'
                          '    }\n'
                          '\n'
                          '    .na-pm-modal__prompt {\n'),
                         ('        color                              : #555d66;\n'
                          '    }\n'
                          '\n' + details +
                          '    .na-pm-modal__prompt {\n'), 1, 'SceneCarousel details hunk')
    text = replace(text, ('    .na-pm-modal__btn--confirm:hover:not(:disabled) {\n'
                          '        background                         : #daeaf6;\n'
                          '    }\n'
                          '\n'
                          '    .na-pm-modal__btn--danger {\n'),
                         ('    .na-pm-modal__btn--confirm:hover:not(:disabled) {\n'
                          '        background                         : #daeaf6;\n'
                          '    }\n'
                          '\n' + commit +
                          '    .na-pm-modal__btn--danger {\n'), 1, 'SceneCarousel commit hunk')
    return rel, text.replace('\n', '\r\n').encode('utf-8')


# -----------------------------------------------------------------------------
# 10. The CSS index - the Drawing View Core Dev sheet moved to TrueVision's position (CRLF kept)
# -----------------------------------------------------------------------------

def build_css_index():
    rel = '03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css'
    vv = vv_bytes(rel)
    if vv.count(b'\r\n') != vv.count(b'\n'):
        raise SystemExit('CSS index: expected a CRLF-only file')
    text = vv.decode('utf-8').replace('\r\n', '\n')
    dv = "@import url('../02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css');"
    text = replace(text, (
        '/* Drawing View Core, Floor Plans, Elevations, Plan Annotations, Plan Dimensions (port Phases 2 and 3, dependency order) */\n'
        '/* ----------------------------------------------------------------- */\n'
        + dv + '\n'
        "@import url('../02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__Styles__DevMenu__.css');\n"
        "@import url('../02__Src__AppModules/45__System__ElevationViews/Na__Elevation__Styles__DevMenu__.css');\n"
        "@import url('../02__Src__AppModules/46__System__NorthDirection/Na__North__Styles__DevMenu__.css');\n"
        "@import url('../02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Styles__.css');\n"
        "@import url('../02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Styles__.css');\n"
        "@import url('../02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Styles__Main__.css');\n"),
        ('/* Floor Plans, Elevations, North, Plan Annotations, Plan Dimensions, then the Drawing View Core Dev rows: TrueVision\'s order (port Phases 2 and 3) */\n'
         '/* ----------------------------------------------------------------- */\n'
         "@import url('../02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__Styles__DevMenu__.css');\n"
         "@import url('../02__Src__AppModules/45__System__ElevationViews/Na__Elevation__Styles__DevMenu__.css');\n"
         "@import url('../02__Src__AppModules/46__System__NorthDirection/Na__North__Styles__DevMenu__.css');\n"
         "@import url('../02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Styles__.css');\n"
         "@import url('../02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Styles__.css');\n"
         + dv + "   /* <-- After the drawing sheets, where TrueVision's index has it: its Drawing Panel Shell overrides .na-pm-dev__btn:disabled */\n"
         "@import url('../02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Styles__Main__.css');\n"),
        1, 'CSS index move')
    if text.count(dv) != 1:
        raise SystemExit('CSS index: the DrawView import must appear exactly once')
    return rel, text.replace('\n', '\r\n').encode('utf-8')


# -----------------------------------------------------------------------------
# 11. The test - TrueVision's checks, this app's fixture on disk
# -----------------------------------------------------------------------------

def build_test():
    rel = '80__Testing__PrototypeEnvironment/Na__Test__DrawingDrafts__.test.mjs'
    t = tv_text(rel)
    t = banner(t, '// TRUEVISION3D - TEST - DRAWING DRAFTS, DRAWING USAGE, ELEVATION AUTO NAMES\n',
                  '// VALEVISION3D - TEST - DRAWING DRAFTS, DRAWING USAGE, ELEVATION AUTO NAMES\n')
    t = replace(t, (
        '// - THE FIXTURE IS PS01, read from the repository copy of its project data\n'
        '//   when it is there: three elevations at model bearings 90 / 180 / 270 that\n'
        '//   Adam lettered North / East / South by hand, each drawn twice on the\n'
        '//   Elevations sheet; two floor plans, one of them drawn twice. Where the file\n'
        '//   is not on disk the same shapes are built by hand, so the test never skips.\n'),
        ("// - THE FIXTURE IS 2026/3047__Doous, this app's reference test project, read\n"
         '//   from the Whitecardopedia repository copy of its project.json when it is\n'
         '//   there: one elevation at model bearing 90, drawn by one viewport on its\n'
         '//   sheet. Where the file is not on disk, the shapes TrueVision built by hand\n'
         '//   from its own PS01 project stand in, so the test never skips.\n'), 1, 'test DESCRIPTION fixture')
    t = replace(t, ('//   Exit 0 = every check passed. Exit 1 = at least one did not.\n'
                    '//\n' + RULE + '\n//\n// DEVELOPMENT LOG:\n'),
                   ('//   Exit 0 = every check passed. Exit 1 = at least one did not.\n'
                    '//\n' + RULE + '\n//\n'
                    + port_note_new_tv(
                        rel, '1.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151)',
                        ["adapted - every check is TrueVision's, run against this app's own modules"],
                        ['//   - Banner and the title line read ValeVision3D.',
                         "//   - THE FIXTURE ON DISK is this app's reference project, 2026/3047__Doous (its project.json in the",
                         '//     Whitecardopedia repository), where TrueVision reads its own project PS01 from the',
                         "//     practice's project portal. The hand-built fixture is TrueVision's, unchanged, and stands in",
                         '//     whenever the file is absent.'])
                    + '//\n' + RULE + '\n//\n// DEVELOPMENT LOG:\n'), 1, 'test PORT NOTE')
    t = replace(t, (
        "    const PS01_FILE = resolve(SCRIPT_DIR, '..', '..', '..', 'na-project-portal', '26-Projects', 'PS01__MustersRoad',\n"
        "        '30__TrueVision__AppContent', 'TrueVision__ProjectData__.json');\n"),
        ("    const DOOUS_FILE = resolve(SCRIPT_DIR, '..', '..', 'Whitecardopedia', 'Projects', '2026', '3047__Doous',\n"
         "        'project.json');\n"), 1, 'test fixture path')
    t = replace(t, '    if (existsSync(PS01_FILE)) {\n', '    if (existsSync(DOOUS_FILE)) {\n', 1, 'test fixture exists')
    t = replace(t, "            const parsed = JSON.parse(readFileSync(PS01_FILE, 'utf8'));\n",
                   "            const parsed = JSON.parse(readFileSync(DOOUS_FILE, 'utf8'));\n", 1, 'test fixture read')
    t = replace(t, "    console.log('TrueVision3D - drawing drafts, drawing usage, elevation auto names');\n",
                   "    console.log('ValeVision3D - drawing drafts, drawing usage, elevation auto names');\n", 1, 'test title')
    t = replace(t, "    console.log('  fixture : ' + (fromDisk ? 'PS01 project data on disk' : 'built by hand (PS01 file not found)'));\n",
                   "    console.log('  fixture : ' + (fromDisk ? '2026/3047__Doous project data on disk' : 'built by hand (2026/3047__Doous file not found)'));\n",
                   1, 'test fixture line')
    if 'PS01_FILE' in t:
        raise SystemExit('test: PS01_FILE left behind')
    return rel, t.encode('utf-8')


# -----------------------------------------------------------------------------
# Identity scan (outside PORT NOTE and DEVELOPMENT LOG blocks)
# -----------------------------------------------------------------------------

RETIRED = ('42__System__DrawingViewCore', '43__System__FloorPlanViews', '44__System__PlanAnnotations',
           '45__System__PlanDimensions', '46__System__ElevationViews', '47__System__NorthDirection',
           '40__System__2dElevationsView', 'ComposerPreset')
IDENTITY = ('TRUEVISION3D', '[TrueVision3D', 'TrueVision__', 'TrueVision3D__', 'window.TrueVision', '/api/truevision',
            'X-TrueVision-', 'na-truevision-api', 'na-projectvision-local-dev', 'NaProjectPortal',
            '30__TrueVision__AppContent', '/na-apps/', 'Noble Architecture Ltd', '/q/', '/s/')


def strip_records(text):
    # Drop the PORT NOTE and DEVELOPMENT LOG blocks: from the heading to the next rule line, the end of the
    # comment, or the first line that is not a comment line.
    out = []
    skip = False
    for line in text.split('\n'):
        s = line.strip()
        if re.match(r'^(//+|\*|/\*+)\s*(PORT NOTE|DEVELOPMENT LOG)\b', s):
            skip = True
            continue
        if skip:
            is_comment = s.startswith('//') or s.startswith('*')
            is_rule = re.match(r'^(//+|\*|/\*+)\s*[-=]{4,}', s) is not None
            if is_rule or s.endswith('*/') or not is_comment:
                skip = False
            else:
                continue
        out.append(line)
    return '\n'.join(out)


def scan(rel, data):
    text = data.decode('utf-8')
    problems = []
    for name in RETIRED:
        if name in text:
            problems.append('retired name ' + name)
    body = strip_records(text)
    is_test = rel.startswith('80__Testing__PrototypeEnvironment/')
    for token in IDENTITY:
        if token in body:
            if is_test and token in ('/q/', '/s/'):
                continue
            problems.append('identity token ' + token)
    if problems:
        raise SystemExit('SCAN ' + rel + ': ' + '; '.join(problems))


def main():
    builders = [build_draftmaths, build_drawingusage, build_devrowshell, build_draftguard, build_rowaccordion,
                build_renamedrawing, build_drawview_css, build_modal, build_scenecarousel_css, build_css_index, build_test]
    for builder in builders:
        rel, data = builder()
        scan(rel, data)
        write_candidate(rel, data)
    print('BUILD OK - %d candidates in %s' % (len(builders), OUT))


if __name__ == '__main__':
    sys.exit(main())
