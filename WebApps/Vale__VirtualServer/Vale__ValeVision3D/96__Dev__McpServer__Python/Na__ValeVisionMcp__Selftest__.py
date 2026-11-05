# =============================================================================
# VALEVISION 3D MCP - SELF TEST
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__Selftest__.py
# PURPOSE    : Start the server on stdio and check the protocol and every refusal
# CREATED    : 04-Nov-2026
#
# DESCRIPTION:
# - TOUCHES NO REAL DATA AND NO SERVER. Everything it asks to write is refused before any
#   write, and that refusal is what it checks. A check that a refusal is still there is the
#   point: these are what stand between a slip and the live server.
# - Reads the library, so it needs this PC's mirror. Opens no browser and no ssh, but for
#   one engine check with no connection.
#
# USAGE: python Na__ValeVisionMcp__Selftest__.py     Exit 0 when every check passes.
#
# =============================================================================

import json
import os
import subprocess
import sys

NA_MAIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Na__ValeVisionMcp__Server__Main__.py')
NA_RESULTS = []


def Na__Check(label, passed, detail=''):
    NA_RESULTS.append(passed)
    print('%-4s %s%s' % ('ok' if passed else 'FAIL', label, ('   ' + str(detail)[:200]) if (detail and not passed) else ''))


class Na__Client:
    def __init__(self):
        environment = dict(os.environ, PYTHONUTF8='1')
        self.process = subprocess.Popen([sys.executable, '-B', NA_MAIN], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, env=environment)
        self.next_id = 0

    def request(self, method, params=None):
        self.next_id += 1
        self.process.stdin.write((json.dumps({'jsonrpc': '2.0', 'id': self.next_id, 'method': method, 'params': params or {}}) + '\n').encode('utf-8'))
        self.process.stdin.flush()
        while True:
            message = json.loads(self.process.stdout.readline())
            if message.get('id') == self.next_id:
                return message

    def tool(self, name, arguments=None):
        return self.request('tools/call', {'name': name, 'arguments': arguments or {}})

    def close(self):
        self.process.stdin.close()
        self.process.wait(timeout=30)


def Na__Refused(answer):
    result = answer.get('result') or {}
    return result.get('isError') is True, (result.get('content') or [{}])[0].get('text', '')


def na_main():
    client = Na__Client()

    # THE PROTOCOL
    answer = client.request('initialize', {'protocolVersion': '2025-06-18', 'capabilities': {}, 'clientInfo': {'name': 'selftest', 'version': '1'}})['result']
    Na__Check('initialize answers the version asked', answer['protocolVersion'] == '2025-06-18')
    Na__Check('initialize names the server', answer['serverInfo']['name'] == 'valevision3d')
    Na__Check('initialize carries instructions', 'vv3d_status' in answer['instructions'])
    Na__Check('an unknown version gets the newest legacy one',
              client.request('initialize', {'protocolVersion': '1999-01-01'})['result']['protocolVersion'] == '2025-11-25')
    Na__Check('ping', client.request('ping').get('result') == {})
    Na__Check('an unknown method is -32601', client.request('no/such')['error']['code'] == -32601)
    Na__Check('server/discover', '2026-07-28' in client.request('server/discover')['result']['supportedVersions'])
    modern = client.request('tools/list', {'_meta': {'io.modelcontextprotocol/protocolVersion': '2026-07-28'}})['result']
    Na__Check('a modern request is marked complete', modern.get('resultType') == 'complete')
    Na__Check('an unsupported modern version is -32022',
              client.request('tools/list', {'_meta': {'io.modelcontextprotocol/protocolVersion': '1999-01-01'}})['error']['code'] == -32022)

    tools = client.request('tools/list')['result']['tools']
    names = {tool['name'] for tool in tools}
    Na__Check('every tool is named vv3d_', all(name.startswith('vv3d_') for name in names), names)
    Na__Check('every tool says what it does', all(len(tool['description']) > 20 for tool in tools))
    Na__Check('every required argument is in its schema',
              all(set(tool['inputSchema']['required']) <= set(tool['inputSchema']['properties']) for tool in tools))
    Na__Check('an unknown tool is -32602', client.tool('vv3d_nothing')['error']['code'] == -32602)

    # READING
    listed = json.loads(client.tool('vv3d_project_list', {'limit': 3})['result']['content'][0]['text'])
    Na__Check('the library lists projects', listed['count'] > 0)
    assets = json.loads(client.tool('vv3d_vegetation_library')['result']['content'][0]['text'])['assets']
    Na__Check('the plant library lists assets with sizes', len(assets) > 0 and all(row['measuresMm']['height'] for row in assets))

    # THE REFUSALS
    refused, _text = Na__Refused(client.tool('vv3d_project_list', {'nonsense': 1}))
    Na__Check('an unknown argument is refused', refused)
    refused, _text = Na__Refused(client.tool('vv3d_project_get', {}))
    Na__Check('a missing argument is refused', refused)
    refused, text = Na__Refused(client.tool('vv3d_project_get', {'project': '../../etc'}))
    Na__Check('a path is not a project', refused and 'not a project id' in text, text)
    refused, _text = Na__Refused(client.tool('vv3d_project_get', {'project': 'NoSuchProject__Anywhere'}))
    Na__Check('an unknown project is refused', refused)
    for port in (8020, 8030, 8031, 8032):
        refused, text = Na__Refused(client.tool('vv3d_sandbox_start', {'port': port}))
        Na__Check('port %d is refused' % port, refused and 'Agents run only their own copy' in text, text)
    project = listed['projects'][0]['id']
    refused, text = Na__Refused(client.tool('vv3d_vegetation_edit', {'project': project, 'target': 'real', 'transparency_percent': 1}))
    Na__Check('a real edit without confirm_real_data is refused', refused and 'confirm_real_data' in text, text)
    refused, text = Na__Refused(client.tool('vv3d_promote_to_real', {'project': project}))
    Na__Check('a promote without confirm_real_data is refused', refused and 'confirm_real_data' in text, text)
    for name, arguments in (('vv3d_screenshot', {}), ('vv3d_view', {}), ('vv3d_eval', {'expression': '1'}), ('vv3d_probe_surface', {'spots_xz_mm': [[0, 0]]})):
        refused, text = Na__Refused(client.tool(name, arguments))
        Na__Check('%s with no page is refused' % name, refused and 'vv3d_open' in text, text)
    refused, text = Na__Refused(client.tool('vv3d_open', {'project': project}))
    Na__Check('opening with no testing server is refused', refused and 'vv3d_sandbox_start' in text, text)
    client.close()

    failed = NA_RESULTS.count(False)
    print('\n%d checks, %d failed.' % (len(NA_RESULTS), failed))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(na_main())

# =============================================================================
# END OF FILE
# =============================================================================
