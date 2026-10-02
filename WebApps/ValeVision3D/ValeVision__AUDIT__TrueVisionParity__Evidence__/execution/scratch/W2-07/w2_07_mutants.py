# =============================================================================
# W2-07 scratch - mutation check for the loop harness
# =============================================================================
# Plants one fault at a time in a COPY of the W2-07 candidate (never the live
# files), runs every loop-harness scenario on it and requires the named check
# to fail. Copies go to ./mutants/ ; the harness reads them through the
# W207_LSEQ / W207_REFINE environment variables.
# Usage: python -B w2_07_mutants.py
# =============================================================================

import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CAND_LSEQ = os.path.join(HERE, 'candidate', 'Na__AppFlow__LoadingSequence.js')
CAND_REFINE = os.path.join(HERE, 'candidate', 'Na__RenderEffect__ProgressiveRefine__.js')
OUT_DIR = os.path.join(HERE, 'mutants')

LSEQ_MUTANTS = [
    ('no-catch (the thrown-frame guard removed)',
     "            } catch (error) {\n"
     "                console.error('[ValeVision3D] Render frame failed; the loop carries on:', error);\n"
     "            } finally {\n",
     "            } finally {\n",
     'does not escape the tick'),
    ('arm-not-on-throw (ArmNextFrame inside the try, not the finally)',
     "                keepRendering = Na__RenderLoop__RenderFrame(deltaMs);\n"
     "            } catch (error) {\n"
     "                console.error('[ValeVision3D] Render frame failed; the loop carries on:', error);\n"
     "            } finally {\n"
     "                Na__InteractiveOverlays__EndFrame();                         // <-- Every path, thrown frames included: no overlay outlives its frame\n"
     "                Na__RenderLoop__ArmNextFrame(keepRendering);\n"
     "            }\n",
     "                keepRendering = Na__RenderLoop__RenderFrame(deltaMs);\n"
     "                Na__RenderLoop__ArmNextFrame(keepRendering);\n"
     "            } catch (error) {\n"
     "                console.error('[ValeVision3D] Render frame failed; the loop carries on:', error);\n"
     "            } finally {\n"
     "                Na__InteractiveOverlays__EndFrame();                         // <-- Every path, thrown frames included: no overlay outlives its frame\n"
     "            }\n",
     'the loop carries on: the burst resumes'),
    ('gate-without-IsPaused (only the sequence\'s own hold set)',
     "            if (Na__RenderLoop__IsPaused() || Na__RenderLoop__PauseReasons.size > 0) {\n",
     "            if (Na__RenderLoop__PauseReasons.size > 0) {\n",
     'a hold taken before the loop\'s listeners existed'),
    ('gate-forgets-the-frame (no PendingWhilePaused)',
     "                Na__RenderLoop__PendingWhilePaused = true;                   // <-- The resume paints one frame\n",
     "",
     'the resume paints one frame'),
    ('gate-removed (no engine-hold stand-down at all)',
     "            if (Na__RenderLoop__IsPaused() || Na__RenderLoop__PauseReasons.size > 0) {\n"
     "                Na__RenderLoop__PendingWhilePaused = true;                   // <-- The resume paints one frame\n"
     "                Na__RenderLoop__Refiner.suspend();\n"
     "                return false;                                                // <-- Idle until the last hold lifts\n"
     "            }\n",
     "",
     'nothing paints for 3 s'),
    ('no-watchdog (WatchRefineProgress never called)',
     "            Na__RenderLoop__WatchRefineProgress();                           // <-- Runs on every path, moving or idle\n",
     "",
     'is reported once with its diagnostic'),
    ('watchdog-threshold (2.5 s -> 250 s)',
     "        const Na__RenderLoop__NO_PROGRESS_MS   = 2500;\n",
     "        const Na__RenderLoop__NO_PROGRESS_MS   = 250000;\n",
     'is reported once with its diagnostic'),
    ('no-stranded-recovery',
     "            if (!(Na__Refine__Status.samplesDone > 0)) return;\n",
     "            return;\n",
     'arms one recovery wake-up'),
    ('stranded-recovery-on-a-resting-refiner (the samplesDone test dropped)',
     "            if (!(Na__Refine__Status.samplesDone > 0)) return;\n",
     "",
     'arms nothing: the loop cannot wake itself'),
    ('hidden-check-removed (ArmNextFrame arms while hidden)',
     "            if (document.hidden) return;                                     // <-- visibilitychange re-arms on the way back\n",
     "",
     'a frame while the tab is hidden arms nothing'),
]

REFINE_MUTANTS = [
    ('refiner-floor-removed (the pre-v2.54.0 buffer rebuild)',
     "            const width  = Math.max(1, Math.floor(readBuffer.width));\n"
     "            const height = Math.max(1, Math.floor(readBuffer.height));\n",
     "            const width  = readBuffer.width;\n"
     "            const height = readBuffer.height;\n",
     'converges 16/16 in two chunks through the real loop'),
]


def write_mutant(src_path, old, new, name, crlf):
    raw = open(src_path, 'rb').read().decode('utf-8')
    text = raw.replace('\r\n', '\n')
    if text.count(old) != 1:
        raise SystemExit('mutant anchor not unique/absent: ' + name)
    text = text.replace(old, new)
    if crlf:
        text = text.replace('\n', '\r\n')
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name.split(' ')[0] + os.path.splitext(src_path)[1])
    open(path, 'wb').write(text.encode('utf-8'))
    return path


def run(env_extra):
    env = dict(os.environ)
    env.update(env_extra)
    r = subprocess.run(['node', os.path.join(HERE, 'w2_07_loop_harness.mjs'), '--mutant-run'],
                       capture_output=True, text=True, env=env, encoding='utf-8')
    line = next((l for l in r.stdout.splitlines() if l.startswith('MUTANT:')), None)
    if line is None:
        print(r.stdout)
        print(r.stderr)
        raise SystemExit('mutant run produced no result')
    return json.loads(line[len('MUTANT:'):])


caught = 0
total = 0
lines = []
for name, old, new, expect in LSEQ_MUTANTS:
    total += 1
    path = write_mutant(CAND_LSEQ, old, new, name, crlf=True)
    bad = run({'W207_LSEQ': path})
    hit = any(expect in b for b in bad)
    caught += 1 if hit else 0
    lines.append(('CAUGHT ' if hit else 'MISSED ') + name + '  -> ' + str(len(bad)) + ' failing check(s)'
                 + ('' if hit else '; expected one naming "' + expect + '"; got ' + json.dumps(bad)))
for name, old, new, expect in REFINE_MUTANTS:
    total += 1
    path = write_mutant(CAND_REFINE, old, new, name, crlf=False)
    bad = run({'W207_REFINE': path})
    hit = any(expect in b for b in bad)
    caught += 1 if hit else 0
    lines.append(('CAUGHT ' if hit else 'MISSED ') + name + '  -> ' + str(len(bad)) + ' failing check(s)'
                 + ('' if hit else '; expected one naming "' + expect + '"; got ' + json.dumps(bad)))

# control: the unmutated candidate fails nothing
control = run({})
lines.append(('CONTROL OK ' if not control else 'CONTROL FAILED ') + 'unmutated candidate -> ' + str(len(control)) + ' failing check(s) ' + (json.dumps(control) if control else ''))

print('W2-07 mutation check - planted faults caught by the loop harness')
for l in lines:
    print('  ' + l)
print('\n' + str(caught) + '/' + str(total) + ' planted faults caught; control ' + ('clean' if not control else 'NOT clean'))
sys.exit(0 if caught == total and not control else 1)
