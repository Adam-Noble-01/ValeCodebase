# =============================================================================
# W0-13 scratch - mutation check: does the behaviour harness catch planted faults?
# =============================================================================
# Each mutant is the candidate LoadingSequence with one fault planted (exact-once
# text edits on the LF view), written CRLF to the OS temp folder and served to
# w0_13_harness.mjs through --target file:<path>. A mutant is CAUGHT when the
# harness exits non-zero. Read-only on the app; the temp copies are deleted.
#
# Usage: python -B w0_13_mutants.py
# =============================================================================
import os
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True

HERE = os.path.dirname(os.path.abspath(__file__))
CANDIDATE = os.path.join(HERE, 'candidate__Na__AppFlow__LoadingSequence.js')
HARNESS = os.path.join(HERE, 'w0_13_harness.mjs')
REPORT = os.path.join(HERE, 'mutants__report.txt')

OVERLAY_CALL = '                    await Na__AppFlow__OverlayEditorOwnedKeys(projectData, Na__FullAppConfig, Na__Transport__Ready, Na__Overlay__TimeoutMs);\n'
SET_LOADED = '                Na__CfApi__SetLoadedProjectData(projectData);\n'
OVERLAY_BLOCK = (
    '                if (Na__AppUtils__IsRunningOnLocalhost()) {\n'
    "                    const Na__Overlay__TimeoutMs = (Na__Config__Resilience && Na__Config__Resilience.LoadResilience__Config__FetchTimeoutMs) || 15000; // <-- One fetch's budget\n"
    + OVERLAY_CALL +
    '                    Na__LoadWatchdog__NotifyProgress();                       // <-- Reset stall clock after the R2 read\n'
    '                }\n'
)
READY_LINE = "        window.dispatchEvent(new CustomEvent('na-app-scene-ready'));         // <-- Model is loaded and visible; post-load UI may appear\n"


def sub(text, old, new):
    if text.count(old) != 1:
        raise SystemExit('mutant anchor matched %d times: %r' % (text.count(old), old[:90]))
    return text.replace(old, new, 1)


def m_move(text, old, before):
    text = sub(text, old, '')
    return sub(text, before, old + before)


MUTANTS = [
    ('M01 overlay call removed',
     lambda t: sub(t, OVERLAY_CALL, '')),
    ('M02 overlay on every host (localhost gate removed)',
     lambda t: sub(t, '                if (Na__AppUtils__IsRunningOnLocalhost()) {\n                    const Na__Overlay__TimeoutMs',
                   '                if (true) {\n                    const Na__Overlay__TimeoutMs')),
    ('M03 merge base registered after the project dispatches',
     lambda t: m_move(t, SET_LOADED, '                // EXTRACT MODEL URLS FROM PROJECT DATA\n')),
    ('M04 merge base never registered',
     lambda t: sub(t, SET_LOADED, '')),
    ('M05 the whole R2 document overlaid',
     lambda t: sub(t, '            projectData[key] = r2Data[key];                                  // <-- Overlay the R2 value\n        });\n',
                   '        });\n        Object.assign(projectData, r2Data);\n')),
    ('M06 a listed key R2 lacks is wiped locally',
     lambda t: sub(t, '            if (r2Data[key] === undefined) return;                           // <-- A key R2 lacks keeps the local value\n', '')),
    ('M07 sceneConfig left out of the drawings detail',
     lambda t: sub(t, '                        sceneConfig : projectData.PresentationMode__SavedCameraScenes || null,\n', '')),
    ('M08 na-app-scene-ready before the canvas is visible',
     lambda t: m_move(t, '\n' + READY_LINE, '\n        if (statusText) statusText.textContent = \'Complete - ValeVision3D Ready\';\n')),
    ('M09 na-app-scene-ready twice per load',
     lambda t: sub(t, '            Na__UiFeature__ShowScene();                                      // <-- Reveal scene after all models loaded\n',
                   '            Na__UiFeature__ShowScene();                                      // <-- Reveal scene after all models loaded\n'
                   "            window.dispatchEvent(new CustomEvent('na-app-scene-ready'));\n")),
    ('M10 the overlay read is not bounded',
     lambda t: sub(t, '            r2Result = await Promise.race([ r2Read, budget ]);', '            r2Result = await r2Read;')),
    ('M11 Initialize awaited, unbounded, on the load path',
     lambda t: sub(t, '                const Na__Transport__Ready = Na__CfApi__Initialize(Na__FullAppConfig);',
                   '                const Na__Transport__Ready = await Na__CfApi__Initialize(Na__FullAppConfig);')),
    ('M12 the other-project guard removed',
     lambda t: sub(t, 'if (localCode !== undefined && localCode !== null && r2Code !== undefined && r2Code !== null && String(localCode) !== String(r2Code)) {',
                   'if (false) {')),
    ('M13 host gate inverted',
     lambda t: sub(t, '                if (Na__AppUtils__IsRunningOnLocalhost()) {\n                    const Na__Overlay__TimeoutMs',
                   '                if (!Na__AppUtils__IsRunningOnLocalhost()) {\n                    const Na__Overlay__TimeoutMs')),
    ('M14 overlay after the first project dispatches (just before the drawings)',
     lambda t: m_move(t, OVERLAY_BLOCK, '                // LOAD DRAWINGS DATA (floor plans, elevations, sheets; absent block = empty skeleton)\n')),
    ('M15 a hard-coded key list instead of the app config\'s',
     lambda t: sub(t, '        const listBlock = (appConfig && appConfig.ProjectData__EditorOwnedKeys) || null;',
                   "        const listBlock = { ProjectData__EditorOwnedKeys__Keys : [ 'LayoutEditor__DrawingsData', 'Navmode__EnabledModes', 'PresentationMode__SavedCameraScenes' ] };")),
    ('M16 the overlay read before the facade has its worker config (no await)',
     lambda t: sub(t, '            await transportReady;                                            // <-- The worker config and its route list\n', '')),
]


def main():
    base = open(CANDIDATE, 'rb').read().decode('utf-8').replace('\r\n', '\n')
    tmp = tempfile.mkdtemp(prefix='na-w013-mutants-')
    lines = []
    caught = 0
    try:
        for name, plant in MUTANTS:
            text = plant(base)
            if text == base:
                raise SystemExit('mutant changed nothing: ' + name)
            path = os.path.join(tmp, 'mutant.js')
            with open(path, 'wb') as fh:
                fh.write(text.replace('\n', '\r\n').encode('utf-8'))
            check = subprocess.run(['node', '--check', path], capture_output=True, text=True)
            if check.returncode != 0:
                lines.append('%-70s INVALID (does not parse): %s' % (name, check.stderr.strip()[:200]))
                continue
            run = subprocess.run(['node', HARNESS, '--target', 'file:' + path], capture_output=True, text=True, timeout=900)
            fails = [l.strip() for l in run.stdout.splitlines() if l.strip().startswith('FAIL')]
            ok = run.returncode != 0
            caught += 1 if ok else 0
            lines.append('%-70s %s  (%d failing checks; first: %s)' % (name, 'CAUGHT' if ok else 'MISSED', len(fails), fails[0][:150] if fails else '-'))
            print(lines[-1], flush=True)
    finally:
        for f in os.listdir(tmp):
            os.remove(os.path.join(tmp, f))
        os.rmdir(tmp)
    summary = '%d / %d planted faults caught' % (caught, len(MUTANTS))
    lines.append(summary)
    with open(REPORT, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('\n'.join(lines) + '\n')
    print(summary)
    return 0 if caught == len(MUTANTS) else 1


if __name__ == '__main__':
    sys.exit(main())
