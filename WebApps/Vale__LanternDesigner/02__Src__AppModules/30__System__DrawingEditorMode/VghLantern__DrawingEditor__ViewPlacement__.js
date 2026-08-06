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
   - Places one view into each frame body built by SheetSurface.
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

   WHY THE 3D SNAPSHOT IS RENDERED AT THE FRAME'S OWN ASPECT:
   The snapshot used to be captured at a fixed 2000 x 1400 buffer whatever shape the
   frame was. On screen the image was letterboxed to fit, on paper it was stretched
   to fill, and the same lantern came out framed differently on the two surfaces. The
   camera is now given the frame's aspect and the buffer is sized from the frame's
   paper millimetres, so the image fills its rectangle exactly on both.

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

    const SNAPSHOT_STAGE_MAX_PX   =  1200;                                    // <-- Longest edge of the offscreen stage; only its aspect matters
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
    // Escape, Enter, or a click anywhere outside the viewport ends the session,
    // re-captures the snapshot from wherever the camera was left, and the chosen
    // camera survives later geometry redraws.
    let VghLantern__ViewPlacement__CameraEdit          =  null;                // <-- Active session, null when idle
    let VghLantern__ViewPlacement__CustomCameraStates  =  {};                  // <-- slotKey -> saved camera, replayed on redraws
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

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


    // SUB FUNCTION | Apply the True Paper Scale to a Sheet Surface
    // ------------------------------------------------------------
    // The frame caption quotes the ScaleManager denominator, so the viewBox must
    // span exactly (frame paper size x denominator) model millimetres. Left to its
    // own devices the Env2d pipeline fits each view to its frame independently,
    // which silently gives every view a different scale.
    //
    // The body rectangle comes from the solved layout rather than from measuring the
    // laid-out element, because that is the rectangle the export will place the view
    // into. Measuring the DOM back would import screen rounding into the scale.
    function VghLantern__ViewPlacement__ApplyTrueScale(surface, placement, geometry) {
        var ScaleManager  =  window.VghLantern__DrawingEditor__ScaleManager;
        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;
        if (!ScaleManager || !CoordHelpers) return;
        if (!surface || !surface.Instance || !geometry || !geometry.Skeleton) return;
        if (!placement || !placement.Body) return;

        var slot     =  placement.Slot;
        var extents  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ExtentsOfSkeleton(
            geometry.Skeleton, slot.ViewKey || slot.Key
        );
        if (!extents) return;

        var denominator  =  ScaleManager.VghLantern__DrawingEditor__ScaleManager__GetDenominator();
        var spanX        =  placement.Body.WidthMm  * denominator;
        var spanY        =  placement.Body.HeightMm * denominator;
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
    async function VghLantern__ViewPlacement__PlaceOrthographic(placement, bodyElement, geometry, lantern) {
        var Env2d  =  window.VghLantern__Env2d__RenderPipeline;
        if (!Env2d) return false;

        var slot     =  placement.Slot;
        var surface  =  VghLantern__ViewPlacement__Surfaces[slot.Key];

        // Remount when the body element has been rebuilt by a sheet redraw.
        if (!surface || surface.HostElement !== bodyElement) {
            if (surface) Env2d.VghLantern__Env2d__RenderPipeline__Dispose(surface);
            surface  =  VghLantern__ViewPlacement__MountStaticSurface(bodyElement, slot.ViewKey || slot.Key);
            VghLantern__ViewPlacement__Surfaces[slot.Key]  =  surface;
        }

        if (!surface) return false;

        // Scale is re-applied every pass because the extents move with the geometry.
        VghLantern__ViewPlacement__ApplyTrueScale(surface, placement, geometry);

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
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var gridCfg  =  VghLantern__ViewPlacement__GridConfig();
        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(
                gridCfg, 'ShowConstructionGrid', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__ViewGrid')) {
            return;
        }

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


    // SUB HELPER FUNCTION | Resolve the Snapshot Pixel Size for a Frame Body
    // ------------------------------------------------------------
    // Sized from the frame's paper millimetres at the configured print density, so
    // the image has the frame's exact aspect and enough pixels to hold up beside
    // vector linework at that size. Returns null when there is no solved body, which
    // leaves the exporter's own defaults in force.
    function VghLantern__ViewPlacement__SnapshotSizePx(placement) {
        if (!placement || !placement.Body) return null;

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var drawingCfg    =  ConfigLoader ? (ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {}) : {};
        var pdfCfg        =  drawingCfg['VghLantern__DrawingEditor__Config__PdfExport'] || {};

        var pixelsPerMm  =  (typeof pdfCfg.SnapshotPixelsPerMm === 'number' && pdfCfg.SnapshotPixelsPerMm > 0)
            ? pdfCfg.SnapshotPixelsPerMm
            : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
                pdfCfg, 'RasterPixelsPerMm', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__PdfExport');

        var widthPx   =  Math.max(64, Math.round(placement.Body.WidthMm  * pixelsPerMm));
        var heightPx  =  Math.max(64, Math.round(placement.Body.HeightMm * pixelsPerMm));

        return { WidthPx : widthPx, HeightPx : heightPx };
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Size the Offscreen Stage to the Frame's Aspect
    // ------------------------------------------------------------
    // The camera preset is fitted against whatever aspect the surface is at when the
    // preset is applied, and the capture then renders at the requested aspect without
    // refitting. If the two disagree the fit is wrong: a frame taller than the stage
    // would have its model clipped at the sides. Sizing the stage first makes the fit
    // and the capture agree. The stage is capped rather than sized in output pixels,
    // because only its shape matters - the capture sets its own buffer size.
    function VghLantern__ViewPlacement__SizeSnapshotHost(host, sizePx) {
        if (!host || !sizePx) return;

        var longest  =  Math.max(sizePx.WidthPx, sizePx.HeightPx);
        var factor   =  (longest > SNAPSHOT_STAGE_MAX_PX) ? (SNAPSHOT_STAGE_MAX_PX / longest) : 1;

        host.style.width   =  Math.max(2, Math.round(sizePx.WidthPx  * factor)) + 'px';
        host.style.height  =  Math.max(2, Math.round(sizePx.HeightPx * factor)) + 'px';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render the Offscreen 3D Surface for the Active Lantern
    // ------------------------------------------------------------
    async function VghLantern__ViewPlacement__PrepareSnapshotSurface(geometry, lantern, sizePx) {
        var Env3d  =  window.VghLantern__Env3d__RenderPipeline;
        if (!Env3d || !lantern || !geometry || !geometry.Skeleton) return null;

        var host  =  VghLantern__ViewPlacement__EnsureSnapshotHost();
        VghLantern__ViewPlacement__SizeSnapshotHost(host, sizePx);

        if (!VghLantern__ViewPlacement__SnapshotSurface) {
            VghLantern__ViewPlacement__SnapshotSurface  =  Env3d.VghLantern__Env3d__RenderPipeline__Mount(
                host, VGHLANTERN__SHEET_VIEWPORT_OPTIONS
            );
        }
        if (!VghLantern__ViewPlacement__SnapshotSurface) return null;

        // Picks up the stage size set above, so the camera aspect is the frame's
        // aspect before any preset is fitted to it.
        if (Env3d.VghLantern__Env3d__RenderPipeline__Resize) {
            Env3d.VghLantern__Env3d__RenderPipeline__Resize(VghLantern__ViewPlacement__SnapshotSurface);
        }

        await Env3d.VghLantern__Env3d__RenderPipeline__Render(
            VghLantern__ViewPlacement__SnapshotSurface, geometry.Skeleton, geometry.BarSet, lantern
        );

        return VghLantern__ViewPlacement__SnapshotSurface;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Fingerprint the Inputs a Snapshot Depends On
    // ------------------------------------------------------------
    // The snapshot is a pure function of the lantern config, the camera preset and
    // the frame it is being drawn into, so re-entering the mode with none of them
    // changed can reuse the cached image and skip mounting a WebGL surface entirely.
    // The frame size is part of the key because the camera is fitted to its aspect.
    function VghLantern__ViewPlacement__SnapshotKey(slot, lantern, sizePx) {
        try {
            return (slot.PresetKey || '') + '|' +
                   (sizePx ? (sizePx.WidthPx + 'x' + sizePx.HeightPx) : 'auto') + '|' +
                   JSON.stringify(lantern || null);
        } catch (e) {
            return null;                                                       // <-- Unserialisable lantern: never reuse
        }
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Show a Snapshot Image and Arm the Camera Edit Entry
    // ------------------------------------------------------------
    // draggable=false keeps a stray left drag from starting a native image drag,
    // which would eat the double click that opens the camera edit.
    function VghLantern__ViewPlacement__InjectSnapshotImage(placement, bodyElement, dataUrl, geometry, lantern) {
        bodyElement.innerHTML  =  '<img class="' + CSS_SNAPSHOT + '" draggable="false" src="' + dataUrl + '" alt="' +
                                  (placement.Slot.Label || '3D view') + '">';
        VghLantern__ViewPlacement__BindCameraEditEntry(placement, bodyElement, geometry, lantern);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place the 3D View as a Snapshot Image
    // ------------------------------------------------------------
    async function VghLantern__ViewPlacement__PlaceThreeDimensional(placement, bodyElement, geometry, lantern) {
        var Env3d  =  window.VghLantern__Env3d__RenderPipeline;
        var slot   =  placement.Slot;
        if (!Env3d) {
            VghLantern__ViewPlacement__ShowPlaceholder(bodyElement, MESSAGE_NO_3D);
            return false;
        }

        // Sized to the frame it is going into, so the same image fills the same
        // rectangle on screen and on paper with no fitting in between.
        var sizePx  =  VghLantern__ViewPlacement__SnapshotSizePx(placement);

        // Reuse the cached snapshot when nothing it depends on has changed.
        var snapshotKey  =  VghLantern__ViewPlacement__SnapshotKey(slot, lantern, sizePx);
        var cachedUrl    =  VghLantern__ViewPlacement__CachedSnapshots[slot.Key];
        if (cachedUrl && snapshotKey && VghLantern__ViewPlacement__CachedSnapshotKeys[slot.Key] === snapshotKey) {
            VghLantern__ViewPlacement__InjectSnapshotImage(placement, bodyElement, cachedUrl, geometry, lantern);
            return true;
        }

        var surface  =  await VghLantern__ViewPlacement__PrepareSnapshotSurface(geometry, lantern, sizePx);
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
            dataUrl  =  Env3d.VghLantern__Env3d__RenderPipeline__Snapshot(surface, sizePx);
        } else {
            dataUrl  =  Env3d.VghLantern__Env3d__RenderPipeline__SnapshotPreset(surface, slot.PresetKey, sizePx);
        }

        if (!dataUrl) {
            VghLantern__ViewPlacement__ShowPlaceholder(bodyElement, MESSAGE_NO_3D);
            return false;
        }

        VghLantern__ViewPlacement__InjectSnapshotImage(placement, bodyElement, dataUrl, geometry, lantern);

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
    function VghLantern__ViewPlacement__BindCameraEditEntry(placement, bodyElement, geometry, lantern) {
        bodyElement.__VghLantern__CameraEditArgs  =  { Placement: placement, Geometry: geometry, Lantern: lantern };

        if (bodyElement.__VghLantern__CameraEditBound) return;
        bodyElement.__VghLantern__CameraEditBound  =  true;

        bodyElement.addEventListener('dblclick', function(e) {
            e.stopPropagation();                                              // <-- The sheet host must not treat this as navigation
            var args  =  bodyElement.__VghLantern__CameraEditArgs;
            if (!args) return;
            void VghLantern__ViewPlacement__EnterCameraEdit(args.Placement, bodyElement, args.Geometry, args.Lantern);
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Begin a Live Camera Edit Inside the 3D Frame
    // ------------------------------------------------------------
    async function VghLantern__ViewPlacement__EnterCameraEdit(placement, bodyElement, geometry, lantern) {
        var Env3d  =  window.VghLantern__Env3d__RenderPipeline;
        var slot   =  placement.Slot;
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
            if (e.key !== 'Escape' && e.key !== 'Enter') return;              // <-- Both commit and exit, same as CAD viewports
            e.stopPropagation();                                              // <-- Session owns these keys, not the app hotkeys
            e.preventDefault();
            VghLantern__ViewPlacement__ExitCameraEdit(false);
        }

        // Clicks inside the frame keep orbiting; anywhere else commits and exits.
        // Capture phase so sheet chrome / UI outside the frame still receive the
        // click after we leave edit - exit does not swallow the event.
        function VghLantern__ViewPlacement__OnCameraEditOutsideClick(e) {
            var frame  =  frameElement || bodyElement;
            if (frame && frame.contains(e.target)) return;                    // <-- Inside the live viewport - keep editing
            VghLantern__ViewPlacement__ExitCameraEdit(false);
        }

        document.addEventListener('keydown', VghLantern__ViewPlacement__OnCameraEditKey, true);
        document.addEventListener('click', VghLantern__ViewPlacement__OnCameraEditOutsideClick, true);

        VghLantern__ViewPlacement__CameraEdit  =  {
            Slot         : slot,
            Placement    : placement,
            BodyElement  : bodyElement,
            FrameElement : frameElement,
            Surface      : surface,
            Geometry     : geometry,
            Lantern      : lantern,
            OnKey        : VghLantern__ViewPlacement__OnCameraEditKey,
            OnOutsideClick : VghLantern__ViewPlacement__OnCameraEditOutsideClick
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
        if (edit.OnOutsideClick) {
            document.removeEventListener('click', edit.OnOutsideClick, true);
        }
        if (edit.FrameElement) edit.FrameElement.classList.remove(CSS_FRAME_CAM_EDIT);

        var Env3d  =  window.VghLantern__Env3d__RenderPipeline;

        if (!skipCapture && Env3d) {
            if (Env3d.VghLantern__Env3d__RenderPipeline__GetCameraState) {
                var cameraState  =  Env3d.VghLantern__Env3d__RenderPipeline__GetCameraState(edit.Surface);
                if (cameraState) {
                    VghLantern__ViewPlacement__CustomCameraStates[edit.Slot.Key]  =  cameraState;
                    VghLantern__ViewPlacement__NotifyCameraChanged();          // <-- The chosen viewpoint is part of the saved sheet setup
                }
            }

            // Re-captured at the frame's own size, so ending a camera edit cannot
            // quietly swap in a snapshot at a different aspect to the one placed.
            var sizePx   =  VghLantern__ViewPlacement__SnapshotSizePx(edit.Placement);
            var dataUrl  =  Env3d.VghLantern__Env3d__RenderPipeline__Snapshot(edit.Surface, sizePx);
            if (dataUrl) {
                VghLantern__ViewPlacement__CachedSnapshots[edit.Slot.Key]     =  dataUrl;
                VghLantern__ViewPlacement__CachedSnapshotKeys[edit.Slot.Key]  =
                    VghLantern__ViewPlacement__SnapshotKey(edit.Slot, edit.Lantern, sizePx);
            }
        }

        if (Env3d) Env3d.VghLantern__Env3d__RenderPipeline__Dispose(edit.Surface);

        // Put the (possibly refreshed) snapshot back into the frame.
        var cachedUrl  =  VghLantern__ViewPlacement__CachedSnapshots[edit.Slot.Key];
        if (cachedUrl) {
            VghLantern__ViewPlacement__InjectSnapshotImage(edit.Placement, edit.BodyElement, cachedUrl, edit.Geometry, edit.Lantern);
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
    // decide whether the sheet is worth offering for export. The solved layout drives
    // both the true-scale viewBox on the orthographic slots and the 3D snapshot size,
    // so every view is composed against the rectangle it will be printed into.
    async function VghLantern__DrawingEditor__ViewPlacement__PlaceAll(sheetElement, geometry, lantern, layout) {
        var SheetSurface  =  window.VghLantern__DrawingEditor__SheetSurface;
        if (!sheetElement || !SheetSurface || !layout) return 0;

        // A sheet rebuild orphans a live camera edit's DOM, so close it first.
        if (VghLantern__ViewPlacement__CameraEdit) VghLantern__ViewPlacement__ExitCameraEdit(true);

        var placedCount =  0;
        var i, placement, body, didPlace;

        for (i = 0; i < layout.Slots.length; i++) {
            placement  =  layout.Slots[i];
            body       =  SheetSurface.VghLantern__DrawingEditor__SheetSurface__FindSlotBody(sheetElement, placement.Slot.Key);
            if (!body) continue;

            if (placement.Slot.Source === SOURCE_ENV3D) {
                didPlace  =  await VghLantern__ViewPlacement__PlaceThreeDimensional(placement, body, geometry, lantern);
            } else if (placement.Slot.Source === SOURCE_ENV2D) {
                didPlace  =  await VghLantern__ViewPlacement__PlaceOrthographic(placement, body, geometry, lantern);
            } else {
                VghLantern__ViewPlacement__ShowPlaceholder(body, 'Unknown view source "' + placement.Slot.Source + '"');
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
    // fit. Each request pairs a view's model extents with the solved body rectangle
    // it has to fit inside, so the chosen scale is the scale that will be drawn.
    function VghLantern__DrawingEditor__ViewPlacement__BuildFitRequests(layout, geometry) {
        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;
        if (!CoordHelpers || !layout || !geometry || !geometry.Skeleton) return [];

        var requests  =  [];
        var i, placement, extents;

        for (i = 0; i < layout.Slots.length; i++) {
            placement  =  layout.Slots[i];
            if (placement.Slot.Source !== SOURCE_ENV2D) continue;

            extents  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ExtentsOfSkeleton(
                geometry.Skeleton, placement.Slot.ViewKey || placement.Slot.Key
            );
            if (!extents) continue;

            requests.push({
                Extents       : extents,
                FrameWidthMm  : placement.Body.WidthMm,
                FrameHeightMm : placement.Body.HeightMm
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


    // FUNCTION | Collect the Saved Sheet Camera States
    // ------------------------------------------------------------
    // Handed to SheetManager so a viewpoint the user set by hand is written onto the
    // project file with the rest of the sheet setup.
    function VghLantern__DrawingEditor__ViewPlacement__CollectCameraStates() {
        return Object.assign({}, VghLantern__ViewPlacement__CustomCameraStates);
    }
    // ------------------------------------------------------------


    // FUNCTION | Restore Sheet Camera States From a Loaded Project
    // ------------------------------------------------------------
    // Cached snapshots are dropped alongside the restore, because an image taken
    // from the previous project's camera would otherwise be reused for a slot whose
    // saved viewpoint has just changed underneath it.
    function VghLantern__DrawingEditor__ViewPlacement__RestoreCameraStates(cameraStates) {
        VghLantern__ViewPlacement__CustomCameraStates  =
            (cameraStates && typeof cameraStates === 'object' && !Array.isArray(cameraStates))
                ? Object.assign({}, cameraStates)
                : {};

        VghLantern__ViewPlacement__CachedSnapshots     =  {};
        VghLantern__ViewPlacement__CachedSnapshotKeys  =  {};
        VghLantern__ViewPlacement__CachedSvgMarkup     =  {};
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Tell the Sheet Manager a Camera Was Changed
    // ------------------------------------------------------------
    function VghLantern__ViewPlacement__NotifyCameraChanged() {
        var SheetManager  =  window.VghLantern__DrawingEditor__SheetManager;
        if (SheetManager && SheetManager.VghLantern__DrawingEditor__SheetManager__NoteCameraChanged) {
            SheetManager.VghLantern__DrawingEditor__SheetManager__NoteCameraChanged();
        }
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


    // FUNCTION | Clear the Composed Output Between Two Sheets
    // ------------------------------------------------------------
    // The markup and snapshot caches are keyed by SLOT, not by lantern, because for
    // the editor there is only ever one lantern on the sheet. A bake composes several
    // in a row through the same caches, so anything left behind by the last one has to
    // go: a slot that fails to render for lantern two would otherwise hand back
    // lantern one's linework, and the descriptor would look perfectly composed.
    //
    // The 2D surfaces are disposed with it - they belong to a sheet element that is
    // about to be discarded. The 3D snapshot surface deliberately survives, because
    // building a GL context per lantern would cost more than everything else in the
    // bake put together, and its own cache is keyed by lantern rather than by slot.
    function VghLantern__DrawingEditor__ViewPlacement__ResetComposedOutput() {
        var Env2d  =  window.VghLantern__Env2d__RenderPipeline;
        var slotKey;

        if (Env2d) {
            for (slotKey in VghLantern__ViewPlacement__Surfaces) {
                if (!Object.prototype.hasOwnProperty.call(VghLantern__ViewPlacement__Surfaces, slotKey)) continue;
                Env2d.VghLantern__Env2d__RenderPipeline__Dispose(VghLantern__ViewPlacement__Surfaces[slotKey]);
            }
        }

        VghLantern__ViewPlacement__Surfaces          =  {};
        VghLantern__ViewPlacement__CachedSvgMarkup   =  {};
        VghLantern__ViewPlacement__CachedSnapshots   =  {};
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
        VghLantern__DrawingEditor__ViewPlacement__CollectCameraStates   : VghLantern__DrawingEditor__ViewPlacement__CollectCameraStates,
        VghLantern__DrawingEditor__ViewPlacement__RestoreCameraStates   : VghLantern__DrawingEditor__ViewPlacement__RestoreCameraStates,
        VghLantern__DrawingEditor__ViewPlacement__HasComposedOutput     : VghLantern__DrawingEditor__ViewPlacement__HasComposedOutput,
        VghLantern__DrawingEditor__ViewPlacement__ResetComposedOutput   : VghLantern__DrawingEditor__ViewPlacement__ResetComposedOutput,
        VghLantern__DrawingEditor__ViewPlacement__DisposeAll            : VghLantern__DrawingEditor__ViewPlacement__DisposeAll
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__ViewPlacement  =  VghLantern__DrawingEditor__ViewPlacement;
