p='build_w2_06.py'
s=open(p,encoding='utf-8').read()
def rep(old,new):
    global s
    assert s.count(old)==1, old[:60]
    s=s.replace(old,new)
rep("""def authored(lantern_file, vv_history):
    \"\"\"The K2 H5 'Authored in' lines for a folder-50 module ValeVision wrote first (port Phase 4).\"\"\"
    return [
        '// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.20.0, port Phase 4, from the Lantern',
        "//                   Designer's " + lantern_file + ' of 07-Aug-2026;',
        '//                   ' + vv_history + ');',
        '//                   since ported back whole from TrueVision3D (HEAD b2aa9151)',
    ]""","""def authored(lantern_file, vv_history):
    \"\"\"The K2 H5 'Authored in' lines for a folder-50 module ValeVision wrote first (port Phase 4).\"\"\"
    if lantern_file is None:
        first = ['// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.20.0, port Phase 4, a ValeVision',
                 '//                   original (D18);']
    else:
        first = ['// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.20.0, port Phase 4, from the Lantern',
                 "//                   Designer's " + lantern_file + ' of 07-Aug-2026;']
    return first + [
        '//                   ' + vv_history + ');',
        '//                   since ported back whole from TrueVision3D (HEAD b2aa9151)',
    ]""")
rep("""PORTED_ON = '// - Ported on     : ' + TODAY + ' for ValeVision3D ' + TOKEN + ' (W2-06, folder 50 to TrueVision HEAD; DR-01 (c), DR-31)'""",
    """PORTED_ON = '// - Ported on     : ' + TODAY + ' for ValeVision3D ' + TOKEN + ' (folder 50 to TrueVision HEAD)'""")
rep("""    *authored('VghLantern__ProjectedEdges__ authored-edge pass (D18)',""","""    *authored(None,""")
rep("""    "//   - The fixture keeps every number but no longer names the TrueVision project it was measured on",
    "//     (DESCRIPTION, the fixture region, its constant and four labels; S02b-F49), and the project prefix",
    "//     in front of a storey key is a neutral PRJ01__.",""","""    "//   - The fixture keeps every number but no longer names the TrueVision project it was measured on",
    "//     (DESCRIPTION, the fixture region and its constant, three check labels and one comment; S02b-F49),",
    "//     and the project prefix in front of a storey key is a neutral PRJ01__.",""")
open(p,'w',encoding='utf-8',newline='\n').write(s)
