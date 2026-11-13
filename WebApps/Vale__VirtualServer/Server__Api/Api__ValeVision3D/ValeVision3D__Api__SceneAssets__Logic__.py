# =============================================================================
# VALEVISION3D API - PLACED ASSETS - WHO DID WHAT, WHAT IS WAITING, AND PUTTING IT BACK
# =============================================================================
#
# FILE       : ValeVision3D__Api__SceneAssets__Logic__.py
# NAMESPACE  : na_assets
# MODULE     : API - Placed Assets
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : The sums behind Employees placing people and plants: the changes file, a
#              save, an approval and a revert. No Flask and no files, so it runs alone
# CREATED    : 05-Nov-2026
#
# DESCRIPTION:
# - Adam, 05-Nov-2026: "Employees should be able to create entourage and foliage", "a system and way
#   of tracking ownership of those assets and changes, so who inserted what", and "Add way for user
#   / admin to delete their changes (effectively revert the assetrs to the state before they added
#   anything)". His answers: an Employee may change anything, all of it tracked, and clients see what
#   an Employee adds only after an admin approves.
# - NO MORE WAITING (11-Nov-2026, v2.96.0). Adam: "Remove this, any entorage added by anyone staff or
#   above should be updated when saved". With NA_STAFF_SAVES_GO_STRAIGHT_IN, an Employee's save and
#   own put back go into the record as an admin's do, and a save publishes anything left waiting
#   from before. Who placed what, and when, is kept exactly as before: Owners is what the
#   right-click menus show ("who added that thing into the scene and when"). The waiting machinery
#   below stays, for the switch.
# - THE RECORD IS WHAT IS APPROVED. A project's Entourage__SceneData and Vegetation__SceneData stay
#   exactly as they were, written only at the admin's level. It is all a client link ever reads, so
#   nothing waiting can reach a client, by design and not by a filter someone could forget.
# - WHAT IS WAITING LIVES BESIDE IT, in the changes file, which holds staff names and which the guard
#   shuts to client links. What staff work on is the record with the waiting changes laid over it.
# - THE ITEM IS THE UNIT. One figure, plop, path or palette, by its Uid. A save says what changed
#   against what that window read, so two people working at once only meet if they change one item,
#   and then the later one wins, and both are on the record.
# - PUTTING IT BACK. For each person and item, the changes file keeps the item as it stood just before
#   that person first touched it. Removing someone's changes puts those back, except on an item
#   somebody else has changed since, which is left alone and said so.
# - WHAT COMES TO NOTHING LEAVES NOTHING. Added and deleted before anyone approved it, or changed back
#   to what is approved, and there is nothing to wait for and nothing to put back.
# - AN ADMIN'S CHANGE IS APPROVED AS IT IS MADE, and supersedes anything waiting on that item.
# - THE FILE HOLDS NAMES. It is never sent to a client link, and the record never holds a name.
# - WHERE VIEWERS START IS ANY STAFF SAVE'S (13-Nov-2026, v2.98.4). Adam: "this should be captured
#   at save for entourage and vegetation", then "Any staff who can save". While staff saves go
#   straight in, a save's Show and Transparency (each system's StartKeys) go into the record from
#   anyone, checked by na_start_value. Line rules, Enabled and the rest stay an admin's.
#
# THE CHANGES FILE (machine written, in <project>/ValeVision3D/UserData__SceneAssets/):
#   { "SceneAssets__Changes__SchemaVersion": 1,
#     "SceneAssets__Changes__Systems": { "<system>": {
#         "Owners"  : { "<item key>": { "CreatedBy", "CreatedName", "CreatedAt", "ChangedBy", "ChangedName", "ChangedAt" } },
#         "Waiting" : { "<item key>": { "Record": {...} or null, "By", "Name", "At", "Action" } },
#         "Touches" : { "<code>": { "Name", "Items": { "<item key>": { "Before": {...} or null, "At" } } } },
#         "Keys"    : { what an Employee changed that is not an item: "Tools", and "Assets" pinned for what is waiting },
#         "Base"    : every parameter of a project with no key yet, for the first approval,
#         "History" : [ { "At", "By", "Name", "Action", "Item", "What" }, ... ] newest last } } }
#
# INTEGRATION:
# - Called by ./ValeVision3D__Api__SceneAssets__.py, and read by the ValeVision MCP server, which
#   imports this file by its path: it needs nothing but the standard library.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 13-Nov-2026 - Version 1.2.0 (ValeVision3D v2.98.4)
# - StartKeys and na_start_value: a staff save's Show and Transparency go into the record.
#
# 11-Nov-2026 - Version 1.1.0 (ValeVision3D v2.96.0)
# - NA_STAFF_SAVES_GO_STRAIGHT_IN, and na_save's straight_in: staff saves go into the record.
#
# 05-Nov-2026 - Version 1.0.0 (ValeVision3D v2.89.0)
# - Initial build.
#
# =============================================================================

import copy
import json
import re
import time

# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

NA_SCHEMA_VERSION = 1
NA_HISTORY_LIMIT  = 1000                                                          # <-- Newest kept. Who did what is a record, not a log for ever

# A SAVE BY ANY STAFF GOES STRAIGHT IN (Adam, 11-Nov-2026: "Remove this, any entorage added by anyone
# staff or above should be updated when saved"). An Employee's people and plants, their own put back
# and the pins they need are written to the record as an admin's are. False brings back the wait for
# an admin's approval exactly as v2.89.0 built it. Line rules, Enabled and the rest stay an admin's,
# except where viewers start (StartKeys), which any staff save sets while this is on.
NA_STAFF_SAVES_GO_STRAIGHT_IN = True

# WHAT EACH SYSTEM HOLDS | Its record key, and its lists of items: the list's key, the Uid's key, the
# word for a person, the letter a new Uid starts with, and the keys that say what an item is. StartKeys:
# where every viewer opens the project, which any staff save sets, with the kind each must be
NA_SYSTEMS = {
    'Entourage': {
        'Key'   : 'Entourage__SceneData',
        'Lists' : [
            {'Kind': 'figure', 'List': 'Entourage__SceneData__Figures', 'Uid': 'Entourage__Figure__Uid', 'Prefix': 'E', 'Name': 'Entourage__Figure__AssetId'},
        ],
        'Tools' : 'Entourage__SceneData__Tools',
        'Assets': 'Entourage__SceneData__Assets',
        'NamedAssets': [('Entourage__SceneData__Figures', 'Entourage__Figure__AssetId')],
        'StartKeys': {'Entourage__SceneData__ShowByDefault': 'show', 'Entourage__SceneData__DefaultTransparencyPercent': 'percent'},
    },
    'Vegetation': {
        'Key'   : 'Vegetation__SceneData',
        'Lists' : [
            {'Kind': 'plop',    'List': 'Vegetation__SceneData__Plops',    'Uid': 'Vegetation__Plop__Uid',    'Prefix': 'A',   'Name': 'Vegetation__Plop__AssetId'},
            {'Kind': 'path',    'List': 'Vegetation__SceneData__Paths',    'Uid': 'Vegetation__Path__Uid',    'Prefix': 'P',   'Name': 'Vegetation__Path__Name'},
            {'Kind': 'palette', 'List': 'Vegetation__SceneData__Palettes', 'Uid': 'Vegetation__Palette__Uid', 'Prefix': 'PAL', 'Name': 'Vegetation__Palette__Name'},
        ],
        'Tools' : 'Vegetation__SceneData__Tools',
        'Assets': 'Vegetation__SceneData__Assets',
        'NamedAssets': [('Vegetation__SceneData__Plops', 'Vegetation__Plop__AssetId')],
        'StartKeys': {'Vegetation__SceneData__ShowByDefault': 'show', 'Vegetation__SceneData__DefaultTransparencyPercent': 'percent'},
    },
}

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Small Helpers
# -----------------------------------------------------------------------------

def na_now():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def na_new_changes():
    return {'SceneAssets__Changes__SchemaVersion': NA_SCHEMA_VERSION, 'SceneAssets__Changes__Systems': {}}


def na_system_block(changes, system):
    """A system's block of the changes file, made if it is not there."""
    systems = changes.setdefault('SceneAssets__Changes__Systems', {})
    block = systems.setdefault(system, {})
    for key, empty in (('Owners', {}), ('Waiting', {}), ('Touches', {}), ('Keys', {}), ('History', [])):
        block.setdefault(key, copy.deepcopy(empty))
    return block


def na_same(a, b):
    """Are two records the same, whatever order their keys came in?"""
    return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)


def na_start_value(kind, value):
    """A start value a staff save sent, as the record keeps it, or None if it is not one:
    'show' a true or false, 'percent' a whole number 0 to 100."""
    if kind == 'show':
        return value if isinstance(value, bool) else None
    if kind == 'percent' and isinstance(value, (int, float)) and not isinstance(value, bool) and 0 <= value <= 100:
        return int(round(value))
    return None


def na_items(scene, spec):
    """A list's items as { uid: record }, in their order."""
    rows = (scene or {}).get(spec['List'])
    if not isinstance(rows, list):
        return {}
    return {row.get(spec['Uid']): row for row in rows if isinstance(row, dict) and row.get(spec['Uid'])}


def na_item_key(spec, uid):
    return '%s:%s' % (spec['Kind'], uid)


def na_spec_of(system, item_key):
    kind = item_key.split(':', 1)[0]
    return next(spec for spec in NA_SYSTEMS[system]['Lists'] if spec['Kind'] == kind)


def na_set_item(scene, spec, uid, record):
    """Put an item in a scene object, or take it out with record None. An item already there keeps its place."""
    rows = scene.get(spec['List'])
    if not isinstance(rows, list):
        rows = []
        scene[spec['List']] = rows
    for index, row in enumerate(rows):
        if isinstance(row, dict) and row.get(spec['Uid']) == uid:
            if record is None:
                rows.pop(index)
            else:
                rows[index] = record
            return
    if record is not None:
        rows.append(record)


def na_get_item(scene, spec, uid):
    return na_items(scene, spec).get(uid)


def na_next_uid(prefix, taken):
    highest = 0
    pattern = re.compile('^' + re.escape(prefix) + r'(\d+)$')
    for uid in taken:
        match = pattern.match(str(uid))
        if match:
            highest = max(highest, int(match.group(1)))
    return '%s%04d' % (prefix, highest + 1)


def na_seed(system, sent, block):
    """The first approved object of a project with no key: every parameter, and no items yet.
    A project that has a key has every parameter, so a first write must not be the odd one out."""
    settings = NA_SYSTEMS[system]
    seed = copy.deepcopy(block.get('Base') or {})
    item_lists = {spec['List'] for spec in settings['Lists']}
    for key, value in (sent or {}).items():
        if key not in item_lists and key != settings['Assets'] and key not in seed:
            seed[key] = copy.deepcopy(value)
    seed.setdefault(settings['Assets'], {})
    for spec in settings['Lists']:
        seed[spec['List']] = []
    return seed


def na_what(system, spec, record):
    """A few words for the history: what an item is."""
    if not isinstance(record, dict):
        return ''
    return str(record.get(spec['Name']) or '')[:80]

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | What Staff Work On
# -----------------------------------------------------------------------------

def na_working(system, approved, changes):
    """The record's object with what is waiting laid over it. None if there is neither."""
    settings = NA_SYSTEMS[system]
    block = na_system_block(changes, system) if changes else {'Waiting': {}, 'Keys': {}}
    if approved is None and not block['Waiting'] and not block.get('Keys') and not block.get('Base'):
        return None
    scene = copy.deepcopy(approved) if isinstance(approved, dict) else copy.deepcopy(block.get('Base') or {})
    for item_key, entry in block['Waiting'].items():
        spec = na_spec_of(system, item_key)
        na_set_item(scene, spec, item_key.split(':', 1)[1], copy.deepcopy(entry.get('Record')))
    keys = block.get('Keys') or {}
    if keys.get('Tools') is not None:
        scene[settings['Tools']] = copy.deepcopy(keys['Tools'])
    if keys.get('Assets'):
        merged = dict(keys['Assets'])
        merged.update(scene.get(settings['Assets']) or {})                        # <-- An approved copy wins: a project draws from what was approved
        scene[settings['Assets']] = copy.deepcopy(merged)
    return scene


def na_summary(system, changes, me_code=None):
    """Who has done what, for the panels: by person, how many waiting and how many in all, and each item."""
    block = na_system_block(changes, system)
    people = {}
    for code, touched in block['Touches'].items():
        people[code] = {'Code': code, 'Name': touched.get('Name') or code, 'Waiting': 0, 'Total': len(touched.get('Items') or {}), 'Items': [], 'IsMe': code == me_code}
    for item_key, entry in block['Waiting'].items():
        code = entry.get('By') or ''
        person = people.setdefault(code, {'Code': code, 'Name': entry.get('Name') or code, 'Waiting': 0, 'Total': 0, 'Items': [], 'IsMe': code == me_code})
        person['Waiting'] += 1
    for code, person in people.items():
        items = (block['Touches'].get(code) or {}).get('Items') or {}
        for item_key, touch in items.items():
            waiting = block['Waiting'].get(item_key)
            spec = na_spec_of(system, item_key)
            record = (waiting or {}).get('Record') if waiting else None
            person['Items'].append({
                'Key'     : item_key,
                'Kind'    : spec['Kind'],
                'Uid'     : item_key.split(':', 1)[1],
                'Action'  : (waiting or {}).get('Action') or touch.get('Action') or 'changed',
                'Waiting' : bool(waiting) and waiting.get('By') == code,
                'At'      : touch.get('At'),
                'What'    : na_what(system, spec, record or touch.get('Before') or touch.get('After'))
            })
        person['Items'].sort(key=lambda row: str(row.get('At') or ''), reverse=True)
    return {
        'Owners'  : block['Owners'],
        'Waiting' : {key: {'By': entry.get('By'), 'Name': entry.get('Name'), 'At': entry.get('At'), 'Action': entry.get('Action')} for key, entry in block['Waiting'].items()},
        'People'  : sorted(people.values(), key=lambda row: (not row['IsMe'], str(row['Name']))),
        'History' : block['History'][-200:]
    }

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Noting a Change
# -----------------------------------------------------------------------------

def na_note(block, item_key, spec, action, before, after, who):
    """Who did it, what it stood at before they first touched it, and a line of history."""
    now = na_now()
    code, name = who['code'], who['name']
    owner = block['Owners'].get(item_key)
    if action == 'added' and owner is None:
        block['Owners'][item_key] = {'CreatedBy': code, 'CreatedName': name, 'CreatedAt': now, 'ChangedBy': code, 'ChangedName': name, 'ChangedAt': now}
    elif owner is not None:
        owner.update({'ChangedBy': code, 'ChangedName': name, 'ChangedAt': now})
    else:
        block['Owners'][item_key] = {'CreatedBy': '', 'CreatedName': '', 'CreatedAt': '', 'ChangedBy': code, 'ChangedName': name, 'ChangedAt': now}   # <-- It was there before anyone kept track

    person = block['Touches'].setdefault(code, {'Name': name, 'Items': {}})
    person['Name'] = name
    if item_key not in person['Items']:
        person['Items'][item_key] = {'Before': copy.deepcopy(before), 'At': now, 'Action': action}
    else:
        person['Items'][item_key]['At'] = now
        person['Items'][item_key]['Action'] = action if action != 'changed' else person['Items'][item_key].get('Action', 'changed')

    block['History'].append({'At': now, 'By': code, 'Name': name, 'Action': action, 'Item': item_key, 'What': na_what(None, spec, after or before)})
    del block['History'][:-NA_HISTORY_LIMIT]

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | A Save
# -----------------------------------------------------------------------------

def na_diff(spec, base, sent):
    """What this window changed against what it read: [(uid, action, before, after)]."""
    old, new = na_items(base, spec), na_items(sent, spec)
    out = []
    for uid, record in new.items():
        if uid not in old:
            out.append((uid, 'added', None, record))
        elif not na_same(old[uid], record):
            out.append((uid, 'changed', old[uid], record))
    for uid, record in old.items():
        if uid not in new:
            out.append((uid, 'removed', record, None))
    return out


def na_save(system, approved, changes, base, sent, who, is_admin, straight_in=False):
    """One save. base: the working object this window read. sent: what it holds now.
    An admin's changes go straight into the approved object, and so do anyone's items when
    straight_in (NA_STAFF_SAVES_GO_STRAIGHT_IN). Otherwise anyone else's go in Waiting.
    Returns (approved, changes, counts, renamed): renamed, { old uid: new uid } for a new item
    whose Uid somebody else took meanwhile. approved is None if there is still no key."""
    settings = NA_SYSTEMS[system]
    block = na_system_block(changes, system)
    working = na_working(system, approved, changes) or {}
    approved_out = copy.deepcopy(approved) if isinstance(approved, dict) else None
    counts = {'added': 0, 'changed': 0, 'removed': 0}
    renamed = {}
    items_in = is_admin or straight_in                                            # <-- The items go into the record now

    if not isinstance(base, dict):
        base = {}
    for spec in settings['Lists']:
        taken = set(na_items(working, spec))
        for uid, action, before, after in na_diff(spec, base, sent):
            counts[action] += 1
            target_uid = uid
            record = copy.deepcopy(after)

            # A UID SOMEBODY ELSE TOOK | Both made the next number. Theirs stays, and this one moves up
            if action == 'added' and uid in taken and not na_same(na_get_item(working, spec, uid), after):
                target_uid = na_next_uid(spec['Prefix'], taken)
                record[spec['Uid']] = target_uid
                renamed[uid] = target_uid
            taken.add(target_uid)

            item_key = na_item_key(spec, target_uid)
            current = na_get_item(working, spec, target_uid)                     # <-- As it stands now, which is what putting it back must return it to
            na_note(block, item_key, spec, action, copy.deepcopy(current) if action != 'added' else None, record, who)

            if items_in:
                if approved_out is None:
                    approved_out = na_seed(system, sent, block)
                na_set_item(approved_out, spec, target_uid, record)
                block['Waiting'].pop(item_key, None)                              # <-- Superseded
            else:
                was_waiting = block['Waiting'].get(item_key) or {}
                if na_same(record, na_get_item(approved or {}, spec, target_uid)):
                    block['Waiting'].pop(item_key, None)                          # <-- Back to what is approved, or deleted before it ever was
                else:
                    block['Waiting'][item_key] = {'Record': record, 'By': who['code'], 'Name': who['name'], 'At': na_now(),
                                                  'Action': 'added' if action == 'changed' and was_waiting.get('Action') == 'added' else action}
            na_set_item(working, spec, target_uid, record)

            # ADDED AND DELETED BEFORE ANYONE APPROVED IT | It comes to nothing, so it leaves nothing
            touch = block['Touches'].get(who['code'], {}).get('Items', {}).get(item_key)
            if action == 'removed' and touch and touch.get('Before') is None and na_get_item((approved_out if items_in else approved) or {}, spec, target_uid) is None:
                del block['Touches'][who['code']]['Items'][item_key]
                block['Owners'].pop(item_key, None)
                if not block['Touches'][who['code']]['Items']:
                    del block['Touches'][who['code']]

    # WHAT IS NOT AN ITEM | An admin's goes in the record. An Employee's tools are kept here, and a
    # pinned asset is kept for what is waiting. Nothing else of theirs is taken: line rules, Enabled,
    # where viewers start and the rest stay as an admin set them, whatever a page sends.
    item_lists = {spec['List'] for spec in settings['Lists']}
    if is_admin:
        changed = [key for key, value in sent.items() if key not in item_lists and not na_same(base.get(key), value)]
        if approved_out is None and changed:
            approved_out = na_seed(system, sent, block)
        if approved_out is not None:
            for key in changed:
                approved_out[key] = copy.deepcopy(sent[key])
            if settings['Assets'] in sent:                                        # <-- A pin an item needs comes with it
                assets = approved_out.get(settings['Assets']) if isinstance(approved_out.get(settings['Assets']), dict) else {}
                for asset_id, asset in (sent.get(settings['Assets']) or {}).items():
                    assets.setdefault(asset_id, copy.deepcopy(asset))
                approved_out[settings['Assets']] = assets
    else:
        tools = sent.get(settings['Tools'])
        if tools is not None and not na_same(tools, base.get(settings['Tools'])):
            block['Keys']['Tools'] = copy.deepcopy(tools)

        # WHERE VIEWERS START | Any staff save's, while saves go straight in (Adam, 13-Nov-2026)
        if straight_in:
            starts = {}
            for key, kind in (settings.get('StartKeys') or {}).items():
                value = na_start_value(kind, sent.get(key))
                if key in sent and value is not None and not na_same(base.get(key), sent[key]):
                    starts[key] = value
            if starts and approved_out is None:
                approved_out = na_seed(system, sent, block)
            for key, value in starts.items():
                approved_out[key] = value

        pins = sent.get(settings['Assets']) or {}
        if straight_in and approved_out is not None:
            assets = approved_out.get(settings['Assets']) if isinstance(approved_out.get(settings['Assets']), dict) else {}
            for asset_id, asset in pins.items():
                assets.setdefault(asset_id, copy.deepcopy(asset))                 # <-- A new pin only: changing an approved copy is an admin's
            approved_out[settings['Assets']] = assets
        elif not straight_in:
            known = (approved or {}).get(settings['Assets']) or {}
            waiting_pins = block['Keys'].setdefault('Assets', {})
            for asset_id, asset in pins.items():
                if asset_id not in known and asset_id not in waiting_pins:
                    waiting_pins[asset_id] = copy.deepcopy(asset)                 # <-- A new pin only: changing an approved copy is an admin's
            if approved is None and not block.get('Base') and any(counts.values()):
                block['Base'] = na_seed(system, sent, block)                      # <-- Every parameter the page knows, for the first approval
    return approved_out, changes, counts, renamed

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Approving
# -----------------------------------------------------------------------------

def na_assets_used(system, scene):
    """Every asset an object's items name. A palette's and a path's plant changes count."""
    used = set()
    for list_key, id_key in NA_SYSTEMS[system]['NamedAssets']:
        for row in (scene or {}).get(list_key) or []:
            if isinstance(row, dict) and row.get(id_key):
                used.add(row[id_key])
    if system == 'Vegetation':
        for palette in (scene or {}).get('Vegetation__SceneData__Palettes') or []:
            for item in (palette or {}).get('Vegetation__Palette__Items') or []:
                if item.get('Vegetation__PaletteItem__AssetId'):
                    used.add(item['Vegetation__PaletteItem__AssetId'])
        for path in (scene or {}).get('Vegetation__SceneData__Paths') or []:
            for change in ((path or {}).get('Vegetation__Path__PlantChanges') or {}).values():
                if isinstance(change, dict) and change.get('Vegetation__PlantChange__AssetId'):
                    used.add(change['Vegetation__PlantChange__AssetId'])
    return used


def na_approve(system, approved, changes, who, by_code=None):
    """Move what is waiting into the approved object: everyone's, or one person's. A path's palette goes
    with it, or a client would see a path with nothing to plant. Returns (approved, changes, count)."""
    settings = NA_SYSTEMS[system]
    block = na_system_block(changes, system)
    chosen = [key for key, entry in block['Waiting'].items() if by_code is None or entry.get('By') == by_code]
    if system == 'Vegetation':
        working = na_working(system, approved, changes) or {}
        for item_key in list(chosen):
            if not item_key.startswith('path:'):
                continue
            record = block['Waiting'][item_key].get('Record') or {}
            palette_key = 'palette:%s' % record.get('Vegetation__Path__PaletteUid')
            if palette_key in block['Waiting'] and palette_key not in chosen:
                chosen.append(palette_key)
    if not chosen:
        return approved, changes, 0

    approved_out = copy.deepcopy(approved) if isinstance(approved, dict) else na_seed(system, None, block)
    for item_key in chosen:
        entry = block['Waiting'].pop(item_key)
        spec = na_spec_of(system, item_key)
        na_set_item(approved_out, spec, item_key.split(':', 1)[1], copy.deepcopy(entry.get('Record')))
        block['History'].append({'At': na_now(), 'By': who['code'], 'Name': who['name'], 'Action': 'approved', 'Item': item_key,
                                 'What': na_what(system, spec, entry.get('Record')), 'Of': entry.get('Name')})
    del block['History'][:-NA_HISTORY_LIMIT]

    # THE COPIES THE APPROVED ITEMS NEED | So a client's page draws them from the project's own
    pins = block['Keys'].get('Assets') or {}
    assets = approved_out.get(settings['Assets']) if isinstance(approved_out.get(settings['Assets']), dict) else {}
    for asset_id in na_assets_used(system, approved_out):
        if asset_id in pins and asset_id not in assets:
            assets[asset_id] = pins[asset_id]
    approved_out[settings['Assets']] = assets
    still_named = na_assets_used(system, na_working(system, approved_out, changes))
    block['Keys']['Assets'] = {asset_id: asset for asset_id, asset in pins.items() if asset_id in still_named and asset_id not in assets}
    if not block['Keys']['Assets']:
        block['Keys'].pop('Assets', None)
    return approved_out, changes, len(chosen)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Putting Back
# -----------------------------------------------------------------------------

def na_revert(system, approved, changes, who, of_code, is_admin):
    """Put one person's items back as they stood just before that person first touched them.

    An item somebody else has changed since is left alone and listed. An admin's revert goes straight into
    the approved object, as any change of theirs does. Anyone else's own revert drops what of theirs is
    still waiting, and what was already approved becomes a change waiting for an admin, since a client sees
    only what is approved. Returns (approved, changes, restored, left_alone)."""
    settings = NA_SYSTEMS[system]
    block = na_system_block(changes, system)
    person = block['Touches'].get(of_code)
    if not person:
        return approved, changes, [], []
    approved_out = copy.deepcopy(approved) if isinstance(approved, dict) else None
    restored, left_alone = [], []

    for item_key, touch in list(person.get('Items', {}).items()):
        spec = na_spec_of(system, item_key)
        uid = item_key.split(':', 1)[1]
        owner = block['Owners'].get(item_key) or {}

        # SOMEBODY ELSE HAS CHANGED IT SINCE | Theirs stands, and this person's mark on it goes
        if owner.get('ChangedBy') and owner.get('ChangedBy') != of_code:
            left_alone.append({'Key': item_key, 'Uid': uid, 'By': owner.get('ChangedName')})
            continue

        before = copy.deepcopy(touch.get('Before'))
        waiting = block['Waiting'].get(item_key)
        now_approved = na_get_item(approved_out or {}, spec, uid)

        if is_admin:
            if approved_out is not None:
                na_set_item(approved_out, spec, uid, before)
            elif before is not None:
                approved_out = na_seed(system, None, block)
                na_set_item(approved_out, spec, uid, before)
            block['Waiting'].pop(item_key, None)
        else:
            if na_same(before, now_approved):
                block['Waiting'].pop(item_key, None)                              # <-- Nothing to ask: the approved copy is already what it was
            elif waiting is not None or not na_same(before, now_approved):
                block['Waiting'][item_key] = {'Record': before, 'By': who['code'], 'Name': who['name'], 'At': na_now(), 'Action': 'put back'}

        # THE OWNER | Gone if this person made it, else back to whoever changed it last that we know of
        if touch.get('Before') is None:
            block['Owners'].pop(item_key, None)
        elif owner:
            owner.update({'ChangedBy': owner.get('CreatedBy') or '', 'ChangedName': owner.get('CreatedName') or '', 'ChangedAt': touch.get('At') or ''})
        del person['Items'][item_key]
        restored.append({'Key': item_key, 'Uid': uid})
        block['History'].append({'At': na_now(), 'By': who['code'], 'Name': who['name'], 'Action': 'put back', 'Item': item_key,
                                 'What': na_what(system, spec, before), 'Of': person.get('Name')})

    if not person.get('Items'):
        block['Touches'].pop(of_code, None)
    del block['History'][:-NA_HISTORY_LIMIT]
    return approved_out, changes, restored, left_alone

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | A Write That Did Not Come Through a Save
# -----------------------------------------------------------------------------

def na_note_direct(system, before, after, changes, who):
    """A SketchUp sync, an agent or a whole-key write changed the approved object directly: it is on the record too.
    Nothing waits: it is already approved. Returns how many items changed."""
    settings = NA_SYSTEMS[system]
    block = na_system_block(changes, system)
    total = 0
    for spec in settings['Lists']:
        for uid, action, old, new in na_diff(spec, before or {}, after or {}):
            na_note(block, na_item_key(spec, uid), spec, action, old, new, who)
            total += 1
    return total

# endregion -------------------------------------------------------------------
