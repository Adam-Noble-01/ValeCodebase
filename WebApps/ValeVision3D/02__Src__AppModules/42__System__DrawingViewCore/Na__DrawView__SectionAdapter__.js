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
//
// INTEGRATION:
// - Na__FloorPlan__ModeController__ and the elevation controller call this in
//   place of TrueVision's Na__SectionCut__Engine__.
// - Requires the Cross Sections tool to be initialised (index.html does that
//   during the loading sequence).
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/41__System__SectionCutEngine/Na__SectionCut__Engine__.js
//                   (public surface only; the engine itself is not ported)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.18.0 (port Phase 2)
// - Parity        : diverged (D07)
// - Divergences   :
//   - Implemented over Na__CrossSectionView__SystemLogic.js instead of a dedicated engine.
//   - Slider drags are clamped to the model bounds plus a margin, as the tool's own gizmo drag is.
//   - The overlay is the tool's own; there is no separate cap mesh module.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
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
        Na__CrossSection__SetLineWidth
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
        Na__DrawView__SectionAdapter__GetActivePlaneId
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
