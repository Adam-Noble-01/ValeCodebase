/* =============================================================================
   VALESPEC - DOCUMENT PREVIEW PAGE RENDERER
   =============================================================================

   FILE       : ValeSpec__DocPreview__PageRenderer__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocPreview - PageRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render read-only document preview with toolbar, branding, and assemblies
   CREATED    : 2026

   DESCRIPTION:
   - Renders read-only document preview into #ValeSpec__DocPreview__Container
   - Creates toolbar with "Back to Editor" and disabled "PDF Export" buttons
   - Creates paper container at A4 width with drop shadow
   - Renders Vale branding header, assembly blocks with SVG and spec table
   - Renders job notes section at the end of the document
   - Subscribes to modeChanged event to render when entering preview mode

   ============================================================================= */

// =============================================================================
// REGION | Page Renderer Module
// =============================================================================

const ValeSpec__DocPreview__PageRenderer = (function() {

    // MODULE CONSTANTS | DOM Target ID
    // ------------------------------------------------------------
    const PREVIEW_CONTAINER_ID  =  'ValeSpec__DocPreview__Container';
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Logo Path from Config
    // ------------------------------------------------------------
    function _getLogoPath() {
        var fallbackLogoPath  =  '../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png';
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return fallbackLogoPath;
        var state   =  StateManager.getState();
        var config  =  state.appConfig;
        if (!config) return fallbackLogoPath;
        var headerConfig  =  config['DocEditor__Header__Config'];
        if (!headerConfig) return fallbackLogoPath;
        return headerConfig['DocEditor__Header__Config__LogoPath'] || fallbackLogoPath;          // <-- Shared logo asset path
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Project Metadata from State
    // ------------------------------------------------------------
    function _getProjectMeta() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return {};
        var state    =  StateManager.getState();
        var project  =  state.currentProject;
        if (!project) return {};
        return project['ValeSpec__ProjectFile__Metadata'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Assemblies Array from State
    // ------------------------------------------------------------
    function _getAssemblies() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return [];
        var state    =  StateManager.getState();
        var project  =  state.currentProject;
        if (!project) return [];
        return project['ValeSpec__ProjectFile__Assemblies'] || [];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Job Notes from State
    // ------------------------------------------------------------
    function _getJobNotes() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return '';
        var state    =  StateManager.getState();
        var project  =  state.currentProject;
        if (!project) return '';
        var globalSettings  =  project['ValeSpec__ProjectFile__GlobalSettings'] || {};
        return globalSettings['ValeSpec__ProjectFile__GlobalSettings__JobNotes'] || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Date via DateFormatter
    // ------------------------------------------------------------
    function _formatDate(dateStr) {
        if (!dateStr) return '—';
        if (window.ValeSpec__AppUtils__DateFormatter) {
            return window.ValeSpec__AppUtils__DateFormatter.formatShort(dateStr);  // <-- "09 Apr 2026" format
        }
        return dateStr;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Assembly Title from Data
    // ------------------------------------------------------------
    function _buildAssemblyTitle(assembly) {
        var identity  =  assembly['Assembly__Identity__Config'] || {};
        var custom    =  identity['Assembly__Identity__Config__CustomTitle'];
        if (custom) return custom;

        var doorType    =  (assembly['Assembly__DoorType__Config'] || {})['Assembly__DoorType__Config__DoorType'] || 'Door';
        var dimensions  =  assembly['Assembly__Dimensions__Config'] || {};
        var width       =  dimensions['Assembly__Dimensions__Config__WidthMm']  || '—';
        var height      =  dimensions['Assembly__Dimensions__Config__HeightMm'] || '—';
        return doorType + ' — ' + width + ' x ' + height + ' mm';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Toolbar HTML
    // ------------------------------------------------------------
    function _buildToolbar() {
        var html  =  '<div class="ValeSpec__DocPreview__Toolbar">';
        html     +=      '<button class="ValeSpec__DocPreview__BtnBack" id="ValeSpec__DocPreview__BtnBack">&larr; Back to Editor</button>';
        html     +=      '<button class="ValeSpec__DocPreview__BtnExport" disabled>PDF Export &mdash; Coming Soon</button>';
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Branding Header HTML
    // ------------------------------------------------------------
    function _buildBrandingHeader(meta) {
        var logoPath     =  _getLogoPath();
        var projectName  =  meta['ValeSpec__ProjectFile__Metadata__ProjectName']  || 'Untitled Project';
        var docName      =  meta['ValeSpec__ProjectFile__Metadata__DocumentName'] || 'Untitled Document';
        var revision     =  meta['ValeSpec__ProjectFile__Metadata__RevisionCode'] || '';
        var dateAuthored =  _formatDate(meta['ValeSpec__ProjectFile__Metadata__DateCreated']);

        var html  =  '<div class="ValeSpec__DocPreview__BrandingHeader">';

        if (logoPath) {
            html  +=      '<img class="ValeSpec__DocPreview__BrandingLogo" src="' + logoPath + '" alt="Vale Logo" />';
        }

        html  +=      '<div class="ValeSpec__DocPreview__BrandingMeta">';
        html  +=          '<div class="ValeSpec__DocPreview__BrandingProjectName">' + projectName + '</div>';
        html  +=          '<div class="ValeSpec__DocPreview__BrandingDocName">' + docName;
        if (revision) html  +=  ' — Rev ' + revision;
        html  +=          '</div>';
        html  +=      '</div>';

        html  +=      '<div style="text-align:right; font-size:var(--Vale_FontSize_Small); color:var(--Vale_TextMuted);">';
        html  +=          dateAuthored;
        html  +=      '</div>';

        html  +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Single Assembly Block HTML
    // ------------------------------------------------------------
    function _buildAssemblyBlock(assembly, index) {
        var title  =  _buildAssemblyTitle(assembly);

        var html  =  '<div class="ValeSpec__DocPreview__AssemblyBlock">';
        html     +=      '<div class="ValeSpec__DocPreview__AssemblyTitle">' + title + '</div>';
        html     +=      '<div class="ValeSpec__DocPreview__DrawingContainer" id="ValeSpec__DocPreview__Drawing_' + index + '"></div>';

        var SpecTableRenderer  =  window.ValeSpec__DocPreview__SpecTableRenderer;
        if (SpecTableRenderer) {
            html  +=  SpecTableRenderer.renderSpecTable(assembly);                // <-- Hardware schedule table
        }

        html  +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Job Notes Section HTML
    // ------------------------------------------------------------
    function _buildJobNotesSection(notesText) {
        if (!notesText) return '';

        var escaped  =  notesText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        var html  =  '<div class="ValeSpec__DocPreview__JobNotes">';
        html     +=      '<div class="ValeSpec__DocPreview__JobNotesTitle">Job Notes</div>';
        html     +=      '<div class="ValeSpec__DocPreview__JobNotesContent">' + escaped + '</div>';
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render SVG Drawings into Mounted Containers
    // ------------------------------------------------------------
    function _renderDrawings(assemblies) {
        var RenderPipeline  =  window.ValeSpec__SvgDrawing__RenderPipeline;
        if (!RenderPipeline) return;

        for (var i = 0; i < assemblies.length; i++) {
            var drawingContainer  =  document.getElementById('ValeSpec__DocPreview__Drawing_' + i);
            if (drawingContainer) {
                try {
                    var svgEl  =  RenderPipeline.renderThumbnail(assemblies[i]);  // <-- Full SVG drawing
                    if (svgEl) drawingContainer.appendChild(svgEl);
                } catch (e) {
                    console.warn('[ValeSpec__PageRenderer] Drawing render error for index ' + i + ':', e);
                }
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Toolbar Event Listeners
    // ------------------------------------------------------------
    function _bindEvents() {
        var backBtn  =  document.getElementById('ValeSpec__DocPreview__BtnBack');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                var ModeManager  =  window.ValeSpec__AppCore__ModeManager;
                if (ModeManager) ModeManager.navigateBack();                      // <-- Return to previous mode
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Full Document Preview into DOM
    // ------------------------------------------------------------
    function render() {
        var container  =  document.getElementById(PREVIEW_CONTAINER_ID);
        if (!container) {
            console.warn('[ValeSpec__PageRenderer] Container not found: #' + PREVIEW_CONTAINER_ID);
            return;
        }

        var meta        =  _getProjectMeta();
        var assemblies  =  _getAssemblies();
        var jobNotes    =  _getJobNotes();

        var html  =  _buildToolbar();
        html     +=  '<div class="ValeSpec__DocPreview__Paper">';
        html     +=      _buildBrandingHeader(meta);

        for (var i = 0; i < assemblies.length; i++) {
            html  +=      _buildAssemblyBlock(assemblies[i], i);
        }

        html     +=      _buildJobNotesSection(jobNotes);
        html     +=  '</div>';

        container.innerHTML  =  html;

        _renderDrawings(assemblies);
        _bindEvents();
    }
    // ------------------------------------------------------------


    // FUNCTION | Subscribe to Mode Change Events
    // ------------------------------------------------------------
    function _subscribeToModeChange() {
        if (window.ValeSpec__AppCore__StateManager) {
            window.ValeSpec__AppCore__StateManager.on('modeChanged', function(mode) {
                if (mode === 'DocumentPreview') {
                    render();                                                     // <-- Auto-render when entering preview mode
                }
            });
        }
    }
    // ------------------------------------------------------------


    // BOOT | Initial Subscription
    // ------------------------------------------------------------
    _subscribeToModeChange();
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        render  : render
    };

})();

// endregion ===================================================================

window.ValeSpec__DocPreview__PageRenderer  =  ValeSpec__DocPreview__PageRenderer;
