#!/usr/bin/env python3
"""One-off patch of r2b_render.py (wording and data fixes after the first review)."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(HERE, 'r2b_render.py')
s = open(p, encoding='utf-8').read()


def rep(old, new):
    global s
    assert old in s, ('missing anchor', old[:100])
    s = s.replace(old, new, 1)


# 1. B.0 item 1 FILE-line wording
rep("""No twin\\'s `FILE` line disagrees with its file name except the two files K2 renames '
  '(FR-09, FR-10); the only VV file whose `FILE` line is not its name is a VV-only worker entry outside the drawing system.')""",
    """Every TV `FILE` line equals its file name, and so does every VV one except a VV-only worker entry '
  '(`62__Feature__EmailWorkers/CloudflareWorker/src/index.js`); between twins the `FILE` lines differ only where K2 renames the file '
  '(FR-09, FR-10) or where one side has no header block (4 legacy files, B.3.1).')""")

# 2. Seven -> Six
rep("w('2. **Seven path changes align every shared module name**", "w('2. **Six path changes align every shared module name**")

# 3. B.0 item 3 header wording
rep("{len(ns_missing)} have no header block on one side;", "{len(ns_missing)} lack the `FILE`/`NAMESPACE`/`MODULE` lines on one side;")

# 4. B.0 item 5 counts
rep("""'recounted exactly), plus the 8 ComposerPreset names W0-02 renames. 13 are kept as declared seams (Layout Mode, D33 styles, D28 filing, '
  'the loader facade), 3 disappear with whole-file ports (W1-21, W3-03), 2 need a ruling (`Na__ElevData__SetAzimuthDeg`, '
  f'`Na__ElevData__SetSeededFrom`). The 3D support modules the drawing system imports carry {len(vv_only_support)} more VV-only names, all kept.')""",
    """'recounted exactly), plus the 8 ComposerPreset names W0-02 renames. 13 are kept as declared seams (Layout Mode, D33 styles, D28 filing, '
  'the loader facade), 4 retire (three with whole-file ports in W1-21 and W3-03, and the `Na__ElevData__SetSeededFrom` setter, which '
  'DR-32 leaves without a writer), 1 needs a ruling (`Na__ElevData__SetAzimuthDeg`). The 3D support modules the drawing system imports '
  f'carry {len(vv_only_support)} more VV-only names, all kept.')""")

# 5. B.0 item 6
rep("""'W0-11; Invalidation 1 and ModelToggle 3 in W1-01; door module 6 in W1-02), plus the SectionAdapter\\'s four new calls (W2-02; names '
  f'proposed in B.3.5) and the two facades (W0-12). Every other TV-only name a TV drawing file imports ({miss_4055_names} names in '
  f'{len(miss_4055)} shared modules in 40-55) arrives with a whole-file port K3 already owns - except the 11 PlanDimensions getters '
  '(placement seam above).')""",
    """'W0-11; Invalidation 1 and ModelToggle 3 in W1-01; door module 6 in W1-02), plus the SectionAdapter\\'s four new calls (six names, '
  'W2-02; proposed in B.3.5) and the two facades (W0-12). Inside 40-55, TV drawing files import '
  f'{miss_4055_names} names that VV\\'s twins lack across {len(miss_4055)} modules: 4 resolve with the FR-09 rename, 11 are the PlanDimensions '
  f'getters (placement seam above), and the other {miss_4055_names - 15} arrive with the package K3 already assigns to each module.')""")

# 6. B.0 item 8 wording
rep("the 3D hotkey handler and the 21 Presentation Mode splits.", "the 3D hotkey handler and the folder-21 Presentation Mode splits.")

# 7. risk text: K2 phase labels
rep("""    n_imp = len(r['importers'])
    frows.append([r['id'], r['kind'], r['current_vv'], r['target_vv'] or '(retired)', r['tv_twin'] or '-',
                  f'{n_imp} files', r['risk'],""",
    """    n_imp = len(r['importers'])
    risk = r['risk']
    if risk.startswith('See TF row'):
        risk = 'Mechanical; scripted in W0-02 (Section A)'
    frows.append([r['id'], r['kind'], r['current_vv'], r['target_vv'] or '(retired)', r['tv_twin'] or '-',
                  f'{n_imp} files', risk,""")
rep("""    frows.append([r['id'], r['kind'], cur, tgt, twin, FR_WHY.get(r['id'], r['reason']), imp_txt, selfi, r['risk'],""",
    """    frows.append([r['id'], r['kind'], cur, tgt, twin, FR_WHY.get(r['id'], r['reason']), imp_txt, selfi,
                  r['risk'].replace('folders W1 renumbers', 'folders W0-02 renumbers'),""")

# 8. FR-16/17 counts
rep("""w('- **FR-16 / FR-17** must exist before the first TV module that imports them (27 TV files import `Na__CfApi__*`, 6 import '
  '`Na__LocalMirror__*` in the drawing system - B.3.5).')""",
    """w('- **FR-16 / FR-17** must exist before the first TV module that imports them: 16 TV drawing-system files import 21 of the 33 '
  '`Na__CfApi__*` names (27 TV files in all) and 6 import all 8 `Na__LocalMirror__*` names (S01-F13, recounted - B.3.5).')""")
rep("""'33 `Na__CfApi__*`, 8 `Na__LocalMirror__*` (TV\\'s names and signatures)', '27 and 6 TV drawing files import them',""",
    """'33 `Na__CfApi__*`, 8 `Na__LocalMirror__*` (TV\\'s names and signatures)', '16 TV drawing files import 21 `Na__CfApi__*` names (27 TV files in all); 6 import all 8 `Na__LocalMirror__*`',""")

# 9. support text
rep("""w(f'In the 3D support modules TV drawing files import ({len(vv_only_support)} names): all **kept**. None is imported by a TV file, and '
  'none shadows a TV name except the TiledRenderer pair in B.3.2.')""",
    """w(f'In the 3D support modules TV drawing files import ({len(vv_only_support)} names): all **kept**. TV code never needs them, and they '
  'shadow no TV name except the TiledRenderer pair in B.3.2.')""")

# 10. K2 K2 wording
rep("VV keeps the `CrossSection__SceneData` schema (K2 K2)", "VV keeps the `CrossSection__SceneData` schema (K2 rule K2, TD06)")

# 11. SectionAdapter proposed names
rep("""            'Proposed: `Na__DrawView__SectionAdapter__Serialize`, `__Apply`, `__GetAppearance`, `__SetAppearance`, `__SetModelRoot`, `__RenderDepthInto`',
            'Replaces TV SnapshotRenderer\\'s 41 imports (`Na__SectSerialize__Serialize/Apply` :213, `Na__SectCutCfg__Get/SetAppearance` :223, `Na__SectionCut__SetModelRoot` :244) and 49 RenderLayer\\'s `Na__SectionCut__RenderDepthInto` (:105)',
            'VV bodies over the 41 tool (W2-02); TV pass-throughs (WT-02). SetModelRoot and RenderDepthInto are named in S04a/S02b; the other four follow the 41 functions they stand in for - W2-02 confirms them and WT-02 must use the same',""",
    """            'Proposed: `Na__DrawView__SectionAdapter__Serialize`, `__Apply`, `__GetOutlineWidthPx`, `__SetOutlineWidthPx`, `__SetModelRoot`, `__RenderDepthInto`',
            'Replaces TV SnapshotRenderer\\'s 41 imports (`Na__SectSerialize__Serialize/Apply` :213, used :1008, :1050; `Na__SectCutCfg__Get/SetAppearance` :223, used for `lineWidthPx` only :877, :902, :956; `Na__SectionCut__SetModelRoot` :244, used :786, :819) and 49 RenderLayer\\'s `Na__SectionCut__RenderDepthInto` (:105)',
            'VV bodies over the 41 tool (W2-02: SerializeSections / ApplySerializedSections, GetAppearance / SetLineWidth, a no-op SetModelRoot, a cap-only depth render); TV pass-throughs (WT-02). SetModelRoot and RenderDepthInto are named in S04a/S02b; the other four are proposed here from K3\\'s wording - W2-02 fixes them and WT-02 uses the same',""")
rep("""'The four non-slice-named SectionAdapter calls (Serialize, Apply, Get/SetAppearance) are proposed names (B.3.5); W2-02 must fix them before WT-02 copies them.',""",
    """'The four non-slice-named SectionAdapter names (`__Serialize`, `__Apply`, `__GetOutlineWidthPx`, `__SetOutlineWidthPx`) are proposed here (B.3.5); W2-02 must fix them before WT-02 copies them.',""")

# 12. TV-only grouping: 41 belongs to the drawing group; refined not-gained prose
rep("""    ('Drawing core and drawing systems (40-50)', ['40__', '42__', '45__', '47__', '48__', '49__', '50__']),""",
    """    ('Drawing core and drawing systems (40-50)', ['40__', '41__', '42__', '45__', '47__', '48__', '49__', '50__']),""")
rep("""w(f'Drawing system and support modules: **{grand["n"]} files ({grand["lines"]:,} lines) gained**, {grand["not"]} TV-only files not gained. '
  f'Elsewhere in the tree VV gains {other_g} optional 3D-tab files (Cache & Storage panel and its sheet, W5-04, DR-44) and does not take {other_n} '
  '(TV 41 x7 by DIV-2; 62 AppInstallability x15, 75 x3, 76 x3, 01 ProjectDataLoader placeholder, 10 Hotkeys Manager, DIV-1 ProfileLines and '
  'PostProcessing setup; 3D-tab files with no package: 07 DefaultFogEffect, 11 ViewModeFov DevControls, 15 InstanceConsolidation and LineworkColours, '
  '21 Visibility StateCapture, 26 storey isolate/view and DevMenu files, 70 AssetCullDistance, the PwaInstallability and SceneInspector sheets). '
  f'Overall {len(gained)} gained of {len(tvo_rows)} TV-only code files.')""",
    """w(f'Drawing system and support modules: **{grand["n"]} files ({grand["lines"]:,} lines) gained**, {grand["not"]} TV-only files not gained, '
  'each for a recorded reason. '
  f'Elsewhere in the tree VV gains {other_g} optional 3D-tab files (Cache & Storage panel and its sheet, W5-04, DR-44) and does not take {other_n} '
  '(62 AppInstallability x15, 75 x3, 76 x3, the 01 ProjectDataLoader placeholder, 10 Hotkeys Manager, the PwaInstallability and SceneInspector '
  'sheets, and 3D-tab files no package names: 07 DefaultFogEffect, 11 ViewModeFov DevControls, 15 InstanceConsolidation and LineworkColours, '
  '21 Visibility StateCapture, 70 AssetCullDistance). '
  f'Overall {len(gained)} gained of {len(tvo_rows)} TV-only code files.')""")
rep("""NOT_REASON_SHORT = {
    'outside the drawing system, no package': '3D-tab file, no package',
}""",
    """NOT_REASON_SHORT = {
    'outside the drawing system, no package': '3D-tab storey and dev-menu files, no package',
}""")

# 13. 35 size note
rep("""    vrows.append(['`' + path.replace(M, '') + '`', size,""",
    """    if path.endswith('35__System__PageLayoutSystem/'):
        size += ' (incl. the 32,999-line vendored jsPDF)'
    vrows.append(['`' + path.replace(M, '') + '`', size,""")

# 14. open issue 4 wording
rep("""'W1-10\\'s adaptations re-apply only `Elevation__SeededFrom`; `Na__ElevData__STYLE_KEYS` (DR-32 D33) must also be re-added. `Na__ElevData__SetAzimuthDeg` and the `SetSeededFrom` setter lose their only caller when W2-05 replaces VV\\'s Elevation DevMenu Editor - rule keep or retire in W1-10/W2-05.',""",
    """'W1-10\\'s adaptations re-apply only `Elevation__SeededFrom`; `Na__ElevData__STYLE_KEYS` (DR-32 D33) must also be re-added. `Na__ElevData__SetAzimuthDeg` loses its only caller when W2-05 replaces VV\\'s Elevation DevMenu Editor with TV 2.1.0 - keep it as a FacePick seam or retire it (ruling for W1-10/W2-05); the `SetSeededFrom` setter retires under DR-32 (no new writes; the field is still read and preserved).',""")

open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('patched')
