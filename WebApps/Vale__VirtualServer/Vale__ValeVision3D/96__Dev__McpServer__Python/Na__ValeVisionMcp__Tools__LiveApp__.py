# =============================================================================
# VALEVISION 3D MCP - TOOLS - THE REAL APP, HEADLESS, ON A SANDBOX
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__Tools__LiveApp__.py
# PURPOSE    : Run this server's own copy of the testing server, open the real app in it
#              in headless Edge as a fake user, move the camera, take pictures, measure
# CREATED    : 04-Nov-2026
#
# DESCRIPTION:
# - AGENTS NEVER SIGN IN ON REAL DATA (note 19, section 7.7). The app runs on a sandbox with
#   fake users: a generated register, a copy of the project's record, models falling through
#   to the mirror. Port 8042 and its own sandbox by default; Adam's 8032 and the other house
#   servers are refused.
# - THE TESTING SERVER IS A CHILD OF THIS PROCESS, so it ends when the client closes this
#   server. An agent's shell is not involved, which is what used to kill detached ones.
# - THE BROWSER BELONGS TO THE ONE TOOL THREAD. Playwright's sync API is single threaded, and
#   every tool runs on that thread (Protocol's header).
# - HEADLESS FLAGS ARE THE ONES PROVEN IN note 17: swiftshader for pixels, the real card with
#   gpu: true. wait_for_function has hung here with the page perfectly well, so a plain loop
#   polls. The service worker is blocked, and the install card, which swallows clicks, hidden.
# - A NEW CONTEXT IS A NEW DEVICE. Nothing is remembered between opens, so a project's default
#   transparency is what shows, unless a tool has moved it.
#
# =============================================================================

import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import Na__ValeVisionMcp__Server__Core__ as Na__Core
from Na__ValeVisionMcp__Server__Core__ import Na__Result__Data, Na__Tool, Na__ToolError

NA_GPU_ARGS = ['--use-angle=d3d11', '--use-gl=angle', '--ignore-gpu-blocklist', '--enable-gpu']
NA_SOFT_ARGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
NA_HIDE_INSTALL_CARD = ("document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style');"
                        " st.textContent = '[class*=ValeAppInstall], [id*=ValeAppInstall] { display: none !important; }';"
                        " document.head.appendChild(st); });")
NA_START_WAIT_S = 120
NA_LOAD_WAIT_S = 300
NA_ROUTE = '/valevision/'
NA_STATUS_PATH = '/_testserver/api/status'

NA_STATE = {'server': None, 'port': None, 'log': None, 'playwright': None, 'browser': None, 'context': None, 'page': None,
            'open': None, 'errors': []}


# -----------------------------------------------------------------------------
# REGION | The Sandbox and Its Server
# -----------------------------------------------------------------------------

def Na__Sandbox__Dir(port):
    return Na__Core.NA_AGENTS_DIR / ('port_%d' % port)


def Na__Sandbox__Status(port):
    try:
        with urllib.request.urlopen('http://127.0.0.1:%d%s' % (port, NA_STATUS_PATH), timeout=6) as answer:
            return json.loads(answer.read().decode('utf-8'))
    except (urllib.error.URLError, OSError, ValueError):
        return None


def Na__Sandbox__RequireRunning():
    port = NA_STATE['port']
    status = Na__Sandbox__Status(port) if port else None
    if not status:
        raise Na__ToolError('This server\'s testing server is not running.', 'Call vv3d_sandbox_start first.')
    if not status.get('Sandbox'):
        raise Na__ToolError('The server on port %d is on real data, and agents never sign in on real data.' % port)
    return port, status


def Na__Sandbox__Describe():
    port = NA_STATE['port']
    status = Na__Sandbox__Status(port) if port else None
    if not status:
        return {'running': False}
    sandbox = status.get('Sandbox') or {}
    return {'running': True, 'port': port, 'url': status['Server']['Url'], 'mode': status['Server']['Mode'],
            'projects': sandbox.get('Projects'), 'log': NA_STATE['log'],
            'problems': {name: len(status.get(name) or []) for name in ('NotDeployed', 'Missing', 'ServerErrors')}}


def Na__Sandbox__LibraryRoot():
    port = NA_STATE['port'] or Na__Core.NA_DEFAULT_PORT
    return Na__Sandbox__Dir(port) / 'Sandbox' / 'Vale__Projects__MasterLibrary'


def Na__Record__Locate(project, target):
    """(folder, record path) of a project, real or in this server's sandbox."""
    real = Na__Core.Na__Project__Find(project)
    if target != 'sandbox':
        return real, Na__Core.Na__Project__RecordPath(real)
    folder = Na__Sandbox__LibraryRoot() / real.parent.name / real.name
    path = Na__Core.Na__Project__RecordPath(folder)
    if not path.is_file():
        raise Na__ToolError('%s is not in the sandbox yet.' % real.name, 'Call vv3d_sandbox_load_project.')
    return folder, path


@Na__Tool('vv3d_sandbox_start', 'Start the testing server',
          'Starts this server\'s own copy of the ValeVision 3D testing server: the real app and API, fake users, sandbox data. It stops when this MCP server stops.',
          {'port': {'type': 'integer', 'description': 'Default 8042. The house ports 8020, 8030, 8031 and 8032 are refused.'},
           'reset': {'type': 'boolean', 'description': 'Rebuild the sandbox from nothing: its copies and its fake users go.'}})
def Na__Tool__SandboxStart(arguments):
    port = int(arguments.get('port') or Na__Core.NA_DEFAULT_PORT)
    if port in Na__Core.NA_FORBIDDEN_PORTS:
        raise Na__ToolError('Port %d is %s.' % (port, Na__Core.NA_FORBIDDEN_PORTS[port]), 'Agents run only their own copy: leave port out.')
    if NA_STATE['server'] is not None and NA_STATE['server'].poll() is None and NA_STATE['port'] == port:
        return Na__Result__Data({'alreadyRunning': True, 'sandbox': Na__Sandbox__Describe()})
    running = Na__Sandbox__Status(port)
    if running:
        if not running.get('Sandbox'):
            raise Na__ToolError('Something on port %d is serving real data.' % port, 'Choose another port.')
        NA_STATE['port'] = port                                                 # <-- Another copy of this server's, or one left running: use it
        return Na__Result__Data({'alreadyRunning': True, 'startedElsewhere': True, 'sandbox': Na__Sandbox__Describe()})
    work = Na__Sandbox__Dir(port)
    work.mkdir(parents=True, exist_ok=True)
    log_path = work / 'server.log'
    command = [sys.executable, '-B', str(Na__Core.NA_TEST_SERVER_FILE), '--port', str(port), '--no-browser', '--no-reload',
               '--sandbox-root', str(work / 'Sandbox')]
    if arguments.get('reset'):
        command.append('--reset-sandbox')
    environment = dict(os.environ, PYTHONUTF8='1')
    environment.pop('VALE_ROOT', None)                                          # <-- The testing server sets its own: never inherit this process's
    with open(log_path, 'w', encoding='utf-8') as log:
        process = subprocess.Popen(command, cwd=str(Na__Core.NA_APP_DIR), stdout=log, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, env=environment)
    NA_STATE.update(server=process, port=port, log=str(log_path))
    deadline = time.time() + NA_START_WAIT_S
    while time.time() < deadline:
        if process.poll() is not None:
            tail = Path(log_path).read_text(encoding='utf-8', errors='replace')[-1500:]
            raise Na__ToolError('The testing server stopped as it started (exit %s). Its log:\n%s' % (process.poll(), tail))
        if Na__Sandbox__Status(port):
            return Na__Result__Data({'started': True, 'sandbox': Na__Sandbox__Describe()})
        time.sleep(1)
    raise Na__ToolError('The testing server did not answer within %d s.' % NA_START_WAIT_S, 'Its log: %s' % log_path)


@Na__Tool('vv3d_sandbox_stop', 'Stop the testing server',
          'Closes the browser and stops this server\'s testing server. The sandbox stays on disk for next time.')
def Na__Tool__SandboxStop(_arguments):
    Na__Browser__Close()
    process = NA_STATE['server']
    stopped = False
    if process is not None and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            process.kill()
        stopped = True
    NA_STATE.update(server=None)
    return Na__Result__Data({'stopped': stopped})


@Na__Tool('vv3d_sandbox_load_project', 'Copy a project into the sandbox',
          'Copies a project\'s real record into the sandbox, over any copy already there, so it can be opened and changed with no risk to it. Only the record: models and pictures fall through to the mirror.',
          {'project': {'type': 'string'}}, required=['project'])
def Na__Tool__SandboxLoadProject(arguments):
    Na__Sandbox__RequireRunning()
    real = Na__Core.Na__Project__Find(arguments['project'])
    folder = Na__Sandbox__LibraryRoot() / real.parent.name / real.name
    folder.mkdir(parents=True, exist_ok=True)
    source = Na__Core.Na__Project__RecordPath(real)
    target = Na__Core.Na__Project__RecordPath(folder)
    shutil.copyfile(source, target)
    record = Na__Core.Na__Project__Read(target)
    return Na__Result__Data({'project': real.name, 'copied': str(target), 'rev': record.get('_rev', 0)})

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | The Browser
# -----------------------------------------------------------------------------

def Na__Browser__Describe():
    return {'open': NA_STATE['page'] is not None, 'page': NA_STATE['open']}


def Na__Browser__Close():
    for name, method in (('context', 'close'), ('browser', 'close'), ('playwright', 'stop')):
        item = NA_STATE[name]
        if item is not None:
            try:
                getattr(item, method)()
            except Exception:                                                  # <-- Already gone: there is nothing to tell
                pass
    NA_STATE.update(playwright=None, browser=None, context=None, page=None, open=None)


def Na__Browser__RequirePage():
    if NA_STATE['page'] is None:
        raise Na__ToolError('No page is open.', 'Call vv3d_open.')
    return NA_STATE['page']


def Na__Browser__Helpers(page):
    page.evaluate((Na__Core.NA_HERE / 'Na__ValeVisionMcp__PageHelpers__.js').read_text(encoding='utf-8') + '\ntrue;')


def Na__Browser__Call(expression, *values):
    """Call window.Na__VvMcp from Python. The values reach the page as a JSON string, so nothing needs quoting."""
    page = Na__Browser__RequirePage()
    Na__Browser__Helpers(page)
    try:
        return page.evaluate('async ([call, values]) => { const NaCall = new Function("helpers", "values", "return helpers." + call + "(...values);");'
                             ' return await NaCall(window.Na__VvMcp, values); }', [expression, list(values)])
    except Exception as error:
        raise Na__ToolError('The page answered: %s' % str(error).splitlines()[0][:600])


def Na__Browser__WaitLoaded(page):
    deadline = time.time() + NA_LOAD_WAIT_S
    while time.time() < deadline:
        state = page.evaluate("(() => { const o = document.querySelector('.loading-overlay'); return o ? o.className : 'none'; })()")
        if 'hidden' in state or state == 'none':
            return True
        page.wait_for_timeout(500)
    return False


@Na__Tool('vv3d_open', 'Open a project in the real app',
          'Opens a project in headless Edge on the sandbox, signed in as a fake user, and waits for the model. Replaces any page already open. Say what level: an author (AppAdmin) has the dev rows, Client opens a real client link, Nobody gets the sign-in card.',
          {'project': {'type': 'string'},
           'as_level': {'type': 'string', 'enum': ['AppAdmin', 'Management', 'Employee', 'Affiliate', 'Client', 'Nobody'], 'description': 'Default AppAdmin.'},
           'width': {'type': 'integer', 'description': 'Default 1600.'},
           'height': {'type': 'integer', 'description': 'Default 900.'},
           'gpu': {'type': 'boolean', 'description': 'The real graphics card, for a frame rate. Default swiftshader, for pixels.'},
           'settle_ms': {'type': 'integer', 'description': 'Wait after the loading screen goes. Default 4000.'}},
          required=['project'])
def Na__Tool__Open(arguments):
    port, status = Na__Sandbox__RequireRunning()
    real = Na__Core.Na__Project__Find(arguments['project'])
    if not Na__Core.Na__Project__RecordPath(Na__Sandbox__LibraryRoot() / real.parent.name / real.name).is_file():
        raise Na__ToolError('%s is not in the sandbox yet.' % real.name, 'Call vv3d_sandbox_load_project.')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise Na__ToolError('Opening the app needs Playwright.', 'pip install playwright; Edge is its channel msedge.')

    Na__Browser__Close()
    level = arguments.get('as_level') or 'AppAdmin'
    sandbox = status['Sandbox']
    accounts = {account['Level'].lower(): account for account in sandbox['Accounts']}
    base = 'http://localhost:%d%s' % (port, NA_ROUTE)
    query = '?project=' + urllib.parse.quote(real.name)

    started = time.time()
    playwright = sync_playwright().start()
    browser = playwright.chromium.launch(channel='msedge', headless=True, args=NA_GPU_ARGS if arguments.get('gpu') else NA_SOFT_ARGS)
    context = browser.new_context(viewport={'width': int(arguments.get('width') or 1600), 'height': int(arguments.get('height') or 900)},
                                  service_workers='block')
    NA_STATE.update(playwright=playwright, browser=browser, context=context, errors=[])
    page = context.new_page()
    page.add_init_script(NA_HIDE_INSTALL_CARD)
    page.on('pageerror', lambda error: NA_STATE['errors'].append('script error: ' + str(error)[:400]))
    page.on('console', lambda message: NA_STATE['errors'].append('console.error: ' + message.text[:400]) if message.type == 'error' else None)
    page.on('response', lambda response: NA_STATE['errors'].append('HTTP %d: %s' % (response.status, response.url[:300])) if response.status >= 400 else None)

    if level == 'Client':                                                      # <-- Made by a staff session of its own, opened by one that holds nothing
        staff = browser.new_context()
        staff.request.post(base + 'api/accounts/login', data={'email': accounts['employee']['Email'], 'password': sandbox['Password']})
        answer = staff.request.post(base + 'api/projects/' + urllib.parse.quote(real.name) + '/shares', data={'label': 'Mcp', 'expiresDays': 1})
        body = answer.json() if answer.status == 200 else {}
        link = body.get('link') or {}
        token = body.get('token') or link.get('ValeVision3DShare__Link__Token') or link.get('token')
        staff.close()
        if not token:
            raise Na__ToolError('No client link could be made: HTTP %s.' % answer.status)
        query += '&share=' + urllib.parse.quote(token)
    elif level != 'Nobody':
        answer = context.request.post(base + 'api/accounts/login', data={'email': accounts[level.lower()]['Email'], 'password': sandbox['Password']})
        if answer.status != 200:
            raise Na__ToolError('The sign-in as %s answered HTTP %s.' % (level, answer.status))

    page.goto(base + query, wait_until='load', timeout=180000)
    loaded = Na__Browser__WaitLoaded(page)
    page.wait_for_timeout(int(arguments.get('settle_ms') or 4000))
    NA_STATE.update(page=page, open={'project': real.name, 'as': level, 'url': base + (query if level != 'Client' else '?project=' + real.name + '&share=(hidden)')})
    answer = {'opened': NA_STATE['open'], 'loaded': loaded, 'seconds': round(time.time() - started, 1), 'scriptProblems': NA_STATE['errors'][:20]}
    if loaded:
        answer['camera'] = Na__Browser__Call('getCamera')
        answer['savedScenes'] = Na__Browser__Call('listScenes')
        answer['vegetation'] = Na__Browser__Call('vegetation')
        answer['overlay'] = Na__Browser__Call('problems')
    return Na__Result__Data(answer)


@Na__Tool('vv3d_close', 'Close the page', 'Closes the browser. The testing server keeps running.')
def Na__Tool__Close(_arguments):
    Na__Browser__Close()
    return Na__Result__Data({'closed': True})


@Na__Tool('vv3d_view', 'Move the camera',
          'Goes to a saved scene by name or id (part of a name will do), or sets the camera. Integer mm in three.js axes, Y up. No arguments: says where the camera is and lists the saved scenes.',
          {'scene': {'type': 'string'},
           'position_mm': {'type': 'array', 'items': {'type': 'number'}, 'minItems': 3, 'maxItems': 3},
           'target_mm': {'type': 'array', 'items': {'type': 'number'}, 'minItems': 3, 'maxItems': 3},
           'fov_deg': {'type': 'number'},
           'settle_ms': {'type': 'integer', 'description': 'Wait for the view to refine. Default 2500.'}})
def Na__Tool__View(arguments):
    page = Na__Browser__RequirePage()
    if arguments.get('scene'):
        answer = Na__Browser__Call('gotoScene', arguments['scene'])
    elif arguments.get('position_mm') or arguments.get('target_mm') or arguments.get('fov_deg'):
        answer = Na__Browser__Call('setCamera', {key: arguments[key] for key in ('position_mm', 'target_mm', 'fov_deg') if key in arguments})
    else:
        return Na__Result__Data({'camera': Na__Browser__Call('getCamera'), 'savedScenes': Na__Browser__Call('listScenes')})
    page.wait_for_timeout(int(arguments.get('settle_ms') or 2500))
    return Na__Result__Data(answer)


@Na__Tool('vv3d_screenshot', 'Take a picture of the page',
          'Takes a picture of the open page and returns it. The app\'s panels are hidden unless hide_ui is false. Saved as a PNG too: at path if given, else in the temp folder.',
          {'path': {'type': 'string'},
           'hide_ui': {'type': 'boolean', 'description': 'Default true: the model alone.'},
           'settle_ms': {'type': 'integer', 'description': 'Default 800.'},
           'return_image': {'type': 'boolean', 'description': 'Default true.'}})
def Na__Tool__Screenshot(arguments):
    page = Na__Browser__RequirePage()
    hide = arguments.get('hide_ui') is not False
    if hide:
        Na__Browser__Call('hideUi', True)
    page.wait_for_timeout(int(arguments.get('settle_ms') or 800))
    path = arguments.get('path') or os.path.join(tempfile.gettempdir(), 'na_vv3d_shot_%d.png' % int(time.time() * 1000))
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    page.screenshot(path=path)
    if hide:
        Na__Browser__Call('hideUi', False)
    images = None
    if arguments.get('return_image') is not False:
        with open(path, 'rb') as handle:
            images = [base64.b64encode(handle.read()).decode('ascii')]
    return Na__Result__Data({'path': path, 'camera': Na__Browser__Call('getCamera')}, images=images)


@Na__Tool('vv3d_page_state', 'What the page sees',
          'The plants as the page holds them, what the testing server\'s overlay saw, and script errors so far.', read_only=True)
def Na__Tool__PageState(_arguments):
    Na__Browser__RequirePage()
    return Na__Result__Data({'page': NA_STATE['open'], 'vegetation': Na__Browser__Call('vegetation'), 'overlay': Na__Browser__Call('problems'),
                             'scriptProblems': NA_STATE['errors'][-30:], 'sandbox': Na__Sandbox__Describe()})


@Na__Tool('vv3d_vegetation_preview', 'Try transparency or show on the page',
          'Sets Show Vegetation or Transparency on the open page only. Nothing is saved: to save them use vv3d_vegetation_edit.',
          {'transparency_percent': {'type': 'number', 'minimum': 0, 'maximum': 100}, 'shown': {'type': 'boolean'},
           'settle_ms': {'type': 'integer', 'description': 'Default 1500.'}})
def Na__Tool__VegetationPreview(arguments):
    page = Na__Browser__RequirePage()
    answer = Na__Browser__Call('setVegetation', {key: arguments[key] for key in ('transparency_percent', 'shown') if key in arguments})
    page.wait_for_timeout(int(arguments.get('settle_ms') or 1500))
    return Na__Result__Data(answer)


@Na__Tool('vv3d_probe_surface', 'Measure the model\'s surface',
          'The first real surface below a height at each plan spot, as a click would find it: its height, object and material. Spots are [x, z] in integer mm, three.js axes. Use it to find where a planting bed starts and stops. Needs vegetation switched on for the project.',
          {'spots_xz_mm': {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'number'}, 'minItems': 2, 'maxItems': 2}, 'minItems': 1, 'maxItems': 2000},
           'from_height_mm': {'type': 'number', 'description': 'Look down from here. Default 20000.'}},
          required=['spots_xz_mm'], read_only=True)
def Na__Tool__ProbeSurface(arguments):
    return Na__Result__Data({'hits': Na__Browser__Call('probe', arguments['spots_xz_mm'], arguments.get('from_height_mm') or 20000)})


@Na__Tool('vv3d_eval', 'Run JavaScript in the page',
          'Runs an expression in the sandbox page and returns its value as JSON (a promise is awaited). The app\'s modules can be reached with await import(new URL("02__Src__AppModules/<path>", document.baseURI).href), which gives the instances the app itself uses. For anything no other tool covers. Only ever a sandbox page: nothing it does reaches real data.',
          {'expression': {'type': 'string'}}, required=['expression'])
def Na__Tool__Eval(arguments):
    page = Na__Browser__RequirePage()
    try:
        value = page.evaluate('async (source) => { const NaRun = new (Object.getPrototypeOf(async function () {}).constructor)("return (" + source + ");"); return await NaRun(); }',
                              arguments['expression'])
    except Exception as error:
        raise Na__ToolError('The page answered: %s' % str(error).splitlines()[0][:800])
    return Na__Result__Data({'value': value})

# endregion -------------------------------------------------------------------

# =============================================================================
# END OF FILE
# =============================================================================
