// =============================================================================
// VALEVISION3D - DRAWING VIEW CORE - SECTION ADAPTER
// =============================================================================
//
// FILE       : Na__DrawView__SectionAdapter__.js
// NAMESPACE  : Na__DrawSection
// MODULE     : Drawing View Core - Section Adapter
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Drive the existing Cross Sections tool as the cut engine for 2D drawings
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - A floor plan is a horizontal cut; a section is a vertical one. ValeVision
//   already has a cut engine - the multi-plane, gizmo-driven Cross Sections
//   tool bound to carousel scenes - so a drawing borrows it rather than
//   carrying a second engine (plan decision D07). This module presents the
//   small, single-plane surface TrueVision's mode controllers were written
//   against on top of that tool:
//
//       UpsertHorizontalPlane(id, cutHeightMm, depthMm)     floor plans
//       UpsertVerticalPlane(id, nx, nz, distanceMm, depthMm) sections
//       SetPlaneDistanceMm / SetPlaneHeightMm(id, mm, live)  slider drags
//       SetActivePlane(id | null)   RemovePlane(id)   RenderOverlay(camera)
//
// - THE LIVE TOOL'S STATE IS NEVER LOST. On the first drawing plane the
//   tool's sections are serialised and cleared, and the project's feature
//   flag is switched on for the duration if it was off. When the last drawing
//   plane goes, the snapshot is applied back and the flag restored, so a
//   section the author placed on a 3D scene is exactly where they left it.
// - The drawing plane has no gizmo (the slider is its handle). Its cap fill
//   and outline are the tool's own meshes, which already draw correctly
//   through the orthographic camera because the overlay renders after the
//   composer, but they take THE DRAWING COLOURS from the drawing config (the
//   Doous look, dark grey poche and profile) rather than the tool's current
//   appearance. The tool's colours are part of the parked snapshot, so they
//   come back with its sections.
// - A PLAIN ELEVATION HOLDS THE TOOL WITHOUT A PLANE. SuspendLiveTool parks
//   the tool and holds it parked, so a section the author bound to a 3D scene
//   never appears across a whole-building drawing, and flipping between a
//   section and a plain elevation does not thrash the author's sections in
//   and out. Release hands the tool back; nothing else does while held.
// - Live slider drags go through the tool's additive
//   Na__CrossSection__SetSectionPositionMm export, which is the gizmo drag
//   path without the raycast: throttled caps while dragging, exact on release.
// - Material swaps made by the drawing presets after the cut is applied need
//   the clip planes re-assigned; ReapplyClipping does that through the tool.
// - THE OFFSCREEN RENDERS AND THE DEPTH FOG COME THROUGH HERE TOO, never
//   through the tool's own folder, so the files that make them carry the
//   same imports in both apps. Six more calls, all but one handed straight
//   to the tool:
//
//       Serialize() / Apply(snapshot)        the tool's sections, saved and
//                                            put back around a 3D render
//       GetOutlineWidthPx()                  the cut outline width, which a
//       SetOutlineWidthPx(widthPx)           sheet viewport's weight overrides
//       SetModelRoot(modelRoot)              a no-op: design phases are dormant
//       RenderDepthInto(camera)              the cut faces into a depth buffer
//                                            the depth fog is building
//
// INTEGRATION:
// - Na__FloorPlan__ModeController__ and the elevation controller call this in
//   place of TrueVision's Na__SectionCut__Engine__.
// - The six calls are for the Layout Editor's snapshot renderer (sections
//   around a 3D render, a viewport's Section Outline weight) and the depth
//   fog's render layer in 49__System__ElevationDepthFog (the cut faces' depth).
// - Requires the Cross Sections tool to be initialised (index.html does that
//   during the loading sequence).
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, ValeVision3D v2.18.0, port Phase 2), presenting the
//                   public surface of TrueVision3D's section engine (41__System__SectionCutEngine/
//                   Na__SectionCut__Engine__.js, not ported) over the live Cross Sections tool
// - Twin          : TrueVision3D 02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js,
//                   ported FROM this file's 1.2.0, interface only: the same 13 exports as pass-throughs
// - Source version: 1.0.0 (TrueVision3D v2.21.0, 10-Sep-2026; read at b2aa9151) for the twin. The six calls of
//                   R6 F.8 C25 stand for TrueVision3D's own calls at the same pin: Na__SectSerialize__Serialize and
//                   __Apply (1.0.0, v2.21.0), the ConfigState appearance width, and the engine's SetModelRoot and
//                   RenderDepthInto (engine 1.2.0; RenderDepthInto arrived in TrueVision3D v2.94.0, 20-Sep-2026)
// - Ported on     : 02-Oct-2026 for ValeVision3D v2.71.4 (version 1.3.0: the six calls)
// - Parity        : diverged (DIV-2: TrueVision3D's FILE, MODULE, banner and export names, the six included as
//                   F.8 C25 fixes them for both apps; ValeVision3D's body)
// - Divergences   :
//   - The body drives 41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js, the live user tool,
//     instead of a dedicated engine; NAMESPACE keeps the private Na__DrawSection (K2 H3).
//   - SuspendLiveTool and Release park and hand back the author's sections, colours and feature flag, and the
//     drawing cut takes the drawing colours from the drawing config while parked (TrueVision3D's are no-ops).
//   - Slider drags are clamped to the model bounds plus a margin, as the tool's own gizmo drag is.
//   - The overlay is the tool's own; there is no separate cap mesh module.
//   - GetPlaneDefinition answers { normal : [x, y, z], positionMm, depthMm }, positionMm along the normal with the
//     TD06 sign (DR-41); TrueVision3D's twin answers { id, normal : { x, y, z }, positionMm, depthMm, enabled }
//     with the opposite sign. Nothing in either app reads it yet.
//   - The six calls of F.8 C25 have ValeVision3D bodies over the tool: Serialize / Apply are its
//     SerializeSections / ApplySerializedSections (the TD06 snapshot); the outline width is its appearance
//     (GetAppearance / SetLineWidth), and a width that is not a positive number changes nothing; SetModelRoot is
//     a no-op that answers false, design phases being dormant (DR-09); RenderDepthInto draws the tool's cap root
//     (fills and outlines, never a gizmo) into the bound target with autoClear off, clearing and binding nothing.
//   - TrueVision3D's twin at b2aa9151 has the 13 exports only; its snapshot renderer and its 49 render layer
//     still import the six calls' counterparts from its 41 folder.
// - Back-port     : WT-02 (TrueVision lane, DR-36; DR-42 item 1): the six names as thin pass-throughs in
//                   TrueVision3D's twin, with its snapshot renderer and 49 render layer pointed at them.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.3.0 (the six section calls, v2.71.4)
// - Serialize, Apply, GetOutlineWidthPx, SetOutlineWidthPx, SetModelRoot and
//   RenderDepthInto beside the thirteen: the six names R6 F.8 C25 fixes for
//   both apps, so the Layout Editor's snapshot renderer and the depth fog's
//   render layer stop importing the tool's folder for sections.
// - Each hands straight to the Cross Sections tool. Serialize and Apply are
//   its TD06 snapshot pair; the outline width is its appearance, and a width
//   that is not a positive number changes nothing; RenderDepthInto draws its
//   cap root alone into the bound target, clearing nothing. SetModelRoot is a
//   no-op that answers false while design phases are dormant (DR-09).
// - The thirteen are untouched.
//
// 09-Sep-2026 - Version 1.2.0
// - FIX: a vertical drawing plane kept the viewer's side of the model, so a
//   section showed the near facade instead of the cut. The tool's normal now
//   points AWAY from the viewer (the kept side) and live distance updates
//   carry the same sign (port Phase 4). GetPlaneDefinition added.
//
// 09-Sep-2026 - Version 1.1.0
// - Drawing cut colours applied from the drawing config while parked (port
//   Phase 3, the Doous section look); SuspendLiveTool and Release added so a
//   plain elevation holds the tool without a plane; plane name prefix read
//   from config.
//
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 2.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Core
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Math Utilities
    // ------------------------------------------------------------
    import {
        Na__Math__ConvertMmToUnits,
        Na__Math__ConvertUnitsToMm
    } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Cross Sections Tool (the engine being driven)
    // ------------------------------------------------------------
    // @delegate: ../41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js
    // ------------------------------------------------------------
    import {
        Na__CrossSection__IsFeatureEnabled,
        Na__CrossSection__SetFeatureEnabled,
        Na__CrossSection__AddSectionFromHit,
        Na__CrossSection__RemoveSection,
        Na__CrossSection__RemoveAllSections,
        Na__CrossSection__SetSectionGizmoVisible,
        Na__CrossSection__SetSliceDepthM,
        Na__CrossSection__SerializeSections,
        Na__CrossSection__ApplySerializedSections,
        Na__CrossSection__SetSectionPositionMm,
        Na__CrossSection__GetSectionById,
        Na__CrossSection__ReapplyClipping,
        Na__CrossSection__GetAppearance,
        Na__CrossSection__SetFillColor,
        Na__CrossSection__SetLineColor,
        Na__CrossSection__SetLineWidth,
        Na__CrossSection__RenderDepthInto
    } from '../41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Overlay Renderer (caps and outlines after the composer)
    // ------------------------------------------------------------
    import { Na__SectionClipping__GetOverlayRenderer } from '../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Drawing Config (cut appearance and plane naming)
    // ------------------------------------------------------------
    // @delegate: ./Na__DrawView__ConfigState__.js
    // ------------------------------------------------------------
    import { Na__DrawCfg__GetSectionSetup } from './Na__DrawView__ConfigState__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Tool Placement Modes and Naming
    // ------------------------------------------------------------
    const Na__DrawSection__MODE_PLAN    = 'PLAN';            // <-- Horizontal cut, keeps everything below the plane
    const Na__DrawSection__MODE_UPRIGHT = 'UPRIGHT';         // <-- Vertical cut, keeps the viewer's side
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Drawing Planes and the Live Tool's Parked State
    // ------------------------------------------------------------
    const Na__DrawSection__Planes         = new Map();  // <-- planeId -> { sectionId, normal, depthMm }
    let   Na__DrawSection__Snapshot       = null;       // <-- The live tool's sections, parked while a drawing cuts
    let   Na__DrawSection__FeatureWasOn   = true;       // <-- Project flag to restore on release
    let   Na__DrawSection__ActiveId       = null;       // <-- The plane currently cutting (one at a time)
    let   Na__DrawSection__Held           = false;      // <-- A drawing holds the tool parked even with no plane
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Parking and Restoring the Live Tool
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Take the Live Tool's State Before the First Drawing Plane
    // ------------------------------------------------------------
    function Na__DrawSection__Park() {
        if (Na__DrawSection__Snapshot) return;                                   // <-- Already parked

        const look = Na__CrossSection__GetAppearance();                          // <-- The tool's colours come back with its sections
        Na__DrawSection__FeatureWasOn = Na__CrossSection__IsFeatureEnabled();
        Na__DrawSection__Snapshot     = Na__DrawSection__FeatureWasOn
            ? Na__CrossSection__SerializeSections()
            : { gizmosVisible : true, sliceDepthM : null, sections : [],         // <-- A disabled tool holds no sections
                fillColor : look.fillColor, lineColor : look.lineColor, lineWidthPx : look.lineWidthPx };

        if (!Na__DrawSection__FeatureWasOn) Na__CrossSection__SetFeatureEnabled(true); // <-- The drawing needs the engine on
        Na__CrossSection__RemoveAllSections();                                   // <-- The drawing plane must be the only cut

        // DRAWING COLOURS | Set while no section exists, so every cap the
        // drawing registers from here is built in them.
        const setup = Na__DrawCfg__GetSectionSetup();
        Na__CrossSection__SetFillColor(setup.fillColour);
        Na__CrossSection__SetLineColor(setup.lineColour);
        Na__CrossSection__SetLineWidth(setup.lineWidthPx);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hand the Tool Back When the Last Drawing Plane Goes
    // ------------------------------------------------------------
    function Na__DrawSection__Restore() {
        if (!Na__DrawSection__Snapshot) return;

        Na__CrossSection__ApplySerializedSections(Na__DrawSection__Snapshot);     // <-- Exact swap back to what the author had
        if (!Na__DrawSection__FeatureWasOn) Na__CrossSection__SetFeatureEnabled(false); // <-- Disabling also clears the (empty) set

        Na__DrawSection__Snapshot = null;
        Na__DrawSection__ActiveId = null;
        Na__DrawSection__Held     = false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plane Records
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Push a Depth (mm, null = infinite) Into the Tool
    // ------------------------------------------------------------
    // The tool's slice depth is global, which is fine: while a drawing cuts,
    // its plane is the only section that exists.
    // ------------------------------------------------------------
    function Na__DrawSection__ApplyDepth(depthMm) {
        Na__CrossSection__SetSliceDepthM((Number.isFinite(depthMm) && depthMm > 0) ? depthMm / 1000 : null);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Register a Plane With the Tool
    // ------------------------------------------------------------
    // normal points toward the KEPT side, matching the tool's own convention;
    // distanceMm is the plane's position along that normal.
    // ------------------------------------------------------------
    function Na__DrawSection__Create(planeId, normal, distanceMm, depthMm, mode, distanceSign) {
        Na__DrawSection__Park();
        Na__DrawSection__ApplyDepth(depthMm);

        const planePoint = normal.clone().multiplyScalar(Na__Math__ConvertMmToUnits(distanceMm)); // <-- Plane passes through position * normal
        const sectionId  = Na__CrossSection__AddSectionFromHit(planePoint, normal, mode);
        if (sectionId === null) {
            console.warn('[ValeVision3D] Drawing cut could not be registered (no model bounds yet).');
            return false;
        }

        const record = Na__CrossSection__GetSectionById(sectionId);
        if (record) record.name = Na__DrawCfg__GetSectionSetup().planeNamePrefix + planeId; // <-- Recognisable in the tool's own panel
        Na__CrossSection__SetSectionGizmoVisible(sectionId, false);              // <-- The slider is the handle

        Na__DrawSection__Planes.set(planeId, {
            sectionId    : sectionId,
            normal       : normal.clone(),
            depthMm      : depthMm,
            distanceSign : (distanceSign === -1) ? -1 : 1                       // <-- Caller's distance to the tool's position along its normal
        });
        Na__DrawSection__ActiveId = planeId;
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Create, or Update in Place, One Plane
    // ------------------------------------------------------------
    function Na__DrawSection__Upsert(planeId, normal, distanceMm, depthMm, mode, distanceSign) {
        if (!planeId || !Number.isFinite(distanceMm)) return false;

        const existing = Na__DrawSection__Planes.get(planeId);
        if (existing && Na__CrossSection__GetSectionById(existing.sectionId)) {
            const sameNormal = existing.normal.distanceToSquared(normal) < 1e-10;
            if (sameNormal) {
                Na__DrawSection__ApplyDepth(depthMm);
                existing.depthMm = depthMm;
                return Na__CrossSection__SetSectionPositionMm(existing.sectionId, distanceMm, false); // <-- Exact recut
            }
            Na__CrossSection__RemoveSection(existing.sectionId);                 // <-- Orientation changed: rebuild
            Na__DrawSection__Planes.delete(planeId);
        }
        return Na__DrawSection__Create(planeId, normal, distanceMm, depthMm, mode, distanceSign);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - The TrueVision Engine Surface
// -----------------------------------------------------------------------------

    // FUNCTION | Create or Update a Horizontal Cut Plane (Floor Plans)
    // ------------------------------------------------------------
    // The plane keeps everything BELOW the cut height, so the normal points
    // down and the plane sits at -cutHeight along it.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__UpsertHorizontalPlane(planeId, cutHeightMm, depthMm) {
        const normal = new THREE.Vector3(0, -1, 0);
        return Na__DrawSection__Upsert(planeId, normal, -cutHeightMm, depthMm, Na__DrawSection__MODE_PLAN);
    }
    // ------------------------------------------------------------


    // FUNCTION | Create or Update a Vertical Cut Plane (Sections)
    // ------------------------------------------------------------
    // viewNormalX/Z points from the building TOWARD the viewer, the direction
    // the elevation camera sits along, and need not arrive normalised.
    // distanceMm is the plane's offset along that direction from the world
    // origin. The tool keeps the side its normal points at, and a section
    // must keep what lies BEYOND the plane, so the tool's normal is the view
    // normal reversed and the position along it is the distance negated.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__UpsertVerticalPlane(planeId, viewNormalX, viewNormalZ, distanceMm, depthMm) {
        const normal = new THREE.Vector3(-viewNormalX, 0, -viewNormalZ);         // <-- Kept side: away from the viewer
        if (normal.lengthSq() < 1e-9) return false;
        normal.normalize();
        return Na__DrawSection__Upsert(planeId, normal, -distanceMm, depthMm, Na__DrawSection__MODE_UPRIGHT, -1);
    }
    // ------------------------------------------------------------


    // FUNCTION | Move a Plane Along Its Normal (Slider Drags)
    // ------------------------------------------------------------
    // liveDrag true keeps the caps throttled; false recomputes them exactly.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__SetPlaneDistanceMm(planeId, distanceMm, liveDrag) {
        const record = Na__DrawSection__Planes.get(planeId);
        if (!record || !Number.isFinite(distanceMm)) return false;
        return Na__CrossSection__SetSectionPositionMm(record.sectionId, record.distanceSign * distanceMm, liveDrag === true);
    }
    // ------------------------------------------------------------


    // FUNCTION | Move a Horizontal Plane to a New Cut Height (Slider Drags)
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__SetPlaneHeightMm(planeId, cutHeightMm, liveDrag) {
        return Na__DrawView__SectionAdapter__SetPlaneDistanceMm(planeId, -cutHeightMm, liveDrag);
    }
    // ------------------------------------------------------------


    // FUNCTION | Make One Plane the Cut (null Removes Every Drawing Plane)
    // ------------------------------------------------------------
    // One drawing plane cuts at a time. Naming a registered plane makes it the
    // only section; null removes every drawing plane, which hands the tool
    // back unless a drawing is holding it (see Release).
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__SetActivePlane(planeId) {
        if (planeId === null || planeId === undefined) {
            const ids = Array.from(Na__DrawSection__Planes.keys());
            for (let i = 0; i < ids.length; i++) Na__DrawView__SectionAdapter__RemovePlane(ids[i]);
            return true;
        }
        if (!Na__DrawSection__Planes.has(planeId)) return false;

        Na__DrawSection__Planes.forEach((record, id) => {
            if (id === planeId) return;
            Na__CrossSection__RemoveSection(record.sectionId);                   // <-- Only the named plane may cut
            Na__DrawSection__Planes.delete(id);
        });
        Na__DrawSection__ActiveId = planeId;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove One Plane; the Last Removal Restores the Live Tool Unless Held
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__RemovePlane(planeId) {
        const record = Na__DrawSection__Planes.get(planeId);
        if (!record) return false;

        Na__CrossSection__RemoveSection(record.sectionId);
        Na__DrawSection__Planes.delete(planeId);
        if (Na__DrawSection__ActiveId === planeId) Na__DrawSection__ActiveId = null;

        if (Na__DrawSection__Planes.size === 0 && !Na__DrawSection__Held) Na__DrawSection__Restore(); // <-- Hand the author's sections back
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Park the Live Tool and Hold It, With or Without a Plane
    // ------------------------------------------------------------
    // A drawing calls this the moment it takes over, before any plane comes
    // or goes. A plain elevation then shows the building whole with the
    // author's own sections out of the way, and a flip between a section and
    // a plain elevation swaps planes without the tool's sections rebuilding
    // in between. Safe to call repeatedly.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__SuspendLiveTool() {
        Na__DrawSection__Park();
        Na__DrawSection__Held = true;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove Every Drawing Plane and Hand the Tool Back
    // ------------------------------------------------------------
    // The one way a drawing ends its use of the tool. Restores the author's
    // sections, colours and feature flag exactly as they were parked.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__Release() {
        Na__DrawSection__Held = false;
        const ids = Array.from(Na__DrawSection__Planes.keys());
        for (let i = 0; i < ids.length; i++) Na__DrawView__SectionAdapter__RemovePlane(ids[i]);
        Na__DrawSection__Restore();                                              // <-- No-op when nothing was parked
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Describe a Registered Plane (null When Absent)
    // ------------------------------------------------------------
    // Returns { normal : [x, y, z] (kept side), positionMm (along it), depthMm }
    // read back from the tool, so a consumer sees the plane as it is cutting.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__GetPlaneDefinition(planeId) {
        const record  = Na__DrawSection__Planes.get(planeId);
        const section = record ? Na__CrossSection__GetSectionById(record.sectionId) : null;
        if (!section || !section.plane) return null;
        return {
            normal     : [ section.plane.normal.x, section.plane.normal.y, section.plane.normal.z ],
            positionMm : Na__Math__ConvertUnitsToMm(-section.plane.constant),
            depthMm    : record.depthMm
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-Assign the Clip Planes After a Material Swap
    // ------------------------------------------------------------
    // The tool writes its clipping planes onto whatever material each mesh
    // holds at the time. A drawing preset that substitutes materials
    // afterwards must call this, or the substitutes render uncut.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__ReapplyClipping() {
        if (Na__DrawSection__Planes.size === 0) return false;
        Na__CrossSection__ReapplyClipping();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Cap Fills and Outlines Through a Camera
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__RenderOverlay(camera) {
        const draw = Na__SectionClipping__GetOverlayRenderer();
        if (typeof draw === 'function' && camera) draw(camera);
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Drawing Plane Currently Cutting?
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__IsCutting() {
        return Na__DrawSection__ActiveId !== null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Which Drawing Plane Is Cutting (null When None)
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__GetActivePlaneId() {
        return Na__DrawSection__ActiveId;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Offscreen Renders and the Depth Fog (R6 F.8 C25)
// -----------------------------------------------------------------------------

    // FUNCTION | Capture the Tool's Sections as a Snapshot
    // ------------------------------------------------------------
    // The tool's own TD06 snapshot, read as it stands: { gizmosVisible,
    // sliceDepthM, fillColor, lineColor, lineWidthPx, sections }. A 3D render
    // takes one before it poses its scene and hands it to Apply afterwards.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__Serialize() {
        return Na__CrossSection__SerializeSections();
    }
    // ------------------------------------------------------------


    // FUNCTION | Put a Snapshot Back on the Tool (a Replacement, Never a Merge)
    // ------------------------------------------------------------
    // true when the tool took it; false when it refused one - no snapshot, the
    // tool not initialised yet, or switched off for the project.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__Apply(snapshot) {
        return Na__CrossSection__ApplySerializedSections(snapshot);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Cut Outline Width in Pixels
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__GetOutlineWidthPx() {
        return Na__CrossSection__GetAppearance().lineWidthPx;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Cut Outline Width in Pixels
    // ------------------------------------------------------------
    // Every outline the tool holds takes it at once, and so does every cut it
    // builds afterwards. A width that is not a positive number changes nothing
    // and answers false: the tool itself would read it as its 2 px fallback.
    // The tool keeps its own 0.5 px floor.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__SetOutlineWidthPx(widthPx) {
        const width = Number(widthPx);
        if (!Number.isFinite(width) || width <= 0) return false;
        Na__CrossSection__SetLineWidth(width);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Point the Cut at Another Model Root (a No-Op Here)
    // ------------------------------------------------------------
    // TrueVision3D puts a design phase's model in the scene for an offscreen
    // render and points its cut engine at it. ValeVision3D's design phases
    // are dormant (DR-09) - no phase is ever entered - so the tool keeps the
    // model root it was initialised with and nothing is re-pointed. Answers
    // false: nothing changed. A live design phase would need a root setter
    // in the tool first.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__SetModelRoot(modelRoot) {
        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Add the Cut Faces to a Depth Buffer Being Built
    // ------------------------------------------------------------
    // For the drawing's depth fog, between its own scene render and its fog
    // quad: the cut faces go into the depth target it has bound, so a poche
    // reads as ON the plane, not as far back as the room behind it. The tool
    // draws its cap root alone - never a gizmo - with autoClear off, and
    // clears and binds nothing. A no-op with nothing cutting, which is every
    // plain elevation. Answers whether anything was drawn.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__RenderDepthInto(camera) {
        return Na__CrossSection__RenderDepthInto(camera);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Drawing Section Adapter API
    // ------------------------------------------------------------
    export {
        Na__DrawView__SectionAdapter__UpsertHorizontalPlane,
        Na__DrawView__SectionAdapter__UpsertVerticalPlane,
        Na__DrawView__SectionAdapter__SetPlaneDistanceMm,
        Na__DrawView__SectionAdapter__SetPlaneHeightMm,
        Na__DrawView__SectionAdapter__SetActivePlane,
        Na__DrawView__SectionAdapter__RemovePlane,
        Na__DrawView__SectionAdapter__SuspendLiveTool,
        Na__DrawView__SectionAdapter__Release,
        Na__DrawView__SectionAdapter__ReapplyClipping,
        Na__DrawView__SectionAdapter__GetPlaneDefinition,
        Na__DrawView__SectionAdapter__RenderOverlay,
        Na__DrawView__SectionAdapter__IsCutting,
        Na__DrawView__SectionAdapter__GetActivePlaneId,
        Na__DrawView__SectionAdapter__Serialize,
        Na__DrawView__SectionAdapter__Apply,
        Na__DrawView__SectionAdapter__GetOutlineWidthPx,
        Na__DrawView__SectionAdapter__SetOutlineWidthPx,
        Na__DrawView__SectionAdapter__SetModelRoot,
        Na__DrawView__SectionAdapter__RenderDepthInto
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
