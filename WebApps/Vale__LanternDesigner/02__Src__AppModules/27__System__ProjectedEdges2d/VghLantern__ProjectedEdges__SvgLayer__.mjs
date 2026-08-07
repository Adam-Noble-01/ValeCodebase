/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | SVG LAYER
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__SvgLayer__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - SvgLayer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Own a layer beneath the Env2d layer stack and paint segments into it
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - Creates and owns its own group inside an Env2d viewport's root SVG. It is not
     registered in the Env2d LAYER_ORDER stack and Env2d has no knowledge of it.
   - Inserted as the FIRST child of the root, so it paints before every authored
     layer and therefore sits underneath all of them. That is the stacking the
     experiment is testing: guaranteed-true projected linework as a backdrop, with
     the authored 2D drawing and its dimensions reading on top.

   ---------------------------------------------------------------------------

   WHY IT IS SAFE TO LIVE OUTSIDE THE LAYER STACK

   Three Env2d behaviours were checked before choosing this:

     ClearAllLayers      walks LAYER_ORDER only, so it cannot wipe this group. This
                         module clears its own contents instead, which is what makes
                         a stale projection disappear the instant geometry changes
                         rather than lingering until the new one arrives.

     ContentBounds       used to anchor the corner view label, and it too reads only
                         the named layers. Projected linework therefore cannot drag
                         the drawing title off its position.

     ToSvgMarkup         clones the whole root, so this group travels into the sheet
                         markup and into the PDF export with no extra plumbing. That
                         is deliberate for the experiment: the blue underlay shows up
                         on a printed sheet, which is the fastest way to judge whether
                         it holds up at true scale.

   ---------------------------------------------------------------------------

   ---------------------------------------------------------------------------

   THE PROVISIONAL PREVIEW, AND HOW IT IS KEPT OUT OF THE POST

   While a view is being projected it shows a picture of itself instead: see the
   RasterPreview module for what that is and why it lines up. It is placed as an
   <image> BELOW this module's own group, so the real linework paints over it as it
   arrives rather than under it.

   The one hazard worth stating, because ToSvgMarkup clones the whole root and would
   carry an image into a sheet and into a PDF: a preview must never outlive the
   render it belongs to. Three things enforce that, and all three are needed -

       Paint          clears the preview before drawing vectors, so the instant a
                      view's real segments land its placeholder is gone.
       Remove         clears it too, so switching the feature off at runtime leaves
                      nothing of it behind.
       RenderAll      clears every surface's preview in a finally block, so an
                      abandoned or failed render cannot leave one behind.

   Clear is the deliberate exception and does NOT touch it - see the note on that
   function for why taking the preview there would strip the placeholders off the
   views that have not finished yet.

   A sheet baked DURING a render would still catch a preview, but it would equally
   catch half-finished linework, so there is nothing here worth guarding beyond it.

   ---------------------------------------------------------------------------

   PUBLIC API:
       Paint(instance, segments)   draw a Float32Array of [x0,y0,x1,y1, ...]
       PaintPreview(instance, preview)  place the provisional image
       ClearPreview(instance)      take the provisional image away
       Clear(instance)             empty the layer, leaving it in place
       Remove(instance)            take the layer out of the SVG entirely

   ============================================================================= */

import { VghLantern__ProjectedEdges__ConfigAccess__Section } from './VghLantern__ProjectedEdges__ConfigAccess__.mjs';

// =============================================================================
// REGION | Projected Edges SVG Layer Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Namespace, Classes and Attributes
    // ------------------------------------------------------------
    const SVG_NAMESPACE   =  'http://www.w3.org/2000/svg';                    // <-- W3C constant, not an application value
    const XLINK_NAMESPACE =  'http://www.w3.org/1999/xlink';
    const CSS_LAYER       =  'VghLantern__ProjectedEdges__Layer';
    const CSS_PATH        =  'VghLantern__ProjectedEdges__Path';
    const CSS_PREVIEW     =  'VghLantern__ProjectedEdges__Preview';
    const ATTR_LAYER      =  'data-vgh-projected-edges';
    const ATTR_PREVIEW    =  'data-vgh-projected-edges-preview';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Coordinate Output Precision
    // ------------------------------------------------------------
    // Two decimal places is a hundredth of a millimetre of model space, far finer
    // than anything a lantern is manufactured to. Rounding matters because a busy
    // projection runs to tens of thousands of segments and full float precision
    // would triple the size of the path string for no visible gain.
    const COORDINATE_DECIMALS  =  2;
    const COORDINATE_FACTOR    =  Math.pow(10, COORDINATE_DECIMALS);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Layer Access
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Find or Create This Module's Group Inside a Viewport Root
    // ------------------------------------------------------------
    // insertBefore the first child rather than appendChild. SVG paints in document
    // order, so first child is the bottom of the stack, which is where a reference
    // underlay belongs.
    function VghLantern__ProjectedEdges__SvgLayer__Ensure(instance) {
        if (!instance || !instance.Root) return null;

        const root      =  instance.Root;
        const existing  =  root.querySelector('.' + CSS_LAYER);
        if (existing) return existing;

        const group  =  document.createElementNS(SVG_NAMESPACE, 'g');
        group.setAttribute('class', CSS_LAYER);
        group.setAttribute(ATTR_LAYER, instance.ViewKey || '');

        root.insertBefore(group, root.firstChild);
        return group;
    }
    // ------------------------------------------------------------


    // FUNCTION | Empty the Layer Without Removing It
    // ------------------------------------------------------------
    // Deliberately leaves the provisional image alone, and the reason is worth
    // spelling out because the opposite seems more obvious.
    //
    // The Pipeline repaints EVERY surface each time any one view finishes. A view
    // still being computed has no result yet, so it comes through here - and if
    // this took the preview with it, finishing the first view would strip the
    // placeholders off the other two. The preview belongs to the render, not to
    // the layer's contents, so Paint retires it when the real linework lands and
    // RenderAll retires the rest in a finally.
    export function VghLantern__ProjectedEdges__SvgLayer__Clear(instance) {
        if (!instance || !instance.Root) return;

        const existing  =  instance.Root.querySelector('.' + CSS_LAYER);
        if (existing) existing.textContent  =  '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Take the Provisional Image Away
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__SvgLayer__ClearPreview(instance) {
        if (!instance || !instance.Root) return;

        const existing  =  instance.Root.querySelector('.' + CSS_PREVIEW);
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    }
    // ------------------------------------------------------------


    // FUNCTION | Take the Layer Out of the Viewport Entirely
    // ------------------------------------------------------------
    // Used when the experiment is switched off at runtime, so a viewport that is not
    // redrawn afterwards still loses its overlay rather than keeping the last one.
    export function VghLantern__ProjectedEdges__SvgLayer__Remove(instance) {
        if (!instance || !instance.Root) return;

        const existing  =  instance.Root.querySelector('.' + CSS_LAYER);
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        VghLantern__ProjectedEdges__SvgLayer__ClearPreview(instance);         // <-- Switching the feature off must leave nothing of it behind
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Painting
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Round One Coordinate for Path Output
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__SvgLayer__Round(value) {
        return Math.round(value * COORDINATE_FACTOR) / COORDINATE_FACTOR;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Path Definition From a Segment Buffer
    // ------------------------------------------------------------
    // Every segment goes into a SINGLE path as an independent move-and-line pair,
    // rather than becoming its own line element. A projected lantern runs to tens of
    // thousands of segments, and that many DOM nodes would make the viewport crawl
    // on every pan while adding nothing a single path does not already draw.
    function VghLantern__ProjectedEdges__SvgLayer__BuildPathData(segments) {
        const parts  =  [];
        let   i;

        for (i = 0; i + 3 < segments.length; i += 4) {
            parts.push(
                'M' + VghLantern__ProjectedEdges__SvgLayer__Round(segments[i])     +
                ' ' + VghLantern__ProjectedEdges__SvgLayer__Round(segments[i + 1]) +
                'L' + VghLantern__ProjectedEdges__SvgLayer__Round(segments[i + 2]) +
                ' ' + VghLantern__ProjectedEdges__SvgLayer__Round(segments[i + 3])
            );
        }

        return parts.join('');
    }
    // ------------------------------------------------------------


    // FUNCTION | Paint a Segment Buffer Into a Viewport's Projected Layer
    // ------------------------------------------------------------
    // The stroke width is written as an attribute in true drawing millimetres, which
    // is the Env2d convention: linework is a drawing-scale property, so it thickens
    // and thins with zoom exactly as real linework on paper would. The colour is set
    // as an attribute too, so the layer still reads correctly once ToSvgMarkup has
    // detached it from the application stylesheet.
    export function VghLantern__ProjectedEdges__SvgLayer__Paint(instance, segments) {
        const group  =  VghLantern__ProjectedEdges__SvgLayer__Ensure(instance);
        if (!group) return 0;

        // The real thing has arrived, so the stand-in goes. Done before the early
        // return below as well as after it: a view that legitimately projects to
        // nothing must not be left showing a picture of something.
        VghLantern__ProjectedEdges__SvgLayer__ClearPreview(instance);

        group.textContent  =  '';
        if (!segments || segments.length < 4) return 0;

        const appearance  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Appearance');
        const pathEl      =  document.createElementNS(SVG_NAMESPACE, 'path');

        pathEl.setAttribute('class', CSS_PATH);
        pathEl.setAttribute('d', VghLantern__ProjectedEdges__SvgLayer__BuildPathData(segments));
        pathEl.setAttribute('fill', 'none');
        pathEl.setAttribute('stroke', appearance.StrokeColour || 'rgb(60, 60, 60)');
        pathEl.setAttribute('stroke-width', appearance.StrokeWidthMm);
        pathEl.setAttribute('stroke-opacity', appearance.StrokeOpacity);
        pathEl.setAttribute('stroke-linecap', 'round');
        pathEl.setAttribute('stroke-linejoin', 'round');

        group.appendChild(pathEl);
        return Math.floor(segments.length / 4);
    }
    // ------------------------------------------------------------


    // FUNCTION | Place the Provisional Image Beneath Everything
    // ------------------------------------------------------------
    // preview is what RasterPreview produced: a data URL and the drawing rectangle
    // it belongs in, both already in millimetres, so the image is positioned by
    // quoting those four numbers and nothing else.
    //
    // Inserted at the very front of the root on EVERY call rather than only on
    // creation. The vector group also inserts itself at the front, so whichever of
    // the two was added last would otherwise end up on top, and a picture painted
    // over the linework it was standing in for is worse than no picture at all.
    //
    // Both href and the xlink form are set. The plain one is correct for every
    // browser this application runs in; the xlink one is what older SVG consumers
    // read, and the sheet markup travels outside the browser into the PDF export.
    export function VghLantern__ProjectedEdges__SvgLayer__PaintPreview(instance, preview) {
        if (!instance || !instance.Root || !preview || !preview.DataUrl) return false;

        const appearance  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Preview');
        const root        =  instance.Root;

        VghLantern__ProjectedEdges__SvgLayer__ClearPreview(instance);

        const image  =  document.createElementNS(SVG_NAMESPACE, 'image');
        image.setAttribute('class', CSS_PREVIEW);
        image.setAttribute(ATTR_PREVIEW, instance.ViewKey || '');

        image.setAttribute('x',      preview.Rect.X);
        image.setAttribute('y',      preview.Rect.Y);
        image.setAttribute('width',  preview.Rect.Width);
        image.setAttribute('height', preview.Rect.Height);
        image.setAttribute('preserveAspectRatio', 'none');                    // <-- The rectangle IS the extents; never letterbox it
        image.setAttribute('opacity', (typeof appearance.Opacity === 'number') ? appearance.Opacity : 0.45);

        image.setAttribute('href', preview.DataUrl);
        image.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', preview.DataUrl);

        root.insertBefore(image, root.firstChild);
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
