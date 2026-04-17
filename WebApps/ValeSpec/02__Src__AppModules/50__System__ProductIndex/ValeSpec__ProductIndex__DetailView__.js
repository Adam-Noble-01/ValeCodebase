/* =============================================================================
   VALESPEC - PRODUCT INDEX DETAIL VIEW
   =============================================================================

   FILE       : ValeSpec__ProductIndex__DetailView__.js
   NAMESPACE  : ValeSpec
   MODULE     : ProductIndex - DetailView
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Renders a comprehensive breakdown of a single hardware item
   CREATED    : 17-Apr-2026

   DESCRIPTION:
   - Fetches the full JSON data for a specific hardware item
   - Displays a large SVG preview of the item
   - Renders all available metadata from ValeSpec__HardwareItemData
   - Renders vector metadata from HardwareItem__VectorData (excluding raw paths)
   - Provides a back button to return to the main index table

   ============================================================================= */

// =============================================================================
// REGION | Product Index Detail View Module
// =============================================================================

const ValeSpec__System__ProductIndex__DetailView = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | SVG Rendering Configuration
    // ------------------------------------------------------------
    const SVG_STROKE_COLOR  =  '#172b3a';  // <-- Dark linework
    const SVG_STROKE_WIDTH  =  1.5;        // <-- Line thickness
    const SVG_FILL_COLOR    =  '#c0ae8a';  // <-- Default Unlacquered Brass color fill (matches MAT612)
    const VIEWBOX_PADDING   =  0.15;       // <-- 15% padding
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Data Formatting Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Format JSON Value for Display
    // ------------------------------------------------------------
    function ValeSpec__ProductIndex__FormatValue(val) {
        if (val === null || val === undefined || val === 'NULL' || val === '') return '—';
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (Array.isArray(val)) {
            if (val.length === 0) return '—';
            return val.join(', ');
        }
        if (typeof val === 'object') {
            return '<pre class="ValeSpec__ProductIndex__DetailPre">' + JSON.stringify(val, null, 2) + '</pre>';
        }
        return String(val);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Key Name for Display
    // ------------------------------------------------------------
    function ValeSpec__ProductIndex__FormatKey(key) {
        return key.replace(/HardwareItem__/g, '')
                  .replace(/__/g, ' ')
                  .replace(/_/g, ' ')
                  .replace(/([A-Z])/g, ' $1')
                  .trim();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | SVG Rendering Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Calculate SVG ViewBox
    // ------------------------------------------------------------
    function ValeSpec__ProductIndex__CalculateViewBox(boundingBox) {
        if (!boundingBox) return '0 0 100 100';

        var minX    =  parseFloat(boundingBox.MinX_mm)   || 0;
        var maxY    =  parseFloat(boundingBox.MaxY_mm)   || 0;
        var width   =  parseFloat(boundingBox.Width_mm)  || 100;
        var height  =  parseFloat(boundingBox.Height_mm) || 100;

        var svgMinY = -maxY;

        var padX    =  width * VIEWBOX_PADDING;
        var padY    =  height * VIEWBOX_PADDING;

        var finalMinX    =  minX - padX;
        var finalMinY    =  svgMinY - padY;
        var finalWidth   =  width + (padX * 2);
        var finalHeight  =  height + (padY * 2);

        return finalMinX + ' ' + finalMinY + ' ' + finalWidth + ' ' + finalHeight;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Vector Line Paths as SVG Markup
    // ------------------------------------------------------------
    function ValeSpec__ProductIndex__RenderPathsMarkup(paths, strokeColor, strokeWidth, fillColor) {
        var svg  =  '';

        for (var i = 0; i < paths.length; i++) {
            var path  =  paths[i];
            if (path.PathType !== 'Polygon') continue;

            var pointsStr = '';
            for (var j = 0; j < path.Vertices_mm.length; j++) {
                var v = path.Vertices_mm[j];
                pointsStr += v.X + ',' + (-v.Y) + ' ';
            }

            svg += '<polygon points="' + pointsStr.trim() + '" fill="' + (fillColor || 'none') + '" />';
        }

        for (var i = 0; i < paths.length; i++) {
            var path  =  paths[i];
            if (path.PathType !== 'Line') continue;

            var sx  =  path.Start_mm.X;
            var sy  =  -path.Start_mm.Y;
            var ex  =  path.End_mm.X;
            var ey  =  -path.End_mm.Y;

            svg += '<line x1="' + sx + '" y1="' + sy + '" x2="' + ex + '" y2="' + ey + '" stroke="' + strokeColor + '" stroke-width="' + strokeWidth + '" stroke-linecap="round" />';
        }

        return svg;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Detail View Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert GitHub URL to Local Path
    // ------------------------------------------------------------
    function ValeSpec__ProductIndex__GetLocalPath(url) {
        if (!url) return '';
        var ghPrefix  =  'https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeSpec/';
        if (url.indexOf(ghPrefix) === 0) {
            return url.substring(ghPrefix.length);
        }
        return url;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Detail View
    // ------------------------------------------------------------
    async function ValeSpec__ProductIndex__RenderDetailView(containerId, dataUrl, onBackCallback) {
        var container  =  document.getElementById(containerId);
        if (!container) return;

        container.innerHTML  =  '<div class="ValeSpec__ProductIndex__DetailLoading">Loading product details...</div>';

        try {
            var localUrl  =  ValeSpec__ProductIndex__GetLocalPath(dataUrl);
            var response  =  await fetch(localUrl + '?t=' + new Date().getTime());
            if (!response.ok) throw new Error('Failed to fetch hardware data');

            var data  =  await response.json();
            
            var hwData      =  data['ValeSpec__HardwareItemData'] || data['HardwareItemData'] || {};
            var vectorData  =  data['HardwareItem__VectorData'] || {};
            var paths       =  vectorData['Paths'] || [];
            var boundingBox =  vectorData['BoundingBox'];

            var name  =  hwData['HardwareItem__Name'] || 'Unknown Item';
            var code  =  hwData['HardwareItem__Code'] || '';
            var finishes  =  hwData['HardwareItem__AvailableFinishes'] || [];

            var fillColor = SVG_FILL_COLOR;
            
            // Resolve fill color from AppConfig if available
            var StateManager  =  window.ValeSpec__AppCore__StateManager;
            if (StateManager && finishes.length > 0) {
                var state      =  StateManager.ValeSpec__StateManager__GetState();
                var appConfig  =  state.appConfig;
                if (appConfig) {
                    var globalDefaults  =  appConfig['ValeSpec__Ironmongery__GlobalDefaults__Config'] || {};
                    var availableFinishes  =  globalDefaults['ValeSpec__Ironmongery__GlobalDefaults__Config__AvailableFinishes'] || [];
                    
                    // Try to find the first finish in our item's list that has a defined HexColor
                    for (var i = 0; i < finishes.length; i++) {
                        var finishName  =  finishes[i];
                        var matchedCfg  =  availableFinishes.find(function(f) { return f.Name === finishName; });
                        if (matchedCfg && matchedCfg.HexColor) {
                            fillColor = matchedCfg.HexColor;
                            break;
                        }
                    }
                }
            }

            var html  =  '<div class="ValeSpec__ProductIndex__DetailContainer">';
            
            // Header with Back Button
            html     +=      '<div class="ValeSpec__ProductIndex__DetailHeader">';
            html     +=          '<button id="ValeSpec__ProductIndex__BackBtn" class="ValeSpec__ProductIndex__BackBtn">&larr; Back to Index</button>';
            html     +=          '<h2 class="ValeSpec__ProductIndex__DetailTitle">' + name + ' <span class="ValeSpec__ProductIndex__DetailCode">' + code + '</span></h2>';
            html     +=      '</div>';

            html     +=      '<div class="ValeSpec__ProductIndex__DetailLayout">';
            
            // Left Column: SVG Preview
            html     +=          '<div class="ValeSpec__ProductIndex__DetailLeft">';
            html     +=              '<div class="ValeSpec__ProductIndex__DetailSvgWrapper">';
            var viewBoxStr   =  ValeSpec__ProductIndex__CalculateViewBox(boundingBox);
            var pathsMarkup  =  ValeSpec__ProductIndex__RenderPathsMarkup(paths, SVG_STROKE_COLOR, SVG_STROKE_WIDTH, fillColor);
            html     +=                  '<svg viewBox="' + viewBoxStr + '" xmlns="http://www.w3.org/2000/svg">';
            html     +=                      pathsMarkup;
            html     +=                  '</svg>';
            html     +=              '</div>';
            html     +=          '</div>';

            // Right Column: Data Tables
            html     +=          '<div class="ValeSpec__ProductIndex__DetailRight">';
            
            // Hardware Item Data Table
            html     +=              '<h3 class="ValeSpec__ProductIndex__DetailSectionTitle">Item Metadata</h3>';
            html     +=              '<table class="ValeSpec__ProductIndex__DetailTable">';
            html     +=                  '<tbody>';
            
            // We want to flip the order of DataFile and AvailableFinishes if they exist.
            // A simple way is to extract the keys, reorder them, and then iterate.
            var hwKeys = Object.keys(hwData);
            var dataFileIdx = hwKeys.indexOf('HardwareItem__DataFile');
            var finishesIdx = hwKeys.indexOf('HardwareItem__AvailableFinishes');
            
            if (dataFileIdx !== -1 && finishesIdx !== -1) {
                // If DataFile comes before AvailableFinishes, swap them
                if (dataFileIdx < finishesIdx) {
                    var temp = hwKeys[dataFileIdx];
                    hwKeys[dataFileIdx] = hwKeys[finishesIdx];
                    hwKeys[finishesIdx] = temp;
                }
            }

            for (var i = 0; i < hwKeys.length; i++) {
                var key = hwKeys[i];
                if (hwData.hasOwnProperty(key)) {
                    html +=                  '<tr>';
                    html +=                      '<th>' + ValeSpec__ProductIndex__FormatKey(key) + '</th>';
                    html +=                      '<td>' + ValeSpec__ProductIndex__FormatValue(hwData[key]) + '</td>';
                    html +=                  '</tr>';
                }
            }
            html     +=                  '</tbody>';
            html     +=              '</table>';

            // Vector Metadata Table
            html     +=              '<h3 class="ValeSpec__ProductIndex__DetailSectionTitle">Vector Metadata</h3>';
            html     +=              '<table class="ValeSpec__ProductIndex__DetailTable">';
            html     +=                  '<tbody>';
            for (var key in vectorData) {
                if (vectorData.hasOwnProperty(key) && key !== 'Paths' && key !== 'BoundingBox') {
                    html +=                  '<tr>';
                    html +=                      '<th>' + ValeSpec__ProductIndex__FormatKey(key) + '</th>';
                    html +=                      '<td>' + ValeSpec__ProductIndex__FormatValue(vectorData[key]) + '</td>';
                    html +=                  '</tr>';
                }
            }
            html     +=                  '</tbody>';
            html     +=              '</table>';

            // Bounding Box Table
            if (boundingBox) {
                html     +=              '<h3 class="ValeSpec__ProductIndex__DetailSectionTitle">Bounding Box</h3>';
                html     +=              '<table class="ValeSpec__ProductIndex__DetailTable">';
                html     +=                  '<tbody>';
                for (var key in boundingBox) {
                    if (boundingBox.hasOwnProperty(key)) {
                        html +=                  '<tr>';
                        html +=                      '<th>' + ValeSpec__ProductIndex__FormatKey(key) + '</th>';
                        html +=                      '<td>' + ValeSpec__ProductIndex__FormatValue(boundingBox[key]) + '</td>';
                        html +=                  '</tr>';
                    }
                }
                html     +=                  '</tbody>';
                html     +=              '</table>';
            }

            html     +=          '</div>'; // End Right Column
            html     +=      '</div>'; // End Layout
            html     +=  '</div>'; // End Container

            container.innerHTML  =  html;

            // Bind Back Button
            var backBtn  =  document.getElementById('ValeSpec__ProductIndex__BackBtn');
            if (backBtn && onBackCallback) {
                backBtn.addEventListener('click', onBackCallback);
            }

        } catch (error) {
            console.error('[ValeSpec__ProductIndex__DetailView] Error:', error);
            container.innerHTML  =  '<div class="ValeSpec__ProductIndex__DetailError">Failed to load product details.<br><button id="ValeSpec__ProductIndex__BackBtn" class="ValeSpec__ProductIndex__BackBtn">Back</button></div>';
            var backBtn  =  document.getElementById('ValeSpec__ProductIndex__BackBtn');
            if (backBtn && onBackCallback) {
                backBtn.addEventListener('click', onBackCallback);
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__ProductIndex__RenderDetailView  : ValeSpec__ProductIndex__RenderDetailView
    };

// endregion -------------------------------------------------------------------

})();

// =============================================================================
// REGION | Module Export
// =============================================================================

window.ValeSpec__System__ProductIndex__DetailView  =  ValeSpec__System__ProductIndex__DetailView;

// endregion ===================================================================
