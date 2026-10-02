import json
base = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__'
h = json.load(open(base + r'\parity\data\hot_file_ownership.json', encoding='utf-8'))
want = ['Na__RenderLoop__Invalidation.js', 'Na__AppFlow__LoadingSequence.js', 'Na__UiFeature__ModelToggle__Controls.js',
        'Na__RenderLoop__InteractiveOverlays__.js', 'Na__ModelGroup__PhaseLibrary__.js']
def walk(obj, path=''):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if any(w in k for w in want):
                print('KEY', path + '/' + k)
                print(json.dumps(v, indent=1)[:3000])
            walk(v, path + '/' + k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            if isinstance(v, dict) and any(any(w in str(val) for w in want) for val in v.values() if isinstance(val, str)):
                print('ITEM', path + '[%d]' % i)
                print(json.dumps(v, indent=1)[:3000])
            else:
                walk(v, path + '[%d]' % i)
print(type(h), list(h.keys())[:10] if isinstance(h, dict) else len(h))
walk(h)

st = json.load(open(base + r'\execution\execution_state.json', encoding='utf-8'))
print('STATE keys', list(st.keys())[:20] if isinstance(st, dict) else type(st))
def find_pkg(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ('W1-01', 'W1-05', 'W1-02', 'W0-13'):
                print('STATE', k, json.dumps(v)[:800])
            find_pkg(v)
    elif isinstance(obj, list):
        for v in obj:
            find_pkg(v)
find_pkg(st)
