# -*- coding: utf-8 -*-
# W1-19 scratch: lift, VERBATIM, the record parts of three TrueVision tests at the pin (b2aa9151) into
# runnable scratch copies, pointed at a source tree given at run time (env W1_19_SRC, an absolute path to a
# 02__Src__AppModules tree). The copies carry TrueVision's text, so they are written OUTSIDE the repository
# (the session scratchpad) and deleted afterwards; this script re-creates them.
#
#   python -B make_record_tests.py <out_dir>
#
#   LayerStack     whole file (the plan half runs on ValeVision's PaintOrder, W1-13; the restack half is the
#                  record part); only the SRC line changes.
#   HideSwings     the browser, loader, checks and config readers (TV lines 1-130), the SheetSetup and
#                  ScaleManager loads (136-137, 165-166), the RECORD region's SheetRecords checks (183-214)
#                  and TV's Result block. env W1_19_SCALES (a JSON list) stands in for W1-22's 1:200 row.
#   HatchLineControls  imports, check and loader (TV lines 1-69) and the record region (368-409).

import os
import subprocess
import sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
APP = 'na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/'


def show(name):
    out = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + APP + name], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if out.returncode != 0:
        raise SystemExit('git show failed: ' + name)
    return out.stdout.decode('utf-8')


def once(text, old, new, label):
    if text.count(old) != 1:
        raise SystemExit('%s: expected exactly one "%s"' % (label, old.strip()[:60]))
    return text.replace(old, new)


def lines(text, first, last):
    """1-based inclusive line range, newline-terminated."""
    rows = text.split('\n')
    return '\n'.join(rows[first - 1:last]) + '\n'


def main(argv):
    out_dir = argv[0]
    os.makedirs(out_dir, exist_ok=True)

    # LAYER STACK - whole
    ls = show('Na__Test__LayerStack__.test.mjs')
    ls = once(ls, "    const SRC        = resolve(SCRIPT_DIR, '..', '02__Src__AppModules');\n",
              "    const SRC        = process.env.W1_19_SRC;                                   // <-- W1-19 scratch: the tree under test\n", 'LayerStack')
    with open(os.path.join(out_dir, 'LayerStack__w1_19.test.mjs'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(ls)

    # HIDE SWINGS - the record part
    hs = show('Na__Test__HideSwings__.test.mjs')
    rows = hs.split('\n')
    assert rows[136].startswith("    const Setup = await load(LE + '03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js'"), rows[136]
    assert rows[165].startswith("    const Scale = await load(LE + '07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js'"), rows[165]
    assert rows[182].startswith("    console.log('\\n  The record"), rows[182]
    assert rows[213].startswith("    check('1:200 survives a load"), rows[213]
    assert rows[324].startswith('// REGION | Result'), rows[324]
    head = lines(hs, 1, 130)
    head = once(head, "    const SRC        = resolve(SCRIPT_DIR, '..', '02__Src__AppModules');\n",
                "    const SRC        = process.env.W1_19_SRC;                                   // <-- W1-19 scratch: the tree under test\n", 'HideSwings')
    head = once(head, "    let active = CONFIG;\n",
                "    if (process.env.W1_19_SCALES) CONFIG.LayoutEditor__Scales__Config = Object.assign({}, CONFIG.LayoutEditor__Scales__Config, { LayoutEditor__Scales__AvailableScaleDenominators : JSON.parse(process.env.W1_19_SCALES) });   // <-- W1-19 scratch: W1-22's 1:200 row, when asked\n"
                "    let active = CONFIG;\n", 'HideSwings')
    body = (head + lines(hs, 136, 137) + lines(hs, 165, 166) + lines(hs, 183, 214) + '\n' + lines(hs, 323, 331))
    with open(os.path.join(out_dir, 'HideSwings__record__w1_19.test.mjs'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(body)

    # HATCH LINE CONTROLS - the record part
    hl = show('Na__Test__HatchLineControls__.test.mjs')
    rows = hl.split('\n')
    assert rows[367].startswith('// -------'), rows[367]
    assert rows[368].startswith('// The record layer keeps both'), rows[368]
    assert rows[68] == '}', rows[68]
    head = lines(hl, 1, 69)
    head = once(head, "const SRC  = path.resolve(HERE, '../02__Src__AppModules')\n",
                "const SRC  = process.env.W1_19_SRC                                               // <-- W1-19 scratch: the tree under test\n", 'HatchLineControls')
    body = head + '\n' + lines(hl, 368, 409)
    with open(os.path.join(out_dir, 'HatchLineControls__records__w1_19.test.mjs'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(body)
    print('wrote three record tests into ' + out_dir)


if __name__ == '__main__':
    main(sys.argv[1:])
