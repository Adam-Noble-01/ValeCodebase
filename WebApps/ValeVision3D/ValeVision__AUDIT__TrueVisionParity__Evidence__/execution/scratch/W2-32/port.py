# W2-32 port script: takes TV's bytes at b2aa9151 (already fetched into ./tv by
# fetch_and_check.py), re-applies only the listed VV seams, and writes LF as
# git show returns it. Run with --dry to print the diffs without writing.
import os, sys, difflib

HERE = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(HERE, "tv")
VV = r"D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/"
SPEC = VV + "02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/"
TEST = VV + "80__Testing__PrototypeEnvironment/"
DRY = "--dry" in sys.argv
TVP = "02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/"


def read_tv(name):
    with open(os.path.join(TV, name), "rb") as f:
        return f.read().decode("utf-8")


def sub(text, old, new, count=1):
    n = text.count(old)
    if n != count:
        raise SystemExit("expected %d occurrence(s), found %d: %r" % (count, n, old[:120]))
    return text.replace(old, new)


def js_port_note(lines):
    return "// PORT NOTE:\n" + "".join("// " + l + "\n" if l else "//\n" for l in lines)


def write(path, text):
    data = text.encode("utf-8")
    if b"\r\n" in data:
        raise SystemExit("CRLF crept into " + path)
    if DRY:
        old = open(path, "rb").read().decode("utf-8").replace("\r\n", "\n") if os.path.exists(path) else ""
        sys.stdout.writelines(difflib.unified_diff(old.splitlines(True), text.splitlines(True), "vv/" + os.path.basename(path), "new/" + os.path.basename(path), n=1))
        return
    with open(path, "wb") as f:
        f.write(data)
    print("wrote", path, len(data), "bytes")


def banner_js(text, tv_banner):
    return sub(text, "// TRUEVISION3D - " + tv_banner + "\n", "// VALEVISION3D - " + tv_banner + "\n")


# -----------------------------------------------------------------------------
# 1. SpecMargin__Column__ 1.0.0 (new)
# -----------------------------------------------------------------------------
t = read_tv("Na__LayoutEditor__SpecMargin__Column__.js")
t = banner_js(t, "LAYOUT EDITOR - SPECIFICATION MARGIN - COLUMN")
t = sub(t,
    "// PORT NOTE:\n"
    "// - Authored in   : TrueVision3D first (22-Sep-2026), from SpecMargin 1.3.0\n"
    "// - ValeVision    : not yet ported. Nothing here is app-specific.\n",
    js_port_note([
        "- Ported from   : TrueVision3D " + TVP + "Na__LayoutEditor__SpecMargin__Column__.js",
        "- Source version: 1.0.0 (TrueVision3D v2.143.0, 22-Sep-2026; read at b2aa9151)",
        "- Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-32}}, the whole file, new to this",
        "                  app, with SpecMargin 1.5.0 and NoteRegions 1.0.1. TrueVision's v2.143.0",
        "                  entry is NOT tried by Adam; it comes across under DR-01 (c) and is named so.",
        "- Parity        : verbatim (the code is TrueVision 1.0.0's; the banner and this note are the",
        "                  only differences)",
        "- Divergences   :",
        "  - Banner reads ValeVision3D. (No console output in this file.)",
        "- Back-port     : none.",
    ]))
write(SPEC + "Na__LayoutEditor__SpecMargin__Column__.js", t)

# -----------------------------------------------------------------------------
# 2. NoteRegions__ 1.0.1 (new)
# -----------------------------------------------------------------------------
t = read_tv("Na__LayoutEditor__NoteRegions__.js")
t = banner_js(t, "LAYOUT EDITOR - OVERSPILL NOTE REGIONS")
t = sub(t,
    "// PORT NOTE:\n"
    "// - Authored in   : TrueVision3D first (22-Sep-2026)\n"
    "// - ValeVision    : not yet ported. Nothing here is app-specific.\n",
    js_port_note([
        "- Ported from   : TrueVision3D " + TVP + "Na__LayoutEditor__NoteRegions__.js",
        "- Source version: 1.0.1 (TrueVision3D v2.147.0, 22-Sep-2026; 1.0.0 came with v2.143.0;",
        "                  read at b2aa9151)",
        "- Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-32}}, the whole file, new to this",
        "                  app, with SpecMargin 1.5.0 (its only importer). No region can be drawn in",
        "                  ValeVision until the Region tool's grips and panel land (W3-11), so Place",
        "                  answers 'no regions' for every sheet until then. TrueVision's v2.143.0 and",
        "                  v2.147.0 entries are NOT tried by Adam; they come across under DR-01 (c)",
        "                  and are named so.",
        "- Parity        : verbatim (the code is TrueVision 1.0.1's; the banner and this note are the",
        "                  only differences)",
        "- Divergences   :",
        "  - Banner reads ValeVision3D. (No console output in this file.)",
        "- Back-port     : none.",
    ]))
write(SPEC + "Na__LayoutEditor__NoteRegions__.js", t)

# -----------------------------------------------------------------------------
# 3. SpecMargin__ 1.5.0 (whole file over VV 1.3.0)
# -----------------------------------------------------------------------------
t = read_tv("Na__LayoutEditor__SpecMargin__.js")
t = banner_js(t, "LAYOUT EDITOR - SPECIFICATION MARGIN")
t = sub(t,
    "// PORT NOTE:\n"
    "// - Authored in   : TrueVision3D first (14-Sep-2026)\n"
    "// - ValeVision    : not yet ported. Nothing here is app-specific.\n",
    js_port_note([
        "- Ported from   : TrueVision3D " + TVP + "Na__LayoutEditor__SpecMargin__.js",
        "- Source version: 1.5.0 (TrueVision3D v2.147.0, 22-Sep-2026; 1.4.0 came with v2.143.0;",
        "                  read at b2aa9151)",
        "- Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-32}}, the whole file. This app's",
        "                  copy was ported 14-Sep-2026 and aligned the same day with TrueVision 1.3.0",
        "                  (pipe layout, right padding, 2 mm body, stretching gaps); 1.4.0's regions",
        "                  and 1.5.0's leaderless groups are new here. A sheet with neither plans,",
        "                  draws and reports as 1.3.0 did (checked primitive for primitive). TrueVision's",
        "                  v2.143.0 and v2.147.0 entries are NOT tried by Adam; they come across under",
        "                  DR-01 (c) and are named so.",
        "- Parity        : verbatim (the code is TrueVision 1.5.0's; the banner and this note are the",
        "                  only differences)",
        "- Divergences   :",
        "  - Banner reads ValeVision3D. (No console output in this file.)",
        "  - The PdfExporter's 'fits nowhere' toast named in INTEGRATION arrives with PdfExporter",
        "    1.12.0 (W3-16); until then ValeVision's exporter warns only while the margin is on.",
        "- Back-port     : none.",
    ]))
write(SPEC + "Na__LayoutEditor__SpecMargin__.js", t)

# -----------------------------------------------------------------------------
# 4. Panel__MarginNotes__Leaderless__ 1.0.0 (new; registered by W3-11's panel)
# -----------------------------------------------------------------------------
t = read_tv("Na__LayoutEditor__Panel__MarginNotes__Leaderless__.js")
t = banner_js(t, "LAYOUT EDITOR - PANEL: MARGIN NOTES - LEADERLESS NOTES")
t = sub(t,
    "// PORT NOTE:\n"
    "// - Authored in   : TrueVision3D first (22-Sep-2026)\n"
    "// - ValeVision    : not yet ported - it goes with the rest of the margin's\n"
    "//                   regions and leaderless notes.\n",
    js_port_note([
        "- Ported from   : TrueVision3D " + TVP + "Na__LayoutEditor__Panel__MarginNotes__Leaderless__.js",
        "- Source version: 1.0.0 (TrueVision3D v2.147.0, 22-Sep-2026; read at b2aa9151)",
        "- Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-32}}, the whole file, new to this",
        "                  app. It lands inert: Na__LayoutEditor__Panel__MarginNotes__ 1.2.0 (W3-11)",
        "                  is the module that builds, refreshes and registers it, so until then",
        "                  nothing imports it and the Margin Notes panel shows no Leaderless Notes",
        "                  section. TrueVision's v2.147.0 entry is NOT tried by Adam; it comes across",
        "                  under DR-01 (c) and is named so.",
        "- Parity        : verbatim (the code is TrueVision 1.0.0's; the banner and this note are the",
        "                  only differences)",
        "- Divergences   :",
        "  - Banner reads ValeVision3D. (No console output in this file.)",
        "- Back-port     : none.",
    ]))
write(SPEC + "Na__LayoutEditor__Panel__MarginNotes__Leaderless__.js", t)

# -----------------------------------------------------------------------------
# 5. MarginGrip__ 1.3.0, with 1.1.0's IsMoveAuto line held for W3-03
# -----------------------------------------------------------------------------
t = read_tv("Na__LayoutEditor__MarginGrip__.js")
t = banner_js(t, "LAYOUT EDITOR - MARGIN GRIP")
t = sub(t,
    "// PORT NOTE:\n"
    "// - Authored in   : TrueVision3D first (14-Sep-2026)\n"
    "// - ValeVision    : not yet ported. Nothing here is app-specific.\n",
    js_port_note([
        "- Ported from   : TrueVision3D " + TVP + "Na__LayoutEditor__MarginGrip__.js",
        "- Source version: 1.3.0 (TrueVision3D v2.143.0, 22-Sep-2026; 1.2.0 v2.111.0, 1.1.0 v2.78.0;",
        "                  read at b2aa9151)",
        "- Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-32}}, the whole file over this app's",
        "                  1.0.0 (ported 14-Sep-2026; it differed from TrueVision 1.0.0 in nothing but",
        "                  the banner). 1.2.0 places the grip when a zoom settles; 1.3.0's badge counts",
        "                  only the margin's own lost notes (Report's marginLost). TrueVision's",
        "                  v2.143.0 and v2.111.0 entries are NOT tried by Adam; they come across under",
        "                  DR-01 (c) and are named so.",
        "- Parity        : adapted (TrueVision 1.3.0's code less one held term, below)",
        "- Divergences   :",
        "  - Banner reads ValeVision3D. (No console output in this file.)",
        "  - 1.1.0's Na__LeTools__IsMoveAuto is held: neither imported nor asked in Render, so the",
        "    grip shows under Select only. ValeVision's SheetTools does not export IsMoveAuto",
        "    until the SheetTools hub lands it (W3-03), and the automatic Move it answers for is",
        "    DR-40 item 7, held until Adam confirms it. W3-03 restores the import and the",
        "    '|| Na__LeTools__IsMoveAuto()' term; delete this bullet then.",
        "- Back-port     : none.",
    ]))
t = sub(t,
    "    import { Na__LeTools__CHANGED_EVENT, Na__LeTools__TOOL_SELECT, Na__LeTools__GetTool, Na__LeTools__IsMoveAuto } from '../30__System__SheetTools/Na__LayoutEditor__SheetTools__.js';\n",
    "    import { Na__LeTools__CHANGED_EVENT, Na__LeTools__TOOL_SELECT, Na__LeTools__GetTool } from '../30__System__SheetTools/Na__LayoutEditor__SheetTools__.js';   // <-- VV: IsMoveAuto held until the SheetTools hub (W3-03); see PORT NOTE\n")
t = sub(t,
    "        grip.hidden = !(Na__LeMarginGrip__Editable && (Na__LeMarginGrip__Drag || Na__LeTools__GetTool() === Na__LeTools__TOOL_SELECT || Na__LeTools__IsMoveAuto()));   // <-- A Move that came up by itself is still Select at rest: picking a note must not take the grip away\n",
    "        grip.hidden = !(Na__LeMarginGrip__Editable && (Na__LeMarginGrip__Drag || Na__LeTools__GetTool() === Na__LeTools__TOOL_SELECT));   // <-- VV: TrueVision also keeps it up under an automatic Move (IsMoveAuto), held until W3-03; see PORT NOTE\n")
write(SPEC + "Na__LayoutEditor__MarginGrip__.js", t)

# -----------------------------------------------------------------------------
# 6. Styles__Specification__Notes__.css (the sheet whole)
# -----------------------------------------------------------------------------
t = read_tv("Na__LayoutEditor__Styles__Specification__Notes__.css")
t = sub(t,
    "/* REGION  |  TrueVision3D - Layout Editor Styles (specification notes)*/\n",
    "/* REGION  |  ValeVision3D - Layout Editor Styles (specification notes)*/\n")
t = sub(t,
    "/*\n"
    " * PORT NOTE:\n"
    " * - Ported from : split out of Na__LayoutEditor__Styles__Specification__.css (15-Sep-2026, TrueVision3D v2.55.0), rules moved verbatim\n"
    " * - Parity      : the split ValeVision3D made in v2.47.0; ValeVision's copy holds the same regions\n"
    " * - Loads       : imported by Na__CoreUi__Styles__Index__.css straight after Styles__Specification, so the cascade order is unchanged\n"
    " */\n",
    "/*\n"
    " * PORT NOTE:\n"
    " * - Ported from   : TrueVision3D " + TVP + "Na__LayoutEditor__Styles__Specification__Notes__.css\n"
    " * - Source version: none of its own - the sheet as TrueVision3D v2.147.0 left it (22-Sep-2026; read at\n"
    " *                   b2aa9151). This app split it out of Styles__Specification first (15-Sep-2026, v2.47.0);\n"
    " *                   TrueVision made the same split in its v2.55.0.\n"
    " * - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-32}} - whole. New here: the regions \"Overspill\n"
    " *                   Note Regions in the Margin Notes Panel\" and \"on the Paper\" (TrueVision v2.143.0) and\n"
    " *                   \"Leaderless Notes in the Margin Notes Panel\" (v2.147.0); every rule this app already\n"
    " *                   had is unchanged. Both releases are NOT tried by Adam in TrueVision (DR-01 (c)).\n"
    " * - Parity        : verbatim (every rule and comment is TrueVision's; the banner and this note are the\n"
    " *                   only differences)\n"
    " * - Divergences   :\n"
    " *   - Banner reads ValeVision3D.\n"
    " *   - Loads: linked by Na__LayoutEditor__Loader__.js straight after Styles__Specification (TrueVision\n"
    " *     imports it from Na__CoreUi__Styles__Index__.css), so the cascade order is the same.\n"
    " * - Back-port     : none.\n"
    " */\n")
write(SPEC + "Na__LayoutEditor__Styles__Specification__Notes__.css", t)


# -----------------------------------------------------------------------------
# 7. The two tests
# -----------------------------------------------------------------------------
def test_port_note(name, srcver, extra, divergences):
    return ("// -----------------------------------------------------------------------------\n"
            "//\n"
            + js_port_note([
                "- Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/" + name,
                "- Source version: " + srcver,
            ] + extra + [
                "- Divergences   :",
                "  - Banner and the run's title line read ValeVision3D.",
            ] + divergences + [
                "- Back-port     : none.",
            ])
            + "//\n")


t = read_tv("Na__Test__NoteRegions__.test.mjs")
t = sub(t, "// TRUEVISION3D - TEST - OVERSPILL NOTE REGIONS\n", "// VALEVISION3D - TEST - OVERSPILL NOTE REGIONS\n")
t = sub(t,
    "// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n",
    test_port_note("Na__Test__NoteRegions__.test.mjs",
        "1.0.1 (TrueVision3D v2.147.0, 22-Sep-2026; read at b2aa9151)",
        ["- Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-32}}, with SpecMargin 1.5.0, its",
         "                  Column and NoteRegions; it loads this app's own shipped modules and config.",
         "- Parity        : verbatim"],
        [])
    + "// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n")
t = sub(t,
    "console.log('TrueVision3D - overspill note regions: the record, the model, and where every note goes');\n",
    "console.log('ValeVision3D - overspill note regions: the record, the model, and where every note goes');\n")
write(TEST + "Na__Test__NoteRegions__.test.mjs", t)

t = read_tv("Na__Test__LeaderlessNotes__.test.mjs")
t = sub(t, "// TRUEVISION3D - TEST - LEADERLESS NOTES\n", "// VALEVISION3D - TEST - LEADERLESS NOTES\n")
t = sub(t,
    "// - RB05's D01 (Project Introduction), as the project file has it today:\n"
    "//   ticking the IN group puts IN01-IN09 at the top of its margin.\n",
    "// - 3047__Doous's first sheet, as the project file has it today (a ValeVision\n"
    "//   project in Whitecardopedia/Projects): ticking its first group that is not\n"
    "//   general puts that group's notes at the top of its margin.\n")
t = sub(t,
    "    // Swappable, so the RB05 check below can put the real one in.\n",
    "    // Swappable, so the project-file check below can put the real one in.\n")
t = sub(t,
    "// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n",
    test_port_note("Na__Test__LeaderlessNotes__.test.mjs",
        "1.0.0 (TrueVision3D v2.147.0, 22-Sep-2026; read at b2aa9151)",
        ["- Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-32}}, with SpecMargin 1.5.0, its",
         "                  Column and NoteRegions; it loads this app's own shipped modules and config.",
         "- Parity        : adapted (one fixture replaced, below)"],
        ["  - The last region reads a ValeVision project, not TrueVision's RB05 D01 from the",
         "    Noble Architecture project portal: 3047__Doous's first sheet with its first group",
         "    that is not general ticked, the same three checks against its own notes (SKIP when",
         "    the project is not on this machine). VV_PROJECTS_ROOT points it elsewhere."])
    + "// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n")
t = sub(t,
    "console.log('TrueVision3D - leaderless notes: the record, the model, and what the sheet lists');\n",
    "console.log('ValeVision3D - leaderless notes: the record, the model, and what the sheet lists');\n")

start = t.index("// -----------------------------------------------------------------------------\n// REGION | RB05 D01, as the Project File Has It\n")
end = t.index("// endregion -------------------------------------------------------------------\n", start)
FIXTURE = r"""// -----------------------------------------------------------------------------
// REGION | 3047__Doous, as the Project File Has It
// -----------------------------------------------------------------------------

    console.log('\n  3047__Doous, its first sheet, from the project file on this machine');
    const PROJECT = [
        process.env.VV_PROJECTS_ROOT,
        resolve(SCRIPT_DIR, '..', '..', 'Whitecardopedia', 'Projects')
    ].filter(Boolean).map((dir) => join(dir, '2026', '3047__Doous')).find((dir) => existsSync(join(dir, 'ValeVision__DrawingNotes__.json')) && existsSync(join(dir, 'project.json')));
    const projectNotes = PROJECT ? JSON.parse(readFileSync(join(PROJECT, 'ValeVision__DrawingNotes__.json'), 'utf8')) : null;
    const projectData  = PROJECT ? JSON.parse(readFileSync(join(PROJECT, 'project.json'), 'utf8')) : null;
    const projectSheet = projectData && projectData.LayoutEditor__DrawingsData ? (projectData.LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__Sheets || [])[0] : null;
    const projectGroup = projectNotes ? (projectNotes.ProjectSpecification__Groups || []).find((g) => !g.Group__IsGeneral && (g.Group__Notes || []).length) : null;
    if (!projectSheet || !projectGroup) {
        console.log('  SKIP  3047__Doous is not on this machine, or has no sheet or no group that is not general');
    } else {
        const sheet   = JSON.parse(JSON.stringify(projectSheet));
        const groups  = projectNotes.ProjectSpecification__Groups;
        const entries = [];
        groups.forEach((group, g) => (group.Group__Notes || []).forEach((note, i) => entries.push({ group : group, groupIndex : g, index : i, order : entries.length, code : note.Note__Code, note : note })));
        const linkedIds = new Set((sheet.Sheet__Leaders || []).filter((l) => l.Leader__Type === 'bubble').map((l) => l.Leader__SpecNoteId).filter(Boolean));   // <-- Its bubbles' links, as SpecLinks reads them
        SPEC = { groups : groups, entries : entries, linked : linkedIds };
        const codesIn = projectGroup.Group__Notes.map((n) => n.Note__Code);
        Records.Na__LeRec__NormaliseMarginNotes(sheet);
        const before  = listed(sheet);
        sheet.Sheet__MarginNotes = Object.assign({}, sheet.Sheet__MarginNotes, { Enabled : true, LeaderlessOn : true, LeaderlessGroups : [ projectGroup.Group__Id ] });   // <-- Its margin switched on, so the margin is where they go
        Records.Na__LeRec__NormaliseMarginNotes(sheet);
        const after   = listed(sheet);
        check('the sheet lists no ' + projectGroup.Group__Prefix + ' note today but those its bubbles point at', before.filter((c) => codesIn.indexOf(c) !== -1), codesIn.filter((c) => entries.some((e) => e.code === c && linkedIds.has(e.note.Note__Id))));
        check('ticked: the ' + projectGroup.Group__Prefix + ' group leads its list, then everything else it listed before, in the same order', after, codesIn.concat(before.filter((c) => codesIn.indexOf(c) === -1)));
        const sheetPlace = place(sheet);
        check('...and they are the margin\'s (the sheet has no region)', codesOf(sheet, sheetPlace.marginList).slice(0, codesIn.length), codesIn);
    }

"""
t = t[:start] + FIXTURE + t[end:]
write(TEST + "Na__Test__LeaderlessNotes__.test.mjs", t)
print("done")
