# W1-11 - mutation check: plant one fault at a time in a temp copy of a candidate (or live) file and
# prove the harness fails on it. Usage: python -B w1_11_mutants.py [--live]
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
LIVE = '--live' in sys.argv
VV_NORTH = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\46__System__NorthDirection'
SRC = VV_NORTH if LIVE else os.path.join(HERE, 'candidate')

G = 'Na__North__CompassGizmo__.js'
E = 'Na__North__DevMenu__Editor__.js'
C = 'Na__North__AppConfig__.json'
ENV = {G: 'W111_GIZMO', E: 'W111_EDITOR', C: 'W111_CONFIG'}

MUTANTS = [
    ('M1 the group is never registered (visible by default between frames)', G,
     "        Na__InteractiveOverlays__Register(Na__NorthGizmo__Group);",
     "        // (registration removed)"),
    ('M2 Show sets visible itself as well as wanted', G,
     "        Na__InteractiveOverlays__SetWanted(Na__NorthGizmo__Group, true);",
     "        Na__InteractiveOverlays__SetWanted(Na__NorthGizmo__Group, true); Na__NorthGizmo__Group.visible = true;"),
    ('M3 IsKept ignores what the browser kept', G,
     "            if (stored === 'true' || stored === 'false') Na__NorthGizmo__Kept = (stored === 'true');",
     "            void stored;"),
    ('M4 SetKept does not write the browser', G,
     "        try { window.localStorage.setItem(Na__NorthGizmo__SHOWN_STORE_KEY, String(Na__NorthGizmo__Kept)); } catch (error) { /* Session only */ }",
     "        /* not kept between visits */"),
    ('M5 Dispose does not unregister (a later frame shows the orphan)', G,
     "        Na__InteractiveOverlays__Unregister(Na__NorthGizmo__Group);              // <-- Handed back invisible, before it leaves the scene",
     "        // (unregister removed)"),
    ('M6 IsKept ignores the config default', G,
     "        Na__NorthGizmo__Kept = Na__NorthCfg__GetGizmoSetup().shownByDefault === true;",
     "        Na__NorthGizmo__Kept = false;"),
    ('M7 SyncCompass wants it only while the panel is open (kept ignored)', E,
     "        const wanted  = Na__NorthGizmo__IsKept() || Na__NorthDev__IsOpen();",
     "        const wanted  = Na__NorthDev__IsOpen();"),
    ('M8 Initialize does not sync at the end (a kept compass does not come back at start-up)', E,
     "        Na__NorthDev__SyncCompass();                                             // <-- A compass switched on in an earlier visit comes back up with the model",
     "        // (start-up sync removed)"),
    ('M9 the drawings listener does not sync with the panel shut', E,
     "        Na__NorthDev__SyncCompass();                                         // <-- Also with the panel shut: a kept compass follows the project it belongs to",
     "        if (Na__NorthDev__IsOpen()) Na__NorthDev__SyncCompass();"),
    ('M10 VV\'s retired sheet-open listener put back (disposes the kept compass when a sheet opens)', E,
     "        Na__NorthDev__SyncCompass();                                             // <-- A compass switched on in an earlier visit comes back up with the model",
     "        Na__NorthDev__SyncCompass();\n        window.addEventListener('na-layouteditor-mode-changed', () => { panel.classList.remove('is-open'); Na__NorthGizmo__Dispose(); });"),
    ('M11 the Show Compass button is not drawn', E,
     "        actions.appendChild(keep);",
     "        void keep;"),
    ('M12 config: Show Compass labels missing', C,
     '        "NorthDirection__Labels__ShowCompassLabel": "Show Compass",\n',
     ''),
    ('M13 config: ShownByDefault true shipped', C,
     '"NorthDirection__Gizmo__ShownByDefault": false',
     '"NorthDirection__Gizmo__ShownByDefault": true'),
]


def main():
    caught = 0
    lines = []
    tmp = tempfile.mkdtemp(prefix='na-w111m-')
    for label, name, old, new in MUTANTS:
        text = open(os.path.join(SRC, name), 'rb').read().decode('utf-8')
        if text.count(old) != 1:
            lines.append('NOT PLANTED  %s (anchor found %d times)' % (label, text.count(old)))
            continue
        path = os.path.join(tmp, name)
        with open(path, 'wb') as fh:
            fh.write(text.replace(old, new).encode('utf-8'))
        env = dict(os.environ)
        env[ENV[name]] = path
        res = subprocess.run(['node', os.path.join(HERE, 'w1_11_north_harness.mjs'), '--target', 'live' if LIVE else 'candidate'],
                             capture_output=True, env=env, cwd=HERE)
        out = res.stdout.decode('utf-8', 'replace')
        fails = [ln.strip()[:90] for ln in out.splitlines() if ln.strip().startswith('FAIL ')]
        if res.returncode == 1 and fails:
            caught += 1
            lines.append('CAUGHT       %s  (%d failing; first: %s)' % (label, len(fails), fails[0]))
        else:
            lines.append('MISSED       %s  (exit %d)' % (label, res.returncode))
        os.remove(path)
    os.rmdir(tmp)
    lines.append('')
    lines.append('%d/%d planted faults caught (%s)' % (caught, len(MUTANTS), 'live' if LIVE else 'candidate'))
    print('\n'.join(lines))
    sys.exit(0 if caught == len(MUTANTS) else 1)


if __name__ == '__main__':
    main()
