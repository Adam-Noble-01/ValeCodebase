/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | VIEWPORT INSTANCE
   =============================================================================

   FILE       : VghLantern__Env2d__ViewportInstance__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - ViewportInstance
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Factory for an independent SVG drawing surface with named layers
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Factory pattern rather than a singleton, because several 2D surfaces exist
     concurrently: the editor viewport, the drawing editor's four view frames,
     and the component index preview tiles.
   - Each instance owns one root <svg>, a fixed stack of named layer groups, and
     its own viewBox. Renderers draw into layers; they never touch the root.
   - Layer order is fixed so a dimension can never be buried under geometry.

   ---------------------------------------------------------------------------

   LAYER STACK (back to front):
       grid        construction grid and origin axes
       fills       glazing pane washes
       hidden      members behind the viewing plane
       geometry    skeleton members
       bars        glazing bars and transoms
       components  finials, cresting, vents
       dimensions  dimension lines and editable text
       overlay     view label, selection highlights, transient UI

   INSTANCE API:
       Root, HostElement, ViewKey
       Layers                                  named layer group elements
       GetLayer(layerKey)
       ClearLayer(layerKey) / ClearAllLayers()
       SetViewBox(extents) / GetViewBox()
       FitToExtents(extents, paddingFactor)
       GetZoomScale()
       Destroy()

   ============================================================================= */

// =============================================================================
// REGION | Viewport Instance Factory Module
// =============================================================================

const VghLantern__Env2d__ViewportInstance = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Layer Keys and CSS Class Names
    // ------------------------------------------------------------
    const LAYER_ORDER  =  [
        'grid',
        'fills',
        'hidden',
        'geometry',
        'bars',
        'components',
        'dimensions',
        'overlay'
    ];

    const CSS_ROOT           =  'VghLantern__Env2d__Svg';                    // <-- Root svg element class
    const CSS_LAYER_PREFIX   =  'VghLantern__Env2d__Layer--';                // <-- Layer group class prefix
    const CSS_VIEW_LABEL     =  'VghLantern__Env2d__ViewLabel';              // <-- Corner view label class

    const DEFAULT_PADDING_FACTOR  =  0.14;                                   // <-- Used when config is unavailable
    const FALLBACK_EXTENT_MM      =  2000;                                   // <-- Empty-scene viewBox size
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Instance Construction
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Layer Group Stack
    // ------------------------------------------------------------
    function VghLantern__Env2d__ViewportInstance__BuildLayers(rootEl) {
        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;
        var layers      =  {};
        var i, layerKey, group;

        for (i = 0; i < LAYER_ORDER.length; i++) {
            layerKey  =  LAYER_ORDER[i];
            group     =  SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateGroup(
                CSS_LAYER_PREFIX + layerKey,
                { 'data-vgh-layer': layerKey }
            );
            rootEl.appendChild(group);
            layers[layerKey]  =  group;
        }

        return layers;
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a 2D Viewport Instance Inside a Host Element
    // ------------------------------------------------------------
    function VghLantern__Env2d__ViewportInstance__Create(hostElement, viewKey, options) {
        if (!hostElement) return null;

        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;
        var opts        =  options || {};

        var rootEl  =  SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateRoot(CSS_ROOT);
        rootEl.setAttribute('data-vgh-view', viewKey);

        var layers  =  VghLantern__Env2d__ViewportInstance__BuildLayers(rootEl);

        hostElement.appendChild(rootEl);

        // ViewBox state is held on the instance rather than parsed back out of the
        // attribute each frame, so pan and zoom maths stays exact.
        var viewBoxState  =  {
            MinX   : -FALLBACK_EXTENT_MM / 2,
            MinY   : -FALLBACK_EXTENT_MM / 2,
            Width  :  FALLBACK_EXTENT_MM,
            Height :  FALLBACK_EXTENT_MM
        };

        var instance  =  {
            Root         : rootEl,
            HostElement  : hostElement,
            ViewKey      : viewKey,
            Layers       : layers,
            Options      : opts
        };

        // FUNCTION | Get a Named Layer Group
        instance.GetLayer  =  function(layerKey) {
            return layers[layerKey] || null;
        };

        // FUNCTION | Clear a Single Layer
        instance.ClearLayer  =  function(layerKey) {
            SvgHelpers.VghLantern__Env2d__SvgHelpers__ClearChildren(layers[layerKey]);
        };

        // FUNCTION | Clear Every Layer
        instance.ClearAllLayers  =  function() {
            var k;
            for (k = 0; k < LAYER_ORDER.length; k++) {
                SvgHelpers.VghLantern__Env2d__SvgHelpers__ClearChildren(layers[LAYER_ORDER[k]]);
            }
        };

        // FUNCTION | Apply a ViewBox from Extents
        instance.SetViewBox  =  function(extents) {
            if (!extents) return;
            viewBoxState.MinX    =  extents.MinX;
            viewBoxState.MinY    =  extents.MinY;
            viewBoxState.Width   =  Math.max(1, extents.Width);
            viewBoxState.Height  =  Math.max(1, extents.Height);
            rootEl.setAttribute('viewBox',
                viewBoxState.MinX + ' ' + viewBoxState.MinY + ' ' + viewBoxState.Width + ' ' + viewBoxState.Height);
        };

        // FUNCTION | Read the Current ViewBox State
        instance.GetViewBox  =  function() {
            return {
                MinX   : viewBoxState.MinX,
                MinY   : viewBoxState.MinY,
                Width  : viewBoxState.Width,
                Height : viewBoxState.Height,
                MaxX   : viewBoxState.MinX + viewBoxState.Width,
                MaxY   : viewBoxState.MinY + viewBoxState.Height
            };
        };

        // FUNCTION | Fit the ViewBox to Extents with Proportional Padding
        instance.FitToExtents  =  function(extents, paddingFactor) {
            var factor  =  (typeof paddingFactor === 'number') ? paddingFactor : DEFAULT_PADDING_FACTOR;

            if (!extents || extents.Width <= 0 || extents.Height <= 0) {
                instance.SetViewBox({
                    MinX   : -FALLBACK_EXTENT_MM / 2,
                    MinY   : -FALLBACK_EXTENT_MM / 2,
                    Width  :  FALLBACK_EXTENT_MM,
                    Height :  FALLBACK_EXTENT_MM
                });
                return;
            }

            var margin  =  Math.max(extents.Width, extents.Height) * factor;

            // Match the viewBox aspect to the host so preserveAspectRatio never
            // introduces asymmetric empty space on one side only.
            var hostRect     =  hostElement.getBoundingClientRect();
            var hostAspect   =  (hostRect.height > 0) ? (hostRect.width / hostRect.height) : 1;
            var paddedWidth  =  extents.Width  + (margin * 2);
            var paddedHeight =  extents.Height + (margin * 2);
            var boxAspect    =  paddedWidth / paddedHeight;

            if (hostAspect > boxAspect) {
                paddedWidth   =  paddedHeight * hostAspect;
            } else {
                paddedHeight  =  paddedWidth / hostAspect;
            }

            var centreX  =  (extents.MinX + extents.MaxX) / 2;
            var centreY  =  (extents.MinY + extents.MaxY) / 2;

            instance.SetViewBox({
                MinX   : centreX - (paddedWidth  / 2),
                MinY   : centreY - (paddedHeight / 2),
                Width  : paddedWidth,
                Height : paddedHeight
            });
        };

        // FUNCTION | Current Screen Pixels per Millimetre
        instance.GetZoomScale  =  function() {
            var hostRect  =  hostElement.getBoundingClientRect();
            if (!hostRect.width || !viewBoxState.Width) return 1;
            return hostRect.width / viewBoxState.Width;
        };

        // FUNCTION | Place or Update the Corner View Label
        instance.SetViewLabel  =  function(labelText) {
            var overlay  =  layers.overlay;
            if (!overlay) return;

            var box  =  instance.GetViewBox();
            var pad  =  Math.max(box.Width, box.Height) * 0.02;

            var textEl  =  SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateText(
                { x: box.MinX + pad, y: box.MaxY - pad },
                labelText,
                CSS_VIEW_LABEL,
                { 'font-size': Math.max(box.Width, box.Height) * 0.035 }
            );
            overlay.appendChild(textEl);
        };

        // FUNCTION | Detach the Instance from the DOM
        instance.Destroy  =  function() {
            if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
        };

        return instance;
    }
    // ------------------------------------------------------------


    // FUNCTION | Replace Any Existing Instance in a Host Element
    // ------------------------------------------------------------
    // Hosts are re-rendered on every mode entry, so this keeps a stale SVG from
    // accumulating beneath a fresh one.
    function VghLantern__Env2d__ViewportInstance__CreateFresh(hostElement, viewKey, options) {
        if (!hostElement) return null;

        var existing  =  hostElement.querySelectorAll('.' + CSS_ROOT);
        var i;
        for (i = 0; i < existing.length; i++) {
            if (existing[i].parentNode) existing[i].parentNode.removeChild(existing[i]);
        }

        return VghLantern__Env2d__ViewportInstance__Create(hostElement, viewKey, options);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        LAYER_ORDER                                        : LAYER_ORDER,
        VghLantern__Env2d__ViewportInstance__Create         : VghLantern__Env2d__ViewportInstance__Create,
        VghLantern__Env2d__ViewportInstance__CreateFresh    : VghLantern__Env2d__ViewportInstance__CreateFresh
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__ViewportInstance  =  VghLantern__Env2d__ViewportInstance;
