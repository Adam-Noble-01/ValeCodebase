"""W1-05 - build the ValeVision copy of Na__DrawView__ProjectData__.js from TrueVision's file at the pin.

Reads TrueVision's bytes with `git show b2aa9151:...` (LF, as git returns them), applies ONLY the
seams the package names, each one asserted to match exactly the expected number of times, and
writes the candidate into this scratch folder. Nothing in the repository is written here.

Seams (W1-05 vv_adaptations, K2 H1/H4/H5/C1/X2, DR-25, DR-27, DR-30, DR-41):
  1. Banner VALEVISION3D.
  2. DESCRIPTION: running-app names (ValeVision, project.json, the Whitecardopedia local server).
  3. PORT NOTE replaced by ValeVision's (K2 H5).
  4. LayoutModeEnabled: key, skeleton, Normalise, getter, setter, exports (DR-25).
  5. Block description constant: ValeVision's text minus its last sentence (S12 c).
  6. Console prefix [ValeVision3D] (K2 C1).
  7. The Save comment's project file name (project.json).
  8. R2 judging behind its flag, off (DR-30).
"""
import hashlib
import subprocess
import sys
from pathlib import Path

PIN = 'b2aa9151'
TV_REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_PATH = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js'
HERE = Path(__file__).resolve().parent
OUT = HERE / 'candidate__Na__DrawView__ProjectData__.js'
TV_SHA1 = 'ca656c77a831f5f823b0fb213bd7ba08dd18efc4'


def tv_text():
    raw = subprocess.run(['git', '-C', TV_REPO, 'show', f'{PIN}:{TV_PATH}'], capture_output=True, check=True).stdout
    sha = hashlib.sha1(raw).hexdigest()
    if sha != TV_SHA1:
        sys.exit(f'TV source changed? sha1 {sha} != {TV_SHA1}')
    if b'\r' in raw:
        sys.exit('TV source has CR bytes; expected LF from git show')
    return raw.decode('ascii')


def swap(text, old, new, count=1, label=''):
    found = text.count(old)
    if found != count:
        sys.exit(f'[{label}] expected {count} match(es), found {found}:\n{old}')
    return text.replace(old, new)


def build():
    t = tv_text()

    # 1. BANNER ---------------------------------------------------------------------------------
    t = swap(t, '// TRUEVISION3D - DRAWING VIEW CORE - PROJECT DATA\n',
                '// VALEVISION3D - DRAWING VIEW CORE - PROJECT DATA\n', label='banner')

    # 2. DESCRIPTION: running-app names only ---------------------------------------------------
    t = swap(t, '// - Every drawing TrueVision authors - floor plans, elevations, sections and\n',
                '// - Every drawing ValeVision authors - floor plans, elevations, sections and\n', label='desc-app')
    t = swap(t, '//   Na__CfApi__MergeAndSaveKeys, which read-merge-writes them into\n'
                '//   TrueVision__ProjectData__.json on R2: the drawings block, the presentation\n',
                '//   Na__CfApi__MergeAndSaveKeys, which read-merge-writes them into\n'
                '//   project.json on R2: the drawings block, the presentation\n', label='desc-file-1')
    t = swap(t, '//   repository\'s TrueVision__ProjectData__.json through the ProjectVision local\n'
                '//   server, so a save lands in R2 and on disk (Na__AppUtils__LocalProjectMirror__).\n',
                '//   repository\'s project.json through the Whitecardopedia local\n'
                '//   server, so a save lands in R2 and on disk (Na__AppUtils__LocalProjectMirror__).\n', label='desc-file-2')

    # 3. PORT NOTE -------------------------------------------------------------------------------
    start = t.index('// PORT NOTE:\n')
    end = t.index('// -----------------------------------------------------------------------------\n', start)
    tv_note = t[start:end]
    if 'Back-port     : no for (1) to (3)' not in tv_note:
        sys.exit('TV PORT NOTE not where expected')
    vv_note = (
        '// PORT NOTE:\n'
        '// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.18.0, port Phase 2; 1.0.1, 10-Sep-2026, which\n'
        '//                   TrueVision3D took for its v2.21.0; 1.1.0, the Layout Mode switch, v2.21.20; 1.2.0, the\n'
        '//                   common fields, v2.65.0); since ported back whole from TrueVision3D 1.6.0 (HEAD b2aa9151)\n'
        '// - Source version: 1.6.0 (TrueVision3D v2.146.0, 22-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-05}}\n'
        '// - Parity        : adapted\n'
        '// - Divergences   :\n'
        '//   - Banner and console prefix read ValeVision3D. DESCRIPTION names this app, its project.json and the\n'
        '//     local Whitecardopedia server where TrueVision names its own project data file and its ProjectVision\n'
        '//     server.\n'
        '//   - TRANSPORT (DIV-4, DR-27): Na__CfApi__* and Na__LocalMirror__* are ValeVision\'s facade at\n'
        '//     TrueVision\'s paths - the whitecardopedia-editor-api Worker, VaApps/Projects/<folderId>/project.json\n'
        '//     and the Whitecardopedia server\'s guarded POST and drawings fingerprint - never TrueVision\'s own client.\n'
        '//   - THE LAYOUT MODE SWITCH (DR-25): LayoutEditor__DrawingsData__LayoutModeEnabled - its key, its\n'
        '//     skeleton and Normalise lines (absent reads as off) and two ValeVision-only exports (K2 X2),\n'
        '//     Na__DrawData__GetLayoutModeEnabled and Na__DrawData__SetLayoutModeEnabled, which the Layout Editor\'s\n'
        '//     loader and mode controller read.\n'
        '//   - R2 JUDGING (DR-30), OFF: Na__DrawData__R2_JUDGING is false, so Save hands its keys to\n'
        '//     Na__CfApi__MergeAndSaveKeys unjudged, as TrueVision does. Switched on, Na__DrawData__R2SaveOptions\n'
        '//     sends the block\'s saved stamp as { drawingsBase } and the editor Worker (1.6.0, merge-keys) refuses\n'
        '//     the merge when the drawings on R2 have moved on: the save fails with its toast and report.conflict.\n'
        '//   - The block description written into project.json is ValeVision\'s; a block already saved keeps the\n'
        '//     text it carries.\n'
        '//   - The section bindings come from 41__System__CrossSectionView/Na__CrossSectionView__SceneData.js,\n'
        '//     which registers its block getter through Na__DrawData__RegisterSectionBlockProvider (DIV-2);\n'
        '//     TrueVision\'s 41__System__SectionCutEngine SceneData and Serialize are never ported (DR-41).\n'
        '//   - The loading sequence dispatches the drawings block before the presentation scenes are registered\n'
        '//     (INTEGRATION gives TrueVision\'s order); the dispatch carries sceneConfig, which is what Load reads.\n'
        '//   - The Legacy Migration region (its title\'s "PORT NOTE divergence 3" is TrueVision\'s own note: drawings\n'
        '//     nested in the presentation block before TrueVision3D v2.21.0) is kept verbatim and is inert here:\n'
        '//     no ValeVision project has them, so HasLegacyDrawings is always false.\n'
        '// - Back-port     : R2 judging, once switched on and proved (TrueVision\'s v2.146.0 log lists R2 as not\n'
        '//                   judged). The Layout Mode switch only if TrueVision takes it (DR-25).\n'
        '//\n'
    )
    t = t[:start] + vv_note + t[end:]

    # 4a. LAYOUT MODE KEY ------------------------------------------------------------------------
    t = swap(t, "    const Na__DrawData__COMMON_SITE_KEY   = 'LayoutEditor__DrawingsData__CommonSiteAddress';\n",
                "    const Na__DrawData__COMMON_SITE_KEY   = 'LayoutEditor__DrawingsData__CommonSiteAddress';\n"
                "    const Na__DrawData__LAYOUT_MODE_KEY  = 'LayoutEditor__DrawingsData__LayoutModeEnabled';   // <-- ValeVision only (DR-25): the per-project Layout Mode switch\n",
                label='layout-key')

    # 5. BLOCK DESCRIPTION CONSTANT --------------------------------------------------------------
    t = swap(t, "    const Na__DrawData__DESCRIPTION = 'TrueVision-owned drawing definitions: floor plans, elevations and sections with their markup, and Layout Editor sheets. Distances are integer millimetres.';\n",
                "    const Na__DrawData__DESCRIPTION = 'ValeVision-owned drawing definitions: floor plans, elevations and sections with their markup, and Layout Editor sheets. Distances are integer millimetres.';\n",
                label='block-description')

    # 8a. R2 JUDGING FLAG ------------------------------------------------------------------------
    t = swap(t,
        "    const Na__DrawData__DESCRIPTION = 'ValeVision-owned drawing definitions: floor plans, elevations and sections with their markup, and Layout Editor sheets. Distances are integer millimetres.';\n"
        "    // ------------------------------------------------------------\n",
        "    const Na__DrawData__DESCRIPTION = 'ValeVision-owned drawing definitions: floor plans, elevations and sections with their markup, and Layout Editor sheets. Distances are integer millimetres.';\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "    // MODULE CONSTANTS | R2 Judging (ValeVision only, DR-30: off until Adam switches it on)\n"
        "    // ------------------------------------------------------------\n"
        "    // On, a save also tells the editor Worker which drawings it was built\n"
        "    // on - the block's saved stamp as this window loaded or last saved it -\n"
        "    // and the Worker refuses the merge when R2's drawings have moved on since\n"
        "    // (merge-keys, Worker 1.6.0). Off, R2 is written unjudged, last writer\n"
        "    // wins, as TrueVision's is; on localhost the pre-save check against the\n"
        "    // drawings on disk (CheckBase) still runs before R2 is written.\n"
        "    // ------------------------------------------------------------\n"
        "    const Na__DrawData__R2_JUDGING = false;\n"
        "    // ------------------------------------------------------------\n",
        label='r2-flag')

    # 4b. SKELETON -------------------------------------------------------------------------------
    t = swap(t, "        block[Na__DrawData__CLIENT_DIMS_KEY] = false;\n"
                "        block[Na__DrawData__FLOOR_PLANS_KEY] = [];\n",
                "        block[Na__DrawData__CLIENT_DIMS_KEY] = false;\n"
                "        block[Na__DrawData__LAYOUT_MODE_KEY] = false;\n"
                "        block[Na__DrawData__FLOOR_PLANS_KEY] = [];\n",
                label='skeleton')

    # 4c. NORMALISE ------------------------------------------------------------------------------
    t = swap(t, "        if (typeof block[Na__DrawData__CLIENT_DIMS_KEY] !== 'boolean') block[Na__DrawData__CLIENT_DIMS_KEY] = false;\n",
                "        if (typeof block[Na__DrawData__CLIENT_DIMS_KEY] !== 'boolean') block[Na__DrawData__CLIENT_DIMS_KEY] = false;\n"
                "        if (typeof block[Na__DrawData__LAYOUT_MODE_KEY] !== 'boolean') block[Na__DrawData__LAYOUT_MODE_KEY] = false;\n",
                label='normalise')

    # 8b. R2 SAVE OPTIONS HELPER (after the pre-save check's helpers) ----------------------------
    t = swap(t,
        "        const pad = (n) => String(n).padStart(2, '0');\n"
        "        return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ' on ' + pad(date.getDate()) + '/' + pad(date.getMonth() + 1);\n"
        "    }\n"
        "    // ------------------------------------------------------------\n",
        "        const pad = (n) => String(n).padStart(2, '0');\n"
        "        return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ' on ' + pad(date.getDate()) + '/' + pad(date.getMonth() + 1);\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "\n"
        "    // HELPER FUNCTION | What R2 Is Asked to Judge a Save By (ValeVision only, DR-30)\n"
        "    // ------------------------------------------------------------\n"
        "    // Null while R2 judging is off: the save then reaches R2 exactly as\n"
        "    // TrueVision's does. On, the block's saved stamp as this window loaded\n"
        "    // or last saved it - 'iso:<stamp>', or 'none' for a block that never had\n"
        "    // one - which the editor Worker compares with the block R2 holds.\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__DrawData__R2SaveOptions() {\n"
        "        if (!Na__DrawData__R2_JUDGING) return null;\n"
        "        const iso = Na__DrawData__GetBlock()[Na__DrawData__SAVED_ISO_KEY];\n"
        "        return { drawingsBase : (typeof iso === 'string' && iso) ? 'iso:' + iso : 'none' };\n"
        "    }\n"
        "    // ------------------------------------------------------------\n",
        label='r2-options')

    # 4d. LAYOUT MODE REGION (between Common Title Block Fields and Scene Link Checks) ------------
    t = swap(t,
        "// endregion -------------------------------------------------------------------\n"
        "\n"
        "\n"
        "// -----------------------------------------------------------------------------\n"
        "// REGION | Scene Link Checks\n",
        "// endregion -------------------------------------------------------------------\n"
        "\n"
        "\n"
        "// -----------------------------------------------------------------------------\n"
        "// REGION | Layout Mode Switch (ValeVision only, DR-25)\n"
        "// -----------------------------------------------------------------------------\n"
        "\n"
        "    // FUNCTION | Is Layout Mode Switched On for This Project?\n"
        "    // ------------------------------------------------------------\n"
        "    // The per-project switch for the Layout Editor's drawing tabs, set in\n"
        "    // the localhost Dev menu and saved with the drawings. Absent reads as\n"
        "    // OFF, so a project nobody has laid out opens without them. Read on\n"
        "    // localhost and on the live site alike: the tabs show only while it is\n"
        "    // on and the project has a sheet (Na__LeLoad__IsAvailable,\n"
        "    // Na__LeMode__IsAvailable).\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__DrawData__GetLayoutModeEnabled() {\n"
        "        return Na__DrawData__GetBlock()[Na__DrawData__LAYOUT_MODE_KEY] === true;\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "\n"
        "    // FUNCTION | Switch Layout Mode On or Off for This Project\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__DrawData__SetLayoutModeEnabled(enabled) {\n"
        "        Na__DrawData__GetBlock()[Na__DrawData__LAYOUT_MODE_KEY] = (enabled === true);\n"
        "        return true;\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "// endregion -------------------------------------------------------------------\n"
        "\n"
        "\n"
        "// -----------------------------------------------------------------------------\n"
        "// REGION | Scene Link Checks\n",
        label='layout-region')

    # 7. SAVE COMMENT: the project file's name ----------------------------------------------------
    t = swap(t, '    // read-merge-write against TrueVision__ProjectData__.json. Nothing is\n',
                '    // read-merge-write against project.json. Nothing is\n', label='save-comment')

    # 8c. SAVE: R2 judging at the merge call ------------------------------------------------------
    t = swap(t,
        "            const result = await Na__CfApi__MergeAndSaveKeys(cloudKeys);\n"
        "            if (!result || !result.ok) {\n",
        "            const result = await Na__CfApi__MergeAndSaveKeys(cloudKeys, Na__DrawData__R2SaveOptions());   // <-- ValeVision (DR-30): judged on R2 only while R2 judging is on\n"
        "            if (result && result.conflict && report && typeof report === 'object') report.conflict = true;   // <-- ValeVision (DR-30): R2 refused it, its drawings had moved on\n"
        "            if (!result || !result.ok) {\n",
        label='save-r2')

    # 4e. EXPORTS --------------------------------------------------------------------------------
    t = swap(t, "        Na__DrawData__SetCommonField,\n",
                "        Na__DrawData__SetCommonField,\n"
                "        Na__DrawData__GetLayoutModeEnabled,                                  // <-- ValeVision only (DR-25, K2 X2)\n"
                "        Na__DrawData__SetLayoutModeEnabled,                                  // <-- ValeVision only (DR-25, K2 X2)\n",
                label='exports')

    # 6. CONSOLE PREFIX (every occurrence; TrueVision's count at the pin is 12) -------------------
    t = swap(t, '[TrueVision3D]', '[ValeVision3D]', count=12, label='console')

    # FINAL CHECKS -------------------------------------------------------------------------------
    # Nothing of TrueVision's identity may remain outside the PORT NOTE and the DEVELOPMENT LOG.
    head_end = t.index('// DEVELOPMENT LOG:')
    log_end = t.index('// =============================================================================\n', head_end)
    body = t[:t.index('// PORT NOTE:')] + t[log_end:]
    for marker in ('TRUEVISION3D', '[TrueVision3D', 'TrueVision__', 'TrueVision3D__', 'NaProjectPortal',
                   '30__TrueVision__AppContent', 'na-truevision-api', 'X-TrueVision-', '/api/truevision',
                   'na-projectvision-local-dev'):
        if marker in body:
            sys.exit(f'identity marker left outside the PORT NOTE / DEVELOPMENT LOG: {marker}')

    OUT.write_bytes(t.encode('ascii'))
    print('wrote', OUT, 'sha1', hashlib.sha1(t.encode('ascii')).hexdigest(), 'lines', t.count('\n'))


if __name__ == '__main__':
    build()
