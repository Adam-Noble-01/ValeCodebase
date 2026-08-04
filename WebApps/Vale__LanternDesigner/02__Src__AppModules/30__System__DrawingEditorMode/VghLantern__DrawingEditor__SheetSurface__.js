/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | SHEET SURFACE
   =============================================================================

   FILE       : VghLantern__DrawingEditor__SheetSurface__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - SheetSurface
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the on-screen paper sheet, once, for every surface that shows one
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - The only builder of drawing sheet markup in the application. The Drawing Editor
     asks for an interactive sheet with empty frames it then mounts live views into;
     Preview and Send asks for the same sheet with the composed views baked in.
   - Also owns the view framing both surfaces share: rewriting a serialised view's
     viewBox to span exactly one scale window of its frame. The screen and the PDF
     call the same function, so a view is framed identically on both.
   - Positions frames, the chrome overlay and the gutter handles from the solved paper
     layout, divided by a pixels-per-millimetre factor and nothing else.

   -----------------------------------------------------------------------------

   WHY PREVIEW AND SEND REBUILDS THE SHEET RATHER THAN CLONING THE LIVE ONE:
   Cloning would drag the Drawing Editor's interactive scaffolding along with it -
   live Env2d surfaces, gutter handles, a camera-edit binding on the 3D frame. Rebuilt
   from the same layout and the same cached views, the preview gets a sheet that is
   identical to look at and inert to touch.

   WHY BOTH SURFACES FRAME A VIEW THROUGH ONE FUNCTION:
   Preview and Send used to lay its own grid out and let each view fill whatever box
   it landed in, while the export rewrote the viewBox to the solved rectangle. The two
   framings agreed only by luck. Framing here means a view shows exactly the same
   model window on the sheet, in the preview and in the file.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Sheet Surface Module
// =============================================================================

const VghLantern__DrawingEditor__SheetSurface = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names and Data Attributes
    // ------------------------------------------------------------
    const CSS_SHEET           =  'VghLantern__Sheet';
    const CSS_SHEET_CHROME    =  'VghLantern__Sheet__ChromeLayer';
    const CSS_SNAPSHOT        =  'VghLantern__Sheet__FrameSnapshot';
    const CSS_PLACEHOLDER     =  'VghLantern__Sheet__FramePlaceholder';
    const CSS_FRAME           =  'VghLantern__Sheet__Frame';
    const CSS_FRAME_BODY      =  'VghLantern__Sheet__FrameBody';

    const CSS_RESIZE_HANDLE   =  'VghLantern__Sheet__ResizeHandle';
    const CSS_RESIZE_COL      =  'VghLantern__Sheet__ResizeHandle--col';
    const CSS_RESIZE_ROW      =  'VghLantern__Sheet__ResizeHandle--row';

    const ATTR_SHEET_RESIZE   =  'data-vgh-sheet-resize';
    const ATTR_SPLIT_INDEX    =  'data-vgh-split-index';
    const ATTR_SLOT_KEY       =  'data-vgh-slot';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Slot Source Kinds and Placeholder Copy
    // ------------------------------------------------------------
    const SOURCE_ENV3D        =  'env3d';

    const MESSAGE_NO_3D       =  '3D view unavailable';
    const MESSAGE_NOT_DRAWN   =  'View not composed';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Screen Sizing Guard
    // ------------------------------------------------------------
    // Layout__Solve already enforces ScreenPixelsPerMm through ConfigLoader and logs
    // loudly if the key is missing. This only guards against divide-by-zero.
    const MINIMUM_PIXELS_PER_MM  =  0.01;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__SheetSurface__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // FUNCTION | Paper Millimetres to Laid-Out Pixels for a Solved Layout
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__SheetSurface__PixelsPerMm(layout) {
        var value  =  layout ? layout.ScreenPixelsPerMm : null;
        return (typeof value === 'number' && value > 0) ? value : MINIMUM_PIXELS_PER_MM;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | View Framing - Shared With the PDF Painter
// -----------------------------------------------------------------------------

    // FUNCTION | Frame a Serialised View to Span Exactly One Scale Window
    // ------------------------------------------------------------
    // The window is (body millimetres x denominator) of model space, centred on the
    // view's own projected extents, so the frame contains exactly what 1:N can hold.
    // This is the step that makes a printed drawing measurable and the previewed
    // drawing match it.
    //
    // intrinsicPixelsPerMm sizes the SVG for a rasteriser. Omit it and the view is
    // sized to fill its container instead, which is what a screen frame wants. The
    // explicit sizing also detaches the markup from the Env2d stylesheet, which would
    // otherwise still be styling a static preview as a live pannable viewport.
    function VghLantern__DrawingEditor__SheetSurface__FrameViewMarkup(
        svgMarkup, viewKey, bodyRect, denominator, skeleton, intrinsicPixelsPerMm) {

        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;
        if (!svgMarkup || !bodyRect) return null;

        var parsed  =  new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
        var svgEl   =  parsed.documentElement;
        if (!svgEl || svgEl.getElementsByTagName('parsererror').length) return null;

        var spanXMm  =  bodyRect.WidthMm  * denominator;
        var spanYMm  =  bodyRect.HeightMm * denominator;

        var centreX  =  0;
        var centreY  =  0;
        var extents  =  (CoordHelpers && skeleton)
            ? CoordHelpers.VghLantern__Env2d__CoordHelpers__ExtentsOfSkeleton(skeleton, viewKey)
            : null;

        if (extents) {
            centreX  =  (extents.MinX + extents.MaxX) / 2;
            centreY  =  (extents.MinY + extents.MaxY) / 2;
        }

        svgEl.setAttribute('viewBox',
            (centreX - (spanXMm / 2)) + ' ' + (centreY - (spanYMm / 2)) + ' ' + spanXMm + ' ' + spanYMm);
        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        if (typeof intrinsicPixelsPerMm === 'number' && intrinsicPixelsPerMm > 0) {
            svgEl.setAttribute('width',  Math.max(1, Math.round(bodyRect.WidthMm  * intrinsicPixelsPerMm)) + 'px');
            svgEl.setAttribute('height', Math.max(1, Math.round(bodyRect.HeightMm * intrinsicPixelsPerMm)) + 'px');
        } else {
            svgEl.setAttribute('width',  '100%');
            svgEl.setAttribute('height', '100%');
            svgEl.setAttribute('style',  'display:block;width:100%;height:100%;cursor:default');
        }

        return new XMLSerializer().serializeToString(svgEl);
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Baked Content of Every Slot on a Composed Sheet
    // ------------------------------------------------------------
    // Turns a described sheet into a slot-key to markup map ready to drop into frame
    // bodies. Orthographic views are framed vector SVG; the 3D slot is the snapshot
    // that was already captured at this frame's aspect.
    function VghLantern__DrawingEditor__SheetSurface__BuildBakedSlotContent(sheet) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var layout        =  sheet ? sheet.Layout : null;
        var content       =  {};
        if (!layout) return content;

        var skeleton  =  StateManager ? StateManager.VghLantern__StateManager__GetSolvedSkeleton() : null;
        var i, placement, slot, snapshot, markup, framed;

        for (i = 0; i < layout.Slots.length; i++) {
            placement  =  layout.Slots[i];
            slot       =  placement.Slot;

            if (slot.Source === SOURCE_ENV3D) {
                snapshot  =  sheet.ViewSnapshots ? sheet.ViewSnapshots[slot.Key] : null;
                content[slot.Key]  =  snapshot
                    ? '<img class="' + CSS_SNAPSHOT + '" draggable="false" src="' + snapshot +
                      '" alt="' + VghLantern__SheetSurface__Escape(slot.Label || '3D view') + '">'
                    : '<p class="' + CSS_PLACEHOLDER + '">' + MESSAGE_NO_3D + '</p>';
                continue;
            }

            markup  =  sheet.ViewSvgMarkup ? sheet.ViewSvgMarkup[slot.Key] : null;
            framed  =  markup
                ? VghLantern__DrawingEditor__SheetSurface__FrameViewMarkup(
                      markup, slot.ViewKey || slot.Key, placement.Body, sheet.ScaleDenominator, skeleton, null
                  )
                : null;

            content[slot.Key]  =  framed || ('<p class="' + CSS_PLACEHOLDER + '">' + MESSAGE_NOT_DRAWN + '</p>');
        }

        return content;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sheet Markup
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build One Frame and Its Drawable Body
    // ------------------------------------------------------------
    // The frame carries no chrome of its own. Its border, its caption strip and the
    // caption text are drawn by SheetChrome into the sheet's SVG overlay, so the
    // screen and the PDF paint identical frame furniture from one description. What
    // is left is a positioned box and the drawable body inside it, placed straight
    // from the solved paper rectangles.
    function VghLantern__SheetSurface__BuildFrame(placement, pixelsPerMm, innerHtml) {
        var slot   =  placement.Slot;
        var frame  =  placement.Frame;
        var body   =  placement.Body;

        var frameStyle  =  ' style="left:'  + (frame.X * pixelsPerMm)        + 'px;' +
                                  'top:'    + (frame.Y * pixelsPerMm)        + 'px;' +
                                  'width:'  + (frame.WidthMm  * pixelsPerMm) + 'px;' +
                                  'height:' + (frame.HeightMm * pixelsPerMm) + 'px"';

        var bodyStyle   =  ' style="left:'  + ((body.X - frame.X) * pixelsPerMm) + 'px;' +
                                  'top:'    + ((body.Y - frame.Y) * pixelsPerMm) + 'px;' +
                                  'width:'  + (body.WidthMm  * pixelsPerMm)      + 'px;' +
                                  'height:' + (body.HeightMm * pixelsPerMm)      + 'px"';

        return '<div class="' + CSS_FRAME + '" ' + ATTR_SLOT_KEY + '="' +
               VghLantern__SheetSurface__Escape(slot.Key) + '"' + frameStyle + '>' +
               '<div class="' + CSS_FRAME_BODY + '"' + bodyStyle + '>' + (innerHtml || '') + '</div>' +
               '</div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Chrome Overlay Markup for a Solved Layout
    // ------------------------------------------------------------
    // The overlay is the whole of the sheet that is not a view. Its viewBox is the
    // paper in millimetres, so it carries the solved coordinates unchanged.
    function VghLantern__DrawingEditor__SheetSurface__BuildChromeSvg(layout, project, lantern, logoAsset) {
        var SheetChrome  =  window.VghLantern__DrawingEditor__SheetChrome;
        if (!SheetChrome || !layout) return '';

        var primitives  =  SheetChrome.VghLantern__DrawingEditor__SheetChrome__BuildForSheet(
            layout, project, lantern, logoAsset
        );

        return SheetChrome.VghLantern__DrawingEditor__SheetChrome__ToSvgMarkup(
            primitives, layout.Page.WidthMm, layout.Page.HeightMm, CSS_SHEET_CHROME
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Gutter Split Handles
    // ------------------------------------------------------------
    function VghLantern__SheetSurface__BuildResizeHandles(layout) {
        var html  =  '';
        var i;

        for (i = 0; i < layout.Grid.ColumnTracks.length - 1; i++) {
            html  +=  '<div class="' + CSS_RESIZE_HANDLE + ' ' + CSS_RESIZE_COL + '" ' +
                      ATTR_SHEET_RESIZE + '="col" ' + ATTR_SPLIT_INDEX + '="' + i + '" ' +
                      'title="Drag to resize viewports"></div>';
        }
        for (i = 0; i < layout.Grid.RowTracks.length - 1; i++) {
            html  +=  '<div class="' + CSS_RESIZE_HANDLE + ' ' + CSS_RESIZE_ROW + '" ' +
                      ATTR_SHEET_RESIZE + '="row" ' + ATTR_SPLIT_INDEX + '="' + i + '" ' +
                      'title="Drag to resize viewports"></div>';
        }

        return html;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Whole Paper Sheet at Its True Paper Size
    // ------------------------------------------------------------
    // options is { PixelsPerMm, Project, Lantern, LogoAsset, SlotContentHtml,
    // ShowResizeHandles }. Omit SlotContentHtml for empty frames the caller will
    // mount live surfaces into; supply it to bake composed views straight in.
    // The returned element is the sheet only - the caller owns whatever it is
    // wrapped in, because the Drawing Editor scales it for zoom and the document
    // preview scales it to fit a page stage.
    function VghLantern__DrawingEditor__SheetSurface__BuildHtml(layout, options) {
        if (!layout) return '';

        var settings   =  options || {};
        var pxPerMm    =  (typeof settings.PixelsPerMm === 'number' && settings.PixelsPerMm > 0)
            ? settings.PixelsPerMm
            : VghLantern__DrawingEditor__SheetSurface__PixelsPerMm(layout);
        var content    =  settings.SlotContentHtml || {};

        var sheetStyle  =  'width:'  + (layout.Page.WidthMm  * pxPerMm) + 'px;' +
                           'height:' + (layout.Page.HeightMm * pxPerMm) + 'px;';

        var framesHtml  =  '';
        var i;
        for (i = 0; i < layout.Slots.length; i++) {
            framesHtml  +=  VghLantern__SheetSurface__BuildFrame(
                layout.Slots[i], pxPerMm, content[layout.Slots[i].Slot.Key]
            );
        }

        return '<div class="' + CSS_SHEET + '" style="' + sheetStyle + '" ' +
               'data-vgh-sheet-size="' + VghLantern__SheetSurface__Escape(layout.Page.SizeKey) + '" ' +
               'data-vgh-sheet-orientation="' + VghLantern__SheetSurface__Escape(layout.Page.Orientation) + '">' +
               framesHtml +
               VghLantern__DrawingEditor__SheetSurface__BuildChromeSvg(
                   layout, settings.Project, settings.Lantern, settings.LogoAsset
               ) +
               (settings.ShowResizeHandles ? VghLantern__SheetSurface__BuildResizeHandles(layout) : '') +
               '</div>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Live Repositioning
// -----------------------------------------------------------------------------

    // FUNCTION | Find the Drawable Body Element of a Built Slot
    // ------------------------------------------------------------
    // ViewPlacement mounts live surfaces into these, so the query lives beside the
    // markup that created them rather than in a third module holding a copy of the
    // slot attribute name.
    function VghLantern__DrawingEditor__SheetSurface__FindSlotBody(sheetElement, slotKey) {
        if (!sheetElement) return null;

        var frame  =  sheetElement.querySelector('[' + ATTR_SLOT_KEY + '="' + slotKey + '"]');
        return frame ? frame.querySelector('.' + CSS_FRAME_BODY) : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Position the Gutter Handles Over the Solved Tracks
    // ------------------------------------------------------------
    // A handle sits on the centre line of the gutter it drags, taken straight from
    // the solved track offsets rather than measured back off the DOM.
    function VghLantern__DrawingEditor__SheetSurface__PositionResizeHandles(sheetElement, layout) {
        if (!sheetElement || !layout) return;

        var pxPerMm   =  VghLantern__DrawingEditor__SheetSurface__PixelsPerMm(layout);
        var grid      =  layout.Grid;
        var gutterPx  =  grid.GutterMm * pxPerMm;
        var handles   =  sheetElement.querySelectorAll('[' + ATTR_SHEET_RESIZE + ']');
        var i, handleEl, isColumn, splitIndex, tracks, centreMm;

        for (i = 0; i < handles.length; i++) {
            handleEl    =  handles[i];
            isColumn    =  handleEl.getAttribute(ATTR_SHEET_RESIZE) === 'col';
            splitIndex  =  parseInt(handleEl.getAttribute(ATTR_SPLIT_INDEX), 10) || 0;
            tracks      =  isColumn ? grid.ColumnTracks : grid.RowTracks;
            if (!tracks || splitIndex + 1 >= tracks.length) continue;

            centreMm  =  tracks[splitIndex].OffsetMm + tracks[splitIndex].SizeMm + (grid.GutterMm / 2);

            if (isColumn) {
                handleEl.style.left    =  ((grid.X + centreMm) * pxPerMm) + 'px';
                handleEl.style.top     =  (grid.Y * pxPerMm) + 'px';
                handleEl.style.height  =  (grid.HeightMm * pxPerMm) + 'px';
                handleEl.style.width   =  Math.max(10, gutterPx + 6) + 'px';
            } else {
                handleEl.style.top     =  ((grid.Y + centreMm) * pxPerMm) + 'px';
                handleEl.style.left    =  (grid.X * pxPerMm) + 'px';
                handleEl.style.width   =  (grid.WidthMm * pxPerMm) + 'px';
                handleEl.style.height  =  Math.max(10, gutterPx + 6) + 'px';
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-Position Frames, Chrome and Handles From a Layout
    // ------------------------------------------------------------
    // Used by the live gutter drag. Only boxes and the overlay move; no view is
    // re-rendered and no surface is remounted, so a drag stays smooth.
    function VghLantern__DrawingEditor__SheetSurface__ApplyLayout(sheetElement, layout, project, lantern, logoAsset) {
        if (!sheetElement || !layout) return;

        var pxPerMm  =  VghLantern__DrawingEditor__SheetSurface__PixelsPerMm(layout);
        var i, placement, frameEl, bodyEl;

        for (i = 0; i < layout.Slots.length; i++) {
            placement  =  layout.Slots[i];
            frameEl    =  sheetElement.querySelector('[' + ATTR_SLOT_KEY + '="' + placement.Slot.Key + '"]');
            if (!frameEl) continue;

            frameEl.style.left    =  (placement.Frame.X * pxPerMm) + 'px';
            frameEl.style.top     =  (placement.Frame.Y * pxPerMm) + 'px';
            frameEl.style.width   =  (placement.Frame.WidthMm  * pxPerMm) + 'px';
            frameEl.style.height  =  (placement.Frame.HeightMm * pxPerMm) + 'px';

            bodyEl  =  frameEl.querySelector('.' + CSS_FRAME_BODY);
            if (!bodyEl) continue;

            bodyEl.style.left    =  ((placement.Body.X - placement.Frame.X) * pxPerMm) + 'px';
            bodyEl.style.top     =  ((placement.Body.Y - placement.Frame.Y) * pxPerMm) + 'px';
            bodyEl.style.width   =  (placement.Body.WidthMm  * pxPerMm) + 'px';
            bodyEl.style.height  =  (placement.Body.HeightMm * pxPerMm) + 'px';
        }

        var chromeEl  =  sheetElement.querySelector('.' + CSS_SHEET_CHROME);
        if (chromeEl) {
            chromeEl.outerHTML  =  VghLantern__DrawingEditor__SheetSurface__BuildChromeSvg(
                layout, project, lantern, logoAsset
            );
        }

        VghLantern__DrawingEditor__SheetSurface__PositionResizeHandles(sheetElement, layout);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__SheetSurface__SheetClass            : CSS_SHEET,
        VghLantern__DrawingEditor__SheetSurface__ResizeAttribute       : ATTR_SHEET_RESIZE,
        VghLantern__DrawingEditor__SheetSurface__SplitIndexAttribute   : ATTR_SPLIT_INDEX,

        VghLantern__DrawingEditor__SheetSurface__PixelsPerMm           : VghLantern__DrawingEditor__SheetSurface__PixelsPerMm,
        VghLantern__DrawingEditor__SheetSurface__FrameViewMarkup       : VghLantern__DrawingEditor__SheetSurface__FrameViewMarkup,
        VghLantern__DrawingEditor__SheetSurface__BuildBakedSlotContent : VghLantern__DrawingEditor__SheetSurface__BuildBakedSlotContent,
        VghLantern__DrawingEditor__SheetSurface__BuildHtml             : VghLantern__DrawingEditor__SheetSurface__BuildHtml,
        VghLantern__DrawingEditor__SheetSurface__BuildChromeSvg        : VghLantern__DrawingEditor__SheetSurface__BuildChromeSvg,
        VghLantern__DrawingEditor__SheetSurface__FindSlotBody          : VghLantern__DrawingEditor__SheetSurface__FindSlotBody,
        VghLantern__DrawingEditor__SheetSurface__ApplyLayout           : VghLantern__DrawingEditor__SheetSurface__ApplyLayout,
        VghLantern__DrawingEditor__SheetSurface__PositionResizeHandles : VghLantern__DrawingEditor__SheetSurface__PositionResizeHandles
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__SheetSurface  =  VghLantern__DrawingEditor__SheetSurface;
