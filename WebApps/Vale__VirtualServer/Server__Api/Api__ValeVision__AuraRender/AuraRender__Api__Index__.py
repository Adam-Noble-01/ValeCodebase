#!/usr/bin/env python3
# =============================================================================
# VALEVISION AURA - API - THE LANDING PAGE'S CARDS (PROJECTS AND AURA'S SCENES)
# =============================================================================
#
# FILE       : AuraRender__Api__Index__.py
# MODULE     : AURA API Index
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : What /aura/ shows when no project is chosen: a card for every
#              project switched on for AURA, then AURA's own scenes this
#              person may open
# CREATED    : 30-Oct-2026
#
# DESCRIPTION:
# - AS THEIA'S PROJECT INDEX (Adam, 30-Oct-2026: "show aura scenes here like
#   TheiaVideo"): the projects switched on (auraEnabled), newest year first,
#   then AURA's own scenes (ValeAuraScenes__Library, AuraRender__Api__Core__):
#   Example Cottage for everyone AURA lets in, Test for Adam alone.
# - A CARD is project_public (id, kind, title, number, year, who a scene is
#   for and its note) plus the number of sheets in its drawing set, when that
#   was last saved, whether it has its own model (an AURA scene made, or
#   ValeVision 3D's whitecard waiting for its first open), and the Gallery's
#   thumbnail for a project.
#
# ROUTES:
#   GET  /api/projects     the cards, for AURA's level (Management and AppAdmin)
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 30-Oct-2026 - Version 1.0.0
# - Initial build.
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

from datetime import datetime, timezone
from urllib.parse import quote

from flask import Blueprint, jsonify

import AuraRender__Api__Core__ as aura_core
from ValeShared__Auth__ import Na__Auth__CurrentUser
from ValeShared__Library__ import Na__Library__ListProjects, Na__Library__ReadJson, Na__Library__Url

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

aura_index_api           = Blueprint('aura_index_api', __name__)
SCENE_FILE_DIR           = 'UserData__AuraScene'                                  # <-- The AURA scene, made on a project's first open (AuraRender__Api__Scene__)
WHITECARD_DIR            = ('ValeVision3D', 'Content__3dModel__GlbFiles')
GALLERY_THUMBS           = 'ValeVisionGallery/Content__GalleryImages__Thumbnail__VariantImages'

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | A Card
# -----------------------------------------------------------------------------

def card(folder):
    """One project or scene as the landing page shows it."""
    out = aura_core.project_public(folder)
    record = aura_core.project_record(folder)
    drawings = aura_core.drawings_path(folder)
    sheets, saved = 0, ''
    if drawings.is_file():
        try:
            sheets = len((Na__Library__ReadJson(drawings) or {}).get('AuraDrawingSet__Sheets') or [])
            saved = datetime.fromtimestamp(drawings.stat().st_mtime, timezone.utc).isoformat(timespec='seconds')
        except (OSError, ValueError) as error:
            aura_core.log(f'[AURA API] drawing set unreadable for {folder.name}: {error}')
    whitecard = folder.joinpath(*WHITECARD_DIR)
    made = (folder / aura_core.BUCKET / SCENE_FILE_DIR / f'{folder.name}__AuraScene__.json').is_file()
    thumb_name = str(record.get('thumbnailImage') or '')
    thumbs = folder / GALLERY_THUMBS
    out.update({
        'sheets'  : sheets,
        'savedAt' : saved,
        'hasModel': made or (whitecard.is_dir() and any(whitecard.glob('*.glb'))),
        'thumbUrl': Na__Library__Url(thumbs) + quote(thumb_name) if thumb_name and (thumbs / thumb_name).is_file() else '',
    })
    return out

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Routes
# -----------------------------------------------------------------------------

@aura_index_api.get('/api/projects')
@aura_core.require_access
def list_cards():
    user = Na__Auth__CurrentUser()
    cards = [card(folder) for _, folder in Na__Library__ListProjects() if aura_core.project_switched_on(folder)]
    cards += [card(folder) for folder in aura_core.scene_folders(user) if aura_core.project_switched_on(folder)]
    response = jsonify({'ok': True, 'projects': cards})
    response.headers['Cache-Control'] = 'no-store'
    return response

# endregion -------------------------------------------------------------------
