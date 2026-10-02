"""R3 helper: shared-module import surface (names TV drawing modules 40-55 import from shared folders)
summarised per target module, from S09's read-only scan (parity/work_s09/shared_import_surface.json).
Paths are K2 targets (identical in both apps for shared folders after W0-02). Read-only."""
import json, os, sys, collections
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
rows = json.load(open(os.path.join(HERE, '..', '..', 'work_s09', 'shared_import_surface.json'), encoding='utf-8'))
OWNER = {
    '03__AppUtils/Na__AppUtils__KeyScope__.js': 'W1-29 (file), W1-32 / W1-36 / W3-03 (importers)',
    '03__AppUtils/Na__AppUtils__LocalProjectMirror__.js': 'W0-12 (VV body over WCP Flask)',
    '03__AppUtils/Na__AppUtils__ProjectLoader.js': 'W0-11 (VV meaning via master index)',
    '03__AppUtils/Na__AppUtils__SnapshotHistory.js': 'W0-02 (FR-10 file rename)',
    '05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js': 'W0-02 (FR-11 move to 05/)',
    '05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js': 'W1-01',
    '05__RenderPipeline/Na__RenderLoop__Invalidation.js': 'W1-01 (IsPaused over VV hold reasons)',
    '25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js': 'W1-02 (merge TV 1.8.0/1.9.0, keep VV Video Studio exports)',
    '25__System__3dObject__InteractionSystem/Na__DoorAnimation__FindDoorGroups.js': 'W1-02',
    '26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js': 'W1-01 (verbatim, uninitialised; DR-09)',
    '26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js': 'W1-01 (keep VV na-model-visibility-changed dispatch)',
    '27__System__ContextMenuSystem/Na__ContextMenuSystem__Ui__MenuRenderer__.js': 'W4-11 (renderer only; DR-10, DR-44)',
    '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js': 'W0-12 (VV body over whitecardopedia-editor-api)',
}
by = collections.OrderedDict()
for r in rows:
    if r['vv_exports_name']:
        continue
    by.setdefault(r['tv_target'], []).append(r)
print('| Shared module (K2 path, both apps) | VV file today | Names VV must export | TV drawing importers | Lands with (K3) |')
print('|---|---|---|---|---|')
total = 0
for tgt, rs in by.items():
    names = sorted({x['name'] for x in rs})
    imps = sorted({i for x in rs for i in x['importers']})
    total += len(names)
    has = 'yes' if rs[0]['vv_has_file'] else 'no'
    nm = ', '.join('`' + n + '`' for n in names)
    print(f"| `{tgt}` | {has} | {len(names)}: {nm} | {len(imps)} | {OWNER.get(tgt, '?')} |")
print(f'<!-- {total} names in {len(by)} modules -->')
