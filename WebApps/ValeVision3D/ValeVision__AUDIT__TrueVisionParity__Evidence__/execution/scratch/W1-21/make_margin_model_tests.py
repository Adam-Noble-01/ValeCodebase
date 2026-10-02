# -*- coding: utf-8 -*-
# W1-21 scratch: lift the RECORD and MODEL parts of TrueVision's Na__Test__NoteRegions__ and
# Na__Test__LeaderlessNotes__ (read at the pin with git show) into runnable copies, verbatim, for the
# "sections run earlier by W1-21" (test_ownership; the files themselves are W2-32's). Dropped, and only
# these: the four lines that load the margin layout modules (SpecMargin__Column__, NoteRegions__,
# SpecMargin__ - W2-32's) and the sections that use them ("Where Every Note Goes", "What the Sheet Lists",
# "RB05 D01"). Every kept line is TrueVision's byte for byte except the SRC line, which points at the app
# root to test (--src). Each boundary line is asserted before it is cut.
#
# Usage: python -B make_margin_model_tests.py --out <dir> --src <app 02__Src__AppModules dir>

import os
import subprocess
import sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
APP = 'na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/'
SRC_LINE = "    const SRC        = resolve(SCRIPT_DIR, '..', '02__Src__AppModules');"

# (name, [(first, last) 1-based inclusive ranges kept], {line: expected start}, result range)
PLANS = {
    'Na__Test__NoteRegions__.test.mjs': {
        'keep': [(1, 177), (183, 192), (195, 195), (198, 268), (383, 384)],
        'expect': {
            177: '    };',
            178: '    const common  = Object.assign({}, cfg, chrome, Layout, Records, RegionRec, LeadRec, spec);',
            181: '    const Margin  = await load(',
            199: '// REGION | The Record',
            234: '// REGION | The Model',
            268: '// endregion',
            272: '// REGION | Where Every Note Goes',
            383: "console.log('\\n' + (failures ? failures + ' check(s) FAILED' : 'Every check passed'));",
            384: 'process.exit(failures ? 1 : 0);',
        },
    },
    'Na__Test__LeaderlessNotes__.test.mjs': {
        'keep': [(1, 176), (182, 191), (194, 194), (197, 272), (380, 381)],
        'expect': {
            176: '    };',
            177: '    const common  = Object.assign({}, cfg, chrome, Layout, Records, RegionRec, LeadRec, spec);',
            180: '    const Margin  = await load(',
            198: '// REGION | The Record',
            239: '// REGION | The Model',
            272: '// endregion',
            276: '// REGION | What the Sheet Lists',
            380: "console.log('\\n' + (failures ? failures + ' check(s) FAILED' : 'Every check passed'));",
            381: 'process.exit(failures ? 1 : 0);',
        },
    },
}


def main(argv):
    out = argv[argv.index('--out') + 1]
    src = argv[argv.index('--src') + 1]
    os.makedirs(out, exist_ok=True)
    for name, plan in PLANS.items():
        data = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + APP + name], capture_output=True, check=True).stdout
        lines = data.decode('utf-8').split('\n')
        for no, start in plan['expect'].items():
            if not lines[no - 1].startswith(start):
                raise SystemExit('%s:%d expected %r, found %r' % (name, no, start, lines[no - 1]))
        kept = []
        for first, last in plan['keep']:
            kept.extend(lines[first - 1:last])
            kept.append('// [W1-21 lift: TrueVision lines %d-%d end here]' % (first, last))
        text = '\n'.join(kept) + '\n'
        if text.count(SRC_LINE) != 1:
            raise SystemExit('%s: SRC line not found exactly once' % name)
        text = text.replace(SRC_LINE, "    const SRC        = %r;" % src.replace('\\', '/'))
        dst = os.path.join(out, name.replace('.test.mjs', '__ModelPart__W1-21.test.mjs'))
        with open(dst, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(text)
        print('lifted %s -> %s (%d lines kept of %d)' % (name, dst, sum(l - f + 1 for f, l in plan['keep']), len(lines)))


if __name__ == '__main__':
    main(sys.argv[1:])
