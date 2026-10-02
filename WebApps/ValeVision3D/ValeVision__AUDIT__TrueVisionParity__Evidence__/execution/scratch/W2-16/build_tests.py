"""W2-16 tests: TV's Na__Test__HideSwings__ and Na__Test__SitePlanFaces__ at b2aa9151 -> tests_candidate/ (LF),
adapted only where they name TrueVision as the running app, its category token, or a Noble Architecture project
(as the W2-03 ElevationDepthFog port did, S02b-F49). Every replacement asserted."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
T = os.path.join(HERE, 'tv', '80__Testing__PrototypeEnvironment')
OUT = os.path.join(HERE, 'tests_candidate')
os.makedirs(OUT, exist_ok=True)
SEP = '// ' + '-' * 77


def rep(t, old, new, n=1):
    c = t.count(old)
    assert c == n, (c, n, old[:80])
    return t.replace(old, new)


def note_before_log(t, note):
    anchor = SEP + '\n//\n// DEVELOPMENT LOG:'
    return rep(t, anchor, SEP + '\n//\n' + note + '\n' + anchor)


# --- Hide swings ------------------------------------------------------------------------------------------
t = open(os.path.join(T, 'Na__Test__HideSwings__.test.mjs'), 'rb').read().decode('utf-8')
t = rep(t, '// TRUEVISION3D - TEST - HIDE SWINGS AND 1:200', '// VALEVISION3D - TEST - HIDE SWINGS AND 1:200')
t = rep(t, "on RB05 West Farm's four plans as\n//   they loaded on 21-Sep-2026", "on a measured project's four plans as\n//   they loaded on 21-Sep-2026")
t = rep(t, "console.log('\\nTrueVision3D - Hide swings and 1:200", "console.log('\\nValeVision3D - Hide swings and 1:200")
t = rep(t, "// RB05 D12's viewport as Adam's screenshot showed it", "// A measured roof plan viewport as Adam's screenshot showed it")
t = rep(t, "// REGION | Hide Swings (the shipped PlanDoors on RB05 West Farm)", "// REGION | Hide Swings (the shipped PlanDoors on a measured project's plans)")
t = rep(t, "(the shipped PlanDoors, RB05 West Farm\\'s plans)", "(the shipped PlanDoors, a measured project\\'s plans)")
t = rep(t, "// THE FIXTURE: RB05's four plans as the app loaded them", "// THE FIXTURE: a measured project's four plans as the app loaded them")
t = rep(t, "// <-- Not RB05's: a name that says nothing", "// <-- Not the project's: a name that says nothing")
t = rep(t, "check('RB05: only the Roof Plan hides", "check('the measured project: only the Roof Plan hides")
h = t.index('// DEVELOPMENT LOG:')
head, body = t[:h], t[h:]
assert body.count('TrueVision__') == 10, body.count('TrueVision__')
body = body.replace('TrueVision__', 'ValeVision__')
t = head + body
t = note_before_log(t, """// PORT NOTE:
// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__HideSwings__.test.mjs
// - Source version: 1.0.0 (TrueVision3D v2.140.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-16}}, with the viewport convergence that puts
//                   Hide swings on this app's plans
// - Parity        : adapted - every check is TrueVision's, run against this app's shipped config, PlanDoors,
//                   SheetRecords, Viewports, ScaleManager and storey level modules
// - Divergences   :
//   - Banner and the run's title line read ValeVision3D.
//   - Category keys carry this app's token (K2 K3): the door swing linework is
//     ValeVision__Linetype__DoorSwings, as this app's Layout Editor config and SheetSetup fallback name
//     it, and the fixture's furniture key is ValeVision__ too.
//   - The fixture keeps every plan name and cut height but no longer names the TrueVision project it
//     was measured on (as the ElevationDepthFog port did, S02b-F49).
// - Back-port     : none.
//""")
assert 'RB05' not in t and 'West Farm' not in t and 'TRUEVISION3D' not in t
open(os.path.join(OUT, 'Na__Test__HideSwings__.test.mjs'), 'wb').write(t.encode('utf-8'))

# --- Site plan faces --------------------------------------------------------------------------------------
t = open(os.path.join(T, 'Na__Test__SitePlanFaces__.test.mjs'), 'rb').read().decode('utf-8')
t = rep(t, '// TRUEVISION3D - TEST - SITE PLAN FACES', '// VALEVISION3D - TEST - SITE PLAN FACES')
t = rep(t, "//              RB05's real fill data", "//              a project's real fill data")
t = rep(t, "// - The second half reads RB05's proposed site plan fill GLBs straight off\n//   the repository",
        "// - The second half reads a project's proposed site plan fill GLBs straight off\n//   the repository")
t = rep(t, "Painted as outer rings alone, RB05's\n//   published D13 hatched grass", "Painted as outer rings alone, a\n//   published site plan hatched grass")
t = rep(t, "const RB05 = path.resolve(HERE, '../../../na-project-portal/26-Projects/RB05__WestFarm/30__TrueVision__AppContent/SitePlan__DrawingData__Proposed')",
        "const SITE = process.env.NA_TEST_SITEPLAN_DIR || path.resolve(HERE, '../../Whitecardopedia/Projects/2026/3047__Doous/SitePlan__DrawingData__Proposed')")
t = rep(t, "// Three holes on one face (RB05's Grassland)", "// Three holes on one face (a Grassland layer)")
t = rep(t, "// REGION | RB05's real fill data, when it is on this PC", "// REGION | A project's real fill data, when it is on this PC")
t = rep(t, "if (fs.existsSync(RB05)) {\n  const files = fs.readdirSync(RB05)", "if (fs.existsSync(SITE)) {\n  const files = fs.readdirSync(SITE)")
t = rep(t, "readFillGlb(path.join(RB05, name))", "readFillGlb(path.join(SITE, name))")
t = rep(t, "check('RB05 has at least one face with a hole", "check('the project has at least one face with a hole")
t = rep(t, "console.log('SKIP  RB05 proposed site plan data is not on this PC: ' + RB05)", "console.log('SKIP  no proposed site plan data on this PC: ' + SITE)")
t = note_before_log(t, """// PORT NOTE:
// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__SitePlanFaces__.test.mjs
// - Source version: 1.0.0 (TrueVision3D v2.160.0, 23-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-16}}, with the site plan painter (dormant,
//                   DR-08 (B))
// - Parity        : adapted - every check is TrueVision's, run against this app's shipped ShapeRings
// - Divergences   :
//   - Banner reads ValeVision3D.
//   - The real-data half reads this app's store layout (DR-29 (A)): a project folder's
//     SitePlan__DrawingData__Proposed beside its project.json in Whitecardopedia/Projects/<year>/,
//     3047__Doous by default or the folder NA_TEST_SITEPLAN_DIR names. No Vale project has site plan
//     data yet, so that half is skipped, not failed, exactly as TrueVision skips it off its own PC.
//   - The fixture and that half no longer name the TrueVision project they were written on (S02b-F49).
// - Back-port     : none.
//""")
assert 'RB05' not in t and 'na-project-portal' not in t and 'TRUEVISION3D' not in t and 'TrueVision__' not in t
open(os.path.join(OUT, 'Na__Test__SitePlanFaces__.test.mjs'), 'wb').write(t.encode('utf-8'))
print('tests built')
