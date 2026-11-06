# =============================================================================
# VALEVISION 3D MCP - PYTHON SERVER - MAIN (ENTRY POINT)
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__Server__Main__.py
# PURPOSE    : Start the ValeVision 3D MCP server on stdio, so an agent can open, look
#              at, change and publish a project through named tools
# CREATED    : 04-Nov-2026
#
# DESCRIPTION:
# - Adam, 04-Nov-2026: "Create MCP tools to orchestrate and control ValeVision 3D if the tools
#   don't already exist, to allow you to access it."
# - IT FOLLOWS THE NA SKETCHUP MCP: stdio, Python, one file per job, nothing to pip install for
#   the protocol. Playwright is needed only to open the app, and Node only for the plant sums.
#
# WHAT RUNS WHERE:
#   AI client (Claude Code)
#       |  MCP over stdio: this program
#       v
#   Na__ValeVisionMcp__Server__*
#       |-- the PC's project library (the record, through the API's own library module)
#       |-- this server's testing server: the real app and API on a sandbox, fake users
#       |       |-- headless Edge, through Playwright
#       |-- Node: the app's own plant sums
#       `-- the Server Manager's engine: compare, collect, push to the live server
#
# USAGE (the client starts it; registered in ~/.claude.json as "valevision3d"):
#   python Na__ValeVisionMcp__Server__Main__.py [--check]
#   --check   prints the tools and what it can see, then exits
#
# ENVIRONMENT:
#   NA_VV3D_MCP_LOG    1 = log every call to stderr
#
# STDIO RULES: stdout carries only protocol messages (binary, UTF-8, "\n" framed, never a BOM);
# anything printed by mistake goes to stderr instead.
#
# PC ONLY: *.py and 9?__Dev__*/ never sync (the sync map's KindExcludes), so none of this goes
# to the server, and a change here needs no app version or service worker bump.
#
# =============================================================================

import argparse
import json
import os
import sys
import threading

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import Na__ValeVisionMcp__Server__Core__ as Na__Core                     # noqa: E402
import Na__ValeVisionMcp__Server__Protocol__ as Na__Protocol             # noqa: E402
import Na__ValeVisionMcp__Tools__LiveApp__ as Na__LiveApp                # noqa: E402
import Na__ValeVisionMcp__Tools__Project__                               # noqa: E402,F401  (registers its tools)
import Na__ValeVisionMcp__Tools__Vegetation__                            # noqa: E402,F401
import Na__ValeVisionMcp__Tools__Entourage__                             # noqa: E402,F401
import Na__ValeVisionMcp__Tools__Server__                                # noqa: E402,F401
import Na__ValeVisionMcp__Tools__Testing__                               # noqa: E402,F401
import Na__ValeVisionMcp__Tools__SceneAssets__                           # noqa: E402,F401
import Na__ValeVisionMcp__Tools__Workshop__                              # noqa: E402,F401

NA_SERVER_VERSION = '1.2.0'
NA_SERVER_INFO = {'name': 'valevision3d', 'title': 'ValeVision 3D MCP', 'version': NA_SERVER_VERSION,
                  'description': 'Open, look at, change and publish ValeVision 3D projects.'}
NA_INSTRUCTIONS = (
    'ValeVision 3D, Vale Garden Houses\' project viewer. Start with vv3d_status. Lengths are integer mm in three.js axes, Y up. A project is its library folder name, such as 64616__Garnett.\n'
    'Two places a record can be. sandbox: this server\'s own copy on its testing server, fake users, anything may be tried. real: the PC\'s mirror, which a push sends to the live server.\n'
    'To look: vv3d_sandbox_start, vv3d_sandbox_load_project, vv3d_open, vv3d_view, vv3d_screenshot. Software rendering takes a while: a project opens in about a minute.\n'
    'To change planting: vv3d_vegetation_get reads it as the app will draw it, vv3d_vegetation_edit changes it. Try it on the sandbox, reopen and look, then make it real.\n'
    'People work the same way: vv3d_entourage_get and vv3d_entourage_edit, and vv3d_entourage_import_skp brings new figures into the library from SketchUp.\n'
    'To test as a person would: vv3d_click and vv3d_mouse press for real, vv3d_ui_read says what is on screen and what is clipped, vv3d_level_walk says what every level gets. vv3d_scene_changes says who placed what and what waits for an admin.\n'
    'Building: vv3d_check after an edit, vv3d_consumers before changing a name another program may read, vv3d_reload_tools after writing a tool.\n'
    'To publish, only when the person has asked: vv3d_server_collect_project first (someone may have saved on the live server), the change with confirm_real_data, then vv3d_server_push_project with dry_run false.\n'
    'Never sign in on real data, never touch ports 8020, 8030, 8031 or 8032, and no tool here deletes on the server or forces a push. A gateway refusal is final for now: tell the person, do not retry. '
    'Load the vgh-valevision3d skill for how the app works, and vgh-app-server for anything these tools refuse.'
)


# -----------------------------------------------------------------------------
# REGION | Stdio Plumbing
# -----------------------------------------------------------------------------

def Na__Main__MakeWriter(binary_stdout):
    lock = threading.Lock()

    def na_write(message):
        data = (json.dumps(message, ensure_ascii=True, separators=(',', ':')) + '\n').encode('utf-8')
        with lock:
            binary_stdout.write(data)
            binary_stdout.flush()

    return na_write


def Na__Main__MakeLogger(verbose):
    def na_log(text):
        if verbose:
            sys.stderr.write('[valevision3d-mcp] %s\n' % text)
            sys.stderr.flush()

    return na_log

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Check Mode (a quick look from a terminal)
# -----------------------------------------------------------------------------

def Na__Main__Check():
    print('ValeVision 3D MCP %s: %d tools' % (NA_SERVER_VERSION, len(Na__Core.NA_TOOLS)))
    for name, tool in Na__Core.NA_TOOLS.items():
        print('  %-30s %s' % (name, tool['definition']['title']))
    print('App version: %s at %s' % (Na__Core.Na__App__Version(), Na__Core.NA_APP_DIR))
    print('Projects in the library: %d' % len(Na__Core.Na__Project__Folders()))
    try:
        import playwright                                                      # noqa: F401
        print('Playwright: found')
    except ImportError:
        print('Playwright: NOT found, so vv3d_open cannot run')
    code, text, _report = Na__Core.Na__Engine__Run(['check'], timeout_s=30)
    print('Gateway (%s):\n%s' % ('ready' if code == 0 else 'exit %d' % code, text))
    return 0

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Main Loop
# -----------------------------------------------------------------------------

def na_main():
    parser = argparse.ArgumentParser(description='ValeVision 3D MCP server (stdio).')
    parser.add_argument('--check', action='store_true', help='Print the tools and what it can see, then exit.')
    arguments = parser.parse_args()
    if arguments.check:
        return Na__Main__Check()

    binary_stdout = sys.stdout.buffer
    sys.stdout = sys.stderr                                                    # <-- A stray print() must never corrupt the protocol stream
    logger = Na__Main__MakeLogger(os.environ.get('NA_VV3D_MCP_LOG') == '1')
    protocol = Na__Protocol.Na__McpProtocol(NA_SERVER_INFO, NA_INSTRUCTIONS, Na__Main__MakeWriter(binary_stdout), logger)
    Na__Core.NA_NOTIFY_TOOLS_CHANGED = protocol.Na__McpProtocol__NotifyToolsChanged

    logger('Started (%d tools). Waiting for the client on stdin.' % len(Na__Core.NA_TOOLS))
    try:
        for raw_line in sys.stdin.buffer:
            line = raw_line.decode('utf-8', errors='replace').lstrip('﻿').strip()
            if line:
                protocol.Na__McpProtocol__HandleLine(line)
    except KeyboardInterrupt:
        pass
    finally:
        try:
            protocol.Na__McpProtocol__RunOnToolThread(Na__LiveApp.Na__Browser__Close)    # <-- On the thread that owns the browser
        except Exception:                                                      # <-- A call still running: the process is going anyway
            pass
        process = Na__LiveApp.NA_STATE['server']
        if process is not None and process.poll() is None:
            process.terminate()
        protocol.Na__McpProtocol__Shutdown()
        logger('stdin closed; exiting.')
    return 0


if __name__ == '__main__':
    sys.exit(na_main())

# =============================================================================
# END OF FILE
# =============================================================================
