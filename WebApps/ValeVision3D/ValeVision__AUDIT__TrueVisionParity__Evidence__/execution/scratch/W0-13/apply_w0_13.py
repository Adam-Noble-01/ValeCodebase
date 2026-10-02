# =============================================================================
# W0-13 scratch - apply the loading-sequence transport wiring to ValeVision's
# 02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js
# =============================================================================
#
# Hand-adapted TrueVision hunks (TV LoadingSequence 1.3.1 at b2aa9151) replayed
# into ValeVision's own line (VV 1.7.0), per package W0-13:
#   H1  DESCRIPTION: two bullets (the overlay + merge base; na-app-scene-ready)
#   H2  header: PORT NOTE (K2 H5) + DEVELOPMENT LOG re-ordered newest first
#       (text of every entry unchanged) + the new 1.7.1 entry with {{VVREL:W0-13}}
#   H3  imports: Na__AppUtils__IsRunningOnLocalhost + the facade group
#   H4  ShowScene tail: dispatch na-app-scene-ready (TV :443 verbatim)
#   H5  new region: the editor-owned keys overlay helper (+ canonical JSON)
#   H6  project-data region: Initialize after the master index, the localhost
#       overlay, SetLoadedProjectData before the first project dispatch
#   H7  drawings dispatch: + sceneConfig (VV keys and order kept)
#
# Reads bytes, works on the LF view, writes back with the file's own CRLF.
# Every anchor must match exactly once; the pre-image SHA-1 must match.
#
# Usage:
#   python -B apply_w0_13.py --dry-run     write the candidate to scratch only
#   python -B apply_w0_13.py               apply to the live file (pre-image kept)
#   python -B apply_w0_13.py --check-live  report whether the live file is the candidate
#   python -B apply_w0_13.py --restore     put the pre-image back (only if live == candidate)
# =============================================================================
import hashlib
import os
import re
import sys

sys.dont_write_bytecode = True

LIVE = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\01__AppCore\Na__AppFlow__LoadingSequence.js'
HERE = os.path.dirname(os.path.abspath(__file__))
PREIMAGE = os.path.join(HERE, 'preimage', 'Na__AppFlow__LoadingSequence.js.bak')
CANDIDATE = os.path.join(HERE, 'candidate__Na__AppFlow__LoadingSequence.js')
PRE_SHA1 = '9274b18d549e07e3862f6243bc58ee6689ab56ce'   # W0-02's result (git diff: the renumber only)


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit('anchor %s matched %d times (expected exactly 1)' % (label, count))
    return text.replace(old, new, 1)


RULE79 = '// -----------------------------------------------------------------------------'
RULE60 = '    // ------------------------------------------------------------'
BANNER = '// ============================================================================='


# -----------------------------------------------------------------------------
# H1 - DESCRIPTION bullets
# -----------------------------------------------------------------------------
H1A_OLD = '// - Resolves model URLs from the URL query parameter or config defaults.\n'
H1A_NEW = (
    '// - Resolves model URLs from the URL query parameter or config defaults.\n'
    '// - On localhost, overlays the editor-owned keys (the app config\'s\n'
    '//   ProjectData__EditorOwnedKeys) from R2 onto the local server\'s copy of\n'
    '//   project.json, and registers the project data it runs with the transport\n'
    '//   facade (Na__CfApi) before anything is dispatched.\n'
)
H1B_OLD = '// - Runs the PBR materials second-pass if the materials system is enabled.\n'
H1B_NEW = (
    '// - Runs the PBR materials second-pass if the materials system is enabled.\n'
    '// - Reveals the scene and dispatches na-app-scene-ready (once per load) when\n'
    '//   the models are on screen.\n'
)


# -----------------------------------------------------------------------------
# H2 - PORT NOTE + DEVELOPMENT LOG (newest first) + the new entry
# -----------------------------------------------------------------------------
PORT_NOTE = [
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js - hunks only: the',
    '//                   localhost R2 overlay of the editor-owned keys and the transport facade\'s merge base (TrueVision3D',
    '//                   v2.7.1), sceneConfig in the drawings dispatch (v2.21.0) and na-app-scene-ready (v2.8.0); the rest',
    '//                   of the file is ValeVision\'s own',
    '// - Source version: 1.3.1 (TrueVision3D v2.161.0, 28-Sep-2026; read at HEAD b2aa9151)',
    '// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W0-13}}',
    '// - Parity        : diverged (two independent lines since 24-Feb-2026, TrueVision 1.3.1 and ValeVision 1.7.x: never',
    '//                   taken whole; TrueVision\'s hunks are replayed into ValeVision\'s sequence)',
    '// - Divergences   :',
    '//   - ValeVision\'s own sequence: dual render engine, resilient loads and the load watchdog, the SketchUp launch',
    '//     scene and orbit pivot swap, cross-section, Video Studio and fog-plane wiring, the 2D drawing branch of the',
    '//     render loop. Not taken from TrueVision: model groups and the design-phase library (1.3.0; DR-09), the legacy',
    '//     project fetch, the PWA project-name refinement, its fog effect and its per-project cull distance and FOV',
    '//     overrides.',
    '//   - The transport facade is ValeVision\'s (DIV-4): Na__CfApi__Initialize is async and is started here, with the',
    '//     app config, once the master index has settled; TrueVision\'s Index.html starts it with its Worker URL.',
    '//   - The overlay list is the app config\'s ProjectData__EditorOwnedKeys - the one list the sync tools and the',
    '//     Worker\'s merge-keys guard read too - not a constant in this file; it overlays the local server\'s copy, waits',
    '//     at most the fetch timeout, is skipped when the list is absent or R2\'s copy names another projectCode, and',
    '//     names the keys R2 changed.',
    '//   - The merge base is registered only when a project is open, before the first project dispatch.',
    '//   - Dispatch order and keys stay ValeVision\'s: the drawings block goes before the scenes, { block, projectCode }',
    '//     plus TrueVision\'s sceneConfig; the section bindings keep { sceneData } and are sent only when present (DIV-2).',
    '// - Back-port     : the bounded overlay wait (TrueVision\'s overlay read has no time limit) and the two editor-owned',
    '//                   keys its overlay list lacks (CrossSection__SceneData, LayoutEditor__DrawingRegister) - offered',
    '//                   with the TrueVision lane (DR-36), not done here.',
]

NEW_ENTRY = [
    '// 01-Oct-2026 - Version 1.7.1 (TrueVision transport wiring, {{VVREL:W0-13}})',
    '// - Starts the transport facade (Na__CfApi__Initialize, with the app config)',
    '//   once the master index has settled.',
    '// - On localhost, overlays the app config\'s ProjectData__EditorOwnedKeys from',
    '//   R2 onto the local server\'s copy of project.json before anything reads it',
    '//   (TrueVision\'s Na__DevSavedKeys overlay, v2.7.1): R2 is the source of',
    '//   truth for the keys the editor writes. Waits at most the fetch timeout,',
    '//   refuses an R2 copy that names another project, is never fatal, and logs',
    '//   which keys R2 changed.',
    '// - Registers the project data the session runs with',
    '//   Na__CfApi__SetLoadedProjectData before the first project dispatch.',
    '// - na-layouteditor-drawingsdata-loaded also carries sceneConfig (the raw',
    '//   presentation block), as TrueVision\'s does (v2.21.0).',
    '// - Dispatches na-app-scene-ready at the end of ShowScene, once the canvas is',
    '//   visible (TrueVision v2.8.0).',
    '// - DEVELOPMENT LOG re-ordered newest first, TrueVision\'s direction (the',
    '//   text of every entry is unchanged).',
]

LOG_ORDER = [
    '// 28-Sep-2026 - Per-scene lighting (v2.71.0)',
    '// 09-Sep-2026 - Projected linework overlay sync (port Phase 4)',
    '// 09-Sep-2026 - Elevation resize hook (port Phase 3)',
    '// 09-Sep-2026 - Version 1.7.0 (port Phase 2)',
    '// 10-Jul-2026 - Version 1.5.3',
    '// 09-Jul-2026 - Version 1.5.2',
    '// 01-Jul-2026 - Version 1.5.1',
    '// 25-Jun-2026 - Version 1.5.0',
    '// 16-Jun-2026 - Version 1.4.1',
    '// 11-Jun-2026 - Version 1.4.0',
    '// 11-Jun-2026 - Version 1.3.0',
    '// 10-Jun-2026 - Version 1.2.1',
    '// 10-Jun-2026 - Version 1.2.0',
    '// 09-Jun-2026 - Version 1.1.0',
    '// 24-Feb-2026 - Version 1.0.0',
]
ENTRY_HEAD = re.compile(r'^// \d{2}-[A-Z][a-z]{2}-\d{4} - ')


def rebuild_header(text):
    head_old = RULE79 + '\n//\n// DEVELOPMENT LOG:\n'
    start = text.find(head_old)
    if start < 0 or text.count(head_old) != 1:
        raise SystemExit('header anchor (rule + DEVELOPMENT LOG) not found exactly once')
    body_start = start + len(head_old)
    end = text.find(BANNER + '\n', body_start)
    if end < 0:
        raise SystemExit('closing banner after the DEVELOPMENT LOG not found')
    body = text[body_start:end].split('\n')
    if body and body[-1] == '':
        body = body[:-1]

    entries = []
    for line in body:
        if ENTRY_HEAD.match(line):
            entries.append([line])
        else:
            if not entries:
                raise SystemExit('text before the first log entry: %r' % line)
            entries[-1].append(line)
    for entry in entries:
        while entry and entry[-1] == '//':
            entry.pop()

    heads = [entry[0] for entry in entries]
    if sorted(heads) != sorted(LOG_ORDER) or len(set(heads)) != len(heads):
        raise SystemExit('log entries are not the 15 expected:\n' + '\n'.join(heads))
    by_head = {entry[0]: entry for entry in entries}

    old_lines = sorted(line for entry in entries for line in entry)
    new_lines = []
    out = [RULE79, '//'] + PORT_NOTE + ['//', RULE79, '//', '// DEVELOPMENT LOG:']
    out += NEW_ENTRY + ['//']
    for head in LOG_ORDER:
        out += by_head[head] + ['//']
        new_lines += by_head[head]
    if sorted(new_lines) != old_lines:
        raise SystemExit('re-ordered log lost or changed a line')
    return text[:start] + '\n'.join(out) + '\n' + text[end:]


# -----------------------------------------------------------------------------
# H3 - imports
# -----------------------------------------------------------------------------
H3A_OLD = (
    '    import {\n'
    '        Na__AppUtils__GetProjectCodeFromUrl,\n'
    '        Na__AppUtils__FetchProjectJson,\n'
)
H3A_NEW = (
    '    import {\n'
    '        Na__AppUtils__IsRunningOnLocalhost,\n'
    '        Na__AppUtils__GetProjectCodeFromUrl,\n'
    '        Na__AppUtils__FetchProjectJson,\n'
)
H3B_OLD = (
    '        Na__AppUtils__ResolveAssetUrl\n'
    "    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';\n"
    + RULE60 + '\n'
)
H3B_NEW = H3B_OLD + (
    '\n'
    '    // MODULE IMPORTS | Cloudflare R2 API Client (source-of-truth project data)\n'
    '    // @delegate: ../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js\n'
    + RULE60 + '\n'
    '    import {\n'
    '        Na__CfApi__Initialize,\n'
    '        Na__CfApi__IsConfigured,\n'
    '        Na__CfApi__ReadProjectData,\n'
    '        Na__CfApi__SetLoadedProjectData\n'
    "    } from '../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';\n"
    + RULE60 + '\n'
)


# -----------------------------------------------------------------------------
# H4 - ShowScene tail (TV LoadingSequence :443, verbatim)
# -----------------------------------------------------------------------------
H4_OLD = (
    '        if (loadingIndicator) {\n'
    "            loadingIndicator.style.display = 'none';\n"
    '        }\n'
    '    }\n'
    + RULE60 + '\n'
    '\n'
    '\n'
    '    // HELPER FUNCTION | Show Load Error State with Retry Button\n'
)
H4_NEW = (
    '        if (loadingIndicator) {\n'
    "            loadingIndicator.style.display = 'none';\n"
    '        }\n'
    '\n'
    "        window.dispatchEvent(new CustomEvent('na-app-scene-ready'));         // <-- Model is loaded and visible; post-load UI may appear\n"
    '    }\n'
    + RULE60 + '\n'
    '\n'
    '\n'
    '    // HELPER FUNCTION | Show Load Error State with Retry Button\n'
)


# -----------------------------------------------------------------------------
# H5 - the overlay region, before the main sequence
# -----------------------------------------------------------------------------
H5_OLD = (
    '// endregion -------------------------------------------------------------------\n'
    '\n'
    '\n'
    + RULE79 + '\n'
    '// REGION | Main Loading Sequence\n'
    + RULE79 + '\n'
)
H5_REGION = '\n'.join([
    RULE79,
    '// REGION | Editor-Owned Keys Overlay (localhost)',
    RULE79,
    '',
    '    // HELPER FUNCTION | One JSON Value as Text, Its Object Keys Sorted',
    RULE60,
    '    // Two copies of one block written by different savers can list the same',
    '    // keys in a different order; only a real difference is reported.',
    RULE60,
    '    function Na__AppFlow__CanonicalJson(value) {',
    '        return JSON.stringify(value, (key, inner) => {',
    '            if (!inner || typeof inner !== \'object\' || Array.isArray(inner)) return inner;',
    '            return Object.keys(inner).sort().reduce((sorted, name) => {',
    '                sorted[name] = inner[name];',
    '                return sorted;',
    '            }, {});',
    '        });',
    '    }',
    RULE60,
    '',
    '',
    '    // HELPER FUNCTION | Overlay the Editor-Owned Keys From R2 (localhost source of truth)',
    RULE60,
    '    // TrueVision\'s Na__DevSavedKeys overlay (v2.7.1) with ValeVision\'s list.',
    '    // The editor writes R2 first, so the local server\'s copy of project.json',
    '    // can fall behind it (a failed local mirror, a save from another',
    '    // machine). Each key of the app config\'s ProjectData__EditorOwnedKeys',
    '    // list that R2 holds replaces the local value IN PLACE, so every reader',
    '    // of this load\'s copy sees it; a listed key R2 lacks keeps the local',
    '    // value, and every other key (models, images, the project\'s identity)',
    '    // stays the local copy\'s, so a partial R2 copy can never break model',
    '    // loading. Never fatal and never longer than timeoutMs: a missing list,',
    '    // no editor worker, a failed, missing or slow read all leave the local',
    '    // copy as it is, saying why in the console. Resolves to the names of the',
    '    // keys whose value R2 changed.',
    RULE60,
    '    async function Na__AppFlow__OverlayEditorOwnedKeys(projectData, appConfig, transportReady, timeoutMs) {',
    '        const listBlock = (appConfig && appConfig.ProjectData__EditorOwnedKeys) || null;',
    '        const ownedKeys = (listBlock && Array.isArray(listBlock.ProjectData__EditorOwnedKeys__Keys))',
    '            ? listBlock.ProjectData__EditorOwnedKeys__Keys.filter((key) => typeof key === \'string\' && key.length > 0)',
    '            : [];',
    '        if (!projectData || typeof projectData !== \'object\') return [];',
    '        if (ownedKeys.length === 0) {',
    '            console.warn(\'[ValeVision3D] No ProjectData__EditorOwnedKeys list in the app config - project.json is used as the local server gave it.\');',
    '            return [];',
    '        }',
    '',
    '        // READ R2\'S COPY | the worker\'s project route or the CDN copy, fresh (the facade decides), raced against the budget',
    '        const budgetMs    = (Number.isFinite(timeoutMs) && timeoutMs > 0) ? timeoutMs : 15000;',
    '        let   budgetTimer = null;',
    '        const budget      = new Promise((done) => {',
    '            budgetTimer = setTimeout(() => done({ ok : false, timedOut : true }), budgetMs);',
    '        });',
    '        const r2Read      = (async () => {',
    '            await transportReady;                                            // <-- The worker config and its route list',
    '            if (!Na__CfApi__IsConfigured()) return { ok : false, notConfigured : true };',
    '            return Na__CfApi__ReadProjectData();',
    '        })();',
    '',
    '        let r2Result = null;',
    '        try {',
    '            r2Result = await Promise.race([ r2Read, budget ]);',
    '        } catch (error) {',
    '            r2Result = { ok : false, error : (error && error.message) || String(error) };',
    '        } finally {',
    '            clearTimeout(budgetTimer);',
    '        }',
    '',
    '        if (!r2Result || r2Result.timedOut) {',
    '            console.warn(`[ValeVision3D] R2 did not answer within ${Math.round(budgetMs / 100) / 10} s - project.json is used as the local server gave it.`);',
    '            return [];',
    '        }',
    '        if (r2Result.notConfigured) {',
    '            console.info(\'[ValeVision3D] No editor worker for this project - project.json is used as the local server gave it.\');',
    '            return [];',
    '        }',
    '        if (!r2Result.ok) {',
    '            console.warn(`[ValeVision3D] Could not read project.json from R2 (${r2Result.error || \'no answer\'}) - it is used as the local server gave it.`);',
    '            return [];',
    '        }',
    '        if (r2Result.missing || !r2Result.data || typeof r2Result.data !== \'object\') {',
    '            console.info(\'[ValeVision3D] R2 holds no project.json for this project yet - it is used as the local server gave it.\');',
    '            return [];',
    '        }',
    '',
    '        // SAME PROJECT? | never graft another project\'s keys (both copies carry the project\'s own code)',
    '        const r2Data      = r2Result.data;',
    '        const localCode   = projectData.projectCode;',
    '        const r2Code      = r2Data.projectCode;',
    '        if (localCode !== undefined && localCode !== null && r2Code !== undefined && r2Code !== null && String(localCode) !== String(r2Code)) {',
    '            console.warn(`[ValeVision3D] R2\'s project.json is project ${r2Code}, the local copy is ${localCode} - project.json is used as the local server gave it.`);',
    '            return [];',
    '        }',
    '',
    '        // OVERLAY | each listed key R2 holds takes R2\'s value (TrueVision\'s rule)',
    '        const changedKeys = [];',
    '        ownedKeys.forEach((key) => {',
    '            if (r2Data[key] === undefined) return;                           // <-- A key R2 lacks keeps the local value',
    '            if (Na__AppFlow__CanonicalJson(r2Data[key]) !== Na__AppFlow__CanonicalJson(projectData[key])) changedKeys.push(key);',
    '            projectData[key] = r2Data[key];                                  // <-- Overlay the R2 value',
    '        });',
    '        console.log(\'[ValeVision3D] Overlaid editor-owned keys from R2 (localhost source of truth) - \'',
    '            + (changedKeys.length ? `R2 differed from the local copy in ${changedKeys.join(\', \')}.` : \'the local copy already matched.\'));',
    '        return changedKeys;',
    '    }',
    RULE60,
    '',
    '// endregion -------------------------------------------------------------------',
    '',
    '',
]) + '\n'
H5_NEW = (
    '// endregion -------------------------------------------------------------------\n'
    '\n'
    '\n'
    + H5_REGION
    + RULE79 + '\n'
    '// REGION | Main Loading Sequence\n'
    + RULE79 + '\n'
)


# -----------------------------------------------------------------------------
# H6 - project-data region
# -----------------------------------------------------------------------------
H6_OLD = (
    '                await Na__AppUtils__InitMasterIndex();                        // <-- Ensure index maps are ready for year/asset-home resolution\n'
    '                const projectData = await Na__AppUtils__FetchProjectJson(projectCode, Na__Config__Resilience); // <-- Resilient + memoised\n'
    '\n'
    '                // STORE PROJECT DATA AND CAMERA CONFIG (supports both key formats)\n'
)
H6_NEW = (
    '                await Na__AppUtils__InitMasterIndex();                        // <-- Ensure index maps are ready for year/asset-home resolution\n'
    '                const Na__Transport__Ready = Na__CfApi__Initialize(Na__FullAppConfig); // <-- Start the transport facade (memoised; the editor worker is asked on localhost only)\n'
    '                const projectData = await Na__AppUtils__FetchProjectJson(projectCode, Na__Config__Resilience); // <-- Resilient + memoised\n'
    '\n'
    '                // OVERLAY THE EDITOR-OWNED KEYS FROM R2 (localhost only; R2 is the source of truth)\n'
    '                // The editor writes R2 first, so this machine\'s copy can be\n'
    '                // behind it. Each listed key R2 holds replaces the local value\n'
    '                // on this object before anything below reads it; the models,\n'
    '                // images and identity stay the local copy\'s.\n'
    '                // @delegate: ../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js\n'
    '                if (Na__AppUtils__IsRunningOnLocalhost()) {\n'
    '                    const Na__Overlay__TimeoutMs = (Na__Config__Resilience && Na__Config__Resilience.LoadResilience__Config__FetchTimeoutMs) || 15000; // <-- One fetch\'s budget\n'
    '                    await Na__AppFlow__OverlayEditorOwnedKeys(projectData, Na__FullAppConfig, Na__Transport__Ready, Na__Overlay__TimeoutMs);\n'
    '                    Na__LoadWatchdog__NotifyProgress();                       // <-- Reset stall clock after the R2 read\n'
    '                }\n'
    '\n'
    '                // REGISTER THE PROJECT DATA THIS SESSION RUNS (the facade\'s merge base)\n'
    '                // Before the first project dispatch below, so every listener\n'
    '                // and every later save sees the document the app is running.\n'
    '                Na__CfApi__SetLoadedProjectData(projectData);\n'
    '\n'
    '                // STORE PROJECT DATA AND CAMERA CONFIG (supports both key formats)\n'
)


# -----------------------------------------------------------------------------
# H7 - drawings dispatch: + sceneConfig
# -----------------------------------------------------------------------------
H7_OLD = (
    '                // LOAD DRAWINGS DATA (floor plans, elevations, sheets; absent block = empty skeleton)\n'
    '                // @delegate: ../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js\n'
    '                window.dispatchEvent(new CustomEvent(Na__DrawData__LOADED_EVENT, {\n'
    '                    detail: { block: projectData.LayoutEditor__DrawingsData || null, projectCode: projectCode }\n'
    '                }));\n'
)
H7_NEW = (
    '                // LOAD DRAWINGS DATA (floor plans, elevations, sheets; absent block = empty skeleton)\n'
    '                // sceneConfig is the raw presentation block, as TrueVision sends it:\n'
    '                // the migration source for drawings saved inside it before\n'
    '                // TrueVision v2.21.0 (none in ValeVision; harmless here).\n'
    '                // @delegate: ../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js\n'
    '                window.dispatchEvent(new CustomEvent(Na__DrawData__LOADED_EVENT, {\n'
    '                    detail: {\n'
    '                        block       : projectData.LayoutEditor__DrawingsData || null,\n'
    '                        sceneConfig : projectData.PresentationMode__SavedCameraScenes || null,\n'
    '                        projectCode : projectCode\n'
    '                    }\n'
    '                }));\n'
)


def transform(text):
    text = replace_once(text, H1A_OLD, H1A_NEW, 'H1a description: overlay bullet')
    text = replace_once(text, H1B_OLD, H1B_NEW, 'H1b description: scene-ready bullet')
    text = rebuild_header(text)
    text = replace_once(text, H3A_OLD, H3A_NEW, 'H3a ProjectLoader import list')
    text = replace_once(text, H3B_OLD, H3B_NEW, 'H3b facade import group')
    text = replace_once(text, H4_OLD, H4_NEW, 'H4 ShowScene tail')
    text = replace_once(text, H5_OLD, H5_NEW, 'H5 overlay region')
    text = replace_once(text, H6_OLD, H6_NEW, 'H6 project-data region')
    text = replace_once(text, H7_OLD, H7_NEW, 'H7 drawings dispatch')
    return text


def build_candidate(raw):
    if b'\r\n' not in raw:
        raise SystemExit('the live file is expected to be CRLF')
    lf = raw.decode('utf-8').replace('\r\n', '\n')
    if '\r' in lf:
        raise SystemExit('stray CR in the live file')
    out = transform(lf)
    return out.replace('\n', '\r\n').encode('utf-8')


def main(argv):
    raw = open(LIVE, 'rb').read()
    live_sha = sha1(raw)

    if '--check-live' in argv:
        cand = open(CANDIDATE, 'rb').read() if os.path.exists(CANDIDATE) else b''
        print('live sha1      :', live_sha)
        print('candidate sha1 :', sha1(cand) if cand else '(none)')
        print('pre-image sha1 :', PRE_SHA1)
        print('LIVE == CANDIDATE' if cand and raw == cand else ('LIVE == PRE-IMAGE' if live_sha == PRE_SHA1 else 'LIVE IS NEITHER'))
        return 0

    if '--restore' in argv:
        cand = open(CANDIDATE, 'rb').read()
        if raw != cand:
            raise SystemExit('refused: the live file is not this package\'s candidate (someone changed it); restore by hand')
        pre = open(PREIMAGE, 'rb').read()
        if sha1(pre) != PRE_SHA1:
            raise SystemExit('refused: the pre-image copy does not match its recorded SHA-1')
        with open(LIVE, 'wb') as fh:
            fh.write(pre)
        print('restored the pre-image; live sha1 =', sha1(open(LIVE, 'rb').read()))
        return 0

    if live_sha != PRE_SHA1:
        raise SystemExit('refused: live sha1 %s is not the expected pre-image %s (the file changed)' % (live_sha, PRE_SHA1))

    candidate = build_candidate(raw)
    os.makedirs(os.path.dirname(PREIMAGE), exist_ok=True)
    if not os.path.exists(PREIMAGE):
        with open(PREIMAGE, 'wb') as fh:
            fh.write(raw)
    with open(CANDIDATE, 'wb') as fh:
        fh.write(candidate)
    print('pre-image  :', PREIMAGE, live_sha)
    print('candidate  :', CANDIDATE, sha1(candidate),
          '%d -> %d lines' % (raw.count(b'\n'), candidate.count(b'\n')),
          'CRLF %d, bare LF %d' % (candidate.count(b'\r\n'), candidate.count(b'\n') - candidate.count(b'\r\n')))

    if '--dry-run' in argv:
        print('dry run: live file untouched')
        return 0

    # Apply: re-read and re-check right before the write (another agent must not have moved it)
    again = open(LIVE, 'rb').read()
    if sha1(again) != PRE_SHA1:
        raise SystemExit('refused at write time: the live file changed under this package')
    with open(LIVE, 'wb') as fh:
        fh.write(candidate)
    print('APPLIED: live sha1 =', sha1(open(LIVE, 'rb').read()))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
