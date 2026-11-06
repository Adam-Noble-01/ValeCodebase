# =============================================================================
# VALEVISION 3D MCP - PYTHON SERVER - CORE
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__Server__Core__.py
# PURPOSE    : What every tool shares: where things are, the tool registry, the
#              shape of a result, reading and writing a project's record, and
#              the one way to the server (the Server Manager's engine)
# CREATED    : 04-Nov-2026
#
# DESCRIPTION:
# - THE RECORD IS WRITTEN AS THE API WRITES IT. Na__Library__WriteJson from the
#   API's own shared module: the same lock, the same kept revision, the same _rev.
#   A merge replaces named top-level keys and leaves every other key as the file has it.
# - TWO PLACES A RECORD CAN BE. "sandbox" is an agent's copy on its own testing server,
#   where anything may be tried. "real" is the PC's mirror, which a push sends to the live
#   server: a tool that writes there asks for confirm_real_data, every time.
# - THE SERVER IS REACHED ONLY THROUGH THE ENGINE (Connection Discipline in the vgh-app-server
#   skill): one job at a time, never ssh. Tools run on one worker thread, so two can never
#   collide, and the engine's own machine-wide lock covers everything else.
#
# FRAMES:
# - Saved values are integer mm in three.js axes, Y up. Nothing here converts them.
#
# =============================================================================

import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path


# -----------------------------------------------------------------------------
# REGION | Where Things Are
# -----------------------------------------------------------------------------

NA_HERE                 = Path(__file__).resolve().parent
NA_APP_DIR              = NA_HERE.parent                                        # <-- Vale__ValeVision3D
NA_MIRROR_DIR           = NA_APP_DIR.parent                                     # <-- Vale__VirtualServer, the same as /srv/vale
NA_LIBRARY_DIR          = NA_MIRROR_DIR / 'Vale__Projects__MasterLibrary'
NA_SHARED_LIBRARY_FILE  = NA_MIRROR_DIR / 'Server__Api' / 'Api__Shared' / 'ValeShared__Library__.py'
NA_SCENE_ASSETS_LOGIC_FILE = NA_MIRROR_DIR / 'Server__Api' / 'Api__ValeVision3D' / 'ValeVision3D__Api__SceneAssets__Logic__.py'
NA_SCENE_ASSETS_DIR     = 'UserData__SceneAssets'                               # <-- <project>/ValeVision3D/<this>: the API's CHANGES_DIR
NA_SCENE_ASSETS_FILE    = 'ValeVision__SceneAssets__Changes__.json'             # <-- The API's CHANGES_FILE
NA_SCENE_ASSETS_KEYS    = ('Entourage__SceneData', 'Vegetation__SceneData')
NA_ENGINE_FILE          = NA_MIRROR_DIR.parent / 'Vale__VirtualServerManager' / 'VirtualServerManager__SyncEngine__.py'
NA_DEVLOG_FILE          = NA_APP_DIR / 'ValeVision__DEVLOG__.md'
NA_VEG_LIBRARY_DIR      = NA_APP_DIR / '53__Vegetation__AssetLibrary'
NA_VEG_CONFIG_FILE      = NA_APP_DIR / '02__Src__AppModules' / '24__System__Vegetation' / 'Na__Vegetation__AppConfig__.json'
NA_TEST_SERVER_FILE     = NA_APP_DIR / 'ValeVision__TestServer__LocalServer__.py'
NA_AGENTS_DIR           = Path(os.environ.get('LOCALAPPDATA') or os.path.expanduser('~')) / 'ValeVision__TestServer' / 'Agents'
NA_LIVE_SITE            = 'https://app.valegardenhouses.com'
NA_DEFAULT_PORT         = 8042                                                  # <-- 8032 is Adam's, 8040 and 8041 other agents': this server's own copy
NA_FORBIDDEN_PORTS      = {8020: 'the Server Manager', 8030: 'the shared Vale dev server',
                           8031: "the Lantern Designer's testing server", 8032: "Adam's testing server"}
NA_WRITER_CODE          = 'ValeVisionMcp'                                       # <-- Names this server in the file name of a revision it keeps

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Results and Refusals
# -----------------------------------------------------------------------------

class Na__ToolError(Exception):
    """A tool saying no, in words: what is wrong and what to do about it."""

    def __init__(self, message, hint=''):
        super().__init__(message)
        self.na_message = message
        self.na_hint = hint


def Na__Result__Data(data, images=None):
    content = [{'type': 'text', 'text': json.dumps(data, indent=1, ensure_ascii=False)}]
    for image in images or []:
        content.append({'type': 'image', 'data': image, 'mimeType': 'image/png'})
    return {'content': content, 'isError': False}


def Na__Result__Error(message, hint=''):
    text = message + ('\nWhat to do: ' + hint if hint else '')
    return {'content': [{'type': 'text', 'text': text}], 'isError': True}

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Tool Registry
# -----------------------------------------------------------------------------

NA_TOOLS = {}
NA_KEPT = {}                                                                    # <-- What must outlive a reload of the tool files
NA_NOTIFY_TOOLS_CHANGED = None                                                  # <-- Set by Main: tells the client the list has changed


def Na__Keep(name, default):
    """A module's state that a reload must not lose: the browser, the testing server."""
    return NA_KEPT.setdefault(name, default)


def Na__Tools__Reload():
    """Read every tool file again, new ones included, and tell the client. Core and Protocol stay as they are."""
    before = set(NA_TOOLS)
    files = sorted(path.stem for path in NA_HERE.glob('Na__ValeVisionMcp__Tools__*.py'))
    saved = dict(NA_TOOLS)
    NA_TOOLS.clear()
    try:
        import Na__ValeVisionMcp__Tools__LiveApp__                              # noqa: F401  (others import it: it goes first)
        ordered = ['Na__ValeVisionMcp__Tools__LiveApp__'] + [name for name in files if name != 'Na__ValeVisionMcp__Tools__LiveApp__']
        for name in ordered:
            if name in sys.modules:
                importlib.reload(sys.modules[name])
            else:
                importlib.import_module(name)
    except Exception as error:
        NA_TOOLS.clear()
        NA_TOOLS.update(saved)                                                  # <-- A slip in a file being written must not take every tool away
        raise Na__ToolError('The tools were left as they were: %s: %s' % (type(error).__name__, error), 'Fix the file and call this again.')
    if NA_NOTIFY_TOOLS_CHANGED:
        NA_NOTIFY_TOOLS_CHANGED()
    return {'tools': len(NA_TOOLS), 'added': sorted(set(NA_TOOLS) - before), 'removed': sorted(before - set(NA_TOOLS)), 'files': files, 'clientTold': bool(NA_NOTIFY_TOOLS_CHANGED)}


def Na__Tool(name, title, description, properties=None, required=None, read_only=False, destructive=False):
    """Register a tool. The handler takes the call's arguments as a dict and returns a result."""

    def register(handler):
        NA_TOOLS[name] = {
            'definition': {
                'name': name,
                'title': title,
                'description': description,
                'inputSchema': {'type': 'object', 'properties': properties or {}, 'required': required or [],
                                'additionalProperties': False},
                'annotations': {'title': title, 'readOnlyHint': read_only, 'destructiveHint': destructive,
                                'openWorldHint': False}
            },
            'handler': handler
        }
        return handler

    return register


def Na__Tool__CheckArguments(definition, arguments):
    schema = definition['inputSchema']
    for name in schema['required']:
        if name not in arguments:
            raise Na__ToolError('%s needs %s.' % (definition['name'], name), 'See the tool\'s inputSchema.')
    for name in arguments:
        if name not in schema['properties']:
            raise Na__ToolError('%s has no argument called %s.' % (definition['name'], name),
                                'It takes: %s.' % ', '.join(sorted(schema['properties'])))

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Projects and Their Records
# -----------------------------------------------------------------------------

NA_PROJECT_ID = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.-]{0,120}$')
NA_SHARED_LIBRARY = None


def Na__Project__Folders(root=NA_LIBRARY_DIR):
    """Every project folder under a library root: {id: folder}. A project is a folder holding its own record."""
    found = {}
    for year in sorted(Path(root).glob('ValeProjects__*')):
        if not year.is_dir():
            continue
        for folder in year.iterdir():
            if folder.is_dir() and (folder / ('ProjectData__%s__.json' % folder.name)).is_file():
                found[folder.name] = folder
    return found


def Na__Project__Find(project):
    """The real folder for a library id, or for a name that matches only one project."""
    text = str(project or '').strip()
    if not NA_PROJECT_ID.match(text):
        raise Na__ToolError('"%s" is not a project id.' % text, 'Use the library folder name, such as 64616__Garnett: vv3d_project_list finds it.')
    folders = Na__Project__Folders()
    if text in folders:
        return folders[text]
    wanted = text.lower()
    near = sorted(name for name in folders if wanted in name.lower())
    if len(near) == 1:
        return folders[near[0]]
    raise Na__ToolError('No project called %s.' % text, ('Did you mean: %s?' % ', '.join(near[:8])) if near else 'vv3d_project_list finds it.')


def Na__Project__RecordPath(folder):
    return Path(folder) / ('ProjectData__%s__.json' % Path(folder).name)


def Na__Project__Read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def Na__Project__ScopeOf(folder):
    """The engine's scope for a project: ValeProjects__<yyyy>/<id>."""
    return '%s/%s' % (Path(folder).parent.name, Path(folder).name)


def Na__Library():
    """The API's own library module: the same lock, revision and _rev as a save through the API."""
    global NA_SHARED_LIBRARY
    if NA_SHARED_LIBRARY is None:
        os.environ['VALE_ROOT'] = str(NA_MIRROR_DIR)
        spec = importlib.util.spec_from_file_location('na_vale_shared_library', str(NA_SHARED_LIBRARY_FILE))
        module = importlib.util.module_from_spec(spec)
        sys.modules['na_vale_shared_library'] = module
        spec.loader.exec_module(module)
        NA_SHARED_LIBRARY = module
    return NA_SHARED_LIBRARY


def Na__Record__Merge(folder, change):
    """Merge top-level keys into a record as it is on disk, in one locked step.

    change(current) returns (keys to set, keys to remove). Returns what the write returned."""
    library = Na__Library()
    path = Na__Project__RecordPath(folder)
    with library.Na__Library__Locked(path):
        current = Na__Project__Read(path)
        keys, unset = change(current)
        merged = dict(current)
        merged.update(keys)
        for name in unset:
            merged.pop(name, None)
        written = library.Na__Library__WriteJson(path, merged, user_code=NA_WRITER_CODE, project_folder=Path(folder))
        Na__SceneAssets__NoteWrite(folder, current, merged, unset)
        return written


# -----------------------------------------------------------------------------
# REGION | Who Placed What
# -----------------------------------------------------------------------------

def Na__SceneAssets__Logic():
    """The API's own sums, from its own file: no copy to keep in step."""
    module = sys.modules.get('na_vale_scene_assets_logic')
    if module is None:
        spec = importlib.util.spec_from_file_location('na_vale_scene_assets_logic', str(NA_SCENE_ASSETS_LOGIC_FILE))
        module = importlib.util.module_from_spec(spec)
        sys.modules['na_vale_scene_assets_logic'] = module
        spec.loader.exec_module(module)
    return module


def Na__SceneAssets__ChangesPath(folder):
    return Path(folder) / 'ValeVision3D' / NA_SCENE_ASSETS_DIR / NA_SCENE_ASSETS_FILE


def Na__SceneAssets__ReadChanges(folder):
    path = Na__SceneAssets__ChangesPath(folder)
    if path.is_file():
        found = json.loads(path.read_text(encoding='utf-8'))
        if isinstance(found, dict):
            return found
    return Na__SceneAssets__Logic().na_new_changes()


def Na__SceneAssets__NoteWrite(folder, before, after, removed):
    """An agent's change is on the record of who did what too, as the API's own record route notes a sync. It never costs the save."""
    try:
        if not any(key in removed or before.get(key) != after.get(key) for key in NA_SCENE_ASSETS_KEYS):
            return
        logic = Na__SceneAssets__Logic()
        changes = Na__SceneAssets__ReadChanges(folder)
        who = {'code': NA_WRITER_CODE, 'name': 'ValeVision MCP (an agent)'}
        for system, settings in logic.NA_SYSTEMS.items():
            key = settings['Key']
            if key in removed:
                changes.get('SceneAssets__Changes__Systems', {}).pop(system, None)
            elif before.get(key) != after.get(key):
                logic.na_note_direct(system, before.get(key), after.get(key), changes, who)
        path = Na__SceneAssets__ChangesPath(folder)
        path.parent.mkdir(parents=True, exist_ok=True)
        Na__Library().Na__Library__WriteJson(path, changes, user_code=NA_WRITER_CODE, project_folder=Path(folder))
    except Exception as error:                                                  # <-- Who did what must never cost anyone their save
        sys.stderr.write('[valevision3d-mcp] who did what was not noted: %r\n' % (error,))

# endregion -------------------------------------------------------------------


def Na__Require__RealDataConfirmed(arguments):
    if arguments.get('confirm_real_data') is not True:
        raise Na__ToolError('This writes the real project record on this PC, which the next push sends to the live server.',
                            'Try it on the sandbox first, then call again with confirm_real_data: true when the person has asked for this change.')

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | The App
# -----------------------------------------------------------------------------

def Na__App__Version():
    """The top heading of the DEVLOG is the app's version."""
    try:
        with open(NA_DEVLOG_FILE, encoding='utf-8') as handle:
            for line in handle:
                match = re.match(r'##\s*ValeVision3D v(\d+\.\d+\.\d+)', line)
                if match:
                    return match.group(1)
    except OSError:
        pass
    return 'unknown'

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | The Server: the Engine and the Public Site
# -----------------------------------------------------------------------------

def Na__Engine__Run(arguments, timeout_s=900):
    """Run the Server Manager's engine. Returns (exit code, text, report or None)."""
    if not NA_ENGINE_FILE.is_file():
        raise Na__ToolError('The Server Manager\'s engine is not at %s.' % NA_ENGINE_FILE)
    report_path = os.path.join(tempfile.gettempdir(), 'na_vv3d_mcp_report_%d_%d.json' % (os.getpid(), int(time.time() * 1000)))
    command = [sys.executable, '-B', str(NA_ENGINE_FILE)] + list(arguments)
    wants_report = arguments and arguments[0] in ('compare', 'push', 'collect')
    if wants_report:
        command += ['--report-file', report_path]
    environment = dict(os.environ, PYTHONUTF8='1')
    environment.pop('VALE_ROOT', None)
    done = subprocess.run(command, stdin=subprocess.DEVNULL, capture_output=True, text=True, encoding='utf-8', errors='replace',
                          timeout=timeout_s, env=environment)
    report = None
    if wants_report and os.path.isfile(report_path):
        try:
            with open(report_path, encoding='utf-8') as handle:
                report = json.load(handle)
        finally:
            os.remove(report_path)
    return done.returncode, (done.stdout + done.stderr).strip(), report


def Na__Live__Peek(path, max_bytes=4096, timeout_s=15):
    """Ask the public site for a path, signed out, with no ssh. Returns (status, first bytes as text)."""
    request = urllib.request.Request(NA_LIVE_SITE + path, headers={'User-Agent': 'ValeVisionMcp/1.0'})
    try:
        with urllib.request.urlopen(request, timeout=timeout_s) as answer:
            return answer.status, answer.read(max_bytes).decode('utf-8', errors='replace')
    except urllib.error.HTTPError as error:
        return error.code, ''
    except (urllib.error.URLError, OSError):
        return 0, ''

# endregion -------------------------------------------------------------------

# =============================================================================
# END OF FILE
# =============================================================================
