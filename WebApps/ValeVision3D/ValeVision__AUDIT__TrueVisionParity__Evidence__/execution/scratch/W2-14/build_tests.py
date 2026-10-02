"""W2-14 builder, part 2: the composites test and its proof page (TV at b2aa9151, VV seams asserted),
plus staged copies of the AppConfig and the AppConfig parity test allow-list (read from the live files)."""
import os, json, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(HERE, 'tv')
OUT = os.path.join(HERE, 'out')
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'


def sub(text, old, new, count=1):
    found = text.count(old)
    assert found == count, (found, count, old[:120])
    return text.replace(old, new)


# ---- composites test --------------------------------------------------------------------------------------------
t = open(os.path.join(TV, 'Na__Test__SitePlanComposites__.test.mjs'), 'rb').read().decode('utf-8')
assert '\r\n' not in t
t = sub(t, '// TRUEVISION3D - TEST - SITE PLAN COMPOSITES (the subtype, the decks, the Z-order)\n',
        '// VALEVISION3D - TEST - SITE PLAN COMPOSITES (the subtype, the decks, the Z-order)\n')
t = sub(t,
        "// -----------------------------------------------------------------------------\n"
        "//\n"
        "// DEVELOPMENT LOG:\n"
        "// 22-Sep-2026 - Version 1.0.1\n",
        "// -----------------------------------------------------------------------------\n"
        "//\n"
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__SitePlanComposites__.test.mjs\n"
        "// - Source version: 1.0.1 (as it stands at TrueVision3D v2.172.0, 01-Oct-2026: its checks were extended\n"
        "//                   after 1.0.1 with no log entry; read at b2aa9151)\n"
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-14}}\n"
        "// - Parity        : adapted (every check is TrueVision's). It reads this app's shipped modules and config,\n"
        "//                   and the shared SketchUp SSOT where this machine has it, as in TrueVision. Its later\n"
        "//                   sections need the site plan painter, Viewport2d__Linework's site bands and EdgeStyles'\n"
        "//                   site defaults, which come across whole with the viewport convergence (W2-16); until then\n"
        "//                   the run stops at the StyleBands section.\n"
        "// - Divergences   :\n"
        "//   - Banner reads ValeVision3D.\n"
        "//   - The SSOT's stems are TrueVision__SitePlan__ (the shared data) and are asserted as such; where a stem\n"
        "//     is handed to one of this app's modules it is first read the way this app's site plan store reads it,\n"
        "//     ValeVision__SitePlan__ (VvStem below), and the record normaliser is given this app's prefix.\n"
        "//   - Two check labels name this app where TrueVision's name TrueVision as the running app.\n"
        "// - Back-port     : none.\n"
        "//\n"
        "// -----------------------------------------------------------------------------\n"
        "//\n"
        "// DEVELOPMENT LOG:\n"
        "// 22-Sep-2026 - Version 1.0.1\n")
t = sub(t,
        "  if (!ok) console.log(`        got  ${JSON.stringify(got)}\\n        want ${JSON.stringify(want)}`)\n}\n",
        "  if (!ok) console.log(`        got  ${JSON.stringify(got)}\\n        want ${JSON.stringify(want)}`)\n}\n"
        "\n"
        "// VALEVISION3D SEAM. The shared SSOT and GLB Builder name site plan stems TrueVision__SitePlan__; this app's\n"
        "// store reads them as ValeVision__SitePlan__ (Na__SpStore__VvStem), so a stem taken from the SSOT is renamed\n"
        "// the same way before it reaches one of this app's modules.\n"
        "const VvStem = (stem) => String(stem).replace(/^TrueVision__SitePlan__/, 'ValeVision__SitePlan__')\n",
        count=1)
t = sub(t, "check('EVERY site plan line type is a TrueVision EdgeStyles line type',",
        "check('EVERY site plan line type is a ValeVision EdgeStyles line type',")
t = sub(t, "check('changed or removed water is dotted in SketchUp and TrueVision, with no wash or ripple',",
        "check('changed or removed water is dotted in SketchUp and ValeVision, with no wash or ripple',")
t = sub(t, "  const key = tag.SitePlan__ExportFileNameStem\n", "  const key = VvStem(tag.SitePlan__ExportFileNameStem)\n")
t = sub(t, "const waterKey = REMOVED_WATER.SitePlan__ExportFileNameStem\n", "const waterKey = VvStem(REMOVED_WATER.SitePlan__ExportFileNameStem)\n")
t = sub(t, "E.Na__LeEdge__IsColour, E.Na__LeEdge__IsLineType, 'TrueVision__SitePlan__')\n",
        "E.Na__LeEdge__IsColour, E.Na__LeEdge__IsLineType, 'ValeVision__SitePlan__')\n")
t = sub(t, "const savedKey = 'TrueVision__SitePlan__Decking'\n", "const savedKey = 'ValeVision__SitePlan__Decking'\n")
open(os.path.join(OUT, 'Na__Test__SitePlanComposites__.test.mjs'), 'wb').write(t.encode('utf-8'))
print('composites test', len(t))

shutil.copyfile(os.path.join(TV, 'Na__Test__SitePlanComposites__Output__.html'), os.path.join(OUT, 'Na__Test__SitePlanComposites__Output__.html'))
print('output html copied verbatim')

# ---- AppConfig (live file, its own line endings) ------------------------------------------------------------------
cfg_path = os.path.join(VV, r'02__Src__AppModules\51__System__LayoutEditor\03__Core__Config\Na__LayoutEditor__AppConfig__.json')
raw = open(cfg_path, 'rb').read()
nl = b'\r\n' if b'\r\n' in raw else b'\n'
c = raw.decode('utf-8')
NL = nl.decode()
anchor = '        "LayoutEditor__Sheet__PaperSizes": {' + NL
c = sub(c, anchor,
        '        "LayoutEditor__Sheet__SitePlanDrawingsEnabled": false,' + NL +
        '        "LayoutEditor__Sheet__SitePlanDrawingsEnabledNote": "ValeVision only: whether the Sheet panel offers the Drawing Type row (Architectural Drawing / Site Plan Drawing), the one way a sheet becomes a site plan drawing. Off until Vale has a site plan data pipeline (DR-08 (B)): the site plan code is present either way, dormant, so switching it on is this one value once a project folder holds SitePlan__DrawingData__Existing or SitePlan__DrawingData__Proposed. Read by the Sheet panel when it is taken whole from TrueVision (Panel__Sheet 1.4.0). TrueVision has no such switch and always builds the row; it is offered to TrueVision (DR-42 item 8).",' + NL +
        anchor)
c = sub(c,
        '"LayoutEditor__Labels__SitePlanNoData": "No site plan data for this project. In SketchUp: GLB Builder, Export Site Plan Data, into the project folder\'s SitePlan__DrawingData.",',
        '"LayoutEditor__Labels__SitePlanNoData": "No site plan data for this project. In SketchUp: GLB Builder, Export Site Plan Data, into the project folder\'s SitePlan__DrawingData__Existing or SitePlan__DrawingData__Proposed.",')
json.loads(c)
os.makedirs(os.path.join(OUT, 'live'), exist_ok=True)
open(os.path.join(OUT, 'live', 'Na__LayoutEditor__AppConfig__.json'), 'wb').write(c.encode('utf-8'))
print('appconfig staged; newline', repr(nl))

# ---- AppConfig parity test: allow-list rows for the two VV-only keys (live file, its own line endings) -------------
pt_path = os.path.join(VV, r'80__Testing__PrototypeEnvironment\Na__Test__AppConfigParity__.test.mjs')
raw = open(pt_path, 'rb').read()
nl = '\r\n' if b'\r\n' in raw else '\n'
p = raw.decode('utf-8')
p = sub(p,
        "// DEVELOPMENT LOG:" + nl + "// 02-Oct-2026 - Version 1.0.4 (v2.71.3)" + nl,
        "// DEVELOPMENT LOG:" + nl +
        "// 02-Oct-2026 - Version 1.0.5 ({{VVREL:W2-14}})" + nl +
        "// - Two entries added with the dormant site plan client (W2-14): the" + nl +
        "//   switch that keeps the Sheet panel's Drawing Type row hidden until" + nl +
        "//   Vale has a site plan pipeline, Sheet SitePlanDrawingsEnabled, and its" + nl +
        "//   note - keys only this app has (decision, DR-08 (B); offered to" + nl +
        "//   TrueVision under DR-42 (8)). The SitePlanNoData label's existing" + nl +
        "//   identity entry now names the two store folders." + nl +
        "//" + nl +
        "// 02-Oct-2026 - Version 1.0.4 (v2.71.3)" + nl)
p = sub(p,
        "        [ 'vv-only', 'Statement/EnabledNote',                  'decision',  'Adam (DR-10)', 'says what the switch does' ]" + nl +
        "    ];" + nl,
        "        [ 'vv-only', 'Statement/EnabledNote',                  'decision',  'Adam (DR-10)', 'says what the switch does' ]," + nl +
        nl +
        "        // SITE PLANS (dormant, DR-08 (B))" + nl +
        "        [ 'vv-only', 'Sheet/SitePlanDrawingsEnabled',          'decision',  'Adam (DR-08)', 'the Drawing Type row is offered only when this is true (read by Panel__Sheet 1.4.0, W4-10)' ]," + nl +
        "        [ 'vv-only', 'Sheet/SitePlanDrawingsEnabledNote',      'decision',  'Adam (DR-08)', 'says what the switch does' ]" + nl +
        "    ];" + nl)
open(os.path.join(OUT, 'live', 'Na__Test__AppConfigParity__.test.mjs'), 'wb').write(p.encode('utf-8'))
print('parity test staged; newline', repr(nl))
