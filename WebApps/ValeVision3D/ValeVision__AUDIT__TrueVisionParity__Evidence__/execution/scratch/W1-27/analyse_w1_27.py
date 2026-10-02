# -*- coding: utf-8 -*-
# W1-27 scratch: read logs/browser__vv.json and logs/browser__tv.json (browser_w1_27.mjs) and check
#   A. INERT    importing the five modules into the live graph fetched, listened, dispatched, logged, timed and
#               added nothing of their own (stack-attributed), and the config was not requested before Ready
#   B. LINK     the five modules linked in the real graph of BOTH trees with the same export names
#   C. VALUES   the session's answers in this app against figures worked out by hand
#   D. PARITY   every model-level step answers exactly as TrueVision's own tree does (same values, same
#               announcements); the Area tool's two steps are the declared exception (this app's Draw and
#               Rectangle tools are older than the ones the tool was written against - W2-26 / W3-07)
# Writes logs/analysis.txt and prints it. Exit 0 = every check held.
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LOGS = os.path.join(HERE, 'logs')
VV_FILE = sys.argv[sys.argv.index('--vv') + 1] if '--vv' in sys.argv else os.path.join(LOGS, 'browser__vv.json')   # a planted-fault run's result
REPORT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else os.path.join(LOGS, 'analysis.txt')
V = json.load(open(VV_FILE, encoding='utf-8'))
T = json.load(open(os.path.join(LOGS, 'browser__tv.json'), encoding='utf-8'))
OUT = []
FAILS = []


def check(name, ok, detail=None):
    OUT.append('%s  %s%s' % ('PASS' if ok else 'FAIL', name, ('   -> ' + json.dumps(detail)[:300]) if (not ok and detail is not None) else ''))
    if not ok:
        FAILS.append(name)


def near(a, b, tol=1e-6):
    return isinstance(a, (int, float)) and abs(a - b) <= tol


# A. INERT ---------------------------------------------------------------------
for tag, R in (('vv', V), ('tv', T)):
    i = R['inert']
    check('%s A1 no request, listener, announcement, console line or DOM node while the five modules load and settle' % tag,
          not i['fetch'] and not i['listen'] and not i['dispatch'] and not i['console'] and i['dom'] == 0, i)
    check('%s A2 no call of any kind whose stack passes through 59__Feature__FloorAreas while they load' % tag, i['fromFloorAreas'] == [], i['fromFloorAreas'])
    check('%s A3 the Floor Areas config is not requested on import, only by Ready' % tag,
          i['configRequestedBeforeReady'] is False and R['ready']['configFetches'] == ['run:ready'], R['ready']['configFetches'])
    t = i['timersByPhase']
    settle = t.get('deps-settle:requestAnimationFrame', 0)
    mine = t.get('mine-settle:requestAnimationFrame', 0)
    check('%s A4 the frames counted while they settled are the dependencies\' own loop (%d frames in 1.5 s before, %d after)' % (tag, settle, mine),
          settle > 0 and abs(mine - settle) <= max(10, settle // 5), t)
    check('%s A5 no page error, no 404, nothing off-machine' % tag,
          not [l for l in R['consoleLines'] if l.startswith('pageerror')] and not R['missing'] and not R['aborted'],
          {'missing': R['missing'][:5], 'aborted': R['aborted'][:5]})

# B. LINK ----------------------------------------------------------------------
check('B1 all 15 session steps ran in this app with no error', len(V['steps']) == 15 and not V['errors'], V['errors'])
check('B2 ...and in TrueVision\'s tree', len(T['steps']) == 15 and not T['errors'], T['errors'])
check('B3 the five modules export exactly TrueVision\'s names', V['exports'] == T['exports'])
check('B4 export counts: Geometry 22, Floor Areas 50, Tool 15, Menu 1, Paint 3',
      [len(V['exports'][k]) for k in ('geometry', 'areas', 'tool', 'menu', 'paint')] == [22, 50, 15, 1, 3],
      [len(V['exports'][k]) for k in ('geometry', 'areas', 'tool', 'menu', 'paint')])

# C. VALUES (this app) -----------------------------------------------------------
r = V['ready']
check('C1 Ready loads the config (opacity 0.3, not the 0.5 fallback) and the layer is called Floor Areas',
      r['configLoaded'] and r['opacityBeforeReady'] == 0.5 and r['opacity'] == 0.3 and r['layerName'] == 'Floor Areas', r)
check('C2 TrueVision\'s group suggestions ship (DR-14 (A), TV\'s list)',
      r['suggestions'] == ['Ground Floor', 'First Floor', 'Second Floor', 'Basement', 'Garage', 'Outbuilding'], r['suggestions'])
l = V['layer']
check('C3 a sheet with no Floor Areas layer gains one straight over the drawings (Text, Dimensions, Vectors, Floor Areas, Viewports)',
      l['before']['layerOf'] is None and [x[0] for x in l['layers']] == ['Text', 'Dimensions', 'Vectors', 'Floor Areas', 'Viewports']
      and l['made'] == {'name': 'Floor Areas', 'type': 'area'} and l['sameAgain'], l)
check('C4 a new sheet already has it (SheetRecords seeds Layer_005) and EnsureLayer finds it',
      l['seededSheet'] == {'id': 'Layer_005', 'name': 'Floor Areas'}, l['seededSheet'])
check('C5 making a layer is one "layers" announcement', V['layer__events'] == ['na-layouteditor-sheets-changed:layers'], V['layer__events'])
m = V['make']
check('C6 Make names rooms Area 1..6 in turn and moves the room onto Floor Areas with the new-area wash',
      m['names'] == ['Area 1', 'Area 2', 'Area 3', 'Area 4', 'Area 5', 'Area 6'] and m['room']['layer'] == 'Floor Areas'
      and m['room']['fill'] == '#bcd9ee' and m['room']['fillOpacity'] == 0.3 and m['room']['area'] == {'Area__Name': 'Area 1'}, m)
check('C7 Make refuses a holed vector, an open line and a room twice', m['holed'] is None and m['open'] is None and m['twice'] is None, m)
ms = V['measure']
check('C8 100 x 60 mm on the 1:50 plan: 15.00 m2, 16.00 m round, label in the middle of its box',
      near(ms['room']['m2'], 15) and near(ms['room']['perimeterM'], 16) and ms['room']['source'] == 'viewport'
      and ms['room']['home'] == {'placement': 'box', 'x': 90, 'y': 70}, ms['room'])
check('C9 the L: 6400 mm2 of paper is 16.00 m2 at 1:50, labelled at its visual centre (its box middle is in the bite)',
      near(ms['ell']['m2'], 16) and ms['ell']['home']['placement'] == 'visual', ms['ell'])
check('C10 the figure of eight is reported crossing and measures nothing', ms['eight']['crossing'] is True and ms['eight']['m2'] == 0, ms['eight'])
check('C11 the same rectangle on the 1:100 site plan: 60.00 m2 (the scale is squared)',
      near(ms['site']['m2'], 60) and ms['site']['denominator'] == 100 and ms['site']['viewport'] == 'Viewport_002', ms['site'])
check('C12 off every drawing: the sheet\'s own scale (1:50 - the larger frame\'s), 40 x 40 mm = 4.00 m2',
      ms['off']['source'] == 'sheet' and ms['off']['denominator'] == 50 and near(ms['off']['m2'], 4) and ms['sheetDenominator'] == 50, ms['off'])
h = V['hiddenViewports']
check('C13 hiding the Viewports layer changes no area (the drawing scale\'s own lookup finds nothing, the room still reads 1:50)',
      h['room'] == ms['room'] and h['site'] == ms['site'] and h['drawScaleSays'] is None, h)
tf = V['turnedFrame']
check('C14 a frame turned 30 degrees: the room is still read against it; its corner is not (the leaf Na__LeVpRot__Contains)',
      tf['level']['corner'] == 'Viewport_001' and tf['turned']['corner'] is None and tf['turned']['containsSays'] is False
      and tf['turned']['room']['viewport'] == 'Viewport_001' and tf['turned']['cornerRoom']['source'] == 'sheet', tf)
fs = V['fixedScale']
check('C15 a fixed 1:20 reads 2.40 m2, and clearing it returns to the drawing (two "shape" steps)',
      fs['fixed']['source'] == 'fixed' and near(fs['fixed']['m2'], 2.4) and fs['after']['source'] == 'viewport'
      and fs['block'] == {'Area__Name': 'Area 1'} and V['fixedScale__events'] == ['na-layouteditor-sheets-changed:shape'] * 2, fs)
g = V['groups']
check('C16 filing under Ground Floor and Outbuilding makes both groups with the palette\'s first two colours and paints the rooms',
      g['groups'] == [{'AreaGroup__Colour': '#bcd9ee', 'AreaGroup__Name': 'Ground Floor'}, {'AreaGroup__Colour': '#c6e0c6', 'AreaGroup__Name': 'Outbuilding'}]
      and g['site']['fill'] == '#c6e0c6', g)
check('C17 each filing is ONE "areas" step (DR-40 item 4)', V['groups__events'] == ['na-layouteditor-sheets-changed:areas'] * 2, V['groups__events'])
check('C18 the index: 6 rooms, 95.09 m2, one crossing, Ground Floor 15, Outbuilding 60, 4 ungrouped',
      g['index']['count'] == 6 and near(g['index']['totalM2'], 95.09) and g['index']['crossings'] == 1
      and g['index']['groups'] == [['Ground Floor', '#bcd9ee', True, 15, 1], ['Outbuilding', '#c6e0c6', True, 60, 1]], g['index'])
p = V['paint']
check('C19 the label is two centred lines, the name over the figure, at the room\'s label point',
      [x['text'] for x in p['room']['prims']] == ['Area 1', '15.00 m²'] and all(x['align'] == 'center' and x['x'] == 90 for x in p['room']['prims']), p['room'])
check('C20 a crossed outline says so instead of a number; a plain vector gets no label',
      p['eight']['prims'][1]['text'] == 'outline crosses itself' and p['plain'] == {'prims': [], 'pushed': False}, p)
check('C21 measured in the embedded Open Sans (PdfFonts loaded): "Area 1" at 2.4 mm semibold is 7.39 mm', near(p['measureProbe'], 7.39336, 1e-4) and r['fontsLoaded'] is True, p['measureProbe'])
mn = V['menu']
check('C22 the menu: what it measures, the groups ticked, the drawing\'s scale ticked, every scale on both lists, label, outline, rename, convert',
      mn['room'][0] == 'Area 1  -  15.00 m² (disabled)' and 'Group: Ground Floor [x]' in mn['room']
      and "Measure at the drawing's scale (1:50 - GROUND FLOOR PLAN) [x]" in mn['room'] and 'Measure at 1:200' in mn['room']
      and 'Measure at 1:5000' in mn['room'] and 'Make it a plain vector' in mn['room'], mn['room'])
check('C23 a plain closed vector is offered one line; a holed vector and an open line nothing',
      mn['plainClosed'] == ['Measure this shape as a floor area', '---'] and mn['holed'] == [] and mn['open'] == [], mn)
u = V['unmake']
check('C24 Unmake: the outline and its colour stay, it goes back to Vectors with no block', u['done'] and u['shape']['area'] is None and u['shape']['layer'] == 'Vectors', u)
d = V['toolDefaults']
check('C25 the tool hands the drawing tools a filled, closed room block on Floor Areas in the new-area style',
      d['filled'] is True and d['closed'] is True and d['area'] == {'Area__Name': 'Area 3'} and d['layerId'] == 'Floor Areas'
      and d['fillColour'] == '#bcd9ee' and d['strokeColour'] == '#2e6f96', d)

# D. PARITY with TrueVision's own tree --------------------------------------------------------
MODEL_STEPS = ['ready', 'layer', 'make', 'measure', 'hiddenViewports', 'turnedFrame', 'fixedScale', 'groups', 'paint', 'menu', 'unmake', 'toolDefaults']
for s in MODEL_STEPS:
    check('D %-16s answers exactly as TrueVision\'s tree (values and announcements)' % s,
          V[s] == T[s] and V.get(s + '__events') == T.get(s + '__events'),
          {'vv': V[s], 'tv': T[s]} if V[s] != T[s] else {'vv': V.get(s + '__events'), 'tv': T.get(s + '__events')})
for s in ('toolRectangle', 'toolPoints'):
    vv_land, tv_land = V[s]['landed'][0], T[s]['landed'][0]
    check('D %-16s DECLARED DIFFERENCE: TrueVision lands a room on Floor Areas and announces it; this app\'s older %s lands a plain closed vector on Vectors (no area-placed)'
          % (s, 'RectangleTool 1.2.0' if s == 'toolRectangle' else 'ShapeTool 1.6.0'),
          tv_land['area'] is not None and tv_land['layer'] == 'Floor Areas' and T[s]['placed'] == 1
          and vv_land['area'] is None and vv_land['layer'] == 'Vectors' and V[s]['placed'] == 0 and vv_land['closed'] is True,
          {'vv': V[s], 'tv': T[s]})

OUT.append('')
OUT.append('RESULT: %d check(s), %d failed%s' % (len(OUT) - 1, len(FAILS), (': ' + '; '.join(FAILS)) if FAILS else ''))
text = '\n'.join(OUT)
with open(REPORT, 'w', encoding='utf-8') as fh:
    fh.write(text + '\n')
print(text)
sys.exit(1 if FAILS else 0)
