# =============================================================================
# VALEVISION 3D MCP - TOOLS - WHO PLACED WHAT
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__Tools__SceneAssets__.py
# PURPOSE    : Read who has changed which people and plants on a project and what is waiting
#              for an admin, and on the sandbox approve it or put it back
# CREATED    : 05-Nov-2026
#
# DESCRIPTION:
# - Adam, 05-Nov-2026: "a system and way of tracking ownership of those assets and changes, so who
#   inserted what etc". Staff's changes wait beside the record, in the changes file, until an admin
#   approves them: the API's ValeVision3D__Api__SceneAssets__Logic__.py says how.
# - APPROVING AND PUTTING BACK HAPPEN ONLY ON THE SANDBOX, through the real API as a fake user. On real
#   data it reads and no more: an approval shows a client somebody's work, so it is a person's act,
#   in the app. Everything else about a real record is the skill's to decide.
# - THE SAME SUMS AS THE API, loaded from its own file, so there is no copy to keep in step.
#
# =============================================================================

import json

import Na__ValeVisionMcp__Server__Core__ as Na__Core
import Na__ValeVisionMcp__Tools__LiveApp__ as Na__LiveApp
from Na__ValeVisionMcp__Server__Core__ import Na__Result__Data, Na__Tool, Na__ToolError


@Na__Tool('vv3d_scene_changes', 'Who placed what, and what is waiting',
          'Reads a project\'s changes file: by person, what each has added, changed or deleted, what is waiting for an admin, who owns each item, and the history. Sandbox or real. approve and revert run on the sandbox only, through the real API at the level asked, so a refusal is the server\'s own.',
          {'project': {'type': 'string'},
           'system': {'type': 'string', 'enum': ['Entourage', 'Vegetation'], 'description': 'Default both.'},
           'target': {'type': 'string', 'enum': ['sandbox', 'real'], 'description': 'Default sandbox.'},
           'action': {'type': 'string', 'enum': ['read', 'approve', 'revert'], 'description': 'Default read.'},
           'as_level': {'type': 'string', 'enum': ['AppAdmin', 'Management', 'Employee'], 'description': 'For approve or revert. Default AppAdmin.'},
           'of': {'type': 'string', 'description': 'A person\'s user code: whose to approve or put back. Default everyone\'s for approve, your own for revert.'},
           'include_history': {'type': 'boolean', 'description': 'Default false.'}},
          required=['project'])
def Na__Tool__SceneChanges(arguments):
    target = arguments.get('target') or 'sandbox'
    action = arguments.get('action') or 'read'
    folder, path = Na__LiveApp.Na__Record__Locate(arguments['project'], target)
    if action != 'read':
        if target != 'sandbox':
            raise Na__ToolError('Approving and putting back on real data is a person\'s, in the app.', 'Use target sandbox to try it. On a real project ask the person.')
        if not arguments.get('system'):
            raise Na__ToolError('%s is for one system at a time.' % action, 'Give system.')
        return Na__SceneChanges__Act(arguments, action, folder.name)

    logic = Na__Core.Na__SceneAssets__Logic()
    changes = Na__Core.Na__SceneAssets__ReadChanges(folder)
    record = Na__Core.Na__Project__Read(path)
    answer = {'project': folder.name, 'target': target, 'changesFile': str(Na__Core.Na__SceneAssets__ChangesPath(folder))}
    for system in ([arguments['system']] if arguments.get('system') else ['Entourage', 'Vegetation']):
        summary = logic.na_summary(system, json.loads(json.dumps(changes)))
        people = [{'code': row['Code'], 'name': row['Name'], 'changes': len(row['Items']), 'waiting': row['Waiting'],
                   'items': [{'key': item['Key'], 'action': item['Action'], 'what': item['What'], 'waiting': item['Waiting']} for item in row['Items'][:60]]}
                  for row in summary['People']]
        block = {'waiting': summary['Waiting'], 'people': people, 'owners': len(summary['Owners']),
                 'approvedInRecord': logic.NA_SYSTEMS[system]['Key'] in record}
        if arguments.get('include_history'):
            block['history'] = summary['History']
        answer[system] = block
    return Na__Result__Data(answer)


def Na__SceneChanges__Act(arguments, action, project):
    """Through the real API on the sandbox, as a fake user: the server's rules, and its refusals."""
    import Na__ValeVisionMcp__Tools__Testing__ as Na__Testing
    body = {'system': arguments['system']}
    if arguments.get('of'):
        body['by' if action == 'approve' else 'of'] = arguments['of']
    return Na__Testing.Na__Tool__ApiCall({'method': 'POST', 'path': 'projects/{project}/scene-assets/' + action, 'project': project,
                                          'as_level': arguments.get('as_level') or 'AppAdmin', 'body': body})

# =============================================================================
# END OF FILE
# =============================================================================
