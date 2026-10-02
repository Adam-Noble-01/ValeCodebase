"""W3-99 - the Module Register rows Wave 3 changed (ValeVision3D v2.71.5). Helpers copied from W2-99's ledger_w2_reg.py.

Each of the 196 rows of a Wave-2-touched module (rows_w2.json) is rewritten from the file's own PORT NOTE as it now
stands (portnote_fields_w2.json) by one generic rule, or by an explicit entry below where the wave replayed hunks, edited
a configuration, kept a ValeVision-only module or left part of TrueVision's file for a later package. Old cells are kept
as "[was: ...]" (K2 section 13: history is not rewritten). Columns: 0 VV path, 1 TV path, 2 TV source ver, 3 TV current
ver, 4 Parity, 5 Divergences and seams, 6 Open TV versions, 7 Loaded by, 8 Transport, 9 Checked, 10 Packages,
11 Blocked by (refreshed separately for every row)."""
import re

REL = 'v2.71.5'
PIN = 'read at b2aa9151'

ASCII = {'—': '-', '–': '-', '‘': "'", '’': "'", '“': '"', '”': '"', '→': '->',
         '×': 'x', '…': '...', ' ': ' ', '≥': '>=', '≤': '<=', '°': ' deg'}


def clean(s):
    s = ''.join(ASCII.get(ch, ch) for ch in s)
    s = s.encode('ascii', 'replace').decode('ascii').replace('?', '?')
    s = s.replace('|', '/').replace('\t', ' ')
    return re.sub(r'\s+', ' ', s).strip()


def short(s, n):
    s = clean(s)
    if len(s) <= n:
        return s
    cut = s[:n]
    for sep in ('. ', '; '):
        k = cut.rfind(sep)
        if k > n * 0.45:
            return cut[:k + (1 if sep == '. ' else 0)].rstrip(' ;')
    k = cut.rfind(' ')
    return cut[:k].rstrip(' ,;') + ' ...'


def was(new, old):
    old = old.strip()
    if old in ('', '-') or old == new:
        return new
    return '%s [was: %s]' % (new, old)


def app(old, add):
    old = old.strip()
    return add if old in ('', '-') else '%s; %s' % (old, add)


def pk_add(cell, names):
    have = [p.strip() for p in cell.split(',') if p.strip() and p.strip() != '-']
    return ', '.join(have + [n for n in names if n not in have]) or '-'


R = lambda new: (lambda old: was(new, old))
A = lambda add: (lambda old: app(old, add))
SET = lambda new: (lambda old: new)


def src_head(sv):
    """The Source version line up to the first '(TrueVision3D ...)' group, else a short form."""
    sv = clean(sv)
    m = re.match(r'^(.*?\(TrueVision3D [^)]*\))', sv)
    if m and len(m.group(1)) <= 200:
        return m.group(1)
    return short(sv, 200)


def modver(sv):
    m = re.match(r'^\s*(\d+\.\d+\.\d+)', sv or '')
    return m.group(1) if m else None


def pks(p):
    return ', '.join(p)


def first_sentence(s):
    s = clean(s)
    k = s.find('. ')
    return s[:k] if 0 < k < 160 else s


def bullets(s):
    """A PORT NOTE Divergences block (bullets joined by the extractor) as one cell: '- A. - B.' -> 'A.; B.'"""
    s = clean(s)
    s = re.sub(r'^-\s+', '', s)
    s = re.sub(r'\s-\s(?=[A-Z(])', '; ', s)
    return s.replace('.; ', '; ')


# ---------------------------------------------------------------------------------------------------------------------
# Explicit rows for Wave 3: hunk replays, configurations, the VV-only loader, header syncs, the retired shim, and the
# rows whose packages or transport need saying (overlaid on the generic rule where it fits)
# ---------------------------------------------------------------------------------------------------------------------
LS = '51__System__LayoutEditor/'
OVR = {
    LS + '01__Core__Loader/Na__LayoutEditor__Loader__.js': {
        4: A("W3-09 (v2.71.5): Styles__SheetImages linked straight after Specification__Read and before WebViewer, "
             "TrueVision's CSS-index order (13 of TrueVision's 14 sheets now listed); module 1.1.8"),
    },
    LS + '03__Core__Config/Na__LayoutEditor__AppConfig__.json': {
        4: A("Wave 3 (v2.71.5): LayoutEditor__Panels__AccordionSections gains 'images' (W3-09) and 'floor-areas' (W3-10) at "
             "TrueVision's positions and now equals TrueVision's; FocusNote gains the room clause (W3-10; the site-plan "
             "clause stays withheld, DR-08 (B)); W3-07 left the file unchanged (TrueVision has no vector-tools entry); the "
             "gate removed the parity test's now-stale AccordionSections allow-list row (FIX-1)"),
    },
    LS + '05__Core__ModeController/Na__LayoutEditor__ModeController__.js': {
        4: A("Wave 3 (v2.71.5), each hunk at TrueVision's site: the Drawing Grid panel after Sheet and Grid / Axes "
             "Attach-Detach with the sheet tools (W3-05, 1.18.10); the Vector Tools panel after Vectors and "
             "Na__LeVec__Initialize after the history's (W3-07, 1.18.11); Sheet Images - Ready, Initialize, "
             "AttachInput / DetachInput, the Images panel after Vector Tools, SectionForKind's picture rule and the "
             "'images' refresh (W3-09, 1.18.12); Floor Areas - the three imports and the @delegate line, the panel last "
             "in the right column, Na__LeArea__Ready, the table's Attach, 'areas' routed to floor-areas, the room rule "
             "(W3-10, 1.18.13); the region grips beside the margin grip (W3-11, 1.18.14)"),
        6: R("the register, statements, publishing and viewer hunks (W4-09, W4-10, W4-13) and the convergence pass "
             "(W5-03, W5-07)"),
    },
    LS + '20__System__Viewports/Na__LayoutEditor__ViewportHandles__.js': {
        4: R("verbatim - TrueVision 1.5.0 taken whole inside the SheetTools hub's atomic change (W3-03 by OC-02, v2.71.5; "
             "W3-06 checked it and did not take it again)"),
    },
    LS + '30__System__SheetTools/Na__LayoutEditor__AxisLock__.js': {
        2: R("1.0.0 (TrueVision3D v2.98.0, 21-Sep-2026; read at b2aa9151) - its INTEGRATION lines; the code was "
             "already TrueVision's (W2-25, W3-03)"),
        4: A("W3-03 (v2.71.5): header only - the PORT NOTE rewritten to the Authored-in form with its Source version; "
             "the code unchanged and TrueVision's"),
        6: R("none (TV 1.0.0 at b2aa9151)"),
    },
    LS + '30__System__SheetTools/Na__LayoutEditor__SheetTools__ContentEditing__.js': {
        2: R("1.0.0 (TrueVision3D v2.55.0, 15-Sep-2026; read at b2aa9151) - the code was already TrueVision's (W3-03)"),
        4: A("W3-03 (v2.71.5): header only - the PORT NOTE rewritten to the Authored-in form (the stale 'Back-port: the "
             "same split applies' line dropped); the code unchanged"),
        6: R("none (TV 1.0.0 at b2aa9151)"),
    },
    LS + '30__System__SheetTools/Na__LayoutEditor__Snapping__.js': {
        4: A("RETIRED - deleted by W3-08 (v2.71.5) once no module imported it (K2 FR-15; TrueVision retired its own shim "
             "too); a byte-exact backup is in the package's scratch (sha1 0ab9be23)"),
        7: R('- (deleted)'),
    },
    LS + '50__Feature__Specification/Na__LayoutEditor__MarginGrip__.js': {
        4: R("verbatim - TrueVision 1.3.0 whole again: W3-03 (v2.71.5) restored 1.1.0's IsMoveAuto term, which reads "
             "false while DR-40 item 7 is held, so the grip still shows under Select only"),
        6: R("none (TV 1.3.0 at b2aa9151)"),
    },
    LS + '57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__Config__.json': {
        4: A("W3-14 (v2.71.5): TrueVision's file text whole at Meta 1.8.0 - the ProjectQr, AreaSchedule, CabinetInfill "
             "and SiteLegend blocks, Meta__Portal and Meta__Infill, the seven tiles, four type names and their labels - "
             "with this app's values: Meta__PortedFrom, the phase wording (W2-37's seam), the scale note's four "
             "architectural scales with the site-plan clause, the two Project Portal tiles hidden by an empty "
             "Element__DrawingTypes while the QR is off (DR-12 (A); W5-05 deletes the two keys), and eleven "
             "ValeVision__SitePlan__ stems (dormant, DR-08 (B))"),
        5: A("W3-14: Element__DrawingTypes and Element__DrawingTypesNote on the two Portal tiles (ValeVision keys); the "
             "Portal block's words are TrueVision's (they name no app) until Adam gives Vale's (DR-43)"),
    },
    LS + '57__Feature__ScrapbookParametric/Na__LayoutEditor__Panel__ScrapbookParametric__.js': {
        5: A("W3-14: the project display name through the facade's Na__CfApi__GetProjectDisplayName (K2 K4) in place of "
             "TrueVision's window.TrueVision__Pwa__ProjectContext read (:290-291); DR-42 keeps the seam here (an offer, "
             "section 6)"),
        8: R("the facade's in-memory accessors only (Na__CfApi__GetLoadedProjectData, GetProjectDisplayName; W0-12)"),
    },
    LS + '54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Insert__.js': {
        5: A("W3-09: two VV GUARD lines - Na__LeTools__VV_HOLD_AUTO_MOVE from HitResolution over the drop's PickUpMove "
             "(DR-40 item 7 held; W3-04 deletes both); written outside W3-09's list, for ratification (W3 gate 4.2)"),
    },
    LS + '54__Feature__SheetImages/Na__LayoutEditor__Styles__SheetImages__.css': {
        5: A("held by W3-18 (its only home is the loader line) and landed byte for byte by W3-09 with that line "
             "(the OC-07 form)"),
    },
    LS + '54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Store__.js': {
        8: R("same-origin `/api/valevision/sheet-images/{upload,reconcile,list}` (W0-18's blueprint) and `/api/health`; "
             "TrueVision's host test removed (policy 13); TODO(OVH-MIGRATION) names what the VPS Flask service answers"),
    },
    LS + '54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Publish__.js': {
        8: R("the project folder is the store of record through Store (Flask); TrueVision's R2 halves (list, upload, "
             "copy, delete) are TODO(OVH-MIGRATION) placeholders; the facade import is only SHEET_IMAGES_ARCHIVE"),
    },
    LS + '60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js': {
        5: A("W3-16 (OC-13): the file name on fields.DocumentId with projectCode through Na__DrawData__GetDocumentCode "
             "(DR-11) - logged as VV 1.12.1; the console prefix and the PDF subject name ValeVision3D"),
    },
}

# Package cells: the row's packages as the gate attributes them, corrected where a package wrote another's file
PK_FIX = {
    LS + '20__System__Viewports/Na__LayoutEditor__ViewportHandles__.js': ['W3-03'],
    LS + '54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Insert__.js': ['W3-02', 'W3-09'],
    LS + '54__Feature__SheetImages/Na__LayoutEditor__Styles__SheetImages__.css': ['W3-18', 'W3-09'],
    LS + '30__System__SheetTools/Na__LayoutEditor__Snapping__.js': ['W3-08'],
}

HUNKLIKE = re.compile(r'hunk|not yet whole|moved code|shim|less one|^new\b', re.I)


def generic(x, loaded_by):
    """The spec for a row whose file Wave 3 took whole (or landed new) at TrueVision's path."""
    f, pk = x['f'], x['pk']
    cells = x['cells']
    sv = f.get('Source version', '')
    par = f.get('Parity', '')
    div = f.get('Divergences', '')
    mv = modver(sv)
    spec = {}
    if sv:
        spec[2] = R('%s - taken whole (%s)' % (src_head(sv), pks(pk)))
    tvcur = cells[3].strip()
    if x['landed']:
        spec[0] = SET('`%s`' % x['rel'])
        spec[1] = SET('same path')
        spec[4] = R('%s - landed %s, %s' % (short(first_sentence(par), 150), pks(pk), REL))
        spec[5] = A('%s: %s' % (pks(pk), short(bullets(div), 220) if div else 'banner and PORT NOTE only'))
    else:
        what = 'TrueVision %s taken whole' % mv if mv else 'taken whole'
        spec[4] = R('%s - %s (%s, %s)' % (short(first_sentence(par), 150), what, pks(pk), REL))
        if div:
            spec[5] = R(short(bullets(div), 240))
    if mv and tvcur not in ('', '-') and tvcur != mv:
        spec[6] = R('%s at b2aa9151 is newer than the %s taken - see the file\'s PORT NOTE' % (tvcur, mv))
    else:
        spec[6] = R('none (TV %s taken whole at b2aa9151)' % mv if mv else 'none (taken whole at b2aa9151)')
    return spec




def spec_for(x, loaded_by):
    """The column functions for one row: the generic rule where the file was taken whole (or landed) with a Source
    version, overlaid by the explicit entry; a row the generic rule does not fit must have an explicit entry."""
    rel = x['rel']
    f = x.get('f', {})
    par = f.get('Parity', '')
    fits = bool(f.get('Source version')) and not HUNKLIKE.search(par) and not x.get('deleted')
    spec = generic(x, loaded_by) if fits else {}
    if rel in OVR:
        for col, fn in OVR[rel].items():
            if col == 5 and col in spec:                     # divergences: the file's own list, then what the wave adds
                spec[col] = (lambda g, o: (lambda old: o(g(old))))(spec[col], fn)
            else:
                spec[col] = fn
    elif not fits:
        raise SystemExit('no explicit entry for a row the generic rule does not fit: %s (%s)' % (rel, par[:60]))
    if x['landed']:
        spec.setdefault(0, SET('`%s`' % rel))
        spec.setdefault(1, SET('same path'))
    if 7 not in spec:
        if loaded_by == '-':
            spec[7] = R('- (nothing imports it yet)')
        else:
            spec[7] = R(loaded_by)
    spec[10] = lambda old, pk=x['pk']: pk_add(old, pk)
    return spec
