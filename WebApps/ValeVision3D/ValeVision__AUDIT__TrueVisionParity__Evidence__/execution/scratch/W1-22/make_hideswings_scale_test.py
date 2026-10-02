# -*- coding: utf-8 -*-
# W1-22 scratch: lift, VERBATIM, the 1:200 parts of TrueVision's Na__Test__HideSwings__.test.mjs (at the pin
# b2aa9151) into a runnable scratch copy pointed at a source tree given at run time (env W1_22_SRC, an
# absolute path to a 02__Src__AppModules tree). The copy carries TrueVision's text, so it is written OUTSIDE
# the repository (the session scratchpad) and deleted afterwards; this script re-creates it.
#
#   python -B make_hideswings_scale_test.py <out_dir>
#
#   Lines 1-141   the browser, loader, checks, config readers and the CONFIG region up to its three scale
#                 checks (the PlanDoors checks after them name TrueVision__Linetype__DoorSwings, a K2 K3 seam
#                 this app carries as ValeVision__, and belong to W2-11 / W2-16's PlanDoors port)
#   Lines 160-177 the SCALE region whole (the shipped ScaleManager)
#   Lines 179-214 the RECORD region's SheetRecords checks, "1:200 survives a load" last
#   Lines 323-331 the Result block
# Only the SRC line changes.

import os
import subprocess
import sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
REL = 'na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__HideSwings__.test.mjs'


def lines(rows, first, last):
    return '\n'.join(rows[first - 1:last]) + '\n'


def main(out_dir):
    text = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + REL], capture_output=True, check=True).stdout.decode('utf-8')
    rows = text.split('\n')
    assert rows[138].startswith("    check('the architectural scales are 1:20, 1:50, 1:100 and 1:200"), rows[138]
    assert rows[140].startswith("    check('a new viewport still starts at 1:50'"), rows[140]
    assert rows[160].startswith('// -------'), rows[160]
    assert rows[161].startswith('// REGION | The Scale'), rows[161]
    assert rows[175].startswith('// endregion'), rows[175]
    assert rows[179].startswith('// REGION | The Record'), rows[179]
    assert rows[213].startswith("    check('1:200 survives a load"), rows[213]
    assert rows[324].startswith('// REGION | Result'), rows[324]
    head = lines(rows, 1, 141)
    old_src = "    const SRC        = resolve(SCRIPT_DIR, '..', '02__Src__AppModules');\n"
    if head.count(old_src) != 1:
        raise SystemExit('SRC line not found once')
    head = head.replace(old_src, "    const SRC        = process.env.W1_22_SRC;                                   // <-- W1-22 scratch: the tree under test\n")
    body = head + '\n' + lines(rows, 160, 177) + '\n' + lines(rows, 179, 214) + '\n' + lines(rows, 323, 331)
    os.makedirs(out_dir, exist_ok=True)
    dest = os.path.join(out_dir, 'HideSwings__scale__w1_22.test.mjs')
    with open(dest, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(body)
    print('wrote ' + dest)


if __name__ == '__main__':
    main(sys.argv[1])
