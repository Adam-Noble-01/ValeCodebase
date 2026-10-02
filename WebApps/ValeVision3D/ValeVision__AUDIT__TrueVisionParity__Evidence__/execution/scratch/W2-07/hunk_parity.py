"""Hunk parity: compare the v2.58.2 pieces of the live LoadingSequence with TrueVision's at the pin.

For each piece (constants, WatchRefineProgress + ArmNextFrame, Tick, the no-timestamp planFrame call, the
engine-hold gate) print the lines that differ (whitespace ignored). Expected differences are the K2 C1
console prefixes, the watchdog's held flag (VV hold set) and the VV-adapted engine-hold gate.
Usage: python -B hunk_parity.py
"""
import difflib, subprocess, sys
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_PATH = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js'
LIVE = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\01__AppCore\Na__AppFlow__LoadingSequence.js'

tv = subprocess.run(['git', '-C', NAWEB, 'show', 'b2aa9151:' + TV_PATH], capture_output=True, check=True).stdout.decode('utf-8')
vv = open(LIVE, 'rb').read().decode('utf-8').replace('\r\n', '\n')

def piece(text, start, end):
    a = text.index(start)
    b = text.index(end, a) + len(end)
    return text[a:b]

PIECES = [
    ('constants (STRANDED_RECOVERY_MS, NO_PROGRESS_MS, the seen marker)',
     '        // CONSTANT | How Long to Leave a Stranded Refinement Before Restarting It\n',
     '        let   Na__RenderLoop__RefineSeenAt      = 0;'),
    ('WatchRefineProgress + ArmNextFrame',
     '        // SUB FUNCTION | Notice a Refinement That Has Stopped Getting Anywhere\n',
     '            }, Na__RenderLoop__STRANDED_RECOVERY_MS);\n        }\n'),
    ('Tick (thrown-frame guard, ArmNextFrame in the finally)',
     '        function Na__RenderLoop__Tick(timestamp) {\n',
     '                Na__RenderLoop__ArmNextFrame(keepRendering);\n            }\n        }\n'),
    ('planFrame with no timestamp',
     '                // NO TIMESTAMP IS PASSED, deliberately.',
     '                });\n'),
]
total_diffs = 0
for label, start, end in PIECES:
    a = [l.strip() for l in piece(tv, start, end).split('\n') if l.strip()]
    b = [l.strip() for l in piece(vv, start, end).split('\n') if l.strip()]
    diffs = [d for d in difflib.unified_diff(a, b, lineterm='', n=0) if d[:1] in '+-' and not d.startswith('+++') and not d.startswith('---')]
    total_diffs += len(diffs)
    print('==', label, ':', 'identical' if not diffs else str(len(diffs)) + ' differing line(s)')
    for d in diffs:
        print('    ' + d)

# The engine-hold gate: VV adapts TV's three statements
tv_gate = piece(tv, '            if (Na__RenderLoop__IsPaused()) {\n', '            }\n')
vv_gate = piece(vv, '            if (Na__RenderLoop__IsPaused() || Na__RenderLoop__PauseReasons.size > 0) {\n', '            }\n')
print('== engine-hold gate')
print('    TV: ' + ' '.join(l.strip() for l in tv_gate.split('\n') if l.strip()))
print('    VV: ' + ' '.join(l.strip() for l in vv_gate.split('\n') if l.strip()))
print('    TV gate is the first statement of RenderFrame:', tv.index('        function Na__RenderLoop__RenderFrame(deltaMs) {\n') < tv.index(tv_gate) < tv.index('            // 2D DRAWING MODE'))
print('    VV gate is the first statement of RenderFrame:', vv.index('        function Na__RenderLoop__RenderFrame(deltaMs) {\n') < vv.index(vv_gate) < vv.index('            // 2D DRAWING MODE'))
print('    import of Na__RenderLoop__IsPaused present:', "        Na__RenderLoop__IsPaused\n    } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';" in vv)
print('    planFrame passed a timestamp anywhere:', 'now       : Na__RenderLoop__PrevTimestamp' in vv)
print('    the tick still checks the hold itself:', 'if (Na__RenderLoop__PauseReasons.size > 0) { Na__RenderLoop__PendingWhilePaused = true; return; }  // <-- A frame scheduled before the hold began' in vv)
print('\ntotal differing lines in the verbatim pieces:', total_diffs,
      '(expected 8 = 4 pairs: the two K2 C1 console prefixes, the watchdog\'s held flag (VV hold set) and the'
      ' planFrame camera, ValeVision\'s pre-existing Na__RenderLoop__ActiveCamera seam for its legacy elevation camera)')
sys.exit(0 if total_diffs == 8 else 1)
