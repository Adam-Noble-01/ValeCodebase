# W1-08 scratch (read only): which local Vale projects hold floor plan records, and which optional keys those records carry.
import glob
import json
import os

ROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Projects'
files = sorted(glob.glob(os.path.join(ROOT, '*', '*', 'project.json')))
with_plans = 0
for path in files:
    try:
        data = json.load(open(path, encoding='utf-8'))
    except Exception as error:
        print('unreadable', os.path.relpath(path, ROOT), error)
        continue
    block = data.get('LayoutEditor__DrawingsData') if isinstance(data, dict) else None
    plans = (block or {}).get('LayoutEditor__DrawingsData__FloorPlans') or []
    legacy = ((data.get('PresentationMode__SavedCameraScenes') or {}).get('PresentationMode__SavedCameraScenes__FloorPlans') if isinstance(data, dict) else None)
    if plans or legacy:
        with_plans += 1
        for p in plans:
            keys = [k.replace('FloorPlan__', '') for k in ('FloorPlan__Styles', 'FloorPlan__ExcludeCategoryTokens', 'FloorPlan__LineworkAsset', 'FloorPlan__Dimensions', 'FloorPlan__StoreyLevel') if k in p]
            print('%-40s %-14s %-24s %s' % (os.path.relpath(os.path.dirname(path), ROOT), p.get('FloorPlan__Id'), p.get('FloorPlan__Name'), ','.join(keys)))
        if legacy:
            print('%-40s LEGACY presentation-block plans: %d' % (os.path.relpath(os.path.dirname(path), ROOT), len(legacy)))
print('%d project.json files, %d with floor plans' % (len(files), with_plans))
