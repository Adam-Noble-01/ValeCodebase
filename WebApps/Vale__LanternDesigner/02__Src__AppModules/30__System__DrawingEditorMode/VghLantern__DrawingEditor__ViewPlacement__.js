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

    const MESSAGE_NO_3D       =  '3D view unavailable';
    const MESSAGE_NO_LANTERN  =  'No lantern selected';
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
    let VghLantern__ViewPlacement__CachedSvgMarkup   =  {};                    // <-- slotKey -> serialised SVG
    let VghLantern__ViewPlacement__CachedSnapshots   =  {};                    // <-- slotKey -> PNG data URL
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
        surface.Controls  =  null;

        return surface;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place One Orthographic View
    // ------------------------------------------------------------
    async function VghLantern__ViewPlacement__PlaceOrthographic(slot, bodyElement, geometry, lantern) {
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

        return await Env2d.VghLantern__Env2d__RenderPipeline__Render(
            surface, geometry ? geometry.Skeleton : null, geometry ? geometry.BarSet : null, lantern
        );
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
            VghLantern__ViewPlacement__SnapshotSurface  =  Env3d.VghLantern__Env3d__RenderPipeline__Mount(host);
        }
        if (!VghLantern__ViewPlacement__SnapshotSurface) return null;

        await Env3d.VghLantern__Env3d__RenderPipeline__Render(
            VghLantern__ViewPlacement__SnapshotSurface, geometry.Skeleton, geometry.BarSet, lantern
        );

        return VghLantern__ViewPlacement__SnapshotSurface;
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

        var surface  =  await VghLantern__ViewPlacement__PrepareSnapshotSurface(geometry, lantern);
        if (!surface) {
            VghLantern__ViewPlacement__ShowPlaceholder(bodyElement, MESSAGE_NO_LANTERN);
            return false;
        }

        var dataUrl  =  Env3d.VghLantern__Env3d__RenderPipeline__SnapshotPreset(surface, slot.PresetKey, null);
        if (!dataUrl) {
            VghLantern__ViewPlacement__ShowPlaceholder(bodyElement, MESSAGE_NO_3D);
            return false;
        }

        bodyElement.innerHTML  =  '<img class="' + CSS_SNAPSHOT + '" src="' + dataUrl + '" alt="' +
                                  (slot.Label || '3D view') + '">';

        VghLantern__ViewPlacement__CachedSnapshots[slot.Key]  =  dataUrl;
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Placement Orchestration
// -----------------------------------------------------------------------------

    // FUNCTION | Place Every Configured View Into a Rendered Sheet
    // ------------------------------------------------------------
    // Returns the count of slots that produced real output, which the layout uses to
    // decide whether the sheet is worth offering for export.
    async function VghLantern__DrawingEditor__ViewPlacement__PlaceAll(sheetElement, geometry, lantern) {
        var ViewportFrame  =  window.VghLantern__DrawingEditor__ViewportFrame;
        if (!sheetElement || !ViewportFrame) return 0;

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
                didPlace  =  await VghLantern__ViewPlacement__PlaceOrthographic(slot, body, geometry, lantern);
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
