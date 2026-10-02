# =============================================================================
# W1-12 SCRATCH - BUILD THE ProjectRecord CANDIDATE (never shipped)
# =============================================================================
#
# The VV body stays (S03b-F19 keep_vv_divergence): source_lf__...js beside this
# script is the new text, written LF. This script
#   - checks the live file is the one read (sha1, CRLF, unchanged since HEAD),
#   - checks the parts that are TrueVision's verbatim really are (read at the pin
#     with git show): the export block and Na__LeRecord__ComposeClientName,
#   - checks the identity rules (no TV banner/prefix, no NA admin or PlanVision
#     file names, no presentation-block read),
#   - writes candidate__Na__LayoutEditor__ProjectRecord__.js with the live file's
#     own line ending (CRLF).
#
# =============================================================================

import hashlib
import os
import subprocess
import sys

HERE      = os.path.dirname(os.path.abspath(__file__))
LIVE      = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\07__Core__SheetData\Na__LayoutEditor__ProjectRecord__.js'
SOURCE    = os.path.join(HERE, 'source_lf__Na__LayoutEditor__ProjectRecord__.js')
OUT       = os.path.join(HERE, 'candidate__Na__LayoutEditor__ProjectRecord__.js')
LIVE_SHA1 = 'd0b847edcae6166d035e29bc836cad817ba66b09'      # <-- HEAD's file (VV 1.0.0, 20-Sep-2026), CRLF in the working tree
TV_REPO   = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_PATH   = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js'
PIN       = 'b2aa9151'

live = open(LIVE, 'rb').read()
if hashlib.sha1(live).hexdigest() != LIVE_SHA1:
    sys.exit('STOP: the live ProjectRecord changed since it was read')
if live.count(b'\r\n') != live.count(b'\n'):
    sys.exit('STOP: expected a CRLF file')

src = open(SOURCE, 'rb').read().decode('utf-8')
if '\r' in src:
    sys.exit('STOP: the source text must be LF')
if '\t' in src:
    sys.exit('STOP: a tab crept in')

tv = subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':' + TV_PATH], capture_output=True, check=True).stdout.decode('utf-8')


def block(text, start_marker, end_marker):
    start = text.index(start_marker)
    end   = text.index(end_marker, start) + len(end_marker)
    return text[start:end]


# TrueVision's text kept verbatim
compose_tv = block(tv,  '    // HELPER FUNCTION | Compose the Client\'s Name as a Drawing Prints It', '            .join(\' \');\n    }\n')
compose_vv = block(src, '    // HELPER FUNCTION | Compose the Client\'s Name as a Drawing Prints It', '            .join(\' \');\n    }\n')
if compose_tv != compose_vv:
    sys.exit('STOP: Na__LeRecord__ComposeClientName is not TrueVision\'s verbatim')
exports_tv = block(tv,  '    // MODULE EXPORTS | Layout Editor Project Record API', '    };\n')
exports_vv = block(src, '    // MODULE EXPORTS | Layout Editor Project Record API', '    };\n')
if exports_tv != exports_vv:
    sys.exit('STOP: the export block is not TrueVision\'s verbatim')
integration_tv = block(tv,  '// INTEGRATION:\n', 'when they differ.\n')
integration_vv = block(src, '// INTEGRATION:\n', 'when they differ.\n')
if integration_tv != integration_vv:
    sys.exit('STOP: INTEGRATION is not TrueVision\'s verbatim')
for line in ('// FILE       : Na__LayoutEditor__ProjectRecord__.js', '// NAMESPACE  : Na__LeRecord', '// AUTHOR     : Adam Noble - Noble Architecture', '// CREATED    : 19-Sep-2026'):
    if line not in tv or line not in src:
        sys.exit('STOP: header line not shared with TrueVision: ' + line)

# Identity and the bug being fixed
code = src.split('// =============================================================================\n\n\n', 1)[1]   # <-- below the header
for marker in ('TRUEVISION3D', '[TrueVision3D', 'TrueVision__', 'NaProjectPortal', 'ProjectAdmin__', 'PlanVision__ProjectData', '/na-apps/', 'na-project-portal'):
    if marker in src:
        sys.exit('STOP: identity marker "%s" in the candidate' % marker)
for forbidden in ('GetActiveConfig', 'PresentationMode', 'fetch(', 'AdminFileLocation', 'PlansFileLocation'):
    if forbidden in code:
        sys.exit('STOP: the code still names "%s"' % forbidden)
if code.count('Na__CfApi__GetLoadedProjectData') != 2:
    sys.exit('STOP: expected the facade accessor imported once and read once')
if src.count('{{VVREL:W1-12}}') != 2:
    sys.exit('STOP: expected two W1-12 placeholders (Ported on, DEVELOPMENT LOG)')

data = src.replace('\n', '\r\n').encode('utf-8')
open(OUT, 'wb').write(data)
print('candidate written: %s' % OUT)
print('  lines %d -> %d   bytes %d -> %d   CRLF %d   sha1 %s' % (live.count(b'\n'), data.count(b'\n'), len(live), len(data), data.count(b'\r\n'), hashlib.sha1(data).hexdigest()))
print('  TrueVision verbatim: ComposeClientName, the export block, INTEGRATION, FILE/NAMESPACE/AUTHOR/CREATED lines')
