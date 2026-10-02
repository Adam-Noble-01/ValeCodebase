# W2-09 scratch: planted defects in COPIES of the rehearsal files (never the live tree), so the
# acceptance harness and TrueVision's test can be shown to fail on the faults they are meant to catch.
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'rehearsal')
STYLES = os.path.join('02__Src__AppModules', '51__System__LayoutEditor', '25__System__RenderStyles')

PLANTS = {
    'p1_token_without_percent': ('Na__LayoutEditor__RenderComposites__.js',
        b"if (!row || (row.weight.kind !== 'pixels' && row.weight.kind !== 'percent')) return false;",
        b"if (!row || row.weight.kind !== 'pixels') return false;"),
    'p2_no_strength_means_zero': ('Na__LayoutEditor__Enhance__.js',
        b"if (!Number.isFinite(strengthPercent)) return 1;",
        b"if (!Number.isFinite(strengthPercent)) return 0;"),
    'p3_config_default_50': ('Na__LayoutEditor__RenderComposites__Config__.json',
        b'"Weight__Kind": "percent", "Weight__Default": 100,',
        b'"Weight__Kind": "percent", "Weight__Default": 50,'),
}

for name, (file_name, old, new) in PLANTS.items():
    root = os.path.join(HERE, 'planted', name)
    if os.path.exists(root):
        shutil.rmtree(root)
    shutil.copytree(SRC, root)
    path = os.path.join(root, STYLES, file_name)
    with open(path, 'rb') as f:
        data = f.read()
    if data.count(old) != 1:
        raise SystemExit('%s: plant site not found exactly once' % name)
    with open(path, 'wb') as f:
        f.write(data.replace(old, new))
    print('planted', name, 'in', file_name)
