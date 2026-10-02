#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - SYNC PIPELINE SAFETY TEST (PURGE SCOPE + EDITOR-OWNED KEYS)
# =============================================================================
#
# FILE       : Na__Test__SyncPipeline__EditorKeys__.test.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Sync Pipeline Safety Test
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Prove, with an in-memory S3 stub and temporary folders only, that
#              the SketchUp cloud sync and the R2 audit tool never delete
#              sub-folder content on R2 and never erase the ValeVision
#              editor-owned keys R2 holds.
# CREATED    : 01-Oct-2026
#
# DESCRIPTION:
# - Loads the sync orchestrator, the audit/backfill tool and the shared R2 lib
#   from the folder above this one, so it tests whichever copy sits there.
# - No network and no real data: 'import boto3' is blocked, every R2 call goes
#   to Na__StubS3Client (list_objects_v2 with Delimiter, MaxKeys 1,000 and
#   continuation tokens, as S3 and R2 answer), and every project lives in a
#   temporary folder that is deleted afterwards.
# - The editor-owned key list is read from ValeVision3D's real
#   Na__AppConfig__Main.json (the shared lib's path, or found by walking up from
#   this file); the refusal cases use temporary config files.
# - Check names carry the W0-07 acceptance item they prove: [A1] purge listing
#   scope and pagination, [A2] sub-folder content survives a full sync while a
#   superseded top-level IMG01 png is purged, [A3] R2's editor keys survive and
#   reach the local file, the IMG-slot re-point lands in R2's scene block and
#   hand-authored thumbnail paths are untouched; [S] fail-closed safety.
#
# USAGE:
#   python Tools__DevUtils/Tests/Na__Test__SyncPipeline__EditorKeys__.test.py
#   Exit code 0 when every check passes, 1 otherwise.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 01-Oct-2026 - Version 1.0.0
# - Initial release (ValeVision W0-07, DR-06): purge scope and pagination for
#   images and GLBs, editor-key preservation at the three sync upload calls and
#   in the audit tool, the thumbnail re-point on R2's scene block, line endings
#   kept, and the fail-closed cases (R2 unreadable, R2 not JSON, key list
#   missing or naming a pipeline key, listing error, empty local folder).
#
# =============================================================================

import sys
sys.dont_write_bytecode = True                                    # <-- Never leave __pycache__ beside the scripts under test

import copy
import importlib.util
import io
import json
import shutil
import tempfile
import traceback
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace

sys.modules['boto3'] = None                                       # <-- NETWORK GUARD: any 'import boto3' now raises ImportError

# -----------------------------------------------------------------------------
# REGION | Modules Under Test
# -----------------------------------------------------------------------------

TESTS_DIR = Path(__file__).resolve().parent
TOOLS_DIR = TESTS_DIR.parent
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

import AutomationUtil__R2Common__Lib__ as r2lib                    # noqa: E402  (path set above)


def na_load_script(module_name: str, file_name: str):
    """Load a Tools__DevUtils script by path (its file name is not importable by name)."""
    spec   = importlib.util.spec_from_file_location(module_name, TOOLS_DIR / file_name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


sync  = na_load_script('na_test__sync_single_project', 'AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py')
audit = na_load_script('na_test__audit_backfill_r2',   'AutomationUtil__AuditAndBackfillR2__ProjectJsonAndImages__Main__.py')

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Fixture Constants
# -----------------------------------------------------------------------------

BUCKET         = 'stub-bucket'
YEAR           = '2026'
WEB_FOLDER     = '3047__Doous'
LOCAL_FOLDER   = f'{WEB_FOLDER}__Whitecard'
FOLDER_ID      = f'{YEAR}/{WEB_FOLDER}'
PREFIX         = f'VaApps/Projects/{FOLDER_ID}'
PJ_KEY         = f'{PREFIX}/project.json'
NEIGHBOUR_KEY  = f'VaApps/Projects/{YEAR}/{WEB_FOLDER}__Old/IMG01__Neighbour__WhitecardImage__02-Sep-2026.png'
OLD_DATE       = '02-Sep-2026'
NEW_DATE       = '21-Sep-2026'
IMG01_OLD      = f'IMG01__3dView__MainShot____WhitecardImage__{OLD_DATE}.png'
IMG02_OLD      = f'IMG02__3dView__Interior__View-01__WhitecardImage__{OLD_DATE}.png'
IMG01_NEW      = f'IMG01__3dView__MainShot____WhitecardImage__{NEW_DATE}.png'
IMG02_NEW      = f'IMG02__3dView__Interior__View-01__WhitecardImage__{NEW_DATE}.png'
GLB_CURRENT    = 'Doous__TrueVision__MainBuildingModel__ProposedWalls__MeshModel__.glb'
GLB_REMOVED    = 'Doous__TrueVision__MainBuildingModel__ExistingWalls__MeshModel__.glb'
FILLER_COUNT   = 1050                                             # <-- Pushes the stale images past the first 1,000-key page
HAND_THUMB_007 = 'PresentationMode/Thumbnails/Scene_007.webp'
HAND_THUMB_009 = 'PresentationMode/Thumbnails/Scene_009.webp'

ACCEPTANCE_SUBFOLDER_KEYS = [                                     # <-- W0-07 acceptance item 2, verbatim
    f'{PREFIX}/PresentationMode/Thumbnails/x.webp',
    f'{PREFIX}/LayoutEditor/Snapshots/y.webp',
    f'{PREFIX}/05__Layout__DrawingDocs__Images/D01/z__0123456789.webp',
    f'{PREFIX}/06__Layout__PublishedDocuments/D01/D01__Published__Manifest__.json',
    f'{PREFIX}/06__Layout__PublishedDocuments/D01/D01__Tier1__.webp',
    f'{PREFIX}/06__Layout__PublishedDocuments/D01/D01__Print__.png',
]
OTHER_SUBFOLDER_KEYS = [
    f'{PREFIX}/PresentationMode/Thumbnails/Scene_007.webp',
    f'{PREFIX}/LayoutEditor/Linework/Elevation_001.json',
    f'{PREFIX}/10__StatementDocs/Design Statement/Figure-01.png',
    f'{PREFIX}/00__Archive/IMG01__3dView__MainShot____WhitecardImage__11-Aug-2026.png',
    f'{PREFIX}/SitePlan/Doous__SitePlan__MeshModel__.glb',
]
SUBFOLDER_KEYS = ACCEPTANCE_SUBFOLDER_KEYS + OTHER_SUBFOLDER_KEYS

PLAN_EDITOR_OWNED_KEYS = (                                        # <-- S12 b.7 / R3 C.2 (d6); the config may add more, never fewer
    'PresentationMode__SavedCameraScenes', 'LayoutEditor__DrawingsData', 'LayoutEditor__DrawingRegister',
    'CrossSection__SceneData', 'CrossSection__Config', 'Navmode__EnabledModes', 'Navmode__OrbitMaxDistanceMm',
    'Camera__DefaultPosition', 'OrbitHelperCube__Position', 'FogPlane__Config', 'RenderEngine__Config',
    'VideoStudio__Config', 'GridLine__Grid__Offset__Config',
)

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | In-Memory S3 Stub (no network)
# -----------------------------------------------------------------------------

class Na__StubS3ClientError(Exception):
    """Shaped like botocore's ClientError: carries response['Error']['Code']."""

    def __init__(self, code: str, message: str = ''):
        super().__init__(f'An error occurred ({code}): {message or code}')
        self.response = {'Error': {'Code': code, 'Message': message or code}}


class Na__StubS3Client:
    """In-memory stand-in for the boto3 S3 client, covering every call the sync
    tools make. list_objects_v2 answers like S3 and R2: keys sorted, Delimiter
    rolls sub-folders up into CommonPrefixes (each counting toward MaxKeys),
    at most 1,000 entries per page, IsTruncated + NextContinuationToken."""

    def __init__(self, max_keys: int = 1000):
        self.objects            = {}                              # <-- key -> {'Body', 'Size', 'ContentType', 'CacheControl'}
        self.max_keys           = max_keys
        self.calls              = []                              # <-- (operation, kwargs) in call order
        self.fail_get           = {}                              # <-- key -> error code get_object raises
        self.fail_list_on_token = None                            # <-- error code raised by any call carrying a token

    # SETUP HELPERS -----------------------------------------------------------
    def put_bytes(self, key: str, body: bytes, content_type: str = None):
        self.objects[key] = {'Body': bytes(body), 'Size': len(body), 'ContentType': content_type, 'CacheControl': None}

    def document(self, key: str):
        return json.loads(self.objects[key]['Body'].decode('utf-8'))

    def keys_under(self, prefix: str):
        return sorted(k for k in self.objects if k.startswith(prefix))

    def calls_of(self, operation: str):
        return [kwargs for op, kwargs in self.calls if op == operation]

    # S3 API SUBSET ------------------------------------------------------------
    def list_objects_v2(self, Bucket, Prefix='', Delimiter=None, ContinuationToken=None, MaxKeys=None, **extra):
        self.calls.append(('list_objects_v2', {'Bucket': Bucket, 'Prefix': Prefix, 'Delimiter': Delimiter,
                                               'ContinuationToken': ContinuationToken, 'MaxKeys': MaxKeys}))
        if ContinuationToken and self.fail_list_on_token:
            raise Na__StubS3ClientError(self.fail_list_on_token, 'Listing failed (stub).')
        limit   = min(MaxKeys or self.max_keys, self.max_keys)
        entries = []
        rolled  = set()
        for key in sorted(k for k in self.objects if k.startswith(Prefix)):
            rest = key[len(Prefix):]
            if Delimiter and Delimiter in rest:
                common = Prefix + rest[:rest.index(Delimiter) + len(Delimiter)]
                if common not in rolled:
                    rolled.add(common)
                    entries.append(('prefix', common))
            else:
                entries.append(('key', key))
        start = int(ContinuationToken.split(':', 1)[1]) if ContinuationToken else 0
        page  = entries[start:start + limit]
        resp  = {'Prefix': Prefix, 'MaxKeys': limit, 'KeyCount': len(page), 'IsTruncated': start + limit < len(entries)}
        contents = [{'Key': v, 'Size': self.objects[v]['Size']} for kind, v in page if kind == 'key']
        prefixes = [{'Prefix': v} for kind, v in page if kind == 'prefix']
        if contents:
            resp['Contents'] = contents                           # <-- S3 omits empty Contents / CommonPrefixes
        if prefixes:
            resp['CommonPrefixes'] = prefixes
        if Delimiter:
            resp['Delimiter'] = Delimiter
        if resp['IsTruncated']:
            resp['NextContinuationToken'] = f'stub-token:{start + limit}'
        return resp

    def delete_object(self, Bucket, Key):
        self.calls.append(('delete_object', {'Bucket': Bucket, 'Key': Key}))
        self.objects.pop(Key, None)                               # <-- S3 deletes of a missing key succeed
        return {}

    def upload_file(self, Filename, Bucket, Key, ExtraArgs=None):
        extra = ExtraArgs or {}
        path  = Path(Filename)
        size  = path.stat().st_size
        body  = path.read_bytes() if size <= 2 * 1024 * 1024 else b''    # <-- Large models: size only
        self.calls.append(('upload_file', {'Bucket': Bucket, 'Key': Key, 'Filename': str(Filename), 'ExtraArgs': extra}))
        self.objects[Key] = {'Body': body, 'Size': size, 'ContentType': extra.get('ContentType'),
                             'CacheControl': extra.get('CacheControl')}

    def put_object(self, Bucket, Key, Body=b'', ContentType=None, CacheControl=None, **extra):
        body = Body.encode('utf-8') if isinstance(Body, str) else bytes(Body)
        self.calls.append(('put_object', {'Bucket': Bucket, 'Key': Key, 'Body': body,
                                          'ContentType': ContentType, 'CacheControl': CacheControl}))
        self.objects[Key] = {'Body': body, 'Size': len(body), 'ContentType': ContentType, 'CacheControl': CacheControl}
        return {}

    def get_object(self, Bucket, Key):
        self.calls.append(('get_object', {'Bucket': Bucket, 'Key': Key}))
        if Key in self.fail_get:
            raise Na__StubS3ClientError(self.fail_get[Key], 'Refused (stub).')
        if Key not in self.objects:
            raise Na__StubS3ClientError('NoSuchKey', 'The specified key does not exist.')
        obj = self.objects[Key]
        return {'Body': io.BytesIO(obj['Body']), 'ContentType': obj['ContentType'], 'ContentLength': obj['Size']}

    def head_object(self, Bucket, Key):
        self.calls.append(('head_object', {'Bucket': Bucket, 'Key': Key}))
        if Key not in self.objects:
            raise Na__StubS3ClientError('404', 'Not Found')
        return {'ContentLength': self.objects[Key]['Size']}

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Check Recording and Patching Helpers
# -----------------------------------------------------------------------------

CHECKS = []


def check(name: str, condition, detail: str = ''):
    """Record one named check and print it at once."""
    ok = bool(condition)
    CHECKS.append((name, ok, detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + ('' if ok or not detail else f"\n        {detail}"))


@contextmanager
def na_patched(module, **attributes):
    """Set module attributes for the duration of a block, then restore them."""
    missing = object()
    saved   = {name: getattr(module, name, missing) for name in attributes}
    for name, value in attributes.items():
        setattr(module, name, value)
    try:
        yield
    finally:
        for name, value in saved.items():
            if value is missing:
                delattr(module, name)
            else:
                setattr(module, name, value)


def na_find_real_vv_config():
    """The ValeVision app config the shared lib reads, or (for a staged copy of
    the tools) the first ValeVision3D/02__Src__AppModules/02__AppData/
    Na__AppConfig__Main.json found walking up from this file."""
    default = getattr(r2lib, 'VV_APP_CONFIG_PATH', None)          # <-- Absent on a lib older than 1.0.1: report, never crash
    if default is not None and Path(default).is_file():
        return Path(default)
    relative = Path('ValeVision3D') / '02__Src__AppModules' / '02__AppData' / 'Na__AppConfig__Main.json'
    for parent in TOOLS_DIR.parents:
        for candidate in (parent / relative, parent / 'WebApps' / relative):
            if candidate.is_file():
                return candidate
    return None


REAL_VV_CONFIG = na_find_real_vv_config()

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Project Fixture (temporary folders + seeded stub)
# -----------------------------------------------------------------------------

def na_thumb(png_name: str, ext: str = '.webp') -> str:
    return png_name[:-4] + '__Thumbnail__524p__' + ext


def na_scene(scene_id, name, order, thumb):
    return {'PresentationMode__Scene__Id': scene_id, 'PresentationMode__Scene__Name': name,
            'PresentationMode__Scene__Order': order, 'PresentationMode__Scene__ThumbnailUrl': thumb}


def na_scene_thumb(document, scene_id):
    block = document.get('PresentationMode__SavedCameraScenes') or {}
    for scene in block.get('PresentationMode__SavedCameraScenes__Scenes', []):
        if scene.get('PresentationMode__Scene__Id') == scene_id:
            return scene.get('PresentationMode__Scene__ThumbnailUrl')
    return None


def na_r2_document():
    """R2's copy: the editor saved sheets, a new scene and a Walk switch there after the local file was written."""
    return {
        'projectCode': '3047', 'projectName': 'Doous', 'folderId': FOLDER_ID, 'basePath': f'Projects/{FOLDER_ID}/',
        'images': [IMG01_OLD, IMG02_OLD], 'allImages': [IMG01_OLD, IMG02_OLD], 'displayImages': [IMG01_OLD, IMG02_OLD],
        'valeVision_ModelUrls': ['https://cdn.test.invalid/old-model.glb'],
        'LayoutEditor__DrawingsData': {
            'LayoutEditor__DrawingsData__Version': 1,
            'LayoutEditor__DrawingsData__Sheets': [{'Sheet__Id': 'Sheet_001', 'Sheet__Name': 'Saved in the editor (R2 only)'}],
        },
        'Navmode__EnabledModes': {'Navmode__EnabledModes__Walk': False, 'Navmode__EnabledModes__Fly': True},
        'PresentationMode__SavedCameraScenes': {
            'PresentationMode__SavedCameraScenes__Enabled': True,
            'PresentationMode__SavedCameraScenes__Scenes': [
                na_scene('su_scene_1', 'Exterior 01', 1, na_thumb(IMG01_OLD)),
                na_scene('Scene_007',  'Exterior 02', 2, HAND_THUMB_007),
                na_scene('su_scene_2', 'Internal 01', 3, na_thumb(IMG02_OLD)),
                na_scene('Scene_009',  'Added on R2', 4, HAND_THUMB_009),
            ],
        },
    }


def na_local_document(include_drawings: bool):
    """The local copy: written before the editor's last R2 saves (no sheets, Walk on, no Scene_009)."""
    document = {
        'projectCode': '3047', 'projectName': 'Doous', 'folderId': FOLDER_ID, 'basePath': f'Projects/{FOLDER_ID}/',
        'images': [IMG01_OLD, IMG02_OLD], 'allImages': [IMG01_OLD, IMG02_OLD], 'displayImages': [IMG01_OLD, IMG02_OLD],
        'valeVision_ModelUrls': ['https://cdn.test.invalid/old-model.glb'],
        'Navmode__EnabledModes': {'Navmode__EnabledModes__Walk': True, 'Navmode__EnabledModes__Fly': True},
        'FogPlane__Config': {'FogPlane__Visual__Config': {'FogPlane__Visual__Config__PlaneOpacity': 0.2}},
        'PresentationMode__SavedCameraScenes': {
            'PresentationMode__SavedCameraScenes__Enabled': True,
            'PresentationMode__SavedCameraScenes__Scenes': [
                na_scene('su_scene_1', 'Exterior 01', 1, na_thumb(IMG01_OLD)),
                na_scene('Scene_007',  'Exterior 02', 2, HAND_THUMB_007),
                na_scene('su_scene_2', 'Internal 01', 3, na_thumb(IMG02_OLD)),
            ],
        },
        'ValeVison3D__SketchUpCameraData': {'scenes': [{'scene_name': 'IMG01__3dView__MainShot'},
                                                       {'scene_name': 'IMG02__3dView__Interior__View-01'}]},
    }
    if include_drawings:
        document['LayoutEditor__DrawingsData'] = {'LayoutEditor__DrawingsData__Version': 1,
                                                  'LayoutEditor__DrawingsData__Sheets': [{'Sheet__Id': 'Sheet_001',
                                                                                          'Sheet__Name': 'Older local copy'}]}
    return document


def na_write_document(path: Path, document, eol: str = '\r\n'):
    path.write_bytes(json.dumps(document, indent=4).replace('\n', eol).encode('utf-8'))


def na_png(path: Path):
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + path.name.encode('utf-8'))


@contextmanager
def na_workspace(local_has_drawings: bool = False, r2_has_project_json: bool = True, local_eol: str = '\r\n'):
    """Build a temporary local production folder, Whitecardopedia folder and a seeded R2 stub."""
    root = Path(tempfile.mkdtemp(prefix='na_w0_07_'))
    try:
        local_base = root / 'Local'
        local_root = local_base / f'ValeProjects__{YEAR}' / LOCAL_FOLDER
        delivered  = local_root / '10__ContentDelivered__Local'
        edition    = delivered / f'VisDpt__Whitecard__SecondEdition__{NEW_DATE}'
        glb_dir    = delivered / 'ValeVision__GlbFileSync'
        data_dir   = local_root / '00__ProjectData'
        for folder in (edition, glb_dir, data_dir):
            folder.mkdir(parents=True)
        na_png(edition / IMG01_NEW)                               # <-- The new edition: IMG01 and IMG02 re-rendered
        na_png(edition / IMG02_NEW)
        (glb_dir / GLB_CURRENT).write_bytes(b'glTF-current')
        (data_dir / f'{WEB_FOLDER}__ProjectData__.json').write_text(json.dumps([{
            'ValeVison3D__SketchUpCameraData': {'scenes': [{'scene_name': 'IMG01__3dView__MainShot'},
                                                           {'scene_name': 'IMG02__3dView__Interior__View-01'}]}}]),
            encoding='utf-8')

        wcp_base = root / 'Projects'
        wcp_dir  = wcp_base / YEAR / WEB_FOLDER
        (wcp_dir / 'PresentationMode' / 'Thumbnails').mkdir(parents=True)
        for name in (IMG01_OLD, IMG02_OLD):                       # <-- The local mirror still holds the previous edition
            na_png(wcp_dir / name)
            (wcp_dir / na_thumb(name)).write_bytes(b'webp')
            (wcp_dir / na_thumb(name, '.jpg')).write_bytes(b'jpg')
        (wcp_dir / 'PresentationMode' / 'Thumbnails' / 'Scene_007.webp').write_bytes(b'webp')
        na_write_document(wcp_dir / 'project.json', na_local_document(local_has_drawings), local_eol)

        stub = Na__StubS3Client()
        if r2_has_project_json:
            stub.put_bytes(PJ_KEY, json.dumps(na_r2_document(), indent=4).encode('utf-8'), 'application/json')
        for name in (IMG01_OLD, IMG02_OLD):
            stub.put_bytes(f'{PREFIX}/{name}', b'png')
            stub.put_bytes(f'{PREFIX}/{na_thumb(name)}', b'webp')
            stub.put_bytes(f'{PREFIX}/{na_thumb(name, ".jpg")}', b'jpg')
        stub.put_bytes(f'{PREFIX}/{GLB_CURRENT}', b'glTF-current')
        stub.put_bytes(f'{PREFIX}/{GLB_REMOVED}', b'glTF-removed')     # <-- A model the local folder no longer exports
        stub.put_bytes(f'{PREFIX}/ValeVision__DrawingNotes__.json', b'{}')
        for key in SUBFOLDER_KEYS:
            stub.put_bytes(key, b'sub-folder content')
        for i in range(FILLER_COUNT):
            stub.put_bytes(f'{PREFIX}/AAA__Filler__{i:04d}.json', b'{}')
        stub.put_bytes(NEIGHBOUR_KEY, b'png')                     # <-- Neighbouring project sharing the name stem

        yield SimpleNamespace(root=root, local_base=local_base, local_root=local_root, wcp_base=wcp_base,
                              wcp_dir=wcp_dir, glb_dir=glb_dir, stub=stub)
    finally:
        shutil.rmtree(root, ignore_errors=True)


@contextmanager
def na_sync_environment(ws):
    """Point the sync at the workspace and the stub; the editor key list is the real ValeVision config."""
    def fake_thumbnails(year, project_folder, report):
        for name in sync.na_collect_source_image_names(ws.wcp_dir):
            (ws.wcp_dir / na_thumb(name)).write_bytes(b'webp')
            (ws.wcp_dir / na_thumb(name, '.jpg')).write_bytes(b'jpg')
        report.add_step('Generate Thumbnails', True, 'Stub thumbnails written (test).')

    def fake_model_urls(glb_dir, full_year, web_folder):
        return [f'https://cdn.test.invalid/{full_year}/{web_folder}/{p.name}' for p in sorted(Path(glb_dir).glob('*.glb'))]

    with na_patched(sync,
                    WCP_PROJECTS_BASE=ws.wcp_base,
                    LOCAL_PROJECTS_BASE=ws.local_base,
                    FETCH_SCRIPT=ws.root / 'no_fetch_module_here.py',
                    _FETCH_MODULE_CACHE=None,
                    na_generate_thumbnails=fake_thumbnails,
                    na_build_model_urls_from_glb_dir=fake_model_urls,
                    na_load_r2_credentials=lambda: {'R2_BUCKET_NAME': BUCKET},
                    na_build_r2_client=lambda creds: ws.stub), \
         na_patched(r2lib, VV_APP_CONFIG_PATH=REAL_VV_CONFIG, WCP_PROJECTS_BASE=ws.wcp_base):
        yield


def na_report_step(report, label):
    steps = [s for s in report.steps if s['label'] == label]
    return steps[-1] if steps else None


def na_put_bodies(stub, key):
    return [json.loads(c['Body'].decode('utf-8')) for c in stub.calls_of('put_object') if c['Key'] == key]


def na_local_doc(ws):
    return json.loads((ws.wcp_dir / 'project.json').read_bytes().decode('utf-8'))

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Tests
# -----------------------------------------------------------------------------

def test_real_config_holds_the_one_list():
    check('[S] ValeVision app config found', REAL_VV_CONFIG is not None, f'searched from {TOOLS_DIR}')
    if REAL_VV_CONFIG is None:
        return
    keys    = r2lib.na_load_editor_owned_keys(REAL_VV_CONFIG)
    missing = [k for k in PLAN_EDITOR_OWNED_KEYS if k not in keys]
    check('[S] ProjectData__EditorOwnedKeys holds every planned editor key', not missing, f'missing: {missing}')
    check('[S] the list names no pipeline key', not (set(keys) & r2lib.PIPELINE_OWNED_PROJECT_KEYS))
    raw = json.loads(REAL_VV_CONFIG.read_text(encoding='utf-8'))['ProjectData__EditorOwnedKeys']['ProjectData__EditorOwnedKeys__Keys']
    check('[S] the list has no duplicate entry', len(raw) == len(set(raw)))
    check('[S] the shared lib carries no copy of the list', not any(isinstance(v, (list, tuple)) and 'LayoutEditor__DrawingsData' in v
                                                                   for v in vars(r2lib).values()))


def test_key_list_refusals():
    with tempfile.TemporaryDirectory(prefix='na_w0_07_cfg_') as tmp:
        tmp = Path(tmp)
        cases = {
            'missing file'     : None,
            'no block'         : {'Other': {}},
            'empty list'       : {'ProjectData__EditorOwnedKeys': {'ProjectData__EditorOwnedKeys__Keys': []}},
            'non-string entry' : {'ProjectData__EditorOwnedKeys': {'ProjectData__EditorOwnedKeys__Keys': ['Camera__DefaultPosition', 7]}},
            'padded entry'     : {'ProjectData__EditorOwnedKeys': {'ProjectData__EditorOwnedKeys__Keys': [' Camera__DefaultPosition']}},
            'pipeline key'     : {'ProjectData__EditorOwnedKeys': {'ProjectData__EditorOwnedKeys__Keys': ['LayoutEditor__DrawingsData', 'images']}},
        }
        for label, content in cases.items():
            path = tmp / f'{label.replace(" ", "_")}.json'
            if content is not None:
                path.write_text(json.dumps(content), encoding='utf-8')
            try:
                r2lib.na_load_editor_owned_keys(path)
                refused = False
            except ValueError:
                refused = True
            check(f'[S] key list refused: {label}', refused)
        dup = tmp / 'dup.json'
        dup.write_text(json.dumps({'ProjectData__EditorOwnedKeys': {'ProjectData__EditorOwnedKeys__Keys':
                                   ['Camera__DefaultPosition', 'FogPlane__Config', 'Camera__DefaultPosition']}}), encoding='utf-8')
        check('[S] duplicate entries collapse, order kept',
              r2lib.na_load_editor_owned_keys(dup) == ['Camera__DefaultPosition', 'FogPlane__Config'])


def test_image_purge_scope_and_pagination():
    with na_workspace() as ws:
        stub = ws.stub
        for name in (IMG01_NEW, IMG02_NEW):                       # <-- The new edition is already uploaded
            stub.put_bytes(f'{PREFIX}/{name}', b'png')
            stub.put_bytes(f'{PREFIX}/{na_thumb(name)}', b'webp')
        first_page = stub.list_objects_v2(Bucket=BUCKET, Prefix=f'{PREFIX}/', Delimiter='/')
        page_keys  = {o['Key'] for o in first_page.get('Contents', [])}
        check('[A1] fixture: the stale IMG01 png sits beyond the first 1,000-entry page',
              first_page['IsTruncated'] and f'{PREFIX}/{IMG01_OLD}' not in page_keys)
        stub.calls.clear()

        keep   = {IMG01_NEW, IMG02_NEW, na_thumb(IMG01_NEW), na_thumb(IMG02_NEW)}
        report = sync.SyncReport(WEB_FOLDER, 'all')
        purged = sync.na_purge_stale_r2_images(stub, BUCKET, PREFIX, keep, report)
        lists  = stub.calls_of('list_objects_v2')
        check('[A1] image purge lists with Delimiter "/" on the project prefix',
              lists and all(c['Delimiter'] == '/' and c['Prefix'] == f'{PREFIX}/' for c in lists), str(lists[:2]))
        check('[A1] image purge follows the continuation token past 1,000 keys',
              len(lists) >= 2 and any(c['ContinuationToken'] for c in lists), f'{len(lists)} list call(s)')
        stale = [f'{PREFIX}/{IMG01_OLD}', f'{PREFIX}/{na_thumb(IMG01_OLD)}', f'{PREFIX}/{na_thumb(IMG01_OLD, ".jpg")}',
                 f'{PREFIX}/{IMG02_OLD}', f'{PREFIX}/{na_thumb(IMG02_OLD)}', f'{PREFIX}/{na_thumb(IMG02_OLD, ".jpg")}']
        check('[A2] the superseded top-level IMG01 png is purged', f'{PREFIX}/{IMG01_OLD}' not in stub.objects)
        check('[A2] every superseded top-level image and thumbnail is purged (6)',
              purged == 6 and not any(k in stub.objects for k in stale), f'purged={purged}')
        survivors = [k for k in SUBFOLDER_KEYS if k not in stub.objects]
        check('[A2] no sub-folder key is deleted', not survivors, f'deleted: {survivors}')
        check('[A2] the new edition and its thumbnails stay',
              all(f'{PREFIX}/{n}' in stub.objects for n in keep))
        check('[A2] project.json, GLBs, notes and other top-level non-images stay',
              all(k in stub.objects for k in (PJ_KEY, f'{PREFIX}/{GLB_CURRENT}', f'{PREFIX}/{GLB_REMOVED}',
                                              f'{PREFIX}/ValeVision__DrawingNotes__.json', f'{PREFIX}/AAA__Filler__1049.json')))
        check('[S] the neighbouring project is never touched', NEIGHBOUR_KEY in stub.objects)
        deletes = [c['Key'] for c in stub.calls_of('delete_object')]
        check('[S] every delete is a top-level key of this project',
              all(k.startswith(f'{PREFIX}/') and '/' not in k[len(PREFIX) + 1:] for k in deletes), str(deletes))


def test_glb_purge_scope():
    with na_workspace() as ws:
        stub   = ws.stub
        purged = sync.na_purge_stale_r2_glbs(stub, BUCKET, PREFIX, {GLB_CURRENT})
        lists  = stub.calls_of('list_objects_v2')
        check('[A1] GLB purge lists with Delimiter "/" and paginates',
              lists and all(c['Delimiter'] == '/' for c in lists) and any(c['ContinuationToken'] for c in lists))
        check('[A1] GLB purge removes the top-level GLB no longer exported', purged == 1 and f'{PREFIX}/{GLB_REMOVED}' not in stub.objects,
              f'purged={purged}')
        check('[A1] GLB purge keeps the current GLB and the sub-folder GLB',
              f'{PREFIX}/{GLB_CURRENT}' in stub.objects and f'{PREFIX}/SitePlan/Doous__SitePlan__MeshModel__.glb' in stub.objects)


def test_full_sync_all():
    with na_workspace(local_has_drawings=False) as ws, na_sync_environment(ws):
        stub      = ws.stub
        r2_before = stub.document(PJ_KEY)
        report    = sync.SyncReport(WEB_FOLDER, 'all')
        sync.na_sync_all(WEB_FOLDER, YEAR[2:], ws.local_root, ws.wcp_dir, report)
        r2_after  = stub.document(PJ_KEY)
        local     = na_local_doc(ws)

        survivors = [k for k in ACCEPTANCE_SUBFOLDER_KEYS + OTHER_SUBFOLDER_KEYS if k not in stub.objects]
        check('[A2] full sync: PresentationMode/Thumbnails/x.webp, LayoutEditor/Snapshots/y.webp, '
              '05__Layout__DrawingDocs__Images/D01/z__0123456789.webp and 06__Layout__PublishedDocuments/ keys survive',
              all(k in stub.objects for k in ACCEPTANCE_SUBFOLDER_KEYS), f'deleted: {survivors}')
        check('[A2] full sync: every other sub-folder key survives too', not survivors, f'deleted: {survivors}')
        check('[A2] full sync: the superseded top-level IMG01 png is purged', f'{PREFIX}/{IMG01_OLD}' not in stub.objects)
        check('[A2] full sync: the new IMG01 png and thumbnail are on R2',
              f'{PREFIX}/{IMG01_NEW}' in stub.objects and f'{PREFIX}/{na_thumb(IMG01_NEW)}' in stub.objects)
        lists = [c for c in stub.calls_of('list_objects_v2') if c['Prefix'] == f'{PREFIX}/']
        check('[A2] full sync: listings use Delimiter "/" and follow continuation tokens past 1,000 keys',
              lists and all(c['Delimiter'] == '/' for c in lists) and any(c['ContinuationToken'] for c in lists))
        check('[A1] full sync: the GLB purge removed only the top-level GLB no longer exported',
              f'{PREFIX}/{GLB_REMOVED}' not in stub.objects and f'{PREFIX}/SitePlan/Doous__SitePlan__MeshModel__.glb' in stub.objects)

        check('[A3] R2 LayoutEditor__DrawingsData survives a sync from a local file that lacks it',
              r2_after.get('LayoutEditor__DrawingsData') == r2_before['LayoutEditor__DrawingsData'])
        check('[A3] ...and the local file receives it',
              local.get('LayoutEditor__DrawingsData') == r2_before['LayoutEditor__DrawingsData'])
        pj_puts = na_put_bodies(stub, PJ_KEY)
        check('[A3] every project.json write in the sync kept R2 LayoutEditor__DrawingsData (4 writes)',
              len(pj_puts) == 4 and all(b.get('LayoutEditor__DrawingsData') == r2_before['LayoutEditor__DrawingsData'] for b in pj_puts),
              f'{len(pj_puts)} write(s)')
        check('[A3] R2 Navmode__EnabledModes (editor-owned) wins over the stale local value, locally too',
              r2_after['Navmode__EnabledModes'] == r2_before['Navmode__EnabledModes'] == local['Navmode__EnabledModes'])
        check('[A3] a listed key R2 lacks keeps the local value (FogPlane__Config)',
              r2_after.get('FogPlane__Config') == na_local_document(False)['FogPlane__Config'])
        check('[A3] the repointed IMG-slot thumbnail lands in R2 PresentationMode__SavedCameraScenes',
              na_scene_thumb(r2_after, 'su_scene_1') == na_thumb(IMG01_NEW)
              and na_scene_thumb(r2_after, 'su_scene_2') == na_thumb(IMG02_NEW),
              f"su_scene_1={na_scene_thumb(r2_after, 'su_scene_1')}")
        check('[A3] hand-authored PresentationMode/Thumbnails paths are untouched',
              na_scene_thumb(r2_after, 'Scene_007') == HAND_THUMB_007 and na_scene_thumb(r2_after, 'Scene_009') == HAND_THUMB_009)
        check('[A3] the scene R2 alone holds (Scene_009) is kept: R2 scene block used, not the local one',
              na_scene_thumb(r2_after, 'Scene_009') is not None)
        check('[A3] the local scene block now matches R2 (re-pointed)',
              local.get('PresentationMode__SavedCameraScenes') == r2_after.get('PresentationMode__SavedCameraScenes'))
        check('[A3] pipeline keys come from the local run (images = new edition)',
              r2_after.get('images') == [IMG01_NEW, IMG02_NEW] and local.get('images') == [IMG01_NEW, IMG02_NEW])
        check('[A3] model URLs and camera data merged on top, editor keys still intact',
              r2_after.get('valeVision_ModelUrls') == [f'https://cdn.test.invalid/{YEAR}/{WEB_FOLDER}/{GLB_CURRENT}']
              and isinstance(r2_after.get('ValeVison3D__SketchUpCameraData'), dict))
        step = na_report_step(report, 'Upload project.json to R2')
        check('[A3] the report names the keys kept from R2',
              step and step['success'] and 'LayoutEditor__DrawingsData' in step.get('keptFromR2', [])
              and 'LayoutEditor__DrawingsData' in step['message'], str(step))
        check('[S] project.json uploads are no-cache JSON',
              all(c['ContentType'] == 'application/json' and c['CacheControl'] == 'no-cache, max-age=0'
                  for c in stub.calls_of('put_object') if c['Key'] == PJ_KEY))
        writes = [c['Key'] for op, c in stub.calls if op in ('put_object', 'upload_file', 'delete_object')]
        check('[S] nothing is written or deleted outside the project prefix',
              all(k.startswith(f'{PREFIX}/') for k in writes) and NEIGHBOUR_KEY in stub.objects)
        check('[S] the sync report succeeded', all(s['success'] for s in report.steps),
              str([s for s in report.steps if not s['success']]))


def test_sync_glb_preserves_editor_keys():
    with na_workspace(local_has_drawings=False) as ws, na_sync_environment(ws):
        stub      = ws.stub
        r2_before = stub.document(PJ_KEY)
        report    = sync.SyncReport(WEB_FOLDER, 'glb')
        sync.na_sync_glb(WEB_FOLDER, YEAR[2:], ws.local_root, ws.wcp_dir, report)
        pj_puts = na_put_bodies(stub, PJ_KEY)
        check('[A3] glb action: every project.json write kept R2 LayoutEditor__DrawingsData',
              pj_puts and all(b.get('LayoutEditor__DrawingsData') == r2_before['LayoutEditor__DrawingsData'] for b in pj_puts),
              f'{len(pj_puts)} write(s)')
        check('[A3] glb action: the local file receives R2 LayoutEditor__DrawingsData',
              na_local_doc(ws).get('LayoutEditor__DrawingsData') == r2_before['LayoutEditor__DrawingsData'])
        check('[A1] glb action: sub-folder keys and images untouched',
              all(k in stub.objects for k in SUBFOLDER_KEYS) and f'{PREFIX}/{IMG01_OLD}' in stub.objects)


def test_sync_images_scope():
    with na_workspace() as ws, na_sync_environment(ws):
        stub       = ws.stub
        pj_before  = stub.objects[PJ_KEY]['Body']
        report     = sync.SyncReport(WEB_FOLDER, 'images')
        sync.na_sync_images(WEB_FOLDER, YEAR[2:], ws.local_root, ws.wcp_dir, report)
        check('[A2] images action: sub-folder keys survive', all(k in stub.objects for k in SUBFOLDER_KEYS))
        check('[A2] images action: the superseded top-level IMG01 png is purged', f'{PREFIX}/{IMG01_OLD}' not in stub.objects)
        check('[S] images action: R2 project.json is not written', stub.objects[PJ_KEY]['Body'] == pj_before)


def test_fail_closed_when_r2_unreadable():
    with na_workspace() as ws, na_sync_environment(ws):
        stub = ws.stub
        stub.fail_get[PJ_KEY] = 'AccessDenied'
        pj_before    = stub.objects[PJ_KEY]['Body']
        local_before = (ws.wcp_dir / 'project.json').read_bytes()
        report       = sync.SyncReport(WEB_FOLDER, 'all')
        sync.na_upload_project_json_to_r2(stub, BUCKET, ws.wcp_dir / 'project.json', PREFIX, report)
        step = na_report_step(report, 'Upload project.json to R2')
        check('[S] R2 read error: the step fails and says NOT uploaded', step and not step['success'] and 'NOT uploaded' in step['message'],
              str(step))
        check('[S] R2 read error: R2 project.json unchanged', stub.objects[PJ_KEY]['Body'] == pj_before)
        check('[S] R2 read error: local project.json unchanged', (ws.wcp_dir / 'project.json').read_bytes() == local_before)
        check('[S] R2 read error: nothing counted as uploaded', report.uploaded == 0)


def test_fail_closed_when_r2_not_json():
    with na_workspace() as ws, na_sync_environment(ws):
        stub = ws.stub
        stub.put_bytes(PJ_KEY, b'{"truncated": ')
        report = sync.SyncReport(WEB_FOLDER, 'all')
        sync.na_upload_project_json_to_r2(stub, BUCKET, ws.wcp_dir / 'project.json', PREFIX, report)
        step = na_report_step(report, 'Upload project.json to R2')
        check('[S] R2 copy not JSON: nothing uploaded, R2 left as it was',
              step and not step['success'] and stub.objects[PJ_KEY]['Body'] == b'{"truncated": ', str(step))


def test_fail_closed_when_key_list_missing():
    with na_workspace() as ws, na_sync_environment(ws), na_patched(r2lib, VV_APP_CONFIG_PATH=ws.root / 'missing__Na__AppConfig__Main.json'):
        stub      = ws.stub
        pj_before = stub.objects[PJ_KEY]['Body']
        report    = sync.SyncReport(WEB_FOLDER, 'all')
        sync.na_upload_project_json_to_r2(stub, BUCKET, ws.wcp_dir / 'project.json', PREFIX, report)
        step = na_report_step(report, 'Upload project.json to R2')
        check('[S] key list unavailable: nothing uploaded, R2 unchanged',
              step and not step['success'] and 'key list unavailable' in step['message'] and stub.objects[PJ_KEY]['Body'] == pj_before,
              str(step))


def test_first_upload_when_r2_has_none():
    with na_workspace(r2_has_project_json=False) as ws, na_sync_environment(ws):
        stub   = ws.stub
        report = sync.SyncReport(WEB_FOLDER, 'all')
        sync.na_upload_project_json_to_r2(stub, BUCKET, ws.wcp_dir / 'project.json', PREFIX, report)
        step = na_report_step(report, 'Upload project.json to R2')
        check('[S] R2 without project.json: the local document is uploaded as it is',
              step and step['success'] and step.get('r2State') == 'missing' and stub.document(PJ_KEY) == na_local_doc(ws), str(step))


def test_line_endings_kept():
    for eol, label in (('\r\n', 'CRLF'), ('\n', 'LF')):
        with na_workspace(local_eol=eol) as ws, na_sync_environment(ws):
            report = sync.SyncReport(WEB_FOLDER, 'all')
            sync.na_upload_project_json_to_r2(ws.stub, BUCKET, ws.wcp_dir / 'project.json', PREFIX, report)
            data    = (ws.wcp_dir / 'project.json').read_bytes()
            updated = (na_report_step(report, 'Upload project.json to R2') or {}).get('localUpdated')
            same    = (data.count(b'\r\n') == data.count(b'\n')) if eol == '\r\n' else (b'\r\n' not in data)
            check(f'[S] the merged local write keeps {label} line endings', updated and same)


def test_purge_fails_safe():
    with na_workspace() as ws:
        stub = ws.stub
        stub.fail_list_on_token = 'InternalError'
        report = sync.SyncReport(WEB_FOLDER, 'all')
        purged = sync.na_purge_stale_r2_images(stub, BUCKET, PREFIX, {IMG01_NEW}, report)
        step   = na_report_step(report, 'Purge Stale R2 Images')
        check('[S] a listing error on page 2 deletes nothing', purged == 0 and not stub.calls_of('delete_object')
              and step and not step['success'], str(step))
    with na_workspace() as ws:
        report = sync.SyncReport(WEB_FOLDER, 'all')
        purged = sync.na_purge_stale_r2_images(ws.stub, BUCKET, PREFIX, set(), report)
        check('[S] an empty local image set deletes nothing', purged == 0 and not ws.stub.calls_of('delete_object'))
    with na_workspace() as ws:
        ws.stub.fail_list_on_token = 'InternalError'
        purged = sync.na_purge_stale_r2_glbs(ws.stub, BUCKET, PREFIX, {GLB_CURRENT})
        check('[S] a GLB listing error deletes nothing', purged == 0 and not ws.stub.calls_of('delete_object'))


def test_audit_tool_preserves_editor_keys():
    with na_workspace(local_has_drawings=False) as ws, na_sync_environment(ws):
        stub      = ws.stub
        r2_before = stub.document(PJ_KEY)
        record    = audit.na_audit_project(stub, BUCKET, FOLDER_ID)
        uploaded  = audit.na_apply_project(stub, BUCKET, record, force=True)
        r2_after  = stub.document(PJ_KEY)
        check('[A3] audit --force: R2 LayoutEditor__DrawingsData survives',
              r2_after.get('LayoutEditor__DrawingsData') == r2_before['LayoutEditor__DrawingsData'])
        check('[A3] audit --force: R2 scene block kept as the editor left it (no re-point in the audit tool)',
              r2_after.get('PresentationMode__SavedCameraScenes') == r2_before['PresentationMode__SavedCameraScenes'])
        check('[A3] audit --force: the local file receives R2 editor keys',
              na_local_doc(ws).get('LayoutEditor__DrawingsData') == r2_before['LayoutEditor__DrawingsData'])
        check('[A3] audit --force: images and thumbnails still uploaded (project.json + 6 files)', uploaded == 7, f'uploaded={uploaded}')
        check('[A2] audit --force: no sub-folder key touched', all(k in stub.objects for k in SUBFOLDER_KEYS))
    with na_workspace(r2_has_project_json=False) as ws, na_sync_environment(ws):
        record   = audit.na_audit_project(ws.stub, BUCKET, FOLDER_ID)
        uploaded = audit.na_apply_project(ws.stub, BUCKET, record, force=False)
        check('[S] audit --apply: a project.json missing on R2 is uploaded as it is',
              record['missingProjectJson'] and PJ_KEY in ws.stub.objects and ws.stub.document(PJ_KEY) == na_local_doc(ws),
              f'uploaded={uploaded}')
    with na_workspace() as ws, na_sync_environment(ws):
        ws.stub.fail_get[PJ_KEY] = 'AccessDenied'
        pj_before = ws.stub.objects[PJ_KEY]['Body']
        record    = audit.na_audit_project(ws.stub, BUCKET, FOLDER_ID)
        audit.na_apply_project(ws.stub, BUCKET, record, force=True)
        check('[S] audit --force with R2 unreadable: project.json not overwritten', ws.stub.objects[PJ_KEY]['Body'] == pj_before)

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Runner
# -----------------------------------------------------------------------------

TESTS = [
    test_real_config_holds_the_one_list,
    test_key_list_refusals,
    test_image_purge_scope_and_pagination,
    test_glb_purge_scope,
    test_full_sync_all,
    test_sync_glb_preserves_editor_keys,
    test_sync_images_scope,
    test_fail_closed_when_r2_unreadable,
    test_fail_closed_when_r2_not_json,
    test_fail_closed_when_key_list_missing,
    test_first_upload_when_r2_has_none,
    test_line_endings_kept,
    test_purge_fails_safe,
    test_audit_tool_preserves_editor_keys,
]


def main() -> int:
    sync.na_force_utf8_streams()
    print(f'Tools under test : {TOOLS_DIR}')
    print(f'Shared R2 lib    : {Path(r2lib.__file__).resolve()}')
    print(f'Editor key list  : {REAL_VV_CONFIG}')
    check('[S] the shared lib was loaded from the folder under test', Path(r2lib.__file__).resolve().parent == TOOLS_DIR)
    for test in TESTS:
        print(f'\n== {test.__name__}')
        try:
            test()
        except Exception:
            check(f'{test.__name__} ran without raising', False, traceback.format_exc())
    failed = [c for c in CHECKS if not c[1]]
    print(f"\nNa__Test__SyncPipeline__EditorKeys__: {len(CHECKS) - len(failed)}/{len(CHECKS)} checks passed")
    for name, _, detail in failed:
        print(f'  FAILED: {name}' + (f'\n    {detail}' if detail else ''))
    return 0 if not failed else 1


if __name__ == '__main__':
    sys.exit(main())

# endregion -------------------------------------------------------------------
