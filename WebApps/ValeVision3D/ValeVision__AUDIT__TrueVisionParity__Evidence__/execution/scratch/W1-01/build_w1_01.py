# -*- coding: utf-8 -*-
"""W1-01 build / apply script.

Builds the five W1-01 files as candidates in scratch/W1-01/candidate/, then (with --apply) writes them to the
live ValeVision tree after re-checking that the three existing files still hold their recorded pre-image bytes
and that the two new files do not exist yet.

  python -B build_w1_01.py --build        build candidates only (default)
  python -B build_w1_01.py --apply        build, verify pre-images, write live (new files first, LoadingSequence last)
  python -B build_w1_01.py --check-live   compare live files with the candidates
  python -B build_w1_01.py --restore      put the pre-images back and remove the two new files, but only if the
                                          live files are still exactly what this script wrote

Every replacement is asserted to match exactly once. Existing files keep their own line endings (CRLF or LF);
the two whole-file ports are TrueVision's text as git show returns it (LF). TrueVision is read only at b2aa9151.
"""
import hashlib, json, os, re, subprocess, sys

PIN  = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
VV   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SCR  = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-01'
CAND = os.path.join(SCR, 'candidate')
PRE  = os.path.join(SCR, 'preimage')

REL_LSEQ = '02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js'
REL_IOVL = '02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js'
REL_INVL = '02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__Invalidation.js'
REL_PHAS = '02__Src__AppModules/26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js'
REL_TOGL = '02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js'

PRE_SHA = {
    REL_LSEQ: 'fc88f71e027795395ab4325406fa0a0bd63ab167',
    REL_INVL: '8711cd89c550d5f248582ab13079ba96e0ef40b5',
    REL_TOGL: 'b23cfde23fc7e767296a3fcd2531ef521d6f8ca8',
}
APPLY_ORDER = [REL_IOVL, REL_PHAS, REL_INVL, REL_TOGL, REL_LSEQ]   # <-- Leaves first; the importer of the new module last

RULE = '// -----------------------------------------------------------------------------'


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def tv_text(rel):
    r = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TVAPP + rel], capture_output=True)
    if r.returncode != 0:
        raise SystemExit('cannot read TrueVision ' + rel + ': ' + r.stderr.decode('utf-8', 'replace'))
    data = r.stdout
    if b'\r' in data:
        raise SystemExit('unexpected CR in git show output for ' + rel)
    return data.decode('utf-8')


def read_live(rel):
    path = os.path.join(VV, rel.replace('/', os.sep))
    return open(path, 'rb').read()


def split_eol(data, rel):
    """Decode, report the file's line ending, and return LF text. Refuses a mixed file."""
    text = data.decode('utf-8')
    crlf = text.count('\r\n')
    lf = text.count('\n')
    if crlf == lf and crlf > 0:
        return text.replace('\r\n', '\n'), '\r\n'
    if crlf == 0:
        return text, '\n'
    raise SystemExit('mixed line endings in ' + rel + ' (%d CRLF of %d)' % (crlf, lf))


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit('anchor "%s" matched %d times (expected exactly once)' % (label, count))
    return text.replace(old, new, 1)


# -----------------------------------------------------------------------------
# REGION | 1. Interactive Overlays (new, TrueVision 1.0.0 whole)
# -----------------------------------------------------------------------------

def build_interactive_overlays():
    text = tv_text(REL_IOVL)
    text = replace_once(text,
        '// TRUEVISION3D - RENDER LOOP - INTERACTIVE OVERLAYS\n',
        '// VALEVISION3D - RENDER LOOP - INTERACTIVE OVERLAYS\n', 'iovl banner')
    text = replace_once(text,
        '// PORT NOTE:\n'
        '// - Authored in   : TrueVision3D first (20-Sep-2026)\n'
        '// - ValeVision    : not yet ported.\n',
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js\n'
        '// - Source version: 1.0.0 (TrueVision3D v2.82.0, 20-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-01}}\n'
        '// - Parity        : verbatim\n'
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '//   - Its caller, ValeVision\'s render loop, begins a frame only while Video Studio\'s preview is not\n'
        '//     playing (DR-32): a seam in Na__AppFlow__LoadingSequence.js, not in this file.\n'
        '// - Back-port     : none.\n', 'iovl port note')
    return text


# -----------------------------------------------------------------------------
# REGION | 2. Design Phase Library (new, TrueVision 1.0.0 whole, never initialised)
# -----------------------------------------------------------------------------

def build_phase_library():
    text = tv_text(REL_PHAS)
    text = replace_once(text,
        '// TRUEVISION3D - MODEL GROUP - DESIGN PHASE LIBRARY\n',
        '// VALEVISION3D - MODEL GROUP - DESIGN PHASE LIBRARY\n', 'phase banner')
    for message in ("console.log('[TrueVision3D] Design phase let go (cache holds '",
                    "console.log('[TrueVision3D] Design phase loaded off-scene: '",
                    "console.warn('[TrueVision3D] Design phase could not be loaded: '"):
        text = replace_once(text, message, message.replace('[TrueVision3D]', '[ValeVision3D]'), 'phase console ' + message[:30])
    text = replace_once(text,
        '//   Na__LayoutEditor__SnapshotRenderer__ borrows and pins phase roots.\n'
        '//\n' + RULE + '\n'
        '//\n'
        '// DEVELOPMENT LOG:\n',
        '//   Na__LayoutEditor__SnapshotRenderer__ borrows and pins phase roots.\n'
        '//\n' + RULE + '\n'
        '//\n'
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js\n'
        '// - Source version: 1.0.0 (TrueVision3D v2.32.0, 13-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-01}}\n'
        '// - Parity        : verbatim\n'
        '// - Divergences   :\n'
        '//   - Banner and console prefix read ValeVision3D.\n'
        '//   - Never initialised (DR-09 (a)). ValeVision projects have no design phases (no modelGroups), its\n'
        '//     loading sequence calls none of Initialize, SetGroups, SetLiveLoading or SetLive, and it has no\n'
        '//     ModelGroupSelector. Uninitialised, the library answers as "the live model": IsLive(undefined) is\n'
        '//     true, GetGroups() is empty and GetDefaultId() is null, so every viewport resolves to the live\n'
        '//     model with no renderId, and Ensure(id) resolves false for any id. Two answers to know: GetStatus()\n'
        '//     of no id is \'loading\' (TrueVision\'s callers read the status only for a phase with a renderId),\n'
        '//     and Ensure() with NO id waits for a live model nobody reports - callers go through\n'
        '//     Na__LeSource__WaitFor, which resolves true at once for a null id, as TrueVision\'s Model Source\n'
        '//     does. It lands for the names TrueVision\'s Model Source and snapshot renderer import.\n'
        '// - Back-port     : none.\n'
        '//\n' + RULE + '\n'
        '//\n'
        '// DEVELOPMENT LOG:\n', 'phase port note')
    return text


# -----------------------------------------------------------------------------
# REGION | 3. Render Loop Invalidation (hunk: TrueVision's IsPaused, VV body)
# -----------------------------------------------------------------------------

def build_invalidation(data):
    text, eol = split_eol(data, REL_INVL)
    text = replace_once(text,
        '//\n'
        '// INTEGRATION:\n'
        '// - Na__AppFlow__LoadingSequence.js registers window listeners for all three events.\n'
        '// - Feature modules import Na__RenderLoop__RequestRender() after camera or scene changes.\n'
        '//\n' + RULE + '\n'
        '//\n'
        '// DEVELOPMENT LOG:\n'
        '// 10-Sep-2026 - Version 1.1.0\n',
        '// - Na__RenderLoop__IsPaused answers whether any hold is in place. Pause and\n'
        '//   Resume keep a mirror of the holds, reason for reason, before they dispatch,\n'
        '//   because the modules taken from TrueVision ask this module rather than the\n'
        '//   render loop (TrueVision keeps its holds here).\n'
        '//\n'
        '// INTEGRATION:\n'
        '// - Na__AppFlow__LoadingSequence.js registers window listeners for all three events.\n'
        '// - Feature modules import Na__RenderLoop__RequestRender() after camera or scene changes.\n'
        '// - Modules that must not act while a sheet holds the engine read\n'
        '//   Na__RenderLoop__IsPaused.\n'
        '//\n' + RULE + '\n'
        '//\n'
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__Invalidation.js - the name\n'
        '//                   Na__RenderLoop__IsPaused only, with a ValeVision body (K2 X3); the rest of the file is\n'
        '//                   ValeVision\'s own\n'
        '// - Source version: TrueVision\'s file has no version line or log; IsPaused as it has stood since TrueVision3D\n'
        '//                   v2.24.0 (11-Sep-2026, commit aa580db3; read at b2aa9151)\n'
        '// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-01}}\n'
        '// - Parity        : adapted\n'
        '// - Divergences   :\n'
        '//   - The holds are ValeVision\'s events: Pause and Resume dispatch na-pause-render-loop and\n'
        '//     na-resume-render-loop, and the loading sequence keeps the reason set its render loop obeys.\n'
        '//     TrueVision\'s Pause and Resume keep the set in this module and dispatch nothing. The set here is a\n'
        '//     mirror of the sequence\'s, counted the same way (a missing or empty reason is \'general\'), so\n'
        '//     IsPaused answers as TrueVision\'s does.\n'
        '//   - Pause and Resume return nothing; TrueVision\'s return the number of holds left (no caller reads it).\n'
        '//   - Resume asks for no frame itself: the loading sequence paints one when the last hold clears and a\n'
        '//     frame was asked for meanwhile.\n'
        '// - Legacy        : TrueVision\'s copy of this file has no module version, so the Source version names the\n'
        '//                   release and the commit instead.\n'
        '// - Back-port     : none.\n'
        '//\n' + RULE + '\n'
        '//\n'
        '// DEVELOPMENT LOG:\n'
        '// 01-Oct-2026 - Version 1.1.1 (TrueVision\'s IsPaused, {{VVREL:W1-01}})\n'
        '// - Na__RenderLoop__IsPaused, TrueVision\'s name for "is any hold in place?",\n'
        '//   answered from a mirror of the holds that Pause and Resume keep. The\n'
        '//   pause and resume events, and the loading sequence\'s own reason set,\n'
        '//   are unchanged.\n'
        '//\n'
        '// 10-Sep-2026 - Version 1.1.0\n', 'invl header')

    text = replace_once(text,
        "    const NA__RESUME_RENDER_LOOP_EVENT    = 'na-resume-render-loop';     // <-- Lift a hold by reason\n"
        '    // ------------------------------------------------------------\n'
        '\n'
        '// endregion -------------------------------------------------------------------\n'
        '\n',
        "    const NA__RESUME_RENDER_LOOP_EVENT    = 'na-resume-render-loop';     // <-- Lift a hold by reason\n"
        '    // ------------------------------------------------------------\n'
        '\n'
        '// endregion -------------------------------------------------------------------\n'
        '\n'
        '\n'
        + RULE + '\n'
        '// REGION | Module State\n'
        + RULE + '\n'
        '\n'
        '    // MODULE VARIABLES | The Holds, Mirrored\n'
        '    // ------------------------------------------------------------\n'
        '    // A SET of reasons rather than a boolean, because more than one system can\n'
        '    // want the loop stopped at once. The loading sequence keeps the set its\n'
        '    // render loop obeys, fed by the two events above; this is its mirror, kept\n'
        '    // by Pause and Resume themselves, so the question TrueVision\'s modules ask\n'
        '    // of this module - is the engine held? - has an answer here.\n'
        '    // ------------------------------------------------------------\n'
        '    const Na__RenderLoop__PauseReasons = new Set();                         // <-- Every reason paused and not yet resumed\n'
        '    // ------------------------------------------------------------\n'
        '\n'
        '// endregion -------------------------------------------------------------------\n'
        '\n', 'invl state')

    text = replace_once(text,
        "    function Na__RenderLoop__Pause(reason = 'general') {\n"
        '        window.dispatchEvent(new CustomEvent(NA__PAUSE_RENDER_LOOP_EVENT, {\n',
        "    function Na__RenderLoop__Pause(reason = 'general') {\n"
        "        Na__RenderLoop__PauseReasons.add(reason || 'general');              // <-- Mirrored first, so IsPaused already answers for the listeners\n"
        '        window.dispatchEvent(new CustomEvent(NA__PAUSE_RENDER_LOOP_EVENT, {\n', 'invl pause')

    text = replace_once(text,
        "    function Na__RenderLoop__Resume(reason = 'general') {\n"
        '        window.dispatchEvent(new CustomEvent(NA__RESUME_RENDER_LOOP_EVENT, {\n'
        '            detail: { reason }\n'
        '        }));\n'
        '    }\n'
        '    // ------------------------------------------------------------\n'
        '\n'
        '// endregion -------------------------------------------------------------------\n',
        "    function Na__RenderLoop__Resume(reason = 'general') {\n"
        "        Na__RenderLoop__PauseReasons.delete(reason || 'general');           // <-- Mirrored first, as Pause does\n"
        '        window.dispatchEvent(new CustomEvent(NA__RESUME_RENDER_LOOP_EVENT, {\n'
        '            detail: { reason }\n'
        '        }));\n'
        '    }\n'
        '    // ------------------------------------------------------------\n'
        '\n'
        '\n'
        '    // FUNCTION | Is Any Hold in Place?\n'
        '    // ------------------------------------------------------------\n'
        '    // TrueVision\'s question, answered from the mirror above: true from the\n'
        '    // moment a holder pauses until the last one resumes.\n'
        '    // ------------------------------------------------------------\n'
        '    function Na__RenderLoop__IsPaused() {\n'
        '        return Na__RenderLoop__PauseReasons.size > 0;\n'
        '    }\n'
        '    // ------------------------------------------------------------\n'
        '\n'
        '// endregion -------------------------------------------------------------------\n', 'invl resume + ispaused')

    text = replace_once(text,
        '        Na__RenderLoop__Pause,\n'
        '        Na__RenderLoop__Resume\n'
        '    };\n',
        '        Na__RenderLoop__Pause,\n'
        '        Na__RenderLoop__Resume,\n'
        '        Na__RenderLoop__IsPaused\n'
        '    };\n', 'invl exports')
    return text.replace('\n', eol) if eol != '\n' else text, eol


# -----------------------------------------------------------------------------
# REGION | 4. Model Toggle Controls (hunks: three TrueVision names, VV bodies)
# -----------------------------------------------------------------------------

TOGL_LOG_EXPECTED = [   # <-- (heading, number of body lines) in the file's current order
    ('// 18-Sep-2026 - Version 1.2.2', 4),
    ('// 11-Sep-2026 - Version 1.2.1', 1),
    ('// 10-Sep-2026 - Version 1.2.0', 1),
    ('// 09-Sep-2026 - Visibility event (port Phase 4)', 1),
    ('// 10-Feb-2026 - Version 1.0.0', 1),
    ('// 01-Jul-2026 - Version 1.1.0', 5),
    ('// 01-Sep-2026 - Version 1.2.0', 7),
]
TOGL_LOG_ORDER = [      # <-- newest first; the 01-Sep entry renumbered (it was a second 1.2.0)
    ('// 18-Sep-2026 - Version 1.2.2', None),
    ('// 11-Sep-2026 - Version 1.2.1', None),
    ('// 10-Sep-2026 - Version 1.2.0', None),
    ('// 09-Sep-2026 - Visibility event (port Phase 4)', None),
    ('// 01-Sep-2026 - Version 1.2.0', '// 01-Sep-2026 - Version 1.1.1 (written as 1.2.0; renumbered 01-Oct-2026)'),
    ('// 01-Jul-2026 - Version 1.1.0', None),
    ('// 10-Feb-2026 - Version 1.0.0', None),
]
TOGL_NEW_ENTRY = (
    '// 01-Oct-2026 - Version 1.2.3 (TrueVision\'s registry names, {{VVREL:W1-01}})\n'
    '// - Na__ModelToggle__SetCategoryVisibleByKey, Na__ModelToggle__BorrowRegistry\n'
    '//   and Na__ModelToggle__RestoreRegistry at TrueVision\'s names (TrueVision3D\n'
    '//   v2.25.0 and v2.32.0), with ValeVision bodies: the exact-key setter is\n'
    '//   silent and keeps the dev button in step; a borrow lends the registry to\n'
    '//   a design phase\'s categories for one render and leaves the dev buttons\n'
    '//   alone. Nothing borrows it yet (no design phases here).\n'
    '// - BuildButtons makes a new map, with a generation, instead of clearing the\n'
    '//   old one in place, so a borrowed map is never emptied under a render and\n'
    '//   RestoreRegistry can tell when the 3D view rebuilt it meanwhile.\n'
    '// - The na-model-visibility-changed dispatch is unchanged.\n'
    '// - PORT NOTE added. DEVELOPMENT LOG re-ordered newest first, and the 01-Sep\n'
    '//   entry renumbered 1.1.1 (it was a second 1.2.0); the text of every entry\n'
    '//   is unchanged.\n'
)
TOGL_PORT_NOTE = (
    '// PORT NOTE:\n'
    '// - Ported from   : TrueVision3D 02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js\n'
    '//                   - hunks only: the names SetCategoryVisibleByKey, BorrowRegistry and RestoreRegistry, with\n'
    '//                   ValeVision bodies (K2 X3), and the registry rebuilt as a new map with a generation rather than\n'
    '//                   cleared in place; the rest of the file is ValeVision\'s own\n'
    '// - Source version: TrueVision\'s file has no version line; SetCategoryVisibleByKey as it has stood since\n'
    '//                   TrueVision3D v2.25.0 (12-Sep-2026, commit f8321d60), BorrowRegistry, RestoreRegistry and the\n'
    '//                   new map since v2.32.0 (13-Sep-2026); read at b2aa9151\n'
    '// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-01}}\n'
    '// - Parity        : diverged (both apps\' copies descend from the 10-Feb-2026 original; never taken whole)\n'
    '// - Divergences   :\n'
    '//   - Category keys and display names are ValeVision\'s.\n'
    '//   - SetCategoryVisibility is ValeVision\'s exact-key setter, with a silent flag for renders, and it\n'
    '//     dispatches na-model-visibility-changed, which the projected linework and the snapshot renderer listen\n'
    '//     for (kept: S02b-V01). TrueVision exports a token matcher under that name and dispatches nothing.\n'
    '//   - Each registry entry keeps its dev button; TrueVision finds the button in the page. A borrowed entry\n'
    '//     has none, so the dev buttons never follow a borrowed registry.\n'
    '//   - ValeVision-only export (K2 X2): Na__ModelToggle__GetCategories, for the Video Studio. Not here yet:\n'
    '//     TrueVision\'s GetVisibilityState, ApplyVisibilityState and SetAllCategoriesVisible (its Presentation\n'
    '//     Mode state capture and context menu read them) and its guard against wiring the panel button twice.\n'
    '//   - Nothing borrows the registry: ValeVision has no design phases (DR-09 (a)).\n'
    '// - Legacy        : TrueVision\'s copy of this file has no module version (its log entries carry dates only),\n'
    '//                   so the Source version names releases instead.\n'
    '// - Back-port     : the na-model-visibility-changed dispatch (TrueVision\'s pipeline and snapshot renderer listen\n'
    '//                   for it and nothing there dispatches it) - offered with the TrueVision lane (DR-36), not done\n'
    '//                   here.\n'
)


def rebuild_toggle_log(text):
    head = '// DEVELOPMENT LOG:\n'
    if text.count(head) != 1:
        raise SystemExit('log: DEVELOPMENT LOG heading not found exactly once')
    start = text.index(head) + len(head)
    banner_rule = text.split('\n', 1)[0]                     # <-- The file's own "// ====" rule (line 1)
    if not re.match(r'^// =+$', banner_rule):
        raise SystemExit('log: line 1 is not the banner rule')
    end_marker = '//\n' + banner_rule + '\n'
    end = text.index(end_marker, start)
    body = text[start:end].split('\n')
    if body and body[-1] == '':
        body = body[:-1]
    # parse entries: heading lines start with "// DD-Mon-YYYY"
    entries = []
    current = None
    for line in body:
        if re.match(r'^// \d{2}-[A-Z][a-z]{2}-\d{4} ', line):
            current = [line, []]
            entries.append(current)
        elif line == '//':
            if current is None:
                raise SystemExit('log: separator before the first entry')
            current[1].append(None)            # <-- separator marker
        else:
            if current is None:
                raise SystemExit('log: text before the first entry: ' + line)
            current[1].append(line)
    parsed = []
    for heading, lines in entries:
        while lines and lines[-1] is None:
            lines.pop()
        if any(l is None for l in lines):
            raise SystemExit('log: blank comment line inside the entry ' + heading)
        parsed.append((heading, lines))
    if [(h, len(b)) for h, b in parsed] != TOGL_LOG_EXPECTED:
        raise SystemExit('log: entries are not as recorded: ' + repr([(h, len(b)) for h, b in parsed]))
    by_heading = {h: b for h, b in parsed}
    out = [TOGL_NEW_ENTRY.rstrip('\n')]
    for heading, renamed in TOGL_LOG_ORDER:
        out.append('//')
        out.append(renamed or heading)
        out.extend(by_heading[heading])
    new_body = '\n'.join(out) + '\n'
    # lost-line check: every old body line is still there, once
    old_lines = sorted(l for _, b in parsed for l in b)
    new_lines = sorted(l for l in new_body.split('\n') if l and l != '//' and not re.match(r'^// \d{2}-[A-Z][a-z]{2}-\d{4} ', l))
    added = TOGL_NEW_ENTRY.rstrip('\n').split('\n')[1:]
    for l in added:
        new_lines.remove(l)
    if old_lines != new_lines:
        raise SystemExit('log: body lines lost or changed')
    return text[:start] + new_body + text[end:]


def build_model_toggle(data):
    text, eol = split_eol(data, REL_TOGL)
    text = replace_once(text,
        '// - Exposes Na__ModelToggle__ApplySceneLayerVisibility so Presentation Mode\n'
        '//   scene transitions can drive these same category toggles per tour scene.\n'
        '//\n' + RULE + '\n'
        '//\n'
        '// DEVELOPMENT LOG:\n',
        '// - Exposes Na__ModelToggle__ApplySceneLayerVisibility so Presentation Mode\n'
        '//   scene transitions can drive these same category toggles per tour scene.\n'
        '// - Exposes TrueVision\'s registry names for the Layout Editor\'s snapshot\n'
        '//   renderer: SetCategoryVisibleByKey (exact key, silent), and BorrowRegistry\n'
        '//   and RestoreRegistry, which lend the registry to another design phase\'s\n'
        '//   categories for the length of one render.\n'
        '//\n' + RULE + '\n'
        '//\n' + TOGL_PORT_NOTE +
        '//\n' + RULE + '\n'
        '//\n'
        '// DEVELOPMENT LOG:\n', 'togl header')
    text = rebuild_toggle_log(text)

    text = replace_once(text,
        '    let Na__ModelToggle__StateMap = new Map();                            // <-- Map of category -> { group, visible }\n'
        '    // ------------------------------------------------------------\n',
        '    let Na__ModelToggle__StateMap = new Map();                            // <-- Map of category -> { group, visible }\n'
        '    let Na__ModelToggle__Generation = 0;                                  // <-- Bumped each time the 3D view rebuilds the map\n'
        '    let Na__ModelToggle__Borrowed = false;                                // <-- A render has lent the map to another design phase\n'
        '    // ------------------------------------------------------------\n', 'togl state')

    text = replace_once(text,
        '    function Na__ModelToggle__BuildButtons(loadedGroups) {\n'
        '        Na__ModelToggle__StateMap.clear();                               // <-- Drop categories from a previously loaded model\n',
        '    function Na__ModelToggle__BuildButtons(loadedGroups) {\n'
        '        // A NEW MAP, NOT A CLEARED ONE. A render that has borrowed the registry\n'
        '        // for another design phase holds the previous map object; clearing it\n'
        '        // in place would empty that phase\'s categories out from under the\n'
        '        // render. The generation tells RestoreRegistry this map now stands.\n'
        '        Na__ModelToggle__StateMap = new Map();                           // <-- Drop categories from a previously loaded model\n'
        '        Na__ModelToggle__Generation += 1;\n'
        '        Na__ModelToggle__Borrowed = false;\n', 'togl build buttons')

    text = replace_once(text,
        '        return snapshot;\n'
        '    }\n'
        '    // ---------------------------------------------------------------\n'
        '\n'
        '// endregion -------------------------------------------------------------------\n'
        '\n'
        '\n'
        + RULE + '\n'
        '// REGION | Dynamic UI Button Generation\n',
        '        return snapshot;\n'
        '    }\n'
        '    // ---------------------------------------------------------------\n'
        '\n'
        '// endregion -------------------------------------------------------------------\n'
        '\n'
        '\n'
        + RULE + '\n'
        '// REGION | Layout Editor Renders - Exact Keys and the Lent Registry\n'
        + RULE + '\n'
        '\n'
        '    // FUNCTION | Show or Hide One Category by Its Exact Key\n'
        '    // ------------------------------------------------------------\n'
        '    // TrueVision\'s exact-key setter, which its Layout Editor snapshot renderer\n'
        '    // calls for the Model Layers hides of one picture. SILENT, like every\n'
        '    // change a render makes and puts straight back: the visibility event\n'
        '    // would reset the projected linework and the snapshot fingerprints in the\n'
        '    // middle of the render that caused it. Returns false when the category is\n'
        '    // not loaded this session. The dev button follows the 3D view\'s registry,\n'
        '    // never a borrowed one.\n'
        '    // ------------------------------------------------------------\n'
        '    function Na__ModelToggle__SetCategoryVisibleByKey(categoryKey, visible) {\n'
        '        const state = Na__ModelToggle__StateMap.get(categoryKey);         // <-- Look up state entry\n'
        '        if (!state) return false;                                        // <-- Not loaded this session: nothing to hide\n'
        '        const wanted  = visible !== false;\n'
        '        state.visible = wanted;                                          // <-- Update internal state\n'
        '        if (state.group) state.group.visible = wanted;                   // <-- Set THREE.Group visibility\n'
        '        if (!Na__ModelToggle__Borrowed && state.button) {\n'
        '            state.button.classList.toggle(Na__ModelToggle__ActiveClass, wanted);  // <-- Keep the dev button in step\n'
        '        }\n'
        '        return true;\n'
        '    }\n'
        '    // ------------------------------------------------------------\n'
        '\n'
        '\n'
        '    // FUNCTION | Lend the Registry to Another Design Phase for One Render\n'
        '    // ------------------------------------------------------------\n'
        '    // TrueVision\'s Layout Editor can draw a design phase the 3D view does not\n'
        '    // hold, by putting that phase\'s model into the scene for the length of one\n'
        '    // render. Everything the render asks of this module - the Context Layer,\n'
        '    // the Model Layers hides, a saved layer map, the capture that puts them\n'
        '    // back - must then act on THAT phase\'s category groups. loadedGroups is\n'
        '    // the loader\'s category Map for the phase; the token returned is what\n'
        '    // RestoreRegistry takes. A borrowed map has no dev buttons: they describe\n'
        '    // the 3D view and are left alone throughout. ValeVision has no design\n'
        '    // phases yet, so nothing borrows it.\n'
        '    // ------------------------------------------------------------\n'
        '    function Na__ModelToggle__BorrowRegistry(loadedGroups) {\n'
        '        const token    = { map : Na__ModelToggle__StateMap, generation : Na__ModelToggle__Generation, borrowed : Na__ModelToggle__Borrowed };\n'
        '        const borrowed = new Map();\n'
        "        if (loadedGroups && typeof loadedGroups.forEach === 'function') {\n"
        '            loadedGroups.forEach((group, categoryKey) => {\n'
        '                borrowed.set(categoryKey, { group : group, visible : group.visible !== false, button : null });\n'
        '            });\n'
        '        }\n'
        '        Na__ModelToggle__StateMap = borrowed;\n'
        '        Na__ModelToggle__Borrowed = true;\n'
        '        return token;\n'
        '    }\n'
        '    // ------------------------------------------------------------\n'
        '\n'
        '\n'
        '    // FUNCTION | Hand the Registry Back\n'
        '    // ------------------------------------------------------------\n'
        '    // Returns false, and leaves the registry as it is, when the 3D view rebuilt\n'
        '    // it during the borrow: that map is the true one.\n'
        '    // ------------------------------------------------------------\n'
        '    function Na__ModelToggle__RestoreRegistry(token) {\n'
        '        if (!token) return false;\n'
        '        if (token.generation !== Na__ModelToggle__Generation) return false;\n'
        '        Na__ModelToggle__StateMap = token.map;\n'
        '        Na__ModelToggle__Borrowed = token.borrowed === true;\n'
        '        return true;\n'
        '    }\n'
        '    // ------------------------------------------------------------\n'
        '\n'
        '// endregion -------------------------------------------------------------------\n'
        '\n'
        '\n'
        + RULE + '\n'
        '// REGION | Dynamic UI Button Generation\n', 'togl new region')

    text = replace_once(text,
        '        Na__ModelToggle__GetCategoryKeys,\n'
        '        Na__ModelToggle__CaptureVisibilityMap\n'
        '    };\n',
        '        Na__ModelToggle__GetCategoryKeys,\n'
        '        Na__ModelToggle__CaptureVisibilityMap,\n'
        '        Na__ModelToggle__SetCategoryVisibleByKey,\n'
        '        Na__ModelToggle__BorrowRegistry,\n'
        '        Na__ModelToggle__RestoreRegistry\n'
        '    };\n', 'togl exports')
    return text.replace('\n', eol) if eol != '\n' else text, eol


# -----------------------------------------------------------------------------
# REGION | 5. Loading Sequence (hunk: the interactive overlay frame bracket)
# -----------------------------------------------------------------------------

def build_loading_sequence(data):
    text, eol = split_eol(data, REL_LSEQ)
    text = replace_once(text,
        '// - Starts the RAF render loop (including walk mode, door proximity updates).\n'
        '// - Attaches the window resize handler.\n',
        '// - Starts the RAF render loop (including walk mode, door proximity updates).\n'
        '// - Switches the interactive overlays (authoring aids such as the drawing\n'
        '//   planes) on for the live 3D frame only - never on a 2D drawing, never in\n'
        '//   a Video Studio preview - and off again as every frame ends.\n'
        '// - Attaches the window resize handler.\n', 'lseq description')

    text = replace_once(text,
        '// - Ported from   : TrueVision3D 02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js - hunks only: the\n'
        '//                   localhost R2 overlay of the editor-owned keys and the transport facade\'s merge base (TrueVision3D\n'
        '//                   v2.7.1), sceneConfig in the drawings dispatch (v2.21.0) and na-app-scene-ready (v2.8.0); the rest\n'
        '//                   of the file is ValeVision\'s own\n',
        '// - Ported from   : TrueVision3D 02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js - hunks only: the\n'
        '//                   localhost R2 overlay of the editor-owned keys and the transport facade\'s merge base (TrueVision3D\n'
        '//                   v2.7.1), sceneConfig in the drawings dispatch (v2.21.0), na-app-scene-ready (v2.8.0) and the\n'
        '//                   interactive overlay frame - BeginFrame on the 3D path, EndFrame in the tick\'s finally (v2.82.0);\n'
        '//                   the rest of the file is ValeVision\'s own\n', 'lseq ported from')

    text = replace_once(text,
        '// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1\n',
        '// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1; the interactive overlay frame 01-Oct-2026 for\n'
        '//                   ValeVision3D {{VVREL:W1-01}}\n', 'lseq ported on')

    text = replace_once(text,
        '//     render loop. Not taken from TrueVision: model groups and the design-phase library (1.3.0; DR-09), the legacy\n'
        '//     project fetch, the PWA project-name refinement, its fog effect and its per-project cull distance and FOV\n'
        '//     overrides.\n',
        '//     render loop. Not taken from TrueVision: model groups and the design-phase library (1.3.0; DR-09 - the\n'
        '//     library is at TrueVision\'s path but this sequence never initialises it), the legacy project fetch, the\n'
        '//     PWA project-name refinement, its fog effect, its per-project cull distance and FOV overrides, and its\n'
        '//     render loop\'s engine-hold stand-down, thrown-frame guard and ArmNextFrame (the progressive-render\n'
        '//     remainder, W2-07): the tick still checks this sequence\'s own hold set.\n'
        '//   - The interactive overlay frame begins only while Video Studio\'s preview is not playing (DR-32), so\n'
        '//     authoring overlays stay out of the preview as they stay out of every export; TrueVision has no Video\n'
        '//     Studio. The try round RenderFrame has no catch: a thrown frame still ends the overlay frame, then\n'
        '//     propagates as before.\n', 'lseq divergences')

    text = replace_once(text,
        '// DEVELOPMENT LOG:\n'
        '// 01-Oct-2026 - Version 1.7.1 (TrueVision transport wiring, v2.71.1)\n',
        '// DEVELOPMENT LOG:\n'
        '// 01-Oct-2026 - Version 1.7.2 (interactive overlay frame, {{VVREL:W1-01}})\n'
        '// - The render loop brackets the live 3D frame for the interactive overlays\n'
        '//   (Na__RenderLoop__InteractiveOverlays__, TrueVision v2.82.0): BeginFrame\n'
        '//   straight after the 2D drawing branch unless Video Studio\'s preview is\n'
        '//   playing, and EndFrame in a finally round RenderFrame, so every frame\n'
        '//   ends it, a thrown one included. With nothing registered both calls touch\n'
        '//   nothing and every frame draws exactly as before.\n'
        '//\n'
        '// 01-Oct-2026 - Version 1.7.1 (TrueVision transport wiring, v2.71.1)\n', 'lseq log')

    text = replace_once(text,
        '        NA__PAUSE_RENDER_LOOP_EVENT,\n'
        '        NA__RESUME_RENDER_LOOP_EVENT\n'
        "    } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';\n"
        '    // ------------------------------------------------------------\n'
        '\n',
        '        NA__PAUSE_RENDER_LOOP_EVENT,\n'
        '        NA__RESUME_RENDER_LOOP_EVENT\n'
        "    } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';\n"
        '    // ------------------------------------------------------------\n'
        '\n'
        '    // MODULE IMPORTS | Interactive Overlays (authoring aids drawn in the live 3D frame and nowhere else)\n'
        '    // ------------------------------------------------------------\n'
        '    // @delegate: ../05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js\n'
        '    // ------------------------------------------------------------\n'
        '    import {\n'
        '        Na__InteractiveOverlays__BeginFrame,\n'
        '        Na__InteractiveOverlays__EndFrame\n'
        "    } from '../05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js';\n"
        '    // ------------------------------------------------------------\n'
        '\n', 'lseq import')

    text = replace_once(text,
        '                Na__PlOverlay__SyncFrame();                                  // <-- Register the projected linework overlay (port Phase 4)\n'
        '                return Na__RenderLoop__ActiveReasons.size > 0;               // <-- Only pan/zoom keeps frames coming\n'
        '            }\n'
        '\n'
        '            if (Na__VideoStudio__Preview__IsPlaying()) {\n',
        '                Na__PlOverlay__SyncFrame();                                  // <-- Register the projected linework overlay (port Phase 4)\n'
        '                return Na__RenderLoop__ActiveReasons.size > 0;               // <-- Only pan/zoom keeps frames coming\n'
        '            }\n'
        '\n'
        '            // INTERACTIVE 3D FRAME | The only frame an authoring overlay is drawn in.\n'
        '            // The drawing planes sit in the main scene, and the main scene is also\n'
        '            // rendered by a sheet\'s 3D viewport, a thumbnail, a still and a video\n'
        '            // export. They are invisible by default and switched on HERE - past the\n'
        '            // hold and past the 2D drawing, so neither can ever show one - and\n'
        '            // switched off again in the tick\'s finally. A render path nobody has\n'
        '            // written yet therefore cannot print a plane.\n'
        '            // NOT IN A VIDEO STUDIO PREVIEW. The preview is the video being made,\n'
        '            // drawn through this same frame, and authoring aids stay out of it as\n'
        '            // they stay out of the video export.\n'
        '            if (!Na__VideoStudio__Preview__IsPlaying()) {\n'
        '                Na__InteractiveOverlays__BeginFrame();\n'
        '            }\n'
        '\n'
        '            if (Na__VideoStudio__Preview__IsPlaying()) {\n', 'lseq begin frame')

    text = replace_once(text,
        '            const keepRendering = Na__RenderLoop__RenderFrame(deltaMs);\n'
        '            if (document.hidden) return;\n',
        '            let keepRendering = false;\n'
        '            try {\n'
        '                keepRendering = Na__RenderLoop__RenderFrame(deltaMs);\n'
        '            } finally {\n'
        '                Na__InteractiveOverlays__EndFrame();                         // <-- Every path, thrown frames included: no overlay outlives its frame\n'
        '            }\n'
        '            if (document.hidden) return;\n', 'lseq end frame')
    return text.replace('\n', eol) if eol != '\n' else text, eol


# -----------------------------------------------------------------------------
# REGION | Driver
# -----------------------------------------------------------------------------

def build():
    os.makedirs(CAND, exist_ok=True)
    out = {}
    out[REL_IOVL] = (build_interactive_overlays(), '\n')
    out[REL_PHAS] = (build_phase_library(), '\n')
    for rel in (REL_INVL, REL_TOGL, REL_LSEQ):
        data = read_live(rel)
        if sha1(data) != PRE_SHA[rel]:
            raise SystemExit('live file changed since the pre-image was recorded: ' + rel + ' (' + sha1(data) + ')')
    out[REL_INVL] = build_invalidation(read_live(REL_INVL))
    out[REL_TOGL] = build_model_toggle(read_live(REL_TOGL))
    out[REL_LSEQ] = build_loading_sequence(read_live(REL_LSEQ))
    manifest = {}
    for rel, (text, eol) in out.items():
        data = text.encode('utf-8')
        if eol == '\r\n':
            lines = data.count(b'\n')
            if data.count(b'\r\n') != lines:
                raise SystemExit('candidate for ' + rel + ' is not uniformly CRLF')
        else:
            if b'\r' in data:
                raise SystemExit('candidate for ' + rel + ' has a CR')
        path = os.path.join(CAND, os.path.basename(rel))
        open(path, 'wb').write(data)
        manifest[rel] = {'sha1': sha1(data), 'bytes': len(data), 'lines': data.count(b'\n'), 'eol': 'CRLF' if eol == '\r\n' else 'LF'}
    json.dump(manifest, open(os.path.join(CAND, 'manifest.json'), 'w'), indent=1)
    for rel, m in manifest.items():
        print('built  %-90s %s %6d lines %s' % (rel, m['sha1'][:10], m['lines'], m['eol']))
    return manifest


def apply():
    manifest = build()
    for rel in (REL_INVL, REL_TOGL, REL_LSEQ):
        if sha1(read_live(rel)) != PRE_SHA[rel]:
            raise SystemExit('refusing: ' + rel + ' changed under this package')
    for rel in (REL_IOVL, REL_PHAS):
        if os.path.exists(os.path.join(VV, rel.replace('/', os.sep))):
            raise SystemExit('refusing: ' + rel + ' already exists')
    for rel in APPLY_ORDER:
        data = open(os.path.join(CAND, os.path.basename(rel)), 'rb').read()
        if sha1(data) != manifest[rel]['sha1']:
            raise SystemExit('candidate changed between build and apply: ' + rel)
        if rel in PRE_SHA and sha1(read_live(rel)) != PRE_SHA[rel]:
            raise SystemExit('refusing at write time: ' + rel + ' changed under this package')
        open(os.path.join(VV, rel.replace('/', os.sep)), 'wb').write(data)
        print('wrote  ' + rel)
    check_live()


def check_live():
    manifest = json.load(open(os.path.join(CAND, 'manifest.json')))
    ok = True
    for rel, m in manifest.items():
        path = os.path.join(VV, rel.replace('/', os.sep))
        live = sha1(open(path, 'rb').read()) if os.path.exists(path) else None
        same = live == m['sha1']
        ok = ok and same
        print(('LIVE == CANDIDATE ' if same else 'LIVE != CANDIDATE ') + rel + '  ' + str(live))
    return ok


def restore():
    manifest = json.load(open(os.path.join(CAND, 'manifest.json')))
    for rel in reversed(APPLY_ORDER):
        path = os.path.join(VV, rel.replace('/', os.sep))
        if os.path.exists(path) and sha1(open(path, 'rb').read()) != manifest[rel]['sha1']:
            raise SystemExit('refusing to restore: ' + rel + ' is no longer what this package wrote')
    for rel in reversed(APPLY_ORDER):
        path = os.path.join(VV, rel.replace('/', os.sep))
        if rel in PRE_SHA:
            data = open(os.path.join(PRE, os.path.basename(rel) + '.bak'), 'rb').read()
            if sha1(data) != PRE_SHA[rel]:
                raise SystemExit('pre-image backup damaged: ' + rel)
            open(path, 'wb').write(data)
            print('restored ' + rel)
        elif os.path.exists(path):
            os.remove(path)
            print('removed  ' + rel)


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else '--build'
    if mode == '--build':
        build()
    elif mode == '--apply':
        apply()
    elif mode == '--check-live':
        sys.exit(0 if check_live() else 1)
    elif mode == '--restore':
        restore()
    else:
        raise SystemExit(__doc__)
