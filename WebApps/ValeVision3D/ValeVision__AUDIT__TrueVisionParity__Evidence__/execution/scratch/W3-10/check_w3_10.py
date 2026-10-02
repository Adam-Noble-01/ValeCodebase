# -*- coding: utf-8 -*-
# W3-10 post-landing checks (read-only): the ModeController carries every TrueVision floor-area line verbatim, in
# TrueVision's relative order; Floor Areas is the last right-column registration; the ready chain order matches
# TrueVision's; AccordionSections equals TrueVision's; no [TrueVision3D prefix or TRUEVISION3D banner in the new
# files; the panel self-links its stylesheet; the Floor Areas files are not imported by anything that the
# ModeController does not reach first (no new import of the ModeController from them).
import json
import os
import re
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
LE = os.path.join(VV, '02__Src__AppModules', '51__System__LayoutEditor')
MC = open(os.path.join(LE, '05__Core__ModeController', 'Na__LayoutEditor__ModeController__.js'), encoding='utf-8').read().replace('\r\n', '\n')
TV = open(os.path.join(HERE, 'tv', 'Na__LayoutEditor__ModeController__.js'), encoding='utf-8').read().split('\n')
CFG = json.load(open(os.path.join(LE, '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json'), encoding='utf-8'))
TVCFG = json.load(open(os.path.join(HERE, 'tv', 'Na__LayoutEditor__AppConfig__.json'), encoding='utf-8'))
results = []


def check(name, ok):
    results.append((name, bool(ok)))


lines = MC.split('\n')
for no in (292, 293, 294, 296, 553, 1003, 1028, 1208) + tuple(range(1051, 1060)) + tuple(range(1084, 1090)):
    check('TV :%d present verbatim' % no, TV[no - 1] in lines)


def idx(s):
    return MC.find(s)


check('register: Patterns then Floor Areas, then the toolbar mount',
      idx('Na__LePanelPatterns__Register();') < idx('Na__LePanelArea__Register();') < idx('Na__LeToolbar__Mount(host'))
regs = re.findall(r'^\s+(Na__LePanel\w+__Register\w*)\(\);', MC, re.M)
check('Floor Areas is the last panel registration', regs and regs[-1] == 'Na__LePanelArea__Register')
ready = re.search(r'Promise\.all\(\[([^\]]*)\]\)', MC).group(1)
tvready = re.search(r'Promise\.all\(\[([^\]]*)\]\)', '\n'.join(TV)).group(1)
check('ready chain equals TrueVision', ready.split() == tvready.split())
check('Table attach after viewport names, before images init',
      idx('Na__LeViewId__Initialize();') < idx('Na__LeAreaTable__Attach();') < idx('Na__LeImg__Initialize({'))
check("'areas' before 'margin' in MARKUP_REASONS", idx("        'areas',") < idx("        'margin'      "))
pc = CFG['LayoutEditor__Panels__Config']['LayoutEditor__Panels__AccordionSections']
tpc = TVCFG['LayoutEditor__Panels__Config']['LayoutEditor__Panels__AccordionSections']
check('AccordionSections == TrueVision (floor-areas after leaders)', pc == tpc)
check('FocusNote names the room rule', 'a room opens Floor Areas' in CFG['LayoutEditor__Panels__Config']['LayoutEditor__Panels__FocusNote'])
fa = os.path.join(LE, '59__Feature__FloorAreas')
for name in ('Na__LayoutEditor__Panel__FloorAreas__.js', 'Na__LayoutEditor__FloorAreas__Table__.js',
             'Na__LayoutEditor__FloorAreas__LabelGrip__.js', 'Na__LayoutEditor__Styles__FloorAreas__.css'):
    t = open(os.path.join(fa, name), encoding='utf-8').read()
    check(name + ': no TRUEVISION3D / [TrueVision3D', 'TRUEVISION3D' not in t and '[TrueVision3D' not in t)
    check(name + ': no ModeController import', 'ModeController' not in re.sub(r'//[^\n]*', '', t))
panel = open(os.path.join(fa, 'Na__LayoutEditor__Panel__FloorAreas__.js'), encoding='utf-8').read()
check('panel self-links its stylesheet', "new URL('./Na__LayoutEditor__Styles__FloorAreas__.css', import.meta.url)" in panel)
loader = open(os.path.join(LE, '01__Core__Loader', 'Na__LayoutEditor__Loader__.js'), encoding='utf-8').read()
check('loader list does not carry the Floor Areas sheet (TV: self-linked)', 'Styles__FloorAreas' not in loader)

bad = [n for n, ok in results if not ok]
for n, ok in results:
    print(('PASS ' if ok else 'FAIL ') + n)
print('%d/%d PASS' % (len(results) - len(bad), len(results)))
sys.exit(1 if bad else 0)
