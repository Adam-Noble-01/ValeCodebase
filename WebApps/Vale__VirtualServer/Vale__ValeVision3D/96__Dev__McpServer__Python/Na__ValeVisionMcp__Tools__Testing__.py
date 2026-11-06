# =============================================================================
# VALEVISION 3D MCP - TOOLS - TESTING AS A PERSON WOULD
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__Tools__Testing__.py
# PURPOSE    : Drive the open page with a real mouse and keyboard, read what is really on
#              screen, walk a project at every level, call the API as any level, run a scratch
#              module among the app's own, and compare pictures
# CREATED    : 05-Nov-2026
#
# DESCRIPTION:
# - Adam, 05-Nov-2026: "Identiffy any pottential MCP tooling that would have made your life easier
#   during these or your last task and add them to the mcp folder for ValeVision". Each tool here is a
#   script that was written twice building Entourage and Employee placing:
#     vv3d_mouse, vv3d_key   Synthetic events through vv3d_eval passed while a real drag failed:
#                            the install card ate the hover, a throttle dropped the last move, and
#                            OrbitControls threw on a right press that no real mouse would send.
#     vv3d_click             Clicks like a person: refuses, naming what is on top, when it is covered.
#     vv3d_ui_read           Reading ids missed three tabs overflowing a panel. It says what shows, and
#                            what is clipped or scrolls sideways.
#     vv3d_world_to_screen   Every real click on the model needed this sum.
#     vv3d_level_walk        Who sees which row, and who fetched which file, at every level.
#     vv3d_api_call          One request as any level, without a sign-in script.
#     vv3d_run_module        A scratch test that imports the app's own instances, with no CORS server.
#     vv3d_shot_compare, vv3d_contact_sheet   Look at several pictures at once, and count what differs.
# - SANDBOX ONLY, as everything that opens the app is. Nothing here signs in on real data.
# - ONE THREAD. All of these run on the tool thread that owns Playwright (Protocol's header), which is
#   why vv3d_level_walk shares the browser and takes a while.
# - PICTURES ARE COMPARED IN THE BROWSER, on a canvas, so there is nothing to install beyond what opening
#   the app already needs.
#
# =============================================================================

import base64
import json
import os
import re
import tempfile
import time
import urllib.parse
from pathlib import Path

import Na__ValeVisionMcp__Server__Core__ as Na__Core
import Na__ValeVisionMcp__Tools__LiveApp__ as Na__LiveApp
from Na__ValeVisionMcp__Server__Core__ import Na__Result__Data, Na__Tool, Na__ToolError

NA_POINT = {'type': 'array', 'items': {'type': 'number'}, 'minItems': 3, 'maxItems': 3}
NA_LEVELS = ['AppAdmin', 'Management', 'Employee', 'Affiliate', 'Client', 'Nobody']
NA_WATCH_DEFAULT = 'Na__Entourage__|Na__Vegetation__|22__System__SceneAssets|AssetsSection__DevControls'
NA_ANSWER_LIMIT = 12000


# -----------------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

def Na__Testing__Client(point_mm):
    """A world point as client pixels: the page's own camera and canvas."""
    return Na__LiveApp.Na__Browser__Call('worldToScreen', point_mm)


def Na__Testing__Where(arguments, x_key, y_key, mm_key):
    """Pixels from x and y, or from a world point. None if neither was given."""
    if arguments.get(mm_key) is not None:
        spot = Na__Testing__Client(arguments[mm_key])
        return spot['x'], spot['y']
    if arguments.get(x_key) is not None and arguments.get(y_key) is not None:
        return float(arguments[x_key]), float(arguments[y_key])
    return None


def Na__Testing__NewProblems(from_index):
    return Na__LiveApp.NA_STATE['errors'][from_index:][:20]


def Na__Testing__Under(page, x, y):
    """What the pointer is really over: what a real press would hit."""
    return page.evaluate("""([x, y]) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        const canvas = el.tagName === 'CANVAS';
        return { tag : el.tagName.toLowerCase(), id : el.id || '', className : String(el.className || '').slice(0, 80), isModel : canvas, cursor : getComputedStyle(el).cursor };
    }""", [x, y])

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | A Real Mouse and Keyboard
# -----------------------------------------------------------------------------

@Na__Tool('vv3d_mouse', 'Use a real mouse on the page',
          'A real pointer, through the browser, not a synthetic event: what a person\'s press would do, listeners, capture and throttles included. Aim with x and y in client pixels, or at_mm for a spot in the model (integer mm, three.js axes). '
          'move, click, right_click, double_click, press (down), release (up), drag (to to_x and to_y, or to_mm, with steps of movement), wheel. Answers with what the pointer ended up over, and any script problem it caused.',
          {'action': {'type': 'string', 'enum': ['move', 'click', 'right_click', 'double_click', 'press', 'release', 'drag', 'wheel']},
           'x': {'type': 'number'}, 'y': {'type': 'number'}, 'at_mm': NA_POINT,
           'to_x': {'type': 'number'}, 'to_y': {'type': 'number'}, 'to_mm': NA_POINT,
           'steps': {'type': 'integer', 'description': 'Moves along the way. Default 8. A throttle only shows with several.'},
           'wheel_y': {'type': 'number', 'description': 'For wheel. Positive scrolls down.'},
           'settle_ms': {'type': 'integer', 'description': 'Wait afterwards. Default 400.'}},
          required=['action'])
def Na__Tool__Mouse(arguments):
    page = Na__LiveApp.Na__Browser__RequirePage()
    action = arguments['action']
    steps = int(arguments.get('steps') or 8)
    seen = len(Na__LiveApp.NA_STATE['errors'])
    where = Na__Testing__Where(arguments, 'x', 'y', 'at_mm')
    if where is None and action not in ('press', 'release', 'wheel'):
        raise Na__ToolError('%s needs somewhere to go.' % action, 'Give x and y, or at_mm.')
    if where is not None:
        page.mouse.move(where[0], where[1], steps=steps if action in ('move', 'drag') else 2)

    if action == 'click':
        page.mouse.click(where[0], where[1])
    elif action == 'right_click':
        page.mouse.click(where[0], where[1], button='right')
    elif action == 'double_click':
        page.mouse.dblclick(where[0], where[1])
    elif action == 'press':
        page.mouse.down()
    elif action == 'release':
        page.mouse.up()
    elif action == 'wheel':
        page.mouse.wheel(0, float(arguments.get('wheel_y') or 100))
    elif action == 'drag':
        target = Na__Testing__Where(arguments, 'to_x', 'to_y', 'to_mm')
        if target is None:
            raise Na__ToolError('drag needs somewhere to end.', 'Give to_x and to_y, or to_mm.')
        page.mouse.down()
        page.mouse.move(target[0], target[1], steps=steps)
        page.wait_for_timeout(80)
        page.mouse.up()
        where = target
    page.wait_for_timeout(int(arguments.get('settle_ms') or 400))
    answer = {'done': action, 'problems': Na__Testing__NewProblems(seen)}
    if where is not None:
        answer['at'] = [round(where[0], 1), round(where[1], 1)]
        answer['over'] = Na__Testing__Under(page, where[0], where[1])
    return Na__Result__Data(answer)


@Na__Tool('vv3d_key', 'Press a key on the page',
          'A real key press or chord, such as Escape, Delete, Control+z or Control+d. Or type_text, a character at a time, into whatever has the focus.',
          {'key': {'type': 'string'}, 'type_text': {'type': 'string'},
           'settle_ms': {'type': 'integer', 'description': 'Default 300.'}})
def Na__Tool__Key(arguments):
    page = Na__LiveApp.Na__Browser__RequirePage()
    if not arguments.get('key') and arguments.get('type_text') is None:
        raise Na__ToolError('Nothing to press.', 'Give key or type_text.')
    seen = len(Na__LiveApp.NA_STATE['errors'])
    if arguments.get('key'):
        page.keyboard.press(arguments['key'])
    if arguments.get('type_text') is not None:
        page.keyboard.type(arguments['type_text'], delay=15)
    page.wait_for_timeout(int(arguments.get('settle_ms') or 300))
    return Na__Result__Data({'done': True, 'problems': Na__Testing__NewProblems(seen)})


@Na__Tool('vv3d_click', 'Click a row or button as a person would',
          'Finds it by CSS selector or by the words on it, scrolls it into view, checks it is really there to press, and presses it with the real mouse. If something covers it or it is hidden, it is refused, naming what is on top: that is the bug a synthetic click hides. '
          'The Tools & Settings menu and a section inside it must be opened first, as a person would: click #naToolsMenu > summary, then e.g. #naVegetationToggle.',
          {'selector': {'type': 'string'}, 'text': {'type': 'string', 'description': 'The words on it, exactly. Used if no selector.'},
           'button': {'type': 'string', 'enum': ['left', 'right']}, 'settle_ms': {'type': 'integer', 'description': 'Default 500.'},
           'timeout_ms': {'type': 'integer', 'description': 'Default 5000.'}})
def Na__Tool__Click(arguments):
    page = Na__LiveApp.Na__Browser__RequirePage()
    if arguments.get('selector'):
        target = page.locator(arguments['selector'])
    elif arguments.get('text'):
        target = page.get_by_text(arguments['text'], exact=True)
    else:
        raise Na__ToolError('Nothing named to click.', 'Give selector or text.')
    found = target.count()
    if found == 0:
        raise Na__ToolError('Nothing on the page matches that.', 'vv3d_ui_read says what shows.')
    if found > 1:
        raise Na__ToolError('%d things match that.' % found, 'Make the selector narrower: only one may be pressed.')
    seen = len(Na__LiveApp.NA_STATE['errors'])
    try:
        target.click(button=arguments.get('button') or 'left', timeout=int(arguments.get('timeout_ms') or 5000))
    except Exception as error:
        lines = [line.strip() for line in str(error).splitlines() if line.strip()]
        reason = next((line for line in lines if 'intercepts pointer events' in line or 'not visible' in line or 'outside of the viewport' in line), lines[0] if lines else 'it could not be pressed')
        raise Na__ToolError('It could not be pressed: %s' % reason[:400], 'A person could not press it either. vv3d_ui_read shows what is on screen.')
    page.wait_for_timeout(int(arguments.get('settle_ms') or 500))
    return Na__Result__Data({'clicked': True, 'problems': Na__Testing__NewProblems(seen)})

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Reading What Is on Screen
# -----------------------------------------------------------------------------

@Na__Tool('vv3d_ui_read', 'What is really on screen',
          'Every visible button, row, input, heading and hint: its words, id, state and box. Clipped lists what is cut off or runs past its panel, and sideways lists a panel that scrolls sideways, which a list of ids never shows. Open panels and any message showing are given too. Leave selector out for the whole page.',
          {'selector': {'type': 'string', 'description': 'Only inside this, such as #naVegetationAssetsPanel.'},
           'include_boxes': {'type': 'boolean', 'description': 'Default false.'}}, read_only=True)
def Na__Tool__UiRead(arguments):
    return Na__Result__Data(Na__LiveApp.Na__Browser__Call('uiRead', arguments.get('selector') or '', arguments.get('include_boxes') is True))


@Na__Tool('vv3d_world_to_screen', 'Where a point in the model is on screen',
          'A spot in the model, integer mm in three.js axes, as client pixels for vv3d_mouse. Says whether it is in view, and what would really be pressed there: a panel or the menu may be on top of the model.',
          {'at_mm': NA_POINT}, required=['at_mm'], read_only=True)
def Na__Tool__WorldToScreen(arguments):
    page = Na__LiveApp.Na__Browser__RequirePage()
    spot = Na__Testing__Client(arguments['at_mm'])
    spot['over'] = Na__Testing__Under(page, spot['x'], spot['y']) if spot.get('inView') else None
    return Na__Result__Data(spot)


@Na__Tool('vv3d_run_module', 'Run a scratch module among the app\'s own',
          'Serves a local .js file to the open page as if it were in 02__Src__AppModules/__McpScratch__/, then imports it and calls its default export with args. Its relative imports (../24__System__Vegetation/...) reach the same instances the app itself uses. For a real test too long for vv3d_eval, with no CORS server. Nothing is written to the app.',
          {'file': {'type': 'string', 'description': 'A path on this PC.'}, 'args': {'description': 'Handed to its default export.'}},
          required=['file'])
def Na__Tool__RunModule(arguments):
    page = Na__LiveApp.Na__Browser__RequirePage()
    path = Path(arguments['file'])
    if not path.is_file():
        raise Na__ToolError('No such file: %s' % path)
    url_tail = '02__Src__AppModules/__McpScratch__/%s_%d.js' % (re.sub(r'[^A-Za-z0-9_]', '_', path.stem), int(time.time() * 1000))
    source = path.read_text(encoding='utf-8')
    seen = len(Na__LiveApp.NA_STATE['errors'])
    pattern = re.compile(re.escape(url_tail) + r'$')
    page.route(pattern, lambda route: route.fulfill(status=200, content_type='text/javascript', body=source))
    try:
        value = page.evaluate("""async ([tail, args]) => {
            const module = await import(new URL(tail, document.baseURI).href);
            if (typeof module.default !== 'function') return { ran : false, exports : Object.keys(module) };
            return { ran : true, value : await module.default(args) };
        }""", [url_tail, arguments.get('args')])
    except Exception as error:
        raise Na__ToolError('It failed: %s' % str(error).splitlines()[0][:800])
    finally:
        page.unroute(pattern)
    return Na__Result__Data({'result': value, 'problems': Na__Testing__NewProblems(seen)})

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Every Level
# -----------------------------------------------------------------------------

def Na__Testing__Browser():
    """The browser, started if no page has started it. Returns (browser, started here)."""
    state = Na__LiveApp.NA_STATE
    if state['browser'] is not None:
        return state['browser'], False
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise Na__ToolError('This needs Playwright.', 'pip install playwright; Edge is its channel msedge.')
    playwright = sync_playwright().start()
    browser = playwright.chromium.launch(channel='msedge', headless=True, args=Na__LiveApp.NA_GPU_ARGS)
    state.update(playwright=playwright, browser=browser)
    return browser, True


def Na__Testing__StopIfOurs(started_here):
    if started_here:
        Na__LiveApp.Na__Browser__Close()


def Na__Testing__MakeLink(browser, base, project, accounts, password):
    staff = browser.new_context()
    try:
        staff.request.post(base + 'api/accounts/login', data={'email': accounts['employee']['Email'], 'password': password})
        answer = staff.request.post(base + 'api/projects/' + urllib.parse.quote(project) + '/shares', data={'label': 'Mcp', 'expiresDays': 1})
        body = answer.json() if answer.status == 200 else {}
        link = body.get('link') or {}
        return body.get('token') or link.get('ValeVision3DShare__Link__Token') or link.get('token')
    finally:
        staff.close()


@Na__Tool('vv3d_level_walk', 'Open a project at every level',
          'Opens a project afresh as each level, each its own new device, and says what that person gets: the sections of Tools & Settings they see, the rows inside the sections named, the files fetched that match watch, failed requests and script errors. The quick way to answer "who sees what", and whether a client fetched something they should not have. Slow: about half a minute a level. A phone is a separate walk.',
          {'project': {'type': 'string'},
           'levels': {'type': 'array', 'items': {'type': 'string', 'enum': NA_LEVELS}, 'description': 'Default every level.'},
           'sections': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Section ids to read inside. Default naVegetationPanel and naEntouragePanel.'},
           'watch': {'type': 'string', 'description': 'A regular expression over fetched addresses. Default the placed-assets systems.'},
           'phone': {'type': 'boolean', 'description': 'A phone-sized touch device.'}},
          required=['project'], read_only=True)
def Na__Tool__LevelWalk(arguments):
    port, status = Na__LiveApp.Na__Sandbox__RequireRunning()
    real = Na__Core.Na__Project__Find(arguments['project'])
    if not Na__Core.Na__Project__RecordPath(Na__LiveApp.Na__Sandbox__LibraryRoot() / real.parent.name / real.name).is_file():
        raise Na__ToolError('%s is not in the sandbox yet.' % real.name, 'Call vv3d_sandbox_load_project.')
    sandbox = status['Sandbox']
    accounts = {account['Level'].lower(): account for account in sandbox['Accounts']}
    base = 'http://localhost:%d%s' % (port, Na__LiveApp.NA_ROUTE)
    watch = re.compile(arguments.get('watch') or NA_WATCH_DEFAULT)
    sections = arguments.get('sections') or ['naVegetationPanel', 'naEntouragePanel']
    browser, started_here = Na__Testing__Browser()
    answer = {}
    try:
        token = Na__Testing__MakeLink(browser, base, real.name, accounts, sandbox['Password'])
        for level in arguments.get('levels') or NA_LEVELS:
            options = dict(Na__LiveApp.Na__Browser__ContextOptions(arguments.get('phone') is True))
            context = browser.new_context(**options)
            fetched, failed, errors = [], [], []
            page = context.new_page()
            page.add_init_script(Na__LiveApp.NA_HIDE_INSTALL_CARD)
            page.on('request', lambda request, into=fetched: into.append(request.url))
            page.on('pageerror', lambda error, into=errors: into.append(str(error)[:300]))
            page.on('response', lambda response, into=failed: into.append('%d %s' % (response.status, response.url[-120:])) if response.status >= 400 else None)
            query = '?project=' + urllib.parse.quote(real.name)
            if level == 'Client':
                query += '&share=' + urllib.parse.quote(token or '')
            elif level != 'Nobody':
                context.request.post(base + 'api/accounts/login', data={'email': accounts[level.lower()]['Email'], 'password': sandbox['Password']})
            page.goto(base + query, wait_until='load', timeout=180000)
            loaded = Na__LiveApp.Na__Browser__WaitLoaded(page)
            page.wait_for_timeout(3500)
            Na__LiveApp.Na__Browser__Helpers(page)
            rows = page.evaluate('async (sections) => await window.Na__VvMcp.menuRows(sections)', sections)
            answer[level] = {
                'loaded': loaded,
                'device': page.evaluate("() => document.documentElement.getAttribute('data-na-device')"),
                'sections': rows,
                'fetchedMatching': sorted({url.rsplit('/', 1)[-1] for url in fetched if watch.search(url)}),
                'failed': [line for line in failed if 'DeployStamp' not in line][:12],
                'scriptErrors': errors[:12]
            }
            context.close()
    finally:
        Na__Testing__StopIfOurs(started_here)
    return Na__Result__Data({'project': real.name, 'levels': answer})


@Na__Tool('vv3d_api_call', 'One request to the sandbox\'s API as any level',
          'The real API on the sandbox, signed in as a fake user at that level, or as a client link, or signed out. path is what follows /api/, and {project} in it becomes the project\'s id. Answers with the status and the body. Sandbox only, and never with a real account.',
          {'method': {'type': 'string', 'enum': ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']},
           'path': {'type': 'string', 'description': 'Such as projects/{project}/scene-assets/working?system=Entourage'},
           'project': {'type': 'string'},
           'as_level': {'type': 'string', 'enum': NA_LEVELS, 'description': 'Default AppAdmin.'},
           'body': {'description': 'JSON for the request.'},
           'keys_only': {'type': 'boolean', 'description': 'Answer with the top-level keys, not the whole body.'}},
          required=['method', 'path'])
def Na__Tool__ApiCall(arguments):
    port, status = Na__LiveApp.Na__Sandbox__RequireRunning()
    sandbox = status['Sandbox']
    accounts = {account['Level'].lower(): account for account in sandbox['Accounts']}
    base = 'http://localhost:%d%s' % (port, Na__LiveApp.NA_ROUTE)
    path = arguments['path'].lstrip('/')
    project = None
    if arguments.get('project'):
        project = Na__Core.Na__Project__Find(arguments['project']).name
        path = path.replace('{project}', urllib.parse.quote(project))
    if '{project}' in path:
        raise Na__ToolError('The path names {project} and no project was given.')
    level = arguments.get('as_level') or 'AppAdmin'
    browser, started_here = Na__Testing__Browser()
    try:
        context = browser.new_context()
        try:
            headers = {}
            if level == 'Client':
                if not project:
                    raise Na__ToolError('A client link is for one project.', 'Give project.')
                headers['X-ValeVision-Share'] = Na__Testing__MakeLink(browser, base, project, accounts, sandbox['Password']) or ''
            elif level != 'Nobody':
                context.request.post(base + 'api/accounts/login', data={'email': accounts[level.lower()]['Email'], 'password': sandbox['Password']})
            options = {'method': arguments['method'], 'headers': headers}
            if 'body' in arguments:
                options['data'] = arguments['body']
            answer = context.request.fetch(base + 'api/' + path, **options)
            text = answer.text()
            try:
                value = json.loads(text)
            except ValueError:
                value = text[:2000]
            if arguments.get('keys_only') and isinstance(value, dict):
                value = sorted(value)
            shown = json.dumps(value, ensure_ascii=False)
            truncated = len(shown) > NA_ANSWER_LIMIT
            return Na__Result__Data({'status': answer.status, 'asLevel': level, 'body': value if not truncated else shown[:NA_ANSWER_LIMIT] + '...', 'truncated': truncated})
        finally:
            context.close()
    finally:
        Na__Testing__StopIfOurs(started_here)

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Looking at Pictures
# -----------------------------------------------------------------------------

NA_COMPARE_PAGE = """async ([a, b, labelA, labelB, threshold]) => {
    const load = (data) => new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('a picture would not read')); i.src = 'data:image/png;base64,' + data; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
    const read = (image) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently : true }); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(image, 0, 0); return x.getImageData(0, 0, w, h); };
    const pa = read(ia), pb = read(ib);
    const diff = new ImageData(w, h);
    let count = 0, minX = w, minY = h, maxX = -1, maxY = -1;
    for (let i = 0, p = 0; i < pa.data.length; i += 4, p++) {
        const d = Math.abs(pa.data[i] - pb.data[i]) + Math.abs(pa.data[i + 1] - pb.data[i + 1]) + Math.abs(pa.data[i + 2] - pb.data[i + 2]);
        const on = d > threshold;
        if (on) { count++; const x = p % w, y = Math.floor(p / w); if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
        diff.data[i] = on ? 214 : 250; diff.data[i + 1] = on ? 40 : 250; diff.data[i + 2] = on ? 40 : 250; diff.data[i + 3] = 255;
    }
    const scale = Math.min(1, 900 / w), tw = Math.round(w * scale), th = Math.round(h * scale), head = 26, gap = 8;
    const out = document.createElement('canvas');
    out.width = tw * 3 + gap * 2; out.height = th + head;
    const x = out.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, out.width, out.height);
    x.fillStyle = '#172b3a'; x.font = '600 15px sans-serif';
    [labelA, labelB, 'What differs: ' + count + ' pixels'].forEach((text, n) => x.fillText(text, 4 + n * (tw + gap), 18));
    x.drawImage(ia, 0, head, tw, th);
    x.drawImage(ib, tw + gap, head, tw, th);
    const holder = document.createElement('canvas'); holder.width = w; holder.height = h; holder.getContext('2d').putImageData(diff, 0, 0);
    x.drawImage(holder, (tw + gap) * 2, head, tw, th);
    return { width : w, height : h, sameSize : ia.width === ib.width && ia.height === ib.height, differingPixels : count, share : count / (w * h), box : maxX >= 0 ? [minX, minY, maxX, maxY] : null, png : out.toDataURL('image/png').split(',')[1] };
}"""

NA_SHEET_PAGE = """async ([items, columns, cellWidth]) => {
    const load = (data) => new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('a picture would not read')); i.src = 'data:image/png;base64,' + data; });
    const images = await Promise.all(items.map((item) => load(item.data)));
    const cells = images.map((image) => ({ w : cellWidth, h : Math.round((image.height / image.width) * cellWidth) }));
    const rows = Math.ceil(images.length / columns), head = 24, gap = 10;
    const heights = []; for (let r = 0; r < rows; r++) heights.push(Math.max(...cells.slice(r * columns, (r + 1) * columns).map((c) => c.h)));
    const out = document.createElement('canvas');
    out.width = columns * cellWidth + (columns + 1) * gap;
    out.height = heights.reduce((sum, h) => sum + h + head + gap, gap);
    const x = out.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, out.width, out.height);
    x.font = '600 14px sans-serif';
    let y = gap;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            const n = r * columns + c;
            if (n >= images.length) break;
            const left = gap + c * (cellWidth + gap);
            x.fillStyle = '#172b3a';
            x.fillText(items[n].label.slice(0, 60), left, y + 16);
            x.drawImage(images[n], left, y + head, cells[n].w, cells[n].h);
        }
        y += heights[r] + head + gap;
    }
    return { width : out.width, height : out.height, png : out.toDataURL('image/png').split(',')[1] };
}"""


def Na__Pictures__Read(path):
    source = Path(path)
    if not source.is_file():
        raise Na__ToolError('No such picture: %s' % source)
    return base64.b64encode(source.read_bytes()).decode('ascii')


def Na__Pictures__OnBlankPage(script, values):
    """Work on pictures in a page of their own, leaving the app's page alone."""
    browser, started_here = Na__Testing__Browser()
    try:
        context = browser.new_context()
        try:
            page = context.new_page()
            page.goto('about:blank')
            return page.evaluate(script, values)
        finally:
            context.close()
    finally:
        Na__Testing__StopIfOurs(started_here)


def Na__Pictures__Save(png, path, stem):
    out = path or os.path.join(tempfile.gettempdir(), '%s_%d.png' % (stem, int(time.time() * 1000)))
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, 'wb') as handle:
        handle.write(base64.b64decode(png))
    return out


@Na__Tool('vv3d_shot_compare', 'Compare two pictures',
          'Two PNGs side by side, with a third picture of what differs in red, how many pixels differ and the box round them. The way to prove a change altered what it should and nothing else: take a picture, change something, take another. Needs no page open.',
          {'a': {'type': 'string', 'description': 'A path on this PC.'}, 'b': {'type': 'string'},
           'label_a': {'type': 'string'}, 'label_b': {'type': 'string'},
           'threshold': {'type': 'integer', 'description': 'How far a pixel may differ, across the three channels. Default 24.'},
           'path': {'type': 'string', 'description': 'Where to save the montage. Default the temp folder.'},
           'return_image': {'type': 'boolean', 'description': 'Default true.'}},
          required=['a', 'b'], read_only=True)
def Na__Tool__ShotCompare(arguments):
    result = Na__Pictures__OnBlankPage(NA_COMPARE_PAGE, [Na__Pictures__Read(arguments['a']), Na__Pictures__Read(arguments['b']),
                                                         arguments.get('label_a') or Path(arguments['a']).stem[:50],
                                                         arguments.get('label_b') or Path(arguments['b']).stem[:50],
                                                         int(arguments.get('threshold') if arguments.get('threshold') is not None else 24)])
    png = result.pop('png')
    result['path'] = Na__Pictures__Save(png, arguments.get('path'), 'na_vv3d_compare')
    return Na__Result__Data(result, images=[png] if arguments.get('return_image') is not False else None)


@Na__Tool('vv3d_contact_sheet', 'Several pictures on one sheet',
          'PNGs laid out in a labelled grid and returned as one picture, so several can be looked at for the price of one. Needs no page open.',
          {'pictures': {'type': 'array', 'minItems': 1, 'maxItems': 40,
                        'items': {'type': 'object', 'properties': {'path': {'type': 'string'}, 'label': {'type': 'string'}}, 'required': ['path']}},
           'columns': {'type': 'integer', 'description': 'Default 3.'},
           'cell_width': {'type': 'integer', 'description': 'Pixels. Default 480.'},
           'path': {'type': 'string', 'description': 'Where to save it. Default the temp folder.'},
           'return_image': {'type': 'boolean', 'description': 'Default true.'}},
          required=['pictures'], read_only=True)
def Na__Tool__ContactSheet(arguments):
    items = [{'data': Na__Pictures__Read(row['path']), 'label': row.get('label') or Path(row['path']).stem} for row in arguments['pictures']]
    result = Na__Pictures__OnBlankPage(NA_SHEET_PAGE, [items, int(arguments.get('columns') or 3), int(arguments.get('cell_width') or 480)])
    png = result.pop('png')
    result['path'] = Na__Pictures__Save(png, arguments.get('path'), 'na_vv3d_sheet')
    return Na__Result__Data(result, images=[png] if arguments.get('return_image') is not False else None)

# endregion -------------------------------------------------------------------

# =============================================================================
# END OF FILE
# =============================================================================
