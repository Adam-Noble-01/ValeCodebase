# W1-06 scratch: read-only look at the D37 reference project (2026/3047__Doous) drawings block,
# to decide whether the ported DrawingDrafts test can read it as its on-disk fixture.
import json
import os

P = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Projects\2026\3047__Doous\project.json'

def main():
    print('exists', os.path.exists(P))
    with open(P, 'rb') as fh:
        raw = fh.read()
    doc = json.loads(raw.decode('utf-8'))
    block = doc.get('LayoutEditor__DrawingsData') or {}
    print('block keys', sorted(block.keys()))
    elevs = block.get('LayoutEditor__DrawingsData__Elevations') or []
    plans = block.get('LayoutEditor__DrawingsData__FloorPlans') or []
    sheets = block.get('LayoutEditor__DrawingsData__Sheets') or []
    print('elevations', len(elevs), 'plans', len(plans), 'sheets', len(sheets))
    for e in elevs:
        print('  E', e.get('Elevation__Id'), repr(e.get('Elevation__Name')), e.get('Elevation__AzimuthDeg'),
              e.get('Elevation__Mode'), e.get('Elevation__SceneId'), 'origin', e.get('Elevation__PlaneOriginMm'),
              'ann', type(e.get('Elevation__Annotations')).__name__, 'keys', len(e))
    for p in plans:
        print('  P', p.get('FloorPlan__Id'), repr(p.get('FloorPlan__Name')), p.get('FloorPlan__SceneId'))
    for s in sheets:
        vps = s.get('Sheet__Viewports') or []
        print('  S', repr(s.get('Sheet__Name')), (s.get('Sheet__Fields') or {}).get('Sheet__Fields__DrawingNumber'),
              [(v.get('Viewport__Kind'), v.get('Viewport__DrawingId'), v.get('Viewport__SceneId')) for v in vps])
    if elevs:
        e = elevs[0]
        count = 0
        for s in sheets:
            for v in (s.get('Sheet__Viewports') or []):
                if v.get('Viewport__Kind') != '2d':
                    continue
                if v.get('Viewport__DrawingId'):
                    if v.get('Viewport__DrawingId') == e.get('Elevation__Id'):
                        count += 1
                elif e.get('Elevation__SceneId') and v.get('Viewport__SceneId') == e.get('Elevation__SceneId'):
                    count += 1
        print('first elevation drawn by', count, 'viewport(s)')

if __name__ == '__main__':
    main()
