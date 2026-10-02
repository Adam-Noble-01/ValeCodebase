# =============================================================================
# W2-07 scratch - build, apply, check and restore the two package files
# =============================================================================
#
# Progressive-render remainder of TrueVision v2.58.2:
#   1. VV 05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js
#      whole-file take of TV 1.0.3 at the pin (LF, as git show returns it),
#      seams: banner, console prefix, the K2 H5 PORT NOTE.
#   2. VV 01__AppCore/Na__AppFlow__LoadingSequence.js (HOT, CRLF kept)
#      hunk replay of TV's v2.58.2 render-loop guards, adapted to VV's loop.
#
# Every TV text is read with git show at the pin (bytes). Every replacement is
# asserted to match exactly once. Line endings: the take is LF (TV's); the
# LoadingSequence keeps its own CRLF.
#
# Usage (python -B):
#   build_w2_07.py --build        write the two candidates into ./candidate/
#   build_w2_07.py --apply        pre-image hashes re-checked, then candidates -> live
#   build_w2_07.py --check-live   live == candidate ?
#   build_w2_07.py --restore      put the pre-images back (refuses if live != candidate)
# =============================================================================

import hashlib
import os
import subprocess
import sys

HERE      = os.path.dirname(os.path.abspath(__file__))
APP_ROOT  = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
NAWEB     = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN       = 'b2aa9151'
TV_APP    = 'na-apps/30__TrueVision__CoreAppCode/'

REL_REFINE = r'02__Src__AppModules\05__RenderPipeline\Na__RenderEffect__ProgressiveRefine__.js'
REL_LSEQ   = r'02__Src__AppModules\01__AppCore\Na__AppFlow__LoadingSequence.js'

TV_REFINE  = TV_APP + '02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js'
TV_LSEQ    = TV_APP + '02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js'

# Pre-images recorded before any edit (sha256 of the live bytes, 02-Oct-2026).
PRE_SHA256 = {
    REL_REFINE : '49418F45FBF57D45915D187155C186F8DF8F55F0B1D5519C02B34DA6DD3565CF',
    REL_LSEQ   : '4450D105CD907615ACCB420D7C939EC7249E8009F48EA9FBE5EC5CCA1BCEB2C9',
}
PRE_BACKUP = {
    REL_REFINE : os.path.join(HERE, 'BACKUP__ProgressiveRefine.js.orig'),
    REL_LSEQ   : os.path.join(HERE, 'BACKUP__LoadingSequence.js.orig'),
}
CANDIDATE = {
    REL_REFINE : os.path.join(HERE, 'candidate', 'Na__RenderEffect__ProgressiveRefine__.js'),
    REL_LSEQ   : os.path.join(HERE, 'candidate', 'Na__AppFlow__LoadingSequence.js'),
}


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def sha256(data):
    return hashlib.sha256(data).hexdigest().upper()


def tv_bytes(path):
    return subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + path],
                          capture_output=True, check=True).stdout


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit('replace_once FAILED (' + label + '): found ' + str(count) + ' times')
    return text.replace(old, new)


def slice_between(text, start_marker, end_marker, label, include_end=True):
    a = text.find(start_marker)
    if a < 0 or text.find(start_marker, a + 1) >= 0:
        raise SystemExit('slice start not unique (' + label + ')')
    b = text.find(end_marker, a)
    if b < 0:
        raise SystemExit('slice end not found (' + label + ')')
    return text[a:b + (len(end_marker) if include_end else 0)]


# -----------------------------------------------------------------------------
# 1. ProgressiveRefine - whole-file take of TV 1.0.3
# -----------------------------------------------------------------------------

TV_PORT_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported from   : ValeVision3D 05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js 1.0.1\n"
    "// - Ported on     : 16-Sep-2026 for TrueVision3D v2.56.0\n"
    "// - Parity        : verbatim apart from the app name in this header and in the\n"
    "//                   one console warning. The maths, the settle test, the chunk\n"
    "//                   planner and the whole API are identical, and are meant to\n"
    "//                   stay that way - a second copy that drifts is worse than no\n"
    "//                   second copy.\n"
    "// - Divergence    : none in behaviour. What differs is the CALLER: TrueVision\n"
    "//                   has one engine rather than two, no video studio to report\n"
    "//                   as busy, and a 2D drawing path that bypasses the composer\n"
    "//                   instead of running a preset through it.\n"
)

VV_PORT_NOTE = (
    "// PORT NOTE:\n"
    "// - Authored in   : ValeVision3D first (1.0.0 and 1.0.1, 16-Sep-2026, ValeVision3D v2.48.0 and v2.48.1);\n"
    "//                   TrueVision3D took 1.0.1 whole on 16-Sep-2026 (its v2.56.0) and grew it to 1.0.3;\n"
    "//                   since ported back whole from TrueVision3D 1.0.3 (HEAD b2aa9151)\n"
    "// - Source version: 1.0.3 (TrueVision3D v2.58.2, 17-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-07}} - whole. This app's copy was its 1.0.1\n"
    "//                   with TrueVision's 1.0.3 buffer floor already in (ValeVision3D v2.54.0, unlogged) and\n"
    "//                   the optional onSample hook both copies took on 19-Sep-2026 (ValeVision3D v2.59.0).\n"
    "//                   New here is 1.0.2: planFrame reads performance.now() itself, and the render loop\n"
    "//                   passes it no timestamp (Na__AppFlow__LoadingSequence 1.7.3).\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   :\n"
    "//   - Banner and the one console warning read ValeVision3D.\n"
    "//   - None in behaviour. What differs is the CALLER, as it did when TrueVision took this file:\n"
    "//     ValeVision has two engines, reports Video Studio's preview and its legacy elevation camera as\n"
    "//     busy, and runs its 2D drawing views through their composer preset (DIV-1) rather than past the\n"
    "//     composer. The SCOPE paragraph above is TrueVision's text about TrueVision's caller; here the\n"
    "//     drawing views are excluded by the caller in the same way, and image and video export both do\n"
    "//     their own supersampling.\n"
    "// - Legacy        : TrueVision's DEVELOPMENT LOG, taken verbatim (DR-34), lists 1.0.1 above 1.0.3 and\n"
    "//                   1.0.2 - TrueVision's own order, kept as written.\n"
    "// - Back-port     : none.\n"
)


def build_refine():
    raw = tv_bytes(TV_REFINE)
    if b'\r' in raw:
        raise SystemExit('TV ProgressiveRefine is expected as LF from git show')
    text = raw.decode('utf-8')
    tv_sha = sha256(raw)

    text = replace_once(text,
        '// TRUEVISION3D - RENDER PIPELINE - PROGRESSIVE REFINEMENT\n',
        '// VALEVISION3D - RENDER PIPELINE - PROGRESSIVE REFINEMENT\n', 'refine banner')
    text = replace_once(text, TV_PORT_NOTE, VV_PORT_NOTE, 'refine PORT NOTE')
    text = replace_once(text,
        "console.warn('[TrueVision3D] Progressive refinement disabled: the accumulation buffer could not be created.');",
        "console.warn('[ValeVision3D] Progressive refinement disabled: the accumulation buffer could not be created.');",
        'refine console prefix')

    for needle in ('TRUEVISION3D', '[TrueVision3D', 'TrueVision__', 'window.TrueVision'):
        if needle in text:
            raise SystemExit('identity leak left in the take: ' + needle)
    return text.encode('utf-8'), tv_sha


# -----------------------------------------------------------------------------
# 2. LoadingSequence - hunk replay of TV v2.58.2's render-loop guards
# -----------------------------------------------------------------------------

def tv_lseq_pieces():
    raw = tv_bytes(TV_LSEQ)
    if b'\r' in raw:
        raise SystemExit('TV LoadingSequence is expected as LF from git show')
    tv = raw.decode('utf-8')

    consts = slice_between(tv,
        '        // CONSTANT | How Long to Leave a Stranded Refinement Before Restarting It\n',
        "        let   Na__RenderLoop__RefineSeenAt      = 0;                         // <-- When it was last seen to change (0: not watching)\n"
        "        // ---------------------------------------------------------------\n",
        'TV constants')

    watch_and_arm = slice_between(tv,
        '        // SUB FUNCTION | Notice a Refinement That Has Stopped Getting Anywhere\n',
        "            }, Na__RenderLoop__STRANDED_RECOVERY_MS);\n"
        "        }\n"
        "        // ---------------------------------------------------------------\n",
        'TV WatchRefineProgress + ArmNextFrame')

    tick = slice_between(tv,
        '        function Na__RenderLoop__Tick(timestamp) {\n',
        "                Na__RenderLoop__ArmNextFrame(keepRendering);\n"
        "            }\n"
        "        }\n",
        'TV Tick')

    no_timestamp = slice_between(tv,
        '                // NO TIMESTAMP IS PASSED, deliberately.',
        "                // refinement part-way. It reads the one clock itself now.\n",
        'TV no-timestamp comment')

    # Seams on the TV pieces (identity, K2 C1; VV's hold, K2 E2)
    watch_and_arm = replace_once(watch_and_arm,
        "console.warn('[TrueVision3D] Progressive refinement stalled at '",
        "console.warn('[ValeVision3D] Progressive refinement stalled at '", 'watchdog console prefix')
    watch_and_arm = replace_once(watch_and_arm,
        "                  held      : Na__RenderLoop__IsPaused(),\n",
        "                  held      : Na__RenderLoop__IsPaused() || Na__RenderLoop__PauseReasons.size > 0,\n",
        'watchdog held flag (VV hold set)')
    tick = replace_once(tick,
        "console.error('[TrueVision3D] Render frame failed; the loop carries on:', error);",
        "console.error('[ValeVision3D] Render frame failed; the loop carries on:', error);", 'tick console prefix')

    for name, piece in (('consts', consts), ('watch_and_arm', watch_and_arm), ('tick', tick), ('no_timestamp', no_timestamp)):
        for needle in ('TRUEVISION3D', '[TrueVision3D', 'TrueVision__', 'window.TrueVision'):
            if needle in piece:
                raise SystemExit('identity leak in TV piece ' + name + ': ' + needle)
    return consts, watch_and_arm, tick, no_timestamp, sha256(raw)


def build_lseq():
    live_raw = open(os.path.join(APP_ROOT, REL_LSEQ), 'rb').read()
    if sha256(live_raw) != PRE_SHA256[REL_LSEQ]:
        raise SystemExit('LoadingSequence changed since the pre-image was recorded - STOP')
    if live_raw.count(b'\r\n') != live_raw.count(b'\n'):
        raise SystemExit('LoadingSequence line endings are mixed - STOP')
    text = live_raw.decode('utf-8').replace('\r\n', '\n')

    consts, watch_and_arm, tv_tick, no_timestamp, tv_sha = tv_lseq_pieces()

    # ---- Header: DESCRIPTION -------------------------------------------------
    text = replace_once(text,
        "// - Switches the interactive overlays (authoring aids such as the drawing\n"
        "//   planes) on for the live 3D frame only - never on a 2D drawing, never in\n"
        "//   a Video Studio preview - and off again as every frame ends.\n",
        "// - Switches the interactive overlays (authoring aids such as the drawing\n"
        "//   planes) on for the live 3D frame only - never on a 2D drawing, never in\n"
        "//   a Video Studio preview - and off again as every frame ends.\n"
        "// - Ends every frame by arming what comes next, whatever the frame did: a\n"
        "//   frame that throws is reported and the loop carries on; a held engine (a\n"
        "//   Layout Editor sheet) paints nothing and asks for nothing; a progressive\n"
        "//   refinement that stops getting anywhere for 2.5 s restarts itself and\n"
        "//   says what it found, and a part-finished one left with nothing\n"
        "//   scheduled is picked up again a second later.\n",
        'header DESCRIPTION')

    # ---- Header: PORT NOTE ---------------------------------------------------
    text = replace_once(text,
        "//                   v2.7.1), sceneConfig in the drawings dispatch (v2.21.0), na-app-scene-ready (v2.8.0) and the\n"
        "//                   interactive overlay frame - BeginFrame on the 3D path, EndFrame in the tick's finally (v2.82.0);\n"
        "//                   the rest of the file is ValeVision's own\n",
        "//                   v2.7.1), sceneConfig in the drawings dispatch (v2.21.0), na-app-scene-ready (v2.8.0), the\n"
        "//                   interactive overlay frame - BeginFrame on the 3D path, EndFrame in the tick's finally (v2.82.0)\n"
        "//                   - and the render loop's guards: the engine-hold stand-down, the thrown-frame guard,\n"
        "//                   ArmNextFrame with the stranded-burst recovery, the 2.5 s refinement watchdog and no\n"
        "//                   timestamp passed to planFrame (v2.58.2); the rest of the file is ValeVision's own\n",
        'PORT NOTE Ported from')
    text = replace_once(text,
        "// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1; the interactive overlay frame 01-Oct-2026 for\n"
        "//                   ValeVision3D v2.71.2\n",
        "// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1; the interactive overlay frame 01-Oct-2026 for\n"
        "//                   ValeVision3D v2.71.2; the render loop's guards 02-Oct-2026 for ValeVision3D {{VVREL:W2-07}}\n",
        'PORT NOTE Ported on')
    text = replace_once(text,
        "//     PWA project-name refinement, its fog effect, its per-project cull distance and FOV overrides, and its\n"
        "//     render loop's engine-hold stand-down, thrown-frame guard and ArmNextFrame (the progressive-render\n"
        "//     remainder, W2-07): the tick still checks this sequence's own hold set.\n",
        "//     PWA project-name refinement, its fog effect, and its per-project cull distance and FOV overrides.\n",
        'PORT NOTE Divergences bullet 1')
    text = replace_once(text,
        "//     Studio. The try round RenderFrame has no catch: a thrown frame still ends the overlay frame, then\n"
        "//     propagates as before.\n",
        "//     Studio.\n"
        "//   - The engine hold is ValeVision's (K2 E2): the pause and resume events feed this sequence's own hold\n"
        "//     set, ScheduleFrame refuses while it holds a reason, and the pause listener cancels a pending frame and\n"
        "//     the refinement wake-up. TrueVision's stand-down at the top of RenderFrame asks that set as well as\n"
        "//     Na__RenderLoop__IsPaused (whose mirror also holds a pause taken before these listeners existed), and\n"
        "//     remembers the frame, because ValeVision's resume paints one frame only when one was asked for\n"
        "//     meanwhile; TrueVision's Resume always asks for one. The tick no longer checks the hold itself:\n"
        "//     TrueVision's shape, every tick ending in ArmNextFrame. The watchdog's held flag reports either hold.\n",
        'PORT NOTE Divergences bullet 2 + hold bullet')

    # ---- Header: DEVELOPMENT LOG (newest first) ------------------------------
    text = replace_once(text,
        "// DEVELOPMENT LOG:\n"
        "// 01-Oct-2026 - Version 1.7.2 (interactive overlay frame, v2.71.2)\n",
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.7.3 (the progressive-render loop guards, {{VVREL:W2-07}})\n"
        "// - The rest of TrueVision v2.58.2's render-loop fix (its EnsureBuffer floor\n"
        "//   came across at ValeVision3D v2.54.0). Every tick now ends in\n"
        "//   Na__RenderLoop__ArmNextFrame, from a finally: a frame that throws is\n"
        "//   reported (\"Render frame failed; the loop carries on\") instead of\n"
        "//   taking the loop down, and no early return can abandon a refinement\n"
        "//   burst. A part-finished burst left with nothing scheduled restarts after\n"
        "//   1 s, and Na__RenderLoop__WatchRefineProgress restarts a burst whose\n"
        "//   sample count has not moved for 2.5 s and logs what it found (count,\n"
        "//   what the refiner asked for, frame rate, composer buffer size, pixel\n"
        "//   ratios, active reasons, hold, visibility).\n"
        "// - The engine hold stands the refiner down at the top of RenderFrame\n"
        "//   (Na__RenderLoop__IsPaused or this sequence's own hold set): a held\n"
        "//   engine paints nothing and asks for nothing - a hold taken before the\n"
        "//   loop's listeners existed included - and the resume paints one frame.\n"
        "//   The tick's own hold check moved there.\n"
        "// - planFrame is passed no timestamp: the refiner reads performance.now()\n"
        "//   itself (ProgressiveRefine 1.0.2).\n"
        "//\n"
        "// 01-Oct-2026 - Version 1.7.2 (interactive overlay frame, v2.71.2)\n",
        'DEVELOPMENT LOG entry')

    # ---- Import: Na__RenderLoop__IsPaused (TV :301-306) ----------------------
    text = replace_once(text,
        "        NA__PAUSE_RENDER_LOOP_EVENT,\n"
        "        NA__RESUME_RENDER_LOOP_EVENT\n"
        "    } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';\n",
        "        NA__PAUSE_RENDER_LOOP_EVENT,\n"
        "        NA__RESUME_RENDER_LOOP_EVENT,\n"
        "        Na__RenderLoop__IsPaused\n"
        "    } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';\n",
        'import IsPaused')

    # ---- Constants and watchdog state (TV :1051-1069) ------------------------
    text = replace_once(text,
        "        let Na__RenderLoop__RefineWakeHandle = null;                         // <-- Pending debounce timer (settle wake-up)\n"
        "\n"
        "        // SUB FUNCTION | Cancel a Pending Refinement Wake-Up\n",
        "        let Na__RenderLoop__RefineWakeHandle = null;                         // <-- Pending debounce timer (settle wake-up)\n"
        "\n"
        + consts +
        "\n"
        "        // SUB FUNCTION | Cancel a Pending Refinement Wake-Up\n",
        'constants')

    # ---- The engine-hold stand-down at the top of RenderFrame (TV :1135-1147)
    text = replace_once(text,
        "        function Na__RenderLoop__RenderFrame(deltaMs) {\n"
        "            // 2D DRAWING MODE | A floor plan or elevation owns the viewport.\n",
        "        function Na__RenderLoop__RenderFrame(deltaMs) {\n"
        "            // ENGINE HELD | The third stand-down point (TrueVision v2.58.2). A\n"
        "            // Layout Editor sheet has taken a hold, and a held engine paints\n"
        "            // NOTHING: a sheet that owns the screen is never drawn over, by the\n"
        "            // frame or by the refiner. This loop's own hold set, fed by the\n"
        "            // pause and resume events, already keeps frames from being\n"
        "            // scheduled; Na__RenderLoop__IsPaused is asked as well because its\n"
        "            // mirror holds a pause taken before these listeners existed - a\n"
        "            // sheet opened while the models were still loading. suspend()\n"
        "            // rather than reset(), because a held engine must ask for no frames\n"
        "            // of its own until the holder lets go. The frame is remembered, so\n"
        "            // the resume paints one the moment the last hold clears.\n"
        "            if (Na__RenderLoop__IsPaused() || Na__RenderLoop__PauseReasons.size > 0) {\n"
        "                Na__RenderLoop__PendingWhilePaused = true;                   // <-- The resume paints one frame\n"
        "                Na__RenderLoop__Refiner.suspend();\n"
        "                return false;                                                // <-- Idle until the last hold lifts\n"
        "            }\n"
        "\n"
        "            // 2D DRAWING MODE | A floor plan or elevation owns the viewport.\n",
        'engine-hold stand-down')

    # ---- sceneBusy note and planFrame without a timestamp (TV :1206-1228) ----
    text = replace_once(text,
        "                // legacy 2D elevation camera is in there deliberately: this\n"
        "                // pass is the 3D viewport only, and the drawing views run\n"
        "                // through their own composer preset.\n"
        "                // ---------------------------------------------------------\n",
        "                // legacy 2D elevation camera is in there deliberately: this\n"
        "                // pass is the 3D viewport only, and the drawing views run\n"
        "                // through their own composer preset. A render hold is not\n"
        "                // tested here: it stands the refiner down at the top of this\n"
        "                // function, before any of the per-frame work, so by the time\n"
        "                // control reaches this line the engine is known not to be held.\n"
        "                // ---------------------------------------------------------\n",
        'sceneBusy comment')
    text = replace_once(text,
        "                    || Na__RenderLoop__ElevationActive;\n"
        "\n"
        "                const Na__Refine__FrameMode = Na__RenderLoop__Refiner.planFrame({\n"
        "                    camera    : Na__RenderLoop__ActiveCamera,\n"
        "                    sceneBusy : Na__Refine__SceneBusy,\n"
        "                    now       : Na__RenderLoop__PrevTimestamp                 // <-- Already this frame's timestamp (Tick set it)\n"
        "                });\n",
        "                    || Na__RenderLoop__ElevationActive;\n"
        "\n"
        + no_timestamp +
        "                const Na__Refine__FrameMode = Na__RenderLoop__Refiner.planFrame({\n"
        "                    camera    : Na__RenderLoop__ActiveCamera,\n"
        "                    sceneBusy : Na__Refine__SceneBusy\n"
        "                });\n",
        'planFrame without a timestamp')

    # ---- WatchRefineProgress, ArmNextFrame and the Tick (TV :1305-1450) ------
    vv_tick_start = "        function Na__RenderLoop__Tick(timestamp) {\n"
    vv_tick_end = ("            Na__RenderLoop__RefineWakeHandle = window.setTimeout(() => {\n"
                   "                Na__RenderLoop__RefineWakeHandle = null;\n"
                   "                Na__RenderLoop__ScheduleFrame();                             // <-- Debounce served; begin refining\n"
                   "            }, Na__Refine__Pending.delayMs);\n"
                   "        }\n")
    old_tick = slice_between(text, vv_tick_start, vv_tick_end, 'VV Tick')
    if 'if (Na__RenderLoop__PauseReasons.size > 0) { Na__RenderLoop__PendingWhilePaused = true; return; }  // <-- A frame scheduled before the hold began' not in old_tick:
        raise SystemExit('VV Tick is not the expected pre-image shape')
    text = replace_once(text, old_tick, watch_and_arm + "\n" + tv_tick, 'Tick replaced')

    # ---- Final checks --------------------------------------------------------
    header_end = text.find('// =============================================================================\n\n\n')
    if header_end < 0:
        raise SystemExit('header end not found')
    code = text[header_end:]
    for needle in ('TRUEVISION3D', '[TrueVision3D', 'TrueVision__', 'window.TrueVision'):
        if needle in code:
            raise SystemExit('identity leak in code: ' + needle)
    if 'now       : Na__RenderLoop__PrevTimestamp' in text:
        raise SystemExit('planFrame still passed a timestamp')
    if text.count('function Na__RenderLoop__Tick(') != 1 or text.count('function Na__RenderLoop__ArmNextFrame(') != 1:
        raise SystemExit('Tick / ArmNextFrame count wrong')

    out = text.replace('\n', '\r\n').encode('utf-8')
    return out, tv_sha


# -----------------------------------------------------------------------------
# Commands
# -----------------------------------------------------------------------------

def cmd_build():
    os.makedirs(os.path.join(HERE, 'candidate'), exist_ok=True)
    live_refine = open(os.path.join(APP_ROOT, REL_REFINE), 'rb').read()
    if sha256(live_refine) != PRE_SHA256[REL_REFINE]:
        raise SystemExit('ProgressiveRefine changed since the pre-image was recorded - STOP')
    refine, tv_refine_sha = build_refine()
    lseq, tv_lseq_sha = build_lseq()
    open(CANDIDATE[REL_REFINE], 'wb').write(refine)
    open(CANDIDATE[REL_LSEQ], 'wb').write(lseq)
    print('TV ProgressiveRefine at pin   sha256', tv_refine_sha)
    print('TV LoadingSequence at pin     sha256', tv_lseq_sha)
    for rel, path in CANDIDATE.items():
        data = open(path, 'rb').read()
        print('candidate', os.path.basename(path), len(data), 'bytes,', data.count(b'\n'), 'lines,',
              'CRLF' if b'\r\n' in data else 'LF', 'sha256', sha256(data))


def cmd_apply():
    for rel in (REL_REFINE, REL_LSEQ):
        live = open(os.path.join(APP_ROOT, rel), 'rb').read()
        if sha256(live) != PRE_SHA256[rel]:
            raise SystemExit('pre-image changed before apply: ' + rel + ' - STOP (nothing written)')
        if not os.path.exists(CANDIDATE[rel]):
            raise SystemExit('no candidate for ' + rel)
    # leaf first (the refiner), then the hub
    for rel in (REL_REFINE, REL_LSEQ):
        data = open(CANDIDATE[rel], 'rb').read()
        live_path = os.path.join(APP_ROOT, rel)
        if sha256(open(live_path, 'rb').read()) != PRE_SHA256[rel]:
            raise SystemExit('pre-image changed at write time: ' + rel + ' - STOP')
        with open(live_path, 'wb') as handle:
            handle.write(data)
        print('written', rel, sha256(data))


def cmd_check_live():
    ok = True
    for rel in (REL_REFINE, REL_LSEQ):
        live = open(os.path.join(APP_ROOT, rel), 'rb').read()
        cand = open(CANDIDATE[rel], 'rb').read()
        same = live == cand
        ok = ok and same
        print(('LIVE == CANDIDATE  ' if same else 'LIVE != CANDIDATE  ') + rel)
    sys.exit(0 if ok else 1)


def cmd_restore():
    for rel in (REL_REFINE, REL_LSEQ):
        live_path = os.path.join(APP_ROOT, rel)
        live = open(live_path, 'rb').read()
        cand = open(CANDIDATE[rel], 'rb').read()
        if live != cand and sha256(live) != PRE_SHA256[rel]:
            raise SystemExit('refusing to restore ' + rel + ': it is neither this package\'s candidate nor the pre-image')
    for rel in (REL_REFINE, REL_LSEQ):
        backup = open(PRE_BACKUP[rel], 'rb').read()
        if sha256(backup) != PRE_SHA256[rel]:
            raise SystemExit('backup does not match the recorded pre-image: ' + rel)
        with open(os.path.join(APP_ROOT, rel), 'wb') as handle:
            handle.write(backup)
        print('restored', rel)


if __name__ == '__main__':
    arg = sys.argv[1] if len(sys.argv) > 1 else '--build'
    {'--build': cmd_build, '--apply': cmd_apply, '--check-live': cmd_check_live, '--restore': cmd_restore}[arg]()
