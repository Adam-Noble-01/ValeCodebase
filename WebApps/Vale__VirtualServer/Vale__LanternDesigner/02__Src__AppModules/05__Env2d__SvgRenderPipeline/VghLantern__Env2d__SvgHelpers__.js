/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | SVG HELPERS
   =============================================================================

   FILE       : VghLantern__Env2d__SvgHelpers__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - SvgHelpers
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Thin SVG element factory for the 2D render pipeline
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Every SVG node in the application is created here, so the namespace URI and
     attribute conventions exist in exactly one place.
   - Deliberately dumb: no geometry knowledge, no config reads, no state. It
     creates nodes and sets attributes.
   - Presentation is driven by CSS classes rather than inline attributes wherever
     possible, so the design token layer stays authoritative. Only genuinely
     geometric attributes (stroke widths in millimetres, dash patterns scaled to
     model units) are set inline.

   ============================================================================= */

// =============================================================================
// REGION | SVG Helpers Module
// =============================================================================

const VghLantern__Env2d__SvgHelpers = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Namespaces
    // ------------------------------------------------------------
    const SVG_NS    =  'http://www.w3.org/2000/svg';                         // <-- SVG element namespace
    const XLINK_NS  =  'http://www.w3.org/1999/xlink';                       // <-- Legacy href namespace for image nodes
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Core Element Creation
// -----------------------------------------------------------------------------

    // FUNCTION | Create an SVG Element with Attributes
    // ------------------------------------------------------------
    function VghLantern__Env2d__SvgHelpers__Create(tagName, attributes) {
        var el  =  document.createElementNS(SVG_NS, tagName);
        if (attributes) VghLantern__Env2d__SvgHelpers__SetAttributes(el, attributes);
        return el;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Multiple Attributes on an SVG Element
    // ------------------------------------------------------------
    function VghLantern__Env2d__SvgHelpers__SetAttributes(el, attributes) {
        var key;
        for (key in attributes) {
            if (!Object.prototype.hasOwnProperty.call(attributes, key)) continue;
            if (attributes[key] === null || attributes[key] === undefined) continue;
            el.setAttribute(key, attributes[key]);
        }
        return el;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove Every Child of a Node
    // ------------------------------------------------------------
    function VghLantern__Env2d__SvgHelpers__ClearChildren(el) {
        if (!el) return;
        while (el.firstChild) el.removeChild(el.firstChild);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shape Factories
// -----------------------------------------------------------------------------

    // FUNCTION | Create a Root SVG Element
    // ------------------------------------------------------------
    function VghLantern__Env2d__SvgHelpers__CreateRoot(cssClass) {
        return VghLantern__Env2d__SvgHelpers__Create('svg', {
            'class'               : cssClass,
            'xmlns'               : SVG_NS,
            'preserveAspectRatio' : 'xMidYMid meet'
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Group
    // ------------------------------------------------------------
    function VghLantern__Env2d__SvgHelpers__CreateGroup(cssClass, extraAttributes) {
        var attrs  =  extraAttributes || {};
        attrs['class']  =  cssClass;
        return VghLantern__Env2d__SvgHelpers__Create('g', attrs);
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Line
    // ------------------------------------------------------------
    function VghLantern__Env2d__SvgHelpers__CreateLine(startPt, endPt, cssClass, extraAttributes) {
        var attrs  =  extraAttributes || {};
        attrs['class']  =  cssClass;
        attrs['x1']     =  startPt.x;
        attrs['y1']     =  startPt.y;
        attrs['x2']     =  endPt.x;
        attrs['y2']     =  endPt.y;
        return VghLantern__Env2d__SvgHelpers__Create('line', attrs);
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Polyline or Closed Polygon from 2D Points
    // ------------------------------------------------------------
    function VghLantern__Env2d__SvgHelpers__CreatePolyShape(points2d, cssClass, isClosed, extraAttributes) {
        var pointsAttr  =  VghLantern__Env2d__SvgHelpers__PointsToAttribute(points2d);
        var attrs       =  extraAttributes || {};
        attrs['class']  =  cssClass;
        attrs['points'] =  pointsAttr;
        return VghLantern__Env2d__SvgHelpers__Create(isClosed ? 'polygon' : 'polyline', attrs);
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Circle
    // ------------------------------------------------------------
    function VghLantern__Env2d__SvgHelpers__CreateCircle(centrePt, radius, cssClass, extraAttributes) {
        var attrs  =  extraAttributes || {};
        attrs['class']  =  cssClass;
        attrs['cx']     =  centrePt.x;
        attrs['cy']     =  centrePt.y;
        attrs['r']      =  radius;
        return VghLantern__Env2d__SvgHelpers__Create('circle', attrs);
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Path from a Command String
    // ------------------------------------------------------------
    function VghLantern__Env2d__SvgHelpers__CreatePath(pathData, cssClass, extraAttributes) {
        var attrs  =  extraAttributes || {};
        attrs['class']  =  cssClass;
        attrs['d']      =  pathData;
        return VghLantern__Env2d__SvgHelpers__Create('path', attrs);
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Text Node
    // ------------------------------------------------------------
    function VghLantern__Env2d__SvgHelpers__CreateText(anchorPt, textContent, cssClass, extraAttributes) {
        var attrs  =  extraAttributes || {};
        attrs['class']  =  cssClass;
        attrs['x']      =  anchorPt.x;
        attrs['y']      =  anchorPt.y;

        var el  =  VghLantern__Env2d__SvgHelpers__Create('text', attrs);
        el.textContent  =  textContent;
        return el;
    }
    // ------------------------------------------------------------


    // FUNCTION | Create an Image Node for a Raster or SVG Asset
    // ------------------------------------------------------------
    function VghLantern__Env2d__SvgHelpers__CreateImage(originPt, widthUnits, heightUnits, hrefValue, cssClass) {
        var el  =  VghLantern__Env2d__SvgHelpers__Create('image', {
            'class'  : cssClass,
            'x'      : originPt.x,
            'y'      : originPt.y,
            'width'  : widthUnits,
            'height' : heightUnits
        });
        el.setAttribute('href', hrefValue);
        el.setAttributeNS(XLINK_NS, 'xlink:href', hrefValue);                // <-- Legacy fallback for older renderers
        return el;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Attribute Formatting Utilities
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert a 2D Point List to a points Attribute String
    // ------------------------------------------------------------
    function VghLantern__Env2d__SvgHelpers__PointsToAttribute(points2d) {
        var parts  =  [];
        var i;
        for (i = 0; i < points2d.length; i++) {
            parts.push(points2d[i].x + ',' + points2d[i].y);
        }
        return parts.join(' ');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a viewBox Attribute String from Extents
    // ------------------------------------------------------------
    function VghLantern__Env2d__SvgHelpers__ExtentsToViewBox(extents) {
        if (!extents) return '0 0 100 100';
        var width   =  Math.max(1, extents.Width);
        var height  =  Math.max(1, extents.Height);
        return extents.MinX + ' ' + extents.MinY + ' ' + width + ' ' + height;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert a Client Point to SVG User Units
    // ------------------------------------------------------------
    // Required for hit testing and for positioning the HTML dimension input over
    // an SVG text node.
    function VghLantern__Env2d__SvgHelpers__ClientToUser(svgRoot, clientX, clientY) {
        if (!svgRoot || !svgRoot.getScreenCTM) return { x: 0, y: 0 };

        var ctm  =  svgRoot.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };

        var pt  =  svgRoot.createSVGPoint();
        pt.x    =  clientX;
        pt.y    =  clientY;

        var userPt  =  pt.matrixTransform(ctm.inverse());
        return { x: userPt.x, y: userPt.y };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert an SVG User Point to Client Pixels
    // ------------------------------------------------------------
    function VghLantern__Env2d__SvgHelpers__UserToClient(svgRoot, userX, userY) {
        if (!svgRoot || !svgRoot.getScreenCTM) return { x: 0, y: 0 };

        var ctm  =  svgRoot.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };

        var pt  =  svgRoot.createSVGPoint();
        pt.x    =  userX;
        pt.y    =  userY;

        var clientPt  =  pt.matrixTransform(ctm);
        return { x: clientPt.x, y: clientPt.y };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        SVG_NS                                            : SVG_NS,

        VghLantern__Env2d__SvgHelpers__Create              : VghLantern__Env2d__SvgHelpers__Create,
        VghLantern__Env2d__SvgHelpers__SetAttributes       : VghLantern__Env2d__SvgHelpers__SetAttributes,
        VghLantern__Env2d__SvgHelpers__ClearChildren       : VghLantern__Env2d__SvgHelpers__ClearChildren,

        VghLantern__Env2d__SvgHelpers__CreateRoot          : VghLantern__Env2d__SvgHelpers__CreateRoot,
        VghLantern__Env2d__SvgHelpers__CreateGroup         : VghLantern__Env2d__SvgHelpers__CreateGroup,
        VghLantern__Env2d__SvgHelpers__CreateLine          : VghLantern__Env2d__SvgHelpers__CreateLine,
        VghLantern__Env2d__SvgHelpers__CreatePolyShape     : VghLantern__Env2d__SvgHelpers__CreatePolyShape,
        VghLantern__Env2d__SvgHelpers__CreateCircle        : VghLantern__Env2d__SvgHelpers__CreateCircle,
        VghLantern__Env2d__SvgHelpers__CreatePath          : VghLantern__Env2d__SvgHelpers__CreatePath,
        VghLantern__Env2d__SvgHelpers__CreateText          : VghLantern__Env2d__SvgHelpers__CreateText,
        VghLantern__Env2d__SvgHelpers__CreateImage         : VghLantern__Env2d__SvgHelpers__CreateImage,

        VghLantern__Env2d__SvgHelpers__PointsToAttribute   : VghLantern__Env2d__SvgHelpers__PointsToAttribute,
        VghLantern__Env2d__SvgHelpers__ExtentsToViewBox    : VghLantern__Env2d__SvgHelpers__ExtentsToViewBox,
        VghLantern__Env2d__SvgHelpers__ClientToUser        : VghLantern__Env2d__SvgHelpers__ClientToUser,
        VghLantern__Env2d__SvgHelpers__UserToClient        : VghLantern__Env2d__SvgHelpers__UserToClient
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__SvgHelpers  =  VghLantern__Env2d__SvgHelpers;
