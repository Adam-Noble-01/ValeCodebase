# =============================================================================
# W1-12 SCRATCH - BUILD THE ProjectData CANDIDATE (never shipped)
# =============================================================================
#
# Reads the LIVE Na__DrawView__ProjectData__.js (as W1-05 landed it, sha1-checked),
# applies the W1-12 seams as exact insertions - each anchor asserted to occur
# exactly once, no existing line altered except the PORT NOTE's own VV text -
# and writes candidate__Na__DrawView__ProjectData__.js beside this script.
# The file is LF (W1-05 wrote TrueVision's text as git show returns it); LF is kept.
#
# Seams (all ValeVision-only, declared in the PORT NOTE):
#   1. PORT NOTE Divergences: THE DOCUMENT CODE bullet (with the VVREL placeholder)
#   2. PORT NOTE Back-port: the accessor offer
#   3. A separate VV-only import block (facade GetLoadedProjectData; ProjectLoader
#      InitMasterIndex / GetYearFromUrl / GetProjectFolderFromUrl) - TV's import lines untouched
#   4. A new region "Document Code (ValeVision only, DR-11)" after the Layout Mode region
#   5. One export line after the two Layout Mode exports
#
# =============================================================================

import hashlib
import os
import sys

HERE      = os.path.dirname(os.path.abspath(__file__))
LIVE      = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\40__System__DrawingViewCore\Na__DrawView__ProjectData__.js'
OUT       = os.path.join(HERE, 'candidate__Na__DrawView__ProjectData__.js')
LIVE_SHA1 = '5b35803a6d1e6d044f9cd7a16172a03bdda2eb9a'      # <-- W1-05's landed file

raw = open(LIVE, 'rb').read()
got = hashlib.sha1(raw).hexdigest()
if got != LIVE_SHA1:
    sys.exit('STOP: the live ProjectData is not the file W1-05 landed (sha1 %s, expected %s)' % (got, LIVE_SHA1))
if b'\r\n' in raw:
    sys.exit('STOP: expected an LF file')
text = raw.decode('utf-8')


def replace_once(source, old, new, label):
    count = source.count(old)
    if count != 1:
        sys.exit('STOP: anchor "%s" found %d times (expected 1)' % (label, count))
    return source.replace(old, new, 1)


# HOUSE RULES, read off the file itself so the new region matches them exactly
REGION_RULE   = '// ' + '-' * 77
ENDREGION     = '// endregion ' + '-' * 67
FUNCTION_RULE = '    // ' + '-' * 60
for rule, label in ((REGION_RULE, 'region rule'), (ENDREGION, 'endregion line'), (FUNCTION_RULE, 'function rule')):
    if (rule + '\n') not in text:
        sys.exit('STOP: house rule "%s" not found as a whole line' % label)


# -----------------------------------------------------------------------------
# 1. PORT NOTE - Divergences: the document code
# -----------------------------------------------------------------------------
OLD_1 = (
    "//   - THE LAYOUT MODE SWITCH (DR-25): LayoutEditor__DrawingsData__LayoutModeEnabled - its key, its\n"
    "//     skeleton and Normalise lines (absent reads as off) and two ValeVision-only exports (K2 X2),\n"
    "//     Na__DrawData__GetLayoutModeEnabled and Na__DrawData__SetLayoutModeEnabled, which the Layout Editor's\n"
    "//     loader and mode controller read.\n"
)
NEW_1 = OLD_1 + (
    "//   - THE DOCUMENT CODE (DR-11): a third ValeVision-only export (K2 X2), Na__DrawData__GetDocumentCode -\n"
    "//     the loaded project.json's projectCode (Na__CfApi__GetLoadedProjectData), else the projectCode of the\n"
    "//     master-index entry the ?project= token names, else null - for every DOCUMENT use: Document IDs and the\n"
    "//     drawing number default, the register and specification numbers, PDF names and picture folders.\n"
    "//     Na__DrawData__GetProjectCode stays TrueVision's: the ?project= token (normally the folderId,\n"
    "//     2026/3047__Doous) that every save is addressed by (/api/projects/<token>). Its region and its import\n"
    "//     block are ValeVision's alone. Added 01-Oct-2026 for ValeVision3D {{VVREL:W1-12}}.\n"
)
text = replace_once(text, OLD_1, NEW_1, 'PORT NOTE layout-mode bullet')


# -----------------------------------------------------------------------------
# 2. PORT NOTE - Back-port: the accessor offer
# -----------------------------------------------------------------------------
OLD_2 = (
    "// - Back-port     : R2 judging, once switched on and proved (TrueVision's v2.146.0 log lists R2 as not\n"
    "//                   judged). The Layout Mode switch only if TrueVision takes it (DR-25).\n"
)
NEW_2 = (
    "// - Back-port     : R2 judging, once switched on and proved (TrueVision's v2.146.0 log lists R2 as not\n"
    "//                   judged). The Layout Mode switch only if TrueVision takes it (DR-25). The document code:\n"
    "//                   were TrueVision to export the same accessor (answering its own ?project= code), the\n"
    "//                   document seams in SheetRecords, SpecPdf, PdfExporter, Register__Pdf and Sheet Images\n"
    "//                   would disappear (DR-42: none happen by default).\n"
)
text = replace_once(text, OLD_2, NEW_2, 'PORT NOTE back-port')


# -----------------------------------------------------------------------------
# 3. Imports - a separate ValeVision-only block (TrueVision's import lines untouched)
# -----------------------------------------------------------------------------
OLD_3 = (
    "    import { Na__LocalMirror__MergeKeys, Na__LocalMirror__DrawingsFingerprint } from '../03__AppUtils/Na__AppUtils__LocalProjectMirror__.js';\n"
    + FUNCTION_RULE + "\n"
    "\n"
    + ENDREGION + "\n"
)
NEW_3 = (
    "    import { Na__LocalMirror__MergeKeys, Na__LocalMirror__DrawingsFingerprint } from '../03__AppUtils/Na__AppUtils__LocalProjectMirror__.js';\n"
    + FUNCTION_RULE + "\n"
    "\n"
    "    // MODULE IMPORTS | The Document Code's Two Sources (ValeVision only, DR-11)\n"
    + FUNCTION_RULE + "\n"
    "    // The project data the app loaded, and the master-index entry the\n"
    "    // ?project= token names. Kept apart from the import lines above, which\n"
    "    // are TrueVision's.\n"
    "    // @delegate: ../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js\n"
    "    // @delegate: ../03__AppUtils/Na__AppUtils__ProjectLoader.js\n"
    + FUNCTION_RULE + "\n"
    "    import { Na__CfApi__GetLoadedProjectData } from '../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';\n"
    "    import {\n"
    "        Na__AppUtils__InitMasterIndex,\n"
    "        Na__AppUtils__GetYearFromUrl,\n"
    "        Na__AppUtils__GetProjectFolderFromUrl\n"
    "    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';\n"
    + FUNCTION_RULE + "\n"
    "\n"
    + ENDREGION + "\n"
)
text = replace_once(text, OLD_3, NEW_3, 'end of the imports region')


# -----------------------------------------------------------------------------
# 4. The Document Code region, after the Layout Mode region
# -----------------------------------------------------------------------------
OLD_4 = (
    "    function Na__DrawData__SetLayoutModeEnabled(enabled) {\n"
    "        Na__DrawData__GetBlock()[Na__DrawData__LAYOUT_MODE_KEY] = (enabled === true);\n"
    "        return true;\n"
    "    }\n"
    + FUNCTION_RULE + "\n"
    "\n"
    + ENDREGION + "\n"
)
REGION_4 = (
    "\n"
    "\n"
    + REGION_RULE + "\n"
    "// REGION | Document Code (ValeVision only, DR-11)\n"
    + REGION_RULE + "\n"
    "\n"
    "    // MODULE VARIABLES | The Master Index, Once It Has Been Asked For\n"
    + FUNCTION_RULE + "\n"
    "    // The loading sequence's own memoised load of the index (ProjectLoader),\n"
    "    // asked for once a project folder is known from it: this module keeps\n"
    "    // the map that load resolves to and never fetches the index itself.\n"
    + FUNCTION_RULE + "\n"
    "    let Na__DrawData__IndexByFolderId = null;    // <-- Map<folderId, entry>, once the load has handed it over\n"
    "    let Na__DrawData__IndexAsked      = false;   // <-- Asked for once per session\n"
    + FUNCTION_RULE + "\n"
    "\n"
    "\n"
    "    // HELPER FUNCTION | A Project Code as Text ('' When It Is Not One)\n"
    + FUNCTION_RULE + "\n"
    "    function Na__DrawData__CodeText(value) {\n"
    "        if (typeof value === 'number' && Number.isFinite(value)) return String(value);\n"
    "        return (typeof value === 'string') ? value.trim() : '';\n"
    "    }\n"
    + FUNCTION_RULE + "\n"
    "\n"
    "\n"
    "    // HELPER FUNCTION | The Code of the Master-Index Entry the ?project= Token Names\n"
    + FUNCTION_RULE + "\n"
    "    // The year and the folder are read off that one entry, and only once the\n"
    "    // index has settled, so the ask below hands back the loading sequence's\n"
    "    // own memoised load and starts nothing. (An address that names them\n"
    "    // itself - TrueVision's ?project-folder= with ?year= - answers sooner,\n"
    "    // and the ask then starts that same memoised load early.) The map\n"
    "    // arrives a moment after the first ask, and until then this answers ''\n"
    "    // - the project.json code ahead of it answers on every ValeVision\n"
    "    // project today.\n"
    + FUNCTION_RULE + "\n"
    "    function Na__DrawData__IndexedCode() {\n"
    "        const year   = Na__AppUtils__GetYearFromUrl();\n"
    "        const folder = Na__AppUtils__GetProjectFolderFromUrl();\n"
    "        if (!year || !folder) return '';                                         // <-- The index is not in yet, or it does not know the token\n"
    "        if (!Na__DrawData__IndexAsked) {\n"
    "            Na__DrawData__IndexAsked = true;\n"
    "            Promise.resolve(Na__AppUtils__InitMasterIndex())\n"
    "                .then((byFolderId) => { Na__DrawData__IndexByFolderId = (byFolderId instanceof Map) ? byFolderId : null; })\n"
    "                .catch(() => { Na__DrawData__IndexAsked = false; });           // <-- The load never rejects; were it to, the next call asks again\n"
    "        }\n"
    "        const entry = Na__DrawData__IndexByFolderId ? Na__DrawData__IndexByFolderId.get(year + '/' + folder) : null;\n"
    "        return entry ? Na__DrawData__CodeText(entry.projectCode) : '';\n"
    "    }\n"
    + FUNCTION_RULE + "\n"
    "\n"
    "\n"
    "    // FUNCTION | The Project's Code as a Document Prints It\n"
    + FUNCTION_RULE + "\n"
    "    // ValeVision is opened with ?project=<folderId> - 2026/3047__Doous - or a\n"
    "    // bare code, and GetProjectCode answers that token because every save is\n"
    "    // addressed by it. A document wants the project's own code: a Document\n"
    "    // ID, a drawing number, a register or specification number, a PDF's name\n"
    "    // and a picture folder all read 3047, never a folder path. So: the\n"
    "    // projectCode of the project.json the app loaded; else that of the\n"
    "    // master-index entry the ?project= token names; else null, as\n"
    "    // GetProjectCode answers when there is no project at all.\n"
    + FUNCTION_RULE + "\n"
    "    function Na__DrawData__GetDocumentCode() {\n"
    "        const loaded = Na__CfApi__GetLoadedProjectData();\n"
    "        const own    = (loaded && typeof loaded === 'object') ? Na__DrawData__CodeText(loaded.projectCode) : '';\n"
    "        return own || Na__DrawData__IndexedCode() || null;\n"
    "    }\n"
    + FUNCTION_RULE + "\n"
    "\n"
    + ENDREGION + "\n"
)
text = replace_once(text, OLD_4, OLD_4 + REGION_4, 'end of the Layout Mode region')


# -----------------------------------------------------------------------------
# 5. The export line, after the two Layout Mode exports
# -----------------------------------------------------------------------------
OLD_5 = "        Na__DrawData__SetLayoutModeEnabled,                                  // <-- ValeVision only (DR-25, K2 X2)\n"
column = OLD_5.index('// <--')
name   = "        Na__DrawData__GetDocumentCode,"
NEW_5  = OLD_5 + name + ' ' * (column - len(name)) + "// <-- ValeVision only (DR-11, K2 X2)\n"
text = replace_once(text, OLD_5, NEW_5, 'Layout Mode export lines')


# -----------------------------------------------------------------------------
# Checks on the result
# -----------------------------------------------------------------------------
if '\t' in text:
    sys.exit('STOP: a tab crept in')
for marker in ('TRUEVISION3D', '[TrueVision3D', 'NaProjectPortal', 'na-truevision-api', '/r2/'):
    if marker in text:
        sys.exit('STOP: identity marker "%s" in the candidate' % marker)
if text.count('{{VVREL:W1-12}}') != 1:
    sys.exit('STOP: expected exactly one W1-12 placeholder')

# every original line is still there, in order (insertions only, apart from the Back-port's VV text)
orig_lines = raw.decode('utf-8').split('\n')
new_lines  = text.split('\n')
changed_back_port = {
    "//                   judged). The Layout Mode switch only if TrueVision takes it (DR-25).",
}
cursor = 0
for line in orig_lines:
    if line in changed_back_port:
        continue
    try:
        cursor = new_lines.index(line, cursor) + 1
    except ValueError:
        sys.exit('STOP: original line lost: %r' % line)

data = text.encode('utf-8')
open(OUT, 'wb').write(data)
print('candidate written: %s' % OUT)
print('  lines %d -> %d   bytes %d -> %d   sha1 %s' % (len(orig_lines), len(new_lines), len(raw), len(data), hashlib.sha1(data).hexdigest()))
