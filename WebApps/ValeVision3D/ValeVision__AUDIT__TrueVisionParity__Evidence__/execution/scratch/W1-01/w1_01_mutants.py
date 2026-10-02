"""Mutation check for the W1-01 loop harness: plant one fault at a time in a TEMP copy of a candidate file and prove
the harness fails. Never touches the live tree or the candidates. Writes mutants__report.txt in this folder."""
import os, subprocess, sys, tempfile, shutil
SCR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-01'
CAND = os.path.join(SCR, 'candidate')
LSEQ = os.path.join(CAND, 'Na__AppFlow__LoadingSequence.js')
INVL = os.path.join(CAND, 'Na__RenderLoop__Invalidation.js')

BEGIN = ("            if (!Na__VideoStudio__Preview__IsPlaying()) {\r\n"
         "                Na__InteractiveOverlays__BeginFrame();\r\n"
         "            }\r\n")
END_TRY = ("            let keepRendering = false;\r\n"
           "            try {\r\n"
           "                keepRendering = Na__RenderLoop__RenderFrame(deltaMs);\r\n"
           "            } finally {\r\n"
           "                Na__InteractiveOverlays__EndFrame();                         // <-- Every path, thrown frames included: no overlay outlives its frame\r\n"
           "            }\r\n")
DRAW_TOP = ("            const Na__Drawing__Camera = Na__DrawView__GetCamera();\r\n"
            "            if (Na__Drawing__Camera) {\r\n")

MUTANTS = [
    ('lseq', 'BeginFrame before the 2D drawing branch', [(BEGIN, ''), (DRAW_TOP, "            Na__InteractiveOverlays__BeginFrame();\r\n" + DRAW_TOP)]),
    ('lseq', 'no Video Studio guard on BeginFrame', [(BEGIN, "            Na__InteractiveOverlays__BeginFrame();\r\n")]),
    ('lseq', 'EndFrame after RenderFrame, not in a finally', [(END_TRY,
        "            let keepRendering = false;\r\n"
        "            keepRendering = Na__RenderLoop__RenderFrame(deltaMs);\r\n"
        "            Na__InteractiveOverlays__EndFrame();\r\n")]),
    ('lseq', 'EndFrame removed', [("                Na__InteractiveOverlays__EndFrame();                         // <-- Every path, thrown frames included: no overlay outlives its frame\r\n", '')]),
    ('lseq', 'BeginFrame removed', [(BEGIN, '')]),
    ('lseq', 'an extra call on the 3D path (identity check)', [(BEGIN, BEGIN + "            Na__DrawMarkup__SyncFrame();\r\n")]),
    ('lseq', 'the hold checked after RenderFrame (loop paints while held)', [(
        "            if (Na__RenderLoop__PauseReasons.size > 0) { Na__RenderLoop__PendingWhilePaused = true; return; }  // <-- A frame scheduled before the hold began\r\n", '')]),
    ('invl', 'mirror keyed on the raw reason (no falsy-to-general rule)', [
        ("        Na__RenderLoop__PauseReasons.add(reason || 'general');", "        Na__RenderLoop__PauseReasons.add(reason);"),
        ("        Na__RenderLoop__PauseReasons.delete(reason || 'general');", "        Na__RenderLoop__PauseReasons.delete(reason);")]),
    ('invl', 'mirror updated after the dispatch', [
        ("        Na__RenderLoop__PauseReasons.add(reason || 'general');              // <-- Mirrored first, so IsPaused already answers for the listeners\n"
         "        window.dispatchEvent(new CustomEvent(NA__PAUSE_RENDER_LOOP_EVENT, {\n"
         "            detail: { reason }                                              // <-- Who is holding the engine\n"
         "        }));\n",
         "        window.dispatchEvent(new CustomEvent(NA__PAUSE_RENDER_LOOP_EVENT, {\n"
         "            detail: { reason }                                              // <-- Who is holding the engine\n"
         "        }));\n"
         "        Na__RenderLoop__PauseReasons.add(reason || 'general');\n")]),
    ('invl', 'Resume does not update the mirror', [("        Na__RenderLoop__PauseReasons.delete(reason || 'general');           // <-- Mirrored first, as Pause does\n", '')]),
    ('invl', 'IsPaused always false', [("        return Na__RenderLoop__PauseReasons.size > 0;", "        return false;")]),
]

tmp = tempfile.mkdtemp(prefix='na-w101-mut-')
report = []
caught = 0
try:
    for index, (which, label, edits) in enumerate(MUTANTS, 1):
        source = LSEQ if which == 'lseq' else INVL
        text = open(source, 'rb').read().decode('utf-8')
        for old, new in edits:
            if text.count(old) != 1:
                raise SystemExit('mutant %d (%s): anchor matched %d times' % (index, label, text.count(old)))
            text = text.replace(old, new, 1)
        path = os.path.join(tmp, '%02d__%s' % (index, os.path.basename(source)))
        open(path, 'wb').write(text.encode('utf-8'))
        env = dict(os.environ)
        env['W101_LSEQ' if which == 'lseq' else 'W101_INVL'] = path
        r = subprocess.run(['node', os.path.join(SCR, 'w1_01_loop_harness.mjs'), '--target', 'mutant'], cwd=SCR, env=env, capture_output=True)
        out = r.stdout.decode('utf-8', 'replace')
        fails = [l.strip() for l in out.splitlines() if l.strip().startswith('FAIL')]
        ok = r.returncode != 0 and len(fails) > 0
        caught += 1 if ok else 0
        report.append('%s %2d %-62s exit %d, %d failing check(s)%s' % ('CAUGHT' if ok else 'MISSED', index, label, r.returncode, len(fails),
                      ('\n        e.g. ' + fails[0][:200]) if fails else ''))
finally:
    shutil.rmtree(tmp, ignore_errors=True)
report.append('%d/%d planted faults caught' % (caught, len(MUTANTS)))
text = '\n'.join(report) + '\n'
open(os.path.join(SCR, 'mutants__report.txt'), 'w', encoding='utf-8').write(text)
print(text)
sys.exit(0 if caught == len(MUTANTS) else 1)
