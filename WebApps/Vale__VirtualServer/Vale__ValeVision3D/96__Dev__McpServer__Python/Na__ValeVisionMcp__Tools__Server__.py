# =============================================================================
# VALEVISION 3D MCP - TOOLS - THE LIVE SERVER
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__Tools__Server__.py
# PURPOSE    : Say what would move, bring a project down, and send a project's record or
#              the app up, through the Server Manager's engine and nothing else
# CREATED    : 04-Nov-2026
#
# DESCRIPTION:
# - THE ENGINE IS THE GATEWAY (vgh-app-server skill): its lock, pacing, cooldown and session log
#   cover this server too. A refusal from it is final for now: say so, do not retry.
# - THESE NEVER DELETE AND NEVER FORCE. A plan holding a delete, or a server copy newer than the
#   PC's, is refused here in words, because those take the person's own word (the skill's
#   Ask Adam First). The flags are not passed by any tool.
# - EVERY PUSH LOOKS FIRST. dry_run is the default and says what would move: dry_run false is
#   the push, and it compares again immediately before it, because the list is what matters.
# - AN API PUSH IS NOT HERE. It needs a service restart and goes through the skill's own steps.
#
# =============================================================================

import Na__ValeVisionMcp__Server__Core__ as Na__Core
from Na__ValeVisionMcp__Server__Core__ import Na__Result__Data, Na__Tool, Na__ToolError


# -----------------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

def Na__Server__Compare(mapping, scope=None):
    arguments = ['compare', mapping] + (['--scope', scope] if scope else [])
    code, text, report = Na__Core.Na__Engine__Run(arguments, timeout_s=240)
    if code != 0 or not report or not report.get('ok'):
        raise Na__ToolError('The engine could not compare %s: %s' % (mapping, (report or {}).get('error') or text[-500:]),
                            'A gateway refusal is not retried: read it and tell the person.')
    return report['plans'][mapping]


def Na__Server__PlanOf(plan):
    counts = {name: value for name, value in plan['counts'].items() if value}
    files = {}
    for name, rows in (plan.get('files') or {}).items():
        names = [row if isinstance(row, str) else (row.get('rel') or row.get('path') or str(row)) for row in rows]
        if names:
            files[name] = names[:60] + (['... and %d more' % (len(names) - 60)] if len(names) > 60 else [])
    return {'counts': counts, 'pushMb': round(plan.get('push_bytes', 0) / 1048576, 2), 'collectMb': round(plan.get('collect_bytes', 0) / 1048576, 2), 'files': files}


def Na__Server__RefuseUnsafe(plan, what):
    counts = plan['counts']
    if counts.get('code_delete') or counts.get('content_prune'):
        raise Na__ToolError('Pushing %s would delete files on the server.' % what,
                            'A delete takes the person\'s own word and the Server Manager or the vgh-app-server skill\'s steps. Nothing was sent.')
    if counts.get('shared_collect'):
        raise Na__ToolError('The server\'s copy of %s is newer than this PC\'s, and a push would be refused or lose it.' % what,
                            'Call vv3d_server_collect_project, make the change on top of it, then push. Nothing was sent.')

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Tools
# -----------------------------------------------------------------------------

@Na__Tool('vv3d_server_compare', 'What would move',
          'Compares this PC with the live server, for one project, for the app, or for its API. Opens one ssh session through the engine.',
          {'what': {'type': 'string', 'enum': ['project', 'app', 'api']}, 'project': {'type': 'string'}},
          required=['what'], read_only=True)
def Na__Tool__ServerCompare(arguments):
    what = arguments['what']
    if what == 'project':
        if not arguments.get('project'):
            raise Na__ToolError('Which project?')
        folder = Na__Core.Na__Project__Find(arguments['project'])
        plan = Na__Server__Compare('projects', Na__Core.Na__Project__ScopeOf(folder))
    elif what == 'app':
        plan = Na__Server__Compare('valevision3d')
    else:
        plan = Na__Server__Compare('server-api', 'Api__ValeVision3D')
    return Na__Result__Data(Na__Server__PlanOf(plan))


@Na__Tool('vv3d_server_collect_project', 'Bring a project down from the server',
          'Brings what is newer on the server for one project down to this PC, which keeps the copies it replaces. Do this before changing a real record: someone may have saved on the live server since.',
          {'project': {'type': 'string'}}, required=['project'])
def Na__Tool__ServerCollectProject(arguments):
    folder = Na__Core.Na__Project__Find(arguments['project'])
    code, text, report = Na__Core.Na__Engine__Run(['collect', 'projects', '--scope', Na__Core.Na__Project__ScopeOf(folder), '--yes'], timeout_s=600)
    if code != 0 or not report or not report.get('ok'):
        raise Na__ToolError('The collect failed: %s' % ((report or {}).get('error') or text[-500:]), 'A gateway refusal is not retried: tell the person.')
    result = report.get('result') or {}
    record = Na__Core.Na__Project__Read(Na__Core.Na__Project__RecordPath(folder))
    return Na__Result__Data({'project': folder.name, 'received': result.get('received'), 'replacedOnPc': result.get('replaced_on_pc'),
                             'pcBackup': result.get('pc_backup'), 'recordRevNow': record.get('_rev', 0)})


@Na__Tool('vv3d_server_push_project', 'Send a project to the live server',
          'Sends one project\'s changes to the live server: its record and any new content, nothing outside its folder. dry_run (the default) only says what would move. Refuses a delete, and a server copy newer than this PC\'s.',
          {'project': {'type': 'string'}, 'dry_run': {'type': 'boolean', 'description': 'Default true. false is the real push: only when the person has asked for it.'}},
          required=['project'], destructive=True)
def Na__Tool__ServerPushProject(arguments):
    folder = Na__Core.Na__Project__Find(arguments['project'])
    scope = Na__Core.Na__Project__ScopeOf(folder)
    plan = Na__Server__Compare('projects', scope)
    Na__Server__RefuseUnsafe(plan, folder.name)
    if arguments.get('dry_run') is not False:
        return Na__Result__Data({'project': folder.name, 'dryRun': True, 'wouldMove': Na__Server__PlanOf(plan)})
    code, text, report = Na__Core.Na__Engine__Run(['push', 'projects', '--scope', scope, '--yes'], timeout_s=900)
    if code != 0 or not report or not report.get('ok'):
        raise Na__ToolError('The push failed: %s' % ((report or {}).get('error') or text[-500:]), 'A gateway refusal is not retried: tell the person.')
    return Na__Result__Data({'project': folder.name, 'pushed': True, 'stamp': (report.get('result') or {}).get('stamp'), 'moved': Na__Server__PlanOf(plan),
                             'undo': 'python VirtualServerManager__SyncEngine__.py undo projects'})


@Na__Tool('vv3d_server_push_app', 'Send the app to the live server',
          'Sends every changed file of the page to the live server, as a whole: look at the list first, because other sessions\' finished work may be in it. dry_run (the default) only says what would move. Refuses a delete. An API change is not here: it needs a service restart, through the vgh-app-server skill.',
          {'dry_run': {'type': 'boolean', 'description': 'Default true. false is the real push: only when the person has asked for it.'}},
          destructive=True)
def Na__Tool__ServerPushApp(arguments):
    plan = Na__Server__Compare('valevision3d')
    Na__Server__RefuseUnsafe(plan, 'the app')
    if arguments.get('dry_run') is not False:
        return Na__Result__Data({'dryRun': True, 'wouldMove': Na__Server__PlanOf(plan)})
    code, text, report = Na__Core.Na__Engine__Run(['push', 'valevision3d', '--yes'], timeout_s=900)
    if code != 0 or not report or not report.get('ok'):
        raise Na__ToolError('The push failed: %s' % ((report or {}).get('error') or text[-500:]), 'A gateway refusal is not retried: tell the person.')
    status, _body = Na__Core.Na__Live__Peek('/valevision/')
    return Na__Result__Data({'pushed': True, 'stamp': (report.get('result') or {}).get('stamp'), 'moved': Na__Server__PlanOf(plan), 'pageAnswers': status,
                             'undo': 'python VirtualServerManager__SyncEngine__.py undo valevision3d'})


@Na__Tool('vv3d_live_check', 'Check the live site, signed out',
          'Asks the public site, with no ssh and no sign-in, whether a project\'s page, its record and the deploy stamp answer as they should. A signed-out record answers 401: that is the library gate working. It cannot see what a signed-in person sees.',
          {'project': {'type': 'string'}}, read_only=True)
def Na__Tool__LiveCheck(arguments):
    answer = {'page': Na__Core.Na__Live__Peek('/valevision/', 64)[0]}
    status, body = Na__Core.Na__Live__Peek('/ValeApps__DeployStamp__.json')
    answer['deployStampFile'] = status
    marker = '"ValeDeploy__Stamp__Latest"'
    at = body.find(marker)
    if at >= 0:
        answer['lastDeployStamp'] = body[at + len(marker):].split('"')[1]
    if arguments.get('project'):
        folder = Na__Core.Na__Project__Find(arguments['project'])
        rel = '/Vale__Projects__MasterLibrary/%s/ProjectData__%s__.json' % (Na__Core.Na__Project__ScopeOf(folder), folder.name)
        answer['recordSignedOut'] = Na__Core.Na__Live__Peek(rel, 64)[0]
        answer['staffLink'] = '%s/valevision/?project=%s' % (Na__Core.NA_LIVE_SITE, folder.name)
    return Na__Result__Data(answer)

# endregion -------------------------------------------------------------------

# =============================================================================
# END OF FILE
# =============================================================================
