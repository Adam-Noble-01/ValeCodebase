# =============================================================================
# VALEVISION 3D MCP - TOOLS - THE WORKSHOP
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__Tools__Workshop__.py
# PURPOSE    : What an agent building the app keeps needing: every consumer of a name, an
#              anchored edit that keeps line endings, the checks, and new tools without a restart
# CREATED    : 05-Nov-2026
#
# DESCRIPTION:
# - Adam, 05-Nov-2026: "Identiffy any pottential MCP tooling that would have made your life easier
#   during these or your last task and add them to the mcp folder for ValeVision".
#     vv3d_consumers     Who reads a record key or a door's function: the app, the API, Cloud Sync, the
#                        GLB Builder, this server. A record key has readers in other programs,
#                        and the one missed is the bug. Grep across five folders, every time.
#     vv3d_patch_file    Files here mix LF and CRLF, and a patch has to keep each. Every anchor is
#                        checked before anything is written, so a failed edit leaves nothing half done.
#     vv3d_check         The skill's static checks and the libraries' validators, in one call.
#     vv3d_reload_tools  A tool written in a session could not be used in that session: its client had
#                        the old list, and every test went through a scratch stdio client. This reloads
#                        the tool files and tells the client the list has changed. The browser and the
#                        testing server survive it.
# - THESE READ THE CODE, NEVER A CLIENT'S DATA. vv3d_patch_file refuses the project library, the users
#   register and anything outside the app, the API and their tools.
#
# =============================================================================

import os
import re
import subprocess
import sys
from pathlib import Path

import Na__ValeVisionMcp__Server__Core__ as Na__Core
from Na__ValeVisionMcp__Server__Core__ import Na__Result__Data, Na__Tool, Na__ToolError

NA_SKILL_SCRIPTS = Path(os.path.expanduser('~')) / '.claude' / 'skills' / 'vgh-valevision3d' / 'scripts'
NA_PLUGINS_DIR = Path(os.environ.get('APPDATA') or os.path.expanduser('~')) / 'SketchUp' / 'SketchUp 2027' / 'SketchUp' / 'Plugins'
NA_CONSUMER_AREAS = {
    'app': Na__Core.NA_APP_DIR,
    'api': Na__Core.NA_MIRROR_DIR / 'Server__Api',
    'developer tools': Na__Core.NA_MIRROR_DIR / 'Server__DeveloperTools',
    'gallery': Na__Core.NA_MIRROR_DIR / 'Vale__ValeVisionGallery',
    'server manager': Na__Core.NA_MIRROR_DIR.parent / 'Vale__VirtualServerManager',
    'cloud sync': NA_PLUGINS_DIR / 'Na__ValeVisionCloudSync__Modules__',
    'glb builder': NA_PLUGINS_DIR / 'Na__TrueVision__GlbBuilderUtility__Modules__'
}
NA_CONSUMER_SKIP_DIRS = {'node_modules', '__pycache__', '.git', '00__Archive', '00__ArchivedVersions', 'vendor', '99__Vendor', '__Temp'}
NA_CONSUMER_EXTENSIONS = {'.js', '.mjs', '.py', '.rb', '.html', '.css', '.json', '.md', '.bat', '.conf'}
NA_CONSUMER_MAX_BYTES = 2000000
NA_PATCH_ROOTS = [Na__Core.NA_APP_DIR, Na__Core.NA_MIRROR_DIR / 'Server__Api', Na__Core.NA_MIRROR_DIR / 'Server__DeveloperTools']
NA_PATCH_REFUSED = ('Vale__Projects__MasterLibrary', 'Server__UserAccountData', 'UserData__')


# -----------------------------------------------------------------------------
# REGION | Who Reads This Name
# -----------------------------------------------------------------------------

def Na__Consumers__Files(root):
    for here, folders, files in os.walk(root):
        folders[:] = [name for name in folders if name not in NA_CONSUMER_SKIP_DIRS and not name.startswith('.')]
        for name in files:
            path = Path(here) / name
            if path.suffix.lower() in NA_CONSUMER_EXTENSIONS:
                yield path


@Na__Tool('vv3d_consumers', 'Who reads this name',
          'Every file that names a record key, a door\'s function or an event, across the app, its API, the developer tools, the Gallery, the Server Manager, Cloud Sync and the GLB Builder, by area, with the line. Ask before changing anything another program may read. Reads code, never a project\'s data.',
          {'name': {'type': 'string', 'description': 'The words to find, exactly: a key such as Vegetation__SceneData__Paths, a function, an event.'},
           'areas': {'type': 'array', 'items': {'type': 'string', 'enum': list(NA_CONSUMER_AREAS)}, 'description': 'Default all of them.'},
           'include_docs': {'type': 'boolean', 'description': 'Markdown too. Default false: code and config.'},
           'lines_per_file': {'type': 'integer', 'description': 'Default 3.'}},
          required=['name'], read_only=True)
def Na__Tool__Consumers(arguments):
    wanted = arguments['name']
    if len(wanted) < 4:
        raise Na__ToolError('That is too short to mean anything.', 'Give a whole key or function name.')
    per_file = int(arguments.get('lines_per_file') or 3)
    docs = arguments.get('include_docs') is True
    answer = {}
    total = 0
    for area in arguments.get('areas') or list(NA_CONSUMER_AREAS):
        root = NA_CONSUMER_AREAS[area]
        if not root.is_dir():
            answer[area] = 'not on this PC'
            continue
        rows = []
        for path in Na__Consumers__Files(root):
            if path.suffix.lower() == '.md' and not docs:
                continue
            try:
                if path.stat().st_size > NA_CONSUMER_MAX_BYTES:
                    continue
                text = path.read_text(encoding='utf-8', errors='replace')
            except OSError:
                continue
            if wanted not in text:
                continue
            found = [(number, line.strip()[:170]) for number, line in enumerate(text.splitlines(), 1) if wanted in line]
            rows.append({'file': str(path.relative_to(root)), 'count': len(found), 'lines': ['%d: %s' % row for row in found[:per_file]]})
            total += 1
        answer[area] = rows
    return Na__Result__Data({'name': wanted, 'files': total, 'areas': answer})

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | An Anchored Edit
# -----------------------------------------------------------------------------

def Na__Patch__Allowed(path):
    resolved = Path(path).resolve()
    if any(part.startswith(NA_PATCH_REFUSED) for part in resolved.parts):
        raise Na__ToolError('That holds client or account data, which this tool never touches: %s' % resolved)
    if not any(root.resolve() in resolved.parents for root in NA_PATCH_ROOTS):
        raise Na__ToolError('Only the app, its API and the developer tools: %s' % resolved)
    if resolved.name.startswith('ProjectData__'):
        raise Na__ToolError('A project record is written through the API or vv3d_*_edit, never patched.')
    return resolved


@Na__Tool('vv3d_patch_file', 'An anchored edit that keeps line endings',
          'Replaces each old with its new in one file, keeping that file\'s own line endings whatever these are written in. Every old must be found exactly once before anything is written, so a failed edit leaves the file as it was and says which anchor failed. Files here mix LF and CRLF. Refuses the project library, the users register and project records. Nothing is committed.',
          {'file': {'type': 'string'},
           'edits': {'type': 'array', 'minItems': 1, 'items': {'type': 'object', 'properties': {'old': {'type': 'string'}, 'new': {'type': 'string'}}, 'required': ['old', 'new']}},
           'dry_run': {'type': 'boolean', 'description': 'Check every anchor and write nothing.'}},
          required=['file', 'edits'], destructive=True)
def Na__Tool__PatchFile(arguments):
    path = Na__Patch__Allowed(arguments['file'])
    if not path.is_file():
        raise Na__ToolError('No such file: %s' % path)
    raw = path.read_bytes()
    crlf = raw.count(b'\r\n') > raw.count(b'\n') / 2
    body = raw.decode('utf-8').replace('\r\n', '\n')
    problems = []
    for index, edit in enumerate(arguments['edits'], 1):
        old = edit['old'].replace('\r\n', '\n')
        found = body.count(old)
        if found != 1:
            problems.append('edit %d: found %d times: %s' % (index, found, old[:120]))
    if problems:
        raise Na__ToolError('Nothing was written. ' + ' | '.join(problems), 'Each old must be found exactly once. Read the file again: another session may have changed it.')
    for edit in arguments['edits']:
        body = body.replace(edit['old'].replace('\r\n', '\n'), edit['new'].replace('\r\n', '\n'), 1)
    if arguments.get('dry_run'):
        return Na__Result__Data({'wouldWrite': str(path), 'edits': len(arguments['edits']), 'lineEndings': 'CRLF' if crlf else 'LF'})
    path.write_bytes(body.replace('\n', '\r\n' if crlf else '\n').encode('utf-8'))
    return Na__Result__Data({'written': str(path), 'edits': len(arguments['edits']), 'lineEndings': 'CRLF' if crlf else 'LF'})

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | The Checks
# -----------------------------------------------------------------------------

def Na__Check__Run(command, timeout_s, cwd=None):
    try:
        done = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, timeout=timeout_s, cwd=str(cwd) if cwd else None,
                              env=dict(os.environ, PYTHONUTF8='1'))
    except subprocess.TimeoutExpired:
        return {'passed': False, 'tail': 'it ran past %d s' % timeout_s}
    text = done.stdout.decode('utf-8', errors='replace')
    return {'passed': done.returncode == 0, 'tail': text[-1800:]}


@Na__Tool('vv3d_check', 'The static checks and the library validators',
          'The skill\'s vv3d_check (a real syntax check, JSON, undeclared names, every import in the module graph) over what has changed, or everything, then the plant and people libraries\' validators and index checks. Browser-free, and the first thing to run after an edit.',
          {'scope': {'type': 'string', 'enum': ['changed', 'all'], 'description': 'Default changed.'},
           'libraries': {'type': 'boolean', 'description': 'The asset libraries too. Default true.'}}, read_only=True)
def Na__Tool__Check(arguments):
    answer = {}
    script = NA_SKILL_SCRIPTS / 'vv3d_check.py'
    if script.is_file():
        answer['code'] = Na__Check__Run([sys.executable, '-B', str(script), arguments.get('scope') or 'changed'], 280, Na__Core.NA_APP_DIR)
    else:
        answer['code'] = {'passed': False, 'tail': 'The skill is not on this PC at %s' % script}
    if arguments.get('libraries') is not False:
        utilities = {
            'entourage': Na__Core.NA_APP_DIR / '54__Entourage__AssetLibrary' / 'Na__Entourage__BuildUtil__Library__.py',
            'vegetation': Na__Core.NA_VEG_LIBRARY_DIR / 'Na__Vegetation__BuildUtil__Library__.py'
        }
        for name, utility in utilities.items():
            if not utility.is_file():
                continue
            answer[name + 'Library'] = Na__Check__Run([sys.executable, '-B', str(utility), 'validate'], 120, utility.parent)
            answer[name + 'Index'] = Na__Check__Run([sys.executable, '-B', str(utility), 'index', '--check'], 120, utility.parent)
    answer['passed'] = all(row['passed'] for row in answer.values() if isinstance(row, dict))
    return Na__Result__Data(answer)

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | New Tools Without a Restart
# -----------------------------------------------------------------------------

@Na__Tool('vv3d_reload_tools', 'Load new and changed tools',
          'Reads every Na__ValeVisionMcp__Tools__*.py again, new files included, and tells the client the list of tools has changed, so a tool written in this session can be used in it. The open page and the testing server carry on. A change to the server\'s Core or Protocol still needs a restart.')
def Na__Tool__ReloadTools(_arguments):
    return Na__Result__Data(Na__Core.Na__Tools__Reload())

# endregion -------------------------------------------------------------------

# =============================================================================
# END OF FILE
# =============================================================================
