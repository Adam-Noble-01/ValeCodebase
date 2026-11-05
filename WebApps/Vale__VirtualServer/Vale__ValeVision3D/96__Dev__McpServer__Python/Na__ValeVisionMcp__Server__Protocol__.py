# =============================================================================
# VALEVISION 3D MCP - PYTHON SERVER - MCP PROTOCOL
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__Server__Protocol__.py
# PURPOSE    : Model Context Protocol over stdio (JSON-RPC 2.0, one message per
#              line), serving both protocol eras from one process
# CREATED    : 04-Nov-2026
#
# DESCRIPTION:
# - THE SAME TWO ERAS AS THE NA SKETCHUP MCP (Na__SketchUpMcp__Server__Protocol__.py).
#   Legacy clients send initialize; modern ones ask server/discover and put the version in
#   each request's _meta. Both simply work.
# - TOOLS RUN ONE AT A TIME, ON ONE THREAD. Playwright's sync API belongs to the thread that
#   started it, and only one job may ever talk to the server. The reader loop stays free, so
#   ping and cancellation are answered while a tool runs. A cancelled call's late result is
#   dropped, as the spec asks.
# - ERRORS. An unknown tool or bad arguments is -32602. A tool saying no is an isError result,
#   in words, so the agent can read it and change the call.
#
# =============================================================================

import concurrent.futures
import json
import time

import Na__ValeVisionMcp__Server__Core__ as Na__Core

NA_LEGACY_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']
NA_MODERN_VERSIONS = ['2026-07-28']
NA_META_VERSION_KEY = 'io.modelcontextprotocol/protocolVersion'
NA_SERVER_INFO_KEY = 'io.modelcontextprotocol/serverInfo'
NA_LIST_TTL_MS = 300000


class Na__RpcError(Exception):
    def __init__(self, code, message, data=None):
        super().__init__(message)
        self.na_code = code
        self.na_message = message
        self.na_data = data


# -----------------------------------------------------------------------------
# REGION | Protocol
# -----------------------------------------------------------------------------

class Na__McpProtocol:
    """Dispatches MCP messages to the tool registry."""

    def __init__(self, server_info, instructions, writer, logger):
        self.na_server_info = server_info
        self.na_instructions = instructions
        self.na_write = writer
        self.na_log = logger
        self.na_executor = concurrent.futures.ThreadPoolExecutor(max_workers=1, thread_name_prefix='na-tool')
        self.na_cancelled = set()

    # --- entry points -------------------------------------------------------------

    def Na__McpProtocol__HandleLine(self, line):
        try:
            message = json.loads(line)
        except ValueError:
            self.na_write({'jsonrpc': '2.0', 'id': None, 'error': {'code': -32700, 'message': 'Parse error'}})
            return
        if isinstance(message, list):
            responses = [response for response in (self.na_handle_message(item) for item in message) if response is not None]
            if responses:
                self.na_write(responses)
            return
        response = self.na_handle_message(message)
        if response is not None:
            self.na_write(response)

    def Na__McpProtocol__RunOnToolThread(self, work):
        """Run something on the tool thread and wait: how shutdown closes the browser it owns."""
        return self.na_executor.submit(work).result(timeout=30)

    def Na__McpProtocol__Shutdown(self):
        self.na_executor.shutdown(wait=False, cancel_futures=True)

    # --- dispatch -----------------------------------------------------------------

    def na_handle_message(self, message):
        if not isinstance(message, dict) or message.get('jsonrpc') != '2.0':
            return self.na_error(message.get('id') if isinstance(message, dict) else None, -32600, 'Invalid Request')
        method = message.get('method')
        if method is None:
            return None                                                        # <-- A response to a request this server never sends
        has_id = 'id' in message
        request_id = message.get('id')
        params = message.get('params') if isinstance(message.get('params'), dict) else {}

        try:
            modern = self.na_era(params)
            if method == 'tools/call' and has_id:
                self.na_executor.submit(self.na_run_tool_call, request_id, params, modern)
                return None
            result = self.na_dispatch(method, params)
        except Na__RpcError as error:
            return self.na_error(request_id, error.na_code, error.na_message, error.na_data) if has_id else None
        except Exception as error:                                             # <-- A bug here must not kill the stdio loop
            self.na_log('Unhandled error in %s: %r' % (method, error))
            return self.na_error(request_id, -32603, 'Internal error: %s' % error) if has_id else None

        if not has_id:
            return None
        return {'jsonrpc': '2.0', 'id': request_id, 'result': self.na_decorate(method, result, modern)}

    def na_era(self, params):
        meta = params.get('_meta') if isinstance(params.get('_meta'), dict) else {}
        version = meta.get(NA_META_VERSION_KEY)
        if version is None or version in NA_LEGACY_VERSIONS:
            return False
        if version in NA_MODERN_VERSIONS:
            return True
        raise Na__RpcError(-32022, 'Unsupported protocol version',
                           {'supported': NA_MODERN_VERSIONS + NA_LEGACY_VERSIONS, 'requested': version})

    def na_dispatch(self, method, params):
        if method == 'initialize':
            return self.na_initialize(params)
        if method == 'server/discover':
            return {'supportedVersions': NA_MODERN_VERSIONS, 'capabilities': self.na_capabilities(True), 'instructions': self.na_instructions}
        if method == 'ping' or method == 'logging/setLevel':
            return {}
        if method == 'tools/list':
            return {'tools': [tool['definition'] for tool in Na__Core.NA_TOOLS.values()]}
        if method == 'resources/list':
            return {'resources': []}
        if method == 'resources/templates/list':
            return {'resourceTemplates': []}
        if method == 'prompts/list':
            return {'prompts': []}
        if method == 'notifications/cancelled':
            self.na_cancelled.add(str(params.get('requestId')))
            return None
        if method.startswith('notifications/'):
            return None
        raise Na__RpcError(-32601, 'Method not found')

    # --- lifecycle ------------------------------------------------------------------

    def na_capabilities(self, modern):
        return {'tools': {} if modern else {'listChanged': False}}

    def na_initialize(self, params):
        requested = params.get('protocolVersion')
        version = requested if requested in NA_LEGACY_VERSIONS else NA_LEGACY_VERSIONS[0]
        client = params.get('clientInfo') or {}
        self.na_log('initialize: client %s %s asked %s, using %s' % (client.get('name'), client.get('version'), requested, version))
        return {'protocolVersion': version, 'capabilities': self.na_capabilities(False), 'serverInfo': self.na_server_info,
                'instructions': self.na_instructions}

    def na_decorate(self, method, result, modern):
        if not modern or not isinstance(result, dict):
            return result
        result = dict(result)
        result['resultType'] = 'complete'
        meta = dict(result.get('_meta') or {})
        meta[NA_SERVER_INFO_KEY] = self.na_server_info
        result['_meta'] = meta
        if method in ('server/discover', 'tools/list'):
            result.update({'ttlMs': NA_LIST_TTL_MS, 'cacheScope': 'public'})
        return result

    # --- tools/call on the one worker thread -------------------------------------------

    def na_run_tool_call(self, request_id, params, modern):
        started = time.time()
        name = params.get('name', '')
        tool = Na__Core.NA_TOOLS.get(name)
        if tool is None:
            self.na_write(self.na_error(request_id, -32602, 'Unknown tool: %s' % name, {'available': sorted(Na__Core.NA_TOOLS)}))
            return
        arguments = params.get('arguments') or {}
        try:
            Na__Core.Na__Tool__CheckArguments(tool['definition'], arguments)
            result = tool['handler'](arguments)
        except Na__Core.Na__ToolError as error:
            result = Na__Core.Na__Result__Error(error.na_message, error.na_hint)
        except Exception as error:                                             # <-- Report it, never crash the server
            self.na_log('Tool %s failed unexpectedly: %r' % (name, error))
            result = Na__Core.Na__Result__Error('%s hit an unexpected error: %s' % (name, error),
                                                'Read the message: it is usually a page that has gone or a value of the wrong type. If it repeats, restart the MCP server.')
        if str(request_id) in self.na_cancelled:
            self.na_cancelled.discard(str(request_id))
            self.na_log('Dropped the result of cancelled request %s (%s)' % (request_id, name))
            return
        self.na_log('%s done in %.0f ms' % (name, (time.time() - started) * 1000.0))
        self.na_write({'jsonrpc': '2.0', 'id': request_id, 'result': self.na_decorate('tools/call', result, modern)})

    # --- helpers -----------------------------------------------------------------------------

    def na_error(self, request_id, code, message, data=None):
        error = {'code': code, 'message': message}
        if data is not None:
            error['data'] = data
        return {'jsonrpc': '2.0', 'id': request_id, 'error': error}

# endregion -------------------------------------------------------------------

# =============================================================================
# END OF FILE
# =============================================================================
