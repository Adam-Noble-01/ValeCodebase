/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | VIEW PLACEMENT
   =============================================================================

   FILE       : VghLantern__DrawingEditor__ViewPlacement__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - ViewPlacement
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Fill each sheet frame with its view - three orthographic plus one 3D
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Places one view into each frame body prepared by ViewportFrame.
   - Orthographic slots mount a real Env2d surface, so sheet views are true vector
     linework from the same renderers the editor uses.
   - The 3D slot asks Env3d for an offscreen snapshot of the configured camera preset
     and drops it in as an image; if the 3D stack is unavailable the slot degrades to
     a placeholder rather than blocking the sheet.

   -----------------------------------------------------------------------------

   WHY SHEET VIEWS ARE NOT INTERACTIVE:
   Frames mount through the Env2d pipeline for reuse, then immediately detach the
   pan and zoom controls. A frame that pans under the cursor while a user is reading
   a sheet is a bug, not a feature - the Lantern Editor is where views are explored.

   WHY THE 3D SLOT IS A RASTER IMAGE:
   Vector output of a shaded perspective view is not worth the complexity; a
   high-DPI raster inside a vector sheet is the standard approach and prints
   correctly. Every other view on the sheet stays vector.

   ============================================================================= */

// =============================================================================
// REGION | Drawing View Placement Module
// =============================================================================

const VghLantern__DrawingEditor__ViewPlacement = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Slot Source Kinds and CSS Names
    // ------------------------------------------------------------
    const SOURCE_ENV2D        =  'env2d';
    const SOURCE_ENV3D        =  'env3d';

    const CSS_SNAPSHOT        =  'VghLantern__Sheet__FrameSnapshot';
    const CSS_PLACEHOLDER     =  'VghLantern__Sheet__FramePlaceholder';
    const CSS_FRAME_CAM_EDIT  =  'VghLantern__Sheet__Frame--cameraEdit';      // <-- Blue border while the camera is live

    const MESSAGE_NO_3D       =  '3D view unavailable';
    const MESSAGE_NO_LANTERN  =  'No lantern selected';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Sheet 3D Viewport Build Options
    // ------------------------------------------------------------
    // The sheet's 3D viewport is its own surface, built without the ground grid.
    // The grid is a modelling aid for the live 3D View and the editor panel; on an
    // issued drawing it reads as construction linework that is not part of the
    // lantern. Never created rather than hidden later, so the light rig that shares
    // the helpers group is left completely alone.
    const VGHLANTERN__SHEET_VIEWPORT_OPTIONS  =  { ShowGroundPlane : false };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Live Orthographic Surfaces Keyed by Slot
    // ------------------------------------------------------------
    let VghLantern__ViewPlacement__Surfaces  =  {};                           // <-- slotKey -> Env2d surface
    // ------------------------------------------------------------


    // MODULE VARIABLES | Offscreen 3D Surface Used Only for Snapshots
    // ------------------------------------------------------------
    let VghLantern__ViewPlacement__SnapshotHost     =  null;
    let VghLantern__ViewPlacement__SnapshotSurface  =  null;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Last Composed Output, Retained Past Disposal
    // ------------------------------------------------------------
    // Surfaces are released on mode exit, but Preview and Send still needs the
    // composed views. Capturing the output while the surfaces are live and correctly
    // sized means export works after leaving the Drawing Editor.
    let VghLantern__ViewPlacement__CachedSvgMarkup    =  {};                   // <-- slotKey -> serialised SVG
    let VghLantern__ViewPlacement__CachedSnapshots    =  {};                   // <-- slotKey -> PNG data URL
    let VghLantern__ViewPlacement__CachedSnapshotKeys =  {};                   // <-- slotKey -> fingerprint the snapshot was taken from
    // ------------------------------------------------------------


    // MODULE VARIABLES | Sheet Camera Edit Session
    // ------------------------------------------------------------
    // Double clicking the 3D frame swaps the snapshot for a live orbitable surface.
    // Escape ends the session, re-captures the snapshot from wherever the camera
    // was left, and the chosen camera survives later geometry redraws.
    let VghLantern__ViewPlacement__CameraEdit          =  null;                // <-- Active session, null when idle
    let VghLantern__ViewPlacement__CustomCameraStates  =  {};                  // <-- slotKey -> saved camera, replayed on redraws
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | List the Configured View Slots
    // ------------------------------------------------------------
    function VghLantern__ViewPlacement__Slots() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return [];

        var drawingCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
        var slots       =  drawingCfg['VghLantern__DrawingEditor__Config__ViewSlots'];

        return Array.isArray(slots) ? slots : [];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the View Grid Config Block
    // ------------------------------------------------------------
    function VghLantern__ViewPlacement__GridConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var drawingCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
        return drawingCfg['VghLantern__DrawingEditor__Config__ViewGrid'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show a Placeholder Message in a Frame Body
    // ------------------------------------------------------------
    function VghLantern__ViewPlacement__ShowPlaceholder(bodyElement, messageText) {
        if (!bodyElement) return;
        bodyElement.innerHTML  =  '<p class="' + CSS_PLACEHOLDER + '">' + messageText + '</p>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Orthographic Placement
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Mount a Static Env2d Surface Into a Frame Body
    // ------------------------------------------------------------
    // The controls are detached straight after mount so the frame cannot be panned
    // or zoomed; the surface keeps its own fit-to-extents behaviour.
    function VghLantern__ViewPlacement__MountStaticSurface(bodyElement, viewKey) {
        var Env2d  =  window.VghLantern__Env2d__RenderPipeline;
        if (!Env2d) return null;

        var surface  =  Env2d.VghLantern__Env2d__RenderPipeline__Mount(bodyElement, viewKey);
        if (!surface) return null;

        if (surface.Controls && surface.Controls.Detach) surface.Controls.Detach();
        surface.Controls  =  null;                                            // <-- No pan or zoom on a sheet frame; dimensions stay click-editable

        return surface;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Measure a Frame Body in Paper Millimetres
    // ------------------------------------------------------------
    // The sheet is laid out in pixels derived from paper millimetres at a fixed
    // ratio, so dividing the laid-out box by that ratio recovers the true paper size
    // of the frame. offsetWidth is used rather than a client rect because it is
    // unaffected by the sheet's CSS zoom transform.
    function VghLantern__ViewPlacement__MeasuredBodySizeMm(bodyElement) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!bodyElement || !ConfigLoader) return null;

        var drawingCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
        var sheetCfg    =  drawingCfg['VghLantern__DrawingEditor__Config__Sheet'] || {};
        var pxPerMm     =  (typeof sheetCfg.ScreenPixelsPerMm === 'number' && sheetCfg.ScreenPixelsPerMm > 0)
            ? sheetCfg.ScreenPixelsPerMm
            : 3.2;

        var widthPx   =  bodyElement.offsetWidth;
        var heightPx  =  bodyElement.offsetHeight;
        if (widthPx <= 0 || heightPx <= 0) return null;                        // <-- Not laid out yet

        return { WidthMm : widthPx / pxPerMm, HeightMm : heightPx / pxPerMm };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply the True Paper Scale to a Sheet Surface
    // ------------------------------------------------------------
    // The frame caption quotes the ScaleManager denominator, so the viewBox must
    // span exactly (frame paper size x denominator) model millimetres. Left to its
    // own devices the Env2d pipeline fits each view to its frame independently,
    // which silently gives every view a different scale.
    function VghLantern__ViewPlacement__ApplyTrueScale(surface, slot, geometry, cellMetrics) {
        var ScaleManager   =  window.VghLantern__DrawingEditor__ScaleManager;
        var ViewportFrame  =  window.VghLantern__DrawingEditor__ViewportFrame;
        var CoordHelpers   =  window.VghLantern__Env2d__CoordHelpers;
        if (!ScaleManager || !ViewportFrame || !CoordHelpers) return;
        if (!surface || !surface.Instance || !geometry || !geometry.Skeleton) return;

        var extents   =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ExtentsOfSkeleton(
            geometry.Skeleton, slot.ViewKey || slot.Key
        );
        if (!extents) return;

        // Measure the frame body that was actually laid out rather than the cell the
        // grid was asked for. The notes block takes its height off the grid, so the
        // two differ - and a viewBox whose aspect does not match its box gets
        // letterboxed by preserveAspectRatio, quietly drawing under the quoted scale.
        var bodySize  =  VghLantern__ViewPlacement__MeasuredBodySizeMm(surface.HostElement);

        if (!bodySize && cellMetrics) {
            bodySize  =  ViewportFrame.VghLantern__DrawingEditor__ViewportFrame__SlotBodySizeMm(slot, cellMetrics);
        }
        if (!bodySize) return;

        var denominator  =  ScaleManager.VghLantern__DrawingEditor__ScaleManager__GetDenominator();
        var spanX        =  bodySize.WidthMm  * denominator;
        var spanY        =  bodySize.HeightMm * denominator;
        var centreX      =  (extents.MinX + extents.MaxX) / 2;
        var centreY      =  (extents.MinY + extents.MaxY) / 2;

        surface.Instance.SetViewBox({
            MinX   : centreX - (spanX / 2),
            MinY   : centreY - (spanY / 2),
            Width  : spanX,
            Height : spanY
        });

        surface.HasFitOnce  =  true;                                          // <-- Stops the pipeline's fit pass overriding the scale
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place One Orthographic View
    // ------------------------------------------------------------
    async function VghLantern__ViewPlacement__PlaceOrthographic(slot, bodyElement, geometry, lantern, cellMetrics) {
        var Env2d  =  window.VghLantern__Env2d__RenderPipeline;
        if (!Env2d) return false;

        var surface  =  VghLantern__ViewPlacement__Surfaces[slot.Key];

        // Remount when the body element has been rebuilt by a sheet redraw.
        if (!surface || surface.HostElement !== bodyElement) {
            if (surface) Env2d.VghLantern__Env2d__RenderPipeline__Dispose(surface);
            surface  =  VghLantern__ViewPlacement__MountStaticSurface(bodyElement, slot.ViewKey || slot.Key);
            VghLantern__ViewPlacement__Surfaces[slot.Key]  =  surface;
        }

        if (!surface) return false;

        // Scale is re-applied every pass because the extents move with the geometry.
        VghLantern__ViewPlacement__ApplyTrueScale(surface, slot, geometry, cellMetrics);

        var didRender  =  await Env2d.VghLantern__Env2d__RenderPipeline__Render(
            surface, geometry ? geometry.Skeleton : null, geometry ? geometry.BarSet : null, lantern
        );

        VghLantern__ViewPlacement__StripConstructionGrid(surface);
        return didRender;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Remove the Construction Grid From a Sheet View
    // ------------------------------------------------------------
    // The grid is a modelling aid for the editor viewport. On a sheet it reads as
    // linework that is not part of the lantern, and it is the first thing a joiner
    // would query. Cleared after the render rather than suppressed inside the
    // renderer, so the editor viewport keeps its grid untouched.
    function VghLantern__ViewPlacement__StripConstructionGrid(surface) {
        var gridCfg  =  VghLantern__ViewPlacement__GridConfig();
        if (gridCfg.ShowConstructionGrid === true) return;

        if (surface && surface.Instance && surface.Instance.ClearLayer) {
            surface.Instance.ClearLayer('grid');
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Three Dimensional Placement
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Create the Offscreen Host for 3D Snapshots
    // ------------------------------------------------------------
    // Positioned off-canvas rather than display:none, because a hidden element has
    // no measurable size and the renderer needs real dimensions to size its buffer.
    function VghLantern__ViewPlacement__EnsureSnapshotHost() {
        if (VghLantern__ViewPlacement__SnapshotHost) return VghLantern__ViewPlacement__SnapshotHost;

        var host  =  document.createElement('div');
        host.className     =  'VghLantern__Sheet__SnapshotStage';
        host.style.cssText =  'position:absolute;left:-10000px;top:0;width:1200px;height:900px;';
        document.body.appendChild(host);

        VghLantern__ViewPlacement__SnapshotHost  =  host;
        return host;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render the Offscreen 3D Surface for the Active Lantern
    // ------------------------------------------------------------
    async function VghLantern__ViewPlacement__PrepareSnapshotSurface(geometry, lantern) {
        var Env3d  =  window.VghLantern__Env3d__RenderPipeline;
        if (!Env3d || !lantern || !geometry || !geometry.Skeleton) return null;

        var host  =  VghLantern__ViewPlacement__EnsureSnapshotHost();

        if (!VghLantern__ViewPlacement__SnapshotSurface) {
            VghLantern__ViewPlacement__SnapshotSurface  =  Env3d.VghLantern__Env3d__RenderPipeline__Mount(
                host, VGHLANTERN__SHEET_VIEWPORT_OPTIONS
            );
        }
        if (!VghLantern__ViewPlacement__SnapshotSurface) return null;

        await Env3d.VghLantern__Env3d__RenderPipeline__Render(
            VghLantern__ViewPlacement__SnapshotSurface, geometry.Skeleton, geometry.BarSet, lantern
        );

        return VghLantern__ViewPlacement__SnapshotSurface;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Fingerprint the Inputs a Snapshot Depends On
    // ------------------------------------------------------------
    // The snapshot is a pure function of the lantern config and the camera preset,
    // so re-entering the mode with neither changed can reuse the cached image and
    // skip mounting a WebGL surface entirely.
    function VghLantern__ViewPlacement__SnapshotKey(slot, lantern) {
        try {
            return (slot.PresetKey || '') + '|' + JSON.stringify(lantern || null);
        } catch (e) {
            return null;                                                       // <-- Unserialisable lantern: never reuse
        }
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Show a Snapshot Image and Arm the Camera Edit Entry
    // ------------------------------------------------------------
    // draggable=false keeps a stray left drag from starting a native image drag,
    // which would eat the double click that opens the camera edit.
    function VghLantern__ViewPlacement__InjectSnapshotImage(slot, bodyElement, dataUrl, geometry, lantern) {
        bodyElement.innerHTML  =  '<img class="' + CSS_SNAPSHOT + '" draggable="false" src="' + dataUrl + '" alt="' +
                                  (slot.Label || '3D view') + '">';
        VghLantern__ViewPlacement__BindCameraEditEntry(slot, bodyElement, geometry, lantern);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place the 3D View as a Snapshot Image
    // ------------------------------------------------------------
    async function VghLantern__ViewPlacement__PlaceThreeDimensional(slot, bodyElement, geometry, lantern) {
        var Env3d  =  window.VghLantern__Env3d__RenderPipeline;
        if (!Env3d) {
            VghLantern__ViewPlacement__ShowPlaceholder(bodyElement, MESSAGE_NO_3D);
            return false;
        }

        // Reuse the cached snapshot when nothing it depends on has changed.
        var snapshotKey  =  VghLantern__ViewPlacement__SnapshotKey(slot, lantern);
        var cachedUrl    =  VghLantern__ViewPlacement__CachedSnapshots[slot.Key];
        if (cachedUrl && snapshotKey && VghLantern__ViewPlacement__CachedSnapshotKeys[slot.Key] === snapshotKey) {
            VghLantern__ViewPlacement__InjectSnapshotImage(slot, bodyElement, cachedUrl, geometry, lantern);
            return true;
        }

        var surface  =  await VghLantern__ViewPlacement__PrepareSnapshotSurface(geometry, lantern);
        if (!surface) {
            VghLantern__ViewPlacement__ShowPlaceholder(bodyElement, MESSAGE_NO_LANTERN);
            return false;
        }

        // A camera the user set by hand outlives geometry redraws; the preset is
        // only the starting point before any edit has happened.
        var dataUrl;
        var customCamera  =  VghLantern__ViewPlacement__CustomCameraStates[slot.Key];
        if (customCamera && Env3d.VghLantern__Env3d__RenderPipeline__SetCameraState) {
            Env3d.VghLantern__Env3d__RenderPipeline__SetCameraState(surface, customCamera);
            dataUrl  =  Env3d.VghLantern__Env3d__RenderPipeline__Snapshot(surface, null);
        } else {
            dataUrl  =  Env3d.VghLantern__Env3d__RenderPipeline__SnapshotPreset(surface, slot.PresetKey, null);
        }

        if (!dataUrl) {
            VghLantern__ViewPlacement__ShowPlaceholder(bodyElement, MESSAGE_NO_3D);
            return false;
        }

        VghLantern__ViewPlacement__InjectSnapshotImage(slot, bodyElement, dataUrl, geometry, lantern);

        VghLantern__ViewPlacement__CachedSnapshots[slot.Key]     =  dataUrl;
        VghLantern__ViewPlacement__CachedSnapshotKeys[slot.Key]  =  snapshotKey;
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sheet Camera Edit Session
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Arm the Double Click Entry on a 3D Frame Body
    // ------------------------------------------------------------
    // Args are stored on the element rather than closed over, so a body that
    // survives several placements always enters the session with current data.
    function VghLantern__ViewPlacement__BindCameraEditEntry(slot, bodyElement, geometry, lantern) {
        bodyElement.__VghLantern__CameraEditArgs  =  { Slot: slot, Geometry: geometry, Lantern: lantern };

        if (bodyElement.__VghLantern__CameraEditBound) return;
        bodyElement.__VghLantern__CameraEditBound  =  true;

        bodyElement.addEventListener('dblclick', function(e) {
            e.stopPropagation();                                              // <-- The sheet host must not treat this as navigation
            var args  =  bodyElement.__VghLantern__CameraEditArgs;
            if (!args) return;
            void VghLantern__ViewPlacement__EnterCameraEdit(args.Slot, bodyElement, args.Geometry, args.Lantern);
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Begin a Live Camera Edit Inside the 3D Frame
    // ------------------------------------------------------------
    async function VghLantern__ViewPlacement__EnterCameraEdit(slot, bodyElement, geometry, lantern) {
        var Env3d  =  window.VghLantern__Env3d__RenderPipeline;
        if (!Env3d || !geometry || !geometry.Skeleton || !lantern) return;

        if (VghLantern__ViewPlacement__CameraEdit) {
            VghLantern__ViewPlacement__ExitCameraEdit(false);                  // <-- Only one live camera at a time
        }

        bodyElement.innerHTML  =  '';
        var surface  =  Env3d.VghLantern__Env3d__RenderPipeline__Mount(bodyElement, VGHLANTERN__SHEET_VIEWPORT_OPTIONS);
        if (!surface) {
            VghLantern__ViewPlacement__ShowPlaceholder(bodyElement, MESSAGE_NO_3D);
            return;
        }

        await Env3d.VghLantern__Env3d__RenderPipeline__Render(surface, geometry.Skeleton, geometry.BarSet, lantern);

        var savedCamera  =  VghLantern__ViewPlacement__CustomCameraStates[slot.Key];
        if (savedCamera && Env3d.VghLantern__Env3d__RenderPipeline__SetCameraState) {
            Env3d.VghLantern__Env3d__RenderPipeline__SetCameraState(surface, savedCamera);
        } else {
            Env3d.VghLantern__Env3d__RenderPipeline__ApplyPreset(surface, slot.PresetKey);
        }

        var frameElement  =  bodyElement.parentElement;
        if (frameElement) frameElement.classList.add(CSS_FRAME_CAM_EDIT);

        function VghLantern__ViewPlacement__OnCameraEditKey(e) {
            if (e.key !== 'Escape') return;
            e.stopPropagation();                                              // <-- Escape belongs to the session, not the app hotkeys
            e.preventDefault();
            VghLantern__ViewPlacement__ExitCameraEdit(false);
        }
        document.addEventListener('keydown', VghLantern__ViewPlacement__OnCameraEditKey, true);

        VghLantern__ViewPlacement__CameraEdit  =  {
            Slot         : slot,
            BodyElement  : bodyElement,
            FrameElement : frameElement,
            Surface      : surface,
            Geometry     : geometry,
            Lantern      : lantern,
            OnKey        : VghLantern__ViewPlacement__OnCameraEditKey
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | End the Camera Edit and Recapture the Snapshot
    // ------------------------------------------------------------
    // skipCapture is used on teardown paths where the DOM or surfaces are already
    // going away; the previous cached snapshot then remains in force.
    function VghLantern__ViewPlacement__ExitCameraEdit(skipCapture) {
        var edit  =  VghLantern__ViewPlacement__CameraEdit;
        if (!edit) return;
        VghLantern__ViewPlacement__CameraEdit  =  null;

        document.removeEventListener('keydown', edit.OnKey, true);
        if (edit.FrameElement) edit.FrameElement.classList.remove(CSS_FRAME_CAM_EDIT);

        var Env3d  =  window.VghLantern__Env3d__RenderPipeline;

        if (!skipCapture && Env3d) {
            if (Env3d.VghLantern__Env3d__RenderPipeline__GetCameraState) {
                var cameraState  =  Env3d.VghLantern__Env3d__RenderPipeline__GetCameraState(edit.Surface);
                if (cameraState) VghLantern__ViewPlacement__CustomCameraStates[edit.Slot.Key]  =  cameraState;
            }

            var dataUrl  =  Env3d.VghLantern__Env3d__RenderPipeline__Snapshot(edit.Surface, null);
            if (dataUrl) {
                VghLantern__ViewPlacement__CachedSnapshots[edit.Slot.Key]     =  dataUrl;
                VghLantern__ViewPlacement__CachedSnapshotKeys[edit.Slot.Key]  =  VghLantern__ViewPlacement__SnapshotKey(edit.Slot, edit.Lantern);
            }
        }

        if (Env3d) Env3d.VghLantern__Env3d__RenderPipeline__Dispose(edit.Surface);

        // Put the (possibly refreshed) snapshot back into the frame.
        var cachedUrl  =  VghLantern__ViewPlacement__CachedSnapshots[edit.Slot.Key];
        if (cachedUrl) {
            VghLantern__ViewPlacement__InjectSnapshotImage(edit.Slot, edit.BodyElement, cachedUrl, edit.Geometry, edit.Lantern);
        } else {
            VghLantern__ViewPlacement__ShowPlaceholder(edit.BodyElement, MESSAGE_NO_3D);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Placement Orchestration
// -----------------------------------------------------------------------------

    // FUNCTION | Place Every Configured View Into a Rendered Sheet
    // ------------------------------------------------------------
    // Returns the count of slots that produced real output, which the layout uses to
    // decide whether the sheet is worth offering for export. sheetSize drives the
    // true-scale viewBox on the orthographic slots.
    async function VghLantern__DrawingEditor__ViewPlacement__PlaceAll(sheetElement, geometry, lantern, sheetSize) {
        var ViewportFrame  =  window.VghLantern__DrawingEditor__ViewportFrame;
        if (!sheetElement || !ViewportFrame) return 0;

        // A sheet rebuild orphans a live camera edit's DOM, so close it first.
        if (VghLantern__ViewPlacement__CameraEdit) VghLantern__ViewPlacement__ExitCameraEdit(true);

        var cellMetrics  =  sheetSize
            ? ViewportFrame.VghLantern__DrawingEditor__ViewportFrame__CellSizeMm(sheetSize)
            : null;

        var slots       =  VghLantern__ViewPlacement__Slots();
        var placedCount =  0;
        var i, slot, body, didPlace;

        for (i = 0; i < slots.length; i++) {
            slot  =  slots[i];
            body  =  ViewportFrame.VghLantern__DrawingEditor__ViewportFrame__FindBody(sheetElement, slot.Key);
            if (!body) continue;

            if (slot.Source === SOURCE_ENV3D) {
                didPlace  =  await VghLantern__ViewPlacement__PlaceThreeDimensional(slot, body, geometry, lantern);
            } else if (slot.Source === SOURCE_ENV2D) {
                didPlace  =  await VghLantern__ViewPlacement__PlaceOrthographic(slot, body, geometry, lantern, cellMetrics);
            } else {
                VghLantern__ViewPlacement__ShowPlaceholder(body, 'Unknown view source "' + slot.Source + '"');
                didPlace  =  false;
            }

            if (didPlace) placedCount++;
        }

        VghLantern__ViewPlacement__CacheSvgMarkup();                           // <-- Capture while the surfaces are still mounted
        return placedCount;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Snapshot the Live Surfaces Into the Markup Cache
    // ------------------------------------------------------------
    function VghLantern__ViewPlacement__CacheSvgMarkup() {
        var Env2d  =  window.VghLantern__Env2d__RenderPipeline;
        if (!Env2d) return;

        var slotKey;
        for (slotKey in VghLantern__ViewPlacement__Surfaces) {
            if (!Object.prototype.hasOwnProperty.call(VghLantern__ViewPlacement__Surfaces, slotKey)) continue;
            VghLantern__ViewPlacement__CachedSvgMarkup[slotKey]  =  Env2d.VghLantern__Env2d__RenderPipeline__ToSvgMarkup(
                VghLantern__ViewPlacement__Surfaces[slotKey]
            );
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Collect Fit Requests for the Scale Manager
    // ------------------------------------------------------------
    // Built for orthographic slots only, because a perspective view has no scale to
    // fit. Each request pairs a view's model extents with the paper space available.
    function VghLantern__DrawingEditor__ViewPlacement__BuildFitRequests(cellMetrics, geometry) {
        var CoordHelpers   =  window.VghLantern__Env2d__CoordHelpers;
        var ViewportFrame  =  window.VghLantern__DrawingEditor__ViewportFrame;
        if (!CoordHelpers || !ViewportFrame || !cellMetrics || !geometry || !geometry.Skeleton) return [];

        var slots     =  VghLantern__ViewPlacement__Slots();
        var requests  =  [];
        var i, slot, extents, bodySize;

        for (i = 0; i < slots.length; i++) {
            slot  =  slots[i];
            if (slot.Source !== SOURCE_ENV2D) continue;

            extents  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ExtentsOfSkeleton(
                geometry.Skeleton, slot.ViewKey || slot.Key
            );
            if (!extents) continue;

            bodySize  =  ViewportFrame.VghLantern__DrawingEditor__ViewportFrame__SlotBodySizeMm(slot, cellMetrics);
            if (!bodySize) continue;

            requests.push({
                Extents       : extents,
                FrameWidthMm  : bodySize.WidthMm,
                FrameHeightMm : bodySize.HeightMm
            });
        }

        return requests;
    }
    // ------------------------------------------------------------


    // FUNCTION | Serialise Every Orthographic Slot to SVG Markup
    // ------------------------------------------------------------
    // Consumed by the PDF exporter so printed sheets carry true vector linework
    // rather than a screenshot of the on-screen sheet.
    function VghLantern__DrawingEditor__ViewPlacement__CollectSvgMarkup() {
        VghLantern__ViewPlacement__CacheSvgMarkup();                           // <-- Refresh from live surfaces where they exist
        return Object.assign({}, VghLantern__ViewPlacement__CachedSvgMarkup);
    }
    // ------------------------------------------------------------


    // FUNCTION | Collect the 3D Snapshot Data URLs
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__ViewPlacement__CollectSnapshots() {
        return Object.assign({}, VghLantern__ViewPlacement__CachedSnapshots);
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether Any View Output Has Been Composed
    // ------------------------------------------------------------
    // Preview and Send uses this to tell "sheet not composed yet" apart from
    // "sheet composed but every view was empty".
    function VghLantern__DrawingEditor__ViewPlacement__HasComposedOutput() {
        return Object.keys(VghLantern__ViewPlacement__CachedSvgMarkup).length > 0
            || Object.keys(VghLantern__ViewPlacement__CachedSnapshots).length > 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose Every Surface Held by the Placement Layer
    // ------------------------------------------------------------
    // Called on mode exit. The offscreen 3D stage is torn down too, because holding
    // a second GL context alive behind an unused mode is exactly the kind of leak
    // that makes a browser tab feel broken.
    function VghLantern__DrawingEditor__ViewPlacement__DisposeAll() {
        var Env2d  =  window.VghLantern__Env2d__RenderPipeline;
        var Env3d  =  window.VghLantern__Env3d__RenderPipeline;
        var slotKey;

        // A live camera edit holds its own GL surface and a document key listener.
        if (VghLantern__ViewPlacement__CameraEdit) VghLantern__ViewPlacement__ExitCameraEdit(true);

        if (Env2d) {
            for (slotKey in VghLantern__ViewPlacement__Surfaces) {
                if (!Object.prototype.hasOwnProperty.call(VghLantern__ViewPlacement__Surfaces, slotKey)) continue;
                Env2d.VghLantern__Env2d__RenderPipeline__Dispose(VghLantern__ViewPlacement__Surfaces[slotKey]);
            }
        }
        VghLantern__ViewPlacement__Surfaces  =  {};

        if (Env3d && VghLantern__ViewPlacement__SnapshotSurface) {
            Env3d.VghLantern__Env3d__RenderPipeline__Dispose(VghLantern__ViewPlacement__SnapshotSurface);
        }
        VghLantern__ViewPlacement__SnapshotSurface  =  null;

        if (VghLantern__ViewPlacement__SnapshotHost && VghLantern__ViewPlacement__SnapshotHost.parentNode) {
            VghLantern__ViewPlacement__SnapshotHost.parentNode.removeChild(VghLantern__ViewPlacement__SnapshotHost);
        }
        VghLantern__ViewPlacement__SnapshotHost  =  null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__ViewPlacement__PlaceAll             : VghLantern__DrawingEditor__ViewPlacement__PlaceAll,
        VghLantern__DrawingEditor__ViewPlacement__BuildFitRequests      : VghLantern__DrawingEditor__ViewPlacement__BuildFitRequests,
        VghLantern__DrawingEditor__ViewPlacement__CollectSvgMarkup      : VghLantern__DrawingEditor__ViewPlacement__CollectSvgMarkup,
        VghLantern__DrawingEditor__ViewPlacement__CollectSnapshots      : VghLantern__DrawingEditor__ViewPlacement__CollectSnapshots,
        VghLantern__DrawingEditor__ViewPlacement__HasComposedOutput     : VghLantern__DrawingEditor__ViewPlacement__HasComposedOutput,
        VghLantern__DrawingEditor__ViewPlacement__DisposeAll            : VghLantern__DrawingEditor__ViewPlacement__DisposeAll
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__ViewPlacement  =  VghLantern__DrawingEditor__ViewPlacement;
