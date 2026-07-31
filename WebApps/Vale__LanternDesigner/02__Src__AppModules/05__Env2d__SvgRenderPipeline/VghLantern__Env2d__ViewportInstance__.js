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
    const CSS_VIEW_LABEL_RULE =  'VghLantern__Env2d__ViewLabelUnderline';     // <-- CAD underline under the title

    const FALLBACK_EXTENT_MM           =  2000;                              // <-- Empty-scene viewBox size; a structural default, not a design value

    // Layers whose painted bounds pull the title next to the lantern (not the frame)
    const VIEW_LABEL_BOUNDS_LAYERS  =  [
        'fills', 'hidden', 'geometry', 'bars', 'components', 'dimensions'
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Content Bounds for View Labels
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Union of Painted Layer Bounds (Excludes Grid and Overlay)
    // ------------------------------------------------------------
    // The draftsman title must sit under the lantern and its dimensions, not at the
    // empty viewBox corner left by true-scale framing on the sheet.
    function VghLantern__Env2d__ViewportInstance__ContentBounds(layers) {
        var minX  =  Infinity;
        var minY  =  Infinity;
        var maxX  =  -Infinity;
        var maxY  =  -Infinity;
        var i, layer, bbox;

        for (i = 0; i < VIEW_LABEL_BOUNDS_LAYERS.length; i++) {
            layer  =  layers[VIEW_LABEL_BOUNDS_LAYERS[i]];
            if (!layer || !layer.childNodes || layer.childNodes.length === 0) continue;

            try { bbox = layer.getBBox(); } catch (err) { bbox = null; }
            if (!bbox || !(bbox.width > 0) || !(bbox.height > 0)) continue;

            if (bbox.x < minX) minX = bbox.x;
            if (bbox.y < minY) minY = bbox.y;
            if ((bbox.x + bbox.width)  > maxX) maxX = bbox.x + bbox.width;
            if ((bbox.y + bbox.height) > maxY) maxY = bbox.y + bbox.height;
        }

        if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return null;

        return {
            MinX   : minX,
            MinY   : minY,
            MaxX   : maxX,
            MaxY   : maxY,
            Width  : maxX - minX,
            Height : maxY - minY
        };
    }
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
            var factor  =  paddingFactor;
            if (typeof factor !== 'number') {
                var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
                var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;
                var viewportCfg   =  (env2d && env2d['VghLantern__Env2d__Config__Viewport']) || {};
                factor  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
                    viewportCfg, 'FitPaddingFactor', 'Na__Env2d__Config.json -> VghLantern__Env2d__Config__Viewport');
            }

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
        // Anchored just below the drawn lantern (and its dimensions), not the
        // viewBox edge - at true sheet scale the frame edge sits far from the model.
        instance.SetViewLabel  =  function(labelText) {
            var overlay  =  layers.overlay;
            if (!overlay || !SvgHelpers) return;

            var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
            var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;
            var viewportCfg   =  (env2d && env2d['VghLantern__Env2d__Config__Viewport']) || {};
            var VIEWPORT_LABEL  =  'Na__Env2d__Config.json -> VghLantern__Env2d__Config__Viewport';
            var sizeFactor    =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(viewportCfg, 'ViewLabelSizeFactor', VIEWPORT_LABEL);
            var strokeFactor  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(viewportCfg, 'ViewLabelUnderlineStrokeFactor', VIEWPORT_LABEL);
            var gapFactor     =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(viewportCfg, 'ViewLabelGapFactor', VIEWPORT_LABEL);

            var box       =  instance.GetViewBox();
            var span      =  Math.max(box.Width, box.Height);
            var fontSize  =  span * sizeFactor;
            var content   =  VghLantern__Env2d__ViewportInstance__ContentBounds(layers);
            var anchorX;
            var anchorY;

            if (content) {
                var contentSpan  =  Math.max(content.Width, content.Height);
                var gap          =  contentSpan * gapFactor;
                anchorX  =  content.MinX;
                anchorY  =  content.MaxY + gap + fontSize;                   // <-- Baseline sits just under the drawing
            } else {
                var pad  =  span * 0.02;
                anchorX  =  box.MinX + pad;
                anchorY  =  box.MaxY - pad;
            }

            var textEl  =  SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateText(
                { x: anchorX, y: anchorY },
                labelText,
                CSS_VIEW_LABEL,
                { 'font-size': fontSize }
            );
            overlay.appendChild(textEl);

            var bbox  =  null;
            try { bbox = textEl.getBBox(); } catch (err) { bbox = null; }
            if (!bbox || !(bbox.width > 0)) return;

            var underlineY  =  bbox.y + bbox.height + (fontSize * 0.18);
            var rule        =  SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(
                { x: bbox.x, y: underlineY },
                { x: bbox.x + bbox.width, y: underlineY },
                CSS_VIEW_LABEL_RULE,
                { 'stroke-width': span * strokeFactor }
            );
            overlay.appendChild(rule);
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
