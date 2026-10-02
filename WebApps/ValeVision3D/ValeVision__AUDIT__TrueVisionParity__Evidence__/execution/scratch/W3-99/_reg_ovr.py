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

