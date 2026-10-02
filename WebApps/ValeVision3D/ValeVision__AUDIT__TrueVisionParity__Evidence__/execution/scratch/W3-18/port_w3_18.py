#!/usr/bin/env python3
# W3-18 port script: Sheet Images Store, Publish and the stylesheet, from TrueVision at the pin.
# Reads TV bytes with git show (never the working tree), applies only the listed seams (each must hit
# exactly the expected number of times), writes LF text to the VV targets. Re-runnable.
import hashlib
import subprocess
import sys
from pathlib import Path

PIN = 'b2aa9151'
TV_GIT = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
FEAT = '02__Src__AppModules/51__System__LayoutEditor/54__Feature__SheetImages/'
VV_APP = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D')
DRY = '--dry' in sys.argv
OUT = None
if '--out' in sys.argv:
    OUT = Path(sys.argv[sys.argv.index('--out') + 1])


def tv(rel):
    data = subprocess.run(['git', '-C', TV_GIT, 'show', PIN + ':' + TV_APP + rel], capture_output=True, check=True).stdout
    assert b'\r' not in data, rel + ' has CR'
    return data.decode('utf-8')


def sub(text, old, new, count=1, label=''):
    n = text.count(old)
    if n != count:
        raise SystemExit('SEAM MISS (%s): expected %d, found %d: %r' % (label, count, n, old[:120]))
    return text.replace(old, new)


# =============================================================================
# STORE
# =============================================================================
def port_store():
    t = tv(FEAT + 'Na__LayoutEditor__SheetImages__Store__.js')
    t = sub(t, '// TRUEVISION3D - LAYOUT EDITOR - SHEET IMAGES - STORE\n', '// VALEVISION3D - LAYOUT EDITOR - SHEET IMAGES - STORE\n', label='banner')
    t = sub(t,
        "//   repository through the ProjectVision local server's sheet image routes\n"
        "//   (ProjectVision__TrueVisionSheetImages__Api__.py):\n",
        "//   repository through the Whitecardopedia local server's sheet image routes\n"
        "//   (Server__ValeVisionSheetImages__Api__.py):\n", label='desc server')
    t = sub(t,
        "// - Off localhost every call answers skipped: the live site has no local\n"
        "//   server, and R2 is its only store.\n",
        "// - With no project folder every call answers skipped. The routes are asked\n"
        "//   of the page's own origin, whatever its host (see the PORT NOTE).\n", label='desc skipped')
    t = sub(t,
        "//   not the ProjectVision server at all: the first needs a restart (it never\n"
        "//   reloads its routes), the second cannot save pictures anywhere.\n",
        "//   not the Whitecardopedia server at all: the first needs a restart (started\n"
        "//   without its debug reloader it never reloads its routes), the second\n"
        "//   cannot save pictures anywhere.\n", label='desc restart')
    port_note = (
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Store__.js\n"
        "// - Source version: 1.0.0 (TrueVision3D v2.116.0, 21-Sep-2026; read at HEAD b2aa9151)\n"
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-18}}, landed inert: only\n"
        "//                   Na__LayoutEditor__SheetImages__Publish__ imports it, and nothing starts that\n"
        "//                   until Sheet Images is switched on (W3-09). v2.116.0 is \"NOT signed off by Adam\"\n"
        "//                   in TrueVision; it comes across under DR-01 (c) and is named as not yet confirmed.\n"
        "// - Parity        : adapted (TrueVision 1.0.0's code; the route, the service name, the server's name\n"
        "//                   in two refusals and the host test are the only differences)\n"
        "// - Divergences   :\n"
        "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
        "//   - The routes are /api/valevision/sheet-images/{upload,reconcile,list}, served by\n"
        "//     Server__ValeVisionSheetImages__Api__.py (W0-18), the blueprint WebApps/Whitecardopedia/server.py\n"
        "//     registers (TrueVision: /api/truevision/sheet-images on its ProjectVision local server). The\n"
        "//     pictures land in WebApps/Whitecardopedia/Projects/<yyyy>/<folder>/05__Layout__DrawingDocs__Images/\n"
        "//     (K1 DR-29 (A)). The query keeps TrueVision's names, project-folder and year (four digits here,\n"
        "//     from the master-index entry ?project= names).\n"
        "//   - The server is known by GET /api/health answering service 'whitecardopedia-local-dev' (DR-28 (A),\n"
        "//     R3 C.1 row 9); the two refusals and DESCRIPTION name the Whitecardopedia local server and its\n"
        "//     blueprint. The private helper keeps TrueVision's name, Na__LeImgStore__IsProjectVision.\n"
        "//   - No host test. TrueVision answers skipped off localhost, where R2 is its only store; ValeVision is\n"
        "//     moving to one OVH VPS whose same-origin Flask service is the store (Adam, 02-Oct-2026), so the\n"
        "//     routes are asked of the page's own origin whatever its host, and only a page with no project\n"
        "//     folder is skipped. Na__AppUtils__IsRunningOnLocalhost is not imported. Today only a drawings\n"
        "//     save calls this, and a save needs the localhost-only transport facade, so nothing reaches it on\n"
        "//     a static host.\n"
        "//     TODO(OVH-MIGRATION): on the VPS ValeVision's own Flask service (127.0.0.1:8001, behind Nginx at\n"
        "//     /ValeVision/) answers these routes and /api/health; the route prefix and the service name are\n"
        "//     this file's two constants.\n"
        "// - Back-port     : none.\n"
        "//\n"
        "// -----------------------------------------------------------------------------\n"
        "//\n")
    t = sub(t, "// DEVELOPMENT LOG:\n// 21-Sep-2026 - Version 1.0.0\n", port_note + "// DEVELOPMENT LOG:\n// 21-Sep-2026 - Version 1.0.0\n", label='port note')
    t = sub(t,
        "    import {\n"
        "        Na__AppUtils__IsRunningOnLocalhost,\n"
        "        Na__AppUtils__GetProjectFolderFromUrl,\n",
        "    import {\n"
        "        Na__AppUtils__GetProjectFolderFromUrl,\n", label='import localhost')
    t = sub(t,
        "    const Na__LeImgStore__ROUTE   = '/api/truevision/sheet-images';\n"
        "    const Na__LeImgStore__SERVICE = 'na-projectvision-local-dev';              // <-- What the ProjectVision local server answers /api/health with\n",
        "    const Na__LeImgStore__ROUTE   = '/api/valevision/sheet-images';\n"
        "    const Na__LeImgStore__SERVICE = 'whitecardopedia-local-dev';               // <-- What the Whitecardopedia local server answers /api/health with\n", label='constants')
    t = sub(t,
        "    // HELPER FUNCTION | The Server and the Project Query, or null Off Localhost\n",
        "    // HELPER FUNCTION | The Server and the Project Query, or null With No Project\n", label='place heading')
    t = sub(t,
        "        if (!Na__AppUtils__IsRunningOnLocalhost()) return null;\n", "", label='place host test')
    t = sub(t,
        "    // HELPER FUNCTION | Is the ProjectVision Local Server the One Answering\n",
        "    // HELPER FUNCTION | Is the Whitecardopedia Local Server the One Answering\n", label='probe heading')
    t = sub(t,
        "return `the ProjectVision local server at ${origin} is running without the sheet image routes - restart it to load its current routes`;",
        "return `the Whitecardopedia local server at ${origin} is running without the sheet image routes - restart it to load its current routes`;", label='refusal 1')
    t = sub(t,
        "serve the app with the ProjectVision local server`;",
        "serve the app with the Whitecardopedia local server`;", label='refusal 2')
    return t


# =============================================================================
# PUBLISH
# =============================================================================
def port_publish():
    t = tv(FEAT + 'Na__LayoutEditor__SheetImages__Publish__.js')
    t = sub(t, '// TRUEVISION3D - LAYOUT EDITOR - SHEET IMAGES - PUBLISH\n', '// VALEVISION3D - LAYOUT EDITOR - SHEET IMAGES - PUBLISH\n', label='banner')
    t = sub(t,
        "// PURPOSE    : Every drawings save files each picture under its drawing's document id, on disk and on R2, before the drawings point at it\n",
        "// PURPOSE    : Every drawings save files each picture under its drawing's document id, in the project folder, before the drawings point at it\n", label='purpose')
    t = sub(t,
        "// - THE DRAWING NUMBER DECIDES THE FOLDER. A picture on RB05_T01_D01 lives in\n"
        "//   05__Layout__DrawingDocs__Images/RB05_T01_D01/. The document id is composed\n",
        "// - THE DRAWING NUMBER DECIDES THE FOLDER. A picture on 3047_D01 lives in\n"
        "//   05__Layout__DrawingDocs__Images/3047_D01/. The document id is composed\n", label='desc example id')
    t = sub(t,
        "//     before   every picture dropped this session is cut to its print size;\n"
        "//              then every picture is filed where its drawing's id says -\n"
        "//              copied on disk through the local server, and onto R2 (copied\n"
        "//              inside the bucket when R2 already has it anywhere, uploaded\n"
        "//              otherwise)\n"
        "//     payload  the copy of the drawings about to be written points each\n"
        "//              picture at its new folder - only where R2 confirmed it\n"
        "//     after    R2 has the drawings: the live records adopt the new folders;\n"
        "//              every picture nothing points at is taken off R2 and moved into\n"
        "//              the project's 00__Archive on disk (never deleted there)\n"
        "//   A save that fails part way leaves the drawings on R2 pointing at the\n"
        "//   folders they pointed at before, which still hold their pictures, and the\n"
        "//   next save finishes the job. A picture that cannot be found anywhere is\n"
        "//   named in the save's toast.\n",
        "//     before   every picture dropped this session is cut to its print size;\n"
        "//              then every picture is filed where its drawing's id says -\n"
        "//              copied in the project folder through the local server\n"
        "//              (uploaded from memory when no copy is found there)\n"
        "//     payload  the copy of the drawings about to be written points each\n"
        "//              picture at its new folder - only where the project folder\n"
        "//              confirmed it\n"
        "//     after    the drawings are written: the live records adopt the new\n"
        "//              folders; every picture nothing points at is moved into the\n"
        "//              project's 00__Archive (never deleted there)\n"
        "//   A save that fails part way leaves the drawings pointing at the folders\n"
        "//   they pointed at before, which still hold their pictures, and the next\n"
        "//   save finishes the job. A picture that cannot be found anywhere, or that\n"
        "//   the project folder would not take, is named in the save's toast.\n"
        "// - NO R2. TODO(OVH-MIGRATION): the project folder the app's Flask service\n"
        "//   writes is the store of record; the R2 half of each phase is not built\n"
        "//   (see the PORT NOTE).\n", label='desc phases')
    port_note = (
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Publish__.js\n"
        "// - Source version: 1.1.0 (TrueVision3D v2.121.0, 21-Sep-2026; read at HEAD b2aa9151)\n"
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-18}}, landed inert: the save step is\n"
        "//                   registered only by the Sheet Images core (W3-02), which nothing starts until\n"
        "//                   W3-09. 1.0.0 (v2.116.0) and 1.1.0 (v2.121.0) are \"NOT signed off by Adam\" in\n"
        "//                   TrueVision; they come across under DR-01 (c) and are named as not yet confirmed.\n"
        "// - Parity        : diverged (the R2 half of the save step is not built - Adam, 02-Oct-2026:\n"
        "//                   ValeVision moves to one OVH VPS and drops R2 and the Worker; everything else is\n"
        "//                   TrueVision 1.1.0's)\n"
        "// - Divergences   :\n"
        "//   - Banner and console prefixes read ValeVision3D.\n"
        "//   - NO R2 PATH (TODO(OVH-MIGRATION) at both seams). TrueVision's before phase lists, copies and\n"
        "//     uploads every picture on R2 and its after phase takes stale ones off R2. Here both are\n"
        "//     placeholders and the project folder, written through Na__LayoutEditor__SheetImages__Store__\n"
        "//     (the Flask routes /api/valevision/sheet-images, W0-18), is the store of record: a picture the\n"
        "//     local server confirmed in its new folder is what the payload points at, a picture it could\n"
        "//     not file or find is named in the save's toast (Labels SaveLocal and SaveMissing; SavePushed\n"
        "//     and SaveFailed name R2 and are not used), and the archive is the whole tidy. Only\n"
        "//     Na__CfApi__SHEET_IMAGES_ARCHIVE comes from the transport facade; TrueVision's IsConfigured,\n"
        "//     ListSheetImages, UploadSheetImage, CopySheetImage and DeleteSheetImage are not imported, so\n"
        "//     no picture goes to R2 (DR-06, P12). TrueVision's session R2 listing (OnR2) is dropped:\n"
        "//     the before phase's shortcut for a project with no pictures asks only that none was filed in\n"
        "//     the project folder this session.\n"
        "//   - PURPOSE and DESCRIPTION say \"in the project folder\" where TrueVision's say \"on disk and on R2\".\n"
        "//     The folder is WebApps/Whitecardopedia/Projects/<yyyy>/<folder>/05__Layout__DrawingDocs__Images/\n"
        "//     <document id>/ (K1 DR-29 (A)). DESCRIPTION's example document id is this app's (3047_D01,\n"
        "//     DR-11's {project}_{drawing}) where TrueVision's names one of its own projects.\n"
        "//   - The five exports, their arguments and the step's phases are TrueVision's.\n"
        "// - Back-port     : none.\n"
        "//\n"
        "// -----------------------------------------------------------------------------\n"
        "//\n")
    t = sub(t, "// DEVELOPMENT LOG:\n// 21-Sep-2026 - Version 1.1.0\n", port_note + "// DEVELOPMENT LOG:\n// 21-Sep-2026 - Version 1.1.0\n", label='port note')
    t = sub(t,
        "    // MODULE IMPORTS | The Drawings Block, the Document Id, R2, the Local Store, the Source\n",
        "    // MODULE IMPORTS | The Drawings Block, the Document Id, the Archive Folder's Name, the Local Store, the Source\n", label='import heading')
    t = sub(t,
        "    import {\n"
        "        Na__CfApi__IsConfigured,\n"
        "        Na__CfApi__SHEET_IMAGES_ARCHIVE,\n"
        "        Na__CfApi__ListSheetImages,\n"
        "        Na__CfApi__UploadSheetImage,\n"
        "        Na__CfApi__CopySheetImage,\n"
        "        Na__CfApi__DeleteSheetImage\n"
        "    } from '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';\n",
        "    import { Na__CfApi__SHEET_IMAGES_ARCHIVE } from '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';   // <-- TODO(OVH-MIGRATION): the name only; no R2 call is imported\n", label='import facade')
    t = sub(t,
        "    let   Na__LeImgPub__OnR2       = null;       // <-- Set of 'folder/file' on R2; null until listed this session\n",
        "", label='state OnR2')
    t = sub(t,
        "    const Na__LeImgPub__Held       = new Map();  // <-- file -> Blob: pictures dropped this session, and their cuts, until R2 has them\n",
        "    const Na__LeImgPub__Held       = new Map();  // <-- file -> Blob: pictures dropped this session, and their cuts, until the project folder has them\n", label='state Held')
    t = sub(t,
        "        if (!items.length && Na__LeImgPub__OnR2 !== null && Na__LeImgPub__OnR2.size === 0 && Na__LeImgPub__OnDisk.size === 0) return;   // <-- A project with no pictures anywhere: nothing to do, and nothing asked of anyone\n",
        "        if (!items.length && Na__LeImgPub__OnDisk.size === 0) return;   // <-- A project with no pictures anywhere: nothing to do, and nothing asked of anyone\n", label='early return')
    t = sub(t,
        "                        const blob  = entry ? await Na__LeImgPub__BytesOf(entry) : null;   // <-- Not on disk anywhere: from memory, or from R2 if the screen had it\n"
        "                        if (blob && (await Na__LeImgStore__Upload(row.folder, row.file, blob)).ok) Na__LeImgPub__OnDisk.add(key);\n",
        "                        const blob  = entry ? await Na__LeImgPub__BytesOf(entry) : null;   // <-- Not on disk anywhere: from memory, or wherever the screen found it\n"
        "                        if (!blob) { state.missing.push(row.file); continue; }              // <-- The project folder is the store of record: a picture found nowhere is named\n"
        "                        const uploaded = await Na__LeImgStore__Upload(row.folder, row.file, blob);\n"
        "                        if (uploaded.ok) Na__LeImgPub__OnDisk.add(key);\n"
        "                        else state.failed.push({ file : row.file, error : uploaded.error || 'failed' });\n", label='disk missing branch')
    # The R2 half of the before phase: from its heading to the end of the phase's notes.
    start = "        // ON R2 | Copied inside the bucket when R2 has the picture anywhere, uploaded otherwise.\n"
    end = "        if (state.missing.length) ctx.note(Na__LeImgCfg__Label('SaveMissing', '{count} picture(s) could not be found anywhere: {files}.', { count : state.missing.length, files : state.missing.slice(0, 3).join(', ') + (state.missing.length > 3 ? '...' : '') }), true);\n"
    assert t.count(start) == 1 and t.count(end) == 1
    i, j = t.index(start), t.index(end) + len(end)
    old_block = t[i:j]
    for must in ('Na__CfApi__IsConfigured()', 'Na__CfApi__ListSheetImages()', 'Na__CfApi__CopySheetImage(', 'Na__CfApi__UploadSheetImage(', "Label('SavePushed'", "Label('SaveRefiled'", "Label('SaveFailed'"):
        assert must in old_block, must
    new_block = (
        "        // ON R2 | TODO(OVH-MIGRATION): TrueVision also files every picture on\n"
        "        // R2 here - listed once a session, copied inside the bucket when R2\n"
        "        // has it anywhere, uploaded otherwise - and the payload points only at\n"
        "        // what R2 confirmed. ValeVision builds no R2 path (Adam, 02-Oct-2026:\n"
        "        // one OVH VPS replaces R2 and the Worker): the project folder its Flask\n"
        "        // service writes is the store of record, so what the local server\n"
        "        // confirmed above is what the payload may point at.\n"
        "        for (const key of wanted.keys()) {\n"
        "            if (Na__LeImgPub__OnDisk.has(key)) state.confirmed.add(key);\n"
        "        }\n"
        "\n"
        "        if (state.refiled) ctx.note(Na__LeImgCfg__Label('SaveRefiled', '{count} picture(s) filed under their new document id.', { count : state.refiled }), false);\n"
        "        if (state.failed.length)  ctx.note(Na__LeImgCfg__Label('SaveLocal', 'Pictures were not filed in the project folder ({error}).', { error : state.failed[0].error }), true);\n"
        + end)
    t = t[:i] + new_block + t[j:]
    t = sub(t,
        "    // Only where R2 confirmed the picture in its new folder; anything else\n",
        "    // Only where the project folder confirmed the picture in its new folder\n"
        "    // (R2 in TrueVision; see the PORT NOTE); anything else\n", label='payload comment')
    start = "        // R2 | Every picture of this project that the drawings just written do\n"
    end = "            if (stale.length) console.log('[TrueVision3D LayoutEditor] Took ' + stale.length + ' picture(s) no drawing uses off R2.');\n        }\n"
    assert t.count(start) == 1 and t.count(end) == 1
    i, j = t.index(start), t.index(end) + len(end)
    old_block = t[i:j]
    assert 'Na__CfApi__DeleteSheetImage(' in old_block and 'Na__LeImgPub__OnR2' in old_block
    t = t[:i] + (
        "        // R2 | TODO(OVH-MIGRATION): TrueVision takes every picture of this\n"
        "        // project that the drawings just written do not name off R2 here.\n"
        "        // ValeVision builds no R2 path: the archive below, in the project\n"
        "        // folder its Flask service writes, is the whole tidy.\n") + t[j:]
    t = sub(t,
        "        // PICTURES NOW ON R2 need not be held in memory any longer.\n",
        "        // PICTURES NOW IN THE PROJECT FOLDER need not be held in memory any longer.\n", label='held release')
    t = sub(t,
        "        Na__LeImgPub__OnR2 = null;\n",
        "", label='reset')
    n = t.count('[TrueVision3D LayoutEditor]')
    assert n == 3, n   # Normalise, the disk warn, Archived
    t = t.replace('[TrueVision3D LayoutEditor]', '[ValeVision3D LayoutEditor]')
    for gone in ('Na__LeImgPub__OnR2', 'Na__CfApi__IsConfigured', 'Na__CfApi__ListSheetImages', 'Na__CfApi__UploadSheetImage', 'Na__CfApi__CopySheetImage', 'Na__CfApi__DeleteSheetImage', 'TrueVision3D LayoutEditor'):
        body = t.split('// =============================================================================\n\n\n', 1)[1]
        assert gone not in body, gone
    return t


# =============================================================================
# STYLESHEET
# =============================================================================
def port_css():
    t = tv(FEAT + 'Na__LayoutEditor__Styles__SheetImages__.css')
    t = sub(t, '/* TRUEVISION3D - LAYOUT EDITOR - SHEET IMAGES - STYLES              */\n',
               '/* VALEVISION3D - LAYOUT EDITOR - SHEET IMAGES - STYLES              */\n', label='banner')
    head_end = "/* - Initial implementation.                                         */\n/*                                                                   */\n/* ================================================================= */\n"
    note = (
        "\n"
        "/*\n"
        " * PORT NOTE:\n"
        " * - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__Styles__SheetImages__.css\n"
        " * - Source version: 1.1.0 (TrueVision3D v2.121.0, 21-Sep-2026; read at HEAD b2aa9151)\n"
        " * - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-18}}, landed inert: nothing links it\n"
        " *                   until W3-09 adds it to Na__LeLoad__STYLESHEETS (TrueVision loads it from its\n"
        " *                   stylesheet index, after Specification__Read). 1.0.0 (v2.116.0) and 1.1.0\n"
        " *                   (v2.121.0) are \"NOT signed off by Adam\" in TrueVision; they come across under\n"
        " *                   DR-01 (c) and are named as not yet confirmed.\n"
        " * - Parity        : verbatim (every rule and comment is TrueVision's; the banner and this note\n"
        " *                   are the only differences)\n"
        " * - Divergences   :\n"
        " *   - Banner reads ValeVision3D.\n"
        " * - Back-port     : none.\n"
        " */\n")
    t = sub(t, head_end, head_end + note, label='port note')
    return t


def main():
    outputs = {
        FEAT + 'Na__LayoutEditor__SheetImages__Store__.js': port_store(),
        FEAT + 'Na__LayoutEditor__SheetImages__Publish__.js': port_publish(),
        FEAT + 'Na__LayoutEditor__Styles__SheetImages__.css': port_css(),
    }
    for rel, text in outputs.items():
        data = text.encode('utf-8')
        root = OUT if OUT else VV_APP
        target = root / rel
        print('%-75s %6d bytes %4d lines sha256 %s' % (rel.split('/')[-1], len(data), text.count('\n'), hashlib.sha256(data).hexdigest()[:16]))
        if DRY:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)


main()
