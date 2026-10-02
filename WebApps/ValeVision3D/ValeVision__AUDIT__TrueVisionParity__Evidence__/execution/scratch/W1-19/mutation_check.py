# -*- coding: utf-8 -*-
# W1-19 scratch: does harness_w1_19.mjs bite? Plant one fault at a time in a copy of the candidate
# SheetRecords (written to a throwaway folder outside the repo) and run the harness against it: every
# mutant must fail it, and the unmutated control must pass.
#
#   python -B mutation_check.py <tv file> <old file> <candidate file> <work dir> [<r2 dir>]

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

MUTANTS = [
    ('restack never runs',
     "        const moved = Na__LeRec__RestackLegacyLayers(sheet);\n",
     "        const moved = false;\n"),
    ('GROUP_KINDS back to the old three',
     "    const Na__LeRec__GROUP_KINDS        = [ 'viewport', 'shape', 'annotation', 'leader', 'dimension', 'group' ];",
     "    const Na__LeRec__GROUP_KINDS        = [ 'shape', 'annotation', 'group' ];"),
    ('site plan prefix seam missing',
     "'ValeVision__SitePlan__';",
     "'TrueVision__SitePlan__';"),
    ('document code seam missing (the token composes the id)',
     "    import { Na__DrawData__GetDocumentCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';",
     "    import { Na__DrawData__GetProjectCode as Na__DrawData__GetDocumentCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';"),
    ('short code delegation wrong (case folded)',
     "        return Na__LeCode__ShortCode(drawingNumber);",
     "        return Na__LeCode__ShortCode(String(drawingNumber).toUpperCase());"),
    ('depthFog style dropped',
     "            depthFog          : pick('depthFog')",
     "            depthFogX         : pick('depthFog')"),
    ('Asset__Samples left unfilled',
     "            if (!Number.isFinite(slot.Asset__Samples))    slot.Asset__Samples    = null;\n",
     ""),
    ('SheetShortCode reads the default too (TV reading too early)',
     "        return Na__LeCode__ShortCode(Na__LeCode__StoredNumber(sheet));",
     "        return Na__LeCode__ShortCode(Na__LeRec__DrawingNumber(sheet));"),
    ('area layers coerced again',
     "[ 'viewport', 'annotation', 'dimension', 'vector', 'area', 'image', 'mixed' ]",
     "[ 'viewport', 'annotation', 'dimension', 'vector', 'mixed' ]"),
]


def run(tv, old, new, r2):
    cmd = ['node', os.path.join(HERE, 'harness_w1_19.mjs'), '--tv', tv, '--old', old, '--new', new]
    if r2:
        cmd += ['--r2', r2]
    out = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    tail = out.stdout.decode('utf-8', 'replace').strip().split('\n')[-1]
    return out.returncode, tail


def main(argv):
    tv, old, cand, work = argv[:4]
    r2 = argv[4] if len(argv) > 4 else None
    os.makedirs(work, exist_ok=True)
    text = open(cand, 'r', encoding='utf-8').read()
    bad = 0
    code, tail = run(tv, old, cand, r2)
    print('control (unmutated)  exit %d  %s' % (code, tail[:140]))
    if code != 0:
        bad += 1
    for name, old_text, new_text in MUTANTS:
        if text.count(old_text) != 1:
            print('MUTANT NOT PLANTED (%d matches): %s' % (text.count(old_text), name))
            bad += 1
            continue
        path = os.path.join(work, 'mutant.js')
        with open(path, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(text.replace(old_text, new_text))
        code, tail = run(tv, old, path, r2)
        caught = code != 0
        print('%-58s exit %d  %s' % (name, code, 'CAUGHT' if caught else 'MISSED'))
        if not caught:
            bad += 1
    print('mutation check: %d problem(s)' % bad)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main(sys.argv[1:])
