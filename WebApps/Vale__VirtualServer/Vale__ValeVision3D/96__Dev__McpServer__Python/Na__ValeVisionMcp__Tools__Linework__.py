# =============================================================================
# VALEVISION 3D MCP - TOOLS - WHAT A MODEL'S LINEWORK HOLDS
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__Tools__Linework__.py
# PURPOSE    : Say, with no browser, which of a project's lines the linework density test
#              would call ornament: where they are, what holds them, and how near the rest
#              of the building comes to being called the same
# CREATED    : 10-Nov-2026
#
# DESCRIPTION:
# - Written for the linework density tests (10-Nov-2026). A threshold that suits the model in
#   front of you says nothing of the other hundred, and opening each in a browser is a day.
#     vv3d_linework_survey   Runs Na__ValeVisionMcp__LineworkSurvey__.mjs in Node over one
#                            project, or over every project whose id holds some text. It reads
#                            the linework GLBs straight from the PC's library and uses the
#                            test's own sums (80__Testing__LocalTestServer, the Core file), so
#                            what it says is what the test draws.
# - READS ONLY. Nothing is opened, saved or sent, and the real library is only read.
# - TWO WAYS OF CHOOSING are always reported: "named" (a node whose name says ornament, a
#   companion beside it, the busy pieces within reach) and "busy" (every patch that measures
#   as ornament).
#
# =============================================================================

import json
import subprocess

import Na__ValeVisionMcp__Server__Core__ as Na__Core
from Na__ValeVisionMcp__Server__Core__ import Na__Result__Data, Na__Tool, Na__ToolError

NA_SURVEY_FILE = Na__Core.NA_HERE / 'Na__ValeVisionMcp__LineworkSurvey__.mjs'


# -----------------------------------------------------------------------------
# REGION | The Survey
# -----------------------------------------------------------------------------

def Na__Linework__Short(way, clusters):
    """One way of choosing, cut to what an answer can hold."""
    return {
        'ornamentSegments': way['ornament'],
        'ornamentMetres': way['ornamentMetres'],
        'peak': way['peak'],
        'restReaches': way['runnerUp'],
        'objects': [{'segments': row['segments'], 'centre_mm': row['centreMm'], 'size_mm': row['sizeMm'], 'peak': row['peak'], 'heldBy': row['heldBy'][:6]}
                    for row in way['clusters'][:clusters]],
        'objectsNotShown': max(0, len(way['clusters']) - clusters)
    }


@Na__Tool('vv3d_linework_survey', 'Which lines are ornament',
          'With no browser: reads projects\' linework GLBs from the PC\'s library and says which line segments the linework density test would draw lightly, '
          'as objects with a centre and size in integer mm (three.js axes, Y up) and the GLB nodes that hold them. Two ways of choosing are reported for each file: '
          'named (a node whose name matches seeds, a companion standing beside it, and the busy pieces within reach of them) and busy (every patch that measures as ornament, whatever it is called). '
          'restReaches is how near the rest of the file comes to the threshold. Give project for one, or filter for every project whose id holds that text. Reads only.',
          {'project': {'type': 'string', 'description': 'A library id, such as 60227__Thorpe.'},
           'filter': {'type': 'string', 'description': 'Part of an id, any case. With neither project nor filter, the whole library: about half a minute.'},
           'seeds': {'type': 'string', 'description': 'Names that say ornament, a regular expression. Default Cresting.'},
           'companions': {'type': 'string', 'description': 'Names that are ornament only beside a seed. Default Finial|Spire|Urn.'},
           'exempt': {'type': 'string', 'description': 'Names that are never ornament. Default Note__.'},
           'tone': {'type': 'number', 'description': 'busy: the share of a patch under small shapes that counts as ornament. Default 0.06.'},
           'named_tone': {'type': 'number', 'description': 'named: the same, for a piece beside a named part. Default 0.03.'},
           'objects': {'type': 'integer', 'description': 'Objects listed per file and way. Default 4.'},
           'only_with_ornament': {'type': 'boolean', 'description': 'Leave out projects where nothing is chosen either way. Default true.'}},
          read_only=True)
def Na__Tool__LineworkSurvey(arguments):
    command = ['node', str(NA_SURVEY_FILE), '--json']
    if arguments.get('project'):
        command += ['--project', str(Na__Core.Na__Project__Find(arguments['project']))]
    else:
        command += ['--library', str(Na__Core.NA_LIBRARY_DIR)]
        if arguments.get('filter'):
            command += ['--filter', str(arguments['filter'])]
    for name in ('seeds', 'companions', 'exempt', 'tone', 'named_tone'):
        if arguments.get(name) is not None:
            command += ['--' + name.replace('_', '-'), str(arguments[name])]
    try:
        done = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', timeout=600)
    except FileNotFoundError:
        raise Na__ToolError('The survey needs Node on the path.', 'Install Node 22, as the plant sums use.')
    if done.returncode != 0:
        raise Na__ToolError('The survey failed: %s' % (done.stderr or done.stdout).strip()[:600])
    answer = json.loads(done.stdout)
    clusters = int(arguments.get('objects') or 4)
    keep_all = arguments.get('only_with_ornament') is False
    projects = []
    for result in answer['results']:
        files = []
        for row in result['files']:
            if 'error' in row:
                files.append({'file': row['file'], 'error': row['error']})
                continue
            if not keep_all and row['named']['ornament'] == 0 and row['busy']['ornament'] == 0:
                continue
            files.append({'file': row['file'], 'segments': row['segments'], 'nodesNamedAsOrnament': row['seedNodes'], 'nodesExempt': row['exemptNodes'],
                          'named': Na__Linework__Short(row['named'], clusters), 'busy': Na__Linework__Short(row['busy'], clusters)})
        if files or keep_all:
            projects.append({'project': result['project'], 'ms': result['ms'], 'files': files})
    return Na__Result__Data({'tone': answer['tone'], 'namedTone': answer['namedTone'], 'seeds': answer['seeds'], 'companions': answer['companions'], 'exempt': answer['exempt'],
                             'projectsRead': len(answer['results']), 'projectsShown': len(projects), 'projects': projects})

# endregion -------------------------------------------------------------------

# =============================================================================
# END OF FILE
# =============================================================================
